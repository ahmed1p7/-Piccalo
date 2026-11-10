import React from 'react';
import { useApp } from '../context/AppContext';
import { Check, Info, Smartphone, Tablet, Wifi, WifiOff, X } from 'lucide-react';

interface WifiModalProps {
  onClose: () => void;
}

export const WifiModal: React.FC<WifiModalProps> = ({ onClose }) => {
  const { profile, wifiConnected, toggleWifi, updateProfile } = useApp();
  const [ssid, setSsid] = React.useState(profile.wifiSsid);
  const [password, setPassword] = React.useState(profile.wifiPassword || '');
  const [isSaved, setIsSaved] = React.useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ wifiSsid: ssid, wifiPassword: password });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Rete Wi-Fi &amp; Dispositivi Connessi</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status card */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between ${
            wifiConnected
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {wifiConnected ? (
              <Wifi className="w-6 h-6 text-emerald-400 animate-pulse" />
            ) : (
              <WifiOff className="w-6 h-6 text-rose-400" />
            )}
            <div>
              <div className="font-bold text-sm">
                {wifiConnected ? 'Rete Locale Wi-Fi Connessa' : 'Rete Wi-Fi Disconnessa'}
              </div>
              <div className="text-xs text-neutral-400">
                SSID: <strong>{profile.wifiSsid}</strong>
              </div>
            </div>
          </div>

          <button
            onClick={toggleWifi}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold"
          >
            {wifiConnected ? 'Disconnetti' : 'Riconnetti'}
          </button>
        </div>

        {/* Multi-device local network guide */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            Come connettere più Tablet / Smartphone nel Ristorante:
          </h4>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
              <Tablet className="w-5 h-5 text-blue-400" />
              <div className="font-bold text-white">Tablet Cameriere / Sala</div>
              <p className="text-[11px] text-neutral-400">
                Collega il tablet al Wi-Fi del locale per prendere le comande ai tavoli e inviarle
                subito in cassa e cucina.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
              <Smartphone className="w-5 h-5 text-orange-400" />
              <div className="font-bold text-white">Tablet Cucina / Dispensa</div>
              <p className="text-[11px] text-neutral-400">
                Posiziona uno schermo o tablet vicino ai fornelli per visualizzare le scorte e i consumi
                in tempo reale.
              </p>
            </div>
          </div>
        </div>

        {/* Wi-Fi Credentials Settings */}
        <form onSubmit={handleSave} className="space-y-3 pt-2 border-t border-neutral-800 text-xs">
          <div className="font-bold text-neutral-300">Impostazioni Wi-Fi del Locale:</div>
          <div>
            <label className="text-neutral-400 block mb-1">Nome Rete Wi-Fi (SSID):</label>
            <input
              type="text"
              value={ssid}
              onChange={(e) => setSsid(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-neutral-400 block mb-1">Password Wi-Fi:</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {isSaved ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" /> Salvato!
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs"
            >
              Salva Rete
            </button>
          </div>
        </form>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
