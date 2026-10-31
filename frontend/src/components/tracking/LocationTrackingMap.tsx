import React, { useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Circle,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MissionWaypoint } from '../../types';

// Fix Leaflet default icon URLs in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export type MapLayerType = 'satellite' | 'street' | 'hybrid' | 'terrain';

export interface UAVTrackingPosition {
  lat: number | null;
  lng: number | null;
  altFt: number;
  speedMs: number;
  headingDeg: number;
  isOnline: boolean;
}

interface LocationTrackingMapProps {
  uavPos: UAVTrackingPosition;
  uavName: string;
  uavId: string;
  operatingMode: string;
  waypoints?: MissionWaypoint[];
  flightTrail?: [number, number][];
  mapLayer: MapLayerType;
  showFlightPath: boolean;
  showWaypoints: boolean;
  followUAV: boolean;
  onMapMove?: () => void;
  className?: string;
  mapRef?: React.MutableRefObject<L.Map | null>;
}

// Controller for map view centering and bounds management
function TrackingMapController({
  uavPos,
  followUAV,
  mapRef,
}: {
  uavPos: UAVTrackingPosition;
  followUAV: boolean;
  mapRef?: React.MutableRefObject<L.Map | null>;
}) {
  const map = useMap();

  useEffect(() => {
    if (mapRef) {
      mapRef.current = map;
    }
  }, [map, mapRef]);

  useEffect(() => {
    if (followUAV && uavPos.lat !== null && uavPos.lng !== null) {
      map.panTo([uavPos.lat, uavPos.lng], {
        animate: true,
        duration: 0.8,
      });
    }
  }, [map, uavPos.lat, uavPos.lng, followUAV]);

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

export const LocationTrackingMap: React.FC<LocationTrackingMapProps> = ({
  uavPos,
  uavName,
  uavId,
  operatingMode,
  waypoints = [],
  flightTrail = [],
  mapLayer,
  showFlightPath,
  showWaypoints,
  followUAV,
  className = '',
  mapRef,
}) => {
  // Center map comfortably over Chhattisgarh corridor
  const initialCenter: [number, number] = useMemo(() => {
    if (uavPos.lat !== null && uavPos.lng !== null) {
      return [uavPos.lat, uavPos.lng];
    }
    return [21.42, 81.68];
  }, []);

  // Operational Flight Corridor Checkpoints (Airbase R-09 -> Sector Alpha)
  const startCoord: [number, number] = [21.160, 81.280]; // Airbase R-09 near Durg/Bhilai
  const wp1Coord: [number, number] = [21.400, 81.360];   // WP1 Corridor
  const sectorAlphaCoord: [number, number] = [21.680, 81.680]; // Sector Alpha above Simga
  const wp3Coord: [number, number] = [21.320, 82.020];   // WP3 (Turn & RTB)

  // Planned Return Corridor: Sector Alpha -> WP3 -> Southern approach -> Airbase
  const plannedCorridorPositions: [number, number][] = useMemo(() => {
    return [
      sectorAlphaCoord,
      wp3Coord,
      [21.120, 81.700],
      [21.100, 81.450],
      startCoord,
    ];
  }, []);

  // High-visibility Pure White Aircraft Marker with Dynamic Heading Rotation
  const aircraftIcon = useMemo(() => {
    const heading = uavPos.headingDeg || 0;
    const alt = uavPos.altFt || 0;
    const speed = uavPos.speedMs || 0;

    const html = `
      <div style="transform: translate(-50%, -50%);" class="relative flex flex-col items-center pointer-events-none select-none">
        <!-- Floating High-Contrast ID & Altitude Badge -->
        <div class="whitespace-nowrap bg-slate-950/95 text-white font-mono text-[10px] font-bold px-2.5 py-0.5 rounded border border-blue-400 shadow-[0_2px_12px_rgba(0,0,0,0.8)] mb-1.5 backdrop-blur-md tracking-wide">
          ${uavName} &middot; <span class="text-blue-300">${alt} ft</span> &middot; <span class="text-emerald-400">${speed} m/s</span>
        </div>

        <!-- Radar Pulse Ping Ring -->
        <div class="relative flex items-center justify-center">
          <div class="absolute w-12 h-12 rounded-full bg-blue-500/25 border border-blue-400/50 animate-ping"></div>

          <!-- Oriented Airplane Icon Ring -->
          <div style="transform: rotate(${heading}deg); transition: transform 0.3s ease;"
               class="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl border-2 border-white ring-4 ring-blue-500/40 relative z-10">
            <svg class="w-5 h-5 -rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
            </svg>
          </div>

          <!-- Forward Heading Vector Leader Line -->
          <div style="transform: rotate(${heading}deg); transform-origin: left center;"
               class="absolute left-1/2 top-1/2 w-10 h-0.5 bg-blue-400 z-0 pointer-events-none shadow-md"></div>
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'vyom-live-uav-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }, [uavPos.headingDeg, uavPos.altFt, uavPos.speedMs, uavName]);

  // Waypoint Badges (Clean, Minimal, High-Contrast)
  const startIcon = useMemo(() => {
    const html = `
      <div style="transform: translate(-50%, -50%);" class="flex items-center gap-1.5 bg-slate-950/90 text-white border border-emerald-400 px-2 py-0.5 rounded text-[10px] font-mono shadow-md font-bold whitespace-nowrap">
        <svg class="w-3 h-3 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <span>START (Airbase R-09)</span>
      </div>
    `;
    return L.divIcon({ html, className: 'vyom-wp-start', iconSize: [0, 0] });
  }, []);

  const wp1Icon = useMemo(() => {
    const html = `
      <div style="transform: translate(-50%, -50%);" class="bg-slate-950/90 text-white border border-sky-400 px-2 py-0.5 rounded text-[10px] font-mono shadow-md font-bold whitespace-nowrap">
        WP1 &middot; 12,000 ft
      </div>
    `;
    return L.divIcon({ html, className: 'vyom-wp-1', iconSize: [0, 0] });
  }, []);

  const sectorAlphaIcon = useMemo(() => {
    const html = `
      <div style="transform: translate(-50%, -50%);" class="bg-slate-950/90 text-white border border-blue-500 px-2.5 py-0.5 rounded text-[10px] font-mono shadow-md font-bold whitespace-nowrap tracking-wider">
        SURVEILLANCE SECTOR ALPHA
      </div>
    `;
    return L.divIcon({ html, className: 'vyom-wp-sector', iconSize: [0, 0] });
  }, []);

  const wp3Icon = useMemo(() => {
    const html = `
      <div style="transform: translate(-50%, -50%);" class="bg-slate-950/90 text-white border border-amber-400 px-2 py-0.5 rounded text-[10px] font-mono shadow-md font-bold whitespace-nowrap">
        WP3 (Turn &amp; RTB)
      </div>
    `;
    return L.divIcon({ html, className: 'vyom-wp-3', iconSize: [0, 0] });
  }, []);

  return (
    <div className={`relative w-full h-full min-h-[580px] overflow-hidden bg-slate-950 ${className}`}>
      <MapContainer
        center={initialCenter}
        zoom={10}
        scrollWheelZoom={true}
        attributionControl={false}
        className="w-full h-full min-h-[580px] z-10"
      >
        <TrackingMapController uavPos={uavPos} followUAV={followUAV} mapRef={mapRef} />

        {/* =======================================================================
            MAP TILES: SATELLITE, STREET MAP, HYBRID, TERRAIN
            ======================================================================= */}

        {/* 1. SATELLITE VIEW (High-Res World Imagery + Clean Country/State Borders) */}
        {mapLayer === 'satellite' && (
          <>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri World Imagery"
              maxZoom={19}
            />
            {/* Esri World Boundaries and Places Reference: Country & Indian State Boundaries with clear white text */}
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              attribution="Boundaries &copy; Esri"
              maxZoom={19}
              opacity={1}
            />
          </>
        )}

        {/* 2. STREET MAP (OpenStreetMap - Google Maps standard style) */}
        {mapLayer === 'street' && (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
            maxZoom={19}
          />
        )}

        {/* 3. HYBRID VIEW (Satellite imagery + CartoDB High-Contrast Labels & Borders) */}
        {mapLayer === 'hybrid' && (
          <>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri"
              maxZoom={19}
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              attribution="Boundaries &copy; Esri"
              maxZoom={19}
              opacity={0.9}
            />
          </>
        )}

        {/* 4. TERRAIN VIEW (Topographical relief contours + natural geographical features) */}
        {mapLayer === 'terrain' && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
            attribution="&copy; Esri &mdash; USGS, NOAA Topographic"
            maxZoom={19}
          />
        )}

        {/* =======================================================================
            FLIGHT PATH TRACKS (DYNAMIC LIVE TRAIL & PLANNED CORRIDOR)
            ======================================================================= */}
        {showFlightPath && (
          <>
            {/* Dynamic Real-time Accumulated GPS Flight Trail */}
            {flightTrail.length > 1 && (
              <>
                {/* Contrast Dark Halo */}
                <Polyline
                  positions={flightTrail}
                  pathOptions={{
                    color: '#000000',
                    weight: 6,
                    opacity: 0.6,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
                {/* Vibrant Emerald Path */}
                <Polyline
                  positions={flightTrail}
                  pathOptions={{
                    color: '#10b981',
                    weight: 4,
                    opacity: 1,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              </>
            )}

            {/* Faint Planned Return Corridor */}
            <Polyline
              positions={plannedCorridorPositions}
              pathOptions={{
                color: '#000000',
                weight: 5,
                opacity: 0.4,
                dashArray: '8, 8',
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            <Polyline
              positions={plannedCorridorPositions}
              pathOptions={{
                color: '#00e5ff',
                weight: 3,
                dashArray: '8, 8',
                opacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />

            {/* Tactical Loiter Circle over Surveillance Sector Alpha */}
            <Circle
              center={sectorAlphaCoord}
              radius={4000}
              pathOptions={{
                color: '#38bdf8',
                weight: 1.5,
                dashArray: '6, 6',
                fillColor: '#0284c7',
                fillOpacity: 0.08,
              }}
            />
          </>
        )}

        {/* =======================================================================
            WAYPOINT BADGES & CHECKPOINTS
            ======================================================================= */}
        {showWaypoints && (
          <>
            {/* Start Badge */}
            <Marker position={startCoord} icon={startIcon}>
              <Popup className="vyom-leaflet-popup">
                <div className="font-mono text-xs text-slate-900 font-semibold">
                  <p className="text-emerald-700 font-bold">Airbase R-09 (Takeoff Corridor)</p>
                  <p className="text-[10px] text-slate-500">{startCoord[0].toFixed(4)}° N, {startCoord[1].toFixed(4)}° E</p>
                </div>
              </Popup>
            </Marker>

            {/* WP1 */}
            <Marker position={wp1Coord} icon={wp1Icon}>
              <Popup className="vyom-leaflet-popup">
                <div className="font-mono text-xs text-slate-900 font-semibold">
                  <p className="font-bold">Waypoint 1 (Climb Phase)</p>
                  <p className="text-[10px] text-slate-500">{wp1Coord[0].toFixed(4)}° N, {wp1Coord[1].toFixed(4)}° E</p>
                </div>
              </Popup>
            </Marker>

            {/* Surveillance Sector Alpha */}
            <Marker position={sectorAlphaCoord} icon={sectorAlphaIcon}>
              <Popup className="vyom-leaflet-popup">
                <div className="font-mono text-xs text-slate-900 font-semibold">
                  <p className="text-blue-700 font-bold">Surveillance Sector Alpha</p>
                  <p className="text-[10px] text-slate-500">{sectorAlphaCoord[0].toFixed(4)}° N, {sectorAlphaCoord[1].toFixed(4)}° E</p>
                </div>
              </Popup>
            </Marker>

            {/* WP3 (Turn & RTB) */}
            <Marker position={wp3Coord} icon={wp3Icon}>
              <Popup className="vyom-leaflet-popup">
                <div className="font-mono text-xs text-slate-900 font-semibold">
                  <p className="font-bold">Waypoint 3 (Turn &amp; RTB)</p>
                  <p className="text-[10px] text-slate-500">{wp3Coord[0].toFixed(4)}° N, {wp3Coord[1].toFixed(4)}° E</p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* =======================================================================
            REAL-TIME LIVE UAV MOVING MARKER
            ======================================================================= */}
        {uavPos.isOnline && uavPos.lat !== null && uavPos.lng !== null && (
          <Marker
            position={[uavPos.lat, uavPos.lng]}
            icon={aircraftIcon}
            zIndexOffset={1000}
          />
        )}
      </MapContainer>

      {/* Disconnected / Offline GPS Notice Overlay */}
      {(!uavPos.isOnline || uavPos.lat === null || uavPos.lng === null) && (
        <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white select-none">
          <div className="p-3 rounded-full bg-amber-500/20 border border-amber-500/40 mb-3 animate-pulse">
            <svg className="w-8 h-8 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07 19.07 4.93"/>
            </svg>
          </div>
          <h3 className="text-base font-bold text-amber-300 font-mono tracking-wide">
            {operatingMode === 'LIVE' ? 'LIVE GPS DATALINK DISCONNECTED' : 'GPS FIX SEARCHING'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mt-1 font-mono">
            {operatingMode === 'LIVE'
              ? 'Awaiting authentic NMEA / MAVLink navigation packets from physical MALE UAV GCS.'
              : 'GPS navigation receiver acquiring carrier lock.'}
          </p>
        </div>
      )}
    </div>
  );
};
