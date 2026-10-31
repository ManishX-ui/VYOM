from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from app.schemas.anomaly import (
    AnomalyRecordRead,
    AnomalyInvestigateResponse,
    AnomalyDetectRequest,
    AnomalyDetectResponse,
    ModelInfoResponse,
)
from app.services.anomaly_service import anomaly_service

router = APIRouter()

@router.post("/detect", response_model=AnomalyDetectResponse)
def detect_anomaly(payload: AnomalyDetectRequest):
    """
    Evaluates real-time or historical telemetry using the trained Isolation Forest ML model.
    Returns anomaly scores, classification, and attributed sensor contributors.
    """
    telemetry_dict = payload.model_dump()
    return anomaly_service.detect(
        telemetry=telemetry_dict,
        uav_id=payload.uav_id,
        mission_id=payload.mission_id,
        operating_mode=payload.operating_mode or "DEMO",
    )

@router.get("/model-info", response_model=ModelInfoResponse)
def get_model_info():
    """Returns active Isolation Forest model version, training metrics, and feature configurations."""
    return anomaly_service.get_model_info()

@router.get("", response_model=List[AnomalyRecordRead])
def list_anomalies(
    uav_id: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
):
    """List all detected engine parameter deviations and anomalies."""
    return anomaly_service.get_all(uav_id=uav_id, severity=severity, status=status)

@router.get("/{anomaly_id}", response_model=AnomalyRecordRead)
def get_anomaly(anomaly_id: str):
    """Retrieve details of a specific anomaly."""
    res = anomaly_service.get_by_id(anomaly_id)
    if not res:
        raise HTTPException(status_code=404, detail=f"Anomaly with ID '{anomaly_id}' not found.")
    return res

@router.post("/{anomaly_id}/investigate", response_model=AnomalyInvestigateResponse)
def investigate_anomaly(anomaly_id: str):
    """Perform diagnostic attribution and action recommendation on a flagged anomaly."""
    res = anomaly_service.investigate(anomaly_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res
