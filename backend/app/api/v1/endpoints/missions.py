from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from app.schemas.mission import MissionRecordRead, MissionAnalyticsSummary
from app.services.mission_service import mission_service

router = APIRouter()

@router.get("", response_model=List[MissionRecordRead])
def list_missions(
    uav_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
):
    """List historical and active UAV surveillance missions with search and filter capabilities."""
    return mission_service.get_all(uav_id=uav_id, status=status, search=search)

@router.get("/{mission_id}", response_model=MissionRecordRead)
def get_mission(mission_id: str):
    """Retrieve full mission replay data including synchronized timeline and waypoints."""
    mission = mission_service.get_by_id(mission_id)
    if not mission:
        raise HTTPException(status_code=404, detail=f"Mission with ID '{mission_id}' not found.")
    return mission

@router.get("/{mission_id}/analytics", response_model=Dict[str, Any])
def get_mission_analytics(mission_id: str):
    """Retrieve verified mission metrics and engine analytics calculated from recorded telemetry."""
    analytics = mission_service.get_analytics(mission_id)
    if "error" in analytics:
        raise HTTPException(status_code=404, detail=analytics["error"])
    return analytics
