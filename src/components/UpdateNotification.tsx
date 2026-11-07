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
} from 'lucide-react';

interface UpdateNotificationProps {
  onClose: () => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ onClose }) => {
  const [status, setStatus] = useState(updateManager.getStatus());
  const [info, setInfo] = useState<any>(null);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    const listener = (newStatus: any, newInfo: any) => {
      setStatus(newStatus);
      setInfo(newInfo);
    };
    updateManager.addListener(listener);
    return () => updateManager.removeListener(listener);
  }, []);

  const handleApply = async () => {
    setIsApplying(true);
    await updateManager.applyUpdate();
    setIsApplying(false);
  };

  const handleCheckNow = async () => {
    setStatus('checking');
    await updateManager.checkForUpdates();
  };

  // عرض فقط لو في تحديث متوفر
  if (status !== 'update-available') return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full sm:w-96 animate-slideIn">
      <div className="bg-slate-900 border-2 border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 text-white" />
            <h3 className="font-bold text-white text-sm">
              Aggiornamento Disponibile!
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">
                Nuova versione da GitHub
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {info?.shortSha ? `Commit: ${info.shortSha}` : 'Versione nuova'}
              </div>
            </div>
          </div>

          {info?.commitMessage && (
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 line-clamp-2">
              {info.commitMessage}
            </div>
          )}

          {info?.commitDate && (
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3" />
              <span>
                {new Date(info.commitDate).toLocaleString('it-IT', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
          >
            Più tardi
          </button>
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            {isApplying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Aggiornamento...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Aggiorna ora
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ════ مكون لإظهار زر فحص التحديثات في الإعدادات ════
export const UpdateChecker: React.FC = () => {
  const [status, setStatus] = useState(updateManager.getStatus());
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const listener = (newStatus: any) => setStatus(newStatus);
    updateManager.addListener(listener);
    return () => updateManager.removeListener(listener);
  }, []);

  const handleCheck = async () => {
    setIsChecking(true);
    await updateManager.checkForUpdates();
    setIsChecking(false);
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
      <div className="flex items-center gap-3">
        {status === 'update-available' ? (
          <ArrowDownCircle className="w-5 h-5 text-cyan-400" />
        ) : status === 'up-to-date' ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : (
          <RefreshCw className={`w-5 h-5 text-slate-400 ${isChecking ? 'animate-spin' : ''}`} />
        )}
        <div>
          <div className="text-sm font-semibold text-white">
            {status === 'update-available'
              ? 'Aggiornamento disponibile'
              : status === 'up-to-date'
              ? 'App aggiornata'
              : status === 'checking'
              ? 'Controllo...'
              : 'Errore connessione'}
          </div>
          <div className="text-[11px] text-slate-400">
            Versione attuale: {updateManager.getCurrentVersion()}
          </div>
        </div>
      </div>
      <button
        onClick={handleCheck}
        disabled={isChecking}
        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
        Verifica
      </button>
    </div>
  );
};
