import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { EngineTelemetry, MissionWaypoint } from '../../types';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  FastForward,
  Maximize2,
  Minimize2,
  Layers,
  Compass,
  Crosshair,
  Search,
  HelpCircle,
  X,
  Plane,
  Radio,
  Eye,
  Camera,
  Activity,
  ChevronRight,
  Shield,
  Gauge,
  MapPin,
  Clock,
  ArrowUpRight,
} from 'lucide-react';

// Configure Cesium Ion access token from environment or fallback
if (import.meta.env.VITE_CESIUM_ION_TOKEN) {
  Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
}

export type GeospatialLayerType = 'satellite' | 'streets' | 'dark' | 'topo';
export type CameraTrackingMode = 'CHASE' | 'TOP_DOWN' | 'SIDE' | 'FREE';

export interface MultiUAVTarget {
  id: string;
  name: string;
  callsign: string;
  lat: number;
  lng: number;
  altFt: number;
  headingDeg: number;
  pitchDeg: number;
  rollDeg: number;
  speedMs: number;
  flightMode: string;
  status: 'ACTIVE' | 'DEGRADED' | 'STANDBY';
  color: string;
}

interface CesiumGeospatialTrackerProps {
  uavId: string;
  uavName?: string;
  mode: 'DEMO' | 'LIVE' | 'REPLAY';
  telemetry: EngineTelemetry;
  playbackIndex?: number;
  totalPoints?: number;
  isPlaying?: boolean;
  playbackSpeed?: number;
  onTogglePlay?: () => void;
  onStop?: () => void;
  onSeek?: (index: number) => void;
  onChangeSpeed?: (speed: number) => void;
  waypoints?: MissionWaypoint[];
  flightTrail?: [number, number, number?][];
  availableFleet?: MultiUAVTarget[];
  onSelectUAV?: (uavId: string) => void;
  className?: string;
  onClose?: () => void;
}

// Available Flight Modes matching aerospace ArduPilot / PX4 MAVLink specifications
const FLIGHT_MODES = [
  { name: 'QSTABILIZE', color: '#ef4444' }, // Red
  { name: 'FBWA', color: '#f97316' },       // Orange
  { name: 'CRUISE', color: '#eab308' },     // Yellow
  { name: 'QLOITER', color: '#22c55e' },    // Bright Green
  { name: 'AUTO', color: '#06b6d4' },       // Cyan
  { name: 'GUIDED', color: '#a855f7' },     // Purple
  { name: 'RTL', color: '#f59e0b' },        // Amber
];

// Helper to format ISO or timestamp to UTC military string (e.g. "Apr 26 2026 21:01:39 UTC")
function formatMilitaryUtc(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A UTC';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getUTCMonth()];
  const day = d.getUTCDate().toString().padStart(2, '0');
  const year = d.getUTCFullYear();
  const hours = d.getUTCHours().toString().padStart(2, '0');
  const minutes = d.getUTCMinutes().toString().padStart(2, '0');
  const seconds = d.getUTCSeconds().toString().padStart(2, '0');
  return `${month} ${day} ${year} ${hours}:${minutes}:${seconds} UTC`;
}

