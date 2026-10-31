"""
Telemetry Stream & WebSocket Broadcaster Service
Bridges to the centralized TelemetryManager for backward compatibility.
"""

from typing import Dict, Any
from fastapi import WebSocket
from app.services.telemetry_manager import telemetry_manager

class TelemetryBroadcasterBridge:
    """Compatibility bridge routing all calls to centralized TelemetryManager."""
    @property
    def active_connections(self):
        return telemetry_manager.active_connections

    @property
    def is_running(self):
        return telemetry_manager.is_broadcasting

    @is_running.setter
    def is_running(self, val: bool):
        telemetry_manager.is_broadcasting = val

    async def connect(self, websocket: WebSocket):
        await telemetry_manager.connect(websocket)

    def disconnect(self, websocket: WebSocket):
        telemetry_manager.disconnect(websocket)

    def generate_telemetry_snapshot(self) -> Dict[str, Any]:
        return telemetry_manager.get_current_snapshot()

    async def broadcast_loop(self):
        await telemetry_manager.broadcast_loop()

telemetry_broadcaster = TelemetryBroadcasterBridge()
