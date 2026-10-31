# VYOM — Frontend

Virtual Yield & Operational Monitoring (VYOM) Aero Piston Engine Digital Twin Web Interface.

## Technologies
- **React 19**
- **TypeScript**
- **Vite**
- **Tailwind CSS v4**
- **Three.js** (3D procedural engine twin & room environment)
- **Recharts** (high-contrast aerospace telemetry telemetry charts)
- **Lucide Icons**
- **React Router v7**

## Directory Structure
```text
frontend/
├── public/
│   ├── images/
│   ├── models/
│   ├── icons/
│   └── assets/            # 300 drone rotational frames, logos, tactical visuals
├── src/
│   ├── components/
│   │   ├── digital-twin/  # Three.js 3D Engine Canvas with exploded/ghost views
│   │   ├── landing/       # Interactive UAV 360 viewer
│   │   └── ui/            # Reusable UI widgets
│   ├── pages/             # 10 Operational screen views
│   ├── layouts/           # AppLayout shell and TopHeader telemetry ribbon
│   ├── hooks/             # Custom state & telemetry hooks
│   ├── services/          # API client, WebSocket telemetry stream, Supabase client
│   ├── context/           # AppContext with offline demo persistence
│   ├── utils/             # Formatters, telemetry math, CSV/JSON export
│   ├── styles/            # Tailwind v4 configuration & base typography
│   ├── routes/            # React Router v7 hierarchy
│   └── types/             # TypeScript interfaces
├── .env.example
├── package.json
└── vite.config.ts
```

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```
Accessible at [http://localhost:5173](http://localhost:5173).

### 4. Build for Production
```bash
npm run build
```

