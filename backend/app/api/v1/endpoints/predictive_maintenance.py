"""
Predictive Maintenance & RUL REST API Endpoints - Phase 9
"""

from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional, Dict, Any

from app.schemas.predictive_maintenance import (
    PredictiveMaintenanceOverview,
    RULPredictionResponse,
    RULPredictionRequest,
    ComponentRULDetail,
    MaintenanceRecommendation,
    PredictionHistoryRecord,
)
from app.services.predictive_maintenance_service import predictive_maintenance_service
from app.services.rul_service import rul_service
from app.services.telemetry_manager import telemetry_manager

router = APIRouter()

@router.get("/overview", response_model=PredictiveMaintenanceOverview)
def get_predictive_maintenance_overview(
    uav_id: Optional[str] = Query(None, description="UAV airframe ID"),
    horizon_hours: int = Query(50, description="Forecast horizon in flight hours (e.g. 6, 24, 50, 100)"),
):
    """
    Returns complete predictive maintenance overview including RUL estimates,
    component degradation breakdowns, trend forecasts, and maintenance recommendations.
    """
    target_uav = uav_id if isinstance(uav_id, str) else None
    h_hours = horizon_hours if isinstance(horizon_hours, int) else 50
    return predictive_maintenance_service.get_overview(
        uav_id=target_uav,
        horizon_hours=h_hours,
    )

@router.get("/rul", response_model=RULPredictionResponse)
def get_current_rul(
    uav_id: Optional[str] = Query(None, description="UAV airframe ID"),
):
    """
    Returns instantaneous Remaining Useful Life (RUL) regression for the active UAV telemetry snapshot.
    """
    target_uav = uav_id if isinstance(uav_id, str) else telemetry_manager.active_uav_id
    snapshot = telemetry_manager.get_current_snapshot()
    return rul_service.predict_rul(
        telemetry=snapshot,
        uav_id=target_uav,
        operating_mode=telemetry_manager.mode.value,
    )

@router.get("/components", response_model=List[ComponentRULDetail])
def get_components_health(
    uav_id: Optional[str] = Query(None, description="UAV airframe ID"),
):
    """
    Returns detailed degradation health and RUL for each monitored aero-engine subsystem.
    """
    target_uav = uav_id if isinstance(uav_id, str) else None
    return predictive_maintenance_service.get_components_health(uav_id=target_uav)

@router.get("/recommendations", response_model=List[MaintenanceRecommendation])
def get_maintenance_recommendations(
    uav_id: Optional[str] = Query(None, description="UAV airframe ID"),
):
    """
    Returns prioritized maintenance recommendations and actionable technical instructions.
    """
    target_uav = uav_id if isinstance(uav_id, str) else None
    return predictive_maintenance_service.get_recommendations(uav_id=target_uav)

@router.get("/history", response_model=List[PredictionHistoryRecord])
def get_prediction_history(
    uav_id: Optional[str] = Query(None, description="UAV airframe ID"),
):
    """
    Returns chronological operational history of RUL estimates and health assessments.
    """
    target_uav = uav_id if isinstance(uav_id, str) else None
    return predictive_maintenance_service.get_history(uav_id=target_uav)

@router.post("/predict", response_model=RULPredictionResponse)
def predict_custom_telemetry(payload: RULPredictionRequest):
    """
    Computes ad-hoc ML RUL regression on custom or simulated operational telemetry.
    """
    telemetry_dict = payload.model_dump()
    return rul_service.predict_rul(
        telemetry=telemetry_dict,
        flight_hours=payload.flight_hours,
        flight_cycles=payload.flight_cycles,
        uav_id=payload.uav_id or "UAV-ROTAX-001",
        operating_mode=payload.operating_mode or "DEMO",
    )
