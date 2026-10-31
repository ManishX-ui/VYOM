import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { EngineCanvas } from '../../components/digital-twin/EngineCanvas';
import { apiService } from '../../services/api';
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
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { selectedUAV, telemetry, alerts, backendConnectionStatus, telemetryMode } = useApp();
  const navigate = useNavigate();
  const [trendRange, setTrendRange] = useState<'1m' | '5m' | '15m' | '1h' | '6h' | '24h'>('15m');
  const [digitalTwinView, setDigitalTwinView] = useState<'external' | 'internal'>('external');
  const [trendData, setTrendData] = useState<any[]>([]);
  const [isLoadingTrend, setIsLoadingTrend] = useState<boolean>(false);

  // Fetch real downsampled historical telemetry for selected time range
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingTrend(true);
    apiService
      .getTelemetryHistory(trendRange, selectedUAV.id)
      .then((data) => {
        if (!isCancelled) {
          const formatted = (data || []).map((d: any) => ({
            ...d,
            scaledRpm: Math.round(d.rpm / 10),
            scaledOilPress: Number((d.oilPressure * 10).toFixed(1)),
            scaledVib: Number((d.vibrationRMS * 100).toFixed(1)),
          }));
          setTrendData(formatted);
          setIsLoadingTrend(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setIsLoadingTrend(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [trendRange, selectedUAV.id, telemetryMode]);

  // Synchronously stream and append live telemetry points to the active chart
  useEffect(() => {
    if (!telemetry || !telemetry.timestamp) return;
    setTrendData((prev) => {
      const latestPoint = {
        time: telemetry.timestamp,
        timestamp: telemetry.timestamp,
        rpm: telemetry.rpm,
        scaledRpm: Math.round(telemetry.rpm / 10),
        cht: telemetry.cht,
        egt: telemetry.egt,
        oilPressure: telemetry.oilPressure,
        scaledOilPress: Number((telemetry.oilPressure * 10).toFixed(1)),
        oilTemperature: telemetry.oilTemperature,
        fuelFlow: telemetry.fuelFlow,
        vibrationRMS: telemetry.vibrationRMS,
        scaledVib: Number((telemetry.vibrationRMS * 100).toFixed(1)),
        injectionTiming: telemetry.injectionTiming,
        engineHealth: telemetry.engineHealth,
      };

      if (prev.length === 0) return [latestPoint];

      const last = prev[prev.length - 1];
      if (last && last.time === telemetry.timestamp) {
        return [...prev.slice(0, -1), latestPoint];
      }
      return [...prev.slice(prev.length >= 30 ? 1 : 0), latestPoint];
    });
  }, [telemetry]);

  // Dynamic calculations for Engine Health Indicator
  const healthScore = Math.round(telemetry.engineHealth ?? 94);
  const strokeOffset = Math.max(0, Math.min(204.2, 204.2 * (1 - healthScore / 100)));
  const healthStatusColor = healthScore >= 85 ? '#10b981' : healthScore >= 70 ? '#f59e0b' : '#ef4444';
  const healthStatusText = healthScore >= 85 ? 'Healthy Condition' : healthScore >= 70 ? 'Elevated Monitoring' : 'Critical Degradation';
  const healthBadgeStyle =
    healthScore >= 85
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/90'
      : healthScore >= 70
      ? 'bg-amber-50 text-amber-700 border-amber-200/90'
      : 'bg-red-50 text-red-700 border-red-200/90';

  const isLiveDisconnected = telemetryMode === 'LIVE' && (backendConnectionStatus !== 'CONNECTED' || telemetry.datalink_status === 'DISCONNECTED');

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

        {/* UAV Platform Card with Live Mode & Telemetry Status */}
        <div className="flex flex-wrap items-center gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-900">{selectedUAV.name}</span>
              {/* Operating Mode Indicator */}
              {telemetryMode === 'LIVE' ? (
                <span
                  className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    backendConnectionStatus === 'CONNECTED' && telemetry.datalink_status !== 'DISCONNECTED'
                      ? 'text-emerald-700 bg-emerald-100/80 border-emerald-300'
                      : 'text-rose-700 bg-rose-100/80 border-rose-300 animate-pulse'
                  }`}
                >
                  {backendConnectionStatus === 'CONNECTED' && telemetry.datalink_status !== 'DISCONNECTED'
                    ? '● LIVE AIRSPACE'
                    : '● LIVE: DISCONNECTED'}
                </span>
              ) : telemetryMode === 'REPLAY' ? (
                <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-100/80 border border-purple-300 px-2 py-0.5 rounded-full">
                  ● REPLAY MODE
                </span>
              ) : (
                <span className="font-mono text-[10px] font-bold text-sky-700 bg-sky-100/80 border border-sky-300 px-2 py-0.5 rounded-full">
                  ● DEMO SIMULATION
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
              <span>{selectedUAV.engineModel}</span>
              <span>·</span>
              <span>Last Sync: {telemetry.timestamp || '--'}</span>
              <span>·</span>
              <span className={backendConnectionStatus === 'CONNECTED' ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                Datalink: {backendConnectionStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          B. 8 ENGINE PARAMETERS KPI CARDS
          Standard Aerospace Boxes • Clean Light Theme
          Strictly RPM, CHT, EGT, Oil Pressure, Oil Temp, Fuel Flow, Vibration, Injection Timing
          ========================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 items-stretch">
        {/* 1. Engine RPM */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-sm shadow-2xs flex flex-col justify-between h-full transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">RPM</span>
            <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 group-hover:text-blue-600 transition-colors">
              <Gauge className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
                {telemetry.rpm}
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-medium">RPM</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-mono">
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
              <span>↑</span> +2.1%
            </span>
            <span className="text-slate-400 font-medium">2.2-2.8k</span>
          </div>
        </div>

        {/* 2. Cylinder Head Temp (CHT) */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-sm shadow-2xs flex flex-col justify-between h-full transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">CHT</span>
            <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 group-hover:text-amber-600 transition-colors">
              <Thermometer className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
                {telemetry.cht}
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-medium">°C</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-mono">
            <span className="text-amber-600 font-semibold flex items-center gap-0.5">
              <span>↓</span> -1.3%
            </span>
            <span className="text-slate-400 font-medium">Max 180°</span>
          </div>
        </div>

        {/* 3. Exhaust Gas Temp (EGT) */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-sm shadow-2xs flex flex-col justify-between h-full transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">EGT</span>
            <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 group-hover:text-orange-600 transition-colors">
              <Flame className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
                {telemetry.egt}
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-medium">°C</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-mono">
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
              <span>↑</span> +1.1%
            </span>
            <span className="text-slate-400 font-medium">550-650°</span>
          </div>
        </div>

        {/* 4. Oil Pressure */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-sm shadow-2xs flex flex-col justify-between h-full transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Oil Pressure</span>
            <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 group-hover:text-blue-600 transition-colors">
              <Droplet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
                {telemetry.oilPressure}
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-medium">bar</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-mono">
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
              <span>↑</span> +0.5%
            </span>
            <span className="text-slate-400 font-medium">3.0-5.0</span>
          </div>
        </div>

        {/* 5. Oil Temperature */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-sm shadow-2xs flex flex-col justify-between h-full transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Oil Temp</span>
            <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 group-hover:text-cyan-600 transition-colors">
              <Thermometer className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
                {telemetry.oilTemperature}
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-medium">°C</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-mono">
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
              <span>↑</span> +0.6%
            </span>
            <span className="text-slate-400 font-medium">80-110°</span>
          </div>
        </div>

        {/* 6. Fuel Flow */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-sm shadow-2xs flex flex-col justify-between h-full transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fuel Flow</span>
            <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 group-hover:text-blue-600 transition-colors">
              <Fuel className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
                {telemetry.fuelFlow}
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-medium">L/hr</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-mono">
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
              <span>↑</span> +3.2%
            </span>
            <span className="text-slate-400 font-medium">Nominal</span>
          </div>
        </div>

        {/* 7. Vibration RMS */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-sm shadow-2xs flex flex-col justify-between h-full transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Vibration</span>
            <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 group-hover:text-amber-600 transition-colors">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
                {telemetry.vibrationRMS}
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-medium">g</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-mono">
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
              <span>↓</span> -5.4%
            </span>
            <span className="text-slate-400 font-medium">&lt; 0.25 g</span>
          </div>
        </div>

        {/* 8. Injection Timing */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-sm shadow-2xs flex flex-col justify-between h-full transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Injection</span>
            <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 group-hover:text-purple-600 transition-colors">
              <Timer className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
                {telemetry.injectionTiming}
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-medium">°BTDC</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-mono">
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
              <span>●</span> Nominal
            </span>
            <span className="text-slate-400 font-medium">26.0° Base</span>
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
              telemetry={telemetry}
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
                    stroke={healthStatusColor}
                    strokeWidth="12"
                    strokeDasharray="204.2"
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
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
                    {healthScore}%
                  </text>
                </svg>
              </div>

              {/* Status Badge below the arc */}
              <div className={`mt-2.5 inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none border shadow-2xs ${healthBadgeStyle}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${healthScore >= 85 ? 'bg-emerald-500 animate-pulse' : healthScore >= 70 ? 'bg-amber-500 animate-pulse' : 'bg-red-500 animate-ping'}`} />
                <span>{healthStatusText}</span>
              </div>
            </div>

            {/* Health Checklist bullets */}
            <div className="space-y-2 text-xs border-t border-slate-100 pt-3 mt-2">
              <div className="flex items-center gap-2 text-slate-700">
                {telemetry.cht <= 200 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <span>CHT: {telemetry.cht}°C ({telemetry.cht <= 200 ? 'Nominal thermal threshold' : 'Elevated temperature warning'})</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                {telemetry.oilPressure >= 2.5 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span>Lubrication: {telemetry.oilPressure} bar ({telemetry.oilPressure >= 2.5 ? 'Normal pump delivery' : 'Low pressure warning'})</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                {telemetry.vibrationRMS <= 0.35 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <span>Vibration: {telemetry.vibrationRMS} g ({telemetry.vibrationRMS <= 0.35 ? 'Balanced harmonic level' : 'Excessive resonance'})</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>MAP Boost: {telemetry.manifoldPressureInHg ?? 31.2} inHg · Timing: {telemetry.injectionTiming}° BTDC</span>
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

            {/* Time Horizon Selector (1m, 5m, 15m, 1h, 6h, 24h) */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-mono">
              {(['1m', '5m', '15m', '1h', '6h', '24h'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTrendRange(r)}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
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

          {/* Chart or Authentic Empty State */}
          {trendData.length === 0 ? (
            <div className="h-48 w-full flex flex-col items-center justify-center text-slate-400 font-mono text-xs border border-dashed border-slate-200 rounded-xl">
              <Info className="w-5 h-5 text-slate-400 mb-1" />
              <span>
                {isLiveDisconnected
                  ? 'No live telemetry received from GCS datalink'
                  : 'No telemetry history points available for selected range'}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Airframe: {selectedUAV.id} · Mode: {telemetryMode}
              </span>
            </div>
          ) : (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
                  <Line type="monotone" dataKey="scaledRpm" name="RPM (x10)" stroke="#2563eb" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="cht" name="CHT (°C)" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="scaledOilPress" name="Oil Pressure (x10)" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="scaledVib" name="Vibration (x100)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

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
                <span
                  className={`font-mono text-[10px] px-2 py-0.5 rounded font-semibold border ${
                    telemetryMode === 'LIVE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : telemetryMode === 'REPLAY'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  {telemetryMode} DATALINK
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Mission Type</span>
                  <span className="font-semibold text-slate-800">Surveillance Recon</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Operating Altitude</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {telemetry.altitudeFt ? `${Math.round(telemetry.altitudeFt).toLocaleString()} ft` : '18,000 ft'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Platform Endurance</span>
                  <span className="font-mono text-slate-800">24.0 hours</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Current Phase</span>
                  <span className="font-semibold text-emerald-600">
                    {telemetry.rpm > 2600 ? 'Climb Power' : telemetry.rpm < 2100 ? 'Descent Phase' : 'Cruise Flight'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Elapsed Time</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {telemetry.timestamp || '02:15:32'}
                  </span>
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
