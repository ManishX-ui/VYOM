"""
MAVLink Protocol Adapter for VYOM Digital Twin (Phase 11)
Handles real-time MAVLink v1/v2 telemetry streams via UDP, TCP, or Serial transports.
Decodes HEARTBEAT, SYS_STATUS, ATTITUDE, GLOBAL_POSITION_INT, GPS_RAW_INT, VFR_HUD,
BATTERY_STATUS, HIGHRES_IMU, SCALED_PRESSURE, and EFI/Engine messages.
"""

import logging
import math
import threading
import time
from datetime import datetime, timezone
from typing import Callable, Dict, Any, Optional

from app.schemas.datalink import (
    MAVLinkConnectionConfig,
    ConnectionInfo,
    ProtocolType,
    DatalinkConnectionStatus,
    MAVLinkTransport,
)

logger = logging.getLogger("vyom.datalink.mavlink")


class MAVLinkAdapter:
    """
    Modular MAVLink communication adapter for Ground Control Station (GCS) telemetry reception.
    Runs a non-blocking background thread listening for MAVLink packets and normalizing them.
    """

    def __init__(
        self,
        config: MAVLinkConnectionConfig,
        on_packet_callback: Optional[Callable[[str, Dict[str, Any]], None]] = None,
    ):
        self.config = config
        self.connection_id = config.connection_id or f"MAVLINK-{config.uav_id}-{int(time.time())}"
        self.uav_id = config.uav_id
        self.on_packet_callback = on_packet_callback

        self.status = DatalinkConnectionStatus.DISCONNECTED
        self.connection = None
        self.connected_at: Optional[float] = None
        self.last_packet_time: Optional[float] = None
        self.packets_received = 0
        self.packets_rejected = 0
        self.latest_latency_ms: Optional[float] = None
        self.error_message: Optional[str] = None

        self._stop_event = threading.Event()
        self._rx_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()

        # Telemetry state accumulator for partial message assembly
        self._accumulated_telemetry: Dict[str, Any] = {
            "uav_id": self.uav_id,
            "mode": "LIVE",
            "is_simulated": False,
        }

    @property
    def endpoint_str(self) -> str:
        if self.config.transport == MAVLinkTransport.SERIAL:
            return f"serial:{self.config.device_path or 'COM1'}:{self.config.baudrate}"
        elif self.config.transport == MAVLinkTransport.TCP:
            return f"tcp:{self.config.address}:{self.config.port}"
        else:
            return f"udp:{self.config.address}:{self.config.port}"

    def connect(self) -> bool:
        """Establishes MAVLink connection and starts the packet reader loop."""
        with self._lock:
            if self.status == DatalinkConnectionStatus.CONNECTED and self._rx_thread and self._rx_thread.is_alive():
                return True

            self.status = DatalinkConnectionStatus.CONNECTING
            self.error_message = None
            self._stop_event.clear()

            try:
                from pymavlink import mavutil

                # Build pymavlink connection string
                conn_str = ""
                if self.config.transport == MAVLinkTransport.UDP:
                    if self.config.address in ("0.0.0.0", "127.0.0.1", "localhost", ""):
                        conn_str = f"udpin:{self.config.address or '0.0.0.0'}:{self.config.port}"
                    else:
                        conn_str = f"udpout:{self.config.address}:{self.config.port}"
                elif self.config.transport == MAVLinkTransport.TCP:
                    conn_str = f"tcp:{self.config.address}:{self.config.port}"
                elif self.config.transport == MAVLinkTransport.SERIAL:
                    conn_str = f"{self.config.device_path}:{self.config.baudrate}"

                logger.info(f"Connecting to MAVLink endpoint: {conn_str}")
                self.connection = mavutil.mavlink_connection(
                    conn_str,
                    autoreconnect=True,
                    source_system=255,  # GCS system ID
                    source_component=190,  # Mission planner / GCS component ID
                )

                self.connected_at = time.time()
                self.status = DatalinkConnectionStatus.CONNECTED

                # Start background listener thread
                self._rx_thread = threading.Thread(
                    target=self._read_loop,
                    name=f"MAVLinkRx-{self.connection_id}",
                    daemon=True,
                )
                self._rx_thread.start()
                return True

            except Exception as e:
                self.status = DatalinkConnectionStatus.ERROR
                self.error_message = f"MAVLink connection failed: {str(e)}"
                logger.error(self.error_message, exc_info=True)
                return False

    def disconnect(self) -> bool:
        """Stops the receiver thread and closes the transport."""
        self._stop_event.set()
        with self._lock:
            if self.connection:
                try:
                    self.connection.close()
                except Exception as e:
                    logger.warning(f"Error closing MAVLink connection: {e}")
                self.connection = None

            if self._rx_thread and self._rx_thread.is_alive():
                self._rx_thread.join(timeout=1.0)
            self._rx_thread = None

            self.status = DatalinkConnectionStatus.DISCONNECTED
            logger.info(f"MAVLink adapter disconnected: {self.connection_id}")
            return True

    def _read_loop(self):
        """Worker loop continuously receiving and decoding MAVLink messages."""
        logger.info(f"MAVLink receiver loop active for {self.connection_id}")
        while not self._stop_event.is_set():
            if not self.connection:
                break

            try:
                msg = self.connection.recv_match(blocking=True, timeout=0.5)
                if msg is None:
                    # Check for heartbeat timeout
                    if (
                        self.last_packet_time
                        and (time.time() - self.last_packet_time) > self.config.heartbeat_timeout_sec
                    ):
                        if self.status == DatalinkConnectionStatus.CONNECTED:
                            self.status = DatalinkConnectionStatus.DEGRADED
                    continue

                self._process_mavlink_message(msg)

            except Exception as e:
                if not self._stop_event.is_set():
                    logger.warning(f"Error reading MAVLink packet: {e}")
                    self.status = DatalinkConnectionStatus.DEGRADED
                    time.sleep(0.1)

    def _process_mavlink_message(self, msg):
        """Dispatches and decodes specific MAVLink message types."""
        msg_type = msg.get_type()
        now = time.time()
        self.last_packet_time = now
        self.packets_received += 1
        if self.status != DatalinkConnectionStatus.CONNECTED:
            self.status = DatalinkConnectionStatus.CONNECTED

        dispatch = False

        if msg_type == "HEARTBEAT":
            # Track GCS / Autopilot link
            self._accumulated_telemetry["mavlink_type"] = msg.type
            self._accumulated_telemetry["autopilot"] = msg.autopilot
            self._accumulated_telemetry["base_mode"] = msg.base_mode
            self._accumulated_telemetry["system_status"] = msg.system_status

        elif msg_type == "GLOBAL_POSITION_INT":
            # lat/lon in degE7, alt in mm above MSL
            self._accumulated_telemetry["latitude"] = round(msg.lat / 1e7, 6)
            self._accumulated_telemetry["longitude"] = round(msg.lon / 1e7, 6)
            self._accumulated_telemetry["altitudeFt"] = round((msg.alt / 1000.0) * 3.28084, 1)
            self._accumulated_telemetry["verticalSpeedMs"] = round(-(msg.vz / 100.0), 2)
            # hdg in cdeg
            if msg.hdg != 65535:
                self._accumulated_telemetry["headingDeg"] = int(msg.hdg / 100.0)
            dispatch = True

        elif msg_type == "GPS_RAW_INT":
            self._accumulated_telemetry["gps_fix_type"] = msg.fix_type
            self._accumulated_telemetry["satellites_visible"] = msg.satellites_visible
            if "latitude" not in self._accumulated_telemetry and msg.lat != 0:
                self._accumulated_telemetry["latitude"] = round(msg.lat / 1e7, 6)
                self._accumulated_telemetry["longitude"] = round(msg.lon / 1e7, 6)

        elif msg_type == "ATTITUDE":
            # roll/pitch in radians, convert to degrees
            self._accumulated_telemetry["rollDeg"] = round(math.degrees(msg.roll), 2)
            self._accumulated_telemetry["pitchDeg"] = round(math.degrees(msg.pitch), 2)
            self._accumulated_telemetry["yawDeg"] = round(math.degrees(msg.yaw), 2)
            self._accumulated_telemetry["roll_rate"] = round(math.degrees(msg.rollspeed), 2)
            self._accumulated_telemetry["pitch_rate"] = round(math.degrees(msg.pitchspeed), 2)

        elif msg_type == "VFR_HUD":
            self._accumulated_telemetry["groundSpeedMs"] = round(float(msg.groundspeed), 2)
            self._accumulated_telemetry["airspeedMs"] = round(float(msg.airspeed), 2)
            self._accumulated_telemetry["headingDeg"] = int(msg.heading)
            self._accumulated_telemetry["throttlePercent"] = int(msg.throttle)
            dispatch = True

        elif msg_type == "SYS_STATUS":
            # voltage in mV, current in cA (10mA)
            if msg.voltage_battery > 0:
                self._accumulated_telemetry["batteryVoltage"] = round(msg.voltage_battery / 1000.0, 2)
            if msg.current_battery >= 0:
                self._accumulated_telemetry["batteryCurrent"] = round(msg.current_battery / 100.0, 2)
            if msg.battery_remaining >= 0:
                self._accumulated_telemetry["batterySoc"] = float(msg.battery_remaining)

        elif msg_type == "BATTERY_STATUS":
            if hasattr(msg, "voltages") and len(msg.voltages) > 0 and msg.voltages[0] > 0:
                total_mv = sum(v for v in msg.voltages if v != 65535)
                self._accumulated_telemetry["batteryVoltage"] = round(total_mv / 1000.0, 2)
            if hasattr(msg, "current_battery") and msg.current_battery >= 0:
                self._accumulated_telemetry["batteryCurrent"] = round(msg.current_battery / 100.0, 2)

        elif msg_type == "HIGHRES_IMU":
            # Vibration approximation from acceleration norm fluctuation
            x_g = msg.xacc / 9.80665
            y_g = msg.yacc / 9.80665
            z_g = msg.zacc / 9.80665
            mag = math.sqrt(x_g**2 + y_g**2 + z_g**2)
            vib_proxy = abs(mag - 1.0)
            self._accumulated_telemetry["vibrationRMS"] = round(max(0.15, min(1.2, vib_proxy)), 2)

        elif msg_type == "SCALED_PRESSURE":
            # press_abs in hPa -> convert to InHg (1 hPa = 0.02953 InHg)
            if msg.press_abs > 0:
                self._accumulated_telemetry["manifoldPressureInHg"] = round(msg.press_abs * 0.02953, 1)

        elif msg_type == "SYSTEM_TIME":
            if msg.time_unix_usec > 0:
                packet_epoch = msg.time_unix_usec / 1e6
                self.latest_latency_ms = round(abs(now - packet_epoch) * 1000.0, 1)

        # Engine & Rotax specific parameter integrations
        elif msg_type in ("EFI_STATUS", "ENGINE_STATUS"):
            # Standard MAVLink EFI Status (Message 225)
            if hasattr(msg, "rpm"):
                self._accumulated_telemetry["rpm"] = int(msg.rpm)
            if hasattr(msg, "fuel_flow"):
                self._accumulated_telemetry["fuelFlow"] = round(float(msg.fuel_flow), 1)
            if hasattr(msg, "oil_pressure"):
                self._accumulated_telemetry["oilPressure"] = round(float(msg.oil_pressure) / 100.0, 2)
            if hasattr(msg, "oil_temperature"):
                self._accumulated_telemetry["oilTemperature"] = round(float(msg.oil_temperature), 1)
            if hasattr(msg, "coolant_temperature"):
                self._accumulated_telemetry["cht"] = round(float(msg.coolant_temperature), 1)
            if hasattr(msg, "exhaust_gas_temperature"):
                self._accumulated_telemetry["egt"] = round(float(msg.exhaust_gas_temperature), 1)
            dispatch = True

        elif msg_type == "NAMED_VALUE_FLOAT":
            # Rotax telemetry via named float pairs (e.g. CHT, EGT, OIL_P, RPM)
            name = msg.name.strip("\x00").upper()
            val = float(msg.value)
            if name == "RPM":
                self._accumulated_telemetry["rpm"] = int(val)
            elif name in ("CHT", "CHT1", "CHT_AVG"):
                self._accumulated_telemetry["cht"] = round(val, 1)
            elif name in ("EGT", "EGT1", "EGT_AVG"):
                self._accumulated_telemetry["egt"] = round(val, 1)
            elif name in ("OIL_P", "OIL_PRESSURE"):
                self._accumulated_telemetry["oilPressure"] = round(val, 2)
            elif name in ("OIL_T", "OIL_TEMP"):
                self._accumulated_telemetry["oilTemperature"] = round(val, 1)
            elif name in ("MAP", "MANIFOLD_P"):
                self._accumulated_telemetry["manifoldPressureInHg"] = round(val, 1)
            elif name in ("FUEL_FLOW", "FF"):
                self._accumulated_telemetry["fuelFlow"] = round(val, 1)
            elif name in ("VIB", "VIB_RMS"):
                self._accumulated_telemetry["vibrationRMS"] = round(val, 2)
            dispatch = True

        # When a position or primary flight instrument update arrives, dispatch snapshot
        if dispatch and self.on_packet_callback:
            snapshot = dict(self._accumulated_telemetry)
            snapshot["timestamp"] = datetime.now(timezone.utc).strftime("%H:%M:%S")
            snapshot["iso_timestamp"] = datetime.now(timezone.utc).isoformat()
            snapshot["uav_id"] = self.uav_id
            snapshot["protocol"] = ProtocolType.MAVLINK.value
            snapshot["connection_id"] = self.connection_id
            if self.latest_latency_ms is not None:
                snapshot["latency_ms"] = self.latest_latency_ms
            self.on_packet_callback(self.connection_id, snapshot)

    def inject_simulated_message(self, message_type: str, data: Dict[str, Any]):
        """
        In-memory message injector for deterministic verification and SITL simulation.
        Does not require physical radio hardware.
        """
        class MockMavMsg:
            def __init__(self, mtype: str, fields: Dict[str, Any]):
                self._mtype = mtype
                for k, v in fields.items():
                    setattr(self, k, v)

            def get_type(self):
                return self._mtype

        msg = MockMavMsg(message_type, data)
        self._process_mavlink_message(msg)

    def get_status(self) -> ConnectionInfo:
        """Returns standard connection status dossier."""
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
            protocol=ProtocolType.MAVLINK,
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
                "transport": self.config.transport.value,
                "address": self.config.address,
                "port": self.config.port,
                "mavlink_version": self.config.mavlink_version,
            },
        )

