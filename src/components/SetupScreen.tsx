/**
 * 🆕 Configurazione iniziale — primo avvio
 *
 * L'app non contiene più alcun account predefinito: al primo avvio
 * (o dopo un "Ripristino di Fabbrica") il titolare crea il proprio
 * account amministratore. Da qui in poi ogni dipendente entra con
 * le credenziali che l'amministratore assegna.
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  KeyRound,
  Store,
  User,
  Waves,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Btn, Field, Input } from './ui';

export const SetupScreen: React.FC = () => {
  const {
    completeSetup,
    syncStatus,
    syncError,
    availableRestaurants,
    selectRestaurant,
  } = useApp();

  const [picking, setPicking] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  const [restaurantName, setRestaurantName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Scegli un nome utente per te (es. titolare, marco, admin).');
      return;
    }
    if (pin.length < 4) {
      setError('La password deve avere almeno 4 caratteri.');
      return;
    }
    if (pin !== pinConfirm) {
      setError('Le due password non coincidono.');
      return;
    }

    setBusy(true);
    const res = completeSetup({ restaurantName, username, pin });
    setBusy(false);

    if (!res.success) {
      setError(res.message || 'Configurazione non riuscita.');
    }
  };

  return (
    <div className="min-h-screen bg-ink-950 text-mist-100 flex flex-col font-sans">
      {/* Sfondo decorativo */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-violet-400/10 blur-3xl" />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          {/* Intestazione */}
          <div className="text-center mb-7">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-300 mb-4">
              <Waves className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Configurazione iniziale</h1>
            <p className="mt-2 text-sm text-mist-500 leading-relaxed">
              Pochi secondi e il tuo punto cassa è pronto.
              <br />
              L'app parte <strong className="text-mist-300">completamente vuota</strong>:
              nessun dato di esempio, nessun account condiviso.
            </p>
          </div>

          {/* ⚠️ Avviso: il database cloud è bloccato → la sincronizzazione
              non funzionerà finché le regole non vengono pubblicate. */}
          {syncStatus === 'error' && (
            <div className="mb-4 rounded-2xl bg-rose-600/10 border border-rose-400/30 p-4 space-y-2 animate-slideUp">
              <div className="flex items-start gap-2 text-xs font-bold text-rose-400">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                <span>Sincronizzazione cloud bloccata</span>
              </div>
              <p className="text-[11px] text-mist-300 leading-relaxed break-words">
                {syncError}
              </p>
              <p className="text-[11px] text-mist-300 leading-relaxed">
                Senza le regole pubblicate questo dispositivo resta
                <strong className="text-mist-100"> scollegato</strong> dagli
                altri: i dati non passano da telefono a telefono.
              </p>
              <p className="text-[11px] text-mist-300 leading-relaxed">
                Apri{' '}
                <span className="text-brand-300">
                  console.firebase.google.com → sea-restaurant → Realtime
                  Database → Rules
                </span>{' '}
                e pubblica{' '}
                <code className="text-brand-300">
                  {'{ "rules": { ".read": true, ".write": true } }'}
                </code>
                , poi riapri l'app.
              </p>
            </div>
          )}


          {/* 📇 Se nel cloud ci sono più ristoranti → l'utente sceglie
              con quale collegarsi (nessun codice da incollare). */}
          {availableRestaurants.length > 1 && !picking && !joining && (
            <div className="mb-4 rounded-2xl bg-ink-900 border border-brand-500/25 p-4 space-y-3 animate-slideUp">
              <div className="flex items-start gap-2 text-xs font-bold text-brand-300">
                <Building2 className="w-4 h-4 shrink-0 mt-px" />
                <span>Nel cloud ci sono più ristoranti</span>
              </div>
              <p className="text-[11px] text-mist-400 leading-relaxed">
                Scegli con quale vuoi lavorare: i dati di ogni ristorante
                stanno in uno spazio separato e non si mescolano mai.
              </p>
              <div className="space-y-2">
                {availableRestaurants.map((r) => (
                  <button
                    key={r.rid}
                    type="button"
                    onClick={async () => {
                      setJoining(r.rid);
                      await selectRestaurant(r.rid);
                      setJoining(null);
                    }}
                    className="w-full text-left surface-raised p-3.5 flex items-center gap-3 hover:border-brand-500/40 transition-colors"
                  >
                    <div className="h-9 w-9 shrink-0 rounded-xl bg-brand-500/15 text-brand-300 border border-brand-500/25 flex items-center justify-center">
                      <Store className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-mist-100 truncate">
                        {r.name || 'Ristorante'}
                      </div>
                      {r.city && (
                        <div className="text-[11px] text-mist-500 truncate">{r.city}</div>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-brand-400 shrink-0" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="text-[11px] text-mist-400 underline underline-offset-2"
              >
                Crea invece un ristorante nuovo
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="surface p-5 space-y-4 animate-slideUp">
            <Field
              label="Nome del ristorante"
              hint="Potrai cambiarlo in qualsiasi momento dalle impostazioni."
            >
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist-500 pointer-events-none" />
                <Input
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="es. Ristorante Malih"
                  className="!pl-10"
                />
              </div>
            </Field>

            <Field label="Il tuo nome utente (amministratore)">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist-500 pointer-events-none" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="es. titolare"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="!pl-10"
                />
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Password">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist-500 pointer-input-none pointer-events-none" />
                  <Input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    autoCapitalize="none"
                    className="!pl-10"
                  />
                </div>
              </Field>

              <Field label="Ripeti password">
                <Input
                  type="password"
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value)}
                  placeholder="••••"
                  autoCapitalize="none"
                />
              </Field>
            </div>

            {error && (
              <div className="rounded-xl bg-rose-600/15 border border-rose-400/30 px-3.5 py-2.5 text-xs font-semibold text-rose-400">
                {error}
              </div>
            )}

            <Btn type="submit" variant="primary" size="lg" full disabled={busy}>
              {busy ? 'Creazione…' : 'Crea il mio account'}
              {!busy && <ArrowRight className="w-4 h-4" />}
            </Btn>

            <p className="text-[11px] leading-relaxed text-mist-500 text-center">
              Sei l'amministratore: potrai creare i conti dei dipendenti
              (camerieri, cucina, cassa) e assegnare le permessi.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
