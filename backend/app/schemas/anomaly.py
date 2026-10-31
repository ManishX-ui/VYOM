from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class AnomalyDetectRequest(BaseModel):
    rpm: Optional[float] = 2450.0
    cht: Optional[float] = 185.0
    egt: Optional[float] = 618.0
    oilPressure: Optional[float] = 4.25
    oilTemperature: Optional[float] = 95.0
    fuelFlow: Optional[float] = 12.5
    vibrationRMS: Optional[float] = 0.27
    manifoldPressureInHg: Optional[float] = 31.0
    batteryVoltage: Optional[float] = 28.2
    altitudeFt: Optional[float] = 18000.0
    groundSpeedMs: Optional[float] = 32.0
    uav_id: Optional[str] = "UAV-ROTAX-001"
    mission_id: Optional[str] = None
    operating_mode: Optional[str] = "DEMO"

class AnomalyDetectResponse(BaseModel):
    is_anomaly: bool
    anomaly_score: float
    raw_score: float
    severity: str
    threshold: float
    model_version: str
    model_name: str
    timestamp: str
    iso_timestamp: str
    uav_id: str
    mission_id: Optional[str] = None
    data_source: str
    data_quality: str
    missing_sensors: List[str] = []
    affected_parameters: List[str] = []
    primary_parameter: str
    primary_component: str
    primary_deviation: str
    expected_range: str

class AnomalyRecordRead(BaseModel):
    id: str
    uav_id: Optional[str] = "UAV-ROTAX-001"
    mission_id: Optional[str] = None
    parameter: str
    detectedValue: str
    expectedRange: str
    deviation: str
    severity: str
    anomalyScore: Optional[float] = 0.65
    time: str
    timestamp: Optional[str] = None
    status: str
    affectedComponent: str
    affectedParameters: Optional[List[str]] = []
    description: str
    modelVersion: Optional[str] = "v1.2.0-isoforest-rotax"
    dataSource: Optional[str] = "ML_ISOLATION_FOREST"

class AnomalyInvestigateResponse(BaseModel):
    anomaly_id: str
    parameter: Optional[str] = None
    component: Optional[str] = None
    diagnosis: str
    recommended_action: str
    confidence: float
    model_version: Optional[str] = "v1.2.0-isoforest-rotax"
    timestamp: Optional[str] = None

class ModelInfoResponse(BaseModel):
    model_name: str
    model_version: str
    algorithm: str
    is_loaded: bool
    hyperparameters: Dict[str, Any] = {}
    training_samples: int
    training_date: Optional[str] = None
    evaluation_metrics: Dict[str, Any] = {}
    category_detection_rates: Dict[str, Any] = {}
    features_count: int
    monitored_features: List[str] = []
    engineered_features: List[str] = []
