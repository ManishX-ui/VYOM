import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { AdminLoginPage } from './pages/AdminLogin';
import { ConnectUAVPage } from './pages/ConnectUAV';
import { DashboardPage } from './pages/Dashboard';
import { EngineHealthPage } from './pages/EngineHealth';
import { SensorMonitoringPage } from './pages/SensorMonitoring';
import { LocationTrackingPage } from './pages/LocationTracking';
import { MissionReplayPage } from './pages/MissionReplay';
import { AnomalyDetectionPage } from './pages/AnomalyDetection';
import { FaultPredictionPage } from './pages/FaultPrediction';
import { AlertHistoryPage } from './pages/AlertHistory';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing & Admin Login */}
          <Route path="/" element={<AdminLoginPage />} />
          <Route path="/login" element={<AdminLoginPage />} />

          {/* Connect & Pair UAV Selection Page */}
          <Route path="/connect-uav" element={<ConnectUAVPage />} />

          {/* Protected Application Shell */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="engine-health" element={<EngineHealthPage />} />
            <Route path="sensors" element={<SensorMonitoringPage />} />
            <Route path="tracking" element={<LocationTrackingPage />} />
            <Route path="mission-replay" element={<MissionReplayPage />} />
            <Route path="anomalies" element={<AnomalyDetectionPage />} />
            <Route path="predictions" element={<FaultPredictionPage />} />
            <Route path="alerts" element={<AlertHistoryPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
