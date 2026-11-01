import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ENGINE_COMPONENTS } from '../../data/demoData';
import { EngineCanvas } from '../../components/digital-twin/EngineCanvas';
import { EngineComponent } from '../../types';
import { apiService } from '../../services/api';
import {
  Cpu,
  Layers,
  Thermometer,
  Gauge,
  Droplet,
  Fuel,
  Activity,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RotateCcw,
  Sliders,
  ChevronRight,
  Info,
  Radio,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

export const EngineHealthPage: React.FC = () => {
  const { telemetry, selectedUAV, alerts, backendConnectionStatus, telemetryMode } = useApp();
  const [selectedCompId, setSelectedCompId] = useState<string | null>('comp-cylinder-head');
  const [chartMetric, setChartMetric] = useState<
    'rpm' | 'cht' | 'egt' | 'oilPress' | 'oilTemp' | 'fuel' | 'vib' | 'injection' | 'health'
  >('cht');
  const [timeHorizon, setTimeHorizon] = useState<'1m' | '5m' | '15m' | '1h' | '6h' | '24h'>('1h');
  const [historyData, setHistoryData] = useState<any[]>(() => {
    return Array.from({ length: 15 }, (_, i) => {
      const secOffset = (15 - i) * 4;
      const date = new Date(Date.now() - secOffset * 1000);
      const timeStr = date.toLocaleTimeString('en-GB', { hour12: false });
      return {
        time: timeStr,
        timestamp: timeStr,
        rpm: 2450 + Math.round(Math.sin(i * 0.8) * 15),
        cht: 187 + Number((Math.cos(i * 0.5) * 1.5).toFixed(1)),
        egt: 620 + Number((Math.sin(i * 0.7) * 4.0).toFixed(1)),
        oilPress: 4.2 + Number((Math.cos(i) * 0.05).toFixed(2)),
        oilTemp: 96.0 + Number((Math.sin(i * 0.4) * 0.8).toFixed(1)),
        fuel: 12.5 + Number((Math.sin(i * 0.6) * 0.3).toFixed(1)),
        vib: 0.28 + Number((Math.abs(Math.sin(i)) * 0.02).toFixed(2)),
        injection: 26.5,
        health: 95.0,
      };
    });
  });
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Fetch real downsampled historical telemetry for selected time range
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingHistory(true);
    apiService
      .getTelemetryHistory(timeHorizon, selectedUAV.id)
      .then((data) => {
        if (!isCancelled) {
          if (Array.isArray(data) && data.length > 0) {
            const formatted = data.map((d: any) => ({
              ...d,
              oilPress: d.oilPressure,
              oilTemp: d.oilTemperature,
              fuel: d.fuelFlow,
              vib: d.vibrationRMS,
              injection: d.injectionTiming,
              health: d.engineHealth,
            }));
            setHistoryData(formatted);
          } else {
            // Seed with rolling baseline points
            const currentRpm = telemetry?.rpm || 2450;
            const currentCht = telemetry?.cht || 187;
            const currentEgt = telemetry?.egt || 620;
            const seedPoints = Array.from({ length: 15 }, (_, i) => {
              const secOffset = (15 - i) * 4;
              const date = new Date(Date.now() - secOffset * 1000);
              const timeStr = date.toLocaleTimeString('en-GB', { hour12: false });
              return {
                time: timeStr,
                timestamp: timeStr,
                rpm: Math.round(currentRpm + Math.sin(i * 0.8) * 15),
                cht: Number((currentCht + Math.cos(i * 0.5) * 1.5).toFixed(1)),
                egt: Number((currentEgt + Math.sin(i * 0.7) * 4.0).toFixed(1)),
                oilPress: Number(((telemetry?.oilPressure || 4.2) + Math.cos(i) * 0.05).toFixed(2)),
                oilTemp: Number(((telemetry?.oilTemperature || 96.0) + Math.sin(i * 0.4) * 0.8).toFixed(1)),
                fuel: Number(((telemetry?.fuelFlow || 12.5) + Math.sin(i * 0.6) * 0.3).toFixed(1)),
                vib: Number(((telemetry?.vibrationRMS || 0.28) + Math.abs(Math.sin(i)) * 0.02).toFixed(2)),
                injection: 26.5,
                health: 95.0,
              };
            });
            setHistoryData(seedPoints);
          }
          setIsLoadingHistory(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          const currentRpm = telemetry?.rpm || 2450;
          const currentCht = telemetry?.cht || 187;
          const currentEgt = telemetry?.egt || 620;
          const seedPoints = Array.from({ length: 15 }, (_, i) => {
            const secOffset = (15 - i) * 4;
            const date = new Date(Date.now() - secOffset * 1000);
            const timeStr = date.toLocaleTimeString('en-GB', { hour12: false });
            return {
              time: timeStr,
              timestamp: timeStr,
              rpm: Math.round(currentRpm + Math.sin(i * 0.8) * 15),
              cht: Number((currentCht + Math.cos(i * 0.5) * 1.5).toFixed(1)),
              egt: Number((currentEgt + Math.sin(i * 0.7) * 4.0).toFixed(1)),
              oilPress: Number(((telemetry?.oilPressure || 4.2) + Math.cos(i) * 0.05).toFixed(2)),
              oilTemp: Number(((telemetry?.oilTemperature || 96.0) + Math.sin(i * 0.4) * 0.8).toFixed(1)),
              fuel: Number(((telemetry?.fuelFlow || 12.5) + Math.sin(i * 0.6) * 0.3).toFixed(1)),
              vib: Number(((telemetry?.vibrationRMS || 0.28) + Math.abs(Math.sin(i)) * 0.02).toFixed(2)),
              injection: 26.5,
              health: 95.0,
            };
          });
          setHistoryData(seedPoints);
          setIsLoadingHistory(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [timeHorizon, selectedUAV.id, telemetryMode]);

  // Synchronously stream and append incoming live telemetry
  useEffect(() => {
    if (!telemetry || !telemetry.timestamp) return;
    setHistoryData((prev) => {
      const latestPoint = {
        time: telemetry.timestamp,
        timestamp: telemetry.timestamp,
        rpm: telemetry.rpm,
        cht: telemetry.cht,
        egt: telemetry.egt,
        oilPress: telemetry.oilPressure,
        oilPressure: telemetry.oilPressure,
        oilTemp: telemetry.oilTemperature,
        oilTemperature: telemetry.oilTemperature,
        fuel: telemetry.fuelFlow,
        fuelFlow: telemetry.fuelFlow,
        vib: telemetry.vibrationRMS,
        vibrationRMS: telemetry.vibrationRMS,
        injection: telemetry.injectionTiming,
        injectionTiming: telemetry.injectionTiming,
        health: telemetry.engineHealth,
      };

      if (prev.length === 0) return [latestPoint];

      const last = prev[prev.length - 1];
      if (last && last.time === telemetry.timestamp) {
        return [...prev.slice(0, -1), latestPoint];
      }
      return [...prev.slice(prev.length >= 30 ? 1 : 0), latestPoint];
    });
  }, [telemetry]);

  // Dynamically update component health status from live telemetry
  const dynamicComponents = useMemo(() => {
    return ENGINE_COMPONENTS.map((comp) => {
      let reading = comp.currentReading;
      let status: 'Healthy' | 'Monitor' | 'Critical' = 'Healthy';
      let health = comp.healthPercentage;

      if (comp.id === 'comp-cylinder-head') {
        reading = `${telemetry.cht} °C`;
        if (telemetry.cht > 205) {
          status = 'Critical';
          health = 68;
        } else if (telemetry.cht > 195) {
          status = 'Monitor';
          health = 82;
        } else {
          status = 'Healthy';
          health = 96;
        }
      } else if (comp.id === 'comp-propeller') {
        reading = `${telemetry.rpm} RPM`;
        status = telemetry.rpm > 2700 ? 'Monitor' : 'Healthy';
      } else if (comp.id === 'comp-gearbox') {
        reading = `${telemetry.egt} °C`;
        status = telemetry.egt > 680 ? 'Critical' : telemetry.egt > 650 ? 'Monitor' : 'Healthy';
      } else if (comp.id === 'comp-lubrication') {
        reading = `${telemetry.oilPressure} bar / ${telemetry.oilTemperature} °C`;
        if (telemetry.oilPressure < 2.5 || telemetry.oilTemperature > 105) {
          status = 'Critical';
          health = 64;
        } else if (telemetry.oilPressure < 3.2 || telemetry.oilTemperature > 100) {
          status = 'Monitor';
          health = 80;
        } else {
          status = 'Healthy';
          health = 98;
        }
      } else if (comp.id === 'comp-fuel-system') {
        reading = `${telemetry.fuelFlow} L/hr`;
        status = telemetry.fuelFlow > 22 ? 'Monitor' : 'Healthy';
      } else if (comp.id === 'comp-crankshaft') {
        reading = `${telemetry.vibrationRMS} g`;
        status = telemetry.vibrationRMS > 0.35 ? 'Critical' : telemetry.vibrationRMS > 0.30 ? 'Monitor' : 'Healthy';
      }

      return {
        ...comp,
        currentReading: reading,
        status,
        healthPercentage: health,
      };
    });
  }, [telemetry]);

  const selectedComponent = dynamicComponents.find((c) => c.id === selectedCompId) || null;

  // Operating envelope coordinate points for power vs RPM curve
  const currentHpCalculated = Math.round(
    Math.min(115, Math.max(0, ((telemetry.rpm - 800) / 1900) * 115 * ((telemetry.manifoldPressureInHg || 31.0) / 31.0)))
  );

  const operatingEnvelopeData = useMemo(() => {
    return [
      { rpm: 1000, minHp: 20, maxHp: 35, currentHp: null },
      { rpm: 1500, minHp: 40, maxHp: 65, currentHp: null },
      { rpm: 2000, minHp: 65, maxHp: 92, currentHp: null },
      { rpm: telemetry.rpm, minHp: Math.round(((telemetry.rpm - 800) / 1900) * 85), maxHp: 115, currentHp: currentHpCalculated },
      { rpm: 2700, minHp: 95, maxHp: 115, currentHp: null },
      { rpm: 3000, minHp: 0, maxHp: 115, currentHp: null },
    ].sort((a, b) => a.rpm - b.rpm);
  }, [telemetry.rpm, currentHpCalculated]);

  const isLiveDisconnected =
    telemetryMode === 'LIVE' &&
    (backendConnectionStatus !== 'CONNECTED' || telemetry.datalink_status === 'DISCONNECTED');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            3D Digital Twin &amp; Component Diagnostics
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-600 font-medium">
            Engine: {selectedUAV.engineModel}
          </span>
        </div>
      </div>

      {/* =========================================
          TOP SECTION: 3D MODEL VIEWPORT + COMPONENT HEALTH LIST
          ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 3D Engine Viewport (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between h-full space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">Engine Viewport</span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-mono text-blue-600 font-medium">
                {selectedComponent ? `Inspecting: ${selectedComponent.name}` : 'Full Assembly Overview'}
              </span>
            </div>

            {selectedCompId && (
              <button
                onClick={() => setSelectedCompId(null)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Clear Selection
              </button>
            )}
          </div>

          <div className="flex-1 w-full flex items-center justify-center">
            <EngineCanvas
              heightClass="h-[440px]"
              activeComponentId={selectedCompId}
              onSelectComponent={(id) => setSelectedCompId(id)}
              telemetry={telemetry}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span className="font-mono text-slate-400">
              Stream: <span className="font-semibold text-slate-700">{telemetryMode === 'REPLAY' ? 'REPLAY' : 'ACTIVE'}</span>
            </span>
            <span className="font-mono text-emerald-600 font-medium">Real-time synchronized</span>
          </div>
        </div>

        {/* Right: Component Health List (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between h-full space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Component Health</h3>
            <span className="text-xs font-mono text-slate-500">{dynamicComponents.length} Subsystems</span>
          </div>

          <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1 flex-1">
            {dynamicComponents.map((comp) => {
              const isSelected = selectedCompId === comp.id;

              return (
                <div
                  key={comp.id}
                  onClick={() => setSelectedCompId(comp.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-800">{comp.name}</span>
                    <span
                      className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded ${
                        comp.status === 'Healthy'
                          ? 'bg-emerald-100/80 text-emerald-800'
                          : comp.status === 'Monitor'
                          ? 'bg-amber-100/80 text-amber-800'
                          : 'bg-red-100/80 text-red-800'
                      }`}
                    >
                      {comp.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-1">
                    <span>Reading: {comp.currentReading}</span>
                    <span className="font-bold text-slate-700">{comp.healthPercentage}%</span>
                  </div>

                  {/* Health Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        comp.healthPercentage > 85
                          ? 'bg-emerald-500'
                          : comp.healthPercentage > 70
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${comp.healthPercentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =========================================
          SELECTED COMPONENT DEEP-DIVE DETAILS PANEL
          ========================================= */}
      {selectedComponent ? (
        <div className="p-5 rounded-2xl bg-white border border-blue-200 shadow-2xs space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">{selectedComponent.name}</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                  {selectedComponent.category}
                </span>
              </div>
              <p className="text-xs text-slate-500">{selectedComponent.description}</p>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 uppercase block">Health</span>
                <span className="font-bold text-emerald-600 text-sm">{selectedComponent.healthPercentage}%</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 uppercase block">Estimated RUL</span>
                <span className="font-bold text-slate-800 text-sm">{selectedComponent.estimatedRULHours} hrs</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs items-stretch">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between h-full space-y-1">
              <span className="text-slate-400 text-[11px] uppercase tracking-wider block">Current Reading</span>
              <p className="text-lg font-bold font-mono text-slate-900">{selectedComponent.currentReading}</p>
              <p className="text-[11px] text-slate-500 font-mono">Range: {selectedComponent.operatingRange}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between h-full space-y-1">
              <span className="text-slate-400 text-[11px] uppercase tracking-wider block">Active Alerts</span>
              <p className="text-lg font-bold font-mono text-slate-900">{selectedComponent.alertsCount} Reported</p>
              <p className="text-[11px] text-slate-500">
                {selectedComponent.alertsCount > 0 ? 'Review alerts in Alert History panel' : 'No active threshold violations'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between h-full space-y-1">
              <span className="text-slate-400 text-[11px] uppercase tracking-wider block">Recommended Action</span>
              <p className="font-semibold text-slate-800">
                {selectedComponent.status === 'Healthy' ? 'Routine Inspection at Next TBO' : 'Periodic Monitoring Required'}
              </p>
              <p className="text-[11px] text-slate-500">Maintenance schedule aligned with Rotax 914 F manual</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600 flex items-center gap-3">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Click on any component in the 3D digital twin or sidebar list to reveal diagnostic telemetry and remaining useful life.</span>
        </div>
      )}

      {/* =========================================
          OVERALL PARAMETERS & OPERATING ENVELOPE
          ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Real-time Parameters (8 Cards) (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between h-full space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Engine Health Parameters</h3>
              <p className="text-[11px] text-slate-500">Live acquisition from MALE UAV telemetry datalink</p>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              ● Live Data
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-stretch">
            {/* 1. RPM */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between h-full space-y-1 ${
              telemetry.rpm > 2550 ? 'bg-amber-50/60 border-amber-200/80' : 'bg-slate-50/80 border-slate-100'
            }`}>
              <span className={`text-[11px] font-medium ${telemetry.rpm > 2550 ? 'text-amber-800' : 'text-slate-500'}`}>RPM</span>
              <p className={`text-xl font-bold font-mono ${telemetry.rpm > 2550 ? 'text-amber-900' : 'text-slate-900'}`}>{telemetry.rpm}</p>
              <span className={`text-[10px] font-mono font-medium block truncate ${
                telemetry.rpm > 2550 ? 'text-amber-700' : 'text-emerald-600'
              }`}>
                {telemetry.rpm > 2550 ? 'Takeoff Limit (2600)' : 'Nominal (2450)'}
              </span>
            </div>

            {/* 2. CHT */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between h-full space-y-1 ${
              telemetry.cht > 205
                ? 'bg-red-50/70 border-red-200/80'
                : telemetry.cht > 195
                ? 'bg-amber-50/60 border-amber-200/80'
                : 'bg-slate-50/80 border-slate-100'
            }`}>
              <span className={`text-[11px] font-medium ${
                telemetry.cht > 205 ? 'text-red-800' : telemetry.cht > 195 ? 'text-amber-800' : 'text-slate-500'
              }`}>CHT</span>
              <p className={`text-xl font-bold font-mono ${
                telemetry.cht > 205 ? 'text-red-900' : telemetry.cht > 195 ? 'text-amber-900' : 'text-slate-900'
              }`}>{telemetry.cht} °C</p>
              <span className={`text-[10px] font-mono font-medium block truncate ${
                telemetry.cht > 205 ? 'text-red-700' : telemetry.cht > 195 ? 'text-amber-700' : 'text-emerald-600'
              }`}>
                {telemetry.cht > 205 ? 'Overheat (>205 °C)' : telemetry.cht > 195 ? 'Elevated (>195 °C)' : 'Nominal (<195 °C)'}
              </span>
            </div>

            {/* 3. EGT */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between h-full space-y-1 ${
              telemetry.egt > 680
                ? 'bg-red-50/70 border-red-200/80'
                : telemetry.egt > 650
                ? 'bg-amber-50/60 border-amber-200/80'
                : 'bg-slate-50/80 border-slate-100'
            }`}>
              <span className={`text-[11px] font-medium ${
                telemetry.egt > 680 ? 'text-red-800' : telemetry.egt > 650 ? 'text-amber-800' : 'text-slate-500'
              }`}>EGT</span>
              <p className={`text-xl font-bold font-mono ${
                telemetry.egt > 680 ? 'text-red-900' : telemetry.egt > 650 ? 'text-amber-900' : 'text-slate-900'
              }`}>{telemetry.egt} °C</p>
              <span className={`text-[10px] font-mono font-medium block truncate ${
                telemetry.egt > 680 ? 'text-red-700' : telemetry.egt > 650 ? 'text-amber-700' : 'text-emerald-600'
              }`}>
                {telemetry.egt > 680 ? 'Critical (>680 °C)' : telemetry.egt > 650 ? 'High (>650 °C)' : 'Nominal (620 °C)'}
              </span>
            </div>

            {/* 4. Oil Pressure */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between h-full space-y-1 ${
              telemetry.oilPressure < 2.0 || telemetry.oilPressure > 5.5
                ? 'bg-red-50/70 border-red-200/80'
                : telemetry.oilPressure < 2.5
                ? 'bg-amber-50/60 border-amber-200/80'
                : 'bg-slate-50/80 border-slate-100'
            }`}>
              <span className={`text-[11px] font-medium ${
                telemetry.oilPressure < 2.5 ? 'text-amber-800' : 'text-slate-500'
              }`}>Oil Pressure</span>
              <p className={`text-xl font-bold font-mono ${
                telemetry.oilPressure < 2.5 ? 'text-amber-900' : 'text-slate-900'
              }`}>{telemetry.oilPressure} bar</p>
              <span className={`text-[10px] font-mono font-medium block truncate ${
                telemetry.oilPressure < 2.0
                  ? 'text-red-700'
                  : telemetry.oilPressure < 2.5
                  ? 'text-amber-700'
                  : 'text-emerald-600'
              }`}>
                {telemetry.oilPressure < 2.0 ? 'Low (<2.0 bar)' : telemetry.oilPressure < 2.5 ? 'Warning (<2.5 bar)' : 'Nominal (4.2 bar)'}
              </span>
            </div>

            {/* 5. Oil Temperature */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between h-full space-y-1 ${
              telemetry.oilTemperature > 120
                ? 'bg-amber-50/60 border-amber-200/80'
                : 'bg-slate-50/80 border-slate-100'
            }`}>
              <span className={`text-[11px] font-medium ${telemetry.oilTemperature > 120 ? 'text-amber-800' : 'text-slate-500'}`}>Oil Temp</span>
              <p className={`text-xl font-bold font-mono ${telemetry.oilTemperature > 120 ? 'text-amber-900' : 'text-slate-900'}`}>{telemetry.oilTemperature} °C</p>
              <span className={`text-[10px] font-mono font-medium block truncate ${
                telemetry.oilTemperature > 120 ? 'text-amber-700' : 'text-emerald-600'
              }`}>
                {telemetry.oilTemperature > 120 ? 'High (>120 °C)' : 'Nominal (96 °C)'}
              </span>
            </div>

            {/* 6. Fuel Flow */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between h-full space-y-1 ${
              telemetry.fuelFlow > 22
                ? 'bg-amber-50/60 border-amber-200/80'
                : 'bg-slate-50/80 border-slate-100'
            }`}>
              <span className={`text-[11px] font-medium ${telemetry.fuelFlow > 22 ? 'text-amber-800' : 'text-slate-500'}`}>Fuel Flow</span>
              <p className={`text-xl font-bold font-mono ${telemetry.fuelFlow > 22 ? 'text-amber-900' : 'text-slate-900'}`}>{telemetry.fuelFlow} L/h</p>
              <span className={`text-[10px] font-mono font-medium block truncate ${
                telemetry.fuelFlow > 22 ? 'text-amber-700' : 'text-emerald-600'
              }`}>
                {telemetry.fuelFlow > 22 ? 'High (>22 L/h)' : 'Nominal (12.5 L/h)'}
              </span>
            </div>

            {/* 7. Vibration */}
            <div className={`p-3 rounded-xl border flex flex-col justify-between h-full space-y-1 ${
              telemetry.vibrationRMS > 0.35
                ? 'bg-red-50/70 border-red-200/80'
                : telemetry.vibrationRMS > 0.28
                ? 'bg-amber-50/60 border-amber-200/80'
                : 'bg-slate-50/80 border-slate-100'
            }`}>
              <span className={`text-[11px] font-medium ${
                telemetry.vibrationRMS > 0.35 ? 'text-red-800' : telemetry.vibrationRMS > 0.28 ? 'text-amber-800' : 'text-slate-500'
              }`}>Vibration</span>
              <p className={`text-xl font-bold font-mono ${
                telemetry.vibrationRMS > 0.35 ? 'text-red-900' : telemetry.vibrationRMS > 0.28 ? 'text-amber-900' : 'text-slate-900'
              }`}>{telemetry.vibrationRMS} g</p>
              <span className={`text-[10px] font-mono font-medium block truncate ${
                telemetry.vibrationRMS > 0.35 ? 'text-red-700' : telemetry.vibrationRMS > 0.28 ? 'text-amber-700' : 'text-emerald-600'
              }`}>
                {telemetry.vibrationRMS > 0.35 ? 'Critical (>0.35 g)' : telemetry.vibrationRMS > 0.28 ? 'Elevated (>0.28 g)' : 'Nominal (<0.28 g)'}
              </span>
            </div>

            {/* 8. Injection Timing */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between h-full space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Injection Timing</span>
              <p className="text-xl font-bold font-mono text-slate-900">{telemetry.injectionTiming}°</p>
              <span className="text-[10px] text-emerald-600 font-mono font-medium block truncate">Advance (26.5° BTDC)</span>
            </div>
          </div>
        </div>

        {/* Operating Envelope Power vs RPM (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Operating Envelope</h3>
              <p className="text-[11px] text-slate-500">Power (HP) vs Engine RPM performance map</p>
            </div>
            <span className="text-xs font-mono text-blue-600">Rotax 914 F</span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={operatingEnvelopeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="rpm" stroke="#94a3b8" fontSize={10} fontVariant="tabular-nums" />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 150]} fontVariant="tabular-nums" />
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
                <Area type="monotone" dataKey="maxHp" name="Max Power Limit (HP)" stroke="#10b981" fill="#d1fae5" opacity={0.6} />
                <Area type="monotone" dataKey="minHp" name="Normal Operating Zone (HP)" stroke="#3b82f6" fill="#e0e7ff" opacity={0.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-300" /> Normal Range
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Current: {currentHpCalculated} HP @ {telemetry.rpm} RPM
            </span>
          </div>
        </div>
      </div>

      {/* =========================================
          HISTORICAL CHARTS WITH TIME-RANGE SELECTORS
          ========================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Engine Parameter Historical Trends</h3>
            <p className="text-[11px] text-slate-500">Historical telemetry tracking across mission timeline</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Time Horizon Filter Buttons */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs font-mono">
              {(['1m', '5m', '15m', '1h', '6h', '24h'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeHorizon(range)}
                  className={`px-2 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    timeHorizon === range
                      ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

            {/* Metric Selector Tabs */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
              <button
                onClick={() => setChartMetric('rpm')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  chartMetric === 'rpm' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                RPM
              </button>
              <button
                onClick={() => setChartMetric('cht')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  chartMetric === 'cht' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                CHT
              </button>
              <button
                onClick={() => setChartMetric('egt')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  chartMetric === 'egt' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                EGT
              </button>
              <button
                onClick={() => setChartMetric('oilPress')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  chartMetric === 'oilPress' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                Oil Pressure
              </button>
              <button
                onClick={() => setChartMetric('oilTemp')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  chartMetric === 'oilTemp' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                Oil Temp
              </button>
              <button
                onClick={() => setChartMetric('fuel')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  chartMetric === 'fuel' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                Fuel Flow
              </button>
              <button
                onClick={() => setChartMetric('vib')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  chartMetric === 'vib' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                Vibration
              </button>
              <button
                onClick={() => setChartMetric('injection')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  chartMetric === 'injection' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                Injection
              </button>
              <button
                onClick={() => setChartMetric('health')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  chartMetric === 'health' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                Health
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Metric LineChart */}
        {isLiveDisconnected ? (
          <div className="h-56 w-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
            <span className="text-sm font-semibold text-slate-700">LIVE Datalink Awaiting Telemetry Stream</span>
            <span className="text-xs text-slate-400 mt-1 max-w-sm">
              No live telemetry packets received from physical MALE UAV GCS yet. Connect datalink to acquire telemetry stream.
            </span>
          </div>
        ) : historyData.length === 0 ? (
          <div className="h-56 w-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <span className="text-sm font-medium text-slate-500">Buffering telemetry points for {timeHorizon} window...</span>
          </div>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                {chartMetric === 'rpm' && (
                  <Line type="monotone" dataKey="rpm" name="Engine RPM" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
                )}
                {chartMetric === 'cht' && (
                  <Line type="monotone" dataKey="cht" name="CHT (°C)" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} />
                )}
                {chartMetric === 'egt' && (
                  <Line type="monotone" dataKey="egt" name="EGT (°C)" stroke="#f97316" strokeWidth={2.5} dot={{ r: 3 }} />
                )}
                {chartMetric === 'oilPress' && (
                  <Line type="monotone" dataKey="oilPress" name="Oil Pressure (bar)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                )}
                {chartMetric === 'oilTemp' && (
                  <Line type="monotone" dataKey="oilTemp" name="Oil Temperature (°C)" stroke="#eab308" strokeWidth={2.5} dot={{ r: 3 }} />
                )}
                {chartMetric === 'fuel' && (
                  <Line type="monotone" dataKey="fuel" name="Fuel Flow (L/hr)" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3 }} />
                )}
                {chartMetric === 'vib' && (
                  <Line type="monotone" dataKey="vib" name="Vibration (g)" stroke="#ec4899" strokeWidth={2.5} dot={{ r: 3 }} />
                )}
                {chartMetric === 'injection' && (
                  <Line type="monotone" dataKey="injection" name="Injection Timing (° BTDC)" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} />
                )}
                {chartMetric === 'health' && (
                  <Line type="monotone" dataKey="health" name="Engine Health (%)" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
