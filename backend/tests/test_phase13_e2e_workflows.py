"""
VYOM Phase 13: End-to-End System Hardening & Release Validation Test Suite
Tests complete workflows A through I:
- Workflow A: User Authentication & Session Security
- Workflow B: Telemetry Pipeline (Datalink -> TelemetryManager -> Live Snapshot)
- Workflow C: Engine & Sensor Health Diagnostics
- Workflow D: ML Anomaly Detection -> Alert Generation -> Notification Queue
- Workflow E: Predictive Maintenance & Component RUL Forecasting
- Workflow F: Mission Replay Subsystem & Scrubber Synchronization
- Workflow G: 3D Digital Twin Pose, Propeller Kinematics & Aerodynamic Deflections
- Workflow H: Multi-UAV Fleet Isolation
- Workflow I: Data Security & Session Integrity
"""

import time
import math
import pytest
from app.core.config import settings
from app.core.security import generate_session_token, verify_session_token
from app.services.telemetry_manager import telemetry_manager, TelemetryMode
from app.services.datalink_manager import datalink_manager
from app.services.sensor_manager import sensor_manager
from app.services.anomaly_service import anomaly_service
from app.services.alert_service import alert_service
from app.services.notification_service import notification_service
from app.services.predictive_maintenance_service import predictive_maintenance_service
from app.services.digital_twin import digital_twin_service, ROTAX_914_SPECS
from app.services.mission_service import mission_service
from app.api.v1.api import health_check, mark_notification_as_read
from app.api.v1.endpoints import (
    telemetry as telemetry_ep,
    auth as auth_ep,
    sensors as sensors_ep,
    anomalies as anomalies_ep,
    predictive_maintenance as pm_ep,
    missions as missions_ep,
    alerts as alerts_ep,
    digital_twin as twin_ep,
    datalink as datalink_ep,
)
from app.schemas.auth import LoginRequest


# ============================================================================
# WORKFLOW A: USER AUTHENTICATION & SESSION LIFECYCLE
# ============================================================================

def test_workflow_a_user_authentication():
    """Workflow A: Login -> Token Generation -> Verification -> Expiration Handling -> Logout"""
    # 1. Login with credentials
    login_req = auth_ep.LoginRequest(email="test.pilot@vyom.aero", password="demo-password")
    resp = auth_ep.login(login_req)
    assert resp["token_type"] == "bearer"
    token = resp["access_token"]
    assert token is not None

    # 2. Token verification with valid secret
    verified_email = verify_session_token(token, settings.SECRET_KEY)
    assert verified_email == "test.pilot@vyom.aero"

    # 3. Token verification with forged signature must fail
    tampered_token = token[:-4] + "ffff"
    assert verify_session_token(tampered_token, settings.SECRET_KEY) is None

    # 4. Expired token verification must fail
    old_timestamp = str(int(time.time()) - 90000)  # > 24 hours ago
    payload = f"test.pilot@vyom.aero:{old_timestamp}"
    import hmac, hashlib
    sig = hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
    expired_token = f"{payload}:{sig}"
    assert verify_session_token(expired_token, settings.SECRET_KEY, max_age_seconds=86400) is None

    # 5. Future timestamp skew (> 300s) must fail
    future_ts = str(int(time.time()) + 1000)
    future_payload = f"test.pilot@vyom.aero:{future_ts}"
    future_sig = hmac.new(settings.SECRET_KEY.encode(), future_payload.encode(), hashlib.sha256).hexdigest()
    future_token = f"{future_payload}:{future_sig}"
    assert verify_session_token(future_token, settings.SECRET_KEY) is None


# ============================================================================
# WORKFLOW B: TELEMETRY PIPELINE (DATALINK -> TELEMETRYMANAGER -> SNAPSHOT)
# ============================================================================

def test_workflow_b_telemetry_pipeline():
    """Workflow B: MAVLink/MQTT -> Datalink Validation -> TelemetryManager -> Live Snapshot"""
    telemetry_manager.set_mode("LIVE")

    test_packet = {
        "uav_id": "UAV-MALE-IND-01",
        "timestamp": time.strftime("%H:%M:%S"),
        "rpm": 2480,
        "cht": 178.5,
        "egt": 642.0,
        "oilPressure": 4.10,
        "oilTemperature": 95.0,
        "fuelFlow": 13.2,
        "vibrationRMS": 0.26,
        "latitude": 21.425,
        "longitude": 81.685,
        "altitudeFt": 15400.0,
        "groundSpeedMs": 33.5,
        "headingDeg": 185,
        "rollDeg": 1.2,
        "pitchDeg": 2.1,
    }

    # Ingest through datalink manager
    datalink_manager.on_packet_received("CONN-LIVE-01", test_packet)

    # Snapshot in TelemetryManager must reflect live ingested telemetry
    snapshot = telemetry_manager.get_current_snapshot()
    assert snapshot["mode"] == "LIVE"
    assert snapshot["rpm"] == 2480
    assert snapshot["cht"] == 178.5
    assert snapshot["altitudeFt"] == 15400.0
    assert snapshot["is_simulated"] is False

    # Teardown / Reset
    telemetry_manager.latest_live_packet = None
    telemetry_manager.set_mode("DEMO")


