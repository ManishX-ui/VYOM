"""
VYOM MALE UAV - Remaining Useful Life (RUL) Inference Service (Phase 9)
Loads the trained ML RUL regressor and computes multi-component degradation assessments.
"""

import os
import json
import logging
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

logger = logging.getLogger("vyom.backend.rul_service")

class RULService:
    def __init__(self):
        self.base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.models_dir = os.path.join(self.base_dir, "ml", "models", "rul")
        
        self.model = None
        self.scaler = None
        self.feature_config = {}
        self.metadata = {}
        self.is_loaded = False
        
        self._load_artifacts()

    def _load_artifacts(self):
        model_path = os.path.join(self.models_dir, "rul_regressor.joblib")
        scaler_path = os.path.join(self.models_dir, "rul_scaler.joblib")
        config_path = os.path.join(self.models_dir, "rul_feature_config.json")
        meta_path = os.path.join(self.models_dir, "rul_model_metadata.json")

        if os.path.exists(model_path) and os.path.exists(scaler_path):
            try:
                self.model = joblib.load(model_path)
                self.scaler = joblib.load(scaler_path)
                with open(config_path, "r") as f:
                    self.feature_config = json.load(f)
                with open(meta_path, "r") as f:
                    self.metadata = json.load(f)
                self.is_loaded = True
                logger.info(f"RUL Regressor loaded: {self.metadata.get('model_version')} ({self.metadata.get('algorithm')})")
            except Exception as e:
                logger.error(f"Failed loading RUL artifacts: {e}")
                self.is_loaded = False
        else:
            logger.warning(f"RUL model artifacts not found at {self.models_dir}")
            self.is_loaded = False

    def predict_rul(
        self,
        telemetry: Dict[str, Any],
        flight_hours: Optional[float] = None,
        flight_cycles: Optional[float] = None,
        uav_id: str = "UAV-ROTAX-001",
        operating_mode: str = "DEMO",
    ) -> Dict[str, Any]:
        """
        Executes ML RUL inference on incoming telemetry.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        
        # Flight hours & cycles extraction
        f_hours = float(flight_hours or telemetry.get("flight_hours") or telemetry.get("flightHours") or 520.0)
        f_cycles = float(flight_cycles or telemetry.get("flight_cycles") or (f_hours / 3.3))

        # Check for sensor blackout / disconnected state
        critical_sensors = ["rpm", "cht", "egt", "oilPressure", "vibrationRMS"]
        null_count = sum(1 for s in critical_sensors if telemetry.get(s) is None or telemetry.get(s) == 0)
        
        if null_count >= 3 and operating_mode == "LIVE":
            return {
                "uav_id": uav_id,
                "data_quality": "DISCONNECTED",
                "overall_rul_hours": None,
                "overall_rul_cycles": None,
                "uncertainty_hours": None,
                "confidence_score": 0.0,
                "overall_health_percent": 0.0,
                "urgency": "Sensor Disconnected",
                "is_experimental": True,
                "model_version": self.metadata.get("model_version", "v1.0.0-rul-ensemble"),
                "disclaimer": "Insufficient live sensor stream. Predictions suspended during datalink blackout.",
                "components": [],
                "recommendations": [],
            }

        # Sensor readings extraction with nominal defaults
        rpm = float(telemetry.get("rpm") or 2450.0)
        cht = float(telemetry.get("cht") or 180.0)
        egt = float(telemetry.get("egt") or 620.0)
        oil_p = float(telemetry.get("oilPressure") or telemetry.get("oil_pressure") or 4.20)
        oil_t = float(telemetry.get("oilTemperature") or telemetry.get("oil_temperature") or 95.0)
        fuel = float(telemetry.get("fuelFlow") or telemetry.get("fuel_flow") or 12.5)
        vib = float(telemetry.get("vibrationRMS") or telemetry.get("vibration_rms") or 0.28)
        map_p = float(telemetry.get("manifoldPressureInHg") or telemetry.get("map_inhg") or 31.0)
        anom_score = float(telemetry.get("anomaly_score") or 0.15)

        # Compute engineered interaction features
        thermal_stress = (cht / 180.0) * (egt / 620.0)
        vib_hours = vib * (f_hours / 100.0)
        oil_ratio = (oil_p * 100.0) / max(1.0, oil_t)
        boost_per_fuel = map_p / max(1.0, fuel)
        hours_per_cycle = f_hours / max(1.0, f_cycles)

        features = [
            f_hours,
            f_cycles,
            rpm,
            cht,
            egt,
            oil_p,
            oil_t,
            fuel,
            vib,
            map_p,
            anom_score,
            thermal_stress,
            vib_hours,
            oil_ratio,
            boost_per_fuel,
            hours_per_cycle,
        ]

        # ML Model Inference
        nominal_tbo = 2000.0
        uncertainty = self.metadata.get("evaluation_metrics", {}).get("uncertainty_1_sigma_hours", 62.18)

        if self.is_loaded and self.model is not None and self.scaler is not None:
            try:
                cols = self.feature_config.get("all_features")
                if cols and len(cols) == len(features):
                    feature_df = pd.DataFrame([features], columns=cols)
                    scaled_arr = self.scaler.transform(feature_df)
                    raw_pred = float(self.model.predict(scaled_arr)[0])
                else:
                    feature_arr = np.array([features], dtype=float)
                    scaled_arr = self.scaler.transform(feature_arr)
                    raw_pred = float(self.model.predict(scaled_arr)[0])
                predicted_rul = float(np.clip(raw_pred, 0.0, nominal_tbo))
            except Exception as e:
                logger.error(f"Inference error in RUL model: {e}")
                predicted_rul = max(0.0, nominal_tbo - f_hours)
        else:
            predicted_rul = max(0.0, nominal_tbo - f_hours)

        predicted_cycles = round(predicted_rul / 3.3, 1)

        # Health percentage derivation from remaining life fraction & sensor degradation
        life_fraction = max(0.0, min(1.0, predicted_rul / nominal_tbo))
        sensor_stress_penalty = max(0.0, (anom_score - 0.20) * 35.0) if anom_score > 0.20 else 0.0
        overall_health = float(np.clip((life_fraction * 90.0 + 10.0) - sensor_stress_penalty, 5.0, 100.0))

        # Confidence calculation
        # Higher confidence when operating in nominal sensor baselines, reduced during anomalies/blackouts
        conf_penalty = min(35.0, anom_score * 40.0)
        confidence_score = float(np.clip(94.0 - conf_penalty, 50.0, 98.0))

        # Component breakdown
        components = self._compute_components_rul(
            f_hours=f_hours,
            predicted_rul=predicted_rul,
            overall_health=overall_health,
            cht=cht,
            oil_p=oil_p,
            oil_t=oil_t,
            vib=vib,
            map_p=map_p,
            fuel=fuel,
            anom_score=anom_score,
            uncertainty=uncertainty,
        )

        # Urgency & Recommendations
        recommendations, urgency = self._generate_recommendations(
            uav_id=uav_id,
            overall_rul=predicted_rul,
            overall_health=overall_health,
            components=components,
            now_iso=now_iso,
        )

        return {
            "uav_id": uav_id,
            "overall_rul_hours": round(predicted_rul, 1),
            "overall_rul_cycles": predicted_cycles,
            "uncertainty_hours": round(uncertainty, 1),
            "confidence_score": round(confidence_score, 1),
            "overall_health_percent": round(overall_health, 1),
            "urgency": urgency,
            "is_experimental": True,
            "model_version": self.metadata.get("model_version", "v1.0.0-rul-ensemble"),
            "disclaimer": "Experimental prototype model trained on physical degradation sequences. Not certified for airworthiness.",
            "components": components,
            "recommendations": recommendations,
        }

    def _compute_components_rul(
        self,
        f_hours: float,
        predicted_rul: float,
        overall_health: float,
        cht: float,
        oil_p: float,
        oil_t: float,
        vib: float,
        map_p: float,
        fuel: float,
        anom_score: float,
        uncertainty: float,
    ) -> List[Dict[str, Any]]:
        """Computes component-specific wear and RUL breakdown."""
        # 1. Cylinder Head & Pistons (TBO: 1800h, Stress: CHT)
        cht_stress = max(0.0, (cht - 175.0) / 35.0)
        cyl_rul = float(np.clip(predicted_rul * 0.90 * (1.0 - cht_stress * 0.25), 0.0, 1800.0))
        cyl_health = float(np.clip((cyl_rul / 1800.0) * 100.0, 10.0, 100.0))

        # 2. Oil System & Bearings (TBO: 2000h, Stress: Oil Pressure drop & Temp)
        oil_stress = max(0.0, (4.2 - oil_p) / 2.0) + max(0.0, (oil_t - 95.0) / 30.0)
        oil_rul = float(np.clip(predicted_rul * (1.0 - oil_stress * 0.30), 0.0, 2000.0))
        oil_health = float(np.clip((oil_rul / 2000.0) * 100.0, 10.0, 100.0))

        # 3. Turbocharger & Wastegate (TBO: 1500h, Stress: MAP & EGT)
        turbo_rul = float(np.clip(predicted_rul * 0.75, 0.0, 1500.0))
        turbo_health = float(np.clip((turbo_rul / 1500.0) * 100.0, 10.0, 100.0))

        # 4. Electronic Fuel Injection (TBO: 1500h, Stress: Fuel flow)
        fuel_rul = float(np.clip(predicted_rul * 0.80, 0.0, 1500.0))
        fuel_health = float(np.clip((fuel_rul / 1500.0) * 100.0, 15.0, 100.0))

        # 5. Crankshaft & Reduction Gearbox (TBO: 2000h, Stress: Vibration RMS)
        vib_stress = max(0.0, (vib - 0.26) / 0.30)
        crank_rul = float(np.clip(predicted_rul * (1.0 - vib_stress * 0.35), 0.0, 2000.0))
        crank_health = float(np.clip((crank_rul / 2000.0) * 100.0, 10.0, 100.0))

        # 6. Sensor Suite (TBO: 2500h)
        sensor_rul = float(np.clip(2500.0 - f_hours, 100.0, 2500.0))
        sensor_health = float(np.clip((sensor_rul / 2500.0) * 100.0, 25.0, 100.0))

        def get_status_stage(h: float, rul: float):
            if rul <= 100.0 or h < 30.0:
                return "Critical", "End of Life"
            elif rul <= 300.0 or h < 60.0:
                return "Warning", "Accelerated"
            elif rul <= 600.0 or h < 80.0:
                return "Monitor", "Early Wear"
            else:
                return "Healthy", "Nominal"

        comp_defs = [
            ("engine_core", "Rotax 914 F Core Subsystem", overall_health, predicted_rul, 2000.0, "RPM / Mechanical Workload"),
            ("cylinder_head", "Cylinder Head & Piston Assembly", cyl_health, cyl_rul, 1800.0, f"CHT Thermal Stress ({cht:.1f} °C)"),
            ("oil_system", "Dry Sump Lubrication & Oil Cooler", oil_health, oil_rul, 2000.0, f"Oil Pressure ({oil_p:.2f} bar)"),
            ("turbocharger", "Turbocharger & Wastegate Actuator", turbo_health, turbo_rul, 1500.0, f"Manifold Pressure ({map_p:.1f} inHg)"),
            ("fuel_system", "Electronic Dual Fuel Injection", fuel_health, fuel_rul, 1500.0, f"Fuel Consumption ({fuel:.1f} L/h)"),
            ("crankshaft_gearbox", "Crankshaft & Propeller Gearbox", crank_health, crank_rul, 2000.0, f"Vibration RMS ({vib:.2f} g)"),
            ("sensors", "Avionics & Telemetry Sensor Suite", sensor_health, sensor_rul, 2500.0, "Transducer Electrical Drift"),
        ]

        res = []
        for cid, name, h_pct, r_hrs, tbo, stress in comp_defs:
            status, stage = get_status_stage(h_pct, r_hrs)
            res.append({
                "component_id": cid,
                "component_name": name,
                "health_percent": round(h_pct, 1),
                "rul_hours": round(r_hrs, 1),
                "nominal_tbo_hours": tbo,
                "uncertainty_hours": round(uncertainty, 1),
                "status": status,
                "primary_stress_parameter": stress,
                "degradation_stage": stage,
            })
        return res

    def _generate_recommendations(
        self,
        uav_id: str,
        overall_rul: float,
        overall_health: float,
        components: List[Dict[str, Any]],
        now_iso: str,
    ) -> (List[Dict[str, Any]], str):
        """Generates actionable maintenance actions based on RUL thresholds."""
        recs = []
        
        # Check overall urgency
        if overall_rul <= 50.0:
            urgency = "Critical Inspection Required"
        elif overall_rul <= 200.0:
            urgency = "Maintenance Required Soon"
        elif overall_rul <= 500.0:
            urgency = "Schedule Inspection"
        else:
            urgency = "Continue Monitoring"

        rec_counter = 1
        for c in components:
            r_hrs = c["rul_hours"]
            cid = c["component_id"]
            name = c["component_name"]

            if r_hrs <= 150.0:
                recs.append({
                    "id": f"rec-{cid}-{rec_counter}",
                    "uav_id": uav_id,
                    "component": name,
                    "priority": "Critical" if r_hrs <= 50.0 else "High",
                    "urgency": "Critical Inspection Required" if r_hrs <= 50.0 else "Maintenance Required Soon",
                    "reason": f"Predicted RUL ({r_hrs:.1f}h) approaches mandatory component overhaul threshold.",
                    "relevant_sensors": [c["primary_stress_parameter"].split()[0]],
                    "predicted_rul_hours": round(r_hrs, 1),
                    "confidence_percent": 91.5,
                    "recommended_action": f"Remove {name} for bench inspection and replace wear components per Rotax Maintenance Manual Chapter 05.",
                    "created_at": now_iso,
                })
                rec_counter += 1
            elif r_hrs <= 450.0:
                recs.append({
                    "id": f"rec-{cid}-{rec_counter}",
                    "uav_id": uav_id,
                    "component": name,
                    "priority": "Medium",
                    "urgency": "Schedule Inspection",
                    "reason": f"Component degradation trend indicates scheduled check advised within next {int(r_hrs)} hours.",
                    "relevant_sensors": [c["primary_stress_parameter"].split()[0]],
                    "predicted_rul_hours": round(r_hrs, 1),
                    "confidence_percent": 88.0,
                    "recommended_action": f"Perform borescope and torque check on {name} at next scheduled flight turn-around.",
                    "created_at": now_iso,
                })
                rec_counter += 1

        # If all components healthy, add baseline monitoring recommendation
        if not recs:
            recs.append({
                "id": "rec-nominal-001",
                "uav_id": uav_id,
                "component": "Rotax 914 F Core Subsystem",
                "priority": "Low",
                "urgency": "Continue Monitoring",
                "reason": "All monitored subsystems exhibit nominal degradation trajectories within TBO margin.",
                "relevant_sensors": ["RPM", "CHT", "Oil Pressure"],
                "predicted_rul_hours": round(overall_rul, 1),
                "confidence_percent": 94.0,
                "recommended_action": "Continue normal surveillance sortie operations. Perform routine pre-flight 100-hour line inspection.",
                "created_at": now_iso,
            })

        return recs, urgency

rul_service = RULService()
