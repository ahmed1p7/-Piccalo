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
<<<<<<< HEAD
    <div className="min-h-screen bg-[#0f0f0f] text-neutral-200 flex flex-col justify-between selection:bg-amber-500 selection:text-neutral-950">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-neutral-800/80 bg-[#1a1a1a]/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 flex items-center justify-center font-black text-neutral-950 shadow-md shadow-amber-500/20">
            <Waves className="w-5 h-5 text-neutral-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-neutral-100">
                Sea
              </span>
              <span className="text-[10px] font-mono text-amber-400 font-semibold uppercase tracking-wider">
                POS Ristorante
              </span>
            </div>
            <p className="text-xs text-neutral-400">{profile.name}</p>
          </div>
        </div>

        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border ${
            wifiConnected
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/20'
              : 'bg-rose-950/40 text-rose-300 border-rose-500/20'
          }`}
        >
          <Wifi className="w-3.5 h-3.5" />
          <span>{wifiConnected ? profile.wifiSsid : 'Rete Offline'}</span>
        </div>
      </header>

      {/* Main Centered Login Box */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-[#1a1a1a] border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Header */}
          <div className="text-center space-y-1 mb-6">
            <h1 className="text-xl font-bold text-neutral-100 tracking-tight">Accesso al Sistema</h1>
            <p className="text-xs text-neutral-400">
              Inserisci le tue credenziali o il PIN per iniziare il turno
            </p>
          </div>

          {/* Mode Switcher: Tastiera vs Tastierino POS */}
          <div className="flex rounded-lg bg-neutral-900/80 p-1 mb-5 border border-neutral-800">
            <button
              type="button"
              onClick={() => setInputMode('form')}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                inputMode === 'form'
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Tastiera Standard
            </button>
            <button
              type="button"
              onClick={() => setInputMode('keypad')}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                inputMode === 'keypad'
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Tastierino Numerico (Touch)
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
              {errorMessage}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300 block">
                Nome Utente
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Nome utente"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrorMessage('');
                  }}
                  className="w-full bg-neutral-900 border border-neutral-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors font-medium"
=======
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
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                />
              </div>
            </Field>

<<<<<<< HEAD
            {/* Password Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300 block">
                  Password o PIN
                </label>
                <span className="text-[11px] text-neutral-500 font-mono">4 cifre</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
=======
            <Field label="Password">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mist-500 pointer-events-none" />
                <Input
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                  type={showPassword ? 'text' : 'password'}
                  value={password}
<<<<<<< HEAD
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  className="w-full bg-neutral-900 border border-neutral-700/80 rounded-xl pl-9 pr-10 py-2.5 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors font-mono tracking-widest text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-100 transition-colors p-1"
                  tabIndex={-1}
=======
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
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>

<<<<<<< HEAD
            {/* Touch Keypad for POS Touchscreens */}
            {inputMode === 'keypad' && (
              <div className="pt-2">
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleKeypadDigit(digit)}
                      className="py-3 bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 rounded-xl font-mono text-lg font-bold text-neutral-100 border border-neutral-800 transition-all active:scale-95 shadow-sm"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleKeypadClear}
                    className="py-3 bg-neutral-900/60 hover:bg-neutral-800 active:bg-neutral-700 rounded-xl text-xs font-semibold text-neutral-400 border border-neutral-800 transition-all active:scale-95"
                  >
                    C
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadDigit('0')}
                    className="py-3 bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700 rounded-xl font-mono text-lg font-bold text-neutral-100 border border-neutral-800 transition-all active:scale-95 shadow-sm"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleKeypadBackspace}
                    className="py-3 bg-neutral-900/60 hover:bg-neutral-800 active:bg-neutral-700 rounded-xl flex items-center justify-center text-neutral-400 hover:text-neutral-100 border border-neutral-800 transition-all active:scale-95"
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Login Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !username.trim() || !password.trim()}
              className="w-full mt-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-bold text-xs sm:text-sm transition-all shadow-md shadow-amber-500/20 active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>Accedi al Turno</span>
              <ArrowRight className="w-4 h-4" />
            </button>
=======
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
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
          </form>

          {/* Strumenti */}
          <div className="mt-4 grid grid-cols-1 gap-2">
            <Btn
              onClick={() => setShowSyncModal(true)}
<<<<<<< HEAD
              className="px-3 py-2.5 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300 hover:bg-amber-900/40 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
=======
              variant="soft"
              size="sm"
              className="justify-start"
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
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
<<<<<<< HEAD
              className="px-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
=======
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`}
              />
              {checkingUpdate ? 'Controllo in corso…' : 'Verifica aggiornamenti'}
            </Btn>
          </div>

<<<<<<< HEAD
          <p className="mt-2 text-[11px] text-neutral-500 text-center leading-relaxed">
            Nuovo telefono? Clicca <strong>Collega un nuovo dispositivo</strong> e
            incolla il codice di sincronizzazione: arrivano subito utenti, tavoli,
            magazzino e scontrini. Non serve conoscere il PIN.
          </p>

          {/* Quick-fill helper for test accounts */}
          <div className="mt-5 pt-4 border-t border-neutral-800/80">
            <div className="text-[11px] text-neutral-400 font-medium mb-2">
              Seleziona rapida account di prova:
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('Admin', '5555')}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-left hover:border-amber-500/50 transition-colors"
              >
                <div className="text-xs font-semibold text-neutral-100">Admin (5555)</div>
                <div className="text-[10px] text-amber-400">Direttore • Tutti i permessi</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('alessio', '1111')}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-left hover:border-amber-500/50 transition-colors"
              >
                <div className="text-xs font-semibold text-neutral-100">Alessio (1111)</div>
                <div className="text-[10px] text-neutral-400">Cameriere • Tavoli &amp; Cassa</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('luigi', '2222')}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-left hover:border-amber-500/50 transition-colors"
              >
                <div className="text-xs font-semibold text-neutral-100">Luigi (2222)</div>
                <div className="text-[10px] text-neutral-400">Cucina • Magazzino Dispensa</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('elena', '4444')}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-left hover:border-amber-500/50 transition-colors"
              >
                <div className="text-xs font-semibold text-neutral-100">Elena (4444)</div>
                <div className="text-[10px] text-neutral-400">Cassa • Conto &amp; Report</div>
              </button>
            </div>
          </div>
>>>>>>> 1c4b43691b05bfa1a7f1a73fe4124e224f6cf903
=======
          <p className="mt-4 text-[11px] leading-relaxed text-mist-500 text-center">
            Ogni dipendente entra con le proprie credenziali.
            <br />
            Se non riesci ad accedere, chiedi all'amministratore di reimpostare la tua password.
          </p>
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
        </div>
      </div>

      {showSyncModal && <SyncModal onClose={() => setShowSyncModal(false)} />}
<<<<<<< HEAD

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-neutral-800/80 bg-[#0f0f0f] text-neutral-400 text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Sea • Ristorante &amp; Bistrot POS</span>
        <span className="font-mono text-[11px] text-neutral-400">
          Rete Locale Wi-Fi Protetta
        </span>
      </footer>
=======
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
    </div>
  );
};
