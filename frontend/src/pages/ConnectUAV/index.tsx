import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Zap,
  Wifi,
  Clock,
  ArrowRight,
  LogOut,
  MoreHorizontal,
  RotateCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Radio,
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Active carousel index (defaults to 2 for TAPAS-BH-201 in the center)
  const [activeIndex, setActiveIndex] = useState<number>(2);
  const [isNewDeviceModalOpen, setIsNewDeviceModalOpen] = useState<boolean>(false);
  const [newDeviceName, setNewDeviceName] = useState<string>('ALPHA-TAPAS-02');
  const [newDeviceId, setNewDeviceId] = useState<string>('UAV-ALPHA-02');
  const [newProtocol, setNewProtocol] = useState<'MAVLink v2' | 'MQTT'>('MAVLink v2');
  const [newConnectionUri, setNewConnectionUri] = useState<string>('udp:127.0.0.1:14550');

  const scrollToCard = (idx: number) => {
    setActiveIndex(idx);
    if (scrollContainerRef.current) {
      const cards = scrollContainerRef.current.children;
      if (cards[idx]) {
        (cards[idx] as HTMLElement).scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }
  };

  const handleSelectAndProceed = (uavId: string) => {
    selectUAV(uavId);
    navigate('/app/dashboard');
  };

  const handleAddDeviceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsNewDeviceModalOpen(false);
    selectUAV(newDeviceId);
    navigate('/app/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/40 via-white to-blue-50/20 text-slate-800 flex flex-col justify-between select-none">
      {/* Top Header with Clean VYOM Branding */}
      <header className="flex items-center justify-between px-6 lg:px-14 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <img
            src="/vyom-logo.png"
            alt="VYOM Logo"
            className="w-8 h-8 rounded-lg object-contain bg-slate-100 p-0.5 border border-slate-200 shadow-2xs"
          />
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
          {/* Pair New Device quick button */}
          <button
            onClick={() => setIsNewDeviceModalOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Pair New Device</span>
          </button>

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

      {/* Main Carousel Viewport */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 max-w-7xl mx-auto w-full relative">
        {/* Left & Right Smooth Scroll Buttons */}
        <div className="w-full flex items-center justify-between max-w-6xl mb-2 px-4 pointer-events-none">
          <button
            onClick={() => scrollToCard(Math.max(0, activeIndex - 1))}
            disabled={activeIndex === 0}
            className="pointer-events-auto p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Previous UAV"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scrollToCard(Math.min(FLEET_CARDS.length, activeIndex + 1))}
            disabled={activeIndex >= FLEET_CARDS.length}
            className="pointer-events-auto p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Next UAV"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Horizontal Card Row with Smooth Scrolling */}
        <div
          ref={scrollContainerRef}
          className="w-full flex items-center justify-start lg:justify-center gap-3 sm:gap-4 overflow-x-auto py-4 px-4 scroll-smooth snap-x snap-mandatory scrollbar-none"
        >
          {FLEET_CARDS.map((card, idx) => {
            const isActive = idx === activeIndex;

            return (
              <div
                key={card.id}
                onClick={() => scrollToCard(idx)}
                className={`relative rounded-2xl bg-white transition-all duration-300 cursor-pointer flex flex-col justify-between shrink-0 snap-center ${
                  isActive
                    ? 'w-64 sm:w-72 p-4 shadow-lg border-2 border-blue-500 ring-4 ring-blue-500/10 scale-100 z-20'
                    : 'w-52 sm:w-56 p-3.5 shadow-2xs border border-slate-200/90 scale-95 opacity-80 hover:opacity-100 z-10'
                }`}
              >
                <div>
                  {/* Top Row: Status Badge & 3-Dots Menu */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full uppercase ${
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
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Drone Thumbnail Photo */}
                  <div className="w-full h-24 sm:h-28 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60 mb-2.5 flex items-center justify-center">
                    <img
                      src={card.image}
                      alt={card.name}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>

                  {/* Title & Device Identifier */}
                  <div className="mb-2">
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug truncate">
                      {card.name}
                    </h3>
                    <p className="font-mono text-[9px] text-slate-400 mt-0.5 truncate">
                      {card.id} | {card.deviceId}
                    </p>
                  </div>

                  {/* Protocol & Datalink Line */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 py-1 border-t border-slate-100">
                    <div className="flex items-center gap-1 truncate mr-1">
                      <Zap className="w-3 h-3 text-blue-500 fill-blue-500 shrink-0" />
                      <span className="truncate">{card.protocol}</span>
                    </div>
                    {card.status === 'ONLINE' && (
                      <div className="flex items-center gap-1 text-emerald-600 font-semibold shrink-0">
                        <Wifi className="w-3 h-3" />
                        <span>{card.speedKb}</span>
                      </div>
                    )}
                  </div>

                  {/* 4 Metrics Columns */}
                  <div className="grid grid-cols-4 gap-1 py-2 my-1 border-t border-b border-slate-100 text-center">
                    {/* RPM */}
                    <div>
                      <span className="text-[8px] uppercase font-mono text-slate-400 block">RPM</span>
                      <span
                        className={`text-xs sm:text-sm font-bold font-mono block ${
                          card.rpm !== '--' ? 'text-emerald-500 font-extrabold' : 'text-slate-400'
                        }`}
                      >
                        {card.rpm}
                      </span>
                    </div>

                    {/* DISPLACEMENT */}
                    <div>
                      <span className="text-[8px] uppercase font-mono text-slate-400 block">DISP.</span>
                      <span className="text-[11px] sm:text-xs font-bold font-mono text-slate-800 block">
                        {card.disp}
                      </span>
                    </div>

                    {/* POWER */}
                    <div>
                      <span className="text-[8px] uppercase font-mono text-slate-400 block">POWER</span>
                      <span className="text-[11px] sm:text-xs font-bold font-mono text-slate-800 block">
                        {card.power}
                      </span>
                    </div>

                    {/* HEALTH */}
                    <div>
                      <span className="text-[8px] uppercase font-mono text-slate-400 block">HEALTH</span>
                      {card.health !== '--' ? (
                        <div className="flex items-center justify-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[11px] sm:text-xs font-bold font-mono text-emerald-600">
                            {card.health}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] sm:text-xs font-mono text-slate-400 block">--</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Last Connected & Action Button */}
                <div className="mt-2.5 pt-2 flex items-center justify-between gap-1.5 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono truncate">
                    <Clock className="w-3 h-3 text-blue-500 shrink-0" />
                    <span className="text-slate-600 truncate">{card.lastConnected}</span>
                  </div>

                  {/* Primary Action Button */}
                  {card.status === 'ONLINE' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAndProceed(card.id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[11px] font-semibold shadow-2xs flex items-center gap-1 transition-all cursor-pointer shrink-0"
                    >
                      <span>Dashboard</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ) : card.status === 'CONNECTING...' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAndProceed(card.id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold border border-blue-200 flex items-center gap-1 transition-all cursor-pointer shrink-0"
                    >
                      <RotateCw className="w-3 h-3 animate-spin text-blue-600" />
                      <span>Sync</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAndProceed(card.id);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                    >
                      <span>Connect</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* New Connection Device Card */}
          <div
            onClick={() => setIsNewDeviceModalOpen(true)}
            className="relative rounded-2xl bg-white/70 hover:bg-white border-2 border-dashed border-blue-300 hover:border-blue-500 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center shrink-0 w-52 sm:w-56 p-5 shadow-2xs hover:shadow-md group snap-center min-h-[340px]"
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all mb-3 shadow-2xs">
              <Plus className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
              Pair New Device
            </h4>
            <p className="text-[11px] font-mono text-slate-400 mt-1 max-w-[160px] leading-relaxed">
              Connect MAVLink or MQTT Datalink receiver
            </p>
            <span className="mt-4 px-3 py-1.5 rounded-lg bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white text-xs font-semibold transition-all">
              + Add UAV
            </span>
          </div>
        </div>

        {/* Carousel Pagination Dots */}
        <div className="flex items-center gap-2 mt-4">
          {[...FLEET_CARDS, { id: 'new' }].map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToCard(i)}
              className={`transition-all rounded-full cursor-pointer ${
                activeIndex === i
                  ? 'w-6 h-2 bg-blue-600'
                  : 'w-2 h-2 bg-blue-200 hover:bg-blue-300'
              }`}
            />
          ))}
        </div>
      </main>

      {/* Modal: Pair New Connection Device */}
      {isNewDeviceModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsNewDeviceModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150 text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Pair New Connection Device</h3>
                  <p className="text-xs text-slate-500 font-mono">Datalink &amp; Telemetry Bridge</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewDeviceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDeviceSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Aircraft Call Sign / Name
                </label>
                <input
                  type="text"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  placeholder="e.g. ALPHA-TAPAS-02"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Device Hardware ID
                </label>
                <input
                  type="text"
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  placeholder="e.g. UAV-ALPHA-02"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Protocol
                  </label>
                  <select
                    value={newProtocol}
                    onChange={(e) => setNewProtocol(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="MAVLink v2">MAVLink v2</option>
                    <option value="MQTT">MQTT / JSON</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Endpoint URI / Port
                  </label>
                  <input
                    type="text"
                    value={newConnectionUri}
                    onChange={(e) => setNewConnectionUri(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    placeholder="udp:127.0.0.1:14550"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewDeviceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect Device</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-3 px-6 text-center text-[11px] font-mono text-slate-400 border-t border-slate-200/60 bg-white/50">
        VYOM &bull; MALE UAV Telemetry &amp; Flight Connection Portal
      </footer>
    </div>
  );
};
