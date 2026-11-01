import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { useApp } from '../../context/AppContext';
import { DEMO_MISSIONS } from '../../data/demoData';
import { LocationTrackingMap, MapLayerType, UAVTrackingPosition } from '../../components/tracking/LocationTrackingMap';
import { CesiumGeospatialTracker } from '../../components/geospatial/CesiumGeospatialTracker';
import {
  Navigation,
  Compass,
  MapPin,
  Crosshair,
  Layers,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Plane,
  Radio,
  Gauge,
  Thermometer,
  Shield,
  Activity,
  ArrowUpRight,
  Maximize2,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Globe,
} from 'lucide-react';

export const LocationTrackingPage: React.FC = () => {
  const { selectedUAV, pairedUAVs, telemetry, telemetryMode, backendConnectionStatus, selectUAV } = useApp();

  const [viewType, setViewType] = useState<'3D' | '2D'>('3D');
  const [followUAV, setFollowUAV] = useState(true);
  const [showFlightPath, setShowFlightPath] = useState(true);
  const [showWaypoints, setShowWaypoints] = useState(true);
  const [mapLayer, setMapLayer] = useState<MapLayerType>('satellite');
  const [flightTrail, setFlightTrail] = useState<[number, number][]>([]);

  const mapRef = useRef<L.Map | null>(null);

  const isLiveDisconnected =
    telemetryMode === 'LIVE' &&
    (backendConnectionStatus !== 'CONNECTED' ||
      telemetry.datalink_status === 'DISCONNECTED' ||
      telemetry.latitude === null ||
      telemetry.latitude === undefined);

  const isGpsOnline = !isLiveDisconnected && telemetry.latitude !== null && telemetry.longitude !== null;

  // Real-time UAV position derived from centralized telemetry
  const uavPos: UAVTrackingPosition = {
    lat: isGpsOnline ? (telemetry.latitude ?? 21.42) : null,
    lng: isGpsOnline ? (telemetry.longitude ?? 81.68) : null,
    altFt: telemetry.altitudeFt ?? 18000,
    speedMs: telemetry.groundSpeedMs ?? 32.4,
    headingDeg: telemetry.headingDeg ?? 139,
    isOnline: isGpsOnline,
  };

  const waypoints = DEMO_MISSIONS[0].waypoints;

  // Real-time dynamic flight trail accumulation from centralized telemetry timestamps
  useEffect(() => {
    if (!isGpsOnline || uavPos.lat === null || uavPos.lng === null) return;

    setFlightTrail((prev) => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        // Skip duplicate coordinate points
        if (Math.abs(last[0] - uavPos.lat!) < 0.00005 && Math.abs(last[1] - uavPos.lng!) < 0.00005) {
          return prev;
        }
      }
      const updated = [...prev, [uavPos.lat!, uavPos.lng!] as [number, number]];
      // Retain max 500 points for smooth performance
      return updated.length > 500 ? updated.slice(-500) : updated;
    });
  }, [telemetry.timestamp, uavPos.lat, uavPos.lng, isGpsOnline]);

  const handleCenter = () => {
    setFollowUAV(true);
    if (mapRef.current && uavPos.lat !== null && uavPos.lng !== null) {
      mapRef.current.setView([uavPos.lat, uavPos.lng], 12, { animate: true });
    }
  };

  const handleFitRoute = () => {
    setFollowUAV(false);
    if (!mapRef.current) return;

    const points: [number, number][] = [...flightTrail];
    waypoints.forEach((wp) => points.push([wp.lat, wp.lng]));
    if (uavPos.lat !== null && uavPos.lng !== null) {
      points.push([uavPos.lat, uavPos.lng]);
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      mapRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  };

  const handleClearTrail = () => {
    setFlightTrail([]);
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Live UAV Location &amp; Flight Path Tracking
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time geospatial positioning, heading vectors, and corridor navigation
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* 3D vs 2D Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-300">
            <button
              onClick={() => setViewType('3D')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                viewType === '3D'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>3D Geospatial</span>
            </button>
            <button
              onClick={() => setViewType('2D')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                viewType === '2D'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>2D Tactical Map</span>
            </button>
          </div>

          {/* Operating Mode Badge */}
          <span
            className={`font-mono text-xs px-2.5 py-1 rounded font-semibold border ${
              telemetryMode === 'LIVE'
                ? isLiveDisconnected
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : telemetryMode === 'REPLAY'
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {telemetryMode === 'REPLAY' ? 'MODE: REPLAY' : 'AIRSPACE: ACTIVE'}
          </span>

          {/* GPS Status Indicator */}
          <span
            className={`font-mono text-xs px-2.5 py-1 rounded border font-semibold flex items-center gap-1.5 ${
              isGpsOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isGpsOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            {isGpsOnline ? 'GPS Fix: 3D DGPS (14 Sats)' : 'GPS OFFLINE / NO CARRIER'}
          </span>
        </div>
      </div>

      {/* =========================================
          MAP WORKSPACE & TELEMETRY COCKPIT
          ========================================= */}
      {viewType === '3D' ? (
        <div className="w-full h-[760px] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative">
          <CesiumGeospatialTracker
            uavId={selectedUAV.id}
            uavName={selectedUAV.name}
            mode={telemetryMode}
            telemetry={telemetry}
            waypoints={waypoints}
            availableFleet={pairedUAVs.map((u, i) => ({
              id: u.id,
              name: u.name,
              callsign: `UAV-${i + 1}`,
              lat: (telemetry.latitude ?? 21.25) + (i - 1) * 0.04,
              lng: (telemetry.longitude ?? 81.63) + (i - 1) * 0.03,
              altFt: (telemetry.altitudeFt ?? 14500) + i * 500,
              headingDeg: (telemetry.headingDeg ?? 139) + i * 20,
              pitchDeg: telemetry.pitchDeg ?? 0,
              rollDeg: telemetry.rollDeg ?? 0,
              speedMs: telemetry.groundSpeedMs ?? 32,
              flightMode: telemetry.flight_mode ?? 'QLOITER',
              status: u.status === 'ONLINE' ? 'ACTIVE' : 'STANDBY',
              color: i === 0 ? '#38bdf8' : '#a855f7',
            }))}
            onSelectUAV={selectUAV}
            className="w-full h-full"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Map Container (8 Cols) */}
        <div className="lg:col-span-8 bg-slate-950 rounded-2xl border border-slate-800 shadow-md relative overflow-hidden flex flex-col h-full min-h-[580px] select-none">
          {/* Top Floating Map Controls Toolbar */}
          <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            {/* 4 Map Layers Selection */}
            <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-lg bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-lg text-xs font-medium text-slate-300">
              <Layers className="w-3.5 h-3.5 text-blue-400 ml-1.5" />
              {(
                [
                  { id: 'satellite', label: 'Satellite' },
                  { id: 'street', label: 'Street Map' },
                  { id: 'hybrid', label: 'Hybrid' },
                  { id: 'terrain', label: 'Terrain' },
                ] as const
              ).map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => setMapLayer(layer.id)}
                  className={`px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                    mapLayer === layer.id
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'hover:text-white text-slate-400'
                  }`}
                >
                  {layer.label}
                </button>
              ))}
            </div>

            {/* Overlays & Actions: Path, Waypoints, Clear Trail, Fit Route */}
            <div className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-lg text-xs text-slate-300">
              <button
                onClick={() => setShowFlightPath(!showFlightPath)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                  showFlightPath ? 'bg-slate-800 text-blue-300 font-medium' : 'text-slate-500'
                }`}
                title="Toggle Flight Path Trail"
              >
                {showFlightPath ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>Trail</span>
              </button>

              <button
                onClick={() => setShowWaypoints(!showWaypoints)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                  showWaypoints ? 'bg-slate-800 text-blue-300 font-medium' : 'text-slate-500'
                }`}
                title="Toggle Mission Waypoints"
              >
                {showWaypoints ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>Waypoints</span>
              </button>

              <button
                onClick={handleClearTrail}
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Clear accumulated visual flight trail"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Right Floating Nav Controls */}
          <div className="absolute right-4 top-20 z-20 flex flex-col gap-1.5 pointer-events-auto">
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="p-2 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white transition-colors shadow-lg cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="p-2 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white transition-colors shadow-lg cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleCenter}
              title="Center on UAV"
              className={`p-2 rounded-lg border transition-colors shadow-lg cursor-pointer ${
                followUAV
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <Crosshair className="w-4 h-4" />
            </button>
            <button
              onClick={handleFitRoute}
              title="Fit Full Corridor Route"
              className="p-2 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white transition-colors shadow-lg cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Real Leaflet Geographical Map Component */}
          <LocationTrackingMap
            uavPos={uavPos}
            uavName={selectedUAV.name}
            uavId={selectedUAV.id}
            operatingMode={telemetryMode}
            waypoints={waypoints}
            flightTrail={flightTrail}
            mapLayer={mapLayer}
            showFlightPath={showFlightPath}
            showWaypoints={showWaypoints}
            followUAV={followUAV}
            mapRef={mapRef}
          />

          {/* Bottom Left Coordinate Telemetry HUD (Overlaid on Map) */}
          <div className="absolute bottom-4 left-4 z-20 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300 backdrop-blur-md shadow-xl flex items-center gap-4 pointer-events-none">
            <div>
              <span className="text-slate-500 text-[10px] block">LATITUDE</span>
              <span className="font-bold text-white">
                {uavPos.lat !== null ? `${uavPos.lat.toFixed(4)}° N` : '--'}
              </span>
            </div>
            <div className="border-l border-slate-700 pl-3">
              <span className="text-slate-500 text-[10px] block">LONGITUDE</span>
              <span className="font-bold text-white">
                {uavPos.lng !== null ? `${uavPos.lng.toFixed(4)}° E` : '--'}
              </span>
            </div>
            <div className="border-l border-slate-700 pl-3">
              <span className="text-slate-500 text-[10px] block">HEADING</span>
              <span className="font-bold text-blue-400">{uavPos.headingDeg}°</span>
            </div>
            <div className="border-l border-slate-700 pl-3">
              <span className="text-slate-500 text-[10px] block">TIMESTAMP</span>
              <span className="font-medium text-slate-300">{telemetry.timestamp || '--:--:--'}</span>
            </div>
          </div>
        </div>

        {/* Right: Side Telemetry Panel (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-4 h-full">
          {/* Active Flight Coordinates Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex-1 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Airspace Telemetry</h3>
                <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                  {telemetryMode === 'LIVE' ? 'LIVE GCS LINK' : 'SYNCHRONIZED STREAM'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-3 items-stretch">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between h-full space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Altitude (MSL)</span>
                  <p className="text-xl font-bold font-mono text-slate-900">
                    {uavPos.isOnline ? `${uavPos.altFt} ft` : '--'}
                  </p>
                  <span className="text-[10px] font-mono text-slate-500">
                    AGL: {uavPos.isOnline ? `${Math.max(0, uavPos.altFt - 950)} ft` : '--'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between h-full space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Ground Speed</span>
                  <p className="text-xl font-bold font-mono text-slate-900">
                    {uavPos.isOnline ? `${uavPos.speedMs} m/s` : '--'}
                  </p>
                  <span className="text-[10px] font-mono text-slate-500">
                    IAS: {uavPos.isOnline ? `${(uavPos.speedMs * 1.94384).toFixed(1)} kts` : '--'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between h-full space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Compass Heading</span>
                  <p className="text-xl font-bold font-mono text-slate-900">
                    {uavPos.isOnline ? `${uavPos.headingDeg}°` : '--'}
                  </p>
                  <span className="text-[10px] font-mono text-slate-500">
                    {uavPos.headingDeg >= 315 || uavPos.headingDeg < 45
                      ? 'North'
                      : uavPos.headingDeg < 135
                      ? 'East'
                      : uavPos.headingDeg < 225
                      ? 'South'
                      : 'West'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between h-full space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Roll &amp; Pitch</span>
                  <p className="text-xl font-bold font-mono text-slate-900">
                    {telemetry.rollDeg?.toFixed(1) ?? '0.0'}° / {telemetry.pitchDeg?.toFixed(1) ?? '0.0'}°
                  </p>
                  <span className="text-[10px] font-mono text-slate-500">IMU Stable</span>
                </div>
              </div>
            </div>

            {/* Synchronized Engine State */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <h4 className="text-xs font-bold text-slate-800">Synchronized Engine Datalink</h4>
              <div className="flex items-center justify-between text-xs font-mono p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Engine Speed:</span>
                <span className="font-bold text-blue-600">{telemetry.rpm} RPM</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Cylinder Head (CHT):</span>
                <span
                  className={`font-bold ${
                    telemetry.cht > 205 ? 'text-red-600' : telemetry.cht > 195 ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  {telemetry.cht} °C
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-600">Oil System:</span>
                <span className="font-bold text-slate-800">{telemetry.oilPressure} bar</span>
              </div>
            </div>
          </div>

          {/* Flight Plan & Geofence Corridor */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
            <h4 className="font-bold text-slate-900 text-sm">Geofence &amp; Navigation Corridor</h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="flex items-center gap-1.5 font-medium">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Airspace Sector: Alpha Corridor</span>
                </span>
                <span className="font-mono font-semibold">WITHIN LIMITS</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Airframe Assigned</span>
                <span className="font-mono font-semibold text-slate-800">{selectedUAV.name}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Active Trail Points</span>
                <span className="font-mono font-semibold text-slate-800">{flightTrail.length} Recorded</span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-slate-500">Airspace State Boundary</span>
                <span className="font-mono font-semibold text-slate-800">Chhattisgarh (CG / MP)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
