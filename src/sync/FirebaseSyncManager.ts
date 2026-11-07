// ═══════════════════════════════════════════════════════════════════
// 🔥 Sea POS - Firebase Sync Manager (multi-dispositivo)
// ═══════════════════════════════════════════════════════════════════
// Sincronizzazione cloud tra N telefoni/tablet:
//   - Config Firebase letta a RUNTIME (stesso APK su tutti i device)
//   - Merge 3-way per non perdere modifiche fatte in parallelo
//   - Presenza dei dispositivi (chi è connesso)
//   - Scritture offline gestite dal Firestore SDK (queue interna)
//
// Struttura del documento nel cloud:
//   sea_pos / shared_state
//     collections: { users: {data, updatedAt, deviceId}, inventory: {...}, ... }
//     devices:    { <deviceId>: {id, name, role, platform, lastSeen} }
// ═══════════════════════════════════════════════════════════════════

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  type Unsubscribe,
  type Firestore,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, type User } from 'firebase/auth';
import { getEffectiveConfig, getDevice, type DeviceInfo } from './SyncConfig';
import {
  mergeCollection,
  isDeepEqual,
  SYNC_COLLECTIONS,
  type SyncCollection,
} from './merge';

export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type SyncEvent = {
  type: 'remote_change';
  collection: SyncCollection;
  data: any;
  timestamp: number;
};

type SyncListener = (event: SyncEvent) => void;
type StatusListener = (status: SyncStatus, devicesCount: number) => void;

const DOC_PATH = 'sea_pos';
const DOC_ID = 'shared_state';
const BASE_STORAGE_KEY = 'sea_pos_sync_base_v1';
const DEVICE_TIMEOUT_MS = 1000 * 60 * 60 * 24 * 14; // 14 giorni

type CollectionPayload = {
  data: any;
  updatedAt: number;
  deviceId: string;
};

class FirebaseSyncManager {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private authUser: User | null = null;
  private status: SyncStatus = 'disconnected';
  private listeners = new Set<SyncListener>();
  private statusListeners = new Set<StatusListener>();
  private unsubscribe: Unsubscribe | null = null;
  private device: DeviceInfo = getDevice();

  /** base = ultimo stato sincronizzato con il cloud (per il merge 3-way) */
  private base: Partial<Record<SyncCollection, any>> = {};
  /** mirror dello stato locale corrente */
  private local: Partial<Record<SyncCollection, any>> = {};
  /** collezioni modificate localmente e non ancora confermate dal cloud */
  private dirty = new Set<SyncCollection>();

  private devices: DeviceInfo[] = [];
  private firstSnapshotDone = false;
  private heartbeatTimer: any = null;
  private pendingWrites = 0;

