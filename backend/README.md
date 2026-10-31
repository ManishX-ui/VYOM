# VYOM — Backend

Production-ready Python FastAPI backend service for the VYOM (Virtual Yield & Operational Monitoring) Aero Piston Engine Digital Twin platform.

## Architecture
```text
backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── telemetry.py       # Live telemetry & WebSocket stream
│   │   │   │   ├── digital_twin.py    # Rotax 914 F thermodynamic & component twin
│   │   │   │   ├── anomalies.py       # Deviation analysis & automated diagnosis
│   │   │   │   ├── predictions.py     # Fault forecasting & RUL models
│   │   │   │   ├── missions.py        # ISR mission replay & flight trajectories
│   │   │   │   ├── alerts.py          # Acknowledgment & incident resolution
│   │   │   │   ├── uav.py             # MALE UAV pairing & configuration
│   │   │   │   └── auth.py            # Engineer session authentication
│   │   │   └── api.py                 # API v1 router
│   │   └── deps.py                    # FastAPI dependencies
│   ├── core/
│   │   ├── config.py                  # Pydantic Settings
│   │   ├── security.py                # Session tokens & signature verification
│   │   └── supabase.py                # Supabase service role client
│   ├── schemas/                       # Pydantic v2 data transfer schemas
│   ├── services/                      # Computational physics, RUL models, telemetry
│   ├── database/                      # DB session & connection management
│   ├── middleware/                    # CORS and logging middleware
│   └── main.py                        # FastAPI entrypoint with background lifespan
├── tests/                             # Pytest automated test suite
├── requirements.txt
├── .env.example
└── README.md
```

## Getting Started

### 1. Create Virtual Environment & Install Requirements
```bash
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux / macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive OpenAPI Swagger documentation will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 4. Run Tests
```bash
pytest
```

