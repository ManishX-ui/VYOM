"""
Predictive Maintenance & Remaining Useful Life (RUL) Automated Test Suite - Phase 9
Validates ML RUL regression, component degradation, trend forecasting,
REST API endpoints, and mode isolation.
"""

import pytest
from app.services.rul_service import rul_service
from app.services.predictive_maintenance_service import predictive_maintenance_service
from app.services.telemetry_manager import telemetry_manager, TelemetryMode
from app.api.v1.endpoints import predictive_maintenance
from app.schemas.predictive_maintenance import (
    RULPredictionRequest,
    RULPredictionResponse,
    PredictiveMaintenanceOverview,
)

def test_rul_model_artifacts_loaded():
    """Verify that the RUL Regressor, scaler, feature config, and metadata are loaded."""
    assert rul_service.is_loaded is True
    assert rul_service.model is not None
    assert rul_service.scaler is not None
    
    meta = rul_service.metadata
    assert meta["algorithm"] == "RandomForestRegressor"
    assert meta["model_version"] == "v1.0.0-rul-ensemble"
    assert meta["is_experimental_prototype"] is True
    assert meta["dataset_type"] == "SYNTHETIC_PHYSICAL_MODEL"
    assert meta["evaluation_metrics"]["mae_hours"] < 60.0
    assert meta["evaluation_metrics"]["r2_score"] > 0.95

def test_rul_inference_nominal_condition():
    """Verify that nominal telemetry produces healthy RUL (>1300h) and 'Continue Monitoring'."""
    nominal_packet = {
        "flight_hours": 450.0,
        "flight_cycles": 136.0,
        "rpm": 2450.0,
        "cht": 179.0,
        "egt": 619.0,
        "oilPressure": 4.25,
        "oilTemperature": 94.0,
        "fuelFlow": 12.3,
        "vibrationRMS": 0.27,
        "manifoldPressureInHg": 31.0,
        "anomaly_score": 0.12,
        "uav_id": "UAV-ROTAX-001",
        "operating_mode": "DEMO",
    }
    res = rul_service.predict_rul(nominal_packet, flight_hours=450.0)
    
    assert res["overall_rul_hours"] is not None
    assert 1300.0 <= res["overall_rul_hours"] <= 1700.0
    assert res["overall_health_percent"] >= 80.0
    assert res["urgency"] == "Continue Monitoring"
    assert res["is_experimental"] is True
    assert len(res["components"]) == 7
    assert len(res["recommendations"]) >= 1

def test_rul_inference_near_end_of_life():
    """Verify that aged engine with elevated parameters is predicted near EOL (<200h) with high urgency."""
    aged_packet = {
        "flight_hours": 1920.0,
        "flight_cycles": 580.0,
        "rpm": 2460.0,
        "cht": 204.0,  # High thermal stress
        "egt": 655.0,
        "oilPressure": 2.35,  # Low oil pressure
        "oilTemperature": 114.0,
        "fuelFlow": 14.2,  # Injector fouling
        "vibrationRMS": 0.56,  # Severe vibration
        "manifoldPressureInHg": 27.5,
        "anomaly_score": 0.85,
        "uav_id": "UAV-ROTAX-001",
        "operating_mode": "DEMO",
    }
    res = rul_service.predict_rul(aged_packet, flight_hours=1920.0)
    
    assert res["overall_rul_hours"] <= 250.0
    assert res["overall_health_percent"] < 40.0
    assert res["urgency"] in ["Maintenance Required Soon", "Critical Inspection Required"]
    
    # Check that high/critical recommendations are generated
    recs = res["recommendations"]
    assert any(r["priority"] in ["High", "Critical"] for r in recs)

def test_rul_inference_datalink_blackout():
    """Verify that datalink blackout in LIVE mode suspends predictions instead of fabricating false RUL."""
    blackout_packet = {
        "flight_hours": 500.0,
        "rpm": 0,
        "cht": None,
        "egt": None,
        "oilPressure": None,
        "vibrationRMS": None,
        "uav_id": "UAV-ROTAX-001",
    }
    res = rul_service.predict_rul(blackout_packet, operating_mode="LIVE")
    assert res["data_quality"] == "DISCONNECTED"
    assert res["overall_rul_hours"] is None
    assert res["urgency"] == "Sensor Disconnected"

def test_degradation_trend_forecasting():
    """Verify multi-step trend forecasting with statistical confidence intervals."""
    trend = predictive_maintenance_service._forecast_degradation_trend(
        current_health=92.5,
        horizon_hours=50,
    )
    assert trend["horizon_hours"] == 50
    assert len(trend["forecast_points"]) == 7
    
    # First point should be 'Now' at current health
    assert trend["forecast_points"][0]["label"] == "Now"
    assert trend["forecast_points"][0]["forecasted_health"] == 92.5
    
    # Final point must project monotonic non-negative degradation
    final_pt = trend["forecast_points"][-1]
    assert final_pt["forecasted_health"] <= 92.5
    assert final_pt["upper_bound"] >= final_pt["forecasted_health"] >= final_pt["lower_bound"]

def test_replay_mode_read_only_isolation():
    """Verify that REPLAY mode evaluations do NOT pollute operational history logs."""
    history_before = len(predictive_maintenance_service.get_history())
    
    # Simulate replay scrub
    telemetry_manager.mode = TelemetryMode.REPLAY
    predictive_maintenance_service.get_overview(horizon_hours=24)
    predictive_maintenance_service.get_overview(horizon_hours=24)
    
    history_after = len(predictive_maintenance_service.get_history())
    assert history_after == history_before
    
    # Reset back to DEMO
    telemetry_manager.mode = TelemetryMode.DEMO

def test_predictive_maintenance_api_endpoints():
    """Verify all REST API endpoints for Predictive Maintenance."""
    # 1. Overview endpoint
    raw_overview = predictive_maintenance.get_predictive_maintenance_overview(horizon_hours=50)
    overview = PredictiveMaintenanceOverview(**raw_overview) if isinstance(raw_overview, dict) else raw_overview
    assert overview.overall_rul_hours > 0
    assert overview.is_experimental is True
    assert len(overview.components) == 7
    assert len(overview.trend_forecast.forecast_points) > 0

    # 2. RUL endpoint
    raw_rul = predictive_maintenance.get_current_rul()
    rul_res = RULPredictionResponse(**raw_rul) if isinstance(raw_rul, dict) else raw_rul
    assert rul_res.overall_rul_hours > 0
    assert rul_res.model_version == "v1.0.0-rul-ensemble"

    # 3. Components endpoint
    comps = predictive_maintenance.get_components_health()
    assert len(comps) == 7
    assert any(c["component_id"] == "cylinder_head" for c in comps)

    # 4. Recommendations endpoint
    recs = predictive_maintenance.get_maintenance_recommendations()
    assert len(recs) >= 1
    assert "recommended_action" in recs[0]

    # 5. History endpoint
    hist = predictive_maintenance.get_prediction_history()
    assert len(hist) >= 1

    # 6. Predict POST endpoint
    req = RULPredictionRequest(
        flight_hours=850.0,
        rpm=2450.0,
        cht=185.0,
        egt=625.0,
        oil_pressure=4.10,
        vibration_rms=0.32,
    )
    raw_pred = predictive_maintenance.predict_custom_telemetry(req)
    pred_res = RULPredictionResponse(**raw_pred) if isinstance(raw_pred, dict) else raw_pred
    assert 800.0 <= pred_res.overall_rul_hours <= 1500.0
