import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Plane,
  Zap,
  Wifi,
  Clock,
  ArrowRight,
  LogOut,
  MoreHorizontal,
  RotateCw,
} from 'lucide-react';

interface FleetCardData {
  id: string;
  name: string;
  deviceId: string;
  status: 'ONLINE' | 'STANDBY' | 'CONNECTING...' | 'OFFLINE';
  protocol: string;
  speedKb: string;
  rpm: string;
  disp: string;
  power: string;
  powerSub?: string;
  health: string;
  lastConnected: string;
  image: string;
}

const FLEET_CARDS: FleetCardData[] = [
  {
    id: 'UAV-TEST-01',
    name: 'TESTBED-01 (TB-01)',
    deviceId: 'DEV-TB01-4420',
    status: 'OFFLINE',
    protocol: 'MQTT / broker.vyom.local',
    speedKb: '-- KB/s',
    rpm: '--',
    disp: '1.9 L',
    power: '125',
    health: '--',
    lastConnected: '21 Oct 2026, 09:12:45',
    image: '/assets/aistudio/Aerial_View_of_a_Gray_Surveillance_Drone_c675afe5.png',
  },
  {
    id: 'UAV-VYOM-PROT-01',
    name: 'VYOM Tactical Twin AV-01',
    deviceId: 'DEV-VYOM-1829-A',
    status: 'STANDBY',
    protocol: 'MAVLink v2 / TCP : 5760',
    speedKb: '-- KB/s',
    rpm: '--',
    disp: '1.9 L',
    power: '125',
    health: '--',
    lastConnected: '21 Oct 2026, 09:12:45',
    image: '/assets/aistudio/Grey_RAV_UAV_in_Flight_6d51458c.png',
  },
  {
    id: 'UAV-TAPAS-BH-201',
    name: 'TAPAS-BH-201 (RAV-09)',
    deviceId: 'DEV-RAV-09-3B42',
    status: 'ONLINE',
    protocol: 'MAVLink v2 / UDP : 14550',
    speedKb: '120 KB/s',
    rpm: '4654',
    disp: '1.8 L',
    power: '115 HP',
    powerSub: 'ROTAX 914',
    health: '92%',
    lastConnected: 'Today, 14:32:18',
    image: '/assets/aistudio/Front-Facing_Gray_Military_UAV_4ffa5275.png',
  },
  {
    id: 'UAV-RUSTOM-II-04',
    name: 'RUSTOM-II (PR-04)',
    deviceId: 'DEV-PR04-351V-E',
    status: 'CONNECTING...',
    protocol: 'MAVLink v2 / TCP : 5760',
    speedKb: '-- KB/s',
    rpm: '--',
    disp: '1.8 L',
    power: '115',
    health: '--',
    lastConnected: 'Yesterday, 18:45:02',
    image: '/assets/aistudio/Indian_Gray_Military_UAV_Render_b97d7d86.png',
  },
  {
    id: 'UAV-SARAS-02',
    name: 'SARAS-02 (SARAS)',
    deviceId: 'DEV-SARAS-8841',
    status: 'OFFLINE',
    protocol: 'MQTT / broker.vyom.local',
    speedKb: '-- KB/s',
    rpm: '--',
    disp: '2.0 L',
    power: '130',
    health: '--',
    lastConnected: '18 Oct 2026, 11:20:33',
    image: '/assets/aistudio/India-MALE-drones_e9a1a57a.jpg',
  },
];

