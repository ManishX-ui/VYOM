from fastapi import APIRouter
from typing import List, Dict, Any
from app.services.digital_twin import digital_twin_service, ROTAX_914_SPECS

router = APIRouter()

@router.get("/specs")
def get_engine_specs() -> Dict[str, Any]:
    """Get manufacturer specifications for the Rotax 914 F propulsion platform."""
    return ROTAX_914_SPECS

@router.get("/components")
def get_engine_components() -> List[Dict[str, Any]]:
    """Get health status, operating range, and remaining useful life for all engine components."""
    return digital_twin_service.get_components()

@router.get("/components/{component_id}")
def get_component_detail(component_id: str) -> Dict[str, Any]:
    """Get detailed telemetry diagnostics for a specific engine component."""
    return digital_twin_service.get_component_by_id(component_id)

@router.get("/operating-envelope")
def get_operating_envelope() -> List[Dict[str, Any]]:
    """Retrieve Power vs. RPM, MAP, and brake specific fuel consumption curve points."""
    return digital_twin_service.get_envelope()

@router.get("/calculate-bmep")
def calculate_bmep(power_hp: float = 100.0, rpm: int = 5000) -> Dict[str, Any]:
    """Calculate Brake Mean Effective Pressure (BMEP) for given engine operating parameters."""
    bmep = digital_twin_service.calculate_bmep(power_hp, rpm)
    return {"power_hp": power_hp, "rpm": rpm, "bmep_bar": bmep}

@router.get("/pose")
def get_aircraft_pose(uav_id: str = None) -> Dict[str, Any]:
    """Retrieve real-time 3D aircraft attitude, Euler angles, propeller kinematics, and actuator deflections."""
    return digital_twin_service.get_aircraft_pose(uav_id=uav_id)

@router.get("/stress-map")
def get_stress_map(uav_id: str = None) -> Dict[str, Any]:
    """Retrieve thermal, pressure, and vibration stress indicators for interactive 3D color mapping."""
    return digital_twin_service.get_stress_map(uav_id=uav_id)

