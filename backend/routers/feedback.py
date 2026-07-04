import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database import get_db
from backend.models import Prediction, Feedback
from backend.schemas import FeedbackRequest, FeedbackResponse

router = APIRouter(prefix="/api/v1", tags=["Feedback"])

@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    payload: FeedbackRequest,
    db: AsyncSession = Depends(get_db)
):
    # Verify prediction exists
    prediction = await db.get(Prediction, payload.result_id)
    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Prediction not found."
        )

    # Check duplicate feedback
    stmt = select(Feedback).where(Feedback.prediction_id == payload.result_id)
    result = await db.execute(stmt)
    existing_feedback = result.scalar_one_or_none()
    if existing_feedback:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Feedback already exists for this prediction."
        )

    feedback = Feedback(
        id=uuid.uuid4(),
        prediction_id=payload.result_id,
        correct=payload.correct
    )
    db.add(feedback)
    await db.commit()

    return FeedbackResponse(ok=True, message="Thank you for your feedback!")
