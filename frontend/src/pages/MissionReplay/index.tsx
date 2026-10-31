import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { apiService } from '../../services/api';
import { DEMO_MISSIONS } from '../../data/demoData';
import { MissionRecord, ReplayTelemetryPoint, MissionEvent } from '../../types';
import { MissionReplayMap, MapLayerType } from '../../components/replay/MissionReplayMap';
import {
  Play,
  Pause,
  RotateCcw,
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
  Search,
  Filter,
  AlertTriangle,
  Info,
  ShieldCheck,
  Activity,
  Fuel,
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
  const {
    activeReplayMission,
    replayPlaybackIndex,
    isReplayPlaying,
    replayPlaybackSpeed,
    setReplayMission,
    setReplayPlaybackIndex,
    setIsReplayPlaying,
    setReplayPlaybackSpeed,
    stepReplay,
    stopReplay,
    restartReplay,
    telemetryMode,
    setTelemetryMode,
    selectedUAV,
    showToast,
  } = useApp();

  const [missionsList, setMissionsList] = useState<MissionRecord[]>(DEMO_MISSIONS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [mapLayer, setMapLayer] = useState<MapLayerType>('Satellite');
  const [mapMode, setMapMode] = useState<'Map' | '3D View'>('Map');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'analytics'>('chart');

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch available missions from backend API or fallback to DEMO_MISSIONS
  useEffect(() => {
    let isMounted = true;
    const fetchMissions = async () => {
      try {
        const missions = await apiService.getMissions();
        if (isMounted && Array.isArray(missions) && missions.length > 0) {
          setMissionsList(missions);
          // Set initial replay mission if none active
          if (!activeReplayMission) {
            setReplayMission(missions[0]);
          }
        }
      } catch (err) {
        // Fallback gracefully to demo missions
        if (isMounted && !activeReplayMission) {
          setReplayMission(DEMO_MISSIONS[0]);
        }
      }
    };

    fetchMissions();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter missions based on search query and status filter
  const filteredMissions = useMemo(() => {
    return missionsList.filter((m) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.uavId && m.uavId.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'All' || m.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [missionsList, searchQuery, statusFilter]);

  const currentMission: MissionRecord =
    activeReplayMission || DEMO_MISSIONS[0];

  const timeline = currentMission.timeline || [];
  const telemetryAvailable = currentMission.telemetryAvailable !== false && timeline.length > 0;
  
  const currentTelemetry: ReplayTelemetryPoint =
    timeline[replayPlaybackIndex] ||
    timeline[0] || {
      time: currentMission.startTime || '14:15:00',
      lat: currentMission.waypoints?.[0]?.lat || 21.2485,
      lng: currentMission.waypoints?.[0]?.lng || 81.6202,
      altitude: currentMission.maxAltitudeFt || 18000,
      speed: currentMission.avgSpeedMs || 32,
      battery: 95,
      heading: 42,
      rpm: 2450,
      cht: 185,
      egt: 615,
      oilPressure: 4.2,
      oilTemperature: 95,
      fuelFlow: 12.2,
      vibration: 0.27,
      segmentType: 'Normal Flight',
    };

  // Export mission data to CSV
  const handleExportCSV = () => {
    if (!telemetryAvailable) {
      showToast('Export Unavailable', 'No recorded telemetry points to export.', 'warning');
      return;
    }

    const headers =
      'Time,Latitude,Longitude,Altitude_ft,Speed_ms,Battery_pct,Heading_deg,RPM,CHT_C,EGT_C,Oil_bar,OilTemp_C,Fuel_Lhr,Vib_g\n';
    const rows = timeline
      .map(
        (p) =>
          `${p.time},${p.lat},${p.lng},${p.altitude},${p.speed},${p.battery},${p.heading},${p.rpm},${p.cht},${p.egt ?? 615},${p.oilPressure},${p.oilTemperature ?? 95},${p.fuelFlow},${p.vibration}`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentMission.id}_replay_telemetry.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Export Successful', `Exported ${timeline.length} telemetry records to CSV`, 'success');
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

  // Seek timeline to a specific event timestamp
  const handleEventClick = (event: MissionEvent) => {
    if (!telemetryAvailable) return;
    const matchIndex = timeline.findIndex((p) => p.time >= event.time);
    if (matchIndex !== -1) {
      setReplayPlaybackIndex(matchIndex);
      showToast('Scrubbed to Event', `${event.title} at ${event.time}`, 'info');
    }
  };

  // Synchronized graph data
  const chartData = useMemo(() => {
    return timeline.map((p, idx) => ({
      time: p.time.slice(0, 5),
      alt: p.altitude,
      speed: Math.round(p.speed * 10), // scaled for visual distinction
      battery: p.battery,
      heading: Math.round(p.heading / 2),
      rpm: Math.round(p.rpm / 10),
      cht: p.cht,
      rawTime: p.time,
      index: idx,
    }));
  }, [timeline]);

  return (
    <div ref={containerRef} className="space-y-6 max-w-7xl mx-auto pb-10 bg-slate-50">
      {/* =========================================
          PAGE HEADER & MISSION SELECTOR
          ========================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Mission Replay</h2>
            <span
              className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                telemetryMode === 'REPLAY'
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-amber-50 text-amber-700 border-amber-300'
              }`}
            >
              MODE: {telemetryMode} {telemetryMode === 'REPLAY' ? '(READ-ONLY ARCHIVE)' : ''}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronized historical flight playback &bull; Rotax 914 F engine telemetry &bull; Geo-referenced flight corridor
          </p>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mission Dropdown */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-mono">Select Mission</span>
            <div className="relative">
              <select
                value={currentMission.id}
                onChange={(e) => {
                  const found = missionsList.find((m) => m.id === e.target.value);
                  if (found) {
                    setReplayMission(found);
                  }
                }}
                className="pl-3 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-hidden"
              >
                {filteredMissions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id} &bull; {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-mono">Status Filter</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs"
            >
              <option value="All">All Missions</option>
              <option value="Completed">Completed</option>
              <option value="In-Flight">In-Flight</option>
              <option value="Scheduled">Scheduled</option>
            </select>
          </div>

          {/* Map Layer Dropdown */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-mono">Map Layer</span>
            <select
              value={mapLayer}
              onChange={(e) => setMapLayer(e.target.value as MapLayerType)}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs"
            >
              <option value="Satellite">Satellite</option>
              <option value="Street">Street Map</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Terrain">Terrain</option>
            </select>
          </div>

          {/* Replay Mode Switcher */}
          {telemetryMode !== 'REPLAY' && (
            <button
              onClick={() => setTelemetryMode('REPLAY')}
              className="flex items-center gap-1.5 mt-4 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Activate Replay Mode</span>
            </button>
          )}

          {/* Export Replay Button */}
          <button
            onClick={handleExportCSV}
            disabled={!telemetryAvailable}
            className={`flex items-center gap-2 mt-4 px-4 py-2 rounded-xl border text-xs font-semibold shadow-2xs transition-colors ${
              telemetryAvailable
                ? 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Replay</span>
          </button>
        </div>
      </div>

      {/* Telemetry Unavailable Notice when scheduled/unrecorded */}
      {!telemetryAvailable && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-amber-800">
              TELEMETRY ARCHIVE UNAVAILABLE FOR THIS MISSION
            </p>
            <p className="text-amber-700 mt-0.5">
              Mission <span className="font-mono font-bold">{currentMission.id}</span> is marked as{' '}
              <span className="font-bold">{currentMission.status}</span>. Raw flight black-box recordings and GPS logs have not yet been ingested into the historical database. Planned waypoints remain visible on the Leaflet map.
            </p>
          </div>
        </div>
      )}

      {/* =========================================
          MAP & SYNC TELEMETRY SECTION
          ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Interactive Map with Route (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between gap-4 h-full">
          <MissionReplayMap
            mission={currentMission}
            currentTelemetry={currentTelemetry}
            playbackIndex={replayPlaybackIndex}
            totalPoints={timeline.length}
            isPlaying={isReplayPlaying}
            playbackSpeed={replayPlaybackSpeed}
            mapLayer={mapLayer}
            mapMode={mapMode}
            onTogglePlay={() => {
              if (!telemetryAvailable) return;
              if (telemetryMode !== 'REPLAY') setTelemetryMode('REPLAY');
              setIsReplayPlaying(!isReplayPlaying);
            }}
            onStop={() => stopReplay()}
            onReplay={() => {
              if (!telemetryAvailable) return;
              if (telemetryMode !== 'REPLAY') setTelemetryMode('REPLAY');
              restartReplay();
            }}
            onSeek={(idx) => {
              if (!telemetryAvailable) return;
              if (telemetryMode !== 'REPLAY') setTelemetryMode('REPLAY');
              setReplayPlaybackIndex(idx);
            }}
            onChangeSpeed={(spd) => setReplayPlaybackSpeed(spd)}
            onToggleMapMode={setMapMode}
          />

          {/* =========================================
              PLAYBACK CONTROLS STRIP (Centralized Clock)
              ========================================= */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-4 shrink-0">
            {/* Play/Pause/Stop/Replay/Step */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (!telemetryAvailable) return;
                  if (telemetryMode !== 'REPLAY') setTelemetryMode('REPLAY');
                  setIsReplayPlaying(!isReplayPlaying);
                }}
                disabled={!telemetryAvailable}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-colors ${
                  telemetryAvailable
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isReplayPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                onClick={() => stopReplay()}
                disabled={!telemetryAvailable}
                title="Stop Replay"
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <Square className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  if (!telemetryAvailable) return;
                  if (telemetryMode !== 'REPLAY') setTelemetryMode('REPLAY');
                  restartReplay();
                }}
                disabled={!telemetryAvailable}
                title="Replay from Beginning"
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => stepReplay(-1)}
                disabled={!telemetryAvailable}
                title="Step Backward"
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => stepReplay(1)}
                disabled={!telemetryAvailable}
                title="Step Forward"
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scrubbable Timeline Slider */}
            <div className="flex-1 w-full space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>{currentMission.startTime || '00:00:00'}</span>
                <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {telemetryAvailable ? currentTelemetry.time : 'N/A'}
                </span>
                <span>{currentMission.endTime || '00:00:00'}</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(0, timeline.length - 1)}
                value={replayPlaybackIndex}
                disabled={!telemetryAvailable}
                onChange={(e) => {
                  if (telemetryMode !== 'REPLAY') setTelemetryMode('REPLAY');
                  setReplayPlaybackIndex(parseInt(e.target.value, 10));
                }}
                className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer disabled:cursor-not-allowed"
              />
            </div>

            {/* Playback Speed Selector */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-mono">Speed</span>
                <select
                  value={replayPlaybackSpeed}
                  onChange={(e) => setReplayPlaybackSpeed(parseFloat(e.target.value))}
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
                <span
                  className={`font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    currentMission.status === 'Completed'
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : currentMission.status === 'In-Flight'
                      ? 'text-blue-700 bg-blue-50 border-blue-200'
                      : 'text-amber-700 bg-amber-50 border-amber-200'
                  }`}
                >
                  {currentMission.status}
                </span>
              </div>

              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Mission ID</span>
                  <span className="font-mono font-semibold text-slate-800">{currentMission.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Assigned UAV</span>
                  <span className="font-mono font-semibold text-blue-600">{currentMission.uavId || selectedUAV.id}</span>
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
                  <span className="text-slate-500">Data Source</span>
                  <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                    {currentMission.dataSource || 'FLIGHT_LOG_ARCHIVE'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Synchronized Replay Telemetry Card */}
          <div className="p-5 rounded-2xl bg-white border border-blue-200 shadow-2xs space-y-3 flex flex-col justify-between shrink-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Synchronized Telemetry</h3>
              </div>
              <span className="font-mono text-xs text-blue-600 font-bold">
                {telemetryAvailable ? currentTelemetry.time : 'OFFLINE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">Engine RPM</span>
                <p className="font-bold font-mono text-blue-700">{currentTelemetry.rpm} RPM</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">CHT Cyl 1</span>
                <p className="font-bold font-mono text-amber-600">{currentTelemetry.cht}°C</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">Oil Pressure</span>
                <p className="font-bold font-mono text-slate-800">{currentTelemetry.oilPressure} bar</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">Fuel Flow</span>
                <p className="font-bold font-mono text-emerald-600">{currentTelemetry.fuelFlow} L/h</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">Altitude MSL</span>
                <p className="font-bold font-mono text-emerald-600">{currentTelemetry.altitude} ft</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-[10px] text-slate-400 font-mono">Ground Speed</span>
                <p className="font-bold font-mono text-purple-600">{currentTelemetry.speed} m/s</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          HISTORICAL CHARTS & CHRONOLOGICAL MISSION EVENTS
          ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Synchronized Graph & Mission Analytics (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('chart')}
                  className={`text-xs font-bold pb-1 transition-colors border-b-2 ${
                    activeTab === 'chart'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Flight Parameters Chart
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`text-xs font-bold pb-1 transition-colors border-b-2 ${
                    activeTab === 'analytics'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Mission Analytics Summary
                </button>
              </div>

              <span className="font-mono text-xs text-slate-500">
                Synchronized Cursor: <span className="text-blue-600 font-bold">{currentTelemetry.time}</span>
              </span>
            </div>

            {activeTab === 'chart' ? (
              <div className="h-56 w-full mt-3">
                {chartData.length > 0 ? (
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
                      <ReferenceLine
                        x={currentTelemetry.time.slice(0, 5)}
                        stroke="#2563eb"
                        strokeDasharray="3 3"
                        strokeWidth={2}
                        label={{ value: 'Cursor', position: 'top', fill: '#2563eb', fontSize: 10 }}
                      />
                      <Line type="monotone" dataKey="alt" name="Altitude (ft)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="speed" name="Speed (m/s x10)" stroke="#ef4444" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="cht" name="CHT (°C)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="battery" name="Battery (%)" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono">
                    No flight telemetry coordinates recorded for chart rendering.
                  </div>
                )}
              </div>
            ) : (
              /* Mission Analytics Summary Table */
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono">Total Distance</span>
                    <p className="font-bold text-slate-900 font-mono text-sm">{currentMission.totalDistanceKm} km</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono">Flight Duration</span>
                    <p className="font-bold text-slate-900 font-mono text-sm">{currentMission.duration}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono">Max Altitude</span>
                    <p className="font-bold text-blue-600 font-mono text-sm">{currentMission.maxAltitudeFt} ft</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono">Max Airspeed</span>
                    <p className="font-bold text-purple-600 font-mono text-sm">{currentMission.maxSpeedMs || 38.6} m/s</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono">Fuel Consumed</span>
                    <p className="font-bold text-emerald-600 font-mono text-sm">{currentMission.fuelUsedLiters || 34.8} L</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono">Sensor Warnings</span>
                    <p className="font-bold text-amber-600 font-mono text-sm">{currentMission.sensorWarningsCount || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono">Recorded Anomalies</span>
                    <p className="font-bold text-rose-600 font-mono text-sm">{currentMission.anomalyCount || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono">Engine Health Trend</span>
                    <p className="font-bold text-emerald-600 font-mono text-sm">{currentMission.summary?.engineHealthTrend || 'Nominal'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600 border-t border-slate-100 pt-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Altitude (ft)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Speed (m/s x10)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> CHT (°C)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Battery (%)
            </span>
          </div>
        </div>

        {/* Right: Chronological Mission Events (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Mission Events</h3>
            <span className="text-xs font-mono text-slate-400">
              {currentMission.events?.length || 0} Milestones
            </span>
          </div>

          <div className="space-y-2.5 flex-1 max-h-60 overflow-y-auto pr-1">
            {currentMission.events && currentMission.events.length > 0 ? (
              currentMission.events.map((ev, i) => {
                const isCurrent = currentTelemetry.time >= ev.time;

                return (
                  <button
                    key={i}
                    onClick={() => handleEventClick(ev)}
                    className={`w-full text-left flex items-start gap-2.5 p-2 rounded-lg text-xs transition-colors hover:bg-slate-100/80 cursor-pointer ${
                      isCurrent ? 'bg-blue-50/70 border border-blue-200/70' : 'text-slate-400'
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
                          : ev.type === 'warning'
                          ? 'bg-rose-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{ev.title}</span>
                        <span className="font-mono text-[10px] text-slate-500">{ev.time}</span>
                      </div>
                      <p className="font-mono text-[10px] text-slate-400 truncate">{ev.coordinates}</p>
                      {ev.description && (
                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{ev.description}</p>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono py-8">
                No milestone events recorded for this mission.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
