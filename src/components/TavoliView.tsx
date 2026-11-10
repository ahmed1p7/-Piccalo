import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentModal } from './PaymentModal';
import {
  Check,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Edit2,
  Grid,
  Minus,
  PenLine,
  Plus,
  Trash2,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import { RestaurantTable, TableStatus } from '../types';
import { Amount, Badge, Btn, Card, Field, Input, Modal, euro } from './ui';

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

  // Modals state
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [editingTableAmount, setEditingTableAmount] = useState<RestaurantTable | null>(null);
  const [newAmountInput, setNewAmountInput] = useState<string>('');
  const [isEditTableDetailsOpen, setIsEditTableDetailsOpen] = useState<RestaurantTable | null>(null);

  // New Table Form
  const [newTableName, setNewTableName] = useState('');
  const [newTableSeats, setNewTableSeats] = useState<number>(4);
  const [newTableInitialAmount, setNewTableInitialAmount] = useState<string>('');
  const [newTableNotes, setNewTableNotes] = useState('');

  // Handle Add Table
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

  // Handle Edit Amount
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

  // Quick Delta Adjustment (+5, +10, -5)
  const handleQuickDelta = (tableId: string, currentAmount: number, delta: number) => {
    const next = Math.max(0, currentAmount + delta);
    updateTableBillAmount(tableId, next);
  };

  // Forward to Cassa
  const handleSendToCassa = (table: RestaurantTable) => {
    setTableStatus(table.id, 'in_conto');
    setSelectedTableForCheckout(table);
    setActiveView('cassa');
  };

  // 💳 Incasso diretto dal tavolo (divide il conto / pagamenti multipli)
  const [paymentTable, setPaymentTable] = useState<RestaurantTable | null>(null);
  const openPayment = (table: RestaurantTable) => {
    setTableStatus(table.id, 'in_conto');
    setPaymentTable(table);
  };

  return (
    <div className="min-h-screen bg-ink-950 text-mist-100 animate-fadeIn">
      <PaymentModal
        open={!!paymentTable}
        table={paymentTable}
        onClose={() => setPaymentTable(null)}
      />
      <div className="mx-auto max-w-6xl px-3 sm:px-5 py-5 space-y-5">
      {/* Header */}
<<<<<<< HEAD
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
=======
      <Card className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand-500/25 bg-brand-500/15 text-brand-300">
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
            <Grid className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-lg sm:text-xl font-bold tracking-tight text-mist-100">
              <span>Gestione Tavoli &amp; Conti</span>
<<<<<<< HEAD
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                {tables.length} Tavoli
              </span>
            </h1>
            <p className="text-xs text-neutral-400">
=======
              <Badge tone="brand">{tables.length} Tavoli</Badge>
            </h1>
            <p className="mt-0.5 text-xs text-mist-500">
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
              Aggiungi tavoli, scrivi l&apos;importo da pagare e modificalo liberamente in qualsiasi momento.
            </p>
          </div>
        </div>

        <Btn
          variant="primary"
          onClick={() => {
            setNewTableName(`Tavolo ${tables.length + 1}`);
            setNewTableInitialAmount('');
            setIsAddTableModalOpen(true);
          }}
<<<<<<< HEAD
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-neutral-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
=======
          className="w-full sm:w-auto"
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
        >
          <Plus className="w-4 h-4" />
          <span>Aggiungi Nuovo Tavolo</span>
        </Btn>
      </Card>

      {/* Grid of Tables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tables.map((table) => {
          const currentAmount = typeof table.billAmount === 'number' ? table.billAmount : 0;
          const isFree = table.status === 'libero' && currentAmount === 0;
          const isInConto = table.status === 'in_conto';
          const hasAmount = currentAmount > 0;
          // 💶 incassato finora sul tavolo (pagamenti multipli)
          const paidSoFar = (table.payments || []).reduce(
            (sum, p) => sum + (Number(p.amount) || 0),
            0
          );
          const dueAmount = Math.max(0, currentAmount - paidSoFar);

          return (
            <div
              key={table.id}
              className={`flex flex-col justify-between rounded-2xl border p-4 transition-all min-h-[220px] ${
                isInConto
                  ? 'border-amber-400/50 bg-amber-600/10'
                  : hasAmount
<<<<<<< HEAD
                  ? 'bg-amber-950/20 border-amber-500/60 shadow-cyan-950/20'
                  : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
=======
                  ? 'border-brand-500/40 bg-brand-500/10'
                  : 'border-ink-700 bg-ink-850 hover:border-ink-600'
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
              }`}
            >
              <div>
                {/* Top Table Bar */}
<<<<<<< HEAD
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <h3 className="font-black text-white text-lg tracking-tight">
=======
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-400 animate-pulse" />
                    <h3 className="text-base font-bold tracking-tight text-mist-100 truncate">
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                      {table.name}
                    </h3>
                  </div>

<<<<<<< HEAD
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                        isInConto
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : hasAmount
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      }`}
=======
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {paidSoFar > 0 && (
                      <Badge tone="mint">
                        Parziale {euro(paidSoFar)} €
                      </Badge>
                    )}
                    <Badge
                      tone={isInConto ? 'amber' : hasAmount ? 'brand' : 'neutral'}
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                    >
                      {isInConto ? 'In Conto' : hasAmount ? 'Occupato' : 'Libero'}
                    </Badge>

                    <button
                      onClick={() => setIsEditTableDetailsOpen(table)}
                      title="Modifica nome o elimina tavolo"
<<<<<<< HEAD
                      className="p-1 rounded-lg text-neutral-500 hover:text-white transition-colors"
=======
                      aria-label="Modifica nome o elimina tavolo"
                      className="rounded-lg p-1 text-mist-500 transition-colors hover:text-mist-100"
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sub info (Covers & Notes) */}
<<<<<<< HEAD
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-neutral-500" />
=======
                <div className="mb-3 flex items-center justify-between gap-2 text-xs text-mist-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-mist-500" />
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                    {table.coversCount || table.seats} Coperti
                  </span>
                  {table.openedAt && <span>Aperto alle {table.openedAt}</span>}
                </div>

                {table.notes && (
<<<<<<< HEAD
                  <p className="text-[11px] text-neutral-400 bg-neutral-950/60 px-2.5 py-1 rounded-xl mb-3 border border-neutral-800/80 truncate">
=======
                  <p className="mb-3 truncate rounded-xl border border-ink-700 bg-ink-900/60 px-2.5 py-1 text-[11px] text-mist-500">
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                    {table.notes}
                  </p>
                )}

                {/* Direct Bill Amount Display & Edit */}
<<<<<<< HEAD
                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
=======
                <div className="space-y-2 rounded-2xl border border-ink-700 bg-ink-900 p-3.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-mist-500">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                      Importo da Pagare:
                    </span>
                    <button
                      onClick={() => handleOpenEditAmount(table)}
<<<<<<< HEAD
                      className="text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
=======
                      className="flex items-center gap-1 text-xs font-bold text-brand-300 hover:text-brand-400"
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                    >
                      <PenLine className="w-3 h-3" /> Modifica
                    </button>
                  </div>

<<<<<<< HEAD
                  <div className="flex items-baseline justify-between">
                    <div className="text-3xl font-black text-amber-400 font-mono">
                      {currentAmount.toFixed(2)}{' '}
                      <span className="text-lg text-neutral-400 font-normal">€</span>
                    </div>
=======
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Amount value={currentAmount} size="lg" tone="amber" />
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29

                    {/* Quick increment / decrement buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleQuickDelta(table.id, currentAmount, -5)}
                        title="-5 €"
<<<<<<< HEAD
                        className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold border border-neutral-700 active:scale-95"
=======
                        className="rounded-lg border border-ink-600 bg-ink-800 px-2 py-1 text-xs font-bold tnum text-mist-300 transition hover:bg-ink-700 active:scale-95"
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                      >
                        -5€
                      </button>
                      <button
                        onClick={() => handleQuickDelta(table.id, currentAmount, 5)}
                        title="+5 €"
<<<<<<< HEAD
                        className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-300 text-xs font-bold border border-neutral-700 active:scale-95"
=======
                        className="rounded-lg border border-ink-600 bg-ink-800 px-2 py-1 text-xs font-bold tnum text-mint-400 transition hover:bg-ink-700 active:scale-95"
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                      >
                        +5€
                      </button>
                      <button
                        onClick={() => handleQuickDelta(table.id, currentAmount, 10)}
                        title="+10 €"
<<<<<<< HEAD
                        className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-300 text-xs font-bold border border-neutral-700 active:scale-95"
=======
                        className="rounded-lg border border-ink-600 bg-ink-800 px-2 py-1 text-xs font-bold tnum text-mint-400 transition hover:bg-ink-700 active:scale-95"
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                      >
                        +10€
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions: Incassa & Libera */}
<<<<<<< HEAD
              <div className="pt-3 mt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
=======
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink-700 pt-3">
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                {hasAmount ? (
                  <>
                    <button
                      onClick={() => freeTable(table.id)}
<<<<<<< HEAD
                      className="text-xs text-neutral-400 hover:text-rose-400 font-semibold px-2 py-1"
                    >
                      Azzera
                    </button>
                    <button
                      onClick={() => handleSendToCassa(table)}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-black text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
=======
                      className="px-2 py-1 text-xs font-semibold text-mist-500 transition-colors hover:text-rose-400"
                    >
                      Azzera
                    </button>
                    <Btn
                      variant="primary"
                      size="sm"
                      onClick={() => openPayment(table)}
                      className="flex-1"
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>
                        Incassa ({euro(dueAmount)} €)
                      </span>
                    </Btn>
                  </>
                ) : (
                  <Btn
                    variant="soft"
                    size="sm"
                    full
                    onClick={() => handleOpenEditAmount(table)}
<<<<<<< HEAD
                    className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
=======
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Imposta Conto del Tavolo</span>
                  </Btn>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: AGGIUNGI NUOVO TAVOLO */}
<<<<<<< HEAD
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white text-base">Aggiungi Nuovo Tavolo</h3>
              <button
                onClick={() => setIsAddTableModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewTable} className="space-y-3.5 text-xs">
              <div>
                <label className="text-neutral-300 font-semibold block mb-1">
                  Nome del Tavolo *:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Es. Tavolo 9, Giardino 1, Terrazza..."
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-neutral-300 font-semibold block mb-1">
                  Importo Iniziale da Pagare (€):
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0.00 € (modificabile sempre)"
                  value={newTableInitialAmount}
                  onChange={(e) => setNewTableInitialAmount(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold text-base focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-300 font-semibold block mb-1">Posti / Coperti:</label>
                  <input
                    type="number"
                    min="1"
                    value={newTableSeats}
                    onChange={(e) => setNewTableSeats(parseInt(e.target.value) || 2)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-neutral-300 font-semibold block mb-1">Note (facoltative):</label>
                  <input
                    type="text"
                    placeholder="Es. Finestra..."
                    value={newTableNotes}
                    onChange={(e) => setNewTableNotes(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTableModalOpen(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 text-neutral-950 font-bold transition-all shadow-md shadow-amber-500/20"
                >
                  Crea Tavolo
                </button>
              </div>
            </form>
=======
      <Modal
        open={isAddTableModalOpen}
        onClose={() => setIsAddTableModalOpen(false)}
        size="sm"
        title="Aggiungi Nuovo Tavolo"
        subtitle="Crea il tavolo e imposta subito l'importo da pagare."
      >
        <form onSubmit={handleSaveNewTable} className="space-y-4">
          <Field label="Nome del Tavolo *:">
            <Input
              type="text"
              required
              placeholder="Es. Tavolo 9, Giardino 1, Terrazza..."
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
            />
          </Field>

          <Field label="Importo Iniziale da Pagare (€):">
            <Input
              type="number"
              step="0.5"
              min="0"
              placeholder="0.00 € (modificabile sempre)"
              value={newTableInitialAmount}
              onChange={(e) => setNewTableInitialAmount(e.target.value)}
              className="font-mono font-bold tnum text-amber-400"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Posti / Coperti:">
              <Input
                type="number"
                min="1"
                value={newTableSeats}
                onChange={(e) => setNewTableSeats(parseInt(e.target.value) || 2)}
              />
            </Field>
            <Field label="Note (facoltative):">
              <Input
                type="text"
                placeholder="Es. Finestra..."
                value={newTableNotes}
                onChange={(e) => setNewTableNotes(e.target.value)}
              />
            </Field>
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Btn
              variant="ghost"
              type="button"
              onClick={() => setIsAddTableModalOpen(false)}
            >
              Annulla
            </Btn>
            <Btn variant="primary" type="submit">
              Crea Tavolo
            </Btn>
          </div>
        </form>
      </Modal>

      {/* MODAL: MODIFICA IMPORTO CONTO TAVOLO (فيني عدل متى ما بدي) */}
<<<<<<< HEAD
      {editingTableAmount && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white text-base">
                Modifica Conto: {editingTableAmount.name}
              </h3>
              <button
                onClick={() => setEditingTableAmount(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Imposta il totale che i clienti di questo tavolo devono pagare (€):
            </p>

            <form onSubmit={handleSaveAmount} className="space-y-4">
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  autoFocus
                  placeholder="0.00"
                  value={newAmountInput}
                  onChange={(e) => setNewAmountInput(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-2xl px-4 py-3.5 text-3xl font-black text-amber-400 font-mono focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-4 top-4 text-xl font-bold text-neutral-400">€</span>
              </div>

              {/* Quick shortcut presets */}
              <div className="grid grid-cols-4 gap-1.5">
                {[10, 20, 35, 50, 75, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setNewAmountInput(val.toString())}
                    className="py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 hover:text-white"
                  >
                    {val} €
                  </button>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTableAmount(null)}
                  className="px-4 py-2 text-xs text-neutral-400 hover:text-white font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 text-neutral-950 font-bold text-xs shadow-md shadow-amber-500/20"
                >
                  Salva Importo
                </button>
              </div>
            </form>
=======
      <Modal
        open={!!editingTableAmount}
        onClose={() => setEditingTableAmount(null)}
        size="sm"
        title={`Modifica Conto: ${editingTableAmount?.name ?? ''}`}
        subtitle="Imposta il totale che i clienti di questo tavolo devono pagare (€):"
      >
        <form onSubmit={handleSaveAmount} className="space-y-4">
          <div className="relative">
            <Input
              type="number"
              step="0.5"
              min="0"
              autoFocus
              placeholder="0.00"
              value={newAmountInput}
              onChange={(e) => setNewAmountInput(e.target.value)}
              className="!pl-4 !pr-12 !py-3.5 !text-3xl font-mono font-bold tnum text-amber-400"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-mist-500">
              €
            </span>
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
          </div>

          {/* Quick shortcut presets */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {[10, 20, 35, 50, 75, 100].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setNewAmountInput(val.toString())}
                className="w-full rounded-lg border border-ink-600 bg-ink-800 px-2 py-1.5 text-xs font-bold tnum text-mist-300 transition hover:border-brand-500/40 hover:text-brand-300"
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
              Salva Importo
            </Btn>
          </div>
        </form>
      </Modal>

      {/* MODAL: MODIFICA NOME O ELIMINA TAVOLO */}
      {isEditTableDetailsOpen && (
<<<<<<< HEAD
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white text-base">Modifica Dettagli Tavolo</h3>
              <button
                onClick={() => setIsEditTableDetailsOpen(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-300 font-semibold block mb-1">Nome Tavolo:</label>
                <input
                  type="text"
                  value={isEditTableDetailsOpen.name}
                  onChange={(e) =>
                    setIsEditTableDetailsOpen({ ...isEditTableDetailsOpen, name: e.target.value })
                  }
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-neutral-300 font-semibold block mb-1">Posti a Sedere:</label>
                <input
                  type="number"
                  min="1"
                  value={isEditTableDetailsOpen.seats}
                  onChange={(e) =>
                    setIsEditTableDetailsOpen({
                      ...isEditTableDetailsOpen,
                      seats: parseInt(e.target.value) || 2,
                    })
                  }
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-neutral-300 font-semibold block mb-1">Note:</label>
                <input
                  type="text"
                  value={isEditTableDetailsOpen.notes || ''}
                  onChange={(e) =>
                    setIsEditTableDetailsOpen({ ...isEditTableDetailsOpen, notes: e.target.value })
                  }
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
              <button
                type="button"
=======
        <Modal
          open={!!isEditTableDetailsOpen}
          onClose={() => setIsEditTableDetailsOpen(null)}
          size="sm"
          title="Modifica Dettagli Tavolo"
          footer={
            <>
              <Btn
                variant="danger"
                size="sm"
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                onClick={() => {
                  if (confirm(`Eliminare definitivamente ${isEditTableDetailsOpen.name}?`)) {
                    deleteTable(isEditTableDetailsOpen.id);
                    setIsEditTableDetailsOpen(null);
                  }
                }}
                className="mr-auto"
              >
                <Trash2 className="w-3.5 h-3.5" /> Elimina
              </Btn>

<<<<<<< HEAD
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditTableDetailsOpen(null)}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateTable(isEditTableDetailsOpen.id, {
                      name: isEditTableDetailsOpen.name,
                      seats: isEditTableDetailsOpen.seats,
                      notes: isEditTableDetailsOpen.notes,
                    });
                    setIsEditTableDetailsOpen(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs"
                >
                  Salva
                </button>
              </div>
            </div>
=======
              <Btn
                variant="ghost"
                size="sm"
                onClick={() => setIsEditTableDetailsOpen(null)}
              >
                Annulla
              </Btn>
              <Btn
                variant="primary"
                size="sm"
                onClick={() => {
                  updateTable(isEditTableDetailsOpen.id, {
                    name: isEditTableDetailsOpen.name,
                    seats: isEditTableDetailsOpen.seats,
                    notes: isEditTableDetailsOpen.notes,
                  });
                  setIsEditTableDetailsOpen(null);
                }}
              >
                Salva
              </Btn>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Nome Tavolo:">
              <Input
                type="text"
                value={isEditTableDetailsOpen.name}
                onChange={(e) =>
                  setIsEditTableDetailsOpen({ ...isEditTableDetailsOpen, name: e.target.value })
                }
              />
            </Field>

            <Field label="Posti a Sedere:">
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

            <Field label="Note:">
              <Input
                type="text"
                value={isEditTableDetailsOpen.notes || ''}
                onChange={(e) =>
                  setIsEditTableDetailsOpen({ ...isEditTableDetailsOpen, notes: e.target.value })
                }
              />
            </Field>
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
          </div>
        </Modal>
      )}
      </div>
    </div>
  );
};
