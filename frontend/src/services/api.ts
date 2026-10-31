/**
 * VYOM Platform REST API Service
 * Handles communication with the FastAPI backend at http://localhost:8000
 */

import {
  EngineTelemetry,
  EngineComponent,
  SensorRecord,
  AnomalyRecord,
  AlertRecord,
  AlertSummary,
  NotificationItem,
  UAVConfig,
  MissionRecord,
  MLModelInfo,
  PredictiveMaintenanceOverview,
  MaintenanceRecommendationItem,
  ComponentRULDetail,
  DatalinkConnection,
  DatalinkMetrics,
  DatalinkTestResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL.replace(/\/$/, '');
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options?.headers || {}),
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  // Health check
  async checkHealth(): Promise<{ status: string; service: string; version: string }> {
    return this.request('/api/v1/health');
  }

  // Telemetry APIs
  async getLiveTelemetry(): Promise<EngineTelemetry> {
    return this.request('/api/v1/telemetry/live');
  }

  async getTelemetryHistory(range = '15m', uavId?: string): Promise<any[]> {
    const params = new URLSearchParams({ range });
    if (uavId) params.append('uav_id', uavId);
    return this.request(`/api/v1/telemetry/history?${params.toString()}`);
  }

  // Digital Twin APIs
  async getTwinComponents(): Promise<EngineComponent[]> {
    return this.request('/api/v1/twin/components');
  }

  async getOperatingEnvelope(): Promise<any[]> {
    return this.request('/api/v1/twin/operating-envelope');
  }

  async getAircraftPose(uavId?: string): Promise<any> {
    const qs = uavId ? `?uav_id=${uavId}` : '';
    return this.request(`/api/v1/twin/pose${qs}`);
  }

  async getStressMap(uavId?: string): Promise<any> {
    const qs = uavId ? `?uav_id=${uavId}` : '';
    return this.request(`/api/v1/twin/stress-map${qs}`);
  }

  // Telemetry Control API
  async controlTelemetry(payload: { mode?: string; scenario?: string; uav_id?: string; jitter_factor?: number }): Promise<any> {
    return this.request('/api/v1/telemetry/control', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Sensors & Anomalies
  async getSensors(uavId?: string): Promise<SensorRecord[]> {
    const params = new URLSearchParams();
    if (uavId) params.append('uav_id', uavId);
    return this.request(`/api/v1/sensors${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async getSensorDetail(sensorId: string): Promise<SensorRecord> {
    return this.request(`/api/v1/sensors/${sensorId}`);
  }

  async getSensorHistory(sensorId: string, range = '15m'): Promise<{
    sensor_id: string;
    sensor_name: string;
    unit: string;
    range: string;
    mode: string;
    is_connected: boolean;
    points: { time: string; timestamp: string; value: number | null; raw_value: number | null }[];
  }> {
    return this.request(`/api/v1/sensors/${sensorId}/history?range=${range}`);
  }

  async calibrateSensor(
    sensorId: string,
    payload: { reference_value: number; measured_value: number; technician?: string; notes?: string }
  ): Promise<any> {
    return this.request(`/api/v1/sensors/${sensorId}/calibrate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async resetSensorCalibration(sensorId: string): Promise<any> {
    return this.request(`/api/v1/sensors/${sensorId}/reset-calibration`, {
      method: 'POST',
    });
  }

  async updateSensorThresholds(sensorId: string, thresholds: Record<string, number>): Promise<any> {
    return this.request(`/api/v1/sensors/${sensorId}/thresholds`, {
      method: 'POST',
      body: JSON.stringify(thresholds),
    });
  }

  async getAnomalies(uavId?: string, severity?: string, status?: string): Promise<AnomalyRecord[]> {
    const params = new URLSearchParams();
    if (uavId) params.append('uav_id', uavId);
    if (severity && severity !== 'All') params.append('severity', severity);
    if (status && status !== 'All') params.append('status', status);
    const qs = params.toString();
    return this.request(`/api/v1/anomalies${qs ? `?${qs}` : ''}`);
  }

  async getModelInfo(): Promise<MLModelInfo> {
    return this.request('/api/v1/anomalies/model-info');
  }

  async detectAnomaly(telemetry: Partial<EngineTelemetry>): Promise<{
    is_anomaly: boolean;
    anomaly_score: number;
    raw_score: number;
    severity: string;
    threshold: number;
    model_version: string;
    affected_parameters: string[];
    primary_parameter: string;
    primary_component: string;
  }> {
    return this.request('/api/v1/anomalies/detect', {
      method: 'POST',
      body: JSON.stringify(telemetry),
    });
  }

  async investigateAnomaly(anomalyId: string): Promise<any> {
    return this.request(`/api/v1/anomalies/${anomalyId}/investigate`, {
      method: 'POST',
    });
  }

  // Fault Predictions (Legacy & Backwards-Compatible)
  async getPredictions(horizonHours = 24): Promise<any> {
    return this.request(`/api/v1/predictions?horizon_hours=${horizonHours}`);
  }

  // Predictive Maintenance & RUL (Phase 9)
  async getPredictiveMaintenanceOverview(horizonHours = 50, uavId?: string): Promise<PredictiveMaintenanceOverview> {
    const params = new URLSearchParams();
    params.append('horizon_hours', horizonHours.toString());
    if (uavId) params.append('uav_id', uavId);
    return this.request(`/api/v1/predictive-maintenance/overview?${params.toString()}`);
  }

  async getRULPrediction(uavId?: string): Promise<any> {
    const qs = uavId ? `?uav_id=${uavId}` : '';
    return this.request(`/api/v1/predictive-maintenance/rul${qs}`);
  }

  async getMaintenanceRecommendations(uavId?: string): Promise<MaintenanceRecommendationItem[]> {
    const qs = uavId ? `?uav_id=${uavId}` : '';
    return this.request(`/api/v1/predictive-maintenance/recommendations${qs}`);
  }

  async getPredictionHistory(uavId?: string): Promise<any[]> {
    const qs = uavId ? `?uav_id=${uavId}` : '';
    return this.request(`/api/v1/predictive-maintenance/history${qs}`);
  }

  async predictCustomTelemetry(payload: any): Promise<any> {
    return this.request('/api/v1/predictive-maintenance/predict', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Alerts & Notifications
  async getAlerts(uavId?: string, status?: string): Promise<AlertRecord[]> {
    const q = new URLSearchParams();
    if (uavId) q.append('uav_id', uavId);
    if (status && status !== 'All') q.append('status', status);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/api/v1/alerts${qs}`);
  }

  async getAlertsSummary(uavId?: string): Promise<AlertSummary> {
    const qs = uavId ? `?uav_id=${uavId}` : '';
    return this.request(`/api/v1/alerts/summary${qs}`);
  }

  async getAlertById(alertId: string): Promise<AlertRecord> {
    return this.request(`/api/v1/alerts/${alertId}`);
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<AlertRecord> {
    return this.request(`/api/v1/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ acknowledged_by: acknowledgedBy }),
    });
  }

  async investigateAlert(alertId: string, operator: string, notes?: string): Promise<AlertRecord> {
    return this.request(`/api/v1/alerts/${alertId}/investigate`, {
      method: 'POST',
      body: JSON.stringify({ operator, notes: notes || '' }),
    });
  }

  async resolveAlert(alertId: string, resolutionNotes: string, resolvedBy?: string): Promise<AlertRecord> {
    return this.request(`/api/v1/alerts/${alertId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({
        resolution_notes: resolutionNotes,
        resolved_by: resolvedBy || 'Flight Engineer',
      }),
    });
  }

  async dismissAlert(alertId: string, operator: string, reason: string): Promise<AlertRecord> {
    return this.request(`/api/v1/alerts/${alertId}/dismiss`, {
      method: 'POST',
      body: JSON.stringify({ operator, reason }),
    });
  }

  async getAlertsHistory(uavId?: string): Promise<any[]> {
    const qs = uavId ? `?uav_id=${uavId}` : '';
    return this.request(`/api/v1/alerts/history${qs}`);
  }

  async getNotifications(params?: { uavId?: string; unreadOnly?: boolean; limit?: number }): Promise<NotificationItem[]> {
    const q = new URLSearchParams();
    if (params?.uavId) q.append('uav_id', params.uavId);
    if (params?.unreadOnly !== undefined) q.append('unread_only', String(params.unreadOnly));
    if (params?.limit) q.append('limit', String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/api/v1/notifications${qs}`);
  }

  async markNotificationRead(notificationId: string): Promise<any> {
    return this.request(`/api/v1/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  }

  // Missions & Tracking
  async getMissions(params?: { uav_id?: string; status?: string; search?: string }): Promise<MissionRecord[]> {
    const q = new URLSearchParams();
    if (params?.uav_id) q.append('uav_id', params.uav_id);
    if (params?.status && params.status !== 'All') q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    const queryString = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/api/v1/missions${queryString}`);
  }

  async getMissionById(missionId: string): Promise<MissionRecord> {
    return this.request(`/api/v1/missions/${missionId}`);
  }

  async getMissionAnalytics(missionId: string): Promise<any> {
    return this.request(`/api/v1/missions/${missionId}/analytics`);
  }

  // UAV Management
  async getUAVs(): Promise<UAVConfig[]> {
    return this.request('/api/v1/uavs');
  }

  async pairUAV(uavData: Partial<UAVConfig>): Promise<UAVConfig> {
    return this.request('/api/v1/uavs/pair', {
      method: 'POST',
      body: JSON.stringify(uavData),
    });
  }

  // GCS Datalink Integration (Phase 11)
  async getDatalinkStatus(): Promise<any> {
    return this.request('/api/v1/datalink/status');
  }

  async getDatalinkConnections(): Promise<DatalinkConnection[]> {
    return this.request('/api/v1/datalink/connections');
  }

  async getDatalinkConnectionByUav(uavId: string): Promise<DatalinkConnection> {
    return this.request(`/api/v1/datalink/connections/${uavId}`);
  }

  async connectMAVLink(config: any): Promise<DatalinkConnection> {
    return this.request('/api/v1/datalink/connections/mavlink', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async connectMQTT(config: any): Promise<DatalinkConnection> {
    return this.request('/api/v1/datalink/connections/mqtt', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async disconnectDatalink(connectionId: string): Promise<any> {
    return this.request(`/api/v1/datalink/connections/${connectionId}`, {
      method: 'DELETE',
    });
  }

  async getDatalinkMetrics(): Promise<DatalinkMetrics> {
    return this.request('/api/v1/datalink/metrics');
  }

  async testDatalink(scenario: string, uavId?: string, protocol?: string): Promise<DatalinkTestResponse> {
    return this.request('/api/v1/datalink/test', {
      method: 'POST',
      body: JSON.stringify({
        scenario,
        uav_id: uavId || 'UAV-MALE-IND-01',
        protocol: protocol || 'MAVLINK',
      }),
    });
  }
}

export const apiService = new ApiService();

