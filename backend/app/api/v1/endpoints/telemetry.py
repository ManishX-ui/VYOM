"""
Telemetry REST & WebSocket API Endpoints
"""

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from app.schemas.telemetry import (
    EngineTelemetryRead,
    TelemetryControlRequest,
    TelemetryStatusResponse,
)
from app.services.telemetry_manager import telemetry_manager

router = APIRouter()

@router.get("/live", response_model=EngineTelemetryRead)
def get_live_telemetry():
    """Retrieve the most recent real-time engine telemetry snapshot from the centralized manager."""
    return telemetry_manager.get_current_snapshot()

@router.get("/history")
def get_telemetry_history(
    range: str = "15m",
    uav_id: str = None,
):
    """
    Retrieve downsampled historical telemetry data points for graph visualization.
    Supports time filters: 1m, 5m, 15m, 1h, 6h, 24h.
    Strictly isolated by operating mode (DEMO, REPLAY, LIVE).
    """
    return telemetry_manager.get_telemetry_history(time_range=range, uav_id=uav_id)

@router.get("/status", response_model=TelemetryStatusResponse)
def get_telemetry_status():
    """Get the operational status of the centralized telemetry engine."""
    return {
        "mode": telemetry_manager.mode.value,
        "scenario": telemetry_manager.scenario.value,
        "uav_id": telemetry_manager.active_uav_id,
        "is_live_connected": telemetry_manager.is_live_connected(),
        "live_datalink_carrier_lock": telemetry_manager.is_live_connected(),
        "connected_clients": len(telemetry_manager.active_connections),
        "last_telemetry_timestamp": telemetry_manager.latest_snapshot.get("timestamp"),
        "sample_rate_hz": 1.0,
    }

@router.post("/control")
def control_telemetry(payload: TelemetryControlRequest):
    """
    Configure the active operating mode (DEMO, REPLAY, LIVE), simulation scenario, or active airframe.
    """
    if payload.mode:
        success = telemetry_manager.set_mode(payload.mode)
        if not success:
            raise HTTPException(status_code=400, detail=f"Invalid telemetry mode: {payload.mode}")

    if payload.scenario:
        success = telemetry_manager.set_scenario(payload.scenario)
        if not success:
            raise HTTPException(status_code=400, detail=f"Invalid scenario: {payload.scenario}")

    if payload.uav_id:
        telemetry_manager.set_active_uav(payload.uav_id)

    if payload.jitter_factor is not None:
        telemetry_manager.jitter_factor = max(0.0, min(2.0, payload.jitter_factor))

    return {
        "status": "updated",
        "current_mode": telemetry_manager.mode.value,
        "current_scenario": telemetry_manager.scenario.value,
        "active_uav": telemetry_manager.active_uav_id,
    }

@router.post("/ingest/live")
def ingest_live_telemetry(packet: dict):
    """
    Ingest a real telemetry frame from a Ground Control Station (GCS) or MAVLink translator.
    """
    telemetry_manager.ingest_live_packet(packet)
    return {"status": "accepted", "uav_id": telemetry_manager.active_uav_id}

@router.websocket("/ws")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    """
    Real-time bi-directional WebSocket stream for centralized engine telemetry.
    Clients receive 1.0 Hz synchronized frames and can dispatch JSON action messages.
    """
    await telemetry_manager.connect(websocket)
    try:
        while True:
            text = await websocket.receive_text()
            try:
                msg = json.loads(text)
                action = msg.get("action")
                if action == "set_mode" and "mode" in msg:
                    telemetry_manager.set_mode(msg["mode"])
                elif action == "set_scenario" and "scenario" in msg:
                    telemetry_manager.set_scenario(msg["scenario"])
                elif action == "select_uav" and "uav_id" in msg:
                    telemetry_manager.set_active_uav(msg["uav_id"])
            except json.JSONDecodeError:
                pass  # Ignore non-JSON heartbeat pings
    except WebSocketDisconnect:
        telemetry_manager.disconnect(websocket)
