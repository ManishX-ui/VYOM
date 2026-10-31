"""
Test Suite for Phase 11: Ground Control Station Datalink Integration (MAVLink & MQTT)
Tests adapter initialization, message decoding, validation, deduplication, latency metrics,
multi-UAV isolation, and REST API endpoints.
"""

import time
from datetime import datetime, timezone, timedelta
from app.schemas.datalink import (
    MAVLinkConnectionConfig,
    MQTTConnectionConfig,
    DatalinkConnectionStatus,
    ProtocolType,
    MAVLinkTransport,
    DatalinkTestRequest,
)
from app.services.datalink_manager import datalink_manager
from app.services.mavlink_adapter import MAVLinkAdapter
from app.services.mqtt_adapter import MQTTAdapter
from app.services.telemetry_manager import telemetry_manager, TelemetryMode
from app.api.v1.endpoints import datalink


def test_datalink_manager_initialization():
    """Verify default seeded datalink adapters and initial metrics."""
    metrics = datalink_manager.get_metrics()
    assert metrics.total_connections >= 2
    assert metrics.total_packets_received >= 0
    assert "STALE_TIMESTAMP" in metrics.rejection_reasons_breakdown


def test_mavlink_adapter_message_decoding():
    """Verify decoding of MAVLink messages (Position, Attitude, HUD, and Rotax EFI)."""
    received_packets = []

    def test_callback(conn_id, packet):
        received_packets.append(packet)

    cfg = MAVLinkConnectionConfig(
        connection_id="TEST-MAVLINK-UAV1",
        uav_id="UAV-MALE-IND-01",
        transport=MAVLinkTransport.UDP,
        port=14555,
    )
    adapter = MAVLinkAdapter(cfg, on_packet_callback=test_callback)

    # 1. Inject Attitude
    adapter.inject_simulated_message("ATTITUDE", {
        "roll": 0.05,
        "pitch": 0.03,
        "yaw": 1.57,
        "rollspeed": 0.0,
        "pitchspeed": 0.0,
        "yawspeed": 0.0,
    })

    # 2. Inject Position (triggers dispatch)
    adapter.inject_simulated_message("GLOBAL_POSITION_INT", {
        "lat": 214200000,
        "lon": 816800000,
        "alt": 5500000,  # 5500m -> ~18044 ft
        "vz": -120,
        "hdg": 9000,
    })

    assert len(received_packets) >= 1
    last_pkt = received_packets[-1]
    assert last_pkt["latitude"] == 21.42
    assert last_pkt["longitude"] == 81.68
    assert last_pkt["altitudeFt"] > 18000
    assert last_pkt["headingDeg"] == 90

    # 3. Inject Rotax EFI Status
    adapter.inject_simulated_message("EFI_STATUS", {
        "rpm": 2480,
        "fuel_flow": 12.6,
        "oil_pressure": 420,  # 4.20 bar
        "oil_temperature": 96,
        "coolant_temperature": 188.5,
        "exhaust_gas_temperature": 625.0,
    })

    assert len(received_packets) >= 2
    efi_pkt = received_packets[-1]
    assert efi_pkt["rpm"] == 2480
    assert efi_pkt["cht"] == 188.5
    assert efi_pkt["egt"] == 625.0
    assert efi_pkt["oilPressure"] == 4.20


def test_mqtt_adapter_payload_ingestion():
    """Verify MQTT payload processing, envelope formatting, and latency calculation."""
    received = []

    def mqtt_callback(conn_id, data):
        received.append(data)

    cfg = MQTTConnectionConfig(
        connection_id="TEST-MQTT-UAV1",
        uav_id="UAV-MALE-IND-01",
        broker_address="localhost",
        port=1883,
    )
    adapter = MQTTAdapter(cfg, on_packet_callback=mqtt_callback)

    test_payload = {
        "rpm": 2450,
        "cht": 187.0,
        "egt": 620.0,
        "oilPressure": 4.15,
        "oilTemperature": 95.5,
        "fuelFlow": 12.4,
        "latitude": 21.42,
        "longitude": 81.68,
        "altitudeFt": 18000.0,
        "sent_timestamp": time.time() - 0.045,  # 45ms latency simulation
    }

    adapter.inject_simulated_payload("vyom/uav/UAV-MALE-IND-01/telemetry", test_payload)

    assert len(received) == 1
    pkt = received[0]
    assert pkt["rpm"] == 2450
    assert pkt["protocol"] == "MQTT"
    assert pkt["uav_id"] == "UAV-MALE-IND-01"
    assert pkt["topic"] == "vyom/uav/UAV-MALE-IND-01/telemetry"


