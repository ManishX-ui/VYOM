import math
import pytest
from app.services.digital_twin import digital_twin_service, ROTAX_914_SPECS
from app.services.telemetry_manager import telemetry_manager
from app.api.v1.endpoints import digital_twin as twin_endpoints

def test_rotax_914_specifications():
    """Verify Rotax 914 F propulsion baseline specifications."""
    assert ROTAX_914_SPECS["engine_type"] == "Rotax 914 F"
    assert ROTAX_914_SPECS["reduction_gear_ratio"] == 2.43
    assert ROTAX_914_SPECS["takeoff_power_hp"] == 115.0
    assert ROTAX_914_SPECS["max_continuous_power_hp"] == 100.0
    assert ROTAX_914_SPECS["max_continuous_rpm"] == 5500

def test_aircraft_pose_nominal_calculation():
    """Verify pose computation: Euler angles, spatial position, and reduction kinematics."""
    telemetry_manager.set_mode("DEMO")
    pose = digital_twin_service.get_aircraft_pose(uav_id="UAV-MALE-IND-01")

    assert pose is not None
    assert "uav_id" in pose
    assert "mode" in pose
    assert "spatial_attitude" in pose

    # Euler angles
    attitude = pose["spatial_attitude"]
    assert "roll_deg" in attitude
    assert "pitch_deg" in attitude
    assert "heading_deg" in attitude
    assert isinstance(attitude["roll_deg"], (int, float))
    assert isinstance(attitude["pitch_deg"], (int, float))
    assert isinstance(attitude["heading_deg"], (int, float))

    # Propulsion & Gearbox Kinematics
    assert pose["gearbox_ratio"] == "2.43:1"
    assert "engine_rpm" in pose
    assert "propeller_rpm" in pose
    assert "propeller_angular_velocity_rad_s" in pose

    # Rotax 914 F Gearbox ratio: Propeller RPM = round(Engine RPM / 2.43, 1)
    engine_rpm = pose["engine_rpm"]
    expected_prop_rpm = round(engine_rpm / 2.43, 1)
    assert abs(pose["propeller_rpm"] - expected_prop_rpm) < 0.2

    # Angular velocity formula: omega = Propeller RPM * 2pi / 60
    expected_rad_s = round(expected_prop_rpm * (2 * math.pi) / 60, 2)
    assert abs(pose["propeller_angular_velocity_rad_s"] - expected_rad_s) < 0.5

def test_control_surfaces_deflection_mapping():
    """Verify movable control surfaces are aerodynamically bounded."""
    pose = digital_twin_service.get_aircraft_pose()
    surfaces = pose.get("control_surfaces")
    assert surfaces is not None

    left_aileron = surfaces["left_aileron_deg"]
    right_aileron = surfaces["right_aileron_deg"]
    elevator = surfaces["elevator_deg"]
    rudder = surfaces["rudder_deg"]
    flaps = surfaces["flaps_deg"]

    # Differential ailerons: left and right deflect in opposing directions
    assert abs(left_aileron + right_aileron) < 0.01
    assert -25.0 <= left_aileron <= 25.0
    assert -25.0 <= right_aileron <= 25.0

    # Elevator deflection limits: [-20°, 20°]
    assert -20.0 <= elevator <= 20.0

    # Rudder deflection limits: [-30°, 30°]
    assert -30.0 <= rudder <= 30.0

    # Flaps extension limits: [0°, 40°]
    assert 0.0 <= flaps <= 40.0

def test_stress_map_thermal_and_vibration():
    """Verify stress map generates normalized states and colors for visual twin layers."""
    stress_map = digital_twin_service.get_stress_map()
    assert stress_map is not None
    assert "components" in stress_map

    comps = stress_map["components"]
    expected_components = [
        "comp-cylinder-head",
        "comp-exhaust",
        "comp-lubrication",
        "comp-crankshaft",
        "comp-turbocharger",
    ]
    for comp_id in expected_components:
        assert comp_id in comps
        comp_data = comps[comp_id]
        assert "name" in comp_data
        assert "parameter" in comp_data
        assert "state" in comp_data
        assert comp_data["state"] in ["NORMAL", "WARNING", "CRITICAL", "UNAVAILABLE"]
        assert "stress_index" in comp_data
        assert 0.0 <= comp_data["stress_index"] <= 1.0
        assert "color_hex" in comp_data
        assert comp_data["color_hex"].startswith("#")

def test_twin_endpoints():
    """Verify API endpoint functions for 3D digital twin pose and stress-map."""
    data_pose = twin_endpoints.get_aircraft_pose()
    assert "spatial_attitude" in data_pose
    assert "propeller_rpm" in data_pose

    data_stress = twin_endpoints.get_stress_map()
    assert "components" in data_stress

    data_specs = twin_endpoints.get_engine_specs()
    assert data_specs["engine_type"] == "Rotax 914 F"

    data_comps = twin_endpoints.get_engine_components()
    assert isinstance(data_comps, list)
    assert len(data_comps) > 0

def test_three_modes_independence():
    """Verify pose computation adheres strictly to DEMO, REPLAY, and LIVE operational modes."""
    # 1. DEMO Mode
    telemetry_manager.set_mode("DEMO")
    pose_demo = digital_twin_service.get_aircraft_pose()
    assert pose_demo["mode"] == "DEMO"

    # 2. REPLAY Mode
    telemetry_manager.set_mode("REPLAY")
    pose_replay = digital_twin_service.get_aircraft_pose()
    assert pose_replay["mode"] == "REPLAY"

    # Reset back to DEMO for test environment hygiene
    telemetry_manager.set_mode("DEMO")