  // ═══════════════════════════════════════════════════════════════════
  // 📦 Persistenza della base (per non perdere il merge dopo un reload)
  // ═══════════════════════════════════════════════════════════════════
  private loadBase() {
    try {
      const raw = localStorage.getItem(BASE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.collections) this.base = parsed.collections;
      }
    } catch {
      /* ignore */
    }
  }

  private saveBase() {
    try {
      localStorage.setItem(
        BASE_STORAGE_KEY,
        JSON.stringify({ collections: this.base, updatedAt: Date.now() })
      );
    } catch {
      /* ignore */
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔌 Stato
  // ═══════════════════════════════════════════════════════════════════
  getStatus(): SyncStatus {
    return this.status;
  }

  isConfigured(): boolean {
    return !!getEffectiveConfig();
  }

  getDeviceInfo(): DeviceInfo {
    return this.device;
  }

  refreshDevice() {
    this.device = getDevice();
  }

  getDevices(): DeviceInfo[] {
    return this.devices;
  }

  getPendingWrites(): number {
    return this.pendingWrites;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔗 Connessione
  // ═══════════════════════════════════════════════════════════════════
  async connect(): Promise<boolean> {
    if (this.status === 'connected' || this.status === 'connecting') {
      return this.status === 'connected';
    }

    const config = getEffectiveConfig();
    if (!config) {
      console.warn('🔥 Firebase: nessuna configurazione. Incolla il codice di sincronizzazione.');
      this._setStatus('error');
      return false;
    }

    this._setStatus('connecting');
    this.loadBase();

    try {
      if (!this.app) {
        this.app = initializeApp(config, 'sea-pos');
        this.db = getFirestore(this.app);
      }

      // Auth anonimo (opzionale: se non è abilitato funziona lo stesso)
      try {
        const auth = getAuth(this.app);
        const cred = await signInAnonymously(auth);
        this.authUser = cred.user;
      } catch (err: any) {
        console.warn('🔥 Firebase Auth anonimo non disponibile:', err?.message);
      }

      await this._ensureDoc();
      await this._publishDevice();

      const docRef = doc(this.db!, DOC_PATH, DOC_ID);
      this.unsubscribe = onSnapshot(
        docRef,
        (snapshot) => this._handleSnapshot(snapshot.exists() ? snapshot.data() : null),
        (err) => {
          console.error('🔥 Firebase: errore listener:', err.message);
          this._setStatus('error');
        }
      );

      this._startHeartbeat();
      this._setStatus('connected');
      return true;
    } catch (error: any) {
      console.error('🔥 Firebase: connessione fallita:', error?.message);
      this._setStatus('error');
      return false;
    }
  }

  disconnect() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this._stopHeartbeat();
    this._setStatus('disconnected');
  }

  async reconnect(): Promise<boolean> {
    this.disconnect();
    this.firstSnapshotDone = false;
    return this.connect();
  }

  // ═══════════════════════════════════════════════════════════════════
  // 📨 API per l'app
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Notifica al manager che lo stato locale di una collezione è cambiato.
   * Se il dato è identico a quello già presente nel cloud non viene
   * scritto nulla (evita loop e consumi inutili).
   */
  notifyLocalChange(collection: SyncCollection, data: any) {
    this.local[collection] = data;

    // ⛔ Finché non arriva il primo snapshot dal cloud NON si scrive nulla:
    //    altrimenti un telefono nuovo sovrascriverebbe i dati del ristorante
    //    con i suoi dati locali prima ancora di averli ricevuti.
    if (!this.firstSnapshotDone) {
      this.dirty.add(collection);
      this._persistDirty();
      return;
    }

    if (this.status !== 'connected') {
      this.dirty.add(collection);
      this._persistDirty();
      return;
    }

    if (isDeepEqual(data, this.base[collection])) {
      // già sincronizzato
      this.dirty.delete(collection);
      this._persistDirty();
      return;
    }

    this.dirty.add(collection);
    this._persistDirty();
    void this._pushCollection(collection, data);
  }

  /** Push immediato di tutte le collezioni "sporche" */
  async flush(): Promise<void> {
    if (this.status !== 'connected') return;
    for (const collection of Array.from(this.dirty)) {
      const data = this.local[collection];
      if (data === undefined) continue;
      await this._pushCollection(collection, data);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔧 Interno
  // ═══════════════════════════════════════════════════════════════════
  private async _ensureDoc() {
    const docRef = doc(this.db!, DOC_PATH, DOC_ID);
    await setDoc(
      docRef,
      { collections: {}, devices: {}, updatedAt: Date.now() },
      { merge: true }
    );
  }

  private async _publishDevice() {
    if (!this.db) return;
    const docRef = doc(this.db!, DOC_PATH, DOC_ID);
    this.device = getDevice();
    try {
      await updateDoc(docRef, {
        [`devices.${this.device.id}`]: {
          id: this.device.id,
          name: this.device.name,
          role: this.device.role,
          platform: this.device.platform,
          lastSeen: Date.now(),
        },
      } as any);
    } catch (err) {
      console.warn('🔥 Firebase: impossibile pubblicare il dispositivo:', err);
    }
  }

  private _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      void this._publishDevice();
    }, 60_000);
  }

  private _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Primo dispositivo: pubblica lo stato locale nel cloud.
   * Da questo momento gli altri dispositivi potranno joining.
   */
  private async _seedFromLocal() {
    for (const collection of SYNC_COLLECTIONS) {
      const data = this.local[collection];
      if (data === undefined) continue;
      await this._pushCollection(collection, data);
    }
  }

  private async _pushCollection(collection: SyncCollection, data: any) {
    if (!this.db) return;
    const docRef = doc(this.db!, DOC_PATH, DOC_ID);
    const now = Date.now();
    const payload: CollectionPayload = {
      data,
      updatedAt: now,
      deviceId: this.device.id,
    };

    this.pendingWrites++;
    try {
      await updateDoc(docRef, {
        [`collections.${collection}`]: payload,
        updatedAt: now,
        updatedBy: this.device.id,
      } as any);

      this.base[collection] = data;
      this.dirty.delete(collection);
      this._persistDirty();
      this.saveBase();
    } catch (err: any) {
      console.warn('🔥 Firebase: push fallito (verrà ritentato):', err?.message);
      // Firestore mette in coda le scritture offline: restiamo "dirty"
    } finally {
      this.pendingWrites = Math.max(0, this.pendingWrites - 1);
    }
  }

  private _handleSnapshot(data: any) {
    if (!data) return;

    // ── Dispositivi connessi ──
    if (data.devices) {
      const now = Date.now();
      this.devices = Object.values(data.devices)
        .filter((d: any) => d && typeof d.id === 'string')
        .filter((d: any) => !d.lastSeen || now - d.lastSeen < DEVICE_TIMEOUT_MS)
        .sort((a: any, b: any) => (b.lastSeen || 0) - (a.lastSeen || 0)) as DeviceInfo[];
      this._notifyStatus();
    }

    const remoteCollections = data.collections || {};

    // ── Primo snapshot: adozione dati esistenti ──
    if (!this.firstSnapshotDone) {
      this.firstSnapshotDone = true;
      const hasRemoteData = Object.keys(remoteCollections).length > 0;
      if (hasRemoteData) {
        for (const collection of SYNC_COLLECTIONS) {
          const payload = remoteCollections[collection];
          if (!payload) continue;

          const remoteData = payload.data;
          const baseData = this.base[collection];
          const localData = this.local[collection];

          // Questo device aveva già sincronizzato e ha modifiche locali
          // non ancora inviate → si tiene il merge (niente dati persi).
          if (
            baseData !== undefined &&
            localData !== undefined &&
            !isDeepEqual(localData, baseData)
          ) {
            const merged = mergeCollection(collection, baseData, localData, remoteData);
            this.base[collection] = merged;
            this.local[collection] = merged;
            if (!isDeepEqual(merged, remoteData)) {
              void this._pushCollection(collection, merged);
            }
            if (!isDeepEqual(merged, localData)) {
              this._emitRemoteChange(collection, merged);
            }
            this.dirty.delete(collection);
            continue;
          }

          // Device nuovo → adotta i dati già presenti nel cloud
          this.base[collection] = remoteData;
          this.local[collection] = remoteData;
          this._emitRemoteChange(collection, remoteData);
          this.dirty.delete(collection);
        }
        this.saveBase();
        return;
      }
      // ── Primo snapshot: il cloud è ancora vuoto ──
      // → questo dispositivo è il primo: pubblica i suoi dati
      void this._seedFromLocal();
      return;
    }

    // ── Snapshot successivi: merge 3-way ──
    for (const collection of SYNC_COLLECTIONS) {
      const payload = remoteCollections[collection];
      if (!payload) continue;

      const remoteData = payload.data;
      const baseData = this.base[collection];
      const localData =
        this.local[collection] !== undefined ? this.local[collection] : remoteData;

      // nessuna modifica locale → adotta il remoto
      if (baseData === undefined || isDeepEqual(localData, baseData)) {
        if (!isDeepEqual(localData, remoteData)) {
          this.base[collection] = remoteData;
          this.local[collection] = remoteData;
          this._emitRemoteChange(collection, remoteData);
        }
        continue;
      }

      // c'è una modifica locale → merge
      const merged = mergeCollection(collection, baseData, localData, remoteData);

      if (!isDeepEqual(merged, remoteData)) {
        // il cloud deve essere aggiornato con il risultato del merge
        void this._pushCollection(collection, merged);
      } else {
        this.base[collection] = merged;
      }

      if (!isDeepEqual(merged, localData)) {
        this.local[collection] = merged;
        this._emitRemoteChange(collection, merged);
      }
    }
  }

  private _emitRemoteChange(collection: SyncCollection, data: any) {
    this.listeners.forEach((listener) => {
      try {
        listener({
          type: 'remote_change',
          collection,
          data,
          timestamp: Date.now(),
        });
      } catch (e) {
        console.error('🔥 Sync listener error:', e);
      }
    });
  }

  private _notifyStatus() {
    this.statusListeners.forEach((l) => {
      try {
        l(this.status, this.devices.length);
      } catch (e) {
        /* noop */
      }
    });
  }

  private _setStatus(status: SyncStatus) {
    this.status = status;
    this._notifyStatus();
  }

  // ── Persistenza dello stato "dirty" (modifiche non ancora inviate) ──
  private _persistDirty() {
    try {
      localStorage.setItem(
        'sea_pos_sync_dirty_v1',
        JSON.stringify(Array.from(this.dirty))
      );
    } catch {
      /* ignore */
    }
  }

  addListener(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  removeListener(listener: SyncListener) {
    this.listeners.delete(listener);
  }

  addStatusListener(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  removeStatusListener(listener: StatusListener) {
    this.statusListeners.delete(listener);
  }
}

export const firebaseSyncManager = new FirebaseSyncManager();
export default firebaseSyncManager;
