import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ChefHat,
  CreditCard,
  FilePlus,
  Grid,
  Package,
  PackagePlus,
  Printer,
  Receipt as ReceiptIcon,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { Receipt } from '../types';
import { ReceiptPrintModal } from './ReceiptPrintModal';

export const HomeDashboard: React.FC = () => {
  const {
    currentUser,
    setActiveView,
    setSelectedTableForCheckout,
    receipts,
    lowStockItems,
    tables,
    inventory,
    profile,
  } = useApp();

  const [receiptToPrint, setReceiptToPrint] = useState<Receipt | null>(null);

  if (!currentUser) return null;
  const permissions = currentUser.permissions;

  // Calculate today's sales
  const todayStr = new Date().toISOString().substring(0, 10);
  const todayReceipts = receipts.filter((r) => r.date.startsWith(todayStr));
  const totalRevenueToday = todayReceipts.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalCashToday = todayReceipts.reduce((sum, r) => sum + r.cashAmount, 0);
  const totalCardToday = todayReceipts.reduce((sum, r) => sum + r.cardAmount, 0);
  const averageTicket = todayReceipts.length > 0 ? totalRevenueToday / todayReceipts.length : 0;

  const activeTables = tables.filter(
    (t) => t.status === 'occupato' || t.status === 'in_conto' || (typeof t.billAmount === 'number' && t.billAmount > 0)
  );
  const totalTablesAmount = activeTables.reduce((sum, t) => sum + (t.billAmount || 0), 0);

  const handleCheckoutTable = (table: (typeof tables)[0]) => {
    setSelectedTableForCheckout(table);
    setActiveView('cassa');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Shift Header & KPI Strip */}
      <div className="bg-[#0d1527] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div>
            <div className="text-xs text-slate-400 font-medium">
              {new Date().toLocaleDateString('it-IT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
              Bentornato, {currentUser.displayName}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Pannello di controllo operativo per cassa, tavoli e magazzino.
            </p>
          </div>

          {/* Quick Date and Shift summary */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('tavoli')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700/80 flex items-center gap-2 transition-colors"
            >
              <Grid className="w-3.5 h-3.5 text-cyan-400" />
              <span>{activeTables.length} Tavoli Occupati</span>
            </button>
            <button
              onClick={() => setActiveView('cassa')}
              className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-colors shadow-sm shadow-cyan-500/20"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Nuovo Incasso</span>
            </button>
          </div>
        </div>

        {/* 4-column KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
            <div className="text-[11px] font-medium text-slate-400">Incasso di Oggi</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {totalRevenueToday.toFixed(2)}{' '}
              <span className="text-sm font-normal text-slate-400">€</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              {todayReceipts.length} scontrini emessi
            </div>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
            <div className="text-[11px] font-medium text-slate-400">Contanti in Cassa</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {totalCashToday.toFixed(2)}{' '}
              <span className="text-sm font-normal text-slate-400">€</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              {totalRevenueToday > 0 ? ((totalCashToday / totalRevenueToday) * 100).toFixed(0) : 0}% del totale
            </div>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
            <div className="text-[11px] font-medium text-slate-400">Pagamenti Carta / POS</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {totalCardToday.toFixed(2)}{' '}
              <span className="text-sm font-normal text-slate-400">€</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              {totalRevenueToday > 0 ? ((totalCardToday / totalRevenueToday) * 100).toFixed(0) : 0}% del totale
            </div>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
            <div className="text-[11px] font-medium text-slate-400">Importo Aperto sui Tavoli</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {totalTablesAmount.toFixed(2)}{' '}
              <span className="text-sm font-normal text-slate-400">€</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              su {activeTables.length} tavoli attivi
            </div>
          </div>
        </div>
      </div>

      {/* Low stock warning banner if any items are under minimum */}
      {lowStockItems.length > 0 && permissions.canAccessMagazzino && (
        <div
          onClick={() => setActiveView('magazzino')}
          className="flex items-center justify-between p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 cursor-pointer hover:bg-amber-950/40 transition-colors shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-xs text-amber-300">
                Allerta Scorta Minima: {lowStockItems.length} articol
                {lowStockItems.length === 1 ? 'o' : 'i'} da riordinare
              </div>
              <div className="text-[11px] text-amber-300/70 font-mono">
                {lowStockItems.map((i) => i.name).slice(0, 4).join(', ')}
                {lowStockItems.length > 4 ? '...' : ''}
              </div>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
            Controlla Magazzino <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      )}

      {/* 4 PRIMARY OPERATIONAL LAUNCH TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TAVOLI */}
        {permissions.canAccessTavoli && (
          <button
            onClick={() => setActiveView('tavoli')}
            className="p-5 rounded-2xl bg-[#0d1527] border border-slate-800 hover:border-slate-700 text-left transition-all duration-200 shadow-sm flex flex-col justify-between min-h-[170px] group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                <Grid className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono font-medium text-slate-400">
                {tables.length} Tavoli
              </span>
            </div>
            <div className="mt-4">
              <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">
                Mappa Tavoli
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Imposta conti, modifica importi e invia al punto cassa.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-medium text-cyan-400">
              <span>Gestisci Tavoli</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}

        {/* CASSA & CONTO */}
        {permissions.canAccessCassa && (
          <button
            onClick={() => setActiveView('cassa')}
            className="p-5 rounded-2xl bg-[#0d1527] border border-slate-800 hover:border-slate-700 text-left transition-all duration-200 shadow-sm flex flex-col justify-between min-h-[170px] group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono font-medium text-emerald-400">
                Veloce &amp; Resto
              </span>
            </div>
            <div className="mt-4">
              <h3 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">
                Cassa &amp; Conto
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Calcolo resto, mancante, divisione conto e stampa scontrino.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-medium text-emerald-400">
              <span>Apri Cassa</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}

        {/* MAGAZZINO */}
        {permissions.canAccessMagazzino && (
          <button
            onClick={() => setActiveView('magazzino')}
            className="p-5 rounded-2xl bg-[#0d1527] border border-slate-800 hover:border-slate-700 text-left transition-all duration-200 shadow-sm flex flex-col justify-between min-h-[170px] group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                <Package className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono font-medium text-slate-400">
                {inventory.length} Articoli
              </span>
            </div>
            <div className="mt-4">
              <h3 className="font-bold text-white text-base group-hover:text-amber-300 transition-colors">
                Magazzino &amp; Scorte
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Materiali grezzi, prodotti, carichi, scarichi e fornitori.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-medium text-amber-400">
              <span>Vedi Scorte</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}

        {/* DISPENSA CUCINA */}
        {permissions.canAccessCucina && (
          <button
            onClick={() => setActiveView('cucina')}
            className="p-5 rounded-2xl bg-[#0d1527] border border-slate-800 hover:border-slate-700 text-left transition-all duration-200 shadow-sm flex flex-col justify-between min-h-[170px] group"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 group-hover:bg-orange-500/20 transition-colors">
                <ChefHat className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono font-medium text-slate-400">
                Cucina
              </span>
            </div>
            <div className="mt-4">
              <h3 className="font-bold text-white text-base group-hover:text-orange-300 transition-colors">
                Dispensa Cucina
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ingredienti, scorte alimentari e scarico rapido preparazioni.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-medium text-orange-400">
              <span>Apri Dispensa</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}
      </div>

      {/* TWO SECTIONS: LIVE OCCUPIED TABLES & RECENT RECEIPTS AUDIT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Active Tables live card */}
        <div className="bg-[#0d1527] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Tavoli con Conto Aperto</h2>
            </div>
            <button
              onClick={() => setActiveView('tavoli')}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              Tutti i Tavoli <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {activeTables.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-10 h-10 mx-auto rounded-xl bg-slate-900 flex items-center justify-center text-slate-500">
                <Grid className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-400">Nessun tavolo attualmente occupato</p>
              <button
                onClick={() => setActiveView('tavoli')}
                className="text-xs font-semibold text-cyan-400 hover:underline inline-block mt-1"
              >
                Apri un nuovo tavolo
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {activeTables.map((tbl) => {
                const amt = typeof tbl.billAmount === 'number' ? tbl.billAmount : 0;
                return (
                  <div
                    key={tbl.id}
                    className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{tbl.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {tbl.coversCount || tbl.seats} coperti
                        </span>
                      </div>
                      {tbl.notes && (
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                          {tbl.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-amber-400">
                          {amt.toFixed(2)} €
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase font-mono">
                          {tbl.status === 'in_conto' ? 'In Conto' : 'Attivo'}
                        </div>
                      </div>

                      <button
                        onClick={() => handleCheckoutTable(tbl)}
                        className="py-1.5 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
                      >
                        Incassa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Recent Receipts */}
        <div className="bg-[#0d1527] border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <ReceiptIcon className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Ultimi Scontrini Emessi</h2>
            </div>
            <button
              onClick={() => setActiveView('report')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              Report Completo <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {receipts.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-10 h-10 mx-auto rounded-xl bg-slate-900 flex items-center justify-center text-slate-500">
                <ReceiptIcon className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-400">Nessuno scontrino emesso finora</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {receipts.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">
                        {r.receiptNumber}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {r.tableName || 'Banco'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{new Date(r.date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span className="capitalize">{r.paymentMethod}</span>
                      <span>•</span>
                      <span>{r.cashierName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {r.totalAmount.toFixed(2)} €
                    </span>
                    <button
                      onClick={() => setReceiptToPrint(r)}
                      title="Stampa / Visualizza scontrino"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FLOATING QUICK ACTIONS BAR FOR PEAK HOURS (User Request) */}
      <div className="fixed bottom-6 right-6 z-30 flex items-center gap-3">
        {permissions.canAccessMagazzino && (
          <button
            onClick={() => setActiveView('magazzino')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900/95 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer hover:border-amber-500/50"
          >
            <PackagePlus className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Aggiorna Magazzino</span>
          </button>
        )}

        {permissions.canAccessCassa && (
          <button
            onClick={() => {
              setSelectedTableForCheckout(null);
              setActiveView('cassa');
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-xl shadow-cyan-500/25 transition-all active:scale-95 cursor-pointer"
          >
            <FilePlus className="w-4 h-4" />
            <span>Nuova Fattura</span>
          </button>
        )}
      </div>

      {/* Print receipt modal if selected */}
      {receiptToPrint && (
        <ReceiptPrintModal
          receipt={receiptToPrint}
          onClose={() => setReceiptToPrint(null)}
        />
      )}
    </div>
  );
};
