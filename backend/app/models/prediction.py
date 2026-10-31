from datetime import datetime
from typing import Optional
from sqlalchemy import String, Numeric, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

class FaultPrediction(Base):
    __tablename__ = "fault_predictions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    uav_id: Mapped[str] = mapped_column(String(64), ForeignKey("uav_fleet.id", ondelete="CASCADE"), nullable=False)
    component: Mapped[str] = mapped_column(String(128), nullable=False)
    subsystem: Mapped[str] = mapped_column(String(64), nullable=False)
    failure_mode: Mapped[str] = mapped_column(String(255), nullable=False)
    rul_flight_hours: Mapped[float] = mapped_column(Numeric(6, 1), nullable=False)
    confidence_score: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False)
    severity_level: Mapped[str] = mapped_column(String(16), nullable=False)
    risk_matrix: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    symptom_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recommended_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    predicted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    status: Mapped[str] = mapped_column(String(32), default="Active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    uav = relationship("UAVFleet", back_populates="fault_predictions")

