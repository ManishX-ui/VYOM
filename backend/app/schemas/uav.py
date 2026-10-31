from pydantic import BaseModel, Field
from typing import Optional

class UAVConfigBase(BaseModel):
    name: str = Field(..., description="UAV Name (e.g. TAPAS-BH-201)")
    deviceId: str = Field(..., description="Device serial/identifier")
    engineModel: str = Field(..., description="Engine Model (e.g. Rotax 914 F)")
    engineType: str = Field(..., description="Engine Architecture")
    displacement: str = Field(..., description="Engine displacement")
    maxPower: str = Field(..., description="Max power rating")
    coolingType: str = Field(..., description="Cooling system")
    fuelType: str = Field(..., description="Fuel specifications")
    protocol: str = Field(default="MAVLink 2.0")
    baudRate: int = Field(default=115200)

class UAVConfigCreate(UAVConfigBase):
    pass

class UAVConfigRead(UAVConfigBase):
    id: str
    status: str
    missionName: str
    flightHours: float
    healthScore: float
    lastConnected: str

