from app.services.digital_twin import digital_twin_service
from app.services.anomaly_detector import anomaly_service
from app.services.predictor import predictor_service
from app.services.mission_service import mission_service

def test_bmep_calculation():
    # 100 HP @ 5000 RPM on 1211.2 cc engine
    bmep = digital_twin_service.calculate_bmep(power_hp=100.0, rpm=5000)
    assert bmep > 10.0 and bmep < 20.0

def test_anomaly_investigate():
    res = anomaly_service.investigate("ANOM-2026-088")
    assert "diagnosis" in res
    assert "recommended_action" in res
    assert res["confidence"] > 0.8

def test_predictor_horizons():
    p6 = predictor_service.get_prediction_overview(6)
    p100 = predictor_service.get_prediction_overview(100)
    assert p6["predictionHorizonHours"] == 6
    assert p100["predictionHorizonHours"] == 100
    # 100h risk is greater than 6h risk
    assert p100["predictedFaults"][0]["probabilityPercent"] >= p6["predictedFaults"][0]["probabilityPercent"]

def test_mission_service():
    missions = mission_service.get_all()
    assert len(missions) > 0
    m = missions[0]
    assert len(m["waypoints"]) >= 5
    assert len(m["timeline"]) >= 5

