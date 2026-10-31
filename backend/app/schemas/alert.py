"""
Pydantic Schemas for Alert Management & Real-Time Notification Queue - Phase 10
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class AuditTrailItem(BaseModel):
    action: str  # "CREATED" | "ACKNOWLEDGED" | "INVESTIGATING" | "RESOLVED" | "DISMISSED" | "ESCALATED"
    performed_by: str
    timestamp: str
    notes: Optional[str] = None

class AlertRecordBase(BaseModel):
    title: str
    description: str
    severity: str  # "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL" (also accepts "Critical", "Warning", "Info")
    status: str    # "NEW" | "ACKNOWLEDGED" | "INVESTIGATING" | "RESOLVED" | "DISMISSED" (also accepts "Active")
    source_module: str = "ENGINE_HEALTH"  # "ML_ANOMALY" | "PREDICTIVE_MAINTENANCE" | "ENGINE_HEALTH" | "SENSOR_MONITORING" | "DATALINK" | "MISSION"
    uav_id: str = "UAV-ROTAX-001"
    component: str = "Rotax 914 F Core Subsystem"
    # Legacy / UI Compatibility Fields
    relatedComponent: str = "Rotax 914 F Core Subsystem"
    parameter: str = "General"
    currentValue: str = "Nominal"
    expectedRange: str = "In Specification"
    timestamp: str

class AlertCreateRequest(AlertRecordBase):
    sensor_values: Optional[Dict[str, Any]] = None
    possible_cause: Optional[str] = None
    recommended_action: Optional[str] = None

class AlertAcknowledgeRequest(BaseModel):
    acknowledged_by: str = Field(..., description="Name or callsign of acknowledging operator")

class AlertInvestigateRequest(BaseModel):
    investigated_by: str = Field(..., description="Name or callsign of investigating engineer")
    investigation_notes: Optional[str] = Field(None, description="Diagnostic analysis or triage notes")

class AlertResolveRequest(BaseModel):
    resolved_by: Optional[str] = Field("Mission Commander", description="Operator resolving the alert")
    resolution_notes: str = Field(..., description="Engineering rationale for resolving the alert")

class AlertDismissRequest(BaseModel):
    dismissed_by: str = Field(..., description="Operator dismissing informational alert")
    reason: Optional[str] = Field("Acknowledged informational event", description="Reason for dismissal")

class AlertRecordRead(AlertRecordBase):
    id: str
    sensor_values: Optional[Dict[str, Any]] = None
    possible_cause: Optional[str] = None
    recommended_action: Optional[str] = None
    acknowledged: bool = False
    acknowledgedBy: Optional[str] = None
    acknowledgedAt: Optional[str] = None
    investigatedBy: Optional[str] = None
    investigatedAt: Optional[str] = None
    resolvedBy: Optional[str] = None
    resolvedAt: Optional[str] = None
    resolutionNotes: Optional[str] = None
    audit_trail: List[AuditTrailItem] = []
    is_escalated: bool = False

class AlertSummaryResponse(BaseModel):
    total_alerts: int
    active_unresolved: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    info_count: int
    acknowledged_count: int
    investigating_count: int
    resolved_count: int
    dismissed_count: int
    last_alert_time: Optional[str] = None

class NotificationItem(BaseModel):
    id: str
    alert_id: str
    title: str
    message: str
    severity: str
    uav_id: str
    timestamp: str
    read: bool = False
