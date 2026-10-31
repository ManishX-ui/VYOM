import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Polygon,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MissionRecord, ReplayTelemetryPoint, EngineTelemetry } from '../../types';
import { DigitalTwin3D } from '../digital-twin/DigitalTwin3D';
import { CesiumGeospatialTracker } from '../geospatial/CesiumGeospatialTracker';
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  Crosshair,
  Globe,
  Box,
} from 'lucide-react';

// Fix Leaflet default icon issues in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export type MapLayerType = 'Satellite' | 'Street' | 'Hybrid' | 'Terrain';

interface MissionReplayMapProps {
  mission: MissionRecord;
  currentTelemetry: ReplayTelemetryPoint;
  playbackIndex: number;
  totalPoints: number;
  isPlaying: boolean;
  playbackSpeed: number;
  mapLayer: MapLayerType;
  mapMode: 'Map' | '3D View';
  onTogglePlay: () => void;
  onStop: () => void;
  onReplay: () => void;
  onSeek: (index: number) => void;
  onChangeSpeed: (speed: number) => void;
  onToggleMapMode: (mode: 'Map' | '3D View') => void;
  className?: string;
}

const SEGMENT_COLORS: Record<string, string> = {
  'Normal Flight': '#3b82f6',     // Blue
  'Surveillance Area': '#10b981', // Green
  'High Altitude': '#00e5ff',     // Cyan
  'Turn/Manoeuvre': '#f59e0b',    // Orange
  'Turn Manoeuvre': '#f59e0b',
  'Return': '#ef4444',            // Red
};

// Map controller to automatically fit bounds and follow UAV smoothly
function ReplayMapController({
  mission,
  currentTelemetry,
  isPlaying,
  followAircraft,
}: {
  mission: MissionRecord;
  currentTelemetry: ReplayTelemetryPoint;
  isPlaying: boolean;
  followAircraft: boolean;
}) {
  const map = useMap();
  const prevMissionIdRef = useRef<string | null>(null);

  // Initial bounds fit on mission change
  useEffect(() => {
    if (!mission || !mission.timeline || mission.timeline.length === 0) return;

    if (prevMissionIdRef.current !== mission.id) {
      prevMissionIdRef.current = mission.id;
      const coords = mission.timeline.map((p) => [p.lat, p.lng] as [number, number]);
      if (coords.length > 0) {
        const bounds = L.latLngBounds(coords);
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 13,
          animate: true,
        });
      }
    }
  }, [map, mission]);

  // Smooth camera tracking during active playback
  useEffect(() => {
    if (isPlaying && followAircraft && currentTelemetry && currentTelemetry.lat && currentTelemetry.lng) {
      map.panTo([currentTelemetry.lat, currentTelemetry.lng], {
        animate: true,
        duration: 0.6,
      });
    }
  }, [map, isPlaying, followAircraft, currentTelemetry.lat, currentTelemetry.lng]);

  // Invalidate size to guarantee crisp tile render
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

