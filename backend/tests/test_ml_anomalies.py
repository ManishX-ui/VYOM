"""
Machine Learning Anomaly Detection Service Tests - Phase 8
Validates Isolation Forest inference, feature engineering, API endpoints, and mode isolation.
"""

import pytest
from app.services.anomaly_service import anomaly_service
from app.api.v1.endpoints import anomalies
from app.schemas.anomaly import (
    AnomalyDetectRequest,
    AnomalyDetectResponse,
    ModelInfoResponse,
    AnomalyInvestigateResponse,
)

def test_ml_model_artifacts_loaded():
    """Verify that Isolation Forest model, scaler, and metadata are loaded."""
    info = anomaly_service.get_model_info()
    assert info["is_loaded"] is True
    assert "IsolationForest" in info["algorithm"]
    assert info["features_count"] == 13
    assert len(info["monitored_features"]) == 8
    assert len(info["engineered_features"]) == 5
    assert info["training_samples"] >= 2500
    assert "precision" in info["evaluation_metrics"]

def test_inference_nominal_telemetry():
    """Verify that normal telemetry scores well below anomaly threshold."""
    nominal_packet = {
        "rpm": 2450.0,
        "cht": 182.0,
        "egt": 622.0,
        "oilPressure": 4.25,
        "oilTemperature": 94.0,
        "fuelFlow": 12.4,
        "vibrationRMS": 0.24,
        "manifoldPressureInHg": 31.0,
        "uav_id": "UAV-ROTAX-001",
        "operating_mode": "DEMO",
    }
    result = anomaly_service.detect(nominal_packet)
    assert result["is_anomaly"] is False
    assert result["severity"] in ["Normal", "Low"]
    assert result["anomaly_score"] < 0.60
    assert result["data_quality"] == "NOMINAL"

def test_inference_thermal_runaway():
    """Verify detection and attribution of CHT thermal runaway."""
    overheat_packet = {
        "rpm": 2550.0,
        "cht": 218.0,  # Critical overheat (> 200°C limit)
        "egt": 710.0,
        "oilPressure": 4.10,
        "oilTemperature": 108.0,
        "fuelFlow": 15.5,
        "vibrationRMS": 0.29,
        "manifoldPressureInHg": 34.0,
        "uav_id": "UAV-ROTAX-001",
        "operating_mode": "DEMO",
    }
    result = anomaly_service.detect(overheat_packet)
    assert result["is_anomaly"] is True
    assert result["severity"] in ["Medium", "High"]
    assert result["anomaly_score"] >= 0.60
    assert "cht" in result["affected_parameters"] or result["primary_parameter"] == "cht"

def test_inference_severe_vibration():
    """Verify detection and attribution of high mechanical vibration."""
    vib_packet = {
        "rpm": 2480.0,
        "cht": 184.0,
        "egt": 625.0,
        "oilPressure": 4.20,
        "oilTemperature": 95.0,
        "fuelFlow": 12.8,
        "vibrationRMS": 0.68,  # Critical vibration (> 0.45 g limit)
        "manifoldPressureInHg": 31.2,
        "uav_id": "UAV-ROTAX-001",
        "operating_mode": "DEMO",
    }
    result = anomaly_service.detect(vib_packet)
    assert result["is_anomaly"] is True
    assert result["anomaly_score"] >= 0.50
    assert "vibrationRMS" in result["affected_parameters"] or result["primary_parameter"] == "vibrationRMS"

def test_inference_oil_pressure_loss():
    """Verify detection and attribution of oil pressure drop."""
    oil_drop_packet = {
        "rpm": 2450.0,
        "cht": 188.0,
        "egt": 628.0,
        "oilPressure": 2.10,  # Severe drop (< 3.0 bar limit)
        "oilTemperature": 112.0,
        "fuelFlow": 12.5,
        "vibrationRMS": 0.35,
        "manifoldPressureInHg": 31.0,
        "uav_id": "UAV-ROTAX-001",
        "operating_mode": "DEMO",
    }
    result = anomaly_service.detect(oil_drop_packet)
    assert result["is_anomaly"] is True
    assert "oilPressure" in result["affected_parameters"] or result["primary_parameter"] == "oilPressure"

def test_missing_sensors_datalink_blackout():
    """Verify that multiple missing/null sensors are classified as DISCONNECTED, not engine failure."""
    blackout_packet = {
        "rpm": 2450.0,
        "cht": None,
        "egt": None,
        "oilPressure": None,
        "oilTemperature": None,
        "fuelFlow": None,
        "vibrationRMS": None,
        "manifoldPressureInHg": None,
        "uav_id": "UAV-ROTAX-001",
        "operating_mode": "LIVE",
    }
    result = anomaly_service.detect(blackout_packet)
    # Must NOT report mechanical engine failure for missing datalink
    assert result["data_quality"] == "DISCONNECTED"
    assert result["is_anomaly"] is False
    assert len(result["affected_parameters"]) >= 4

def test_replay_mode_read_only_no_duplicate_records():
    """Verify that REPLAY mode inference is read-only and prevents duplicate anomaly logging."""
    initial_log_count = len(anomaly_service.get_all())
    replay_packet = {
        "rpm": 2550.0,
        "cht": 215.0,  # Anomalous reading during historical replay
        "egt": 700.0,
        "oilPressure": 4.10,
        "oilTemperature": 105.0,
        "fuelFlow": 15.0,
        "vibrationRMS": 0.28,
        "manifoldPressureInHg": 33.0,
        "uav_id": "UAV-ROTAX-001",
        "mission_id": "Surveillance_2026_10_23_01",
        "operating_mode": "REPLAY",
    }
    # Run multiple times to simulate operator scrubber scrubbing
    res1 = anomaly_service.detect(replay_packet, operating_mode="REPLAY")
    res2 = anomaly_service.detect(replay_packet, operating_mode="REPLAY")
    assert res1["is_anomaly"] is True
    assert res2["is_anomaly"] is True

    # Operational anomaly log count must NOT increase in REPLAY mode
    final_log_count = len(anomaly_service.get_all())
    assert final_log_count == initial_log_count

def test_anomalies_api_endpoints():
    """Verify REST API endpoints for anomalies."""
    # 1. Detect endpoint
    req = AnomalyDetectRequest(
        rpm=2450.0,
        cht=180.0,
        egt=620.0,
        oilPressure=4.25,
        oilTemperature=95.0,
        fuelFlow=12.2,
        vibrationRMS=0.25,
        manifoldPressureInHg=31.0,
    )
    raw_detect = anomalies.detect_anomaly(req)
    detect_res = AnomalyDetectResponse(**raw_detect) if isinstance(raw_detect, dict) else raw_detect
    assert detect_res.is_anomaly is False
    assert detect_res.model_version == "v1.2.0-isoforest-rotax"

    # 2. Model info endpoint
    raw_info = anomalies.get_model_info()
    model_info = ModelInfoResponse(**raw_info) if isinstance(raw_info, dict) else raw_info
    assert model_info.is_loaded is True
    assert model_info.algorithm == "IsolationForest"

    # 3. List anomalies
    all_anoms = anomalies.list_anomalies()
    assert len(all_anoms) >= 2

    # 4. Investigate anomaly
    first_id = all_anoms[0]["id"]
    raw_inv = anomalies.investigate_anomaly(first_id)
    inv = AnomalyInvestigateResponse(**raw_inv) if isinstance(raw_inv, dict) else raw_inv
    assert inv.anomaly_id == first_id
    assert inv.confidence > 0.80
