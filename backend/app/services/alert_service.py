"""
VYOM MALE UAV - Centralized Alert Engine (Phase 10)
Correlates multi-sensor telemetry, ML anomalies, and RUL predictions into
deduplicated, actionable operator alerts with complete lifecycle auditing.
"""

import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from app.services.notification_service import notification_service

logger = logging.getLogger("vyom.backend.alerts")

class AlertService:
    def __init__(self):
        self._alerts: List[Dict[str, Any]] = []
        self._alert_counter = 105
        self._seed_baseline_alerts()

    def _seed_baseline_alerts(self):
        """Initializes baseline realistic operational alert history."""
        self._alerts = [
            {
                "id": "ALT-2026-104",
                "timestamp": "14:26:12 UTC",
                "severity": "High",
                "title": "Cylinder #3 CHT Elevated Thermal Gradient",
                "source_module": "ENGINE_HEALTH",
                "uav_id": "UAV-ROTAX-001",
                "component": "Cylinder Head & Piston Assembly",
                "relatedComponent": "Cylinder Head & Piston Assembly",
                "parameter": "Cylinder #3 CHT",
                "currentValue": "194 °C",
                "expectedRange": "150 - 188 °C",
                "status": "Active",
                "description": "Cylinder #3 reading 194 °C, exceeding cruise baseline standard deviation limit. Continuous loiter recommended below 2,500 RPM.",
                "sensor_values": {"cht": 194.0, "egt": 635.0, "rpm": 2450},
                "possible_cause": "Cooling duct aerodynamic turbulence or localized coolant passage restriction.",
                "recommended_action": "Reduce RPM below 2,400; maintain airspeed above 35 m/s for maximum convective cooling.",
                "acknowledged": False,
                "acknowledgedBy": None,
                "acknowledgedAt": None,
                "investigatedBy": None,
                "investigatedAt": None,
                "resolvedBy": None,
                "resolvedAt": None,
                "resolutionNotes": None,
                "audit_trail": [
                    {"action": "CREATED", "performed_by": "Engine Health Monitor", "timestamp": "2026-10-31T14:26:12Z", "notes": "Thermal deviation triggered."}
                ],
                "is_escalated": False,
            },
            {
                "id": "ALT-2026-103",
                "timestamp": "14:18:40 UTC",
                "severity": "Critical",
                "title": "Turbocharger Wastegate Actuator Transient Lag",
                "source_module": "PREDICTIVE_MAINTENANCE",
                "uav_id": "UAV-ROTAX-001",
                "component": "Turbocharger & Wastegate Controller",
                "relatedComponent": "Turbocharger & Wastegate Controller",
                "parameter": "Wastegate Position",
                "currentValue": "340 ms lag",
                "expectedRange": "< 220 ms",
                "status": "Acknowledged",
                "description": "Elevated mechanical hysteresis detected during rapid throttle step increase from 65% to 85% thrust power.",
                "sensor_values": {"map": 38.2, "rpm": 2520, "lag_ms": 340},
                "possible_cause": "Wastegate spindle carbon binding or pneumatic servo actuator seal wear.",
                "recommended_action": "Limit rapid throttle transients; inspect linkage per Rotax Chapter 05 upon mission completion.",
                "acknowledged": True,
                "acknowledgedBy": "Omkar Sahu (OS)",
                "acknowledgedAt": "14:20:05 UTC",
                "investigatedBy": None,
                "investigatedAt": None,
                "resolvedBy": None,
                "resolvedAt": None,
                "resolutionNotes": None,
                "audit_trail": [
                    {"action": "CREATED", "performed_by": "Predictive Maintenance Service", "timestamp": "2026-10-31T14:18:40Z", "notes": "Actuator response lag detected."},
                    {"action": "ACKNOWLEDGED", "performed_by": "Omkar Sahu (OS)", "timestamp": "2026-10-31T14:20:05Z", "notes": "Throttle limits acknowledged."}
                ],
                "is_escalated": False,
            },
            {
                "id": "ALT-2026-098",
                "timestamp": "13:45:00 UTC",
                "severity": "Informational",
                "title": "Dry Sump Thermostatic Bypass Valve Cycle Normal",
                "source_module": "ENGINE_HEALTH",
                "uav_id": "UAV-ROTAX-001",
                "component": "Dry Sump Lubrication & Oil Cooler",
                "relatedComponent": "Dry Sump Lubrication & Oil Cooler",
                "parameter": "Oil Temp Transition",
                "currentValue": "96 °C",
                "expectedRange": "90 - 110 °C",
                "status": "Resolved",
                "description": "Oil circuit transitioned from warm-up recirculation to full external oil cooler flow at 92 °C.",
                "sensor_values": {"oil_temp": 96.0, "oil_pressure": 4.2},
                "possible_cause": "Normal thermostatic expansion wax pellet actuation.",
                "recommended_action": "No operator action required. Routine thermal cycle logged.",
                "acknowledged": True,
                "acknowledgedBy": "Omkar Sahu (OS)",
                "acknowledgedAt": "13:46:12 UTC",
                "investigatedBy": "Omkar Sahu (OS)",
                "investigatedAt": "13:47:00 UTC",
                "resolvedBy": "Omkar Sahu (OS)",
                "resolvedAt": "13:48:30 UTC",
                "resolutionNotes": "Verified nominal oil pressure retention of 4.2 bar through entire valve modulation cycle.",
                "audit_trail": [
                    {"action": "CREATED", "performed_by": "Thermal Sensor System", "timestamp": "2026-10-31T13:45:00Z", "notes": "Valve cycle event."},
                    {"action": "RESOLVED", "performed_by": "Omkar Sahu (OS)", "timestamp": "2026-10-31T13:48:30Z", "notes": "Verified oil pressure nominal."}
                ],
                "is_escalated": False,
            },
        ]

    # =========================================================================
    # INGESTION & INTELLIGENT CORRELATION
    # =========================================================================
    def evaluate_telemetry_snapshot(
        self,
        snapshot: Dict[str, Any],
        operating_mode: str = "DEMO",
    ) -> List[Dict[str, Any]]:
        """
        Evaluates real-time telemetry snapshot and ML predictions.
        Correlates multi-sensor deviations and deduplicates active alerts.
        """
        # REPLAY Mode is strictly read-only: never creates operational alerts
        if operating_mode == "REPLAY":
            return []

        uav_id = snapshot.get("uav_id", "UAV-ROTAX-001")
        now_utc = datetime.now(timezone.utc).strftime("%H:%M:%S UTC")
        now_iso = datetime.now(timezone.utc).isoformat()
        new_alerts = []

        # 1. Datalink Loss Check (Highest Priority)
        critical_sensors = ["rpm", "cht", "egt", "oilPressure", "vibrationRMS"]
        null_sensors = [s for s in critical_sensors if snapshot.get(s) is None or snapshot.get(s) == 0]
        if len(null_sensors) >= 3 and operating_mode == "LIVE":
            alert = self._create_or_update_alert(
                uav_id=uav_id,
                component="Avionics & Telemetry Sensor Suite",
                source_module="DATALINK",
                severity="Critical",
                title="GCS Datalink Blackout / Telemetry Stream Interruption",
                description=f"Simultaneous signal loss detected on {len(null_sensors)} critical propulsion transducers. Operating in autonomous failsafe.",
                parameter="Datalink Quality",
                current_value="0 Hz (Disconnected)",
                expected_range="1.0 Hz (Connected)",
                possible_cause="Ground antenna tracking misorientation, RF line-of-sight blockage, or UAV radio harness failure.",
                recommended_action="Execute emergency GCS radio frequency recalibration and verify autonomous return-to-base (RTB) flight plan.",
                sensor_values={"null_sensors": null_sensors},
                now_utc=now_utc,
                now_iso=now_iso,
            )
            if alert:
                new_alerts.append(alert)
            return new_alerts

        # 2. Correlated Thermal Stress (CHT + EGT)
        cht = float(snapshot.get("cht") or 0.0)
        egt = float(snapshot.get("egt") or 0.0)
        if cht >= 195.0 or egt >= 660.0:
            sev = "Critical" if (cht >= 205.0 or egt >= 680.0) else "High"
            alert = self._create_or_update_alert(
                uav_id=uav_id,
                component="Cylinder Head & Piston Assembly",
                source_module="ENGINE_HEALTH",
                severity=sev,
                title="Engine Cylinder Thermal Stress Excursion",
                description=f"Correlated thermal overload: CHT measured at {cht:.1f} °C (limit 188 °C), EGT at {egt:.1f} °C (limit 650 °C).",
                parameter="Cylinder Thermal Ratio",
                current_value=f"CHT: {cht:.1f} °C / EGT: {egt:.1f} °C",
                expected_range="CHT < 188 °C, EGT < 650 °C",
                possible_cause="Lean fuel-air mixture, cooling jacket vapor lock, or prolonged maximum continuous throttle operation.",
                recommended_action="Enrich mixture ratio via electronic fuel trim; reduce throttle setting to cruise power (2,400 RPM).",
                sensor_values={"cht": cht, "egt": egt, "rpm": snapshot.get("rpm", 0)},
                now_utc=now_utc,
                now_iso=now_iso,
            )
            if alert:
                new_alerts.append(alert)

        # 3. Correlated Lubrication Deterioration (Oil Pressure + Temp)
        oil_p = float(snapshot.get("oilPressure") or snapshot.get("oil_pressure") or 4.2)
        oil_t = float(snapshot.get("oilTemperature") or snapshot.get("oil_temperature") or 95.0)
        if oil_p <= 2.50 or oil_t >= 110.0:
            sev = "Critical" if oil_p <= 2.10 else "High"
            alert = self._create_or_update_alert(
                uav_id=uav_id,
                component="Dry Sump Lubrication & Oil Cooler",
                source_module="ENGINE_HEALTH",
                severity=sev,
                title="Lubrication Circuit Pressure & Heat Deterioration",
                description=f"Critical lubrication anomaly: Oil pressure decayed to {oil_p:.2f} bar (min 3.0 bar), temperature elevated to {oil_t:.1f} °C.",
                parameter="Oil Hydrodynamic Circuit",
                current_value=f"{oil_p:.2f} bar, {oil_t:.1f} °C",
                expected_range="Pressure: 3.0 - 5.0 bar, Temp: 90 - 105 °C",
                possible_cause="Oil pump relief valve sticking, oil cooler core foreign-object blockage, or main journal bearing clearance fatigue.",
                recommended_action="Execute precautionary descent to cooler ambient altitude; schedule immediate oil sample spectrographic analysis upon landing.",
                sensor_values={"oil_pressure": oil_p, "oil_temperature": oil_t},
                now_utc=now_utc,
                now_iso=now_iso,
            )
            if alert:
                new_alerts.append(alert)

        # 4. Mechanical Vibration Excursion
        vib = float(snapshot.get("vibrationRMS") or snapshot.get("vibration_rms") or 0.28)
        if vib >= 0.45:
            sev = "Critical" if vib >= 0.60 else "High"
            alert = self._create_or_update_alert(
                uav_id=uav_id,
                component="Crankshaft & Reduction Gearbox",
                source_module="ENGINE_HEALTH",
                severity=sev,
                title="Mechanical Vibration Harmonics Excursion",
                description=f"Broadband mechanical vibration amplitude measured at {vib:.2f} g, exceeding standard ISO aero-piston threshold of 0.45 g.",
                parameter="Vibration RMS",
                current_value=f"{vib:.2f} g",
                expected_range="< 0.35 g Nominal",
                possible_cause="Propeller pitch imbalance, dog-gear drive wear, or crankshaft connecting rod bearing micro-pitting.",
                recommended_action="Avoid resonant RPM bands (2,200 - 2,350 RPM); dispatch harmonic vibration spectrum audit.",
                sensor_values={"vibrationRMS": vib, "rpm": snapshot.get("rpm", 0)},
                now_utc=now_utc,
                now_iso=now_iso,
            )
            if alert:
                new_alerts.append(alert)

        # 5. ML Anomaly Detection Service Integration (Phase 8)
        if snapshot.get("is_anomaly") and snapshot.get("anomaly_severity") in ["High", "Critical"]:
            affected = snapshot.get("affected_parameters", [])
            primary_comp = snapshot.get("primary_component", "Rotax 914 F Core Subsystem")
            alert = self._create_or_update_alert(
                uav_id=uav_id,
                component=primary_comp,
                source_module="ML_ANOMALY",
                severity="High",
                title=f"Isolation Forest Multi-Feature Anomaly ({primary_comp.split()[0]})",
                description=f"Machine learning anomaly detector identified statistically significant deviation on {', '.join(affected)} (Score: {snapshot.get('anomaly_score', 0):.2f}).",
                parameter="Multivariate Anomaly Score",
                current_value=f"Score: {snapshot.get('anomaly_score', 0):.2f}",
                expected_range="Score < 0.47 Nominal",
                possible_cause="Non-linear divergence between thermodynamic parameters across transient flight regime.",
                recommended_action="Review real-time Anomaly Detection dashboard and execute harmonic diagnostic investigation.",
                sensor_values={"anomaly_score": snapshot.get("anomaly_score")},
                now_utc=now_utc,
                now_iso=now_iso,
            )
            if alert:
                new_alerts.append(alert)

        # 6. Predictive Maintenance & RUL Exhaustion (Phase 9)
        rul_h = snapshot.get("estimated_rul_hours")
        if rul_h is not None and rul_h <= 100.0:
            sev = "Critical" if rul_h <= 50.0 else "High"
            alert = self._create_or_update_alert(
                uav_id=uav_id,
                component="Rotax 914 F Core Subsystem",
                source_module="PREDICTIVE_MAINTENANCE",
                severity=sev,
                title="Impending TBO Component Overhaul Threshold",
                description=f"Ensemble RUL model projects remaining useful operating life at {rul_h:.1f} hours, approaching mandatory overhaul limit.",
                parameter="Remaining Useful Life",
                current_value=f"{rul_h:.1f} flight hours",
                expected_range="> 500 hours",
                possible_cause="Cumulative thermal and mechanical fatigue nearing certified 2,000-hour Time Between Overhaul.",
                recommended_action="Plan depot-level engine removal and overhaul; ground UAV upon completion of current sortie.",
                sensor_values={"rul_hours": rul_h},
                now_utc=now_utc,
                now_iso=now_iso,
            )
            if alert:
                new_alerts.append(alert)

        return new_alerts

    def _create_or_update_alert(
        self,
        uav_id: str,
        component: str,
        source_module: str,
        severity: str,
        title: str,
        description: str,
        parameter: str,
        current_value: str,
        expected_range: str,
        possible_cause: str,
        recommended_action: str,
        sensor_values: Dict[str, Any],
        now_utc: str,
        now_iso: str,
    ) -> Optional[Dict[str, Any]]:
        """Deduplicates against active alerts for the same component & title."""
        # Check if an unresolved active alert already exists
        for existing in self._alerts:
            if (
                existing["uav_id"] == uav_id
                and existing["component"] == component
                and existing["title"] == title
                and existing["status"] in ["Active", "NEW", "ACKNOWLEDGED", "INVESTIGATING"]
            ):
                # Update existing alert readings in-place without generating a duplicate
                existing["currentValue"] = current_value
                existing["sensor_values"] = sensor_values
                existing["timestamp"] = now_utc
                return None  # Deduplicated

        # Create new unique alert
        alert_id = f"ALT-2026-{self._alert_counter}"
        self._alert_counter += 1

        new_alert = {
            "id": alert_id,
            "timestamp": now_utc,
            "severity": severity,
            "title": title,
            "source_module": source_module,
            "uav_id": uav_id,
            "component": component,
            "relatedComponent": component,
            "parameter": parameter,
            "currentValue": current_value,
            "expectedRange": expected_range,
            "status": "Active",
            "description": description,
            "sensor_values": sensor_values,
            "possible_cause": possible_cause,
            "recommended_action": recommended_action,
            "acknowledged": False,
            "acknowledgedBy": None,
            "acknowledgedAt": None,
            "investigatedBy": None,
            "investigatedAt": None,
            "resolvedBy": None,
            "resolvedAt": None,
            "resolutionNotes": None,
            "audit_trail": [
                {
                    "action": "CREATED",
                    "performed_by": f"VYOM {source_module.replace('_', ' ').title()}",
                    "timestamp": now_iso,
                    "notes": f"Initial {severity} alarm triggered.",
                }
            ],
            "is_escalated": False,
        }

        self._alerts.insert(0, new_alert)
        if len(self._alerts) > 150:
            self._alerts.pop()

        # Enqueue in real-time notification queue
        notification_service.enqueue_notification(new_alert)
        return new_alert

    # =========================================================================
    # QUERY & LIFECYCLE API
    # =========================================================================
    def get_all(
        self,
        uav_id: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        component: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieves alerts with multi-dimensional filtering."""
        res = list(self._alerts)
        if uav_id:
            res = [a for a in res if a.get("uav_id") == uav_id]
        if severity and severity != "All":
            res = [a for a in res if a.get("severity", "").lower() == severity.lower()]
        if status and status != "All":
            if status == "Active":
                res = [a for a in res if a.get("status") in ["Active", "NEW", "ACKNOWLEDGED", "INVESTIGATING"]]
            else:
                res = [a for a in res if a.get("status", "").lower() == status.lower()]
        if component and component != "All":
            res = [a for a in res if a.get("component") == component or a.get("relatedComponent") == component]
        if search:
            q = search.lower()
            res = [
                a for a in res
                if q in a.get("title", "").lower()
                or q in a.get("id", "").lower()
                or q in a.get("component", "").lower()
                or q in a.get("description", "").lower()
            ]
        return res

    def get_by_id(self, alert_id: str) -> Optional[Dict[str, Any]]:
        for a in self._alerts:
            if a["id"] == alert_id:
                return a
        return None

    def get_summary(self, uav_id: Optional[str] = None) -> Dict[str, Any]:
        """Provides executive counts for operator KPI dashboard."""
        alerts = self.get_all(uav_id=uav_id)
        total = len(alerts)
        active = sum(1 for a in alerts if a.get("status") in ["Active", "NEW", "ACKNOWLEDGED", "INVESTIGATING"])
        crit = sum(1 for a in alerts if a.get("severity", "").lower() == "critical")
        high = sum(1 for a in alerts if a.get("severity", "").lower() in ["high", "warning"])
        med = sum(1 for a in alerts if a.get("severity", "").lower() == "medium")
        low = sum(1 for a in alerts if a.get("severity", "").lower() == "low")
        info = sum(1 for a in alerts if a.get("severity", "").lower() in ["informational", "info"])
        ack = sum(1 for a in alerts if a.get("status") == "Acknowledged")
        inv = sum(1 for a in alerts if a.get("status") == "Investigating")
        res = sum(1 for a in alerts if a.get("status") == "Resolved")
        dis = sum(1 for a in alerts if a.get("status") == "Dismissed")

        last_time = alerts[0]["timestamp"] if alerts else None

        return {
            "total_alerts": total,
            "active_unresolved": active,
            "critical_count": crit,
            "high_count": high,
            "medium_count": med,
            "low_count": low,
            "info_count": info,
            "acknowledged_count": ack,
            "investigating_count": inv,
            "resolved_count": res,
            "dismissed_count": dis,
            "last_alert_time": last_time,
        }

    def acknowledge(self, alert_id: str, operator_name: str) -> Optional[Dict[str, Any]]:
        alert = self.get_by_id(alert_id)
        if not alert:
            return None
        now_utc = datetime.now(timezone.utc).strftime("%H:%M:%S UTC")
        now_iso = datetime.now(timezone.utc).isoformat()
        
        alert["status"] = "Acknowledged"
        alert["acknowledged"] = True
        alert["acknowledgedBy"] = operator_name
        alert["acknowledgedAt"] = now_utc
        alert["audit_trail"].append({
            "action": "ACKNOWLEDGED",
            "performed_by": operator_name,
            "timestamp": now_iso,
            "notes": f"Alert acknowledged by {operator_name} on GCS.",
        })
        logger.info(f"Alert {alert_id} acknowledged by {operator_name}")
        return alert

    def investigate(self, alert_id: str, operator_name: str, notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
        alert = self.get_by_id(alert_id)
        if not alert:
            return None
        now_utc = datetime.now(timezone.utc).strftime("%H:%M:%S UTC")
        now_iso = datetime.now(timezone.utc).isoformat()

        alert["status"] = "Investigating"
        alert["investigatedBy"] = operator_name
        alert["investigatedAt"] = now_utc
        alert["audit_trail"].append({
            "action": "INVESTIGATING",
            "performed_by": operator_name,
            "timestamp": now_iso,
            "notes": notes or "Diagnostic investigation initiated.",
        })
        logger.info(f"Alert {alert_id} placed under investigation by {operator_name}")
        return alert

    def resolve(self, alert_id: str, operator_name: str, resolution_notes: str) -> Optional[Dict[str, Any]]:
        alert = self.get_by_id(alert_id)
        if not alert:
            return None
        now_utc = datetime.now(timezone.utc).strftime("%H:%M:%S UTC")
        now_iso = datetime.now(timezone.utc).isoformat()

        alert["status"] = "Resolved"
        alert["resolvedBy"] = operator_name
        alert["resolvedAt"] = now_utc
        alert["resolutionNotes"] = resolution_notes
        alert["audit_trail"].append({
            "action": "RESOLVED",
            "performed_by": operator_name,
            "timestamp": now_iso,
            "notes": resolution_notes,
        })
        logger.info(f"Alert {alert_id} resolved by {operator_name}")
        return alert

    def dismiss(self, alert_id: str, operator_name: str, reason: Optional[str] = None) -> Optional[Dict[str, Any]]:
        alert = self.get_by_id(alert_id)
        if not alert:
            return None
        # Safety rule: Critical & High severity alarms cannot be dismissed without resolution
        if alert.get("severity") in ["Critical", "CRITICAL", "High", "HIGH"]:
            return None

        now_utc = datetime.now(timezone.utc).strftime("%H:%M:%S UTC")
        now_iso = datetime.now(timezone.utc).isoformat()

        alert["status"] = "Dismissed"
        alert["audit_trail"].append({
            "action": "DISMISSED",
            "performed_by": operator_name,
            "timestamp": now_iso,
            "notes": reason or "Dismissed by operator.",
        })
        logger.info(f"Alert {alert_id} dismissed by {operator_name}")
        return alert

    def get_history(self, uav_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns flattened audit trail across all alerts."""
        alerts = self.get_all(uav_id=uav_id)
        history = []
        for a in alerts:
            for trail in a.get("audit_trail", []):
                history.append({
                    "alert_id": a["id"],
                    "alert_title": a["title"],
                    "severity": a["severity"],
                    "uav_id": a.get("uav_id", "UAV-ROTAX-001"),
                    "action": trail.get("action"),
                    "performed_by": trail.get("performed_by"),
                    "timestamp": trail.get("timestamp"),
                    "notes": trail.get("notes"),
                })
        return history

alert_service = AlertService()

