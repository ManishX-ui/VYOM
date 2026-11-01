import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UAVConfig,
  EngineTelemetry,
  AlertRecord,
  SensorRecord,
  AnomalyRecord,
  MissionRecord,
  NotificationItem,
} from '../types';
import {
  INITIAL_PAIRED_UAVS,
  CURRENT_TELEMETRY,
  INITIAL_ALERTS,
  SENSORS_LIST,
  ANOMALIES_LIST,
  DEMO_MISSIONS,
} from '../data/demoData';
import { telemetryService } from '../services/telemetryService';
import { apiService } from '../services/api';

interface UserSession {
  email: string;
  name: string;
  role: string;
  callsign: string;
  isAuthenticated: boolean;
}

interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

interface AppContextType {
  user: UserSession;
  login: (email: string) => boolean;
  logout: () => void;
  pairedUAVs: UAVConfig[];
  selectedUAV: UAVConfig;
  selectUAV: (id: string) => void;
  pairNewUAV: (uav: Omit<UAVConfig, 'id' | 'status' | 'flightHours' | 'healthScore'>) => void;
  telemetry: EngineTelemetry;
  sensors: SensorRecord[];
  anomalies: AnomalyRecord[];
  alerts: AlertRecord[];
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  markNotificationRead: (id: string) => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  investigateAlert: (alertId: string, notes?: string) => Promise<void>;
  resolveAlert: (alertId: string, notes?: string) => Promise<void>;
  dismissAlert: (alertId: string, reason: string) => Promise<void>;
  isSimulating: boolean;
  toggleSimulation: () => void;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  showToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  currentTimeString: string;
  currentDateString: string;
  // Phase 3 Centralized Telemetry Additions
  backendConnectionStatus: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';
  telemetryMode: 'DEMO' | 'REPLAY' | 'LIVE';
  setTelemetryMode: (mode: 'DEMO' | 'REPLAY' | 'LIVE') => void;
  simulationScenario: string;
  setSimulationScenario: (scenario: string) => void;
  // Phase 7 Centralized Replay Engine Additions
  activeReplayMission: MissionRecord | null;
  replayPlaybackIndex: number;
  isReplayPlaying: boolean;
  replayPlaybackSpeed: number;
  setReplayMission: (mission: MissionRecord) => void;
  setReplayPlaybackIndex: (index: number) => void;
  setIsReplayPlaying: (playing: boolean) => void;
  setReplayPlaybackSpeed: (speed: number) => void;
  stepReplay: (delta: number) => void;
  stopReplay: () => void;
  restartReplay: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'vyom_demo_user';
const LOCAL_STORAGE_UAVS_KEY = 'vyom_demo_paired_uavs';
const LOCAL_STORAGE_SELECTED_UAV_KEY = 'vyom_demo_selected_uav_id';
const LOCAL_STORAGE_ALERTS_KEY = 'vyom_demo_alerts';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // User session
  const [user, setUser] = useState<UserSession>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      email: 'admin@vyom.aero',
      name: 'Omkar Sahu',
      role: 'Chief Avionics & Propulsion Engineer',
      callsign: 'OS',
      isAuthenticated: true,
    };
  });

  // Paired UAVs
  const [pairedUAVs, setPairedUAVs] = useState<UAVConfig[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_UAVS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_PAIRED_UAVS;
  });

  // Selected UAV
  const [selectedUAVId, setSelectedUAVId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SELECTED_UAV_KEY);
      if (saved) return saved;
    } catch (e) {
      console.error(e);
    }
    return INITIAL_PAIRED_UAVS[0].id;
  });

  const selectedUAV = pairedUAVs.find((u) => u.id === selectedUAVId) || pairedUAVs[0] || INITIAL_PAIRED_UAVS[0];

  // Alerts
  const [alerts, setAlerts] = useState<AlertRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_ALERTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_ALERTS;
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // Telemetry & Sensors
  const [telemetry, setTelemetry] = useState<EngineTelemetry>(CURRENT_TELEMETRY);
  const [sensors, setSensors] = useState<SensorRecord[]>(SENSORS_LIST);
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>(ANOMALIES_LIST);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Real-time browser clock
  const [now, setNow] = useState<Date>(new Date());

  // Centralized Telemetry & Connection State (Phase 3)
  const [backendConnectionStatus, setBackendConnectionStatus] = useState<
    'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING'
  >('DISCONNECTED');
  const [telemetryMode, setTelemetryModeState] = useState<'DEMO' | 'REPLAY' | 'LIVE'>('DEMO');
  const [simulationScenario, setSimulationScenarioState] = useState<string>('NORMAL_CRUISE');

  // Centralized Replay State & Clock (Phase 7)
  const [activeReplayMission, setActiveReplayMission] = useState<MissionRecord | null>(DEMO_MISSIONS[0]);
  const [replayPlaybackIndex, setReplayPlaybackIndex] = useState<number>(0);
  const [isReplayPlaying, setIsReplayPlaying] = useState<boolean>(false);
  const [replayPlaybackSpeed, setReplayPlaybackSpeed] = useState<number>(1);

  const setReplayMission = (mission: MissionRecord) => {
    setActiveReplayMission(mission);
    setReplayPlaybackIndex(0);
    setIsReplayPlaying(false);
    if (mission.uavId && mission.uavId !== selectedUAVId) {
      const matched = pairedUAVs.find((u) => u.id === mission.uavId);
      if (matched) {
        setSelectedUAVId(mission.uavId);
      }
    }
  };

  const stepReplay = (delta: number) => {
    if (!activeReplayMission || !activeReplayMission.timeline || activeReplayMission.timeline.length === 0) return;
    const maxIdx = activeReplayMission.timeline.length - 1;
    setReplayPlaybackIndex((prev) => Math.max(0, Math.min(maxIdx, prev + delta)));
  };

  const stopReplay = () => {
    setIsReplayPlaying(false);
    setReplayPlaybackIndex(0);
  };

  const restartReplay = () => {
    setReplayPlaybackIndex(0);
    setIsReplayPlaying(true);
  };

  const setTelemetryMode = (mode: 'DEMO' | 'REPLAY' | 'LIVE') => {
    setTelemetryModeState(mode);
    telemetryService.setMode(mode);
    showToast(`Operating Mode: ${mode}`, `Telemetry pipeline switched to ${mode} mode`, 'info');
  };

  const setSimulationScenario = (scenario: string) => {
    setSimulationScenarioState(scenario);
    telemetryService.setScenario(scenario);
    showToast(`Simulation Scenario`, `Activated scenario: ${scenario}`, 'info');
  };

  // Centralized Replay Clock (Single Timer for all components)
  useEffect(() => {
    if (!isReplayPlaying || !activeReplayMission || !activeReplayMission.timeline || activeReplayMission.timeline.length === 0) {
      return;
    }

    const intervalMs = Math.max(250, Math.round(1000 / replayPlaybackSpeed));
    const timer = setInterval(() => {
      setReplayPlaybackIndex((prev) => {
        const maxIdx = activeReplayMission.timeline.length - 1;
        if (prev >= maxIdx) {
          setIsReplayPlaying(false);
          return maxIdx;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isReplayPlaying, replayPlaybackSpeed, activeReplayMission]);

  // Synchronize Active Replay Point to Telemetry and Sensors across Dashboard, Engine Health, Sensors
  useEffect(() => {
    if (telemetryMode !== 'REPLAY' || !activeReplayMission || !activeReplayMission.timeline || activeReplayMission.timeline.length === 0) {
      return;
    }

    const point = activeReplayMission.timeline[replayPlaybackIndex] || activeReplayMission.timeline[0];
    if (!point) return;

    // Synchronize Engine & Flight Telemetry
    setTelemetry({
      rpm: point.rpm,
      cht: point.cht,
      egt: point.egt ?? 615,
      oilPressure: point.oilPressure,
      oilTemperature: point.oilTemperature ?? 95,
      fuelFlow: point.fuelFlow,
      vibrationRMS: point.vibration,
      injectionTiming: 26.2,
      manifoldPressureInHg: point.manifoldPressureInHg ?? 31.0,
      coolantTemp: point.coolantTemp ?? Math.round(point.cht * 0.47),
      fuelPressure: point.fuelPressure ?? 3.2,
      batteryVoltage: point.batteryVoltage ?? 28.2,
      batteryCurrent: point.batteryCurrent ?? 14.5,
      batterySoc: point.battery ?? 95,
      engineHealth: point.engineHealth ?? 95,
      latitude: point.lat,
      longitude: point.lng,
      altitudeFt: point.altitude,
      groundSpeedMs: point.speed,
      headingDeg: point.heading,
      rollDeg: point.roll ?? 0,
      pitchDeg: point.pitch ?? 0,
      verticalSpeedMs: point.verticalSpeed ?? 0,
      timestamp: point.time,
      mode: 'REPLAY',
      is_simulated: false,
    });

    // Synchronize all 18 Sensors to the exact historical replay timestamp
    setSensors((prevSensors) =>
      prevSensors.map((s) => {
        let val: number | null = s.value;
        if (s.id === 'SENS-ENG-001') val = point.rpm;
        else if (s.id === 'SENS-ENG-002') val = point.cht;
        else if (s.id === 'SENS-ENG-003') val = Number((point.cht + 2.0).toFixed(1));
        else if (s.id === 'SENS-ENG-004') val = point.egt ?? 615;
        else if (s.id === 'SENS-ENG-005') val = point.oilPressure;
        else if (s.id === 'SENS-ENG-006') val = point.oilTemperature ?? 95;
        else if (s.id === 'SENS-ENG-007') val = point.manifoldPressureInHg ?? 31.0;
        else if (s.id === 'SENS-ENG-008') val = point.fuelFlow;
        else if (s.id === 'SENS-ENG-009') val = point.vibration;
        else if (s.id === 'SENS-FLT-001') val = point.lat;
        else if (s.id === 'SENS-FLT-002') val = point.lng;
        else if (s.id === 'SENS-FLT-003') val = point.altitude;
        else if (s.id === 'SENS-FLT-004') val = point.speed;
        else if (s.id === 'SENS-FLT-005') val = point.heading;
        else if (s.id === 'SENS-FLT-006') val = point.roll ?? 0;
        else if (s.id === 'SENS-ELEC-001') val = point.batteryVoltage ?? 28.2;
        else if (s.id === 'SENS-ELEC-002') val = point.batteryCurrent ?? 14.5;
        else if (s.id === 'SENS-ELEC-003') val = point.battery ?? 95;

        return {
          ...s,
          value: val,
          lastUpdate: point.time,
          operatingMode: 'REPLAY',
        };
      })
    );
  }, [telemetryMode, activeReplayMission, replayPlaybackIndex]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentTimeString = now.toLocaleTimeString('en-GB', { hour12: false });
  const currentDateString = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Connect to centralized backend WebSocket
  useEffect(() => {
    const unsubTelemetry = telemetryService.subscribe((liveTelemetry) => {
      // In REPLAY mode, never overwrite historical replay playback with incoming live/demo stream
      if (telemetryMode !== 'REPLAY') {
        setTelemetry(liveTelemetry);
      }
      if (liveTelemetry.mode) {
        setTelemetryModeState(liveTelemetry.mode);
      }
    });

    const unsubStatus = telemetryService.subscribeStatus((status) => {
      setBackendConnectionStatus(status);
    });

    telemetryService.connect();

    return () => {
      unsubTelemetry();
      unsubStatus();
      telemetryService.disconnect();
    };
  }, [telemetryMode]);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_UAVS_KEY, JSON.stringify(pairedUAVs));
    } catch (e) {
      console.error(e);
    }
  }, [pairedUAVs]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_SELECTED_UAV_KEY, selectedUAVId);
      telemetryService.selectUAV(selectedUAVId);
    } catch (e) {
      console.error(e);
    }
  }, [selectedUAVId]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_ALERTS_KEY, JSON.stringify(alerts));
    } catch (e) {
      console.error(e);
    }
  }, [alerts]);

  // Telemetry drift simulation fallback (Active ONLY when backend WebSocket is disconnected)
  useEffect(() => {
    if (!isSimulating || backendConnectionStatus === 'CONNECTED') return;
    const interval = setInterval(() => {
      setTelemetry((prev) => {
        const rpmJitter = Math.floor(Math.sin(Date.now() / 4000) * 8);
        const chtJitter = Number((Math.cos(Date.now() / 6000) * 0.4).toFixed(1));
        const egtJitter = Number((Math.sin(Date.now() / 5500) * 1.2).toFixed(1));
        const vibJitter = Number((Math.sin(Date.now() / 3000) * 0.01).toFixed(2));
        const oilJitter = Number((Math.cos(Date.now() / 5000) * 0.02).toFixed(2));
        const oilTempJitter = Number((Math.sin(Date.now() / 6500) * 0.3).toFixed(1));
        const fuelJitter = Number((Math.sin(Date.now() / 7000) * 0.05).toFixed(1));
        const injectionJitter = Number((Math.cos(Date.now() / 4500) * 0.1).toFixed(1));

        return {
          ...prev,
          rpm: Math.round(2450 + rpmJitter),
          cht: Math.round(187 + chtJitter),
          egt: Math.round(620 + egtJitter),
          oilPressure: Number((4.2 + oilJitter).toFixed(1)),
          oilTemperature: Number((96 + oilTempJitter).toFixed(1)),
          fuelFlow: Number((12.5 + fuelJitter).toFixed(1)),
          vibrationRMS: Number(Math.max(0.24, Math.min(0.32, 0.28 + vibJitter)).toFixed(2)),
          injectionTiming: Number((26.5 + injectionJitter).toFixed(1)),
          timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulating, backendConnectionStatus]);

  // Synchronize Sensors with Centralized Backend Service (Phase 5)
  useEffect(() => {
    let isMounted = true;
    const fetchSensors = async () => {
      try {
        const backendSensors = await apiService.getSensors(selectedUAVId);
        if (isMounted && Array.isArray(backendSensors) && backendSensors.length > 0) {
          setSensors(backendSensors);
        }
      } catch (err) {
        // Fallback gracefully
      }
    };

    fetchSensors();
    const interval = setInterval(fetchSensors, 1500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedUAVId, backendConnectionStatus, telemetryMode]);

  // Synchronize Anomalies with Centralized Backend Service (Phase 8)
  useEffect(() => {
    let isMounted = true;
    const fetchAnomalies = async () => {
      try {
        const backendAnomalies = await apiService.getAnomalies(selectedUAVId);
        if (isMounted && Array.isArray(backendAnomalies) && backendAnomalies.length > 0) {
          setAnomalies(backendAnomalies);
        }
      } catch (err) {
        // Fallback gracefully
      }
    };

    fetchAnomalies();
    const interval = setInterval(fetchAnomalies, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedUAVId, backendConnectionStatus, telemetryMode]);

  // Synchronize Alerts & Real-Time Notification Queue (Phase 10)
  useEffect(() => {
    let isMounted = true;
    const fetchAlertsAndNotifications = async () => {
      try {
        const backendAlerts = await apiService.getAlerts(selectedUAVId);
        if (isMounted && Array.isArray(backendAlerts) && backendAlerts.length > 0) {
          setAlerts(backendAlerts);
        }
        const backendNotifs = await apiService.getNotifications({ uavId: selectedUAVId, limit: 30 });
        if (isMounted && Array.isArray(backendNotifs)) {
          setNotifications(backendNotifs);
        }
      } catch (err) {
        // Fallback gracefully
      }
    };

    fetchAlertsAndNotifications();
    const interval = setInterval(fetchAlertsAndNotifications, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedUAVId, backendConnectionStatus, telemetryMode]);

  const showToast = (
    title: string,
    message?: string,
    type: 'success' | 'warning' | 'error' | 'info' = 'info'
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const login = (email: string) => {
    setUser({
      email: email || 'admin@vyom.aero',
      name: 'Omkar Sahu',
      role: 'Chief Avionics & Propulsion Engineer',
      callsign: 'OS',
      isAuthenticated: true,
    });
    showToast('Authentication Successful', 'Signed in as Mission Commander / Engineer', 'success');
    return true;
  };

  const logout = () => {
    setUser((prev) => ({ ...prev, isAuthenticated: false }));
    showToast('Session Ended', 'Logged out of VYOM Platform', 'info');
  };

  const selectUAV = (id: string) => {
    setSelectedUAVId(id);
    const target = pairedUAVs.find((u) => u.id === id);
    if (target) {
      showToast('UAV Telemetry Switched', `Connected to ${target.name}`, 'info');
    }
  };

  const pairNewUAV = (uavData: Omit<UAVConfig, 'id' | 'status' | 'flightHours' | 'healthScore'>) => {
    const newId = `UAV-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const newUAV: UAVConfig = {
      ...uavData,
      id: newId,
      status: 'ONLINE',
      flightHours: 12.4,
      healthScore: 98,
    };
    setPairedUAVs((prev) => [newUAV, ...prev]);
    setSelectedUAVId(newId);
    showToast('New UAV Paired Successfully', `Paired with ${newUAV.name}`, 'success');

    // Notify backend if online
    apiService.pairUAV(newUAV).catch(() => {});
  };

  const markNotificationRead = async (id: string) => {
    try {
      await apiService.markNotificationRead(id);
    } catch {}
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const acknowledgeAlert = async (alertId: string) => {
    const ackBy = `${user.name} (${user.callsign})`;
    try {
      const updated = await apiService.acknowledgeAlert(alertId, ackBy);
      setAlerts((prev) => prev.map((alt) => (alt.id === alertId ? updated : alt)));
    } catch {
      setAlerts((prev) =>
        prev.map((alt) =>
          alt.id === alertId
            ? {
                ...alt,
                status: 'Acknowledged',
                acknowledgedBy: ackBy,
                acknowledgedAt: new Date().toLocaleTimeString('en-GB', { hour12: false }),
              }
            : alt
        )
      );
    }
    showToast('Alert Acknowledged', `Alert ${alertId} acknowledged by ${user.callsign}`, 'info');
  };

  const investigateAlert = async (alertId: string, notes?: string) => {
    const op = `${user.name} (${user.callsign})`;
    try {
      const updated = await apiService.investigateAlert(alertId, op, notes);
      setAlerts((prev) => prev.map((alt) => (alt.id === alertId ? updated : alt)));
    } catch {
      setAlerts((prev) =>
        prev.map((alt) =>
          alt.id === alertId
            ? {
                ...alt,
                status: 'Investigating',
                investigatedBy: op,
                investigatedAt: new Date().toLocaleTimeString('en-GB', { hour12: false }),
              }
            : alt
        )
      );
    }
    showToast('Investigation Started', `Alert ${alertId} marked as investigating`, 'info');
  };

  const resolveAlert = async (alertId: string, notes?: string) => {
    const resNotes = notes || 'Verified sensor readings within baseline threshold limits.';
    const resBy = `${user.name} (${user.callsign})`;
    try {
      const updated = await apiService.resolveAlert(alertId, resNotes, resBy);
      setAlerts((prev) => prev.map((alt) => (alt.id === alertId ? updated : alt)));
    } catch {
      setAlerts((prev) =>
        prev.map((alt) =>
          alt.id === alertId
            ? {
                ...alt,
                status: 'Resolved',
                resolutionNotes: resNotes,
                resolvedBy: resBy,
                resolvedAt: new Date().toLocaleTimeString('en-GB', { hour12: false }),
              }
            : alt
        )
      );
    }
    showToast('Alert Resolved', `Alert ${alertId} marked as resolved`, 'success');
  };

  const dismissAlert = async (alertId: string, reason: string) => {
    const op = `${user.name} (${user.callsign})`;
    try {
      const updated = await apiService.dismissAlert(alertId, op, reason);
      setAlerts((prev) => prev.map((alt) => (alt.id === alertId ? updated : alt)));
      showToast('Alert Dismissed', `Alert ${alertId} dismissed`, 'info');
    } catch (err: any) {
      const msg = err?.message || 'CRITICAL/HIGH alerts cannot be dismissed without formal resolution.';
      showToast('Dismissal Blocked', msg, 'error');
      throw err;
    }
  };

  const toggleSimulation = () => {
    setIsSimulating((prev) => !prev);
    showToast(
      isSimulating ? 'Telemetry Stream Paused' : 'Live Telemetry Stream Active',
      isSimulating ? 'Static snapshot frozen' : 'Streaming live telemetry variations',
      'info'
    );
  };

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        logout,
        pairedUAVs,
        selectedUAV,
        selectUAV,
        pairNewUAV,
        telemetry,
        sensors,
        anomalies,
        alerts,
        notifications,
        unreadNotificationsCount,
        markNotificationRead,
        acknowledgeAlert,
        investigateAlert,
        resolveAlert,
        dismissAlert,
        isSimulating,
        toggleSimulation,
        toasts,
        dismissToast,
        showToast,
        currentTimeString,
        currentDateString,
        backendConnectionStatus,
        telemetryMode,
        setTelemetryMode,
        simulationScenario,
        setSimulationScenario,
        activeReplayMission,
        replayPlaybackIndex,
        isReplayPlaying,
        replayPlaybackSpeed,
        setReplayMission,
        setReplayPlaybackIndex,
        setIsReplayPlaying,
        setReplayPlaybackSpeed,
        stepReplay,
        stopReplay,
        restartReplay,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

