import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SensorRecord } from '../../types';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
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
  const { sensors } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [activeSensor, setActiveSensor] = useState<SensorRecord | null>(null);

  // Set default active sensor (s-cht: Cylinder Head Temp (CHT)) to match reference design
  useEffect(() => {
    if (!activeSensor && sensors.length > 0) {
      const defaultSensor = sensors.find((s) => s.id === 's-cht') || sensors[0];
      setActiveSensor(defaultSensor);
    } else if (activeSensor) {
      const updated = sensors.find((s) => s.id === activeSensor.id);
      if (updated) {
        setActiveSensor(updated);
      }
    }
  }, [sensors]);

  // Summary counts
  const totalSensors = sensors.length;
  const normalSensors = sensors.filter(
    (s) => s.status === 'NORMAL' || s.status === 'Online'
  ).length;
  const warningSensors = sensors.filter(
    (s) => s.status === 'WARNING' || s.status === 'Warning'
  ).length;
  const offlineSensors = sensors.filter(
    (s) => s.status === 'OFFLINE' || s.status === 'Offline'
  ).length;

  // Filtered sensors
  const filteredSensors = sensors.filter((sensor) => {
    const matchesSearch =
      sensor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sensor.code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' ||
      sensor.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesStatus =
      selectedStatus === 'All' ||
      (selectedStatus === 'Online' && (sensor.status === 'Online' || sensor.status === 'NORMAL')) ||
      (selectedStatus === 'Warning' && (sensor.status === 'Warning' || sensor.status === 'WARNING'));

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const trendData = activeSensor?.trend && activeSensor.trend.length > 0
    ? activeSensor.trend
    : [
        { time: '14:10', value: 172 },
        { time: '14:15', value: 175 },
        { time: '14:20', value: 180 },
        { time: '14:25', value: 188 },
        { time: '14:30', value: 187 },
      ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* =========================================
          PAGE HEADER
          ========================================= */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">
          Sensor Monitoring Console
        </h2>
      </div>

      {/* =========================================
          4 METRIC SUMMARY STATS CARDS
          ========================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: TOTAL SENSORS */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between h-[115px]">
          <span className="text-slate-400 text-[11px] font-mono uppercase tracking-wider font-medium">
            TOTAL SENSORS
          </span>
          <p className="text-3xl font-extrabold font-mono text-slate-900 leading-none">
            {totalSensors}
          </p>
          <span className="text-xs text-slate-400 font-mono">100% Configured</span>
        </div>

        {/* Card 2: ONLINE & NOMINAL */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px] font-mono uppercase tracking-wider font-medium">
              ONLINE &amp; NOMINAL
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-emerald-600 leading-none">
            {normalSensors}
          </p>
          <span className="text-xs text-emerald-600 font-mono">Signal Verified</span>
        </div>

        {/* Card 3: WARNING / THRESHOLD */}
        <div className="p-5 rounded-2xl bg-white border border-amber-200/90 shadow-2xs flex flex-col justify-between h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px] font-mono uppercase tracking-wider font-medium">
              WARNING / THRESHOLD
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-amber-600 leading-none">
            {warningSensors}
          </p>
          <span className="text-xs text-amber-600 font-mono">Under Observation</span>
        </div>

        {/* Card 4: OFFLINE / DISCONNECTED */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px] font-mono uppercase tracking-wider font-medium">
              OFFLINE / DISCONNECTED
            </span>
            <XCircle className="w-4 h-4 text-slate-300" />
          </div>
          <p className="text-3xl font-extrabold font-mono text-slate-400 leading-none">
            {offlineSensors}
          </p>
          <span className="text-xs text-slate-400 font-mono">Zero Signal Loss</span>
        </div>
      </div>

      {/* =========================================
          SEARCH & FILTER BAR
          ========================================= */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sensor by name or code (e.g. CHT, RPM)..."
            className="w-full pl-10 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 bg-transparent rounded-lg border-0 focus:outline-hidden"
          />
        </div>

        {/* Category & Status Filters */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Category */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-xs">Category:</span>
            {(['All', 'Thermal', 'Mechanical', 'Fluid', 'Electrical'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status */}
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
            <span className="text-slate-400 text-xs">Status:</span>
            {[
              { id: 'All', label: 'ALL' },
              { id: 'Online', label: 'Online' },
              { id: 'Warning', label: 'Warning' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  selectedStatus === st.id
                    ? 'bg-slate-900 text-white font-mono'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================
          MAIN SENSOR CARDS GRID & INSPECTION PANEL
          ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Listed sensors tile (Scrollable) */}
        <div className="lg:col-span-7 overflow-y-auto max-h-[580px] pr-2 scrollbar-thin scrollbar-thumb-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
            {filteredSensors.map((sensor) => {
              const isSelected = activeSensor?.id === sensor.id;
              const isWarning = sensor.status === 'Warning' || sensor.status === 'WARNING';

              return (
                <div
                  key={sensor.id}
                  onClick={() => setActiveSensor(sensor)}
                  className={`p-4 rounded-2xl bg-white shadow-2xs transition-all cursor-pointer flex flex-col justify-between h-[138px] ${
                    isSelected
                      ? 'border-2 border-blue-500 shadow-sm'
                      : 'border border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-serif font-bold text-slate-800 text-sm leading-snug">
                        {sensor.name}
                      </h4>
                      <span
                        className={`text-[11px] font-sans px-2.5 py-0.5 rounded-md font-medium shrink-0 border ${
                          isWarning
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {isWarning ? 'Warning' : 'Online'}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                      {sensor.code}
                    </p>
                  </div>

                  <div className="flex items-baseline justify-between mt-auto">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold font-mono text-slate-900">
                        {sensor.value}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {sensor.unit}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-mono font-medium ${
                        sensor.deltaPercent < 0 ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {sensor.deltaPercent > 0 ? `+${sensor.deltaPercent}%` : `${sensor.deltaPercent}%`}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>
                      Range: {sensor.minNormal} - {sensor.maxNormal} {sensor.unit}
                    </span>
                    <span className="text-blue-600 font-sans font-medium hover:underline flex items-center gap-0.5">
                      Inspect &gt;
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredSensors.length === 0 && (
              <div className="col-span-full p-8 rounded-2xl bg-white border border-slate-200 text-center text-xs font-mono text-slate-400">
                No sensors found matching search or filter criteria.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Sensor Inspection Panel (Non-scrollable, Sticky) */}
        {activeSensor && (
          <div className="lg:col-span-5 sticky top-4 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-slate-900 text-base">
                  {activeSensor.name}
                </h3>
                <span
                  className={`text-xs font-sans px-2.5 py-0.5 rounded-md font-medium border ${
                    activeSensor.status === 'Warning' || activeSensor.status === 'WARNING'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {activeSensor.status === 'Warning' || activeSensor.status === 'WARNING'
                    ? 'Warning'
                    : 'Online'}
                </span>
              </div>
              <p className="font-mono text-xs text-slate-400 mt-1">
                {activeSensor.code} · {activeSensor.category}
              </p>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              {activeSensor.description}
            </p>

            {/* 2-Column Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-medium">
                  CURRENT TELEMETRY
                </span>
                <p className="text-2xl font-extrabold font-mono text-slate-900 mt-1">
                  {activeSensor.value} {activeSensor.unit}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-medium">
                  SIGNAL QUALITY
                </span>
                <p className="text-2xl font-extrabold font-mono text-emerald-600 mt-1">
                  {activeSensor.dataQuality}%
                </p>
              </div>
            </div>

            {/* Nominal Calibration Band */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Nominal Calibration Band</span>
                <span className="font-mono text-slate-600">
                  {activeSensor.minNormal} - {activeSensor.maxNormal} {activeSensor.unit}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 relative overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: '85%' }}
                />
              </div>
            </div>

            {/* Short-Term Signal Trend */}
            <div className="space-y-2 pt-2">
              <h4 className="font-bold text-xs text-slate-800">
                Short-Term Signal Trend (15m)
              </h4>
              <div className="h-[135px] w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendData}
                    margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} domain={['auto', 'auto']} />
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
                      stroke={
                        activeSensor.status === 'Warning' || activeSensor.status === 'WARNING'
                          ? '#d97706'
                          : '#10b981'
                      }
                      strokeWidth={2}
                      dot={{
                        r: 3,
                        fill:
                          activeSensor.status === 'Warning' || activeSensor.status === 'WARNING'
                            ? '#d97706'
                            : '#10b981',
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Associated Alert Callout */}
            {(activeSensor.status === 'Warning' || activeSensor.status === 'WARNING') && (
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Associated Alert</span>
                </div>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  {activeSensor.id === 's-cht'
                    ? 'Transducer harmonic drift detected across Spark Plug Array #2. Calibrated operating window exceeded by +12 °C.'
                    : activeSensor.id === 's-vib-rms'
                    ? 'Tri-axial accelerometer vibration RMS exceeding 0.18 g upper boundary on crankcase web.'
                    : 'Transducer telemetry stream under active observation.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
