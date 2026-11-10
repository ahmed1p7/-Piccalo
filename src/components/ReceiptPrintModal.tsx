import React from 'react';
import { useApp } from '../context/AppContext';
import { Receipt } from '../types';
import { Check, Copy, Download, Printer, X } from 'lucide-react';

interface ReceiptPrintModalProps {
  receipt: Receipt;
  onClose: () => void;
}

export const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({
  receipt,
  onClose,
}) => {
  const { profile } = useApp();
  const [copied, setCopied] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(receipt.date).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const generateTextSummary = () => {
    let text = `================================\n`;
    text += `   ${profile.name.toUpperCase()}\n`;
    text += `   ${profile.address}\n`;
    text += `   P.IVA: ${profile.pIva}\n`;
    text += `================================\n`;
    text += `Scontrino: ${receipt.receiptNumber}\n`;
    text += `Data: ${formattedDate}\n`;
    if (receipt.tableName) text += `Tavolo: ${receipt.tableName}\n`;
    text += `Coperti: ${receipt.coversCount}\n`;
    text += `Operatore: ${receipt.cashierName}\n`;
    text += `--------------------------------\n`;
    receipt.items.forEach((item) => {
      text += `${item.quantity}x ${item.name.padEnd(20)} ${(item.price * item.quantity).toFixed(2)} €\n`;
    });
    text += `--------------------------------\n`;
    text += `TOTALE: ${receipt.totalAmount.toFixed(2)} €\n`;
    text += `Metodo: ${receipt.paymentMethod.toUpperCase()}\n`;
    if (receipt.cashAmount > 0) text += `Contanti: ${receipt.cashAmount.toFixed(2)} €\n`;
    if (receipt.cardAmount > 0) text += `Carta/POS: ${receipt.cardAmount.toFixed(2)} €\n`;
    if (receipt.changeGiven > 0) text += `RESTO: ${receipt.changeGiven.toFixed(2)} €\n`;
    text += `================================\n`;
    text += `   GRAZIE E ARRIVEDERCI!\n`;
    text += `================================\n`;
    return text;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateTextSummary());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Modal Header */}
        <div className="p-4 bg-neutral-800/60 border-b border-neutral-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">Anteprima Ricevuta Fiscale</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Receipt Paper Simulation */}
        <div className="p-6 bg-neutral-950 flex justify-center">
          <div
            id="thermal-receipt"
            className="w-full max-w-xs bg-white text-slate-900 p-5 rounded-sm shadow-xl font-mono text-xs border border-dashed border-slate-300 relative selection:bg-amber-200"
          >
            {/* Top saw-tooth receipt header style */}
            <div className="text-center pb-3 border-b border-slate-400 border-dashed space-y-1">
              <h4 className="font-black text-sm tracking-wider uppercase">
                {profile.name}
              </h4>
              <p className="text-[11px] text-slate-600 leading-tight">
                {profile.subTitle}
              </p>
              <p className="text-[10px] text-slate-600">{profile.address}</p>
              <p className="text-[10px] text-slate-600">P.IVA / CF: {profile.pIva}</p>
              <p className="text-[10px] text-slate-600">Tel: {profile.phone}</p>
            </div>

            {/* Receipt Meta */}
            <div className="py-2.5 border-b border-slate-300 border-dashed text-[11px] space-y-0.5">
              <div className="flex justify-between font-bold">
                <span>DOC. COMMERCIALE</span>
                <span>{receipt.receiptNumber}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Data: {formattedDate}</span>
                <span>Coperti: {receipt.coversCount}</span>
              </div>
              {receipt.tableName && (
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>Ubicazione:</span>
                  <span>{receipt.tableName}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Operatore:</span>
                <span>{receipt.cashierName}</span>
              </div>
            </div>

            {/* Itemized List */}
            <div className="py-2.5 border-b border-slate-400 border-dashed space-y-1.5">
              {receipt.items.length > 0 ? (
                receipt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] leading-tight">
                    <span className="truncate pr-2">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-bold flex-shrink-0">
                      {(item.price * item.quantity).toFixed(2)} €
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between text-[11px]">
                  <span>Consumazione Ristorante</span>
                  <span className="font-bold">{receipt.totalAmount.toFixed(2)} €</span>
                </div>
              )}
            </div>

            {/* Total and Payment Breakdown */}
            <div className="py-3 border-b border-slate-400 border-dashed space-y-1">
              <div className="flex justify-between text-base font-black text-neutral-950">
                <span>TOTALE COMPLESSIVO</span>
                <span>{receipt.totalAmount.toFixed(2)} €</span>
              </div>

              <div className="pt-2 text-[11px] text-slate-700 space-y-0.5">
                <div className="flex justify-between">
                  <span>Metodo di Pagamento:</span>
                  <span className="font-bold capitalize">{receipt.paymentMethod}</span>
                </div>
                {receipt.cashAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Contanti Ricevuti:</span>
                    <span>{receipt.cashAmount.toFixed(2)} €</span>
                  </div>
                )}
                {receipt.cardAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Pagamento Carta / POS:</span>
                    <span>{receipt.cardAmount.toFixed(2)} €</span>
                  </div>
                )}
                {receipt.changeGiven > 0 && (
                  <div className="flex justify-between font-bold text-emerald-700 text-xs pt-1 border-t border-slate-200">
                    <span>RESTO CONSEGNATO:</span>
                    <span>{receipt.changeGiven.toFixed(2)} €</span>
                  </div>
                )}
              </div>
            </div>

            {/* Split Details summary if applicable */}
            {receipt.splitDetails && receipt.splitDetails.length > 0 && (
              <div className="py-2 border-b border-slate-300 border-dashed text-[10px] space-y-1">
                <div className="font-bold text-slate-700">Ripartizione del Conto:</div>
                {receipt.splitDetails.map((s, idx) => (
                  <div key={idx} className="flex justify-between text-slate-600">
                    <span>
                      {s.personLabel} ({s.method})
                    </span>
                    <span>{s.amountPaid.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            )}

            {/* Footer barcode and thank you */}
            <div className="pt-3 text-center space-y-2">
              <p className="font-bold text-[10px] uppercase tracking-wider text-slate-700">
                Grazie per la visita!
              </p>
              <div className="h-7 w-4/5 mx-auto bg-neutral-800 flex items-center justify-center text-[9px] text-white tracking-[0.3em] font-mono">
                ||||||||||||||||||||||||||||
              </div>
              <p className="text-[9px] text-neutral-500">
                Arrivederci al Ristorante Sea
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiato!' : 'Copia Testo'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              Chiudi
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20"
            >
              <Printer className="w-4 h-4" />
              <span>Stampa Scontrino</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
