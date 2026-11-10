import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
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

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
            <Grid className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>Gestione Tavoli &amp; Conti</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                {tables.length} Tavoli
              </span>
            </h1>
            <p className="text-xs text-neutral-400">
              Aggiungi tavoli, scrivi l&apos;importo da pagare e modificalo liberamente in qualsiasi momento.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setNewTableName(`Tavolo ${tables.length + 1}`);
            setNewTableInitialAmount('');
            setIsAddTableModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-neutral-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Aggiungi Nuovo Tavolo</span>
        </button>
      </div>

      {/* Grid of Tables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tables.map((table) => {
          const currentAmount = typeof table.billAmount === 'number' ? table.billAmount : 0;
          const isFree = table.status === 'libero' && currentAmount === 0;
          const isInConto = table.status === 'in_conto';
          const hasAmount = currentAmount > 0;

          return (
            <div
              key={table.id}
              className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between min-h-[220px] shadow-lg ${
                isInConto
                  ? 'bg-amber-950/20 border-amber-500/70 shadow-amber-950/20'
                  : hasAmount
                  ? 'bg-amber-950/20 border-amber-500/60 shadow-cyan-950/20'
                  : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div>
                {/* Top Table Bar */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <h3 className="font-black text-white text-lg tracking-tight">
                      {table.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                        isInConto
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : hasAmount
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      }`}
                    >
                      {isInConto ? 'In Conto' : hasAmount ? 'Occupato' : 'Libero'}
                    </span>

                    <button
                      onClick={() => setIsEditTableDetailsOpen(table)}
                      title="Modifica nome o elimina tavolo"
                      className="p-1 rounded-lg text-neutral-500 hover:text-white transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sub info (Covers & Notes) */}
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-neutral-500" />
                    {table.coversCount || table.seats} Coperti
                  </span>
                  {table.openedAt && <span>Aperto alle {table.openedAt}</span>}
                </div>

                {table.notes && (
                  <p className="text-[11px] text-neutral-400 bg-neutral-950/60 px-2.5 py-1 rounded-xl mb-3 border border-neutral-800/80 truncate">
                    {table.notes}
                  </p>
                )}

                {/* Direct Bill Amount Display & Edit */}
                <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      Importo da Pagare:
                    </span>
                    <button
                      onClick={() => handleOpenEditAmount(table)}
                      className="text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <PenLine className="w-3 h-3" /> Modifica
                    </button>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div className="text-3xl font-black text-amber-400 font-mono">
                      {currentAmount.toFixed(2)}{' '}
                      <span className="text-lg text-neutral-400 font-normal">€</span>
                    </div>

                    {/* Quick increment / decrement buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleQuickDelta(table.id, currentAmount, -5)}
                        title="-5 €"
                        className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold border border-neutral-700 active:scale-95"
                      >
                        -5€
                      </button>
                      <button
                        onClick={() => handleQuickDelta(table.id, currentAmount, 5)}
                        title="+5 €"
                        className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-300 text-xs font-bold border border-neutral-700 active:scale-95"
                      >
                        +5€
                      </button>
                      <button
                        onClick={() => handleQuickDelta(table.id, currentAmount, 10)}
                        title="+10 €"
                        className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-300 text-xs font-bold border border-neutral-700 active:scale-95"
                      >
                        +10€
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions: Incassa & Libera */}
              <div className="pt-3 mt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                {hasAmount ? (
                  <>
                    <button
                      onClick={() => freeTable(table.id)}
                      className="text-xs text-neutral-400 hover:text-rose-400 font-semibold px-2 py-1"
                    >
                      Azzera
                    </button>
                    <button
                      onClick={() => handleSendToCassa(table)}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-black text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Incassa ({currentAmount.toFixed(2)} €)</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleOpenEditAmount(table)}
                    className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Imposta Conto del Tavolo</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: AGGIUNGI NUOVO TAVOLO */}
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
          </div>
        </div>
      )}

      {/* MODAL: MODIFICA IMPORTO CONTO TAVOLO (فيني عدل متى ما بدي) */}
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
          </div>
        </div>
      )}

      {/* MODAL: MODIFICA NOME O ELIMINA TAVOLO */}
      {isEditTableDetailsOpen && (
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
                onClick={() => {
                  if (confirm(`Eliminare definitivamente ${isEditTableDetailsOpen.name}?`)) {
                    deleteTable(isEditTableDetailsOpen.id);
                    setIsEditTableDetailsOpen(null);
                  }
                }}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Elimina
              </button>

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
          </div>
        </div>
      )}
    </div>
  );
};
