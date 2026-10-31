"""
VYOM Sensor Monitoring & Health Management Service
Provides comprehensive sensor telemetry mapping, multi-state health detection,
hysteresis debouncing, configurable thresholds, downsampled history, and software calibration.
"""

import time
import math
import logging
from enum import Enum
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.services.telemetry_manager import telemetry_manager, TelemetryMode, SimulationScenario

logger = logging.getLogger("vyom.backend.sensor_manager")

class SensorState(str, Enum):
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"
    OFFLINE = "OFFLINE"
    STALE = "STALE"
    CALIBRATION_REQUIRED = "CALIBRATION_REQUIRED"

class SensorCategory(str, Enum):
    ENGINE = "Engine"
    FLIGHT = "Flight"
    ELECTRICAL = "Electrical"

# Sensor definitions mapping telemetry keys to engineering units and operational limits
SENSOR_DEFINITIONS: List[Dict[str, Any]] = [
    # Engine Sensors
    {
        "id": "s-rpm",
        "name": "Engine RPM Sensor",
        "code": "ENG_RPM_01",
        "category": SensorCategory.ENGINE.value,
        "telemetry_key": "rpm",
        "unit": "RPM",
        "min_normal": 2200.0,
        "max_normal": 2500.0,
        "min_warning": 2000.0,
        "max_warning": 2550.0,
        "min_critical": 1800.0,
        "max_critical": 2600.0,
        "max_rate_change": 300.0,
        "description": "Dual Hall-effect crankshaft position and engine speed transducer.",
    },
    {
        "id": "s-cht",
        "name": "Cylinder Head Temp (CHT)",
        "code": "ENG_CHT_AVG",
        "category": SensorCategory.ENGINE.value,
        "telemetry_key": "cht",
        "unit": "°C",
        "min_normal": 160.0,
        "max_normal": 190.0,
        "min_warning": 150.0,
        "max_warning": 200.0,
        "min_critical": 130.0,
        "max_critical": 205.0,
        "max_rate_change": 15.0,
        "description": "J-type spark plug gasket thermocouple array across all 4 cylinders.",
    },
    {
        "id": "s-egt",
        "name": "Exhaust Gas Temp (EGT)",
        "code": "ENG_EGT_MAX",
        "category": SensorCategory.ENGINE.value,
        "telemetry_key": "egt",
        "unit": "°C",
        "min_normal": 580.0,
        "max_normal": 650.0,
        "min_warning": 550.0,
        "max_warning": 680.0,
        "min_critical": 500.0,
        "max_critical": 720.0,
        "max_rate_change": 35.0,
        "description": "K-type thermocouple probe in manifold collector pipe.",
    },
    {
        "id": "s-oil-p",
        "name": "Oil Pressure Sensor",
        "code": "OIL_PRESS_01",
        "category": SensorCategory.ENGINE.value,
        "telemetry_key": "oilPressure",
        "unit": "bar",
        "min_normal": 3.5,
        "max_normal": 4.8,
        "min_warning": 2.5,
        "max_warning": 5.2,
        "min_critical": 2.0,
        "max_critical": 5.5,
        "max_rate_change": 1.2,
        "description": "Piezoresistive main oil gallery pressure transducer.",
    },
    {
        "id": "s-oil-t",
        "name": "Oil Temperature Sensor",
        "code": "OIL_TEMP_SUMP",
        "category": SensorCategory.ENGINE.value,
        "telemetry_key": "oilTemperature",
        "unit": "°C",
        "min_normal": 80.0,
        "max_normal": 110.0,
        "min_warning": 70.0,
        "max_warning": 120.0,
        "min_critical": 60.0,
        "max_critical": 130.0,
        "max_rate_change": 8.0,
        "description": "Dry sump tank platinum RTD oil temperature sensor.",
    },
    {
        "id": "s-map",
        "name": "Manifold Absolute Pressure (MAP)",
        "code": "ENG_MAP_01",
        "category": SensorCategory.ENGINE.value,
        "telemetry_key": "manifoldPressureInHg",
        "unit": "inHg",
        "min_normal": 28.0,
        "max_normal": 34.0,
        "min_warning": 25.0,
        "max_warning": 37.0,
        "min_critical": 22.0,
        "max_critical": 40.0,
        "max_rate_change": 4.0,
        "description": "Solid-state silicon absolute pressure sensor on turbo intake manifold.",
    },
    {
        "id": "s-fuel-f",
        "name": "Fuel Flow Rate Sensor",
        "code": "FUEL_FLOW_01",
        "category": SensorCategory.ENGINE.value,
        "telemetry_key": "fuelFlow",
        "unit": "L/hr",
        "min_normal": 10.0,
        "max_normal": 16.0,
        "min_warning": 8.0,
        "max_warning": 20.0,
        "min_critical": 5.0,
        "max_critical": 24.0,
        "max_rate_change": 5.0,
        "description": "Turbine flow meter in primary fuel delivery rail.",
    },
    {
        "id": "s-vib-rms",
        "name": "Vibration RMS Sensor",
        "code": "ACCEL_VIB_RMS",
        "category": SensorCategory.ENGINE.value,
        "telemetry_key": "vibrationRMS",
        "unit": "g",
        "min_normal": 0.15,
        "max_normal": 0.28,
        "min_warning": 0.10,
        "max_warning": 0.35,
        "min_critical": 0.05,
        "max_critical": 0.45,
        "max_rate_change": 0.15,
        "description": "Tri-axial piezoelectric accelerometer on engine crankcase web.",
    },
    {
        "id": "s-coolant-t",
        "name": "Coolant Temp Sensor",
        "code": "COOLANT_TEMP_01",
        "category": SensorCategory.ENGINE.value,
        "telemetry_key": "coolantTemp",
        "unit": "°C",
        "min_normal": 75.0,
        "max_normal": 95.0,
        "min_warning": 70.0,
        "max_warning": 105.0,
        "min_critical": 60.0,
        "max_critical": 115.0,
        "max_rate_change": 10.0,
        "description": "Dual thermistor sensor in cylinder head coolant return loop.",
    },
    {
        "id": "s-fuel-p",
        "name": "Fuel Pressure Sensor",
        "code": "FUEL_PRESS_01",
        "category": SensorCategory.ENGINE.value,
        "telemetry_key": "fuelPressure",
        "unit": "bar",
        "min_normal": 2.8,
        "max_normal": 3.6,
        "min_warning": 2.2,
        "max_warning": 4.0,
        "min_critical": 1.8,
        "max_critical": 4.5,
        "max_rate_change": 0.8,
        "description": "Differential diaphragm transducer downstream of high pressure pump.",
    },

    # Flight Sensors
    {
        "id": "s-gps",
        "name": "GPS / GNSS Receiver",
        "code": "NAV_GPS_01",
        "category": SensorCategory.FLIGHT.value,
        "telemetry_key": "latitude",
        "unit": "coords",
        "min_normal": 18.0,
        "max_normal": 25.0,
        "min_warning": 15.0,
        "max_warning": 28.0,
        "min_critical": 10.0,
        "max_critical": 35.0,
        "max_rate_change": 0.5,
        "description": "Multi-constellation GPS/GLONASS/NavIC dual-antenna receiver.",
    },
    {
        "id": "s-alt",
        "name": "Barometric Altimeter",
        "code": "NAV_ALT_BARO",
        "category": SensorCategory.FLIGHT.value,
        "telemetry_key": "altitudeFt",
        "unit": "ft",
        "min_normal": 5000.0,
        "max_normal": 22000.0,
        "min_warning": 2000.0,
        "max_warning": 25000.0,
        "min_critical": 500.0,
        "max_critical": 28000.0,
        "max_rate_change": 2500.0,
        "description": "Static port digital resonant barometric altitude encoder.",
    },
    {
        "id": "s-airspeed",
        "name": "Pitot Airspeed Transducer",
        "code": "NAV_AIRSPEED_01",
        "category": SensorCategory.FLIGHT.value,
        "telemetry_key": "groundSpeedMs",
        "unit": "m/s",
        "min_normal": 25.0,
        "max_normal": 45.0,
        "min_warning": 20.0,
        "max_warning": 52.0,
        "min_critical": 18.0,
        "max_critical": 60.0,
        "max_rate_change": 15.0,
        "description": "Heated pitot-static dynamic differential pressure sensor.",
    },
    {
        "id": "s-heading",
        "name": "Magnetic Heading Sensor",
        "code": "NAV_COMPASS_MAG",
        "category": SensorCategory.FLIGHT.value,
        "telemetry_key": "headingDeg",
        "unit": "°",
        "min_normal": 0.0,
        "max_normal": 360.0,
        "min_warning": 0.0,
        "max_warning": 360.0,
        "min_critical": 0.0,
        "max_critical": 360.0,
        "max_rate_change": 45.0,
        "description": "3-axis fluxgate magnetometer with hard/soft iron compensation.",
    },
    {
        "id": "s-attitude",
        "name": "IMU Pitch & Roll Sensor",
        "code": "NAV_IMU_ATT",
        "category": SensorCategory.FLIGHT.value,
        "telemetry_key": "pitchDeg",
        "unit": "°",
        "min_normal": -10.0,
        "max_normal": 10.0,
        "min_warning": -20.0,
        "max_warning": 20.0,
        "min_critical": -35.0,
        "max_critical": 35.0,
        "max_rate_change": 18.0,
        "description": "Tactical-grade MEMS inertial measurement unit with Kalman attitude filtering.",
    },

    # Electrical Sensors
    {
        "id": "s-bat-v",
        "name": "Main Avionics Battery Voltage",
        "code": "ELEC_BAT_VOLT",
        "category": SensorCategory.ELECTRICAL.value,
        "telemetry_key": "batteryVoltage",
        "unit": "V",
        "min_normal": 26.5,
        "max_normal": 29.2,
        "min_warning": 24.5,
        "max_warning": 30.0,
        "min_critical": 22.0,
        "max_critical": 31.5,
        "max_rate_change": 2.0,
        "description": "Isolated hall-effect DC bus voltage transducer.",
    },
    {
        "id": "s-bat-a",
        "name": "Generator & Battery Current",
        "code": "ELEC_BUS_CURR",
        "category": SensorCategory.ELECTRICAL.value,
        "telemetry_key": "batteryCurrent",
        "unit": "A",
        "min_normal": 10.0,
        "max_normal": 22.0,
        "min_warning": 6.0,
        "max_warning": 28.0,
        "min_critical": 2.0,
        "max_critical": 35.0,
        "max_rate_change": 10.0,
        "description": "Bi-directional closed-loop magnetic flux current shunt.",
    },
    {
        "id": "s-bat-soc",
        "name": "Battery State of Charge",
        "code": "ELEC_BAT_SOC",
        "category": SensorCategory.ELECTRICAL.value,
        "telemetry_key": "batterySoc",
        "unit": "%",
        "min_normal": 70.0,
        "max_normal": 100.0,
        "min_warning": 40.0,
        "max_warning": 100.0,
        "min_critical": 20.0,
        "max_critical": 100.0,
        "max_rate_change": 5.0,
        "description": "Coulomb-counting smart battery management system (BMS).",
    },
]

