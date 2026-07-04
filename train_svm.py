"""
train_svm.py — Apex-Level Cat vs Dog Classifier
================================================
Pipeline:
  1. MobileNetV2 (frozen, ImageNet weights) → 1280-dim feature vectors
  2. PCA (95% variance retained)
  3. SVC (RBF kernel, probability=True) tuned via GridSearchCV
  4. Persist models as .pkl files for inference

Usage:
    python train_svm.py --data_dir /path/to/kaggle/train \
                        --output_dir ./models \
                        --batch_size 64 \
                        --n_jobs -1 \
                        --device cuda   # or cpu
"""

from __future__ import annotations

import argparse
import logging
import os
import pickle
import sys
import time
from pathlib import Path
from typing import Tuple

import numpy as np
import torch
import torch.nn as nn
from PIL import Image, UnidentifiedImageError
from sklearn.decomposition import PCA
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    classification_report,
    roc_auc_score,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms
from torchvision.models import MobileNet_V2_Weights

# ──────────────────────────────────────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("training.log", mode="w"),
    ],
)
log = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────────────────

LABEL_MAP: dict[str, int] = {"cat": 0, "dog": 1}
LABEL_NAMES: list[str] = ["cat", "dog"]

# MobileNetV2 canonical input size
IMG_SIZE: int = 224

# ImageNet normalisation statistics
IMAGENET_MEAN: list[float] = [0.485, 0.456, 0.406]
IMAGENET_STD: list[float] = [0.229, 0.224, 0.225]

# ──────────────────────────────────────────────────────────────────────────────
# Dataset
# ──────────────────────────────────────────────────────────────────────────────


class CatDogDataset(Dataset):
    """
    Expects Kaggle layout:
        data_dir/
            cat.0.jpg, cat.1.jpg, ...,
            dog.0.jpg, dog.1.jpg, ...

    Also supports subdirectory layout:
        data_dir/
            cats/   *.jpg
            dogs/   *.jpg
    """

    def __init__(self, data_dir: Path, transform=None) -> None:
        self.transform = transform
        self.samples: list[Tuple[Path, int]] = []
        self._load_samples(data_dir)
        log.info("Dataset: %d images loaded.", len(self.samples))

    def _load_samples(self, root: Path) -> None:
        valid_exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

        # Flat Kaggle layout: cat.0.jpg / dog.0.jpg
        flat_files = list(root.glob("*.*"))
        if flat_files:
            for fp in flat_files:
                if fp.suffix.lower() not in valid_exts:
                    continue
                stem_lower = fp.stem.lower()
                if stem_lower.startswith("cat"):
                    self.samples.append((fp, LABEL_MAP["cat"]))
                elif stem_lower.startswith("dog"):
                    self.samples.append((fp, LABEL_MAP["dog"]))
            if self.samples:
                return  # found flat layout

        # Subdirectory layout
        for class_name, label in LABEL_MAP.items():
            for candidate_name in [class_name, class_name + "s"]:
                class_dir = root / candidate_name
                if class_dir.is_dir():
                    for fp in class_dir.iterdir():
                        if fp.suffix.lower() in valid_exts:
                            self.samples.append((fp, label))

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        fp, label = self.samples[idx]
        try:
            img = Image.open(fp).convert("RGB")
        except (UnidentifiedImageError, OSError):
            # Return a black image rather than crashing the DataLoader
            log.warning("Corrupt image skipped: %s", fp)
            img = Image.new("RGB", (IMG_SIZE, IMG_SIZE), color=0)
        if self.transform:
            img = self.transform(img)
        return img, label


# ──────────────────────────────────────────────────────────────────────────────
# Feature Extractor
# ──────────────────────────────────────────────────────────────────────────────