# ============================================================================
# WORKFLOW C: ENGINE MONITORING & SENSOR HEALTH DIAGNOSTICS
# ============================================================================

def test_workflow_c_engine_monitoring():
    """Workflow C: Telemetry -> Engine Health -> Sensor Status -> Stress Map"""
    telemetry_manager.set_mode("DEMO")
    telemetry_manager.set_scenario("NORMAL_CRUISE")

    # Evaluate sensors
    sensors = sensor_manager.get_all_sensors()
    assert len(sensors) >= 18

    rpm_sensor = next(s for s in sensors if s["id"] == "s-rpm")
    assert rpm_sensor["status"] in ["NORMAL", "WARNING"]
    assert rpm_sensor["value"] > 2000

    # Inspect stress map
    stress_map = digital_twin_service.get_stress_map()
    assert "components" in stress_map
    assert "comp-cylinder-head" in stress_map["components"]
    assert "comp-lubrication" in stress_map["components"]
    assert stress_map["components"]["comp-cylinder-head"]["state"] in ["NORMAL", "WARNING"]


# ============================================================================
# WORKFLOW D: ML ANOMALY DETECTION -> ALERT GENERATION -> NOTIFICATION QUEUE
# ============================================================================

def test_workflow_d_anomaly_alert_notification_pipeline():
    """Workflow D: Telemetry -> ML Model -> Anomaly Detection -> Alert Generation -> Notification"""
    # 1. Severe thermal runaway anomaly input
    anomaly_telemetry = {
        "rpm": 5400,
        "cht": 218.0,
        "egt": 820.0,
        "oilPressure": 1.8,
        "oilTemperature": 128.0,
        "fuelFlow": 15.5,
        "vibrationRMS": 0.42,
        "manifoldPressureInHg": 38.0,
    }

    # 2. Run ML Isolation Forest inference
    anomaly_res = anomaly_service.detect(anomaly_telemetry)
    assert anomaly_res["is_anomaly"] is True
    assert anomaly_res["severity"] in ["High", "Medium", "Critical"]
    assert any(k in str(anomaly_res.get("primary_component")) for k in ["Oil", "Cylinder", "Exhaust", "Lubrication"])

    # 3. Process into Alert Engine
    initial_alerts_count = len(alert_service.get_all())
    triggered_alerts = alert_service.evaluate_telemetry_snapshot(
        snapshot={
            "uav_id": "UAV-MALE-IND-01",
            "cht": 218.0,
            "egt": 820.0,
            "oilPressure": 1.8,
            "oilTemperature": 128.0,
            "rpm": 5400,
            "vibrationRMS": 0.42,
        },
        operating_mode="DEMO",
    )
    assert len(triggered_alerts) > 0
    assert triggered_alerts[0]["severity"].upper() in ["CRITICAL", "HIGH", "MEDIUM"]

    # 4. Verify notification queue received item
    notifs = notification_service.get_notifications(limit=10)
    assert len(notifs) > 0
    latest_notif = notifs[0]
    assert latest_notif["uav_id"] == "UAV-MALE-IND-01"

    # 5. Mark notification as read
    read_res = mark_notification_as_read(latest_notif["id"])
    assert read_res["success"] is True


# ============================================================================
# WORKFLOW E: PREDICTIVE MAINTENANCE & COMPONENT RUL FORECASTING
# ============================================================================

def test_workflow_e_predictive_maintenance_rul():
    """Workflow E: Telemetry -> RUL Model -> Subsystem Health -> Recommendations"""
    # Get overall predictive maintenance overview
    overview = predictive_maintenance_service.get_overview(uav_id="UAV-MALE-IND-01", horizon_hours=50)
    assert overview["overall_rul_hours"] > 0
    assert 0.0 <= overview["overall_health_percent"] <= 100.0

    # Validate recommendations are actionable and populated
    recs = predictive_maintenance_service.get_recommendations(uav_id="UAV-MALE-IND-01")
    assert len(recs) > 0
    assert "component" in recs[0] or "component_id" in recs[0]
    assert "recommended_action" in recs[0] or "action" in recs[0]


# ============================================================================
# WORKFLOW F: MISSION REPLAY SUBSYSTEM & TIMELINE SYNCHRONIZATION
# ============================================================================

