import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';

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
    setStatusMessage({ type: 'success', text: 'File di backup JSON scaricato con successo!' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importDataFromJSON(content);
      if (success) {
        setStatusMessage({
          type: 'success',
          text: 'Dati di magazzino, cassa e utenti ripristinati correttamente!',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: 'File JSON non valido o corrotto. Verifica il formato.',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (
      confirm(
        'Attenzione: questa operazione ripristinerà tutti i dati demo di esempio (menu, magazzino e account). Continuare?'
      )
    ) {
      resetToInitialData();
      setStatusMessage({
        type: 'success',
        text: 'Dati ripristinati alla configurazione iniziale di fabbrica.',
      });
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">Backup &amp; Ripristino Dati</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="space-y-3">
          {/* Download JSON Backup */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              1. Esporta Copia di Sicurezza
            </h4>
            <p className="text-xs text-slate-400">
              Salva un file JSON sul dispositivo contenente magazzino, storico vendite, tavoli e
              account del personale.
            </p>
            <button
              onClick={handleDownload}
              className="w-full mt-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20"
            >
              <Download className="w-4 h-4" />
              <span>Scarica Backup (.json)</span>
            </button>
          </div>

          {/* Upload JSON Backup */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              2. Carica &amp; Ripristina da File
            </h4>
            <p className="text-xs text-slate-400">
              Seleziona un backup precedentemente esportato per ripristinare tutte le informazioni.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full mt-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Seleziona File JSON</span>
            </button>
          </div>

          {/* Reset Demo Data */}
          <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/40 space-y-2">
            <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider">
              3. Ripristino di Fabbrica
            </h4>
            <p className="text-xs text-slate-400">
              Ricarica i dati iniziali di prova (pizze, piatti, ingredienti e account standard).
            </p>
            <button
              onClick={handleReset}
              className="w-full mt-1 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ripristina Dati Iniziali</span>
            </button>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
