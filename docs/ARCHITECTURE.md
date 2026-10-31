# VYOM Architecture Specification

## 1. System Overview

**VYOM (Virtual Yield & Operational Monitoring)** is an enterprise aerospace digital twin and health monitoring platform engineered for Medium-Altitude Long-Endurance (MALE) Unmanned Aerial Vehicles (UAVs) equipped with 4-cylinder turbocharged aero-engines (such as the Rotax 914 F series and indigenous aeronautical piston powerplants).

```
+----------------------------------------------------------------------------------------------------+
|                                         VYOM SYSTEM ARCHITECTURE                                  |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|    +-----------------------------+                               +----------------------------+     |
|    |      Frontend Client        |                               |       Backend Service      |     |
|    |   (React 19 + TypeScript)   |                               |      (FastAPI + Python)    |     |
|    |   Vite @ http://localhost:  |                               |   Uvicorn @ http://        |     |
|    |          5173               |                               |      localhost:8000        |     |
|    +--------------+--------------+                               +--------------+-------------+     |
|                   |                                                             |                   |
|                   |  REST API (/api/v1/*)                                       |                   |
|                   +------------------------------------------------------------>+                   |
|                   |                                                             |                   |
|                   |  WebSocket Stream (/api/v1/telemetry/ws)                    |                   |
|                   +<============================================================+                   |
|                   |                                                             |                   |
|    +--------------v--------------+                               +--------------v-------------+     |
|    |  Browser State Management   |                               |    Core Engine Services    |     |
|    |  - AppContext               |                               |    - DigitalTwinService    |     |
|    |  - Offline Demo Fallback    |                               |    - AnomalyDetection      |     |
|    |  - Three.js Engine Canvas   |                               |    - PredictorService      |     |
|    |  - Recharts Visualizations  |                               |    - MissionService        |     |
|    +--------------+--------------+                               +--------------+-------------+     |
|                   |                                                             |                   |
|                   | Browser (Anon Key)                                          | Privileged Key    |
|                   v                                                             v                   |
|    +------------------------------------------------------------------------------------------+     |
|    |                                  Supabase Cloud / Database                               |     |
|    |                         (Authentication, Telemetry Logs, Alerts)                         |     |
|    +------------------------------------------------------------------------------------------+     |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Directory Architecture

```text
VYOM/
├── frontend/                     # React 19 + TypeScript + Vite + Tailwind CSS v4
│   ├── public/                   # Public assets & 360 drone frames
│   │   ├── images/
│   │   ├── models/
│   │   ├── icons/
│   │   └── assets/               # 300 sequential drone rotational frames & branding
│   ├── src/
│   │   ├── components/           # Modular components (digital-twin, landing, ui)
│   │   ├── pages/                # Operational views (Dashboard, EngineHealth, etc.)
│   │   ├── layouts/              # AppLayout shell and TopHeader ribbon
│   │   ├── hooks/                # Custom React telemetry hooks
│   │   ├── services/             # API client, WebSocket stream, Supabase client
│   │   ├── context/              # AppContext with offline demo persistence
│   │   ├── utils/                # Telemetry math, formatters, CSV/JSON exporters
│   │   ├── styles/               # Tailwind CSS v4 design tokens & fonts
│   │   ├── routes/               # Centralized React Router v7 configuration
│   │   └── types/                # Domain TypeScript telemetry interfaces
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.ts
│   └── README.md
│
├── backend/                      # Production Python FastAPI architecture
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/    # Telemetry, Twin, Anomalies, Predictions, Missions
│   │   │   │   └── api.py        # Master v1 API Router
│   │   │   └── deps.py           # Dependency injection
│   │   ├── core/
│   │   │   ├── config.py         # Settings & environment variables
│   │   │   ├── security.py       # Session authentication & HMAC tokens
│   │   │   └── supabase.py       # Privileged service role operations
│   │   ├── schemas/              # Pydantic v2 schemas
│   │   ├── services/             # Digital twin, physics, anomalies, predictions
│   │   ├── database/             # Connection pooling & base models
│   │   ├── middleware/           # CORS & security middleware
│   │   └── main.py               # FastAPI entrypoint with background lifespan
│   ├── tests/                    # Pytest test suite
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
├── docs/                         # Engineering & API Documentation
│   ├── ARCHITECTURE.md
│   └── API_DOCUMENTATION.md
│
├── .gitignore
└── README.md
```

---

## 3. Component Deep Dive

### 3.1 Digital Twin Engine (`DigitalTwinService` & `EngineCanvas`)
The digital twin represents the **Rotax 914 F turbocharged aero piston engine**:
* **Physical Assembly:** 4 horizontally opposed cylinders, dry-sump lubrication system, TCU-controlled turbocharger wastegate, dual electronic ignition, and 2.43:1 propeller reduction gearbox.
* **3D Visualizer:** Three.js procedural PBR model rendering Solid, Ghost/Wireframe, Component Isolation, and Exploded view animations with interactive hot-spot diagnostics.
* **Thermodynamic Envelope:** Evaluates Brake Mean Effective Pressure (BMEP), Cylinder Head Temperature (CHT) gradients, Exhaust Gas Temperatures (EGT), and manifold boost pressure (MAP).

### 3.2 Predictive Maintenance & RUL (`PredictorService`)
* Tracks individual component degradation profiles over operating flight hours.
* Computes remaining useful life (RUL) against nominal 2,000-hour Time Between Overhauls (TBO).
* Projects future failure probabilities across selectable horizons (6h, 24h, 50h, 100h) taking into account thermal cycle stress and throttle excursions.

### 3.3 Anomaly Detection (`AnomalyDetectionService`)
* Evaluates sensor readings against nominal $\pm 2.5\sigma$ Gaussian distribution envelopes.
* Automatically classifies detected deviations by severity (Critical, Warning, Info).
* Flags localized anomalies directly on the 3D twin viewport.

### 3.4 Telemetry Streaming & Replay (`TelemetryBroadcaster` & `MissionService`)
* **Real-time stream:** 1 Hz bi-directional WebSocket connection (`/api/v1/telemetry/ws`).
* **Tactical Airspace Map:** Real-time UAV heading vector, altitude MSL/AGL, and waypoint coordinates.
* **Synchronized Replay:** Play, pause, scrub, step, and export mission logs to CSV/JSON format.

---

## 4. Security & Isolation Model

1. **Frontend Isolation:** The frontend operates purely in the browser and connects via public REST/WebSocket APIs. No database passwords or secret keys exist in the frontend bundle.
2. **Supabase Client Architecture:**
   * **Frontend:** Uses the public anonymous key (`VITE_SUPABASE_ANON_KEY`) for browser authentication and user queries subject to Row Level Security (RLS).
   * **Backend:** Privileged operations utilize `SUPABASE_SERVICE_ROLE_KEY` inside `backend/app/core/supabase.py`.
3. **CORS Governance:** Strict origin allowlisting permitting development servers `http://localhost:5173` and `http://localhost:3000`.

