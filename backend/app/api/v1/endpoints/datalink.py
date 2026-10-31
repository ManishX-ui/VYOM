"""
FastAPI REST Endpoints for GCS Datalink Integration (Phase 11)
Provides management of MAVLink and MQTT adapters, real-time connection status,
packet reception metrics, and SITL simulation testbeds.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Path

from app.schemas.datalink import (
    MAVLinkConnectionConfig,
    MQTTConnectionConfig,
    ConnectionInfo,
    DatalinkMetrics,
    DatalinkTestRequest,
    DatalinkTestResponse,
)
from app.services.datalink_manager import datalink_manager

router = APIRouter()


@router.get("/status")
def get_datalink_status() -> Dict[str, Any]:
    """Retrieves operational summary of the GCS communication subsystem."""
    metrics = datalink_manager.get_metrics()
    return {
        "status": "healthy" if metrics.active_connections > 0 else "standby",
        "total_connections": metrics.total_connections,
        "active_connections": metrics.active_connections,
        "total_packets_received": metrics.total_packets_received,
        "total_packets_rejected": metrics.total_packets_rejected,
        "average_latency_ms": metrics.average_latency_ms,
        "supported_protocols": ["MAVLink v2", "MAVLink v1", "MQTT v3.1.1/v5"],
    }


@router.get("/connections", response_model=List[ConnectionInfo])
def get_all_connections():
    """Lists all configured and active MAVLink / MQTT communication adapters."""
    return datalink_manager.get_all_connections()


@router.get("/connections/{uav_id}", response_model=ConnectionInfo)
def get_connection_by_uav(uav_id: str = Path(..., description="Target UAV airframe ID")):
    """Retrieves the active datalink status and statistics for a specific UAV airframe."""
    conn = datalink_manager.get_connection_by_uav(uav_id)
    if not conn:
        raise HTTPException(
            status_code=404,
            detail=f"No datalink adapter configured for UAV airframe '{uav_id}'."
        )
    return conn


@router.post("/connections/mavlink", response_model=ConnectionInfo)
def create_mavlink_connection(config: MAVLinkConnectionConfig):
    """Establishes or re-configures a MAVLink telemetry adapter (UDP, TCP, Serial)."""
    try:
        return datalink_manager.register_mavlink_connection(config)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize MAVLink adapter: {str(e)}"
        )


@router.post("/connections/mqtt", response_model=ConnectionInfo)
def create_mqtt_connection(config: MQTTConnectionConfig):
    """Establishes or re-configures an MQTT telemetry adapter with broker subscription."""
    try:
        return datalink_manager.register_mqtt_connection(config)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize MQTT adapter: {str(e)}"
        )


@router.delete("/connections/{connection_id}")
def delete_connection(connection_id: str = Path(..., description="Unique connection ID to disconnect")):
    """Gracefully terminates and removes an active communication adapter."""
    success = datalink_manager.remove_connection(connection_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Connection adapter '{connection_id}' not found."
        )
    return {
        "success": True,
        "connection_id": connection_id,
        "message": f"Datalink adapter '{connection_id}' successfully terminated and removed.",
    }


@router.get("/metrics", response_model=DatalinkMetrics)
def get_datalink_metrics():
    """Retrieves global telemetry reception metrics, packet loss, and latency analytics."""
    return datalink_manager.get_metrics()


@router.post("/test", response_model=DatalinkTestResponse)
def run_datalink_test(payload: DatalinkTestRequest):
    """
    Executes a deterministic UAV GCS simulation scenario to verify link resilience.
    Supported scenarios: NORMAL_TELEMETRY, CONNECTION_LOSS, RECONNECTION,
    INVALID_MESSAGE, MISSING_PARAMETERS, STALE_MESSAGES, MULTIPLE_UAV, DUPLICATE_PACKETS.
    """
    return datalink_manager.simulate_test_scenario(payload)

