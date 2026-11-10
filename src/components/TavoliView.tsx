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
      <Card className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand-500/25 bg-brand-500/15 text-brand-300">
            <Grid className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-lg sm:text-xl font-bold tracking-tight text-mist-100">
              <span>Gestione Tavoli &amp; Conti</span>
              <Badge tone="brand">{tables.length} Tavoli</Badge>
            </h1>
            <p className="mt-0.5 text-xs text-mist-500">
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
          className="w-full sm:w-auto"
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
                  ? 'border-brand-500/40 bg-brand-500/10'
                  : 'border-ink-700 bg-ink-850 hover:border-ink-600'
              }`}
            >
              <div>
                {/* Top Table Bar */}
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-400 animate-pulse" />
                    <h3 className="text-base font-bold tracking-tight text-mist-100 truncate">
                      {table.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {paidSoFar > 0 && (
                      <Badge tone="mint">
                        Parziale {euro(paidSoFar)} €
                      </Badge>
                    )}
                    <Badge
                      tone={isInConto ? 'amber' : hasAmount ? 'brand' : 'neutral'}
                    >
                      {isInConto ? 'In Conto' : hasAmount ? 'Occupato' : 'Libero'}
                    </Badge>

                    <button
                      onClick={() => setIsEditTableDetailsOpen(table)}
                      title="Modifica nome o elimina tavolo"
                      aria-label="Modifica nome o elimina tavolo"
                      className="rounded-lg p-1 text-mist-500 transition-colors hover:text-mist-100"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sub info (Covers & Notes) */}
                <div className="mb-3 flex items-center justify-between gap-2 text-xs text-mist-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-mist-500" />
                    {table.coversCount || table.seats} Coperti
                  </span>
                  {table.openedAt && <span>Aperto alle {table.openedAt}</span>}
                </div>

                {table.notes && (
                  <p className="mb-3 truncate rounded-xl border border-ink-700 bg-ink-900/60 px-2.5 py-1 text-[11px] text-mist-500">
                    {table.notes}
                  </p>
                )}

                {/* Direct Bill Amount Display & Edit */}
                <div className="space-y-2 rounded-2xl border border-ink-700 bg-ink-900 p-3.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-mist-500">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">
                      Importo da Pagare:
                    </span>
                    <button
                      onClick={() => handleOpenEditAmount(table)}
                      className="flex items-center gap-1 text-xs font-bold text-brand-300 hover:text-brand-400"
                    >
                      <PenLine className="w-3 h-3" /> Modifica
                    </button>
                  </div>

                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Amount value={currentAmount} size="lg" tone="amber" />

                    {/* Quick increment / decrement buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleQuickDelta(table.id, currentAmount, -5)}
                        title="-5 €"
                        className="rounded-lg border border-ink-600 bg-ink-800 px-2 py-1 text-xs font-bold tnum text-mist-300 transition hover:bg-ink-700 active:scale-95"
                      >
                        -5€
                      </button>
                      <button
                        onClick={() => handleQuickDelta(table.id, currentAmount, 5)}
                        title="+5 €"
                        className="rounded-lg border border-ink-600 bg-ink-800 px-2 py-1 text-xs font-bold tnum text-mint-400 transition hover:bg-ink-700 active:scale-95"
                      >
                        +5€
                      </button>
                      <button
                        onClick={() => handleQuickDelta(table.id, currentAmount, 10)}
                        title="+10 €"
                        className="rounded-lg border border-ink-600 bg-ink-800 px-2 py-1 text-xs font-bold tnum text-mint-400 transition hover:bg-ink-700 active:scale-95"
                      >
                        +10€
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions: Incassa & Libera */}
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink-700 pt-3">
                {hasAmount ? (
                  <>
                    <button
                      onClick={() => freeTable(table.id)}
                      className="px-2 py-1 text-xs font-semibold text-mist-500 transition-colors hover:text-rose-400"
                    >
                      Azzera
                    </button>
                    <Btn
                      variant="primary"
                      size="sm"
                      onClick={() => openPayment(table)}
                      className="flex-1"
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
          </div>
        </Modal>
      )}
      </div>
    </div>
  );
};
