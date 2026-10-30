import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Plane,
  PlusCircle,
  Radio,
  CheckCircle2,
  Cpu,
  ArrowRight,
  LogOut,
  Zap,
  X,
  Activity,
  ShieldCheck,
} from 'lucide-react';

export const ConnectUAVPage: React.FC = () => {
  const { pairedUAVs, selectedUAV, selectUAV, pairNewUAV, user, logout } = useApp();
  const navigate = useNavigate();

  // Modal state for pairing new device
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);

  // New UAV form fields
  const [uavName, setUavName] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [engineModel, setEngineModel] = useState('Rotax 914 F Turbocharged');
  const [engineType, setEngineType] = useState('4-Cylinder Horizontally Opposed Aero Piston');
  const [protocol, setProtocol] = useState('MAVLink v2 / Stanag 4586');
  const [baudRate, setBaudRate] = useState('115200');
  const [displacement, setDisplacement] = useState('1.8 L');
  const [maxPower, setMaxPower] = useState('115 HP @ 2700 RPM');
  const [coolingType, setCoolingType] = useState('Liquid/Air Cooled');
  const [fuelType, setFuelType] = useState('Avgas 100LL / JP-8');

  const [formError, setFormError] = useState('');
  const [isPairing, setIsPairing] = useState(false);

  const handlePairSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!uavName.trim()) {
      setFormError('Please enter a UAV Name or Call-sign.');
      return;
    }
    if (!deviceId.trim()) {
      setFormError('Please enter a Device Serial Identifier.');
      return;
    }

    setIsPairing(true);

    setTimeout(() => {
      pairNewUAV({
        name: uavName.trim(),
        deviceId: deviceId.trim(),
        engineModel,
        engineType,
        displacement,
        maxPower,
        coolingType,
        fuelType,
        protocol,
        baudRate: parseInt(baudRate, 10),
        lastConnected: 'Just now (New Pair)',
        missionName: 'Tactical_Surveillance_Init',
      });
      setIsPairing(false);
      setIsPairModalOpen(false);
      navigate('/app/dashboard');
    }, 600);
  };

  const handleSelectUAV = (id: string) => {
    selectUAV(id);
    navigate('/app/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Bar with VYOM Logo */}
      <header className="flex items-center justify-between px-6 lg:px-12 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <img
            src="/assets/vyom-logo.png"
            alt="VYOM Logo"
            className="w-10 h-10 rounded-full object-cover shadow-sm ring-1 ring-slate-200"
          />
          <div>
            <h1 className="font-extrabold text-lg text-slate-900 tracking-wide">VYOM</h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase -mt-0.5">
              Virtual Yield &amp; Operational Monitoring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="hidden sm:flex items-center gap-2 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-medium">{user.name}</span>
            <span className="text-slate-400 font-mono">({user.callsign})</span>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area: Show only Connected Devices List & One Button to Pair New Device */}
      <main className="max-w-7xl mx-auto w-full px-6 lg:px-12 py-8 flex-1 space-y-6">
        {/* Action Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
              <Radio className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              <span>TELEMETRY STREAM CONNECTION</span>
              <span>·</span>
              <span className="font-mono text-slate-500">{pairedUAVs.length} Units Connected</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Connected Telemetry Devices
            </h2>
          </div>

          {/* Single Pair New Device Button */}
          <button
            onClick={() => {
              setFormError('');
              setIsPairModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm hover:shadow transition-all cursor-pointer self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Pair New Device</span>
          </button>
        </div>

        {/* Connected Devices Grid (Perfect 2-column aligned layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          {pairedUAVs.map((uav) => {
            const isSelected = selectedUAV.id === uav.id;

            return (
              <div
                key={uav.id}
                className={`p-6 rounded-2xl border transition-all bg-white shadow-2xs flex flex-col justify-between h-full ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Plane className="w-5 h-5 -rotate-45 text-blue-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-base">{uav.name}</h3>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {uav.status}
                          </span>
                        </div>
                        <p className="font-mono text-xs text-slate-500 mt-0.5">
                          {uav.id} · {uav.deviceId}
                        </p>
                      </div>
                    </div>

                    {/* Select & Connect Action */}
                    <button
                      onClick={() => handleSelectUAV(uav.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                      }`}
                    >
                      <span>{isSelected ? 'Active · Go to Dashboard' : 'Select & Connect'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Telemetry Protocol & Engine Summary */}
                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 mb-4 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <span className="text-slate-600">Protocol:</span>
                      <span className="font-semibold text-slate-800">{uav.protocol}</span>
                    </div>
                    <span className="font-mono text-slate-500 text-[11px]">{uav.baudRate} bps</span>
                  </div>
                </div>

                {/* Metadata Grid (Always 4 equal columns perfectly aligned) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Engine Spec</span>
                    <span className="font-medium text-slate-800 truncate block">{uav.engineModel}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Displacement / HP</span>
                    <span className="font-mono font-medium text-slate-800 truncate block">
                      {uav.displacement} · {uav.maxPower.split('@')[0]}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Last Connected</span>
                    <span className="font-mono text-slate-600 truncate block">{uav.lastConnected}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Health Score</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-emerald-600">{uav.healthScore}%</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* =========================================
          PAIR NEW DEVICE MODAL
          ========================================= */}
      {isPairModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsPairModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Register &amp; Pair New UAV</h3>
                  <p className="text-xs text-slate-500">Configure device credentials &amp; datalink</p>
                </div>
              </div>
              <button
                onClick={() => setIsPairModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {formError}
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handlePairSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">UAV Name / Identifier</label>
                <input
                  type="text"
                  value={uavName}
                  onChange={(e) => setUavName(e.target.value)}
                  placeholder="e.g. TAPAS-BH-201 (RAV-10)"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Device Hardware ID / Serial</label>
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="e.g. DEV-MALE-9012-K"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Telemetry Protocol</label>
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white"
                  >
                    <option value="MAVLink v2 / Stanag 4586">MAVLink v2 / Stanag 4586</option>
                    <option value="Stanag 4586 UDP/IP">Stanag 4586 UDP/IP</option>
                    <option value="Custom CANbus Aero Stream">CANbus Aero Stream</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Baud Rate / Link</label>
                  <select
                    value={baudRate}
                    onChange={(e) => setBaudRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white font-mono"
                  >
                    <option value="115200">115200 bps</option>
                    <option value="230400">230400 bps</option>
                    <option value="921600">921600 bps</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Engine Configuration Model</label>
                <select
                  value={engineModel}
                  onChange={(e) => setEngineModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white font-medium"
                >
                  <option value="Rotax 914 F Turbocharged">Rotax 914 F Turbocharged (115 HP)</option>
                  <option value="Rotax 915 iS Turbocharged">Rotax 915 iS Injection (141 HP)</option>
                  <option value="Aero Twin Indigenous MALE 120">Indigenous 4-Cylinder Aero Piston (120 HP)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPairModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isPairing}
                  className="flex items-center gap-2 py-2 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isPairing ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Connect &amp; Pair UAV</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-4 px-6 lg:px-12 border-t border-slate-200 bg-white text-xs text-slate-500 flex items-center justify-center">
        <p>© Team ANVESH · VYOM</p>
      </footer>
    </div>
  );
};