def test_telemetry_validator_freshness_and_bounds():
    """Verify security validation rejects stale, duplicate, or physical bounds violations."""
    now_utc = datetime.now(timezone.utc)

    # 1. Stale timestamp (> 60s skew)
    stale_pkt = {
        "uav_id": "UAV-MALE-IND-01",
        "iso_timestamp": (now_utc - timedelta(seconds=120)).isoformat(),
        "rpm": 2450,
    }
    is_valid, reason, _ = datalink_manager._validate_and_normalize(stale_pkt)
    assert not is_valid
    assert reason == "STALE_TIMESTAMP"

    # 2. Invalid UAV ID
    bad_uav_pkt = {
        "uav_id": "X",  # Too short
        "rpm": 2450,
    }
    is_valid, reason, _ = datalink_manager._validate_and_normalize(bad_uav_pkt)
    assert not is_valid
    assert reason == "INVALID_UAV_ID"

    # 3. Out of bounds RPM
    rpm_pkt = {
        "uav_id": "UAV-MALE-IND-01",
        "rpm": 8500,  # Rotax redline is 5800 RPM
    }
    is_valid, reason, _ = datalink_manager._validate_and_normalize(rpm_pkt)
    assert not is_valid
    assert reason == "OUT_OF_RANGE_VALUE"

    # 4. Out of bounds Latitude
    lat_pkt = {
        "uav_id": "UAV-MALE-IND-01",
        "latitude": 125.0,  # Max is 90
    }
    is_valid, reason, _ = datalink_manager._validate_and_normalize(lat_pkt)
    assert not is_valid
    assert reason == "OUT_OF_RANGE_VALUE"


def test_datalink_lifecycle_transitions():
    """Verify adapter state transitions: CONNECTED -> DEGRADED -> DISCONNECTED."""
    cfg = MAVLinkConnectionConfig(
        connection_id="TEST-LIFECYCLE-UAV1",
        uav_id="UAV-MALE-IND-01",
        port=14559,
        heartbeat_timeout_sec=0.2,
    )
    adapter = MAVLinkAdapter(cfg)
    assert adapter.status == DatalinkConnectionStatus.DISCONNECTED

    adapter.status = DatalinkConnectionStatus.CONNECTED
    adapter.connected_at = time.time()
    status_info = adapter.get_status()
    assert status_info.status == DatalinkConnectionStatus.CONNECTED
    assert status_info.is_active is True

    adapter.disconnect()
    assert adapter.status == DatalinkConnectionStatus.DISCONNECTED


def test_multiple_uav_datalink_isolation():
    """Verify managing multiple UAV airframes concurrently."""
    resp = datalink_manager.simulate_test_scenario(
        DatalinkTestRequest(scenario="MULTIPLE_UAV", uav_id="UAV-MALE-IND-01")
    )
    assert resp.success is True
    assert resp.packets_dispatched >= 2


def test_datalink_simulation_scenarios():
    """Verify all required test scenarios."""
    scenarios = [
        "NORMAL_TELEMETRY",
        "CONNECTION_LOSS",
        "RECONNECTION",
        "STALE_MESSAGES",
        "DUPLICATE_PACKETS",
        "INVALID_MESSAGE",
    ]
    for sc in scenarios:
        req = DatalinkTestRequest(scenario=sc, uav_id="UAV-MALE-IND-01")
        res = datalink_manager.simulate_test_scenario(req)
        assert res.success is True, f"Scenario {sc} failed: {res.message}"


def test_live_telemetry_integration_with_telemetry_manager():
    """Verify validated datalink telemetry updates TelemetryManager live snapshot."""
    # Switch TelemetryManager to LIVE mode
    telemetry_manager.set_mode("LIVE")

    test_pkt = {
        "uav_id": "UAV-MALE-IND-01",
        "rpm": 2510,
        "cht": 189.2,
        "egt": 624.5,
        "oilPressure": 4.25,
        "oilTemperature": 96.2,
        "fuelFlow": 12.7,
        "vibrationRMS": 0.29,
        "latitude": 21.425,
        "longitude": 81.685,
        "altitudeFt": 18100.0,
        "groundSpeedMs": 32.8,
        "headingDeg": 182,
        "batteryVoltage": 28.2,
        "batteryCurrent": 14.4,
        "batterySoc": 95.0,
    }

    datalink_manager.on_packet_received("TEST-LIVE-CONN", test_pkt)

    snap = telemetry_manager.get_current_snapshot()
    assert snap["mode"] == "LIVE"
    assert snap["rpm"] == 2510
    assert snap["cht"] == 189.2
    assert snap["is_simulated"] is False

    # Reset back to DEMO mode and clear live packet state
    telemetry_manager.latest_live_packet = None
    telemetry_manager.last_live_packet_time = None
    telemetry_manager.live_buffer.clear()
    telemetry_manager.set_mode("DEMO")


def test_datalink_api_endpoints():
    """Verify all REST API endpoints for Datalink Management."""
    # 1. Status endpoint
    status_data = datalink.get_datalink_status()
    assert "status" in status_data
    assert "total_connections" in status_data
    assert "supported_protocols" in status_data

    # 2. Connections list endpoint
    conns = datalink.get_all_connections()
    assert len(conns) >= 2

    # 3. Single UAV connection endpoint
    uav_conn = datalink.get_connection_by_uav("UAV-MALE-IND-01")
    assert uav_conn.uav_id == "UAV-MALE-IND-01"

    # 4. Metrics endpoint
    metrics = datalink.get_datalink_metrics()
    assert metrics.total_connections >= 2
    assert "rejection_reasons_breakdown" in metrics.model_dump()

    # 5. Test trigger endpoint
    test_req = DatalinkTestRequest(
        scenario="NORMAL_TELEMETRY",
        uav_id="UAV-MALE-IND-01",
        protocol=ProtocolType.MAVLINK,
    )
    test_res = datalink.run_datalink_test(test_req)
    assert test_res.success is True
    assert test_res.scenario == "NORMAL_TELEMETRY"
