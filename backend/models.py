import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Boolean, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from backend.database import Base

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    label = Column(String(10), nullable=False)
    confidence = Column(Float, nullable=False)
    confidence_pct = Column(Float, nullable=False)
    probabilities = Column(JSON, nullable=False)
    inference_ms = Column(Float, nullable=False)
    gradcam_b64 = Column(Text, nullable=True)
    ip_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prediction_id = Column(UUID(as_uuid=True), ForeignKey("predictions.id", ondelete="CASCADE"), unique=True, nullable=False)
    correct = Column(Boolean, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