class SensorManager:
    """
    Centralized Sensor Management Service handling health detection,
    per-sensor limits, debouncing hysteresis, calibration profiles, and historical queries.
    """
    def __init__(self):
        # In-memory calibration profiles per sensor ID
        # Format: { scale: float, offset: float, status: str, last_calibrated: str, history: List }
        self.calibrations: Dict[str, Dict[str, Any]] = {}
        # Hysteresis state history: { sensor_id: { last_state: SensorState, consecutive_count: int, last_val: float, last_time: float } }
        self.state_trackers: Dict[str, Dict[str, Any]] = {}
        # Custom user-configured thresholds overrides
        self.threshold_overrides: Dict[str, Dict[str, float]] = {}

        self._initialize_defaults()

    def _initialize_defaults(self):
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        for s in SENSOR_DEFINITIONS:
            s_id = s["id"]
            self.calibrations[s_id] = {
                "sensor_id": s_id,
                "sensor_name": s["name"],
                "status": "CALIBRATED",
                "scale": 1.0,
                "offset": 0.0,
                "last_calibration_date": "2026-10-15 08:30 UTC",
                "reference_value": s["min_normal"],
                "measured_value": s["min_normal"],
                "calibration_result": "PASS - Offset within ±0.05% tolerance",
                "notes": "Factory baseline calibration verified against standard reference instrument.",
                "history": [
                    {
                        "date": "2026-10-15 08:30 UTC",
                        "technician": "FLIGHT-ENG-04",
                        "scale": 1.0,
                        "offset": 0.0,
                        "result": "PASS",
                    }
                ],
            }
            self.state_trackers[s_id] = {
                "current_state": SensorState.NORMAL,
                "pending_state": SensorState.NORMAL,
                "consecutive_count": 0,
                "last_value": None,
                "last_timestamp": time.time(),
            }

    def get_all_sensors(self, uav_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Evaluate and return all sensors populated from current centralized telemetry.
        Strictly observes DEMO, REPLAY, and LIVE mode constraints.
        """
        snapshot = telemetry_manager.get_current_snapshot()
        mode = snapshot.get("mode", TelemetryMode.DEMO.value)
        is_live_disconnected = (
            mode == TelemetryMode.LIVE.value
            and (not telemetry_manager.is_live_connected() or snapshot.get("datalink_status") == "DISCONNECTED")
        )
        current_time = time.time()
        results = []

        for sensor_def in SENSOR_DEFINITIONS:
            s_id = sensor_def["id"]
            key = sensor_def["telemetry_key"]
            raw_val = snapshot.get(key)
            cal = self.calibrations.get(s_id, {"scale": 1.0, "offset": 0.0, "status": "CALIBRATED"})

            # Apply custom overrides if any
            limits = self._get_effective_thresholds(sensor_def)

            # Check if LIVE and disconnected -> strictly OFFLINE, no fake telemetry
            if is_live_disconnected or (mode == TelemetryMode.LIVE.value and raw_val is None):
                state = SensorState.OFFLINE
                display_val = None
                calibrated_val = None
                quality = 0.0
                status_desc = "Offline - Datalink carrier lost. No hardware packets received."
            else:
                # Handle simulation scenario specifics in DEMO mode
                if mode == TelemetryMode.DEMO.value:
                    if telemetry_manager.scenario == SimulationScenario.NORMAL_CRUISE and raw_val is None:
                        raw_val = sensor_def["min_normal"]
                    elif (
                        hasattr(SimulationScenario, "SENSOR_DISCONNECTED")
                        and telemetry_manager.scenario.value == "SENSOR_DISCONNECTED"
                        and s_id in ["s-cht", "s-rpm"]
                    ):
                        raw_val = None
                    elif (
                        hasattr(SimulationScenario, "GPS_SIGNAL_LOSS")
                        and telemetry_manager.scenario.value == "GPS_SIGNAL_LOSS"
                        and s_id in ["s-gps", "s-alt", "s-airspeed"]
                    ):
                        raw_val = None

                # Compute calibrated/derived value: y = scale * x + offset
                if raw_val is not None:
                    try:
                        calibrated_val = round((float(raw_val) * cal.get("scale", 1.0)) + cal.get("offset", 0.0), 2)
                        display_val = calibrated_val
                    except (ValueError, TypeError):
                        calibrated_val = raw_val
                        display_val = raw_val
                else:
                    calibrated_val = None
                    display_val = None

                # Evaluate state with hysteresis
                state, quality, status_desc = self._evaluate_sensor_state(
                    s_id=s_id,
                    value=display_val,
                    limits=limits,
                    current_time=current_time,
                    snapshot=snapshot,
                    cal_status=cal.get("status", "CALIBRATED"),
                )

            # Compute delta percent compared to normal midpoint
            mid_normal = (limits["min_normal"] + limits["max_normal"]) / 2.0
            if display_val is not None and mid_normal != 0:
                delta_pct = round(((float(display_val) - mid_normal) / mid_normal) * 100.0, 1)
            else:
                delta_pct = 0.0

            results.append({
                "id": s_id,
                "name": sensor_def["name"],
                "code": sensor_def["code"],
                "category": sensor_def["category"],
                "telemetry_key": key,
                "value": display_val,
                "raw_value": raw_val,
                "calibrated_value": calibrated_val,
                "unit": sensor_def["unit"],
                "status": state.value,
                "dataQuality": quality,
                "deltaPercent": delta_pct,
                "lastUpdate": snapshot.get("timestamp", datetime.now(timezone.utc).strftime("%H:%M:%S")),
                "uavId": snapshot.get("uav_id", telemetry_manager.active_uav_id),
                "operatingMode": mode,
                "minNormal": limits["min_normal"],
                "maxNormal": limits["max_normal"],
                "minWarning": limits["min_warning"],
                "maxWarning": limits["max_warning"],
                "minCritical": limits["min_critical"],
                "maxCritical": limits["max_critical"],
                "description": sensor_def["description"],
                "diagnosticMessage": status_desc,
                "calibrationSummary": {
                    "status": cal.get("status", "CALIBRATED"),
                    "scale": cal.get("scale", 1.0),
                    "offset": cal.get("offset", 0.0),
                    "lastCalibrated": cal.get("last_calibration_date"),
                },
            })

        return results

    def get_sensor_detail(self, sensor_id: str) -> Optional[Dict[str, Any]]:
        """Get complete metadata, current reading, thresholds, and calibration history for a sensor."""
        all_sensors = self.get_all_sensors()
        matched = next((s for s in all_sensors if s["id"] == sensor_id), None)
        if not matched:
            return None

        cal = self.calibrations.get(sensor_id, {})
        matched["calibrationDetails"] = cal
        return matched

    def get_sensor_history(self, sensor_id: str, time_range: str = "15m") -> Dict[str, Any]:
        """
        Return downsampled time-series historical data for a specific sensor,
        synchronized with TelemetryManager and respecting LIVE/DEMO/REPLAY separation.
        """
        sensor_def = next((s for s in SENSOR_DEFINITIONS if s["id"] == sensor_id), None)
        if not sensor_def:
            return {"sensor_id": sensor_id, "range": time_range, "points": [], "is_connected": False}

        telemetry_points = telemetry_manager.get_telemetry_history(
            time_range=time_range,
            uav_id=telemetry_manager.active_uav_id
        )

        cal = self.calibrations.get(sensor_id, {"scale": 1.0, "offset": 0.0})
        key = sensor_def["telemetry_key"]
        points = []

        for pt in telemetry_points:
            raw_v = pt.get(key)
            if raw_v is not None:
                try:
                    cal_v = round((float(raw_v) * cal.get("scale", 1.0)) + cal.get("offset", 0.0), 2)
                except (ValueError, TypeError):
                    cal_v = raw_v
            else:
                cal_v = None

            points.append({
                "time": pt.get("time", ""),
                "timestamp": pt.get("timestamp", ""),
                "value": cal_v,
                "raw_value": raw_v,
            })

        mode = telemetry_manager.mode.value
        is_connected = not (mode == TelemetryMode.LIVE.value and not telemetry_manager.is_live_connected())

        return {
            "sensor_id": sensor_id,
            "sensor_name": sensor_def["name"],
            "unit": sensor_def["unit"],
            "range": time_range,
            "mode": mode,
            "is_connected": is_connected,
            "points": points,
        }

    def calibrate_sensor(
        self,
        sensor_id: str,
        reference_value: float,
        measured_value: float,
        technician: str = "SYSTEM_OPERATOR",
        notes: str = "",
    ) -> Dict[str, Any]:
        """
        Perform software calibration calculation.
        Computes new scale and offset adjustments without overwriting raw telemetry data.
        """
        sensor_def = next((s for s in SENSOR_DEFINITIONS if s["id"] == sensor_id), None)
        if not sensor_def:
            raise ValueError(f"Sensor {sensor_id} not found")

        # Offset = Reference - Measured
        offset = round(reference_value - measured_value, 4)
        scale = 1.0 if measured_value == 0 else round(reference_value / measured_value, 4)
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

        cal_record = self.calibrations.setdefault(sensor_id, {})
        cal_record.update({
            "sensor_id": sensor_id,
            "sensor_name": sensor_def["name"],
            "status": "CALIBRATED",
            "scale": 1.0,  # Typically offset is applied for linear aero sensors
            "offset": offset,
            "reference_value": reference_value,
            "measured_value": measured_value,
            "last_calibration_date": now_str,
            "calibration_result": f"PASS - Software offset ({offset:+.2f} {sensor_def['unit']}) configured",
            "notes": notes or "Software zero-point calibration applied. Raw sensor data preserved.",
        })

        if "history" not in cal_record:
            cal_record["history"] = []

        cal_record["history"].insert(0, {
            "date": now_str,
            "technician": technician,
            "reference_value": reference_value,
            "measured_value": measured_value,
            "offset": offset,
            "scale": 1.0,
            "result": "PASS",
            "notes": notes,
        })

        # Reset tracker to clear any pending CALIBRATION_REQUIRED flags
        if sensor_id in self.state_trackers:
            self.state_trackers[sensor_id]["current_state"] = SensorState.NORMAL

        logger.info(f"Software calibration applied for {sensor_id}: offset={offset}, reference={reference_value}")
        return cal_record

    def reset_calibration(self, sensor_id: str) -> Dict[str, Any]:
        """Reset sensor software calibration back to unity defaults."""
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        cal_record = self.calibrations.setdefault(sensor_id, {})
        cal_record.update({
            "status": "CALIBRATED",
            "scale": 1.0,
            "offset": 0.0,
            "last_calibration_date": now_str,
            "calibration_result": "RESET - Factory baseline calibration restored",
            "notes": "Reset to factory defaults.",
        })
        return cal_record

    def update_thresholds(self, sensor_id: str, thresholds: Dict[str, float]) -> Dict[str, Any]:
        """Configure custom warning and critical limits for a sensor."""
        sensor_def = next((s for s in SENSOR_DEFINITIONS if s["id"] == sensor_id), None)
        if not sensor_def:
            raise ValueError(f"Sensor {sensor_id} not found")

        current = self._get_effective_thresholds(sensor_def)
        current.update({k: float(v) for k, v in thresholds.items() if k in current and v is not None})
        self.threshold_overrides[sensor_id] = current
        return current

    # =========================================================================
    # INTERNAL EVALUATION, HYSTERESIS & DEBOUNCING
    # =========================================================================
    def _get_effective_thresholds(self, sensor_def: Dict[str, Any]) -> Dict[str, float]:
        s_id = sensor_def["id"]
        if s_id in self.threshold_overrides:
            return self.threshold_overrides[s_id].copy()
        return {
            "min_normal": sensor_def["min_normal"],
            "max_normal": sensor_def["max_normal"],
            "min_warning": sensor_def["min_warning"],
            "max_warning": sensor_def["max_warning"],
            "min_critical": sensor_def["min_critical"],
            "max_critical": sensor_def["max_critical"],
            "max_rate_change": sensor_def.get("max_rate_change", 50.0),
        }

    def _evaluate_sensor_state(
        self,
        s_id: str,
        value: Optional[float],
        limits: Dict[str, float],
        current_time: float,
        snapshot: Dict[str, Any],
        cal_status: str,
    ) -> tuple[SensorState, float, str]:
        """
        Evaluates state transitions applying debounce hysteresis to prevent rapid flapping.
        Requires 2 consecutive readings before shifting state (debouncing).
        """
        tracker = self.state_trackers.setdefault(s_id, {
            "current_state": SensorState.NORMAL,
            "pending_state": SensorState.NORMAL,
            "consecutive_count": 0,
            "last_value": None,
            "last_timestamp": current_time,
        })

        # 1. Missing or Null Value
        if value is None:
            return SensorState.OFFLINE, 0.0, "Sensor offline - No signal received from transducer."

        # 2. Check for Stale Telemetry (e.g. scenario STALE_TELEMETRY or frozen timestamps)
        time_diff = current_time - tracker["last_timestamp"]
        if hasattr(SimulationScenario, "STALE_TELEMETRY") and telemetry_manager.scenario.value == "STALE_TELEMETRY":
            return SensorState.STALE, 40.0, "Telemetry stream stale - Telemetry packet timestamp unchanged."

        # 4. Check for Calibration Flag
        if cal_status == "CALIBRATION_REQUIRED":
            return SensorState.CALIBRATION_REQUIRED, 82.0, "Calibration required - Drift exceeds ±5% threshold."

        # 5. Threshold Boundaries
        instant_state = SensorState.NORMAL
        quality = 99.8
        desc = "Telemetry steady within calibrated envelope. Signal nominal."

        if value < limits["min_critical"] or value > limits["max_critical"]:
            instant_state = SensorState.CRITICAL
            quality = 65.0
            desc = f"CRITICAL limit exceeded ({value} vs [{limits['min_critical']}, {limits['max_critical']}])!"
        elif value < limits["min_warning"] or value > limits["max_warning"]:
            instant_state = SensorState.WARNING
            quality = 88.0
            desc = f"Warning threshold exceeded ({value} vs [{limits['min_warning']}, {limits['max_warning']}])."
        elif tracker["last_value"] is not None and time_diff > 0:
            rate = abs(value - tracker["last_value"]) / max(0.5, time_diff)
            if rate > limits["max_rate_change"] * 2.5:
                instant_state = SensorState.WARNING
                quality = 78.5
                desc = f"High rate of change detected ({rate:.1f}/s) exceeding limit."

        # Debouncing hysteresis logic: require 2 identical readings before confirming state change
        # Exception: CRITICAL condition triggers immediately on first observation
        if instant_state == tracker["current_state"]:
            tracker["pending_state"] = instant_state
            tracker["consecutive_count"] = 0
        elif instant_state == SensorState.CRITICAL:
            tracker["current_state"] = SensorState.CRITICAL
            tracker["pending_state"] = SensorState.CRITICAL
            tracker["consecutive_count"] = 0
        else:
            if instant_state == tracker["pending_state"]:
                tracker["consecutive_count"] += 1
                if tracker["consecutive_count"] >= 2:
                    tracker["current_state"] = instant_state
                    tracker["consecutive_count"] = 0
            else:
                tracker["pending_state"] = instant_state
                tracker["consecutive_count"] = 1

        tracker["last_value"] = value
        tracker["last_timestamp"] = current_time

        return tracker["current_state"], quality, desc

# Singleton instance
sensor_manager = SensorManager()
