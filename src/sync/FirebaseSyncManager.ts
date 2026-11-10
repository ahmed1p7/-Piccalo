// ═══════════════════════════════════════════════════════════════════
// 🔥 Sea POS - Firebase Sync Manager
// ═══════════════════════════════════════════════════════════════════
// Orchestratore della sincronizzazione cloud tra N dispositivi.
//
// Il trasporto (Realtime Database o Firestore) è intercambiabile: qui
// vive la logica comune — merge a 3 vie, base condivisa, code offline,
// presenza dei dispositivi.
//
//   base   = ultimo stato sincronizzato con il cloud (salvato sul device)
//   local  = stato attuale di QUESTO dispositivo
//   remote = stato attuale nel cloud
//
// Così due telefoni che lavorano in parallelo NON si sovrascrivono.
// ═══════════════════════════════════════════════════════════════════

import { getEffectiveConfig, getDevice, type DeviceInfo } from './SyncConfig';
import {
  mergeCollection,
  normalizeCollectionData,
  isDeepEqual,
  SYNC_COLLECTIONS,
  type SyncCollection,
} from './merge';
import {
  RealtimeDbTransport,
  type CloudState,
  type CollectionPayload,
  type SyncTransport,
} from './transports/RealtimeDbTransport';
import { FirestoreTransport } from './transports/FirestoreTransport';

export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type SyncEvent = {
  type: 'remote_change';
  collection: SyncCollection;
  data: any;
  timestamp: number;
};

type SyncListener = (event: SyncEvent) => void;
type StatusListener = (status: SyncStatus, devicesCount: number, error: string | null) => void;

const BASE_STORAGE_KEY = 'sea_pos_sync_base_v1';
const DIRTY_STORAGE_KEY = 'sea_pos_sync_dirty_v1';
const DEVICE_TIMEOUT_MS = 1000 * 60 * 60 * 24 * 14; // 14 giorni

class FirebaseSyncManager {
  private transport: SyncTransport | null = null;
  private status: SyncStatus = 'disconnected';
  /** ultimo errore di connessione (mostrato all'utente nelle impostazioni) */
  private lastError: string | null = null;
  private listeners = new Set<SyncListener>();
  private statusListeners = new Set<StatusListener>();
  private device: DeviceInfo = getDevice();

  /** base = ultimo stato sincronizzato con il cloud (per il merge 3-way) */
  private base: Partial<Record<SyncCollection, any>> = {};
  /** mirror dello stato locale corrente */
  private local: Partial<Record<SyncCollection, any>> = {};
  /** collezioni modificate localmente e non ancora confermate dal cloud */
  private dirty = new Set<SyncCollection>();

