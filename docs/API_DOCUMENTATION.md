# VYOM REST & WebSocket API Specification

**Service Name:** VYOM — Aero Piston Engine Digital Twin Backend  
**Version:** 3.0.0  
**Base URL:** `http://localhost:8000/api/v1`  
**WebSocket URL:** `ws://localhost:8000/api/v1/telemetry/ws`  
**Documentation:** Swagger UI at `/docs`, ReDoc at `/redoc`  

---

## 1. System Health

### `GET /api/v1/health`
Checks backend responsiveness and operational version.

**Response `200 OK`:**
```json
{
  "status": "healthy",
  "service": "VYOM Aero Digital Twin Backend",
  "version": "2.4.0"
}
```

---

## 2. Centralized Telemetry Engine (Phase 3)

### `GET /api/v1/telemetry/live`
Retrieve the latest real-time engine and flight telemetry snapshot from the centralized manager.

**Response `200 OK`:**
```json
{
  "uav_id": "UAV-MALE-IND-01",
  "mode": "DEMO",
  "is_simulated": true,
  "timestamp": "14:28:43",
  "iso_timestamp": "2026-10-31T14:28:43.120Z",
  "rpm": 2450,
  "cht": 187.0,
  "egt": 620.0,
  "oilPressure": 4.20,
  "oilTemperature": 96.0,
  "fuelFlow": 12.5,
  "vibrationRMS": 0.28,
  "injectionTiming": 26.5,
  "manifoldPressureInHg": 31.2,
  "coolantTemp": 87.8,
  "fuelPressure": 3.2,
  "batteryVoltage": 28.2,
  "batteryCurrent": 14.8,
  "batterySoc": 96.0,
  "engineHealth": 94.0,
  "latitude": 21.4201,
  "longitude": 81.6805,
  "altitudeFt": 18000.0,
  "groundSpeedMs": 32.4,
  "headingDeg": 139,
  "rollDeg": 1.2,
  "pitchDeg": 2.2,
  "verticalSpeedMs": 0.0
}
```

### `GET /api/v1/telemetry/history`
Retrieve downsampled historical telemetry for graph visualization across discrete mission time horizons (`1m`, `5m`, `15m`, `1h`, `6h`, `24h`). Strictly respects operating mode isolation: returns downsampled buffer for LIVE (empty if hardware is disconnected), historical points for REPLAY, and mathematically correlated thermodynamic points for DEMO.

**Query Parameters:**
* `range` (string, optional, default: `"15m"`): Supported values: `1m`, `5m`, `15m`, `1h`, `6h`, `24h`.
* `uav_id` (string, optional): UAV identification string (e.g. `UAV-MALE-IND-01`).

**Response `200 OK`:**
```json
[
  {
    "time": "14:15",
    "timestamp": "14:15",
    "rpm": 2450,
    "cht": 187.0,
    "egt": 620.0,
    "oilPressure": 4.20,
    "oilTemperature": 96.0,
    "fuelFlow": 12.5,
    "vibrationRMS": 0.28,
    "injectionTiming": 26.5,
    "manifoldPressureInHg": 31.2,
    "engineHealth": 94.0
  }
]
```

### `GET /api/v1/telemetry/status`
Returns the status of the centralized telemetry manager, active mode, active simulation scenario, connected client count, and hardware datalink carrier status.

**Response `200 OK`:**
```json
{
  "mode": "DEMO",
  "scenario": "NORMAL_CRUISE",
  "uav_id": "UAV-MALE-IND-01",
  "is_live_connected": false,
  "live_datalink_carrier_lock": false,
  "connected_clients": 1,
  "last_telemetry_timestamp": "14:28:43",
  "sample_rate_hz": 1.0
}
```

### `POST /api/v1/telemetry/control`
Allows authenticated operators or client apps to switch operating modes, select simulation scenarios, or change the active airframe.

**Request Body:**
```json
{
  "mode": "DEMO",
  "scenario": "HIGH_ALTITUDE_CLIMB",
  "uav_id": "UAV-MALE-IND-01",
  "jitter_factor": 1.0
}
```

**Supported Modes:**
* `DEMO`: Physics-modeled synthetic engine simulation.
* `REPLAY`: Recorded mission scrubber playback.
* `LIVE`: Hardware GCS datalink streaming (reports explicit disconnect if no datalink).

