from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class Waypoint(BaseModel):
    lat: float
    lng: float
    alt: float
    label: Optional[str] = None
    type: Optional[str] = "waypoint"

class ReplayPoint(BaseModel):
    time: str
    timestamp: Optional[str] = None
    lat: float
    lng: float
    altitude: float
    speed: float
    battery: float
    heading: float
    rpm: int
    cht: float
    egt: Optional[float] = 620.0
    oilPressure: float
    oilTemperature: Optional[float] = 95.0
    fuelFlow: float
    vibration: float
    manifoldPressureInHg: Optional[float] = 31.0
    batteryVoltage: Optional[float] = 28.2
    batteryCurrent: Optional[float] = 14.5
    engineHealth: Optional[float] = 95.0
    roll: Optional[float] = 0.0
    pitch: Optional[float] = 0.0
    verticalSpeed: Optional[float] = 0.0
    coolantTemp: Optional[float] = 88.0
    fuelPressure: Optional[float] = 3.2
    segmentType: str

class MissionEvent(BaseModel):
    time: str
    title: str
    coordinates: str
    type: str
    description: Optional[str] = None
    associatedTelemetry: Optional[Dict[str, Any]] = None

class MissionAnalyticsSummary(BaseModel):
    totalDistanceKm: float
    duration: str
    maxAltitudeFt: float
    avgSpeedMs: float
    maxSpeedMs: float
    fuelUsedLiters: float
    sensorWarningsCount: int
    anomalyCount: int
    engineHealthTrend: Optional[str] = "Nominal"

class MissionRecordRead(BaseModel):
    id: str
    uav_id: Optional[str] = "UAV-ROTAX-001"
    name: str
    type: str
    date: str
    startTime: str
    endTime: str
    duration: str
    totalDistanceKm: float
    maxAltitudeFt: float
    avgSpeedMs: float
    maxSpeedMs: Optional[float] = 38.5
    status: str
    telemetryAvailable: Optional[bool] = True
    dataSource: Optional[str] = "FLIGHT_LOG_ARCHIVE"
    fuelUsedLiters: Optional[float] = 32.5
    sensorWarningsCount: Optional[int] = 0
    anomalyCount: Optional[int] = 0
    waypoints: List[Waypoint] = []
    timeline: List[ReplayPoint] = []
    events: List[MissionEvent] = []
    summary: Optional[Dict[str, Any]] = None


