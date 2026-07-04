import os
import uuid
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.database import get_db, IN_MEMORY_PREDICTIONS, IN_MEMORY_FEEDBACK
from backend.models import Prediction, Feedback
from backend.schemas import StatsResponse, ModelInfoResponse
from backend.model_bundle import _models

router = APIRouter(prefix="/api/v1", tags=["Admin"])

@router.get("/stats", response_model=StatsResponse)
async def get_stats(db: AsyncSession = Depends(get_db)):
    if db is not None:
        try:
            total_stmt = select(func.count(Prediction.id))
            total_res = await db.execute(total_stmt)
            total = total_res.scalar_one() or 0

            if total > 0:
                stats_stmt = select(
                    func.avg(Prediction.confidence), 
                    func.avg(Prediction.inference_ms)
                )
                stats_res = await db.execute(stats_stmt)
                avg_conf, avg_inf = stats_res.first()
                avg_conf = float(avg_conf or 0.0)
                avg_inf = float(avg_inf or 0.0)

                today_start = datetime.combine(date.today(), datetime.min.time())
                today_stmt = select(func.count(Prediction.id)).where(Prediction.created_at >= today_start)
                today_res = await db.execute(today_stmt)
                today_count = today_res.scalar_one() or 0

                cat_stmt = select(func.count(Prediction.id)).where(Prediction.label == "cat")
                dog_stmt = select(func.count(Prediction.id)).where(Prediction.label == "dog")
                cat_count = (await db.execute(cat_stmt)).scalar_one() or 0
                dog_count = (await db.execute(dog_stmt)).scalar_one() or 0

                correct_stmt = select(func.count(Feedback.id)).where(Feedback.correct == True)
                total_fb_stmt = select(func.count(Feedback.id))
                correct_count = (await db.execute(correct_stmt)).scalar_one() or 0
                total_fb_count = (await db.execute(total_fb_stmt)).scalar_one() or 0
                
                accuracy = None
                if total_fb_count > 0:
                    accuracy = (correct_count / total_fb_count) * 100.0

                return StatsResponse(
                    total_predictions=total,
                    accuracy_pct=accuracy,
                    avg_confidence=round(avg_conf, 4),
                    predictions_today=today_count,
                    label_distribution={"cat": cat_count, "dog": dog_count},
                    avg_inference_ms=round(avg_inf, 2)
                )
        except Exception:
            pass

    # In-memory fallback
    total = len(IN_MEMORY_PREDICTIONS)
    if total == 0:
        return StatsResponse(
            total_predictions=0,
            accuracy_pct=None,
            avg_confidence=0.0,
            predictions_today=0,
            label_distribution={"cat": 0, "dog": 0},
            avg_inference_ms=0.0
        )
        
    avg_conf = sum(item["confidence"] for item in IN_MEMORY_PREDICTIONS) / total
    avg_inf = sum(item["inference_ms"] for item in IN_MEMORY_PREDICTIONS) / total
    
    cat_count = sum(1 for item in IN_MEMORY_PREDICTIONS if item["label"] == "cat")
    dog_count = sum(1 for item in IN_MEMORY_PREDICTIONS if item["label"] == "dog")
    
    # Calculate accuracy from feedback
    total_fb_count = len(IN_MEMORY_FEEDBACK)
    correct_count = sum(1 for fb in IN_MEMORY_FEEDBACK.values() if fb is True)
    accuracy = (correct_count / total_fb_count) * 100.0 if total_fb_count > 0 else None
    
    return StatsResponse(
        total_predictions=total,
        accuracy_pct=accuracy,
        avg_confidence=round(avg_conf, 4),
        predictions_today=total,  # assume mock session is all today
        label_distribution={"cat": cat_count, "dog": dog_count},
        avg_inference_ms=round(avg_inf, 2)
    )

@router.get("/model/info", response_model=ModelInfoResponse)
async def get_model_info():
    if not hasattr(_models, "svc") or _models.svc is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail="Model is not loaded."
        )
    mtime = "unknown"
    model_path = os.path.join(os.getenv("MODELS_DIR", "./models"), "svm.pkl")
    if os.path.exists(model_path):
        mtime = datetime.fromtimestamp(os.path.getmtime(model_path)).isoformat()

    return ModelInfoResponse(
        version="1.0.0",
        training_date=mtime,
        n_support=_models.svc.n_support_.tolist(),
        n_features_in=int(_models.svc.n_features_in_),
        pca_n_components=int(_models.pca.n_components_),
        pca_variance_retained=float(_models.pca.explained_variance_ratio_.sum())
    )
