import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Banknote,
  BarChart3,
  Calendar,
  CreditCard,
  Download,
  FileText,
  Printer,
  Receipt as ReceiptIcon,
  Search,
  TrendingUp,
} from 'lucide-react';
import { Receipt } from '../types';
import { ReceiptPrintModal } from './ReceiptPrintModal';

export const ReportView: React.FC = () => {
  const { receipts, profile } = useApp();
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<Receipt | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Daily totals
  const todayStr = new Date().toISOString().substring(0, 10);
  const todayReceipts = useMemo(() => {
    return receipts.filter((r) => r.date.startsWith(todayStr));
  }, [receipts, todayStr]);

  const totalRevenue = useMemo(() => {
    return todayReceipts.reduce((sum, r) => sum + r.totalAmount, 0);
  }, [todayReceipts]);

  const totalCash = useMemo(() => {
    return todayReceipts.reduce((sum, r) => sum + r.cashAmount, 0);
  }, [todayReceipts]);

  const totalCard = useMemo(() => {
    return todayReceipts.reduce((sum, r) => sum + r.cardAmount, 0);
  }, [todayReceipts]);

  const averageTicket = useMemo(() => {
    return todayReceipts.length > 0 ? totalRevenue / todayReceipts.length : 0;
  }, [totalRevenue, todayReceipts.length]);

  // Filtered receipts list
  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.receiptNumber.toLowerCase().includes(q) ||
        (r.tableName && r.tableName.toLowerCase().includes(q)) ||
        r.cashierName.toLowerCase().includes(q) ||
        r.paymentMethod.toLowerCase().includes(q)
      );
    });
  }, [receipts, searchQuery]);

  const handlePrintZReport = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center font-bold">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Report Vendite &amp; Chiusura Cassa (Report Z)
            </h1>
            <p className="text-xs text-neutral-400">
              Riepilogo fiscale del turno, incassi contanti, pagamenti POS e archivio scontrini.
            </p>
          </div>
        </div>

        <button
          onClick={handlePrintZReport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-500/20 transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Stampa Chiusura Giornaliera</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total revenue */}
        <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-2 shadow-md">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Incasso Totale Oggi</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            {totalRevenue.toFixed(2)} €
          </div>
          <p className="text-[11px] text-neutral-500">Tutti i metodi inclusi</p>
        </div>

        {/* Total Cash */}
        <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-2 shadow-md">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Contanti in Cassetto</span>
            <Banknote className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">
            {totalCash.toFixed(2)} €
          </div>
          <p className="text-[11px] text-neutral-500">Da versare a fine turno</p>
        </div>

        {/* Total Card */}
        <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-2 shadow-md">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Carte / Bancomat POS</span>
            <CreditCard className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-400">
            {totalCard.toFixed(2)} €
          </div>
          <p className="text-[11px] text-neutral-500">Transazioni POS elettroniche</p>
        </div>

        {/* Tickets count & Average */}
        <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-2 shadow-md">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Scontrini &amp; Media</span>
            <ReceiptIcon className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-400">
            {todayReceipts.length}
          </div>
          <p className="text-[11px] text-neutral-400">
            Scontrino medio:{' '}
            <strong className="text-white">{averageTicket.toFixed(2)} €</strong>
          </p>
        </div>
      </div>

      {/* Receipts Table with Search */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div>
            <h3 className="font-bold text-white text-base">Archivio Fiscale Ricevute</h3>
            <p className="text-xs text-neutral-400">
              Storico completo dei conti chiusi con dettagli articoli, metodo e ristampa.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Cerca scontrino, tavolo, cassiere..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {filteredReceipts.length === 0 ? (
          <div className="p-10 text-center text-neutral-400 text-xs">
            Nessun scontrino corrisponde ai criteri di ricerca.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-neutral-950/80 text-neutral-400 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Numero</th>
                  <th className="px-4 py-3">Data &amp; Ora</th>
                  <th className="px-4 py-3">Tavolo / Asporto</th>
                  <th className="px-4 py-3">Operatore Cassa</th>
                  <th className="px-4 py-3">Metodo</th>
                  <th className="px-4 py-3 text-right">Importo Totale</th>
                  <th className="px-4 py-3 text-right">Ristampa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredReceipts.map((r) => {
                  const formattedDate = new Date(r.date).toLocaleString('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={r.id} className="hover:bg-neutral-800/40">
                      <td className="px-4 py-3 font-mono font-bold text-amber-400">
                        {r.receiptNumber}
                      </td>
                      <td className="px-4 py-3 text-neutral-300 text-xs">{formattedDate}</td>
                      <td className="px-4 py-3 text-white font-semibold">
                        {r.tableName || 'Banco'}
                      </td>
                      <td className="px-4 py-3 text-neutral-400 text-xs">{r.cashierName}</td>
                      <td className="px-4 py-3">
                        <span className="capitalize px-2 py-0.5 rounded-full text-xs bg-neutral-800 text-neutral-300 border border-neutral-700">
                          {r.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-emerald-400 text-sm">
                        {r.totalAmount.toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedReceiptForPrint(r)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 inline-flex items-center gap-1 text-xs font-semibold"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Ristampa</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for reprinting selected receipt */}
      {selectedReceiptForPrint && (
        <ReceiptPrintModal
          receipt={selectedReceiptForPrint}
          onClose={() => setSelectedReceiptForPrint(null)}
        />
      )}
    </div>
  );
};
