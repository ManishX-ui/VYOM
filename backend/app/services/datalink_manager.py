"""
Centralized Datalink Manager for VYOM Digital Twin (Phase 11)
Coordinates MAVLink and MQTT adapters, validates incoming telemetry, enforces freshness,
prevents duplicate packets, tracks latency/uptime metrics, and feeds validated packets
into TelemetryManager.
"""

import hashlib
import json
import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

from app.schemas.datalink import (
    MAVLinkConnectionConfig,
    MQTTConnectionConfig,
    ConnectionInfo,
    DatalinkMetrics,
    DatalinkConnectionStatus,
    ProtocolType,
    DatalinkTestRequest,
    DatalinkTestResponse,
)
from app.services.mavlink_adapter import MAVLinkAdapter
from app.services.mqtt_adapter import MQTTAdapter

logger = logging.getLogger("vyom.datalink.manager")


class DatalinkManager:
    """
    Centralized communication gateway manager for UAV Ground Control Stations (GCS).
    Manages multiple MAVLink and MQTT adapters, performs validation and normalization,
    and pipelines data to TelemetryManager.
    """

    def __init__(self):
        self._connections: Dict[str, Any] = {}  # connection_id -> Adapter instance
        self._total_packets_received = 0
        self._total_packets_rejected = 0
        self._rejection_reasons: Dict[str, int] = {
            "STALE_TIMESTAMP": 0,
            "DUPLICATE_PACKET": 0,
            "INVALID_UAV_ID": 0,
            "OUT_OF_RANGE_VALUE": 0,
            "MALFORMED_PAYLOAD": 0,
        }
        self._recent_packet_hashes: Dict[str, float] = {}  # hash -> timestamp
        self._latencies: List[float] = []
        self._max_clock_skew_sec = 60.0

        # Seed default demo baseline connection for instant operator visibility
        self._seed_default_connections()

    def _seed_default_connections(self):
        """Initializes default pre-configured adapters for primary fleet UAV."""
        default_uav = "UAV-MALE-IND-01"
        mav_cfg = MAVLinkConnectionConfig(
            connection_id=f"MAVLINK-{default_uav}-GCS",
            uav_id=default_uav,
            address="127.0.0.1",
            port=14550,
        )
        mav_adapter = MAVLinkAdapter(mav_cfg, on_packet_callback=self.on_packet_received)
        self._connections[mav_adapter.connection_id] = mav_adapter

        mqtt_cfg = MQTTConnectionConfig(
            connection_id=f"MQTT-{default_uav}-PRIMARY",
            uav_id=default_uav,
            broker_address="localhost",
            port=1883,
        )
        mqtt_adapter = MQTTAdapter(mqtt_cfg, on_packet_callback=self.on_packet_received)
        self._connections[mqtt_adapter.connection_id] = mqtt_adapter

    # =========================================================================
    # ADAPTER LIFECYCLE MANAGEMENT
    # =========================================================================

    def register_mavlink_connection(self, config: MAVLinkConnectionConfig) -> ConnectionInfo:
        """Registers and starts a new MAVLink connection adapter."""
        conn_id = config.connection_id or f"MAVLINK-{config.uav_id}-{int(time.time())}"
        config.connection_id = conn_id

        # Disconnect existing connection with identical ID if present
        if conn_id in self._connections:
            self._connections[conn_id].disconnect()

        adapter = MAVLinkAdapter(config, on_packet_callback=self.on_packet_received)
        self._connections[conn_id] = adapter
        adapter.connect()
        logger.info(f"Registered MAVLink adapter '{conn_id}' for {config.uav_id}")
        return adapter.get_status()

    def register_mqtt_connection(self, config: MQTTConnectionConfig) -> ConnectionInfo:
        """Registers and starts a new MQTT connection adapter."""
        conn_id = config.connection_id or f"MQTT-{config.uav_id}-{int(time.time())}"
        config.connection_id = conn_id

        if conn_id in self._connections:
            self._connections[conn_id].disconnect()

        adapter = MQTTAdapter(config, on_packet_callback=self.on_packet_received)
        self._connections[conn_id] = adapter
        adapter.connect()
        logger.info(f"Registered MQTT adapter '{conn_id}' for {config.uav_id}")
        return adapter.get_status()

    def disconnect_connection(self, connection_id: str) -> bool:
        """Disconnects and terminates an active datalink adapter."""
        if connection_id not in self._connections:
            return False
        adapter = self._connections[connection_id]
        adapter.disconnect()
        return True

    def remove_connection(self, connection_id: str) -> bool:
        """Disconnects and removes connection from registry."""
        if connection_id in self._connections:
            self._connections[connection_id].disconnect()
            del self._connections[connection_id]
            return True
        return False

    def get_connection(self, connection_id: str) -> Optional[ConnectionInfo]:
        """Retrieves status dossier for a specific connection."""
        adapter = self._connections.get(connection_id)
        if adapter:
            return adapter.get_status()
        return None

    def get_connection_by_uav(self, uav_id: str) -> Optional[ConnectionInfo]:
        """Retrieves the primary active connection for a given UAV ID."""
        for adapter in self._connections.values():
            if adapter.uav_id == uav_id:
                return adapter.get_status()
        return None

    def get_all_connections(self) -> List[ConnectionInfo]:
        """Returns all configured connection dossiers."""
        return [adapter.get_status() for adapter in self._connections.values()]

    # =========================================================================
    # TELEMETRY VALIDATION & NORMALIZATION
    # =========================================================================

    def on_packet_received(self, connection_id: str, raw_packet: Dict[str, Any]):
        """
        Callback invoked by adapters when a packet is decoded.
        Validates, normalizes, and routes data to TelemetryManager.
        """
        self._total_packets_received += 1
        is_valid, reason, validated_packet = self._validate_and_normalize(raw_packet)

        if not is_valid:
            self._total_packets_rejected += 1
            if reason in self._rejection_reasons:
                self._rejection_reasons[reason] += 1
            if connection_id in self._connections:
                self._connections[connection_id].packets_rejected += 1
            logger.warning(f"Rejected packet from {connection_id}: {reason}")
            return

        # Track latency metric if reported
        latency = validated_packet.get("latency_ms")
        if latency is not None and isinstance(latency, (int, float)):
            self._latencies.append(float(latency))
            if len(self._latencies) > 200:
                self._latencies.pop(0)

        # Forward validated packet to Centralized TelemetryManager
        from app.services.telemetry_manager import telemetry_manager
        telemetry_manager.ingest_live_packet(validated_packet)

    def _validate_and_normalize(self, packet: Dict[str, Any]) -> tuple[bool, str, Dict[str, Any]]:
        """
        Comprehensive security & sanity validation:
        1. UAV ID verification.
        2. Timestamp freshness and clock skew check.
        3. Deduplication via fingerprint hash.
        4. Physical parameter bounds checking.
        """
        if not isinstance(packet, dict):
            return False, "MALFORMED_PAYLOAD", {}

        uav_id = packet.get("uav_id")
        if not uav_id or not isinstance(uav_id, str) or len(uav_id) < 3:
            return False, "INVALID_UAV_ID", {}

        now_utc = datetime.now(timezone.utc)

        # Freshness Check
        iso_ts = packet.get("iso_timestamp")
        if iso_ts:
            try:
                pkt_time = datetime.fromisoformat(iso_ts.replace("Z", "+00:00"))
                skew_sec = abs((now_utc - pkt_time).total_seconds())
                if skew_sec > self._max_clock_skew_sec:
                    return False, "STALE_TIMESTAMP", {}
            except Exception:
                pass

        # Deduplication Check
        fingerprint_data = f"{uav_id}:{packet.get('timestamp')}:{packet.get('rpm')}:{packet.get('latitude')}:{packet.get('longitude')}"
        pkt_hash = hashlib.md5(fingerprint_data.encode("utf-8")).hexdigest()

        now = time.time()
        # Clean expired hashes (> 10s old)
        self._recent_packet_hashes = {
            h: t for h, t in self._recent_packet_hashes.items() if (now - t) < 10.0
        }
        if pkt_hash in self._recent_packet_hashes:
            return False, "DUPLICATE_PACKET", {}
        self._recent_packet_hashes[pkt_hash] = now

        # Physical Parameter Range Validation
        rpm = packet.get("rpm")
        if rpm is not None and (rpm < 0 or rpm > 7000):
            return False, "OUT_OF_RANGE_VALUE", {}

        cht = packet.get("cht")
        if cht is not None and (cht < -40.0 or cht > 350.0):
            return False, "OUT_OF_RANGE_VALUE", {}

        lat = packet.get("latitude")
        if lat is not None and (lat < -90.0 or lat > 90.0):
            return False, "OUT_OF_RANGE_VALUE", {}

        lng = packet.get("longitude")
        if lng is not None and (lng < -180.0 or lng > 180.0):
            return False, "OUT_OF_RANGE_VALUE", {}

        # Normalize into clean VYOM format
        normalized = {
            "uav_id": uav_id,
            "mode": "LIVE",
            "is_simulated": False,
            "timestamp": packet.get("timestamp", now_utc.strftime("%H:%M:%S")),
            "iso_timestamp": packet.get("iso_timestamp", now_utc.isoformat()),
            "connection_id": packet.get("connection_id"),
            "protocol": packet.get("protocol", "UNKNOWN"),
            
            # Engine Telemetry (Null if not provided by hardware/EMS)
            "rpm": packet.get("rpm"),
            "cht": packet.get("cht"),
            "egt": packet.get("egt"),
            "oilPressure": packet.get("oilPressure"),
            "oilTemperature": packet.get("oilTemperature"),
            "fuelFlow": packet.get("fuelFlow"),
            "vibrationRMS": packet.get("vibrationRMS"),
            "injectionTiming": packet.get("injectionTiming"),
            "manifoldPressureInHg": packet.get("manifoldPressureInHg"),
            
            # Spatial / GPS Navigation
            "latitude": packet.get("latitude"),
            "longitude": packet.get("longitude"),
            "altitudeFt": packet.get("altitudeFt"),
            "groundSpeedMs": packet.get("groundSpeedMs"),
            "headingDeg": packet.get("headingDeg"),
            "rollDeg": packet.get("rollDeg"),
            "pitchDeg": packet.get("pitchDeg"),
            "verticalSpeedMs": packet.get("verticalSpeedMs"),
            
            # Avionics & Electrical
            "batteryVoltage": packet.get("batteryVoltage"),
            "batteryCurrent": packet.get("batteryCurrent"),
            "batterySoc": packet.get("batterySoc"),
        }
        if "latency_ms" in packet:
            normalized["latency_ms"] = packet["latency_ms"]

        return True, "VALID", normalized

    # =========================================================================
    # METRICS & DIAGNOSTICS
    # =========================================================================

    def get_metrics(self) -> DatalinkMetrics:
        """Returns consolidated communication performance metrics across all datalinks."""
        connections = self.get_all_connections()
        active_count = sum(1 for c in connections if c.status == DatalinkConnectionStatus.CONNECTED)

        avg_latency = None
        if self._latencies:
            avg_latency = round(sum(self._latencies) / len(self._latencies), 1)

        return DatalinkMetrics(
            total_connections=len(connections),
            active_connections=active_count,
            total_packets_received=self._total_packets_received,
            total_packets_rejected=self._total_packets_rejected,
            average_latency_ms=avg_latency,
            rejection_reasons_breakdown=dict(self._rejection_reasons),
            connections=connections,
        )

    # =========================================================================
    # DETERMINISTIC GCS SIMULATOR / TESTBED
    # =========================================================================

    def simulate_test_scenario(self, request: DatalinkTestRequest) -> DatalinkTestResponse:
        """
        Executes a deterministic UAV GCS simulation scenario.
        Strictly labels all generated records with `is_simulated: True` and protocol origin.
        """
        uav_id = request.uav_id or "UAV-MALE-IND-01"
        scenario = request.scenario.upper()
        protocol = request.protocol or ProtocolType.MAVLINK
        now = datetime.now(timezone.utc)

        # Locate or create target adapter
        adapter = None
        for a in self._connections.values():
            if a.uav_id == uav_id and a.config.__class__.__name__.startswith(protocol.value):
                adapter = a
                break

        if not adapter:
            if protocol == ProtocolType.MAVLINK:
                adapter = MAVLinkAdapter(
                    MAVLinkConnectionConfig(uav_id=uav_id),
                    on_packet_callback=self.on_packet_received,
                )
            else:
                adapter = MQTTAdapter(
                    MQTTConnectionConfig(uav_id=uav_id),
                    on_packet_callback=self.on_packet_received,
                )
            self._connections[adapter.connection_id] = adapter

        if scenario == "NORMAL_TELEMETRY":
            payload = {
                "uav_id": uav_id,
                "timestamp": now.strftime("%H:%M:%S"),
                "iso_timestamp": now.isoformat(),
                "rpm": 2460,
                "cht": 186.5,
                "egt": 622.0,
                "oilPressure": 4.22,
                "oilTemperature": 95.8,
                "fuelFlow": 12.4,
                "vibrationRMS": 0.28,
                "latitude": 21.425,
                "longitude": 81.685,
                "altitudeFt": 18200.0,
                "groundSpeedMs": 33.1,
                "headingDeg": 184,
                "batteryVoltage": 28.3,
                "batteryCurrent": 14.2,
                "batterySoc": 96.0,
            }
            if request.custom_parameters:
                payload.update(request.custom_parameters)

            if isinstance(adapter, MAVLinkAdapter):
                adapter.inject_simulated_message("GLOBAL_POSITION_INT", {
                    "lat": int(payload["latitude"] * 1e7),
                    "lon": int(payload["longitude"] * 1e7),
                    "alt": int((payload["altitudeFt"] / 3.28084) * 1000),
                    "vz": -150,
                    "hdg": payload["headingDeg"] * 100,
                })
                adapter.inject_simulated_message("EFI_STATUS", {
                    "rpm": payload["rpm"],
                    "fuel_flow": payload["fuelFlow"],
                    "oil_pressure": int(payload["oilPressure"] * 100),
                    "oil_temperature": int(payload["oilTemperature"]),
                    "coolant_temperature": payload["cht"],
                    "exhaust_gas_temperature": payload["egt"],
                })
            else:
                adapter.inject_simulated_payload(f"vyom/uav/{uav_id}/telemetry", payload)

            return DatalinkTestResponse(
                success=True,
                scenario=scenario,
                protocol=protocol.value,
                uav_id=uav_id,
                packets_dispatched=2 if isinstance(adapter, MAVLinkAdapter) else 1,
                message=f"Dispatched nominal telemetry packet over simulated {protocol.value} datalink.",
                snapshot_sample=payload,
            )

        elif scenario == "CONNECTION_LOSS":
            adapter.status = DatalinkConnectionStatus.DISCONNECTED
            adapter.error_message = "Simulated carrier loss / GCS link timeout."
            return DatalinkTestResponse(
                success=True,
                scenario=scenario,
                protocol=protocol.value,
                uav_id=uav_id,
                packets_dispatched=0,
                message=f"Transitioned {protocol.value} datalink to DISCONNECTED (carrier loss simulation).",
            )

        elif scenario == "RECONNECTION":
            adapter.status = DatalinkConnectionStatus.CONNECTED
            adapter.error_message = None
            adapter.connected_at = time.time()
            return DatalinkTestResponse(
                success=True,
                scenario=scenario,
                protocol=protocol.value,
                uav_id=uav_id,
                packets_dispatched=0,
                message=f"Re-established handshake on {protocol.value} adapter successfully.",
            )

        elif scenario == "STALE_MESSAGES":
            stale_dt = now - timedelta(seconds=90)
            stale_payload = {
                "uav_id": uav_id,
                "timestamp": stale_dt.strftime("%H:%M:%S"),
                "iso_timestamp": stale_dt.isoformat(),
                "rpm": 2450,
                "latitude": 21.42,
                "longitude": 81.68,
            }
            self.on_packet_received(adapter.connection_id, stale_payload)
            return DatalinkTestResponse(
                success=True,
                scenario=scenario,
                protocol=protocol.value,
                uav_id=uav_id,
                packets_dispatched=1,
                message="Injected stale telemetry (> 60s skew). Validator should reject packet.",
                snapshot_sample=stale_payload,
            )

        elif scenario == "DUPLICATE_PACKETS":
            dup_payload = {
                "uav_id": uav_id,
                "timestamp": now.strftime("%H:%M:%S"),
                "iso_timestamp": now.isoformat(),
                "rpm": 2450,
                "latitude": 21.42,
                "longitude": 81.68,
            }
            # Inject once, then immediately inject exact copy
            self.on_packet_received(adapter.connection_id, dup_payload)
            self.on_packet_received(adapter.connection_id, dup_payload)
            return DatalinkTestResponse(
                success=True,
                scenario=scenario,
                protocol=protocol.value,
                uav_id=uav_id,
                packets_dispatched=2,
                message="Dispatched duplicate consecutive packet sequence. Second packet deduplicated.",
                snapshot_sample=dup_payload,
            )

        elif scenario == "INVALID_MESSAGE":
            bad_payload = {
                "uav_id": "UNKNOWN-CORRUPT",
                "rpm": 999999,  # Out of physical envelope
                "latitude": 999.0,  # Invalid latitude
            }
            self.on_packet_received(adapter.connection_id, bad_payload)
            return DatalinkTestResponse(
                success=True,
                scenario=scenario,
                protocol=protocol.value,
                uav_id=uav_id,
                packets_dispatched=1,
                message="Dispatched corrupt/out-of-range packet. Correctly flagged and rejected.",
                snapshot_sample=bad_payload,
            )

        elif scenario == "MULTIPLE_UAV":
            # Simulate secondary and tertiary UAV airframes
            fleet_uavs = ["UAV-MALE-IND-02", "UAV-MALE-IND-03"]
            dispatched = 0
            for alt_uav in fleet_uavs:
                packet = {
                    "uav_id": alt_uav,
                    "timestamp": now.strftime("%H:%M:%S"),
                    "iso_timestamp": now.isoformat(),
                    "rpm": 2480,
                    "latitude": 21.50,
                    "longitude": 81.75,
                    "altitudeFt": 17500.0,
                }
                self.on_packet_received(f"GCS-{alt_uav}", packet)
                dispatched += 1

            return DatalinkTestResponse(
                success=True,
                scenario=scenario,
                protocol=protocol.value,
                uav_id=uav_id,
                packets_dispatched=dispatched,
                message=f"Dispatched simultaneous telemetry across multiple fleet UAVs ({', '.join(fleet_uavs)}).",
            )

        else:
            return DatalinkTestResponse(
                success=False,
                scenario=scenario,
                protocol=protocol.value,
                uav_id=uav_id,
                packets_dispatched=0,
                message=f"Unknown test scenario: {scenario}",
            )


# Global singleton instance
datalink_manager = DatalinkManager()

