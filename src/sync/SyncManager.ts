// ═══════════════════════════════════════════════════════════════════
// 🌐 Sea POS - Sync Manager
// ═══════════════════════════════════════════════════════════════════
// يدير اتصال WebSocket مع الخادم + تزامن البيانات بين الأجهزة

export type SyncClient = {
  id: string;
  name: string;
  role: string;
  ip: string;
  joinedAt: number;
};

export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type SyncMessage = {
  type: string;
  data: any;
  timestamp: number;
};

type SyncListener = (msg: SyncMessage) => void;
type StatusListener = (status: SyncStatus, clientsCount: number) => void;

class SyncManager {
  private ws: WebSocket | null = null;
  private url: string = '';
  private status: SyncStatus = 'disconnected';
  private clientsCount: number = 0;
  private listeners: Set<SyncListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: any = null;
  private pingTimer: any = null;

  // ═══ معلومات العميل ═══
  private clientId: string = '';
  private clientName: string = 'Unknown';
  private clientRole: string = 'unknown';

  constructor() {
    // اقرأ عنوان الخادم من localStorage
    try {
      const saved = localStorage.getItem('sea_pos_sync_url');
      if (saved) this.url = saved;
    } catch (e) {}
  }

  // ═══ الحصول على الحالة ═══
  getStatus(): SyncStatus {
    return this.status;
  }

  getClientsCount(): number {
    return this.clientsCount;
  }

  getServerUrl(): string {
    return this.url;
  }

  getClientId(): string {
    return this.clientId;
  }

  // ═══ الاتصال بالخادم ═══
  async connect(serverUrl: string, name: string, role: string): Promise<boolean> {
    this.url = serverUrl;
    this.clientName = name;
    this.clientRole = role;

    // حفظ في localStorage
    try {
      localStorage.setItem('sea_pos_sync_url', serverUrl);
    } catch (e) {}

    return this._doConnect();
  }

  private _doConnect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.url) {
        resolve(false);
        return;
      }

      this._setStatus('connecting');

      try {
        // تحويل http إلى ws
        const wsUrl = this.url
          .replace(/^http:\/\//, 'ws://')
          .replace(/^https:\/\//, 'wss://') + '/ws';

        this.ws = new WebSocket(wsUrl);

        // timeout للاتصال
        const timeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            this.ws?.close();
            this._setStatus('error');
            resolve(false);
          }
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this._setStatus('connected');
          this.reconnectAttempts = 0;

          // تسجيل العميل
          this.send({
            type: 'register',
            data: { name: this.clientName, role: this.clientRole },
          });

          // بدء ping للحفاظ على الاتصال
          this._startPing();

          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            this._handleMessage(msg);
          } catch (e) {
            console.error('Sync: Invalid message', e);
          }
        };

        this.ws.onerror = (err) => {
          clearTimeout(timeout);
          console.error('Sync: WebSocket error', err);
          this._setStatus('error');
          resolve(false);
        };

        this.ws.onclose = () => {
          clearTimeout(timeout);
          this._setStatus('disconnected');
          this._stopPing();
          this._scheduleReconnect();
        };
      } catch (e) {
        console.error('Sync: Connection failed', e);
        this._setStatus('error');
        resolve(false);
      }
    });
  }

  // ═══ معالجة الرسائل ═══
  private _handleMessage(msg: SyncMessage) {
    switch (msg.type) {
      case 'welcome':
        this.clientId = msg.data?.yourId || '';
        this.clientsCount = msg.data?.clientsCount || 0;
        // إرسال الحالة الكاملة للـ listeners
        this._notifyListeners({
          type: 'welcome',
          data: msg.data,
          timestamp: msg.timestamp,
        });
        break;

      case 'client_joined':
      case 'client_left':
      case 'client_updated':
        this._notifyListeners(msg);
        break;

      case 'state_update':
      case 'partial_update':
      case 'new_receipt':
      case 'table_update':
      case 'inventory_update':
        this._notifyListeners(msg);
        break;

      case 'pong':
        // تجاهل
        break;
    }
  }

  // ═══ إرسال الرسائل ═══
  send(msg: { type: string; data?: any }) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ ...msg, timestamp: Date.now() }));
        return true;
      } catch (e) {
        console.error('Sync: Send failed', e);
        return false;
      }
    }
    return false;
  }

  // ═══ قطع الاتصال ═══
  disconnect() {
    this._stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // منع إعادة الاتصال
      this.ws.close();
      this.ws = null;
    }
    this._setStatus('disconnected');
  }

  // ═══ إعادة الاتصال التلقائي ═══
  private _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Sync: Max reconnect attempts reached');
      return;
    }

    if (this.reconnectTimer) return;

    this.reconnectAttempts++;
    const delay = Math.min(2000 * this.reconnectAttempts, 30000);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      console.log(`Sync: Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this._doConnect();
    }, delay);
  }

  // ═══ Ping للحفاظ على الاتصال ═══
  private _startPing() {
    this._stopPing();
    this.pingTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000);
  }

  private _stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  // ═══ Listeners ═══
  addListener(listener: SyncListener) {
    this.listeners.add(listener);
  }

  removeListener(listener: SyncListener) {
    this.listeners.delete(listener);
  }

  addStatusListener(listener: StatusListener) {
    this.statusListeners.add(listener);
  }

  removeStatusListener(listener: StatusListener) {
    this.statusListeners.delete(listener);
  }

  private _notifyListeners(msg: SyncMessage) {
    this.listeners.forEach((l) => {
      try {
        l(msg);
      } catch (e) {
        console.error('Sync: Listener error', e);
      }
    });
  }

  private _setStatus(status: SyncStatus) {
    this.status = status;
    this.statusListeners.forEach((l) => {
      try {
        l(status, this.clientsCount);
      } catch (e) {}
    });
  }
}

// ═══ Singleton ═══
export const syncManager = new SyncManager();
export default syncManager;
