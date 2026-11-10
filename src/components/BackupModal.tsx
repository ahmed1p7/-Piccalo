/**
 * 💾 Backup & Ripristino
 *
 * 1. Esporta una copia di sicurezza (JSON)
 * 2. Carica un backup precedente
 * 3. Ripristino di fabbrica → azzera TUTTO, senza ricreare dati fittizi
 */

import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  HardDriveDownload,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { Btn, Modal } from './ui';

interface BackupModalProps {
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ onClose }) => {
  const { exportDataAsJSON, importDataFromJSON, resetToInitialData } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [showFactory, setShowFactory] = useState(false);
  const [alsoCloud, setAlsoCloud] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDownload = () => {
    const jsonStr = exportDataAsJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ristorante_backup_${new Date().toISOString().substring(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage({ type: 'success', text: 'Backup scaricato con successo.' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importDataFromJSON(content);
      setStatusMessage(
        success
          ? {
              type: 'success',
              text: 'Backup ripristinato: magazzino, tavoli, scontrini e account ripristinati.',
            }
          : { type: 'error', text: 'File JSON non valido o corrotto.' }
      );
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    setBusy(true);
    const res = await resetToInitialData(alsoCloud);
    setBusy(false);
    if (res.success) {
      setShowFactory(false);
      setStatusMessage({
        type: 'success',
        text: alsoCloud
          ? 'Ripristino completato: dispositivo e cloud azzerati.'
          : 'Ripristino completato: questo dispositivo è vuoto.',
      });
    } else {
      setStatusMessage({ type: 'error', text: res.message || 'Operazione non riuscita.' });
    }
  };

  return (
<<<<<<< HEAD
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">Backup &amp; Ripristino Dati</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

=======
    <>
      <Modal
        open
        onClose={onClose}
        title="Backup & Ripristino"
        subtitle="Copia di sicurezza e cancellazione dei dati"
        size="md"
      >
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
        {statusMessage && (
          <div
            className={`mb-4 rounded-xl px-3.5 py-2.5 text-xs font-semibold flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-mint-600/15 border border-mint-400/30 text-mint-400'
                : 'bg-rose-600/15 border border-rose-400/30 text-rose-400'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="space-y-3">
<<<<<<< HEAD
          {/* Download JSON Backup */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              1. Esporta Copia di Sicurezza
            </h4>
            <p className="text-xs text-neutral-400">
              Salva un file JSON sul dispositivo contenente magazzino, storico vendite, tavoli e
              account del personale.
            </p>
            <button
              onClick={handleDownload}
              className="w-full mt-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20"
            >
=======
          {/* 1. Esporta */}
          <div className="surface-raised p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/15 text-brand-300">
                <Download className="w-4 h-4" />
              </span>
              <h4 className="section-title">1. Esporta copia di sicurezza</h4>
            </div>
            <p className="text-xs text-mist-500">
              Salva un file JSON con magazzino, tavoli, scontrini e account del personale.
            </p>
            <Btn variant="primary" full onClick={handleDownload}>
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
              <Download className="w-4 h-4" />
              Scarica backup (.json)
            </Btn>
          </div>

<<<<<<< HEAD
          {/* Upload JSON Backup */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              2. Carica &amp; Ripristina da File
            </h4>
            <p className="text-xs text-neutral-400">
              Seleziona un backup precedentemente esportato per ripristinare tutte le informazioni.
=======
          {/* 2. Importa */}
          <div className="surface-raised p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-mint-600/15 text-mint-400">
                <HardDriveDownload className="w-4 h-4" />
              </span>
              <h4 className="section-title">2. Carica un backup</h4>
            </div>
            <p className="text-xs text-mist-500">
              Ripristina da un file JSON esportato in precedenza.
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
<<<<<<< HEAD
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full mt-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
=======
            <Btn variant="soft" full onClick={() => fileInputRef.current?.click()}>
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
              <Upload className="w-4 h-4" />
              Seleziona file JSON
            </Btn>
          </div>

<<<<<<< HEAD
          {/* Reset Demo Data */}
          <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/40 space-y-2">
            <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider">
              3. Ripristino di Fabbrica
            </h4>
            <p className="text-xs text-neutral-400">
              Ricarica i dati iniziali di prova (pizze, piatti, ingredienti e account standard).
=======
          {/* 3. Ripristino di fabbrica */}
          <div className="surface-raised p-4 space-y-2 border-rose-400/30 bg-rose-600/5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600/15 text-rose-400">
                <RotateCcw className="w-4 h-4" />
              </span>
              <h4 className="section-title !text-rose-400">3. Ripristino di fabbrica</h4>
            </div>
            <p className="text-xs text-mist-500">
              Cancella <strong className="text-mist-300">tutti</strong> i dati: account,
              tavoli, magazzino, scontrini e dati del ristorante. L&apos;app resta
              completamente vuota: non viene ricreato nessun contenuto di esempio.
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
            </p>
            <Btn variant="danger" full onClick={() => setShowFactory(true)}>
              <RotateCcw className="w-4 h-4" />
              Ripristino di fabbrica
            </Btn>
          </div>
        </div>
      </Modal>

<<<<<<< HEAD
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold"
          >
            Chiudi
          </button>
=======
      {/* Conferma */}
      <Modal
        open={showFactory}
        onClose={() => setShowFactory(false)}
        title="Confermi l'azzeramento totale?"
        subtitle="L'operazione non è reversibile"
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-rose-600/10 border border-rose-400/30 px-4 py-3">
            <p className="text-xs leading-relaxed text-mist-300">
              Verranno cancellati account, tavoli, ordini, magazzino, scontrini e
              dati del ristorante su questo dispositivo.
              <strong className="text-mist-100"> Nessun dato viene ricreato.</strong>
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-ink-700 bg-ink-900 px-3.5 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={alsoCloud}
              onChange={(e) => setAlsoCloud(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-ink-600 bg-ink-950 accent-rose-500"
            />
            <span className="text-xs leading-relaxed text-mist-300">
              <strong className="text-mist-100">Cancella anche i dati nel cloud</strong>
              <br />
              Rimuove i dati condivisi da tutti i dispositivi collegati.
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setShowFactory(false)}>
              Annulla
            </Btn>
            <Btn variant="danger" onClick={handleReset} disabled={busy}>
              {busy ? 'Cancellazione…' : 'Azzera tutto'}
            </Btn>
          </div>
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
        </div>
      </Modal>
    </>
  );
};
