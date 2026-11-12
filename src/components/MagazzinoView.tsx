/**
 * 📦 Magazzino — scorte, soglie, movimenti e inventario fisico.
 *
 * Schermata ridisegnata per essere velocissima durante il servizio:
 * toolbar persistente (ricerca + filtri sempre visibili), riepilogo
 * compatto, elenco articoli con correzioni +/- in linea e registro
 * movimenti leggibile.
 *
 * Design system: esclusivamente token del tema "Charcoal Minimal"
 * (ink / mist / brand / semantici). Interfaccia interamente in italiano.
 */

import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Euro,
  History,
  Layers,
  Minus,
  Package,
  Pencil,
  Plus,
  Scale,
  Search,
  SlidersHorizontal,
  Tag,
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

/* ═══════════════════════════════════════════════════════════════════
   Tipi e costanti di sezione
   ═══════════════════════════════════════════════════════════════════ */

type View = 'articoli' | 'movimenti' | 'inventario';
type TypeFilter = 'tutti' | ItemType;
type AlertFilter = 'tutti' | 'sotto_soglia' | 'esauriti';
type ChangeFilter = 'tutti' | InventoryLog['changeType'];
type StatusTone = 'mint' | 'amber' | 'rose';

const CATEGORIES: { value: ItemCategory; label: string; short: string }[] = [
  { value: 'cibo', label: 'Alimentare / Cibo', short: 'Cibo' },
  { value: 'bevande', label: 'Bevande & Vini', short: 'Bevande' },
  { value: 'pulizia', label: 'Pulizia & Igiene', short: 'Pulizia' },
  { value: 'packaging', label: 'Packaging & Asporto', short: 'Packaging' },
  { value: 'altro', label: 'Altro', short: 'Altro' },
];

const CATEGORY_LABEL: Record<ItemCategory, string> = {
  cibo: 'Alimentare / Cibo',
  bevande: 'Bevande & Vini',
  pulizia: 'Pulizia & Igiene',
  packaging: 'Packaging & Asporto',
  altro: 'Altro',
};

const UNITS: { value: string; label: string }[] = [
  { value: 'kg', label: 'kg (Chilogrammi)' },
  { value: 'lt', label: 'lt (Litri)' },
  { value: 'pz', label: 'pz (Pezzi / Porzioni)' },
  { value: 'bt', label: 'bt (Bottiglie)' },
  { value: 'conf', label: 'conf (Confezioni)' },
];

const CHANGE_TYPES: { value: ChangeFilter; label: string }[] = [
  { value: 'tutti', label: 'Tutti' },
  { value: 'carico', label: 'Carichi' },
  { value: 'scarico', label: 'Scarichi' },
  { value: 'rettifica', label: 'Rettifiche' },
  { value: 'vendita', label: 'Vendite' },
];

/* ═══════════════════════════════════════════════════════════════════
   Helper di formattazione
   ═══════════════════════════════════════════════════════════════════ */

/** Quantità compatta (niente zeri inutili, separatore decimale italiano). */
const formatQty = (value: number | undefined): string => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(n);
};

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

/** Data breve in formato italiano (per le scadenze). */
const formatDate = (value?: string): string => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/* ═══════════════════════════════════════════════════════════════════
   Badge tipizzati
   ═══════════════════════════════════════════════════════════════════ */

/** Badge del tipo di movimento (carico / scarico / rettifica / vendita). */
const ChangeBadge: React.FC<{ type: InventoryLog['changeType'] }> = ({ type }) => {
  const map: Record<InventoryLog['changeType'], { label: string; className: string }> = {
    carico: { label: 'Carico', className: 'bg-mint-600/15 text-mint-400 border-mint-400/25' },
    scarico: { label: 'Scarico', className: 'bg-rose-600/15 text-rose-400 border-rose-400/25' },
    rettifica: { label: 'Rettifica', className: 'bg-violet-400/15 text-violet-400 border-violet-400/25' },
    vendita: { label: 'Vendita', className: 'bg-ink-700/60 text-mist-300 border-ink-600' },
  };
  const meta = map[type] ?? map.rettifica;
  return <span className={`badge border ${meta.className}`}>{meta.label}</span>;
};

