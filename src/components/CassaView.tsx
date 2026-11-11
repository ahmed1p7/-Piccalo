import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calculator,
  CheckCircle2,
  CreditCard,
  Grid,
  Minus,
  Percent,
  Plus,
  Printer,
  Receipt as ReceiptIcon,
  Trash2,
  Users,
} from 'lucide-react';
import { OrderItem, Receipt, RestaurantTable } from '../types';
import { ReceiptPrintModal } from './ReceiptPrintModal';
import { PaymentModal } from './PaymentModal';
import { Amount, Badge, Btn, Card, Field, Input, euro } from './ui';

export const CassaView: React.FC = () => {
  const {
    tables,
    selectedTableForCheckout,
    setSelectedTableForCheckout,
    updateTableBillAmount,
    inventory,
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
  const [discountPercent, setDiscountPercent] = useState<number>(0);

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
  };

  // Switch to direct quick sale (no table)
  const handleQuickSale = () => {
    setSelectedTable(null);
    setSelectedTableForCheckout(null);
    setBillItems([]);
    setManualTotalInput('');
  };

  // Totale del conto:
  //  - se l'importo manuale è valorizzato → vale quello
  //  - altrimenti → totale del tavolo + le voci aggiunte in cassa
  const tableBase = selectedTable ? selectedTable.billAmount || 0 : 0;
  const itemsTotal = useMemo(
    () => billItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [billItems]
  );
  const rawTotal = useMemo(() => {
    if (manualTotalInput !== '') {
      return Math.max(0, parseFloat(manualTotalInput) || 0);
    }
    return tableBase + itemsTotal;
  }, [manualTotalInput, itemsTotal, tableBase]);

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
    const price = product.sellPrice || 0;
    // se l'importo manuale è valorizzato lo aumentiamo (il totale non deve
    // saltare: prima il totale spariva quando si aggiungeva un prodotto)
    if (manualTotalInput !== '') {
      const cur = parseFloat(manualTotalInput) || 0;
      setManualTotalInput((cur + price).toFixed(2));
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
    // l'importo manuale contiene anche le voci: va adeguato
    if (manualTotalInput !== '') {
      const target = billItems[index];
      if (target) {
        const cur = parseFloat(manualTotalInput) || 0;
        const next = Math.max(0, cur + delta * target.price);
        setManualTotalInput(next > 0 ? next.toFixed(2) : '');
      }
    }
  };

  const handleRemoveItem = (index: number) => {
    setBillItems((prev) => prev.filter((_, i) => i !== index));
    if (manualTotalInput !== '') {
      const target = billItems[index];
      if (target) {
        const cur = parseFloat(manualTotalInput) || 0;
        const next = Math.max(0, cur - target.price * target.quantity);
        setManualTotalInput(next > 0 ? next.toFixed(2) : '');
      }
    }
  };

  return (
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
                {selectedTable && (
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const amt = parseFloat(manualTotalInput) || 0;
                      updateTableBillAmount(selectedTable.id, amt);
                    }}
                    className="mt-1 !px-0 !py-0 text-brand-300 hover:text-brand-400 underline"
                  >
                    Salva importo sul Tavolo
                  </Btn>
                )}
              </Field>

              {/* Quick preset increments for bill total */}
              <div className="space-y-1.5">
                <span className="section-title">Aggiunte Rapide al Conto:</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[5, 10, 20, 50].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        const cur = parseFloat(manualTotalInput) || 0;
                        setManualTotalInput((cur + val).toFixed(2));
                      }}
                      className="w-full rounded-lg border border-ink-600 bg-ink-800 px-2 py-2 text-xs font-bold tnum text-mist-300 transition hover:border-brand-500/40 hover:text-brand-300 active:scale-95"
                    >
                      +{val} €
                    </button>
                  ))}
                </div>
              </div>

              {/* Prodotti rapidi dal magazzino (prezzo di vendita) */}
              {quickProducts.length > 0 && (
                <div className="space-y-1.5">
                  <span className="section-title">Prodotti Rapidi:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto scrollbar-thin pr-1">
                    {quickProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleAddQuickProduct(product)}
                        className="w-full rounded-xl border border-ink-700 bg-ink-850 px-2.5 py-2 text-left transition hover:border-brand-500/40 hover:bg-ink-800 active:scale-[0.98]"
                      >
                        <div className="text-[11px] font-bold text-mist-100 truncate">
                          {product.name}
                        </div>
                        <div className="text-[11px] font-mono font-bold tnum text-brand-300">
                          {euro(product.sellPrice || 0)} €
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Voci del conto */}
              {billItems.length > 0 && (
                <div className="space-y-1.5">
                  <span className="section-title">Voci del Conto:</span>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto scrollbar-thin pr-1">
                    {billItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-850 px-2.5 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-mist-100 truncate">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-mist-500 tnum">
                            {euro(item.price)} € × {item.quantity}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQuantity(idx, -1)}
                            className="h-7 w-7 rounded-lg bg-ink-800 border border-ink-600 text-mist-300 hover:text-mist-100"
                            aria-label="Meno uno"
                          >
                            <Minus className="w-3.5 h-3.5 mx-auto" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQuantity(idx, 1)}
                            className="h-7 w-7 rounded-lg bg-ink-800 border border-ink-600 text-mist-300 hover:text-mist-100"
                            aria-label="Piu uno"
                          >
                            <Plus className="w-3.5 h-3.5 mx-auto" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="h-7 w-7 rounded-lg bg-rose-600/20 border border-rose-400/30 text-rose-400 hover:bg-rose-600/40"
                            aria-label="Rimuovi"
                          >
                            <Trash2 className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

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
                </div>
              </div>

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

          {/* Right Column (7 cols): incasso */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="p-4 sm:p-5 space-y-5">
              {/* ⚠️ Nota: il pagamento (contanti/carta/misto, divisione del
                  conto, pagamenti multipli) avviene TUTTO dentro il modale
                  "Incassa" — prima esisteva una seconda tastiera qui sotto
                  i cui dati venivano ignorati. */}
              <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-brand-300" />
                  <span className="text-sm font-bold text-mist-100">
                    Come vuoi incassare?
                  </span>
                </div>
                <p className="text-xs text-mist-500 leading-relaxed">
                  Tocca <strong className="text-mist-300">Incassa</strong> per
                  scegliere il metodo: contanti (con resto), carta POS, conto
                  diviso fra più persone o più pagamenti sullo stesso tavolo.
                </p>
              </div>

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
          quickItems={billItems}
          coversCount={coversCount}
          discountPercent={discountPercent}
          onClose={() => setShowPaymentModal(false)}
          onCompleted={(receipt) => {
            setShowPaymentModal(false);
            // 🧾 la ricevuta va tenuta: serve per il toast di conferma e
            //    per il pulsante "Stampa Ultimo" (prima non comparivano)
            if (receipt) setLastReceipt(receipt);
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
