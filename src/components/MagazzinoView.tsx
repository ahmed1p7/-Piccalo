import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  Filter,
  History,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  InventoryItem,
  InventoryLog,
  ItemCategory,
  ItemType,
  StockStatus,
} from '../types';

export const MagazzinoView: React.FC = () => {
  const {
    inventory,
    inventoryLogs,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    adjustQuantity,
    performPhysicalInventoryCount,
    currentUser,
  } = useApp();

  // Active sub-tab: 'materiali' | 'prodotti' | 'movimenti' | 'inventario_fisico'
  const [activeTab, setActiveTab] = useState<'materiali' | 'prodotti' | 'movimenti' | 'inventario_fisico'>('materiali');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('tutti');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Modal States
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [quickAdjustModalItem, setQuickAdjustModalItem] = useState<InventoryItem | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState<string>('Carico merci fornitore');

  // Physical Inventory Count State
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({});
  const [physicalNotes, setPhysicalNotes] = useState<string>('Controllo settimanale di magazzino');

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    type: 'materiale' as ItemType,
    category: 'cibo' as ItemCategory,
    currentQuantity: 10,
    minThreshold: 5,
    unit: 'kg',
    supplier: '',
    expirationDate: '',
    notes: '',
    costPrice: 0,
    sellPrice: 0,
  });

  // Filtered items based on active subtab, search, category, low stock
  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      // Type match (materiali vs prodotti)
      if (activeTab === 'materiali' && item.type !== 'materiale') return false;
      if (activeTab === 'prodotti' && item.type !== 'prodotto') return false;

      // Search match
      if (
        searchTerm &&
        !item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !item.supplier.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Category match
      if (selectedCategory !== 'tutti' && item.category !== selectedCategory) {
        return false;
      }

      // Low stock filter
      if (filterLowStockOnly && item.currentQuantity > item.minThreshold) {
        return false;
      }

      return true;
    });
  }, [inventory, activeTab, searchTerm, selectedCategory, filterLowStockOnly]);

  // Overall Low Stock Count
  const lowStockCount = useMemo(() => {
    return inventory.filter((i) => i.currentQuantity <= i.minThreshold).length;
  }, [inventory]);

  // Helper for item stock status
  const getStockStatus = (item: InventoryItem): { status: StockStatus; badge: string; color: string } => {
    if (item.currentQuantity <= 0) {
      return { status: 'esaurito', badge: 'Esaurito', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    }
    if (item.currentQuantity <= item.minThreshold) {
      return { status: 'quasi_finito', badge: 'Quasi Finito', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    }
    return { status: 'ok', badge: 'Disponibile', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
  };

  const handleOpenAddModal = (defaultType?: ItemType) => {
    setEditingItem(null);
    setFormData({
      name: '',
      type: defaultType || (activeTab === 'prodotti' ? 'prodotto' : 'materiale'),
      category: 'cibo',
      currentQuantity: 10,
      minThreshold: 5,
      unit: 'kg',
      supplier: '',
      expirationDate: '',
      notes: '',
      costPrice: 0,
      sellPrice: 0,
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      category: item.category,
      currentQuantity: item.currentQuantity,
      minThreshold: item.minThreshold,
      unit: item.unit,
      supplier: item.supplier,
      expirationDate: item.expirationDate || '',
      notes: item.notes || '',
      costPrice: item.costPrice || 0,
      sellPrice: item.sellPrice || 0,
    });
    setIsAddEditModalOpen(true);
  };

  const handleSaveAddEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingItem) {
      updateInventoryItem(editingItem.id, {
        name: formData.name,
        type: formData.type,
        category: formData.category,
        currentQuantity: Number(formData.currentQuantity),
        minThreshold: Number(formData.minThreshold),
        unit: formData.unit,
        supplier: formData.supplier,
        expirationDate: formData.expirationDate || undefined,
        notes: formData.notes,
        costPrice: Number(formData.costPrice),
        sellPrice: formData.type === 'prodotto' ? Number(formData.sellPrice) : undefined,
      });
    } else {
      addInventoryItem({
        name: formData.name,
        type: formData.type,
        category: formData.category,
        currentQuantity: Number(formData.currentQuantity),
        minThreshold: Number(formData.minThreshold),
        unit: formData.unit,
        supplier: formData.supplier,
        expirationDate: formData.expirationDate || undefined,
        notes: formData.notes,
        costPrice: Number(formData.costPrice),
        sellPrice: formData.type === 'prodotto' ? Number(formData.sellPrice) : undefined,
      });
    }
    setIsAddEditModalOpen(false);
  };

  const handleOpenQuickAdjust = (item: InventoryItem, delta: number) => {
    setQuickAdjustModalItem(item);
    setAdjustDelta(delta);
    setAdjustReason(delta > 0 ? 'Carico da fornitore' : 'Consumo giornaliero preparazione');
  };

  const handleConfirmQuickAdjust = () => {
    if (quickAdjustModalItem) {
      adjustQuantity(quickAdjustModalItem.id, adjustDelta, adjustReason);
      setQuickAdjustModalItem(null);
    }
  };

  const handleApplyPhysicalInventory = () => {
    performPhysicalInventoryCount(physicalCounts, physicalNotes);
    alert('Inventario fisico aggiornato con successo! Le rettifiche sono state registrate nello storico.');
    setActiveTab('materiali');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Magazzino Header & Low Stock Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Gestione Magazzino &amp; Scorte
            </h1>
            <p className="text-xs text-neutral-400">
              Controllo materie prime alimentari, bevande, prodotti finiti e soglie d&apos;allerta.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nuovo Articolo</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs: 1. Materiali | 2. Prodotti | 3. Storico Movimenti | 4. Inventario Fisico */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('materiali')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'materiali'
              ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
              : 'bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>1. Materiali (Materie Prime)</span>
        </button>

        <button
          onClick={() => setActiveTab('prodotti')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'prodotti'
              ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
              : 'bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>2. Prodotti (Finiti &amp; Bevande)</span>
        </button>

        <button
          onClick={() => setActiveTab('movimenti')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'movimenti'
              ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
              : 'bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Registro Carichi &amp; Consumi</span>
        </button>

        <button
          onClick={() => setActiveTab('inventario_fisico')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'inventario_fisico'
              ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
              : 'bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Inventario Fisico (Verifica)</span>
        </button>
      </div>

      {/* FILTER & SEARCH BAR (for Materiali and Prodotti tabs) */}
      {(activeTab === 'materiali' || activeTab === 'prodotti') && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800">
          <div className="flex flex-1 items-center gap-2">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
              <input
                type="text"
                placeholder="Cerca per nome o fornitore..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-neutral-400 hidden sm:block" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-neutral-950 border border-neutral-700 text-neutral-200 text-xs sm:text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
              >
                <option value="tutti">Tutte le Categorie</option>
                <option value="cibo">Alimentare / Cibo</option>
                <option value="bevande">Bevande &amp; Vini</option>
                <option value="pulizia">Pulizia &amp; Igiene</option>
                <option value="packaging">Packaging &amp; Asporto</option>
                <option value="altro">Altro</option>
              </select>
            </div>
          </div>

          {/* Low Stock Alert Toggle Button */}
          <button
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap ${
              filterLowStockOnly
                ? 'bg-amber-500 text-neutral-950 border-amber-400'
                : 'bg-neutral-950 text-neutral-300 border-neutral-700 hover:border-neutral-600'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Solo Quasi Finiti ({lowStockCount})</span>
          </button>
        </div>
      )}

      {/* TAB 1 & 2: ITEMS TABLE (MATERIALI / PRODOTTI) */}
      {(activeTab === 'materiali' || activeTab === 'prodotti') && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 space-y-2">
              <Package className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-white">Nessun articolo trovato.</p>
              <p className="text-xs">
                Modifica i filtri di ricerca o clicca su &quot;Nuovo Articolo&quot; per registrarne uno.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-neutral-950/80 text-neutral-400 uppercase tracking-wider text-[11px] border-b border-neutral-800">
                  <tr>
                    <th className="px-5 py-3.5">Nome Articolo</th>
                    <th className="px-4 py-3.5">Categoria</th>
                    <th className="px-4 py-3.5">Giacenza Attuale</th>
                    <th className="px-4 py-3.5">Soglia Minima</th>
                    <th className="px-4 py-3.5">Fornitore</th>
                    <th className="px-4 py-3.5">Stato Scorta</th>
                    <th className="px-4 py-3.5">Azioni Rapide (+ / -)</th>
                    <th className="px-4 py-3.5 text-right">Modifica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredItems.map((item) => {
                    const statusInfo = getStockStatus(item);
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-neutral-800/40 transition-colors"
                      >
                        {/* Name & Notes */}
                        <td className="px-5 py-3">
                          <div className="font-bold text-white text-sm">{item.name}</div>
                          {item.notes && (
                            <div className="text-[11px] text-neutral-400 truncate max-w-xs">
                              {item.notes}
                            </div>
                          )}
                          {item.expirationDate && (
                            <div className="text-[10px] text-neutral-500 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" /> Scadenza: {item.expirationDate}
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3">
                          <span className="capitalize px-2.5 py-0.5 rounded-full text-xs bg-neutral-800 text-neutral-300 border border-neutral-700">
                            {item.category}
                          </span>
                        </td>

                        {/* Current Quantity */}
                        <td className="px-4 py-3 font-mono">
                          <div className="text-base font-black text-white flex items-baseline gap-1">
                            <span>{item.currentQuantity}</span>
                            <span className="text-xs font-normal text-neutral-400">
                              {item.unit}
                            </span>
                          </div>
                          {item.costPrice ? (
                            <div className="text-[10px] text-neutral-500">
                              Costo: {item.costPrice.toFixed(2)} €
                            </div>
                          ) : null}
                        </td>

                        {/* Min Threshold */}
                        <td className="px-4 py-3 font-mono text-neutral-400 text-xs">
                          {item.minThreshold} {item.unit}
                        </td>

                        {/* Supplier */}
                        <td className="px-4 py-3 text-neutral-300 text-xs">
                          {item.supplier || '-'}
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.color}`}
                          >
                            {statusInfo.status === 'ok' ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <AlertTriangle className="w-3 h-3" />
                            )}
                            <span>{statusInfo.badge}</span>
                          </span>
                        </td>

                        {/* Quick +/- Adjustment */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenQuickAdjust(item, -1)}
                              title="Scarica 1 unità"
                              className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-rose-950 hover:text-rose-400 text-neutral-300 font-bold flex items-center justify-center border border-neutral-700"
                            >
                              -1
                            </button>
                            <button
                              onClick={() => handleOpenQuickAdjust(item, 1)}
                              title="Carica 1 unità"
                              className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-emerald-950 hover:text-emerald-400 text-neutral-300 font-bold flex items-center justify-center border border-neutral-700"
                            >
                              +1
                            </button>
                            <button
                              onClick={() => handleOpenQuickAdjust(item, 5)}
                              title="Carica 5 unità"
                              className="px-2 h-7 rounded-lg bg-neutral-800 hover:bg-amber-950 hover:text-amber-400 text-neutral-300 font-bold text-xs flex items-center justify-center border border-neutral-700"
                            >
                              +5
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              title="Modifica Articolo"
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Sei sicuro di voler eliminare "${item.name}"?`)) {
                                  deleteInventoryItem(item.id);
                                }
                              }}
                              title="Elimina"
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REGISTRO MOVIMENTI & CONSUMI (Inventory Logs) */}
      {activeTab === 'movimenti' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div>
              <h3 className="font-bold text-white text-base">
                Registro Modifiche &amp; Consumi Magazzino
              </h3>
              <p className="text-xs text-neutral-400">
                Storico completo di chi ha modificato le quantità, quando e per quale motivo.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-800">
            {inventoryLogs.length === 0 ? (
              <p className="text-xs text-neutral-400 py-6 text-center">Nessun movimento registrato finora.</p>
            ) : (
              inventoryLogs.map((log) => (
                <div key={log.id} className="py-3.5 flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                        log.deltaQuantity >= 0
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {log.deltaQuantity >= 0 ? (
                        <ArrowUpRight className="w-5 h-5" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-white">{log.itemName}</div>
                      <div className="text-xs text-neutral-400">
                        {log.reason || 'Movimento magazzino'} • Operatore:{' '}
                        <span className="text-amber-400 font-semibold">{log.userName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`font-mono font-bold text-sm ${
                        log.deltaQuantity >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {log.deltaQuantity >= 0 ? `+${log.deltaQuantity}` : log.deltaQuantity}
                    </div>
                    <div className="text-[11px] text-neutral-500 flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" /> {log.timestamp}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: INVENTARIO FISICO (Physical Count vs Recorded) */}
      {activeTab === 'inventario_fisico' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
            <div>
              <h3 className="font-bold text-white text-base">
                Verifica &amp; Quadratura Inventario Fisico
              </h3>
              <p className="text-xs text-neutral-400">
                Inserisci il conteggio reale fatto a mano in magazzino. Il sistema calcolerà le
                differenze e rettificherà le giacenze automaticamente.
              </p>
            </div>
            <button
              onClick={handleApplyPhysicalInventory}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs shadow-md shadow-emerald-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salva Rettifiche</span>
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-400">Note sulla verifica:</label>
            <input
              type="text"
              value={physicalNotes}
              onChange={(e) => setPhysicalNotes(e.target.value)}
              placeholder="Es. Inventario mensile fine mese, controllo celle frigorifere"
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-neutral-950/80 text-neutral-400 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Articolo</th>
                  <th className="px-4 py-3">Quantità a Sistema</th>
                  <th className="px-4 py-3">Conteggio Effettivo Fisico</th>
                  <th className="px-4 py-3">Differenza (Scostamento)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {inventory.map((item) => {
                  const counted = physicalCounts[item.id] ?? item.currentQuantity;
                  const diff = counted - item.currentQuantity;
                  return (
                    <tr key={item.id} className="hover:bg-neutral-800/40">
                      <td className="px-4 py-3">
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-[11px] text-neutral-500 capitalize">{item.type}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-neutral-300">
                        {item.currentQuantity} {item.unit}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.5"
                            value={counted}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setPhysicalCounts((prev) => ({ ...prev, [item.id]: val }));
                            }}
                            className="w-24 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-1.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                          />
                          <span className="text-neutral-400 text-xs">{item.unit}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold">
                        {diff === 0 ? (
                          <span className="text-emerald-400">Quadratura OK (0)</span>
                        ) : diff > 0 ? (
                          <span className="text-emerald-400">+{diff} {item.unit} (Eccedenza)</span>
                        ) : (
                          <span className="text-rose-400">{diff} {item.unit} (Ammanco/Perdita)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT INVENTORY ITEM */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl my-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white text-base">
                {editingItem ? 'Modifica Articolo' : 'Registra Nuovo Articolo'}
              </h3>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddEdit} className="space-y-4 text-xs sm:text-sm">
              {/* Type: Materiale vs Prodotto */}
              <div>
                <label className="font-semibold text-neutral-300 block mb-1">
                  Tipologia Articolo:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'materiale' })}
                    className={`py-2 rounded-xl font-bold border transition-all ${
                      formData.type === 'materiale'
                        ? 'bg-amber-500 text-neutral-950 border-amber-400'
                        : 'bg-neutral-950 text-neutral-300 border-neutral-800'
                    }`}
                  >
                    1. Materiale (Materia Prima)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'prodotto' })}
                    className={`py-2 rounded-xl font-bold border transition-all ${
                      formData.type === 'prodotto'
                        ? 'bg-amber-500 text-neutral-950 border-amber-400'
                        : 'bg-neutral-950 text-neutral-300 border-neutral-800'
                    }`}
                  >
                    2. Prodotto (Finito / Bevanda)
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="font-semibold text-neutral-300 block mb-1">
                  Nome dell&apos;Articolo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Es. Farina Caputo 00, Mozzarella di Bufala, Birra Moretti..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">Categoria:</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as ItemCategory })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="cibo">Alimentare / Cibo</option>
                    <option value="bevande">Bevande &amp; Vini</option>
                    <option value="pulizia">Pulizia &amp; Igiene</option>
                    <option value="packaging">Packaging &amp; Asporto</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">
                    Unità di Misura:
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="kg">kg (Chilogrammi)</option>
                    <option value="lt">lt (Litri)</option>
                    <option value="pz">pz (Pezzi / Porzioni)</option>
                    <option value="bt">bt (Bottiglie)</option>
                    <option value="conf">conf (Confezioni)</option>
                  </select>
                </div>
              </div>

              {/* Quantities: Current & Min Alert Threshold */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">
                    Quantità Attuale:
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={formData.currentQuantity}
                    onChange={(e) =>
                      setFormData({ ...formData, currentQuantity: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">
                    Soglia Minima (Alert):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={formData.minThreshold}
                    onChange={(e) =>
                      setFormData({ ...formData, minThreshold: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Supplier & Expiration Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">Fornitore:</label>
                  <input
                    type="text"
                    placeholder="Es. Molino Caputo, Caseificio..."
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">
                    Data Scadenza (facoltativa):
                  </label>
                  <input
                    type="date"
                    value={formData.expirationDate}
                    onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">
                    Costo Acquisto Fornitore (€):
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={formData.costPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {formData.type === 'prodotto' && (
                  <div>
                    <label className="font-semibold text-neutral-300 block mb-1">
                      Prezzo Vendita al Pubblico (€):
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={formData.sellPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, sellPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="font-semibold text-neutral-300 block mb-1">
                  Note &amp; Istruzioni di Conservazione:
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Note, posizione in magazzino (es. Scaffale A2, Cella 4°C)..."
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition-all shadow-md shadow-amber-500/20"
                >
                  {editingItem ? 'Salva Modifiche' : 'Registra Articolo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADJUST MODAL */}
      {quickAdjustModalItem && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">
              Rettifica Scorta: {quickAdjustModalItem.name}
            </h3>
            <p className="text-xs text-neutral-400">
              Giacenza attuale: <strong>{quickAdjustModalItem.currentQuantity} {quickAdjustModalItem.unit}</strong>
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-neutral-300 block mb-1">Variazione Quantità:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(parseFloat(e.target.value) || 0)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-base focus:outline-none"
                  />
                  <span className="text-neutral-400 font-bold">{quickAdjustModalItem.unit}</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-300 block mb-1">Causale / Motivo:</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Es. Consegna fornitore, scarto, consumo..."
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
                Nuova giacenza finale prevista:{' '}
                <strong className="text-amber-400">
                  {Math.max(0, quickAdjustModalItem.currentQuantity + adjustDelta)} {quickAdjustModalItem.unit}
                </strong>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setQuickAdjustModalItem(null)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmQuickAdjust}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs"
              >
                Conferma Movimento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