export const MissionReplayMap: React.FC<MissionReplayMapProps> = ({
  mission,
  currentTelemetry,
  playbackIndex,
  totalPoints,
  isPlaying,
  playbackSpeed,
  mapLayer,
  mapMode,
  onTogglePlay,
  onStop,
  onReplay,
  onSeek,
  onChangeSpeed,
  onToggleMapMode,
  className = '',
}) => {
  const [threeDViewType, setThreeDViewType] = useState<'terrain' | 'airframe'>('terrain');
  const [followAircraft, setFollowAircraft] = useState<boolean>(true);
  const timeline = mission.timeline || [];
  const waypoints = mission.waypoints || [];

  // Full planned route coordinates for background corridor
  const fullPlannedRoute = useMemo(() => {
    return timeline.map((p) => [p.lat, p.lng] as [number, number]);
  }, [timeline]);

  // Progressive Flown Segments up to current playbackIndex
  const progressiveSegments = useMemo(() => {
    if (timeline.length < 2) return [];

    const segments: {
      positions: [number, number][];
      color: string;
      type: string;
    }[] = [];

    const activeMaxIndex = Math.min(playbackIndex, timeline.length - 1);

    for (let i = 0; i < activeMaxIndex; i++) {
      const p1 = timeline[i];
      const p2 = timeline[i + 1];
      const segType = p1.segmentType || 'Normal Flight';
      const color = SEGMENT_COLORS[segType] || '#3b82f6';

      segments.push({
        positions: [
          [p1.lat, p1.lng],
          [p2.lat, p2.lng],
        ],
        color,
        type: segType,
      });
    }

    return segments;
  }, [timeline, playbackIndex]);

  // Start & End mission endpoints
  const startPoint = timeline[0] || (waypoints[0] ? { lat: waypoints[0].lat, lng: waypoints[0].lng } : null);
  const endPoint = timeline[timeline.length - 1] || (waypoints[waypoints.length - 1] ? { lat: waypoints[waypoints.length - 1].lat, lng: waypoints[waypoints.length - 1].lng } : null);

  // Initial center coordinates
  const initialCenter: [number, number] = useMemo(() => {
    if (timeline.length > 0) {
      return [timeline[0].lat, timeline[0].lng];
    }
    return [21.2891, 81.672];
  }, [timeline]);

  // Surveillance Area Polygon Sector
  const surveillanceZone: [number, number][] = useMemo(() => {
    const surveilPoints = timeline.filter(
      (p) => p.segmentType === 'Surveillance Area' || p.segmentType === 'High Altitude'
    );
    if (surveilPoints.length < 2) {
      return [
        [21.265, 81.645],
        [21.295, 81.660],
        [21.290, 81.685],
        [21.260, 81.670],
      ];
    }
    const lats = surveilPoints.map((p) => p.lat);
    const lngs = surveilPoints.map((p) => p.lng);
    const minLat = Math.min(...lats) - 0.006;
    const maxLat = Math.max(...lats) + 0.006;
    const minLng = Math.min(...lngs) - 0.008;
    const maxLng = Math.max(...lngs) + 0.008;
    return [
      [minLat, minLng],
      [maxLat, minLng],
      [maxLat, maxLng],
      [minLat, maxLng],
    ];
  }, [timeline]);

  // Rotating Aircraft Marker with Live Direction Vector and Telemetry Pill
  const aircraftIcon = useMemo(() => {
    const heading = currentTelemetry.heading || 0;
    const altitude = currentTelemetry.altitude ?? 1200;
    const speed = currentTelemetry.speed ?? 32.1;

    const html = `
      <div style="transform: translate(-50%, -50%);" class="relative flex flex-col items-center pointer-events-none select-none">
        <!-- Floating Telemetry Callout Badge (White Text with Dark Backdrop) -->
        <div class="whitespace-nowrap bg-slate-950/95 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded border border-blue-400 shadow-[0_4px_16px_rgba(0,0,0,0.9)] mb-1.5 backdrop-blur-md">
          ${altitude} ft &middot; <span class="text-blue-300">${speed} m/s</span>
        </div>

        <!-- Radar Pulse Ping Ring -->
        <div class="relative flex items-center justify-center">
          <div class="absolute w-12 h-12 rounded-full bg-blue-500/25 border border-blue-400/50 animate-ping"></div>

          <!-- Directional Aircraft Compass Ring -->
          <div style="transform: rotate(${heading}deg); transition: transform 0.25s ease;"
               class="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl border-2 border-white ring-4 ring-blue-500/40 relative z-10">
            <svg class="w-5 h-5 -rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
            </svg>
          </div>

          <!-- Forward Heading Vector Indicator -->
          <div style="transform: rotate(${heading}deg); transform-origin: left center;"
               class="absolute left-1/2 top-1/2 w-8 h-0.5 bg-blue-400 z-0 pointer-events-none shadow-md"></div>
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'vyom-uav-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }, [currentTelemetry.heading, currentTelemetry.altitude, currentTelemetry.speed]);

  // Synchronized EngineTelemetry wrapper for 3D Digital Twin Viewer
  const replayEngineTelemetry: EngineTelemetry = useMemo(() => {
    return {
      uav_id: mission.uavId || 'UAV-MALE-IND-01',
      timestamp: currentTelemetry.time || '14:15:00',
      iso_timestamp: currentTelemetry.timestamp,
      mode: 'REPLAY',
      is_simulated: false,
      rpm: currentTelemetry.rpm ?? 2450,
      cht: currentTelemetry.cht ?? 186.0,
      egt: currentTelemetry.egt ?? 620.0,
      oilPressure: currentTelemetry.oilPressure ?? 4.2,
      oilTemperature: currentTelemetry.oilTemperature ?? 95.0,
      fuelFlow: currentTelemetry.fuelFlow ?? 12.0,
      vibrationRMS: currentTelemetry.vibration ?? 0.28,
      injectionTiming: 26.5,
      altitudeFt: currentTelemetry.altitude ?? 14500,
      groundSpeedMs: currentTelemetry.speed ?? 28.4,
      headingDeg: currentTelemetry.heading ?? 42,
      rollDeg: currentTelemetry.roll ?? 0,
      pitchDeg: currentTelemetry.pitch ?? 0,
      latitude: currentTelemetry.lat,
      longitude: currentTelemetry.lng,
      manifoldPressureInHg: currentTelemetry.manifoldPressureInHg ?? 31.0,
      coolantTemp: currentTelemetry.coolantTemp ?? 88.0,
      fuelPressure: currentTelemetry.fuelPressure ?? 3.2,
      batteryVoltage: currentTelemetry.batteryVoltage ?? 28.0,
      batteryCurrent: currentTelemetry.batteryCurrent ?? 15.0,
      batterySoc: currentTelemetry.battery ?? 80.0,
      engineHealth: currentTelemetry.engineHealth ?? 95.0,
      datalink_status: 'CONNECTED',
    };
  }, [currentTelemetry, mission.uavId]);

  // Start Point Marker
  const startIcon = useMemo(() => {
    const html = `
      <div style="transform: translate(-50%, -50%);" class="flex items-center gap-1.5 bg-emerald-950/95 text-emerald-400 border border-emerald-500 px-2.5 py-1 rounded-md text-[10px] font-mono shadow-[0_4px_16px_rgba(0,0,0,0.9)] font-bold whitespace-nowrap">
        <svg class="w-3 h-3 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <span>Start ${mission.startTime || '14:02:15'}</span>
      </div>
    `;
    return L.divIcon({ html, className: 'vyom-start-marker', iconSize: [0, 0] });
  }, [mission.startTime]);

  // End Point Marker
  const endIcon = useMemo(() => {
    const html = `
      <div style="transform: translate(-50%, -50%);" class="flex items-center gap-1.5 bg-red-950/95 text-red-400 border border-red-500 px-2.5 py-1 rounded-md text-[10px] font-mono shadow-[0_4px_16px_rgba(0,0,0,0.9)] font-bold whitespace-nowrap">
        <svg class="w-3 h-3 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <span>End ${mission.endTime || '14:56:32'}</span>
      </div>
    `;
    return L.divIcon({ html, className: 'vyom-end-marker', iconSize: [0, 0] });
  }, [mission.endTime]);

  // Checkpoint Nodes
  const createCheckpointIcon = (color: string) => {
    const html = `
      <div style="transform: translate(-50%, -50%); background-color: ${color};" class="w-2.5 h-2.5 rounded-full border border-white shadow-md"></div>
    `;
    return L.divIcon({ html, className: 'vyom-waypoint-marker', iconSize: [0, 0] });
  };

  return (
    <div className={`relative flex-1 min-h-[460px] rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-sm flex flex-col ${className}`}>
      {/* =======================================================================
          LEAFLET GEOGRAPHICAL MAP CONTAINER (Natural Worldwide Google Maps Style)
          ======================================================================= */}
      <MapContainer
        center={initialCenter}
        zoom={12}
        scrollWheelZoom={true}
        attributionControl={false}
        className="w-full h-full min-h-[460px] z-10 flex-1"
      >
        <ReplayMapController
          mission={mission}
          currentTelemetry={currentTelemetry}
          isPlaying={isPlaying}
          followAircraft={followAircraft}
        />

        {/* 1. SATELLITE VIEW (High-Res World Imagery + High-Contrast Country/State Borders) */}
        {mapLayer === 'Satellite' && (
          <>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="&copy; Esri &mdash; High-Resolution Satellite"
              maxZoom={19}
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              attribution="&copy; Esri Boundaries &amp; Places"
              maxZoom={19}
              opacity={1}
            />
          </>
        )}

        {/* 2. HYBRID VIEW (Satellite imagery + Detailed Street/Transport/Label Overlay) */}
        {mapLayer === 'Hybrid' && (
          <>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="&copy; Esri World Imagery"
              maxZoom={19}
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              attribution="&copy; Esri Reference"
              maxZoom={19}
              opacity={0.9}
            />
          </>
        )}

        {/* 2. STREET MAP TILE LAYER (OpenStreetMap - Google Maps standard style with all countries & states) */}
        {mapLayer === 'Street' && (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
            maxZoom={19}
          />
        )}

        {/* 3. TERRAIN TILE LAYER (Topographical relief & contours with natural geographical names) */}
        {mapLayer === 'Terrain' && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
            attribution="&copy; Esri &mdash; USGS, NOAA Topographic"
            maxZoom={19}
          />
        )}

        {/* =======================================================================
            SURVEILLANCE SECTOR BOUNDARY (GREEN RECONNAISSANCE ZONE)
            ======================================================================= */}
        <Polygon
          positions={surveillanceZone}
          pathOptions={{
            color: '#10b981',
            weight: 2,
            dashArray: '6, 6',
            fillColor: '#10b981',
            fillOpacity: 0.12,
          }}
        />

        {/* =======================================================================
            PLANNED MISSION CORRIDOR (FAINT BACKGROUND FLIGHT PATH)
            ======================================================================= */}
        {fullPlannedRoute.length > 1 && (
          <Polyline
            positions={fullPlannedRoute}
            pathOptions={{
              color: '#ffffff',
              weight: 3,
              opacity: 0.25,
              dashArray: '6, 6',
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {/* =======================================================================
            PROGRESSIVE REPLAY FLIGHT ROUTE (PROGRESSIVELY APPEARS UP TO SCRUBBER)
            ======================================================================= */}
        {progressiveSegments.map((segment, idx) => (
          <React.Fragment key={`flown-${idx}`}>
            {/* Contrast Halo */}
            <Polyline
              positions={segment.positions}
              pathOptions={{
                color: '#000000',
                weight: 6.5,
                opacity: 0.65,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Active Vibrant Colored Route */}
            <Polyline
              positions={segment.positions}
              pathOptions={{
                color: segment.color,
                weight: 4.5,
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </React.Fragment>
        ))}

        {/* =======================================================================
            MISSION WAYPOINTS & CHECKPOINT NODES
            ======================================================================= */}
        {waypoints.map((wp, i) => {
          if (i === 0 || i === waypoints.length - 1) return null;
          const nodeColor = wp.type === 'surveillance' ? '#10b981' : wp.type === 'start' ? '#22c55e' : '#38bdf8';
          return (
            <Marker
              key={`wp-${i}`}
              position={[wp.lat, wp.lng]}
              icon={createCheckpointIcon(nodeColor)}
            >
              <Popup className="vyom-leaflet-popup">
                <div className="font-mono text-xs text-slate-900 font-semibold">
                  <p className="font-bold text-slate-900">{wp.label || `Waypoint ${i}`}</p>
                  <p className="text-[10px] text-slate-500">{wp.lat.toFixed(4)}° N, {wp.lng.toFixed(4)}° E</p>
                  {wp.alt !== undefined && <p className="text-[10px] text-blue-600">{wp.alt} ft MSL</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Start Point Marker */}
        {startPoint && (
          <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon}>
            <Popup className="vyom-leaflet-popup">
              <div className="font-mono text-xs text-slate-900 font-semibold">
                <p className="text-emerald-700 font-bold">Mission Start</p>
                <p className="text-[10px] text-slate-500">{mission.startTime}</p>
                <p className="text-[10px] text-slate-500">{startPoint.lat.toFixed(4)}° N, {startPoint.lng.toFixed(4)}° E</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* End Point Marker */}
        {endPoint && (
          <Marker position={[endPoint.lat, endPoint.lng]} icon={endIcon}>
            <Popup className="vyom-leaflet-popup">
              <div className="font-mono text-xs text-slate-900 font-semibold">
                <p className="text-red-700 font-bold">Mission End / RTB</p>
                <p className="text-[10px] text-slate-500">{mission.endTime}</p>
                <p className="text-[10px] text-slate-500">{endPoint.lat.toFixed(4)}° N, {endPoint.lng.toFixed(4)}° E</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Moving UAV Aircraft Marker */}
        {currentTelemetry && currentTelemetry.lat && currentTelemetry.lng && (
          <Marker
            position={[currentTelemetry.lat, currentTelemetry.lng]}
            icon={aircraftIcon}
            zIndexOffset={1000}
          />
        )}
      </MapContainer>

      {/* =======================================================================
          FLOATING MAP OVERLAYS (Map/3D Toggle, Legend, Video Controls)
          ======================================================================= */}

      {/* Map vs 3D View Toggle (Top Left) */}
      <div className="absolute top-4 left-4 z-[1000] flex items-center gap-1 p-1 rounded-lg bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-md text-xs pointer-events-auto">
        <button
          onClick={() => onToggleMapMode('Map')}
          className={`px-3 py-1 rounded font-medium transition-colors ${
            mapMode === 'Map' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          Map
        </button>
        <button
          onClick={() => onToggleMapMode('3D View')}
          className={`px-3 py-1 rounded font-medium transition-colors ${
            mapMode === '3D View' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          3D View
        </button>
      </div>

      {/* Route Segment Legend (Top Right) */}
      <div className="absolute top-4 right-4 z-[1000] p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-[11px] font-mono text-slate-300 space-y-1.5 shadow-lg pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
          <span>Normal Flight</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <span>Surveillance Area</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0" />
          <span>High Altitude</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
          <span>Turn/Manoeuvre</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
          <span>Return</span>
        </div>
      </div>

      {/* Tactical Scale Indicator (Bottom Left) */}
      <div className="absolute bottom-18 left-4 z-[1000] flex items-center gap-2 bg-slate-900/85 px-2.5 py-1 rounded border border-slate-700/80 text-[10px] font-mono text-slate-300 shadow-md pointer-events-none">
        <div className="w-12 h-1 bg-white rounded-xs" />
        <span>2 km</span>
      </div>

      {/* =======================================================================
          INTERACTIVE IN-MAP VIDEO PLAYBACK CONTROLLER (HUD DOCK)
          ======================================================================= */}
      <div className="absolute bottom-3 left-4 right-4 z-[1000] pointer-events-auto">
        <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 backdrop-blur-md shadow-2xl flex items-center gap-3 text-white">
          {/* Play / Pause Toggle Button */}
          <button
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause Replay' : 'Play Replay'}
            className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md transition-colors shrink-0"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          {/* Stop Button */}
          <button
            onClick={onStop}
            title="Stop Replay"
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors shrink-0"
          >
            <Square className="w-3.5 h-3.5" />
          </button>

          {/* Replay Button */}
          <button
            onClick={onReplay}
            title="Restart Replay from Beginning"
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Scrubber Range Slider & Timestamps */}
          <div className="flex-1 flex items-center gap-2.5 min-w-0">
            <span className="font-mono text-[10px] text-slate-400 shrink-0">
              {currentTelemetry.time}
            </span>

            <input
              type="range"
              min="0"
              max={Math.max(0, totalPoints - 1)}
              value={playbackIndex}
              onChange={(e) => onSeek(parseInt(e.target.value, 10))}
              className="flex-1 accent-blue-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />

            <span className="font-mono text-[10px] text-slate-500 shrink-0">
              {mission.endTime}
            </span>
          </div>

          {/* Playback Speed Pill Buttons (1x, 2x, 4x) */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg shrink-0 text-[10px] font-mono">
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => onChangeSpeed(spd)}
                className={`px-2 py-0.5 rounded font-bold transition-colors ${
                  playbackSpeed === spd
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Follow Aircraft Toggle */}
          <button
            onClick={() => setFollowAircraft(!followAircraft)}
            title={followAircraft ? 'Tracking Aircraft: ON' : 'Tracking Aircraft: OFF'}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
              followAircraft
                ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3D Digital Twin & Geospatial Replay View */}
      {mapMode === '3D View' && (
        <div className="absolute inset-0 z-[900] bg-slate-100 flex flex-col">
          {/* Sub-selector: Geospatial Terrain vs Airframe Twin */}
          <div className="absolute top-4 left-36 z-[1000] flex items-center gap-1 p-1 rounded-lg bg-white/90 border border-slate-200/90 backdrop-blur-md shadow-sm text-xs pointer-events-auto">
            <button
              onClick={() => setThreeDViewType('terrain')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors ${
                threeDViewType === 'terrain'
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>3D Terrain (Cesium)</span>
            </button>
            <button
              onClick={() => setThreeDViewType('airframe')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors ${
                threeDViewType === 'airframe'
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Box className="w-3 h-3" />
              <span>Airframe CAD</span>
            </button>
          </div>

          {threeDViewType === 'terrain' ? (
            <CesiumGeospatialTracker
              uavId={mission.uavId || 'UAV-01'}
              uavName={mission.name || 'RUSTOM-II'}
              mode="REPLAY"
              telemetry={replayEngineTelemetry}
              playbackIndex={playbackIndex}
              totalPoints={totalPoints}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              onTogglePlay={onTogglePlay}
              onStop={onStop}
              onSeek={onSeek}
              onChangeSpeed={onChangeSpeed}
              waypoints={mission.waypoints}
              flightTrail={
                mission.timeline
                  ?.slice(0, playbackIndex + 1)
                  .map((p) => [p.lat, p.lng, (p.altitude || 14500) * 0.3048]) || []
              }
              className="w-full h-full"
            />
          ) : (
            <DigitalTwin3D
              telemetry={replayEngineTelemetry}
              heightClass="h-full w-full"
              showThermal={false}
              showVibration={false}
              showSurfaces={true}
            />
          )}
        </div>
      )}
    </div>
  );
};
