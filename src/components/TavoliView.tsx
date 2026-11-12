/**
 * 🍽️ Sea POS — Tavoli
 *
 * Schermata di gestione dei tavoli e dei conti del servizio:
 *   · riepilogo live (tavoli, occupati, liberi, importo sui tavoli)
 *   · filtri rapidi (tutti / liberi / occupati / conto aperto)
 *   · card per tavolo: stato, coperti, note, importo da incassare
 *     + azioni rapide (incassa, importo, dettagli, cassa, libera, elimina)
 *   · incasso diretto dal tavolo (PaymentModal) toccando la card
 */

import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentModal } from './PaymentModal';
import {
  CreditCard,
  Grid,
  PenLine,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Store,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import { RestaurantTable, TableStatus } from '../types';
import {
  Amount,
  Badge,
  Btn,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Stat,
  euro,
} from './ui';

// ═══════════════════════════════════════════════════════════════════
// 🧭 Tipi e helper
// ═══════════════════════════════════════════════════════════════════

type FilterId = 'tutti' | 'liberi' | 'occupati' | 'conto';

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'liberi', label: 'Liberi' },
  { id: 'occupati', label: 'Occupati' },
  { id: 'conto', label: 'Conto aperto' },
];

/** stato visuale di un tavolo: etichetta + colore del badge + barra laterale */
const statusMeta = (t: RestaurantTable) => {
  const amount = typeof t.billAmount === 'number' ? t.billAmount : 0;
  const isInConto = t.status === 'in_conto';
  const isOccupied = amount > 0 || t.status === 'occupato' || isInConto;

  if (isInConto) {
    return { label: 'In conto', tone: 'amber' as const, stripe: 'bg-amber-400' };
  }
  if (isOccupied) {
    return { label: 'Occupato', tone: 'brand' as const, stripe: 'bg-brand-500' };
  }
  return { label: 'Libero', tone: 'mint' as const, stripe: 'bg-mint-400' };
};

/** classi dei bottoni di scelta (stato del tavolo) */
const statusBtnClass = (active: boolean) =>
  `rounded-xl border px-3 py-2.5 text-xs font-bold transition active:scale-[0.98] ${
    active
      ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
      : 'border-ink-700 bg-ink-900 text-mist-400 hover:border-ink-600 hover:text-mist-100'
  }`;

/**
 * 🔘 Pulsante-icona: azione rapida sulla card del tavolo.
 * Il tooltip è il title nativo + aria-label per la lettura vocale.
 */
