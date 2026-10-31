export type ConnectionStatus = 'ACTIVE' | 'ONLINE' | 'STANDBY';
export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low' | 'Warning' | 'Info';
export type ComponentStatus = 'Healthy' | 'Monitor' | 'Warning' | 'Critical';
export type AlertStatus = 'Active' | 'Acknowledged' | 'Investigating' | 'Resolved' | 'Dismissed';

export interface UAVConfig {
  id: string;
  name: string;
  deviceId: string;
  engineModel: string;
  engineType: string;
  displacement: string;
  maxPower: string;
  coolingType: string;
  fuelType: string;
  lastConnected: string;
  status: ConnectionStatus;
  missionName: string;
  flightHours: number;
  healthScore: number;
  protocol: string;
  baudRate: number;
}

export interface EngineTelemetry {
  rpm: number; // RPM
  cht: number; // °C (Cylinder Head Temperature)
  egt: number; // °C (Exhaust Gas Temperature)
  oilPressure: number; // bar
  oilTemperature: number; // °C
  fuelFlow: number; // L/hr
  vibrationRMS: number; // g
  injectionTiming: number; // ° BTDC
  engineHealth: number; // %
  timestamp: string;
  // Multi-mode & Centralized Telemetry Extensions
  uav_id?: string;
  mode?: 'DEMO' | 'REPLAY' | 'LIVE';
  is_simulated?: boolean;
  latitude?: number;
  longitude?: number;
  altitudeFt?: number;
  groundSpeedMs?: number;
  headingDeg?: number;
  rollDeg?: number;
  pitchDeg?: number;
  verticalSpeedMs?: number;
  manifoldPressureInHg?: number;
  coolantTemp?: number;
  fuelPressure?: number;
  batteryVoltage?: number;
  batteryCurrent?: number;
  batterySoc?: number;
  datalink_status?: string;
  datalink_message?: string;
  // Phase 8 ML Anomaly Fields
  anomaly_score?: number;
  is_anomaly?: boolean;
  anomaly_severity?: string;
  affected_parameters?: string[];
  primary_component?: string;
}

export interface MLModelInfo {
  model_name: string;
  algorithm: string;
  model_version: string;
  is_loaded: boolean;
  features_count: number;
  monitored_features: string[];
  engineered_features: string[];
  training_samples: number;
  anomaly_threshold: number;
  evaluation_metrics: {
    precision: number;
    recall: number;
    f1_score: number;
    roc_auc: number;
  };
}

export interface EngineComponent {
  id: string;
  name: string;
  healthPercentage: number;
  status: ComponentStatus;
  currentReading: string;
  operatingRange: string;
  alertsCount: number;
  estimatedRULHours: number;
  description: string;
  category: string;
}

export type SensorStatus =
  | 'NORMAL'
  | 'WARNING'
  | 'CRITICAL'
  | 'OFFLINE'
  | 'STALE'
  | 'CALIBRATION_REQUIRED'
  | 'Online'
  | 'Warning'
  | 'Offline';

export interface CalibrationHistoryItem {
  date: string;
  technician: string;
  reference_value?: number;
  measured_value?: number;
  offset: number;
  scale: number;
  result: string;
  notes?: string;
}

export interface CalibrationData {
  sensor_id: string;
  sensor_name: string;
  status: string;
  scale: number;
  offset: number;
  last_calibration_date: string;
  reference_value?: number;
  measured_value?: number;
  calibration_result?: string;
  notes?: string;
  history?: CalibrationHistoryItem[];
}

export interface SensorRecord {
  id: string;
  name: string;
  code: string;
  category: 'Engine' | 'Flight' | 'Electrical' | 'Thermal' | 'Mechanical' | 'Fluid';
  value: number | null;
  raw_value?: number | null;
  calibrated_value?: number | null;
  unit: string;
  status: SensorStatus;
  lastUpdate: string;
  uavId?: string;
  operatingMode?: string;
  minNormal: number;
  maxNormal: number;
  minWarning?: number;
  maxWarning?: number;
  minCritical?: number;
  maxCritical?: number;
  dataQuality: number;
  deltaPercent: number;
  trend?: { time: string; value: number }[];
  description: string;
  diagnosticMessage?: string;
  calibrationSummary?: {
    status: string;
    scale: number;
    offset: number;
    lastCalibrated?: string;
  };
  calibrationDetails?: CalibrationData;
}

export interface AnomalyRecord {
  id: string;
  parameter: string;
  detectedValue: string;
  expectedRange: string;
  deviation: string;
  severity: 'High' | 'Medium' | 'Low';
  time: string;
  status: 'Active' | 'Investigating' | 'Resolved';
  affectedComponent: string;
  description: string;
}

export interface FaultPredictionItem {
  faultName: string;
  probabilityPercent: number;
  severity: 'Low' | 'Medium' | 'High';
  affectedComponent: string;
}

export interface ComponentRUL {
  component: string;
  rulHours: number;
  nominalHours: number;
  status: 'Healthy' | 'Monitor' | 'Critical';
}

export interface SensorRangeComparison {
  parameter: string;
  currentValue: string;
  normalRange: string;
  status: 'Normal' | 'High' | 'Low';
  riskContribution: number;
}

export interface ComponentRULDetail {
  component_id: string;
  component_name: string;
  health_percent: number;
  rul_hours: number;
  nominal_tbo_hours: number;
  uncertainty_hours: number;
  status: 'Healthy' | 'Monitor' | 'Warning' | 'Critical' | string;
  primary_stress_parameter: string;
  degradation_stage: string;
}

