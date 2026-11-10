import React from 'react';
import { useApp } from '../context/AppContext';
import { Check, Info, Smartphone, Tablet, Wifi, WifiOff, X } from 'lucide-react';
import { Btn, Field, Input, Modal } from './ui';

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
<<<<<<< HEAD
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

=======
    <Modal
      open
      onClose={onClose}
      size="md"
      title={
        <span className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-mint-400" />
          Rete Wi-Fi &amp; Dispositivi Connessi
        </span>
      }
      footer={
        <Btn variant="soft" onClick={onClose}>
          Chiudi
        </Btn>
      }
    >
      <div className="space-y-4">
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
        {/* Status card */}
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${
            wifiConnected
              ? 'border-mint-400/30 bg-mint-600/10'
              : 'border-rose-400/30 bg-rose-600/10'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {wifiConnected ? (
              <Wifi className="w-6 h-6 shrink-0 text-mint-400 animate-pulse" />
            ) : (
              <WifiOff className="w-6 h-6 shrink-0 text-rose-400" />
            )}
            <div className="min-w-0">
              <div className="text-sm font-bold text-mist-100">
                {wifiConnected ? 'Rete Locale Wi-Fi Connessa' : 'Rete Wi-Fi Disconnessa'}
              </div>
<<<<<<< HEAD
              <div className="text-xs text-neutral-400">
                SSID: <strong>{profile.wifiSsid}</strong>
=======
              <div className="text-xs text-mist-500 truncate">
                SSID: <strong className="text-mist-300">{profile.wifiSsid}</strong>
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
              </div>
            </div>
          </div>

<<<<<<< HEAD
          <button
            onClick={toggleWifi}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold"
          >
=======
          <Btn variant="soft" size="sm" onClick={toggleWifi} className="shrink-0">
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
            {wifiConnected ? 'Disconnetti' : 'Riconnetti'}
          </Btn>
        </div>

        {/* Multi-device local network guide */}
        <div className="space-y-3">
          <h4 className="section-title flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            Come connettere più Tablet / Smartphone nel Ristorante:
          </h4>

<<<<<<< HEAD
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
              <Tablet className="w-5 h-5 text-blue-400" />
              <div className="font-bold text-white">Tablet Cameriere / Sala</div>
              <p className="text-[11px] text-neutral-400">
=======
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="surface-raised p-3 space-y-1">
              <Tablet className="w-5 h-5 text-brand-300" />
              <div className="font-bold text-mist-100">Tablet Cameriere / Sala</div>
              <p className="text-[11px] text-mist-500">
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                Collega il tablet al Wi-Fi del locale per prendere le comande ai tavoli e inviarle
                subito in cassa e cucina.
              </p>
            </div>

<<<<<<< HEAD
            <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
              <Smartphone className="w-5 h-5 text-orange-400" />
              <div className="font-bold text-white">Tablet Cucina / Dispensa</div>
              <p className="text-[11px] text-neutral-400">
=======
            <div className="surface-raised p-3 space-y-1">
              <Smartphone className="w-5 h-5 text-violet-400" />
              <div className="font-bold text-mist-100">Tablet Cucina / Dispensa</div>
              <p className="text-[11px] text-mist-500">
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                Posiziona uno schermo o tablet vicino ai fornelli per visualizzare le scorte e i consumi
                in tempo reale.
              </p>
            </div>
          </div>
        </div>

        {/* Wi-Fi Credentials Settings */}
<<<<<<< HEAD
        <form onSubmit={handleSave} className="space-y-3 pt-2 border-t border-neutral-800 text-xs">
          <div className="font-bold text-neutral-300">Impostazioni Wi-Fi del Locale:</div>
          <div>
            <label className="text-neutral-400 block mb-1">Nome Rete Wi-Fi (SSID):</label>
            <input
              type="text"
              value={ssid}
              onChange={(e) => setSsid(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
=======
        <form onSubmit={handleSave} className="space-y-3 border-t border-ink-700 pt-4">
          <div className="section-title">Impostazioni Wi-Fi del Locale:</div>

          <Field label="Nome Rete Wi-Fi (SSID):">
            <Input
              type="text"
              value={ssid}
              onChange={(e) => setSsid(e.target.value)}
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
            />
          </Field>

<<<<<<< HEAD
          <div>
            <label className="text-neutral-400 block mb-1">Password Wi-Fi:</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
=======
          <Field label="Password Wi-Fi:">
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="font-mono"
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
            />
          </Field>

          <div className="flex items-center justify-between gap-3 pt-1">
            {isSaved ? (
              <span className="text-xs font-bold text-mint-400 flex items-center gap-1">
                <Check className="w-4 h-4" /> Salvato!
              </span>
            ) : (
              <span />
            )}
<<<<<<< HEAD
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs"
            >
=======
            <Btn variant="primary" size="sm" type="submit">
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
              Salva Rete
            </Btn>
          </div>
        </form>
<<<<<<< HEAD

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold"
          >
            Chiudi
          </button>
        </div>
=======
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
      </div>
    </Modal>
  );
};