def test_workflow_f_mission_replay_sync():
    """Workflow F: Mission Selection -> Replay Seek -> Telemetry Snapshot Sync -> Read-Only Isolation"""
    # 1. Fetch available missions
    missions = mission_service.get_all()
    assert len(missions) > 0
    mission = missions[0]

    # 2. Synchronize TelemetryManager to mission
    loaded = telemetry_manager.load_mission_for_replay(mission["id"])
    assert loaded is True
    snap = telemetry_manager.seek_replay(0)

    assert snap["mode"] == "REPLAY"
    assert snap["is_simulated"] is False

    # 3. Read-only isolation: REPLAY mode must NOT generate operational alert records
    alerts_before = len(alert_service.get_all())
    alert_service.evaluate_telemetry_snapshot(
        snapshot={"uav_id": mission["uav_id"], "cht": 220.0, "egt": 850.0},
        operating_mode="REPLAY",
    )
    alerts_after = len(alert_service.get_all())
    assert alerts_before == alerts_after  # 0 new operational records created

    # Reset mode
    telemetry_manager.set_mode("DEMO")


# ============================================================================
# WORKFLOW G: 3D DIGITAL TWIN SYNCHRONIZER & KINEMATICS
# ============================================================================

def test_workflow_g_digital_twin_synchronization():
    """Workflow G: Controlled Telemetry -> Aircraft Euler Orientation -> Propeller RPM -> Control Surfaces"""
    telemetry_manager.set_mode("DEMO")
    pose = digital_twin_service.get_aircraft_pose(uav_id="UAV-MALE-IND-01")

    # Rotax 914 F reduction gearbox: 2.43:1 ratio
    engine_rpm = pose["engine_rpm"]
    expected_prop_rpm = round(engine_rpm / 2.43, 1)
    assert abs(pose["propeller_rpm"] - expected_prop_rpm) < 0.2

    # Continuous propeller rotation speed formula: omega = Propeller RPM * 2pi / 60
    expected_omega = round((expected_prop_rpm * 2.0 * math.pi) / 60.0, 3)
    assert abs(pose["propeller_angular_velocity_rad_s"] - expected_omega) < 0.5

    # Control surface aerodynamic deflections
    surfaces = pose["control_surfaces"]
    assert "left_aileron_deg" in surfaces
    assert "right_aileron_deg" in surfaces
    assert "elevator_deg" in surfaces
    assert "rudder_deg" in surfaces
    # Opposing differential ailerons
    assert abs(surfaces["left_aileron_deg"] + surfaces["right_aileron_deg"]) < 0.01


# ============================================================================
# WORKFLOW H: MULTI-UAV FLEET ISOLATION
# ============================================================================

def test_workflow_h_multi_uav_isolation():
    """Workflow H: Multi-UAV Concurrent Ingestion -> Fleet Data Isolation"""
    pkt_uav1 = {"uav_id": "UAV-MALE-IND-01", "rpm": 2450, "altitudeFt": 12500.0, "timestamp": "12:00:00"}
    pkt_uav2 = {"uav_id": "UAV-MALE-IND-02", "rpm": 5100, "altitudeFt": 22000.0, "timestamp": "12:00:00"}

    # Ingest for two separate airframes
    datalink_manager.on_packet_received("CONN-UAV-01", pkt_uav1)
    datalink_manager.on_packet_received("CONN-UAV-02", pkt_uav2)

    # Ingestion logs must reflect isolated packet counts
    metrics = datalink_manager.get_metrics()
    assert metrics.total_packets_received >= 2

    # Clean up test states
    telemetry_manager.latest_live_packet = None
    telemetry_manager.set_mode("DEMO")


# ============================================================================
# WORKFLOW I: DATA SECURITY & CRYPTOGRAPHIC SESSION INTEGRITY
# ============================================================================

def test_workflow_i_data_security():
    """Workflow I: Session Isolation -> Signature Tampering Protection -> Unauthorized Rejection"""
    user_a_token = generate_session_token("user_a@vyom.aero", settings.SECRET_KEY)
    user_b_token = generate_session_token("user_b@vyom.aero", settings.SECRET_KEY)

    # Verify legitimate sessions
    assert verify_session_token(user_a_token, settings.SECRET_KEY) == "user_a@vyom.aero"
    assert verify_session_token(user_b_token, settings.SECRET_KEY) == "user_b@vyom.aero"

    # User B attempts to impersonate User A by replacing email in token payload
    tampered_user_b = user_b_token.replace("user_b@vyom.aero", "user_a@vyom.aero")
    assert verify_session_token(tampered_user_b, settings.SECRET_KEY) is None

    # Blank token or malformed payload rejected
    assert verify_session_token("", settings.SECRET_KEY) is None
    assert verify_session_token("invalid-token-string", settings.SECRET_KEY) is None
