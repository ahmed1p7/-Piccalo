// ═══════════════════════════════════════════════════════════════════
// 🧟 Rilevamento dei dati DEMO (vecchio seed 1.1.x)
//
// Il bug più grave segnalato dal ristorante: a ogni aggiornamento
// l'app perdeva i dati veri e li sostituiva con i dati demo della
// prima versione (Admin/5555, 21 articoli, tavoli tbl_1..tbl_banco).
//
// Motivo: il cloud usava un percorso GLOBALE condiviso
// (sea_pos/shared_state) e il merge poteva farlo vincere sullo stato
// locale. Qui identifichiamo i dati demo per escluderli dal merge e
// per offrire all'utente un pulsante di pulizia.
//
// Gli id sono quelli del seed originale (commit 3c3f60b).
// ═══════════════════════════════════════════════════════════════════

import type { SyncCollection } from './merge';

/** 👤 Account demo (PIN pubblici: 5555 / 1111 / 2222 / 3333 / 4444) */
export const LEGACY_USER_IDS = [
  'user_admin',
  'user_cameriere',
  'user_cucina',
  'user_bar_cucina',
  'user_cassiere',
];

/** 🍽️ Tavoli demo */
export const LEGACY_TABLE_IDS = [
  'tbl_1',
  'tbl_2',
  'tbl_3',
  'tbl_4',
  'tbl_5',
  'tbl_6',
  'tbl_7',
  'tbl_8',
  'tbl_banco',
];

/** 📦 Articoli demo (materie prime + prodotti finiti) */
export const LEGACY_INVENTORY_IDS = [
  'mat_1',
  'mat_2',
  'mat_3',
  'mat_4',
  'mat_5',
  'mat_6',
  'mat_7',
  'mat_8',
  'prod_1',
  'prod_2',
  'prod_3',
  'prod_4',
  'prod_5',
  'prod_6',
  'prod_7',
  'prod_8',
  'prod_9',
  'prod_10',
];

/** 🧾 Scontrini demo */
export const LEGACY_RECEIPT_IDS = ['rec_seed_1', 'rec_seed_2'];

/** 🔤 Username demo (per varianti con id diverso) */
const LEGACY_USER_NAMES = ['admin'];

function legacyIdsFor(collection: SyncCollection): string[] {
  switch (collection) {
    case 'users':
      return LEGACY_USER_IDS;
    case 'tables':
      return LEGACY_TABLE_IDS;
    case 'inventory':
      return LEGACY_INVENTORY_IDS;
    case 'receipts':
      return LEGACY_RECEIPT_IDS;
    default:
      return [];
  }
}

function idsOf(data: any): string[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item: any) => (item && typeof item.id === 'string' ? item.id : ''))
    .filter(Boolean);
}

/**
 * 🧟 true se la collezione contiene SOLO dati demo.
 *
 * ⚠️ Deliberatamente conservativo: se anche un solo elemento non è
 * demo, la collezione è considerata reale (non va bloccata).
 */
export function isLegacyDemoCollection(
  collection: SyncCollection,
  data: any
): boolean {
  const legacy = legacyIdsFor(collection);
  if (!legacy.length) return false;
  const ids = idsOf(data);
  if (!ids.length) return false;
  return ids.every((id) => legacy.includes(id));
}

/**
 * 🧟 true se la collezione contiene ALMENO un elemento demo.
 * (usato per il badge "dati demo presenti" e per la pulizia)
 */
export function hasLegacyDemoItems(
  collection: SyncCollection,
  data: any
): boolean {
  const legacy = legacyIdsFor(collection);
  if (!legacy.length) return false;
  return idsOf(data).some((id) => legacy.includes(id));
}

/**
 * 🧹 Rimuove gli elementi demo da una collezione.
 * Restituisce la collezione filtrata + quanti elementi sono stati rimossi.
 */
export function stripLegacyDemoItems(
  collection: SyncCollection,
  data: any
): { data: any; removed: number } {
  const legacy = legacyIdsFor(collection);
  if (!legacy.length || !Array.isArray(data)) return { data, removed: 0 };
  const kept = data.filter(
    (item: any) => !(item && legacy.includes(item.id))
  );
  return { data: kept, removed: data.length - kept.length };
}

/**
 * 🔐 Account demo rimovibili in sicurezza.
 *
 * ⚠️ Non si rimuove mai l'ultimo amministratore: se l'unico admin è
 * quello demo (Admin/5555) l'app resterebbe chiusa fuori dal
 * ristorante. In quel caso non si cancella nulla.
 */
export function stripLegacyDemoUsersSafely(users: any): {
  users: any;
  removed: number;
  keptLastAdmin: boolean;
} {
  if (!Array.isArray(users)) return { users, removed: 0, keptLastAdmin: false };

  const isDemo = (u: any) =>
    !!u &&
    (LEGACY_USER_IDS.includes(u.id) ||
      (typeof u.username === 'string' &&
        LEGACY_USER_NAMES.includes(u.username.toLowerCase().trim())));

  const realAdmins = users.filter(
    (u: any) => u && u.role === 'admin' && !isDemo(u)
  );

  // Se l'unico admin è demo → non cancellare (sblocco l'app)
  if (realAdmins.length === 0) {
    const hasDemoAdmin = users.some(
      (u: any) => u && u.role === 'admin' && isDemo(u)
    );
    if (hasDemoAdmin) {
      return { users, removed: 0, keptLastAdmin: true };
    }
  }

  const kept = users.filter((u: any) => !isDemo(u));
  return { users: kept, removed: users.length - kept.length, keptLastAdmin: false };
}