export const ConnectUAVPage: React.FC = () => {
  const { selectUAV, user, logout } = useApp();
  const navigate = useNavigate();

  // Active carousel index (defaults to 2 for TAPAS-BH-201 in the center)
  const [activeIndex, setActiveIndex] = useState<number>(2);

  const handleSelectAndProceed = (uavId: string) => {
    selectUAV(uavId);
    navigate('/app/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/40 via-white to-blue-50/20 text-slate-800 flex flex-col justify-between select-none">
      {/* Top Header with Clean VYOM Branding (No fancy AI generated logo) */}
      <header className="flex items-center justify-between px-6 lg:px-14 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Plane className="w-4 h-4 -rotate-45" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-wider text-slate-900 block leading-none">
              VYOM
            </span>
            <span className="text-[10px] font-mono tracking-tight text-slate-500 font-semibold uppercase">
              Flight Connection
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-sans">
          <div className="hidden sm:flex items-center gap-2 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-slate-900">{user.name}</span>
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

      {/* Main Carousel Viewport (Matching Reference Image 3) */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-7xl mx-auto w-full">
        {/* Horizontal Card Row */}
        <div className="w-full flex items-center justify-center gap-3 sm:gap-4 lg:gap-5 overflow-x-auto py-6 px-2 scrollbar-none">
          {FLEET_CARDS.map((card, idx) => {
            const isActive = idx === activeIndex;

            return (
              <div
                key={card.id}
                onClick={() => setActiveIndex(idx)}
                className={`relative rounded-2xl bg-white transition-all duration-300 cursor-pointer flex flex-col justify-between shrink-0 ${
                  isActive
                    ? 'w-72 sm:w-80 p-5 shadow-xl border-2 border-blue-400 ring-4 ring-blue-500/10 scale-100 z-20'
                    : 'w-60 sm:w-64 p-4 shadow-sm border border-slate-200/90 scale-95 opacity-80 hover:opacity-100 z-10'
                }`}
              >
                <div>
                  {/* Top Row: Status Badge & 3-Dots Menu */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase ${
                        card.status === 'ONLINE'
                          ? 'bg-emerald-500 text-white'
                          : card.status === 'STANDBY'
                          ? 'bg-amber-400 text-slate-900'
                          : card.status === 'CONNECTING...'
                          ? 'bg-amber-400 text-slate-900'
                          : 'bg-rose-100 text-rose-600 border border-rose-200'
                      }`}
                    >
                      {card.status}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Drone Thumbnail Photo */}
                  <div className="w-full h-28 sm:h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60 mb-3 flex items-center justify-center">
                    <img
                      src={card.image}
                      alt={card.name}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>

                  {/* Title & Device Identifier */}
                  <div className="mb-2">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate">
                      {card.name}
                    </h3>
                    <p className="font-mono text-[10px] text-slate-400 mt-0.5 truncate">
                      {card.id} | {card.deviceId}
                    </p>
                  </div>

                  {/* Protocol & Datalink Line */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 py-1.5 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
                      <span>{card.protocol}</span>
                    </div>
                    {card.status === 'ONLINE' && (
                      <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <Wifi className="w-3.5 h-3.5" />
                        <span>{card.speedKb}</span>
                      </div>
                    )}
                  </div>

                  {/* 4 Metrics Columns */}
                  <div className="grid grid-cols-4 gap-2 py-2.5 my-1 border-t border-b border-slate-100 text-center">
                    {/* RPM */}
                    <div>
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">RPM</span>
                      <span
                        className={`text-sm sm:text-base font-bold font-mono block ${
                          card.rpm !== '--' ? 'text-emerald-500 font-extrabold' : 'text-slate-400'
                        }`}
                      >
                        {card.rpm}
                      </span>
                    </div>

                    {/* DISPLACEMENT */}
                    <div>
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">DISP.</span>
                      <span className="text-xs sm:text-sm font-bold font-mono text-slate-800 block">
                        {card.disp}
                      </span>
                    </div>

                    {/* POWER */}
                    <div>
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">POWER</span>
                      <span className="text-xs sm:text-sm font-bold font-mono text-slate-800 block">
                        {card.power}
                      </span>
                    </div>

                    {/* HEALTH */}
                    <div>
                      <span className="text-[9px] uppercase font-mono text-slate-400 block">HEALTH</span>
                      {card.health !== '--' ? (
                        <div className="flex items-center justify-center gap-0.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-xs sm:text-sm font-bold font-mono text-emerald-600">
                            {card.health}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs sm:text-sm font-mono text-slate-400 block">--</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Last Connected & Action Button */}
                <div className="mt-3 pt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                    <Clock className="w-3 h-3 text-blue-500" />
                    <div className="flex flex-col leading-tight">
                      <span className="text-[9px] text-slate-400">Last Connected</span>
                      <span className="text-slate-600 font-medium">{card.lastConnected}</span>
                    </div>
                  </div>

                  {/* Primary Action Button */}
                  {card.status === 'ONLINE' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAndProceed(card.id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span>Go to Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : card.status === 'CONNECTING...' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAndProceed(card.id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <RotateCw className="w-3 h-3 animate-spin text-blue-600" />
                      <span>Connecting</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAndProceed(card.id);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span>Connect</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 5 Pagination Dots (Matching Reference Image 3) */}
        <div className="flex items-center gap-2 mt-4">
          {FLEET_CARDS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`transition-all rounded-full cursor-pointer ${
                activeIndex === i
                  ? 'w-6 h-2 bg-blue-600'
                  : 'w-2 h-2 bg-blue-200 hover:bg-blue-300'
              }`}
            />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 px-6 text-center text-[11px] font-mono text-slate-400 border-t border-slate-200/60 bg-white/50">
        VYOM &bull; MALE UAV Telemetry &amp; Flight Connection Portal
      </footer>
    </div>
  );
};