// Helper to format millisecond scrub tick labels (e.g. "21:01:00.000")
function formatTickTime(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '--:--:--';
  const hours = d.getUTCHours().toString().padStart(2, '0');
  const minutes = d.getUTCMinutes().toString().padStart(2, '0');
  const seconds = d.getUTCSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}.000`;
}

export const CesiumGeospatialTracker: React.FC<CesiumGeospatialTrackerProps> = ({
  uavId,
  uavName = 'RUSTOM-II MALE UAV',
  mode,
  telemetry,
  playbackIndex = 0,
  totalPoints = 100,
  isPlaying = false,
  playbackSpeed = 1,
  onTogglePlay,
  onStop,
  onSeek,
  onChangeSpeed,
  waypoints = [],
  flightTrail = [],
  availableFleet = [],
  onSelectUAV,
  className = '',
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const uavEntityRef = useRef<Cesium.Entity | null>(null);
  const trailPolylineRef = useRef<Cesium.Entity | null>(null);
  const fleetEntitiesRef = useRef<Map<string, Cesium.Entity>>(new Map());
  const waypointsEntitiesRef = useRef<Cesium.Entity[]>([]);

  // State
  const [activeLayer, setActiveLayer] = useState<GeospatialLayerType>('satellite');
  const [cameraMode, setCameraMode] = useState<CameraTrackingMode>('CHASE');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [showCameraMenu, setShowCameraMenu] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showFleetMenu, setShowFleetMenu] = useState<boolean>(false);
  const [selectedWaypoint, setSelectedWaypoint] = useState<MissionWaypoint | null>(null);

  // Performance stats
  const [fps, setFps] = useState<number>(60);
  const [latencyMs, setLatencyMs] = useState<number>(14);
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(performance.now());

  // Cached positions for smooth interpolation
  const currentPosRef = useRef<{ lat: number; lng: number; altM: number }>({
    lat: telemetry.latitude ?? 21.25,
    lng: telemetry.longitude ?? 81.63,
    altM: (telemetry.altitudeFt ?? 14500) * 0.3048,
  });

  const positionsHistoryRef = useRef<Cesium.Cartesian3[]>([]);

  // Active flight mode determination
  const activeFlightMode = useMemo(() => {
    const rawMode = (telemetry.flight_mode || telemetry.operating_mode || 'QLOITER').toUpperCase();
    if (rawMode.includes('STABIL')) return 'QSTABILIZE';
    if (rawMode.includes('FBW')) return 'FBWA';
    if (rawMode.includes('CRUISE')) return 'CRUISE';
    if (rawMode.includes('LOITER')) return 'QLOITER';
    if (rawMode.includes('AUTO')) return 'AUTO';
    if (rawMode.includes('GUIDED')) return 'GUIDED';
    if (rawMode.includes('RTL') || rawMode.includes('RETURN')) return 'RTL';
    return 'QLOITER';
  }, [telemetry.flight_mode, telemetry.operating_mode]);

  // Telemetry validity check
  const isGpsValid = telemetry.latitude !== null && telemetry.longitude !== null;
  const isLiveDisconnected = mode === 'LIVE' && (!isGpsValid || telemetry.datalink_status === 'DISCONNECTED');

  // Base Imagery Provider Factory
  const createImageryProvider = useCallback((type: GeospatialLayerType): Cesium.ImageryProvider => {
    switch (type) {
      case 'satellite':
        return new Cesium.UrlTemplateImageryProvider({
          url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          maximumLevel: 19,
          credit: 'Esri World Imagery',
        });
      case 'streets':
        return new Cesium.OpenStreetMapImageryProvider({
          url: 'https://tile.openstreetmap.org/',
        });
      case 'dark':
        return new Cesium.UrlTemplateImageryProvider({
          url: 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
          subdomains: ['a', 'b', 'c', 'd'],
          credit: 'CartoDB Dark Matter',
        });
      case 'topo':
        return new Cesium.UrlTemplateImageryProvider({
          url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
          maximumLevel: 19,
          credit: 'Esri World Topographic',
        });
      default:
        return new Cesium.UrlTemplateImageryProvider({
          url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          credit: 'Esri World Imagery',
        });
    }
  }, []);

  // 1. Initialize Cesium Viewer
  useEffect(() => {
    if (!containerRef.current) return;

    // Build standalone high-performance viewer without default heavy Cesium widgets
    const initialImagery = createImageryProvider('satellite');
    const viewer = new Cesium.Viewer(containerRef.current, {
      baseLayer: new Cesium.ImageryLayer(initialImagery),
      animation: false,
      timeline: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      navigationHelpButton: false,
      navigationInstructionsInitiallyVisible: false,
      scene3DOnly: true,
      shouldAnimate: true,
      contextOptions: {
        webgl: {
          alpha: false,
          antialias: true,
          preserveDrawingBuffer: false,
          powerPreference: 'high-performance',
        },
      },
    });

    // Dark tactical aerospace styling
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#020617');
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#020617');
    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.scene.fog.enabled = true;
    viewer.scene.fog.density = 0.0001;

    // Suppress default Cesium Ion credit badge and replace with custom VYOM attribution
    const creditContainer = viewer.bottomContainer as HTMLElement;
    if (creditContainer) {
      creditContainer.style.display = 'none';
    }

    viewerRef.current = viewer;

    // Setup 3D Primary MALE UAV Entity
    const initialPos = Cesium.Cartesian3.fromDegrees(
      currentPosRef.current.lng,
      currentPosRef.current.lat,
      currentPosRef.current.altM
    );

    const initialHpr = new Cesium.HeadingPitchRoll(
      Cesium.Math.toRadians(telemetry.headingDeg ?? 139),
      Cesium.Math.toRadians(telemetry.pitchDeg ?? 0),
      Cesium.Math.toRadians(telemetry.rollDeg ?? 0)
    );
    const initialOrientation = Cesium.Transforms.headingPitchRollQuaternion(initialPos, initialHpr);

    // Primary UAV Entity with real binary glTF model & radar selection ring
    const uavEntity = viewer.entities.add({
      id: `uav-${uavId}`,
      name: uavName,
      position: new Cesium.CallbackPositionProperty(() => {
        return Cesium.Cartesian3.fromDegrees(
          currentPosRef.current.lng,
          currentPosRef.current.lat,
          currentPosRef.current.altM
        );
      }, false),
      orientation: new Cesium.CallbackProperty(() => {
        const curPos = Cesium.Cartesian3.fromDegrees(
          currentPosRef.current.lng,
          currentPosRef.current.lat,
          currentPosRef.current.altM
        );
        const hpr = new Cesium.HeadingPitchRoll(
          Cesium.Math.toRadians((telemetry.headingDeg ?? 139) - 90), // Align glTF forward
          Cesium.Math.toRadians(telemetry.pitchDeg ?? 0),
          Cesium.Math.toRadians(telemetry.rollDeg ?? 0)
        );
        return Cesium.Transforms.headingPitchRollQuaternion(curPos, hpr);
      }, false),
      model: {
        uri: '/models/male_uav.glb',
        minimumPixelSize: 64,
        maximumScale: 150,
        scale: 12.0,
        runAnimations: true,
        shadows: Cesium.ShadowMode.ENABLED,
      },
      // Target Selection Ellipse / Ring on Ground
      ellipse: {
        semiMinorAxis: 40.0,
        semiMajorAxis: 40.0,
        material: Cesium.Color.fromCssColorString('#00e5ff').withAlpha(0.25),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('#00e5ff'),
        outlineWidth: 2,
        height: 5.0,
      },
      // Aircraft Label
      label: {
        text: `${uavName} (${uavId})\nALT: ${Math.round(telemetry.altitudeFt ?? 14500)} FT | ${Math.round((telemetry.groundSpeedMs ?? 32) * 1.94384)} KTS`,
        font: 'bold 12px "JetBrains Mono", monospace',
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -45),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 150000),
      },
    });

    uavEntityRef.current = uavEntity;

    // Vibrant Yellow Tactical Flight Trail (matching reference screenshot)
    const trailEntity = viewer.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(() => positionsHistoryRef.current, false),
        width: 3.5,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.25,
          color: Cesium.Color.fromCssColorString('#facc15'), // Tactical Yellow
        }),
        clampToGround: false,
      },
    });
    trailPolylineRef.current = trailEntity;

    // Initial Camera Positioning: Chase Camera behind UAV
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        currentPosRef.current.lng - 0.008,
        currentPosRef.current.lat - 0.008,
        currentPosRef.current.altM + 800
      ),
      orientation: {
        heading: Cesium.Math.toRadians(telemetry.headingDeg ?? 45),
        pitch: Cesium.Math.toRadians(-22),
        roll: 0.0,
      },
      duration: 1.5,
    });

    // FPS & Latency Counter on Render Tick
    const removePostRender = viewer.scene.postRender.addEventListener(() => {
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastFpsTimeRef.current >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsTimeRef.current)));
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
        // Simulated network datalink jitter
        setLatencyMs(mode === 'LIVE' ? Math.floor(12 + Math.random() * 6) : 5);
      }
    });

    // Clean up viewer on unmount
    return () => {
      removePostRender();
      if (!viewer.isDestroyed()) {
        viewer.destroy();
      }
      viewerRef.current = null;
    };
  }, []); // Run once on mount

  // 2. Synchronize Telemetry Position and Trail
  useEffect(() => {
    if (!viewerRef.current) return;

    const lat = telemetry.latitude ?? (mode === 'DEMO' ? 21.25 : null);
    const lng = telemetry.longitude ?? (mode === 'DEMO' ? 81.63 : null);
    const altFt = telemetry.altitudeFt ?? 14500;
    const altM = altFt * 0.3048;

    if (lat !== null && lng !== null) {
      currentPosRef.current = { lat, lng, altM };

      const newPos = Cesium.Cartesian3.fromDegrees(lng, lat, altM);
      const history = positionsHistoryRef.current;

      // Avoid redundant duplicate coordinates
      if (history.length === 0) {
        positionsHistoryRef.current = [newPos];
      } else {
        const last = history[history.length - 1];
        const dist = Cesium.Cartesian3.distance(last, newPos);
        if (dist > 1.5) {
          positionsHistoryRef.current = [...history, newPos].slice(-1000);
        }
      }

      // Smooth Camera Chase Tracking
      if (cameraMode === 'CHASE' && viewerRef.current) {
        const camera = viewerRef.current.camera;
        const headingRad = Cesium.Math.toRadians(telemetry.headingDeg ?? 139);
        const pitchRad = Cesium.Math.toRadians(-20);
        const range = 750; // Camera distance in meters

        // Offset camera behind aircraft along heading
        const offsetLng = -(Math.sin(headingRad) * (range / 111320));
        const offsetLat = -(Math.cos(headingRad) * (range / 111320));

        camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(lng + offsetLng, lat + offsetLat, altM + 300),
          orientation: {
            heading: headingRad,
            pitch: pitchRad,
            roll: Cesium.Math.toRadians(telemetry.rollDeg ? telemetry.rollDeg * 0.3 : 0),
          },
        });
      } else if (cameraMode === 'TOP_DOWN' && viewerRef.current) {
        viewerRef.current.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(lng, lat, altM + 4500),
          orientation: {
            heading: Cesium.Math.toRadians(telemetry.headingDeg ?? 0),
            pitch: Cesium.Math.toRadians(-89.9),
            roll: 0.0,
          },
        });
      } else if (cameraMode === 'SIDE' && viewerRef.current) {
        const headingRad = Cesium.Math.toRadians(telemetry.headingDeg ?? 139);
        const sideRad = headingRad + Math.PI / 2;
        const range = 600;

        const offsetLng = Math.sin(sideRad) * (range / 111320);
        const offsetLat = Math.cos(sideRad) * (range / 111320);

        viewerRef.current.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(lng + offsetLng, lat + offsetLat, altM + 120),
          orientation: {
            heading: headingRad - Math.PI / 2,
            pitch: Cesium.Math.toRadians(-8),
            roll: 0.0,
          },
        });
      }
    }
  }, [telemetry, cameraMode, mode]);

  // 3. Render Mission Waypoints
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Clear previous waypoint entities
    waypointsEntitiesRef.current.forEach((e) => viewer.entities.remove(e));
    waypointsEntitiesRef.current = [];

    if (!waypoints || waypoints.length === 0) return;

    const newEntities: Cesium.Entity[] = [];

    waypoints.forEach((wp, idx) => {
      const wpAltM = (wp.alt || 15000) * 0.3048;
      const wpPos = Cesium.Cartesian3.fromDegrees(wp.lng, wp.lat, wpAltM);

      const entity = viewer.entities.add({
        id: `waypoint-${idx}`,
        position: wpPos,
        point: {
          pixelSize: 12,
          color: Cesium.Color.fromCssColorString('#00e5ff'),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        label: {
          text: `WP${idx + 1}: ${wp.label || 'WAYPOINT'}\n${wp.alt || 15000} FT`,
          font: 'bold 11px monospace',
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -14),
        },
      });

      newEntities.push(entity);
    });

    // Draw planned mission path interconnecting waypoints
    if (waypoints.length > 1) {
      const routeCoords = waypoints.map((w) =>
        Cesium.Cartesian3.fromDegrees(w.lng, w.lat, (w.alt || 15000) * 0.3048)
      );

      const routeEntity = viewer.entities.add({
        id: 'mission-planned-path',
        polyline: {
          positions: routeCoords,
          width: 2.0,
          material: new Cesium.PolylineDashMaterialProperty({
            color: Cesium.Color.fromCssColorString('#00e5ff').withAlpha(0.6),
            dashLength: 16.0,
          }),
        },
      });
      newEntities.push(routeEntity);
    }

    waypointsEntitiesRef.current = newEntities;
  }, [waypoints]);

  // 4. Render Multi-UAV Fleet Members
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (!availableFleet || availableFleet.length === 0) return;

    availableFleet.forEach((target) => {
      // Don't duplicate primary selected UAV
      if (target.id === uavId) return;

      let entity = fleetEntitiesRef.current.get(target.id);
      const targetPos = Cesium.Cartesian3.fromDegrees(target.lng, target.lat, target.altFt * 0.3048);

      const hpr = new Cesium.HeadingPitchRoll(
        Cesium.Math.toRadians(target.headingDeg - 90),
        Cesium.Math.toRadians(target.pitchDeg),
        Cesium.Math.toRadians(target.rollDeg)
      );
      const orientation = Cesium.Transforms.headingPitchRollQuaternion(targetPos, hpr);

      if (!entity) {
        entity = viewer.entities.add({
          id: `fleet-${target.id}`,
          position: targetPos,
          orientation: orientation,
          model: {
            uri: '/models/male_uav.glb',
            minimumPixelSize: 48,
            maximumScale: 100,
            scale: 9.0,
            color: Cesium.Color.fromCssColorString(target.color || '#94a3b8'),
          },
          label: {
            text: `${target.callsign} (${target.id})\n${Math.round(target.altFt)} FT`,
            font: '10px monospace',
            fillColor: Cesium.Color.fromCssColorString(target.color || '#94a3b8'),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -35),
          },
        });
        fleetEntitiesRef.current.set(target.id, entity);
      } else {
        entity.position = new Cesium.ConstantPositionProperty(targetPos);
        entity.orientation = new Cesium.ConstantProperty(orientation);
      }
    });
  }, [availableFleet, uavId]);

  // 5. Handle Imagery Layer Switch
  const handleSelectLayer = (type: GeospatialLayerType) => {
    setActiveLayer(type);
    setShowLayerMenu(false);
    if (!viewerRef.current) return;

    const layers = viewerRef.current.imageryLayers;
    layers.removeAll();
    const newProvider = createImageryProvider(type);
    layers.addImageryProvider(newProvider);
  };

  // 6. Handle Fullscreen Toggle
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // 7. Reset Camera to UAV
  const handleCenterOnUAV = () => {
    setCameraMode('CHASE');
    if (!viewerRef.current) return;
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        currentPosRef.current.lng - 0.008,
        currentPosRef.current.lat - 0.008,
        currentPosRef.current.altM + 800
      ),
      orientation: {
        heading: Cesium.Math.toRadians(telemetry.headingDeg ?? 45),
        pitch: Cesium.Math.toRadians(-22),
        roll: 0.0,
      },
      duration: 1.2,
    });
  };

  // Timeline Progress Percentage
  const progressPercent = totalPoints > 0 ? (playbackIndex / totalPoints) * 100 : 0;
  const currentTimestamp = telemetry.timestamp || new Date().toISOString();

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-slate-950 select-none font-sans ${className}`}
    >
      {/* =======================================================================
          TOP-LEFT OVERLAY: FLIGHT MODE INDICATOR (Exact Reference Layout)
          ======================================================================= */}
      <div className="absolute top-4 left-4 z-20 pointer-events-auto">
        <div className="px-3.5 py-3 rounded-xl bg-black/80 border border-slate-700/80 backdrop-blur-md shadow-2xl flex flex-col gap-1.5 min-w-[140px]">
          <div className="text-[10px] font-mono tracking-wider uppercase text-slate-400 font-bold mb-0.5 flex items-center justify-between border-b border-slate-800 pb-1">
            <span>Flight Mode</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {FLIGHT_MODES.slice(0, 4).map((m) => {
            const isActive = activeFlightMode === m.name;
            return (
              <div
                key={m.name}
                className={`text-xs font-mono font-bold tracking-wide px-2 py-0.5 rounded transition-all flex items-center justify-between ${
                  isActive
                    ? 'bg-slate-800/90 shadow-sm border border-emerald-500/50 scale-[1.02]'
                    : 'opacity-40 hover:opacity-70'
                }`}
                style={{
                  color: isActive ? m.color : '#94a3b8',
                  textShadow: isActive ? `0 0 10px ${m.color}80` : 'none',
                }}
              >
                <span>{m.name}</span>
                {isActive && <span className="text-[10px] font-sans">◀</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* =======================================================================
          TOP-RIGHT OVERLAY: MAP TOOLBAR & STATUS INDICATORS (Exact Reference Layout)
          ======================================================================= */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2.5 pointer-events-auto">
        {/* Circular Action Icons */}
        <div className="flex items-center gap-2">
          {/* Search / Waypoints Finder */}
          <button
            onClick={() => handleCenterOnUAV()}
            title="Search & Focus Aircraft"
            className="w-9 h-9 rounded-full bg-black/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-colors shadow-lg"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Base Layer Switcher */}
          <div className="relative">
            <button
              onClick={() => {
                setShowLayerMenu(!showLayerMenu);
                setShowCameraMenu(false);
                setShowFleetMenu(false);
              }}
              title="Satellite & Map Layers"
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors shadow-lg ${
                showLayerMenu
                  ? 'bg-blue-600 border-blue-400 text-white'
                  : 'bg-black/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* Layer Selection Dropdown */}
            {showLayerMenu && (
              <div className="absolute right-0 top-11 w-44 rounded-xl bg-slate-900/95 border border-slate-700 p-2 shadow-2xl backdrop-blur-md z-30 flex flex-col gap-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold px-2 py-1">
                  Imagery Provider
                </span>
                {(
                  [
                    { id: 'satellite', label: 'ESRI Satellite', desc: 'Photorealistic Orbit' },
                    { id: 'streets', label: 'Street Map', desc: 'OSM Road Vectors' },
                    { id: 'dark', label: 'CartoDB Dark', desc: 'Tactical Night Grid' },
                    { id: 'topo', label: 'Topographic', desc: 'Elevation Contours' },
                  ] as const
                ).map((layer) => (
                  <button
                    key={layer.id}
                    onClick={() => handleSelectLayer(layer.id)}
                    className={`flex flex-col text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      activeLayer === layer.id
                        ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40 font-bold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <span>{layer.label}</span>
                    <span className="text-[10px] text-slate-500">{layer.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Camera View Switcher */}
          <div className="relative">
            <button
              onClick={() => {
                setShowCameraMenu(!showCameraMenu);
                setShowLayerMenu(false);
                setShowFleetMenu(false);
              }}
              title="Camera Tracking Mode"
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors shadow-lg ${
                showCameraMenu
                  ? 'bg-blue-600 border-blue-400 text-white'
                  : 'bg-black/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700'
              }`}
            >
              <Camera className="w-4 h-4" />
            </button>

            {showCameraMenu && (
              <div className="absolute right-0 top-11 w-44 rounded-xl bg-slate-900/95 border border-slate-700 p-2 shadow-2xl backdrop-blur-md z-30 flex flex-col gap-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold px-2 py-1">
                  Camera Perspective
                </span>
                {(
                  [
                    { id: 'CHASE', label: 'Chase Camera', desc: 'Locked behind UAV' },
                    { id: 'TOP_DOWN', label: 'Top-Down Nadir', desc: '90° Overhead Plan' },
                    { id: 'SIDE', label: 'Lateral Chase', desc: 'Cockpit Profile' },
                    { id: 'FREE', label: 'Free Orbit', desc: '360° Free Rotate' },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCameraMode(c.id);
                      setShowCameraMenu(false);
                    }}
                    className={`flex flex-col text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      cameraMode === c.id
                        ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40 font-bold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <span>{c.label}</span>
                    <span className="text-[10px] text-slate-500">{c.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Help / Controls Info */}
          <button
            onClick={() => setShowHelpModal(!showHelpModal)}
            title="Geospatial Controls Guide"
            className="w-9 h-9 rounded-full bg-black/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-colors shadow-lg"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Close / Return button */}
          {onClose && (
            <button
              onClick={onClose}
              title="Close 3D Geospatial View"
              className="w-9 h-9 rounded-full bg-black/80 hover:bg-rose-900 text-slate-300 hover:text-rose-200 border border-slate-700 flex items-center justify-center transition-colors shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tactical Telemetry Badge (Matching Screenshot: Red/Yellow/Green Text) */}
        <div className="px-3 py-2 rounded-xl bg-black/85 border border-slate-800 backdrop-blur-md shadow-2xl flex flex-col items-end gap-0.5 text-right font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">FPS:</span>
            <span className="text-emerald-400 font-bold">{fps} FPS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">LATENCY:</span>
            <span className="text-yellow-400 font-bold">{latencyMs} MS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">UAV:</span>
            <span className="text-cyan-400 font-bold">{uavId}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">LINK:</span>
            <span
              className={`font-bold ${
                isLiveDisconnected
                  ? 'text-rose-500 animate-pulse'
                  : 'text-emerald-400'
              }`}
            >
              {isLiveDisconnected ? 'DISCONNECTED' : 'MAVLink 2.0 (OK)'}
            </span>
          </div>
        </div>
      </div>

      {/* =======================================================================
          TOP-CENTER TELEMETRY HUD BAR (Latitude, Longitude, Altitude, Speed)
          ======================================================================= */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto hidden md:flex items-center gap-4 px-4 py-2 rounded-full bg-black/80 border border-slate-800 backdrop-blur-md shadow-2xl font-mono text-xs text-slate-300">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Plane className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-white font-bold">{uavName}</span>
        </div>
        <div className="w-px h-4 bg-slate-700" />
        <div>
          <span className="text-slate-500">LAT: </span>
          <span className="text-white font-bold">
            {telemetry.latitude !== null && telemetry.latitude !== undefined
              ? telemetry.latitude.toFixed(5)
              : 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-slate-500">LNG: </span>
          <span className="text-white font-bold">
            {telemetry.longitude !== null && telemetry.longitude !== undefined
              ? telemetry.longitude.toFixed(5)
              : 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-slate-500">ALT: </span>
          <span className="text-cyan-400 font-bold">
            {Math.round(telemetry.altitudeFt ?? 14500)} FT
          </span>
        </div>
        <div>
          <span className="text-slate-500">SPD: </span>
          <span className="text-emerald-400 font-bold">
            {(telemetry.groundSpeedMs ?? 32.4).toFixed(1)} M/S
          </span>
        </div>
        <div>
          <span className="text-slate-500">HDG: </span>
          <span className="text-yellow-400 font-bold">
            {Math.round(telemetry.headingDeg ?? 139)}°
          </span>
        </div>
      </div>

      {/* =======================================================================
          BOTTOM-LEFT: CIRCULAR MISSION REPLAY & SHUTTLE HUD (Exact Screenshot Match)
          ======================================================================= */}
      <div className="absolute bottom-6 left-6 z-20 pointer-events-auto flex items-center gap-3">
        {/* Outer Circular Dial Housing */}
        <div className="relative w-28 h-28 rounded-full bg-slate-950/90 border-2 border-slate-700/80 p-1.5 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-lg flex flex-col items-center justify-center">
          {/* Outer Compass Tick Ring */}
          <div
            className="absolute inset-1 rounded-full border border-dashed border-slate-600/60 pointer-events-none transition-transform duration-300"
            style={{
              transform: `rotate(${Math.round(telemetry.headingDeg ?? 0)}deg)`,
            }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-1.5 h-1.5 bg-rose-500 rounded-full" />
          </div>

          {/* Speed Indicator (Clickable Cycle) */}
          <button
            onClick={() => {
              const speeds = [0.5, 1, 2, 4];
              const nextIndex = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
              if (onChangeSpeed) onChangeSpeed(speeds[nextIndex]);
            }}
            className="text-[11px] font-mono font-bold text-cyan-400 hover:text-white transition-colors cursor-pointer"
            title="Change Playback Speed (0.5x, 1x, 2x, 4x)"
          >
            {playbackSpeed}x
          </button>

          {/* UTC Military Timestamp */}
          <div className="text-[9px] font-mono text-slate-300 text-center leading-tight mt-0.5 tracking-tight font-semibold">
            {formatMilitaryUtc(currentTimestamp).split(' ').slice(0, 3).join(' ')}
            <br />
            <span className="text-emerald-400 font-bold">
              {formatMilitaryUtc(currentTimestamp).split(' ').slice(3).join(' ')}
            </span>
          </div>

          {/* Central Play/Pause Circular Action Button */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <button
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause Replay' : 'Play Mission Telemetry'}
              className="w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 border border-emerald-400/50 cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
              )}
            </button>

            {onStop && (
              <button
                onClick={onStop}
                title="Stop Replay"
                className="w-6 h-6 rounded-full bg-slate-800 hover:bg-rose-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-slate-600 cursor-pointer"
              >
                <Square className="w-2.5 h-2.5 fill-current" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =======================================================================
          BOTTOM: HORIZONTAL MISSION SCRUBBER TIMELINE (Exact Reference Layout)
          ======================================================================= */}
      <div className="absolute bottom-6 left-36 right-16 z-20 pointer-events-auto">
        <div className="relative w-full h-10 rounded-lg bg-black/85 border border-slate-700/80 shadow-2xl backdrop-blur-md px-3 flex flex-col justify-center overflow-hidden">
          {/* Tick Time Markers on Top of Track */}
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 px-1 mb-1 pointer-events-none">
            <span className="text-amber-400/90 font-semibold">
              {formatTickTime(
                new Date(new Date(currentTimestamp).getTime() - playbackIndex * 1000)
              )}
            </span>
            <span className="text-slate-500 hidden sm:inline">
              {formatTickTime(
                new Date(new Date(currentTimestamp).getTime() - (playbackIndex / 2) * 1000)
              )}
            </span>
            <span className="text-emerald-400 font-bold">
              {formatTickTime(currentTimestamp)}
            </span>
            <span className="text-slate-500 hidden sm:inline">
              {formatTickTime(
                new Date(new Date(currentTimestamp).getTime() + ((totalPoints - playbackIndex) / 2) * 1000)
              )}
            </span>
            <span className="text-slate-400">
              {formatTickTime(
                new Date(new Date(currentTimestamp).getTime() + (totalPoints - playbackIndex) * 1000)
              )}
            </span>
          </div>

          {/* Interactive Scrub Track */}
          <div
            className="relative w-full h-3 bg-slate-800/90 rounded-sm cursor-pointer overflow-hidden border border-slate-700"
            onClick={(e) => {
              if (!onSeek) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / rect.width));
              onSeek(Math.floor(ratio * totalPoints));
            }}
          >
            {/* Completed Mission Progress (Dark Amber / Olive matching reference) */}
            <div
              className="h-full bg-gradient-to-r from-amber-700 to-amber-500 transition-all duration-75"
              style={{ width: `${progressPercent}%` }}
            />

            {/* Inverted Triangle Needle Indicator */}
            <div
              className="absolute top-0 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-cyan-400 drop-shadow-md transition-all duration-75 pointer-events-none"
              style={{ left: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Center Bottom Brand Attribution Watermark */}
        <div className="text-center mt-1 text-[10px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
          VYOM DIGITAL TWIN &bull; 3D GEOSPATIAL UAV TRACKING SYSTEM
        </div>
      </div>

      {/* =======================================================================
          BOTTOM-RIGHT: FULLSCREEN TOGGLE BUTTON (Exact Reference Layout)
          ======================================================================= */}
      <div className="absolute bottom-6 right-4 z-20 pointer-events-auto">
        <button
          onClick={handleToggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          className="w-9 h-9 rounded-lg bg-black/85 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-colors shadow-2xl cursor-pointer"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* =======================================================================
          HELP & CONTROLS MODAL
          ======================================================================= */}
      {showHelpModal && (
        <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">3D Geospatial Navigation</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Left Mouse Drag:</span>
                <span className="text-white">Orbit / Rotate Globe</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Right Mouse Drag:</span>
                <span className="text-white">Continuous Altitude Zoom</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Middle Mouse / Scroll:</span>
                <span className="text-white">Pitch &amp; Tilt Horizon</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Search Icon:</span>
                <span className="text-white">Focus &amp; Center Aircraft</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Layers Icon:</span>
                <span className="text-white">Switch Imagery Providers</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Camera Icon:</span>
                <span className="text-white">Chase, Top-Down, Profile</span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
