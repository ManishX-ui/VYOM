from fastapi import APIRouter
from typing import List
import uuid
from datetime import datetime, timezone
from app.schemas.uav import UAVConfigRead, UAVConfigCreate

router = APIRouter()

UAV_STORAGE = [
    {
        "id": "uav-tapas-01",
        "name": "TAPAS-BH-201 (Rustom-II MALE)",
        "deviceId": "UAV-TP-201-IND",
        "engineModel": "Rotax 914 F Turbocharged (Indigenous FADEC)",
        "engineType": "4-Cylinder, 4-Stroke Boxer with Turbocharger",
        "displacement": "1,211 cc",
        "maxPower": "115 HP @ 5,800 RPM (5 min limit)",
        "coolingType": "Liquid-Cooled Cylinder Heads / Air-Cooled Cylinders",
        "fuelType": "AVGAS 100LL / MOGAS RON 95",
        "lastConnected": "Active Live Telemetry Stream",
        "status": "ACTIVE",
        "missionName": "Northern Tactical Border Surveillance #04",
        "flightHours": 142.6,
        "healthScore": 92,
        "protocol": "MAVLink 2.0 / RS-422 Avionics Bus",
        "baudRate": 115200,
    },
    {
        "id": "uav-rustom-02",
        "name": "RUSTOM-II Reconnaissance Twin-Engine",
        "deviceId": "UAV-RS-102-ADE",
        "engineModel": "Twin Rotax 914 F Turbocharged",
        "engineType": "Twin 4-Cylinder Boxer Engine Setup",
        "displacement": "2 x 1,211 cc",
        "maxPower": "2 x 115 HP (230 HP Total)",
        "coolingType": "Dual Air/Liquid Hybrid Cooling",
        "fuelType": "AVGAS 100LL",
        "lastConnected": "Today, 11:20 UTC (Hangar Standby)",
        "status": "ONLINE",
        "missionName": "Western Maritime Surveillance Prep",
        "flightHours": 88.2,
        "healthScore": 96,
        "protocol": "MIL-STD-1553B / MAVLink",
        "baudRate": 115200,
    },
    {
        "id": "uav-vyom-av01",
        "name": "VYOM-AV01 Autonomous Technology Testbed",
        "deviceId": "UAV-VM-001-TST",
        "engineModel": "Indigenous 100 HP Aero-Piston Prototype",
        "engineType": "4-Cylinder 4-Stroke Direct Injection",
        "displacement": "1,150 cc",
        "maxPower": "100 HP @ 5,500 RPM",
        "coolingType": "Full Liquid Cooled",
        "fuelType": "Heavy Fuel / Jet-A1 Compatible",
        "lastConnected": "Yesterday, 17:45 UTC",
        "status": "STANDBY",
        "missionName": "Engine Health Test Bench Series #12",
        "flightHours": 34.0,
        "healthScore": 98,
        "protocol": "CAN-Aerospace / MAVLink 2.0",
        "baudRate": 57600,
    },
]

@router.get("", response_model=List[UAVConfigRead])
def list_uavs():
    """Retrieve list of all pre-configured and paired demonstration UAVs."""
    return UAV_STORAGE

@router.post("/pair", response_model=UAVConfigRead)
def pair_uav(payload: UAVConfigCreate):
    """Pair a new UAV device to the VYOM monitoring telemetry stream."""
    new_id = f"uav-{uuid.uuid4().hex[:6]}"
    new_uav = {
        **payload.model_dump(),
        "id": new_id,
        "status": "ONLINE",
        "missionName": "Pre-flight Diagnostics",
        "flightHours": 0.0,
        "healthScore": 100.0,
        "lastConnected": f"Just now ({datetime.now(timezone.utc).strftime('%H:%M')} UTC)",
    }
    UAV_STORAGE.append(new_uav)
    return new_uav
