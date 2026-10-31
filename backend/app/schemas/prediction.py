from pydantic import BaseModel, Field
from typing import List

class FaultPredictionItem(BaseModel):
    faultName: str
    probabilityPercent: float
    severity: str
    affectedComponent: str

class ComponentRUL(BaseModel):
    component: str
    rulHours: float
    nominalHours: float
    status: str

class ContributingFactor(BaseModel):
    parameter: str
    impactPercent: float
    trend: str

class SensorRangeComparison(BaseModel):
    parameter: str
    currentValue: str
    normalRange: str
    status: str
    riskContribution: float

class PredictionOverviewResponse(BaseModel):
    predictionHorizonHours: int
    overallHealthPercent: float
    confidenceScore: float
    primaryRisk: str
    faultRiskSummary: str
    predictedFaults: List[FaultPredictionItem]
    componentRUL: List[ComponentRUL]
    contributingFactors: List[ContributingFactor]
    sensorAudits: List[SensorRangeComparison]

