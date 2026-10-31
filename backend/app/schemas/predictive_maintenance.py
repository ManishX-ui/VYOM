"""
Pydantic Schemas for Predictive Maintenance & Remaining Useful Life (RUL) - Phase 9
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ComponentRULDetail(BaseModel):
    component_id: str
    component_name: str
    health_percent: float
    rul_hours: float
    nominal_tbo_hours: float
    uncertainty_hours: float
    status: str  # "Healthy" | "Monitor" | "Warning" | "Critical"
    primary_stress_parameter: str
    degradation_stage: str  # "Nominal" | "Early Wear" | "Accelerated" | "End of Life"

class MaintenanceRecommendation(BaseModel):
    id: str
    uav_id: str
    component: str
    priority: str  # "Low" | "Medium" | "High" | "Critical"
    urgency: str   # "Continue Monitoring" | "Schedule Inspection" | "Maintenance Required Soon" | "Critical Inspection Required"
    reason: str
    relevant_sensors: List[str]
    predicted_rul_hours: Optional[float]
    confidence_percent: float
    recommended_action: str
    created_at: str

class TrendForecastPoint(BaseModel):
    time_offset_hours: float
    label: str
    forecasted_health: float
    upper_bound: float
    lower_bound: float

class DegradationTrendAnalysis(BaseModel):
    horizon_hours: int
    trend_direction: str  # "Stable" | "Gradual Degradation" | "Accelerated Decay"
    forecast_points: List[TrendForecastPoint]
    risk_summary: str

class RULPredictionRequest(BaseModel):
    uav_id: Optional[str] = "UAV-ROTAX-001"
    flight_hours: Optional[float] = 450.0
    flight_cycles: Optional[float] = 136.0
    rpm: Optional[float] = 2450.0
    cht: Optional[float] = 182.0
    egt: Optional[float] = 622.0
    oil_pressure: Optional[float] = 4.25
    oil_temperature: Optional[float] = 95.0
    fuel_flow: Optional[float] = 12.4
    vibration_rms: Optional[float] = 0.28
    map_inhg: Optional[float] = 31.0
    anomaly_score: Optional[float] = 0.15
    operating_mode: Optional[str] = "DEMO"

class RULPredictionResponse(BaseModel):
    uav_id: str
    overall_rul_hours: float
    overall_rul_cycles: float
    uncertainty_hours: float
    confidence_score: float
    overall_health_percent: float
    urgency: str
    is_experimental: bool = True
    model_version: str
    disclaimer: str
    components: List[ComponentRULDetail]
    recommendations: List[MaintenanceRecommendation]

class PredictiveMaintenanceOverview(BaseModel):
    uav_id: str
    flight_hours: float
    overall_rul_hours: float
    uncertainty_hours: float
    overall_health_percent: float
    confidence_score: float
    urgency: str
    is_experimental: bool = True
    model_version: str
    components: List[ComponentRULDetail]
    recommendations: List[MaintenanceRecommendation]
    trend_forecast: DegradationTrendAnalysis
    last_evaluated: str
    data_source: str
    disclaimer: str

class PredictionHistoryRecord(BaseModel):
    id: str
    timestamp: str
    uav_id: str
    flight_hours: float
    predicted_rul: float
    overall_health: float
    urgency: str
    status: str