const IconAction: React.FC<{
  title: string;
  onClick: () => void;
  tone?: 'brand' | 'neutral' | 'rose';
  className?: string;
  children: React.ReactNode;
}> = ({ title, onClick, tone = 'neutral', className = '', children }) => {
  const tones: Record<string, string> = {
    brand:
      'border-brand-500/30 bg-brand-500/10 text-brand-300 hover:bg-brand-500/20',
    neutral:
      'border-ink-700 bg-ink-800 text-mist-400 hover:border-ink-600 hover:text-mist-100',
    rose: 'border-rose-400/25 bg-rose-600/10 text-rose-400 hover:bg-rose-600/20',
  };
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition active:scale-95 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════
// 🍽️ Schermata Tavoli
// ═══════════════════════════════════════════════════════════════════

export const TavoliView: React.FC = () => {
  const {
    tables,
    addTable,
    updateTable,
    deleteTable,
    updateTableBillAmount,
    openTable,
    freeTable,
    setTableStatus,
    setSelectedTableForCheckout,
    setActiveView,
    currentUser,
  } = useApp();

  // ── Modali ──
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [editingTableAmount, setEditingTableAmount] = useState<RestaurantTable | null>(null);
  const [newAmountInput, setNewAmountInput] = useState<string>('');
  const [isEditTableDetailsOpen, setIsEditTableDetailsOpen] = useState<RestaurantTable | null>(null);
  const [paymentTable, setPaymentTable] = useState<RestaurantTable | null>(null);

  // ── Filtro attivo ──
  const [filter, setFilter] = useState<FilterId>('tutti');

  // ── Form nuovo tavolo ──
  const [newTableName, setNewTableName] = useState('');
  const [newTableSeats, setNewTableSeats] = useState<number>(4);
  const [newTableInitialAmount, setNewTableInitialAmount] = useState<string>('');
  const [newTableNotes, setNewTableNotes] = useState('');

  // ── Dati derivati dai tavoli ──
  const enriched = useMemo(
    () =>
      tables.map((t) => {
        const amount = typeof t.billAmount === 'number' ? t.billAmount : 0;
        const paid = (t.payments || []).reduce(
          (sum, p) => sum + (Number(p.amount) || 0),
          0
        );
        const due = Math.max(0, amount - paid);
        const meta = statusMeta(t);
        const isOccupied = meta.label !== 'Libero';
        return {
          table: t,
          amount,
          paid,
          due,
          isOccupied,
          isFree: !isOccupied,
        };
      }),
    [tables]
  );

  const counts = useMemo(
    () => ({
      tutti: enriched.length,
      liberi: enriched.filter((e) => e.isFree).length,
      occupati: enriched.filter((e) => e.isOccupied).length,
      conto: enriched.filter((e) => e.due > 0).length,
    }),
    [enriched]
  );

  const filtered = useMemo(() => {
    switch (filter) {
      case 'liberi':
        return enriched.filter((e) => e.isFree);
      case 'occupati':
        return enriched.filter((e) => e.isOccupied);
      case 'conto':
        return enriched.filter((e) => e.due > 0);
      default:
        return enriched;
    }
  }, [enriched, filter]);

  const totalOnTables = useMemo(
    () => enriched.reduce((sum, e) => sum + e.amount, 0),
    [enriched]
  );

  // tavolo "live" mostrato nella modale dettagli (stato aggiornato in tempo reale)
  const liveEditing = useMemo(() => {
    if (!isEditTableDetailsOpen) return null;
    return (
      tables.find((t) => t.id === isEditTableDetailsOpen.id) || isEditTableDetailsOpen
    );
  }, [tables, isEditTableDetailsOpen]);

  // ═══════════════════════════════════════════════════════════════
  // ➕ Nuovo tavolo
  // ═══════════════════════════════════════════════════════════════
  const openAddModal = () => {
    setNewTableName(`Tavolo ${tables.length + 1}`);
    setNewTableSeats(4);
    setNewTableInitialAmount('');
    setNewTableNotes('');
    setIsAddTableModalOpen(true);
  };

  const handleSaveNewTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;
    const initialAmt = parseFloat(newTableInitialAmount) || 0;
    addTable({
      name: newTableName.trim(),
      seats: newTableSeats,
      billAmount: initialAmt,
      notes: newTableNotes.trim() || undefined,
    });
    setNewTableName('');
    setNewTableInitialAmount('');
    setNewTableNotes('');
    setIsAddTableModalOpen(false);
  };

  // ═══════════════════════════════════════════════════════════════
  // 💶 Importo del conto
  // ═══════════════════════════════════════════════════════════════
  const handleOpenEditAmount = (table: RestaurantTable) => {
    setEditingTableAmount(table);
    const amt = typeof table.billAmount === 'number' ? table.billAmount : 0;
    setNewAmountInput(amt > 0 ? amt.toFixed(2) : '');
  };

  const handleSaveAmount = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTableAmount) {
      const amt = parseFloat(newAmountInput) || 0;
      updateTableBillAmount(editingTableAmount.id, amt);
      setEditingTableAmount(null);
    }
  };

  /** scorciatoie +/- veloci dentro la modale importo */
  const handleAmountDelta = (delta: number) => {
    const current = parseFloat(newAmountInput) || 0;
    setNewAmountInput(Math.max(0, current + delta).toFixed(2));
  };

  // ═══════════════════════════════════════════════════════════════
  // 💳 Incasso / cassa / stato
  // ═══════════════════════════════════════════════════════════════
  const handleOpenPayment = (table: RestaurantTable) => {
    const amount = typeof table.billAmount === 'number' ? table.billAmount : 0;
    if (amount > 0) setTableStatus(table.id, 'in_conto');
    setPaymentTable(table);
  };

  const handleSendToCassa = (table: RestaurantTable) => {
    setTableStatus(table.id, 'in_conto');
    setSelectedTableForCheckout(table);
    setActiveView('cassa');
  };

  const handleFreeTable = (table: RestaurantTable) => {
    const amount = typeof table.billAmount === 'number' ? table.billAmount : 0;
    if (amount > 0) {
      const ok = window.confirm(
        `Chiudere il tavolo "${table.name}"? L'importo di ${euro(amount)} € verrà azzerato.`
      );
      if (!ok) return;
    }
    freeTable(table.id);
  };

  const handleDeleteTable = (table: RestaurantTable) => {
    const ok = window.confirm(
      `Eliminare definitivamente il tavolo "${table.name}"?`
    );
    if (!ok) return;
    deleteTable(table.id);
  };

  /** stato del tavolo: "libero" lascia l'importo, "occupato" apre il tavolo */
  const handleSetStatus = (table: RestaurantTable, status: TableStatus) => {
    if (status === 'occupato') {
      openTable(
        table.id,
        table.coversCount || table.seats || 2,
        currentUser?.displayName
      );
    } else {
      setTableStatus(table.id, status);
    }
  };

  const handleSaveDetails = () => {
    if (!isEditTableDetailsOpen) return;
    updateTable(isEditTableDetailsOpen.id, {
      name:
        isEditTableDetailsOpen.name.trim() || isEditTableDetailsOpen.name,
      seats: isEditTableDetailsOpen.seats,
      notes: isEditTableDetailsOpen.notes?.trim() || undefined,
    });
    setIsEditTableDetailsOpen(null);
  };

  // ═══════════════════════════════════════════════════════════════
  // 🖥️ UI
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-ink-950 text-mist-100 animate-fadeIn">
      <PaymentModal
        open={!!paymentTable}
        table={paymentTable}
        onClose={() => setPaymentTable(null)}
      />

      <div className="mx-auto max-w-6xl px-3 sm:px-5 pt-4 pb-8 sm:pt-5 md:pb-10 space-y-4 sm:space-y-5">
        {/* ══ Intestazione + riepilogo live ══ */}
        <Card className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-500/25 bg-brand-500/15 text-brand-300">
                <Grid className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold tracking-tight text-mist-100 sm:text-xl">
                  Tavoli
                </h1>
                <p className="mt-0.5 truncate text-xs text-mist-500">
                  {currentUser
                    ? `Turno di ${currentUser.displayName} · gestione tavoli e conti`
                    : 'Gestione tavoli e conti del servizio'}
                </p>
              </div>
            </div>

            {/* Azione primaria (desktop) */}
            <Btn
              variant="primary"
              onClick={openAddModal}
              className="hidden shrink-0 md:inline-flex"
            >
              <Plus className="w-4 h-4" />
              <span>Nuovo Tavolo</span>
            </Btn>
          </div>

          {/* KPI strip: cliccabile = filtri rapidi */}
          <div className="-mx-1 mt-4 flex gap-2.5 overflow-x-auto scrollbar-none px-1 pb-1">
            <div
              className={`min-w-[9.5rem] flex-1 rounded-2xl ${
                filter === 'tutti' ? 'ring-2 ring-brand-500/60' : ''
              }`}
            >
              <Stat
                label="Tavoli"
                value={counts.tutti}
                tone="neutral"
                icon={<Grid className="w-3.5 h-3.5" />}
                onClick={() => setFilter('tutti')}
              />
            </div>
            <div
              className={`min-w-[9.5rem] flex-1 rounded-2xl ${
                filter === 'occupati' ? 'ring-2 ring-brand-500/60' : ''
              }`}
            >
              <Stat
                label="Occupati"
                value={counts.occupati}
                tone="brand"
                icon={<Users className="w-3.5 h-3.5" />}
                onClick={() => setFilter('occupati')}
              />
            </div>
            <div
              className={`min-w-[9.5rem] flex-1 rounded-2xl ${
                filter === 'liberi' ? 'ring-2 ring-brand-500/60' : ''
              }`}
            >
              <Stat
                label="Liberi"
                value={counts.liberi}
                tone="mint"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => setFilter('liberi')}
              />
            </div>
            <div className="min-w-[12rem] flex-1">
              <Stat
                label="Importo sui tavoli"
                value={<Amount value={totalOnTables} size="lg" tone="amber" />}
                tone="amber"
                icon={<Wallet className="w-3.5 h-3.5" />}
              />
            </div>
          </div>
        </Card>

        {/* ══ Filtri ══ */}
        <div className="-mx-1 flex gap-2 overflow-x-auto scrollbar-none px-1">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold transition ${
                  active
                    ? 'border-brand-500 bg-brand-500 text-ink-950'
                    : 'border-ink-700 bg-ink-850 text-mist-400 hover:border-ink-600 hover:text-mist-100'
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tnum ${
                    active
                      ? 'bg-ink-950/20 text-ink-950'
                      : 'bg-ink-800 text-mist-300'
                  }`}
                >
                  {counts[f.id]}
                </span>
              </button>
            );
          })}
        </div>

        {/* ══ Griglia tavoli ══ */}
        {filtered.length === 0 ? (
          <Card>
            {tables.length === 0 ? (
              <EmptyState
                icon={<Grid className="w-6 h-6" />}
                title="Nessun tavolo"
                description="Crea il primo tavolo del servizio: potrai impostare coperti, note e importo da incassare in qualsiasi momento."
                action={
                  <Btn variant="primary" onClick={openAddModal}>
                    <Plus className="w-4 h-4" />
                    <span>Nuovo Tavolo</span>
                  </Btn>
                }
              />
            ) : (
              <EmptyState
                icon={<Grid className="w-6 h-6" />}
                title="Nessun tavolo con questo filtro"
                description="Non ci sono tavoli che corrispondono alla selezione attiva."
                action={
                  <Btn variant="soft" onClick={() => setFilter('tutti')}>
                    Mostra tutti
                  </Btn>
                }
              />
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {filtered.map(({ table: t, amount, paid, due }) => {
              const meta = statusMeta(t);
              const covers = t.coversCount || t.seats || 0;
              return (
                <div
                  key={t.id}
                  className="relative flex flex-col overflow-hidden rounded-2xl border border-ink-700 bg-ink-850 transition hover:border-ink-600 focus-within:border-brand-500/50"
                >
                  {/* Barra di stato laterale */}
                  <span
                    className={`absolute inset-y-0 left-0 w-1 ${meta.stripe}`}
                    aria-hidden="true"
                  />

                  {/* Corpo della card */}
                  <div className="flex flex-1 flex-col gap-3 p-4 pl-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold tracking-tight text-mist-100">
                          {t.name}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-mist-500">
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {covers} {covers === 1 ? 'coperto' : 'coperti'}
                          </span>
                          {t.openedAt && <span>Aperto alle {t.openedAt}</span>}
                          {t.waiterName && (
                            <span className="truncate">Servito da {t.waiterName}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        {paid > 0 && <Badge tone="mint">Parziale</Badge>}
                      </div>
                    </div>

                    {t.notes && (
                      <p className="line-clamp-2 rounded-lg border border-ink-700 bg-ink-900/70 px-2.5 py-1.5 text-[11px] leading-snug text-mist-400">
                        {t.notes}
                      </p>
                    )}

                    {/* Importo da incassare */}
                    <div className="mt-auto rounded-xl border border-ink-700 bg-ink-900/70 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="section-title">Da incassare</span>
                        <button
                          type="button"
                          title="Modifica importo"
                          aria-label="Modifica importo"
                          onClick={() => handleOpenEditAmount(t)}
                          className="relative z-10 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-ink-700 bg-ink-800 text-mist-400 transition hover:border-brand-500/40 hover:text-brand-300 active:scale-95"
                        >
                          <PenLine className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                        <Amount
                          value={due}
                          size="lg"
                          tone={
                            due > 0 ? 'amber' : amount > 0 ? 'mint' : 'default'
                          }
                        />
                        {paid > 0 ? (
                          <span className="text-[10px] tnum text-mist-500">
                            Totale {euro(amount)} € · incassato {euro(paid)} €
                          </span>
                        ) : amount === 0 ? (
                          <span className="text-[10px] text-mist-500">
                            Nessun importo
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Sovrapposizione cliccabile: tocca la card per incassare */}
                  <button
                    type="button"
                    onClick={() => handleOpenPayment(t)}
                    title={`Incassa ${t.name}`}
                    aria-label={`Incassa il tavolo ${t.name}`}
                    className="absolute inset-0 rounded-2xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
                  />

                  {/* Azioni rapide (sopra la sovrapposizione) */}
                  <div className="relative z-10 flex items-center gap-1.5 border-t border-ink-700 bg-ink-900/40 px-3 py-2">
                    <IconAction
                      title="Incassa"
                      tone="brand"
                      onClick={() => handleOpenPayment(t)}
                    >
                      <CreditCard className="w-4 h-4" />
                    </IconAction>
                    <IconAction
                      title="Modifica importo"
                      onClick={() => handleOpenEditAmount(t)}
                    >
                      <PenLine className="w-4 h-4" />
                    </IconAction>
                    <IconAction
                      title="Modifica dettagli"
                      onClick={() => setIsEditTableDetailsOpen(t)}
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                    </IconAction>
                    <IconAction
                      title="Vai alla cassa"
                      onClick={() => handleSendToCassa(t)}
                    >
                      <Store className="w-4 h-4" />
                    </IconAction>
                    <IconAction
                      title="Libera / chiudi il tavolo"
                      onClick={() => handleFreeTable(t)}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </IconAction>
                    <IconAction
                      title="Elimina tavolo"
                      tone="rose"
                      className="ml-auto"
                      onClick={() => handleDeleteTable(t)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </IconAction>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Spazio per l'azione primaria mobile (barra + safe area) */}
        <div
          aria-hidden="true"
          className="md:hidden safe-b"
          style={{ height: 'calc(8.5rem + var(--sea-safe-b))' }}
        />
      </div>

      {/* ══ Azione primaria mobile (sopra la barra di navigazione) ══ */}
      <div
        className="md:hidden fixed inset-x-0 z-30"
        style={{
          bottom: 'calc(4rem + var(--sea-safe-b))',
          paddingLeft: 'calc(0.75rem + var(--sea-safe-l))',
          paddingRight: 'calc(0.75rem + var(--sea-safe-r))',
        }}
      >
        {/* sfumatura per staccare il pulsante dal contenuto che scorre */}
        <div className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-ink-950 to-transparent" />
        <Btn variant="primary" size="lg" full onClick={openAddModal}>
          <Plus className="w-5 h-5" />
          <span>Nuovo Tavolo</span>
        </Btn>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MODALE: NUOVO TAVOLO
          ═══════════════════════════════════════════════════════════════ */}
      <Modal
        open={isAddTableModalOpen}
        onClose={() => setIsAddTableModalOpen(false)}
        size="sm"
        title="Nuovo tavolo"
        subtitle="Crea il tavolo: importo e note restano sempre modificabili."
      >
        <form onSubmit={handleSaveNewTable} className="space-y-4">
          <Field label="Nome del tavolo *">
            <Input
              type="text"
              required
              autoFocus
              placeholder="Es. Tavolo 9, Giardino 1, Terrazza..."
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Posti / coperti">
              <Input
                type="number"
                min="1"
                value={newTableSeats}
                onChange={(e) => setNewTableSeats(parseInt(e.target.value) || 2)}
              />
            </Field>
            <Field label="Importo iniziale (€)">
              <Input
                type="number"
                step="0.5"
                min="0"
                inputMode="decimal"
                placeholder="0.00"
                value={newTableInitialAmount}
                onChange={(e) => setNewTableInitialAmount(e.target.value)}
                className="font-mono font-bold tnum text-brand-300"
              />
            </Field>
          </div>

          <Field label="Note (facoltative)">
            <Input
              type="text"
              placeholder="Es. Finestra, dehors..."
              value={newTableNotes}
              onChange={(e) => setNewTableNotes(e.target.value)}
            />
          </Field>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Btn
              variant="ghost"
              type="button"
              onClick={() => setIsAddTableModalOpen(false)}
            >
              Annulla
            </Btn>
            <Btn variant="primary" type="submit">
              Crea tavolo
            </Btn>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          MODALE: MODIFICA IMPORTO DEL CONTO
          ═══════════════════════════════════════════════════════════════ */}
      <Modal
        open={!!editingTableAmount}
        onClose={() => setEditingTableAmount(null)}
        size="sm"
        title={`Importo conto — ${editingTableAmount?.name ?? ''}`}
        subtitle="Indica quanto deve pagare il tavolo (€)."
      >
        <form onSubmit={handleSaveAmount} className="space-y-4">
          <div className="relative">
            <Input
              type="number"
              step="0.5"
              min="0"
              inputMode="decimal"
              autoFocus
              placeholder="0.00"
              value={newAmountInput}
              onChange={(e) => setNewAmountInput(e.target.value)}
              className="!pl-4 !pr-12 !py-4 !text-3xl font-mono font-bold tnum text-brand-300"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-mist-500">
              €
            </span>
          </div>

          {/* Scorciatoie +/- */}
          <div className="flex items-center gap-2">
            {[-5, 5, 10].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => handleAmountDelta(delta)}
                className={`flex-1 rounded-xl border border-ink-700 bg-ink-800 py-2 text-xs font-bold tnum transition hover:border-brand-500/40 hover:text-brand-300 active:scale-95 ${
                  delta < 0 ? 'text-rose-400' : 'text-mint-400'
                }`}
              >
                {delta > 0 ? `+${delta}` : delta} €
              </button>
            ))}
          </div>

          {/* Importi rapidi */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[10, 20, 35, 50, 75, 100].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setNewAmountInput(val.toFixed(2))}
                className="rounded-xl border border-ink-700 bg-ink-800 py-2 text-xs font-bold tnum text-mist-300 transition hover:border-brand-500/40 hover:text-brand-300 active:scale-95"
              >
                {val} €
              </button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Btn
              variant="ghost"
              type="button"
              onClick={() => setEditingTableAmount(null)}
            >
              Annulla
            </Btn>
            <Btn variant="primary" type="submit">
              Salva importo
            </Btn>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          MODALE: MODIFICA DETTAGLI TAVOLO
          ═══════════════════════════════════════════════════════════════ */}
      {isEditTableDetailsOpen && (
        <Modal
          open
          onClose={() => setIsEditTableDetailsOpen(null)}
          size="sm"
          title="Modifica tavolo"
          subtitle={isEditTableDetailsOpen.name}
          footer={
            <>
              <Btn
                variant="danger"
                size="sm"
                className="mr-auto"
                onClick={() => handleDeleteTable(isEditTableDetailsOpen)}
              >
                <Trash2 className="w-3.5 h-3.5" /> Elimina
              </Btn>
              <Btn
                variant="ghost"
                size="sm"
                onClick={() => setIsEditTableDetailsOpen(null)}
              >
                Annulla
              </Btn>
              <Btn variant="primary" size="sm" onClick={handleSaveDetails}>
                Salva
              </Btn>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Nome del tavolo">
              <Input
                type="text"
                value={isEditTableDetailsOpen.name}
                onChange={(e) =>
                  setIsEditTableDetailsOpen({
                    ...isEditTableDetailsOpen,
                    name: e.target.value,
                  })
                }
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Posti a sedere">
                <Input
                  type="number"
                  min="1"
                  value={isEditTableDetailsOpen.seats}
                  onChange={(e) =>
                    setIsEditTableDetailsOpen({
                      ...isEditTableDetailsOpen,
                      seats: parseInt(e.target.value) || 2,
                    })
                  }
                />
              </Field>
              <Field label="Note">
                <Input
                  type="text"
                  placeholder="Es. Finestra"
                  value={isEditTableDetailsOpen.notes || ''}
                  onChange={(e) =>
                    setIsEditTableDetailsOpen({
                      ...isEditTableDetailsOpen,
                      notes: e.target.value,
                    })
                  }
                />
              </Field>
            </div>

            {/* Stato del tavolo */}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-mist-500">
                  Stato
                </span>
                {liveEditing && (
                  <Badge tone={statusMeta(liveEditing).tone}>
                    {statusMeta(liveEditing).label}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleSetStatus(isEditTableDetailsOpen, 'libero')
                  }
                  className={statusBtnClass(
                    liveEditing?.status === 'libero'
                  )}
                >
                  Libero
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSetStatus(isEditTableDetailsOpen, 'occupato')
                  }
                  className={statusBtnClass(
                    liveEditing?.status === 'occupato' ||
                      liveEditing?.status === 'in_conto'
                  )}
                >
                  Occupato
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-mist-500">
                Segnando il tavolo come occupato vengono registrati i coperti e
                chi lo sta servendo.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
