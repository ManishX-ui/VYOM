import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ENGINE_COMPONENTS } from '../../data/demoData';
import { EngineCanvas } from '../../components/digital-twin/EngineCanvas';
import { EngineComponent } from '../../types';
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
  const { telemetry, selectedUAV, alerts } = useApp();
  const [selectedCompId, setSelectedCompId] = useState<string | null>('comp-cylinder-head');
  const [chartMetric, setChartMetric] = useState<
    'rpm' | 'cht' | 'egt' | 'oilPress' | 'oilTemp' | 'fuel' | 'vib' | 'injection' | 'health'
  >('cht');
  const [timeHorizon, setTimeHorizon] = useState<'1h' | '6h' | '24h' | '30d'>('24h');

  const selectedComponent = ENGINE_COMPONENTS.find((c) => c.id === selectedCompId) || null;

  // Historical telemetry datasets
  const historyData24h = [
    { time: '00:00', rpm: 2200, cht: 160, egt: 580, oilPress: 4.0, oilTemp: 91, fuel: 11.8, vib: 0.12, injection: 25.0, health: 95 },
    { time: '04:00', rpm: 2350, cht: 165, egt: 595, oilPress: 4.1, oilTemp: 93, fuel: 12.0, vib: 0.13, injection: 25.8, health: 94 },
    { time: '08:00', rpm: 2450, cht: 172, egt: 608, oilPress: 4.2, oilTemp: 95, fuel: 12.3, vib: 0.16, injection: 26.2, health: 94 },
    { time: '12:00', rpm: 2480, cht: 182, egt: 618, oilPress: 4.2, oilTemp: 97, fuel: 12.6, vib: 0.22, injection: 26.6, health: 91 },
    { time: '14:00', rpm: 2450, cht: 190, egt: 624, oilPress: 4.2, oilTemp: 98, fuel: 12.5, vib: 0.31, injection: 26.5, health: 88 },
    {
      time: 'Now',
      rpm: telemetry.rpm,
      cht: telemetry.cht,
      egt: telemetry.egt,
      oilPress: telemetry.oilPressure,
      oilTemp: telemetry.oilTemperature,
      fuel: telemetry.fuelFlow,
      vib: telemetry.vibrationRMS,
      injection: telemetry.injectionTiming,
      health: telemetry.engineHealth,
    },
  ];

  // Operating envelope coordinate points for power vs RPM curve
  const operatingEnvelopeData = [
    { rpm: 1000, minHp: 20, maxHp: 35, currentHp: null },
    { rpm: 1500, minHp: 40, maxHp: 65, currentHp: null },
    { rpm: 2000, minHp: 65, maxHp: 92, currentHp: null },
    { rpm: 2450, minHp: 85, maxHp: 115, currentHp: 112 },
    { rpm: 2700, minHp: 95, maxHp: 115, currentHp: null },
    { rpm: 3000, minHp: 0, maxHp: 115, currentHp: null },
  ];

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
            />
          </div>

          <div className="flex items-center justify-end text-xs text-slate-500 pt-1">
            <span className="font-mono text-emerald-600 font-medium">Real-time synchronized</span>
          </div>
        </div>

        {/* Right: Component Health List (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between h-full space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Component Health</h3>
            <span className="text-xs font-mono text-slate-500">{ENGINE_COMPONENTS.length} Subsystems</span>
          </div>

          <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1 flex-1">
            {ENGINE_COMPONENTS.map((comp) => {
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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">{selectedComponent.name}</h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                    {selectedComponent.category}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{selectedComponent.description}</p>
              </div>
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
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between h-full space-y-1">
              <span className="text-[11px] font-medium text-slate-500">RPM</span>
              <p className="text-xl font-bold font-mono text-slate-900">{telemetry.rpm}</p>
              <span className="text-[10px] text-emerald-600 font-mono font-medium block truncate">Nominal (2450)</span>
            </div>

            {/* 2. CHT */}
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 flex flex-col justify-between h-full space-y-1">
              <span className="text-[11px] font-medium text-amber-800">CHT</span>
              <p className="text-xl font-bold font-mono text-amber-900">{telemetry.cht} °C</p>
              <span className="text-[10px] text-amber-700 font-mono font-medium block truncate">Threshold (187 °C)</span>
            </div>

            {/* 3. EGT */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between h-full space-y-1">
              <span className="text-[11px] font-medium text-slate-500">EGT</span>
              <p className="text-xl font-bold font-mono text-slate-900">{telemetry.egt} °C</p>
              <span className="text-[10px] text-emerald-600 font-mono font-medium block truncate">Nominal (620 °C)</span>
            </div>

            {/* 4. Oil Pressure */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between h-full space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Oil Pressure</span>
              <p className="text-xl font-bold font-mono text-slate-900">{telemetry.oilPressure} bar</p>
              <span className="text-[10px] text-emerald-600 font-mono font-medium block truncate">Nominal (4.2 bar)</span>
            </div>

            {/* 5. Oil Temperature */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between h-full space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Oil Temp</span>
              <p className="text-xl font-bold font-mono text-slate-900">{telemetry.oilTemperature} °C</p>
              <span className="text-[10px] text-emerald-600 font-mono font-medium block truncate">Nominal (96 °C)</span>
            </div>

            {/* 6. Fuel Flow */}
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between h-full space-y-1">
              <span className="text-[11px] font-medium text-slate-500">Fuel Flow</span>
              <p className="text-xl font-bold font-mono text-slate-900">{telemetry.fuelFlow} L/h</p>
              <span className="text-[10px] text-emerald-600 font-mono font-medium block truncate">Nominal (12.5 L/h)</span>
            </div>

            {/* 7. Vibration */}
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 flex flex-col justify-between h-full space-y-1">
              <span className="text-[11px] font-medium text-amber-800">Vibration</span>
              <p className="text-xl font-bold font-mono text-amber-900">{telemetry.vibrationRMS} g</p>
              <span className="text-[10px] text-amber-700 font-mono font-medium block truncate">Elevated (0.28 g)</span>
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
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Current: 112 HP @ 2450 RPM
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
              Injection Timing
            </button>
            <button
              onClick={() => setChartMetric('health')}
              className={`px-2.5 py-1 rounded transition-colors ${
                chartMetric === 'health' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
              }`}
            >
              Health Index
            </button>
          </div>
        </div>

        {/* Dynamic Metric LineChart */}
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyData24h} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
      </div>
    </div>
  );
};