**Supported Simulation Scenarios:**
* `NORMAL_CRUISE`: Nominal 2450 RPM cruise envelope (187°C CHT, 620°C EGT, 4.2 bar oil).
* `HIGH_ALTITUDE_CLIMB`: High boost climb (2750 RPM, 37.8 inHg, 198°C CHT, 665°C EGT, +3.5 m/s climb).
* `CHT_OVERHEAT`: Progressive thermal runaway (CHT rises to 216°C, health decays to 68%).
* `OIL_PRESSURE_DROP`: Lubrication failure scenario (oil pressure drops to 2.1 bar, oil temp rises).
* `DESCENT_IDLE`: Idle throttle glide (1950 RPM, low fuel flow, -3.8 m/s descent).

**Response `200 OK`:**
```json
{
  "status": "updated",
  "current_mode": "DEMO",
  "current_scenario": "HIGH_ALTITUDE_CLIMB",
  "active_uav": "UAV-MALE-IND-01"
}
```

### `POST /api/v1/telemetry/ingest/live`
Hardware / GCS gateway endpoint for ingesting physical MAVLink or NMEA telemetry packets.

**Request Body:**
```json
{
  "uav_id": "UAV-MALE-IND-01",
  "rpm": 2480,
  "cht": 186.2,
  "egt": 618.0,
  "oilPressure": 4.25,
  "oilTemperature": 95.5,
  "fuelFlow": 12.8,
  "vibrationRMS": 0.27,
  "injectionTiming": 26.2,
  "latitude": 21.2891,
  "longitude": 81.6720,
  "altitudeFt": 18000.0,
  "groundSpeedMs": 32.5,
  "headingDeg": 140
}
```

---

## 3. Sensor Monitoring & Health System (Phase 5)

### `GET /api/v1/sensors`
Retrieve the complete catalog of 18 transducers across Engine, Flight, and Electrical categories with evaluated health status, calibrated values, operating limits, and diagnostic messages.

**Response `200 OK`:**
```json
[
  {
    "id": "s-cht",
    "name": "Cylinder Head Temp (CHT)",
    "code": "ENG_CHT_AVG",
    "category": "Engine",
    "telemetry_key": "cht",
    "value": 187.0,
    "raw_value": 187.0,
    "calibrated_value": 187.0,
    "unit": "°C",
    "status": "NORMAL",
    "dataQuality": 99.8,
    "deltaPercent": 6.9,
    "lastUpdate": "14:32:10",
    "uavId": "UAV-MALE-IND-01",
    "operatingMode": "DEMO",
    "minNormal": 160.0,
    "maxNormal": 190.0,
    "minWarning": 150.0,
    "maxWarning": 200.0,
    "minCritical": 130.0,
    "maxCritical": 205.0,
    "description": "J-type spark plug gasket thermocouple array across all 4 cylinders.",
    "diagnosticMessage": "Telemetry steady within calibrated envelope. Signal nominal.",
    "calibrationSummary": {
      "status": "CALIBRATED",
      "scale": 1.0,
      "offset": 0.0,
      "lastCalibrated": "2026-10-15 08:30 UTC"
    }
  }
]
```

### `GET /api/v1/sensors/{sensor_id}`
Retrieve detailed sensor profile including operational specifications, effective thresholds, and complete software calibration history.

### `GET /api/v1/sensors/{sensor_id}/history`
Retrieve downsampled time-series historical readings for a specific sensor.

**Query Parameters:**
* `range` (string, optional, default: `"15m"`): `1m`, `5m`, `15m`, `1h`, `6h`, `24h`.

### `POST /api/v1/sensors/{sensor_id}/calibrate`
Apply a software calibration offset and scale adjustment to a sensor without modifying raw telemetry data.

**Request Body:**
```json
{
  "reference_value": 180.0,
  "measured_value": 178.5,
  "technician": "CHIEF_AVIONICS",
  "notes": "Bench thermocouple zero-drift adjustment"
}
```

### `POST /api/v1/sensors/{sensor_id}/reset-calibration`
Reset software calibration offset and scale back to baseline factory defaults.

