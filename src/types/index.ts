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
}

export type PaymentMethod = 'contanti' | 'carta' | 'misto';

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
}
