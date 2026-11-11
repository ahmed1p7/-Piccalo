/**
 * 💳 Incasso — pagamento singolo, divisione del conto, pagamenti multipli
 *
 * Un unico flusso per tutte le esigenze di cassa:
 *  1) Pagamento singolo   → un cliente, un metodo
 *  2) Dividi il conto     → N persone, quote uguali o percentuali
 *  3) Pagamenti multipli  → più incassi (anche con metodi diversi)
 *                            sullo stesso tavolo, finché il saldo è a zero
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Banknote,
  Check,
  CreditCard,
  Minus,
  Plus,
  ReceiptText,
  RotateCcw,
  Split,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { OrderItem, PaymentMethod, PaymentSplitRecord, Receipt, RestaurantTable } from '../types';
import { Amount, Badge, Btn, Field, Input, Modal, euro } from './ui';
import {
  computeChange,
  isFullyPaid,
  round2,
  splitByRatio,
  splitEqual,
  summarizePayments,
} from '../utils/cassa';

type Mode = 'singolo' | 'diviso';
type SplitKind = 'uguale' | 'quote';

interface Props {
  open: boolean;
  onClose: () => void;
  table?: RestaurantTable | null;
  /** vendita rapida al banco (nessun tavolo) */
  quickAmount?: number;
  /** voci del conto (vendita rapida) → finiscono sulla ricevuta */
  quickItems?: OrderItem[];
  /** numero di coperti (vendita rapida) */
  coversCount?: number;
  /** sconto applicato in % (solo per la ricevuta) */
  discountPercent?: number;
  onCompleted?: (receipt?: Receipt) => void;
}

