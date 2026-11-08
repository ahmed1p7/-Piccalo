import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowRight,
  Delete,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
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
    <div className="min-h-screen bg-[#070c18] text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-[#0a1122]/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-sky-400 flex items-center justify-center font-black text-slate-950 shadow-md shadow-cyan-500/20">
            <Waves className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">
                Sea
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-semibold uppercase tracking-wider">
                POS Ristorante
              </span>
            </div>
            <p className="text-xs text-slate-400">{profile.name}</p>
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
        <div className="w-full max-w-md bg-[#0d1527] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Header */}
          <div className="text-center space-y-1 mb-6">
            <h1 className="text-xl font-bold text-white tracking-tight">Accesso al Sistema</h1>
            <p className="text-xs text-slate-400">
              Inserisci le tue credenziali o il PIN per iniziare il turno
            </p>
          </div>

          {/* Mode Switcher: Tastiera vs Tastierino POS */}
          <div className="flex rounded-lg bg-slate-900/80 p-1 mb-5 border border-slate-800">
            <button
              type="button"
              onClick={() => setInputMode('form')}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                inputMode === 'form'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tastiera Standard
            </button>
            <button
              type="button"
              onClick={() => setInputMode('keypad')}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                inputMode === 'keypad'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
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
              <label className="text-xs font-semibold text-slate-300 block">
                Nome Utente
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Nome utente"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrorMessage('');
                  }}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 block">
                  Password o PIN
                </label>
                <span className="text-[11px] text-slate-500 font-mono">4 cifre</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors font-mono tracking-widest text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors p-1"
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
                      className="py-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 rounded-xl font-mono text-lg font-bold text-white border border-slate-800 transition-all active:scale-95 shadow-sm"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleKeypadClear}
                    className="py-3 bg-slate-900/60 hover:bg-slate-800 active:bg-slate-700 rounded-xl text-xs font-semibold text-slate-400 border border-slate-800 transition-all active:scale-95"
                  >
                    C
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadDigit('0')}
                    className="py-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 rounded-xl font-mono text-lg font-bold text-white border border-slate-800 transition-all active:scale-95 shadow-sm"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleKeypadBackspace}
                    className="py-3 bg-slate-900/60 hover:bg-slate-800 active:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-white border border-slate-800 transition-all active:scale-95"
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
              className="w-full mt-2 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md shadow-cyan-500/20 active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>Accedi al Turno</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-slate-800/80 bg-[#070c18] text-slate-400 text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Sea • Ristorante &amp; Bistrot POS</span>
        <span className="font-mono text-[11px] text-slate-400">
          Rete Locale Wi-Fi Protetta
        </span>
      </footer>
    </div>
  );
};
