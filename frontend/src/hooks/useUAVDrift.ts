import { useState, useEffect } from 'react';

export interface UAVPosition {
  lat: number;
  lng: number;
  altFt: number;
  speedMs: number;
  headingDeg: number;
}

export function useUAVDrift(initialPos: UAVPosition = {
  lat: 21.2685,
  lng: 81.6502,
  altFt: 18000,
  speedMs: 32.1,
  headingDeg: 135,
}) {
  const [position, setPosition] = useState<UAVPosition>(initialPos);

  useEffect(() => {
    const timer = setInterval(() => {
      setPosition((prev) => {
        const dLat = Math.sin(Date.now() / 4000) * 0.0003;
        const dLng = Math.cos(Date.now() / 4000) * 0.0004;
        return {
          ...prev,
          lat: Number((initialPos.lat + dLat).toFixed(4)),
          lng: Number((initialPos.lng + dLng).toFixed(4)),
          headingDeg: initialPos.headingDeg + Math.round(Math.sin(Date.now() / 5000) * 4),
        };
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [initialPos.lat, initialPos.lng, initialPos.headingDeg]);

  return position;
}

