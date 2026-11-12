export type UserRole =
  | 'admin'
  | 'cameriere'
  | 'cucina'
  | 'bar_cucina'
  | 'cassiere'
  | 'personalizzato';

export interface UserPermissions {
  canAccessCassa: boolean;
  canAccessMagazzino: boolean;
  canAccessBar: boolean;
  canAccessCucina: boolean;
  canAccessTavoli: boolean;
  canManageUsers: boolean;
  canManageBackup: boolean;
  canViewReports: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  displayName: string;
  pin: string; // 4-digit PIN
  role: UserRole;
  permissions: UserPermissions;
  avatarColor: string;
}

export type ItemType = 'materiale' | 'prodotto';
export type ItemCategory = 'cibo' | 'bevande' | 'pulizia' | 'packaging' | 'altro';
export type StockStatus = 'ok' | 'quasi_finito' | 'esaurito';

export interface InventoryItem {
  id: string;
  name: string;
  type: ItemType; // 'materiale' (raw materials) or 'prodotto' (finished goods/drinks)
  category: ItemCategory;
  currentQuantity: number;
  minThreshold: number; // Soglia minima per alert
  unit: string; // kg, lt, pz, conf, bt
  supplier: string; // Fornitore
  expirationDate?: string; // YYYY-MM-DD
  notes?: string;
  costPrice?: number; // Costo fornitore in €
  sellPrice?: number; // Prezzo vendita al pubblico in € (per prodotti)
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

export interface InventoryLog {
  id: string;
  itemId: string;
  itemName: string;
  changeType: 'carico' | 'scarico' | 'rettifica' | 'vendita';
  deltaQuantity: number;
  finalQuantity: number;
  userName: string;
  timestamp: string;
  reason?: string;
}

export type OrderItemDestination = 'cucina' | 'bar' | 'cassa';
export type OrderItemStatus = 'ordinato' | 'in_preparazione' | 'pronto' | 'servito';

export interface OrderItem {
  id: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  destination: OrderItemDestination;
  status: OrderItemStatus;
  addedAt: string;
}

export type TableStatus = 'libero' | 'occupato' | 'in_conto';

export interface RestaurantTable {
  id: string;
  number: number;
  name: string;
  status: TableStatus;
  seats: number;
  billAmount: number; // Importo totale da pagare per il tavolo (modificabile in qualsiasi momento)
  currentOrderItems?: OrderItem[];
  waiterName?: string;
  openedAt?: string;
  coversCount?: number;
  notes?: string;
  /** 🧾 pagamenti già registrati su questo tavolo (possono essere più di uno) */
  payments?: TablePayment[];
}

export type PaymentMethod = 'contanti' | 'carta' | 'misto';

/**
 * 💳 Pagamento registrato su un tavolo.
 * Un tavolo può avere PIÙ pagamenti (anche con metodi diversi) finché
 * il totale non è copierto: questo permette di incassare una parte
 * con la carta e un'altra parte in contanti, anche a distanza di ore.
 */
export interface TablePayment {
  id: string;
  tableId: string;
  tableName: string;
  amount: number; // importo effettivamente incassato (senza contante ricevuto)
  method: 'contanti' | 'carta';
  cashGiven?: number; // contante consegnato dal cliente (solo 'contanti')
  changeGiven: number; // resto restituito
  cashierName: string;
  createdAt: string; // ISO
  note?: string;
  /** quota di una divisione del conto (se il pagamento proviene da uno split) */
  splitLabel?: string;
}

/**
 * 👥 Quota di un conto diviso.
 * `amountDue` è calcolato (uguale o proporzionale), `ratio` la percentuale
 * usata nel caso di divisione non equa.
 */
export interface PaymentSplitRecord {
  id: string;
  personLabel: string;
  amountDue: number;
  amountPaid: number;
  method: PaymentMethod;
  cashGiven?: number;
  cardPaid?: number;
  changeReturned: number;
  isPaid: boolean;
  assignedItems?: string[]; // IDs of order items assigned to this person
  /** percentuale (0-100) nel caso di divisione per quote */
  ratio?: number;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  date: string; // ISO string
  tableName?: string;
  coversCount: number;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  cashAmount: number;
  cardAmount: number;
  changeGiven: number;
  cashierName: string;
  splitDetails?: PaymentSplitRecord[];
  /** 🧾 dettaglio delle singole operazioni di pagamento (più metodi) */
  payments?: TablePayment[];
  notes?: string;
}

export interface RestaurantProfile {
  name: string;
  subTitle: string;
  address: string;
  pIva: string;
  phone: string;
  wifiSsid: string;
  wifiPassword?: string;
  tableCount: number;
  /**
   * 🏷️ Identificatore univoco del ristorante.
   *
   * Ogni ristorante ha il SUO spazio nel cloud (sea_pos/v2/restaurants/<rid>).
   * Prima della v1.6.0 il percorso era globale: i dati di un ristorante
   * si mescolavano con quelli di un altro (e con il seed demo) → perdita
   * dati agli aggiornamenti.
   */
  rid?: string;
}
