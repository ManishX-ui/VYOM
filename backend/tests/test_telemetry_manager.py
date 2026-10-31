"""
Tests for Centralized TelemetryManager Service and Multi-Mode Engine
"""

import pytest
from app.services.telemetry_manager import (
    TelemetryManager,
    TelemetryMode,
    SimulationScenario,
    telemetry_manager,
)
from app.api.v1.endpoints import telemetry
from app.schemas.telemetry import TelemetryControlRequest

@pytest.fixture
def manager():
    return TelemetryManager()

def test_demo_mode_generation(manager):
    manager.set_mode("DEMO")
    manager.set_scenario("NORMAL_CRUISE")
    snapshot = manager.get_current_snapshot()

    assert snapshot["mode"] == "DEMO"
    assert snapshot["is_simulated"] is True
    assert "uav_id" in snapshot
    assert "timestamp" in snapshot

    # Verify 8 Core Aero Engine Parameters
    assert 2200 <= snapshot["rpm"] <= 2600
    assert 160.0 <= snapshot["cht"] <= 205.0
    assert 550.0 <= snapshot["egt"] <= 680.0
    assert 3.5 <= snapshot["oilPressure"] <= 5.0
    assert 80.0 <= snapshot["oilTemperature"] <= 110.0
    assert 10.0 <= snapshot["fuelFlow"] <= 16.0
    assert 0.20 <= snapshot["vibrationRMS"] <= 0.40
    assert 24.0 <= snapshot["injectionTiming"] <= 28.0

    # Verify spatial coordinates
    assert 20.0 <= snapshot["latitude"] <= 23.0
    assert 80.0 <= snapshot["longitude"] <= 83.0

def test_simulation_scenarios(manager):
    manager.set_mode("DEMO")

    # High Altitude Climb
    manager.set_scenario("HIGH_ALTITUDE_CLIMB")
    climb_snap = manager.get_current_snapshot()
    assert climb_snap["rpm"] >= 2650
    assert climb_snap["manifoldPressureInHg"] >= 35.0

    # CHT Overheat Scenario
    manager.set_scenario("CHT_OVERHEAT")
    overheat_snap = manager.get_current_snapshot()
    assert overheat_snap["cht"] >= 190.0

    # Oil Pressure Drop Scenario
    manager.set_scenario("OIL_PRESSURE_DROP")
    oil_snap = manager.get_current_snapshot()
    assert oil_snap["oilPressure"] <= 4.2

def test_strict_mode_separation(manager):
    # Transition to REPLAY
    assert manager.set_mode("REPLAY") is True
    replay_snap = manager.get_current_snapshot()
    assert replay_snap["mode"] == "REPLAY"
    assert "time_offset_sec" in replay_snap

    # Transition to LIVE without hardware packets
    assert manager.set_mode("LIVE") is True
    live_snap = manager.get_current_snapshot()
    assert live_snap["mode"] == "LIVE"
    assert live_snap["datalink_status"] == "DISCONNECTED"
    # Verify that it never silently reverted to DEMO!
    assert manager.mode == TelemetryMode.LIVE

def test_live_packet_ingestion(manager):
    manager.set_mode("LIVE")
    test_packet = {
        "rpm": 2500,
        "cht": 188.5,
        "egt": 625.0,
        "oilPressure": 4.3,
        "oilTemperature": 97.0,
        "fuelFlow": 13.0,
        "vibrationRMS": 0.29,
        "injectionTiming": 26.0,
        "latitude": 21.2891,
        "longitude": 81.6720,
    }
    manager.ingest_live_packet(test_packet)
    assert manager.is_live_connected() is True

    snapshot = manager.get_current_snapshot()
    assert snapshot["mode"] == "LIVE"
    assert snapshot["is_simulated"] is False
    assert snapshot["rpm"] == 2500

def test_telemetry_control_api():
    # Test status endpoint
    status = telemetry.get_telemetry_status()
    assert "mode" in status
    assert "scenario" in status

    # Test control endpoint
    req = TelemetryControlRequest(
        mode="DEMO",
        scenario="NORMAL_CRUISE",
        jitter_factor=1.0,
    )
    control_data = telemetry.control_telemetry(req)
    assert control_data["status"] == "updated"
    assert control_data["current_mode"] == "DEMO"

def test_websocket_client_registry(manager):
    class MockWS:
        pass

    ws = MockWS()
    manager.active_connections.add(ws)
    assert ws in manager.active_connections
    assert len(manager.active_connections) == 1

    manager.disconnect(ws)
    assert ws not in manager.active_connections
    assert len(manager.active_connections) == 0

def test_telemetry_history_ranges(manager):
    manager.set_mode("DEMO")
    for r in ["1m", "5m", "15m", "1h", "6h", "24h"]:
        res = manager.get_telemetry_history(time_range=r, uav_id="UAV-001")
        assert isinstance(res, list)
        assert len(res) > 0
        p = res[0]
        assert "time" in p
        assert "rpm" in p
        assert "cht" in p
        assert "oilPressure" in p

def test_telemetry_history_live_disconnected(manager):
    manager.set_mode("LIVE")
    res = manager.get_telemetry_history(time_range="15m", uav_id="UAV-001")
    assert isinstance(res, list)
    assert len(res) == 0  # Zero fake points generated when disconnected!

def test_gps_navigation_telemetry(manager):
    manager.set_mode("DEMO")
    manager.set_scenario("NORMAL_CRUISE")
    snapshot = manager.get_current_snapshot()
    assert "latitude" in snapshot
    assert "longitude" in snapshot
    assert "altitudeFt" in snapshot
    assert "headingDeg" in snapshot
    assert "groundSpeedMs" in snapshot
    assert 20.0 <= snapshot["latitude"] <= 23.0
    assert 80.0 <= snapshot["longitude"] <= 83.0
    assert 0 <= snapshot["headingDeg"] <= 360

def test_gps_signal_loss_scenario(manager):
    manager.set_mode("DEMO")
    manager.set_scenario("GPS_SIGNAL_LOSS")
    snapshot = manager.get_current_snapshot()
    assert snapshot["latitude"] is None
    assert snapshot["longitude"] is None
    assert snapshot["altitudeFt"] is None
    manager.set_scenario("NORMAL_CRUISE")

def test_spatial_history_points(manager):
    manager.set_mode("DEMO")
    history = manager.get_telemetry_history("15m", "UAV-MALE-IND-01")
    assert len(history) > 0
    p = history[0]
    assert "latitude" in p
    assert "longitude" in p
    assert "altitudeFt" in p
    assert "headingDeg" in p
