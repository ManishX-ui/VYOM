import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { TopHeader } from './TopHeader';
import {
  LayoutDashboard,
  Cpu,
  Gauge,
  Navigation,
  PlayCircle,
  AlertTriangle,
  TrendingUp,
  Bell,
  Menu,
  X,
  Plane,
  Radio,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Box,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, selectedUAV, toasts, dismissToast, alerts } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const mainContentRef = useRef<HTMLElement>(null);

  // Reset scroll position to top whenever navigating between pages
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  // If user logged out of demo, guard route and return to landing
  if (!user.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const activeAlertsCount = alerts.filter((a) => a.status === 'Active').length;

  const navLinks = [
    { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/digital-twin', label: '3D Digital Twin', icon: Box },
    { to: '/app/engine-health', label: 'Engine Health', icon: Cpu },
    { to: '/app/sensors', label: 'Sensor Monitoring', icon: Gauge },
    { to: '/app/tracking', label: 'Location Tracking', icon: Navigation },
    { to: '/app/mission-replay', label: 'Mission Replay', icon: PlayCircle },
    { to: '/app/anomalies', label: 'Anomaly Detection', icon: AlertTriangle, badge: '2' },
    { to: '/app/predictions', label: 'Fault Prediction', icon: TrendingUp },
    { to: '/app/alerts', label: 'Alert History', icon: Bell, count: activeAlertsCount },
    { to: '/app/datalink', label: 'GCS Datalink', icon: Radio },
  ];

  return (
    <div className="dashboard-container flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* =========================================
          LEFT SIDEBAR (Refined Neutral Smoke - #F5F5F5)
          ========================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#F5F5F5] text-slate-800 border-r border-[#E5E7EB] flex flex-col justify-between transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="flex items-center justify-between h-16 px-5 border-b border-[#E5E7EB]">
            <Link to="/app/dashboard" className="flex items-center gap-3 group">
              <img
                src="/assets/vyom-logo.png"
                alt="VYOM Logo"
                className="w-9 h-9 rounded-full object-cover shadow-xs group-hover:scale-105 transition-transform ring-1 ring-slate-300 bg-white"
              />
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-wider text-slate-900">VYOM</span>
                <span className="text-[10px] font-mono tracking-tight text-slate-500 font-semibold uppercase -mt-1">
                  Virtual Yield &amp; Operational Monitoring
                </span>
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-white' : 'text-slate-500'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {item.count !== undefined && item.count > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Active Demonstration Platform Card */}
        <div className="p-3 border-t border-[#E5E7EB]">
          {/* Active UAV Demonstration Card */}
          <Link
            to="/connect-uav"
            title="Click to Switch or Pair UAV"
            className="block p-2.5 rounded-xl bg-white hover:bg-white border border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Active Platform
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ONLINE
              </span>
            </div>

            <div className="flex items-center justify-between gap-2.5 mt-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                  {selectedUAV.name}
                </p>
                <p className="text-[10px] font-mono text-slate-400 truncate">{selectedUAV.id}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-all group-hover:translate-x-0.5 shrink-0" />
            </div>
          </Link>
        </div>
      </aside>

      {/* Backdrop for mobile navigation */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* =========================================
          MAIN APPLICATION VIEWPORT
          ========================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header Toggle */}
        <div className="flex items-center justify-between p-3 bg-white border-b border-slate-200 md:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <img src="/assets/vyom-logo.png" alt="VYOM" className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200" />
            <span className="font-extrabold text-sm tracking-wide text-slate-900">VYOM</span>
          </div>
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            ONLINE
          </span>
        </div>

        {/* Top Desktop Header */}
        <TopHeader />

        {/* Scrollable Page Content */}
        <main ref={mainContentRef} className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
          <Outlet />
        </main>
      </div>

      {/* =========================================
          TOAST NOTIFICATIONS (Fixed Bottom-Right)
          ========================================= */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3 rounded-xl border shadow-lg backdrop-blur-md transition-all animate-in slide-in-from-bottom-3 duration-200 ${
              toast.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
                : toast.type === 'warning'
                ? 'bg-amber-50/95 border-amber-200 text-amber-900'
                : toast.type === 'error'
                ? 'bg-red-50/95 border-red-200 text-red-900'
                : 'bg-white/95 border-slate-200 text-slate-800'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
              {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
              {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-600" />}
              {toast.type === 'info' && <Radio className="w-4 h-4 text-blue-600" />}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-tight">{toast.title}</p>
              {toast.message && <p className="text-[11px] opacity-80 mt-0.5 leading-snug">{toast.message}</p>}
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
