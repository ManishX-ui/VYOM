# VYOM — Virtual Yield & Operational Monitoring

**VYOM** is an enterprise aerospace digital twin and real-time health monitoring platform engineered specifically for MALE (Medium-Altitude Long-Endurance) Unmanned Aerial Vehicles (UAVs) powered by 4-cylinder turbocharged engines (such as the Rotax 914 F series and indigenous aeronautical piston powerplants).

---

## Architecture Overview

```text
VYOM/
├── frontend/                     # React 19 + TypeScript + Vite + Tailwind CSS v4
│   ├── public/                   # Static assets, 360 rotational frames, icons
│   │   ├── images/
│   │   ├── models/
│   │   ├── icons/
│   │   └── assets/               # Backward-compatible asset pipeline
│   ├── src/
│   │   ├── components/           # Modular components (Three.js 3D Twin, Landing)
│   │   ├── pages/                # 10 Operational screen views
│   │   ├── layouts/              # AppLayout shell and TopHeader telemetry ribbon
│   │   ├── hooks/                # Custom React telemetry & drift hooks
│   │   ├── services/             # API client, WebSocket stream, Supabase client
│   │   ├── context/              # AppContext with offline demo persistence
│   │   ├── utils/                # Formatters, telemetry math, CSV/JSON export
│   │   ├── styles/               # Tailwind CSS v4 typography & design tokens
│   │   ├── routes/               # Centralized React Router v7 routes
│   │   └── types/                # Domain TypeScript contracts
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.ts
│   └── README.md
│
├── backend/                      # Production-ready Python FastAPI architecture
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/    # Telemetry, Twin, Anomalies, Predictions, Missions
│   │   │   │   └── api.py        # API v1 master router
│   │   │   └── deps.py           # Dependency injection
│   │   ├── core/
│   │   │   ├── config.py         # Settings & environment variables
│   │   │   ├── security.py       # Session tokens & HMAC signatures
│   │   │   └── supabase.py       # Privileged backend service role client
│   │   ├── schemas/              # Pydantic v2 data transfer schemas
│   │   ├── services/             # Computational physics, RUL models, telemetry
│   │   ├── database/             # Connection pooling & base models
│   │   ├── middleware/           # CORS & security middleware
│   │   └── main.py               # FastAPI entrypoint with background broadcaster
│   ├── tests/                    # Pytest test suite
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
├── docs/                         # Engineering Documentation
│   ├── ARCHITECTURE.md           # System design & mathematical models
│   └── API_DOCUMENTATION.md      # REST & WebSocket API specification
│
├── .gitignore
└── README.md
```

---

## Operational Views & Features Preserved

1. **Admin Login Portal** (`/`) — Aerospace hero visuals, authentication modal, and 1-click instant demo access.
2. **Connect to UAV** (`/connect-uav`) — Pair new MAVLink/Avionics bus UAVs or connect to pre-configured fleet testbeds (TAPAS-BH-201, RUSTOM-II, VYOM-AV01).
3. **Main Dashboard** (`/app/dashboard`) — Core telemetry KPI cards (RPM, CHT, Oil Pressure, Fuel Flow, Vibration, Health score), interactive 3D digital twin, status gauges, and parameter trends.
4. **Engine Health** (`/app/engine-health`) — Three.js 3D Rotax 914 engine twin with Solid, Ghost/Wireframe, Component Highlight, and Exploded view animations with RUL diagnostics.
5. **Sensor Monitoring** (`/app/sensors`) — Thermal, Mechanical, Fluid, and Electrical sensor matrices with signal quality and tolerances.
6. **Location Tracking** (`/app/tracking`) — Tactical airspace radar map, flight path, orientation vector, altitude MSL/AGL, and geofence monitoring.
7. **Mission Replay** (`/app/mission-replay`) — Synchronized playback with scrubbable timeline, flight telemetry cursor, milestones, and client-side CSV/JSON export.
8. **Anomaly Detection** (`/app/anomalies`) — Visualized engine alerts, statistical deviation analysis, severity scoring, and 1-click automated diagnosis.
9. **Fault Prediction** (`/app/predictions`) — 6h, 24h, 50h, and 100h predictive horizon forecasting, failure probabilities, contributing factors, and RUL curves.
10. **Alert History** (`/app/alerts`) — Incident auditing with severity levels, real-time Acknowledge/Resolve actions, and CSV audit export.

---

## Quick Start & Installation

### Prerequisites
* **Node.js** v18+ (tested on Node v24.15)
* **Python** 3.10+ (tested on Python 3.14)

---

### 1. Backend Setup (FastAPI)

```bash
# Navigate to backend directory
cd backend

# Create and activate a Python virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env

# Run unit and API tests
python -m pytest

# Start backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

* **Backend Base URL:** `http://localhost:8000`
* **Interactive API Docs (Swagger):** `http://localhost:8000/docs`
* **Alternative API Docs (ReDoc):** `http://localhost:8000/redoc`
* **Live WebSocket Stream:** `ws://localhost:8000/api/v1/telemetry/ws`

---

### 2. Frontend Setup (React 19 + Vite)

```bash
# In a separate terminal, navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Start frontend development server
npm run dev
```

* **Frontend Application URL:** `http://localhost:5173`
* **Network Access:** `http://0.0.0.0:5173`

---

## Production Build

To build the frontend bundle for production deployment:
```bash
cd frontend
npm run build
```
Compiled production assets will be placed in `frontend/dist/`.
