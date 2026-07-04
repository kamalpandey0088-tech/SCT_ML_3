import io
import uuid
import hashlib
import time
import numpy as np
import torch
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from PIL import Image
from backend.database import get_db
from backend.models import Prediction
from backend.schemas import PredictionResponse, ShareResponse, BatchPredictionResponse
from backend.model_bundle import _models
from backend.gradcam import GradCAMExtractor, create_gradcam_overlay
from backend.metrics import PREDICTION_COUNTER, INFERENCE_LATENCY
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/api/v1", tags=["Inference"])
limiter = Limiter(key_func=get_remote_address)

# Magic bytes check
_MAGIC_BYTES_NEEDED = 12
_ALLOWED_SIGNATURES = [
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89\x50\x4e\x47\x0d\x0a\x1a\x0a", "image/png"),
]

def validate_image_bytes(data: bytes) -> str:
    for sig, mime in _ALLOWED_SIGNATURES:
        if data[:len(sig)] == sig:
            return mime
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Unsupported image. Only JPEG and PNG are allowed."
    )

def run_pipeline(img: Image.Image) -> tuple[str, float, dict[str, float], np.ndarray]:
    tensor = _models.transform(img).unsqueeze(0).to(_models.device)
    
    # Track Grad-CAM
    cam_extractor = GradCAMExtractor(_models.extractor)
    with torch.no_grad():
        features = _models.extractor(tensor)
    
    cam = cam_extractor.generate()
    cam_extractor.remove()

    features_np = features.cpu().numpy()
    scaled = _models.scaler.transform(features_np)
    pca_feats = _models.pca.transform(scaled)
    proba = _models.svc.predict_proba(pca_feats)[0]

    classes = _models.LABEL_NAMES
    pred_idx = int(np.argmax(proba))
    label = classes[pred_idx]
    confidence = float(proba[pred_idx])
    probabilities = {name: float(p) for name, p in zip(classes, proba)}
    
    return label, confidence, probabilities, cam

@router.post("/predict", response_model=PredictionResponse)
@limiter.limit("5/minute")
async def predict(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    start_time = time.perf_counter()
    raw_bytes = await file.read()
    
    if len(raw_bytes) < _MAGIC_BYTES_NEEDED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="File size too small."
        )
    
    validate_image_bytes(raw_bytes)

    try:
        img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
        with Image.open(io.BytesIO(raw_bytes)) as check_img:
            check_img.verify()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid image format."
        )

    # Perform prediction + Grad-CAM extraction
    label, confidence, probabilities, cam = run_pipeline(img)
    gradcam_b64 = create_gradcam_overlay(img, cam)
    
    # Calculate inference metric
    inference_ms = (time.perf_counter() - start_time) * 1000.0
    
    # Metrics
    PREDICTION_COUNTER.labels(label=label).inc()
    INFERENCE_LATENCY.observe(inference_ms / 1000.0)

    # Save to database
    client_ip = request.client.host if request.client else "unknown"
    ip_hash = hashlib.sha256(client_ip.encode()).hexdigest()
    
    db_prediction = Prediction(
        id=uuid.uuid4(),
        label=label,
        confidence=confidence,
        confidence_pct=round(confidence * 100, 2),
        probabilities=probabilities,
        inference_ms=round(inference_ms, 2),
        gradcam_b64=gradcam_b64,
        ip_hash=ip_hash
    )
    db.add(db_prediction)
    await db.commit()
    await db.refresh(db_prediction)

    return PredictionResponse(
        label=db_prediction.label,
        confidence=db_prediction.confidence,
        confidence_pct=db_prediction.confidence_pct,
        probabilities=db_prediction.probabilities,
        inference_ms=db_prediction.inference_ms,
        result_id=db_prediction.id,
        gradcam_b64=db_prediction.gradcam_b64
    )

@router.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(
    request: Request,
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db)
):
    if len(files) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Maximum 10 files per batch."
        )
    
    results = []
    failed = 0
    client_ip = request.client.host if request.client else "unknown"
    ip_hash = hashlib.sha256(client_ip.encode()).hexdigest()

    for file in files:
        try:
            raw_bytes = await file.read()
            validate_image_bytes(raw_bytes)
            img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
            
            start_time = time.perf_counter()
            label, confidence, probabilities, cam = run_pipeline(img)
            gradcam_b64 = create_gradcam_overlay(img, cam)
            inference_ms = (time.perf_counter() - start_time) * 1000.0
            
            db_prediction = Prediction(
                id=uuid.uuid4(),
                label=label,
                confidence=confidence,
                confidence_pct=round(confidence * 100, 2),
                probabilities=probabilities,
                inference_ms=round(inference_ms, 2),
                gradcam_b64=gradcam_b64,
                ip_hash=ip_hash
            )
            db.add(db_prediction)
            results.append(db_prediction)
        except Exception:
            failed += 1

    if results:
        await db.commit()
        for r in results:
            await db.refresh(r)

    response_items = [
        PredictionResponse(
            label=r.label,
            confidence=r.confidence,
            confidence_pct=r.confidence_pct,
            probabilities=r.probabilities,
            inference_ms=r.inference_ms,
            result_id=r.id,
            gradcam_b64=r.gradcam_b64
        ) for r in results
    ]

    return BatchPredictionResponse(
        results=response_items,
        total=len(files),
        failed=failed
    )

@router.get("/predict/{result_id}/share", response_model=ShareResponse)
async def share_prediction(result_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    db_pred = await db.get(Prediction, result_id)
    if not db_pred:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Prediction not found."
        )
    return ShareResponse(
        label=db_pred.label,
        confidence_pct=db_pred.confidence_pct,
        gradcam_b64=db_pred.gradcam_b64,
        created_at=db_pred.created_at
    )
