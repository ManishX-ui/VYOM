"""
Mission Replay Subsystem Verification Tests - Phase 7
"""

import pytest
from app.services.mission_service import mission_service
from app.services.telemetry_manager import telemetry_manager, TelemetryMode
from app.api.v1.endpoints import missions

def test_mission_service_get_all():
    all_missions = mission_service.get_all()
    assert len(all_missions) >= 4
    # Check that each mission has required properties
    for m in all_missions:
        assert "id" in m
        assert "name" in m
        assert "status" in m
        assert "totalDistanceKm" in m
        assert "summary" in m

def test_mission_service_filters():
    # Filter by UAV
    uav_missions = mission_service.get_all(uav_id="UAV-ROTAX-001")
    assert len(uav_missions) >= 2
    for m in uav_missions:
        assert m["uav_id"] == "UAV-ROTAX-001"

    # Filter by status
    completed_missions = mission_service.get_all(status="Completed")
    assert len(completed_missions) >= 3
    for m in completed_missions:
        assert m["status"] == "Completed"

    # Search filter
    search_results = mission_service.get_all(search="Tactical")
    assert len(search_results) >= 1
    assert "Tactical" in search_results[0]["name"]

def test_mission_service_analytics():
    analytics = mission_service.get_analytics("Surveillance_2026_10_23_01")
    assert analytics["telemetryAvailable"] is True
    assert analytics["maxAltitudeFt"] >= 22000.0
    assert analytics["avgSpeedMs"] > 0
    assert analytics["totalRecordedPoints"] >= 10
    assert analytics["engineHealthTrend"] == "Nominal"

def test_scheduled_mission_unavailable_telemetry():
    scheduled = mission_service.get_by_id("Scheduled_Mission_05")
    assert scheduled is not None
    assert scheduled["status"] == "Scheduled"
    assert scheduled["telemetryAvailable"] is False
    assert len(scheduled["timeline"]) == 0

    analytics = mission_service.get_analytics("Scheduled_Mission_05")
    assert analytics["telemetryAvailable"] is False
    assert "unavailable" in analytics["message"].lower()

def test_telemetry_manager_replay_sync():
    # Load mission into TelemetryManager
    loaded = telemetry_manager.load_mission_for_replay("Surveillance_2026_10_23_01")
    assert loaded is True
    assert telemetry_manager.mode == TelemetryMode.REPLAY
    assert telemetry_manager.replay_mission_id == "Surveillance_2026_10_23_01"

    # Seek scrubber to specific offset
    snap = telemetry_manager.seek_replay(0)
    assert snap["mode"] == "REPLAY"
    assert snap["is_simulated"] is False
    assert snap["mission_id"] == "Surveillance_2026_10_23_01"
    assert snap["rpm"] == 2580
    assert snap["cht"] == 178.0
    assert snap["latitude"] == 21.2485
    assert snap["longitude"] == 81.6202

def test_missions_api_endpoint():
    res = missions.list_missions(status="Completed")
    assert len(res) >= 3
    detail = missions.get_mission("Surveillance_2026_10_23_01")
    assert detail["name"] == "Northern Tactical Border Surveillance #04"
    assert len(detail["events"]) >= 5

