import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  Eye,
  EyeOff,
  Shield,
  ChevronRight,
  X,
  Cpu,
  Activity,
  Layers,
  AlertTriangle,
  Compass,
  CheckCircle2,
} from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const { login } = useApp();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'home' | 'about' | 'feature' | null>(null);
  const [adminId, setAdminId] = useState('admin@vyom.aero');
  const [password, setPassword] = useState('vyom@aero2026');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!adminId.trim()) {
      setErrorMsg('Please enter an Admin ID or Email.');
      return;
    }

    if (!password.trim() || password.length < 4) {
      setErrorMsg('Password must be at least 4 characters.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      login(adminId);
      setIsLoading(false);
      navigate('/connect-uav');
    }, 450);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#070b14] text-white select-none">
      {/* =========================================
          FULL-PAGE HERO IMAGE
          ========================================= */}
      <div className="absolute inset-0 z-0 w-full h-full flex items-center justify-center bg-[#070b14]">
        <img
          src="/assets/aistudio/file_00000000f8d481f495dd913ea94fd70a_a272f44d.png"
          alt="VYOM MALE UAV"
          className="w-full h-full object-contain sm:object-cover object-center select-none pointer-events-none"
        />
        {/* Subtle top & bottom ambient vignettes */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#070b14]/85 via-transparent to-[#070b14]/75" />
      </div>

      {/* =========================================
          TOP BAR: BRAND, CENTER NAVIGATION & ADMIN LOGIN
          ========================================= */}
      <div className="relative z-30 w-full px-4 sm:px-8 lg:px-12 py-5 flex items-center justify-between pointer-events-none">
        {/* Left: Clean Brand Logo with uploaded official logo */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <img
            src="/assets/vyom-logo.png"
            alt="VYOM Logo"
            className="w-10 h-10 rounded-full object-cover shadow-lg shadow-blue-600/30 ring-2 ring-white/10"
          />
          <span className="font-black text-xl tracking-wider text-white">
            VYOM
          </span>
        </div>

        {/* Center: Navigation Bar containing Home, About, Feature */}
        <nav className="pointer-events-auto flex items-center gap-1 sm:gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/80 backdrop-blur-md shadow-xl text-xs font-semibold tracking-wide">
          <button
            onClick={() => setActiveSection(null)}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
              activeSection === null
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => setActiveSection('about')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
              activeSection === 'about'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            About
          </button>
          <button
            onClick={() => setActiveSection('feature')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
              activeSection === 'feature'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            Feature
          </button>
        </nav>

        {/* Right: Only Admin Login Button */}
        <div className="pointer-events-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/80 backdrop-blur-md text-xs font-semibold tracking-wide transition-all shadow-xl shadow-black/40 hover:border-slate-500 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>Admin Login</span>
          </button>
        </div>
      </div>

      {/* =========================================
          ABOUT SECTION MODAL OVERLAY
          ========================================= */}
      {activeSection === 'about' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setActiveSection(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-slate-900/95 text-white rounded-2xl shadow-2xl border border-slate-700 p-6 sm:p-8 space-y-6 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/vyom-logo.png"
                  alt="VYOM Logo"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/30"
                />
                <div>
                  <h3 className="font-bold text-lg text-white">About VYOM Platform</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Virtual Yield &amp; Operational Monitoring
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSection(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              VYOM is an advanced aerospace digital twin and telemetry monitoring suite designed
              specifically for Medium Altitude Long Endurance (MALE) Unmanned Aerial Vehicles.
              Developed for high-stakes operational environments, it connects real-time aircraft
              avionics with physics-informed digital simulations.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2 flex flex-col justify-between h-full">
                <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Digital Twin</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">
                    High-fidelity 3D modeling of the Rotax 914 F powertrain with live telemetry synchronization.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2 flex flex-col justify-between h-full">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Proactive Health</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">
                    Continuous evaluation of 8 critical parameters to detect micro-vibrations and thermal stress.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2 flex flex-col justify-between h-full">
                <div className="w-8 h-8 rounded-lg bg-purple-600/30 text-purple-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Mission Ready</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">
                    Full blackbox mission replay, geofence monitoring, and fleet synchronization.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveSection(null)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          FEATURE SECTION MODAL OVERLAY
          ========================================= */}
      {activeSection === 'feature' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setActiveSection(null)}
        >
          <div
            className="relative w-full max-w-3xl bg-slate-900/95 text-white rounded-2xl shadow-2xl border border-slate-700 p-6 sm:p-8 space-y-6 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/vyom-logo.png"
                  alt="VYOM Logo"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/30"
                />
                <div>
                  <h3 className="font-bold text-lg text-white">Platform Features</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Next-Generation UAV Operational Capabilities
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSection(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700/80 flex items-start gap-3 flex-col justify-between h-full">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-white">Real-Time 3D Digital Twin</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Interactive multi-mesh aero engine visualization with x-ray cutaways, subsystem isolation, and thermal heatmapping.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700/80 flex items-start gap-3 flex-col justify-between h-full">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-600/30 text-amber-400 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-white">8 Core Engine Parameters</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Live streaming of RPM, CHT, EGT, Oil Pressure, Oil Temp, Fuel Flow, Vibration RMS, and Injection Timing at sub-second intervals.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700/80 flex items-start gap-3 flex-col justify-between h-full">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-600/30 text-red-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-white">Neural Anomaly Detection</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Early detection of bearing wear, cylinder knocking, and pressure drops with automated diagnostic severity grading.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700/80 flex items-start gap-3 flex-col justify-between h-full">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center shrink-0">
                    <Compass className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-white">Tactical Airspace &amp; Replay</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  High-accuracy 3D GPS route visualization, geofence boundary alerts, and scrubber-enabled mission replay history.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveSection(null)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          ADMIN LOGIN MODAL (Centered, Blurred Backdrop)
          ========================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div
            className="relative w-full max-w-md bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Admin Portal Authentication</h3>
                  <p className="text-xs text-slate-500">Sign in to access UAV digital twins</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Admin ID / Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Admin ID / Email Address
                </label>
                <input
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="e.g. admin@vyom.aero"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Hide
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Show
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter security password"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <span>Sign In &amp; Proceed to UAV Pairing</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
