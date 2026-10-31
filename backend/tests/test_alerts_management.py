"""
Alert Management & Real-Time Notification Queue Automated Test Suite - Phase 10
Validates centralized alert creation, severity classification, deduplication,
intelligent correlation, lifecycle transitions, and REST endpoints.
"""

import pytest
from app.services.alert_service import alert_service
from app.services.notification_service import notification_service
from app.services.telemetry_manager import telemetry_manager, TelemetryMode
from app.api.v1.endpoints import alerts
from app.schemas.alert import (
    AlertAcknowledgeRequest,
    AlertInvestigateRequest,
    AlertResolveRequest,
    AlertDismissRequest,
    AlertSummaryResponse,
)

def test_alert_service_baseline_seeded():
    """Verify that baseline alerts and summary statistics are initialized."""
    all_alerts = alert_service.get_all()
    assert len(all_alerts) >= 3
    
    summary = alert_service.get_summary()
    assert summary["total_alerts"] >= 3
    assert summary["active_unresolved"] >= 1
    assert summary["critical_count"] >= 1

def test_alert_severity_classification_and_correlation():
    """Verify multi-sensor correlation and correct severity classification."""
    initial_count = len(alert_service.get_all())
    
    # 1. Thermal Overload Packet (CHT 206 °C, EGT 685 °C) -> CRITICAL correlated alert
    thermal_packet = {
        "uav_id": "UAV-ROTAX-001",
        "rpm": 2550,
        "cht": 206.0,
        "egt": 685.0,
        "oilPressure": 4.10,
        "oilTemperature": 95.0,
        "vibrationRMS": 0.28,
        "mode": "DEMO",
    }
    created = alert_service.evaluate_telemetry_snapshot(thermal_packet, operating_mode="DEMO")
    assert len(created) == 1
    new_alert = created[0]
    assert new_alert["severity"] == "Critical"
    assert "Thermal Stress" in new_alert["title"]
    assert new_alert["component"] == "Cylinder Head & Piston Assembly"
    assert new_alert["status"] == "Active"

def test_alert_duplicate_prevention():
    """Verify that repeated telemetry deviations within the same failure mode do NOT create duplicates."""
    initial_count = len(alert_service.get_all())
    
    repeated_packet = {
        "uav_id": "UAV-ROTAX-001",
        "rpm": 2550,
        "cht": 207.0,
        "egt": 688.0,
        "oilPressure": 4.10,
        "vibrationRMS": 0.28,
        "mode": "DEMO",
    }
    # Run multiple times
    res1 = alert_service.evaluate_telemetry_snapshot(repeated_packet, operating_mode="DEMO")
    res2 = alert_service.evaluate_telemetry_snapshot(repeated_packet, operating_mode="DEMO")
    
    # Should not add new alerts
    assert len(res1) == 0
    assert len(res2) == 0
    assert len(alert_service.get_all()) == initial_count

def test_alert_lifecycle_transitions():
    """Verify full alert lifecycle: NEW/Active -> ACKNOWLEDGED -> INVESTIGATING -> RESOLVED."""
    all_active = [a for a in alert_service.get_all() if a["status"] == "Active"]
    assert len(all_active) >= 1
    target_id = all_active[0]["id"]

    # 1. Acknowledge
    ack_res = alert_service.acknowledge(target_id, operator_name="Flight Captain Sarah")
    assert ack_res is not None
    assert ack_res["status"] == "Acknowledged"
    assert ack_res["acknowledged"] is True
    assert ack_res["acknowledgedBy"] == "Flight Captain Sarah"
    assert any(trail["action"] == "ACKNOWLEDGED" for trail in ack_res["audit_trail"])

    # 2. Investigate
    inv_res = alert_service.investigate(
        target_id,
        operator_name="Lead Propulsion Engineer",
        notes="Inspecting cooling duct differential pressure telemetry."
    )
    assert inv_res is not None
    assert inv_res["status"] == "Investigating"
    assert inv_res["investigatedBy"] == "Lead Propulsion Engineer"
    assert any(trail["action"] == "INVESTIGATING" for trail in inv_res["audit_trail"])

    # 3. Resolve
    res_res = alert_service.resolve(
        target_id,
        operator_name="Maintenance Chief",
        resolution_notes="Cooling flap actuator recalibrated; CHT stabilized at 178 °C."
    )
    assert res_res is not None
    assert res_res["status"] == "Resolved"
    assert res_res["resolutionNotes"] == "Cooling flap actuator recalibrated; CHT stabilized at 178 °C."
    assert any(trail["action"] == "RESOLVED" for trail in res_res["audit_trail"])

