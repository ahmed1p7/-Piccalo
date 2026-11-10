import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SyncModal } from './SyncModal';
import updateManager from '../utils/UpdateManager';
import {
  ArrowRight,
  Cloud,
  Delete,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  RefreshCw,
  User,
  Waves,
  Wifi,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, profile, wifiConnected } = useApp();

  const [username, setUsername] = useState<string>('Admin');
  const [password, setPassword] = useState<string>('5555');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inputMode, setInputMode] = useState<'form' | 'keypad'>('form');
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const res = login(username, password);
    setIsLoading(false);
    if (!res.success) {
      setErrorMessage(res.message || 'Nome utente o password non corretti.');
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    await updateManager.checkForUpdates();
    setCheckingUpdate(false);
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage('');
  };

  const handleKeypadDigit = (digit: string) => {
    if (password.length < 8) {
      setPassword((prev) => prev + digit);
      setErrorMessage('');
    }
  };

  const handleKeypadBackspace = () => {
    setPassword((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleKeypadClear = () => {
    setPassword('');
    setErrorMessage('');
  };

  return (
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
                />
              </div>
            </div>

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
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••"
                  value={password}
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
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

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
          </form>
<<<<<<< HEAD
=======

          {/* Collega un nuovo dispositivo + aggiornamenti */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowSyncModal(true)}
              className="px-3 py-2.5 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300 hover:bg-amber-900/40 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Cloud className="w-4 h-4" />
              Collega un nuovo dispositivo
            </button>
            <button
              type="button"
              onClick={handleCheckUpdate}
              disabled={checkingUpdate}
              className="px-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${checkingUpdate ? 'animate-spin' : ''}`} />
              Verifica aggiornamenti
            </button>
          </div>

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
        </div>
      </main>

      {showSyncModal && <SyncModal onClose={() => setShowSyncModal(false)} />}

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-neutral-800/80 bg-[#0f0f0f] text-neutral-400 text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Sea • Ristorante &amp; Bistrot POS</span>
        <span className="font-mono text-[11px] text-neutral-400">
          Rete Locale Wi-Fi Protetta
        </span>
      </footer>
    </div>
  );
};
