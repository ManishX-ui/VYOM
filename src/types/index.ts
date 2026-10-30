export type ConnectionStatus = 'ACTIVE' | 'ONLINE' | 'STANDBY';
export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low' | 'Warning' | 'Info';
export type ComponentStatus = 'Healthy' | 'Monitor' | 'Warning' | 'Critical';
export type AlertStatus = 'Active' | 'Acknowledged' | 'Resolved';

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

export interface SensorRecord {
  id: string;
  name: string;
  code: string;
  category: 'Thermal' | 'Mechanical' | 'Fluid' | 'Electrical';
  value: number;
  unit: string;
  status: 'Online' | 'Warning' | 'Offline';
  lastUpdate: string;
  minNormal: number;
  maxNormal: number;
  dataQuality: number;
  deltaPercent: number;
  trend: { time: string; value: number }[];
  description: string;
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

export interface AlertRecord {
  id: string;
  timestamp: string;
  severity: 'Critical' | 'Warning' | 'Info';
  title: string;
  relatedComponent: string;
  parameter: string;
  currentValue: string;
  expectedRange: string;
  status: AlertStatus;
  description: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolutionNotes?: string;
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
  type: 'start' | 'waypoint' | 'area' | 'segment' | 'manoeuvre' | 'return' | 'completed';
}

export interface ReplayTelemetryPoint {
  time: string;
  lat: number;
  lng: number;
  altitude: number;
  speed: number;
  battery: number;
  heading: number;
  rpm: number;
  cht: number;
  oilPressure: number;
  fuelFlow: number;
  vibration: number;
  segmentType: 'Normal Flight' | 'Surveillance Area' | 'High Altitude' | 'Turn/Manoeuvre' | 'Return';
}

export interface MissionRecord {
  id: string;
  name: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  totalDistanceKm: number;
  maxAltitudeFt: number;
  avgSpeedMs: number;
  status: 'Completed' | 'In-Flight';
  waypoints: MissionWaypoint[];
  timeline: ReplayTelemetryPoint[];
  events: MissionEvent[];
}