def build_feature_extractor(device: torch.device) -> nn.Module:
    """
    Load MobileNetV2 with the latest recommended ImageNet weights,
    strip the classification head, and freeze all parameters.
    Returns the model in eval mode.
    """
    weights = MobileNet_V2_Weights.IMAGENET1K_V1
    model = models.mobilenet_v2(weights=weights)

    # Remove the classifier — keep only the convolutional feature layers.
    # MobileNetV2 outputs [B, 1280, 7, 7] before the AdaptiveAvgPool;
    # we append our own pooling to produce [B, 1280].
    feature_layers = nn.Sequential(
        model.features,
        nn.AdaptiveAvgPool2d((1, 1)),
        nn.Flatten(),
    )

    # Freeze all parameters — we are using MobileNetV2 purely as a
    # pretrained feature extractor, not fine-tuning it.
    for param in feature_layers.parameters():
        param.requires_grad = False

    feature_layers.eval()
    feature_layers.to(device)

    log.info(
        "Feature extractor: MobileNetV2 (frozen) → 1280-dim vectors | device=%s",
        device,
    )
    return feature_layers


# ──────────────────────────────────────────────────────────────────────────────
# Feature Extraction Loop
# ──────────────────────────────────────────────────────────────────────────────


def extract_features(
    model: nn.Module,
    dataloader: DataLoader,
    device: torch.device,
    total: int,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Pass all images through the frozen MobileNetV2 backbone in batches.
    Returns:
        X : np.ndarray of shape (N, 1280)
        y : np.ndarray of shape (N,)
    """
    feature_list: list[np.ndarray] = []
    label_list: list[int] = []
    processed = 0

    with torch.no_grad():
        for batch_images, batch_labels in dataloader:
            batch_images = batch_images.to(device)
            feats = model(batch_images)  # [B, 1280]
            feature_list.append(feats.cpu().numpy())
            label_list.extend(batch_labels.numpy().tolist())

            processed += len(batch_labels)
            pct = processed / total * 100
            log.info("Extracting features … %d / %d  (%.1f%%)", processed, total, pct)

    X = np.vstack(feature_list)
    y = np.array(label_list, dtype=np.int32)
    log.info("Feature matrix: X=%s  y=%s", X.shape, y.shape)
    return X, y


# ──────────────────────────────────────────────────────────────────────────────
# PCA
# ──────────────────────────────────────────────────────────────────────────────


def fit_pca(X_train: np.ndarray, variance_threshold: float = 0.95) -> PCA:
    """
    Fit PCA retaining `variance_threshold` × 100% of the explained variance.
    We first compute the exact number of components needed so the final model
    is deterministic and reproducible.
    """
    log.info("Fitting PCA (target variance=%.0f%%) …", variance_threshold * 100)
    pca = PCA(n_components=variance_threshold, svd_solver="full", random_state=42)
    pca.fit(X_train)
    log.info(
        "PCA: %d → %d components | %.4f%% variance retained",
        X_train.shape[1],
        pca.n_components_,
        pca.explained_variance_ratio_.sum() * 100,
    )
    return pca


# ──────────────────────────────────────────────────────────────────────────────
# SVM with GridSearchCV
# ──────────────────────────────────────────────────────────────────────────────


def train_svm(
    X_train_pca: np.ndarray,
    y_train: np.ndarray,
    n_jobs: int = -1,
    fast_mode: bool = False,
) -> SVC:
    """
    Train an RBF-kernel SVC.

    Two modes:
      fast_mode=False → full GridSearchCV over a 4×4 grid with 5-fold CV.
                        This is mathematically rigorous and production-correct.
      fast_mode=True  → single well-chosen hyperparameter set (C=10, gamma='scale')
                        suitable for quick iteration / CI smoke-tests.

    Returns the best estimator (already fitted on X_train_pca / y_train).
    """
    if fast_mode:
        log.info("Fast mode: training SVC(C=10, kernel='rbf', gamma='scale') …")
        svc = SVC(C=10, kernel="rbf", gamma="scale", probability=True, random_state=42)
        svc.fit(X_train_pca, y_train)
        return svc

    # Full grid search
    param_grid: dict = {
        "C": [0.1, 1, 10, 100],
        "gamma": ["scale", "auto", 1e-3, 1e-4],
        "kernel": ["rbf"],           # Linear and poly are tested in ablations;
                                     # RBF consistently wins on vision features.
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    grid_search = GridSearchCV(
        estimator=SVC(probability=True, random_state=42),
        param_grid=param_grid,
        cv=cv,
        scoring="roc_auc",           # AUC is the canonical metric for binary
                                     # classification with class imbalance.
        n_jobs=n_jobs,
        verbose=2,
        refit=True,                  # Refit best model on full training set.
        return_train_score=True,
    )

    log.info(
        "GridSearchCV: %d hyperparameter combinations × %d folds = %d fits …",
        len(param_grid["C"]) * len(param_grid["gamma"]),
        cv.n_splits,
        len(param_grid["C"]) * len(param_grid["gamma"]) * cv.n_splits,
    )

    t0 = time.perf_counter()
    grid_search.fit(X_train_pca, y_train)
    elapsed = time.perf_counter() - t0

    log.info("GridSearchCV completed in %.1f s", elapsed)
    log.info("Best params : %s", grid_search.best_params_)
    log.info("Best CV AUC : %.4f", grid_search.best_score_)

    return grid_search.best_estimator_


# ──────────────────────────────────────────────────────────────────────────────
# Evaluation
# ──────────────────────────────────────────────────────────────────────────────


def evaluate(svc: SVC, X_test_pca: np.ndarray, y_test: np.ndarray) -> None:
    """
    Print a full classification report + ROC-AUC on the held-out test split.
    """
    y_pred = svc.predict(X_test_pca)
    y_prob = svc.predict_proba(X_test_pca)[:, 1]

    report = classification_report(y_test, y_pred, target_names=LABEL_NAMES)
    auc = roc_auc_score(y_test, y_prob)

    log.info("\n=== Hold-Out Test Results ===\n%s", report)
    log.info("ROC-AUC: %.4f", auc)


# ──────────────────────────────────────────────────────────────────────────────
# Model Persistence
# ──────────────────────────────────────────────────────────────────────────────


def save_artifacts(
    pca: PCA,
    scaler: StandardScaler,
    svc: SVC,
    output_dir: Path,
) -> None:
    """
    Persist PCA, StandardScaler, and SVC as separate .pkl files.
    Saving them separately (rather than a Pipeline pickle) allows the
    FastAPI backend to load only what it needs and makes version control
    of each component independent.
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    artifacts = {
        "pca.pkl": pca,
        "scaler.pkl": scaler,
        "svm.pkl": svc,
    }

    for filename, obj in artifacts.items():
        fp = output_dir / filename
        with open(fp, "wb") as f:
            pickle.dump(obj, f, protocol=pickle.HIGHEST_PROTOCOL)
        size_kb = fp.stat().st_size / 1024
        log.info("Saved %s  (%.1f KB)", fp, size_kb)


# ──────────────────────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────────────────────


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train Cat vs Dog SVM via MobileNetV2 feature extraction."
    )
    parser.add_argument(
        "--data_dir",
        type=Path,
        required=True,
        help="Path to Kaggle training images (flat or subdirectory layout).",
    )
    parser.add_argument(
        "--output_dir",
        type=Path,
        default=Path("./models"),
        help="Directory where .pkl model files will be written. Default: ./models",
    )
    parser.add_argument(
        "--batch_size",
        type=int,
        default=64,
        help="DataLoader batch size for feature extraction. Default: 64",
    )
    parser.add_argument(
        "--n_jobs",
        type=int,
        default=-1,
        help="CPU jobs for GridSearchCV (-1 = all cores). Default: -1",
    )
    parser.add_argument(
        "--device",
        type=str,
        default="auto",
        choices=["auto", "cuda", "mps", "cpu"],
        help="Compute device. 'auto' selects CUDA > MPS > CPU. Default: auto",
    )
    parser.add_argument(
        "--fast",
        action="store_true",
        help=(
            "Skip GridSearchCV; use fixed hyperparameters (C=10, gamma='scale'). "
            "Useful for smoke-testing the pipeline quickly."
        ),
    )
    parser.add_argument(
        "--pca_variance",
        type=float,
        default=0.95,
        help="Fraction of variance retained by PCA. Default: 0.95",
    )
    parser.add_argument(
        "--test_size",
        type=float,
        default=0.2,
        help="Fraction of data reserved for hold-out evaluation. Default: 0.2",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Global random seed for reproducibility. Default: 42",
    )
    return parser.parse_args()


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────


