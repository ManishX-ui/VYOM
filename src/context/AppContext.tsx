import React, { createContext, useContext, useState, useEffect } from 'react';
import { UAVConfig, EngineTelemetry, AlertRecord, SensorRecord, AnomalyRecord } from '../types';
import {
  INITIAL_PAIRED_UAVS,
  CURRENT_TELEMETRY,
  INITIAL_ALERTS,
  SENSORS_LIST,
  ANOMALIES_LIST,
} from '../data/demoData';

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
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string, notes?: string) => void;
  isSimulating: boolean;
  toggleSimulation: () => void;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  showToast: (title: string, message?: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  currentTimeString: string;
  currentDateString: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'vyom_demo_user';
const LOCAL_STORAGE_UAVS_KEY = 'vyom_demo_paired_uavs';
const LOCAL_STORAGE_SELECTED_UAV_KEY = 'vyom_demo_selected_uav_id';
const LOCAL_STORAGE_ALERTS_KEY = 'vyom_demo_alerts';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Demo user session
  const [user, setUser] = useState<UserSession>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // Default to authenticated demo state for convenience, or unauthenticated if first time
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

  // Telemetry & Sensors
  const [telemetry, setTelemetry] = useState<EngineTelemetry>(CURRENT_TELEMETRY);
  const [sensors, setSensors] = useState<SensorRecord[]>(SENSORS_LIST);
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>(ANOMALIES_LIST);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Real-time browser clock
  const [now, setNow] = useState<Date>(new Date());

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

  // Subtle controlled telemetry drift simulation (keeps values realistic around nominals)
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      setTelemetry((prev) => {
        // Minor realistic fluctuations around 2450 RPM, 187 CHT, 620 EGT, 4.2 bar, 96 °C, 12.5 L/hr, 0.28 g, 26.5°
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
  }, [isSimulating]);

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
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((alt) =>
        alt.id === alertId
          ? {
              ...alt,
              status: 'Acknowledged',
              acknowledgedBy: `${user.name} (${user.callsign})`,
              acknowledgedAt: new Date().toLocaleTimeString('en-GB', { hour12: false }),
            }
          : alt
      )
    );
    showToast('Alert Acknowledged', `Alert ${alertId} acknowledged by ${user.callsign}`, 'info');
  };

  const resolveAlert = (alertId: string, notes?: string) => {
    setAlerts((prev) =>
      prev.map((alt) =>
        alt.id === alertId
          ? {
              ...alt,
              status: 'Resolved',
              resolutionNotes: notes || 'Verified sensor readings within baseline threshold limits.',
            }
          : alt
      )
    );
    showToast('Alert Resolved', `Alert ${alertId} marked as resolved`, 'success');
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
        acknowledgeAlert,
        resolveAlert,
        isSimulating,
        toggleSimulation,
        toasts,
        dismissToast,
        showToast,
        currentTimeString,
        currentDateString,
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
