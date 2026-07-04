from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.database import get_db, IN_MEMORY_PREDICTIONS, IN_MEMORY_FEEDBACK
from backend.models import Prediction, Feedback
from backend.schemas import HistoryResponse, HistoryItem

router = APIRouter(prefix="/api/v1", tags=["History"])

@router.get("/history", response_model=HistoryResponse)
async def get_history(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    offset = (page - 1) * limit
    
    if db is not None:
        try:
            stmt = (
                select(Prediction, Feedback.correct)
                .outerjoin(Feedback, Prediction.id == Feedback.prediction_id)
                .order_by(Prediction.created_at.desc())
                .offset(offset)
                .limit(limit)
            )
            results = await db.execute(stmt)
            items = []
            for row in results:
                pred, feedback_correct = row
                items.append(
                    HistoryItem(
                        id=pred.id,
                        label=pred.label,
                        confidence=pred.confidence,
                        confidence_pct=pred.confidence_pct,
                        probabilities=pred.probabilities,
                        inference_ms=pred.inference_ms,
                        gradcam_b64=pred.gradcam_b64,
                        created_at=pred.created_at,
                        has_feedback=feedback_correct is not None,
                        feedback_correct=feedback_correct
                    )
                )
            count_stmt = select(func.count()).select_from(Prediction)
            total_result = await db.execute(count_stmt)
            total = total_result.scalar_one()
            pages = (total + limit - 1) // limit
            return HistoryResponse(items=items, total=total, page=page, pages=pages)
        except Exception:
            pass
            
    # In-memory fallback
    total = len(IN_MEMORY_PREDICTIONS)
    items = []
    subset = IN_MEMORY_PREDICTIONS[offset : offset + limit]
    for item in subset:
        fb = IN_MEMORY_FEEDBACK.get(item["id"])
        items.append(
            HistoryItem(
                id=item["id"],
                label=item["label"],
                confidence=item["confidence"],
                confidence_pct=item["confidence_pct"],
                probabilities=item["probabilities"],
                inference_ms=item["inference_ms"],
                gradcam_b64=item["gradcam_b64"],
                created_at=item["created_at"],
                has_feedback=fb is not None,
                feedback_correct=fb
            )
        )
    pages = (total + limit - 1) // limit if total > 0 else 1
    return HistoryResponse(items=items, total=total, page=page, pages=pages)
