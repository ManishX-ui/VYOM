"""
VYOM Digital Twin Engine Service
Provides computational physics, thermodynamic envelope calculations,
and component degradation / RUL models for 4-cylinder turbocharged aero-engines (Rotax 914 F).
"""

from typing import List, Dict, Any

ROTAX_914_SPECS = {
    "engine_model": "Rotax 914 F / Indigenous Aero Piston",
    "engine_type": "Rotax 914 F",
    "reduction_gear_ratio": 2.43,
    "architecture": "4-Cylinder, 4-Stroke Turbocharged Boxer Engine",
    "displacement_cc": 1211.2,
    "bore_mm": 79.5,
    "stroke_mm": 61.0,
    "compression_ratio": "9.0:1",
    "takeoff_power_hp": 115.0,
    "continuous_power_hp": 100.0,
    "max_rpm": 5800,
    "max_continuous_power_hp": 100.0,
    "max_continuous_rpm": 5500,
    "cruise_rpm": 4800,
    "idle_rpm": 1400,
    "max_cht_c": 200.0,
    "max_oil_temp_c": 130.0,
    "nominal_oil_pressure_bar": 4.0,
}

ENGINE_COMPONENTS_DATA = [
    {
        "id": "cyl-assembly",
        "name": "Cylinder Head & Piston Assembly",
        "healthPercentage": 94,
        "status": "Healthy",
        "currentReading": "187 °C CHT",
        "operatingRange": "150 - 200 °C",
        "alertsCount": 0,
        "estimatedRULHours": 1420,
        "description": "4-cylinder horizontally-opposed air/liquid-cooled head with dual ignition.",
        "category": "Combustion",
    },
    {
        "id": "turbo-system",
        "name": "Turbocharger & Wastegate Controller",
        "healthPercentage": 86,
        "status": "Monitor",
        "currentReading": "38.2 inHg MAP",
        "operatingRange": "28 - 40 inHg",
        "alertsCount": 1,
        "estimatedRULHours": 890,
        "description": "Exhaust gas driven turbocharger with TCU electronic wastegate actuator.",
        "category": "Induction",
    },
    {
        "id": "oil-pump",
        "name": "Dry Sump Lubrication & Oil Cooler",
        "healthPercentage": 97,
        "status": "Healthy",
        "currentReading": "4.2 bar @ 96 °C",
        "operatingRange": "2.0 - 5.0 bar",
        "alertsCount": 0,
        "estimatedRULHours": 1850,
        "description": "Forced lubrication with trochoid oil pump, thermostatic bypass, and external reservoir.",
        "category": "Fluids",
    },
    {
        "id": "fuel-injection",
        "name": "Electronic Dual Fuel Injection",
        "healthPercentage": 91,
        "status": "Healthy",
        "currentReading": "12.5 L/hr (26.5° BTDC)",
        "operatingRange": "8.0 - 28.0 L/hr",
        "alertsCount": 0,
        "estimatedRULHours": 1200,
        "description": "Redundant multipoint electronic fuel injection rails with altitude compensation.",
        "category": "Fuel",
    },
    {
        "id": "gearbox",
        "name": "Integrated Propeller Reduction Drive",
        "healthPercentage": 95,
        "status": "Healthy",
        "currentReading": "0.28 g RMS (2.43:1)",
        "operatingRange": "< 0.50 g RMS",
        "alertsCount": 0,
        "estimatedRULHours": 1650,
        "description": "Helical gear speed reduction unit with integrated overload torsional clutch.",
        "category": "Transmission",
    },
]

OPERATING_ENVELOPE = [
    {"rpm": 1500, "powerHp": 22.5, "manifoldInHg": 18.2, "bsfcGkwh": 310},
    {"rpm": 2000, "powerHp": 38.0, "manifoldInHg": 22.0, "bsfcGkwh": 290},
    {"rpm": 2450, "powerHp": 54.2, "manifoldInHg": 26.4, "bsfcGkwh": 275},
    {"rpm": 3000, "powerHp": 68.0, "manifoldInHg": 29.8, "bsfcGkwh": 268},
    {"rpm": 4000, "powerHp": 85.5, "manifoldInHg": 34.0, "bsfcGkwh": 260},
    {"rpm": 5000, "powerHp": 102.0, "manifoldInHg": 38.0, "bsfcGkwh": 258},
    {"rpm": 5500, "powerHp": 112.5, "manifoldInHg": 39.5, "bsfcGkwh": 262},
    {"rpm": 5800, "powerHp": 115.0, "manifoldInHg": 40.0, "bsfcGkwh": 270},
]

