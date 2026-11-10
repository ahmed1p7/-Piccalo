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
              <div className="text-xs text-mist-500 truncate">
                SSID: <strong className="text-mist-300">{profile.wifiSsid}</strong>
              </div>
            </div>
          </div>

          <Btn variant="soft" size="sm" onClick={toggleWifi} className="shrink-0">
            {wifiConnected ? 'Disconnetti' : 'Riconnetti'}
          </Btn>
        </div>

        {/* Multi-device local network guide */}
        <div className="space-y-3">
          <h4 className="section-title flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            Come connettere più Tablet / Smartphone nel Ristorante:
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="surface-raised p-3 space-y-1">
              <Tablet className="w-5 h-5 text-brand-300" />
              <div className="font-bold text-mist-100">Tablet Cameriere / Sala</div>
              <p className="text-[11px] text-mist-500">
                Collega il tablet al Wi-Fi del locale per prendere le comande ai tavoli e inviarle
                subito in cassa e cucina.
              </p>
            </div>

            <div className="surface-raised p-3 space-y-1">
              <Smartphone className="w-5 h-5 text-violet-400" />
              <div className="font-bold text-mist-100">Tablet Cucina / Dispensa</div>
              <p className="text-[11px] text-mist-500">
                Posiziona uno schermo o tablet vicino ai fornelli per visualizzare le scorte e i consumi
                in tempo reale.
              </p>
            </div>
          </div>
        </div>

        {/* Wi-Fi Credentials Settings */}
        <form onSubmit={handleSave} className="space-y-3 border-t border-ink-700 pt-4">
          <div className="section-title">Impostazioni Wi-Fi del Locale:</div>

          <Field label="Nome Rete Wi-Fi (SSID):">
            <Input
              type="text"
              value={ssid}
              onChange={(e) => setSsid(e.target.value)}
            />
          </Field>

          <Field label="Password Wi-Fi:">
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="font-mono"
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
            <Btn variant="primary" size="sm" type="submit">
              Salva Rete
            </Btn>
          </div>
        </form>
      </div>
    </Modal>
  );
};
