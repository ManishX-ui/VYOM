import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SensorRecord } from '../../types';
import {
  Gauge,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Layers,
  Clock,
  ChevronRight,
  X,
  TrendingUp,
  Cpu,
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

export const SensorMonitoringPage: React.FC = () => {
  const { sensors, telemetry, anomalies } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [activeSensor, setActiveSensor] = useState<SensorRecord | null>(sensors[1]); // default to CHT

  // Summary counts
  const totalSensors = sensors.length;
  const onlineSensors = sensors.filter((s) => s.status === 'Online').length;
  const warningSensors = sensors.filter((s) => s.status === 'Warning').length;
  const offlineSensors = sensors.filter((s) => s.status === 'Offline').length;

  // Filtered sensors
  const filteredSensors = sensors.filter((sensor) => {
    const matchesSearch =
      sensor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sensor.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || sensor.category === selectedCategory;
    const matchesStatus =
      selectedStatus === 'All' || sensor.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Sensor Monitoring Console
        </h2>
      </div>

      {/* =========================================
          SENSOR SUMMARY STATS STRIP
          ========================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-stretch">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full space-y-1">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider block">Total Sensors</span>
          <p className="text-2xl font-extrabold font-mono text-slate-900">{totalSensors}</p>
          <span className="text-[11px] text-slate-500 font-mono">100% Configured</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-emerald-200/80 shadow-2xs flex flex-col justify-between h-full space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-emerald-700 text-[11px] uppercase tracking-wider block">Online &amp; Nominal</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-emerald-700">{onlineSensors}</p>
          <span className="text-[11px] text-emerald-600 font-mono">Signal Verified</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-amber-200/80 shadow-2xs flex flex-col justify-between h-full space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-amber-700 text-[11px] uppercase tracking-wider block">Warning / Threshold</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-amber-800">{warningSensors}</p>
          <span className="text-[11px] text-amber-700 font-mono">Under Observation</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider block">Offline / Disconnected</span>
            <XCircle className="w-4 h-4 text-slate-300" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-slate-400">{offlineSensors}</p>
          <span className="text-[11px] text-slate-400 font-mono">Zero Signal Loss</span>
        </div>
      </div>

      {/* =========================================
          FILTERS & SEARCH BAR
          ========================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sensor by name or code (e.g. CHT, RPM)..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
          <span className="text-slate-400 text-[11px] mr-1">Category:</span>
          {['All', 'Thermal', 'Mechanical', 'Fluid', 'Electrical'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 text-xs font-medium border-l border-slate-200 pl-3">
          <span className="text-slate-400 text-[11px]">Status:</span>
          {['All', 'Online', 'Warning'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                selectedStatus === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* =========================================
          MAIN SENSOR CARDS GRID & DETAILS DRAWER
          ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Sensor Cards (Fixed normal height tiles across all categories & filters) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5 content-start auto-rows-[136px]">
          {filteredSensors.map((sensor) => {
            const isSelected = activeSensor?.id === sensor.id;
            const isWarning = sensor.status === 'Warning';

            return (
              <div
                key={sensor.id}
                onClick={() => setActiveSensor(sensor)}
                className={`p-4 rounded-xl border transition-all cursor-pointer bg-white shadow-2xs flex flex-col justify-between h-[136px] ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : isWarning
                    ? 'border-amber-200/90 hover:border-amber-400'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs leading-tight">{sensor.name}</h4>
                    <span className="font-mono text-[10px] text-slate-400">{sensor.code}</span>
                  </div>
                  <span
                    className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded ${
                      isWarning
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {sensor.status}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold font-mono text-slate-900">
                      {sensor.id === 's-rpm'
                        ? telemetry.rpm
                        : sensor.id === 's-cht'
                        ? telemetry.cht
                        : sensor.id === 's-egt'
                        ? telemetry.egt
                        : sensor.id === 's-oil-p'
                        ? telemetry.oilPressure
                        : sensor.id === 's-oil-t'
                        ? telemetry.oilTemperature
                        : sensor.id === 's-fuel-f'
                        ? telemetry.fuelFlow
                        : sensor.id === 's-vib-rms'
                        ? telemetry.vibrationRMS
                        : sensor.id === 's-inj-timing'
                        ? telemetry.injectionTiming
                        : sensor.value}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{sensor.unit}</span>
                  </div>

                  <span
                    className={`text-[11px] font-mono font-semibold ${
                      sensor.deltaPercent >= 0 ? 'text-emerald-600' : 'text-slate-500'
                    }`}
                  >
                    {sensor.deltaPercent >= 0 ? `+${sensor.deltaPercent}%` : `${sensor.deltaPercent}%`}
                  </span>
                </div>

                {/* Normal Operating Range bar */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Range: {sensor.minNormal} - {sensor.maxNormal} {sensor.unit}</span>
                  <span className="text-blue-600 font-medium flex items-center gap-0.5">
                    Inspect <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}

          {filteredSensors.length === 0 && (
            <div className="col-span-full h-[136px] flex flex-col items-center justify-center p-6 rounded-xl bg-white border border-slate-200 text-center text-slate-500 text-xs font-mono shadow-2xs">
              <span>No sensors found matching the selected filter criteria.</span>
            </div>
          )}
        </div>

        {/* Right: Selected Sensor Deep-Dive Panel (Stretches to perfectly align top to bottom with left grid) */}
        {activeSensor && (
          <div className="lg:col-span-5 bg-white rounded-2xl border border-blue-200 p-5 shadow-2xs flex flex-col justify-between h-full select-none space-y-3.5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm leading-tight">{activeSensor.name}</h3>
                <p className="font-mono text-xs text-slate-400 mt-0.5">{activeSensor.code} · {activeSensor.category}</p>
              </div>

              <span
                className={`font-mono text-xs font-bold px-2.5 py-1 rounded shrink-0 ${
                  activeSensor.status === 'Warning'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                {activeSensor.status}
              </span>
            </div>

            {/* Description (Fixed 2-line height) */}
            <p className="text-xs text-slate-600 leading-relaxed h-9 line-clamp-2 overflow-hidden">
              {activeSensor.description}
            </p>

            {/* Current Value & Quality Specs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 h-[76px] flex flex-col justify-between">
                <span className="text-slate-400 text-[10px] uppercase font-mono block">Current Telemetry</span>
                <p className="text-xl font-extrabold font-mono text-slate-900">
                  {activeSensor.id === 's-rpm'
                    ? telemetry.rpm
                    : activeSensor.id === 's-cht'
                    ? telemetry.cht
                    : activeSensor.id === 's-egt'
                    ? telemetry.egt
                    : activeSensor.id === 's-oil-p'
                    ? telemetry.oilPressure
                    : activeSensor.id === 's-oil-t'
                    ? telemetry.oilTemperature
                    : activeSensor.id === 's-fuel-f'
                    ? telemetry.fuelFlow
                    : activeSensor.id === 's-vib-rms'
                    ? telemetry.vibrationRMS
                    : activeSensor.id === 's-inj-timing'
                    ? telemetry.injectionTiming
                    : activeSensor.value}{' '}
                  {activeSensor.unit}
                </p>
                <span className="text-[10px] font-mono text-slate-500 truncate block">Updated: {activeSensor.lastUpdate}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 h-[76px] flex flex-col justify-between">
                <span className="text-slate-400 text-[10px] uppercase font-mono block">Signal Quality</span>
                <p className="text-xl font-extrabold font-mono text-emerald-600">
                  {activeSensor.dataQuality}%
                </p>
                <span className="text-[10px] font-mono text-slate-500 truncate block">0.02% Packet Loss</span>
              </div>
            </div>

            {/* Operating Range Meter */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-600">Nominal Calibration Band</span>
                <span className="font-mono text-slate-900">
                  {activeSensor.minNormal} - {activeSensor.maxNormal} {activeSensor.unit}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 relative">
                <div
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{ width: '80%' }}
                />
              </div>
            </div>

            {/* Historical Telemetry Chart (Flexibly fills vertical space to align with left cards) */}
            <div className="flex-1 flex flex-col justify-between min-h-[150px] py-1 space-y-1">
              <h4 className="font-bold text-slate-800 text-xs">Short-Term Signal Trend (15m)</h4>
              <div className="flex-1 w-full min-h-[130px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activeSensor.trend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={9} fontVariant="tabular-nums" />
                    <YAxis stroke="#94a3b8" fontSize={9} fontVariant="tabular-nums" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '10px',
                        fontFamily: 'monospace',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={`${activeSensor.name} (${activeSensor.unit})`}
                      stroke={activeSensor.status === 'Warning' ? '#f59e0b' : '#2563eb'}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status & Diagnostic Message (Always rendered, fixed height across all sensors) */}
            <div
              className={`p-3 rounded-xl border text-xs space-y-1 h-[68px] flex flex-col justify-center ${
                activeSensor.status === 'Warning'
                  ? 'bg-amber-50/80 border-amber-200/80 text-amber-900'
                  : 'bg-emerald-50/80 border-emerald-200/80 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                {activeSensor.status === 'Warning' ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-amber-900">Associated Anomaly Detected</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-emerald-900">Nominal Operation Verified</span>
                  </>
                )}
              </div>
              <p
                className={`text-[11px] leading-snug line-clamp-1 ${
                  activeSensor.status === 'Warning' ? 'text-amber-800' : 'text-emerald-700'
                }`}
              >
                {activeSensor.status === 'Warning'
                  ? 'Transducer harmonics are logged in Anomaly Detection console (>9% threshold).'
                  : 'Telemetry stream steady within calibrated bounds. Signal nominal.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