### `POST /api/v1/sensors/{sensor_id}/thresholds`
Update operational, warning, and critical thresholds for a sensor.

---

## 4. WebSocket Real-Time Stream

### `WS /api/v1/telemetry/ws`
Full-duplex WebSocket broadcasting real-time synchronized telemetry at 1.0 Hz to all connected clients.

**Incoming Frames (Server -> Client):**
Emits `EngineTelemetryRead` JSON objects every 1000 ms.

**Client Actions (Client -> Server):**
Clients can dispatch JSON commands over the socket:
```json
// Set operating mode
{"action": "set_mode", "mode": "DEMO"}

// Activate simulation scenario
{"action": "set_scenario", "scenario": "CHT_OVERHEAT"}

// Select active UAV airframe
{"action": "select_uav", "uav_id": "UAV-RUSTOM-II-04"}

// Heartbeat ping
{"action": "heartbeat"}
```

---

## 4. Digital Twin Engine & 3D Synchronizer Endpoints (Phase 12)

### `GET /api/v1/twin/specs`
Returns mechanical and thermodynamic specifications of the Rotax 914 F propulsion system including 2.43:1 reduction gear ratio and power limits.

### `GET /api/v1/twin/components`
Returns monitored propulsion components with diagnostic readings, health scores, and RUL estimates.

### `GET /api/v1/twin/components/{component_id}`
Returns granular telemetry and operational envelope for a specific subsystem.

### `GET /api/v1/twin/pose`
Returns real-time 3D aircraft Euler attitude, spatial navigation coordinates, reduction gearbox kinematics (Rotax 914 F 2.43:1), propeller angular velocity, and aerodynamically correlated actuator control surface deflections.

**Query Parameters:**
* `uav_id` (string, optional): Airframe identifier (defaults to active selected UAV).

**Response `200 OK`:**
```json
{
  "uav_id": "UAV-MALE-IND-01",
  "mode": "DEMO",
  "is_simulated": true,
  "timestamp": "14:28:43",
  "iso_timestamp": "2026-10-31T14:28:43.120Z",
  "roll_deg": 2.4,
  "pitch_deg": 1.8,
  "yaw_deg": 182.0,
  "heading_deg": 182.0,
  "spatial_attitude": {
    "roll_deg": 2.4,
    "pitch_deg": 1.8,
    "yaw_deg": 182.0,
    "heading_deg": 182.0
  },
  "latitude": 21.425,
  "longitude": 81.685,
  "altitude_ft": 14250.0,
  "ground_speed_ms": 32.5,
  "vertical_speed_ms": 1.2,
  "engine_rpm": 2450,
  "gearbox_ratio": "2.43:1",
  "propeller_rpm": 1008.2,
  "propeller_angular_velocity_rad_s": 105.58,
  "control_surfaces": {
    "left_aileron_deg": -1.9,
    "right_aileron_deg": 1.9,
    "elevator_deg": 2.2,
    "rudder_deg": -0.5,
    "flaps_deg": 0.0
  },
  "flight_phase": "CRUISE"
}
```

### `GET /api/v1/twin/stress-map`
Returns normalized thermal, vibration, and turbocharger stress indices $[0.0 - 1.0]$ and status classifications (`NORMAL`, `WARNING`, `CRITICAL`, `UNAVAILABLE`) with color hex codes across all inspectable engine and airframe zones.

**Query Parameters:**
* `uav_id` (string, optional): Airframe identifier.

**Response `200 OK`:**
```json
{
  "uav_id": "UAV-MALE-IND-01",
  "mode": "DEMO",
  "timestamp": "14:28:43",
  "components": {
    "comp-cylinder-head": {
      "name": "Cylinder Head Assembly",
      "parameter": "CHT",
      "value": "187.0 °C",
      "state": "NORMAL",
      "stress_index": 0.48,
      "color_hex": "#334155"
    },
    "comp-exhaust": {
      "name": "Exhaust Collector & Wastegate",
      "parameter": "EGT",
      "value": "620.0 °C",
      "state": "NORMAL",
      "stress_index": 0.46,
      "color_hex": "#b45309"
    },
    "comp-lubrication": {
      "name": "Oil Sump & Lubrication Circuit",
      "parameter": "Oil Pressure",
      "value": "4.2 bar",
      "state": "NORMAL",
      "stress_index": 0.3,
      "color_hex": "#242d38"
    },
    "comp-crankshaft": {
      "name": "Crankshaft Assembly",
      "parameter": "Vibration RMS",
      "value": "0.28 g",
      "state": "NORMAL",
      "stress_index": 0.44,
      "color_hex": "#1e293b"
    },
    "comp-turbocharger": {
      "name": "Turbocharger & Wastegate",
      "parameter": "MAP",
      "value": "31.2 inHg",
      "state": "NORMAL",
      "stress_index": 0.43,
      "color_hex": "#0f172a"
    }
  }
}
```

