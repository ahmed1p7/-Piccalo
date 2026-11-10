import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import firebaseSyncManager from '../sync/FirebaseSyncManager';
import syncManager from '../sync/SyncManager';
import {
  parseSyncCode,
  encodeSyncCode,
  getRuntimeConfig,
  getEffectiveConfig,
  saveRuntimeConfig,
  clearRuntimeConfig,
  getDevice,
  updateDevice,
  type DeviceInfo,
} from '../sync/SyncConfig';
import {
  CheckCircle2,
  Cloud,
  Download,
  Loader2,
  RefreshCw,
  Users,
  Wifi,
  X,
  Zap,
  Smartphone,
  Copy,
  Check,
  Link2,
  Unlink,
  ShieldCheck,
} from 'lucide-react';

interface SyncModalProps {
  onClose: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ onClose }) => {
  const { currentUser, syncAllNow, pullAllFromCloud } = useApp();

  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  const [syncCode, setSyncCode] = useState<string>('');
  const [codeError, setCodeError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [device, setDevice] = useState<DeviceInfo>(getDevice());
  const [deviceName, setDeviceName] = useState<string>(getDevice().name);
  const [deviceRole, setDeviceRole] = useState<string>(getDevice().role);

  // Rete locale (Wi-Fi)
  const [lanUrl, setLanUrl] = useState<string>(
    () => {
      try {
        return localStorage.getItem('sea_pos_sync_url') || '';
      } catch {
        return '';
      }
    }
  );
  const [lanStatus, setLanStatus] = useState<string>('');
  const [lanConnecting, setLanConnecting] = useState<boolean>(false);

  // Sincronizzazione completa
  const [syncBusy, setSyncBusy] = useState<boolean>(false);
  const [fullSyncStatus, setFullSyncStatus] = useState<string>('');

  // ── Controllo stato ──
  useEffect(() => {
    setIsConfigured(firebaseSyncManager.isConfigured());
    setIsConnected(firebaseSyncManager.getStatus() === 'connected');
    setDevices(firebaseSyncManager.getDevices());
    setDevice(getDevice());

    const removeStatusListener = firebaseSyncManager.addStatusListener(
      (newStatus, devicesCount) => {
        setIsConnected(newStatus === 'connected');
        setDevices(firebaseSyncManager.getDevices());
        void devicesCount;
      }
    );

    const timer = setInterval(() => {
      setDevices(firebaseSyncManager.getDevices());
    }, 15000);

    return () => {
      removeStatusListener();
      clearInterval(timer);
    };
  }, []);

  // ── Collegamento ──
  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionStatus('🔄 Connessione al cloud...');
    const success = await firebaseSyncManager.reconnect();
    setIsConnecting(false);
    setIsConnected(success);
    setConnectionStatus(
      success
        ? '✅ Connesso! I dati si sincronizzano con gli altri dispositivi.'
        : '❌ Connessione fallita. Controlla il codice e la connessione internet.'
    );
  };

  const handleSaveCode = async () => {
    const result = parseSyncCode(syncCode);
    if (!result.ok || !result.config) {
      setCodeError(result.error || 'Codice non valido.');
      return;
    }
    setCodeError('');
    saveRuntimeConfig(result.config);
    setIsConfigured(true);
    setConnectionStatus('💾 Codice salvato. Connessione in corso...');
    await handleConnect();
  };

  const handleForget = () => {
    clearRuntimeConfig();
    firebaseSyncManager.disconnect();
    setIsConfigured(false);
    setIsConnected(false);
    setSyncCode('');
    setConnectionStatus('🔌 Codice rimosso da questo dispositivo.');
  };

  const handleCopyCode = async () => {
    const config = getRuntimeConfig() || getEffectiveConfig();
    if (!config) return;
    const code = encodeSyncCode(config);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setSyncCode(code);
      setCodeError('Copia manuale: il codice è stato messo nel campo qui sotto.');
    }
  };

  const handlePushAll = async () => {
    setSyncBusy(true);
    setFullSyncStatus('📤 Invio di tutti i dati al cloud...');
    const ok = await syncAllNow();
    setSyncBusy(false);
    setFullSyncStatus(
      ok
        ? '✅ Tutti i dati sono stati inviati al cloud: un nuovo telefono li riceverà subito.'
        : '❌ Sincronizzazione non riuscita: controlla la connessione.'
    );
  };

  const handlePullAll = async () => {
    setSyncBusy(true);
    setFullSyncStatus('📥 Recupero di tutti i dati dal cloud...');
    const ok = await pullAllFromCloud();
    setSyncBusy(false);
    setFullSyncStatus(
      ok
        ? '✅ Dati aggiornati dal cloud (utenti, tavoli, magazzino, scontrini).'
        : '❌ Nessun dato ricevuto dal cloud.'
    );
  };

  const handleLanConnect = async () => {
    const url = lanUrl.trim();
    if (!url) return;
    setLanConnecting(true);
    setLanStatus('🔄 Connessione al server locale...');
    const device = getDevice();
    const ok = await syncManager.connect(url, device.name, device.role);
    setLanConnecting(false);
    if (ok) {
      setLanStatus(
        `✅ Connesso al server locale (${syncManager.getClientsCount()} dispositivi)`
      );
    } else {
      setLanStatus(
        "❌ Connessione fallita: verifica l'indirizzo e che il server sia avviato."
      );
    }
  };

  const handleSaveDevice = () => {
    const updated = updateDevice({
      name: deviceName.trim() || 'Dispositivo',
      role: deviceRole,
    });
    setDevice(updated);
    firebaseSyncManager.refreshDevice();
    setConnectionStatus('💾 Nome dispositivo aggiornato.');
  };

  const shareCode = getRuntimeConfig() || getEffectiveConfig();
  const shareCodeValue = shareCode ? encodeSyncCode(shareCode) : '';

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-neutral-800/60 border-b border-neutral-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-orange-400" />
            <h3 className="font-bold text-white text-base">
              Sincronizzazione Multi-Dispositivo
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
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
              <div className="flex-1">
                <div className="text-sm font-bold text-white">
                  {isConnected
                    ? 'Sincronizzazione attiva'
                    : isConnecting
                    ? 'Connessione...'
                    : 'Non connesso'}
                </div>
                <div className="text-xs text-neutral-400">
                  {isConnected
                    ? `${Math.max(devices.length, 1)} dispositivo/i in uso`
                    : 'Modalità singolo dispositivo (dati salvati sul telefono)'}
                </div>
              </div>
              {isConnected && (
                <button
                  onClick={handleConnect}
                  className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                  title="Riconnetti"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* ═══ Questo dispositivo ═══ */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-300">
              <Smartphone className="w-3.5 h-3.5" />
              Questo dispositivo
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Nome (es. Cassa)"
                className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-sm text-white outline-none focus:border-orange-500"
              />
              <select
                value={deviceRole}
                onChange={(e) => setDeviceRole(e.target.value)}
                className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-sm text-white outline-none focus:border-orange-500"
              >
                <option value="cassa">Cassa</option>
                <option value="cucina">Cucina</option>
                <option value="bar">Bar</option>
                <option value="sala">Sala</option>
                <option value="magazzino">Magazzino</option>
                <option value="terminale">Terminale</option>
              </select>
            </div>
            <button
              onClick={handleSaveDevice}
              className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs transition-colors"
            >
              Salva nome dispositivo
            </button>
          </div>

          {/* ═══ Codice di sincronizzazione ═══ */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-orange-300">
                <Link2 className="w-3.5 h-3.5" />
                Codice di sincronizzazione
              </div>
              {isConfigured && (
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-semibold text-neutral-200 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" /> Copiato
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copia
                    </>
                  )}
                </button>
              )}
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Incolla lo stesso codice su <strong>tutti i telefoni</strong> per
              collegarli: i dati (cassa, tavoli, magazzino) si aggiornano
              automaticamente su tutti i dispositivi, anche con reti diverse.
            </p>

            <textarea
              value={syncCode}
              onChange={(e) => {
                setSyncCode(e.target.value);
                setCodeError('');
              }}
              rows={3}
              placeholder="Incolla qui il codice (base64 oppure JSON)"
              className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-[11px] font-mono text-neutral-200 outline-none focus:border-orange-500 resize-none"
            />

            {codeError && (
              <div className="text-[11px] text-rose-400 font-semibold">{codeError}</div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSaveCode}
                disabled={isConnecting || !syncCode.trim()}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                {isConnecting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                Collega questo dispositivo
              </button>
              {isConfigured && (
                <button
                  onClick={handleForget}
                  className="px-3 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all"
                  title="Rimuovi il codice da questo dispositivo"
                >
                  <Unlink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isConfigured && shareCodeValue && (
              <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
                <div className="text-[10px] text-neutral-500 font-bold mb-1">
                  CODICE DA CONDIVIDERE
                </div>
                <code className="block text-[10px] font-mono text-emerald-300 break-all">
                  {shareCodeValue}
                </code>
              </div>
            )}
          </div>

          {/* ═══ Dispositivi collegati ═══ */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-300">
              <Users className="w-3.5 h-3.5" />
              Dispositivi ({devices.length})
            </div>
            {devices.length === 0 ? (
              <div className="text-[11px] text-neutral-500">
                Nessun dispositivo registrato nel cloud.
              </div>
            ) : (
              <div className="space-y-1.5">
                {devices.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-900 border border-neutral-800"
                  >
                    <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {d.name}
                        {d.id === device.id && (
                          <span className="ml-1.5 text-[10px] font-normal text-emerald-400">
                            (questo dispositivo)
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-500 capitalize">
                        {d.role} · {d.platform}
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ═══ Sincronizzazione completa ═══ */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-300">
              <RefreshCw className="w-3.5 h-3.5" />
              Sincronizzazione completa
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Per passare tutto (utenti, tavoli, magazzino, scontrini) a un
              telefono nuovo: invia tutto al cloud, poi sul nuovo telefono
              incolla il codice e scegli &quot;Ripristina dal cloud&quot;.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handlePushAll}
                disabled={syncBusy || !isConnected}
                className="px-3 py-2.5 rounded-xl bg-amber-950/50 border border-amber-800/50 text-amber-300 hover:bg-amber-900/40 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncBusy ? 'animate-spin' : ''}`} />
                Invia tutto
              </button>
              <button
                onClick={handlePullAll}
                disabled={syncBusy || !isConnected}
                className="px-3 py-2.5 rounded-xl bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 hover:bg-emerald-900/40 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Ripristina dal cloud
              </button>
            </div>
            {fullSyncStatus && (
              <div className="text-[11px] text-neutral-300 leading-relaxed">
                {fullSyncStatus}
              </div>
            )}
          </div>

          {/* ═══ Rete locale (Wi-Fi) — alternativa senza cloud ═══ */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-300">
              <Wifi className="w-3.5 h-3.5" />
              Rete locale (Wi-Fi) — senza cloud
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Alternativa gratuita: avvia il server su un PC della stessa rete
              (<code className="text-orange-300">npm run server</code>) e inserisci
              qui il suo indirizzo. Funziona solo sulla stessa rete Wi-Fi.
            </p>
            <div className="flex gap-2">
              <input
                value={lanUrl}
                onChange={(e) => setLanUrl(e.target.value)}
                placeholder="http://192.168.1.100:3001"
                className="flex-1 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-mono text-neutral-200 outline-none focus:border-orange-500"
              />
              <button
                onClick={handleLanConnect}
                disabled={lanConnecting || !lanUrl.trim()}
                className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 font-bold text-xs transition-colors whitespace-nowrap"
              >
                {lanConnecting ? 'Connessione...' : 'Collega'}
              </button>
            </div>
            {lanStatus && (
              <div className="text-[11px] text-neutral-400">{lanStatus}</div>
            )}
          </div>

          {/* Come aggiungere un telefono */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-300">
              <Zap className="w-3.5 h-3.5" />
              Come aggiungere un altro telefono
            </div>
            <ol className="text-[11px] text-neutral-400 space-y-1.5 pl-4 list-decimal">
              <li>
                Installa l&apos;app su tutti i telefoni (stesso file APK).
              </li>
              <li>
                Sul primo telefono apri questa finestra e tocca{' '}
                <strong>Copia</strong> per copiare il codice.
              </li>
              <li>
                Incolla il codice negli altri telefoni e tocca{' '}
                <strong>Collega questo dispositivo</strong>.
              </li>
              <li>
                Fatto: da questo momento cassa, tavoli e magazzino sono
                sincronizzati su tutti i dispositivi.
              </li>
            </ol>
          </div>

          {/* Status Message */}
          {connectionStatus && (
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300">
              {connectionStatus}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                disabled={isConnecting || !isConfigured}
                className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-500/20"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connessione...
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    {isConfigured ? 'Riconnetti al Cloud' : 'Configura il codice sopra'}
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  firebaseSyncManager.disconnect();
                  setIsConnected(false);
                  setConnectionStatus('🔌 Disconnesso.');
                }}
                className="w-full py-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <X className="w-4 h-4" />
                Disconnetti
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-950/40 border-t border-neutral-800/60">
          <div className="flex items-center justify-between text-[11px] text-neutral-500">
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              <span>
                {currentUser ? `Utente: ${currentUser.displayName}` : 'Cloud Sync'}
              </span>
            </div>
            <span className="font-mono">Sea POS v{__APP_VERSION__}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
