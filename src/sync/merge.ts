// ═══════════════════════════════════════════════════════════════════
// 🔀 Sea POS - Merge engine (3-way merge)
// ═══════════════════════════════════════════════════════════════════
// Fondamentale per la sincronizzazione multi-dispositivo:
//
//   base   = ultimo stato sincronizzato con il cloud (salvato sul device)
//   local  = stato attuale di QUESTO dispositivo
//   remote = stato attuale nel cloud (un altro dispositivo ha scritto)
//
// Regola: se solo uno tra local/remote è cambiato rispetto a base,
// si vince il cambiamento. Se entrambi sono cambiati → conflitto:
// vince local (il dispositivo che sta lavorando ora), tranne per i
// contatori (quantità magazzino) dove si sommano le differenze.
//
// Così due telefoni che lavorano in parallelo NON si sovrascrivono a
// vicenda: ogni modifica viene conservata.
// ═══════════════════════════════════════════════════════════════════

export type SyncCollection =
  | 'users'
  | 'inventory'
  | 'inventoryLogs'
  | 'tables'
  | 'receipts'
  | 'profile';

export const SYNC_COLLECTIONS: SyncCollection[] = [
  'users',
  'inventory',
  'inventoryLogs',
  'tables',
  'receipts',
  'profile',
];

/** Collezioni di sola scrittura (append-only): si uniscono per id */
const APPEND_ONLY: SyncCollection[] = ['inventoryLogs', 'receipts'];

export function isDeepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => isDeepEqual(item, b[i]));
  }

  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => isDeepEqual(a[k], b[k]));
}

/**
 * Merge di un singolo valore.
 * - local === remote        → local
 * - local === base          → remote ha cambiato → remote
 * - remote === base         → local ha cambiato  → local
 * - conflitto               → local (vince chi sta lavorando)
 */
export function mergeValue(base: any, local: any, remote: any): any {
  if (isDeepEqual(local, remote)) return local;
  if (isDeepEqual(local, base)) return remote;
  if (isDeepEqual(remote, base)) return local;
  return local;
}

/** Merge 3-way di un oggetto piano (es. profilo ristorante) */
export function mergeFlatObject(
  base: Record<string, any> | undefined,
  local: Record<string, any> | undefined,
  remote: Record<string, any> | undefined
): Record<string, any> {
  const b = base || {};
  const l = local || {};
  const r = remote || {};
  const keys = new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)]);

  const out: Record<string, any> = {};
  keys.forEach((key) => {
    out[key] = mergeValue(b[key], l[key], r[key]);
  });
  return out;
}

/** Merge 3-way di una lista di oggetti identificati per `id` */
/** Indicizza una lista di oggetti per il campo `id` */
function indexById<T extends { id: string }>(list: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  list.forEach((item) => {
    if (item && item.id) out[item.id] = item;
  });
  return out;
}

export function mergeEntityList<T extends { id: string }>(
  base: T[] | undefined,
  local: T[] | undefined,
  remote: T[] | undefined,
  options?: {
    /** campi numerici "contatore" (es. quantità) da sommare invece di sovrascrivere */
    counterFields?: string[];
    /** merge custom per singolo elemento */
    mergeItem?: (base: T | undefined, local: T | undefined, remote: T | undefined) => T | null;
    /**
     * ⚠️ Se false, il remoto NON può cancellare elementi presenti in locale.
     * Serve quando il remoto è più vecchio del nostro stato: un dispositivo
     * vecchio (o uno stato parziale) non deve poter cancellare gli account
     * del ristorante. Default: true.
     */
    allowRemoteDeletions?: boolean;
  }
): T[] {
  const counterFields = options?.counterFields || [];
  const allowRemoteDeletions = options?.allowRemoteDeletions !== false;
  const b = indexById(base || []);
  const l = indexById(local || []);
  const r = indexById(remote || []);

  const ids = new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)]);
  const out: T[] = [];

  ids.forEach((id) => {
    const baseItem = b[id];
    const localItem = l[id];
    const remoteItem = r[id];

    // ── Cancellazioni ──
    // Se l'elemento esisteva nello stato condiviso e uno dei due
    // dispositivi lo ha rimosso → la cancellazione vince (così un utente
    // eliminato su un telefono sparisce anche sugli altri).
    if (baseItem && !localItem) return; // rimosso da questo dispositivo
    if (allowRemoteDeletions && baseItem && !remoteItem) return; // rimosso dall'altro dispositivo

    if (!localItem && !remoteItem) return;

    if (!localItem) {
      // solo remote → remote
      out.push(remoteItem!);
      return;
    }
    if (!remoteItem) {
      // solo local → local
      out.push(localItem);
      return;
    }

    // merge personalizzato (es. tavoli con i loro ordini)
    if (options?.mergeItem) {
      const merged = options.mergeItem(baseItem, localItem, remoteItem);
      if (merged) out.push(merged);
      return;
    }

    // entrambi esistono → merge campo per campo
    const merged: any = { ...remoteItem };
    const keys = new Set([
      ...Object.keys(baseItem || {}),
      ...Object.keys(localItem),
      ...Object.keys(remoteItem),
    ]);
    keys.forEach((key) => {
      if (key === 'id') return;
      if (counterFields.includes(key)) {
        merged[key] = mergeCounter(
          baseItem ? (baseItem as any)[key] : undefined,
          (localItem as any)[key],
          (remoteItem as any)[key]
        );
        return;
      }
      merged[key] = mergeValue(
        baseItem ? (baseItem as any)[key] : undefined,
        (localItem as any)[key],
        (remoteItem as any)[key]
      );
    });
    out.push(merged as T);
  });

  return out;
}