---

## 5. Alerts & Maintenance Endpoints

### `GET /api/v1/alerts/`
List all operator alerts with optional status filters (`active`, `acknowledged`, `resolved`).

### `POST /api/v1/alerts/{alert_id}/acknowledge`
Acknowledge an active alarm with operator signature.

### `POST /api/v1/alerts/{alert_id}/resolve`
Resolve an alert with diagnostic maintenance notes.

---

## 6. Missions & Replay Endpoints (Phase 7)

### `GET /api/v1/missions`
List historical and active UAV surveillance missions with search and filter capabilities.

**Query Parameters:**
* `uav_id` (string, optional): Filter missions by UAV airframe ID (e.g. `UAV-ROTAX-001`).
* `status` (string, optional): Filter by mission status (`Completed`, `In-Flight`, `Scheduled`, `All`).
* `search` (string, optional): Keyword search matching mission name, ID, or type.

**Response `200 OK`:**
```json
[
  {
    "id": "Surveillance_2026_10_23_01",
    "uav_id": "UAV-ROTAX-001",
    "name": "Northern Tactical Border Surveillance #04",
    "type": "MALE UAV High-Altitude ISR",
    "date": "23 Oct 2026",
    "startTime": "14:15:00 UTC",
    "endTime": "16:45:00 UTC",
    "duration": "02h 30m",
    "totalDistanceKm": 242.6,
    "maxAltitudeFt": 22400.0,
    "avgSpeedMs": 34.2,
    "maxSpeedMs": 38.6,
    "status": "Completed",
    "telemetryAvailable": true,
    "dataSource": "FLIGHT_LOG_ARCHIVE",
    "fuelUsedLiters": 34.8,
    "sensorWarningsCount": 1,
    "anomalyCount": 0,
    "summary": {
      "totalDistanceKm": 242.6,
      "duration": "02h 30m",
      "maxAltitudeFt": 22400.0,
      "avgSpeedMs": 34.2,
      "maxSpeedMs": 38.6,
      "fuelUsedLiters": 34.8,
      "sensorWarningsCount": 1,
      "anomalyCount": 0,
      "engineHealthTrend": "Nominal"
    }
  }
]
```

### `GET /api/v1/missions/{mission_id}`
Retrieve full mission dossier including synchronized chronological timeline, waypoints, and milestone events.

**Path Parameters:**
* `mission_id` (string, required): Unique mission identifier.

**Response `200 OK`:**
Returns the complete mission object with `waypoints`, `timeline`, and `events`. Returns `404 Not Found` if the mission does not exist.

### `GET /api/v1/missions/{mission_id}/analytics`
Retrieve authentic performance metrics and engine analytics calculated dynamically from recorded telemetry data.

**Response `200 OK`:**
```json
{
  "mission_id": "Surveillance_2026_10_23_01",
  "uav_id": "UAV-ROTAX-001",
  "name": "Northern Tactical Border Surveillance #04",
  "telemetryAvailable": true,
  "totalDistanceKm": 242.6,
  "duration": "02h 30m",
  "maxAltitudeFt": 22400.0,
  "avgSpeedMs": 34.2,
  "maxSpeedMs": 38.6,
  "fuelUsedLiters": 34.8,
  "sensorWarningsCount": 1,
  "anomalyCount": 0,
  "engineHealthTrend": "Nominal",
  "totalRecordedPoints": 12,
  "eventsCount": 8
}
```
If telemetry is unavailable (e.g. for `Scheduled` missions), returns `telemetryAvailable: false` with explanatory status message.

---

## 6. Machine Learning Anomaly Detection Service (Phase 8)

