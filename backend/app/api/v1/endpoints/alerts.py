"""
Alert Management & Real-Time Notification Queue Endpoints - Phase 10
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from app.schemas.alert import (
    AlertRecordRead,
    AlertAcknowledgeRequest,
    AlertInvestigateRequest,
    AlertResolveRequest,
    AlertDismissRequest,
    AlertSummaryResponse,
    NotificationItem,
)
from app.services.alert_service import alert_service
from app.services.notification_service import notification_service

router = APIRouter()

@router.get("", response_model=List[AlertRecordRead])
def list_alerts(
    uav_id: Optional[str] = Query(None, description="Filter by UAV airframe ID"),
    severity: Optional[str] = Query(None, description="Filter by severity: Critical, High, Medium, Low, Informational"),
    status: Optional[str] = Query(None, description="Filter by status: Active, Acknowledged, Investigating, Resolved, Dismissed"),
    component: Optional[str] = Query(None, description="Filter by affected engine component"),
    search: Optional[str] = Query(None, description="Keyword search in alert title or description"),
):
    """Retrieve all logged engine telemetry alerts and incidents with multi-dimensional filtering."""
    target_uav = uav_id if isinstance(uav_id, str) else None
    sev = severity if isinstance(severity, str) else None
    stat = status if isinstance(status, str) else None
    comp = component if isinstance(component, str) else None
    q = search if isinstance(search, str) else None

    return alert_service.get_all(
        uav_id=target_uav,
        severity=sev,
        status=stat,
        component=comp,
        search=q,
    )

@router.get("/summary", response_model=AlertSummaryResponse)
def get_alerts_summary(
    uav_id: Optional[str] = Query(None, description="Filter by UAV airframe ID"),
):
    """Retrieve real-time summary statistics for executive operator KPI tiles."""
    target_uav = uav_id if isinstance(uav_id, str) else None
    return alert_service.get_summary(uav_id=target_uav)

@router.get("/history")
def get_alerts_history(
    uav_id: Optional[str] = Query(None, description="Filter by UAV airframe ID"),
):
    """Retrieve chronological audit trail of all alert state transitions."""
    target_uav = uav_id if isinstance(uav_id, str) else None
    return alert_service.get_history(uav_id=target_uav)

@router.get("/notifications", response_model=List[NotificationItem])
def get_notifications(
    uav_id: Optional[str] = Query(None, description="Filter by UAV airframe ID"),
    unread_only: bool = Query(False, description="Filter unread notifications only"),
    limit: int = Query(50, description="Max notifications to retrieve"),
):
    """Retrieve real-time prioritized notifications from the notification queue."""
    target_uav = uav_id if isinstance(uav_id, str) else None
    return notification_service.get_notifications(
        uav_id=target_uav,
        unread_only=unread_only,
        limit=limit,
    )

@router.get("/{alert_id}", response_model=AlertRecordRead)
def get_alert_detail(alert_id: str):
    """Retrieve full diagnostic dossier and audit trail for a specific alert."""
    alert = alert_service.get_by_id(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert with ID '{alert_id}' not found.")
    return alert

@router.post("/{alert_id}/acknowledge", response_model=AlertRecordRead)
def acknowledge_alert(alert_id: str, payload: AlertAcknowledgeRequest):
    """Mark an alert as acknowledged by an authorized mission controller."""
    res = alert_service.acknowledge(alert_id, payload.acknowledged_by)
    if not res:
        raise HTTPException(status_code=404, detail=f"Alert with ID '{alert_id}' not found.")
    return res

@router.post("/{alert_id}/investigate", response_model=AlertRecordRead)
def investigate_alert(alert_id: str, payload: AlertInvestigateRequest):
    """Mark an alert as under active investigation with diagnostic triage notes."""
    res = alert_service.investigate(alert_id, payload.investigated_by, payload.investigation_notes)
    if not res:
        raise HTTPException(status_code=404, detail=f"Alert with ID '{alert_id}' not found.")
    return res

@router.post("/{alert_id}/resolve", response_model=AlertRecordRead)
def resolve_alert(alert_id: str, payload: AlertResolveRequest):
    """Mark an alert as resolved with engineering and maintenance notes."""
    res = alert_service.resolve(alert_id, payload.resolved_by or "Mission Controller", payload.resolution_notes)
    if not res:
        raise HTTPException(status_code=404, detail=f"Alert with ID '{alert_id}' not found.")
    return res

@router.post("/{alert_id}/dismiss", response_model=AlertRecordRead)
def dismiss_alert(alert_id: str, payload: AlertDismissRequest):
    """Dismiss informational or minor notifications (critical alerts cannot be dismissed)."""
    res = alert_service.dismiss(alert_id, payload.dismissed_by, payload.reason)
    if not res:
        raise HTTPException(
            status_code=400,
            detail=f"Alert '{alert_id}' cannot be dismissed. High and Critical severity alarms require full resolution.",
        )
    return res
