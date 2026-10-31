import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { apiService } from '../../services/api';
import { DatalinkConnection, DatalinkMetrics, DatalinkTestResponse } from '../../types';
import {
  Radio,
  Wifi,
  WifiOff,
  Activity,
  Layers,
  Clock,
  ShieldCheck,
  RefreshCw,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Server,
  Zap,
} from 'lucide-react';

export const DatalinkMonitoringPage: React.FC = () => {
  const { selectedUAV, telemetryMode, showToast } = useApp();

  const [metrics, setMetrics] = useState<DatalinkMetrics | null>(null);
  const [connections, setConnections] = useState<DatalinkConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<DatalinkTestResponse | null>(null);

  // Modals
  const [isMavlinkModalOpen, setIsMavlinkModalOpen] = useState(false);
  const [isMqttModalOpen, setIsMqttModalOpen] = useState(false);

  // MAVLink form state
  const [mavUavId, setMavUavId] = useState(selectedUAV.id || 'UAV-MALE-IND-01');
  const [mavTransport, setMavTransport] = useState('UDP');
  const [mavAddress, setMavAddress] = useState('0.0.0.0');
  const [mavPort, setMavPort] = useState(14550);
  const [mavBaud, setMavBaud] = useState(115200);
  const [mavDevice, setMavDevice] = useState('COM3');

  // MQTT form state
  const [mqttUavId, setMqttUavId] = useState(selectedUAV.id || 'UAV-MALE-IND-01');
  const [mqttBroker, setMqttBroker] = useState('localhost');
  const [mqttPort, setMqttPort] = useState(1883);
  const [mqttUsername, setMqttUsername] = useState('');
  const [mqttPassword, setMqttPassword] = useState('');
  const [mqttUseTls, setMqttUseTls] = useState(false);

  const fetchDatalinkData = async () => {
    try {
      const data = await apiService.getDatalinkMetrics();
      setMetrics(data);
      if (Array.isArray(data.connections)) {
        setConnections(data.connections);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchDatalinkData();
    const interval = setInterval(fetchDatalinkData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectMavlink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiService.connectMAVLink({
        uav_id: mavUavId,
        transport: mavTransport,
        address: mavAddress,
        port: Number(mavPort),
        device_path: mavTransport === 'SERIAL' ? mavDevice : undefined,
        baudrate: Number(mavBaud),
      });
      showToast('MAVLink Adapter Initialized', `Listening on ${mavTransport}:${mavPort}`, 'success');
      setIsMavlinkModalOpen(false);
      fetchDatalinkData();
    } catch (err: any) {
      showToast('Connection Failed', err?.message || 'Could not connect MAVLink', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectMqtt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiService.connectMQTT({
        uav_id: mqttUavId,
        broker_address: mqttBroker,
        port: Number(mqttPort),
        username: mqttUsername || undefined,
        password: mqttPassword || undefined,
        use_tls: mqttUseTls,
      });
      showToast('MQTT Adapter Connected', `Subscribed to vyom/uav/${mqttUavId}/#`, 'success');
      setIsMqttModalOpen(false);
      fetchDatalinkData();
    } catch (err: any) {
      showToast('MQTT Connection Failed', err?.message || 'Could not connect to broker', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async (connId: string) => {
    try {
      await apiService.disconnectDatalink(connId);
      showToast('Adapter Terminated', `Disconnected ${connId}`, 'info');
      fetchDatalinkData();
    } catch (err: any) {
      showToast('Error', err?.message || 'Failed to disconnect', 'error');
    }
  };

  const handleRunTestScenario = async (scenario: string) => {
    try {
      const res = await apiService.testDatalink(scenario, selectedUAV.id || 'UAV-MALE-IND-01');
      setLastTestResult(res);
      showToast('Testbed Execution Complete', res.message, 'success');
      fetchDatalinkData();
    } catch (err: any) {
      showToast('Testbed Error', err?.message || 'Test execution failed', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            CONNECTED
          </span>
        );
      case 'CONNECTING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            CONNECTING
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-2.5 h-2.5" />
            DEGRADED
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-2.5 h-2.5" />
            ERROR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <WifiOff className="w-2.5 h-2.5" />
            DISCONNECTED
          </span>
        );
    }
  };

  const totalPackets = metrics?.total_packets_received ?? 0;
  const activeCount = metrics?.active_connections ?? 0;
  const totalCount = metrics?.total_connections ?? connections.length;
  const avgLatency = metrics?.average_latency_ms != null ? `${metrics.average_latency_ms} ms` : 'Nominal (< 5ms)';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              GCS Datalink &amp; Communication Gateway
            </h2>
            <span
              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider ${
                telemetryMode === 'LIVE'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : telemetryMode === 'REPLAY'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}
            >
              MODE: {telemetryMode}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Modular MAVLink v2 &amp; MQTT Telemetry Ingestion Architecture · Stanag 4586 Interoperability
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMavlinkModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>Connect MAVLink</span>
          </button>

          <button
            onClick={() => setIsMqttModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>Connect MQTT</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full space-y-1">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider block font-mono">Datalink State</span>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${activeCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}
            />
            <p className="text-xl font-extrabold font-mono text-slate-900">
              {activeCount > 0 ? 'ONLINE' : 'STANDBY'}
            </p>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">GCS Gateway Operational</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full space-y-1">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider block font-mono">Active Links</span>
          <p className="text-2xl font-extrabold font-mono text-blue-600">
            {activeCount} <span className="text-xs font-normal text-slate-400 font-mono">/ {totalCount} Adapters</span>
          </p>
          <span className="text-[11px] text-slate-500 font-mono">Airframe Telemetry Channels</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full space-y-1">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider block font-mono">Packets Ingested</span>
          <p className="text-2xl font-extrabold font-mono text-emerald-600">{totalPackets.toLocaleString()}</p>
          <span className="text-[11px] text-slate-500 font-mono">Validated &amp; Routed</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full space-y-1">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider block font-mono">Latency / Skew</span>
          <p className="text-2xl font-extrabold font-mono text-slate-900">{avgLatency}</p>
          <span className="text-[11px] text-slate-500 font-mono">Round-Trip Communication</span>
        </div>
      </div>

      {/* Configured Connections Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Active &amp; Configured Telemetry Adapters</h3>
            <p className="text-[11px] text-slate-500 font-mono">
              Ground Control Station MAVLink serial/network ports and MQTT message broker subscriptions.
            </p>
          </div>
          <button
            onClick={fetchDatalinkData}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh Connections"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold font-mono text-[11px]">
                <th className="py-3 px-4">Connection ID</th>
                <th className="py-3 px-4">Airframe ID</th>
                <th className="py-3 px-4">Protocol</th>
                <th className="py-3 px-4">Endpoint</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Packets (RX / Rejected)</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {connections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    No active datalink adapters found. Click 'Connect MAVLink' or 'Connect MQTT' to add one.
                  </td>
                </tr>
              ) : (
                connections.map((c) => (
                  <tr key={c.connection_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{c.connection_id}</td>
                    <td className="py-3 px-4 text-blue-700 font-semibold">{c.uav_id}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.protocol === 'MAVLINK'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {c.protocol}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{c.endpoint}</td>
                    <td className="py-3 px-4">{getStatusBadge(c.status)}</td>
                    <td className="py-3 px-4 text-slate-800">
                      <span className="text-emerald-600 font-bold">{c.packets_received}</span>
                      <span className="text-slate-400"> / </span>
                      <span className={c.packets_rejected > 0 ? 'text-red-600 font-bold' : 'text-slate-400'}>
                        {c.packets_rejected}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {c.latency_ms != null ? `${c.latency_ms} ms` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {c.is_active ? (
                        <button
                          onClick={() => handleDisconnect(c.connection_id)}
                          className="px-2.5 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-[11px] font-semibold transition-colors"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRunTestScenario('NORMAL_TELEMETRY')}
                          className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-semibold transition-colors"
                        >
                          Test Link
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SITL Verification & Testbed Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>GCS SITL Datalink Simulator &amp; Verification Testbed</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulates deterministic UAV telemetry frames, connection carrier losses, duplicate packets, and clock skews.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200">
            Target Airframe: {selectedUAV.id || 'UAV-MALE-IND-01'}
          </span>
        </div>

        {/* Quick Scenario Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleRunTestScenario('NORMAL_TELEMETRY')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold transition-colors"
          >
            <Play className="w-3 h-3" />
            <span>Nominal Telemetry</span>
          </button>

          <button
            onClick={() => handleRunTestScenario('CONNECTION_LOSS')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold transition-colors"
          >
            <WifiOff className="w-3 h-3" />
            <span>Carrier Drop (Timeout)</span>
          </button>

          <button
            onClick={() => handleRunTestScenario('RECONNECTION')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Link Re-Establish</span>
          </button>

          <button
            onClick={() => handleRunTestScenario('DUPLICATE_PACKETS')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-xs font-semibold transition-colors"
          >
            <Layers className="w-3 h-3" />
            <span>Duplicate Flood Test</span>
          </button>

          <button
            onClick={() => handleRunTestScenario('STALE_MESSAGES')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-semibold transition-colors"
          >
            <Clock className="w-3 h-3" />
            <span>Stale Skew (&gt;60s)</span>
          </button>

          <button
            onClick={() => handleRunTestScenario('MULTIPLE_UAV')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-2xs"
          >
            <Server className="w-3 h-3 text-blue-400" />
            <span>Multi-Airframe Fleet Sync</span>
          </button>
        </div>

        {/* Testbed Result Terminal */}
        {lastTestResult && (
          <div className="bg-slate-900 rounded-xl p-4 text-xs font-mono text-slate-200 space-y-2 border border-slate-800 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>SCENARIO RESULT: {lastTestResult.scenario}</span>
              </span>
              <span>Protocol: {lastTestResult.protocol} · Airframe: {lastTestResult.uav_id}</span>
            </div>
            <p className="text-emerald-400">{lastTestResult.message}</p>
            {lastTestResult.snapshot_sample && (
              <pre className="text-[11px] text-slate-300 bg-slate-950 p-3 rounded-lg overflow-x-auto border border-slate-800">
                {JSON.stringify(lastTestResult.snapshot_sample, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* MAVLink Connect Modal */}
      {isMavlinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Configure MAVLink Adapter</h3>
                  <p className="text-[10px] font-mono text-slate-400">MAVLink v2 / Stanag 4586</p>
                </div>
              </div>
              <button
                onClick={() => setIsMavlinkModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConnectMavlink} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target UAV ID</label>
                <input
                  type="text"
                  value={mavUavId}
                  onChange={(e) => setMavUavId(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Transport</label>
                  <select
                    value={mavTransport}
                    onChange={(e) => setMavTransport(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  >
                    <option value="UDP">UDP</option>
                    <option value="TCP">TCP</option>
                    <option value="SERIAL">Serial</option>
                  </select>
                </div>

                {mavTransport !== 'SERIAL' ? (
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Port</label>
                    <input
                      type="number"
                      value={mavPort}
                      onChange={(e) => setMavPort(Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Baud Rate</label>
                    <select
                      value={mavBaud}
                      onChange={(e) => setMavBaud(Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                    >
                      <option value="57600">57600</option>
                      <option value="115200">115200</option>
                      <option value="921600">921600</option>
                    </select>
                  </div>
                )}
              </div>

              {mavTransport !== 'SERIAL' ? (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Bind / Connect Host</label>
                  <input
                    type="text"
                    value={mavAddress}
                    onChange={(e) => setMavAddress(e.target.value)}
                    placeholder="0.0.0.0 (listen) or 127.0.0.1"
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Device Path</label>
                  <input
                    type="text"
                    value={mavDevice}
                    onChange={(e) => setMavDevice(e.target.value)}
                    placeholder="COM3 or /dev/ttyUSB0"
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                    required
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMavlinkModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                >
                  {isLoading ? 'Starting...' : 'Start Receiver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MQTT Connect Modal */}
      {isMqttModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Configure MQTT Broker Adapter</h3>
                  <p className="text-[10px] font-mono text-slate-400">JSON Telemetry Ingestion</p>
                </div>
              </div>
              <button
                onClick={() => setIsMqttModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConnectMqtt} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target UAV ID</label>
                <input
                  type="text"
                  value={mqttUavId}
                  onChange={(e) => setMqttUavId(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">Broker Host</label>
                  <input
                    type="text"
                    value={mqttBroker}
                    onChange={(e) => setMqttBroker(e.target.value)}
                    placeholder="localhost or broker.hivemq.com"
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Port</label>
                  <input
                    type="number"
                    value={mqttPort}
                    onChange={(e) => setMqttPort(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Username (Optional)</label>
                  <input
                    type="text"
                    value={mqttUsername}
                    onChange={(e) => setMqttUsername(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Password (Optional)</label>
                  <input
                    type="password"
                    value={mqttPassword}
                    onChange={(e) => setMqttPassword(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="mqtt-tls"
                  checked={mqttUseTls}
                  onChange={(e) => setMqttUseTls(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="mqtt-tls" className="text-slate-700 font-medium cursor-pointer">
                  Enable TLS Encryption (Port 8883)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMqttModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                >
                  {isLoading ? 'Connecting...' : 'Connect Broker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

