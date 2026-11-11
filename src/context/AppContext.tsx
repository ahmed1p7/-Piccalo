import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  INITIAL_INVENTORY,
  INITIAL_PROFILE,
  INITIAL_TABLES,
  INITIAL_USERS,
} from '../data/initialData';
import {
  InventoryItem,
  InventoryLog,
  OrderItem,
  OrderItemStatus,
  PaymentMethod,
  PaymentSplitRecord,
  Receipt,
  RestaurantProfile,
  TablePayment,
  RestaurantTable,
  TableStatus,
  UserAccount,
} from '../types';
import firebaseSyncManager from '../sync/FirebaseSyncManager';
import syncManager from '../sync/SyncManager';
import { getDevice } from '../sync/SyncConfig';
import {
  isDeepEqual,
  normalizeCollectionData,
  type SyncCollection,
} from '../sync/merge';

export type ActiveView =
  | 'home'
  | 'cassa'
  | 'magazzino'
  | 'tavoli'
  | 'cucina'
  | 'report'
  | 'utenti'
  | 'impostazioni';

interface AppContextType {
  currentUser: UserAccount | null;
  users: UserAccount[];
  inventory: InventoryItem[];
  inventoryLogs: InventoryLog[];
  tables: RestaurantTable[];
  receipts: Receipt[];
  profile: RestaurantProfile;
  activeView: ActiveView;
  selectedTableForCheckout: RestaurantTable | null;
  lowStockItems: InventoryItem[];
  wifiConnected: boolean;
  syncDevicesCount: number;
  /** 'disconnected' | 'connecting' | 'connected' | 'error' */
  syncStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  /** ultimo errore di sincronizzazione (es. "Permission denied") */
  syncError: string | null;
  toggleWifi: () => void;
  syncAllNow: () => Promise<boolean>;
  pullAllFromCloud: () => Promise<boolean>;
  // Auth
  login: (username: string, passwordOrPin: string) => { success: boolean; message?: string };
  changePassword: (userId: string, newPasswordOrPin: string) => { success: boolean; message?: string };
  loginWithPin: (pin: string, userId?: string) => { success: boolean; message?: string };
  loginUserDirect: (user: UserAccount) => void;
  logout: () => void;
  setActiveView: (view: ActiveView) => void;
  setSelectedTableForCheckout: (table: RestaurantTable | null) => void;
  // Inventory
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  adjustQuantity: (id: string, delta: number, reason: string) => void;
  performPhysicalInventoryCount: (countedMap: Record<string, number>, notes: string) => void;
  // Tables
  addTable: (table: { name: string; number?: number; seats?: number; billAmount?: number; notes?: string }) => void;
  updateTable: (tableId: string, updates: Partial<RestaurantTable>) => void;
  deleteTable: (tableId: string) => void;
  updateTableBillAmount: (tableId: string, amount: number) => void;
  openTable: (tableId: string, covers: number, waiterName?: string, billAmount?: number) => void;
  addOrderItemToTable: (
    tableId: string,
    item: Omit<OrderItem, 'id' | 'status' | 'addedAt'>
  ) => void;
  updateOrderItemStatus: (tableId: string, itemId: string, status: OrderItemStatus) => void;
  removeOrderItemFromTable: (tableId: string, itemId: string) => void;
  setTableStatus: (tableId: string, status: TableStatus) => void;
  freeTable: (tableId: string) => void;
  // Cassa & Ricevute
  /** 💶 registra un pagamento (anche parziale) su un tavolo */
  addTablePayment: (params: {
    tableId: string;
    amount: number;
    method: 'contanti' | 'carta';
    cashGiven?: number;
    note?: string;
    splitLabel?: string;
  }) => { success: boolean; message?: string; payment?: TablePayment; change: number };
  /** totale già incassato su un tavolo */
  getTablePaidAmount: (tableId: string) => number;
  closeBillAndGenerateReceipt: (params: {
    tableId?: string;
    tableName?: string;
    coversCount: number;
    items: OrderItem[];
    totalAmount: number;
    paymentMethod: PaymentMethod;
    cashAmount: number;
    cardAmount: number;
    changeGiven: number;
    splitDetails?: PaymentSplitRecord[];
    notes?: string;
  }) => Receipt;
  // User Management
  addUser: (user: Omit<UserAccount, 'id'>) => void;
  updateUser: (id: string, updates: Partial<UserAccount>) => void;
  deleteUser: (id: string) => void;
  // Backup & Restore
  exportDataAsJSON: () => string;
  importDataFromJSON: (jsonString: string) => boolean;
  resetToInitialData: (alsoCloud?: boolean) => Promise<{ success: boolean; message?: string }>;
  completeSetup: (params: {
    restaurantName: string;
    username: string;
    pin: string;
  }) => { success: boolean; message?: string };
  needsSetup: boolean;
  /** true quando l'app ha finito l'avvio (cloud pronto o timeout) */
  bootstrapDone: boolean;
  /** salta l'attesa del cloud (tastiera "Continua senza sincronizzazione") */
  skipBootstrap: () => void;
  resetTodayTransactions: () => { deletedReceipts: number; resetTables: number };
  updateProfile: (updates: Partial<RestaurantProfile>) => void;
}

