import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FAULT_RISK_SUMMARY,
  PREDICTED_FAULT_PROBABILITIES,
  ESTIMATED_RUL_LIST,
  SENSOR_NORMAL_RANGE_TABLE,
  KEY_CONTRIBUTING_FACTORS,
} from '../../data/demoData';
import {
  TrendingUp,
  Cpu,
  Clock,
  Sparkles,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

export const FaultPredictionPage: React.FC = () => {
  const { showToast } = useApp();

  const [predictionHorizon, setPredictionHorizon] = useState<string>('Next 50 Hours');
  const [selectedTrendFault, setSelectedTrendFault] = useState<string>('Cylinder Head Overheating');
  const [trendRange, setTrendRange] = useState<string>('24 Hours');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Dynamic simulation multipliers based on selected horizon
  const [horizonMultiplier, setHorizonMultiplier] = useState<number>(1.0);

  // Prediction trend curve data
  const predictionTrendData = [
    { time: '12:00', prob: 8 * horizonMultiplier, upper: 12 * horizonMultiplier, lower: 5 * horizonMultiplier },
    { time: '16:00', prob: 10 * horizonMultiplier, upper: 15 * horizonMultiplier, lower: 6 * horizonMultiplier },
    { time: '20:00', prob: 11 * horizonMultiplier, upper: 17 * horizonMultiplier, lower: 7 * horizonMultiplier },
    { time: '00:00', prob: 15 * horizonMultiplier, upper: 22 * horizonMultiplier, lower: 9 * horizonMultiplier },
    { time: '04:00', prob: 20 * horizonMultiplier, upper: 28 * horizonMultiplier, lower: 13 * horizonMultiplier },
    { time: '08:00', prob: 25 * horizonMultiplier, upper: 34 * horizonMultiplier, lower: 18 * horizonMultiplier },
    { time: '12:00', prob: 32 * horizonMultiplier, upper: 42 * horizonMultiplier, lower: 22 * horizonMultiplier },
  ];

  // Predicted vs Actual Historical Validation series
  const validationSeriesData = [
    { date: 'Oct 17', actual: 165, predicted: 162, upper: 175, lower: 152 },
    { date: 'Oct 18', actual: 170, predicted: 168, upper: 180, lower: 158 },
    { date: 'Oct 19', actual: 166, predicted: 169, upper: 182, lower: 157 },
    { date: 'Oct 20', actual: 178, predicted: 175, upper: 190, lower: 163 },
    { date: 'Oct 21', actual: 172, predicted: 170, upper: 184, lower: 160 },
    { date: 'Oct 22', actual: 184, predicted: 182, upper: 198, lower: 172 },
    { date: 'Oct 23', actual: 187, predicted: 191, upper: 208, lower: 179 },
  ];

  const handleGeneratePrediction = () => {
    setIsGenerating(true);
    setTimeout(() => {
      // Calculate realistic horizon adjustment
      let mult = 1.0;
      if (predictionHorizon === 'Next 6 Hours') mult = 0.6;
      else if (predictionHorizon === 'Next 24 Hours') mult = 0.85;
      else if (predictionHorizon === 'Next 50 Hours') mult = 1.0;
      else if (predictionHorizon === 'Next 100 Hours') mult = 1.35;
      setHorizonMultiplier(mult);

      setIsGenerating(false);
      showToast(
        'Prediction Forecast Updated',
        `Prognostic forecast recalculated for ${predictionHorizon}`,
        'success'
      );
    }, 750);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* =========================================
          CONTROLS HEADER: HORIZON & GENERATE BUTTON
          (Strictly NO Select Model, NO promo taglines)
          ========================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Fault Prediction &amp; Prognostics
          </h2>
        </div>

        {/* Prediction Controls (ONLY Horizon + Generate Button) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Prediction Horizon:</span>
            <select
              value={predictionHorizon}
              onChange={(e) => setPredictionHorizon(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-hidden"
            >
              <option value="Next 6 Hours">Next 6 Hours</option>
              <option value="Next 24 Hours">Next 24 Hours</option>
              <option value="Next 50 Hours">Next 50 Hours</option>
              <option value="Next 100 Hours">Next 100 Hours</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          <button
            onClick={handleGeneratePrediction}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-60"
          >
            {isGenerating ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Generate Prediction</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =========================================
          ROW 1: OVERALL ENGINE HEALTH, FAULT RISK SUMMARY,
          PREDICTED PROBABILITIES, REMAINING USEFUL LIFE
          ========================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {/* 1. Overall Engine Health Gauge */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full space-y-3">
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">
            Overall Engine Health
          </h4>

          <div className="flex flex-col items-center justify-center py-2">
            <div className="w-36 h-20 flex items-center justify-center">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 140 85">
                <path d="M 20 75 A 50 50 0 0 1 120 75" fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
                <path d="M 20 75 A 50 50 0 0 1 120 75" fill="none" stroke="#10b981" strokeWidth="10" strokeDasharray="157" strokeDashoffset="28" strokeLinecap="round" />
                <text
                  x="70"
                  y="52"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="font-mono font-extrabold text-[22px] fill-slate-900"
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontWeight: 800 }}
                >
                  82%
                </text>
              </svg>
            </div>
            <div className="mt-1 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Good Condition</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 text-center border-t border-slate-100 pt-2 font-mono">
            Low risk of major fault in {predictionHorizon.toLowerCase()}.
          </p>
        </div>

        {/* 2. Fault Risk Summary */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full space-y-2.5">
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">
            Fault Risk Summary
          </h4>

          <div className="space-y-2">
            {FAULT_RISK_SUMMARY.map((f) => (
              <div key={f.faultName} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium truncate">{f.faultName}</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="font-bold text-slate-800">
                      {Math.round(f.probabilityPercent * horizonMultiplier)}%
                    </span>
                    <span
                      className={`text-[9px] font-semibold px-1 py-0.2 rounded ${
                        f.severity === 'Medium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {f.severity}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                  <div
                    className={`h-1 rounded-full ${
                      f.severity === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, f.probabilityPercent * horizonMultiplier)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Predicted Fault Probabilities */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full space-y-2.5">
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">
            Predicted Probabilities ({predictionHorizon})
          </h4>

          <div className="space-y-2 text-xs">
            {PREDICTED_FAULT_PROBABILITIES.map((p) => (
              <div key={p.faultName} className="flex items-center justify-between py-0.5 border-b border-slate-50">
                <span className="text-slate-700 font-medium truncate">{p.faultName}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, p.probabilityPercent * horizonMultiplier * 2.5)}%` }}
                    />
                  </div>
                  <span className="font-mono font-bold text-slate-800 w-8 text-right">
                    {Math.round(p.probabilityPercent * horizonMultiplier)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Estimated Remaining Useful Life (RUL) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full space-y-2.5">
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">
            Estimated RUL (Hours)
          </h4>

          <div className="space-y-2 text-xs font-mono">
            {ESTIMATED_RUL_LIST.map((r) => (
              <div key={r.component} className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-700 font-medium font-sans truncate">{r.component}</span>
                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {r.rulHours} hrs
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================
          ROW 2: FAULT PREDICTION TREND, KEY FACTORS, MODEL CONFIDENCE
          ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 5. Fault Prediction Trend (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between h-full space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Fault Prediction Trend</h3>
              <p className="text-[11px] text-slate-500">Forecasting probability curve with confidence bounds</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedTrendFault}
                onChange={(e) => setSelectedTrendFault(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium bg-white"
              >
                <option value="Cylinder Head Overheating">Cylinder Head Overheating</option>
                <option value="Excessive Vibration">Excessive Vibration</option>
                <option value="Oil Pressure Loss">Oil Pressure Loss</option>
              </select>

              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs font-mono">
                {['6h', '24h', '50h'].map((h) => (
                  <button
                    key={h}
                    onClick={() => setTrendRange(h)}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      trendRange === h ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={predictionTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} fontVariant="tabular-nums" />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 60]} fontVariant="tabular-nums" />
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
                <Area type="monotone" dataKey="upper" name="Upper Confidence Band" stroke="none" fill="#fee2e2" opacity={0.6} />
                <Area type="monotone" dataKey="lower" name="Lower Confidence Band" stroke="none" fill="#ffffff" opacity={1} />
                <Line type="monotone" dataKey="prob" name="Predicted Probability (%)" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-100 pt-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Predicted Probability
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded bg-red-100 border border-red-300" /> 95% Confidence Interval
            </span>
            <span className="font-bold text-red-600">
              Current Risk: {Math.round(32 * horizonMultiplier)}% in {predictionHorizon.toLowerCase()}
            </span>
          </div>
        </div>

        {/* 6 & 7. Key Contributing Factors & Model Confidence (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4 h-full">
          {/* Key Contributing Factors */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 flex-1 flex flex-col justify-between">
            <h4 className="font-bold text-slate-900 text-sm">Key Contributing Factors</h4>

            <div className="space-y-2 text-xs">
              {KEY_CONTRIBUTING_FACTORS.map((k) => (
                <div key={k.factor} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-700 font-medium">{k.factor}</span>
                    <span className="font-mono font-bold text-slate-900">{k.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        k.percentage > 25
                          ? 'bg-red-500'
                          : k.percentage > 15
                          ? 'bg-amber-500'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${k.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Model Confidence Circular Gauge */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 flex-1 flex flex-col justify-between">
            <h4 className="font-bold text-slate-900 text-sm">Model Confidence</h4>

            <div className="flex items-center justify-around py-1">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-24 h-24" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="8"
                    strokeDasharray="251"
                    strokeDashoffset="32"
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-extrabold font-mono text-slate-900">87%</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block font-mono">
                  High Confidence
                </span>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Prediction based on real-time engine data and historical flight hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          ROW 3: SENSOR PARAMETERS (CURRENT VS NORMAL) & PREDICTED VS ACTUAL
          ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 8. Current vs Normal Range Table (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between h-full space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Sensor Parameters (Current vs Normal Range)</h4>
              <p className="text-[11px] text-slate-500">Normal calibration thresholds vs active telemetry</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase">
                  <th className="py-2 px-2">Parameter</th>
                  <th className="py-2 px-2">Current</th>
                  <th className="py-2 px-2">Normal Range</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2">Risk Contrib.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {SENSOR_NORMAL_RANGE_TABLE.map((row) => (
                  <tr key={row.parameter} className="hover:bg-slate-50/70">
                    <td className="py-2 px-2 font-sans font-medium text-slate-800">{row.parameter}</td>
                    <td className="py-2 px-2 font-bold text-slate-900">{row.currentValue}</td>
                    <td className="py-2 px-2 text-slate-500">{row.normalRange}</td>
                    <td className="py-2 px-2">
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                          row.status === 'High'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${row.status === 'High' ? 'bg-red-500' : 'bg-blue-600'}`}
                            style={{ width: `${row.riskContribution * 2}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700">{row.riskContribution}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 9. Predicted vs Actual Historical Validation (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between h-full space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Predicted vs Actual (Historical Validation)</h4>
              <p className="text-[11px] text-slate-500">7-Day validation tracking actual vs algorithmic forecast</p>
            </div>
            <span className="text-xs font-mono text-slate-500">CHT Metric (°C)</span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={validationSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} fontVariant="tabular-nums" />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[140, 220]} fontVariant="tabular-nums" />
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
                <Area type="monotone" dataKey="upper" stroke="none" fill="#fee2e2" opacity={0.5} name="Upper CI" />
                <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" opacity={1} name="Lower CI" />
                <Line type="monotone" dataKey="actual" name="Actual CHT (°C)" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="predicted" name="Predicted CHT (°C)" stroke="#ef4444" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-slate-600 border-t border-slate-100 pt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Actual Measured
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Model Predicted
            </span>
            <span className="text-emerald-600 font-semibold">Mean Abs Error: ±1.8%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
