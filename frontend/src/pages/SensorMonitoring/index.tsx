import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SensorRecord, SensorStatus } from '../../types';
import { apiService } from '../../services/api';
import {
  Gauge,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Clock,
  ChevronRight,
  Sliders,
  RotateCcw,
  Radio,
  Zap,
  Compass,
  AlertOctagon,
  RefreshCw,
  X,
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
  const {
    sensors,
    telemetry,
    selectedUAV,
    telemetryMode,
    backendConnectionStatus,
    simulationScenario,
    setSimulationScenario,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [activeSensor, setActiveSensor] = useState<SensorRecord | null>(null);

  // Time-range filter for sensor historical trend chart
  const [chartRange, setChartRange] = useState<'1m' | '5m' | '15m' | '1h' | '6h' | '24h'>('15m');
  const [historyData, setHistoryData] = useState<{ time: string; value: number | null }[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Software Calibration Modal State
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [refValueInput, setRefValueInput] = useState<string>('');
  const [calNotesInput, setCalNotesInput] = useState<string>('');
  const [calSubmitting, setCalSubmitting] = useState<boolean>(false);

  // Default active sensor selection once loaded
  useEffect(() => {
    if (!activeSensor && sensors.length > 0) {
      const defaultSensor = sensors.find((s) => s.id === 's-cht') || sensors[0];
      setActiveSensor(defaultSensor);
    } else if (activeSensor) {
      // Keep active sensor reference in sync with latest readings
      const updated = sensors.find((s) => s.id === activeSensor.id);
      if (updated) {
        setActiveSensor(updated);
      }
    }
  }, [sensors]);

  // Fetch downsampled historical data when active sensor or time range changes
  useEffect(() => {
    if (!activeSensor) return;
    let isMounted = true;
    setIsLoadingHistory(true);

    apiService
      .getSensorHistory(activeSensor.id, chartRange)
      .then((res) => {
        if (isMounted && res && Array.isArray(res.points)) {
          setHistoryData(
            res.points.map((p) => ({
              time: p.time,
              value: p.value,
            }))
          );
        }
      })
      .catch(() => {
        if (isMounted) {
          // Fallback to activeSensor.trend if available
          setHistoryData(activeSensor.trend || []);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingHistory(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeSensor?.id, chartRange, telemetryMode]);

  // Append incoming real-time telemetry point to historical graph
  useEffect(() => {
    if (!activeSensor || activeSensor.value === null) return;
    setHistoryData((prev) => {
      const timeStr = telemetry.timestamp || new Date().toLocaleTimeString('en-GB', { hour12: false });
      const newPoint = {
        time: timeStr,
        value: activeSensor.value,
      };
      if (prev.length === 0) return [newPoint];
      const lastPoint = prev[prev.length - 1];
      if (lastPoint && lastPoint.time === timeStr) return prev;

      return [...prev.slice(prev.length >= 30 ? 1 : 0), newPoint];
    });
  }, [telemetry.timestamp, activeSensor?.value]);

  // Summary counts
  const totalSensors = sensors.length;
  const normalSensors = sensors.filter(
    (s) => s.status === 'NORMAL' || s.status === 'Online'
  ).length;
  const warningSensors = sensors.filter((s) => s.status === 'WARNING' || s.status === 'Warning').length;
  const criticalSensors = sensors.filter((s) => s.status === 'CRITICAL').length;
  const offlineSensors = sensors.filter((s) => s.status === 'OFFLINE' || s.status === 'Offline').length;
  const staleSensors = sensors.filter((s) => s.status === 'STALE').length;
  const calReqSensors = sensors.filter((s) => s.status === 'CALIBRATION_REQUIRED').length;

  // Filtered sensors
  const filteredSensors = sensors.filter((sensor) => {
    const matchesSearch =
      sensor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sensor.code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' ||
      sensor.category.toLowerCase() === selectedCategory.toLowerCase() ||
      (selectedCategory === 'Engine' && ['Thermal', 'Mechanical', 'Fluid'].includes(sensor.category));

    const matchesStatus =
      selectedStatus === 'All' ||
      sensor.status.toUpperCase() === selectedStatus.toUpperCase() ||
      (selectedStatus === 'NORMAL' && sensor.status === 'Online') ||
      (selectedStatus === 'WARNING' && sensor.status === 'Warning') ||
      (selectedStatus === 'OFFLINE' && sensor.status === 'Offline');

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadgeStyle = (status: SensorStatus) => {
    switch (status) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300 font-bold';
      case 'WARNING':
      case 'Warning':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
      case 'OFFLINE':
      case 'Offline':
        return 'bg-slate-100 text-slate-500 border-slate-300 font-medium';
      case 'STALE':
        return 'bg-purple-100 text-purple-800 border-purple-300 font-semibold';
      case 'CALIBRATION_REQUIRED':
        return 'bg-orange-100 text-orange-800 border-orange-300 font-semibold';
      case 'NORMAL':
      case 'Online':
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';
    }
  };

  const handleApplyCalibration = async () => {
    if (!activeSensor || !refValueInput) return;
    const refVal = parseFloat(refValueInput);
    if (isNaN(refVal)) return;

    setCalSubmitting(true);
    try {
      await apiService.calibrateSensor(activeSensor.id, {
        reference_value: refVal,
        measured_value: activeSensor.raw_value ?? activeSensor.value ?? refVal,
        technician: 'CHIEF_AVIONICS',
        notes: calNotesInput || 'Software bench calibration offset adjustment',
      });
      setIsCalibrating(false);
      setRefValueInput('');
      setCalNotesInput('');
      // Trigger sensor refresh
      const refreshed = await apiService.getSensorDetail(activeSensor.id);
      if (refreshed) setActiveSensor(refreshed);
    } catch (e) {
      console.error(e);
    } finally {
      setCalSubmitting(false);
    }
  };

  const handleResetCalibration = async () => {
    if (!activeSensor) return;
    setCalSubmitting(true);
    try {
      await apiService.resetSensorCalibration(activeSensor.id);
      setIsCalibrating(false);
      const refreshed = await apiService.getSensorDetail(activeSensor.id);
      if (refreshed) setActiveSensor(refreshed);
    } catch (e) {
      console.error(e);
    } finally {
      setCalSubmitting(false);
    }
  };

  const isLiveDisconnected =
    telemetryMode === 'LIVE' &&
    (backendConnectionStatus !== 'CONNECTED' || telemetry.datalink_status === 'DISCONNECTED');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Sensor Monitoring Console
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time transducer acquisition, multi-state fault detection, and calibration management
          </p>
        </div>

        {/* Operating Mode & Airframe Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-mono px-2.5 py-1 rounded font-semibold border ${
              telemetryMode === 'LIVE'
                ? isLiveDisconnected
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : telemetryMode === 'REPLAY'
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            Mode: {telemetryMode} {isLiveDisconnected ? '(DISCONNECTED)' : ''}
          </span>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-600 font-medium">
            UAV: {selectedUAV.id} ({selectedUAV.name})
          </span>
        </div>
      </div>

      {/* =========================================
          SENSOR SUMMARY STATS STRIP
          ========================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 items-stretch">
        {/* 1. Total Sensors */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full space-y-1">
          <span className="text-slate-400 text-[10px] uppercase tracking-wider block font-medium">Total Sensors</span>
          <p className="text-2xl font-extrabold font-mono text-slate-900">{totalSensors}</p>
          <span className="text-[10px] text-slate-500 font-mono">18 Transducers</span>
        </div>

        {/* 2. Normal */}
        <div className="p-3.5 rounded-xl bg-white border border-emerald-200/80 shadow-2xs flex flex-col justify-between h-full space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-emerald-700 text-[10px] uppercase tracking-wider block font-medium">Normal</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-emerald-700">{normalSensors}</p>
          <span className="text-[10px] text-emerald-600 font-mono">Calibrated In-Spec</span>
        </div>

        {/* 3. Warning */}
        <div className="p-3.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs flex flex-col justify-between h-full space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-amber-700 text-[10px] uppercase tracking-wider block font-medium">Warning</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-amber-800">{warningSensors}</p>
          <span className="text-[10px] text-amber-700 font-mono">Observation Band</span>
        </div>

        {/* 4. Critical */}
        <div className="p-3.5 rounded-xl bg-white border border-red-200/80 shadow-2xs flex flex-col justify-between h-full space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-red-700 text-[10px] uppercase tracking-wider block font-medium">Critical</span>
            <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-red-700">{criticalSensors}</p>
          <span className="text-[10px] text-red-600 font-mono">Threshold Breach</span>
        </div>

        {/* 5. Offline / Disconnected */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider block font-medium">Offline</span>
            <XCircle className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-slate-500">{offlineSensors}</p>
          <span className="text-[10px] text-slate-400 font-mono">No Signal / Link</span>
        </div>

        {/* 6. Stale / Calibration */}
        <div className="p-3.5 rounded-xl bg-white border border-purple-200/80 shadow-2xs flex flex-col justify-between h-full space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-purple-700 text-[10px] uppercase tracking-wider block font-medium">Stale / Calib</span>
            <Clock className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-purple-800">{staleSensors + calReqSensors}</p>
          <span className="text-[10px] text-purple-600 font-mono">Stale: {staleSensors} · Cal: {calReqSensors}</span>
        </div>
      </div>

      {/* =========================================
          DEMO FAILURE SCENARIO SELECTOR (DEMO Mode Only)
          ========================================= */}
      {telemetryMode === 'DEMO' && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Sensor Failure Simulation Testbed
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Active Scenario: <span className="font-semibold text-blue-600">{simulationScenario}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: 'NORMAL_CRUISE', label: 'Nominal Cruise' },
              { id: 'SENSOR_DISCONNECTED', label: 'Sensor Disconnected' },
              { id: 'CHT_OVERHEAT', label: 'CHT Overheat' },
              { id: 'EGT_ABNORMAL', label: 'EGT Abnormal' },
              { id: 'OIL_PRESSURE_FAILURE', label: 'Oil Pressure Drop' },
              { id: 'GPS_SIGNAL_LOSS', label: 'GPS Signal Loss' },
              { id: 'VIBRATION_ABNORMAL', label: 'Vibration Spike' },
              { id: 'INTERMITTENT_COMM', label: 'Intermittent Comm' },
              { id: 'STALE_TELEMETRY', label: 'Stale Telemetry' },
            ].map((sc) => (
              <button
                key={sc.id}
                onClick={() => setSimulationScenario(sc.id)}
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-medium transition-all cursor-pointer ${
                  simulationScenario === sc.id
                    ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
            placeholder="Search sensor by name or code (e.g. CHT, RPM, GPS)..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
          <span className="text-slate-400 text-[11px] mr-1">Category:</span>
          {['All', 'Engine', 'Flight', 'Electrical'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
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
        <div className="flex flex-wrap items-center gap-1 text-xs font-medium border-l border-slate-200 pl-3">
          <span className="text-slate-400 text-[11px] mr-0.5">Status:</span>
          {['All', 'NORMAL', 'WARNING', 'CRITICAL', 'OFFLINE', 'STALE'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
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
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
          {filteredSensors.map((sensor) => {
            const isSelected = activeSensor?.id === sensor.id;
            const isOffline = sensor.status === 'OFFLINE' || sensor.status === 'Offline';
            const isCritical = sensor.status === 'CRITICAL';
            const isWarning = sensor.status === 'WARNING' || sensor.status === 'Warning';

            return (
              <div
                key={sensor.id}
                onClick={() => setActiveSensor(sensor)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-white shadow-2xs flex flex-col justify-between h-[136px] ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : isCritical
                    ? 'border-red-300 bg-red-50/20 hover:border-red-400'
                    : isWarning
                    ? 'border-amber-300 bg-amber-50/20 hover:border-amber-400'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs leading-tight">{sensor.name}</h4>
                    <span className="font-mono text-[10px] text-slate-400">
                      {sensor.code} · {sensor.category}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded border ${getStatusBadgeStyle(
                      sensor.status
                    )}`}
                  >
                    {sensor.status}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mb-1.5">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-2xl font-extrabold font-mono ${
                        isOffline
                          ? 'text-slate-400'
                          : isCritical
                          ? 'text-red-700'
                          : isWarning
                          ? 'text-amber-800'
                          : 'text-slate-900'
                      }`}
                    >
                      {isOffline || sensor.value === null ? '--' : sensor.value}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{sensor.unit}</span>
                  </div>

                  {!isOffline && sensor.value !== null && (
                    <span
                      className={`text-[11px] font-mono font-semibold ${
                        sensor.deltaPercent > 0
                          ? 'text-emerald-600'
                          : sensor.deltaPercent < 0
                          ? 'text-amber-600'
                          : 'text-slate-500'
                      }`}
                    >
                      {sensor.deltaPercent >= 0 ? `+${sensor.deltaPercent}%` : `${sensor.deltaPercent}%`}
                    </span>
                  )}
                </div>

                {/* Normal Operating Range bar */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>
                    Range: {sensor.minNormal} - {sensor.maxNormal} {sensor.unit}
                  </span>
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

        {/* Right: Selected Sensor Deep-Dive Panel */}
        {activeSensor && (
          <div className="lg:col-span-5 bg-white rounded-2xl border border-blue-200 p-5 shadow-2xs flex flex-col justify-between h-full select-none space-y-3.5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm leading-tight">{activeSensor.name}</h3>
                <p className="font-mono text-xs text-slate-400 mt-0.5">
                  {activeSensor.code} · {activeSensor.category}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-xs px-2.5 py-1 rounded border shrink-0 ${getStatusBadgeStyle(
                    activeSensor.status
                  )}`}
                >
                  {activeSensor.status}
                </span>

                <button
                  onClick={() => setIsCalibrating(!isCalibrating)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-colors cursor-pointer"
                  title="Software Calibration Manager"
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 overflow-hidden">
              {activeSensor.description}
            </p>

            {/* Current Value & Quality Specs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 h-[76px] flex flex-col justify-between">
                <span className="text-slate-400 text-[10px] uppercase font-mono block">
                  {activeSensor.calibrationSummary?.offset ? 'Calibrated Telemetry' : 'Current Reading'}
                </span>
                <p className="text-xl font-extrabold font-mono text-slate-900">
                  {activeSensor.value === null ? '--' : activeSensor.value} {activeSensor.unit}
                </p>
                <span className="text-[10px] font-mono text-slate-500 truncate block">
                  Updated: {activeSensor.lastUpdate}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 h-[76px] flex flex-col justify-between">
                <span className="text-slate-400 text-[10px] uppercase font-mono block">Signal Quality</span>
                <p className="text-xl font-extrabold font-mono text-emerald-600">
                  {activeSensor.dataQuality}%
                </p>
                <span className="text-[10px] font-mono text-slate-500 truncate block">
                  {activeSensor.status === 'OFFLINE' ? 'Signal Dropped' : 'Signal Synchronized'}
                </span>
              </div>
            </div>

            {/* Operating Range Meter with Threshold Markers */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between font-medium">
                <span className="text-slate-600">Calibration Envelope</span>
                <span className="font-mono text-slate-900">
                  {activeSensor.minNormal} - {activeSensor.maxNormal} {activeSensor.unit}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 relative overflow-hidden">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '80%' }} />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>Warn: {activeSensor.minWarning ?? activeSensor.minNormal}</span>
                <span>Crit: {activeSensor.maxCritical ?? activeSensor.maxNormal}</span>
              </div>
            </div>

            {/* Historical Telemetry Chart with Functional Filters */}
            <div className="flex-1 flex flex-col justify-between min-h-[160px] py-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-xs">Transducer Signal Trend</h4>
                <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200 text-[10px] font-mono">
                  {(['1m', '5m', '15m', '1h', '6h', '24h'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setChartRange(r)}
                      className={`px-1.5 py-0.5 rounded font-medium transition-all cursor-pointer ${
                        chartRange === r
                          ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 w-full min-h-[130px]">
                {isLiveDisconnected || activeSensor.status === 'OFFLINE' ? (
                  <div className="h-full w-full flex flex-col items-center justify-center text-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <XCircle className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-700">Sensor Disconnected</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      No active telemetry stream received for {activeSensor.name}.
                    </span>
                  </div>
                ) : historyData.length === 0 ? (
                  <div className="h-full w-full flex items-center justify-center p-4 bg-slate-50 rounded-xl text-xs text-slate-400 font-mono">
                    <span>Buffering time-series readings for {chartRange}...</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
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
                        stroke={
                          activeSensor.status === 'CRITICAL'
                            ? '#ef4444'
                            : activeSensor.status === 'WARNING' || activeSensor.status === 'Warning'
                            ? '#f59e0b'
                            : '#2563eb'
                        }
                        strokeWidth={2}
                        dot={{ r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Software Calibration Drawer / Sub-panel */}
            {isCalibrating && (
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-1.5 border-b border-blue-200">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-700" />
                    <span className="font-bold text-blue-900">Software Calibration Manager</span>
                  </div>
                  <button
                    onClick={() => setIsCalibrating(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">CURRENT OFFSET:</span>
                    <span className="font-semibold text-slate-900">
                      {activeSensor.calibrationSummary?.offset
                        ? `${activeSensor.calibrationSummary.offset > 0 ? '+' : ''}${activeSensor.calibrationSummary.offset} ${activeSensor.unit}`
                        : `0.00 ${activeSensor.unit}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">LAST CALIBRATED:</span>
                    <span className="font-semibold text-slate-900">
                      {activeSensor.calibrationSummary?.lastCalibrated || 'Factory Baseline'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] font-mono text-slate-600 block">
                    REFERENCE STANDARD VALUE ({activeSensor.unit})
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      placeholder={`Nominal: ${activeSensor.minNormal}`}
                      value={refValueInput}
                      onChange={(e) => setRefValueInput(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-md font-mono text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
                    />
                    <button
                      onClick={handleApplyCalibration}
                      disabled={calSubmitting || !refValueInput}
                      className="px-3 py-1.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer text-xs"
                    >
                      Apply Offset
                    </button>
                    <button
                      onClick={handleResetCalibration}
                      disabled={calSubmitting}
                      className="px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer text-xs"
                      title="Reset to factory baseline"
                    >
                      Reset
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 italic">
                    * Software zero-point calibration offset applied in telemetry stream. Raw telemetry is preserved.
                  </p>
                </div>
              </div>
            )}

            {/* Status & Diagnostic Message */}
            <div
              className={`p-3 rounded-xl border text-xs space-y-1 flex flex-col justify-center ${
                activeSensor.status === 'CRITICAL'
                  ? 'bg-red-50/80 border-red-200 text-red-900'
                  : activeSensor.status === 'WARNING' || activeSensor.status === 'Warning'
                  ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                  : activeSensor.status === 'OFFLINE' || activeSensor.status === 'Offline'
                  ? 'bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                {activeSensor.status === 'CRITICAL' ? (
                  <>
                    <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Critical Transducer Fault Detected</span>
                  </>
                ) : activeSensor.status === 'WARNING' || activeSensor.status === 'Warning' ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Transducer Threshold Warning</span>
                  </>
                ) : activeSensor.status === 'OFFLINE' || activeSensor.status === 'Offline' ? (
                  <>
                    <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Transducer Offline / Carrier Lost</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Nominal Calibration Verified</span>
                  </>
                )}
              </div>
              <p className="text-[11px] leading-snug line-clamp-1">
                {activeSensor.diagnosticMessage ||
                  (activeSensor.status === 'NORMAL' || activeSensor.status === 'Online'
                    ? 'Telemetry steady within calibrated bounds. Signal nominal.'
                    : 'Transducer telemetry deviates from nominal parameters.')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
