from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base

class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    uav_id: Mapped[str] = mapped_column(String(64), ForeignKey("uav_fleet.id", ondelete="CASCADE"), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    acknowledged_by: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    uav = relationship("UAVFleet", back_populates="alerts")

