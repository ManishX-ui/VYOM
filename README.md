# VYOM — Virtual Yield & Operational Monitoring

**VYOM** (Virtual Yield & Operational Monitoring) is an advanced UAV Digital Twin & Aero-Piston Engine Health Monitoring Platform engineered specifically for MALE (Medium-Altitude Long-Endurance) UAV operations powered by 4-cylinder turbocharged engines (such as the Rotax 914 F / indigenous aero piston platform).

---

## Key Features

1. **Admin Login Portal** (`/`)
   - High-fidelity MALE UAV visual hero with aerospace-grade aesthetics.
   - Centered authentication modal with validation and 1-click instant demo bypass.

2. **Connect to UAV** (`/connect-uav`)
   - Pair new demonstration UAVs (Name, ID, Protocol, Baud rate, Engine Configuration).
   - Instant selection of pre-configured demonstration UAVs (TAPAS-BH-201, RUSTOM-II, VYOM-AV01).
   - LocalStorage demonstration persistence across reloads.

3. **Main Dashboard** (`/app/dashboard`)
   - Core telemetry KPI cards: RPM (2450), CHT (187 °C), Oil Pressure (4.2 bar), Fuel Flow (12.5 L/hr), Vibration (0.28 g), Overall Health (92%).
   - Interactive 3D Digital Twin with real-time mapped hotspots.
   - Health status arc gauge with readiness checklist.
   - Parameter trend multi-line chart with time horizon filters.

4. **Engine Health** (`/app/engine-health`)
   - Three.js 3D Engine Model with Solid, Ghost/Wireframe, Component Highlight, and Exploded view animations.
   - Interactive component diagnostic panel with Remaining Useful Life (RUL) estimates.
   - Power vs. RPM Operating Envelope performance chart.

5. **Sensor Monitoring** (`/app/sensors`)
   - Multi-category sensor matrix (Thermal, Mechanical, Fluid, Electrical).
   - Status indicators, signal quality scores, calibration tolerances, and search/filter controls.

6. **Location Tracking** (`/app/tracking`)
   - Interactive tactical airspace radar map with flight path and waypoints.
   - UAV orientation vector, altitude MSL/AGL, ground speed, and geofence boundary monitoring.

7. **Mission Replay** (`/app/mission-replay`)
   - Synchronized mission replay with play, pause, step, and scrubbable timeline.
   - Synchronized telemetry cursor, parameter chart, and chronological mission event milestones.
   - Client-side CSV/JSON mission telemetry export.

8. **Anomaly Detection** (`/app/anomalies`)
   - Engine alert banner with 1-click investigation trigger.
   - Anomaly visualization highlighting affected components on the 3D twin.
   - Anomaly score gauge (0.78 High), distribution breakdown, and filterable anomalies table.

9. **Fault Prediction** (`/app/predictions`)
   - Prediction Horizon selector (Next 6h, 24h, 50h, 100h, Custom) with "Generate Prediction" simulation.
   - Overall Health Gauge, Fault Risk Summary, Predicted Probabilities, Estimated RUL, Contributing Factors, Model Confidence (87%), and Current vs. Normal Range audit.

10. **Alert History** (`/app/alerts`)
    - Searchable and filterable alert log with severity levels (Critical, Warning, Info).
    - Working demonstration actions: Acknowledge, Resolve, and Detailed Incident modal.
    - CSV audit export.

---

## Technology Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS v4 (Light theme with high-contrast tactical dark viewports)
- **3D Visualization**: Three.js (Procedural PBR Rotax-914 engine twin with RoomEnvironment)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Routing**: React Router v7

---

## Local Development & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:3000`.

### 3. Build for Production
```bash
npm run build
```
