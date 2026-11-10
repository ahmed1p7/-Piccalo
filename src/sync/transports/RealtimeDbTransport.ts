// ═══════════════════════════════════════════════════════════════════
// 🔄 Sea POS - Trasporto Realtime Database
// ═══════════════════════════════════════════════════════════════════
// Sincronizzazione in tempo reale tramite Firebase Realtime Database.
// I listener `onValue` aggiornano l'app immediatamente quando un altro
// dispositivo scrive — esattamente come in una chat.
//
// Struttura nel database:
//   sea_pos/shared_state/collections/<nome> = { data, updatedAt, deviceId }
//   sea_pos/shared_state/devices/<deviceId> = { id, name, role, platform, lastSeen }
// ═══════════════════════════════════════════════════════════════════

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  update,
  onValue,
  off,
  connectDatabaseEmulator,
  type Database,
} from 'firebase/database';
import type { DeviceInfo } from '../SyncConfig';
import type { SyncCollection } from '../merge';

export interface CollectionPayload {
  data: any;
  updatedAt: number;
  deviceId: string;
}

export interface CloudState {
  collections: Partial<Record<SyncCollection, CollectionPayload>>;
  devices: Record<string, DeviceInfo>;
}

export interface SyncTransport {
  readonly name: string;
  connect(): Promise<boolean>;
  disconnect(): void;
  isConnected(): boolean;
  subscribe(
    onState: (state: CloudState) => void,
    onError: (error: Error) => void
  ): void;
  writeCollection(collection: SyncCollection, payload: CollectionPayload): Promise<void>;
  writeDevice(device: DeviceInfo): Promise<void>;
}

const STATE_PATH = 'sea_pos/shared_state';

export class RealtimeDbTransport implements SyncTransport {
  readonly name = 'Realtime Database';

  private app: FirebaseApp | null = null;
  private db: Database | null = null;
  private listenerRef: any = null;
  private connected = false;
  private lastError: string | null = null;

  constructor(private config: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    databaseURL?: string;
  }) {}

  async connect(): Promise<boolean> {
    try {
      if (!this.app) {
        this.app = getApps().length
          ? getApps()[0]
          : initializeApp(
              {
                apiKey: this.config.apiKey,
                authDomain: this.config.authDomain,
                projectId: this.config.projectId,
                databaseURL: this.config.databaseURL,
              },
              'sea-pos-rtdb'
            );
      }

      const url =
        this.config.databaseURL ||
        `https://${this.config.projectId}-default-rtdb.europe-west1.firebasedatabase.app`;

      this.db = getDatabase(this.app, url);

      // Se l'URL è in chiaro (http) si tratta dell'emulatore locale
      // usato dagli sviluppatori: va collegato esplicitamente.
      if (url.startsWith('http://')) {
        try {
          const parsed = new URL(url);
          connectDatabaseEmulator(
            this.db,
            parsed.hostname,
            Number(parsed.port || 9000)
          );
          console.log('🔥 Realtime DB: emulatore locale', url);
        } catch {
          /* ignore */
        }
      }

      this.connected = true;
      this.lastError = null;
      console.log('🔥 Realtime DB: connesso a', url);
      return true;
    } catch (error: any) {
      this.connected = false;
      this.lastError = error?.message || String(error);
      console.error('🔥 Realtime DB: connessione fallita:', this.lastError);
      return false;
    }
  }

  disconnect(): void {
    if (this.listenerRef && this.db) {
      try {
        off(this.listenerRef);
      } catch {
        /* ignore */
      }
    }
    this.listenerRef = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  subscribe(
    onState: (state: CloudState) => void,
    onError: (error: Error) => void
  ): void {
    if (!this.db) return;
    const stateRef = ref(this.db, STATE_PATH);

    this.listenerRef = onValue(
      stateRef,
      (snapshot) => {
        const raw = (snapshot.val() || {}) as any;
        const state: CloudState = {
          collections: (raw.collections || {}) as CloudState['collections'],
          devices: (raw.devices || {}) as Record<string, DeviceInfo>,
        };
        onState(state);
      },
      (error) => {
        this.lastError = error?.message || String(error);
        console.error('🔥 Realtime DB: errore listener:', this.lastError);
        onError(error as Error);
      }
    );
  }

  async writeCollection(
    collection: SyncCollection,
    payload: CollectionPayload
  ): Promise<void> {
    if (!this.db) throw new Error('Realtime DB non connesso');
    await update(ref(this.db, `${STATE_PATH}/collections`), {
      [collection]: payload,
    });
  }

  async writeDevice(device: DeviceInfo): Promise<void> {
    if (!this.db) throw new Error('Realtime DB non connesso');
    await set(ref(this.db, `${STATE_PATH}/devices/${device.id}`), {
      ...device,
      lastSeen: Date.now(),
    });
  }
}