def test_critical_alert_dismissal_guard():
    """Verify safety guard: Critical alerts CANNOT be dismissed without formal resolution."""
    critical_alerts = [a for a in alert_service.get_all() if a["severity"] in ["Critical", "CRITICAL"]]
    assert len(critical_alerts) >= 1
    crit_id = critical_alerts[0]["id"]
    
    dismiss_res = alert_service.dismiss(crit_id, operator_name="Operator X")
    assert dismiss_res is None  # Dismissal must be rejected for Critical/High alerts

def test_replay_mode_read_only_isolation():
    """Verify that REPLAY mode evaluations do NOT create operational alerts or notifications."""
    alerts_before = len(alert_service.get_all())
    notifs_before = len(notification_service.get_notifications())

    failing_replay_packet = {
        "uav_id": "UAV-ROTAX-001",
        "rpm": 2550,
        "cht": 218.0,  # Critical thermal failure in historical mission
        "egt": 720.0,
        "oilPressure": 1.80,
        "vibrationRMS": 0.75,
        "mode": "REPLAY",
    }
    # Evaluated during historical mission replay
    created = alert_service.evaluate_telemetry_snapshot(failing_replay_packet, operating_mode="REPLAY")
    assert len(created) == 0

    alerts_after = len(alert_service.get_all())
    notifs_after = len(notification_service.get_notifications())

    assert alerts_after == alerts_before
    assert notifs_after == notifs_before

def test_notification_queue_priority_and_read():
    """Verify notification priority queue insertion and read status."""
    critical_alert = {
        "id": "ALT-TEST-CRIT",
        "title": "Severe Main Bearing Loss",
        "description": "Oil pressure collapsed to 1.9 bar.",
        "severity": "CRITICAL",
        "uav_id": "UAV-ROTAX-001",
    }
    notif = notification_service.enqueue_notification(critical_alert)
    assert notif["severity"] == "CRITICAL"

    # Must be at front of queue
    top_notifs = notification_service.get_notifications(limit=1)
    assert top_notifs[0]["id"] == notif["id"]

    # Mark as read
    assert notification_service.mark_as_read(notif["id"]) is True

def test_alerts_api_endpoints():
    """Verify REST API endpoints for Alert Management."""
    # 1. Summary endpoint
    raw_summary = alerts.get_alerts_summary()
    summary = AlertSummaryResponse(**raw_summary) if isinstance(raw_summary, dict) else raw_summary
    assert summary.total_alerts >= 3
    assert summary.critical_count >= 1

    # 2. List endpoint
    all_res = alerts.list_alerts()
    assert len(all_res) >= 3

    # 3. History endpoint
    hist = alerts.get_alerts_history()
    assert len(hist) >= 3
    assert "action" in hist[0]

    # 4. Notifications endpoint
    notifs = alerts.get_notifications()
    assert len(notifs) >= 1

    # 5. Alert Detail endpoint
    first_id = all_res[0].id if hasattr(all_res[0], "id") else all_res[0]["id"]
    detail = alerts.get_alert_detail(first_id)
    assert (detail.id if hasattr(detail, "id") else detail["id"]) == first_id

    # 6. Acknowledge endpoint
    ack_req = AlertAcknowledgeRequest(acknowledged_by="Test Pilot Alpha")
    ack_res = alerts.acknowledge_alert(first_id, ack_req)
    assert (ack_res.status if hasattr(ack_res, "status") else ack_res["status"]) == "Acknowledged"

