// ═══════════════════════════════════════════════════════════════════
// 🔄 Sea POS - Trasporto Realtime Database
// Sincronizzazione in tempo reale tramite Firebase Realtime Database.
// I listener `onValue` aggiornano l'app immediatamente quando un altro
// dispositivo scrive — esattamente come in una chat.
//
// ⚠️ STRUTTURA v2 — UNO SPAZIO PER OGNI RISTORANTE
//
// Prima (v1.x) il percorso era GLOBALE:
//   sea_pos/shared_state/collections/<nome>
// → tutti i ristoranti che usano l'app scrivevano nello stesso
//   spazio: i dati di un ristorante si mescolavano con quelli di un
//   altro e con il seed demo → "ho perso i miei dati".
//
// Ora ogni ristorante ha il suo spazio (identificato dal `rid`):
//   sea_pos/v2/restaurants/<rid>/collections/<nome> = { data, updatedAt, deviceId }
//   sea_pos/v2/restaurants/<rid>/devices/<deviceId> = { id, name, role, ... }
//   sea_pos/v2/index/<rid> = { rid, name, city, updatedAt, devices }
//
// Il percorso vecchio resta leggibile per la migrazione (è lì che
// l'app 1.x aveva salvato i dati).
// ═══════════════════════════════════════════════════════════════════

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  update,
  remove,
  get,
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

/** 📇 Voce dell'indice dei ristoranti (per l'adozione automatica) */
export interface RestaurantIndexEntry {
  rid: string;
  name: string;
  city?: string;
  updatedAt: number;
  devices?: number;
}

export interface SyncTransport {
  readonly name: string;
  connect(): Promise<boolean>;
  disconnect(): void;
  /** ultimo errore di trasporto (es. "Permission denied") */
  getLastError?(): string | null;
  isConnected(): boolean;
  subscribe(
    onState: (state: CloudState) => void,
    onError: (error: Error) => void
  ): void;
  writeCollection(collection: SyncCollection, payload: CollectionPayload): Promise<void>;
  writeDevice(device: DeviceInfo): Promise<void>;
  /** 🧹 cancella tutti i dati condivisi (ripristino di fabbrica) */
  wipeState(): Promise<void>;

  // ── v2: spazio per ristorante ──────────────────────────────────
  /** imposta lo spazio (rid) del ristorante corrente */
  setScope?(scope: string | null): void;
  /** legge l'indice dei ristoranti presenti nel cloud */
  readIndex?(): Promise<RestaurantIndexEntry[]>;
  /** pubblica/aggiorna la voce del ristorante nell'indice */
  writeIndexEntry?(entry: RestaurantIndexEntry): Promise<void>;
  /** rimuove la voce del ristorante dall'indice */
  removeIndexEntry?(rid: string): Promise<void>;
  /** ascolta l'indice dei ristoranti (scoperta automatica) */
  subscribeIndex?(cb: (entries: RestaurantIndexEntry[]) => void): void;
  /** legge lo stato del vecchio percorso globale (migrazione 1.x → 2) */
  readLegacyState?(): Promise<CloudState | null>;
  /** scrive il rid nel percorso legacy (per far convergere i telefoni) */
  writeLegacyRid?(key: string, rid: string): Promise<void>;
  /** legge il rid già pubblicato nel percorso legacy */
  readLegacyRid?(key: string): Promise<string | null>;
}

/** Percorso legacy (1.x) — ancora leggibile per la migrazione */
const LEGACY_STATE_PATH = 'sea_pos/shared_state';
/** Percorso v2 */
const V2_ROOT = 'sea_pos/v2';

/**
 * 🧹 Rimuove i valori `undefined` prima di scrivere.
 *
 * ⚠️ Il Realtime Database RIFIUTA le scritture che contengono `undefined`
 *    ("values argument contains undefined") → se un tavolo ha un campo
 *    facoltativo vuoto (es. notes) l'intera collezione non veniva più
 *    sincronizzata. Firestore invece accetta undefined.
 *
 * I valori `undefined` vengono semplicemente omessi; `null` viene
 * convertito in stringa vuota per non cancellare il campo.
 */
export function sanitizeForRTDB<T = any>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForRTDB(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [key, val] of Object.entries(value as Record<string, any>)) {
      if (val === undefined) continue; // campo omesso
      if (val === null) {
        out[key] = '';
        continue;
      }
      out[key] = sanitizeForRTDB(val);
    }
    return out as unknown as T;
  }
  return value;
}

export class RealtimeDbTransport implements SyncTransport {
  readonly name = 'Realtime Database';

  private app: FirebaseApp | null = null;
  private db: Database | null = null;
  private listenerRef: any = null;
  private indexListenerRef: any = null;
  private connected = false;
  private lastError: string | null = null;
  /** 🏷️ spazio del ristorante (rid). null = scoperta / primo avvio */
  private scope: string | null = null;

