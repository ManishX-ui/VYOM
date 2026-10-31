# VYOM MALE UAV Digital Twin Platform – Deployment Guide

**Document Version:** 1.0.0  
**Phase:** Phase 13 Hardening  
**Target Environments:** Staging / Production Ground Control Station (GCS) Server  

---

## 1. System Architecture Overview

VYOM consists of two main tiers and a managed cloud database:
1. **Frontend:** React 19 single-page application built with Vite and Tailwind CSS.
2. **Backend:** FastAPI (Python 3.14) asynchronous REST and WebSocket server running Uvicorn.
3. **Database:** Supabase PostgreSQL 17 with Row Level Security (RLS) enabled.

---

## 2. Prerequisites & Environment

- **Node.js:** v18.0.0 or higher (v20+ LTS recommended)
- **Python:** v3.11, v3.12, v3.13, or v3.14
- **Package Managers:** `npm` / `pnpm` (Frontend), `pip` / `uv` (Backend)
- **Network Ports Required:**
  - `5173`: Frontend development / preview server (or standard port `80`/`443` behind NGINX)
  - `8000`: Backend FastAPI HTTP & WebSocket API
  - `14550` (UDP): Default MAVLink GCS telemetry listener
  - `1883` / `8883` (TCP/TLS): MQTT broker communication

---

## 3. Environment Variables Configuration

### Backend (`backend/.env`)
```bash
# Core API Settings
API_V1_STR=/api/v1
PROJECT_NAME="VYOM — Aero Piston Engine Digital Twin Backend"
VERSION=2.0.0

# Cryptographic & Session Security
SECRET_KEY="<GENERATE_SECURE_RANDOM_64_CHAR_HEX>"
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Database & Supabase
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.zqwatlhbrzbghytczxat.supabase.co:5432/postgres"
SUPABASE_URL="https://zqwatlhbrzbghytczxat.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<SECURE_SERVICE_ROLE_KEY>"

# Datalink Listeners
MAVLINK_DEFAULT_PORT=14550
MQTT_BROKER_HOST="localhost"
MQTT_BROKER_PORT=1883
```

### Frontend (`frontend/.env`)
```bash
VITE_API_BASE_URL="http://localhost:8000"
VITE_SUPABASE_URL="https://zqwatlhbrzbghytczxat.supabase.co"
VITE_SUPABASE_ANON_KEY="<PUBLIC_ANON_KEY>"
```

> **SECURITY NOTICE:** Never expose `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` in `frontend/.env`.

---

## 4. Production Build & Execution

### 4.1 Backend Service
```bash
# 1. Navigate to backend directory
cd backend

# 2. Install production dependencies
pip install -r requirements.txt

# 3. Verify database migrations & model schemas
python -m pytest tests/ -v

# 4. Start production Uvicorn server (with multiple workers)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4 --proxy-headers
```

### 4.2 Frontend Service
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm ci

# 3. Compile and generate static production bundle
npm run build

# 4. Output files are generated in `frontend/dist/`.
# Serve using NGINX, Caddy, or static cloud hosting.
```

---

## 5. Health Checks & Verification Endpoints

- **HTTP Health Probe:** `GET /api/v1/health` &rarr; Expected: `{"status": "healthy", "service": "...", "version": "2.0.0"}`
- **WebSocket Telemetry Stream:** `ws://<host>:8000/api/v1/telemetry/ws`
- **Swagger Documentation:** `http://<host>:8000/docs`
- **ReDoc Documentation:** `http://<host>:8000/redoc`

---

## 6. Graceful Shutdown & Recovery

FastAPI's lifespan context manager automatically catches `SIGTERM` / `SIGINT` signals:
- Cancels active telemetry broadcast tasks.
- Closes open MAVLink UDP/Serial sockets.
- Gracefully disconnects MQTT client threads.
- Flushes and closes open database connection pools.

