/**
 * 📊 Report vendite & chiusura cassa (Report Z)
 *
 * Riepilogo del turno, incassi per metodo di pagamento e archivio scontrini.
 * Il markup segue il design system; logica e handler restano invariati.
 */

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
import {
  Amount,
  Badge,
  Btn,
  Card,
  EmptyState,
  Input,
  SectionTitle,
  Stat,
  euro,
} from './ui';

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
<<<<<<< HEAD
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
=======
    <div className="min-h-screen bg-ink-950 text-mist-100 animate-fadeIn">
      <div className="mx-auto max-w-7xl px-3 sm:px-5 py-5 sm:py-6 space-y-4 sm:space-y-5">
        {/* ── Intestazione ── */}
        <Card className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 shrink-0 rounded-2xl bg-brand-500/15 text-brand-300 border border-brand-500/25 flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-mist-100">
                Report Vendite &amp; Chiusura Cassa (Report Z)
              </h1>
              <p className="mt-0.5 text-xs text-mist-500">
                Riepilogo fiscale del turno, incassi contanti, pagamenti POS e archivio
                scontrini.
              </p>
            </div>
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
          </div>

          <Btn variant="primary" onClick={handlePrintZReport} className="w-full sm:w-auto">
            <Printer className="w-4 h-4" />
            Stampa Chiusura Giornaliera
          </Btn>
        </Card>

        {/* ── KPI del turno ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat
            label="Incasso Totale Oggi"
            value={
              <Amount value={totalRevenue} size="lg" tone="mint" className="!text-xl sm:!text-2xl" />
            }
            tone="mint"
            icon={<TrendingUp className="w-4 h-4" />}
            sub="Tutti i metodi inclusi"
          />
          <Stat
            label="Contanti in Cassetto"
            value={
              <Amount value={totalCash} size="lg" tone="amber" className="!text-xl sm:!text-2xl" />
            }
            tone="amber"
            icon={<Banknote className="w-4 h-4" />}
            sub="Da versare a fine turno"
          />
          <Stat
            label="Carte / Bancomat POS"
            value={
              <Amount value={totalCard} size="lg" className="!text-xl sm:!text-2xl" />
            }
            tone="brand"
            icon={<CreditCard className="w-4 h-4" />}
            sub="Transazioni POS elettroniche"
          />
          <Stat
            label="Scontrini emessi"
            value={todayReceipts.length}
            tone="neutral"
            icon={<ReceiptIcon className="w-4 h-4" />}
            sub={
              <>
                Scontrino medio: <Amount value={averageTicket} size="sm" tone="mint" />
              </>
            }
          />
        </div>

        {/* ── Incassi per metodo di pagamento (barra CSS, nessuna libreria) ── */}
        <Card className="p-4 sm:p-5 space-y-3">
          <SectionTitle
            action={
              <span className="text-[11px] text-mist-500 tnum">
                Totale {euro(totalRevenue)} €
              </span>
            }
          >
            Incassi per metodo di pagamento
          </SectionTitle>

<<<<<<< HEAD
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
=======
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-ink-800 border border-ink-700">
            <div
              className="h-full bg-brand-500 transition-[width] duration-300"
              style={{ width: `${totalRevenue > 0 ? (totalCash / totalRevenue) * 100 : 0}%` }}
            />
            <div
              className="h-full bg-mint-600 transition-[width] duration-300"
              style={{ width: `${totalRevenue > 0 ? (totalCard / totalRevenue) * 100 : 0}%` }}
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
            />
          </div>

