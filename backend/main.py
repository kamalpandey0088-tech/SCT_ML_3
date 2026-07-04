import logging
import sys
import os
import pickle
from contextlib import asynccontextmanager
import torch
import torch.nn as nn
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

import backend.database as db_module
from backend.database import engine, Base, get_db
from backend.model_bundle import _models
from backend.middleware import CorrelationIDMiddleware, SecurityHeadersMiddleware
from backend.logging_config import setup_logging
from backend.metrics import get_metrics_response
from backend.routers import predict, history, feedback, admin
from backend.schemas import HealthResponse

setup_logging()
log = logging.getLogger("catdog.main")

def _load_pkl(path: str, name: str) -> any:
    if not os.path.exists(path):
        log.critical("Model file not found: %s", path)
        raise RuntimeError(f"Missing model archetype: {name} ({path})")
    with open(path, "rb") as f:
        obj = pickle.load(f)
    log.info("Loaded %s ← %s", name, path)
    return obj

def _init_models() -> None:
    models_dir = os.getenv("MODELS_DIR", "./models")
    log.info("Loading model files from: %s", models_dir)

    _models.scaler = _load_pkl(os.path.join(models_dir, "scaler.pkl"), "scaler")
    _models.pca = _load_pkl(os.path.join(models_dir, "pca.pkl"), "pca")
    _models.svc = _load_pkl(os.path.join(models_dir, "svm.pkl"), "svc")

    device_str = os.getenv("DEVICE", "auto")
    if device_str == "auto":
        if torch.cuda.is_available():
            dev = torch.device("cuda")
        elif torch.backends.mps.is_available():
            dev = torch.device("mps")
        else:
            dev = torch.device("cpu")
    else:
        dev = torch.device(device_str)

    _models.device = dev

    weights = predict.MobileNet_V2_Weights.IMAGENET1K_V1
    backbone = predict.models.mobilenet_v2(weights=weights)
    _models.extractor = nn.Sequential(
        backbone.features,
        nn.AdaptiveAvgPool2d((1, 1)),
        nn.Flatten(),
    )
    for p in _models.extractor.parameters():
        p.requires_grad = False
    _models.extractor.eval()
    _models.extractor.to(dev)

    _models.transform = predict.transforms.Compose([
        predict.transforms.Resize((_models.IMG_SIZE, _models.IMG_SIZE)),
        predict.transforms.ToTensor(),
        predict.transforms.Normalize(
            mean=_models.IMAGENET_MEAN,
            std=_models.IMAGENET_STD,
        ),
    ])
    log.info("Models pipeline loaded.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Try DB connection & table setup, fallback non-fatally on connection error
    if db_module.db_enabled and engine is not None:
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            log.info("Database connection tested. Tables ready.")
        except Exception as e:
            log.warning("Database connection refused. Falling back to in-memory store. Details: %s", str(e))
            db_module.db_enabled = False
    else:
        log.info("Starting up without database. Using in-memory store.")

    _init_models()
    yield
    
    if hasattr(_models, "extractor"):
        del _models.extractor
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="NeuralPaw API",
    description="Cat vs Dog classification engine with robust in-memory database fallback.",
    version="1.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(CorrelationIDMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

origins_str = os.getenv(
    "ALLOWED_ORIGINS", 
    '["http://localhost:5173", "http://localhost:4173"]'
)
import json
try:
    allowed_origins = json.loads(origins_str)
except Exception:
    allowed_origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router)
app.include_router(history.router)
app.include_router(feedback.router)
app.include_router(admin.router)

@app.get("/metrics", tags=["System"])
async def metrics_endpoint():
    return get_metrics_response()

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    db_connected = False
    if db_module.db_enabled and engine is not None:
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            db_connected = True
        except Exception:
            pass
            
    return HealthResponse(
        status="ok",
        models_loaded=hasattr(_models, "svc") and _models.svc is not None,
        device=str(getattr(_models, "device", "not loaded")),
        version="1.0.0",
        db_connected=db_connected
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    log.exception("Unhandled server exception: %s", str(exc))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": "An unexpected error occurred. The incident has been logged."
        }
    )
