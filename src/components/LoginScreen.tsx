/**
 * 🔐 Accesso al sistema
 *
 * Regole di sicurezza:
 *  - nessun accesso automatico: all'avvio si parte sempre da qui
 *  - i campi sono VUOTI (niente Admin/5555 precompilati)
 *  - nessun account predefinito esiste nell'app
 *  - la password non viene mai salvata; al massimo il nome utente
 */

import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Cloud,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  RefreshCw,
  User,
  Waves,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SyncModal } from './SyncModal';
import updateManager from '../utils/UpdateManager';
import { Btn, Field, Input } from './ui';

const REMEMBER_KEY = 'sea_pos_remember_username_v1';

export const LoginScreen: React.FC = () => {
  const { login, profile } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [remember, setRemember] = useState(false);

  // Solo il NOME UTENTE viene ricordato (mai la password)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setUsername(saved);
        setRemember(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrorMessage('');

    if (!username.trim()) {
      setErrorMessage('Inserisci il tuo nome utente.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Inserisci la password.');
      return;
    }

    setIsLoading(true);
    const res = login(username, password);
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.message || 'Nome utente o password non corretti.');
      return;
    }

    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, username.trim());
      else localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* ignore */
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    await updateManager.checkForUpdates();
    setCheckingUpdate(false);
  };

  const restaurantName = profile.name?.trim() || 'Sea POS';

  return (
    <div className="min-h-screen bg-ink-950 text-mist-100 flex flex-col font-sans">
      {/* Sfondo decorativo */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-violet-400/10 blur-3xl" />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm">
          {/* Marchio */}
          <div className="text-center mb-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-300 mb-3">
              <Waves className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">{restaurantName}</h1>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-mist-500">
              Punto cassa
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="surface p-5 space-y-4 animate-slideUp"
          >
            <Field label="Nome utente">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist-500 pointer-events-none" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Il tuo nome utente"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  className="!pl-10"
                />
              </div>
            </Field>

            <Field label="Password">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist-500 pointer-events-none" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••"
                  autoCapitalize="none"
                  autoComplete="current-password"
                  className="!pl-10 !pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-mist-500 hover:text-mist-100 hover:bg-ink-800 transition-colors"
                  aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-ink-600 bg-ink-900 accent-brand-500"
              />
              <span className="text-xs text-mist-500">Ricorda il nome utente</span>
            </label>

            {errorMessage && (
              <div className="rounded-xl bg-rose-600/15 border border-rose-400/30 px-3.5 py-2.5 text-xs font-semibold text-rose-400">
                {errorMessage}
              </div>
            )}

            <Btn type="submit" variant="primary" size="lg" full disabled={isLoading}>
              {isLoading ? 'Accesso…' : 'Accedi'}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </Btn>
          </form>

          {/* Strumenti */}
          <div className="mt-4 grid grid-cols-1 gap-2">
            <Btn
              onClick={() => setShowSyncModal(true)}
              variant="soft"
              size="sm"
              className="justify-start"
            >
              <Cloud className="w-3.5 h-3.5 text-brand-300" />
              Collega un nuovo dispositivo
            </Btn>
            <Btn
              onClick={handleCheckUpdate}
              variant="ghost"
              size="sm"
              className="justify-start"
              disabled={checkingUpdate}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`}
              />
              {checkingUpdate ? 'Controllo in corso…' : 'Verifica aggiornamenti'}
            </Btn>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-mist-500 text-center">
            Ogni dipendente entra con le proprie credenziali.
            <br />
            Se non riesci ad accedere, chiedi all'amministratore di reimpostare la tua password.
          </p>
        </div>
      </div>

      {showSyncModal && <SyncModal onClose={() => setShowSyncModal(false)} />}
    </div>
  );
};
