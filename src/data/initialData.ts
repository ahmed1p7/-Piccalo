// ═══════════════════════════════════════════════════════════════════
// 🧹 STATO INIZIALE — VUOTO DI INTENTO
// ═══════════════════════════════════════════════════════════════════
// L'applicazione NON crea più dati fittizi: nessun ristorante di prova,
// nessun magazzino di esempio, nessun tavolo predefinito, nessun
// account "Admin" con PIN pubblico.
//
// Al primo avvio l'utente configura il proprio ristorante e il proprio
// account amministratore (vedi SetupScreen). Dopo il "Ripristino di
// Fabbrica" l'app torna esattamente a questo stato: ZERO dati.
//
// Nota: gli ID dei tipi sono mantenuti come stringhe vuote perché il
// contesto (AppContext) usa questi array come fallback quando il
// localStorage è vuoto.
// ═══════════════════════════════════════════════════════════════════

import { InventoryItem, RestaurantProfile, RestaurantTable, UserAccount } from '../types';

export const INITIAL_PROFILE: RestaurantProfile = {
  name: '',
  subTitle: '',
  address: '',
  pIva: '',
  phone: '',
  wifiSsid: '',
  wifiPassword: '',
  tableCount: 0,
};

/** Nessun account predefinito: l'admin viene creato dall'utente al primo avvio */
export const INITIAL_USERS: UserAccount[] = [];

/** Nessun articolo di magazzino predefinito */
export const INITIAL_INVENTORY: InventoryItem[] = [];

/** Nessun tavolo predefinito */
export const INITIAL_TABLES: RestaurantTable[] = [];