  constructor(
    private config: {
      apiKey: string;
      authDomain: string;
      projectId: string;
      databaseURL?: string;
    },
    scope?: string | null
  ) {
    this.scope = scope ?? null;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 📍 Percorsi
  // ═══════════════════════════════════════════════════════════════════

  /** percorso dello stato del ristorante corrente */
  private get statePath(): string {
    return this.scope
      ? `${V2_ROOT}/restaurants/${this.scope}`
      : `${V2_ROOT}/restaurants/__pending__`;
  }

  /** percorso dell'indice dei ristoranti */
  private get indexPath(): string {
    return `${V2_ROOT}/index`;
  }

  setScope(scope: string | null): void {
    this.scope = scope || null;
  }

  getScope(): string | null {
    return this.scope;
  }

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
      console.log(
        '🔥 Realtime DB: connesso a',
        url,
        this.scope ? `(ristorante ${this.scope})` : '(in attesa di scoperta)'
      );
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
    if (this.indexListenerRef && this.db) {
      try {
        off(this.indexListenerRef);
      } catch {
        /* ignore */
      }
    }
    this.listenerRef = null;
    this.indexListenerRef = null;
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
    // ⚠️ stacca il listener precedente (cambio di spazio ristorante)
    if (this.listenerRef) {
      try {
        off(this.listenerRef);
      } catch {
        /* ignore */
      }
      this.listenerRef = null;
    }
    const stateRef = ref(this.db, this.statePath);

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

  /** 📇 ascolta l'indice dei ristoranti (per la scoperta automatica) */
  subscribeIndex(cb: (entries: RestaurantIndexEntry[]) => void): void {
    if (!this.db) return;
    const indexRef = ref(this.db, this.indexPath);
    const listener = onValue(indexRef, (snapshot) => {
      const raw = (snapshot.val() || {}) as Record<string, RestaurantIndexEntry>;
      const entries = Object.entries(raw)
        .map(([rid, entry]) => ({ ...(entry || ({} as any)), rid }))
        .filter((e) => !!e.rid)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      cb(entries);
    });
    // conserva il riferimento per staccarlo alla disconnessione
    this.indexListenerRef = listener;
  }

  async writeCollection(
    collection: SyncCollection,
    payload: CollectionPayload
  ): Promise<void> {
    if (!this.db) throw new Error('Realtime DB non connesso');
    if (!this.scope) throw new Error('Nessun ristorante selezionato');
    // ⚠️ senza sanitizzazione il RTDB rifiuta la scrittura se un campo
    //    facoltativo è undefined (es. tavolo senza "notes")
    const clean = sanitizeForRTDB(payload);
    await update(ref(this.db, `${this.statePath}/collections`), {
      [collection]: clean,
    });
  }

  /** 🧹 Cancella lo stato del ristorante corrente (non degli altri!) */
  async wipeState(): Promise<void> {
    if (!this.db) throw new Error('Realtime DB non connesso');
    if (!this.scope) return;
    await remove(ref(this.db, `${this.statePath}/collections`));
    await remove(ref(this.db, `${this.statePath}/devices`));
  }

  async writeDevice(device: DeviceInfo): Promise<void> {
    if (!this.db) throw new Error('Realtime DB non connesso');
    if (!this.scope) return;
    await set(ref(this.db, `${this.statePath}/devices/${device.id}`), {
      ...device,
      lastSeen: Date.now(),
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 📇 Indice dei ristoranti
  // ═══════════════════════════════════════════════════════════════════

  async readIndex(): Promise<RestaurantIndexEntry[]> {
    if (!this.db) return [];
    try {
      const snap = await get(ref(this.db, this.indexPath));
      const raw = (snap.val() || {}) as Record<string, RestaurantIndexEntry>;
      return Object.entries(raw)
        .map(([rid, entry]) => ({ ...(entry || ({} as any)), rid }))
        .filter((e) => !!e.rid)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } catch (error: any) {
      this.lastError = error?.message || String(error);
      return [];
    }
  }

  async writeIndexEntry(entry: RestaurantIndexEntry): Promise<void> {
    if (!this.db || !entry?.rid) return;
    await set(ref(this.db, `${this.indexPath}/${entry.rid}`), {
      ...sanitizeForRTDB(entry),
      updatedAt: entry.updatedAt || Date.now(),
    });
  }

  async removeIndexEntry(rid: string): Promise<void> {
    if (!this.db || !rid) return;
    await remove(ref(this.db, `${this.indexPath}/${rid}`));
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🔁 Migrazione dal percorso globale (1.x)
  // ═══════════════════════════════════════════════════════════════════

  async readLegacyState(): Promise<CloudState | null> {
    if (!this.db) return null;
    try {
      const snap = await get(ref(this.db, LEGACY_STATE_PATH));
      const raw = (snap.val() || {}) as any;
      if (!raw || (!raw.collections && !raw.devices)) return null;
      return {
        collections: (raw.collections || {}) as CloudState['collections'],
        devices: (raw.devices || {}) as Record<string, DeviceInfo>,
      };
    } catch {
      return null;
    }
  }

  async writeLegacyRid(key: string, rid: string): Promise<void> {
    if (!this.db || !key || !rid) return;
    try {
      await set(ref(this.db, `${LEGACY_STATE_PATH}/meta/rid_by_name/${key}`), rid);
    } catch {
      /* ignore */
    }
  }

  async readLegacyRid(key: string): Promise<string | null> {
    if (!this.db || !key) return null;
    try {
      const snap = await get(
        ref(this.db, `${LEGACY_STATE_PATH}/meta/rid_by_name/${key}`)
      );
      const val = snap.val();
      return typeof val === 'string' && val ? val : null;
    } catch {
      return null;
    }
  }
}
