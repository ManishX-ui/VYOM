from datetime import datetime
from typing import Optional
from sqlalchemy import String, Float, Numeric, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

class Anomaly(Base):
    __tablename__ = "anomalies"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    uav_id: Mapped[str] = mapped_column(String(64), ForeignKey("uav_fleet.id", ondelete="CASCADE"), nullable=False)
    mission_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("missions.id", ondelete="SET NULL"), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    subsystem: Mapped[str] = mapped_column(String(64), nullable=False)
    parameter_name: Mapped[str] = mapped_column(String(64), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    observed_value: Mapped[float] = mapped_column(Float, nullable=False)
    expected_range_min: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    expected_range_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    unit: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    deviation_sigma: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    confidence_score: Mapped[Optional[float]] = mapped_column(Numeric(4, 3), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="Active")
    root_cause_diagnosis: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recommended_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, server_default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    uav = relationship("UAVFleet", back_populates="anomalies")
    mission = relationship("Mission", back_populates="anomalies")

