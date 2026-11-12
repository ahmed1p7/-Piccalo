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
  allocatePayment,
  groupAllocationsByMethod,
  selectedCashTotal,
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
  // 📝 totale da dividere (modificabile a mano → l'app ridistribuisce)
  const [splitTotalInput, setSplitTotalInput] = useState('');
  // ☑️ persone selezionate (per pagare "per conto di" più persone)
  const [selectedShares, setSelectedShares] = useState<number[]>([]);
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
      setSplitTotalInput(due > 0 ? due.toFixed(2) : '');
      setSelectedShares([]);
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

  // 📝 l'importo scritto dall'utente è il nuovo totale da dividere
  useEffect(() => {
    if (!open || mode !== 'diviso') return;
    const v = Number(splitTotalInput.replace(',', '.'));
    if (!Number.isFinite(v) || v < 0) return;
    if (round2(v) !== round2(splitBase)) setSplitBase(round2(v));
  }, [splitTotalInput]);

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

  // 🧾 Somma delle quote selezionate (pagamento "per conto di" più persone)
  const selectedSum = selectedShares.reduce(
    (acc, i) => acc + round2((shares[i]?.amountDue || 0) - (shares[i]?.amountPaid || 0)),
    0
  );
  const selectedCount = selectedShares.filter((i) => !shares[i]?.isPaid).length;
  /** totale in contante delle quote selezionate (per il resto) */
  const selectedCash = selectedCashTotal(shares, selectedShares);

  const targetAmount = currentShare
    ? round2(currentShare.amountDue - currentShare.amountPaid)
    : selectedShares.length > 0
    ? round2(selectedSum)
    : due;

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

    // ── tavolo → registra il pagamento sul tavolo (può essere parziale) ──
    //
    // 👥 SUDDIVISIONE DEL PAGAMENTO:
    //   • una quota singola  → un pagamento
    //   • più quote selezionate ("paga per conto di") → il pagamento viene
    //     distribuito sulle quote e, se i metodi sono diversi, si registrano
    //     più pagamenti (uno per metodo) con il resto calcolato sul contante.
    // 👥 È una divisione del conto? (una quota attiva o più persone scelte)
    const isSplitTarget = !!currentShare || selectedShares.length > 0;
    const targetIndexes = currentShare
      ? [activeShare as number]
      : selectedShares.filter((i) => !shares[i]?.isPaid);

    // distribuisce l'importo sulle quote (in ordine, fino al dovuto)
    const allocations = isSplitTarget
      ? allocatePayment(shares, targetIndexes, value)
      : [];

    if (isSplitTarget && !allocations.length) {
      setError('Nessuna quota da incassare.');
      setBusy(false);
      return;
    }

    // raggruppa per metodo di pagamento
    // (nel pagamento unico c'è un solo gruppo, con il metodo scelto)
    const groups = isSplitTarget
      ? groupAllocationsByMethod(allocations)
      : [{ method, amount: value, indexes: [] as number[] }];

    // 💵 Il contante ricevuto copre l'importo richiesto: il resto (se c'è)
    //    viene dato indietro e registrato sul pagamento in contanti.
    const cashGroup = groups.find((g) => g.method === 'contanti');
    const cashTotal = cashGroup ? cashGroup.amount : 0;
    const change = method === 'contanti' ? computeChange(given, value) : 0;
    // il contante registrato = la quota contante + il resto restituito
    const cashRecorded = isSplitTarget
      ? round2(cashTotal + change)
      : given;

    let lastMessage = '';
    for (const g of groups) {
      const res = addTablePayment({
        tableId: table!.id,
        amount: g.amount,
        method: g.method,
        cashGiven: g.method === 'contanti' ? cashRecorded || undefined : undefined,
        note:
          note ||
          (g.indexes.length > 1
            ? `Per conto di ${g.indexes
                .map((i) => shares[i]?.personLabel)
                .filter(Boolean)
                .join(', ')}`
            : undefined),
        splitLabel:
          g.indexes.length === 1
            ? shares[g.indexes[0]]?.personLabel
            : g.indexes.map((i) => shares[i]?.personLabel).filter(Boolean).join(' + '),
      });

      if (!res.success) {
        setError(res.message || 'Pagamento non riuscito.');
        setBusy(false);
        return;
      }
      lastMessage = `Pagamento di ${euro(g.amount)} € (${g.method}) registrato.`;
    }

    setBusy(false);

    setInfo(
      change > 0
        ? `${lastMessage} Resto da restituire: ${euro(change)} €`
        : lastMessage || 'Pagamento registrato.'
    );

    // aggiorna le quote interessate
    if (allocations.length) {
      setShares((prev) =>
        prev.map((sh, i) => {
          const alloc = allocations.find((a) => a.index === i);
          if (!alloc) return sh;
          const paid = round2(sh.amountPaid + alloc.amount);
          const allocChange = alloc.method === 'contanti' ? change : 0;
          return {
            ...sh,
            amountPaid: paid,
            method: alloc.method,
            cashGiven:
              alloc.method === 'contanti'
                ? round2((sh.cashGiven || 0) + cashRecorded)
                : undefined,
            changeReturned: round2(sh.changeReturned + allocChange),
            isPaid: paid >= sh.amountDue - 0.009,
          };
        })
      );
      setActiveShare(null);
      setSelectedShares([]);
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
            {/* 📝 Totale da dividere: l'utente scrive l'importo e l'app
                lo distribuisce automaticamente sulle persone. */}
            <Field
              label="Totale da dividere"
              hint="Scrivi l'importo da spartire: viene diviso in automatico."
            >
              <div className="relative">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={splitTotalInput}
                  onChange={(e) => setSplitTotalInput(e.target.value)}
                  className="!pr-10 tnum"
                  placeholder={due > 0 ? due.toFixed(2) : '0.00'}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-mist-500">
                  €
                </span>
              </div>
            </Field>

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
                const checked = selectedShares.includes(i);
                const shareMethod = s.method === 'carta' ? 'carta' : 'contanti';
                return (
                  <div
                    key={s.id}
                    className={`rounded-xl border px-3 py-2.5 transition ${
                      done
                        ? 'border-mint-400/40 bg-mint-600/15'
                        : active
                        ? 'border-brand-500/50 bg-brand-500/10'
                        : checked
                        ? 'border-violet-400/40 bg-violet-400/10'
                        : 'border-ink-700 bg-ink-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* ☑️ selezione multipla (pagare per conto di più persone) */}
                      {!done && (
                        <button
                          type="button"
                          aria-label={`Seleziona ${s.personLabel}`}
                          onClick={() =>
                            setSelectedShares((prev) =>
                              prev.includes(i)
                                ? prev.filter((x) => x !== i)
                                : [...prev, i]
                            )
                          }
                          className={`h-5 w-5 shrink-0 rounded-md border flex items-center justify-center transition ${
                            checked
                              ? 'bg-violet-400 border-violet-400 text-ink-950'
                              : 'border-ink-600 bg-ink-850 text-transparent hover:border-violet-400/60'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        </button>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-mist-100">
                            {s.personLabel}
                          </span>
                          {done && <Badge tone="mint">✓ Pagato</Badge>}
                          {!done && s.amountPaid > 0 && (
                            <Badge tone="amber">parziale</Badge>
                          )}
                          {checked && !done && (
                            <Badge tone="neutral">selezionato</Badge>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 flex-wrap">
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
                          {!done && s.amountPaid === 0 && (
                            <span className="text-[10px] text-mist-500">
                              deve {euro(s.amountDue)} €
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
                        <Check className="w-4 h-4 text-mint-400 shrink-0" />
                      ) : (
                        <button
                          onClick={() => {
                            setActiveShare(active ? null : i);
                            setSelectedShares([]);
                            setError('');
                          }}
                          className={`btn-sm rounded-lg px-3 py-1.5 text-[11px] font-bold transition shrink-0 ${
                            active
                              ? 'bg-brand-500 text-ink-950'
                              : 'bg-ink-800 text-mist-300 border border-ink-600 hover:border-brand-500/40 hover:text-brand-300'
                          }`}
                        >
                          {active ? 'Annulla' : 'Paga'}
                        </button>
                      )}
                    </div>

                    {/* 💳 metodo di pagamento della persona */}
                    {!done && (
                      <div className="mt-2 flex items-center gap-1.5 border-t border-ink-700/70 pt-2">
                        <span className="text-[10px] uppercase tracking-wide text-mist-500 mr-1">
                          Paga con
                        </span>
                        {(['contanti', 'carta'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() =>
                              setShares((prev) =>
                                prev.map((pp, k) =>
                                  k === i ? { ...pp, method: m } : pp
                                )
                              )
                            }
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase transition ${
                              shareMethod === m
                                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                                : 'bg-ink-850 text-mist-500 border border-ink-700 hover:text-mist-300'
                            }`}
                          >
                            {m === 'contanti' ? 'Contanti' : 'Carta'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 🧾 Riepilogo + pagamento per conto di più persone */}
            <div className="rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-mist-400">Quote saldate</span>
                <span className="font-bold text-mist-200">
                  {paidShares}/{shares.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-mist-400">Restano da incassare</span>
                <span
                  className={`font-bold tnum ${
                    remaining > 0.009 ? 'text-brand-300' : 'text-mint-400'
                  }`}
                >
                  {euro(remaining)} €
                </span>
              </div>

              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveShare(null);
                    setError('');
                    setInfo(
                      `Puoi incassare per conto di ${selectedCount} ${
                        selectedCount === 1 ? 'persona' : 'persone'
                      }: totale ${euro(round2(selectedSum))} €.`
                    );
                  }}
                  className="w-full rounded-lg bg-violet-400/15 border border-violet-400/40 px-3 py-2 text-[11px] font-bold text-violet-400 transition hover:bg-violet-400/25"
                >
                  Paga per conto di {selectedCount}{' '}
                  {selectedCount === 1 ? 'persona' : 'persone'} ·{' '}
                  {euro(round2(selectedSum))} €
                </button>
              )}
            </div>            <div className="flex items-center justify-between text-[11px] text-mist-500">
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
        {(mode === 'singolo' || currentShare || selectedShares.length > 0) && (
          <div className="surface-raised p-3.5 space-y-3">
            {currentShare && (
              <div className="flex items-center justify-between rounded-lg bg-brand-500/10 border border-brand-500/30 px-3 py-2">
                <span className="text-xs font-bold text-brand-300">
                  Pagamento per {currentShare.personLabel}
                </span>
                <Amount value={targetAmount} size="sm" />
              </div>
            )}

            {!currentShare && selectedShares.length > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-violet-400/10 border border-violet-400/30 px-3 py-2">
                <span className="text-xs font-bold text-violet-400">
                  Pagamento per conto di {selectedCount}{' '}
                  {selectedCount === 1 ? 'persona' : 'persone'}
                </span>
                <Amount value={targetAmount} size="sm" />
              </div>
            )}

            {selectedShares.length > 0 && (
              <p className="text-[11px] leading-relaxed text-mist-400">
                💳 Il metodo è quello impostato su ogni persona
                {selectedCash > 0
                  ? ` · contante per ${euro(selectedCash)} €`
                  : ' · tutto con carta'}
                .
              </p>
            )}

            {selectedShares.length === 0 && (
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
            )}

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

              {(method === 'contanti' || selectedCash > 0) && (
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

            {(method === 'contanti' || selectedCash > 0) && cashPresets.length > 0 && (
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

            {(method === 'contanti' || selectedCash > 0) &&
              Number(cashGiven) >
                (selectedShares.length > 0 ? selectedCash : targetAmount) && (
                <div className="rounded-lg bg-amber-600/15 border border-amber-400/30 px-3 py-2 text-xs font-bold text-amber-400">
                  Resto da restituire:{' '}
                  {euro(
                    round2(
                      Number(cashGiven) -
                        (selectedShares.length > 0 ? selectedCash : targetAmount)
                    )
                  )}{' '}
                  €
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
              {currentShare
                ? `Registra pagamento ${currentShare.personLabel}`
                : selectedShares.length > 0
                ? `Registra pagamento per ${selectedCount} ${
                    selectedCount === 1 ? 'persona' : 'persone'
                  }`
                : 'Registra pagamento'}
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
