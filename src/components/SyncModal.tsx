import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import syncManager from '../sync/SyncManager';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Link2,
  Loader2,
  Server,
  Users,
  Wifi,
  X,
  Zap,
} from 'lucide-react';

interface SyncModalProps {
  onClose: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ onClose }) => {
  const { currentUser, profile } = useApp();

  // قراءة آخر عنوان محفوظ
  const [serverUrl, setServerUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('sea_pos_sync_url') || 'http://192.168.1.100:3001';
    } catch {
      return 'http://192.168.1.100:3001';
    }
  });

  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectedClients, setConnectedClients] = useState<number>(0);

  // الحالة الحالية من SyncManager
  useEffect(() => {
    const status = syncManager.getStatus();
    setIsConnected(status === 'connected');
    setConnectedClients(syncManager.getClientsCount());

    const removeStatusListener = syncManager.addStatusListener(
      (newStatus, clientsCount) => {
        setIsConnected(newStatus === 'connected');
        setConnectedClients(clientsCount);
      }
    );

    return () => {
      removeStatusListener();
    };
  }, []);

  // الاتصال بالخادم
  const handleConnect = async () => {
    if (!serverUrl.trim()) {
      setConnectionStatus('⚠️ Inserisci un indirizzo IP valido.');
      return;
    }

    setIsConnecting(true);
    setConnectionStatus('🔄 Connessione in corso...');

    const success = await syncManager.connect(
      serverUrl.trim(),
      currentUser?.displayName || 'Unknown',
      currentUser?.role || 'unknown'
    );

    setIsConnecting(false);

    if (success) {
      setConnectionStatus('✅ Connesso! Sincronizzazione attiva.');
      setIsConnected(true);
    } else {
      setConnectionStatus('❌ Connessione fallita. Verifica IP e che il server sia attivo.');
      setIsConnected(false);
    }
  };

  // قطع الاتصال
  const handleDisconnect = () => {
    syncManager.disconnect();
    setIsConnected(false);
    setConnectionStatus('🔌 Disconnesso dal server.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="p-4 bg-slate-800/60 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-base">
              Sincronizzazione Wi-Fi
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
                    ? 'Connesso'
                    : isConnecting
                    ? 'Connessione...'
                    : 'Disconnesso'}
                </div>
                <div className="text-xs text-slate-400">
                  {isConnected
                    ? `${connectedClients} dispositivo/i connesso/i`
                    : 'Modalità singola (senza sync)'}
                </div>
              </div>
            </div>
          </div>

          {/* URL Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Indirizzo Server Sync
            </label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              disabled={isConnecting || isConnected}
              placeholder="http://192.168.1.100:3001"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            />
            <p className="text-[11px] text-slate-500">
              Inserisci l'IP del dispositivo principale (es. il tablet cassa) seguito da :3001
            </p>
          </div>

          {/* Instructions */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
              <Zap className="w-3.5 h-3.5" />
              Come funziona la sincronizzazione:
            </div>
            <ol className="text-[11px] text-slate-400 space-y-1 pl-4 list-decimal">
              <li>Avvia il server su un dispositivo: <code className="text-amber-300">npm run server</code></li>
              <li>Nota l'IP locale mostrato (es. 192.168.1.100)</li>
              <li>Su altri dispositivi: inserisci quell'IP in questo campo</li>
              <li>Tutti i dispositivi vedranno gli stessi dati in tempo reale</li>
            </ol>
          </div>

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
                disabled={isConnecting}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-500/20"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connessione...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Connetti al Server
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
              <span>{connectedClients} dispositivi</span>
            </div>
            <span className="font-mono">Sea Pizzeria POS v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
