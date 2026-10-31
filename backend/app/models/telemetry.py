from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, String, Float, Boolean, Numeric, DateTime, ForeignKey, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

class Telemetry(Base):
    __tablename__ = "telemetry"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    uav_id: Mapped[str] = mapped_column(String(64), ForeignKey("uav_fleet.id", ondelete="CASCADE"), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    mode: Mapped[str] = mapped_column(String(16), nullable=False, default="DEMO")
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # 8 Core Aero Engine Parameters
    rpm: Mapped[float] = mapped_column(Float, nullable=False)
    cht: Mapped[float] = mapped_column(Float, nullable=False)
    egt: Mapped[float] = mapped_column(Float, nullable=False)
    oil_pressure: Mapped[float] = mapped_column(Float, nullable=False)
    oil_temperature: Mapped[float] = mapped_column(Float, nullable=False)
    fuel_flow: Mapped[float] = mapped_column(Float, nullable=False)
    vibration_rms: Mapped[float] = mapped_column(Float, nullable=False)
    injection_timing: Mapped[float] = mapped_column(Float, nullable=False)

    # Secondary Engine & Electrical
    manifold_pressure_inhg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    coolant_temp: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fuel_pressure: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    battery_voltage: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    battery_current: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    battery_soc: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Navigation & Spatial
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    altitude_ft: Mapped[float] = mapped_column(Float, nullable=False)
    ground_speed_ms: Mapped[float] = mapped_column(Float, nullable=False)
    heading_deg: Mapped[float] = mapped_column(Float, nullable=False)
    roll_deg: Mapped[float] = mapped_column(Float, default=0.0)
    pitch_deg: Mapped[float] = mapped_column(Float, default=0.0)
    yaw_deg: Mapped[float] = mapped_column(Float, default=0.0)
    vertical_speed_ms: Mapped[float] = mapped_column(Float, default=0.0)

    # Diagnostics
    engine_health_score: Mapped[float] = mapped_column(Numeric(5, 2), default=100.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    uav = relationship("UAVFleet", back_populates="telemetry_records")

