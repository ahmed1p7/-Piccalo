/**
 * ⚙️ Impostazioni — dati del ristorante, Wi-Fi, account e manutenzione
 *
 * Con i dati di esempio rimossi, questa schermata è il modo UNICO per
 * compilare i dati che finiscono sugli scontrini (indirizzo, P.IVA,
 * telefono, rete Wi-Fi del locale).
 */

import React, { useState } from 'react';
import {
  Building2,
  Cloud,
  Database,
  HardDriveDownload,
  KeyRound,
  Save,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  UploadCloud,
  Users,
  Wifi,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BackupModal } from './BackupModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { SyncModal } from './SyncModal';
import { Btn, Field, Input, Modal, SectionTitle } from './ui';

export const ImpostazioniView: React.FC = () => {
  const {
    profile,
    updateProfile,
    currentUser,
    setActiveView,
    users,
    restaurantId,
    syncWarning,
    lastBackupAt,
    backupSnapshot,
    restoreFromBackup,
    pushAllToCloud,
    cleanCloudDemo,
  } = useApp();

  const [protectMsg, setProtectMsg] = useState<string | null>(null);
  const [protectBusy, setProtectBusy] = useState(false);

  const [name, setName] = useState(profile.name || '');
  const [subTitle, setSubTitle] = useState(profile.subTitle || '');
  const [address, setAddress] = useState(profile.address || '');
  const [pIva, setPIva] = useState(profile.pIva || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [wifiSsid, setWifiSsid] = useState(profile.wifiSsid || '');
  const [wifiPassword, setWifiPassword] = useState(profile.wifiPassword || '');

  const [saved, setSaved] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSave = () => {
    updateProfile({
      name: name.trim(),
      subTitle: subTitle.trim(),
      address: address.trim(),
      pIva: pIva.trim(),
      phone: phone.trim(),
      wifiSsid: wifiSsid.trim(),
      wifiPassword: wifiPassword.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="min-h-screen bg-ink-950 text-mist-100 animate-fadeIn">
      <div className="mx-auto max-w-3xl px-3 sm:px-5 py-5 space-y-4">
        {/* Intestazione */}
        <div className="surface p-4 sm:p-5 flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-xl bg-brand-500/15 text-brand-300 border border-brand-500/25 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-mist-100">Impostazioni</h1>
            <p className="text-xs text-mist-500">
              Dati del ristorante, rete Wi-Fi e manutenzione
            </p>
          </div>
        </div>

        {/* Dati ristorante */}
        <div className="surface p-4 sm:p-5 space-y-4">
          <SectionTitle
            action={
              saved ? (
                <span className="text-[11px] font-bold text-mint-400">
                  ✓ Salvato
                </span>
              ) : null
            }
          >
            Dati del ristorante
          </SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="es. Ristorante Malih"
              />
            </Field>
            <Field label="Sottotitolo">
              <Input
                value={subTitle}
                onChange={(e) => setSubTitle(e.target.value)}
                placeholder="es. Ristorante & Bistrot"
              />
            </Field>
          </div>

          <Field label="Indirizzo">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Via Roma 1, 00100 Roma"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Partita IVA">
              <Input
                value={pIva}
                onChange={(e) => setPIva(e.target.value)}
                placeholder="IT00000000000"
              />
            </Field>
            <Field label="Telefono">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+39 000 0000000"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Rete Wi-Fi del locale" hint="Appare sullo scontrino per gli ospiti.">
              <div className="relative">
                <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist-500 pointer-events-none" />
                <Input
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  placeholder="Nome rete"
                  className="!pl-10"
                />
              </div>
            </Field>
            <Field label="Password Wi-Fi">
              <Input
                value={wifiPassword}
                onChange={(e) => setWifiPassword(e.target.value)}
                placeholder="Password rete"
              />
            </Field>
          </div>

          <Btn variant="primary" onClick={handleSave} full>
            <Save className="w-4 h-4" />
            Salva i dati
          </Btn>
        </div>


        {/* 🛡️ Protezione dati */}
        <div className="surface p-4 sm:p-5 space-y-3">
          <SectionTitle
            action={
              <span className="text-[10px] font-bold uppercase tracking-wider text-mint-400">
                Attiva
              </span>
            }
          >
            🛡️ Protezione dei dati
          </SectionTitle>

          <p className="text-xs leading-relaxed text-mist-400">
            Ogni ristorante ha il <strong className="text-mist-200">proprio spazio
            nel cloud</strong>: i dati non si mescolano mai con quelli di un altro
            ristorante. In più l&apos;app tiene una copia di sicurezza locale
            ad ogni modifica.
          </p>

          <div className="surface-raised p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-mist-500">Spazio cloud</span>
              <code className="text-[11px] font-mono text-brand-300 bg-brand-500/10 border border-brand-500/20 rounded px-2 py-0.5">
                {restaurantId || 'non ancora assegnato'}
              </code>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-mist-500">Ultima copia locale</span>
              <span className="text-[11px] text-mist-200">
                {lastBackupAt
                  ? new Date(lastBackupAt).toLocaleString('it-IT')
                  : '—'}
              </span>
            </div>
          </div>

          {syncWarning && (
            <div className="rounded-xl border border-amber-600/40 bg-amber-600/10 p-3 text-[11px] leading-relaxed text-amber-400">
              ⚠️ {syncWarning}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Btn
              variant="soft"
              size="sm"
              disabled={protectBusy}
              onClick={() => {
                backupSnapshot();
                setProtectMsg('✓ Copia di sicurezza salvata su questo dispositivo.');
              }}
            >
              <HardDriveDownload className="w-4 h-4" />
              Salva copia locale
            </Btn>
            <Btn
              variant="soft"
              size="sm"
              disabled={protectBusy}
              onClick={() => {
                const res = restoreFromBackup();
                setProtectMsg(
                  res.success
                    ? '✓ ' + res.message
                    : '⚠️ ' + (res.message || 'Ripristino non riuscito.')
                );
              }}
            >
              <Sparkles className="w-4 h-4" />
              Ripristina dalla copia
            </Btn>
            <Btn
              variant="soft"
              size="sm"
              disabled={protectBusy}
              onClick={async () => {
                setProtectBusy(true);
                const ok = await pushAllToCloud();
                setProtectBusy(false);
                setProtectMsg(
                  ok
                    ? '✓ Tutti i dati di questo dispositivo sono stati inviati al cloud.'
                    : '⚠️ Cloud non raggiungibile: riprova quando c\'è rete.'
                );
              }}
            >
              <UploadCloud className="w-4 h-4" />
              Invia tutto al cloud
            </Btn>
            <Btn
              variant="soft"
              size="sm"
              disabled={protectBusy}
              onClick={async () => {
                setProtectBusy(true);
                const removed = await cleanCloudDemo();
                setProtectBusy(false);
                setProtectMsg(
                  removed > 0
                    ? `✓ Rimossi ${removed} vecchi elementi demo dal cloud.`
                    : '✓ Nessun dato demo trovato nel cloud.'
                );
              }}
            >
              <Trash2 className="w-4 h-4" />
              Pulisci dati demo
            </Btn>
          </div>

          {protectMsg && (
            <p className="text-[11px] leading-relaxed text-mist-300">{protectMsg}</p>
          )}
        </div>

        {/* Account e strumenti */}
        <div className="surface p-4 sm:p-5 space-y-3">
          <SectionTitle>Account e strumenti</SectionTitle>

          <div className="surface-raised p-3.5 flex items-center gap-3">
            <div
              className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-sm text-white ${currentUser?.avatarColor || 'bg-brand-600'}`}
            >
              {currentUser?.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-mist-100 truncate">
                {currentUser?.displayName}
              </div>
              <div className="text-[11px] text-mist-500 capitalize">
                {currentUser?.role.replace('_', ' ')} · {users.length}{' '}
                {users.length === 1 ? 'account' : 'account'} in totale
              </div>
            </div>
            {currentUser?.permissions.canManageUsers && (
              <Btn
                variant="soft"
                size="sm"
                onClick={() => setActiveView('utenti')}
              >
                <Users className="w-3.5 h-3.5" />
                Personale
              </Btn>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Btn variant="soft" onClick={() => setShowPassword(true)}>
              <KeyRound className="w-4 h-4" />
              Cambia password
            </Btn>
            <Btn variant="soft" onClick={() => setShowSync(true)}>
              <Cloud className="w-4 h-4" />
              Sincronizzazione
            </Btn>
            {currentUser?.permissions.canManageBackup && (
              <Btn variant="soft" onClick={() => setShowBackup(true)}>
                <Database className="w-4 h-4" />
                Backup
              </Btn>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="surface p-4 sm:p-5 flex items-start gap-3">
          <Building2 className="w-4 h-4 text-mist-500 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-mist-500">
            I dati del ristorante compaiono sull&apos;intestazione degli scontrini.
            La rete Wi-Fi viene offerta agli ospiti sullo scontrino.
            Tutte le modifiche vengono sincronizzate automaticamente su
            tutti i dispositivi collegati.
          </p>
        </div>
      </div>

      {showBackup && <BackupModal onClose={() => setShowBackup(false)} />}
      {showSync && <SyncModal onClose={() => setShowSync(false)} />}
      {showPassword && <ChangePasswordModal onClose={() => setShowPassword(false)} />}
    </div>
  );
};