export const PaymentModal: React.FC<Props> = ({
  open,
  onClose,
  table,
  quickAmount,
  quickItems,
  coversCount,
  discountPercent,
  onCompleted,
}) => {
  const {
    addTablePayment,
    getTablePaidAmount,
    closeBillAndGenerateReceipt,
    currentUser,
    tables,
  } = useApp();

  const isQuick = !table;
  // ⚠️ il prop "table" è una copia: dopo un pagamento il tavolo reale cambia.
  //    Uso sempre la versione più recente dal contesto.
  const liveTable = table
    ? tables.find((t) => t.id === table.id) || table
    : null;
  const total = isQuick
    ? round2(quickAmount || 0)
    : round2(liveTable?.billAmount || 0);
  const alreadyPaid = liveTable ? getTablePaidAmount(liveTable.id) : 0;
  const due = round2(Math.max(0, total - alreadyPaid));

  const [mode, setMode] = useState<Mode>('singolo');
  const [splitKind, setSplitKind] = useState<SplitKind>('uguale');
  const [peopleCount, setPeopleCount] = useState(2);
  const [ratios, setRatios] = useState<number[]>([]);
  const [shares, setShares] = useState<PaymentSplitRecord[]>([]);
  // importo su cui è stata fatta la divisione (non cambia quando si incassa)
  const [splitBase, setSplitBase] = useState(0);
  const wasOpen = useRef(false);

  const [method, setMethod] = useState<'contanti' | 'carta'>('contanti');
  const [amount, setAmount] = useState('');
  const [cashGiven, setCashGiven] = useState('');
  const [note, setNote] = useState('');
  const [activeShare, setActiveShare] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  // ── reset SOLO quando il modale si apre ──
  //    (NON quando cambia il saldo: altrimenti la divisione verrebbe
  //     ricalcolata dopo ogni pagamento e le quote già saldate si perderebbero)
  useEffect(() => {
    if (open && !wasOpen.current) {
      setMode('singolo');
      setSplitKind('uguale');
      setPeopleCount(2);
      setRatios([]);
      setShares([]);
      setSplitBase(due);
      setMethod('contanti');
      setAmount(due > 0 ? due.toFixed(2) : '');
      setCashGiven('');
      setNote('');
      setActiveShare(null);
      setError('');
      setInfo('');
    }
    wasOpen.current = open;
  }, [open, due]);

  // ── ricalcolo delle quote quando cambiano persone/totale ──
  useEffect(() => {
    if (!open) return;
    const n = Math.max(2, Math.min(20, peopleCount));
    setShares((prev) => {
      const next: PaymentSplitRecord[] = [];
      for (let i = 0; i < n; i++) {
        const old = prev.find((p) => p.personLabel === `Persona ${i + 1}`);
        next.push(
          old || {
            id: `split_${i}`,
            personLabel: `Persona ${i + 1}`,
            amountDue: 0,
            amountPaid: 0,
            method: 'contanti',
            changeReturned: 0,
            isPaid: false,
          }
        );
      }
      return next;
    });
  }, [peopleCount, open]);

  // ── importi delle quote ──
  useEffect(() => {
    if (!open) return;
    setShares((prev) => {
      const n = prev.length;
      if (n === 0) return prev;
      const base = splitBase;

      if (splitKind === 'uguale') {
        const amounts = splitEqual(base, n);
        return prev.map((p, i) => ({
          ...p,
          amountDue: amounts[i],
          ratio: round2((amounts[i] / (base || 1)) * 100),
        }));
      }

      // quote personalizzate (percentuali)
      const currentRatios =
        ratios.length === n ? ratios : Array.from({ length: n }, (_, i) => (i === 0 ? 100 : 0));
      const amounts = splitByRatio(base, currentRatios);
      return prev.map((p, i) => ({
        ...p,
        amountDue: amounts[i],
        ratio: Number(currentRatios[i]) || 0,
      }));
    });
  }, [splitKind, ratios, splitBase, open]);

  const currentShare = activeShare !== null ? shares[activeShare] : null;
  const targetAmount = currentShare ? round2(currentShare.amountDue - currentShare.amountPaid) : due;

  useEffect(() => {
    setAmount(targetAmount > 0 ? targetAmount.toFixed(2) : '');
  }, [targetAmount]);

  const paidShares = shares.filter((s) => s.isPaid).length;
  const allSharesPaid = shares.length > 0 && shares.every((s) => s.isPaid);
  const splitPaid = shares.reduce((s, p) => s + p.amountPaid, 0);
  const remaining =
    mode === 'diviso' && shares.length > 0
      ? round2(Math.max(0, splitBase - splitPaid))
      : due;

  // riepilogo dei pagamenti registrati sul tavolo
  const paymentSummary = summarizePayments(
    (liveTable?.payments || []).map((p) => ({
      amount: p.amount,
      method: p.method,
      changeGiven: p.changeGiven,
    }))
  );

  // ═══════════════════════════════════════════════════════════════════
  // 💶 Registrazione di un pagamento
  // ═══════════════════════════════════════════════════════════════════
  const handleRegisterPayment = () => {
    setError('');
    setInfo('');

    const value = Number(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      setError('Inserisci un importo valido.');
      return;
    }
    if (value - targetAmount > 0.009) {
      setError(`L'importo supera il saldo dovuto (${euro(targetAmount)} €).`);
      return;
    }

    const given = method === 'contanti' ? Number(cashGiven.replace(',', '.') || value) : 0;
    if (method === 'contanti' && given < value - 0.009) {
      setError('Il contante ricevuto è inferiore all\'importo da incassare.');
      return;
    }

    setBusy(true);

    if (isQuick) {
      // 🛒 Vendita rapida al banco: nessun tavolo → si chiude subito lo
      //    scontrino. Deve essere incassato IL CONTO COMPLETO: un importo
      //    parziale non può generare una ricevuta (prima si poteva, e la
      //    ricevuta risultava sbagliata).
      if (value < total - 0.009) {
        setError(
          `Il conto non è coperto: mancano ${euro(round2(total - value))} €.`
        );
        setBusy(false);
        return;
      }

      const items: OrderItem[] =
        quickItems && quickItems.length > 0
          ? quickItems
          : [
              {
                id: `quick_item_${Date.now()}`,
                name: 'Conto Generale / Consumazione',
                price: total,
                quantity: 1,
                destination: 'cassa',
                status: 'servito',
                addedAt: new Date().toLocaleTimeString('it-IT', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              },
            ];

      const receipt = closeBillAndGenerateReceipt({
        tableName: 'Vendita Rapida Banco',
        coversCount: coversCount || 1,
        items,
        totalAmount: total,
        paymentMethod: method,
        cashAmount: method === 'contanti' ? value : 0,
        cardAmount: method === 'carta' ? value : 0,
        changeGiven: method === 'contanti' ? round2(given - value) : 0,
        notes:
          discountPercent && discountPercent > 0
            ? `Sconto ${discountPercent}% · ${note || ''}`.trim()
            : note || undefined,
      });
      setBusy(false);
      onCompleted?.(receipt);
      onClose();
      return;
    }

    // tavolo → registra il pagamento sul tavolo (può essere parziale)
    const res = addTablePayment({
      tableId: table!.id,
      amount: value,
      method,
      cashGiven: method === 'contanti' ? given : undefined,
      note: note || undefined,
      splitLabel: currentShare?.personLabel,
    });

    setBusy(false);

    if (!res.success) {
      setError(res.message || 'Pagamento non riuscito.');
      return;
    }

    const change = computeChange(
      method === 'contanti' ? Number(cashGiven.replace(',', '.') || value) : 0,
      value
    );
    setInfo(
      change > 0
        ? `Pagamento registrato. Resto: ${euro(change)} €`
        : 'Pagamento registrato.'
    );

    // aggiorna la quota interessata
    if (currentShare) {
      setShares((prev) =>
        prev.map((s, i) =>
          i === activeShare
            ? {
                ...s,
                amountPaid: round2(s.amountPaid + value),
                method,
                cashGiven: method === 'contanti' ? given : undefined,
                changeReturned: round2(s.changeReturned + change),
                isPaid: s.amountPaid + value >= s.amountDue - 0.009,
              }
            : s
        )
      );
      setActiveShare(null);
    }

    setNote('');
    setCashGiven('');
  };

  // ═══════════════════════════════════════════════════════════════════
  // 🧾 Chiusura del conto
  // ═══════════════════════════════════════════════════════════════════
  const handleCloseBill = () => {
    if (!table || !liveTable) return;
    const freshTable = liveTable;
    const paidTotal = getTablePaidAmount(table.id);

    if (!isFullyPaid(total, paidTotal)) {
      setError(
        `Il conto non è ancora coperto: mancano ${euro(round2(total - paidTotal))} €.`
      );
      return;
    }

    const receipt = closeBillAndGenerateReceipt({
      tableId: table.id,
      tableName: freshTable.name,
      coversCount: freshTable.coversCount || 0,
      items: freshTable.currentOrderItems || [],
      totalAmount: total,
      paymentMethod:
        paidTotal > 0 ? 'misto' : 'contanti',
      cashAmount: 0,
      cardAmount: 0,
      changeGiven: 0,
      splitDetails:
        mode === 'diviso' && shares.some((s) => s.amountPaid > 0) ? shares : undefined,
      notes: note || undefined,
    });

    onCompleted?.(receipt);
    onClose();
  };

  const canClose = !isQuick && total > 0 && isFullyPaid(total, alreadyPaid);

  // ── scorciatoie contanti ──
  const cashPresets = useMemo(() => {
    const base = targetAmount;
    const round = (n: number) => Math.ceil(n);
    const set = new Set<number>();
    if (base > 0) {
      set.add(round(base));
      set.add(round(base / 2) * 2);
      set.add(round(base / 2) * 2 + 1);
      set.add(round(base / 5) * 5);
      set.add(round(base / 5) * 5 + 1);
    }
    return Array.from(set)
      .filter((v) => v > 0)
      .sort((a, b) => a - b)
      .slice(0, 5);
  }, [targetAmount]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-brand-300" />
          {isQuick ? 'Incasso rapido' : `Incasso — ${table?.name}`}
        </span>
      }
      subtitle={
        isQuick
          ? 'Vendita al banco senza tavolo'
          : `Totale conto ${euro(total)} € · già incassato ${euro(alreadyPaid)} €`
      }
      footer={
        <>
          {!isQuick && (
            <div className="mr-auto flex items-center gap-2">
              <span className="text-xs text-mist-500">Saldo dovuto</span>
              <Amount value={remaining} size="lg" tone={remaining > 0 ? 'amber' : 'mint'} />
            </div>
          )}
          <Btn variant="ghost" onClick={onClose}>
            Annulla
          </Btn>
          {!isQuick && (
            <Btn variant="primary" onClick={handleCloseBill} disabled={!canClose}>
              <ReceiptText className="w-4 h-4" />
              Chiudi conto
            </Btn>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {/* ── Riepilogo importi ── */}
        <div className="grid grid-cols-3 gap-2">
          <div className="surface-raised p-3 text-center">
            <div className="section-title">Totale</div>
            <Amount value={total} size="md" className="mt-1 block" />
          </div>
          <div className="surface-raised p-3 text-center">
            <div className="section-title">Incassato</div>
            <Amount value={alreadyPaid} size="md" tone="mint" className="mt-1 block" />
          </div>
          <div className="surface-raised p-3 text-center">
            <div className="section-title">Da incassare</div>
            <Amount
              value={due}
              size="md"
              tone={due > 0 ? 'amber' : 'mint'}
              className="mt-1 block"
            />
          </div>
        </div>

        {/* ── Modalità ── */}
        {!isQuick && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setMode('singolo');
                setActiveShare(null);
              }}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                mode === 'singolo'
                  ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                  : 'border-ink-700 bg-ink-900 text-mist-500 hover:text-mist-300'
              }`}
            >
              <Wallet className="w-4 h-4 mx-auto mb-1" />
              Pagamento unico
            </button>
            <button
              onClick={() => {
                setMode('diviso');
                setSplitBase(due);
                setActiveShare(null);
              }}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                mode === 'diviso'
                  ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                  : 'border-ink-700 bg-ink-900 text-mist-500 hover:text-mist-300'
              }`}
            >
              <Split className="w-4 h-4 mx-auto mb-1" />
              Dividi il conto
            </button>
          </div>
        )}

        {/* ── Sezione divisione ── */}
        {mode === 'diviso' && !isQuick && (
          <div className="surface-raised p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-mist-500" />
                <span className="text-xs font-bold text-mist-300">Persone</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPeopleCount((n) => Math.max(2, n - 1))}
                  className="btn-soft btn-sm !px-2"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-bold tnum text-mist-100">
                  {peopleCount}
                </span>
                <button
                  onClick={() => setPeopleCount((n) => Math.min(20, n + 1))}
                  className="btn-soft btn-sm !px-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              {(['uguale', 'quote'] as SplitKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setSplitKind(k)}
                  className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-bold transition ${
                    splitKind === k
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                      : 'bg-ink-900 text-mist-500 border border-ink-700 hover:text-mist-300'
                  }`}
                >
                  {k === 'uguale' ? 'Quote uguali' : 'Percentuali'}
                </button>
              ))}
            </div>

            {/* Quote */}
            <div className="space-y-2">
              {shares.map((s, i) => {
                const done = s.isPaid;
                const active = activeShare === i;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition ${
                      active
                        ? 'border-brand-500/50 bg-brand-500/10'
                        : done
                        ? 'border-mint-400/30 bg-mint-600/10'
                        : 'border-ink-700 bg-ink-900'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-mist-100">
                          {s.personLabel}
                        </span>
                        {done && <Badge tone="mint">pagato</Badge>}
                        {!done && s.amountPaid > 0 && (
                          <Badge tone="amber">parziale</Badge>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Amount value={s.amountDue} size="sm" />
                        {splitKind === 'quote' && (
                          <span className="text-[10px] text-mist-500">
                            {s.ratio ?? 0}%
                          </span>
                        )}
                        {s.amountPaid > 0 && !done && (
                          <span className="text-[10px] text-mint-400">
                            pagati {euro(s.amountPaid)} €
                          </span>
                        )}
                      </div>
                    </div>

                    {splitKind === 'quote' && !done && (
                      <Input
                        small
                        type="number"
                        min={0}
                        value={
                          ratios.length === shares.length ? ratios[i] : i === 0 ? 100 : 0
                        }
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          const next =
                            ratios.length === shares.length ? [...ratios] : Array.from(
                                { length: shares.length },
                                (_, k) => (k === 0 ? 100 : 0)
                              );
                          next[i] = Number.isFinite(v) ? v : 0;
                          setRatios(next);
                        }}
                        className="!w-16 !px-2 text-center"
                      />
                    )}

                    {done ? (
                      <Check className="w-4 h-4 text-mint-400" />
                    ) : (
                      <button
                        onClick={() => {
                          setActiveShare(active ? null : i);
                          setError('');
                        }}
                        className={`btn-sm rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                          active
                            ? 'bg-brand-500 text-ink-950'
                            : 'bg-ink-800 text-mist-300 border border-ink-600 hover:border-brand-500/40 hover:text-brand-300'
                        }`}
                      >
                        {active ? 'Annulla' : 'Paga'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] text-mist-500">
              <span>
                {paidShares}/{shares.length} quote saldate
              </span>
              {allSharesPaid && <Badge tone="mint">conto coperto</Badge>}
            </div>
          </div>
        )}

        {/* ── Formulario pagamento ── */}
        {/* ⚠️ Prima condizione: (!isQuick && mode === 'singolo') → nella vendita
            rapida il modulo NON compariva affatto (modale vuoto, impossibile
            incassare). Ora: in modalità singolo il modulo c'è sempre. */}
        {(mode === 'singolo' || currentShare) && (
          <div className="surface-raised p-3.5 space-y-3">
            {currentShare && (
              <div className="flex items-center justify-between rounded-lg bg-brand-500/10 border border-brand-500/30 px-3 py-2">
                <span className="text-xs font-bold text-brand-300">
                  Pagamento per {currentShare.personLabel}
                </span>
                <Amount value={targetAmount} size="sm" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMethod('contanti')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold transition ${
                  method === 'contanti'
                    ? 'border-mint-400/50 bg-mint-600/15 text-mint-400'
                    : 'border-ink-700 bg-ink-900 text-mist-500 hover:text-mist-300'
                }`}
              >
                <Banknote className="w-4 h-4" />
                Contanti
              </button>
              <button
                onClick={() => setMethod('carta')}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold transition ${
                  method === 'carta'
                    ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                    : 'border-ink-700 bg-ink-900 text-mist-500 hover:text-mist-300'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Carta
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Importo da incassare">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="!text-lg font-bold tnum"
                />
              </Field>

              {method === 'contanti' && (
                <Field label="Contante ricevuto">
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    placeholder={amount || '0.00'}
                    className="!text-lg font-bold tnum"
                  />
                </Field>
              )}
            </div>

            {method === 'contanti' && cashPresets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {cashPresets.map((v) => (
                  <button
                    key={v}
                    onClick={() => setCashGiven(v.toFixed(2))}
                    className="rounded-lg bg-ink-800 border border-ink-600 px-3 py-1.5 text-xs font-bold tnum text-mist-300 hover:border-brand-500/40 hover:text-brand-300 transition"
                  >
                    {euro(v)}
                  </button>
                ))}
                <button
                  onClick={() => setCashGiven(targetAmount.toFixed(2))}
                  className="rounded-lg bg-ink-800 border border-ink-600 px-3 py-1.5 text-xs font-bold tnum text-mist-300 hover:border-brand-500/40 hover:text-brand-300 transition"
                >
                  Esatto
                </button>
              </div>
            )}

            {method === 'contanti' && Number(cashGiven) > targetAmount && (
              <div className="rounded-lg bg-amber-600/15 border border-amber-400/30 px-3 py-2 text-xs font-bold text-amber-400">
                Resto da restituire: {euro(round2(Number(cashGiven) - targetAmount))} €
              </div>
            )}

            <Field label="Nota (opzionale)">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="es. tavolo 5, 3 persone"
              />
            </Field>

            {error && (
              <div className="rounded-xl bg-rose-600/15 border border-rose-400/30 px-3.5 py-2.5 text-xs font-semibold text-rose-400">
                {error}
              </div>
            )}
            {info && (
              <div className="rounded-xl bg-mint-600/15 border border-mint-400/30 px-3.5 py-2.5 text-xs font-semibold text-mint-400">
                {info}
              </div>
            )}

            <Btn
              variant="primary"
              size="lg"
              full
              onClick={handleRegisterPayment}
              disabled={busy || targetAmount <= 0}
            >
              {currentShare ? `Registra pagamento ${currentShare.personLabel}` : 'Registra pagamento'}
              <ArrowRight className="w-4 h-4" />
            </Btn>

            <p className="text-[11px] text-center text-mist-500">
              Puoi registrare più pagamenti (anche con metodi diversi) sullo stesso tavolo:
              il conto si chiude quando il saldo arriva a zero.
            </p>
          </div>
        )}

        {/* ── Storico pagamenti del tavolo ── */}
        {liveTable && (liveTable.payments?.length || 0) > 0 && (
          <div className="surface-raised p-3.5">
            <div className="section-title mb-2">Pagamenti registrati</div>
            <div className="space-y-1.5">
              {liveTable.payments!.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-ink-900 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {p.method === 'carta' ? (
                      <CreditCard className="w-3.5 h-3.5 text-brand-300 shrink-0" />
                    ) : (
                      <Banknote className="w-3.5 h-3.5 text-mint-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-mist-100 tnum">
                        {euro(p.amount)} €
                      </div>
                      <div className="text-[10px] text-mist-500 truncate">
                        {new Date(p.createdAt).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {p.splitLabel ? ` · ${p.splitLabel}` : ''}
                        {p.cashierName ? ` · ${p.cashierName}` : ''}
                        {p.changeGiven > 0 ? ` · resto ${euro(p.changeGiven)} €` : ''}
                      </div>
                    </div>
                  </div>
                  <Badge tone={p.method === 'carta' ? 'brand' : 'mint'}>
                    {p.method === 'carta' ? 'carta' : 'contanti'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