### `POST /api/v1/anomalies/detect`
Evaluates real-time, simulated, or historical aero-piston telemetry using the pre-trained Scikit-Learn Isolation Forest ML model. Computes statistical continuous anomaly scores, classifies severity, and attributes deviant sensors via z-score baseline deviations.

**Request Body (`application/json`):**
```json
{
  "rpm": 2450.0,
  "cht": 182.0,
  "egt": 622.0,
  "oilPressure": 4.25,
  "oilTemperature": 95.0,
  "fuelFlow": 12.4,
  "vibrationRMS": 0.28,
  "manifoldPressureInHg": 31.0,
  "uav_id": "UAV-ROTAX-001",
  "operating_mode": "DEMO"
}
```

**Response `200 OK`:**
```json
{
  "is_anomaly": false,
  "anomaly_score": 0.245,
  "raw_score": 0.4312,
  "severity": "Normal",
  "threshold": 0.47,
  "model_version": "v1.2.0-isoforest-rotax",
  "model_name": "IsolationForest",
  "timestamp": "14:28:43",
  "iso_timestamp": "2026-10-31T14:28:43.120Z",
  "uav_id": "UAV-ROTAX-001",
  "mission_id": null,
  "data_source": "DEMO",
  "data_quality": "NOMINAL",
  "affected_parameters": [],
  "primary_parameter": "vibrationRMS",
  "primary_z_score": 0.35,
  "primary_component": "Rotax 914 F Crankshaft Assembly",
  "message": "Telemetry within nominal Isolation Forest statistical baseline."
}
```

### `GET /api/v1/anomalies/model-info`
Exposes active machine learning model metadata, training configuration, engineered interaction features, and validation performance metrics.

**Response `200 OK`:**
```json
{
  "model_name": "IsolationForest-Rotax914F",
  "algorithm": "IsolationForest",
  "model_version": "v1.2.0-isoforest-rotax",
  "is_loaded": true,
  "features_count": 13,
  "monitored_features": [
    "rpm", "cht", "egt", "oilPressure",
    "oilTemperature", "fuelFlow", "vibrationRMS", "manifoldPressureInHg"
  ],
  "engineered_features": [
    "temp_ratio_cht_egt", "oil_p_per_rpm", "vib_per_rpm", "power_proxy", "fuel_per_power"
  ],
  "training_samples": 2528,
  "anomaly_threshold": 0.47,
  "evaluation_metrics": {
    "precision": 0.6698,
    "recall": 0.8517,
    "f1_score": 0.7502,
    "roc_auc": 0.8031
  }
}
```

### `GET /api/v1/anomalies`
Lists logged anomaly occurrences across the UAV fleet with optional query filtering.

**Query Parameters:**
* `uav_id` (string, optional): Filter by UAV airframe identifier.
* `severity` (string, optional): Filter by severity level (`High`, `Medium`, `Low`, `Normal`).
* `status` (string, optional): Filter by status (`Active`, `Investigating`, `Resolved`).

**Response `200 OK`:**
```json
[
  {
    "id": "anom-vib-001",
    "parameter": "Vibration RMS",
    "detectedValue": "0.68 g",
    "expectedRange": "0.15 - 0.35 g",
    "deviation": "+94.3%",
    "severity": "High",
    "time": "14:28:15",
    "status": "Active",
    "affectedComponent": "Crankshaft Assembly",
    "description": "High frequency vibration excursion indicating possible crankshaft journal wear."
  }
]
```

### `GET /api/v1/anomalies/{anomaly_id}`
Retrieve complete dossier for a specific logged anomaly record.

### `POST /api/v1/anomalies/{anomaly_id}/investigate`
Dispatches automated diagnostic investigation for a flagged anomaly, synthesizing ML feature attribution, root-cause probability, and recommended technical actions.

**Response `200 OK`:**
```json
{
  "anomaly_id": "anom-vib-001",
  "primary_cause": "Harmonic Bearing / Crankshaft Resonance",
  "confidence": 0.92,
  "recommended_action": "Reduce RPM to < 2200; execute immediate acoustic bearing check upon landing.",
  "sensor_deviations": {
    "vibrationRMS": "+94.3% above baseline"
  },
  "timestamp": "2026-10-31T14:30:00Z"
}
```

