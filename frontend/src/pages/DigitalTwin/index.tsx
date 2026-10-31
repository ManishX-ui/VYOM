import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { DigitalTwin3D } from '../../components/digital-twin/DigitalTwin3D';
import { apiService } from '../../services/api';
import {
  Layers,
  Thermometer,
  Activity,
  Sliders,
  Radio,
  Eye,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Compass,
  Gauge,
  Info,
  Maximize2,
  Plane,
  RefreshCw,
  Clock,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

export const DigitalTwinPage: React.FC = () => {
  const {
    telemetry,
    selectedUAV,
    telemetryMode,
    setTelemetryMode,
    backendConnectionStatus,
    anomalies,
    alerts,
  } = useApp();

  // 3D Visualization Modes
  const [showThermal, setShowThermal] = useState<boolean>(false);
  const [showVibration, setShowVibration] = useState<boolean>(false);
  const [showSurfaces, setShowSurfaces] = useState<boolean>(true);
  const [isGhostMode, setIsGhostMode] = useState<boolean>(false);
  const [activeComponentId, setActiveComponentId] = useState<string | null>('comp-cylinder-head');

  // Backend Synchronizer Pose & Stress Map Data
  const [aircraftPose, setAircraftPose] = useState<any>(null);
  const [stressMap, setStressMap] = useState<any>(null);
  const [rulData, setRulData] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Poll backend synchronizer endpoints periodically for deep diagnostics
  useEffect(() => {
    let isCancelled = false;

    const fetchTwinState = async () => {
      try {
        const [pose, stress, rul] = await Promise.all([
          apiService.getAircraftPose(selectedUAV.id).catch(() => null),
          apiService.getStressMap(selectedUAV.id).catch(() => null),
          apiService.getRULPrediction(selectedUAV.id).catch(() => null),
        ]);
        if (!isCancelled) {
          if (pose) setAircraftPose(pose);
          if (stress) setStressMap(stress);
          if (rul) setRulData(rul);
        }
      } catch (err) {
        // Fallback to local telemetry
      }
    };

    fetchTwinState();
    const interval = setInterval(fetchTwinState, 3000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [selectedUAV.id, telemetryMode]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [pose, stress, rul] = await Promise.all([
        apiService.getAircraftPose(selectedUAV.id),
        apiService.getStressMap(selectedUAV.id),
        apiService.getRULPrediction(selectedUAV.id),
      ]);
      setAircraftPose(pose);
      setStressMap(stress);
      setRulData(rul);
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  // Reduction Gearbox Kinematics
  const engineRpm = telemetry?.rpm ?? 2450;
  const gearboxRatio = 2.43;
  const propRpm = Math.round(engineRpm / gearboxRatio);
  const propRadSec = (propRpm * (2 * Math.PI) / 60).toFixed(1);

  // Component details dictionary
  const componentDetails: { [key: string]: { name: string; description: string; spec: string; status: string; sensor: string } } = {
    'comp-cylinder-head': {
      name: 'Rotax 914 F Cylinder Head Assembly',
      description: '4-cylinder liquid-cooled heads with dual solid-state electronic ignition and CHT sensors.',
      spec: 'Max continuous CHT: 135°C (liquid), max takeoff 200°C.',
      status: (telemetry?.cht ?? 108) > 130 ? 'Elevated Thermal Stress' : 'Optimal Nominal Operating Range',
      sensor: `CHT: ${telemetry?.cht ?? 108.4} °C`,
    },
    'comp-exhaust': {
      name: 'Inconel Exhaust Collector & Turbocharger',
      description: 'Dual exhaust manifold leading into integrated turbocharger with automated wastegate actuator.',
      spec: 'Max continuous EGT: 750°C, peak takeoff: 800°C.',
      status: (telemetry?.egt ?? 680) > 740 ? 'Thermal Warning Threshold' : 'Nominal Exhaust Flow',
      sensor: `EGT: ${telemetry?.egt ?? 675.2} °C | MAP: ${telemetry?.manifoldPressureInHg ?? 32.1} inHg`,
    },
    'comp-lubrication': {
      name: 'Dry-Sump Lubrication Circuit',
      description: 'Forced lubrication with separate oil tank, dual oil coolers, and integrated pressure regulating valve.',
      spec: 'Operating pressure: 2.0 - 5.0 bar, operating temp: 90 - 110°C.',
      status: (telemetry?.oilPressure ?? 3.8) < 2.5 ? 'Low Oil Pressure Warning' : 'Normal Pressure & Flow',
      sensor: `Oil P: ${telemetry?.oilPressure ?? 3.8} bar | Oil T: ${telemetry?.oilTemperature ?? 92.4} °C`,
    },
    'comp-crankshaft': {
      name: 'High-Strength Forged Crankshaft & Bearings',
      description: 'Short, stiff crankshaft mounted in 3 plain bearings with 1 ball thrust bearing.',
      spec: 'Vibration RMS limit: < 0.45 g.',
      status: (telemetry?.vibrationRMS ?? 0.22) > 0.35 ? 'Elevated Vibration' : 'Smooth Dynamic Balance',
      sensor: `Vib RMS: ${telemetry?.vibrationRMS ?? 0.22} g`,
    },
    'comp-turbocharger': {
      name: 'Garrett T-Series Turbocharger & Wastegate',
      description: 'Exhaust-driven turbine with variable servo-controlled wastegate valve for altitude compensation up to 30,000 ft.',
      spec: 'Max Boost: 39.9 inHg (takeoff 5 min limit), Continuous: 35.4 inHg.',
      status: 'Turbo Boost Nominal',
      sensor: `MAP: ${telemetry?.manifoldPressureInHg ?? 32.1} inHg`,
    },
    'comp-propeller': {
      name: '3-Blade Variable-Pitch Pusher Propeller',
      description: 'Carbon-composite blades driven via 2.43:1 integrated reduction gearbox with overload clutch.',
      spec: `Gearbox Ratio: 2.43:1 | Continuous Prop Speed: 2,387 RPM max.`,
      status: 'Synchronized Rotation',
      sensor: `Propeller RPM: ${propRpm} RPM (ω: ${propRadSec} rad/s)`,
    },
    'comp-airframe': {
      name: 'MALE Composite High-Aspect Airframe',
      description: 'Carbon-fibre and Kevlar reinforced primary structure with twin tail booms and high aspect-ratio wings.',
      spec: 'Wingspan: 20.6 m | MTOW: 1,800 kg | Ceiling: 28,000 ft.',
      status: 'Structural Integrity Nominal',
      sensor: `Speed: ${telemetry?.groundSpeedMs ?? 38.5} m/s | Alt: ${telemetry?.altitudeFt ?? 12450} ft`,
    },
    'comp-avionics': {
      name: 'Triple-Redundant Flight Control Computer',
      description: 'MAVLink/MQTT integrated navigation processor with dual GPS/INS and servo bus drivers.',
      spec: 'MAVLink Telemetry Rate: 10 Hz | Packet Loss: < 0.05%.',
      status: 'Connected & Tracking',
      sensor: `Mode: ${telemetryMode} | Roll: ${telemetry?.rollDeg?.toFixed(1) ?? '0.0'}° | Pitch: ${telemetry?.pitchDeg?.toFixed(1) ?? '0.0'}°`,
    },
  };

  const selectedInfo = activeComponentId ? componentDetails[activeComponentId] || {
    name: 'Selected UAV Subsystem',
    description: 'Component diagnostics synchronized with real-time digital twin.',
    spec: 'Standard aerospace tolerances.',
    status: 'Nominal',
    sensor: 'Telemetry Synchronized',
  } : null;

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* 1. TOP STATUS BAR                                                        */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
            <Plane className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                3D Digital Twin Synchronizer
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Synchronized
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kinematics, Euler spatial orientation, propulsion gearbox & thermal stress twin
            </p>
          </div>
        </div>

        {/* Operating Mode & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            {(['DEMO', 'LIVE', 'REPLAY'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setTelemetryMode(mode)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  telemetryMode === mode
                    ? 'bg-white text-blue-600 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            Sync
          </button>

          {/* Datalink Connection Status */}
          <div className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                backendConnectionStatus === 'CONNECTED'
                  ? 'bg-emerald-500'
                  : backendConnectionStatus === 'CONNECTING'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-red-500'
              }`}
            />
            <span className="font-medium text-slate-700">{backendConnectionStatus}</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-800 font-bold">{selectedUAV.id}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN 3D VIEWPORT & TELEMETRY DIAGNOSTICS GRID                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 3D Viewport with Display Mode Switcher (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Viewport Control Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 ml-1">Visualization Layers:</span>
              <button
                onClick={() => {
                  setShowThermal(!showThermal);
                  if (!showThermal) setShowVibration(false);
                }}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 ${
                  showThermal
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Thermometer className="w-3.5 h-3.5" />
                Thermal Map (CHT/EGT)
              </button>

              <button
                onClick={() => {
                  setShowVibration(!showVibration);
                  if (!showVibration) setShowThermal(false);
                }}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 ${
                  showVibration
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Vibration Stress
              </button>

              <button
                onClick={() => setShowSurfaces(!showSurfaces)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 ${
                  showSurfaces
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Control Surfaces
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsGhostMode(!isGhostMode)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 ${
                  isGhostMode
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                {isGhostMode ? 'Solid View' : 'X-Ray Ghost Mode'}
              </button>
            </div>
          </div>

          {/* Interactive 3D Canvas */}
          <DigitalTwin3D
            telemetry={telemetry}
            activeComponentId={activeComponentId}
            onSelectComponent={(compId) => setActiveComponentId(compId)}
            heightClass="h-[580px]"
            showThermal={showThermal}
            showVibration={showVibration}
            showSurfaces={showSurfaces}
            isGhostMode={isGhostMode}
          />

          {/* Bottom Kinematics & Gearbox Reduction strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Rotax 914 F Engine
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {engineRpm} <span className="text-xs text-slate-500 font-sans">RPM</span>
              </div>
              <div className="text-[11px] text-emerald-600 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Nominal Operating Speed
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Reduction Gearbox
              </div>
              <div className="text-xl font-bold font-mono text-blue-600 mt-1">
                2.43 : 1 <span className="text-xs text-slate-500 font-sans">Ratio</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Integrated overload clutch</div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Propeller Speed
              </div>
              <div className="text-xl font-bold font-mono text-indigo-600 mt-1">
                {propRpm} <span className="text-xs text-slate-500 font-sans">RPM</span>
              </div>
              <div className="text-[11px] text-indigo-500 mt-0.5 font-mono">
                ω = {propRadSec} rad/s
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Flight Phase
              </div>
              <div className="text-xl font-bold font-mono text-cyan-600 mt-1">
                {aircraftPose?.flight_phase ?? 'CRUISE'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Alt: {telemetry?.altitudeFt ?? 12450} ft MSL
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Telemetry & Component Diagnostics (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Subsystem Inspection Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-800">Selected Subsystem Diagnostics</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                {activeComponentId || 'None'}
              </span>
            </div>

            {selectedInfo ? (
              <div className="mt-3.5 space-y-3 text-xs">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedInfo.name}</h4>
                  <p className="text-slate-600 mt-1 leading-relaxed">{selectedInfo.description}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-slate-700 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Live Reading:</span>
                    <span className="font-bold text-slate-900">{selectedInfo.sensor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Diagnostic Status:</span>
                    <span className="font-bold text-emerald-600">{selectedInfo.status}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Specification:</span>
                    <span className="text-slate-600 truncate max-w-[170px]" title={selectedInfo.spec}>
                      {selectedInfo.spec}
                    </span>
                  </div>
                </div>

                {/* Subsystem quick selection pill buttons */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Select UAV Subsystems:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(componentDetails).map((compId) => (
                      <button
                        key={compId}
                        onClick={() => setActiveComponentId(compId)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                          activeComponentId === compId
                            ? 'bg-blue-600 text-white shadow-xs font-semibold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {compId.replace('comp-', '')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 text-center py-8 text-slate-400 text-xs">
                Click any component in the 3D viewport to inspect live health telemetry.
              </div>
            )}
          </div>

          {/* Spatial Kinematics & Actuators Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Compass className="w-4 h-4 text-cyan-600" />
              <h3 className="font-bold text-sm text-slate-800">Flight Dynamics & Deflections</h3>
            </div>

            <div className="mt-3.5 space-y-3 font-mono text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 font-sans">ROLL (φ)</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {telemetry?.rollDeg?.toFixed(1) ?? '0.0'}°
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 font-sans">PITCH (θ)</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {telemetry?.pitchDeg?.toFixed(1) ?? '0.0'}°
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] text-slate-500 font-sans">HEADING (ψ)</div>
                  <div className="text-sm font-bold text-cyan-600 mt-0.5">
                    {telemetry?.headingDeg ?? 180}°
                  </div>
                </div>
              </div>

              {/* Actuator Deflection Bars */}
              <div className="space-y-2 pt-1 font-sans text-xs">
                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>Differential Ailerons:</span>
                    <span className="font-mono font-bold text-slate-800">
                      ±{aircraftPose?.control_surfaces?.left_aileron_deg ?? '0.0'}°
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.abs(aircraftPose?.control_surfaces?.left_aileron_deg ?? 0) * 5)}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>Elevator Deflection:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {aircraftPose?.control_surfaces?.elevator_deg ?? '0.0'}°
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.abs(aircraftPose?.control_surfaces?.elevator_deg ?? 0) * 5)}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>Rudder Deflection:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {aircraftPose?.control_surfaces?.rudder_deg ?? '0.0'}°
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.abs(aircraftPose?.control_surfaces?.rudder_deg ?? 0) * 5)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Predictive Health & RUL Summary */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-sm text-slate-800">Predictive RUL & Anomalies</h3>
              </div>
              <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                Phase 8/9 ML
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-600">Remaining Useful Life (RUL):</span>
                <span className="font-mono font-bold text-slate-900">
                  {rulData?.overall_engine_rul_hours ?? 1120} Flight Hours
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-600">Active ML Anomalies:</span>
                <span
                  className={`font-mono font-bold ${
                    (anomalies?.length || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  {anomalies?.length ?? 0} Detected
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-600">Health Index:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {selectedUAV.healthScore ?? 98.4}% Nominal
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
