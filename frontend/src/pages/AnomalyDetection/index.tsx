import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ANOMALIES_LIST } from '../../data/demoData';
import { EngineCanvas } from '../../components/digital-twin/EngineCanvas';
import { AnomalyRecord, MLModelInfo } from '../../types';
import { apiService } from '../../services/api';
import {
  AlertTriangle,
  Activity,
  HeartPulse,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  ArrowRight,
  Info,
  Radio,
  Cpu,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const AnomalyDetectionPage: React.FC = () => {
  const { anomalies, telemetry, showToast } = useApp();

  const [modelInfo, setModelInfo] = useState<MLModelInfo | null>(null);
  const [activeAnomalyComp, setActiveAnomalyComp] = useState<string>('comp-crankshaft');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [timeFilter, setTimeFilter] = useState<string>('Live');

  // Load Model Metadata on mount
  useEffect(() => {
    let isMounted = true;
    apiService
      .getModelInfo()
      .then((info) => {
        if (isMounted) setModelInfo(info);
      })
      .catch((err) => {
        console.debug('ML Model info fetch error:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync 3D component highlight with active anomaly
  useEffect(() => {
    if (telemetry.primary_component) {
      const compLower = telemetry.primary_component.toLowerCase();
      if (compLower.includes('crankshaft') || compLower.includes('vibration')) {
        setActiveAnomalyComp('comp-crankshaft');
      } else if (compLower.includes('cylinder') || compLower.includes('cooling') || compLower.includes('cht')) {
        setActiveAnomalyComp('comp-cylinder-head');
      } else if (compLower.includes('oil') || compLower.includes('lubrication')) {
        setActiveAnomalyComp('comp-oil-system');
      } else if (compLower.includes('fuel') || compLower.includes('injection')) {
        setActiveAnomalyComp('comp-fuel-system');
      } else if (compLower.includes('turbo') || compLower.includes('manifold') || compLower.includes('egt')) {
        setActiveAnomalyComp('comp-turbocharger');
      }
    }
  }, [telemetry.primary_component, telemetry.affected_parameters]);

  // Derived real anomaly states
  const currentScore = typeof telemetry.anomaly_score === 'number' ? telemetry.anomaly_score : 0.18;
  const isAnomaly = Boolean(telemetry.is_anomaly || currentScore >= 0.60);
  const severity = telemetry.anomaly_severity || (currentScore >= 0.75 ? 'High' : currentScore >= 0.60 ? 'Medium' : currentScore >= 0.40 ? 'Low' : 'Normal');

  // Multi-parameter normalized trend buffer
  const normalizedTrendData = [
    { time: '14:10', rpm: 0.8, cht: 1.15, oil: 0.95, vib: 0.45, fuel: 0.98 },
    { time: '14:15', rpm: 0.9, cht: 1.18, oil: 0.92, vib: 0.52, fuel: 1.0 },
    { time: '14:20', rpm: 0.85, cht: 1.25, oil: 0.90, vib: 0.75, fuel: 1.02 },
    { time: '14:25', rpm: 0.95, cht: 1.35, oil: 0.88, vib: 1.25, fuel: 1.05 },
    { time: '14:28', rpm: 0.98, cht: 1.48, oil: 0.86, vib: 1.72, fuel: 1.04 },
    {
      time: telemetry.timestamp?.slice(0, 5) || '14:30',
      rpm: Number(((telemetry.rpm || 2450) / 2450).toFixed(2)),
      cht: Number(((telemetry.cht || 180) / 180).toFixed(2)),
      oil: Number(((telemetry.oilPressure || 4.1) / 4.1).toFixed(2)),
      vib: Number(((telemetry.vibrationRMS || 0.28) / 0.28).toFixed(2)),
      fuel: Number(((telemetry.fuelFlow || 12.5) / 12.5).toFixed(2)),
    },
  ];

  // Dynamic anomaly distribution data for Donut Chart
  const distributionData = useMemo(() => {
    let vib = 0, temp = 0, press = 0, fuel = 0;
    (anomalies || []).forEach((a) => {
      const p = (a.parameter || '').toLowerCase();
      if (p.includes('vib')) vib++;
      else if (p.includes('temp') || p.includes('cht') || p.includes('egt')) temp++;
      else if (p.includes('press') || p.includes('map') || p.includes('oil')) press++;
      else if (p.includes('fuel')) fuel++;
      else vib++;
    });
    const total = Math.max(1, vib + temp + press + fuel);
    return [
      { name: 'Vibration', value: Math.round((vib / total) * 100), color: '#ef4444' },
      { name: 'Temperature', value: Math.round((temp / total) * 100), color: '#f59e0b' },
      { name: 'Pressure', value: Math.round((press / total) * 100), color: '#3b82f6' },
      { name: 'Fuel Flow', value: Math.round((fuel / total) * 100), color: '#8b5cf6' },
    ];
  }, [anomalies]);

  const filteredAnomalies = (anomalies || []).filter((item) => {
    const matchesSev = severityFilter === 'All' || item.severity === severityFilter;
    const matchesStat = statusFilter === 'All' || item.status === statusFilter;
    return matchesSev && matchesStat;
  });

  const handleInvestigate = async () => {
    const activeAnom = filteredAnomalies.find((a) => a.status === 'Active') || filteredAnomalies[0];
    if (activeAnom) {
      try {
        const inv = await apiService.investigateAnomaly(activeAnom.id);
        showToast(
          `Diagnostic: ${inv.primary_cause || 'Root Cause Identified'}`,
          `Confidence: ${(inv.confidence * 100).toFixed(1)}% | Action: ${inv.recommended_action || 'Inspect component'}`,
          'warning'
        );
      } catch (e) {
        showToast(
          'Investigation Diagnostic Initiated',
          `Diagnostic harmonic analysis dispatched for ${activeAnom.affectedComponent}`,
          'warning'
        );
      }
    } else {
      showToast('Diagnostic Status', 'All engine parameters nominal. No active anomalies requiring investigation.', 'info');
    }
  };

  // Arc calculation for gauge: radius 65 => total perimeter ~204.2
  const clampedScore = Math.max(0, Math.min(1, currentScore));
  const dashOffset = (204.2 * (1 - clampedScore)).toFixed(1);
  const scoreColor = isAnomaly || currentScore >= 0.60 ? '#ef4444' : currentScore >= 0.40 ? '#f59e0b' : '#10b981';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* =========================================
          PAGE HEADER & TIME RANGE CONTROLS
          ========================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Engine Anomaly Detection
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-900 text-emerald-400 border border-slate-700 shadow-2xs">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>{modelInfo?.model_version || 'v1.2.0-isoforest-rotax'}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-sensor anomaly detection powered by Scikit-Learn Isolation Forest
          </p>
        </div>

        {/* Time Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200 text-xs font-medium shadow-2xs">
          {['Live', 'Last 1 Hour', 'Last 6 Hours', 'Last 24 Hours'].map((t) => (
            <button
              key={t}
              onClick={() => setTimeFilter(t)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                timeFilter === t
                  ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* =========================================
          TOP SECTION: ANOMALY ALERT BANNER & 3D MODEL HIGHLIGHT
          ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Engine Status Alert Card (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between h-full space-y-3.5">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Engine Status</h3>
              {isAnomaly ? (
                <span className="font-mono text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Degraded Telemetry
                </span>
              ) : (
                <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Nominal Operation
                </span>
              )}
            </div>

            {/* Alert Banner */}
            {isAnomaly ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-red-900 leading-tight">Anomaly Detected</h4>
                    <p className="text-xs text-red-700 mt-0.5">
                      {telemetry.affected_parameters && telemetry.affected_parameters.length > 0
                        ? `Parameter deviation detected on [${telemetry.affected_parameters.join(', ')}].`
                        : 'Unusual telemetry pattern detected by Isolation Forest.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleInvestigate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  <span>Investigate</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-emerald-900 leading-tight">Engine Telemetry Nominal</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      All 13 monitored and engineered features are within nominal statistical boundaries.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleInvestigate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  <span>Run Audit</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Diagnostic Anomaly Trigger Details */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-blue-600" />
                  <span>Isolation Forest Multi-Feature Analysis</span>
                </span>
                <span
                  className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                    isAnomaly
                      ? 'text-red-600 bg-red-100/80 border-red-200'
                      : 'text-emerald-700 bg-emerald-100/80 border-emerald-200'
                  }`}
                >
                  {isAnomaly ? `Threshold Exceeded (Score: ${currentScore.toFixed(3)})` : `In Baseline (Score: ${currentScore.toFixed(3)})`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 uppercase block">Monitored Parameter</span>
                  <span className="font-bold text-slate-900">
                    {telemetry.affected_parameters?.[0] || 'Vibration'}: {(telemetry.vibrationRMS || 0.28).toFixed(2)} g
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Baseline: 0.28 ± 0.04 g</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200/70">
                  <span className="text-[10px] text-slate-400 uppercase block">Affected Subsystem</span>
                  <span className="font-bold text-slate-900 truncate block">
                    {telemetry.primary_component || 'Rotax 914 F Core Subsystem'}
                  </span>
                  <span className={`text-[10px] block mt-0.5 ${isAnomaly ? 'text-amber-600 font-semibold' : 'text-emerald-600'}`}>
                    {isAnomaly ? 'Deviant Component Alert' : 'Subsystem Normal'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Diagnostic Status Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs items-stretch">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between h-[74px]">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Current Health</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold font-mono text-slate-900">
                  {telemetry.engineHealth || 78}%
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {telemetry.engineHealth && telemetry.engineHealth < 80 ? '↓ Degraded' : 'Nominal'}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 truncate block">Rotax 914 F</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between h-[74px]">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Anomalies</span>
              <p className={`text-lg font-bold font-mono ${isAnomaly ? 'text-red-600' : 'text-slate-900'}`}>
                {anomalies.filter((a) => a.status === 'Active').length} Active
              </p>
              <span className="text-[10px] text-slate-500 font-mono truncate block">
                {anomalies.length} in log
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between h-[74px]">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Severity</span>
              <p
                className={`text-lg font-bold font-mono ${
                  severity === 'High'
                    ? 'text-red-600'
                    : severity === 'Medium'
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                {severity}
              </p>
              <span className="text-[10px] text-slate-500 truncate block">ML Risk Level</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between h-[74px]">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Time Evaluated</span>
              <p className="text-lg font-bold font-mono text-slate-900">
                {telemetry.timestamp || new Date().toLocaleTimeString('en-GB')}
              </p>
              <span className="text-[10px] text-emerald-600 truncate block font-mono font-semibold">
                ● Telemetry Stream Synced
              </span>
            </div>
          </div>
        </div>

        {/* Right: Anomaly Visualization on Engine Model (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Anomaly Visualization on Engine Model</h3>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Normal
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Minor
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Major
              </span>
            </div>
          </div>

          <EngineCanvas
            heightClass="h-[280px]"
            anomalyHighlight={activeAnomalyComp}
            activeComponentId={activeAnomalyComp}
            onSelectComponent={(c) => setActiveAnomalyComp(c)}
          />

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
            <span className="text-red-600 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> High Vibration: Crankcase web #2
            </span>
            <span className="text-amber-600 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Cylinder Head Temp Anomaly: 187 °C
            </span>
          </div>
        </div>
      </div>

      {/* =========================================
          MIDDLE SECTION: PARAMETER TRENDS & ANOMALY SCORE
          ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Parameter Anomaly Trends with Shaded Anomaly Box (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between h-full space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Parameter Anomaly Trends</h3>
              <p className="text-[11px] text-slate-500">Normalized multi-parameter deviations with anomaly interval</p>
            </div>
            <span className="text-xs font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200 font-semibold">
              Anomaly Window: 14:25 - 14:30
            </span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={normalizedTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} fontVariant="tabular-nums" />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 2.0]} fontVariant="tabular-nums" />
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
                <ReferenceArea x1="14:25" x2="14:30" fill="#fee2e2" fillOpacity={0.6} label={{ value: 'Anomaly Period', fill: '#dc2626', fontSize: 10, position: 'insideTopRight' }} />
                <Line type="monotone" dataKey="rpm" name="RPM (Normalized)" stroke="#2563eb" strokeWidth={1.8} dot={false} />
                <Line type="monotone" dataKey="cht" name="CHT (Normalized)" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="oil" name="Oil Pressure (Normalized)" stroke="#10b981" strokeWidth={1.8} dot={false} />
                <Line type="monotone" dataKey="vib" name="Vibration (Normalized)" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="fuel" name="Fuel Flow (Normalized)" stroke="#8b5cf6" strokeWidth={1.8} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600 border-t border-slate-100 pt-3">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> RPM</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> CHT</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Oil Pressure</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Vibration</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Fuel Flow</span>
          </div>
        </div>

        {/* Right: Anomaly Score Gauge & Distribution (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4 h-full">
          {/* Anomaly Score Gauge Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1">
              <h4 className="font-bold text-slate-900 text-sm">Anomaly Score</h4>
              <span title={`Statistical anomaly score computed by Isolation Forest (Threshold: ${modelInfo?.anomaly_threshold || 0.47})`}>
                <Info className="w-4 h-4 text-slate-400 cursor-help" />
              </span>
            </div>

            {/* Circular Gauge / Numerical Score */}
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
                    stroke={scoreColor}
                    strokeWidth="12"
                    strokeDasharray="204.2"
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
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
                    {currentScore.toFixed(2)}
                  </text>
                </svg>
              </div>

              {/* Status Badge below the arc */}
              <div
                className={`mt-2.5 inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none shadow-2xs ${
                  isAnomaly
                    ? 'bg-red-50 text-red-700 border border-red-200/90'
                    : currentScore >= 0.40
                    ? 'bg-amber-50 text-amber-700 border border-amber-200/90'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200/90'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isAnomaly ? 'bg-red-500 animate-pulse' : currentScore >= 0.40 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
                <span>
                  {isAnomaly
                    ? 'High Anomaly Score'
                    : currentScore >= 0.40
                    ? 'Mild Parameter Deviation'
                    : 'Nominal Isolation State'}
                </span>
              </div>
            </div>

            {/* Threshold classification legend */}
            <div className="w-full pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-600 px-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>0.0 - 0.4 Normal</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span>0.4 - 0.6 Mild</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span>0.6 - 1.0 High</span>
              </span>
            </div>
          </div>

          {/* Anomaly Distribution Donut Chart */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 flex-1 flex flex-col justify-between">
            <h4 className="font-bold text-slate-900 text-sm">Anomaly Distribution (24h)</h4>

            <div className="flex items-center justify-between">
              <div className="w-28 h-28 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distributionData} dataKey="value" innerRadius={28} outerRadius={42} paddingAngle={3}>
                      {distributionData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-extrabold font-mono text-base text-slate-900 leading-none">
                    {anomalies.length}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Total</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                {distributionData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span>{d.name}</span>
                    </span>
                    <span className="font-bold text-slate-900">{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          BOTTOM SECTION: DETECTED ANOMALIES TABLE
          ========================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Detected Anomalies Log</h3>
            <p className="text-[11px] text-slate-500">Historical &amp; live anomaly records with threshold deviations</p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-mono text-[11px]">Filter Severity:</span>
            {['All', 'High', 'Medium', 'Low'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  severityFilter === sev
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {sev}
              </button>
            ))}

            <span className="text-slate-400 font-mono text-[11px] ml-2">Status:</span>
            {['All', 'Active', 'Resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold font-mono text-[11px]">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Parameter</th>
                <th className="py-2.5 px-3">Detected Value</th>
                <th className="py-2.5 px-3">Expected Range</th>
                <th className="py-2.5 px-3">Deviation</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAnomalies.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.severity === 'High'
                            ? 'bg-red-500'
                            : item.severity === 'Medium'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <span className="font-semibold text-slate-800">{item.parameter}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">{item.detectedValue}</td>
                  <td className="py-3 px-3 font-mono text-slate-500">{item.expectedRange}</td>
                  <td className="py-3 px-3 font-mono font-bold text-red-600">{item.deviation}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded ${
                        item.severity === 'High'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : item.severity === 'Medium'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">{item.time}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded ${
                        item.status === 'Active'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

