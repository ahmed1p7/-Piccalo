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
  RestaurantTable,
  TableStatus,
  UserAccount,
} from '../types';
import syncManager from '../sync/SyncManager';

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
  toggleWifi: () => void;
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
  resetToInitialData: () => void;
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

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      if (savedId) {
        const found = INITIAL_USERS.find((u) => u.id === savedId);
        return found || null;
      }
      return null;
    } catch {
      return null;
    }
  });

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
      return saved
        ? JSON.parse(saved)
        : [
            {
              id: 'log_seed_1',
              itemId: 'mat_2',
              itemName: 'Mozzarella Fior di Latte Campana',
              changeType: 'scarico',
              deltaQuantity: -3,
              finalQuantity: 12,
              userName: 'Admin',
              timestamp: '2026-11-06 07:30',
              reason: 'Uso in cucina',
            },
            {
              id: 'log_seed_2',
              itemId: 'mat_1',
              itemName: 'Farina Tipo 00',
              changeType: 'carico',
              deltaQuantity: 25,
              finalQuantity: 45,
              userName: 'Admin',
              timestamp: '2026-11-05 10:15',
              reason: 'Arrivo fornitore Molino Caputo',
            },
          ];
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
      return saved
        ? JSON.parse(saved)
        : [
            {
              id: 'rec_seed_1',
              receiptNumber: 'SCONTR-001',
              date: new Date(Date.now() - 3600000 * 2).toISOString(),
              tableName: 'Tavolo 4',
              coversCount: 2,
              items: [
                {
                  id: 'item_rec_1',
                  name: 'Spaghetti alle Vongole',
                  price: 14.0,
                  quantity: 2,
                  destination: 'cassa',
                  status: 'servito',
                  addedAt: '12:00',
                },
                {
                  id: 'item_rec_2',
                  name: 'Birra Moretti 66cl',
                  price: 4.5,
                  quantity: 2,
                  destination: 'cassa',
                  status: 'servito',
                  addedAt: '12:02',
                },
                {
                  id: 'item_rec_3',
                  name: 'Coperto & Pane',
                  price: 2.0,
                  quantity: 2,
                  destination: 'cassa',
                  status: 'servito',
                  addedAt: '12:00',
                },
              ],
              totalAmount: 30.0,
              paymentMethod: 'contanti',
              cashAmount: 30.0,
              cardAmount: 0,
              changeGiven: 0,
              cashierName: 'Elena (Cassiera)',
            },
            {
              id: 'rec_seed_2',
              receiptNumber: 'SCONTR-002',
              date: new Date(Date.now() - 3600000 * 1).toISOString(),
              tableName: 'Tavolo 8',
              coversCount: 3,
              items: [
                {
                  id: 'item_rec_21',
                  name: 'Tagliatelle al Ragù Bolognese',
                  price: 13.5,
                  quantity: 3,
                  destination: 'cassa',
                  status: 'servito',
                  addedAt: '12:30',
                },
                {
                  id: 'item_rec_22',
                  name: 'Vino Chianti Classico DOCG',
                  price: 22.0,
                  quantity: 1,
                  destination: 'cassa',
                  status: 'servito',
                  addedAt: '12:35',
                },
              ],
              totalAmount: 62.5,
              paymentMethod: 'carta',
              cashAmount: 0,
              cardAmount: 62.5,
              changeGiven: 0,
              cashierName: 'Admin',
            },
          ];
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
  const [wifiConnected, setWifiConnected] = useState<boolean>(true);

  // ═══════════════════════════════════════════════════════════════════
  // 🌐 Sync: تزامن البيانات بين الأجهزة عبر WebSocket
  // ═══════════════════════════════════════════════════════════════════
  const isSyncing = useRef(false);  // يمنع الحلقات اللانهائية

  // استقبال رسائل التزامن
  useEffect(() => {
    const listener = (msg: any) => {
      if (isSyncing.current) return;

      isSyncing.current = true;
      try {
        switch (msg.type) {
          case 'welcome':
            // استقبال الحالة الكاملة عند الاتصال
            if (msg.data?.serverState) {
              const s = msg.data.serverState;
              if (s.users) setUsers(s.users);
              if (s.inventory) setInventory(s.inventory);
              if (s.inventoryLogs) setInventoryLogs(s.inventoryLogs);
              if (s.tables) setTables(s.tables);
              if (s.receipts) setReceipts(s.receipts);
              if (s.profile) setProfile(s.profile);
            }
            break;

          case 'state_update':
            // تحديث الحالة الكاملة من جهاز آخر
            if (msg.data) {
              const s = msg.data;
              if (s.users) setUsers(s.users);
              if (s.inventory) setInventory(s.inventory);
              if (s.inventoryLogs) setInventoryLogs(s.inventoryLogs);
              if (s.tables) setTables(s.tables);
              if (s.receipts) setReceipts(s.receipts);
              if (s.profile) setProfile(s.profile);
            }
            break;

          case 'partial_update':
            // تحديث جزئي
            if (msg.data?.key && msg.data?.value) {
              const { key, value } = msg.data;
              switch (key) {
                case 'inventory': setInventory(value); break;
                case 'tables': setTables(value); break;
                case 'users': setUsers(value); break;
                case 'receipts': setReceipts(value); break;
                case 'inventoryLogs': setInventoryLogs(value); break;
                case 'profile': setProfile(value); break;
              }
            }
            break;

          case 'new_receipt':
            // إيصال جديد من جهاز آخر
            if (msg.data?.receipt) {
              setReceipts((prev) => [...prev, msg.data.receipt]);
            }
            break;

          case 'table_update':
            // تحديث طاولة معينة
            if (msg.data?.tableId && msg.data?.updates) {
              setTables((prev) =>
                prev.map((t) =>
                  t.id === msg.data.tableId ? { ...t, ...msg.data.updates } : t
                )
              );
            }
            break;

          case 'inventory_update':
            // تحديث مخزون من جهاز آخر
            if (msg.data?.inventory) {
              setInventory(msg.data.inventory);
            }
            break;
        }
      } catch (e) {
        console.error('Sync: Error handling message', e);
      }
      isSyncing.current = false;
    };

    syncManager.addListener(listener);
    return () => syncManager.removeListener(listener);
  }, []);

  // إرسال الحالة عند تغييرها (مع منع الحلقات)
  useEffect(() => {
    if (isSyncing.current) return;
    if (syncManager.getStatus() !== 'connected') return;
    syncManager.send({
      type: 'sync_update',
      data: { users, inventory, inventoryLogs, tables, receipts, profile },
    });
  }, [users, inventory, inventoryLogs, tables, receipts, profile]);

  // تحديث wifiConnected بناءً على حالة التزامن
  useEffect(() => {
    const removeStatusListener = syncManager.addStatusListener((status) => {
      setWifiConnected(status === 'connected');
    });
    // فحص أولي
    setWifiConnected(syncManager.getStatus() === 'connected');
    return removeStatusListener;
  }, []);

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

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUser.id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    }
  }, [currentUser]);

  // Low stock calculation
  const lowStockItems = inventory.filter(
    (item) => item.currentQuantity <= item.minThreshold
  );

  // Toggle Wi-Fi state simulator
  const toggleWifi = () => setWifiConnected((prev) => !prev);

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

    return { success: false, message: 'Nome utente o password non corretti.' };
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
            }
          : tbl
      )
    );
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
    const newReceipt: Receipt = {
      id: `rec_${Date.now()}`,
      receiptNumber: receiptNum,
      date: new Date().toISOString(),
      tableName: params.tableName,
      coversCount: params.coversCount,
      items: params.items,
      totalAmount: params.totalAmount,
      paymentMethod: params.paymentMethod,
      cashAmount: params.cashAmount,
      cardAmount: params.cardAmount,
      changeGiven: params.changeGiven,
      cashierName: currentUser?.displayName || 'Cassa',
      splitDetails: params.splitDetails,
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

  const resetToInitialData = () => {
    setUsers(INITIAL_USERS);
    setInventory(INITIAL_INVENTORY);
    setTables(INITIAL_TABLES);
    setProfile(INITIAL_PROFILE);
    setInventoryLogs([]);
    setReceipts([]);
    localStorage.clear();
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
        toggleWifi,
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
        closeBillAndGenerateReceipt,
        addUser,
        updateUser,
        deleteUser,
        exportDataAsJSON,
        importDataFromJSON,
        resetToInitialData,
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
