import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { DEMO_MISSIONS } from '../../data/demoData';
import {
  CesiumGeospatialTracker,
  MultiUAVTarget,
} from '../../components/geospatial/CesiumGeospatialTracker';
import { EngineTelemetry } from '../../types';
import {
  Plane,
  Radio,
  PlayCircle,
  Activity,
  Layers,
  Sparkles,
  Shield,
  RotateCcw,
} from 'lucide-react';

export const GeospatialTrackingPage: React.FC = () => {
  const {
    selectedUAV,
    pairedUAVs,
    selectUAV,
    telemetry,
    telemetryMode,
    setTelemetryMode,
    activeReplayMission,
    replayPlaybackIndex,
    isReplayPlaying,
    replayPlaybackSpeed,
    setIsReplayPlaying,
    setReplayPlaybackIndex,
    setReplayPlaybackSpeed,
    stopReplay,
  } = useApp();

  const [activeTrackingMode, setActiveTrackingMode] = useState<'DEMO' | 'LIVE' | 'REPLAY'>(
    telemetryMode
  );

  // Sync mode if changed globally
  useEffect(() => {
    setActiveTrackingMode(telemetryMode);
  }, [telemetryMode]);

  // Demo Mission selection & coordinates
  const mission = activeReplayMission || DEMO_MISSIONS[0];
  const waypoints = mission.waypoints || [];

  // Multi-UAV fleet list with dynamic positions
  const availableFleet: MultiUAVTarget[] = useMemo(() => {
    return pairedUAVs.map((uav, idx) => {
      // Offset fleet aircraft slightly around central India for realistic surveillance formation
      const offsetLat = (idx - 1) * 0.045;
      const offsetLng = (idx - 1) * 0.035;
      const isSelected = uav.id === selectedUAV.id;

      return {
        id: uav.id,
        name: uav.name,
        callsign: `EAGLE-${idx + 1}`,
        lat: isSelected ? (telemetry.latitude ?? 21.25) : 21.25 + offsetLat,
        lng: isSelected ? (telemetry.longitude ?? 81.63) : 81.63 + offsetLng,
        altFt: isSelected ? (telemetry.altitudeFt ?? 14500) : 13800 + idx * 800,
        headingDeg: isSelected ? (telemetry.headingDeg ?? 139) : (120 + idx * 25) % 360,
        pitchDeg: isSelected ? (telemetry.pitchDeg ?? 0) : 1.2,
        rollDeg: isSelected ? (telemetry.rollDeg ?? 0) : -2.5,
        speedMs: isSelected ? (telemetry.groundSpeedMs ?? 32.4) : 30 + idx * 2,
        flightMode: isSelected ? (telemetry.flight_mode ?? 'QLOITER') : 'CRUISE',
        status: uav.status === 'ONLINE' ? 'ACTIVE' : 'STANDBY',
        color: idx === 0 ? '#38bdf8' : idx === 1 ? '#a855f7' : '#f59e0b',
      };
    });
  }, [pairedUAVs, selectedUAV.id, telemetry]);

  // Handle mode switch
  const handleModeChange = (mode: 'DEMO' | 'LIVE' | 'REPLAY') => {
    setActiveTrackingMode(mode);
    setTelemetryMode(mode);
  };

  // Trajectory points accumulation for current mission
  const missionTrail: [number, number, number?][] = useMemo(() => {
    if (activeTrackingMode === 'REPLAY' && mission.timeline) {
      const currentPoints = mission.timeline.slice(0, replayPlaybackIndex + 1);
      return currentPoints.map((p) => [p.lat, p.lng, (p.altitude || 14500) * 0.3048]);
    }
    return [];
  }, [activeTrackingMode, mission.timeline, replayPlaybackIndex]);

  // Current Replay Telemetry Point
  const currentTelemetry: EngineTelemetry = useMemo(() => {
    if (activeTrackingMode === 'REPLAY' && mission.timeline && mission.timeline.length > 0) {
      const pt = mission.timeline[replayPlaybackIndex] || mission.timeline[0];
      return {
        ...telemetry,
        latitude: pt.lat,
        longitude: pt.lng,
        altitudeFt: pt.altitude || 14500,
        groundSpeedMs: pt.speed || 32,
        headingDeg: pt.heading || 139,
        rollDeg: pt.roll || 0,
        pitchDeg: pt.pitch || 0,
        rpm: pt.rpm || 5800,
        cht: pt.cht || 142,
        egt: pt.egt || 720,
        oilPressure: pt.oilPressure || 4.2,
        oilTemperature: pt.oilTemperature || 88,
        fuelFlow: pt.fuelFlow || 18.5,
        vibrationRMS: pt.vibration || 1.2,
        flight_mode: pt.segmentType || 'QLOITER',
        timestamp: pt.time || telemetry.timestamp,
      };
    }
    return telemetry;
  }, [activeTrackingMode, mission.timeline, replayPlaybackIndex, telemetry]);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col bg-slate-950 overflow-hidden">
      {/* Top Floating Mini Header / Fleet Switcher & Mode Toggles */}
      <div className="absolute top-4 left-44 z-30 flex items-center gap-2 pointer-events-auto">
        {/* Operational Mode Pills */}
        <div className="flex items-center p-1 rounded-xl bg-black/85 border border-slate-700/80 backdrop-blur-md shadow-2xl">
          {(['DEMO', 'LIVE', 'REPLAY'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                activeTrackingMode === mode
                  ? mode === 'LIVE'
                    ? 'bg-rose-600 text-white shadow-lg'
                    : mode === 'REPLAY'
                    ? 'bg-amber-600 text-white shadow-lg'
                    : 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode === 'DEMO' ? 'SIMULATION' : mode}
            </button>
          ))}
        </div>

        {/* Multi-UAV Fleet Selector Pill */}
        <div className="flex items-center p-1 rounded-xl bg-black/85 border border-slate-700/80 backdrop-blur-md shadow-2xl">
          {pairedUAVs.map((uav) => (
            <button
              key={uav.id}
              onClick={() => selectUAV(uav.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                selectedUAV.id === uav.id
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Plane className="w-3.5 h-3.5" />
              <span>{uav.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main 3D Cesium Tracking Viewport (Occupies 100% of available space) */}
      <div className="w-full h-full relative">
        <CesiumGeospatialTracker
          uavId={selectedUAV.id}
          uavName={selectedUAV.name}
          mode={activeTrackingMode}
          telemetry={currentTelemetry}
          playbackIndex={replayPlaybackIndex}
          totalPoints={mission.timeline?.length || 100}
          isPlaying={isReplayPlaying}
          playbackSpeed={replayPlaybackSpeed}
          onTogglePlay={() => setIsReplayPlaying(!isReplayPlaying)}
          onStop={stopReplay}
          onSeek={(idx) => setReplayPlaybackIndex(idx)}
          onChangeSpeed={(spd) => setReplayPlaybackSpeed(spd)}
          waypoints={waypoints}
          flightTrail={missionTrail}
          availableFleet={availableFleet}
          onSelectUAV={selectUAV}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};
