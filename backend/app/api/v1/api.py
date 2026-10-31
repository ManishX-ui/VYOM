from fastapi import APIRouter
from app.api.v1.endpoints import (
    telemetry,
    digital_twin,
    anomalies,
    predictions,
    predictive_maintenance,
    missions,
    alerts,
    uav,
    auth,
    sensors,
    datalink,
)

api_router = APIRouter()

api_router.include_router(telemetry.router, prefix="/telemetry", tags=["Telemetry"])
api_router.include_router(datalink.router, prefix="/datalink", tags=["GCS Datalink"])
api_router.include_router(sensors.router, prefix="/sensors", tags=["Sensors"])
api_router.include_router(digital_twin.router, prefix="/twin", tags=["Digital Twin"])
api_router.include_router(anomalies.router, prefix="/anomalies", tags=["Anomalies"])
api_router.include_router(predictions.router, prefix="/predictions", tags=["Predictions"])
api_router.include_router(predictive_maintenance.router, prefix="/predictive-maintenance", tags=["Predictive Maintenance & RUL"])
api_router.include_router(missions.router, prefix="/missions", tags=["Missions"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(uav.router, prefix="/uavs", tags=["UAVs"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])

@api_router.get("/notifications", tags=["Notifications"])
def get_notifications_queue(unread_only: bool = False, limit: int = 50):
    from app.services.notification_service import notification_service
    return notification_service.get_notifications(unread_only=unread_only, limit=limit)

@api_router.post("/notifications/{notification_id}/read", tags=["Notifications"])
def mark_notification_as_read(notification_id: str):
    from app.services.notification_service import notification_service
    success = notification_service.mark_as_read(notification_id)
    return {"notification_id": notification_id, "success": success}

@api_router.get("/health", tags=["Health"])
def health_check():
    from app.core.config import settings
    return {
        "status": "healthy",
        "service": "VYOM Aero Digital Twin Backend",
        "version": settings.VERSION,
    }

