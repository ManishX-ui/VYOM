"""
Pydantic Schemas for GCS Datalink Integration (Phase 11)
Defines communication protocols, connection configurations, metrics, and validation schemas
for MAVLink and MQTT telemetry reception.
"""

from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field


class ProtocolType(str, Enum):
    MAVLINK = "MAVLINK"
    MQTT = "MQTT"


class MAVLinkTransport(str, Enum):
    UDP = "UDP"
    TCP = "TCP"
    SERIAL = "SERIAL"


class DatalinkConnectionStatus(str, Enum):
    CONNECTED = "CONNECTED"
    CONNECTING = "CONNECTING"
    DISCONNECTED = "DISCONNECTED"
    DEGRADED = "DEGRADED"
    ERROR = "ERROR"


class MAVLinkConnectionConfig(BaseModel):
    connection_id: Optional[str] = Field(None, description="Unique connection identifier")
    uav_id: str = Field(..., description="Target UAV airframe ID (e.g. UAV-MALE-IND-01)")
    transport: MAVLinkTransport = Field(MAVLinkTransport.UDP, description="Transport layer (UDP, TCP, SERIAL)")
    address: str = Field("0.0.0.0", description="IP address or host to bind or connect")
    port: int = Field(14550, description="UDP or TCP port number")
    device_path: Optional[str] = Field(None, description="Serial device path (e.g. COM3 or /dev/ttyUSB0)")
    baudrate: int = Field(115200, description="Serial baud rate")
    mavlink_version: int = Field(2, description="MAVLink protocol version (1 or 2)")
    signing_key: Optional[str] = Field(None, description="Optional MAVLink 2 cryptographic signing key")
    heartbeat_timeout_sec: float = Field(5.0, description="Seconds without heartbeat before flagging DEGRADED")


class MQTTConnectionConfig(BaseModel):
    connection_id: Optional[str] = Field(None, description="Unique connection identifier")
    uav_id: str = Field(..., description="Target UAV airframe ID (e.g. UAV-MALE-IND-01)")
    broker_address: str = Field("localhost", description="MQTT broker hostname or IP")
    port: int = Field(1883, description="MQTT broker port (typically 1883 or 8883 for TLS)")
    client_id: Optional[str] = Field(None, description="MQTT client ID")
    username: Optional[str] = Field(None, description="Broker authentication username")
    password: Optional[str] = Field(None, description="Broker authentication password")
    use_tls: bool = Field(False, description="Whether to use TLS/SSL encryption")
    ca_cert_path: Optional[str] = Field(None, description="Path to CA certificate file for TLS")
    client_cert_path: Optional[str] = Field(None, description="Path to client certificate for mTLS")
    client_key_path: Optional[str] = Field(None, description="Path to client private key for mTLS")
    qos: int = Field(1, ge=0, le=2, description="MQTT Quality of Service (0, 1, or 2)")
    topics: Optional[List[str]] = Field(None, description="Custom list of topic subscriptions")
    keepalive: int = Field(60, description="Keep-alive interval in seconds")


class ConnectionInfo(BaseModel):
    connection_id: str
    uav_id: str
    protocol: ProtocolType
    status: DatalinkConnectionStatus
    endpoint: str
    connected_at: Optional[str] = None
    last_packet_time: Optional[str] = None
    packets_received: int = 0
    packets_rejected: int = 0
    latency_ms: Optional[float] = None
    uptime_seconds: float = 0.0
    error_message: Optional[str] = None
    is_active: bool = False
    details: Optional[Dict[str, Any]] = None


class DatalinkMetrics(BaseModel):
    total_connections: int
    active_connections: int
    total_packets_received: int
    total_packets_rejected: int
    average_latency_ms: Optional[float] = None
    rejection_reasons_breakdown: Dict[str, int] = Field(default_factory=dict)
    connections: List[ConnectionInfo] = Field(default_factory=list)


class DatalinkTestRequest(BaseModel):
    scenario: str = Field("NORMAL_TELEMETRY", description="Simulation scenario to execute")
    uav_id: Optional[str] = Field("UAV-MALE-IND-01", description="Target UAV airframe ID")
    protocol: Optional[ProtocolType] = Field(ProtocolType.MAVLINK, description="Protocol to test")
    custom_parameters: Optional[Dict[str, Any]] = Field(None, description="Optional custom telemetry values")


class DatalinkTestResponse(BaseModel):
    success: bool
    scenario: str
    protocol: str
    uav_id: str
    packets_dispatched: int
    message: str
    snapshot_sample: Optional[Dict[str, Any]] = None