export interface MaintenanceRecommendationItem {
  id: string;
  uav_id: string;
  component: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  urgency: string;
  reason: string;
  relevant_sensors: string[];
  predicted_rul_hours?: number;
  confidence_percent: number;
  recommended_action: string;
  created_at: string;
}

export interface TrendForecastPoint {
  time_offset_hours: number;
  label: string;
  forecasted_health: number;
  upper_bound: number;
  lower_bound: number;
}

export interface DegradationTrendAnalysis {
  horizon_hours: number;
  trend_direction: string;
  forecast_points: TrendForecastPoint[];
  risk_summary: string;
}

export interface PredictiveMaintenanceOverview {
  uav_id: string;
  flight_hours: number;
  overall_rul_hours: number;
  uncertainty_hours: number;
  overall_health_percent: number;
  confidence_score: number;
  urgency: string;
  is_experimental: boolean;
  model_version: string;
  components: ComponentRULDetail[];
  recommendations: MaintenanceRecommendationItem[];
  trend_forecast: DegradationTrendAnalysis;
  last_evaluated: string;
  data_source: string;
  disclaimer: string;
}

export interface AuditTrailItem {
  timestamp: string;
  action: string;
  actor: string;
  details?: string;
}

export interface NotificationItem {
  id: string;
  uav_id: string;
  alert_id?: string;
  title: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL' | string;
  source_module: string;
  timestamp: string;
  read: boolean;
}

export interface AlertSummary {
  total_alerts: number;
  active_count: number;
  acknowledged_count: number;
  investigating_count: number;
  resolved_count: number;
  dismissed_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
}

export interface AlertRecord {
  id: string;
  timestamp: string;
  severity: 'Critical' | 'Warning' | 'Info' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
  title: string;
  relatedComponent: string;
  parameter: string;
  currentValue: string;
  expectedRange: string;
  status: AlertStatus | string;
  description: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  investigatedBy?: string;
  investigatedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  dismissedBy?: string;
  dismissedAt?: string;
  dismissalReason?: string;
  source_module?: string;
  uav_id?: string;
  possible_cause?: string;
  recommended_action?: string;
  audit_trail?: AuditTrailItem[];
}

export interface MissionWaypoint {
  lat: number;
  lng: number;
  alt: number;
  label?: string;
  type?: 'start' | 'waypoint' | 'surveillance' | 'end';
}

export interface MissionEvent {
  time: string;
  title: string;
  coordinates: string;
  type: 'start' | 'waypoint' | 'area' | 'segment' | 'manoeuvre' | 'return' | 'completed' | 'warning' | 'anomaly';
  description?: string;
  associatedTelemetry?: Partial<ReplayTelemetryPoint>;
}

export interface ReplayTelemetryPoint {
  time: string;
  timestamp?: string;
  lat: number;
  lng: number;
  altitude: number;
  speed: number;
  battery: number;
  heading: number;
  rpm: number;
  cht: number;
  egt?: number;
  oilPressure: number;
  oilTemperature?: number;
  fuelFlow: number;
  vibration: number;
  manifoldPressureInHg?: number;
  batteryVoltage?: number;
  batteryCurrent?: number;
  engineHealth?: number;
  roll?: number;
  pitch?: number;
  verticalSpeed?: number;
  coolantTemp?: number;
  fuelPressure?: number;
  segmentType: 'Normal Flight' | 'Surveillance Area' | 'High Altitude' | 'Turn/Manoeuvre' | 'Return';
}

export interface MissionRecord {
  id: string;
  uavId?: string;
  name: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  totalDistanceKm: number;
  maxAltitudeFt: number;
  avgSpeedMs: number;
  maxSpeedMs?: number;
  status: 'Completed' | 'In-Flight' | 'Scheduled';
  telemetryAvailable?: boolean;
  dataSource?: string;
  fuelUsedLiters?: number;
  sensorWarningsCount?: number;
  anomalyCount?: number;
  summary?: {
    totalDistanceKm: number;
    duration: string;
    maxAltitudeFt: number;
    avgSpeedMs: number;
    maxSpeedMs: number;
    fuelUsedLiters: number;
    sensorWarningsCount: number;
    anomalyCount: number;
    engineHealthTrend?: string;
  };
  waypoints: MissionWaypoint[];
  timeline: ReplayTelemetryPoint[];
  events: MissionEvent[];
}

export type DatalinkProtocol = 'MAVLINK' | 'MQTT';
export type DatalinkStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'DEGRADED' | 'ERROR';

export interface DatalinkConnection {
  connection_id: string;
  uav_id: string;
  protocol: DatalinkProtocol;
  status: DatalinkStatus;
  endpoint: string;
  connected_at?: string;
  last_packet_time?: string;
  packets_received: number;
  packets_rejected: number;
  latency_ms?: number;
  uptime_seconds: number;
  error_message?: string;
  is_active: boolean;
  details?: Record<string, any>;
}

export interface DatalinkMetrics {
  total_connections: number;
  active_connections: number;
  total_packets_received: number;
  total_packets_rejected: number;
  average_latency_ms?: number;
  rejection_reasons_breakdown: Record<string, number>;
  connections: DatalinkConnection[];
}

export interface DatalinkTestResponse {
  success: boolean;
  scenario: string;
  protocol: string;
  uav_id: string;
  packets_dispatched: number;
  message: string;
  snapshot_sample?: Record<string, any>;
}


