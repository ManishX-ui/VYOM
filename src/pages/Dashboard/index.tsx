import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { EngineCanvas } from '../../components/digital-twin/EngineCanvas';
import {
  Gauge,
  Thermometer,
  Droplet,
  Fuel,
  Activity,
  HeartPulse,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  Compass,
  Plane,
  ChevronRight,
  Info,
  Flame,
  Timer,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { selectedUAV, telemetry, alerts } = useApp();
  const navigate = useNavigate();
  const [trendRange, setTrendRange] = useState<'1m' | '5m' | '15m' | '1h'>('15m');
  const [digitalTwinView, setDigitalTwinView] = useState<'external' | 'internal'>('external');

  // Trend data simulating time windows with the 8 core engine parameters
  const trendData15m = [
    { time: '14:10', rpm: 242, cht: 172, egt: 615, oilPress: 41, oilTemp: 92, vib: 15, fuel: 122, injection: 26.2 },
    { time: '14:15', rpm: 244, cht: 175, egt: 618, oilPress: 41.5, oilTemp: 94, vib: 16, fuel: 123, injection: 26.4 },
    { time: '14:20', rpm: 243.5, cht: 180, egt: 622, oilPress: 42, oilTemp: 95, vib: 22, fuel: 124, injection: 26.5 },
    { time: '14:25', rpm: 246, cht: 188, egt: 621, oilPress: 42.2, oilTemp: 96, vib: 31, fuel: 126, injection: 26.6 },
    { time: '14:28', rpm: 248, cht: 192, egt: 624, oilPress: 42, oilTemp: 96, vib: 28, fuel: 125, injection: 26.5 },
    {
      time: '14:30',
      rpm: Math.round(telemetry.rpm / 10),
      cht: telemetry.cht,
      egt: telemetry.egt,
      oilPress: telemetry.oilPressure * 10,
      oilTemp: telemetry.oilTemperature,
      vib: telemetry.vibrationRMS * 100,
      fuel: telemetry.fuelFlow * 10,
      injection: telemetry.injectionTiming,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* =========================================
          A. UAV OVERVIEW HEADER BANNER
          ========================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <span>MALE UAV FLEET STATUS</span>
            <span>·</span>
            <span className="font-mono text-slate-500">{selectedUAV.id}</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Welcome, Operator
          </h2>
        </div>

        {/* UAV Platform Card */}
        <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="w-12 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1 overflow-hidden">
            <img
              src="/assets/aistudio/Front-Facing_Gray_Military_UAV_4ffa5275.png"
              alt="MALE UAV"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900">{selectedUAV.name}</span>
              <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                Operational
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">{selectedUAV.engineModel}</p>
          </div>
        </div>
      </div>

      {/* =========================================
          B. 8 ENGINE PARAMETERS KPI CARDS
          Strictly RPM, CHT, EGT, Oil Pressure, Oil Temp, Fuel Flow, Vibration, Injection Timing
          ========================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 items-stretch">
        {/* 1. Engine RPM */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">RPM</span>
            <Gauge className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tracking-tight text-slate-900">
              {telemetry.rpm}
            </span>
            <span className="text-[10px] font-mono text-slate-400">RPM</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] font-mono">
            <span className="text-emerald-600 font-semibold">↑ +2.1%</span>
            <div className="w-10 h-3.5">
              <svg className="w-full h-full text-blue-500" viewBox="0 0 40 16">
                <path d="M 0 12 Q 10 4 20 8 T 40 2" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>

        {/* 2. Cylinder Head Temp (CHT) */}
        <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 shadow-2xs flex flex-col justify-between h-full space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-amber-800">CHT</span>
            <Thermometer className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tracking-tight text-amber-900">
              {telemetry.cht}
            </span>
            <span className="text-[10px] font-mono text-slate-400">°C</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-amber-100 text-[10px] font-mono">
            <span className="text-amber-700 font-semibold">↓ -1.3%</span>
            <div className="w-10 h-3.5">
              <svg className="w-full h-full text-amber-500" viewBox="0 0 40 16">
                <path d="M 0 14 Q 10 10 20 6 T 40 4" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>

        {/* 3. Exhaust Gas Temp (EGT) */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">EGT</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tracking-tight text-slate-900">
              {telemetry.egt}
            </span>
            <span className="text-[10px] font-mono text-slate-400">°C</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] font-mono">
            <span className="text-emerald-600 font-semibold">↑ +1.1%</span>
            <div className="w-10 h-3.5">
              <svg className="w-full h-full text-orange-500" viewBox="0 0 40 16">
                <path d="M 0 12 Q 10 6 20 8 T 40 4" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>

        {/* 4. Oil Pressure */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Oil Pressure</span>
            <Droplet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tracking-tight text-slate-900">
              {telemetry.oilPressure}
            </span>
            <span className="text-[10px] font-mono text-slate-400">bar</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] font-mono">
            <span className="text-emerald-600 font-semibold">↑ +0.5%</span>
            <div className="w-10 h-3.5">
              <svg className="w-full h-full text-blue-500" viewBox="0 0 40 16">
                <path d="M 0 10 Q 15 14 25 8 T 40 4" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>

        {/* 5. Oil Temperature */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Oil Temp</span>
            <Thermometer className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tracking-tight text-slate-900">
              {telemetry.oilTemperature}
            </span>
            <span className="text-[10px] font-mono text-slate-400">°C</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] font-mono">
            <span className="text-emerald-600 font-semibold">↑ +0.6%</span>
            <div className="w-10 h-3.5">
              <svg className="w-full h-full text-cyan-500" viewBox="0 0 40 16">
                <path d="M 0 11 Q 12 13 24 7 T 40 5" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>

        {/* 6. Fuel Flow */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Fuel Flow</span>
            <Fuel className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tracking-tight text-slate-900">
              {telemetry.fuelFlow}
            </span>
            <span className="text-[10px] font-mono text-slate-400">L/hr</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] font-mono">
            <span className="text-emerald-600 font-semibold">↑ +3.2%</span>
            <div className="w-10 h-3.5">
              <svg className="w-full h-full text-blue-500" viewBox="0 0 40 16">
                <path d="M 0 12 Q 12 14 24 6 T 40 2" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>

        {/* 7. Vibration RMS */}
        <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 shadow-2xs flex flex-col justify-between h-full space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-amber-800">Vibration</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tracking-tight text-amber-900">
              {telemetry.vibrationRMS}
            </span>
            <span className="text-[10px] font-mono text-slate-400">g</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-amber-100 text-[10px] font-mono">
            <span className="text-emerald-600 font-semibold">↓ -5.4%</span>
            <div className="w-10 h-3.5">
              <svg className="w-full h-full text-amber-500" viewBox="0 0 40 16">
                <path d="M 0 6 Q 10 14 20 4 T 40 12" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>

        {/* 8. Injection Timing */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Injection Timing</span>
            <Timer className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tracking-tight text-slate-900">
              {telemetry.injectionTiming}
            </span>
            <span className="text-[10px] font-mono text-slate-400">° BTDC</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] font-mono">
            <span className="text-emerald-600 font-semibold">0.0% Nominal</span>
            <div className="w-10 h-3.5">
              <svg className="w-full h-full text-purple-500" viewBox="0 0 40 16">
                <path d="M 0 8 L 10 8 L 20 4 L 30 8 L 40 8" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          C & D. 3D DIGITAL TWIN + HEALTH STATUS / ALERTS
          ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left C: 3D Digital Twin Viewport (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between h-full space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">3D Digital Twin Model</h3>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-mono text-slate-500">Interactive Aero Engine</span>
              </div>
            </div>

            {/* External / Internal View Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
              <button
                onClick={() => setDigitalTwinView('external')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  digitalTwinView === 'external'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                External View
              </button>
              <button
                onClick={() => setDigitalTwinView('internal')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  digitalTwinView === 'internal'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Internal View
              </button>
            </div>
          </div>

          {/* Three.js Engine Canvas */}
          <div className="flex-1 w-full flex items-center justify-center">
            <EngineCanvas
              heightClass="h-[400px]"
              initialViewMode={digitalTwinView === 'internal' ? 'ghost' : 'solid'}
              onSelectComponent={(comp) => navigate('/app/engine-health')}
            />
          </div>
        </div>

        {/* Right D & E: Health Status & Recent Alerts (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-5 h-full">
          {/* Engine Health Status Arc */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1">
              <h4 className="font-bold text-slate-900 text-sm">Engine Health Status</h4>
              <span title="Overall engine condition index">
                <Info className="w-4 h-4 text-slate-400 cursor-help" />
              </span>
            </div>

            {/* Circular Gauge / Percentage */}
            <div className="flex flex-col items-center justify-center my-auto py-1">
              <div className="w-48 h-26 flex items-center justify-center">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 180 98">
                  {/* Track */}
                  <path
                    d="M 25 85 A 65 65 0 0 1 155 85"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  {/* Active Arc */}
                  <path
                    d="M 25 85 A 65 65 0 0 1 155 85"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="12"
                    strokeDasharray="204.2"
                    strokeDashoffset="16.3"
                    strokeLinecap="round"
                  />
                  {/* Center Numerical Value */}
                  <text
                    x="90"
                    y="55.5"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#0f172a"
                    className="font-mono font-extrabold text-[28px] tracking-tight fill-slate-900"
                    style={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontWeight: 800,
                    }}
                  >
                    92%
                  </text>
                </svg>
              </div>

              {/* Status Badge below the arc */}
              <div className="mt-2.5 inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>Healthy Condition</span>
              </div>
            </div>

            {/* Health Checklist bullets */}
            <div className="space-y-2 text-xs border-t border-slate-100 pt-3 mt-2">
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>All core parameters within nominal range</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>No critical safety anomalies recorded</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Thermodynamic efficiency 96.4%</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Ready for extended mission cycle</span>
              </div>
            </div>
          </div>

          {/* Recent Alerts List */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm">Recent Alerts</h4>
              <Link
                to="/app/alerts"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2">
              {alerts.slice(0, 4).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        alert.severity === 'Critical'
                          ? 'bg-red-500'
                          : alert.severity === 'Warning'
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">{alert.title}</p>
                      <p className="text-[10px] font-mono text-slate-400">{alert.timestamp}</p>
                    </div>
                  </div>

                  <span
                    className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${
                      alert.severity === 'Critical'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : alert.severity === 'Warning'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          F & G. KEY PARAMETERS TREND & MISSION INFO
          ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* F. Key Parameters Trend LineChart (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between h-full space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Key Parameters Trend</h4>
            </div>

            {/* Time Horizon Selector */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-mono">
              {(['1m', '5m', '15m', '1h'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTrendRange(r)}
                  className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
                    trendRange === r
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData15m} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
                <Line type="monotone" dataKey="rpm" name="RPM (x10)" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cht" name="CHT (°C)" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="oilPress" name="Oil Pressure (x10)" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="vib" name="Vibration (x100)" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-600 border-t border-slate-100 pt-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> RPM (x10)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> CHT (°C)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Oil Pressure (x10)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Vibration (x100)
            </span>
          </div>
        </div>

        {/* G. Engine Specifications & Mission Information (6 Cols) */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
          {/* Engine Model Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-900 text-sm">Engine Architecture</h4>
                <Link
                  to="/app/engine-health"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                >
                  <span>Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Engine Type</span>
                  <span className="font-semibold text-slate-800">Rotax 914 F</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Configuration</span>
                  <span className="font-medium text-slate-800">4-Cyl Boxer Turbo</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Displacement</span>
                  <span className="font-mono text-slate-800">1.8 L (1211 cc)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Max Takeoff Power</span>
                  <span className="font-mono text-slate-800">115 HP @ 2700 RPM</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Fuel Grade</span>
                  <span className="font-medium text-slate-800">Avgas 100LL / JP-8</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Dry Weight: ~78 kg</span>
              <span className="font-mono text-emerald-600 font-semibold">TBO: 1200 hrs</span>
            </div>
          </div>

          {/* Mission Information Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-900 text-sm">Mission Status</h4>
                <span className="font-mono text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-semibold">
                  LIVE TELEMETRY
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Mission Type</span>
                  <span className="font-semibold text-slate-800">Surveillance Recon</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Operating Altitude</span>
                  <span className="font-mono font-semibold text-slate-800">18,000 ft</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Platform Endurance</span>
                  <span className="font-mono text-slate-800">24.0 hours</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Current Phase</span>
                  <span className="font-semibold text-emerald-600">Cruise Flight</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Elapsed Time</span>
                  <span className="font-mono font-semibold text-slate-800">02:15:32</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Waypoints: 7 / 7 Active</span>
              <Link to="/app/mission-replay" className="text-blue-600 hover:text-blue-700 font-medium">
                Replay Mission →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
