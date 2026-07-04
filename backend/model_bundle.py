import logging
import torch
import torch.nn as nn
from torchvision import models, transforms
from torchvision.models import MobileNet_V2_Weights

log = logging.getLogger("catdog.models")

class ModelBundle:
    extractor: nn.Module
    scaler: any
    pca: any
    svc: any
    device: torch.device
    transform: transforms.Compose

    IMG_SIZE: int = 224
    IMAGENET_MEAN: list[float] = [0.485, 0.456, 0.406]
    IMAGENET_STD: list[float] = [0.229, 0.224, 0.225]
    LABEL_NAMES: list[str] = ["cat", "dog"]

_models = ModelBundle()
