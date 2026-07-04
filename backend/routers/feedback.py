import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database import get_db, IN_MEMORY_PREDICTIONS, IN_MEMORY_FEEDBACK
from backend.models import Prediction, Feedback
from backend.schemas import FeedbackRequest, FeedbackResponse

router = APIRouter(prefix="/api/v1", tags=["Feedback"])

@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    payload: FeedbackRequest,
    db: AsyncSession = Depends(get_db)
):
    if db is not None:
        try:
            prediction = await db.get(Prediction, payload.result_id)
            if not prediction:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, 
                    detail="Prediction not found."
                )
            stmt = select(Feedback).where(Feedback.prediction_id == payload.result_id)
            result = await db.execute(stmt)
            existing_feedback = result.scalar_one_or_none()
            if existing_feedback:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT, 
                    detail="Feedback already exists."
                )
            feedback = Feedback(
                id=uuid.uuid4(),
                prediction_id=payload.result_id,
                correct=payload.correct
            )
            db.add(feedback)
            await db.commit()
            return FeedbackResponse(ok=True, message="Thank you for your feedback!")
        except HTTPException:
            raise
        except Exception:
            pass
            
    # In-memory fallback
    found = False
    for item in IN_MEMORY_PREDICTIONS:
        if item["id"] == payload.result_id:
            found = True
            break
    if not found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Prediction not found in memory."
        )
    if payload.result_id in IN_MEMORY_FEEDBACK:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Feedback already submitted in memory."
        )
        
    IN_MEMORY_FEEDBACK[payload.result_id] = payload.correct
    return FeedbackResponse(ok=True, message="Feedback logged to memory. Thank you!")
