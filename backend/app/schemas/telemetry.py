"""
Pydantic Schemas for Multi-Mode Aero Piston Engine Telemetry
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class EngineTelemetryBase(BaseModel):
    # Core Identification & Mode
    uav_id: str = Field(default="UAV-MALE-IND-01", description="Unique airframe identifier")
    mode: str = Field(default="DEMO", description="Operating mode: DEMO, REPLAY, or LIVE")
    is_simulated: bool = Field(default=True, description="Synthetic vs. hardware datalink flag")
    timestamp: str = Field(..., description="Sample timestamp in ISO 8601 or HH:MM:SS format")

    # 8 Core Aero Engine Parameters
    rpm: int = Field(..., description="Engine rotational speed in RPM (Nominal: 2400-2480)")
    cht: float = Field(..., description="Cylinder Head Temperature in °C (Nominal: 160-205)")
    egt: float = Field(..., description="Exhaust Gas Temperature in °C (Nominal: 580-680)")
    oilPressure: float = Field(..., description="Engine oil pressure in bar (Nominal: 3.8-4.6)")
    oilTemperature: float = Field(..., description="Engine oil temperature in °C (Nominal: 85-105)")
    fuelFlow: float = Field(..., description="Instantaneous fuel flow in L/hr (Nominal: 11.5-14.0)")
    vibrationRMS: float = Field(..., description="Crankcase RMS vibration in g (Nominal: 0.22-0.32)")
    injectionTiming: float = Field(..., description="ECU fuel injection timing in ° BTDC (Nominal: 24.0-28.0)")

    # Secondary Parameters & Avionics
    manifoldPressureInHg: Optional[float] = Field(default=31.2, description="Manifold Absolute Pressure in inHg")
    coolantTemp: Optional[float] = Field(default=88.5, description="Cylinder liquid coolant temp in °C")
    fuelPressure: Optional[float] = Field(default=3.2, description="Fuel injection rail pressure in bar")
    batteryVoltage: Optional[float] = Field(default=28.2, description="Avionics bus DC voltage (28V bus)")
    batteryCurrent: Optional[float] = Field(default=14.8, description="Alternator current in Amperes")
    batterySoc: Optional[float] = Field(default=96.0, description="Battery State of Charge percentage")
    engineHealth: float = Field(default=94.0, description="Overall calculated engine health score (0-100%)")

    # Spatial / Flight Telemetry
    latitude: Optional[float] = Field(default=21.42, description="GPS Latitude in WGS84 decimal degrees")
    longitude: Optional[float] = Field(default=81.68, description="GPS Longitude in WGS84 decimal degrees")
    altitudeFt: Optional[float] = Field(default=18000.0, description="Altitude in feet MSL")
    groundSpeedMs: Optional[float] = Field(default=32.4, description="Ground track speed in m/s")
    headingDeg: Optional[float] = Field(default=139.0, description="Magnetic heading in degrees (0-359)")
    rollDeg: Optional[float] = Field(default=0.0, description="Roll attitude angle in degrees")
    pitchDeg: Optional[float] = Field(default=2.5, description="Pitch attitude angle in degrees")
    verticalSpeedMs: Optional[float] = Field(default=0.0, description="Rate of climb/descent in m/s")

class EngineTelemetryRead(EngineTelemetryBase):
    pass

class TelemetryControlRequest(BaseModel):
    mode: Optional[str] = Field(None, description="Set active mode: DEMO, REPLAY, or LIVE")
    scenario: Optional[str] = Field(None, description="Set simulation scenario: NORMAL_CRUISE, HIGH_ALTITUDE_CLIMB, CHT_OVERHEAT, OIL_PRESSURE_DROP, DESCENT_IDLE")
    uav_id: Optional[str] = Field(None, description="Select target UAV ID from fleet")
    jitter_factor: Optional[float] = Field(1.0, description="Jitter intensity scalar (0.0 to 2.0)")

class TelemetryStatusResponse(BaseModel):
    mode: str
    scenario: str
    uav_id: str
    is_live_connected: bool
    live_datalink_carrier_lock: bool
    connected_clients: int
    last_telemetry_timestamp: Optional[str]
    sample_rate_hz: float
