/**
 * 📦 Magazzino — materie prime, prodotti finiti, movimenti e inventario fisico.
 *
 * Il markup segue il design system (Card / Btn / Field / Badge / Stat / Amount).
 * Logica, stati e handler restano identici a prima.
 */

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
import {
  Amount,
  Badge,
  Btn,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  SectionTitle,
  Select,
  Stat,
  Textarea,
} from './ui';

/** Data/ora in formato italiano, con fallback sul valore grezzo. */
const formatDateTime = (value: string): string => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
};

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

  // Valore complessivo del magazzino (valutato a costo di acquisto)
  const stockValue = useMemo(() => {
    return inventory.reduce((sum, i) => sum + i.currentQuantity * (i.costPrice || 0), 0);
  }, [inventory]);

  // Helper for item stock status
  const getStockStatus = (item: InventoryItem): { status: StockStatus; badge: string; tone: 'mint' | 'amber' | 'rose' } => {
    if (item.currentQuantity <= 0) {
      return { status: 'esaurito', badge: 'Esaurito', tone: 'rose' };
    }
    if (item.currentQuantity <= item.minThreshold) {
      return { status: 'quasi_finito', badge: 'Quasi Finito', tone: 'amber' };
    }
    return { status: 'ok', badge: 'Disponibile', tone: 'mint' };
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
    <div className="min-h-screen bg-ink-950 text-mist-100 animate-fadeIn">
      <div className="mx-auto max-w-7xl px-3 sm:px-5 py-5 sm:py-6 space-y-4 sm:space-y-5">
        {/* ── Intestazione ── */}
        <Card className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 shrink-0 rounded-2xl bg-brand-500/15 text-brand-300 border border-brand-500/25 flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-mist-100">
                Gestione Magazzino &amp; Scorte
              </h1>
              <p className="mt-0.5 text-xs text-mist-500">
                Controllo materie prime alimentari, bevande, prodotti finiti e soglie
                d&apos;allerta.
              </p>
            </div>
          </div>

          <Btn
            variant="primary"
            onClick={() => handleOpenAddModal()}
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Nuovo Articolo
          </Btn>
        </Card>

        {/* ── Riepilogo ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat
            label="Articoli in magazzino"
            value={inventory.length}
            tone="brand"
            icon={<Boxes className="w-4 h-4" />}
            sub="Materiali e prodotti registrati"
          />
          <Stat
            label="Sotto soglia"
            value={lowStockCount}
            tone={lowStockCount > 0 ? 'rose' : 'mint'}
            icon={<AlertTriangle className="w-4 h-4" />}
            sub="Da riordinare con il fornitore"
          />
          <Stat
            label="Valore magazzino"
            value={
              stockValue > 0 ? (
                <Amount value={stockValue} size="lg" tone="mint" className="!text-xl sm:!text-2xl" />
              ) : (
                '—'
              )
            }
            tone="mint"
            icon={<Layers className="w-4 h-4" />}
            sub="Valutato a costo di acquisto"
          />
        </div>

        {/* ── Sub-tab: Materiali | Prodotti | Movimenti | Inventario fisico ── */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          <Btn
            variant={activeTab === 'materiali' ? 'primary' : 'soft'}
            size="sm"
            onClick={() => setActiveTab('materiali')}
            className="shrink-0 whitespace-nowrap"
          >
            <Boxes className="w-4 h-4" />
            1. Materiali (Materie Prime)
          </Btn>

          <Btn
            variant={activeTab === 'prodotti' ? 'primary' : 'soft'}
            size="sm"
            onClick={() => setActiveTab('prodotti')}
            className="shrink-0 whitespace-nowrap"
          >
            <Package className="w-4 h-4" />
            2. Prodotti (Finiti &amp; Bevande)
          </Btn>

          <Btn
            variant={activeTab === 'movimenti' ? 'primary' : 'soft'}
            size="sm"
            onClick={() => setActiveTab('movimenti')}
            className="shrink-0 whitespace-nowrap"
          >
            <History className="w-4 h-4" />
            Registro Carichi &amp; Consumi
          </Btn>

          <Btn
            variant={activeTab === 'inventario_fisico' ? 'primary' : 'soft'}
            size="sm"
            onClick={() => setActiveTab('inventario_fisico')}
            className="shrink-0 whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4" />
            Inventario Fisico (Verifica)
          </Btn>
        </div>

        {/* ── Ricerca e filtri (tab Materiali / Prodotti) ── */}
        {(activeTab === 'materiali' || activeTab === 'prodotti') && (
          <Card className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mist-500 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Cerca per nome o fornitore..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="!pl-9"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    aria-label="Azzera ricerca"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-mist-500 hover:text-mist-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-mist-500 hidden sm:block" />
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="!w-auto min-w-[9.5rem]"
                >
                  <option value="tutti">Tutte le Categorie</option>
                  <option value="cibo">Alimentare / Cibo</option>
                  <option value="bevande">Bevande &amp; Vini</option>
                  <option value="pulizia">Pulizia &amp; Igiene</option>
                  <option value="packaging">Packaging &amp; Asporto</option>
                  <option value="altro">Altro</option>
                </Select>
              </div>
            </div>

            <Btn
              variant={filterLowStockOnly ? 'primary' : 'soft'}
              size="sm"
              onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
              className="whitespace-nowrap shrink-0"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Solo Quasi Finiti ({lowStockCount})
            </Btn>
          </Card>
        )}

        {/* ── TAB 1 & 2: elenco articoli (Materiali / Prodotti) ── */}
        {(activeTab === 'materiali' || activeTab === 'prodotti') && (
          <Card className="p-3 sm:p-4">
            {filteredItems.length === 0 ? (
              <EmptyState
                icon={<Package className="w-6 h-6" />}
                title="Nessun articolo trovato."
                description="Modifica i filtri di ricerca oppure registra un nuovo articolo in magazzino."
                action={
                  <Btn variant="primary" onClick={() => handleOpenAddModal()}>
                    <Plus className="w-4 h-4" />
                    Nuovo Articolo
                  </Btn>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item) => {
                  const statusInfo = getStockStatus(item);
                  return (
                    <div
                      key={item.id}
                      className="surface-raised p-4 flex flex-col gap-3 transition-colors hover:border-ink-600"
                    >
                      {/* Nome e stato scorta */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-mist-100 truncate">{item.name}</div>
                          <div className="mt-0.5 text-[11px] text-mist-500 truncate">
                            {item.supplier || 'Fornitore non indicato'}
                          </div>
                        </div>
                        <Badge tone={statusInfo.tone} className="shrink-0">
                          {statusInfo.status === 'ok' ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {statusInfo.badge}
                        </Badge>
                      </div>

                      {/* Categoria, note e scadenza */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">{item.category}</Badge>
                        {item.expirationDate && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-mist-500">
                            <Calendar className="w-3 h-3" />
                            Scadenza: {item.expirationDate}
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-[11px] leading-relaxed text-mist-500 line-clamp-2">
                          {item.notes}
                        </p>
                      )}

                      {/* Giacenza e soglia */}
                      <div className="rounded-xl bg-ink-900 border border-ink-700 p-3 flex items-end justify-between gap-3">
                        <div>
                          <div className="section-title">Giacenza attuale</div>
                          <div className="mt-1 flex items-baseline gap-1">
                            <span className="text-xl font-bold tnum text-mist-100">
                              {item.currentQuantity}
                            </span>
                            <span className="text-xs text-mist-500">{item.unit}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="section-title">Soglia minima</div>
                          <div className="mt-1 text-sm font-bold tnum text-amber-400">
                            {item.minThreshold} {item.unit}
                          </div>
                        </div>
                      </div>

                      {item.costPrice ? (
                        <div className="text-[11px] text-mist-500">
                          Costo fornitore: <Amount value={item.costPrice} size="sm" />
                        </div>
                      ) : null}

                      {/* Azioni rapide + / - e modifica */}
                      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Btn
                            variant="soft"
                            size="sm"
                            title="Scarica 1 unità"
                            onClick={() => handleOpenQuickAdjust(item, -1)}
                            className="!px-2.5 hover:!text-rose-400"
                          >
                            -1
                          </Btn>
                          <Btn
                            variant="soft"
                            size="sm"
                            title="Carica 1 unità"
                            onClick={() => handleOpenQuickAdjust(item, 1)}
                            className="!px-2.5"
                          >
                            +1
                          </Btn>
                          <Btn
                            variant="soft"
                            size="sm"
                            title="Carica 5 unità"
                            onClick={() => handleOpenQuickAdjust(item, 5)}
                            className="!px-2.5"
                          >
                            +5
                          </Btn>
                        </div>

                        <div className="flex items-center gap-1">
                          <Btn
                            variant="ghost"
                            size="sm"
                            title="Modifica Articolo"
                            onClick={() => handleOpenEditModal(item)}
                            className="!px-2"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Btn>
                          <Btn
                            variant="ghost"
                            size="sm"
                            title="Elimina"
                            onClick={() => {
                              if (confirm(`Sei sicuro di voler eliminare "${item.name}"?`)) {
                                deleteInventoryItem(item.id);
                              }
                            }}
                            className="!px-2 hover:!text-rose-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Btn>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* ── TAB 3: registro movimenti & consumi ── */}
        {activeTab === 'movimenti' && (
          <Card className="p-4 sm:p-5 space-y-4">
            <SectionTitle>Registro Modifiche &amp; Consumi Magazzino</SectionTitle>
            <p className="text-xs text-mist-500">
              Storico completo di chi ha modificato le quantità, quando e per quale motivo.
            </p>

            {inventoryLogs.length === 0 ? (
              <EmptyState
                icon={<History className="w-6 h-6" />}
                title="Nessun movimento registrato finora."
                description="I carichi e gli scarichi di magazzino compariranno qui."
              />
            ) : (
              <div className="divide-y divide-ink-700">
                {inventoryLogs.map((log) => (
                  <div
                    key={log.id}
                    className="py-3 flex items-center justify-between gap-3 text-xs sm:text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center border ${
                          log.deltaQuantity >= 0
                            ? 'bg-mint-600/15 text-mint-400 border-mint-400/25'
                            : 'bg-rose-600/15 text-rose-400 border-rose-400/25'
                        }`}
                      >
                        {log.deltaQuantity >= 0 ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-mist-100 truncate">{log.itemName}</div>
                        <div className="text-xs text-mist-500 truncate">
                          {log.reason || 'Movimento magazzino'} • Operatore:{' '}
                          <span className="text-brand-300 font-semibold">{log.userName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`font-mono font-bold text-sm tnum ${
                          log.deltaQuantity >= 0 ? 'text-mint-400' : 'text-rose-400'
                        }`}
                      >
                        {log.deltaQuantity >= 0 ? `+${log.deltaQuantity}` : log.deltaQuantity}
                      </div>
                      <div className="text-[11px] text-mist-500 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(log.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* ── TAB 4: inventario fisico ── */}
        {activeTab === 'inventario_fisico' && (
          <Card className="p-4 sm:p-5 space-y-4">
            <SectionTitle
              action={
                <Btn variant="success" size="sm" onClick={handleApplyPhysicalInventory}>
                  <CheckCircle2 className="w-4 h-4" />
                  Salva Rettifiche
                </Btn>
              }
            >
              Verifica &amp; Quadratura Inventario Fisico
            </SectionTitle>

            <p className="text-xs text-mist-500">
              Inserisci il conteggio reale fatto a mano in magazzino. Il sistema calcolerà le
              differenze e rettificherà le giacenze automaticamente.
            </p>

            <Field label="Note sulla verifica">
              <Input
                type="text"
                value={physicalNotes}
                onChange={(e) => setPhysicalNotes(e.target.value)}
                placeholder="Es. Inventario mensile fine mese, controllo celle frigorifere"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              {inventory.map((item) => {
                const counted = physicalCounts[item.id] ?? item.currentQuantity;
                const diff = counted - item.currentQuantity;
                return (
                  <div key={item.id} className="surface-raised p-3.5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-mist-100 truncate">{item.name}</div>
                        <div className="text-[11px] text-mist-500 capitalize">{item.type}</div>
                      </div>
                      {diff === 0 ? (
                        <Badge tone="mint">Quadratura OK</Badge>
                      ) : diff > 0 ? (
                        <Badge tone="brand">Eccedenza +{diff}</Badge>
                      ) : (
                        <Badge tone="rose">Ammanco {diff}</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-mist-500">Quantità a sistema</span>
                      <span className="font-bold tnum text-mist-300">
                        {item.currentQuantity} {item.unit}
                      </span>
                    </div>

                    <Field label="Conteggio effettivo fisico">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.5"
                          value={counted}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setPhysicalCounts((prev) => ({ ...prev, [item.id]: val }));
                          }}
                          className="!w-24 font-mono font-bold tnum"
                        />
                        <span className="text-xs text-mist-500">{item.unit}</span>
                      </div>
                    </Field>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* ── MODALE: aggiunta / modifica articolo ── */}
      <Modal
        open={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        size="lg"
        title={editingItem ? 'Modifica Articolo' : 'Registra Nuovo Articolo'}
        subtitle={
          editingItem
            ? 'Aggiorna i dati dell’articolo registrato in magazzino.'
            : 'Inserisci un nuovo articolo da monitorare tra le scorte.'
        }
        footer={
          <span className="mr-auto text-[11px] text-mist-500">
            I campi contrassegnati con * sono obbligatori.
          </span>
        }
      >
        <form onSubmit={handleSaveAddEdit} className="space-y-4 text-xs sm:text-sm">
          {/* Tipologia: materiale vs prodotto */}
          <div>
            <label className="label">Tipologia Articolo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'materiale' })}
                className={`rounded-xl px-3 py-2.5 font-bold border transition ${
                  formData.type === 'materiale'
                    ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                    : 'border-ink-700 bg-ink-900 text-mist-500 hover:text-mist-300'
                }`}
              >
                1. Materiale (Materia Prima)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'prodotto' })}
                className={`rounded-xl px-3 py-2.5 font-bold border transition ${
                  formData.type === 'prodotto'
                    ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                    : 'border-ink-700 bg-ink-900 text-mist-500 hover:text-mist-300'
                }`}
              >
                2. Prodotto (Finito / Bevanda)
              </button>
            </div>
          </div>

          {/* Nome */}
          <Field label="Nome dell'Articolo *">
            <Input
              type="text"
              required
              placeholder="Es. Farina Caputo 00, Mozzarella di Bufala, Birra Moretti..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </Field>

          {/* Categoria & unità di misura */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Categoria">
              <Select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as ItemCategory })
                }
              >
                <option value="cibo">Alimentare / Cibo</option>
                <option value="bevande">Bevande &amp; Vini</option>
                <option value="pulizia">Pulizia &amp; Igiene</option>
                <option value="packaging">Packaging &amp; Asporto</option>
                <option value="altro">Altro</option>
              </Select>
            </Field>

            <Field label="Unità di Misura">
              <Select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              >
                <option value="kg">kg (Chilogrammi)</option>
                <option value="lt">lt (Litri)</option>
                <option value="pz">pz (Pezzi / Porzioni)</option>
                <option value="bt">bt (Bottiglie)</option>
                <option value="conf">conf (Confezioni)</option>
              </Select>
            </Field>
          </div>

          {/* Quantità attuale & soglia minima */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantità Attuale">
              <Input
                type="number"
                step="0.1"
                min="0"
                required
                value={formData.currentQuantity}
                onChange={(e) =>
                  setFormData({ ...formData, currentQuantity: parseFloat(e.target.value) || 0 })
                }
                className="font-mono font-bold tnum"
              />
            </Field>

            <Field label="Soglia Minima (Alert)">
              <Input
                type="number"
                step="0.1"
                min="0"
                required
                value={formData.minThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, minThreshold: parseFloat(e.target.value) || 0 })
                }
                className="font-mono font-bold tnum"
              />
            </Field>
          </div>

          {/* Fornitore & data di scadenza */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Fornitore">
              <Input
                type="text"
                placeholder="Es. Molino Caputo, Caseificio..."
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              />
            </Field>

            <Field label="Data Scadenza (facoltativa)">
              <Input
                type="date"
                value={formData.expirationDate}
                onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
              />
            </Field>
          </div>

          {/* Prezzi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Costo Acquisto Fornitore (€)">
              <Input
                type="number"
                step="0.05"
                min="0"
                value={formData.costPrice}
                onChange={(e) =>
                  setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })
                }
                className="font-mono font-bold tnum"
              />
            </Field>

            {formData.type === 'prodotto' && (
              <Field label="Prezzo Vendita al Pubblico (€)">
                <Input
                  type="number"
                  step="0.10"
                  min="0"
                  value={formData.sellPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, sellPrice: parseFloat(e.target.value) || 0 })
                  }
                  className="font-mono font-bold tnum text-mint-400"
                />
              </Field>
            )}
          </div>

          {/* Note */}
          <Field label="Note & Istruzioni di Conservazione">
            <Textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Note, posizione in magazzino (es. Scaffale A2, Cella 4°C)..."
            />
          </Field>

          {/* Azioni */}
          <div className="pt-3 border-t border-ink-700 flex items-center justify-end gap-2">
            <Btn variant="ghost" type="button" onClick={() => setIsAddEditModalOpen(false)}>
              Annulla
            </Btn>
            <Btn variant="primary" type="submit">
              {editingItem ? 'Salva Modifiche' : 'Registra Articolo'}
            </Btn>
          </div>
        </form>
      </Modal>

      {/* ── MODALE: rettifica rapida quantità ── */}
      <Modal
        open={!!quickAdjustModalItem}
        onClose={() => setQuickAdjustModalItem(null)}
        size="sm"
        title={`Rettifica Scorta: ${quickAdjustModalItem?.name ?? ''}`}
        subtitle={
          quickAdjustModalItem
            ? `Giacenza attuale: ${quickAdjustModalItem.currentQuantity} ${quickAdjustModalItem.unit}`
            : undefined
        }
        footer={
          <>
            <Btn variant="ghost" onClick={() => setQuickAdjustModalItem(null)}>
              Annulla
            </Btn>
            <Btn variant="primary" onClick={handleConfirmQuickAdjust}>
              Conferma Movimento
            </Btn>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <Field
            label="Variazione Quantità"
            hint="Numero negativo per uno scarico, positivo per un carico."
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.5"
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(parseFloat(e.target.value) || 0)}
                className="font-mono font-bold tnum"
              />
              <span className="text-xs font-bold text-mist-500">{quickAdjustModalItem?.unit}</span>
            </div>
          </Field>

          <Field label="Causale / Motivo">
            <Input
              type="text"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="Es. Consegna fornitore, scarto, consumo..."
            />
          </Field>

          <div className="surface-raised p-3 text-xs text-mist-300">
            Nuova giacenza finale prevista:{' '}
            <span className="font-bold text-brand-300 tnum">
              {Math.max(0, (quickAdjustModalItem?.currentQuantity ?? 0) + adjustDelta)}{' '}
              {quickAdjustModalItem?.unit}
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};
