"""
Tests for SQLAlchemy Models and Database Schema Mapping
"""

import pytest
from app.models import (
    Base,
    UAVFleet,
    Telemetry,
    Mission,
    MissionTelemetry,
    Anomaly,
    Alert,
    FaultPrediction,
)

def test_models_table_names():
    assert UAVFleet.__tablename__ == "uav_fleet"
    assert Telemetry.__tablename__ == "telemetry"
    assert Mission.__tablename__ == "missions"
    assert MissionTelemetry.__tablename__ == "mission_telemetry"
    assert Anomaly.__tablename__ == "anomalies"
    assert Alert.__tablename__ == "alerts"
    assert FaultPrediction.__tablename__ == "fault_predictions"

def test_all_tables_in_metadata():
    table_names = set(Base.metadata.tables.keys())
    expected = {
        "uav_fleet",
        "telemetry",
        "missions",
        "mission_telemetry",
        "anomalies",
        "alerts",
        "fault_predictions",
    }
    assert expected.issubset(table_names)

def test_telemetry_columns():
    cols = Telemetry.__table__.columns.keys()
    required_engine_params = [
        "rpm",
        "cht",
        "egt",
        "oil_pressure",
        "oil_temperature",
        "fuel_flow",
        "vibration_rms",
        "injection_timing",
    ]
    for param in required_engine_params:
        assert param in cols, f"Missing core aero parameter: {param}"
    
    assert "mode" in cols
    assert "uav_id" in cols
    assert "timestamp" in cols

def test_uav_fleet_relationships():
    uav = UAVFleet(
        id="UAV-TEST-01",
        callsign="TEST-01",
        model="TAPAS-BH-201",
        engine_type="Rotax 914",
        status="standby",
    )
    assert uav.id == "UAV-TEST-01"
    assert uav.status == "standby"