const STORAGE_KEYS = {
  USERS: 'ristorante_pos_users_v1',
  INVENTORY: 'ristorante_pos_inventory_v1',
  LOGS: 'ristorante_pos_logs_v1',
  TABLES: 'ristorante_pos_tables_v1',
  RECEIPTS: 'ristorante_pos_receipts_v1',
  PROFILE: 'ristorante_pos_profile_v1',
  CURRENT_USER_ID: 'ristorante_pos_current_user_id_v1',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial state from LocalStorage or fallbacks
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      if (saved) {
        const parsed: UserAccount[] = JSON.parse(saved);
        // 🔧 تمت إزالة كود إجبار admin PIN على 5555 - المستخدم يختار PINه
        return parsed;
      }
      return INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  // 🔒 NESSUN accesso automatico: all'avvio dell'app ogni utente deve
  // inserire le proprie credenziali. Prima l'app riapriva la sessione
  // (e all'installazione Moreover entrava subito con l'account Admin).
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  // 🆕 Primo avvio: nessun utente esistente → serve la configurazione.
  // (diventa falso appena l'admin viene creato o gli utenti arrivano dal cloud)
  const [needsSetup, setNeedsSetup] = useState<boolean>(false);
  // 🔄 Avvio: l'app aspetta il primo stato dal cloud prima di decidere se
  //    mostrare la configurazione iniziale. Così un telefono nuovo che si
  //    collega a un ristorante già attivo adotta i dati da solo.
  const [bootstrapDone, setBootstrapDone] = useState<boolean>(false);
  const bootstrapTimer = useRef<any>(null);

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
    } catch {
      return INITIAL_INVENTORY;
    }
  });

  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [tables, setTables] = useState<RestaurantTable[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TABLES);
      if (saved) {
        const parsed: RestaurantTable[] = JSON.parse(saved);
        return parsed.map((tbl) => ({
          ...tbl,
          billAmount: typeof tbl.billAmount === 'number' ? tbl.billAmount : 0,
          currentOrderItems: tbl.currentOrderItems || [],
        }));
      }
      return INITIAL_TABLES;
    } catch {
      return INITIAL_TABLES;
    }
  });

  const [receipts, setReceipts] = useState<Receipt[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RECEIPTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [profile, setProfile] = useState<RestaurantProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return saved ? JSON.parse(saved) : INITIAL_PROFILE;
    } catch {
      return INITIAL_PROFILE;
    }
  });

  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [selectedTableForCheckout, setSelectedTableForCheckout] =
    useState<RestaurantTable | null>(null);
  const [wifiConnected, setWifiConnected] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'error'
  >('disconnected');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [cloudConnected, setCloudConnected] = useState<boolean>(false);
  const [lanConnected, setLanConnected] = useState<boolean>(false);
  const [syncDevicesCount, setSyncDevicesCount] = useState<number>(0);
  // ultimo valore inviato per collezione (evita il loop A→B→A→B)
  const lastSent = useRef<Record<string, any>>({});

  // ═══════════════════════════════════════════════════════════════════
  // 🔥 Firebase Sync: تزامن سحابي بين عدة أجهزة (هواتف / تابلت)
  // ═══════════════════════════════════════════════════════════════════
  // الاتصال التلقائي عند بدء التطبيق (funziona solo se è stato
  // incollato un "codice di sincronizzazione" oppure se la config
  // Firebase è già stata compilata dentro l'APK)
  const skipBootstrap = () => {
    if (bootstrapTimer.current) clearTimeout(bootstrapTimer.current);
    setBootstrapDone(true);
  };

  useEffect(() => {
    if (!firebaseSyncManager.isConfigured()) {
      // nessun cloud configurato (solo LAN) → si parte subito
      setBootstrapDone(true);
      return;
    }

    // ⏳ massimo 5 secondi: se il cloud non risponde si parte comunque
    const safety = setTimeout(() => setBootstrapDone(true), 5000);
    bootstrapTimer.current = safety;
    const offReady = firebaseSyncManager.onReady(() => {
      clearTimeout(safety);
      setBootstrapDone(true);
    });

    firebaseSyncManager.connect().then((success) => {
      if (success) {
        console.log('🔥 Sync: connesso automaticamente');
      } else {
        clearTimeout(safety);
        setBootstrapDone(true);
      }
    });

    return () => {
      clearTimeout(safety);
      offReady();
      firebaseSyncManager.disconnect();
    };
  }, []);

  // ───────────────────────────────────────────────────────────────────
  // 📡 Sincronizzazione LAN (Wi-Fi) — alternativa quando non c'è il cloud
  // ───────────────────────────────────────────────────────────────────
  // Richiede un PC/host sulla stessa rete con `npm run server` attivo.
  useEffect(() => {
    let serverUrl = '';
    try {
      serverUrl = localStorage.getItem('sea_pos_sync_url') || '';
    } catch {
      serverUrl = '';
    }
    if (!serverUrl) return;

    const device = getDevice();
    const listener = (msg: any) => {
      if (!msg) return;
      try {
        if (msg.type === 'welcome' && msg.data?.serverState) {
          const serverState = msg.data.serverState;
          if (lanServerHasData(serverState)) {
            // il server ha già dati → questo dispositivo li adotta
            applyRemoteState(serverState);
          } else {
            // il server è vuoto → gli mando i miei dati (sono la base)
            pushAllToLan();
          }
        } else if (msg.type === 'partial_update' && msg.data?.key) {
          applyLanCollection(msg.data.key, msg.data.value);
        } else if (msg.type === 'state_update' && msg.data) {
          applyRemoteState(msg.data);
        }
      } catch (e) {
        console.error('📡 LAN Sync: errore nel gestire aggiornamento', e);
      }
    };

    syncManager.addListener(listener);
    void syncManager.connect(serverUrl, device.name, device.role);

    return () => {
      syncManager.removeListener(listener);
      syncManager.disconnect();
    };
  }, []);

  // Il server LAN è vuoto all'avvio: se non ha dati non deve sovrascrivere
  // i dati già presenti sul telefono.
  const lanServerHasData = (state: any): boolean => {
    if (!state) return false;
    const nonEmpty = (v: any) => Array.isArray(v) && v.length > 0;
    return (
      nonEmpty(state.users) ||
      nonEmpty(state.tables) ||
      nonEmpty(state.inventory) ||
      nonEmpty(state.receipts)
    );
  };

  // Applica una singola collezione ricevuta dalla rete locale.
  // Se il valore è identico a quello già presente non lo si applica:
  // altrimenti i due dispositivi si rimanderebbero il dato all'infinito.
  const applyLanCollection = (key: string, rawValue: any) => {
    // ⚠️ il Realtime DB non salva le array vuote: normalizza sempre
    const value = normalizeCollectionData(key as SyncCollection, rawValue);
    const same = (current: any) => isDeepEqual(current, value);

    switch (key) {
      case 'users':
        if (!same(users)) setUsers(value);
        break;
      case 'inventory':
        if (!same(inventory)) setInventory(value);
        break;
      case 'inventoryLogs':
        if (!same(inventoryLogs)) setInventoryLogs(value);
        break;
      case 'tables':
        if (!same(tables)) setTables(value);
        break;
      case 'receipts':
        if (!same(receipts)) setReceipts(value);
        break;
      case 'profile':
        if (!same(profile)) setProfile(value);
        break;
    }
  };

  // Invia tutto il proprio stato al server LAN (quando il server è vuoto)
  const pushAllToLan = () => {
    syncManager.send({
      type: 'sync_update',
      data: { users, inventory, inventoryLogs, tables, receipts, profile },
    });
  };

  // تطبيق gli aggiornamenti ricevuti (cloud o LAN)
  const applyRemoteState = (payload: any) => {
    if (!payload) return;
    if (payload.users) applyLanCollection('users', payload.users);
    if (payload.inventory) applyLanCollection('inventory', payload.inventory);
    if (payload.inventoryLogs) applyLanCollection('inventoryLogs', payload.inventoryLogs);
    if (payload.tables) applyLanCollection('tables', payload.tables);
    if (payload.receipts) applyLanCollection('receipts', payload.receipts);
    if (payload.profile) applyLanCollection('profile', payload.profile);
  };

  // استقبال التحديثات من الأجهزة الأخرى
  useEffect(() => {
    const listener = (event: any) => {
      if (!event || event.type !== 'remote_change') return;
      try {
        const data = normalizeCollectionData(event.collection, event.data);
        switch (event.collection) {
          case 'users':
            setUsers(data);
            break;
          case 'inventory':
            setInventory(data);
            break;
          case 'inventoryLogs':
            setInventoryLogs(data);
            break;
          case 'tables':
            setTables(data);
            break;
          case 'receipts':
            setReceipts(data);
            break;
          case 'profile':
            setProfile(data);
            break;
        }
      } catch (e) {
        console.error('🔥 Sync: خطأ في معالجة التحديث', e);
      }
    };

    firebaseSyncManager.addListener(listener);
    return () => firebaseSyncManager.removeListener(listener);
  }, []);

  // إرسال التعديلات المحلية إلى السحابة (و/أو إلى شبكة LAN المحلية)
  const pushLocalChange = (collection: SyncCollection, data: any) => {
    firebaseSyncManager.notifyLocalChange(collection, data);

    // إذا لم يكن السحابة متصلاً → جرّب مزامنة الشبكة المحلية.
    // لا نعيد إرسال قيمة مطابقة لما أرسلناه سابقاً، وإلا تناقل الجهازان
    // البيانات بلا نهاية (A→B→A→B).
    if (
      firebaseSyncManager.getStatus() !== 'connected' &&
      syncManager.getStatus() === 'connected'
    ) {
      if (isDeepEqual(lastSent.current[collection], data)) return;
      lastSent.current[collection] = data;
      syncManager.send({
        type: 'partial_update',
        data: { key: collection, value: data },
      });
    }
  };

  // إرسال التعديلات المحلية (لكل مجموعة على حدة حتى لا تتداخل الأجهزة)
  useEffect(() => {
    pushLocalChange('users', users);
  }, [users]);

  useEffect(() => {
    pushLocalChange('inventory', inventory);
  }, [inventory]);

  useEffect(() => {
    pushLocalChange('inventoryLogs', inventoryLogs);
  }, [inventoryLogs]);

  useEffect(() => {
    pushLocalChange('tables', tables);
  }, [tables]);

  useEffect(() => {
    pushLocalChange('receipts', receipts);
  }, [receipts]);

  useEffect(() => {
    pushLocalChange('profile', profile);
  }, [profile]);

  // حالة المزامنة + عدد الأجهزة المتصلة
  useEffect(() => {
    const removeStatusListener = firebaseSyncManager.addStatusListener(
      (status, devicesCount, error) => {
        setCloudConnected(status === 'connected');
        setSyncDevicesCount(devicesCount);
        setSyncStatus(status);
        setSyncError(error ?? null);
      }
    );
    setCloudConnected(firebaseSyncManager.getStatus() === 'connected');
    setSyncDevicesCount(firebaseSyncManager.getDevices().length);
    setSyncStatus(firebaseSyncManager.getStatus());
    setSyncError(firebaseSyncManager.getLastError());
    return removeStatusListener;
  }, []);

  // حالة شبكة LAN المحلية (Wi-Fi)
  useEffect(() => {
    const removeLanListener = syncManager.addStatusListener((status) => {
      setLanConnected(status === 'connected');
    });
    setLanConnected(syncManager.getStatus() === 'connected');
    return removeLanListener;
  }, []);

  // "متصل" إذا كان أحد القناةين نشطاً
  useEffect(() => {
    setWifiConnected(cloudConnected || lanConnected);
  }, [cloudConnected, lanConnected]);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(inventoryLogs));
  }, [inventoryLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(receipts));
  }, [receipts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }, [profile]);

  // 🔒 La sessione NON viene ripristinata al riavvio: si esce sempre
  //    dall'account. L'unica cosa che si ricorda è il nome utente
  //    (se l'utente lo sceglie), mai la password.
  useEffect(() => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
  }, []);

  // Se gli utenti arrivano dalla sincronizzazione (o il PIN cambia),
  // l'utente collegato viene aggiornato senza dover uscire e rientrare.
  useEffect(() => {
    if (!currentUser) return;
    const updated = users.find((u) => u.id === currentUser.id);
    if (updated && JSON.stringify(updated) !== JSON.stringify(currentUser)) {
      setCurrentUser(updated);
    }
  }, [users]);

  // ═══════════════════════════════════════════════════════════════════
  // 🔄 Sincronizzazione completa (tutti i dati → nuovo telefono)
  // ═══════════════════════════════════════════════════════════════════
  const syncAllNow = async (): Promise<boolean> => {
    if (firebaseSyncManager.getStatus() !== 'connected') return false;
    await firebaseSyncManager.pushAll();
    return true;
  };

  const pullAllFromCloud = async (): Promise<boolean> => {
    if (firebaseSyncManager.getStatus() !== 'connected') return false;
    await firebaseSyncManager.forcePull();
    return true;
  };

  // Low stock calculation
  // 🧭 Se non esistono utenti (né locali né arrivati dal cloud) l'app
  //    chiede la configurazione iniziale invece di mostrare il login.
  useEffect(() => {
    if (!bootstrapDone) return;
    setNeedsSetup(users.length === 0);
  }, [users, bootstrapDone]);

  const lowStockItems = inventory.filter(
    (item) => item.currentQuantity <= item.minThreshold
  );

  // Connessione / disconnessione dalla sincronizzazione cloud
  const toggleWifi = () => {
    if (firebaseSyncManager.getStatus() === 'connected') {
      firebaseSyncManager.disconnect();
    } else {
      void firebaseSyncManager.reconnect();
    }
  };

  // Auth functions: Clean Username + Password Login
  const login = (
    username: string,
    passwordOrPin: string
  ): { success: boolean; message?: string } => {
    const trimmedUser = username.trim().toLowerCase();
    const trimmedPin = passwordOrPin.trim();

    if (!trimmedUser) {
      return { success: false, message: 'Inserisci il nome utente (es. Admin).' };
    }
    if (!trimmedPin) {
      return { success: false, message: 'Inserisci la password / PIN.' };
    }

    // 🔍 Prima cerchiamo il nome utente: così distinguiamo "account inesistente"
    //    da "password sbagliata" (messaggio molto più utile per il dipendente).
    const userByName = users.find((u) => u.username.toLowerCase() === trimmedUser);

    if (!userByName) {
      return {
        success: false,
        message:
          "Nome utente inesistente. Chiedi all'amministratore di creare l'account.",
      };
    }

    const targetUser = users.find(
      (u) => u.username.toLowerCase() === trimmedUser && u.pin === trimmedPin
    );

    if (targetUser) {
      setCurrentUser(targetUser);
      if (targetUser.role === 'cucina' || targetUser.role === 'bar_cucina') {
        setActiveView('cucina');
      } else if (targetUser.role === 'cassiere') {
        setActiveView('cassa');
      } else {
        setActiveView('home');
      }
      return { success: true };
    }

    return { success: false, message: 'Password non corretta.' };
  };

  const changePassword = (
    userId: string,
    newPasswordOrPin: string
  ): { success: boolean; message?: string } => {
    const trimmed = newPasswordOrPin.trim();
    if (trimmed.length < 4) {
      return {
        success: false,
        message: 'La password deve contenere almeno 4 caratteri o cifre.',
      };
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = { ...u, pin: trimmed };
          if (currentUser && currentUser.id === userId) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return u;
      })
    );

    return { success: true, message: 'Password aggiornata con successo!' };
  };

  const loginWithPin = (
    pin: string,
    userId?: string
  ): { success: boolean; message?: string } => {
    const trimmedPin = pin.trim();
    let targetUser: UserAccount | undefined;

    if (userId) {
      targetUser = users.find((u) => u.id === userId && u.pin === trimmedPin);
    } else {
      const matches = users.filter((u) => u.pin === trimmedPin);
      if (matches.length === 1) {
        targetUser = matches[0];
      } else if (matches.length > 1) {
        return {
          success: false,
          message: 'Più utenti hanno questo PIN. Accedi con nome utente e password.',
        };
      }
    }

    if (targetUser) {
      setCurrentUser(targetUser);
      if (targetUser.role === 'cucina' || targetUser.role === 'bar_cucina') {
        setActiveView('cucina');
      } else if (targetUser.role === 'cassiere') {
        setActiveView('cassa');
      } else {
        setActiveView('home');
      }
      return { success: true };
    }

    return { success: false, message: 'PIN o credenziali non corrette.' };
  };

  const loginUserDirect = (user: UserAccount) => {
    setCurrentUser(user);
    if (user.role === 'cucina') {
      setActiveView('cucina');
    } else if (user.role === 'bar_cucina') {
      setActiveView('cucina');
    } else if (user.role === 'cassiere') {
      setActiveView('cassa');
    } else {
      setActiveView('home');
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setSelectedTableForCheckout(null);
    setActiveView('home');
  };

  // Inventory functions
  const addInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = {
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      lastModifiedBy: currentUser?.displayName || 'Sistema',
      lastModifiedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    setInventory((prev) => [newItem, ...prev]);

    // Log the addition
    const newLog: InventoryLog = {
      id: `log_${Date.now()}`,
      itemId: newItem.id,
      itemName: newItem.name,
      changeType: 'carico',
      deltaQuantity: newItem.currentQuantity,
      finalQuantity: newItem.currentQuantity,
      userName: currentUser?.displayName || 'Operatore',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      reason: 'Nuovo articolo aggiunto al magazzino',
    };
    setInventoryLogs((prev) => [newLog, ...prev]);
  };

  const updateInventoryItem = (id: string, updates: Partial<InventoryItem>) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            ...updates,
            lastModifiedBy: currentUser?.displayName || item.lastModifiedBy,
            lastModifiedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          };
        }
        return item;
      })
    );
  };

  const deleteInventoryItem = (id: string) => {
    setInventory((prev) => prev.filter((item) => item.id !== id));
  };

  const adjustQuantity = (id: string, delta: number, reason: string) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(0, Number((item.currentQuantity + delta).toFixed(2)));
          // Add log
          const newLog: InventoryLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            itemId: item.id,
            itemName: item.name,
            changeType: delta >= 0 ? 'carico' : 'scarico',
            deltaQuantity: delta,
            finalQuantity: newQty,
            userName: currentUser?.displayName || 'Operatore',
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
            reason,
          };
          setInventoryLogs((l) => [newLog, ...l]);

          return {
            ...item,
            currentQuantity: newQty,
            lastModifiedBy: currentUser?.displayName || 'Operatore',
            lastModifiedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          };
        }
        return item;
      })
    );
  };

  const performPhysicalInventoryCount = (
    countedMap: Record<string, number>,
    notes: string
  ) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (countedMap[item.id] !== undefined) {
          const countedQty = countedMap[item.id];
          const diff = countedQty - item.currentQuantity;
          if (diff !== 0) {
            const newLog: InventoryLog = {
              id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              itemId: item.id,
              itemName: item.name,
              changeType: 'rettifica',
              deltaQuantity: diff,
              finalQuantity: countedQty,
              userName: currentUser?.displayName || 'Responsabile Inventario',
              timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
              reason: `Rettifica fisica di magazzino. ${notes}`,
            };
            setInventoryLogs((l) => [newLog, ...l]);
          }
          return {
            ...item,
            currentQuantity: countedQty,
            lastModifiedBy: currentUser?.displayName || 'Responsabile Inventario',
            lastModifiedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          };
        }
        return item;
      })
    );
  };

  // Table management with direct Bill Amount editing
  const addTable = (tableData: {
    name: string;
    number?: number;
    seats?: number;
    billAmount?: number;
    notes?: string;
  }) => {
    const nextNum = tableData.number || tables.length + 1;
    const newTable: RestaurantTable = {
      id: `tbl_${Date.now()}`,
      number: nextNum,
      name: tableData.name.trim() || `Tavolo ${nextNum}`,
      status: (tableData.billAmount || 0) > 0 ? 'occupato' : 'libero',
      seats: tableData.seats || 4,
      billAmount: Math.max(0, tableData.billAmount || 0),
      notes: tableData.notes,
      coversCount: (tableData.billAmount || 0) > 0 ? 2 : 0,
      openedAt:
        (tableData.billAmount || 0) > 0
          ? new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
          : undefined,
      currentOrderItems: [],
    };
    setTables((prev) => [...prev, newTable]);
  };

  const updateTable = (tableId: string, updates: Partial<RestaurantTable>) => {
    setTables((prev) =>
      prev.map((tbl) => (tbl.id === tableId ? { ...tbl, ...updates } : tbl))
    );
  };

  const deleteTable = (tableId: string) => {
    setTables((prev) => prev.filter((tbl) => tbl.id !== tableId));
  };

  const updateTableBillAmount = (tableId: string, amount: number) => {
    setTables((prev) =>
      prev.map((tbl) => {
        if (tbl.id === tableId) {
          const validAmount = Math.max(0, Number(amount.toFixed(2)));
          return {
            ...tbl,
            billAmount: validAmount,
            status: validAmount > 0 && tbl.status === 'libero' ? 'occupato' : tbl.status,
            openedAt:
              validAmount > 0 && !tbl.openedAt
                ? new Date().toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : tbl.openedAt,
          };
        }
        return tbl;
      })
    );
  };

  const openTable = (
    tableId: string,
    covers: number,
    waiterName?: string,
    initialBillAmount?: number
  ) => {
    setTables((prev) =>
      prev.map((tbl) => {
        if (tbl.id === tableId) {
          const amt = initialBillAmount !== undefined ? initialBillAmount : (tbl.billAmount || 0);
          return {
            ...tbl,
            status: 'occupato',
            coversCount: covers,
            billAmount: amt,
            waiterName: waiterName || currentUser?.displayName || 'Cameriere',
            openedAt: new Date().toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            currentOrderItems: [],
          };
        }
        return tbl;
      })
    );
  };

  const addOrderItemToTable = (
    tableId: string,
    item: Omit<OrderItem, 'id' | 'status' | 'addedAt'>
  ) => {
    const newItem: OrderItem = {
      ...item,
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      status: 'ordinato',
      addedAt: new Date().toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setTables((prev) =>
      prev.map((tbl) => {
        if (tbl.id === tableId) {
          const items = tbl.currentOrderItems || [];
          return {
            ...tbl,
            status: tbl.status === 'libero' ? 'occupato' : tbl.status,
            currentOrderItems: [...items, newItem],
          };
        }
        return tbl;
      })
    );
  };

  const updateOrderItemStatus = (
    tableId: string,
    itemId: string,
    status: OrderItemStatus
  ) => {
    setTables((prev) =>
      prev.map((tbl) => {
        if (tbl.id === tableId) {
          const items = tbl.currentOrderItems || [];
          return {
            ...tbl,
            currentOrderItems: items.map((item) =>
              item.id === itemId ? { ...item, status } : item
            ),
          };
        }
        return tbl;
      })
    );
  };

  const removeOrderItemFromTable = (tableId: string, itemId: string) => {
    setTables((prev) =>
      prev.map((tbl) => {
        if (tbl.id === tableId) {
          const items = tbl.currentOrderItems || [];
          return {
            ...tbl,
            currentOrderItems: items.filter((i) => i.id !== itemId),
          };
        }
        return tbl;
      })
    );
  };

  const setTableStatus = (tableId: string, status: TableStatus) => {
    setTables((prev) =>
      prev.map((tbl) => (tbl.id === tableId ? { ...tbl, status } : tbl))
    );
  };

  const freeTable = (tableId: string) => {
    setTables((prev) =>
      prev.map((tbl) =>
        tbl.id === tableId
          ? {
              ...tbl,
              status: 'libero',
              coversCount: 0,
              billAmount: 0,
              openedAt: undefined,
              notes: undefined,
              currentOrderItems: [],
              payments: [],
            }
          : tbl
      )
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // 💶 Pagamenti su un tavolo (uno o più, con metodi diversi)
  // ═══════════════════════════════════════════════════════════════════
  const getTablePaidAmount = (tableId: string): number => {
    const tbl = tables.find((t) => t.id === tableId);
    if (!tbl || !tbl.payments || tbl.payments.length === 0) return 0;
    return Number(
      tbl.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toFixed(2)
    );
  };

  const addTablePayment = (params: {
    tableId: string;
    amount: number;
    method: 'contanti' | 'carta';
    cashGiven?: number;
    note?: string;
    splitLabel?: string;
  }): { success: boolean; message?: string; payment?: TablePayment; change: number } => {
    const amount = Number(params.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, message: 'Importo non valido.', change: 0 };
    }

    const tbl = tables.find((t) => t.id === params.tableId);
    if (!tbl) {
      return { success: false, message: 'Tavolo non trovato.', change: 0 };
    }

    const alreadyPaid = getTablePaidAmount(params.tableId);
    const due = Number((tbl.billAmount - alreadyPaid).toFixed(2));
    if (amount - due > 0.009) {
      return {
        success: false,
        message: `L'importo supera il saldo dovuto (${due.toFixed(2)} €).`,
        change: 0,
      };
    }

    let change = 0;
    if (params.method === 'contanti') {
      const given = Number(params.cashGiven ?? amount);
      if (!Number.isFinite(given) || given < amount) {
        return {
          success: false,
          message: "Il contante ricevuto è inferiore all'importo da incassare.",
          change: 0,
        };
      }
      change = Number((given - amount).toFixed(2));
    }

    const payment: TablePayment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tableId: params.tableId,
      tableName: tbl.name,
      amount: Number(amount.toFixed(2)),
      method: params.method,
      cashGiven: params.method === 'contanti' ? Number(params.cashGiven ?? amount) : undefined,
      changeGiven: change,
      cashierName: currentUser?.displayName || 'Cassa',
      createdAt: new Date().toISOString(),
      note: params.note,
      splitLabel: params.splitLabel,
    };

    setTables((prev) =>
      prev.map((t) =>
        t.id === params.tableId
          ? { ...t, payments: [...(t.payments || []), payment] }
          : t
      )
    );

    return { success: true, payment, change };
  };

  // Close bill and save receipt
  const closeBillAndGenerateReceipt = (params: {
    tableId?: string;
    tableName?: string;
    coversCount: number;
    items: OrderItem[];
    totalAmount: number;
    paymentMethod: PaymentMethod;
    cashAmount: number;
    cardAmount: number;
    changeGiven: number;
    splitDetails?: PaymentSplitRecord[];
    notes?: string;
  }): Receipt => {
    const receiptNum = `SCONTR-${String(receipts.length + 1).padStart(3, '0')}`;

    // 🧾 I pagamenti registrati sul tavolo confluiscono nello scontrino:
    //    così lo scontrino mostra ogni operazione (carta + contanti + ...)
    const tablePayments = params.tableId
      ? tables.find((t) => t.id === params.tableId)?.payments || []
      : [];

    const paidCash = Number(
      tablePayments
        .filter((p) => p.method === 'contanti')
        .reduce((s, p) => s + p.amount, 0)
        .toFixed(2)
    );
    const paidCard = Number(
      tablePayments
        .filter((p) => p.method === 'carta')
        .reduce((s, p) => s + p.amount, 0)
        .toFixed(2)
    );
    const totalChange = Number(
      tablePayments.reduce((s, p) => s + (p.changeGiven || 0), 0).toFixed(2)
    );

    const finalCash = tablePayments.length ? paidCash : Number(params.cashAmount || 0);
    const finalCard = tablePayments.length ? paidCard : Number(params.cardAmount || 0);
    const finalMethod: PaymentMethod =
      tablePayments.length === 0
        ? params.paymentMethod
        : paidCash > 0 && paidCard > 0
        ? 'misto'
        : paidCard > 0
        ? 'carta'
        : 'contanti';

    const newReceipt: Receipt = {
      id: `rec_${Date.now()}`,
      receiptNumber: receiptNum,
      date: new Date().toISOString(),
      tableName: params.tableName,
      coversCount: params.coversCount,
      items: params.items,
      totalAmount: params.totalAmount,
      paymentMethod: finalMethod,
      cashAmount: finalCash,
      cardAmount: finalCard,
      changeGiven: tablePayments.length ? totalChange : Number(params.changeGiven || 0),
      cashierName: currentUser?.displayName || 'Cassa',
      splitDetails: params.splitDetails,
      payments: tablePayments.length ? tablePayments : undefined,
      notes: params.notes,
    };

    setReceipts((prev) => [newReceipt, ...prev]);

    // Free the table if tied to one
    if (params.tableId) {
      freeTable(params.tableId);
    }

    // Auto deduct inventory for products sold if matching
    params.items.forEach((ordItem) => {
      if (ordItem.productId) {
        adjustQuantity(
          ordItem.productId,
          -ordItem.quantity,
          `Vendita cassa ${receiptNum}`
        );
      }
    });

    return newReceipt;
  };

  // ═══════════════════════════════════════════════════════════════════
  // 🆕 Configurazione iniziale (primo avvio)
  // ═══════════════════════════════════════════════════════════════════
  const completeSetup = (params: {
    restaurantName: string;
    username: string;
    pin: string;
  }): { success: boolean; message?: string } => {
    const username = params.username.trim();
    const pin = params.pin.trim();

    if (!username) {
      return {
        success: false,
        message: "Scegli un nome utente per l'amministratore.",
      };
    }
    if (pin.length < 4) {
      return { success: false, message: 'La password deve avere almeno 4 caratteri.' };
    }
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return { success: false, message: 'Questo nome utente esiste già.' };
    }

    const admin: UserAccount = {
      id: `user_${Date.now()}`,
      username,
      displayName: username,
      pin,
      role: 'admin',
      avatarColor: 'bg-cyan-600',
      permissions: {
        canAccessCassa: true,
        canAccessMagazzino: true,
        canAccessBar: true,
        canAccessCucina: true,
        canAccessTavoli: true,
        canManageUsers: true,
        canManageBackup: true,
        canViewReports: true,
      },
    };

    setUsers([admin]);

    // Il profilo ristorante parte dai dati inseriti (niente valori fittizi)
    setProfile((prev) => ({
      ...prev,
      name: params.restaurantName.trim() || username,
    }));

    setNeedsSetup(false);
    setCurrentUser(admin);
    return { success: true };
  };

  // User management
  const addUser = (userData: Omit<UserAccount, 'id'>) => {
    const newUser: UserAccount = {
      ...userData,
      id: `user_${Date.now()}`,
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const updateUser = (id: string, updates: Partial<UserAccount>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const updated = { ...u, ...updates };
          // If editing active user, update currentUser too
          if (currentUser && currentUser.id === id) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return u;
      })
    );
  };

  const deleteUser = (id: string) => {
    if (users.length <= 1) return;
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  // Backup & JSON
  const exportDataAsJSON = (): string => {
    const payload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      profile,
      users,
      inventory,
      inventoryLogs,
      tables,
      receipts,
    };
    return JSON.stringify(payload, null, 2);
  };

  const importDataFromJSON = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.users) setUsers(data.users);
      if (data.inventory) setInventory(data.inventory);
      if (data.inventoryLogs) setInventoryLogs(data.inventoryLogs);
      if (data.tables) setTables(data.tables);
      if (data.receipts) setReceipts(data.receipts);
      if (data.profile) setProfile(data.profile);
      return true;
    } catch (e) {
      console.error('Error importing JSON data:', e);
      return false;
    }
  };

  /**
   * 🧹 RIPRISTINO DI FABBRICA VERO
   * Cancella TUTTO: utenti, magazzino, tavoli, scontrini, log, profilo.
   * Non ricrea nessun dato di esempio → l'app resta a ZERO elementi.
   * L'utente torna alla schermata di configurazione iniziale.
   *
   * @param alsoCloud se true cancella anche i dati condivisi nel cloud
   */
  const resetToInitialData = async (
    alsoCloud: boolean = false
  ): Promise<{ success: boolean; message?: string }> => {
    setUsers([]);
    setInventory([]);
    setTables([]);
    setProfile(INITIAL_PROFILE);
    setInventoryLogs([]);
    setReceipts([]);
    setCurrentUser(null);
    setSelectedTableForCheckout(null);
    setActiveView('home');
    setNeedsSetup(true);

    // Svuota solo le chiavi dei dati: la configurazione cloud e l'identità
    // del dispositivo restano (il telefono resta collegato al ristorante).
    try {
      const keep = new Set([
        'sea_pos_sync_config_v1',
        'sea_pos_device_v1',
      ]);
      Object.keys(localStorage).forEach((key) => {
        if (!keep.has(key)) localStorage.removeItem(key);
      });
    } catch {
      /* ignore */
    }

    // Azzera anche la base di merge locale, così i dati vecchi non
    // "tornano" alla prossima sincronizzazione.
    firebaseSyncManager.resetLocalState();

    if (alsoCloud) {
      try {
        await firebaseSyncManager.wipeCloud();
      } catch (e: any) {
        return {
          success: false,
          message: 'Dati locali azzerati, ma cancellazione cloud non riuscita: ' + (e?.message || ''),
        };
      }
    }

    return { success: true };
  };

  // 🆕 تصفير اليوم: يحذف إيصالات اليوم + يفرغ كل الطاولات
  // يحتفظ بالمخزون والسجل الكامل (للتقارير التاريخية)
  const resetTodayTransactions = () => {
    const todayStr = new Date().toISOString().substring(0, 10);

    // عدّ الإيصالات التي ستُحذف (اليوم فقط)
    const todayReceipts = receipts.filter((r) => r.date.startsWith(todayStr));
    const deletedCount = todayReceipts.length;

    // احذف إيصالات اليوم فقط (احتفظ بالسجل التاريخي للأيام السابقة)
    setReceipts((prev) => prev.filter((r) => !r.date.startsWith(todayStr)));

    // تصفير كل الطاولات: status='libero', billAmount=0, coversCount=0
    const resetTablesCount = tables.filter((t) => t.status !== 'libero' || t.billAmount > 0).length;
    setTables((prev) =>
      prev.map((t) => ({
        ...t,
        status: 'libero' as const,
        billAmount: 0,
        coversCount: 0,
        currentOrderItems: [],
        waiterName: undefined,
        openedAt: undefined,
        notes: undefined,
      }))
    );

    return { deletedReceipts: deletedCount, resetTables: resetTablesCount };
  };

  const updateProfile = (updates: Partial<RestaurantProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        inventory,
        inventoryLogs,
        tables,
        receipts,
        profile,
        activeView,
        selectedTableForCheckout,
        lowStockItems,
        wifiConnected,
        syncDevicesCount,
        syncStatus,
        syncError,
        toggleWifi,
        syncAllNow,
        pullAllFromCloud,
        login,
        changePassword,
        loginWithPin,
        loginUserDirect,
        logout,
        setActiveView,
        setSelectedTableForCheckout,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        adjustQuantity,
        performPhysicalInventoryCount,
        addTable,
        updateTable,
        deleteTable,
        updateTableBillAmount,
        openTable,
        addOrderItemToTable,
        updateOrderItemStatus,
        removeOrderItemFromTable,
        setTableStatus,
        freeTable,
        addTablePayment,
        getTablePaidAmount,
        closeBillAndGenerateReceipt,
        addUser,
        updateUser,
        deleteUser,
        exportDataAsJSON,
        importDataFromJSON,
        resetToInitialData,
        resetTodayTransactions,
        completeSetup,
        needsSetup,
        bootstrapDone,
        skipBootstrap,
        updateProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
