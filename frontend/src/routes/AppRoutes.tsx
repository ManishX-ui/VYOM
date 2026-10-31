import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { AdminLoginPage } from '../pages/AdminLogin';
import { ConnectUAVPage } from '../pages/ConnectUAV';
import { DashboardPage } from '../pages/Dashboard';
import { EngineHealthPage } from '../pages/EngineHealth';
import { SensorMonitoringPage } from '../pages/SensorMonitoring';
import { LocationTrackingPage } from '../pages/LocationTracking';
import { MissionReplayPage } from '../pages/MissionReplay';
import { AnomalyDetectionPage } from '../pages/AnomalyDetection';
import { FaultPredictionPage } from '../pages/FaultPrediction';
import { AlertHistoryPage } from '../pages/AlertHistory';
import { DatalinkMonitoringPage } from '../pages/DatalinkMonitoring';
import { DigitalTwinPage } from '../pages/DigitalTwin';
import { GeospatialTrackingPage } from '../pages/GeospatialTracking';

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

export const AppRoutes: React.FC = () => {
  return (
    <>
      <ScrollToTop />
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
          <Route path="geospatial-tracking" element={<GeospatialTrackingPage />} />
          <Route path="mission-replay" element={<MissionReplayPage />} />
          <Route path="anomalies" element={<AnomalyDetectionPage />} />
          <Route path="predictions" element={<FaultPredictionPage />} />
          <Route path="alerts" element={<AlertHistoryPage />} />
          <Route path="datalink" element={<DatalinkMonitoringPage />} />
          <Route path="digital-twin" element={<DigitalTwinPage />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

