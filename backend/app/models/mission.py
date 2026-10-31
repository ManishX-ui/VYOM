from datetime import datetime
from typing import Optional, List
from sqlalchemy import BigInteger, String, Integer, Float, Numeric, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

class Mission(Base):
    __tablename__ = "missions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    uav_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("uav_fleet.id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(64), default="Surveillance")
    status: Mapped[str] = mapped_column(String(32), default="completed")
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_sec: Mapped[int] = mapped_column(Integer, default=0)
    distance_km: Mapped[float] = mapped_column(Numeric(8, 2), default=0.0)
    max_altitude_ft: Mapped[float] = mapped_column(Float, default=0.0)
    avg_speed_ms: Mapped[float] = mapped_column(Float, default=0.0)
    fuel_used_liters: Mapped[float] = mapped_column(Numeric(6, 2), default=0.0)
    operator_name: Mapped[str] = mapped_column(String(128), default="Omkar Sahu")
    callsign: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    waypoints: Mapped[list] = mapped_column(JSONB, server_default="[]", nullable=False)
    events: Mapped[list] = mapped_column(JSONB, server_default="[]", nullable=False)
    flight_summary: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    uav = relationship("UAVFleet", back_populates="missions")
    scrubber_points = relationship("MissionTelemetry", back_populates="mission", cascade="all, delete-orphan")
    anomalies = relationship("Anomaly", back_populates="mission")


class MissionTelemetry(Base):
    __tablename__ = "mission_telemetry"
    __table_args__ = (
        UniqueConstraint("mission_id", "time_offset_sec", name="uq_mission_time_offset"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    mission_id: Mapped[str] = mapped_column(String(64), ForeignKey("missions.id", ondelete="CASCADE"), nullable=False)
    time_offset_sec: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    segment_type: Mapped[str] = mapped_column(String(64), default="Normal Flight")

    # Spatial
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    alt_ft: Mapped[float] = mapped_column(Float, nullable=False)
    speed_ms: Mapped[float] = mapped_column(Float, nullable=False)
    heading_deg: Mapped[float] = mapped_column(Float, nullable=False)
    roll: Mapped[float] = mapped_column(Float, default=0.0)
    pitch: Mapped[float] = mapped_column(Float, default=0.0)
    yaw: Mapped[float] = mapped_column(Float, default=0.0)

    # Engine Snapshot
    rpm: Mapped[float] = mapped_column(Float, nullable=False)
    cht: Mapped[float] = mapped_column(Float, nullable=False)
    egt: Mapped[float] = mapped_column(Float, nullable=False)
    oil_pressure: Mapped[float] = mapped_column(Float, nullable=False)
    oil_temp: Mapped[float] = mapped_column(Float, nullable=False)
    fuel_flow: Mapped[float] = mapped_column(Float, nullable=False)
    vibration_rms: Mapped[float] = mapped_column(Float, nullable=False)
    fuel_remaining_pct: Mapped[float] = mapped_column(Float, default=100.0)
    battery_pct: Mapped[float] = mapped_column(Float, default=100.0)
    engine_health_score: Mapped[float] = mapped_column(Float, default=100.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    mission = relationship("Mission", back_populates="scrubber_points")

