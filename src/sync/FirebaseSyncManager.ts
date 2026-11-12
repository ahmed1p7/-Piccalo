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
import {
  hasLegacyDemoItems,
  isLegacyDemoCollection,
  stripLegacyDemoItems,
  stripLegacyDemoUsersSafely,
} from './legacyData';
import type { RestaurantIndexEntry } from './transports/RealtimeDbTransport';
import { ridFromName, randomRid } from '../utils/identity';

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

/**
 * Una collezione è "vuota" se non contiene elementi utili.
 * Serve a distinguere un dispositivo davvero nuovo (nessun dato) da un
 * dispositivo che ha dati reali ma non ha ancora una base di sincronizzazione.
 */
function isEmptyCollection(data: any): boolean {
  if (data === undefined || data === null) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object') return Object.keys(data).length === 0;
  return false;
}

/**
 * 🛡️ Protezione dell'account amministratore.
 *
 * Un merge non deve mai lasciare il ristorante SENZA nessun admin:
 * se il risultato non ha utenti admin ma noi ne avevamo uno, si tiene
 * il nostro admin (e i suoi permessi) invece di accettare il remoto.
 */
function protectAdminUsers(
  collection: SyncCollection,
  merged: any,
  local: any
): any {
  if (collection !== 'users') return merged;
  if (!Array.isArray(merged) || !Array.isArray(local)) return merged;

  const hasAdmin = (list: any[]) =>
    list.some((u: any) => u && u.role === 'admin');
  const admins = local.filter((u: any) => u && u.role === 'admin');

  if (admins.length === 0) return merged;
  if (hasAdmin(merged)) return merged;

  console.warn(
    '🔥 Sync: il merge avrebbe rimosso tutti gli account admin → mantenuti i dati locali'
  );
  return [...merged, ...admins];
}

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
  /**
   * ⏱️ Timestamp (updatedAt) del cloud con cui la base è stata salvata.
   * Serve a capire se lo stato che arriva dal cloud è PIÙ VECCHIO del nostro:
   * in quel caso non deve poter cancellare i nostri dati (un telefono vecchio
   * o uno stato parziale altrimenti cancella gli account del ristorante).
   */
  private baseUpdatedAt: Partial<Record<SyncCollection, number>> = {};

  private devices: DeviceInfo[] = [];
  private firstSnapshotDone = false;
  /**
   * 🏷️ Identificatore del ristorante (spazio cloud dedicato).
   * Ogni ristorante ha il proprio spazio: i dati non si mescolano più
   * con quelli di un altro ristorante né con il vecchio seed demo.
   */
  private scope: string | null = null;
  /** 📇 ristoranti trovati nel cloud (scelta manuale se sono più di uno) */
  private restaurantChoices: RestaurantIndexEntry[] = [];
  /** ⚠️ avviso non bloccante mostrato all'utente (es. dati demo nel cloud) */
  private warning: string | null = null;
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
        if (parsed?.updatedAt) {
          this.baseUpdatedAt = parsed.updatedAtByCollection || {};
        }
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
        JSON.stringify({
          collections: this.base,
          updatedAt: Date.now(),
          updatedAtByCollection: this.baseUpdatedAt,
        })
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

  // ═══════════════════════════════════════════════════════════════════
  // 🏷️ Spazio cloud del ristorante
  // ═══════════════════════════════════════════════════════════════════

  /** spazio (rid) attualmente in uso */
  getScope(): string | null {
    return this.scope;
  }

  /** imposta lo spazio del ristorante (si ricollega al cloud) */
  setScope(scope: string | null) {
    this.scope = scope || null;
    const transport = this.transport as any;
    if (transport && typeof transport.setScope === 'function') {
      transport.setScope(this.scope);
      // la sottoscrizione va rifatta sul nuovo percorso
      this._subscribe();
    }
  }

  /** 📇 ristoranti trovati nel cloud */
  getRestaurantChoices(): RestaurantIndexEntry[] {
    return this.restaurantChoices;
  }

  /**
   * 🏷️ Determina (e fissa) lo spazio cloud del ristorante.
   *
   * Ordine di priorità:
   *  1. lo scope già impostato
   *  2. l'unico ristorante presente nell'indice del cloud
   *     (→ installazione automatica: il nuovo telefono si aggancia
   *       da solo, senza codice da incollare)
   *  3. un `rid` stabile derivato dal nome del ristorante
   *     (→ due telefoni dello stesso ristorante convergono da soli)
   *  4. un `rid` casuale (nome ancora sconosciuto)
   */
  async ensureScope(restaurantName: string): Promise<string | null> {
    if (this.scope) return this.scope;

    const transport = this.transport as any;

    // 2) indice del cloud
    if (transport && typeof transport.readIndex === 'function') {
      const index = (await transport.readIndex()) || [];
      this.restaurantChoices = index;
      if (index.length === 1) {
        // ⚠️ setScope (non solo transport.setScope): va rifatta la
        //    sottoscrizione, altrimenti l'app resta in ascolto
        //    dell'indice e non riceve/trasmette i dati del ristorante.
        this.setScope(index[0].rid);
        console.log('🔥 Sync: ristorante trovato nel cloud:', this.scope);
        return this.scope;
      }
      if (index.length > 1) {
        // più ristoranti → l'app chiederà all'utente (nessuno scope
        // forzato: non si scrive nel ristorante sbagliato)
        return null;
      }
    }

    // 3) rid stabile dal nome  /  4) casuale
    const stable = ridFromName(restaurantName);
    this.setScope(stable || randomRid());
    console.log('🔥 Sync: nuovo spazio ristorante:', this.scope);
    return this.scope;
  }

  /** ⚠️ ultimo avviso (dati demo nel cloud, ecc.) */
  getWarning(): string | null {
    return this.warning;
  }

  /** 📇 pubblica (o aggiorna) la voce del ristorante nell'indice */
  async publishIndexEntry(entry: { name: string; city?: string }) {
    const transport = this.transport as any;
    if (!transport || typeof transport.writeIndexEntry !== 'function') return;
    if (!this.scope) return;
    try {
      await transport.writeIndexEntry({
        rid: this.scope,
        name: entry.name || 'Ristorante',
        city: entry.city || '',
        updatedAt: Date.now(),
        devices: this.devices.length,
      });
    } catch (err: any) {
      console.warn('🔥 Sync: indice non aggiornato:', err?.message);
    }
  }

  /**
   * 🧹 Rimuove i dati DEMO (vecchio seed 1.1.x) presenti nel cloud.
   * Restituisce quante entità sono state rimosse.
   */
  async cleanLegacyDemoFromCloud(): Promise<number> {
    const transport = this.transport as any;
    if (!transport) return 0;
    let removed = 0;
    for (const collection of SYNC_COLLECTIONS) {
      const local = this.local[collection];
      const cleaned = stripLegacyDemoItems(collection, local);
      if (cleaned.removed > 0) {
        removed += cleaned.removed;
        this.local[collection] = cleaned.data;
        await this._pushCollection(collection, cleaned.data);
      }
    }
    return removed;
  }

  /** ⚠️ true se il cloud (o lo stato locale) contiene ancora dati demo */
  hasLegacyDemoData(): boolean {
    return SYNC_COLLECTIONS.some((collection) =>
      hasLegacyDemoItems(collection, this.local[collection])
    );
  }

  getPendingWrites(): number {
    return this.pendingWrites;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔗 Connessione
  // ═══════════════════════════════════════════════════════════════════
  async connect(scope?: string | null): Promise<boolean> {
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

    if (scope) this.scope = scope;

    // ── scelta del trasporto ──
    // Realtime Database se c'è un databaseURL, altrimenti Firestore.
    const transport: SyncTransport = config.databaseURL
      ? new RealtimeDbTransport(config as any, this.scope)
      : new FirestoreTransport(config as any);

    this.transportName = transport.name;
    this.transport = transport;

    const ok = await transport.connect();
    if (!ok) {
      this._setStatus('error', transport.getLastError?.() ?? null);
      return false;
    }

    // ── 🔎 Scoperta del ristorante ──────────────────────────────────
    // Se non sappiamo ancora in QUALE spazio scrivere (nuova installazione
    // o installazione vecchia senza `rid`), leggiamo l'indice dei
    // ristoranti presenti nel cloud:
    //   • 1 solo ristorante → lo adottiamo automaticamente
    //   • più ristoranti   → l'app chiederà all'utente quale scegliere
    //   • nessuno          → siamo il primo: verrà creato con la
    //                        configurazione iniziale
    if (!this.scope) {
      const index = (await transport.readIndex?.()) || [];
      this.restaurantChoices = index;
      if (index.length === 1) {
        this.scope = index[0].rid;
        transport.setScope?.(this.scope);
        console.log('🔥 Sync: ristorante adottato dal cloud:', this.scope);
      }
    }

    if (this.scope) {
      this._subscribe();
    } else {
      // ⚠️ nessuno spazio ancora: si ascolta SOLO l'indice dei ristoranti.
      //    Non si scrive nulla finché l'app non sa in quale ristorante
      //    si trova (altrimenti i dati finirebbero in uno spazio sbagliato).
      transport.subscribeIndex?.((entries) => {
        this.restaurantChoices = entries;
        if (!this.scope && entries.length === 1) {
          this.scope = entries[0].rid;
          transport.setScope?.(this.scope);
          this._subscribe();
          void this._publishDevice();
        }
      });
    }

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

  /** 🔔 sottoscrive al percorso del ristorante corrente */
  private _subscribe() {
    const transport = this.transport;
    if (!transport) return;
    transport.subscribe(
      (state) => this._handleState(state),
      (error) => this._setStatus('error', error?.message ?? null)
    );
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
        void this.flush();
        return;
      }

      for (const collection of SYNC_COLLECTIONS) {
        const payload = remoteCollections[collection];
        if (!payload) continue;

        const remoteRaw = normalizeCollectionData(collection, payload.data);
        const baseData = this.base[collection];
        const localData = this.local[collection];
        const remoteUpdatedAt = payload.updatedAt || 0;

        // 🧟 Gli account DEMO (PIN pubblici) non vengono mai importati
        //    dal cloud — ma l'ultimo admin non viene mai cancellato.
        const remoteData =
          collection === 'users'
            ? stripLegacyDemoUsersSafely(remoteRaw).users
            : remoteRaw;

        // ⚠️ Il remoto è più vecchio del nostro stato noto → non può
        //    cancellare nulla (telefono vecchio / stato parziale).
        const remoteIsOlder =
          !!this.baseUpdatedAt[collection] &&
          remoteUpdatedAt > 0 &&
          remoteUpdatedAt < (this.baseUpdatedAt[collection] as number);

        // ── Dati locali NON vuoti + base assente → si fa il merge (unione),
        //    NON si sostituisce. Prima (v1.3.x) il remoto sovrascriveva
        //    tutto e gli account creati dall'amministratore sparivano.
        const localHasData =
          localData !== undefined && !isEmptyCollection(localData);
        const baseMissing = baseData === undefined;

        // 🛡️ REGOLA 1 — Il cloud contiene SOLO il vecchio seed demo:
        //    non può MAI sostituire i dati reali di questo dispositivo.
        //    (è la causa del bug "a ogni aggiornamento ricompaiono i
        //     dati di un altro ristorante")
        const remoteIsDemo = isLegacyDemoCollection(collection, remoteData);
        const localIsDemo = isLegacyDemoCollection(collection, localData);
        if (remoteIsDemo && localHasData && !localIsDemo) {
          this._warn(
            'Il cloud conteneva vecchi dati demo: sono stati ignorati, i tuoi dati restano al sicuro.'
          );
          this.base[collection] = localData;
          this.baseUpdatedAt[collection] = remoteUpdatedAt;
          this.dirty.delete(collection);
          void this._pushCollection(collection, localData);
          continue;
        }

        if (baseMissing && localHasData && !isDeepEqual(localData, remoteData)) {
          const merged = mergeCollection(
            collection,
            baseData,
            localData,
            remoteData,
            { allowRemoteDeletions: !remoteIsOlder }
          );
          const safe = protectAdminUsers(collection, merged, localData);
          this.base[collection] = safe;
          this.local[collection] = safe;
          this.baseUpdatedAt[collection] = remoteUpdatedAt;
          void this._pushCollection(collection, safe);
          if (!isDeepEqual(safe, localData)) {
            this._emitRemoteChange(collection, safe);
          }
          this.dirty.delete(collection);
          continue;
        }

        // Questo device aveva già sincronizzato e ha modifiche locali
        // non ancora inviate → si tiene il merge (niente dati persi).
        if (
          baseData !== undefined &&
          localData !== undefined &&
          !isDeepEqual(localData, baseData)
        ) {
          const merged = mergeCollection(
            collection,
            baseData,
            localData,
            remoteData,
            { allowRemoteDeletions: !remoteIsOlder }
          );
          const safe = protectAdminUsers(collection, merged, localData);
          this.base[collection] = safe;
          this.local[collection] = safe;
          this.baseUpdatedAt[collection] = remoteUpdatedAt;
          void this._pushCollection(collection, safe);
          if (!isDeepEqual(safe, localData)) {
            this._emitRemoteChange(collection, safe);
          }
          this.dirty.delete(collection);
          continue;
        }

        // 🛡️ REGOLA 2 — Il remoto è più vecchio del nostro stato e noi
        //    abbiamo dati: NON lo adottiamo (sarebbe una regressione).
        if (remoteIsOlder && localHasData) {
          this.base[collection] = localData;
          continue;
        }

        // 🛡️ REGOLA 3 — Il cloud è solo demo e noi non abbiamo dati:
        //    lo adottiamo (è l'unica copia) ma avvisiamo l'utente.
        if (remoteIsDemo && !localHasData) {
          this._warn(
            'Nel cloud ci sono solo vecchi dati demo: verrai invitato a fare un ripristino pulito.'
          );
        }

        // Device nuovo (senza dati locali) → adotta i dati già nel cloud
        this.base[collection] = remoteData;
        this.local[collection] = remoteData;
        this.baseUpdatedAt[collection] = remoteUpdatedAt;
        this._emitRemoteChange(collection, remoteData);
        this.dirty.delete(collection);
      }

      this.saveBase();

      // ⚠️ Le modifiche locali fatte PRIMA del primo snapshot (es. la
      //    creazione dell'account durante il setup) erano solo "sporche":
      //    senza questo invio resterebbero nel telefono e non arriverebbero
      //    mai agli altri dispositivi.
      void this.flush();

      return;
    }

    // ── Stati successivi: merge 3-way ──
    for (const collection of SYNC_COLLECTIONS) {
      const payload = remoteCollections[collection];
      if (!payload) continue;

      const remoteRaw = normalizeCollectionData(collection, payload.data);
      const baseData = this.base[collection];
      const localData =
        this.local[collection] !== undefined ? this.local[collection] : remoteRaw;
      const remoteUpdatedAt = payload.updatedAt || 0;

      // 🧟 mai importare gli account demo dal cloud
      const remoteData =
        collection === 'users'
          ? stripLegacyDemoUsersSafely(remoteRaw).users
          : remoteRaw;

      // ⚠️ remoto più vecchio del nostro stato → non può cancellare nulla
      const remoteIsOlder =
        !!this.baseUpdatedAt[collection] &&
        remoteUpdatedAt > 0 &&
        remoteUpdatedAt < (this.baseUpdatedAt[collection] as number);

      const localHasData =
        localData !== undefined && !isEmptyCollection(localData);

      // 🛡️ REGOLA 1 — il cloud è solo demo: non sovrascrive i dati reali
      const remoteIsDemo = isLegacyDemoCollection(collection, remoteData);
      const localIsDemo = isLegacyDemoCollection(collection, localData);
      if (remoteIsDemo && localHasData && !localIsDemo) {
        this._warn(
          'Il cloud conteneva vecchi dati demo: sono stati ignorati, i tuoi dati restano al sicuro.'
        );
        this.baseUpdatedAt[collection] = remoteUpdatedAt;
        void this._pushCollection(collection, localData);
        continue;
      }

      // nessuna modifica locale → adotta il remoto
      // (ma se non abbiamo base e i dati locali NON sono vuoti → merge,
      //  altrimenti gli account locali verrebbero sostituiti)
      if (
        (baseData === undefined && !localHasData) ||
        isDeepEqual(localData, baseData)
      ) {
        // 🛡️ REGOLA 2 — il remoto è più vecchio → non adottarlo
        if (remoteIsOlder && localHasData) {
          this.base[collection] = localData;
          continue;
        }
        if (!isDeepEqual(localData, remoteData)) {
          this.base[collection] = remoteData;
          this.local[collection] = remoteData;
          this.baseUpdatedAt[collection] = remoteUpdatedAt;
          this._emitRemoteChange(collection, remoteData);
        }
        continue;
      }

      // c'è una modifica locale → merge
      const merged = mergeCollection(collection, baseData, localData, remoteData, {
        allowRemoteDeletions: !remoteIsOlder,
      });
      const safe = protectAdminUsers(collection, merged, localData);

      if (!isDeepEqual(safe, remoteData)) {
        // il cloud deve essere aggiornato con il risultato del merge
        this.base[collection] = safe;
        this.baseUpdatedAt[collection] = remoteUpdatedAt;
        void this._pushCollection(collection, safe);
      } else {
        this.base[collection] = safe;
        this.baseUpdatedAt[collection] = remoteUpdatedAt;
      }

      if (!isDeepEqual(safe, localData)) {
        this.local[collection] = safe;
        this._emitRemoteChange(collection, safe);
      }
    }
  }

  /** ⚠️ registra un avviso per l'utente (mostrato nelle impostazioni) */
  private _warn(message: string) {
    if (this.warning === message) return;
    this.warning = message;
    console.warn('🔥 Sync:', message);
    this._notifyStatus();
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
