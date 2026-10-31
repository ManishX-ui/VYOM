"""
VYOM Sensor Monitoring REST API Endpoints
Provides real-time sensor metrics, multi-state health diagnostics,
downsampled time-horizon history, and software calibration management.
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from app.services.sensor_manager import sensor_manager

router = APIRouter()

class SensorCalibrationRequest(BaseModel):
    reference_value: float = Field(..., description="Known reference standard value")
    measured_value: float = Field(..., description="Raw sensor reading value")
    technician: Optional[str] = Field("FLIGHT_CREW", description="Technician callsign or operator ID")
    notes: Optional[str] = Field("", description="Calibration rationale and bench observations")

class SensorThresholdsRequest(BaseModel):
    min_normal: Optional[float] = None
    max_normal: Optional[float] = None
    min_warning: Optional[float] = None
    max_warning: Optional[float] = None
    min_critical: Optional[float] = None
    max_critical: Optional[float] = None
    max_rate_change: Optional[float] = None

@router.get("", response_model=List[Dict[str, Any]])
def list_sensors(uav_id: Optional[str] = Query(None, description="Optional UAV airframe ID")):
    """
    Retrieve real-time status, readings, thresholds, and health states
    for all monitored Engine, Flight, and Electrical sensors.
    """
    return sensor_manager.get_all_sensors(uav_id=uav_id)

@router.get("/{sensor_id}")
def get_sensor_detail(sensor_id: str):
    """
    Retrieve detailed sensor profile including operational specifications,
    effective thresholds, and complete software calibration history.
    """
    sensor = sensor_manager.get_sensor_detail(sensor_id)
    if not sensor:
        raise HTTPException(status_code=404, detail=f"Sensor '{sensor_id}' not found")
    return sensor

@router.get("/{sensor_id}/history")
def get_sensor_history(
    sensor_id: str,
    range: str = Query("15m", description="Time window: 1m, 5m, 15m, 1h, 6h, 24h"),
):
    """
    Retrieve downsampled time-series historical readings for a specific sensor.
    Synchronized with the centralized telemetry engine.
    """
    valid_ranges = ["1m", "5m", "15m", "1h", "6h", "24h"]
    if range.lower() not in valid_ranges:
        raise HTTPException(status_code=400, detail=f"Invalid time range: {range}. Valid: {valid_ranges}")

    return sensor_manager.get_sensor_history(sensor_id=sensor_id, time_range=range)

@router.post("/{sensor_id}/calibrate")
def calibrate_sensor(sensor_id: str, payload: SensorCalibrationRequest):
    """
    Apply software offset and scale calibration to a sensor.
    Raw telemetry is strictly preserved; calibrated values are computed separately.
    Does not replace physical sensor hardware calibration.
    """
    try:
        return sensor_manager.calibrate_sensor(
            sensor_id=sensor_id,
            reference_value=payload.reference_value,
            measured_value=payload.measured_value,
            technician=payload.technician or "SYSTEM_OPERATOR",
            notes=payload.notes or "",
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{sensor_id}/reset-calibration")
def reset_calibration(sensor_id: str):
    """
    Reset software calibration offset and scale back to baseline factory defaults.
    """
    return sensor_manager.reset_calibration(sensor_id=sensor_id)

@router.post("/{sensor_id}/thresholds")
def update_sensor_thresholds(sensor_id: str, payload: SensorThresholdsRequest):
    """
    Update configurable operational, warning, and critical thresholds for a sensor.
    """
    try:
        updates = payload.model_dump(exclude_unset=True)
        return sensor_manager.update_thresholds(sensor_id=sensor_id, thresholds=updates)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

