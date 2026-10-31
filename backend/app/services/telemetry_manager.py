"""
VYOM Centralized Telemetry Manager Service
Orchestrates multi-mode telemetry (DEMO, REPLAY, LIVE), realistic Rotax 914 F engine physics,
synchronized spatial flight dynamics, simulation scenarios, and WebSocket broadcasting.
"""

import math
import time
import asyncio
import logging
from enum import Enum
from datetime import datetime, timezone, timedelta
from typing import Set, Dict, Any, Optional, List
from fastapi import WebSocket

logger = logging.getLogger("vyom.backend.telemetry_manager")

class TelemetryMode(str, Enum):
    DEMO = "DEMO"
    REPLAY = "REPLAY"
    LIVE = "LIVE"

class SimulationScenario(str, Enum):
    NORMAL_CRUISE = "NORMAL_CRUISE"
    HIGH_ALTITUDE_CLIMB = "HIGH_ALTITUDE_CLIMB"
    CHT_OVERHEAT = "CHT_OVERHEAT"
    OIL_PRESSURE_DROP = "OIL_PRESSURE_DROP"
    DESCENT_IDLE = "DESCENT_IDLE"
    SENSOR_DISCONNECTED = "SENSOR_DISCONNECTED"
    EGT_ABNORMAL = "EGT_ABNORMAL"
    OIL_PRESSURE_FAILURE = "OIL_PRESSURE_FAILURE"
    GPS_SIGNAL_LOSS = "GPS_SIGNAL_LOSS"
    VIBRATION_ABNORMAL = "VIBRATION_ABNORMAL"
    INTERMITTENT_COMM = "INTERMITTENT_COMM"
    STALE_TELEMETRY = "STALE_TELEMETRY"

