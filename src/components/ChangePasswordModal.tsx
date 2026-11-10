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
        </div>
      )}

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
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Mostra la password"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-mist-500 transition-colors hover:text-mist-100"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
