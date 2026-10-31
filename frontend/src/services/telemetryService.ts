/**
 * Real-time Centralized Telemetry Service with WebSocket support,
 * connection monitoring, and disconnection handling.
 */

import { EngineTelemetry } from '../types';

export type TelemetryListener = (telemetry: EngineTelemetry) => void;
export type ConnectionStatusListener = (status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING') => void;

class TelemetryService {
  private ws: WebSocket | null = null;
  private listeners: Set<TelemetryListener> = new Set();
  private statusListeners: Set<ConnectionStatusListener> = new Set();
  private isConnecting = false;
  private reconnectTimeout: any = null;
  private heartbeatInterval: any = null;
  private status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' = 'DISCONNECTED';

  getStatus() {
    return this.status;
  }

  private setStatus(newStatus: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING') {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((fn) => fn(newStatus));
    }
  }

  connect(wsUrl?: string) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus(this.status === 'DISCONNECTED' ? 'CONNECTING' : 'RECONNECTING');
    this.isConnecting = true;

    const defaultUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000')
      .replace(/^http/, 'ws') + '/api/v1/telemetry/ws';
    const targetUrl = wsUrl || defaultUrl;

    try {
      this.ws = new WebSocket(targetUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.setStatus('CONNECTED');
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data: EngineTelemetry = JSON.parse(event.data);
          this.notify(data);
        } catch (e) {
          // non-json frame
        }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.ws = null;
        this.isConnecting = false;
        this.setStatus('DISCONNECTED');
        // Retry connection after 3 seconds
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connect(targetUrl);
          }, 3000);
        }
      };

      this.ws.onerror = () => {
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch (e) {
      this.isConnecting = false;
      this.setStatus('DISCONNECTED');
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'heartbeat' }));
      }
    }, 10000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  sendAction(action: string, payload: Record<string, any> = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action, ...payload }));
    }
  }

  setMode(mode: 'DEMO' | 'REPLAY' | 'LIVE') {
    this.sendAction('set_mode', { mode });
  }

  setScenario(scenario: string) {
    this.sendAction('set_scenario', { scenario });
  }

  selectUAV(uav_id: string) {
    this.sendAction('select_uav', { uav_id });
  }

  subscribe(listener: TelemetryListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeStatus(listener: ConnectionStatusListener) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  notify(data: EngineTelemetry) {
    this.listeners.forEach((listener) => listener(data));
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('DISCONNECTED');
  }
}

export const telemetryService = new TelemetryService();