class DigitalTwinService:
    def get_components(self) -> List[Dict[str, Any]]:
        return ENGINE_COMPONENTS_DATA

    def get_component_by_id(self, comp_id: str) -> Dict[str, Any]:
        for c in ENGINE_COMPONENTS_DATA:
            if c["id"] == comp_id:
                return c
        return ENGINE_COMPONENTS_DATA[0]

    def get_envelope(self) -> List[Dict[str, Any]]:
        return OPERATING_ENVELOPE

    def calculate_bmep(self, power_hp: float, rpm: int) -> float:
        """
        Brake Mean Effective Pressure (BMEP) in bar
        For 4-stroke: BMEP = (Power [kW] * 1200) / (Displacement [L] * RPM)
        """
        power_kw = power_hp * 0.7457
        displacement_l = ROTAX_914_SPECS["displacement_cc"] / 1000.0
        if rpm <= 0:
            return 0.0
        bmep_bar = (power_kw * 1200) / (displacement_l * rpm)
        return round(bmep_bar, 2)

    def get_aircraft_pose(self, uav_id: str = None) -> Dict[str, Any]:
        """
        Computes real-time 3D aircraft spatial orientation, propeller speed,
        and actuator control-surface deflections synchronized with active telemetry.
        """
        from app.services.telemetry_manager import telemetry_manager
        snap = telemetry_manager.get_current_snapshot()
        mode = snap.get("mode", "DEMO")

        engine_rpm = snap.get("rpm")
        prop_rpm = None
        prop_rad_s = 0.0
        if engine_rpm is not None and isinstance(engine_rpm, (int, float)):
            # Rotax 914 F integrated reduction gearbox ratio: 2.43:1
            prop_rpm = round(float(engine_rpm) / 2.43, 1)
            prop_rad_s = round((prop_rpm * 2.0 * 3.14159265359) / 60.0, 3)

        roll_deg = float(snap.get("rollDeg") or 0.0)
        pitch_deg = float(snap.get("pitchDeg") or 0.0)
        heading_deg = float(snap.get("headingDeg") or 0.0)

        # Correlated aerodynamic control surface deflections
        left_aileron = round(max(-20.0, min(20.0, -roll_deg * 0.8)), 1)
        right_aileron = round(-left_aileron, 1)
        elevator = round(max(-15.0, min(15.0, pitch_deg * 1.2)), 1)
        rudder = round(max(-20.0, min(20.0, -roll_deg * 0.2)), 1)

        speed = float(snap.get("groundSpeedMs") or 30.0)
        flaps = 0.0 if speed > 28.0 else (15.0 if speed > 18.0 else 30.0)

        return {
            "uav_id": snap.get("uav_id", uav_id or "UAV-MALE-IND-01"),
            "mode": mode,
            "is_simulated": snap.get("is_simulated", True),
            "timestamp": snap.get("timestamp"),
            "iso_timestamp": snap.get("iso_timestamp"),
            
            # 3D Euler Angles (degrees)
            "roll_deg": roll_deg,
            "pitch_deg": pitch_deg,
            "yaw_deg": heading_deg,
            "heading_deg": heading_deg,
            "spatial_attitude": {
                "roll_deg": roll_deg,
                "pitch_deg": pitch_deg,
                "yaw_deg": heading_deg,
                "heading_deg": heading_deg,
            },
            
            # Position & Navigation
            "latitude": snap.get("latitude"),
            "longitude": snap.get("longitude"),
            "altitude_ft": snap.get("altitudeFt"),
            "ground_speed_ms": snap.get("groundSpeedMs"),
            "vertical_speed_ms": snap.get("verticalSpeedMs"),
            
            # Propulsion & Gearbox Kinematics
            "engine_rpm": engine_rpm,
            "gearbox_ratio": "2.43:1",
            "propeller_rpm": prop_rpm,
            "propeller_angular_velocity_rad_s": prop_rad_s,
            
            # Control Surfaces Deflections (degrees)
            "control_surfaces": {
                "left_aileron_deg": left_aileron,
                "right_aileron_deg": right_aileron,
                "elevator_deg": elevator,
                "rudder_deg": rudder,
                "flaps_deg": flaps,
            },
            
            # Flight Dynamics State
            "flight_phase": "CRUISE" if speed > 25.0 else ("CLIMB" if pitch_deg > 2.0 else "APPROACH"),
        }

    def get_stress_map(self, uav_id: str = None) -> Dict[str, Any]:
        """
        Evaluates thermal, pressure, and vibration stress across airframe and engine zones.
        Visual states: NORMAL (neutral), WARNING (amber), CRITICAL (red), UNAVAILABLE (grey).
        """
        from app.services.telemetry_manager import telemetry_manager
        snap = telemetry_manager.get_current_snapshot()

        cht = snap.get("cht")
        egt = snap.get("egt")
        oil_p = snap.get("oilPressure")
        oil_t = snap.get("oilTemperature")
        vib = snap.get("vibrationRMS")
        map_inhg = snap.get("manifoldPressureInHg")

        def classify_stress(val, norm_max, warn_max):
            if val is None:
                return "UNAVAILABLE", 0.0
            if val > warn_max:
                return "CRITICAL", 1.0
            if val > norm_max:
                return "WARNING", round(0.5 + 0.5 * ((val - norm_max) / (warn_max - norm_max)), 2)
            return "NORMAL", round(max(0.0, val / norm_max) * 0.5, 2)

        cyl_state, cyl_idx = classify_stress(cht, 195.0, 210.0)
        exh_state, exh_idx = classify_stress(egt, 680.0, 720.0)
        oil_state = "NORMAL"
        oil_idx = 0.3
        if oil_p is not None and (oil_p < 2.5 or (oil_t and oil_t > 110.0)):
            oil_state = "CRITICAL"
            oil_idx = 0.95
        elif oil_p is not None and (oil_p < 3.2 or (oil_t and oil_t > 100.0)):
            oil_state = "WARNING"
            oil_idx = 0.65

        vib_state, vib_idx = classify_stress(vib, 0.32, 0.45)
        turbo_state, turbo_idx = classify_stress(map_inhg, 36.0, 40.0)

        return {
            "uav_id": snap.get("uav_id", uav_id or "UAV-MALE-IND-01"),
            "mode": snap.get("mode", "DEMO"),
            "timestamp": snap.get("timestamp"),
            "components": {
                "comp-cylinder-head": {
                    "name": "Cylinder Head Assembly",
                    "parameter": "CHT",
                    "value": f"{cht} °C" if cht is not None else None,
                    "state": cyl_state,
                    "stress_index": cyl_idx,
                    "color_hex": "#ef4444" if cyl_state == "CRITICAL" else ("#f59e0b" if cyl_state == "WARNING" else "#334155"),
                },
                "comp-exhaust": {
                    "name": "Exhaust Collector & Wastegate",
                    "parameter": "EGT",
                    "value": f"{egt} °C" if egt is not None else None,
                    "state": exh_state,
                    "stress_index": exh_idx,
                    "color_hex": "#ef4444" if exh_state == "CRITICAL" else ("#f59e0b" if exh_state == "WARNING" else "#b45309"),
                },
                "comp-lubrication": {
                    "name": "Oil Sump & Lubrication Circuit",
                    "parameter": "Oil Pressure",
                    "value": f"{oil_p} bar" if oil_p is not None else None,
                    "state": oil_state,
                    "stress_index": oil_idx,
                    "color_hex": "#ef4444" if oil_state == "CRITICAL" else ("#f59e0b" if oil_state == "WARNING" else "#242d38"),
                },
                "comp-crankshaft": {
                    "name": "Crankcase & Reduction Drive",
                    "parameter": "Vibration RMS",
                    "value": f"{vib} g" if vib is not None else None,
                    "state": vib_state,
                    "stress_index": vib_idx,
                    "color_hex": "#ef4444" if vib_state == "CRITICAL" else ("#f59e0b" if vib_state == "WARNING" else "#1e2530"),
                },
                "comp-turbocharger": {
                    "name": "Turbocharger & Intercooler",
                    "parameter": "MAP",
                    "value": f"{map_inhg} inHg" if map_inhg is not None else None,
                    "state": turbo_state,
                    "stress_index": turbo_idx,
                    "color_hex": "#ef4444" if turbo_state == "CRITICAL" else ("#f59e0b" if turbo_state == "WARNING" else "#38bdf8"),
                },
            },
        }

digital_twin_service = DigitalTwinService()

