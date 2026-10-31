from app.api.v1.endpoints import (
    telemetry,
    digital_twin,
    anomalies,
    predictions,
    missions,
    alerts,
    uav,
    auth,
)
from app.api.v1.api import health_check
from app.schemas.alert import AlertAcknowledgeRequest, AlertResolveRequest
from app.schemas.uav import UAVConfigCreate
from app.schemas.anomaly import AnomalyInvestigateResponse

def test_health():
    res = health_check()
    assert res["status"] == "healthy"
    assert res["version"] == "2.0.0"

def test_live_telemetry():
    data = telemetry.get_live_telemetry()
    assert "rpm" in data
    assert "cht" in data
    assert "oilPressure" in data
    assert data["rpm"] >= 2400

def test_twin_components():
    comps = digital_twin.get_engine_components()
    assert len(comps) >= 5
    assert any(c["id"] == "cyl-assembly" for c in comps)

    detail = digital_twin.get_component_detail("turbo-system")
    assert detail["id"] == "turbo-system"

def test_operating_envelope():
    envelope = digital_twin.get_operating_envelope()
    assert len(envelope) > 0
    assert "rpm" in envelope[0]
    assert "powerHp" in envelope[0]

def test_anomalies_list_and_investigate():
    all_anomalies = anomalies.list_anomalies()
    assert len(all_anomalies) >= 2
    
    first_id = all_anomalies[0]["id"]
    inv = anomalies.investigate_anomaly(first_id)
    assert inv["anomaly_id"] == first_id
    assert "diagnosis" in inv
    assert inv["confidence"] > 0.8

def test_predictions_overview():
    p24 = predictions.get_fault_predictions(24)
    assert p24["overallHealthPercent"] == 92.0
    assert len(p24["predictedFaults"]) > 0
    assert len(p24["componentRUL"]) > 0

def test_alerts_lifecycle():
    all_alerts = alerts.list_alerts()
    assert len(all_alerts) > 0

    target_id = all_alerts[0]["id"]
    ack = alerts.acknowledge_alert(target_id, AlertAcknowledgeRequest(acknowledged_by="Commander Test (CT)"))
    assert ack["status"] == "Acknowledged"
    assert ack["acknowledgedBy"] == "Commander Test (CT)"

    res = alerts.resolve_alert(target_id, AlertResolveRequest(resolution_notes="Resolved in unit test."))
    assert res["status"] == "Resolved"

def test_uav_operations():
    uavs = uav.list_uavs()
    assert len(uavs) >= 3

    new_uav = uav.pair_uav(
        UAVConfigCreate(
            name="TEST-UAV-UNIT",
            deviceId="UAV-TST-001",
            engineModel="Rotax 914 F Turbo",
            engineType="4-Cyl Boxer",
            displacement="1,211 cc",
            maxPower="115 HP",
            coolingType="Liquid Cooled",
            fuelType="AVGAS 100LL",
            protocol="MAVLink 2.0",
            baudRate=115200,
        )
    )
    assert new_uav["name"] == "TEST-UAV-UNIT"
    assert new_uav["status"] == "ONLINE"

def test_missions_list():
    all_missions = missions.list_missions()
    assert len(all_missions) > 0
    m = missions.get_mission(all_missions[0]["id"])
    assert len(m["waypoints"]) >= 5
    assert len(m["timeline"]) >= 5

def test_auth_login():
    res = auth.login(auth.LoginRequest(email="admin@vyom.aero"))
    assert "access_token" in res
    assert res["user"]["email"] == "admin@vyom.aero"

def test_telemetry_history():
    hist = telemetry.get_telemetry_history(range="15m", uav_id="UAV-001")
    assert isinstance(hist, list)
    assert len(hist) > 0
    assert "rpm" in hist[0]
    assert "time" in hist[0]