/** Chip filtrante compatto (usato per categorie e tipologie). */
const FilterChip: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
      active
        ? 'bg-brand-500/15 text-brand-300 border-brand-500/35'
        : 'bg-ink-900 text-mist-400 border-ink-700 hover:text-mist-100 hover:border-ink-600'
    }`}
  >
    {children}
  </button>
);

/* ═══════════════════════════════════════════════════════════════════
   🧭 Magazzino
   ═══════════════════════════════════════════════════════════════════ */

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

  // ── Vista attiva ──
  const [view, setView] = useState<View>('articoli');

  // ── Filtri ──
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('tutti');
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'tutti'>('tutti');
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('tutti');

  // ── Movimenti ──
  const [changeFilter, setChangeFilter] = useState<ChangeFilter>('tutti');
  const [logLimit, setLogLimit] = useState(50);

  // ── Modali ──
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [quickAdjustModalItem, setQuickAdjustModalItem] = useState<InventoryItem | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Carico da fornitore');

  // ── Inventario fisico ──
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({});
  const [physicalNotes, setPhysicalNotes] = useState<string>('Controllo settimanale di magazzino');
  const [inventorySaved, setInventorySaved] = useState(false);

  // ── Modulo di aggiunta / modifica ──
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

  /* ───────────────────────────────────────────────────────────────
     Dati derivati
     ─────────────────────────────────────────────────────────────── */

  /** Stato scorta: esaurito → sotto soglia → disponibile. */
  const getStockStatus = (item: InventoryItem): { status: StockStatus; label: string; tone: StatusTone } => {
    if (item.currentQuantity <= 0) {
      return { status: 'esaurito', label: 'Esaurito', tone: 'rose' };
    }
    if (item.currentQuantity <= item.minThreshold) {
      return { status: 'quasi_finito', label: 'Sotto soglia', tone: 'amber' };
    }
    return { status: 'ok', label: 'Disponibile', tone: 'mint' };
  };

  /** Articoli filtrati per vista, ricerca, categoria, tipologia e allerta. */
  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return inventory.filter((item) => {
      if (typeFilter !== 'tutti' && item.type !== typeFilter) return false;

      if (
        q &&
        !item.name.toLowerCase().includes(q) &&
        !item.supplier.toLowerCase().includes(q)
      ) {
        return false;
      }

      if (selectedCategory !== 'tutti' && item.category !== selectedCategory) return false;

      if (alertFilter === 'sotto_soglia' && item.currentQuantity > item.minThreshold) return false;
      if (alertFilter === 'esauriti' && item.currentQuantity > 0) return false;

      return true;
    });
  }, [inventory, typeFilter, searchTerm, selectedCategory, alertFilter]);

  /** Articoli sotto soglia (inclusi gli esauriti). */
  const lowStockCount = useMemo(
    () => inventory.filter((i) => i.currentQuantity <= i.minThreshold).length,
    [inventory]
  );

  /** Articoli completamente esauriti. */
  const outOfStockCount = useMemo(
    () => inventory.filter((i) => i.currentQuantity <= 0).length,
    [inventory]
  );

  /** Valore complessivo del magazzino (valutato a costo di acquisto). */
  const stockValue = useMemo(
    () => inventory.reduce((sum, i) => sum + i.currentQuantity * (i.costPrice || 0), 0),
    [inventory]
  );

  /** Movimenti filtrati per tipologia. */
  const filteredLogs = useMemo(() => {
    const list = [...inventoryLogs].sort((a, b) =>
      String(b.timestamp).localeCompare(String(a.timestamp))
    );
    return changeFilter === 'tutti' ? list : list.filter((log) => log.changeType === changeFilter);
  }, [inventoryLogs, changeFilter]);

  /** Differenze rilevate durante l'inventario fisico. */
  const physicalDiffCount = useMemo(
    () =>
      Object.keys(physicalCounts).filter((id) => {
        const item = inventory.find((i) => i.id === id);
        return !!item && item.currentQuantity !== physicalCounts[id];
      }).length,
    [physicalCounts, inventory]
  );

  /* ───────────────────────────────────────────────────────────────
     Handler
     ─────────────────────────────────────────────────────────────── */

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      type: typeFilter === 'prodotto' ? 'prodotto' : 'materiale',
      category: selectedCategory === 'tutti' ? 'cibo' : selectedCategory,
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

    const payload = {
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
    };

    if (editingItem) {
      updateInventoryItem(editingItem.id, payload);
    } else {
      addInventoryItem(payload);
    }
    setIsAddEditModalOpen(false);
  };

  /** Correzione rapida in linea: +/- 1 unità, con causale automatica. */
  const applyQuickAdjust = (item: InventoryItem, delta: number) => {
    adjustQuantity(
      item.id,
      delta,
      delta > 0 ? 'Carico rapido durante il servizio' : 'Consumo rapido durante il servizio'
    );
  };

  /** Rettifica manuale: delta e causale libere. */
  const handleOpenManualAdjust = (item: InventoryItem) => {
    setQuickAdjustModalItem(item);
    setAdjustDelta(0);
    setAdjustReason('Carico da fornitore');
  };

  const handleConfirmQuickAdjust = () => {
    if (quickAdjustModalItem && adjustDelta !== 0) {
      adjustQuantity(quickAdjustModalItem.id, adjustDelta, adjustReason.trim() || 'Movimento manuale');
      setQuickAdjustModalItem(null);
    }
  };

  const handleDeleteItem = (item: InventoryItem) => {
    if (confirm(`Sei sicuro di voler eliminare "${item.name}"?`)) {
      deleteInventoryItem(item.id);
    }
  };

  const handleApplyPhysicalInventory = () => {
    performPhysicalInventoryCount(physicalCounts, physicalNotes);
    setInventorySaved(true);
    setPhysicalCounts({});
    setView('articoli');
  };

  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('tutti');
    setSelectedCategory('tutti');
    setAlertFilter('tutti');
  };

  /* ───────────────────────────────────────────────────────────────
     Rendering
     ─────────────────────────────────────────────────────────────── */

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    typeFilter !== 'tutti' ||
    selectedCategory !== 'tutti' ||
    alertFilter !== 'tutti';

  return (
    <div className="min-h-screen bg-ink-950 text-mist-100 animate-fadeIn">
      <div className="mx-auto max-w-7xl px-3 sm:px-5 py-4 sm:py-5 space-y-4 pb-24">
        {/* ══ Intestazione ══ */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-2xl bg-brand-500/15 text-brand-300 border border-brand-500/25 flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-mist-100">
                Gestione Magazzino &amp; Scorte
              </h1>
              <p className="mt-0.5 text-[11px] sm:text-xs text-mist-500 truncate">
                {currentUser?.displayName
                  ? `Operatore: ${currentUser.displayName}`
                  : 'Materie prime, prodotti finiti e soglie d’allerta'}
              </p>
            </div>
          </div>

          <Btn variant="primary" onClick={handleOpenAddModal} className="w-full sm:w-auto shrink-0">
            <Plus className="w-4 h-4" />
            Nuovo Articolo
          </Btn>
        </header>

        {/* ══ Selettore di vista ══ */}
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none bg-ink-900 border border-ink-700 rounded-2xl p-1">
          <button
            type="button"
            onClick={() => setView('articoli')}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
              view === 'articoli'
                ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30'
                : 'text-mist-400 border border-transparent hover:text-mist-100 hover:bg-ink-800'
            }`}
          >
            <Boxes className="w-4 h-4" />
            Articoli
            <span className="tnum text-[10px] text-mist-500">{inventory.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setView('movimenti')}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
              view === 'movimenti'
                ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30'
                : 'text-mist-400 border border-transparent hover:text-mist-100 hover:bg-ink-800'
            }`}
          >
            <History className="w-4 h-4" />
            Movimenti
            <span className="tnum text-[10px] text-mist-500">{inventoryLogs.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setView('inventario')}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
              view === 'inventario'
                ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30'
                : 'text-mist-400 border border-transparent hover:text-mist-100 hover:bg-ink-800'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            Inventario fisico
          </button>
        </nav>

        {/* Conferma dell'ultima operazione di quadratura */}
        {inventorySaved && (
          <div className="flex items-center gap-2 rounded-xl bg-mint-600/15 border border-mint-400/30 px-3.5 py-2.5 text-xs font-bold text-mint-400">
            <Check className="w-4 h-4" />
            Inventario fisico aggiornato: rettifiche registrate nello storico.
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            VISTA: ARTICOLI
            ══════════════════════════════════════════════════════ */}
        {view === 'articoli' && (
          <>
            {/* ── Riepilogo ── */}
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
              <div className="min-w-[11rem] flex-1">
                <Stat
                  label="Articoli"
                  value={inventory.length}
                  tone="brand"
                  icon={<Boxes className="w-4 h-4" />}
                  sub="Materiali e prodotti registrati"
                />
              </div>
              <div
                className={`min-w-[11rem] flex-1 rounded-2xl ${
                  alertFilter === 'sotto_soglia' ? 'ring-2 ring-amber-400/60' : ''
                }`}
              >
                <Stat
                  label="Sotto soglia"
                  value={lowStockCount}
                  tone={lowStockCount > 0 ? 'amber' : 'mint'}
                  icon={<AlertTriangle className="w-4 h-4" />}
                  sub="Da riordinare con il fornitore"
                  onClick={() =>
                    setAlertFilter((prev) => (prev === 'sotto_soglia' ? 'tutti' : 'sotto_soglia'))
                  }
                />
              </div>
              <div
                className={`min-w-[11rem] flex-1 rounded-2xl ${
                  alertFilter === 'esauriti' ? 'ring-2 ring-rose-400/60' : ''
                }`}
              >
                <Stat
                  label="Esauriti"
                  value={outOfStockCount}
                  tone={outOfStockCount > 0 ? 'rose' : 'mint'}
                  icon={<Package className="w-4 h-4" />}
                  sub="Quantità a zero"
                  onClick={() =>
                    setAlertFilter((prev) => (prev === 'esauriti' ? 'tutti' : 'esauriti'))
                  }
                />
              </div>
              <div className="min-w-[11rem] flex-1">
                <Stat
                  label="Valore magazzino"
                  value={
                    stockValue > 0 ? (
                      <Amount
                        value={stockValue}
                        size="lg"
                        tone="mint"
                        className="!text-xl sm:!text-2xl"
                      />
                    ) : (
                      '—'
                    )
                  }
                  tone="mint"
                  icon={<Layers className="w-4 h-4" />}
                  sub="Valutato a costo di acquisto"
                />
              </div>
            </div>

            {/* ── Toolbar persistente ── */}
            <div
              className="sticky z-30 -mx-3 sm:-mx-5 px-3 sm:px-5 py-3 bg-ink-950/95 backdrop-blur-md border-b border-ink-800"
              style={{ top: 'calc(3.5rem + var(--sea-safe-t, 0px))' }}
            >
              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mist-500 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Cerca articolo o fornitore..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="!pl-9 !pr-9"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      aria-label="Azzera ricerca"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-mist-500 hover:text-mist-100 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                  className="!w-auto shrink-0"
                  small
                  aria-label="Filtra per tipologia"
                >
                  <option value="tutti">Tutti i tipi</option>
                  <option value="materiale">Materiali</option>
                  <option value="prodotto">Prodotti</option>
                </Select>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-0.5">
                <button
                  type="button"
                  onClick={() =>
                    setAlertFilter((prev) => (prev === 'sotto_soglia' ? 'tutti' : 'sotto_soglia'))
                  }
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                    alertFilter !== 'tutti'
                      ? 'bg-amber-600/15 text-amber-400 border-amber-400/40'
                      : 'bg-ink-900 text-mist-400 border-ink-700 hover:text-mist-100 hover:border-ink-600'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3 inline mr-1 -mt-0.5" />
                  Sotto soglia ({lowStockCount})
                </button>

                <span className="w-px h-5 bg-ink-700 shrink-0" />

                <FilterChip
                  active={selectedCategory === 'tutti'}
                  onClick={() => setSelectedCategory('tutti')}
                >
                  Tutte
                </FilterChip>
                {CATEGORIES.map((cat) => (
                  <FilterChip
                    key={cat.value}
                    active={selectedCategory === cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                  >
                    {cat.short}
                  </FilterChip>
                ))}
              </div>
            </div>

            {/* ── Elenco articoli ── */}
            <Card className="p-2 sm:p-3">
              {filteredItems.length === 0 ? (
                inventory.length === 0 ? (
                  <EmptyState
                    icon={<Package className="w-6 h-6" />}
                    title="Il magazzino è vuoto."
                    description="Registra il primo articolo per iniziare a monitorare giacenze, soglie e consumi."
                    action={
                      <Btn variant="primary" onClick={handleOpenAddModal}>
                        <Plus className="w-4 h-4" />
                        Nuovo Articolo
                      </Btn>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={<Search className="w-6 h-6" />}
                    title="Nessun articolo corrisponde ai filtri."
                    description="Prova a cambiare ricerca, tipologia o categoria per ritrovare quello che cerchi."
                    action={
                      <Btn variant="soft" onClick={resetFilters}>
                        <X className="w-4 h-4" />
                        Azzera i filtri
                      </Btn>
                    }
                  />
                )
              ) : (
                <>
                  <div className="divide-y divide-ink-700">
                    {filteredItems.map((item) => {
                      const status = getStockStatus(item);
                      const borderTone =
                        status.tone === 'rose'
                          ? 'border-l-rose-400'
                          : status.tone === 'amber'
                          ? 'border-l-amber-400'
                          : 'border-l-ink-700';
                      const barTone =
                        status.tone === 'rose'
                          ? 'bg-rose-400'
                          : status.tone === 'amber'
                          ? 'bg-amber-400'
                          : 'bg-mint-400';
                      const reference = Math.max(item.minThreshold * 2, item.currentQuantity, 1);
                      const levelPct = Math.min(
                        100,
                        Math.max(0, (item.currentQuantity / reference) * 100)
                      );
                      const qtyColor =
                        status.tone === 'rose'
                          ? 'text-rose-400'
                          : status.tone === 'amber'
                          ? 'text-amber-400'
                          : 'text-mist-100';

                      return (
                        <div
                          key={item.id}
                          className={`flex flex-col gap-3 border-l-4 ${borderTone} py-3 pl-3 pr-1 sm:flex-row sm:items-center sm:gap-4 sm:pr-2`}
                        >
                          {/* Nome, categoria e note */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-mist-100 truncate max-w-full">
                                {item.name}
                              </h3>
                              <Badge tone={status.tone}>{status.label}</Badge>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-mist-500">
                              <span className="inline-flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                {CATEGORY_LABEL[item.category]}
                              </span>
                              {item.supplier && (
                                <span className="inline-flex items-center gap-1 truncate max-w-[12rem]">
                                  <Scale className="w-3 h-3" />
                                  {item.supplier}
                                </span>
                              )}
                              {item.expirationDate && (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Scad. {formatDate(item.expirationDate)}
                                </span>
                              )}
                              {item.costPrice ? (
                                <span className="inline-flex items-center gap-1 sm:hidden">
                                  <Euro className="w-3 h-3" />
                                  {formatQty(item.costPrice)} €/unità
                                </span>
                              ) : null}
                            </div>

                            {item.notes && (
                              <p className="mt-1 text-[11px] leading-relaxed text-mist-500 line-clamp-1">
                                {item.notes}
                              </p>
                            )}

                            {/* Livello di giacenza rispetto alla soglia */}
                            <div className="mt-2 h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-ink-700">
                              <div
                                className={`h-full rounded-full ${barTone}`}
                                style={{ width: `${levelPct}%` }}
                              />
                            </div>
                          </div>

                          {/* Giacenza, soglia e costo */}
                          <div className="flex items-end justify-between gap-4 sm:justify-end">
                            <div className="text-left sm:text-right">
                              <div className="section-title">Giacenza</div>
                              <div className="mt-0.5 flex items-baseline gap-1">
                                <span className={`text-lg font-bold tnum ${qtyColor}`}>
                                  {formatQty(item.currentQuantity)}
                                </span>
                                <span className="text-[11px] text-mist-500">{item.unit}</span>
                              </div>
                            </div>

                            <div className="text-left sm:text-right">
                              <div className="section-title">Soglia min</div>
                              <div className="mt-0.5 text-sm font-bold tnum text-mist-300">
                                {formatQty(item.minThreshold)}
                                <span className="text-[11px] font-normal text-mist-500">
                                  {' '}
                                  {item.unit}
                                </span>
                              </div>
                            </div>

                            <div className="hidden text-left sm:block lg:text-right">
                              <div className="section-title">Costo</div>
                              <div className="mt-0.5">
                                {item.costPrice ? (
                                  <Amount value={item.costPrice} size="sm" />
                                ) : (
                                  <span className="text-xs text-mist-500">—</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Azioni rapide */}
                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                            <Btn
                              variant="soft"
                              size="sm"
                              title={`Scarica 1 ${item.unit}`}
                              onClick={() => applyQuickAdjust(item, -1)}
                              className="!px-2.5 hover:!text-rose-400"
                            >
                              <Minus className="w-3.5 h-3.5" />
                              1
                            </Btn>
                            <Btn
                              variant="soft"
                              size="sm"
                              title={`Carica 1 ${item.unit}`}
                              onClick={() => applyQuickAdjust(item, 1)}
                              className="!px-2.5"
                            >
                              1
                              <Plus className="w-3.5 h-3.5" />
                            </Btn>
                            <Btn
                              variant="ghost"
                              size="sm"
                              title="Rettifica quantità manualmente"
                              onClick={() => handleOpenManualAdjust(item)}
                              className="!px-2"
                            >
                              <SlidersHorizontal className="w-4 h-4" />
                            </Btn>
                            <Btn
                              variant="ghost"
                              size="sm"
                              title="Modifica articolo"
                              onClick={() => handleOpenEditModal(item)}
                              className="!px-2"
                            >
                              <Pencil className="w-4 h-4" />
                            </Btn>
                            <Btn
                              variant="ghost"
                              size="sm"
                              title="Elimina articolo"
                              onClick={() => handleDeleteItem(item)}
                              className="!px-2 hover:!text-rose-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Btn>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-3 px-2 pt-3 text-[11px] text-mist-500">
                    <span>
                      {filteredItems.length} di {inventory.length} articoli
                      {hasActiveFilters ? ' · filtri attivi' : ''}
                    </span>
                    {hasActiveFilters && (
                      <Btn variant="ghost" size="sm" onClick={resetFilters}>
                        <X className="w-3.5 h-3.5" />
                        Azzera filtri
                      </Btn>
                    )}
                  </div>
                </>
              )}
            </Card>
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            VISTA: MOVIMENTI
            ══════════════════════════════════════════════════════ */}
        {view === 'movimenti' && (
          <Card className="p-3 sm:p-4">
            <SectionTitle
              action={
                <Badge tone="neutral">
                  {filteredLogs.length} di {inventoryLogs.length}
                </Badge>
              }
            >
              Registro Movimenti di Magazzino
            </SectionTitle>
            <p className="mt-1 text-xs text-mist-500">
              Storico completo di chi ha modificato le quantità, quando e per quale motivo.
            </p>

            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-0.5">
              {CHANGE_TYPES.map((ct) => (
                <FilterChip
                  key={ct.value}
                  active={changeFilter === ct.value}
                  onClick={() => {
                    setChangeFilter(ct.value);
                    setLogLimit(50);
                  }}
                >
                  {ct.label}
                </FilterChip>
              ))}
            </div>

            {filteredLogs.length === 0 ? (
              <EmptyState
                icon={<History className="w-6 h-6" />}
                title="Nessun movimento registrato."
                description="I carichi, gli scarichi e le rettifiche di magazzino compariranno qui."
              />
            ) : (
              <>
                <div className="mt-3 divide-y divide-ink-700">
                  {filteredLogs.slice(0, logLimit).map((log) => (
                    <div key={log.id} className="flex items-start gap-3 py-3">
                      <div
                        className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center border ${
                          log.deltaQuantity >= 0
                            ? 'bg-mint-600/15 text-mint-400 border-mint-400/25'
                            : 'bg-rose-600/15 text-rose-400 border-rose-400/25'
                        }`}
                      >
                        {log.deltaQuantity >= 0 ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-mist-100 truncate max-w-full">
                            {log.itemName}
                          </span>
                          <ChangeBadge type={log.changeType} />
                        </div>

                        <div className="mt-0.5 text-[11px] text-mist-400 break-words">
                          {log.reason || 'Movimento magazzino'}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-mist-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(log.timestamp)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Scale className="w-3 h-3" />
                            {log.userName || 'Operatore'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-mono font-bold text-sm tnum ${
                            log.deltaQuantity >= 0 ? 'text-mint-400' : 'text-rose-400'
                          }`}
                        >
                          {log.deltaQuantity >= 0
                            ? `+${formatQty(log.deltaQuantity)}`
                            : formatQty(log.deltaQuantity)}
                        </div>
                        <div className="text-[11px] text-mist-500">
                          Giacenza {formatQty(log.finalQuantity)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredLogs.length > logLimit && (
                  <div className="mt-3 flex justify-center">
                    <Btn
                      variant="soft"
                      size="sm"
                      onClick={() => setLogLimit((prev) => prev + 50)}
                    >
                      Mostra altri {Math.min(50, filteredLogs.length - logLimit)} movimenti
                    </Btn>
                  </div>
                )}
              </>
            )}
          </Card>
        )}

        {/* ══════════════════════════════════════════════════════
            VISTA: INVENTARIO FISICO
            ══════════════════════════════════════════════════════ */}
        {view === 'inventario' && (
          <Card className="p-3 sm:p-4">
            <SectionTitle
              action={
                <Btn
                  variant="success"
                  size="sm"
                  onClick={handleApplyPhysicalInventory}
                  disabled={physicalDiffCount === 0}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Salva Rettifiche
                </Btn>
              }
            >
              Verifica &amp; Quadratura Inventario Fisico
            </SectionTitle>

            <p className="mt-1 text-xs text-mist-500">
              Inserisci il conteggio reale fatto a mano in magazzino: il sistema calcola le
              differenze e rettifica le giacenze.
            </p>

            <div className="mt-3">
              <Field label="Note sulla verifica">
                <Input
                  type="text"
                  value={physicalNotes}
                  onChange={(e) => setPhysicalNotes(e.target.value)}
                  placeholder="Es. Inventario mensile fine mese, controllo celle frigorifere"
                />
              </Field>
            </div>

            {inventory.length === 0 ? (
              <EmptyState
                icon={<ClipboardCheck className="w-6 h-6" />}
                title="Nessun articolo da verificare."
                description="Registra prima gli articoli in magazzino, poi potrai quadrare le giacenze."
              />
            ) : (
              <div className="mt-4 divide-y divide-ink-700">
                {inventory.map((item) => {
                  const counted = physicalCounts[item.id] ?? item.currentQuantity;
                  const diff = counted - item.currentQuantity;
                  return (
                    <div
                      key={item.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-mist-100 truncate">{item.name}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-mist-500">
                          <span className="capitalize">{item.type}</span>
                          <span className="inline-flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {CATEGORY_LABEL[item.category]}
                          </span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <div className="section-title">A sistema</div>
                        <div className="text-sm font-bold tnum text-mist-300">
                          {formatQty(item.currentQuantity)}{' '}
                          <span className="text-[11px] font-normal text-mist-500">{item.unit}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.5"
                          value={counted}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setPhysicalCounts((prev) => ({ ...prev, [item.id]: val }));
                          }}
                          className="!w-20 font-mono font-bold tnum"
                          aria-label={`Conteggio fisico di ${item.name}`}
                        />
                        <span className="text-xs text-mist-500">{item.unit}</span>
                      </div>

                      <div className="shrink-0 sm:w-28 sm:text-right">
                        {diff === 0 ? (
                          <Badge tone="mint">Quadratura OK</Badge>
                        ) : diff > 0 ? (
                          <Badge tone="brand">Eccedenza +{formatQty(diff)}</Badge>
                        ) : (
                          <Badge tone="rose">Ammanco {formatQty(diff)}</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ══ MODALE: aggiunta / modifica articolo ══ */}
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
                className={`rounded-xl px-3 py-2.5 font-bold border transition flex items-center justify-center gap-2 ${
                  formData.type === 'materiale'
                    ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                    : 'border-ink-700 bg-ink-900 text-mist-500 hover:text-mist-300'
                }`}
              >
                <Boxes className="w-4 h-4" />
                Materia prima
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'prodotto' })}
                className={`rounded-xl px-3 py-2.5 font-bold border transition flex items-center justify-center gap-2 ${
                  formData.type === 'prodotto'
                    ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                    : 'border-ink-700 bg-ink-900 text-mist-500 hover:text-mist-300'
                }`}
              >
                <Package className="w-4 h-4" />
                Prodotto finito
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
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Unità di Misura">
              <Select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
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

      {/* ══ MODALE: rettifica manuale quantità ══ */}
      <Modal
        open={!!quickAdjustModalItem}
        onClose={() => setQuickAdjustModalItem(null)}
        size="sm"
        title={`Rettifica Scorta: ${quickAdjustModalItem?.name ?? ''}`}
        subtitle={
          quickAdjustModalItem
            ? `Giacenza attuale: ${formatQty(quickAdjustModalItem.currentQuantity)} ${quickAdjustModalItem.unit}`
            : undefined
        }
        footer={
          <>
            <Btn variant="ghost" onClick={() => setQuickAdjustModalItem(null)}>
              Annulla
            </Btn>
            <Btn variant="primary" onClick={handleConfirmQuickAdjust} disabled={adjustDelta === 0}>
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
              {formatQty(
                Math.max(0, (quickAdjustModalItem?.currentQuantity ?? 0) + adjustDelta)
              )}{' '}
              {quickAdjustModalItem?.unit}
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};