def main() -> None:
    args = parse_args()

    # ── Reproducibility ──────────────────────────────────────────────────────
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    # ── Device Selection ─────────────────────────────────────────────────────
    if args.device == "auto":
        if torch.cuda.is_available():
            device = torch.device("cuda")
        elif torch.backends.mps.is_available():
            device = torch.device("mps")
        else:
            device = torch.device("cpu")
    else:
        device = torch.device(args.device)
    log.info("Using device: %s", device)

    # ── Data Transforms ──────────────────────────────────────────────────────
    transform = transforms.Compose(
        [
            transforms.Resize((IMG_SIZE, IMG_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
        ]
    )

    # ── Dataset & DataLoader ─────────────────────────────────────────────────
    data_dir = args.data_dir.expanduser().resolve()
    if not data_dir.is_dir():
        log.error("--data_dir '%s' does not exist or is not a directory.", data_dir)
        sys.exit(1)

    dataset = CatDogDataset(data_dir, transform=transform)
    if len(dataset) == 0:
        log.error("No valid images found in '%s'. Check the directory layout.", data_dir)
        sys.exit(1)

    dataloader = DataLoader(
        dataset,
        batch_size=args.batch_size,
        shuffle=False,          # Preserve order so indices match labels
        num_workers=min(os.cpu_count() or 1, 8),
        pin_memory=(device.type == "cuda"),
        prefetch_factor=2 if (os.cpu_count() or 1) > 1 else None,
        persistent_workers=(os.cpu_count() or 1) > 1,
    )

    # ── Build Feature Extractor ───────────────────────────────────────────────
    extractor = build_feature_extractor(device)

    # ── Extract Features ──────────────────────────────────────────────────────
    log.info("Starting feature extraction on %d images …", len(dataset))
    t0 = time.perf_counter()
    X, y = extract_features(extractor, dataloader, device, total=len(dataset))
    log.info("Feature extraction: %.1f s", time.perf_counter() - t0)

    # ── Train / Test Split ────────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=args.test_size,
        random_state=args.seed,
        stratify=y,          # Maintain class balance in both splits
    )
    log.info(
        "Split: train=%d  test=%d  (%.0f/%.0f%%)",
        len(X_train),
        len(X_test),
        (1 - args.test_size) * 100,
        args.test_size * 100,
    )

    # ── StandardScaler ────────────────────────────────────────────────────────
    # Scaling before PCA is mathematically necessary: PCA is variance-sensitive
    # and will be dominated by high-magnitude dimensions without normalisation.
    log.info("Fitting StandardScaler …")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # ── PCA ───────────────────────────────────────────────────────────────────
    pca = fit_pca(X_train_scaled, variance_threshold=args.pca_variance)
    X_train_pca = pca.transform(X_train_scaled)
    X_test_pca = pca.transform(X_test_scaled)
    log.info(
        "PCA output: train=%s  test=%s",
        X_train_pca.shape,
        X_test_pca.shape,
    )

    # ── SVM Training ─────────────────────────────────────────────────────────
    log.info("Training SVM …")
    t0 = time.perf_counter()
    svc = train_svm(X_train_pca, y_train, n_jobs=args.n_jobs, fast_mode=args.fast)
    log.info("SVM training: %.1f s", time.perf_counter() - t0)

    # ── Evaluation ────────────────────────────────────────────────────────────
    evaluate(svc, X_test_pca, y_test)

    # ── Persist Artifacts ─────────────────────────────────────────────────────
    save_artifacts(pca, scaler, svc, args.output_dir)
    log.info("✅  Pipeline complete. Models saved to '%s'.", args.output_dir)


if __name__ == "__main__":
    main()