/**
 * Merge di un contatore numerico (quantità magazzino):
 *   - se local === remote  → stessa modifica applicata su entrambi i
 *                           dispositivi: si conta una volta sola
 *   - se solo local cambiò → remote + (local - base)
 *   - se solo remote cambiò → remote
 *   - se entrambi cambiarono → remote + (local - base)  ← nessuna perdita
 */
export function mergeCounter(
  base: number | undefined,
  local: number | undefined,
  remote: number | undefined
): number {
  const b = typeof base === 'number' ? base : 0;
  const l = typeof local === 'number' ? local : 0;
  const r = typeof remote === 'number' ? remote : 0;

  if (l === r) return l; // stessa modifica sui due dispositivi → conta una volta
  if (l === b) return r; // solo remote è cambiato
  return r + (l - b); // delta locale applicato sopra il remoto
}

/** Merge di un array di oggetti dentro un oggetto (es. currentOrderItems) */
export function mergeNestedList<T extends { id: string }>(
  base: T[] | undefined,
  local: T[] | undefined,
  remote: T[] | undefined
): T[] {
  return mergeEntityList(base, local, remote);
}

/**
 * Merge di una collezione completa.
 * `base` può essere undefined (primo sync) → in quel caso si usa
 * un merge "2-way" che privilegia il union per id.
 *
 * ⚠️ `options.allowRemoteDeletions = false` → il remoto non può cancellare
 * elementi che abbiamo in locale (usato quando il remoto è più vecchio).
 */
export function mergeCollection(
  name: SyncCollection,
  base: any,
  local: any,
  remote: any,
  options?: { allowRemoteDeletions?: boolean }
): any {
  const allowRemoteDeletions = options?.allowRemoteDeletions !== false;

  // Profilo ristorante → oggetto piano
  if (name === 'profile') {
    return mergeFlatObject(base, local, remote);
  }

  // Liste append-only → unione per id
  if (APPEND_ONLY.includes(name)) {
    const map = new Map<string, any>();
    (remote || []).forEach((item: any) => map.set(item.id, item));
    (local || []).forEach((item: any) => map.set(item.id, item));
    const merged = Array.from(map.values());
    // ⚠️ ordine: PRIMA il più recente (come nello stato locale, dove la
    //    ricevuta nuova viene inserita in testa). Prima il merge ordinava
    //    dal più vecchio: dopo una sincronizzazione la dashboard mostrava
    //    le scontrini PIÙ VECCHIE al posto delle ultime.
    merged.sort((a: any, b: any) => {
      const ta = new Date(a.timestamp || a.date || 0).getTime();
      const tb = new Date(b.timestamp || b.date || 0).getTime();
      return tb - ta;
    });
    return merged;
  }

  // Magazzino → contatore quantità sommato
  if (name === 'inventory') {
    return mergeEntityList(base, local, remote, {
      counterFields: ['currentQuantity'],
      allowRemoteDeletions,
    });
  }

  // Tavoli → merge listale + merge dei singoli ordini
  if (name === 'tables') {
    return mergeEntityList(base, local, remote, {
      allowRemoteDeletions,
      mergeItem: (baseItem, localItem, remoteItem) => {
        const b: any = baseItem;
        const l: any = localItem;
        const r: any = remoteItem;
        // cancellazione (da uno dei due dispositivi) → il tavolo sparisce
        if (b && !l) return null;
        if (!l && !r) return null;
        if (!l) return r;
        if (!r) return l;

        const merged: any = { ...r };
        const keys = new Set([
          ...Object.keys(b || {}),
          ...Object.keys(l),
          ...Object.keys(r),
        ]);
        keys.forEach((key) => {
          if (key === 'id') return;
          if (key === 'currentOrderItems') {
            merged[key] = mergeNestedList(
              b?.currentOrderItems,
              l.currentOrderItems,
              r.currentOrderItems
            );
            return;
          }
          merged[key] = mergeValue(b ? b[key] : undefined, l[key], r[key]);
        });
        return merged as any;
      },
    });
  }

  // Utenti → merge generico per id
  return mergeEntityList(base, local, remote, { allowRemoteDeletions });
}

/**
 * ⚠️ Normalizza i dati ricevuti dal cloud.
 *
 * Il Realtime Database NON salva le array vuote: quando una collezione è
 * vuota (es. all'avvio, quando l'app parte con zero dati) la chiave
 * `data` sparisce dal payload. Senza questa normalizzazione l'app
 * riceverebbe `undefined` al posto di `[]` e andrebbe in crash.
 */
export function normalizeCollectionData(name: SyncCollection, data: any): any {
  if (name === 'profile') {
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  }
  return Array.isArray(data) ? data : [];
}

/** Verifica se la collezione merged è diversa dalla locale (→ da pushare) */
export function collectionChanged(a: any, b: any): boolean {
  return !isDeepEqual(a, b);
}
