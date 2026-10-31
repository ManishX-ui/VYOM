import { useState, useEffect } from 'react';
import { EngineTelemetry } from '../types';
import { CURRENT_TELEMETRY } from '../data/demoData';
import { telemetryService } from '../services/telemetryService';

export function useTelemetry(isSimulating: boolean = true) {
  const [telemetry, setTelemetry] = useState<EngineTelemetry>(CURRENT_TELEMETRY);

  useEffect(() => {
    // Attempt WebSocket subscription if backend is available
    const unsubscribe = telemetryService.subscribe((data) => {
      setTelemetry(data);
    });
    telemetryService.connect();

    return () => {
      unsubscribe();
    };
  }, []);

  return { telemetry, setTelemetry };
}

