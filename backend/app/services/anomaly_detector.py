"""
Anomaly Detection & Diagnosis Service
Identifies sensor deviations from aero-engine baseline envelopes.
"""

from typing import List, Dict, Any

INITIAL_ANOMALIES = [
    {
        "id": "ANOM-2026-088",
        "parameter": "Cylinder #3 CHT Thermal Gradient",
        "detectedValue": "194 °C",
        "expectedRange": "165 - 188 °C",
        "deviation": "+6 °C (> 2.8σ)",
        "severity": "Medium",
        "time": "14:26:12 UTC",
        "status": "Active",
        "affectedComponent": "Cylinder Head & Piston Assembly",
        "description": "Localized thermal elevation observed under steady-state cruise at 2,450 RPM. Potential lean mixture or cooling shroud obstruction.",
    },
    {
        "id": "ANOM-2026-089",
        "parameter": "Turbocharger Wastegate Response Lag",
        "detectedValue": "340 ms",
        "expectedRange": "120 - 220 ms",
        "deviation": "+120 ms delay",
        "severity": "High",
        "time": "14:18:40 UTC",
        "status": "Investigating",
        "affectedComponent": "Turbocharger & Wastegate Controller",
        "description": "Transient lag during manifold pressure modulation between 34 and 38 inHg. Possible carbon buildup on wastegate spindle.",
    },
]

class AnomalyDetectionService:
    def __init__(self):
        self.anomalies = list(INITIAL_ANOMALIES)

    def get_all(self) -> List[Dict[str, Any]]:
        return self.anomalies

    def get_by_id(self, anomaly_id: str) -> Dict[str, Any]:
        for a in self.anomalies:
            if a["id"] == anomaly_id:
                return a
        return self.anomalies[0]

    def investigate(self, anomaly_id: str) -> Dict[str, Any]:
        target = self.get_by_id(anomaly_id)
        return {
            "anomaly_id": target["id"],
            "diagnosis": f"Statistical variance confirmed on {target['parameter']}. Baseline envelope exceeded by {target['deviation']}.",
            "recommended_action": "Schedule borescope inspection of wastegate spindle and balance fuel injector flow rate across bank A.",
            "confidence": 0.89,
        }

anomaly_service = AnomalyDetectionService()

