import React, { useState, useEffect, useRef } from 'react';
import { DEMO_MISSIONS } from '../../data/demoData';
import { MissionRecord, ReplayTelemetryPoint } from '../../types';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Download,
  Layers,
  MapPin,
  Clock,
  Compass,
  Gauge,
  Navigation,
  ChevronDown,
  Maximize2,
  Minimize2,
  Calendar,
  CheckCircle2,
  Battery,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export const MissionReplayPage: React.FC = () => {
  const [selectedMissionId, setSelectedMissionId] = useState<string>('Surveillance_2026_10_23_01');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [playbackIndex, setPlaybackIndex] = useState<number>(5); // default around 14:28:43
  const [mapLayer, setMapLayer] = useState<'Satellite' | 'Terrain' | 'Street'>('Satellite');
  const [mapMode, setMapMode] = useState<'Map' | '3D View'>('Map');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const currentMission: MissionRecord =
    DEMO_MISSIONS.find((m) => m.id === selectedMissionId) || DEMO_MISSIONS[0];

  const timeline = currentMission.timeline;
  const currentTelemetry: ReplayTelemetryPoint =
    timeline[playbackIndex] || timeline[0];

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = Math.round(1000 / playbackSpeed);
    const interval = setInterval(() => {
      setPlaybackIndex((prev) => {
        if (prev >= timeline.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, timeline.length]);

  // Export mission data to CSV
  const handleExportCSV = () => {
    const headers = 'Time,Latitude,Longitude,Altitude_ft,Speed_ms,Battery_pct,Heading_deg,RPM,CHT_C,Oil_bar,Fuel_Lhr,Vib_g\n';
    const rows = timeline
      .map(
        (p) =>
          `${p.time},${p.lat},${p.lng},${p.altitude},${p.speed},${p.battery},${p.heading},${p.rpm},${p.cht},${p.oilPressure},${p.fuelFlow},${p.vibration}`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentMission.id}_replay_telemetry.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
  };

  // Chart data formatted for synchronized graph
  const chartData = timeline.map((p, idx) => ({
    time: p.time.slice(0, 5),
    alt: p.altitude,
    speed: Math.round(p.speed * 10), // scaled for visual distinction
    battery: p.battery,
    heading: Math.round(p.heading / 2),
    rawTime: p.time,
    index: idx,
  }));

  return (
    <div ref={containerRef} className="space-y-6 max-w-7xl mx-auto pb-10 bg-slate-50">
      {/* =========================================
          PAGE HEADER & MISSION SELECTOR
          ========================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Mission Replay</h2>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mission Dropdown */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-mono">Select Mission</span>
            <div className="relative">
              <select
                value={selectedMissionId}
                onChange={(e) => {
                  setSelectedMissionId(e.target.value);
                  setPlaybackIndex(0);
                  setIsPlaying(false);
                }}
                className="pl-3 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-hidden"
              >
                {DEMO_MISSIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Map Layer Dropdown */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-mono">Map Layer</span>
            <select
              value={mapLayer}
              onChange={(e) => setMapLayer(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs"
            >
              <option value="Satellite">Satellite</option>
              <option value="Terrain">Terrain</option>
              <option value="Street">Street Vector</option>
            </select>
          </div>

          {/* Export Replay Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Replay</span>
          </button>
        </div>
      </div>

      {/* =========================================
          MAP & SYNC TELEMETRY SECTION
          ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Interactive Map with Route (8 Cols - Stretches flush with right-side info cards) */}
        <div className="lg:col-span-8 flex flex-col justify-between gap-4 h-full">
          <div className="relative flex-1 min-h-[420px] rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-sm">
            {/* Satellite Background Simulation */}
            <div
              className="absolute inset-0 opacity-80"
              style={{
                backgroundImage:
                  'radial-gradient(ellipse at 40% 50%, #1e293b 0%, #0f172a 60%, #020617 100%)',
              }}
            />

            {/* Map vs 3D View Toggle (Top Left) */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-1 p-1 rounded-lg bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-md text-xs">
              <button
                onClick={() => setMapMode('Map')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  mapMode === 'Map' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Map
              </button>
              <button
                onClick={() => setMapMode('3D View')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  mapMode === '3D View' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                3D View
              </button>
            </div>

            {/* Route Segment Legend (Top Right) */}
            <div className="absolute top-4 right-4 z-20 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-[11px] font-mono text-slate-300 space-y-1.5 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Normal Flight</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Surveillance Area</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-300" />
                <span>High Altitude</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Turn/Manoeuvre</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>Return</span>
              </div>
            </div>

            {/* Tactical Scale Indicator (Bottom Left) */}
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-700 text-[10px] font-mono text-slate-300">
              <div className="w-12 h-1 bg-white" />
              <span>2 km</span>
            </div>

            {/* SVG Mission Flight Path Loop */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Segment 1: Blue Normal Flight */}
              <path
                d="M 120 280 C 180 180, 240 140, 320 130"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Segment 2: Green Surveillance Area */}
              <path
                d="M 320 130 C 400 120, 480 130, 520 150"
                fill="none"
                stroke="#10b981"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Segment 3: Sky Blue High Altitude */}
              <path
                d="M 520 150 C 560 170, 580 200, 570 230"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Segment 4: Amber Turn/Manoeuvre */}
              <path
                d="M 570 230 C 560 260, 540 280, 500 300"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Segment 5: Red Return */}
              <path
                d="M 500 300 C 420 330, 240 330, 120 280"
                fill="none"
                stroke="#ef4444"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Waypoint Nodes along route */}
              <circle cx="120" cy="280" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="2" />
              <circle cx="220" cy="190" r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="320" cy="130" r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="440" cy="125" r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="520" cy="150" r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="570" cy="230" r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="500" cy="300" r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
            </svg>

            {/* Start Marker */}
            <div className="absolute left-[110px] top-[260px] -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 bg-emerald-950/90 text-emerald-400 border border-emerald-500/60 px-2 py-0.5 rounded text-[10px] font-mono shadow-md">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>Start 14:02:15</span>
            </div>

            {/* End Marker */}
            <div className="absolute left-[510px] top-[320px] -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 bg-red-950/90 text-red-400 border border-red-500/60 px-2 py-0.5 rounded text-[10px] font-mono shadow-md">
              <MapPin className="w-3 h-3 text-red-400" />
              <span>End 14:56:32</span>
            </div>

            {/* Current UAV Animated Position on Map based on playback scrubber */}
            {(() => {
              // Map playbackIndex (0 to 10) along spline
              const progress = playbackIndex / (timeline.length - 1);
              const xPos = 120 + Math.sin(progress * Math.PI) * 440;
              const yPos = 280 - Math.sin(progress * Math.PI) * 150 + Math.cos(progress * Math.PI * 2) * 20;

              return (
                <div
                  style={{ left: `${xPos}px`, top: `${yPos}px` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-300"
                >
                  {/* Heading plane */}
                  <div
                    style={{ transform: `rotate(${currentTelemetry.heading}deg)` }}
                    className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl border-2 border-white ring-4 ring-blue-500/30"
                  >
                    <Navigation className="w-5 h-5 -rotate-45" />
                  </div>
                  {/* Callout */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-white font-mono text-[9px] px-1.5 py-0.5 rounded border border-slate-700">
                    {currentTelemetry.altitude} ft · {currentTelemetry.speed} m/s
                  </div>
                </div>
              );
            })()}
          </div>

          {/* =========================================
              PLAYBACK CONTROLS STRIP (Synchronized)
              ========================================= */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-4 shrink-0">
            {/* Play/Pause/Stop/Step */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-sm transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setPlaybackIndex(0);
                }}
                title="Stop Replay"
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setPlaybackIndex((p) => Math.max(0, p - 1))}
                title="Step Backward"
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setPlaybackIndex((p) => Math.min(timeline.length - 1, p + 1))}
                title="Step Forward"
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scrubbable Timeline Slider */}
            <div className="flex-1 w-full space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>{currentMission.startTime}</span>
                <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {currentTelemetry.time}
                </span>
                <span>{currentMission.endTime}</span>
              </div>
              <input
                type="range"
                min="0"
                max={timeline.length - 1}
                value={playbackIndex}
                onChange={(e) => setPlaybackIndex(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Playback Speed Selector */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-mono">Speed</span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold bg-white"
                >
                  <option value="0.5">0.5x</option>
                  <option value="1">1x</option>
                  <option value="2">2x</option>
                  <option value="4">4x</option>
                </select>
              </div>

              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                title="Toggle Fullscreen"
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors mt-3"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Mission Info & Live Replay Telemetry (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-4 h-full">
          {/* Mission Information Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Mission Information</h3>
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                  {currentMission.status}
                </span>
              </div>

              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Mission ID</span>
                  <span className="font-mono font-semibold text-slate-800">{currentMission.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Mission Type</span>
                  <span className="font-medium text-slate-800">{currentMission.type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Date</span>
                  <span className="font-mono text-slate-800">{currentMission.date}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Start Time</span>
                  <span className="font-mono text-slate-800">{currentMission.startTime}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">End Time</span>
                  <span className="font-mono text-slate-800">{currentMission.endTime}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-mono font-semibold text-slate-800">{currentMission.duration}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Total Distance</span>
                  <span className="font-mono font-semibold text-slate-800">{currentMission.totalDistanceKm} km</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Max Altitude</span>
                  <span className="font-mono text-slate-800">{currentMission.maxAltitudeFt} ft</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Avg Speed</span>
                  <span className="font-mono text-slate-800">{currentMission.avgSpeedMs} m/s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Replay Telemetry (Synchronized to scrub cursor) */}
          <div className="p-5 rounded-2xl bg-white border border-blue-200 shadow-2xs space-y-3 flex flex-col justify-between shrink-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Live Replay Telemetry</h3>
              <span className="font-mono text-xs text-blue-600 font-bold">{currentTelemetry.time}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">Latitude</span>
                <p className="font-bold font-mono text-slate-900">{currentTelemetry.lat}° N</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">Longitude</span>
                <p className="font-bold font-mono text-slate-900">{currentTelemetry.lng}° E</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">Altitude</span>
                <p className="font-bold font-mono text-emerald-600">{currentTelemetry.altitude} ft</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">Ground Speed</span>
                <p className="font-bold font-mono text-blue-600">{currentTelemetry.speed} m/s</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">Heading</span>
                <p className="font-bold font-mono text-purple-600">{currentTelemetry.heading}°</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">Battery</span>
                <p className="font-bold font-mono text-emerald-600">{currentTelemetry.battery}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          HISTORICAL CHARTS & CHRONOLOGICAL MISSION EVENTS
          ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Flight Parameters (Replay) Chart (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Flight Parameters (Replay)</h3>
              <span className="font-mono text-xs text-slate-500">
                Synchronized Cursor: <span className="text-blue-600 font-bold">{currentTelemetry.time}</span>
              </span>
            </div>

            <div className="h-56 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} fontVariant="tabular-nums" />
                  <YAxis stroke="#94a3b8" fontSize={10} fontVariant="tabular-nums" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                    }}
                  />
                  <ReferenceLine x={currentTelemetry.time.slice(0, 5)} stroke="#2563eb" strokeDasharray="3 3" strokeWidth={2} label={{ value: 'Cursor', position: 'top', fill: '#2563eb', fontSize: 10 }} />
                  <Line type="monotone" dataKey="alt" name="Altitude (ft)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="speed" name="Speed (m/s x10)" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="battery" name="Battery (%)" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="heading" name="Heading (° / 2)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600 border-t border-slate-100 pt-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Altitude (ft)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Speed (m/s x10)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Battery (%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Heading (°)
            </span>
          </div>
        </div>

        {/* Right: Chronological Mission Events (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Mission Events</h3>
            <span className="text-xs font-mono text-slate-400">7 Milestones</span>
          </div>

          <div className="space-y-2.5 flex-1 max-h-60 overflow-y-auto pr-1">
            {currentMission.events.map((ev, i) => {
              // Check if playback has passed this event
              const isCurrent = currentTelemetry.time >= ev.time;

              return (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 p-2 rounded-lg text-xs transition-colors ${
                    isCurrent ? 'bg-blue-50/60 border border-blue-200/60' : 'text-slate-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      ev.type === 'start' || ev.type === 'completed'
                        ? 'bg-emerald-500'
                        : ev.type === 'area'
                        ? 'bg-blue-500'
                        : ev.type === 'segment'
                        ? 'bg-amber-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{ev.title}</span>
                      <span className="font-mono text-[10px] text-slate-500">{ev.time}</span>
                    </div>
                    <p className="font-mono text-[10px] text-slate-400 truncate">{ev.coordinates}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