---

## 7. Predictive Maintenance & Remaining Useful Life (RUL) Service (Phase 9)

### `GET /api/v1/predictive-maintenance/overview`
Retrieves executive predictive maintenance summary including overall RUL hours, uncertainty margins, component health breakdowns, degradation trend projections, and actionable maintenance advisories.

**Query Parameters:**
* `uav_id` (string, optional): Target UAV identifier. Defaults to active UAV.
* `horizon_hours` (integer, optional): Projection horizon in hours (`6`, `24`, `50`, `100`). Default: `50`.

**Response `200 OK`:**
```json
{
  "uav_id": "UAV-ROTAX-001",
  "flight_hours": 452.0,
  "overall_rul_hours": 1548.0,
  "uncertainty_hours": 62.2,
  "overall_health_percent": 92.5,
  "confidence_score": 91.8,
  "urgency": "Continue Monitoring",
  "is_experimental": true,
  "model_version": "v1.0.0-rul-ensemble",
  "components": [
    {
      "component_id": "engine_core",
      "component_name": "Rotax 914 F Core Subsystem",
      "health_percent": 92.5,
      "rul_hours": 1548.0,
      "nominal_tbo_hours": 2000.0,
      "uncertainty_hours": 62.2,
      "status": "Healthy",
      "primary_stress_parameter": "RPM / Mechanical Workload",
      "degradation_stage": "Nominal"
    },
    {
      "component_id": "cylinder_head",
      "component_name": "Cylinder Head & Piston Assembly",
      "health_percent": 88.4,
      "rul_hours": 1393.2,
      "nominal_tbo_hours": 1800.0,
      "uncertainty_hours": 62.2,
      "status": "Healthy",
      "primary_stress_parameter": "CHT Thermal Stress (180.0 °C)",
      "degradation_stage": "Nominal"
    }
  ],
  "recommendations": [
    {
      "id": "rec-nominal-001",
      "uav_id": "UAV-ROTAX-001",
      "component": "Rotax 914 F Core Subsystem",
      "priority": "Low",
      "urgency": "Continue Monitoring",
      "reason": "All monitored subsystems exhibit nominal degradation trajectories within TBO margin.",
      "relevant_sensors": ["RPM", "CHT", "Oil Pressure"],
      "predicted_rul_hours": 1548.0,
      "confidence_percent": 94.0,
      "recommended_action": "Continue normal surveillance sortie operations. Perform routine pre-flight 100-hour line inspection.",
      "created_at": "2026-10-31T07:10:00Z"
    }
  ],
  "trend_forecast": {
    "horizon_hours": 50,
    "trend_direction": "Stable",
    "forecast_points": [
      { "time_offset_hours": 0.0, "label": "Now", "forecasted_health": 92.5, "upper_bound": 94.3, "lower_bound": 90.7 },
      { "time_offset_hours": 25.0, "label": "+25h", "forecasted_health": 91.1, "upper_bound": 94.6, "lower_bound": 87.6 },
      { "time_offset_hours": 50.0, "label": "+50h", "forecasted_health": 89.3, "upper_bound": 95.1, "lower_bound": 83.5 }
    ],
    "risk_summary": "Health index projected to transition from 92.5% to 89.3% across 50-hour mission profile."
  },
  "last_evaluated": "2026-10-31T07:10:00Z",
  "data_source": "DEMO",
  "disclaimer": "Experimental prototype model trained on physical degradation sequences. Not certified for airworthiness."
}
```

### `GET /api/v1/predictive-maintenance/rul`
Returns instantaneous Remaining Useful Life regression for active telemetry snapshot.

### `GET /api/v1/predictive-maintenance/components`
Returns degradation status and individual RUL estimates across all 7 monitored engine subsystems.

### `GET /api/v1/predictive-maintenance/recommendations`
Returns prioritized actionable maintenance instructions and inspection advisories.

### `GET /api/v1/predictive-maintenance/history`
Returns chronological flight-hour checkpoints and historical RUL regression tracking.

### `POST /api/v1/predictive-maintenance/predict`
Calculates ad-hoc RUL predictions on arbitrary custom or simulated telemetry payloads.