  private devices: DeviceInfo[] = [];
  private firstSnapshotDone = false;
  private readyCallbacks = new Set<() => void>();
  private heartbeatTimer: any = null;
  private pendingWrites = 0;
  /**
   * 🔒 Coda di scrittura: le push verso il cloud vengono eseguite in fila.
   * Senza questo, una push vecchia (es. il "seed" iniziale) può arrivare
   * DOPO una più recente e sovrascriverla (si perdeva il tavolo appena
   * creato mentre l'app si connetteva per la prima volta).
   */
  private writeQueue: Promise<void> = Promise.resolve();
  private transportName = '';

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
      const dirtyRaw = localStorage.getItem(DIRTY_STORAGE_KEY);
      if (dirtyRaw) {
        const parsed = JSON.parse(dirtyRaw);
        if (Array.isArray(parsed)) this.dirty = new Set(parsed);
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

  private _persistDirty() {
    try {
      localStorage.setItem(
        DIRTY_STORAGE_KEY,
        JSON.stringify(Array.from(this.dirty))
      );
    } catch {
      /* ignore */
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔌 Stato
  // ═══════════════════════════════════════════════════════════════════
  /** ultimo errore verificatosi durante la sincronizzazione */
  getLastError(): string | null {
    return this.lastError;
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  isConfigured(): boolean {
    return !!getEffectiveConfig();
  }

  getTransportName(): string {
    return this.transportName;
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
      console.warn('🔥 Sync: nessuna configurazione. Incolla il codice di sincronizzazione.');
      this._setStatus('error');
      return false;
    }

    this._setStatus('connecting');
    this.loadBase();

    // ── scelta del trasporto ──
    // Realtime Database se c'è un databaseURL, altrimenti Firestore.
    const transport: SyncTransport = config.databaseURL
      ? new RealtimeDbTransport(config as any)
      : new FirestoreTransport(config as any);

    this.transportName = transport.name;
    this.transport = transport;

    const ok = await transport.connect();
    if (!ok) {
      this._setStatus('error', transport.getLastError?.() ?? null);
      return false;
    }

    transport.subscribe(
      (state) => this._handleState(state),
      (error) => this._setStatus('error', error?.message ?? null)
    );

    await this._publishDevice();
    this._startHeartbeat();

    // ⚠️ Se il permesso è stato negato durante la connessione (regole del
    //    Realtime Database non pubblicate) l'errore è già arrivato: non
    //    sovrascriverlo con "connected", altrimenti l'app sembra
    //    sincronizzata mentre in realtà è scollegata.
    const setupError = transport.getLastError?.() ?? this.lastError;
    if (setupError) {
      this._setStatus('error', setupError);
      return false;
    }

    this._setStatus('connected');
    return true;
  }

  /**
   * 📡 Notifica "primo stato ricevuto dal cloud".
   * L'app la usa per non mostrare la configurazione iniziale a un telefono
   * che sta ricevendo i dati del ristorante: attende lo snapshot e poi
   * adotta utenti, tavoli, magazzino e scontrini senza nessuna operazione.
   */
  onReady(callback: () => void): () => void {
    this.readyCallbacks.add(callback);
    if (this.firstSnapshotDone) {
      // lo snapshot è già arrivato: notifica subito
      setTimeout(() => callback(), 0);
    }
    return () => this.readyCallbacks.delete(callback);
  }

  /** true se lo stato del cloud è già stato ricevuto almeno una volta */
  isReady(): boolean {
    return this.firstSnapshotDone;
  }

  disconnect() {
    this.transport?.disconnect();
    this.transport = null;
    this._stopHeartbeat();
    this._setStatus('disconnected');
  }

  /**
   * 🧹 Azzera la base di merge locale (dopo un "Ripristino di Fabbrica").
   * Senza questo i dati vecchi potrebbero tornare con la prossima
   * sincronizzazione, perché la base li considererebbe "già sincronizzati".
   */
  resetLocalState() {
    this.base = {};
    this.local = {};
    this.dirty = new Set();
    this.firstSnapshotDone = false;
    try {
      localStorage.removeItem(BASE_STORAGE_KEY);
      localStorage.removeItem(DIRTY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  /**
   * ☁️ Cancella TUTTE le collezioni condivise nel cloud.
   * Usato dal "Ripristino di Fabbrica" quando l'utente sceglie di
   * cancellare anche i dati degli altri dispositivi.
   */
  async wipeCloud(): Promise<boolean> {
    if (!this.transport) return false;
    await this.transport.wipeState();
    this.resetLocalState();
    return true;
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

    // ⛔ Finché non arriva il primo stato dal cloud NON si scrive nulla:
    //    altrimenti un telefono nuovo sovrascriverebbe i dati del
    //    ristorante con i suoi dati locali prima ancora di averli ricevuti.
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

  /** Invia TUTTE le collezioni locali al cloud */
  async pushAll(): Promise<boolean> {
    if (!this.transport) return false;
    for (const collection of SYNC_COLLECTIONS) {
      const data = this.local[collection];
      if (data === undefined) continue;
      await this._pushCollection(collection, data);
    }
    return true;
  }

  /** Rilegge lo stato dal cloud e lo applica (pulsante "Ripristina") */
  async forcePull(): Promise<boolean> {
    if (!this.transport) return false;
    try {
      const transport = this.transport as any;
      let state: CloudState | null = null;

      if (typeof transport.readState === 'function') {
        state = await transport.readState();
      } else {
        // il Realtime DB non ha readState: si ascolta il prossimo stato
        return new Promise((resolve) => {
          const before = new Set(this.devices.map((d) => d.id));
          const timer = setTimeout(() => resolve(false), 3000);
          const listener = (status: SyncStatus) => {
            if (status === 'connected' && this.devices.length >= before.size) {
              clearTimeout(timer);
              resolve(true);
            }
          };
          this.addStatusListener(listener);
          void this.flush();
        });
      }

      if (!state) return false;
      this._applyState(state, true);
      return true;
    } catch (error: any) {
      console.warn('🔥 Sync: forcePull fallito:', error?.message);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔧 Interno
  // ═══════════════════════════════════════════════════════════════════
  private async _publishDevice() {
    if (!this.transport) return;
    this.device = getDevice();
    try {
      await this.transport.writeDevice(this.device);
    } catch (err: any) {
      console.warn('🔥 Sync: impossibile pubblicare il dispositivo:', err?.message);
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

  private _pushCollection(collection: SyncCollection, data: any): Promise<void> {
    // serializza: la scrittura parte solo quando le precedenti sono finite
    this.writeQueue = this.writeQueue
      .then(() => this._doPushCollection(collection, data))
      .catch(() => {
        /* errori gestiti dentro _doPushCollection */
      });
    return this.writeQueue;
  }

  private async _doPushCollection(collection: SyncCollection, data: any) {
    if (!this.transport) return;

    const payload: CollectionPayload = {
      data,
      updatedAt: Date.now(),
      deviceId: this.device.id,
    };

    this.pendingWrites++;
    try {
      await this.transport.writeCollection(collection, payload);
      this.base[collection] = data;
      this.dirty.delete(collection);
      this._persistDirty();
      this.saveBase();
    } catch (err: any) {
      console.warn('🔥 Sync: push fallito (verrà ritentato):', err?.message);
    } finally {
      this.pendingWrites = Math.max(0, this.pendingWrites - 1);
    }
  }

  /** Arriva un nuovo stato dal cloud */
  private _handleState(state: CloudState) {
    this._applyState(state, false);
  }

  private _applyState(state: CloudState, force: boolean) {
    if (!state) return;

    // ── Dispositivi connessi ──
    if (state.devices) {
      const now = Date.now();
      this.devices = Object.values(state.devices)
        .filter((d: any) => d && typeof d.id === 'string')
        .filter((d: any) => !d.lastSeen || now - d.lastSeen < DEVICE_TIMEOUT_MS)
        .sort((a: any, b: any) => (b.lastSeen || 0) - (a.lastSeen || 0)) as DeviceInfo[];
      this._notifyStatus();
    }

    const remoteCollections = state.collections || {};

    // ── Primo stato: adozione dei dati esistenti ──
    if (!this.firstSnapshotDone) {
      this.firstSnapshotDone = true;
      this.readyCallbacks.forEach((cb) => {
        try {
          cb();
        } catch {
          /* ignore */
        }
      });
      const hasRemoteData = Object.keys(remoteCollections).length > 0;

      if (!hasRemoteData) {
        // il cloud è vuoto → questo dispositivo è il primo: pubblica i suoi dati
        void this._seedFromLocal();
        return;
      }

      for (const collection of SYNC_COLLECTIONS) {
        const payload = remoteCollections[collection];
        if (!payload) continue;

        const remoteData = normalizeCollectionData(collection, payload.data);
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
          void this._pushCollection(collection, merged);
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

    // ── Stati successivi: merge 3-way ──
    for (const collection of SYNC_COLLECTIONS) {
      const payload = remoteCollections[collection];
      if (!payload) continue;

      const remoteData = normalizeCollectionData(collection, payload.data);
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
        this.base[collection] = merged;
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

  /**
   * Primo dispositivo: pubblica lo stato locale nel cloud.
   */
  private async _seedFromLocal() {
    // snapshot dei dati al momento del seed
    const snapshot: Record<string, any> = { ...this.local };

    for (const collection of SYNC_COLLECTIONS) {
      const data = snapshot[collection];
      if (data === undefined) continue;

      // ⚠️ Se nel frattempo la collezione è cambiata (es. l'utente ha
      //    appena creato un tavolo) NON la sovrascriviamo con il vecchio
      //    valore: la modifica più recente deve vincere.
      if (!isDeepEqual(this.local[collection], data)) continue;

      await this._pushCollection(collection, data);
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
        l(this.status, this.devices.length, this.lastError);
      } catch (e) {
        /* noop */
      }
    });
  }

  private _setStatus(status: SyncStatus, error: string | null = null) {
    this.status = status;
    this.lastError = status === 'error' ? error : null;
    this._notifyStatus();
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

// ═══ Singleton ═══
export const firebaseSyncManager = new FirebaseSyncManager();
export default firebaseSyncManager;
