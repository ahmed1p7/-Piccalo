import React, { useState, useEffect } from 'react';
import updateManager from '../utils/UpdateManager';
import {
  AlertTriangle,
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
import { Btn } from './ui';

interface UpdateNotificationProps {
  onClose: () => void;
}

/**
 * Accento cromatico per stato dell'aggiornamento.
 * Le classi sono scritte per esteso: Tailwind v4 le scansiona nei sorgenti.
 */
const STATUS_ACCENT: Record<
  string,
  { border: string; soft: string; text: string }
> = {
  'update-available': {
    border: 'border-brand-500/50',
    soft: 'bg-brand-500/15',
    text: 'text-brand-300',
  },
  downloading: {
    border: 'border-brand-500/40',
    soft: 'bg-brand-500/10',
    text: 'text-brand-300',
  },
  'up-to-date': {
    border: 'border-mint-400/40',
    soft: 'bg-mint-600/15',
    text: 'text-mint-400',
  },
  checking: {
    border: 'border-amber-400/40',
    soft: 'bg-amber-600/15',
    text: 'text-amber-400',
  },
  error: {
    border: 'border-rose-400/40',
    soft: 'bg-rose-600/15',
    text: 'text-rose-400',
  },
  idle: {
    border: 'border-ink-700',
    soft: 'bg-ink-900',
    text: 'text-mist-500',
  },
};

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
  const accent = STATUS_ACCENT[status] || STATUS_ACCENT.idle;

  // ── Barra compatta (mobile): una riga sola, non copre i pulsanti ──
  if (!isDownloading) {
    return (
      <div className="fixed inset-x-3 bottom-20 z-[45] animate-slideUp sm:hidden">
        <div
          className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-2xl shadow-ink-950/60 ${accent.border} ${accent.soft}`}
        >
          <ArrowDownCircle className={`w-5 h-5 shrink-0 ${accent.text}`} />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-mist-100 truncate">
              Aggiornamento {info?.version ?? ''}
            </div>
            <div className="text-[10px] text-mist-500 truncate">
              {info?.installedVersion
                ? `Installata: ${info.installedVersion}`
                : 'Disponibile'}
            </div>
          </div>
          <Btn variant="primary" size="sm" onClick={handleApply}>
            <Download className="w-3.5 h-3.5" />
            Aggiorna
          </Btn>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="shrink-0 rounded-lg p-1 text-mist-500 hover:text-mist-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    /* Su mobile il banner sta IN BASSO (sopra la barra di navigazione):
       in alto coprirebbe i pulsanti principali delle schermate.
       z-index sotto i modali (z-50) → non blocca mai i loro pulsanti. */
    <div className="fixed inset-x-3 bottom-20 z-[45] animate-slideUp sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-3 sm:w-96">
      <div
        className={`overflow-hidden rounded-2xl border-2 bg-ink-850 shadow-2xl shadow-ink-950/60 ${accent.border}`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between gap-2 px-4 py-3 ${accent.soft}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <ArrowDownCircle className={`w-5 h-5 shrink-0 ${accent.text}`} />
            <h3 className="text-sm font-bold text-mist-100 truncate">
              Aggiornamento disponibile
            </h3>
          </div>
          {!isDownloading && (
            <button
              onClick={onClose}
              aria-label="Chiudi"
              className="shrink-0 rounded-lg p-1 text-mist-500 transition-colors hover:bg-ink-800 hover:text-mist-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-500/30 bg-brand-500/10`}
            >
              {isDownloading ? (
                <Loader2 className="w-5 h-5 text-brand-300 animate-spin" />
              ) : (
                <Zap className="w-5 h-5 text-brand-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-mist-100">
                {isDownloading
                  ? 'Download in corso...'
                  : `Nuova versione ${info?.version ?? ''}`}
              </div>
              <div className="mt-0.5 text-xs text-mist-500">
                {info?.installedVersion
                  ? `Versione installata: ${info.installedVersion}`
                  : 'Aggiornamento dal repository GitHub'}
              </div>
            </div>
          </div>

          {info?.notes && (
            <div className="rounded-xl border border-ink-700 bg-ink-900 p-2.5 text-xs text-mist-300">
              {info.notes}
            </div>
          )}

          {/* Progress bar */}
          {isDownloading && (
            <div className="space-y-1.5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-brand-300 transition-all duration-300"
                  style={{ width: `${Math.max(progress, 3)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-mist-500">
                <span>Scaricamento dell&apos;APK</span>
                <span className="font-mono tnum">{progress}%</span>
              </div>
            </div>
          )}

          {info?.publishedAt && !isDownloading && (
            <div className="flex items-center gap-1.5 text-[11px] text-mist-500">
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

          <div className="flex items-start gap-2 rounded-xl border border-mint-400/25 bg-mint-600/10 p-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-mint-400" />
            <div className="text-[11px] text-mist-300">
              L&apos;app si aggiorna <strong className="text-mist-100">sopra</strong> quella già
              installata: i dati e gli utenti restano intatti.
            </div>
          </div>
        </div>

        {/* Actions */}
        {!isDownloading && (
          <div className="flex gap-2 px-4 pb-4">
            <Btn variant="soft" size="sm" onClick={onClose} className="flex-1">
              Più tardi
            </Btn>
            <Btn variant="primary" size="sm" onClick={handleApply} className="flex-1">
              <Download className="w-3.5 h-3.5" />
              Installa ora
            </Btn>
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

  const accent = STATUS_ACCENT[status] || STATUS_ACCENT.idle;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${accent.border} ${accent.soft}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {status === 'update-available' ? (
          <ArrowDownCircle className="w-5 h-5 shrink-0 text-brand-300" />
        ) : status === 'up-to-date' ? (
          <CheckCircle2 className="w-5 h-5 shrink-0 text-mint-400" />
        ) : status === 'checking' ? (
          <RefreshCw className="w-5 h-5 shrink-0 text-amber-400 animate-spin" />
        ) : status === 'error' ? (
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
        ) : (
          <Smartphone className="w-5 h-5 shrink-0 text-mist-500" />
        )}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-mist-100">
            {status === 'update-available'
              ? `Aggiornamento disponibile (${info?.version ?? ''})`
              : status === 'up-to-date'
              ? 'App aggiornata'
              : status === 'checking'
              ? 'Controllo...'
              : status === 'downloading'
              ? 'Download in corso...'
              : status === 'error'
              ? 'Errore nel controllo aggiornamenti'
              : 'Verifica aggiornamenti'}
          </div>
          <div className="text-[11px] text-mist-500">
            {info?.installedVersion
              ? `Versione installata: ${info.installedVersion}`
              : 'Controlla se c\'è una versione più recente su GitHub'}
          </div>
        </div>
      </div>
      <Btn
        variant="soft"
        size="sm"
        onClick={handleCheck}
        disabled={isChecking}
        className="shrink-0 whitespace-nowrap"
      >
        <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
        Verifica
      </Btn>
    </div>
  );
};
