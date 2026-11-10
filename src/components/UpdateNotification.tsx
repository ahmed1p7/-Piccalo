import React, { useState, useEffect } from 'react';
import updateManager from '../utils/UpdateManager';
import {
  ArrowDownCircle,
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  X,
  Zap,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';

interface UpdateNotificationProps {
  onClose: () => void;
}

/** 📢 Notifica "Aggiornamento disponibile" con installazione diretta */
export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ onClose }) => {
  const [status, setStatus] = useState(updateManager.getStatus());
  const [info, setInfo] = useState<any>(updateManager.getUpdateInfo());
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    const listener = (newStatus: any, newInfo: any) => {
      setStatus(newStatus);
      setInfo(newInfo);
      if (newStatus !== 'downloading') setProgress(0);
    };
    updateManager.addListener(listener);

    const progressListener = (p: any) => setProgress(p?.percent ?? 0);
    updateManager.addProgressListener(progressListener);

    return () => {
      updateManager.removeListener(listener);
      updateManager.removeProgressListener(progressListener);
    };
  }, []);

  const handleApply = async () => {
    await updateManager.applyUpdate();
  };

  const handleCheckNow = async () => {
    setStatus('checking');
    await updateManager.checkForUpdates();
  };

  if (status !== 'update-available' && status !== 'downloading') return null;

  const isDownloading = status === 'downloading';

  return (
    <div className="fixed inset-x-3 top-3 z-[60] sm:inset-x-auto sm:right-4 sm:w-96 animate-slideIn">
      <div className="bg-neutral-900 border-2 border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-cyan-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 text-white" />
            <h3 className="font-bold text-white text-sm">
              Aggiornamento disponibile
            </h3>
          </div>
          {!isDownloading && (
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              {isDownloading ? (
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
              ) : (
                <Zap className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">
                {isDownloading
                  ? 'Download in corso...'
                  : `Nuova versione ${info?.version ?? ''}`}
              </div>
              <div className="text-xs text-neutral-400 mt-0.5">
                {info?.installedVersion
                  ? `Versione installata: ${info.installedVersion}`
                  : 'Aggiornamento dal repository GitHub'}
              </div>
            </div>
          </div>

          {info?.notes && (
            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300">
              {info.notes}
            </div>
          )}

          {/* Progress bar */}
          {isDownloading && (
            <div className="space-y-1.5">
              <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-amber-400 transition-all duration-300"
                  style={{ width: `${Math.max(progress, 3)}%` }}
                />
              </div>
              <div className="text-[11px] text-neutral-400 flex justify-between">
                <span>Scaricamento dell'APK</span>
                <span className="font-mono">{progress}%</span>
              </div>
            </div>
          )}

          {info?.publishedAt && !isDownloading && (
            <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3" />
              <span>
                Pubblicato il{' '}
                {new Date(info.publishedAt).toLocaleString('it-IT', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}

          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-700/30">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-emerald-200/90">
              L&apos;app si aggiorna <strong>sopra</strong> quella già installata:
              i dati e gli utenti restano intatti.
            </div>
          </div>
        </div>

        {/* Actions */}
        {!isDownloading && (
          <div className="px-4 pb-4 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition-colors"
            >
              Più tardi
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Installa ora
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ════ componente per la pagina impostazioni ════
export const UpdateChecker: React.FC = () => {
  const [status, setStatus] = useState(updateManager.getStatus());
  const [info, setInfo] = useState<any>(updateManager.getUpdateInfo());
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const listener = (newStatus: any, newInfo: any) => {
      setStatus(newStatus);
      setInfo(newInfo);
    };
    updateManager.addListener(listener);
    return () => updateManager.removeListener(listener);
  }, []);

  const handleCheck = async () => {
    setIsChecking(true);
    await updateManager.checkForUpdates();
    setIsChecking(false);
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800 gap-3">
      <div className="flex items-center gap-3">
        {status === 'update-available' ? (
          <ArrowDownCircle className="w-5 h-5 text-amber-400" />
        ) : status === 'up-to-date' ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : (
          <Smartphone className="w-5 h-5 text-neutral-400" />
        )}
        <div>
          <div className="text-sm font-semibold text-white">
            {status === 'update-available'
              ? `Aggiornamento disponibile (${info?.version ?? ''})`
              : status === 'up-to-date'
              ? 'App aggiornata'
              : status === 'checking'
              ? 'Controllo...'
              : status === 'downloading'
              ? 'Download in corso...'
              : 'Verifica aggiornamenti'}
          </div>
          <div className="text-[11px] text-neutral-400">
            {info?.installedVersion
              ? `Versione installata: ${info.installedVersion}`
              : 'Controlla se c\'è una versione più recente su GitHub'}
          </div>
        </div>
      </div>
      <button
        onClick={handleCheck}
        disabled={isChecking}
        className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-xs font-semibold text-neutral-200 flex items-center gap-1.5 transition-colors whitespace-nowrap"
      >
        <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
        Verifica
      </button>
    </div>
  );
};
