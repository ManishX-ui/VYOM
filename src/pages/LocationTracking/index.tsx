import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { DEMO_MISSIONS } from '../../data/demoData';
import {
  Navigation,
  Compass,
  MapPin,
  Crosshair,
  Layers,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Plane,
  Radio,
  Gauge,
  Thermometer,
  Shield,
  Activity,
  ArrowUpRight,
  Maximize2,
} from 'lucide-react';

export const LocationTrackingPage: React.FC = () => {
  const { selectedUAV, telemetry } = useApp();

  const [followUAV, setFollowUAV] = useState(true);
  const [showFlightPath, setShowFlightPath] = useState(true);
  const [showWaypoints, setShowWaypoints] = useState(true);
  const [mapLayer, setMapLayer] = useState<'satellite' | 'terrain' | 'vector'>('satellite');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Current UAV live position simulated around mission route
  const [uavPos, setUavPos] = useState({
    lat: 21.2685,
    lng: 81.6502,
    altFt: 18000,
    speedMs: 32.1,
    headingDeg: 135,
  });

  const waypoints = DEMO_MISSIONS[0].waypoints;

  // Simulate gentle drone drift
  useEffect(() => {
    const timer = setInterval(() => {
      setUavPos((prev) => {
        const dLat = (Math.sin(Date.now() / 4000) * 0.0003);
        const dLng = (Math.cos(Date.now() / 4000) * 0.0004);
        return {
          ...prev,
          lat: Number((21.2685 + dLat).toFixed(4)),
          lng: Number((81.6502 + dLng).toFixed(4)),
          headingDeg: 135 + Math.round(Math.sin(Date.now() / 5000) * 4),
        };
      });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const handleCenter = () => {
    setPanOffset({ x: 0, y: 0 });
    setZoomLevel(1);
    setFollowUAV(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Live UAV Location &amp; Flight Path Tracking
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            GPS Fix: 3D DGPS (14 Sats)
          </span>
        </div>
      </div>

      {/* =========================================
          MAP WORKSPACE & TELEMETRY COCKPIT
          ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Map Container (8 Cols - Stretches flush with right-side telemetry cards) */}
        <div className="lg:col-span-8 bg-slate-950 rounded-2xl border border-slate-800 shadow-md relative overflow-hidden flex flex-col h-full min-h-[580px] select-none">
          {/* Top Floating Map Controls Toolbar */}
          <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            {/* Layer Selection */}
            <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-lg bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-lg text-xs font-medium text-slate-300">
              <Layers className="w-3.5 h-3.5 text-blue-400 ml-1.5" />
              <button
                onClick={() => setMapLayer('satellite')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  mapLayer === 'satellite' ? 'bg-blue-600 text-white font-semibold' : 'hover:text-white'
                }`}
              >
                Satellite
              </button>
              <button
                onClick={() => setMapLayer('terrain')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  mapLayer === 'terrain' ? 'bg-blue-600 text-white font-semibold' : 'hover:text-white'
                }`}
              >
                Terrain
              </button>
              <button
                onClick={() => setMapLayer('vector')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  mapLayer === 'vector' ? 'bg-blue-600 text-white font-semibold' : 'hover:text-white'
                }`}
              >
                Vector
              </button>
            </div>

            {/* Toggle Overlays: Path & Waypoints */}
            <div className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-lg text-xs text-slate-300">
              <button
                onClick={() => setShowFlightPath(!showFlightPath)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                  showFlightPath ? 'bg-slate-800 text-blue-300 font-medium' : 'text-slate-500'
                }`}
              >
                {showFlightPath ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>Path</span>
              </button>

              <button
                onClick={() => setShowWaypoints(!showWaypoints)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                  showWaypoints ? 'bg-slate-800 text-blue-300 font-medium' : 'text-slate-500'
                }`}
              >
                {showWaypoints ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>Waypoints</span>
              </button>
            </div>
          </div>

          {/* Right Floating Nav Controls */}
          <div className="absolute right-4 top-20 z-20 flex flex-col gap-1.5">
            <button
              onClick={() => setZoomLevel((z) => Math.min(2, z + 0.25))}
              title="Zoom In"
              className="p-2 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white transition-colors shadow-lg"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
              title="Zoom Out"
              className="p-2 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white transition-colors shadow-lg"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleCenter}
              title="Center on UAV"
              className={`p-2 rounded-lg border transition-colors shadow-lg ${
                followUAV
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>

          {/* Tactical Map Viewport Canvas with Topo Grid & Satellite Aesthetic */}
          <div
            className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden"
            style={{
              backgroundImage:
                mapLayer === 'satellite'
                  ? 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 70%, #020617 100%)'
                  : mapLayer === 'terrain'
                  ? 'radial-gradient(circle at 50% 50%, #292524 0%, #1c1917 70%, #0c0a09 100%)'
                  : 'radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)',
            }}
          >
            {/* Tactical Coordinate Radar Circles & Grid */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.4" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              <circle cx="50%" cy="50%" r="140" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.5" />
              <circle cx="50%" cy="50%" r="240" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.3" />
            </svg>

            {/* Flight Path SVG Route */}
            {showFlightPath && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                {/* Outer planned track */}
                <path
                  d="M 120 380 Q 240 180 380 140 T 560 180 T 580 340 T 450 420 Z"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                  strokeOpacity="0.75"
                />
                {/* Completed trail glow */}
                <path
                  d="M 120 380 Q 240 180 380 140 T 500 160"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            )}

            {/* Waypoints */}
            {showWaypoints && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Start */}
                <div className="absolute left-[110px] top-[370px] -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex items-center gap-1.5 bg-emerald-950/90 text-emerald-400 border border-emerald-500/60 px-2 py-0.5 rounded text-[10px] font-mono shadow-md">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  <span>START (Airbase R-09)</span>
                </div>

                {/* Waypoint 1 */}
                <div className="absolute left-[240px] top-[240px] -translate-x-1/2 -translate-y-1/2 pointer-events-auto bg-slate-900/90 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono">
                  WP1 · 420ft
                </div>

                {/* Surveillance Zone entry */}
                <div className="absolute left-[380px] top-[140px] -translate-x-1/2 -translate-y-1/2 pointer-events-auto bg-blue-950/90 text-blue-300 border border-blue-500/60 px-2 py-0.5 rounded text-[10px] font-mono">
                  SURVEILLANCE SECTOR ALPHA
                </div>

                {/* Waypoint Turn */}
                <div className="absolute left-[580px] top-[340px] -translate-x-1/2 -translate-y-1/2 pointer-events-auto bg-slate-900/90 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono">
                  WP3 (Turn)
                </div>
              </div>
            )}

            {/* Current UAV Tactical Marker with Heading & Orientation */}
            <div
              className="absolute left-[500px] top-[160px] -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-30 transition-all duration-700"
            >
              {/* Radar sweep pulse */}
              <div className="absolute -inset-6 rounded-full bg-blue-500/20 border border-blue-400/40 animate-ping pointer-events-none" />

              {/* Drone Icon Oriented to Heading */}
              <div
                style={{ transform: `rotate(${uavPos.headingDeg}deg)` }}
                className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl border-2 border-white ring-4 ring-blue-500/30"
              >
                <Plane className="w-5 h-5 -rotate-45" />
              </div>

              {/* Heading Vector Leader Line */}
              <div className="absolute top-1/2 left-full w-8 h-0.5 bg-blue-400 pointer-events-none" />

              {/* Floating ID Tag */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-7 whitespace-nowrap bg-slate-900/95 text-white font-mono text-[10px] px-2 py-0.5 rounded border border-slate-700 shadow-md">
                {selectedUAV.name} · {uavPos.altFt} ft
              </div>
            </div>

            {/* Bottom Left Coordinate Telemetry HUD */}
            <div className="absolute bottom-4 left-4 z-20 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300 backdrop-blur-md shadow-xl flex items-center gap-4">
              <div>
                <span className="text-slate-500 text-[10px] block">LATITUDE</span>
                <span className="font-bold text-white">{uavPos.lat}° N</span>
              </div>
              <div className="border-l border-slate-700 pl-3">
                <span className="text-slate-500 text-[10px] block">LONGITUDE</span>
                <span className="font-bold text-white">{uavPos.lng}° E</span>
              </div>
              <div className="border-l border-slate-700 pl-3">
                <span className="text-slate-500 text-[10px] block">HEADING</span>
                <span className="font-bold text-blue-400">{uavPos.headingDeg}°</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Side Telemetry Panel (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-4 h-full">
          {/* Active Flight Coordinates Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex-1 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Airspace Telemetry</h3>
                <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                  LIVE STREAM
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-3 items-stretch">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between h-full space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Altitude (MSL)</span>
                  <p className="text-xl font-bold font-mono text-slate-900">{uavPos.altFt} ft</p>
                  <span className="text-[10px] font-mono text-slate-500">AGL: 820 ft</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between h-full space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Ground Speed</span>
                  <p className="text-xl font-bold font-mono text-slate-900">{uavPos.speedMs} m/s</p>
                  <span className="text-[10px] font-mono text-slate-500">IAS: 62.4 kts</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between h-full space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Compass Heading</span>
                  <p className="text-xl font-bold font-mono text-slate-900">{uavPos.headingDeg}° SE</p>
                  <span className="text-[10px] font-mono text-slate-500">Turn Rate: 0.2°/s</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between h-full space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Avionics Battery</span>
                  <p className="text-xl font-bold font-mono text-emerald-600">78%</p>
                  <span className="text-[10px] font-mono text-slate-500">24.1 V DC</span>
                </div>
              </div>
            </div>

            {/* Synchronized Engine State */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <h4 className="text-xs font-bold text-slate-800">Synchronized Engine Datalink</h4>
              <div className="flex items-center justify-between text-xs font-mono p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Engine Speed:</span>
                <span className="font-bold text-blue-600">{telemetry.rpm} RPM</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Cylinder Head (CHT):</span>
                <span className="font-bold text-amber-600">{telemetry.cht} °C</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Oil System:</span>
                <span className="font-bold text-slate-800">{telemetry.oilPressure} bar</span>
              </div>
            </div>
          </div>

          {/* Flight Plan & Geofence Corridor */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
            <h4 className="font-bold text-slate-900 text-sm">Geofence &amp; Navigation Corridor</h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="flex items-center gap-1.5 font-medium">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Airspace Boundary: Sector 04</span>
                </span>
                <span className="font-mono font-semibold">WITHIN LIMITS</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Next Waypoint</span>
                <span className="font-mono font-semibold text-slate-800">WP3 (High Altitude)</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Distance to Next WP</span>
                <span className="font-mono text-slate-800">4.2 km</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-slate-500">Estimated Time Enroute</span>
                <span className="font-mono text-slate-800">02 min 18 sec</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
