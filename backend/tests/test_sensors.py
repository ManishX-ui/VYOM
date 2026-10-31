"""
Tests for Sensor Monitoring, Health State Detection, Hysteresis,
Software Calibration, and Downsampled History.
"""

import pytest
from app.services.sensor_manager import (
    SensorManager,
    SensorState,
    SensorCategory,
    sensor_manager,
)
from app.services.telemetry_manager import telemetry_manager, TelemetryMode, SimulationScenario
from app.api.v1.endpoints import sensors
from app.schemas.telemetry import TelemetryControlRequest

@pytest.fixture
def sm():
    return SensorManager()

def test_sensor_definitions_count(sm):
    all_sensors = sm.get_all_sensors()
    # At least 18 sensors covering Engine, Flight, and Electrical
    assert len(all_sensors) >= 18

    categories = {s["category"] for s in all_sensors}
    assert "Engine" in categories
    assert "Flight" in categories
    assert "Electrical" in categories

def test_sensor_normal_evaluation(sm):
    telemetry_manager.set_mode("DEMO")
    telemetry_manager.set_scenario("NORMAL_CRUISE")

    all_sensors = sm.get_all_sensors()
    rpm_sensor = next(s for s in all_sensors if s["id"] == "s-rpm")

    assert rpm_sensor["status"] in ["NORMAL", "WARNING"]
    assert rpm_sensor["unit"] == "RPM"
    assert rpm_sensor["value"] > 2200
    assert rpm_sensor["operatingMode"] == "DEMO"
    assert "minNormal" in rpm_sensor
    assert "maxNormal" in rpm_sensor

def test_sensor_failure_scenarios(sm):
    telemetry_manager.set_mode("DEMO")

    # 1. Sensor Disconnected (CHT disconnected)
    telemetry_manager.set_scenario("SENSOR_DISCONNECTED")
    sensors_list = sm.get_all_sensors()
    cht_sensor = next(s for s in sensors_list if s["id"] == "s-cht")
    assert cht_sensor["status"] == "OFFLINE"
    assert cht_sensor["value"] is None

    # 2. Critical EGT
    telemetry_manager.set_scenario("EGT_ABNORMAL")
    sensors_list = sm.get_all_sensors()
    egt_sensor = next(s for s in sensors_list if s["id"] == "s-egt")
    assert egt_sensor["status"] == "CRITICAL"
    assert egt_sensor["value"] > 700.0

    # 3. Oil Pressure Failure
    telemetry_manager.set_scenario("OIL_PRESSURE_FAILURE")
    sensors_list = sm.get_all_sensors()
    oil_sensor = next(s for s in sensors_list if s["id"] == "s-oil-p")
    assert oil_sensor["status"] == "CRITICAL"
    assert oil_sensor["value"] < 2.0

    # 4. GPS Signal Loss
    telemetry_manager.set_scenario("GPS_SIGNAL_LOSS")
    sensors_list = sm.get_all_sensors()
    gps_sensor = next(s for s in sensors_list if s["id"] == "s-gps")
    assert gps_sensor["status"] == "OFFLINE"
    assert gps_sensor["value"] is None

    # Reset back to NORMAL_CRUISE
    telemetry_manager.set_scenario("NORMAL_CRUISE")

def test_live_mode_disconnected_sensors(sm):
    telemetry_manager.set_mode("LIVE")
    # Live mode with no GCS hardware connection -> all sensors must be OFFLINE, no fake values
    sensors_list = sm.get_all_sensors()
    for s in sensors_list:
        assert s["status"] == "OFFLINE"
        assert s["value"] is None

    telemetry_manager.set_mode("DEMO")

def test_software_calibration_workflow(sm):
    # Calibrate CHT with +5 °C offset
    cal_res = sm.calibrate_sensor(
        sensor_id="s-cht",
        reference_value=180.0,
        measured_value=175.0,
        technician="CHIEF-AVIONICS",
        notes="Bench thermocouple zero-drift adjustment",
    )
    assert cal_res["status"] == "CALIBRATED"
    assert cal_res["offset"] == 5.0
    assert len(cal_res["history"]) >= 1

    detail = sm.get_sensor_detail("s-cht")
    assert detail is not None
    assert detail["calibrationSummary"]["offset"] == 5.0

    # Reset calibration
    reset_res = sm.reset_calibration("s-cht")
    assert reset_res["offset"] == 0.0

def test_sensor_history_downsampling(sm):
    telemetry_manager.set_mode("DEMO")
    for r in ["1m", "5m", "15m", "1h", "6h", "24h"]:
        hist = sm.get_sensor_history(sensor_id="s-rpm", time_range=r)
        assert hist["sensor_id"] == "s-rpm"
        assert hist["range"] == r
        assert len(hist["points"]) > 0
        assert "time" in hist["points"][0]
        assert "value" in hist["points"][0]

def test_sensors_api_endpoints():
    telemetry_manager.set_mode("DEMO")
    telemetry_manager.set_scenario("NORMAL_CRUISE")

    # List all
    all_s = sensors.list_sensors(uav_id="UAV-MALE-IND-01")
    assert len(all_s) >= 18

    # Detail
    detail = sensors.get_sensor_detail("s-cht")
    assert detail["id"] == "s-cht"
    assert "calibrationDetails" in detail

    # History
    hist = sensors.get_sensor_history("s-cht", range="15m")
    assert hist["range"] == "15m"
    assert len(hist["points"]) > 0

    # Threshold update
    up = sensors.update_sensor_thresholds(
        "s-cht",
        sensors.SensorThresholdsRequest(max_critical=215.0)
    )
    assert up["max_critical"] == 215.0