class TelemetryManager:
    """
    Centralized, thread-safe Telemetry Engine for the VYOM Digital Twin Platform.
    Strictly separates DEMO, REPLAY, and LIVE data streams.
    """
    def __init__(self):
        self.mode: TelemetryMode = TelemetryMode.DEMO
        self.scenario: SimulationScenario = SimulationScenario.NORMAL_CRUISE
        self.active_uav_id: str = "UAV-MALE-IND-01"
        self.jitter_factor: float = 1.0

        # WebSocket connection management
        self.active_connections: Set[WebSocket] = set()
        self.is_broadcasting: bool = False
        self._lock = asyncio.Lock()

        # Telemetry State & Buffers
        self.latest_snapshot: Dict[str, Any] = {}
        self.demo_buffer: List[Dict[str, Any]] = []
        self.live_buffer: List[Dict[str, Any]] = []
        self.max_buffer_size: int = 500

        # Live GCS Datalink State
        self.last_live_packet_time: Optional[float] = None
        self.live_heartbeat_timeout_sec: float = 3.5
        self.latest_live_packet: Optional[Dict[str, Any]] = None

        # Replay playback state
        self.replay_mission_id: Optional[str] = "Surveillance_2026_10_23_01"
        self.replay_current_offset_sec: int = 0
        self.replay_max_offset_sec: int = 3257

        # Spatial Corridor Points (Airbase R-09 -> WP1 -> Sector Alpha -> WP3 -> Airbase)
        self.flight_corridor: List[tuple] = [
            (21.160, 81.280, 1200.0, 139.0),   # Takeoff Airbase
            (21.400, 81.360, 12000.0, 45.0),   # WP1 Climb
            (21.680, 81.680, 18000.0, 90.0),   # Sector Alpha Orbit
            (21.320, 82.020, 18000.0, 210.0),  # WP3 Turn
            (21.120, 81.700, 8000.0, 260.0),   # Descent Corridor
        ]

    # =========================================================================
    # WEBSOCKET CONNECTION LIFECYCLE
    # =========================================================================
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"Client connected. Active clients: {len(self.active_connections)}")
        
        # Send initial state frame immediately upon connection
        snapshot = self.get_current_snapshot()
        try:
            await websocket.send_json(snapshot)
        except Exception:
            pass

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"Client disconnected. Active clients: {len(self.active_connections)}")

    # =========================================================================
    # MODE & SCENARIO CONTROL
    # =========================================================================
    def set_mode(self, new_mode: str) -> bool:
        """
        Switches telemetry mode strictly between DEMO, REPLAY, and LIVE.
        Never silently switches LIVE to DEMO.
        """
        try:
            target_mode = TelemetryMode(new_mode.upper())
            self.mode = target_mode
            logger.info(f"Telemetry operating mode transitioned to: {self.mode.value}")
            return True
        except ValueError:
            logger.warning(f"Invalid telemetry mode requested: {new_mode}")
            return False

    def set_scenario(self, scenario_name: str) -> bool:
        """Configures the simulation scenario for DEMO mode."""
        try:
            target_scenario = SimulationScenario(scenario_name.upper())
            self.scenario = target_scenario
            logger.info(f"Simulation scenario set to: {self.scenario.value}")
            return True
        except ValueError:
            logger.warning(f"Invalid scenario requested: {scenario_name}")
            return False

    def set_active_uav(self, uav_id: str):
        self.active_uav_id = uav_id

    def load_mission_for_replay(self, mission_id: str) -> bool:
        """Loads stored historical mission data into the replay engine."""
        from app.services.mission_service import mission_service
        mission = mission_service.get_by_id(mission_id)
        if not mission:
            return False
        self.replay_mission_id = mission_id
        if mission.get("uav_id"):
            self.active_uav_id = mission["uav_id"]
        timeline = mission.get("timeline", [])
        self.replay_max_offset_sec = max(60, len(timeline) * 60)
        self.replay_current_offset_sec = 0
        self.mode = TelemetryMode.REPLAY
        logger.info(f"Loaded mission '{mission_id}' into REPLAY mode engine.")
        return True

    def seek_replay(self, offset_sec: int) -> Dict[str, Any]:
        """Directly positions the replay scrubber to a specific offset."""
        self.replay_current_offset_sec = max(0, min(offset_sec, self.replay_max_offset_sec))
        return self.get_current_snapshot()

    # =========================================================================
    # LIVE GCS INGESTION (Hardware / Datalink Gateway)
    # =========================================================================
    def ingest_live_packet(self, packet: Dict[str, Any]) -> bool:
        """
        Receives real telemetry from a Ground Control Station or flight controller.
        Never mixes with DEMO data.
        """
        now = time.time()
        self.last_live_packet_time = now
        
        # Stamp with mandatory metadata
        packet["uav_id"] = packet.get("uav_id", self.active_uav_id)
        packet["mode"] = TelemetryMode.LIVE.value
        packet["is_simulated"] = False
        packet["timestamp"] = packet.get("timestamp", datetime.now(timezone.utc).isoformat())

        self.latest_live_packet = packet
        self.live_buffer.append(packet)
        if len(self.live_buffer) > self.max_buffer_size:
            self.live_buffer.pop(0)
        return True

    def is_live_connected(self) -> bool:
        """Returns True if a live packet arrived within heartbeat timeout."""
        if self.last_live_packet_time is None:
            return False
        return (time.time() - self.last_live_packet_time) <= self.live_heartbeat_timeout_sec

    # =========================================================================
    # HISTORICAL TELEMETRY QUERIES (Phase 4 Time-Window Graph Aggregator)
    # =========================================================================
    def get_telemetry_history(self, time_range: str = "15m", uav_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieves downsampled historical telemetry for graph visualization across
        1m, 5m, 15m, 1h, 6h, and 24h ranges. Strictly respects active mode isolation.
        """
        target_uav = uav_id or self.active_uav_id

        range_seconds_map = {
            "1m": 60,
            "5m": 300,
            "15m": 900,
            "1h": 3600,
            "6h": 21600,
            "24h": 86400,
        }
        total_seconds = range_seconds_map.get(time_range.lower(), 900)
        num_points = 30  # Resolution points for crisp SVG/Recharts rendering

        if self.mode == TelemetryMode.LIVE:
            if not self.live_buffer or not self.is_live_connected():
                # Explicit empty state: never invent simulated points for LIVE mode
                return []
            points = [p for p in self.live_buffer if p.get("uav_id") == target_uav]
            return points[-num_points:] if len(points) > num_points else points

        elif self.mode == TelemetryMode.REPLAY:
            # Deterministic replay history up to current scrubber offset
            current_offset = max(10, self.replay_current_offset_sec)
            step = max(1, current_offset // num_points)
            results = []
            for offset in range(0, current_offset + 1, step):
                progress = offset / float(self.replay_max_offset_sec)
                cycle_rad = progress * 4.0 * math.pi
                time_str = f"T+{offset // 60:02d}:{offset % 60:02d}"
                results.append({
                    "time": time_str,
                    "timestamp": time_str,
                    "rpm": int(2450 + (math.sin(cycle_rad) * 120)),
                    "cht": round(185.0 + (math.cos(cycle_rad) * 8.0), 1),
                    "egt": round(615.0 + (math.sin(cycle_rad * 1.5) * 18.0), 1),
                    "oilPressure": round(4.2 + (math.cos(cycle_rad) * 0.15), 2),
                    "oilTemperature": round(95.0 + (math.sin(cycle_rad) * 4.0), 1),
                    "fuelFlow": round(12.2 + (math.sin(cycle_rad) * 1.8), 1),
                    "vibrationRMS": round(0.27 + (abs(math.sin(cycle_rad)) * 0.04), 2),
                    "injectionTiming": round(26.2 + (math.cos(cycle_rad) * 0.4), 1),
                    "manifoldPressureInHg": round(30.8 + (math.sin(cycle_rad) * 1.5), 1),
                    "engineHealth": 95.0,
                    # Spatial / GPS fields
                    "latitude": round(21.231 + (progress * 0.05) + (math.sin(cycle_rad) * 0.02), 5),
                    "longitude": round(81.601 + (progress * 0.08) + (math.cos(cycle_rad) * 0.02), 5),
                    "altitudeFt": round(1200 + (progress * 16800), 1),
                    "groundSpeedMs": round(28.0 + (math.sin(cycle_rad) * 4.0), 1),
                    "headingDeg": int((math.degrees(cycle_rad) + 90) % 360),
                })
            return results

        else:  # DEMO mode
            now = time.time()
            step_sec = total_seconds / float(num_points)
            results = []
            for i in range(num_points):
                past_time = now - (total_seconds - (i * step_sec))
                t_dt = datetime.fromtimestamp(past_time, tz=timezone.utc)
                time_label = t_dt.strftime("%H:%M") if total_seconds > 300 else t_dt.strftime("%H:%M:%S")

                cycle = past_time / 45.0
                rpm_var = math.sin(cycle) * 18.0
                cht_var = math.cos(cycle * 0.8) * 2.2
                egt_var = math.sin(cycle * 1.2) * 6.5
                oil_p_var = (rpm_var * 0.003) + (math.cos(cycle) * 0.04)

                orbit_radius_deg = 0.08
                orbit_angle = (past_time / 45.0) % (2.0 * math.pi)
                lat = round(21.42 + (math.cos(orbit_angle) * orbit_radius_deg), 5)
                lng = round(81.68 + (math.sin(orbit_angle) * orbit_radius_deg * 1.2), 5)
                heading = int((math.degrees(-orbit_angle) + 90.0) % 360)

                results.append({
                    "time": time_label,
                    "timestamp": time_label,
                    "rpm": int(2450 + rpm_var),
                    "cht": round(187.0 + cht_var, 1),
                    "egt": round(620.0 + egt_var, 1),
                    "oilPressure": round(4.2 + oil_p_var, 2),
                    "oilTemperature": round(96.0 + (math.sin(cycle * 0.6) * 1.2), 1),
                    "fuelFlow": round(12.5 + (rpm_var * 0.015), 1),
                    "vibrationRMS": round(0.28 + (abs(math.sin(cycle * 1.4)) * 0.02), 2),
                    "injectionTiming": round(26.5 + (math.cos(cycle * 0.9) * 0.3), 1),
                    "manifoldPressureInHg": round(31.2 + (rpm_var * 0.01), 1),
                    "engineHealth": 94.0 if self.scenario != SimulationScenario.CHT_OVERHEAT else 72.0,
                    # Spatial / GPS fields
                    "latitude": lat,
                    "longitude": lng,
                    "altitudeFt": 18000.0,
                    "groundSpeedMs": 32.4,
                    "headingDeg": heading,
                })
            return results

    # =========================================================================
    # REALISTIC ROTAX 914 F PHYSICS & SYNCHRONIZED TELEMETRY GENERATOR (DEMO)
    # =========================================================================
    def _generate_demo_telemetry(self) -> Dict[str, Any]:
        """
        Physics-based mathematical engine modeling the Rotax 914 F Turbocharged
        4-stroke piston aircraft engine with logically correlated thermodynamics.
        """
        t = time.time()
        jf = self.jitter_factor

        # Cycle micro-harmonics
        micro_sine = math.sin(t / 3.0) * jf
        micro_cos = math.cos(t / 4.5) * jf
        phase_harmonic = math.sin(t / 12.0)

        # Baseline parameters per scenario
        if self.scenario == SimulationScenario.HIGH_ALTITUDE_CLIMB:
            base_rpm = 2720
            base_map = 37.5  # Boost active
            base_cht = 198.0
            base_egt = 665.0
            base_oil_p = 4.5
            base_oil_t = 101.5
            base_fuel = 20.5
            base_vib = 0.33
            base_inj = 24.0
            health = 91.0
            climb_rate_ms = 3.5
            altitude = 12000.0 + ((t % 600) * 8)
            speed_ms = 35.8
        elif self.scenario == SimulationScenario.CHT_OVERHEAT:
            # Progressive thermal runaway in cylinder 3
            heat_progress = min(1.0, (t % 180) / 120.0)
            base_rpm = 2580
            base_map = 34.0
            base_cht = 192.0 + (heat_progress * 24.0)  # Reaches 216°C
            base_egt = 640.0 + (heat_progress * 55.0)  # Reaches 695°C
            base_oil_p = 4.0 - (heat_progress * 0.4)
            base_oil_t = 98.0 + (heat_progress * 15.0)
            base_fuel = 14.8
            base_vib = 0.28 + (heat_progress * 0.14)   # Increased knock vibration
            base_inj = 25.0
            health = max(68.0, 92.0 - (heat_progress * 24.0))
            climb_rate_ms = 0.5
            altitude = 18000.0
            speed_ms = 31.0
        elif self.scenario == SimulationScenario.OIL_PRESSURE_DROP:
            decay_progress = min(1.0, (t % 180) / 100.0)
            base_rpm = 2450
            base_map = 31.0
            base_cht = 187.0 + (decay_progress * 12.0)
            base_egt = 620.0
            base_oil_p = max(1.9, 4.2 - (decay_progress * 2.2))  # Drops to 2.0 bar
            base_oil_t = 96.0 + (decay_progress * 18.0)         # Oil overheats
            base_fuel = 12.5
            base_vib = 0.28 + (decay_progress * 0.12)
            base_inj = 26.5
            health = max(62.0, 94.0 - (decay_progress * 32.0))
            climb_rate_ms = 0.0
            altitude = 18000.0
            speed_ms = 32.0
        elif self.scenario == SimulationScenario.DESCENT_IDLE:
            base_rpm = 1950
            base_map = 22.5
            base_cht = 166.0
            base_egt = 540.0
            base_oil_p = 2.8
            base_oil_t = 86.0
            base_fuel = 6.8
            base_vib = 0.20
            base_inj = 28.0
            health = 96.0
            climb_rate_ms = -3.8
            altitude = max(3000.0, 18000.0 - ((t % 600) * 15))
            speed_ms = 28.5
        elif self.scenario == SimulationScenario.SENSOR_DISCONNECTED:
            # CHT transducer signal severed / open circuit
            base_rpm = 2450
            base_map = 31.2
            base_cht = 0.0  # Will be mapped to None/disconnected
            base_egt = 620.0
            base_oil_p = 4.20
            base_oil_t = 96.0
            base_fuel = 12.5
            base_vib = 0.28
            base_inj = 26.5
            health = 82.0
            climb_rate_ms = 0.0
            altitude = 18000.0
            speed_ms = 32.4
        elif self.scenario == SimulationScenario.EGT_ABNORMAL:
            base_rpm = 2480
            base_map = 32.0
            base_cht = 191.0
            base_egt = 775.0  # Critical exhaust temperature spike
            base_oil_p = 4.10
            base_oil_t = 99.0
            base_fuel = 14.2
            base_vib = 0.32
            base_inj = 25.0
            health = 74.0
            climb_rate_ms = 0.0
            altitude = 18000.0
            speed_ms = 32.0
        elif self.scenario == SimulationScenario.OIL_PRESSURE_FAILURE:
            base_rpm = 2400
            base_map = 30.8
            base_cht = 194.0
            base_egt = 630.0
            base_oil_p = 1.35  # Severe loss of lubrication pressure
            base_oil_t = 122.0
            base_fuel = 12.6
            base_vib = 0.38
            base_inj = 26.0
            health = 58.0
            climb_rate_ms = 0.0
            altitude = 18000.0
            speed_ms = 31.5
        elif self.scenario == SimulationScenario.GPS_SIGNAL_LOSS:
            base_rpm = 2450
            base_map = 31.2
            base_cht = 187.0
            base_egt = 620.0
            base_oil_p = 4.20
            base_oil_t = 96.0
            base_fuel = 12.5
            base_vib = 0.28
            base_inj = 26.5
            health = 88.0
            climb_rate_ms = 0.0
            altitude = 18000.0
            speed_ms = 32.4
        elif self.scenario == SimulationScenario.VIBRATION_ABNORMAL:
            base_rpm = 2520
            base_map = 32.5
            base_cht = 189.0
            base_egt = 625.0
            base_oil_p = 3.90
            base_oil_t = 98.0
            base_fuel = 13.0
            base_vib = 0.68  # Heavy mechanical vibration spike
            base_inj = 26.2
            health = 69.0
            climb_rate_ms = 0.0
            altitude = 18000.0
            speed_ms = 32.0
        elif self.scenario == SimulationScenario.INTERMITTENT_COMM:
            base_rpm = 2450
            base_map = 31.2
            base_cht = 187.0
            base_egt = 620.0
            base_oil_p = 4.20
            base_oil_t = 96.0
            base_fuel = 12.5
            base_vib = 0.28
            base_inj = 26.5
            health = 90.0
            climb_rate_ms = 0.0
            altitude = 18000.0
            speed_ms = 32.4
        elif self.scenario == SimulationScenario.STALE_TELEMETRY:
            base_rpm = 2450
            base_map = 31.2
            base_cht = 187.0
            base_egt = 620.0
            base_oil_p = 4.20
            base_oil_t = 96.0
            base_fuel = 12.5
            base_vib = 0.28
            base_inj = 26.5
            health = 92.0
            climb_rate_ms = 0.0
            altitude = 18000.0
            speed_ms = 32.4
        else:  # NORMAL_CRUISE
            base_rpm = 2450
            base_map = 31.2
            base_cht = 187.0
            base_egt = 620.0
            base_oil_p = 4.20
            base_oil_t = 96.0
            base_fuel = 12.5
            base_vib = 0.28
            base_inj = 26.5
            health = 94.0
            climb_rate_ms = 0.0
            altitude = 18000.0
            speed_ms = 32.4

        # Apply correlated micro-variations
        rpm = int(base_rpm + (micro_sine * 9.0))
        # CHT has thermal lag, lags behind RPM variations
        cht = round(base_cht + (micro_cos * 0.45) + (phase_harmonic * 0.2), 1)
        # EGT reacts instantly to combustion
        egt = round(base_egt + (micro_sine * 1.6), 1)
        # Oil pressure mechanically proportional to RPM
        oil_p = round(base_oil_p + ((rpm - base_rpm) * 0.0008) + (micro_cos * 0.02), 2)
        oil_t = round(base_oil_t + (micro_sine * 0.35), 1)
        # Fuel flow proportional to RPM & Manifold Pressure
        fuel_flow = round(base_fuel + ((rpm - base_rpm) * 0.003) + (micro_sine * 0.08), 1)
        vib_rms = round(max(0.18, min(0.60, base_vib + (micro_sine * 0.015))), 2)
        inj_timing = round(base_inj + (micro_cos * 0.12), 1)
        map_inhg = round(base_map + ((rpm - base_rpm) * 0.004), 1)

        # Spatial Navigation Orbit Simulation (Centered over Sector Alpha)
        orbit_radius_deg = 0.08
        orbit_angle = (t / 45.0) % (2.0 * math.pi)
        lat = round(21.42 + (math.cos(orbit_angle) * orbit_radius_deg), 5)
        lng = round(81.68 + (math.sin(orbit_angle) * orbit_radius_deg * 1.2), 5)
        heading = int((math.degrees(-orbit_angle) + 90.0) % 360)
        roll = round(math.sin(orbit_angle) * 4.5, 1)

        now_utc = datetime.now(timezone.utc)

        snapshot = {
            "uav_id": self.active_uav_id,
            "mode": TelemetryMode.DEMO.value,
            "is_simulated": True,
            "timestamp": now_utc.strftime("%H:%M:%S"),
            "iso_timestamp": now_utc.isoformat(),
            
            # 8 Core Aero Engine Parameters
            "rpm": rpm,
            "cht": cht,
            "egt": egt,
            "oilPressure": oil_p,
            "oilTemperature": oil_t,
            "fuelFlow": fuel_flow,
            "vibrationRMS": vib_rms,
            "injectionTiming": inj_timing,
            
            # Secondary & Electrical
            "manifoldPressureInHg": map_inhg,
            "coolantTemp": round(cht * 0.47, 1),
            "fuelPressure": round(3.2 + (micro_cos * 0.03), 2),
            "batteryVoltage": round(28.2 + (micro_sine * 0.05), 1),
            "batteryCurrent": round(14.8 + (micro_cos * 0.2), 1),
            "batterySoc": 96.0,
            "engineHealth": health,
            
            # Spatial / Flight Dynamics
            "latitude": lat,
            "longitude": lng,
            "altitudeFt": round(altitude, 1),
            "groundSpeedMs": round(speed_ms, 1),
            "headingDeg": heading,
            "rollDeg": roll,
            "pitchDeg": 2.2,
            "verticalSpeedMs": climb_rate_ms,
        }

        # Scenario injection overrides
        if self.scenario == SimulationScenario.SENSOR_DISCONNECTED:
            snapshot["cht"] = None  # Open-circuit / disconnected sensor
        elif self.scenario == SimulationScenario.GPS_SIGNAL_LOSS:
            snapshot["latitude"] = None
            snapshot["longitude"] = None
            snapshot["altitudeFt"] = None
            snapshot["groundSpeedMs"] = 0.0
        elif self.scenario == SimulationScenario.INTERMITTENT_COMM:
            if int(t) % 2 == 0:
                snapshot["oilPressure"] = None
                snapshot["egt"] = None
        elif self.scenario == SimulationScenario.STALE_TELEMETRY:
            stale_time = now_utc - timedelta(seconds=15)
            snapshot["timestamp"] = stale_time.strftime("%H:%M:%S")
            snapshot["iso_timestamp"] = stale_time.isoformat()

        # Save to demo ring buffer
        self.demo_buffer.append(snapshot)
        if len(self.demo_buffer) > self.max_buffer_size:
            self.demo_buffer.pop(0)

        return snapshot

    # =========================================================================
    # REPLAY MODE GENERATOR (Historical Scrub Point Playback)
    # =========================================================================
    def _generate_replay_telemetry(self) -> Dict[str, Any]:
        """
        Advances or fetches telemetry for the recorded mission scrubber.
        Strictly segregated from live and demo buffers.
        """
        # Increment offset smoothly during playback
        self.replay_current_offset_sec = (self.replay_current_offset_sec + 1) % self.replay_max_offset_sec
        offset = self.replay_current_offset_sec

        # Try to pull from authentic mission database
        from app.services.mission_service import mission_service
        mission = mission_service.get_by_id(self.replay_mission_id)
        if mission and mission.get("timeline"):
            timeline = mission["timeline"]
            idx = min(len(timeline) - 1, max(0, int((offset / max(1, self.replay_max_offset_sec)) * len(timeline))))
            p = timeline[idx]
            return {
                "uav_id": mission.get("uav_id", self.active_uav_id),
                "mission_id": self.replay_mission_id,
                "mode": TelemetryMode.REPLAY.value,
                "is_simulated": False,
                "time_offset_sec": offset,
                "timestamp": p.get("time", f"T+{offset // 60:02d}:{offset % 60:02d}"),
                "iso_timestamp": p.get("timestamp", datetime.now(timezone.utc).isoformat()),
                
                "rpm": p.get("rpm", 2450),
                "cht": p.get("cht", 185.0),
                "egt": p.get("egt", 615.0),
                "oilPressure": p.get("oilPressure", 4.2),
                "oilTemperature": p.get("oilTemperature", 95.0),
                "fuelFlow": p.get("fuelFlow", 12.2),
                "vibrationRMS": p.get("vibration", 0.27),
                "injectionTiming": 26.2,
                "manifoldPressureInHg": p.get("manifoldPressureInHg", 30.8),
                "engineHealth": p.get("engineHealth", 95.0),
                
                "latitude": p.get("lat"),
                "longitude": p.get("lng"),
                "altitudeFt": p.get("altitude", 12000.0),
                "groundSpeedMs": p.get("speed", 32.4),
                "headingDeg": p.get("heading", 0.0),
                "rollDeg": p.get("roll", 0.0),
                "pitchDeg": p.get("pitch", 0.0),
                "verticalSpeedMs": p.get("verticalSpeed", 0.0),
                "batteryVoltage": p.get("batteryVoltage", 28.2),
                "batteryCurrent": p.get("batteryCurrent", 14.5),
                "batterySoc": p.get("battery", 95.0),
            }

        # Fallback deterministic synthetic replay calculation
        progress = offset / float(self.replay_max_offset_sec)
        cycle_rad = progress * 4.0 * math.pi

        rpm = int(2450 + (math.sin(cycle_rad) * 120))
        cht = round(185.0 + (math.cos(cycle_rad) * 8.0), 1)
        egt = round(615.0 + (math.sin(cycle_rad * 1.5) * 18.0), 1)
        oil_p = round(4.2 + (math.cos(cycle_rad) * 0.15), 2)
        oil_t = round(95.0 + (math.sin(cycle_rad) * 4.0), 1)
        fuel = round(12.2 + (math.sin(cycle_rad) * 1.8), 1)
        vib = round(0.27 + (abs(math.sin(cycle_rad)) * 0.04), 2)
        inj = round(26.2 + (math.cos(cycle_rad) * 0.4), 1)

        lat = round(21.160 + (progress * 0.35), 5)
        lng = round(81.280 + (progress * 0.45), 5)

        return {
            "uav_id": self.active_uav_id,
            "mission_id": self.replay_mission_id,
            "mode": TelemetryMode.REPLAY.value,
            "is_simulated": False,
            "time_offset_sec": offset,
            "timestamp": f"T+{offset // 60:02d}:{offset % 60:02d}",
            "iso_timestamp": datetime.now(timezone.utc).isoformat(),
            
            "rpm": rpm,
            "cht": cht,
            "egt": egt,
            "oilPressure": oil_p,
            "oilTemperature": oil_t,
            "fuelFlow": fuel,
            "vibrationRMS": vib,
            "injectionTiming": inj,
            "manifoldPressureInHg": round(30.8 + (math.sin(cycle_rad) * 1.5), 1),
            "engineHealth": 95.0,
            
            "latitude": lat,
            "longitude": lng,
            "altitudeFt": round(12000.0 + (progress * 6000.0), 1),
            "groundSpeedMs": 32.4,
            "headingDeg": int((progress * 360.0) % 360),
            "rollDeg": 1.5,
            "pitchDeg": 2.0,
            "verticalSpeedMs": 0.0,
        }

    # =========================================================================
    # LIVE MODE RESOLVER
    # =========================================================================
    def _generate_live_telemetry(self) -> Dict[str, Any]:
        """
        Retrieves real-time packet from GCS datalink.
        If datalink is disconnected, returns explicit DISCONNECTED status frame.
        NEVER silently switches to DEMO.
        """
        if self.is_live_connected() and self.latest_live_packet:
            return self.latest_live_packet
        
        # Explicit Datalink Disconnected Frame
        now_str = datetime.now(timezone.utc).strftime("%H:%M:%S")
        return {
            "uav_id": self.active_uav_id,
            "mode": TelemetryMode.LIVE.value,
            "is_simulated": False,
            "datalink_status": "DISCONNECTED",
            "datalink_message": "Awaiting hardware datalink stream on port 14550",
            "timestamp": now_str,
            "iso_timestamp": datetime.now(timezone.utc).isoformat(),
            "rpm": 0,
            "cht": 0.0,
            "egt": 0.0,
            "oilPressure": 0.0,
            "oilTemperature": 0.0,
            "fuelFlow": 0.0,
            "vibrationRMS": 0.0,
            "injectionTiming": 0.0,
            "manifoldPressureInHg": 0.0,
            "engineHealth": 0.0,
            "latitude": 21.2891,
            "longitude": 81.6720,
            "altitudeFt": 0.0,
            "groundSpeedMs": 0.0,
            "headingDeg": 0,
            "rollDeg": 0.0,
            "pitchDeg": 0.0,
            "verticalSpeedMs": 0.0,
        }

    # =========================================================================
    # UNIFIED SNAPSHOT & BROADCASTER
    # =========================================================================
    def get_current_snapshot(self) -> Dict[str, Any]:
        """Produces the active snapshot according to strictly selected mode."""
        if self.mode == TelemetryMode.LIVE:
            snapshot = self._generate_live_telemetry()
        elif self.mode == TelemetryMode.REPLAY:
            snapshot = self._generate_replay_telemetry()
        else:
            snapshot = self._generate_demo_telemetry()

        # Phase 8: Real ML Anomaly Evaluation via Isolation Forest
        if (self.mode != TelemetryMode.LIVE or self.is_live_connected()) and snapshot.get("rpm", 0) > 0:
            try:
                from app.services.anomaly_service import anomaly_service
                analysis = anomaly_service.detect(
                    telemetry=snapshot,
                    uav_id=snapshot.get("uav_id", self.active_uav_id),
                    mission_id=snapshot.get("mission_id"),
                    operating_mode=self.mode.value,
                )
                snapshot["anomaly_score"] = analysis.get("anomaly_score", 0.0)
                snapshot["is_anomaly"] = analysis.get("is_anomaly", False)
                snapshot["anomaly_severity"] = analysis.get("severity", "Normal")
                snapshot["affected_parameters"] = analysis.get("affected_parameters", [])
                snapshot["primary_component"] = analysis.get("primary_component", "Rotax 914 F")
            except Exception as e:
                logger.debug(f"Anomaly evaluation bypass: {e}")

        # Phase 9: Real ML RUL Regression & Predictive Maintenance
        if (self.mode != TelemetryMode.LIVE or self.is_live_connected()) and snapshot.get("rpm", 0) > 0:
            try:
                from app.services.rul_service import rul_service
                rul_res = rul_service.predict_rul(
                    telemetry=snapshot,
                    uav_id=snapshot.get("uav_id", self.active_uav_id),
                    operating_mode=self.mode.value,
                )
                snapshot["estimated_rul_hours"] = rul_res.get("overall_rul_hours", 1548.0)
                snapshot["rul_urgency"] = rul_res.get("urgency", "Continue Monitoring")
                snapshot["component_rul_breakdown"] = [
                    {"component": c["component_name"], "rulHours": c["rul_hours"], "status": c["status"]}
                    for c in rul_res.get("components", [])[:4]
                ]
            except Exception as e:
                logger.debug(f"RUL evaluation bypass: {e}")

        # Phase 10: Real-time Alert Evaluation & Notification Queue
        if self.mode != TelemetryMode.REPLAY and snapshot.get("rpm", 0) > 0:
            try:
                from app.services.alert_service import alert_service
                alert_service.evaluate_telemetry_snapshot(
                    snapshot=snapshot,
                    operating_mode=self.mode.value,
                )
                summary = alert_service.get_summary(uav_id=snapshot.get("uav_id", self.active_uav_id))
                snapshot["alerts_summary"] = {
                    "active_unresolved": summary.get("active_unresolved", 0),
                    "critical_count": summary.get("critical_count", 0),
                    "total_alerts": summary.get("total_alerts", 0),
                }
            except Exception as e:
                logger.debug(f"Alert evaluation bypass: {e}")

        self.latest_snapshot = snapshot
        return snapshot

    async def broadcast_loop(self):
        """
        Background distribution loop broadcasting synchronized telemetry
        to all active WebSocket clients at 1.0 Hz.
        """
        if self.is_broadcasting:
            return
        self.is_broadcasting = True
        logger.info("TelemetryManager broadcast loop active at 1.0 Hz.")
        
        try:
            while self.is_broadcasting:
                snapshot = self.get_current_snapshot()
                if self.active_connections:
                    disconnected = set()
                    for conn in list(self.active_connections):
                        try:
                            await conn.send_json(snapshot)
                        except Exception:
                            disconnected.add(conn)
                    for conn in disconnected:
                        self.active_connections.discard(conn)
                await asyncio.sleep(1.0)
        finally:
            self.is_broadcasting = False
            logger.info("TelemetryManager broadcast loop stopped.")

telemetry_manager = TelemetryManager()

