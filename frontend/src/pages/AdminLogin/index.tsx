import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  Eye,
  EyeOff,
  X,
  Cpu,
  Activity,
  Layers,
  AlertTriangle,
  Compass,
  Plane,
  ChevronRight,
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
      <div className="relative z-30 w-full px-6 sm:px-10 lg:px-14 py-6 flex items-center justify-between pointer-events-none">
        {/* Left: Simple Clean Brand (No fancy logo) */}
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <div className="w-8 h-8 rounded-lg bg-blue-600/90 text-white flex items-center justify-center shadow-md">
            <Plane className="w-4 h-4 -rotate-45" />
          </div>
          <span className="font-extrabold text-xl tracking-wider text-white">
            VYOM
          </span>
        </div>

        {/* Center: Clean 3-Item Navigation Bar (Home, About, Features with active underline) */}
        <nav className="pointer-events-auto flex items-center gap-8 text-sm font-semibold tracking-wide">
          {/* Home */}
          <button
            onClick={() => setActiveSection(null)}
            className={`relative py-1 transition-colors cursor-pointer ${
              activeSection === null
                ? 'text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Home</span>
            {activeSection === null && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>

          {/* About */}
          <button
            onClick={() => setActiveSection('about')}
            className={`relative py-1 transition-colors cursor-pointer ${
              activeSection === 'about'
                ? 'text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>About</span>
            {activeSection === 'about' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>

          {/* Features */}
          <button
            onClick={() => setActiveSection('feature')}
            className={`relative py-1 transition-colors cursor-pointer ${
              activeSection === 'feature'
                ? 'text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Features</span>
            {activeSection === 'feature' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
        </nav>

        {/* Right: Simple Admin Login Button */}
        <div className="pointer-events-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/80 backdrop-blur-md text-xs font-semibold tracking-wide transition-all shadow-md hover:border-slate-500 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>Admin Login</span>
          </button>
        </div>
      </div>

      {/* =========================================
          ABOUT SECTION MODAL OVERLAY (LIGHT THEME)
          ========================================= */}
      {activeSection === 'about' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setActiveSection(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 shadow-xs">
                  <Plane className="w-5 h-5 -rotate-45 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-xl text-slate-900">About VYOM Platform</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Virtual Yield &amp; Operational Monitoring
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSection(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Platform Description */}
            <p className="text-sm text-slate-600 leading-relaxed font-sans">
              VYOM is an advanced aerospace digital twin and telemetry monitoring suite designed
              specifically for Medium Altitude Long Endurance (MALE) Unmanned Aerial Vehicles.
              Developed for high-stakes operational environments, it connects real-time aircraft
              avionics with physics-informed digital simulations.
            </p>

            {/* 3 Light Theme Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Digital Twin */}
              <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-2.5 flex flex-col justify-between h-full hover:border-blue-300 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-slate-900">Digital Twin</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-snug">
                    High-fidelity 3D modeling of the Rotax 914 F powertrain with live telemetry synchronization.
                  </p>
                </div>
              </div>

              {/* Card 2: Proactive Health */}
              <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-2.5 flex flex-col justify-between h-full hover:border-emerald-300 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-slate-900">Proactive Health</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-snug">
                    Continuous evaluation of 8 critical parameters to detect micro-vibrations and thermal stress.
                  </p>
                </div>
              </div>

              {/* Card 3: Mission Ready */}
              <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-2.5 flex flex-col justify-between h-full hover:border-purple-300 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-slate-900">Mission Ready</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-snug">
                    Full blackbox mission replay, geofence monitoring, and fleet synchronization.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Done Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveSection(null)}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-sm transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          FEATURES SECTION MODAL OVERLAY (LIGHT THEME)
          ========================================= */}
      {activeSection === 'feature' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setActiveSection(null)}
        >
          <div
            className="relative w-full max-w-3xl bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 shadow-xs">
                  <Plane className="w-5 h-5 -rotate-45 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-xl text-slate-900">Platform Features</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Next-Generation UAV Operational Capabilities
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSection(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Light Theme Feature Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 flex items-start gap-3 flex-col justify-between h-full">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <h4 className="font-serif font-bold text-sm text-slate-900">Real-Time Telemetry Stream</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  Sub-50ms synchronized streaming of all 18 engine, electrical, and avionics sensors via WebSocket &amp; MAVLink.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 flex items-start gap-3 flex-col justify-between h-full">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <h4 className="font-serif font-bold text-sm text-slate-900">RUL Predictive Maintenance</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  Physics-informed regression models forecasting Remaining Useful Life across cylinders, turbocharger, and oil pumps.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 flex items-start gap-3 flex-col justify-between h-full">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <h4 className="font-serif font-bold text-sm text-slate-900">Isolation Forest Anomaly Engine</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  Early detection of bearing wear, cylinder knocking, and pressure drops with automated diagnostic severity grading.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 flex items-start gap-3 flex-col justify-between h-full">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Compass className="w-4 h-4" />
                  </div>
                  <h4 className="font-serif font-bold text-sm text-slate-900">3D Geospatial Tracking &amp; Replay</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  Realistic Cesium globe terrain, satellite flight paths, geofence boundary alerts, and synchronized blackbox replay.
                </p>
              </div>
            </div>

            {/* Bottom Close Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveSection(null)}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          ADMIN LOGIN MODAL (SIMPLE DESIGN, NO FANCY LOGO)
          ========================================= */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-sm bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Simple Clean Header (No fancy logos) */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Admin Login</h3>
                <p className="text-xs text-slate-500 mt-0.5">Enter credentials to access digital twins</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simple Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Admin ID / Email */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Admin ID / Email
                </label>
                <input
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="admin@vyom.aero"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                  required
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <span>Sign In</span>
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
