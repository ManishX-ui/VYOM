/**
 * Engineering Formatters for Aero-Piston Engine Telemetry
 */

export function formatRPM(val: number): string {
  return `${Math.round(val).toLocaleString()} RPM`;
}

export function formatTemp(celsius: number): string {
  return `${Number(celsius).toFixed(1)} °C`;
}

export function formatPressure(bar: number): string {
  return `${Number(bar).toFixed(2)} bar`;
}

export function formatVibration(g: number): string {
  return `${Number(g).toFixed(2)} g`;
}

export function formatFuelFlow(lph: number): string {
  return `${Number(lph).toFixed(1)} L/hr`;
}

export function formatPercentage(val: number): string {
  return `${Math.round(val)}%`;
}

