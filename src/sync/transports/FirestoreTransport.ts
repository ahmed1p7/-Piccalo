// ═══════════════════════════════════════════════════════════════════
// 🔥 Sea POS - Trasporto Firestore
// ═══════════════════════════════════════════════════════════════════
// Alternativa al Realtime Database (usata se il progetto ha Firestore
// ma non ha un Realtime Database configurato).
//
// Struttura del documento:
//   sea_pos / shared_state
//     collections: { <nome>: { data, updatedAt, deviceId } }
//     devices:    { <deviceId>: { id, name, role, platform, lastSeen } }
// ═══════════════════════════════════════════════════════════════════

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  type Unsubscribe,
  type Firestore,
} from 'firebase/firestore';
import type { DeviceInfo } from '../SyncConfig';
import type { SyncCollection } from '../merge';
import type {
  SyncTransport,
  CloudState,
  CollectionPayload,
} from './RealtimeDbTransport';

const DOC_PATH = 'sea_pos';
const DOC_ID = 'shared_state';

export class FirestoreTransport implements SyncTransport {
  readonly name = 'Firestore';

  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private unsubscribe: Unsubscribe | null = null;
  private connected = false;

  constructor(private config: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    appId?: string;
    messagingSenderId?: string;
    storageBucket?: string;
  }) {}

  async connect(): Promise<boolean> {
    try {
      if (!this.app) {
        this.app = getApps().length
          ? getApps()[0]
          : initializeApp(this.config as any, 'sea-pos-firestore');
      }
      this.db = getFirestore(this.app);
      await setDoc(
        doc(this.db, DOC_PATH, DOC_ID),
        { collections: {}, devices: {}, updatedAt: Date.now() },
        { merge: true }
      );
      this.connected = true;
      return true;
    } catch (error: any) {
      this.connected = false;
      console.error('🔥 Firestore: connessione fallita:', error?.message);
      return false;
    }
  }

  disconnect(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  subscribe(
    onState: (state: CloudState) => void,
    onError: (error: Error) => void
  ): void {
    if (!this.db) return;
    const docRef = doc(this.db, DOC_PATH, DOC_ID);
    this.unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        const raw = snapshot.exists() ? (snapshot.data() as any) : {};
        onState({
          collections: (raw?.collections || {}) as CloudState['collections'],
          devices: (raw?.devices || {}) as Record<string, DeviceInfo>,
        });
      },
      (error) => {
        console.error('🔥 Firestore: errore listener:', error?.message);
        onError(error as Error);
      }
    );
  }

  async writeCollection(
    collection: SyncCollection,
    payload: CollectionPayload
  ): Promise<void> {
    if (!this.db) throw new Error('Firestore non connesso');
    await updateDoc(doc(this.db, DOC_PATH, DOC_ID), {
      [`collections.${collection}`]: payload,
      updatedAt: payload.updatedAt,
      updatedBy: payload.deviceId,
    } as any);
  }

  async writeDevice(device: DeviceInfo): Promise<void> {
    if (!this.db) throw new Error('Firestore non connesso');
    await updateDoc(doc(this.db, DOC_PATH, DOC_ID), {
      [`devices.${device.id}`]: {
        id: device.id,
        name: device.name,
        role: device.role,
        platform: device.platform,
        lastSeen: Date.now(),
      },
    } as any);
  }

  /** Lettura puntuale (usata da "Ripristina dal cloud") */
  async readState(): Promise<CloudState | null> {
    if (!this.db) return null;
    const snapshot = await getDoc(doc(this.db, DOC_PATH, DOC_ID));
    if (!snapshot.exists()) return null;
    const raw = snapshot.data() as any;
    return {
      collections: (raw?.collections || {}) as CloudState['collections'],
      devices: (raw?.devices || {}) as Record<string, DeviceInfo>,
    };
  }
}