**Request Body (`application/json`):**
```json
{
  "flight_hours": 850.0,
  "flight_cycles": 257.0,
  "rpm": 2450.0,
  "cht": 185.0,
  "egt": 625.0,
  "oil_pressure": 4.10,
  "oil_temperature": 96.0,
  "fuel_flow": 12.6,
  "vibration_rms": 0.32,
  "map_inhg": 31.0,
  "anomaly_score": 0.18
}
```

---

## 8. Alert Management & Real-Time Notification Queue (Phase 10)

### `GET /api/v1/alerts`
Retrieves all recorded alerts, filterable by UAV ID, severity level, and lifecycle status.

**Query Parameters:**
* `uav_id` (string, optional): Filter by UAV airframe ID (e.g. `UAV-MALE-IND-01`).
* `severity` (string, optional): Filter by severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFORMATIONAL`).
* `status` (string, optional): Filter by lifecycle state (`ACTIVE`, `ACKNOWLEDGED`, `INVESTIGATING`, `RESOLVED`, `DISMISSED`).

**Response `200 OK`:**
```json
[
  {
    "id": "ALT-2026-001",
    "timestamp": "14:23:10",
    "severity": "CRITICAL",
    "title": "Cylinder Head Thermal Runaway",
    "relatedComponent": "Rotax 914 F Cylinder Head Assembly",
    "parameter": "cht",
    "currentValue": "138.5 °C",
    "expectedRange": "< 135.0 °C",
    "status": "ACTIVE",
    "description": "Multi-cylinder head temperature exceeded critical continuous limit.",
    "acknowledgedBy": null,
    "acknowledgedAt": null,
    "investigatedBy": null,
    "investigatedAt": null,
    "resolvedBy": null,
    "resolvedAt": null,
    "resolutionNotes": null,
    "dismissedBy": null,
    "dismissedAt": null,
    "dismissalReason": null,
    "source_module": "THERMAL_MONITOR",
    "uav_id": "UAV-MALE-IND-01",
    "possible_cause": "Restricted coolant flow or continuous climb detonation",
    "recommended_action": "Reduce throttle to 75%, level off airframe, cross-check coolant pressure",
    "audit_trail": [
      {
        "timestamp": "14:23:10",
        "action": "TRIGGERED",
        "actor": "AlertEngine",
        "details": "Threshold violation: cht=138.5 °C"
      }
    ]
  }
]
```

### `GET /api/v1/alerts/summary`
Returns real-time aggregated counts across all alert severity tiers and lifecycle statuses.

**Response `200 OK`:**
```json
{
  "total_alerts": 3,
  "active_count": 2,
  "acknowledged_count": 1,
  "investigating_count": 0,
  "resolved_count": 0,
  "dismissed_count": 0,
  "critical_count": 1,
  "high_count": 1,
  "medium_count": 1,
  "low_count": 0,
  "info_count": 0
}
```

### `GET /api/v1/alerts/history`
Returns complete chronological audit log of all alert lifecycle actions across flight operations.

### `GET /api/v1/alerts/notifications` & `GET /api/v1/notifications`
Retrieves prioritized real-time notifications ordered by severity weight and timestamp.

**Query Parameters:**
* `uav_id` (string, optional): Target UAV identifier.
* `unread_only` (boolean, default: false): Return only unread notifications.
* `limit` (integer, default: 50): Maximum items to return.

**Response `200 OK`:**
```json
[
  {
    "id": "NOTIF-0001",
    "uav_id": "UAV-MALE-IND-01",
    "alert_id": "ALT-2026-001",
    "title": "Cylinder Head Thermal Runaway",
    "message": "CHT reached 138.5 °C. Immediate power reduction recommended.",
    "severity": "CRITICAL",
    "source_module": "THERMAL_MONITOR",
    "timestamp": "14:23:10",
    "read": false
  }
]
```

### `POST /api/v1/notifications/{notification_id}/read`
Marks a specific notification as read.

### `GET /api/v1/alerts/{alert_id}`
Returns complete diagnostic dossier, sensor readings, and audit trail for a specific alert.

### `POST /api/v1/alerts/{alert_id}/acknowledge`
Transitions alert to `ACKNOWLEDGED`.

**Request Body (`application/json`):**
```json
{
  "acknowledged_by": "Flt Lt Omkar Sahu (OS)"
}
```

### `POST /api/v1/alerts/{alert_id}/investigate`
Transitions alert to `INVESTIGATING`.

**Request Body (`application/json`):**
```json
{
  "operator": "Flt Lt Omkar Sahu (OS)",
  "notes": "Cross-verifying secondary coolant thermocouple sensor against telemetry trend."
}
```

### `POST /api/v1/alerts/{alert_id}/resolve`
Transitions alert to `RESOLVED`.

**Request Body (`application/json`):**
```json
{
  "resolution_notes": "Leveled off, RPM stabilized at 2300. CHT returned to 121°C within nominal limits.",
  "resolved_by": "Flt Lt Omkar Sahu (OS)"
}
```

### `POST /api/v1/alerts/{alert_id}/dismiss`
Transitions alert to `DISMISSED`. Note: `CRITICAL` and `HIGH` severity alerts return `400 Bad Request` unless formally resolved.

**Request Body (`application/json`):**
```json
{
  "operator": "Flt Lt Omkar Sahu (OS)",
  "reason": "Known expected benign deviation during pre-flight maintenance runup."
}
```

---

## 9. Ground Control Station Datalink (MAVLink & MQTT) (Phase 11)

### `GET /api/v1/datalink/status`
Retrieves operational status and configuration summary of the GCS communication gateway.

**Response `200 OK`:**
```json
{
  "status": "healthy",
  "total_connections": 2,
  "active_connections": 1,
  "total_packets_received": 1420,
  "total_packets_rejected": 2,
  "average_latency_ms": 12.4,
  "supported_protocols": ["MAVLink v2", "MAVLink v1", "MQTT v3.1.1/v5"]
}
```

### `GET /api/v1/datalink/connections`
Returns all active and configured communication adapters.

**Response `200 OK`:**
```json
[
  {
    "connection_id": "MAVLINK-UAV-MALE-IND-01-GCS",
    "uav_id": "UAV-MALE-IND-01",
    "protocol": "MAVLINK",
    "status": "CONNECTED",
    "endpoint": "udp:0.0.0.0:14550",
    "connected_at": "2026-10-31T07:15:00Z",
    "last_packet_time": "2026-10-31T07:15:32Z",
    "packets_received": 890,
    "packets_rejected": 1,
    "latency_ms": 8.5,
    "uptime_seconds": 32.0,
    "error_message": null,
    "is_active": true,
    "details": {
      "transport": "UDP",
      "address": "0.0.0.0",
      "port": 14550,
      "mavlink_version": 2
    }
  }
]
```

### `GET /api/v1/datalink/connections/{uav_id}`
Returns datalink status and statistics for a specific airframe ID.

### `POST /api/v1/datalink/connections/mavlink`
Initializes or configures a MAVLink telemetry adapter.

**Request Body (`application/json`):**
```json
{
  "uav_id": "UAV-MALE-IND-01",
  "transport": "UDP",
  "address": "0.0.0.0",
  "port": 14550,
  "baudrate": 115200,
  "mavlink_version": 2
}
```

### `POST /api/v1/datalink/connections/mqtt`
Initializes or configures an MQTT broker connection adapter. Passwords and credentials are automatically masked from all logs and API responses.

**Request Body (`application/json`):**
```json
{
  "uav_id": "UAV-MALE-IND-01",
  "broker_address": "localhost",
  "port": 1883,
  "use_tls": false,
  "qos": 1
}
```

### `DELETE /api/v1/datalink/connections/{connection_id}`
Gracefully terminates and removes an active communication adapter.

### `GET /api/v1/datalink/metrics`
Returns global telemetry reception metrics, packet loss counters, latency averages, and rejection reasons.

### `POST /api/v1/datalink/test`
Executes a deterministic SITL simulation testbed scenario (`NORMAL_TELEMETRY`, `CONNECTION_LOSS`, `RECONNECTION`, `STALE_MESSAGES`, `DUPLICATE_PACKETS`, `INVALID_MESSAGE`, `MULTIPLE_UAV`).

**Request Body (`application/json`):**
```json
{
  "scenario": "NORMAL_TELEMETRY",
  "uav_id": "UAV-MALE-IND-01",
  "protocol": "MAVLINK"
}
```

