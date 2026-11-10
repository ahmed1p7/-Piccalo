import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Check, Eye, EyeOff, KeyRound, Lock, X } from 'lucide-react';
import { UserAccount } from '../types';
import { Btn, Field, Input, Modal } from './ui';

interface ChangePasswordModalProps {
  userToEdit?: UserAccount; // If passed, admin is changing someone else's password. Otherwise changes current user's.
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  userToEdit,
  onClose,
}) => {
  const { currentUser, changePassword } = useApp();
  const target = userToEdit || currentUser;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  if (!target) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setMessage({ type: 'error', text: 'Inserisci la nuova password.' });
      return;
    }
    if (newPassword.trim().length < 4) {
      setMessage({
        type: 'error',
        text: 'La password deve avere almeno 4 caratteri o cifre.',
      });
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setMessage({ type: 'error', text: 'Le due password non corrispondono.' });
      return;
    }

    const res = changePassword(target.id, newPassword.trim());
    if (res.success) {
      setMessage({
        type: 'success',
        text: `Password di @${target.username} aggiornata con successo!`,
      });
      setTimeout(() => {
        onClose();
      }, 900);
    } else {
      setMessage({ type: 'error', text: res.message || 'Errore durante il salvataggio.' });
    }
  };

  return (
<<<<<<< HEAD
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">Modifica Password</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
=======
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={
        <span className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-brand-300" />
          Modifica Password
        </span>
      }
    >
      <div className="text-xs text-mist-500">
        Stai modificando la password per:{' '}
        <strong className="text-mist-100">
          {target.displayName} (@{target.username})
        </strong>
      </div>

      {message && (
        <div
          className={`mt-4 rounded-2xl border p-3 text-xs font-semibold ${
            message.type === 'success'
              ? 'border-mint-400/30 bg-mint-600/15 text-mint-400'
              : 'border-rose-400/30 bg-rose-600/15 text-rose-400'
          }`}
        >
          {message.text}
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
        </div>
      )}

<<<<<<< HEAD
        <div className="text-xs text-neutral-400">
          Stai modificando la password per:{' '}
          <strong className="text-white">
            {target.displayName} (@{target.username})
          </strong>
        </div>

        {message && (
          <div
            className={`p-3 rounded-2xl text-xs font-semibold ${
              message.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="text-neutral-300 font-semibold block mb-1">
              Nuova Password / PIN *:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={4}
                placeholder="Almeno 4 caratteri o cifre..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-white pr-10 focus:outline-none focus:border-amber-500 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-neutral-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-neutral-300 font-semibold block mb-1">
              Conferma Nuova Password *:
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={4}
              placeholder="Ripeti la password..."
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono text-sm"
=======
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Field label="Nuova Password / PIN *">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={4}
              placeholder="Almeno 4 caratteri o cifre..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pr-10 font-mono"
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
            />
            <button
              type="button"
<<<<<<< HEAD
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white font-semibold"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-neutral-950 font-bold transition-all shadow-md shadow-amber-500/20"
            >
              Aggiorna Password
=======
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Mostra la password"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-mist-500 transition-colors hover:text-mist-100"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
>>>>>>> 08b20035d63be84df4a67f3304b216d48dfe8c29
            </button>
          </div>
        </Field>

        <Field label="Conferma Nuova Password *">
          <Input
            type={showPassword ? 'text' : 'password'}
            required
            minLength={4}
            placeholder="Ripeti la password..."
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="font-mono"
          />
        </Field>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Btn variant="ghost" type="button" onClick={onClose}>
            Annulla
          </Btn>
          <Btn variant="primary" type="submit">
            Aggiorna Password
          </Btn>
        </div>
      </form>
    </Modal>
  );
};
