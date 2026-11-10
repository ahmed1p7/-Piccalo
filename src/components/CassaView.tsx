import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Banknote,
  Calculator,
  CheckCircle2,
  CreditCard,
  Delete,
  DollarSign,
  Grid,
  Percent,
  Plus,
  Printer,
  Receipt as ReceiptIcon,
  RotateCcw,
  Split,
  Trash2,
  User,
  Users,
  Utensils,
  Wallet,
} from 'lucide-react';
import {
  OrderItem,
  PaymentMethod,
  PaymentSplitRecord,
  Receipt,
  RestaurantTable,
} from '../types';
import { ReceiptPrintModal } from './ReceiptPrintModal';
import { PaymentModal } from './PaymentModal';
import { Amount, Badge, Btn, Card, Field, Input, Select, euro } from './ui';

export const CassaView: React.FC = () => {
  const {
    tables,
    selectedTableForCheckout,
    setSelectedTableForCheckout,
    updateTableBillAmount,
    inventory,
    closeBillAndGenerateReceipt,
    currentUser,
  } = useApp();

  // Mode: manual direct amount OR itemized bill
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(
    selectedTableForCheckout || null
  );

  const [billItems, setBillItems] = useState<OrderItem[]>([]);
  const [manualTotalInput, setManualTotalInput] = useState<string>(() => {
    const amt = typeof selectedTableForCheckout?.billAmount === 'number' ? selectedTableForCheckout.billAmount : 0;
    return amt > 0 ? amt.toFixed(2) : '';
  });
  const [coversCount, setCoversCount] = useState<number>(2);
  const [notes, setNotes] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('contanti');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [cardPaid, setCardPaid] = useState<string>('');

  // Split bill mode
  const [isSplitMode, setIsSplitMode] = useState<boolean>(false);
  const [splitPeopleCount, setSplitPeopleCount] = useState<number>(2);
  const [splitRecords, setSplitRecords] = useState<PaymentSplitRecord[]>([]);

  // Last generated receipt for printing
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);

  // Sync when table is selected from context
  useEffect(() => {
    if (selectedTableForCheckout) {
      setSelectedTable(selectedTableForCheckout);
      setCoversCount(selectedTableForCheckout.coversCount || 2);
      const amt = typeof selectedTableForCheckout.billAmount === 'number' ? selectedTableForCheckout.billAmount : 0;
      if (amt > 0) {
        setManualTotalInput(amt.toFixed(2));
      }
    }
  }, [selectedTableForCheckout]);

  // Load table items when table changes
  const handleSelectTable = (tbl: RestaurantTable) => {
    setSelectedTable(tbl);
    setSelectedTableForCheckout(tbl);
    setCoversCount(tbl.coversCount || 2);
    const amt = typeof tbl.billAmount === 'number' ? tbl.billAmount : 0;
    setManualTotalInput(amt > 0 ? amt.toFixed(2) : '');
    setCashGiven('');
    setCardPaid('');
    setIsSplitMode(false);
  };

  // Switch to direct quick sale (no table)
  const handleQuickSale = () => {
    setSelectedTable(null);
    setSelectedTableForCheckout(null);
    setBillItems([]);
    setManualTotalInput('');
    setCashGiven('');
    setCardPaid('');
    setIsSplitMode(false);
  };

  // Calculate bill total
  const rawTotal = useMemo(() => {
    if (manualTotalInput !== '') {
      return Math.max(0, parseFloat(manualTotalInput) || 0);
    }
    return billItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [manualTotalInput, billItems]);

  const discountAmount = useMemo(() => {
    return (rawTotal * discountPercent) / 100;
  }, [rawTotal, discountPercent]);

  const finalTotal = useMemo(() => {
    return Math.max(0, rawTotal - discountAmount);
  }, [rawTotal, discountAmount]);

  // Quick products catalogue for fast 1-tap addition
  const quickProducts = useMemo(() => {
    return inventory.filter(
      (item) => item.type === 'prodotto' && item.sellPrice !== undefined
    );
  }, [inventory]);

  const handleAddQuickProduct = (product: (typeof quickProducts)[0]) => {
    if (manualTotalInput !== '') {
      setManualTotalInput('');
    }
    setBillItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: `ord_${Date.now()}`,
          productId: product.id,
          name: product.name,
          price: product.sellPrice || 0,
          quantity: 1,
          destination: 'cassa',
          status: 'servito',
          addedAt: new Date().toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ];
    });
  };

  const handleUpdateItemQuantity = (index: number, delta: number) => {
    setBillItems((prev) => {
      const copy = [...prev];
      const target = copy[index];
      const newQty = target.quantity + delta;
      if (newQty <= 0) {
        return copy.filter((_, i) => i !== index);
      }
      copy[index] = { ...target, quantity: newQty };
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setBillItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Initialize or update split records
  useEffect(() => {
    if (isSplitMode && finalTotal > 0) {
      const quota = Number((finalTotal / splitPeopleCount).toFixed(2));
      const newSplits: PaymentSplitRecord[] = [];
      for (let i = 1; i <= splitPeopleCount; i++) {
        // preserve already paid records if count changed
        const existing = splitRecords.find((s) => s.personLabel === `Persona ${i}`);
        if (existing) {
          newSplits.push(existing);
        } else {
          newSplits.push({
            id: `split_${i}`,
            personLabel: `Persona ${i}`,
            amountDue: quota,
            amountPaid: 0,
            method: 'contanti',
            cashGiven: 0,
            changeReturned: 0,
            isPaid: false,
          });
        }
      }
      setSplitRecords(newSplits);
    }
  }, [isSplitMode, splitPeopleCount, finalTotal]);

  // Payment Calculation
  const cashNum = parseFloat(cashGiven) || 0;
  const cardNum = parseFloat(cardPaid) || 0;

  let totalReceived = 0;
  if (paymentMethod === 'contanti') {
    totalReceived = cashNum;
  } else if (paymentMethod === 'carta') {
    totalReceived = cardNum > 0 ? cardNum : finalTotal;
  } else if (paymentMethod === 'misto') {
    totalReceived = cashNum + cardNum;
  }

  const changeAmount = totalReceived > finalTotal ? totalReceived - finalTotal : 0;
  const missingAmount = totalReceived < finalTotal ? finalTotal - totalReceived : 0;
  const isFullyPaid = finalTotal > 0 && totalReceived >= finalTotal;

  // Preset cash shortcuts
  const handleCashPreset = (amount: number) => {
    setPaymentMethod('contanti');
    setCashGiven(amount.toFixed(2));
  };

  const handleExactCash = () => {
    setPaymentMethod('contanti');
    setCashGiven(finalTotal.toFixed(2));
  };

  // Close bill and print
  const handleCloseBill = () => {
    if (finalTotal <= 0) return;

    let effCash = 0;
    let effCard = 0;

    if (paymentMethod === 'contanti') {
      effCash = finalTotal;
    } else if (paymentMethod === 'carta') {
      effCard = finalTotal;
    } else {
      effCash = Math.min(cashNum, finalTotal);
      effCard = Math.max(0, finalTotal - effCash);
    }

    const receipt = closeBillAndGenerateReceipt({
      tableId: selectedTable?.id,
      tableName: selectedTable?.name || 'Vendita Rapida Banco',
      coversCount,
      items:
        billItems.length > 0
          ? billItems
          : [
              {
                id: `quick_item_${Date.now()}`,
                name: 'Conto Generale / Consumazione',
                price: finalTotal,
                quantity: 1,
                destination: 'cassa',
                status: 'servito',
                addedAt: new Date().toLocaleTimeString('it-IT', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              },
            ],
      totalAmount: finalTotal,
      paymentMethod,
      cashAmount: effCash,
      cardAmount: effCard,
      changeGiven: changeAmount,
      splitDetails: isSplitMode ? splitRecords : undefined,
      notes,
    });

    setLastReceipt(receipt);
    setShowSuccessToast(true);

    // Reset cassa
    handleQuickSale();
  };

  // Handle Split Individual Payment
  const handleUpdateSplitPerson = (
    index: number,
    paid: number,
    method: PaymentMethod,
    givenCash?: number
  ) => {
    setSplitRecords((prev) => {
      const copy = [...prev];
      const person = copy[index];
      const change = (givenCash || 0) > person.amountDue ? (givenCash || 0) - person.amountDue : 0;
      copy[index] = {
        ...person,
        amountPaid: paid,
        method,
        cashGiven: givenCash,
        changeReturned: change,
        isPaid: paid >= person.amountDue,
      };
      return copy;
    });
  };

  const allSplitsPaid =
    isSplitMode &&
    splitRecords.length > 0 &&
    splitRecords.every((r) => r.isPaid);

  return (
<<<<<<< HEAD
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-6 animate-fadeIn">
      {/* Toast notification on successful payment */}
      {showSuccessToast && lastReceipt && (
        <div className="fixed top-20 right-4 z-50 p-4 rounded-2xl bg-emerald-900/90 border border-emerald-500 text-white shadow-2xl flex items-center gap-3 animate-slideIn">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          <div>
            <div className="font-bold text-sm">Conto Chiuso con Successo!</div>
            <div className="text-xs text-emerald-200">
              {lastReceipt.receiptNumber} • {lastReceipt.totalAmount.toFixed(2)} € (
              {lastReceipt.paymentMethod})
            </div>
          </div>
          <button
            onClick={() => setShowSuccessToast(false)}
            className="text-xs font-bold px-2 py-1 bg-emerald-800 rounded-lg hover:bg-emerald-700 ml-2"
          >
            OK
          </button>
        </div>
      )}

      {/* Header bar: Table selection & Quick Sale */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              Punto Cassa &amp; Gestione Conto
            </h2>
            <p className="text-xs text-neutral-400">
              {selectedTable ? (
                <span className="text-amber-400 font-semibold">
                  Conto attivo: {selectedTable.name} ({selectedTable.coversCount} coperti)
                </span>
              ) : (
                'Modalità Vendita Rapida / Inserimento Libero'
              )}
            </p>
          </div>
        </div>

        {/* Quick Table Switcher Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
          <button
            onClick={handleQuickSale}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              !selectedTable
                ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20'
                : 'bg-neutral-800 text-neutral-300 hover:text-white'
            }`}
          >
            ⚡ Rapido Banco
          </button>

          {tables
            .filter((t) => t.status === 'occupato' || t.status === 'in_conto' || (typeof t.billAmount === 'number' && t.billAmount > 0))
            .map((tbl) => {
              const isSelected = selectedTable?.id === tbl.id;
              const tableTotal = tbl.billAmount || 0;
              return (
                <button
                  key={tbl.id}
                  onClick={() => handleSelectTable(tbl)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:border-neutral-600'
                  }`}
                >
                  <Grid className="w-3 h-3" />
                  <span>{tbl.name}</span>
                  <span className="text-[10px] font-black opacity-80">
                    ({tableTotal.toFixed(2)} €)
                  </span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Main POS Layout: Left Column (Bill Total & Adjustments) | Right Column (Payment, Split & Resto) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Bill Details & Quick Amount Controls */}
        <div className="lg:col-span-5 space-y-4">
          {/* Bill Total Input card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <ReceiptIcon className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Conto del Tavolo / Asporto</h3>
              </div>
              {selectedTable && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                  {selectedTable.name}
                </span>
              )}
=======
    <div className="min-h-screen bg-ink-950 text-mist-100 animate-fadeIn">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-6">
        {/* Toast notification on successful payment */}
        {showSuccessToast && lastReceipt && (
          <div className="fixed top-20 inset-x-3 sm:inset-x-auto sm:right-4 z-50 flex items-center gap-3 rounded-2xl border border-mint-400/40 bg-ink-850 px-4 py-3 shadow-2xl animate-slideUp">
            <CheckCircle2 className="w-6 h-6 shrink-0 text-mint-400" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-mist-100">Conto Chiuso con Successo!</div>
              <div className="text-xs text-mist-500">
                {lastReceipt.receiptNumber} •{' '}
                <Amount
                  value={lastReceipt.totalAmount}
                  size="sm"
                  className="!text-xs"
                />{' '}
                ({lastReceipt.paymentMethod})
              </div>
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
            </div>
            <Btn
              variant="soft"
              size="sm"
              onClick={() => setShowSuccessToast(false)}
              className="ml-auto shrink-0"
            >
              OK
            </Btn>
          </div>
        )}

<<<<<<< HEAD
            {/* Quick manual direct amount input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                <span>Importo Totale Conto (€):</span>
=======
        {/* Header bar: Table selection & Quick Sale */}
        <Card className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-500/25 bg-brand-500/15 text-brand-300">
              <Calculator className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-mist-100">
                Punto Cassa &amp; Gestione Conto
              </h2>
              <p className="mt-0.5 text-xs text-mist-500">
                {selectedTable ? (
                  <span className="text-amber-400 font-semibold">
                    Conto attivo: {selectedTable.name} ({selectedTable.coversCount} coperti)
                  </span>
                ) : (
                  'Modalità Vendita Rapida / Inserimento Libero'
                )}
              </p>
            </div>
          </div>

          {/* Quick Table Switcher Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none max-w-full pb-1">
            <Btn
              variant={!selectedTable ? 'primary' : 'soft'}
              size="sm"
              onClick={handleQuickSale}
              className="shrink-0 whitespace-nowrap"
            >
              ⚡ Rapido Banco
            </Btn>

            {tables
              .filter((t) => t.status === 'occupato' || t.status === 'in_conto' || (typeof t.billAmount === 'number' && t.billAmount > 0))
              .map((tbl) => {
                const isSelected = selectedTable?.id === tbl.id;
                const tableTotal = tbl.billAmount || 0;
                return (
                  <Btn
                    key={tbl.id}
                    variant={isSelected ? 'primary' : 'soft'}
                    size="sm"
                    onClick={() => handleSelectTable(tbl)}
                    className="shrink-0 whitespace-nowrap"
                  >
                    <Grid className="w-3 h-3" />
                    <span>{tbl.name}</span>
                    <span className="text-[10px] font-bold opacity-80 tnum">
                      ({euro(tableTotal)} €)
                    </span>
                  </Btn>
                );
              })}
          </div>
        </Card>

        {/* Main POS Layout: Left Column (Bill Total & Adjustments) | Right Column (Payment, Split & Resto) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Left Column (5 cols): Bill Details & Quick Amount Controls */}
          <div className="lg:col-span-5 space-y-4">
            {/* Bill Total Input card */}
            <Card className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-ink-700">
                <div className="flex items-center gap-2">
                  <ReceiptIcon className="w-4 h-4 text-brand-300" />
                  <h3 className="text-sm font-bold text-mist-100">
                    Conto del Tavolo / Asporto
                  </h3>
                </div>
                {selectedTable && <Badge tone="brand">{selectedTable.name}</Badge>}
              </div>

              {/* Quick manual direct amount input */}
              <Field label="Importo Totale Conto (€):">
                <div className="relative">
                  <Input
                    type="number"
                    step="0.50"
                    min="0"
                    placeholder="0.00"
                    value={manualTotalInput}
                    onChange={(e) => setManualTotalInput(e.target.value)}
                    className="!pl-4 !pr-12 !py-3.5 !text-3xl font-mono font-bold tnum text-amber-400"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-mist-500 font-bold text-xl">
                    €
                  </span>
                </div>
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                {selectedTable && (
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const amt = parseFloat(manualTotalInput) || 0;
                      updateTableBillAmount(selectedTable.id, amt);
                    }}
<<<<<<< HEAD
                    className="text-amber-400 hover:text-amber-300 text-xs font-bold underline"
=======
                    className="mt-1 !px-0 !py-0 text-brand-300 hover:text-brand-400 underline"
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                  >
                    Salva importo sul Tavolo
                  </Btn>
                )}
<<<<<<< HEAD
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  placeholder="0.00"
                  value={manualTotalInput}
                  onChange={(e) => setManualTotalInput(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-2xl px-4 py-3.5 text-3xl font-black text-amber-400 font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-4 top-4 text-neutral-400 font-bold text-xl">€</span>
              </div>
            </div>

            {/* Quick preset increments for bill total */}
            <div className="space-y-1">
              <span className="text-[11px] text-neutral-400 font-semibold">
                Aggiunte Rapide al Conto:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[5, 10, 20, 50].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(manualTotalInput) || 0;
                      setManualTotalInput((cur + val).toFixed(2));
                    }}
                    className="py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold border border-neutral-700 transition-all active:scale-95"
                  >
                    +{val} €
                  </button>
                ))}
              </div>
            </div>

            {/* Discount and Covers controls */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-800/80">
              <div>
                <label className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1">
                  <Percent className="w-3 h-3" /> Sconto %
                </label>
                <div className="flex gap-1 mt-1">
                  {[0, 5, 10, 15].map((pct) => (
=======
              </Field>

              {/* Quick preset increments for bill total */}
              <div className="space-y-1.5">
                <span className="section-title">Aggiunte Rapide al Conto:</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[5, 10, 20, 50].map((val) => (
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                    <button
                      key={val}
                      type="button"
<<<<<<< HEAD
                      onClick={() => setDiscountPercent(pct)}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition-colors ${
                        discountPercent === pct
                          ? 'bg-amber-500 text-neutral-950'
                          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      }`}
=======
                      onClick={() => {
                        const cur = parseFloat(manualTotalInput) || 0;
                        setManualTotalInput((cur + val).toFixed(2));
                      }}
                      className="w-full rounded-lg border border-ink-600 bg-ink-800 px-2 py-2 text-xs font-bold tnum text-mist-300 transition hover:border-brand-500/40 hover:text-brand-300 active:scale-95"
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                    >
                      +{val} €
                    </button>
                  ))}
                </div>
              </div>

<<<<<<< HEAD
              <div>
                <label className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Coperti
                </label>
                <div className="flex items-center gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => setCoversCount((c) => Math.max(1, c - 1))}
                    className="w-8 py-1 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 font-bold text-xs"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-bold text-white text-xs">
                    {coversCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCoversCount((c) => c + 1)}
                    className="w-8 py-1 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Subtotal calculation row */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Subtotale Conto:</span>
                <span className="font-mono">{rawTotal.toFixed(2)} €</span>
              </div>
              {discountPercent > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>Sconto applicato ({discountPercent}%):</span>
                  <span className="font-mono">-{discountAmount.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-white pt-1 border-t border-neutral-800">
                <span>TOTALE DA INCASSARE:</span>
                <span className="text-amber-400 text-2xl font-mono">{finalTotal.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Payment Method, Split Bill, and Accurate Resto Calculation */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-6">
            {/* Split Bill Toggle & Mode */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-white text-base">Modalità di Pagamento</h3>
              </div>

              {/* Split bill button */}
              <button
                onClick={() => setIsSplitMode(!isSplitMode)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  isSplitMode
                    ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white hover:bg-neutral-700'
                }`}
              >
                <Split className="w-4 h-4" />
                <span>{isSplitMode ? 'Dividi Attivo ✓' : 'Dividi Conto'}</span>
              </button>
            </div>

            {/* REGULAR BILL PAYMENT (Non-split mode) */}
            {!isSplitMode && (
              <div className="space-y-6">
                {/* 3 Payment Methods: Contanti, Carta, Misto */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      setPaymentMethod('contanti');
                      setCardPaid('');
                    }}
                    className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === 'contanti'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <Banknote className="w-6 h-6" />
                    <span className="text-xs uppercase tracking-wider">Contanti</span>
                  </button>

                  <button
                    onClick={() => {
                      setPaymentMethod('carta');
                      setCashGiven('');
                      setCardPaid(finalTotal.toFixed(2));
                    }}
                    className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === 'carta'
                        ? 'bg-blue-950/60 border-blue-500 text-blue-300 ring-2 ring-blue-500/30 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <CreditCard className="w-6 h-6" />
                    <span className="text-xs uppercase tracking-wider">Carta / POS</span>
                  </button>

                  <button
                    onClick={() => {
                      setPaymentMethod('misto');
                    }}
                    className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === 'misto'
                        ? 'bg-purple-950/60 border-purple-500 text-purple-300 ring-2 ring-purple-500/30 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <Split className="w-6 h-6" />
                    <span className="text-xs uppercase tracking-wider">Misto (Cash+POS)</span>
                  </button>
                </div>

                {/* Amount inputs depending on payment method */}
                {paymentMethod === 'contanti' && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-neutral-300">
                          Importo Contanti Ricevuto dal Cliente (€):
                        </span>
                        <button
                          onClick={handleExactCash}
                          className="text-amber-400 hover:text-amber-300 font-bold text-xs"
                        >
                          Importo Esatto ({finalTotal.toFixed(2)} €)
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={cashGiven}
                          onChange={(e) => setCashGiven(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-700 rounded-2xl px-4 py-3.5 text-2xl font-black text-white focus:outline-none focus:border-emerald-500"
                        />
                        <span className="absolute right-4 top-4 text-neutral-400 font-bold text-lg">
                          €
                        </span>
                      </div>
                    </div>

                    {/* Quick Cash Presets (5, 10, 20, 50, 100) */}
                    <div className="space-y-1">
                      <span className="text-[11px] text-neutral-400 font-semibold">
                        Tagli Banconote Rapidi:
                      </span>
                      <div className="grid grid-cols-5 gap-2">
                        {[5, 10, 20, 50, 100].map((val) => (
                          <button
                            key={val}
                            onClick={() => handleCashPreset(val)}
                            className="py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-bold text-sm transition-all active:scale-95 shadow"
                          >
                            {val} €
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'carta' && (
                  <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-blue-300 font-semibold">
                        Pagamento Elettronico POS / Bancomat
                      </span>
                      <span className="text-sm font-black text-blue-400">
                        {finalTotal.toFixed(2)} €
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Inserisci o passa la carta sul terminale POS. Una volta approvata la
                      transazione, premi Chiudi Conto.
                    </p>
                  </div>
                )}

                {paymentMethod === 'misto' && (
                  <div className="space-y-3 p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30">
                    <div className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                      Pagamento Misto (es. 30€ Contanti + 20€ Carta)
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-neutral-300 font-semibold">
                          Quota Contanti (€):
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={cashGiven}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCashGiven(val);
                            const parsed = parseFloat(val) || 0;
                            if (parsed < finalTotal) {
                              setCardPaid((finalTotal - parsed).toFixed(2));
                            }
                          }}
                          className="w-full mt-1 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-lg font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-neutral-300 font-semibold">
                          Quota Carta POS (€):
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={cardPaid}
                          onChange={(e) => setCardPaid(e.target.value)}
                          className="w-full mt-1 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-lg font-bold text-blue-400 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ACCURATE RESTO / MANCANTE DISPLAY (Requested by User) */}
                <div className="p-5 rounded-3xl bg-neutral-950 border-2 border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-neutral-400 font-medium">
                    <span>Riepilogo Calcolo Cassa:</span>
                    <span>
                      Ricevuto:{' '}
                      <strong className="text-white">{totalReceived.toFixed(2)} €</strong> su{' '}
                      <strong className="text-amber-400">{finalTotal.toFixed(2)} €</strong>
                    </span>
                  </div>

                  {/* Resto Box (Big Bright Green) */}
                  {changeAmount > 0 && (
                    <div className="p-4 rounded-2xl bg-emerald-950/70 border-2 border-emerald-500 text-emerald-200 flex items-center justify-between shadow-lg shadow-emerald-950/50">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                          RESTO DA DARE AL CLIENTE:
                        </div>
                        <div className="text-xs text-emerald-400/80">
                          Consegna banconote / monete
                        </div>
                      </div>
                      <div className="text-4xl font-black text-emerald-400 tracking-tight">
                        {changeAmount.toFixed(2)} €
                      </div>
                    </div>
                  )}

                  {/* Mancante Box (Amber/Red) */}
                  {missingAmount > 0 && totalReceived > 0 && (
                    <div className="p-4 rounded-2xl bg-rose-950/60 border-2 border-rose-500 text-rose-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-rose-300">
                          MANCANTE (DA INCASSARE):
                        </div>
                        <div className="text-xs text-rose-400/80">
                          Importo parziale non ancora saldato
                        </div>
                      </div>
                      <div className="text-3xl font-black text-rose-400">
                        {missingAmount.toFixed(2)} €
                      </div>
                    </div>
                  )}

                  {/* Esatto / Pagato */}
                  {totalReceived === finalTotal && finalTotal > 0 && (
                    <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Importo Esatto Saldato
                      </span>
                      <span>Resto: 0,00 €</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SPLIT BILL VIEW (Alla Romana / Diviso per persone) */}
            {isSplitMode && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white">Divisione del Conto</div>
                    <div className="text-[11px] text-neutral-400">
                      Totale: {finalTotal.toFixed(2)} € • Quota per persona:{' '}
                      <strong className="text-amber-400">
                        {(finalTotal / splitPeopleCount).toFixed(2)} €
                      </strong>
                    </div>
                  </div>

                  {/* Number of people selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400 font-semibold">Persone:</span>
                    <div className="flex items-center gap-1 bg-neutral-800 p-1 rounded-xl">
                      <button
                        onClick={() => setSplitPeopleCount((c) => Math.max(2, c - 1))}
                        className="w-7 h-7 rounded-lg bg-neutral-700 text-white font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold text-white text-sm">
                        {splitPeopleCount}
                      </span>
                      <button
                        onClick={() => setSplitPeopleCount((c) => c + 1)}
                        className="w-7 h-7 rounded-lg bg-neutral-700 text-white font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Person Payment Cards */}
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {splitRecords.map((person, idx) => {
                    return (
                      <div
                        key={person.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          person.isPaid
                            ? 'bg-emerald-950/40 border-emerald-500/50'
                            : 'bg-neutral-950 border-neutral-800'
=======
              {/* Discount and Covers controls */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-ink-700">
                <div>
                  <span className="label mb-1 flex items-center gap-1">
                    <Percent className="w-3 h-3" /> Sconto %
                  </span>
                  <div className="flex gap-1 mt-1">
                    {[0, 5, 10, 15].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setDiscountPercent(pct)}
                        className={`flex-1 rounded-lg px-1 py-1.5 text-xs font-bold transition-colors ${
                          discountPercent === pct
                            ? 'bg-amber-600 text-ink-950'
                            : 'bg-ink-800 text-mist-300 hover:bg-ink-700 border border-ink-600'
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

<<<<<<< HEAD
                        <div className="flex items-center gap-2">
                          {/* Method selection */}
                          <select
                            value={person.method}
                            onChange={(e) =>
                              handleUpdateSplitPerson(
                                idx,
                                person.amountPaid,
                                e.target.value as PaymentMethod,
                                person.cashGiven
                              )
                            }
                            className="bg-neutral-800 border border-neutral-700 text-white text-xs rounded-xl px-2 py-1.5 focus:outline-none"
                          >
                            <option value="contanti">Contanti</option>
                            <option value="carta">Carta POS</option>
                          </select>

                          {/* Cash Given input */}
                          <input
                            type="number"
                            step="0.5"
                            placeholder="Dato (€)"
                            value={person.cashGiven || ''}
                            onChange={(e) => {
                              const given = parseFloat(e.target.value) || 0;
                              handleUpdateSplitPerson(
                                idx,
                                Math.min(given, person.amountDue),
                                person.method,
                                given
                              );
                            }}
                            className="w-24 bg-neutral-800 border border-neutral-700 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
                          />

                          {/* Mark Paid Quick Button */}
                          <button
                            onClick={() =>
                              handleUpdateSplitPerson(
                                idx,
                                person.amountDue,
                                person.method,
                                person.amountDue
                              )
                            }
                            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                              person.isPaid
                                ? 'bg-emerald-600 text-white'
                                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                            }`}
                          >
                            {person.isPaid ? 'Pagato ✓' : 'Salda Quota'}
                          </button>
                        </div>

                        {/* Individual change calculation */}
                        {person.changeReturned > 0 && (
                          <div className="text-[11px] font-bold text-emerald-400 mt-1.5 text-right">
                            Resto per {person.personLabel}: {person.changeReturned.toFixed(2)} €
                          </div>
                        )}
                      </div>
                    );
                  })}
=======
                <div>
                  <span className="label mb-1 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Coperti
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => setCoversCount((c) => Math.max(1, c - 1))}
                      className="btn-soft btn-sm !px-2"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center text-xs font-bold tnum text-mist-100">
                      {coversCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCoversCount((c) => c + 1)}
                      className="btn-soft btn-sm !px-2"
                    >
                      +
                    </button>
                  </div>
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                </div>
              </div>

<<<<<<< HEAD
            {/* ACTION BUTTONS: Chiudi Conto & Stampa */}
            <div className="pt-2 border-t border-neutral-800 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleCloseBill}
                disabled={finalTotal <= 0}
                className="w-full sm:flex-1 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 font-black text-base shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Chiudi Conto ({finalTotal.toFixed(2)} €)</span>
              </button>
=======
              {/* Subtotal calculation row */}
              <div className="rounded-2xl border border-ink-700 bg-ink-900 p-3.5 space-y-1 text-xs">
                <div className="flex justify-between text-mist-500">
                  <span>Subtotale Conto:</span>
                  <span className="tnum text-mist-300">{euro(rawTotal)} €</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Sconto applicato ({discountPercent}%):</span>
                    <span className="tnum">-{euro(discountAmount)} €</span>
                  </div>
                )}
                <div className="flex flex-wrap justify-between items-center gap-2 border-t border-ink-700 pt-1.5 text-base font-bold text-mist-100">
                  <span>TOTALE DA INCASSARE:</span>
                  <Amount value={finalTotal} size="lg" tone="amber" />
                </div>
              </div>
            </Card>
          </div>
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29

          {/* Right Column (7 cols): Payment Method, Split Bill, and Accurate Resto Calculation */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="p-4 sm:p-5 space-y-5">
              {/* Split Bill Toggle & Mode */}
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-ink-700">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-mist-100">Modalità di Pagamento</h3>
                </div>

                {/* Split bill button */}
                <button
<<<<<<< HEAD
                  onClick={() => setShowSuccessToast(false)}
                  className="w-full sm:w-auto px-5 py-4 rounded-2xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
=======
                  onClick={() => setIsSplitMode(!isSplitMode)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                    isSplitMode
                      ? 'bg-amber-600 text-ink-950 border-amber-400'
                      : 'bg-ink-800 text-mist-300 border-ink-600 hover:text-mist-100 hover:bg-ink-700'
                  }`}
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                >
                  <Split className="w-4 h-4" />
                  <span>{isSplitMode ? 'Dividi Attivo ✓' : 'Dividi Conto'}</span>
                </button>
              </div>

              {/* REGULAR BILL PAYMENT (Non-split mode) */}
              {!isSplitMode && (
                <div className="space-y-5">
                  {/* 3 Payment Methods: Contanti, Carta, Misto */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <button
                      onClick={() => {
                        setPaymentMethod('contanti');
                        setCardPaid('');
                      }}
                      className={`flex flex-col items-center gap-2 rounded-2xl border p-3 sm:p-4 text-center transition-all ${
                        paymentMethod === 'contanti'
                          ? 'border-mint-400/50 bg-mint-600/15 text-mint-400 font-bold'
                          : 'border-ink-700 bg-ink-900 text-mist-500 hover:border-ink-600 hover:text-mist-300'
                      }`}
                    >
                      <Banknote className="w-6 h-6" />
                      <span className="text-[11px] sm:text-xs uppercase tracking-wider">
                        Contanti
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setPaymentMethod('carta');
                        setCashGiven('');
                        setCardPaid(finalTotal.toFixed(2));
                      }}
                      className={`flex flex-col items-center gap-2 rounded-2xl border p-3 sm:p-4 text-center transition-all ${
                        paymentMethod === 'carta'
                          ? 'border-brand-500/50 bg-brand-500/15 text-brand-300 font-bold'
                          : 'border-ink-700 bg-ink-900 text-mist-500 hover:border-ink-600 hover:text-mist-300'
                      }`}
                    >
                      <CreditCard className="w-6 h-6" />
                      <span className="text-[11px] sm:text-xs uppercase tracking-wider">
                        Carta / POS
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setPaymentMethod('misto');
                      }}
                      className={`flex flex-col items-center gap-2 rounded-2xl border p-3 sm:p-4 text-center transition-all ${
                        paymentMethod === 'misto'
                          ? 'border-violet-400/50 bg-violet-400/15 text-violet-400 font-bold'
                          : 'border-ink-700 bg-ink-900 text-mist-500 hover:border-ink-600 hover:text-mist-300'
                      }`}
                    >
                      <Split className="w-6 h-6" />
                      <span className="text-[11px] sm:text-xs uppercase tracking-wider">
                        Misto (Cash+POS)
                      </span>
                    </button>
                  </div>

                  {/* Amount inputs depending on payment method */}
                  {paymentMethod === 'contanti' && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-mist-300">
                            Importo Contanti Ricevuto dal Cliente (€):
                          </span>
                          <button
                            onClick={handleExactCash}
                            className="shrink-0 font-bold text-xs text-amber-400 hover:text-amber-300"
                          >
                            Importo Esatto ({euro(finalTotal)} €)
                          </button>
                        </div>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={cashGiven}
                            onChange={(e) => setCashGiven(e.target.value)}
                            className="!pl-4 !pr-12 !py-3.5 !text-2xl font-mono font-bold tnum text-mist-100"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-mist-500 font-bold text-lg">
                            €
                          </span>
                        </div>
                      </div>

                      {/* Quick Cash Presets (5, 10, 20, 50, 100) */}
                      <div className="space-y-1.5">
                        <span className="section-title">Tagli Banconote Rapidi:</span>
                        <div className="grid grid-cols-5 gap-2">
                          {[5, 10, 20, 50, 100].map((val) => (
                            <button
                              key={val}
                              onClick={() => handleCashPreset(val)}
                              className="w-full rounded-lg border border-ink-600 bg-ink-800 px-1 py-2 text-sm font-bold tnum text-mist-300 transition hover:border-brand-500/40 hover:text-brand-300 active:scale-95"
                            >
                              {val} €
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'carta' && (
                    <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-brand-300">
                          Pagamento Elettronico POS / Bancomat
                        </span>
                        <Amount value={finalTotal} size="md" />
                      </div>
                      <p className="text-xs text-mist-500">
                        Inserisci o passa la carta sul terminale POS. Una volta approvata la
                        transazione, premi Chiudi Conto.
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'misto' && (
                    <div className="space-y-3 rounded-2xl border border-violet-400/30 bg-violet-400/10 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-violet-400">
                        Pagamento Misto (es. 30€ Contanti + 20€ Carta)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Quota Contanti (€):">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={cashGiven}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCashGiven(val);
                              const parsed = parseFloat(val) || 0;
                              if (parsed < finalTotal) {
                                setCardPaid((finalTotal - parsed).toFixed(2));
                              }
                            }}
                            className="!text-lg font-bold tnum text-mint-400"
                          />
                        </Field>

                        <Field label="Quota Carta POS (€):">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={cardPaid}
                            onChange={(e) => setCardPaid(e.target.value)}
                            className="!text-lg font-bold tnum text-brand-300"
                          />
                        </Field>
                      </div>
                    </div>
                  )}

                  {/* ACCURATE RESTO / MANCANTE DISPLAY (Requested by User) */}
                  <div className="rounded-3xl border-2 border-ink-700 bg-ink-900 p-4 sm:p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-mist-500">
                      <span>Riepilogo Calcolo Cassa:</span>
                      <span>
                        Ricevuto:{' '}
                        <strong className="text-mist-100 tnum">{euro(totalReceived)} €</strong> su{' '}
                        <strong className="text-amber-400 tnum">{euro(finalTotal)} €</strong>
                      </span>
                    </div>

                    {/* Resto Box (Big Bright Green) */}
                    {changeAmount > 0 && (
                      <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-mint-400/50 bg-mint-600/15 p-4">
                        <div className="min-w-0">
                          <div className="text-xs font-bold uppercase tracking-wider text-mint-400">
                            RESTO DA DARE AL CLIENTE:
                          </div>
                          <div className="text-xs text-mist-500">
                            Consegna banconote / monete
                          </div>
                        </div>
                        <Amount value={changeAmount} size="xl" tone="mint" />
                      </div>
                    )}

                    {/* Mancante Box (Amber/Red) */}
                    {missingAmount > 0 && totalReceived > 0 && (
                      <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-rose-400/50 bg-rose-600/15 p-4">
                        <div className="min-w-0">
                          <div className="text-xs font-bold uppercase tracking-wider text-rose-400">
                            MANCANTE (DA INCASSARE):
                          </div>
                          <div className="text-xs text-mist-500">
                            Importo parziale non ancora saldato
                          </div>
                        </div>
                        <Amount
                          value={missingAmount}
                          size="lg"
                          tone="rose"
                          className="!text-3xl"
                        />
                      </div>
                    )}

                    {/* Esatto / Pagato */}
                    {totalReceived === finalTotal && finalTotal > 0 && (
                      <div className="flex items-center justify-between gap-2 rounded-2xl border border-mint-400/40 bg-mint-600/10 p-3 text-xs font-bold text-mint-400">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-mint-400" />
                          Importo Esatto Saldato
                        </span>
                        <span>Resto: 0,00 €</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SPLIT BILL VIEW (Alla Romana / Diviso per persone) */}
              {isSplitMode && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-700 bg-ink-900 p-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-mist-100">Divisione del Conto</div>
                      <div className="text-[11px] text-mist-500">
                        Totale: <span className="tnum">{euro(finalTotal)} €</span> • Quota per
                        persona:{' '}
                        <strong className="text-amber-400 tnum">
                          {euro(finalTotal / splitPeopleCount)} €
                        </strong>
                      </div>
                    </div>

                    {/* Number of people selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-mist-500">Persone:</span>
                      <div className="flex items-center gap-1 bg-ink-800 p-1 rounded-xl">
                        <button
                          onClick={() => setSplitPeopleCount((c) => Math.max(2, c - 1))}
                          className="btn-soft btn-sm !px-2"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-bold tnum text-mist-100">
                          {splitPeopleCount}
                        </span>
                        <button
                          onClick={() => setSplitPeopleCount((c) => c + 1)}
                          className="btn-soft btn-sm !px-2"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Person Payment Cards */}
                  <div className="max-h-72 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
                    {splitRecords.map((person, idx) => {
                      return (
                        <div
                          key={person.id}
                          className={`rounded-2xl border p-3 transition-all ${
                            person.isPaid
                              ? 'border-mint-400/40 bg-mint-600/10'
                              : 'border-ink-700 bg-ink-900'
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                            <span className="flex items-center gap-1.5 font-bold text-mist-100">
                              <User className="w-3.5 h-3.5 text-amber-400" />
                              {person.personLabel}
                            </span>
                            <span className="font-bold text-amber-400 tnum">
                              Quota: {euro(person.amountDue)} €
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Method selection */}
                            <Select
                              small
                              value={person.method}
                              onChange={(e) =>
                                handleUpdateSplitPerson(
                                  idx,
                                  person.amountPaid,
                                  e.target.value as PaymentMethod,
                                  person.cashGiven
                                )
                              }
                              className="!w-auto"
                            >
                              <option value="contanti">Contanti</option>
                              <option value="carta">Carta POS</option>
                            </Select>

                            {/* Cash Given input */}
                            <Input
                              small
                              type="number"
                              step="0.5"
                              placeholder="Dato (€)"
                              value={person.cashGiven || ''}
                              onChange={(e) => {
                                const given = parseFloat(e.target.value) || 0;
                                handleUpdateSplitPerson(
                                  idx,
                                  Math.min(given, person.amountDue),
                                  person.method,
                                  given
                                );
                              }}
                              className="!w-24"
                            />

                            {/* Mark Paid Quick Button */}
                            <button
                              onClick={() =>
                                handleUpdateSplitPerson(
                                  idx,
                                  person.amountDue,
                                  person.method,
                                  person.amountDue
                                )
                              }
                              className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                                person.isPaid
                                  ? 'bg-mint-600 text-white'
                                  : 'bg-ink-800 text-mist-300 hover:bg-ink-700 border border-ink-600'
                              }`}
                            >
                              {person.isPaid ? 'Pagato ✓' : 'Salda Quota'}
                            </button>
                          </div>

                          {/* Individual change calculation */}
                          {person.changeReturned > 0 && (
                            <div className="mt-1.5 text-right text-[11px] font-bold text-mint-400">
                              Resto per {person.personLabel}:{' '}
                              <span className="tnum">{euro(person.changeReturned)} €</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS: Chiudi Conto & Stampa */}
              <div className="flex flex-col sm:flex-row items-center gap-3 border-t border-ink-700 pt-3">
                <Btn
                  variant="primary"
                  size="lg"
                  full
                  onClick={() => setShowPaymentModal(true)}
                  disabled={finalTotal <= 0}
                  className="sm:flex-1"
                >
                  <CreditCard className="w-5 h-5" />
                  <span>Incassa ({euro(finalTotal)} €)</span>
                </Btn>

                {lastReceipt && (
                  <Btn
                    variant="soft"
                    onClick={() => setShowSuccessToast(false)}
                    className="w-full sm:w-auto"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>Stampa Ultimo</span>
                  </Btn>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* 💳 Incasso avanzato: divisione del conto + pagamenti multipli */}
        <PaymentModal
          open={showPaymentModal}
          table={
            selectedTable
              ? { ...selectedTable, billAmount: finalTotal }
              : null
          }
          quickAmount={selectedTable ? undefined : finalTotal}
          onClose={() => setShowPaymentModal(false)}
          onCompleted={() => {
            setShowPaymentModal(false);
            setShowSuccessToast(true);
            handleQuickSale();
          }}
        />

        {/* Modal for printing last receipt */}
        {lastReceipt && (
          <ReceiptPrintModal receipt={lastReceipt} onClose={() => setLastReceipt(null)} />
        )}
      </div>
    </div>
  );
};
