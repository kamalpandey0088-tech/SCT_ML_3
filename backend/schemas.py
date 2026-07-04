from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Dict, List, Optional

class PredictionResponse(BaseModel):
    label: str
    confidence: float
    confidence_pct: float
    probabilities: Dict[str, float]
    inference_ms: float
    result_id: UUID
    gradcam_b64: Optional[str] = None

class HistoryItem(BaseModel):
    id: UUID
    label: str
    confidence: float
    confidence_pct: float
    probabilities: Dict[str, float]
    inference_ms: float
    gradcam_b64: Optional[str] = None
    created_at: datetime
    has_feedback: bool
    feedback_correct: Optional[bool] = None

class HistoryResponse(BaseModel):
    items: List[HistoryItem]
    total: int
    page: int
    pages: int

class FeedbackRequest(BaseModel):
    result_id: UUID
    correct: bool

class FeedbackResponse(BaseModel):
    ok: bool
    message: str

class StatsResponse(BaseModel):
    total_predictions: int
    accuracy_pct: Optional[float] = None
    avg_confidence: float
    predictions_today: int
    label_distribution: Dict[str, int]
    avg_inference_ms: float

class ModelInfoResponse(BaseModel):
    version: str
    training_date: str
    n_support: List[int]
    n_features_in: int
    pca_n_components: int
    pca_variance_retained: float

class ShareResponse(BaseModel):
    label: str
    confidence_pct: float
    gradcam_b64: Optional[str] = None
    created_at: datetime

class BatchPredictionResponse(BaseModel):
    results: List[PredictionResponse]
    total: int
    failed: int

class HealthResponse(BaseModel):
    status: str
    models_loaded: bool
    device: str
    version: str
    db_connected: bool
