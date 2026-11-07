import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import firebaseSyncManager from '../sync/FirebaseSyncManager';
import {
  CheckCircle2,
  Cloud,
  Loader2,
  RefreshCw,
  Users,
  Wifi,
  X,
  Zap,
} from 'lucide-react';

interface SyncModalProps {
  onClose: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ onClose }) => {
  const { currentUser } = useApp();

  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  // فحص الحالة الحالية
  useEffect(() => {
    const configured = firebaseSyncManager.isConfigured();
    setIsConfigured(configured);
    setIsConnected(firebaseSyncManager.getStatus() === 'connected');

    const removeStatusListener = firebaseSyncManager.addStatusListener(
      (newStatus) => {
        setIsConnected(newStatus === 'connected');
      }
    );
    return removeStatusListener;
  }, []);

  // الاتصال التلقائي
  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionStatus('🔄 Connessione a Firebase...');

    const success = await firebaseSyncManager.connect();

    setIsConnecting(false);

    if (success) {
      setConnectionStatus('✅ Connesso! Sincronizzazione attiva.');
      setIsConnected(true);
    } else {
      setConnectionStatus('❌ Connessione fallita. Verifica configurazione Firebase.');
    }
  };

  // قطع الاتصال
  const handleDisconnect = () => {
    firebaseSyncManager.disconnect();
    setIsConnected(false);
    setConnectionStatus('🔌 Disconnesso.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="p-4 bg-slate-800/60 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-orange-400" />
            <h3 className="font-bold text-white text-base">
              Sincronizzazione Cloud
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Status Indicator */}
          <div
            className={`p-4 rounded-2xl border ${
              isConnected
                ? 'bg-emerald-950/40 border-emerald-500/40'
                : isConnecting
                ? 'bg-amber-950/40 border-amber-500/40'
                : 'bg-rose-950/40 border-rose-500/40'
            }`}
          >
            <div className="flex items-center gap-3">
              {isConnected ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : isConnecting ? (
                <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
              ) : (
                <Wifi className="w-6 h-6 text-rose-400" />
              )}
              <div>
                <div className="text-sm font-bold text-white">
                  {isConnected
                    ? 'Connesso al Cloud'
                    : isConnecting
                    ? 'Connessione...'
                    : 'Disconnesso'}
                </div>
                <div className="text-xs text-slate-400">
                  {isConnected
                    ? 'Sincronizzazione attiva con tutti i dispositivi'
                    : 'Modalità singola (senza sync)'}
                </div>
              </div>
            </div>
          </div>

          {/* شرح بسيط */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-300">
              <Zap className="w-3.5 h-3.5" />
              Come funziona:
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1 pl-4 list-disc">
              <li>Tutti i dispositivi si sincronizzano automaticamente</li>
              <li>Funziona con qualsiasi connessione Internet (Wi-Fi o mobile)</li>
              <li>Niente configurazione manuale - basta aprire l'app!</li>
              <li>I dati sono salvati in modo sicuro su Google Firebase</li>
            </ul>
          </div>

          {/* حالة Firebase */}
          {!isConfigured && (
            <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-700/40">
              <div className="text-xs text-amber-300 font-bold mb-1">⚠️ Firebase non configurato</div>
              <div className="text-[11px] text-slate-400">
                Vedi <code className="text-amber-300">.env.example</code> e{' '}
                <code className="text-amber-300">FIREBASE_SETUP.md</code> nel repository.
              </div>
            </div>
          )}

          {/* Status Message */}
          {connectionStatus && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              {connectionStatus}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                disabled={isConnecting || !isConfigured}
                className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-500/20"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connessione...
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    Connetti al Cloud
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="w-full py-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <X className="w-4 h-4" />
                Disconnetti
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/40 border-t border-slate-800/60">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              <span>Cloud Sync</span>
            </div>
            <span className="font-mono">Sea POS v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