<<<<<<< HEAD
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
=======
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-mist-500">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
              Contanti
              <strong className="font-mono tnum text-mist-300">{euro(totalCash)} €</strong>
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-mint-600" />
              Carta / POS
              <strong className="font-mono tnum text-mist-300">{euro(totalCard)} €</strong>
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-ink-600" />
              Scontrini
              <strong className="font-mono tnum text-mist-300">{todayReceipts.length}</strong>
            </span>
          </div>
        </Card>

        {/* ── Archivio scontrini ── */}
        <Card className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-mist-100">Archivio Fiscale Ricevute</h2>
              <p className="mt-0.5 text-xs text-mist-500">
                Storico completo dei conti chiusi con dettaglio articoli, metodo di pagamento e
                ristampa.
              </p>
            </div>

            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist-500 pointer-events-none" />
              <Input
                type="text"
                placeholder="Cerca scontrino, tavolo, cassiere..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="!pl-9"
              />
            </div>
          </div>

          {filteredReceipts.length === 0 ? (
            <EmptyState
              icon={<ReceiptIcon className="w-6 h-6" />}
              title="Nessuno scontrino corrisponde ai criteri di ricerca."
              description="Prova a modificare la ricerca oppure stampa la chiusura giornaliera."
              action={
                <Btn variant="soft" onClick={handlePrintZReport}>
                  <Printer className="w-4 h-4" />
                  Stampa Chiusura Giornaliera
                </Btn>
              }
            />
          ) : (
            <>
              {/* Tabella (schermi medi e larghi) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="text-mist-500 uppercase tracking-wider text-[11px] border-b border-ink-700">
                    <tr>
                      <th className="px-3 py-3">Numero</th>
                      <th className="px-3 py-3">Data &amp; Ora</th>
                      <th className="px-3 py-3">Tavolo / Asporto</th>
                      <th className="px-3 py-3">Operatore Cassa</th>
                      <th className="px-3 py-3">Metodo</th>
                      <th className="px-3 py-3 text-right">Importo Totale</th>
                      <th className="px-3 py-3 text-right">Ristampa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-700">
                    {filteredReceipts.map((r) => {
                      const formattedDate = new Date(r.date).toLocaleString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <tr key={r.id} className="hover:bg-ink-800/50 transition-colors">
                          <td className="px-3 py-3 font-mono font-bold text-brand-300">
                            {r.receiptNumber}
                          </td>
                          <td className="px-3 py-3 text-mist-300 text-xs">{formattedDate}</td>
                          <td className="px-3 py-3 text-mist-100 font-semibold">
                            {r.tableName || 'Banco'}
                          </td>
                          <td className="px-3 py-3 text-mist-500 text-xs">{r.cashierName}</td>
                          <td className="px-3 py-3">
                            <Badge
                              tone={
                                r.paymentMethod === 'contanti'
                                  ? 'amber'
                                  : r.paymentMethod === 'carta'
                                  ? 'brand'
                                  : 'neutral'
                              }
                            >
                              {r.paymentMethod}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Amount value={r.totalAmount} size="sm" tone="mint" />
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Btn
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedReceiptForPrint(r)}
                              className="!px-2.5"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">Ristampa</span>
                            </Btn>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Schede (mobile) */}
              <div className="sm:hidden space-y-3">
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                {filteredReceipts.map((r) => {
                  const formattedDate = new Date(r.date).toLocaleString('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
<<<<<<< HEAD
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
=======
                    <div key={r.id} className="surface-raised p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-mono font-bold text-sm text-brand-300">
                            {r.receiptNumber}
                          </div>
                          <div className="text-[11px] text-mist-500">{formattedDate}</div>
                        </div>
                        <Badge
                          tone={
                            r.paymentMethod === 'contanti'
                              ? 'amber'
                              : r.paymentMethod === 'carta'
                              ? 'brand'
                              : 'neutral'
                          }
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                        >
                          {r.paymentMethod}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <div className="font-semibold text-mist-100">
                            {r.tableName || 'Banco'}
                          </div>
                          <div className="text-[11px] text-mist-500">
                            Cassiere: {r.cashierName}
                          </div>
                        </div>
                        <Amount value={r.totalAmount} size="md" tone="mint" />
                      </div>

                      <Btn
                        variant="soft"
                        size="sm"
                        full
                        onClick={() => setSelectedReceiptForPrint(r)}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Ristampa scontrino
                      </Btn>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
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
