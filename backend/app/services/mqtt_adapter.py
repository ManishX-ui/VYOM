"""
MQTT Protocol Adapter for VYOM Digital Twin (Phase 11)
Handles real-time telemetry from GCS/UAV via MQTT broker topics:
- vyom/uav/{uav_id}/telemetry
- vyom/uav/{uav_id}/status
- vyom/uav/{uav_id}/engine
- vyom/uav/{uav_id}/health
Supports TLS encryption, client authentication, configurable QoS, and reconnect logic.
"""

import json
import logging
import ssl
import time
from datetime import datetime, timezone
from typing import Callable, Dict, Any, Optional

from app.schemas.datalink import (
    MQTTConnectionConfig,
    ConnectionInfo,
    ProtocolType,
    DatalinkConnectionStatus,
)

logger = logging.getLogger("vyom.datalink.mqtt")


class MQTTAdapter:
    """
    Modular MQTT communication adapter for IoT/GCS telemetry reception.
    Connects to broker, subscribes to configured UAV topics, and dispatches JSON telemetry.
    """

    def __init__(
        self,
        config: MQTTConnectionConfig,
        on_packet_callback: Optional[Callable[[str, Dict[str, Any]], None]] = None,
    ):
        self.config = config
        self.connection_id = config.connection_id or f"MQTT-{config.uav_id}-{int(time.time())}"
        self.uav_id = config.uav_id
        self.on_packet_callback = on_packet_callback

        self.status = DatalinkConnectionStatus.DISCONNECTED
        self.client = None
        self.connected_at: Optional[float] = None
        self.last_packet_time: Optional[float] = None
        self.packets_received = 0
        self.packets_rejected = 0
        self.latest_latency_ms: Optional[float] = None
        self.error_message: Optional[str] = None

        # Build default topic subscription set
        default_topics = [
            f"vyom/uav/{self.uav_id}/telemetry",
            f"vyom/uav/{self.uav_id}/status",
            f"vyom/uav/{self.uav_id}/engine",
            f"vyom/uav/{self.uav_id}/health",
        ]
        self.topics = config.topics or default_topics

    @property
    def endpoint_str(self) -> str:
        protocol_scheme = "mqtts" if self.config.use_tls else "mqtt"
        return f"{protocol_scheme}://{self.config.broker_address}:{self.config.port}"

    def connect(self) -> bool:
        """Initializes paho MQTT client, configures auth/TLS, and connects to broker."""
        try:
            import paho.mqtt.client as mqtt

            self.status = DatalinkConnectionStatus.CONNECTING
            self.error_message = None

            client_id = self.config.client_id or f"vyom-gcs-{self.uav_id}-{int(time.time())}"
            # Support paho-mqtt v2.0 callback API versioning
            try:
                self.client = mqtt.Client(
                    callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
                    client_id=client_id,
                )
            except AttributeError:
                self.client = mqtt.Client(client_id=client_id)

            # Set authentication if credentials provided
            if self.config.username:
                self.client.username_pw_set(self.config.username, self.config.password)

            # Set TLS if enabled
            if self.config.use_tls:
                ctx = ssl.create_default_context()
                if self.config.ca_cert_path:
                    ctx.load_verify_locations(cafile=self.config.ca_cert_path)
                if self.config.client_cert_path and self.config.client_key_path:
                    ctx.load_cert_chain(
                        certfile=self.config.client_cert_path,
                        keyfile=self.config.client_key_path,
                    )
                self.client.tls_set_context(ctx)

            # Attach event handlers
            self.client.on_connect = self._on_connect
            self.client.on_disconnect = self._on_disconnect
            self.client.on_message = self._on_message

            logger.info(f"Connecting MQTT adapter {self.connection_id} to {self.endpoint_str}")
            self.client.connect_async(
                self.config.broker_address,
                self.config.port,
                keepalive=self.config.keepalive,
            )
            self.client.loop_start()

            self.connected_at = time.time()
            self.status = DatalinkConnectionStatus.CONNECTED
            return True

        except Exception as e:
            self.status = DatalinkConnectionStatus.ERROR
            self.error_message = f"MQTT connection failed: {str(e)}"
            logger.error(self.error_message, exc_info=True)
            return False

    def disconnect(self) -> bool:
        """Disconnects client and terminates network worker loop."""
        if self.client:
            try:
                self.client.loop_stop()
                self.client.disconnect()
            except Exception as e:
                logger.warning(f"Error disconnecting MQTT client: {e}")
            self.client = None

        self.status = DatalinkConnectionStatus.DISCONNECTED
        logger.info(f"MQTT adapter disconnected: {self.connection_id}")
        return True

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        """Callback when broker acknowledges connection."""
        # Handle int return code or ReasonCode enum
        rc_code = getattr(rc, "value", rc)
        if rc_code == 0:
            self.status = DatalinkConnectionStatus.CONNECTED
            self.connected_at = time.time()
            logger.info(f"MQTT connected successfully for {self.connection_id}. Subscribing to topics: {self.topics}")
            for t in self.topics:
                client.subscribe(t, qos=self.config.qos)
        else:
            self.status = DatalinkConnectionStatus.ERROR
            self.error_message = f"MQTT broker rejected connection with code {rc_code}"
            logger.error(self.error_message)

    def _on_disconnect(self, client, userdata, disconnect_flags=None, rc=None, properties=None):
        """Callback on unexpected broker disconnect."""
        logger.warning(f"MQTT disconnected for {self.connection_id} (rc={rc})")
        if self.status != DatalinkConnectionStatus.DISCONNECTED:
            self.status = DatalinkConnectionStatus.DEGRADED

    def _on_message(self, client, userdata, message):
        """Processes incoming MQTT payload from subscribed UAV topic."""
        now = time.time()
        self.last_packet_time = now
        self.packets_received += 1

        try:
            raw_payload = message.payload.decode("utf-8")
            data = json.loads(raw_payload)

            if not isinstance(data, dict):
                self.packets_rejected += 1
                return

            # Compute message transmission latency if sent_timestamp exists
            sent_time = data.get("sent_timestamp") or data.get("timestamp_epoch")
            if sent_time and isinstance(sent_time, (int, float)):
                self.latest_latency_ms = round(abs(now - sent_time) * 1000.0, 1)

            # Standardize envelope
            data["uav_id"] = data.get("uav_id", self.uav_id)
            data["protocol"] = ProtocolType.MQTT.value
            data["connection_id"] = self.connection_id
            data["topic"] = message.topic
            if "timestamp" not in data:
                data["timestamp"] = datetime.now(timezone.utc).strftime("%H:%M:%S")
            if "iso_timestamp" not in data:
                data["iso_timestamp"] = datetime.now(timezone.utc).isoformat()
            if self.latest_latency_ms is not None:
                data["latency_ms"] = self.latest_latency_ms

            if self.on_packet_callback:
                self.on_packet_callback(self.connection_id, data)

        except Exception as e:
            self.packets_rejected += 1
            logger.warning(f"Error parsing MQTT packet on {message.topic}: {e}")

    def inject_simulated_payload(self, topic: str, payload: Dict[str, Any]):
        """
        In-memory simulator for verification and deterministic testing.
        Allows testing without an external active MQTT broker running.
        """
        now = time.time()
        self.last_packet_time = now
        self.packets_received += 1
        if self.status != DatalinkConnectionStatus.CONNECTED:
            self.status = DatalinkConnectionStatus.CONNECTED

        packet = dict(payload)
        packet["uav_id"] = packet.get("uav_id", self.uav_id)
        packet["protocol"] = ProtocolType.MQTT.value
        packet["connection_id"] = self.connection_id
        packet["topic"] = topic
        if "timestamp" not in packet:
            packet["timestamp"] = datetime.now(timezone.utc).strftime("%H:%M:%S")
        if "iso_timestamp" not in packet:
            packet["iso_timestamp"] = datetime.now(timezone.utc).isoformat()

        if self.on_packet_callback:
            self.on_packet_callback(self.connection_id, packet)

    def get_status(self) -> ConnectionInfo:
        """Returns standard connection status dossier with masked secrets."""
        uptime = 0.0
        if self.connected_at and self.status in (
            DatalinkConnectionStatus.CONNECTED,
            DatalinkConnectionStatus.DEGRADED,
        ):
            uptime = round(time.time() - self.connected_at, 1)

        last_packet_iso = None
        if self.last_packet_time:
            last_packet_iso = datetime.fromtimestamp(self.last_packet_time, tz=timezone.utc).isoformat()

        conn_iso = None
        if self.connected_at:
            conn_iso = datetime.fromtimestamp(self.connected_at, tz=timezone.utc).isoformat()

        return ConnectionInfo(
            connection_id=self.connection_id,
            uav_id=self.uav_id,
            protocol=ProtocolType.MQTT,
            status=self.status,
            endpoint=self.endpoint_str,
            connected_at=conn_iso,
            last_packet_time=last_packet_iso,
            packets_received=self.packets_received,
            packets_rejected=self.packets_rejected,
            latency_ms=self.latest_latency_ms,
            uptime_seconds=uptime,
            error_message=self.error_message,
            is_active=self.status == DatalinkConnectionStatus.CONNECTED,
            details={
                "broker": self.config.broker_address,
                "port": self.config.port,
                "use_tls": self.config.use_tls,
                "qos": self.config.qos,
                "topics": self.topics,
                "authenticated": bool(self.config.username),
            },
        )

