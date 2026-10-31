from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Numeric, Float, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

class UAVFleet(Base):
    __tablename__ = "uav_fleet"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    callsign: Mapped[str] = mapped_column(String(64), nullable=False)
    model: Mapped[str] = mapped_column(String(128), nullable=False)
    engine_type: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="standby")
    health_score: Mapped[float] = mapped_column(Numeric(5, 2), default=100.0)
    flight_hours: Mapped[float] = mapped_column(Numeric(8, 2), default=0.0)
    last_latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    last_longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    last_altitude_ft: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    last_contact: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=True)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, server_default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    telemetry_records = relationship("Telemetry", back_populates="uav", cascade="all, delete-orphan")
    missions = relationship("Mission", back_populates="uav")
    anomalies = relationship("Anomaly", back_populates="uav", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="uav", cascade="all, delete-orphan")
    fault_predictions = relationship("FaultPrediction", back_populates="uav", cascade="all, delete-orphan")

