// ═══════════════════════════════════════════════════════════════════
// 🏷️ Identità del ristorante (spazio cloud)
//
// Ogni ristorante ha il proprio spazio nel Realtime Database:
//   sea_pos/v2/restaurants/<rid>/
//
// Il `rid` viene calcolato in modo STABILE a partire dal nome del
// ristorante: due telefoni dello stesso ristorante (anche se
// installati in momenti diversi) ottengono lo stesso `rid` e quindi
// si sincronizzano tra loro, senza dover incollare nessun codice.
//
// Se il nome non è ancora noto → `rid` casuale (la configurazione
// iniziale lo chiederà comunque).
// ═══════════════════════════════════════════════════════════════════

/** Chiave normalizzata del ristorante (per il percorso legacy) */
export function normalizeRestaurantKey(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

/** hash a 8 caratteri (FNV-1a + djb2) */
function hash8(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = (h1 ^ c) >>> 0;
    h1 = (h1 * 0x01000193) >>> 0;
    h2 = (h2 + c * (i + 7)) >>> 0;
  }
  return (h1.toString(16) + h2.toString(16)).padStart(8, '0').slice(0, 8);
}

/**
 * 🏷️ `rid` stabile derivato dal nome del ristorante.
 * Restituisce '' se il nome non è utilizzabile.
 */
export function ridFromName(name: string): string {
  const key = normalizeRestaurantKey(name);
  if (!key) return '';
  return `r_${hash8(key)}`;
}

/** 🎲 `rid` casuale (quando il nome non è ancora noto) */
export function randomRid(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 10; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `r_${out}`;
}

/** ✅ `rid` valido? */
export function isValidRid(rid: string | null | undefined): boolean {
  return typeof rid === 'string' && /^r_[a-z0-9_]{4,48}$/i.test(rid);
}
