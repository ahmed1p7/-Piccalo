// ═══════════════════════════════════════════════════════════════════
// 💾 Copia di sicurezza locale (anti perdita dati)
//
// Il problema segnalato dal ristorante: "a ogni aggiornamento
// perdo i dati del ristorante".
//
// In realtà quasi sempre i dati non sparivano dal cloud: venivano
// sostituiti da altri (i dati demo o quelli di un altro ristorante)
// perché il percorso cloud era globale. Ma una perdita vera in
// dispositivo restava possibile (WebView cancellata, app
// reinstallata, storage corrotto).
//
// Qui teniamo una COPIA COMPLETA dello stato in una chiave separata,
// scritta in modo atomico e verificata: se la chiave principale è
// vuota o corrotta, si ripristina da qui.
//
// Ogni snapshot contiene anche un checksum semplice: se i dati non
// corrispondono, lo snapshot viene scartato (niente dati corrotti
// ripristinati sopra dati buoni).
// ═══════════════════════════════════════════════════════════════════

export const SNAPSHOT_KEY = 'sea_pos_snapshot_v2';
export const SNAPSHOT_VERSION = 2;

export interface LocalSnapshot {
  version: number;
  savedAt: string;
  checksum: string;
  data: Record<string, any>;
}

/** checksum veloce e stabile (non crittografico: serve solo a detectare corruzioni) */
export function checksumOf(value: any): string {
  try {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      h1 = (h1 ^ c) >>> 0;
      h1 = (h1 * 0x01000193) >>> 0;
      h2 = (h2 + c * (i + 1)) >>> 0;
    }
    return `${h1.toString(16)}-${h2.toString(16)}-${text.length.toString(16)}`;
  } catch {
    return 'err';
  }
}

/**
 * 💾 Salva (o completa) lo snapshot locale.
 * `partial` può contenere solo le chiavi modificate: le altre restano.
 */
export function writeSnapshot(partial: Record<string, any>): void {
  try {
    const current = readSnapshot();
    const data = { ...(current?.data || {}), ...partial };
    const payload: LocalSnapshot = {
      version: SNAPSHOT_VERSION,
      savedAt: new Date().toISOString(),
      checksum: checksumOf(data),
      data,
    };
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(payload));
  } catch {
    /* quota piena o storage non disponibile: si ignora */
  }
}

/** 📖 Legge lo snapshot locale (null se assente o corrotto). */
export function readSnapshot(): LocalSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalSnapshot;
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return null;
    if (parsed.checksum && parsed.checksum !== checksumOf(parsed.data)) {
      console.warn('💾 Snapshot locale corrotto: ignorato');
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** 🕒 Data dell'ultimo snapshot valido (null se assente). */
export function snapshotSavedAt(): string | null {
  return readSnapshot()?.savedAt ?? null;
}

/**
 * 🛟 Legge una collezione dallo storage con fallback sulla copia di
 * sicurezza.
 * Restituisce anche da dove arriva il dato (per mostrare un avviso).
 */
export function readWithBackup<T>(
  key: string,
  fallback: T
): { value: T; source: 'primary' | 'snapshot' | 'fallback' } {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null && raw !== undefined) {
      try {
        const parsed = JSON.parse(raw);
        return { value: parsed as T, source: 'primary' };
      } catch {
        console.warn(`💾 ${key}: dati locali corrotti, ripristino dalla copia`);
      }
    }
  } catch {
    /* ignore */
  }

  const snapshot = readSnapshot();
  if (snapshot && snapshot.data && snapshot.data[key] !== undefined) {
    return { value: snapshot.data[key] as T, source: 'snapshot' };
  }

  return { value: fallback, source: 'fallback' };
}
