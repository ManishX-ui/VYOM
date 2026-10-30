import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  ChevronRight,
  Home,
  Clock,
  Calendar,
  Radio,
  LogOut,
  ChevronDown,
  Plane,
  Activity,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';

export const TopHeader: React.FC = () => {
  const { user, logout, selectedUAV, currentTimeString, currentDateString, isSimulating, toggleSimulation } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Map route to breadcrumb label
  const getPageTitle = (path: string) => {
    if (path.includes('/dashboard')) return 'Main Dashboard';
    if (path.includes('/engine-health')) return 'Engine Health';
    if (path.includes('/sensors')) return 'Sensor Monitoring';
    if (path.includes('/tracking')) return 'Location Tracking';
    if (path.includes('/mission-replay')) return 'Mission Replay';
    if (path.includes('/anomalies')) return 'Anomaly Detection';
    if (path.includes('/predictions')) return 'Fault Prediction';
    if (path.includes('/alerts')) return 'Alert History';
    return 'Dashboard';
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200/80 shadow-xs">
      {/* Left Breadcrumb Trail */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/app/dashboard" className="p-1 hover:text-slate-900 transition-colors">
          <Home className="w-4 h-4 text-slate-400" />
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="font-semibold text-slate-800 text-sm">{getPageTitle(location.pathname)}</span>
      </div>

      {/* Center & Right Status Telemetry Bar */}
      <div className="flex items-center gap-5 text-xs text-slate-600">
        {/* Engine Status pill: Active or Inactive (no extra label) */}
        <div
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono text-[11px] font-semibold ${
            isSimulating
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isSimulating ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
            }`}
          />
          <span>{isSimulating ? 'ACTIVE' : 'INACTIVE'}</span>
        </div>

        {/* Current Mission (Normal text) */}
        <div className="hidden md:flex items-center gap-1.5 text-slate-500 text-xs">
          <span>Mission:</span>
          <span className="text-slate-700 font-medium">{selectedUAV.missionName}</span>
        </div>

        {/* Live Date and Time */}
        <div className="flex items-center gap-3 font-mono text-slate-600 border-l border-slate-200 pl-4">
          <div className="hidden sm:flex items-center gap-1.5 text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentDateString}</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>{currentTimeString}</span>
          </div>
        </div>

        {/* User Profile & Actions Dropdown (Far Right Corner) */}
        <div className="relative border-l border-slate-200 pl-4">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors focus:outline-hidden cursor-pointer"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs shadow-xs">
              {user.callsign}
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</p>
              <p className="text-[10px] text-slate-500 leading-tight">{user.callsign} · MALE Flight Ops</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileOpen && (
            <div
              className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
              onClick={() => setIsProfileOpen(false)}
            >
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="font-semibold text-slate-800 text-sm">{user.name}</p>
                <p className="text-slate-500 font-mono">{user.email}</p>
                <p className="text-blue-600 text-[11px] mt-0.5">{user.role}</p>
              </div>

              <div className="py-1">
                <Link
                  to="/connect-uav"
                  className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 text-slate-700"
                >
                  <Plane className="w-4 h-4 text-slate-400" />
                  <span>Switch / Pair UAV</span>
                </Link>

                <button
                  onClick={toggleSimulation}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50 text-slate-700 text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Activity className="w-4 h-4 text-slate-400" />
                    <span>Telemetry Stream</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                      isSimulating
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isSimulating ? 'LIVE' : 'PAUSED'}
                  </span>
                </button>
              </div>

              <div className="border-t border-slate-100 pt-1 mt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors text-left font-medium cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
