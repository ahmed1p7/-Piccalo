import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Check,
  Edit2,
  KeyRound,
  Plus,
  Shield,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { UserAccount, UserPermissions, UserRole } from '../types';
import { ChangePasswordModal } from './ChangePasswordModal';
import { Badge, Btn, EmptyState, Field, Input, Modal } from './ui';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Direttore',
  cameriere: 'Cameriere',
  cucina: 'Cucina',
  bar_cucina: 'Bar',
  cassiere: 'Cassiere',
  personalizzato: 'Personalizzato',
};

const AVATAR_COLORS = [
  'bg-cyan-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-violet-600',
  'bg-brand-600',
  'bg-teal-600',
  'bg-ink-600',
];

const PERMISSION_LIST: { key: keyof UserPermissions; label: string; desc: string }[] = [
  { key: 'canAccessCassa', label: 'Cassa', desc: 'Incassa e chiude i conti' },
  { key: 'canAccessTavoli', label: 'Tavoli', desc: 'Apre e gestisce i tavoli' },
  { key: 'canAccessCucina', label: 'Cucina', desc: 'Vede e prepara gli ordini' },
  { key: 'canAccessBar', label: 'Bar', desc: 'Gestisce il bar' },
  { key: 'canAccessMagazzino', label: 'Magazzino', desc: 'Carichi, scarichi e scorte' },
  { key: 'canViewReports', label: 'Report', desc: 'Vede incassi e report' },
  { key: 'canManageUsers', label: 'Personale', desc: 'Crea e modifica i conti' },
  { key: 'canManageBackup', label: 'Backup', desc: 'Esporta e ripristina i dati' },
];

export const GestioneUtentiView: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, currentUser, loginUserDirect } = useApp();
  const [userForPasswordChange, setUserForPasswordChange] = useState<UserAccount | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<UserRole>('cameriere');
  const [avatarColor, setAvatarColor] = useState('bg-emerald-600');

  const [permissions, setPermissions] = useState<UserPermissions>({
    canAccessCassa: false,
    canAccessMagazzino: false,
    canAccessBar: true,
    canAccessCucina: false,
    canAccessTavoli: true,
    canManageUsers: false,
    canManageBackup: false,
    canViewReports: false,
  });

  // Role presets helper
  const applyRolePreset = (selectedRole: UserRole) => {
    setRole(selectedRole);
    switch (selectedRole) {
      case 'admin':
        setPermissions({
          canAccessCassa: true,
          canAccessMagazzino: true,
          canAccessBar: true,
          canAccessCucina: true,
          canAccessTavoli: true,
          canManageUsers: true,
          canManageBackup: true,
          canViewReports: true,
        });
        setAvatarColor('bg-amber-600');
        break;
      case 'cameriere':
        // Waiter: Bar + Tavoli + Cassa
        setPermissions({
          canAccessCassa: true,
          canAccessMagazzino: false,
          canAccessBar: true,
          canAccessCucina: false,
          canAccessTavoli: true,
          canManageUsers: false,
          canManageBackup: false,
          canViewReports: false,
        });
        setAvatarColor('bg-emerald-600');
        break;
      case 'cucina':
        // Kitchen only
        setPermissions({
          canAccessCassa: false,
          canAccessMagazzino: false,
          canAccessBar: false,
          canAccessCucina: true,
          canAccessTavoli: false,
          canManageUsers: false,
          canManageBackup: false,
          canViewReports: false,
        });
        setAvatarColor('bg-brand-600');
        break;
      case 'bar_cucina':
        // Hybrid: Bar + Kitchen together!
        setPermissions({
          canAccessCassa: false,
          canAccessMagazzino: false,
          canAccessBar: true,
          canAccessCucina: true,
          canAccessTavoli: false,
          canManageUsers: false,
          canManageBackup: false,
          canViewReports: false,
        });
        setAvatarColor('bg-purple-600');
        break;
      case 'cassiere':
        // Cashier: Cassa e Conto
        setPermissions({
          canAccessCassa: true,
          canAccessMagazzino: false,
          canAccessBar: false,
          canAccessCucina: false,
          canAccessTavoli: true,
          canManageUsers: false,
          canManageBackup: false,
          canViewReports: true,
        });
        setAvatarColor('bg-brand-600');
        break;
      case 'personalizzato':
        break;
    }
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setUsername('');
    setDisplayName('');
    setPin('');
    applyRolePreset('cameriere');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserAccount) => {
    setEditingUser(user);
    setUsername(user.username);
    setDisplayName(user.displayName);
    setPin(user.pin);
    setRole(user.role);
    setPermissions(user.permissions);
    setAvatarColor(user.avatarColor || 'bg-emerald-600');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !displayName.trim()) return;
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      alert('Il PIN deve essere composto esattamente da 4 cifre numeriche (es. 1234).');
      return;
    }

    if (editingUser) {
      updateUser(editingUser.id, {
        username: username.toLowerCase().trim(),
        displayName: displayName.trim(),
        pin: pin.trim(),
        role,
        permissions,
        avatarColor,
      });
    } else {
      addUser({
        username: username.toLowerCase().trim(),
        displayName: displayName.trim(),
        pin: pin.trim(),
        role,
        permissions,
        avatarColor,
      });
    }

    setIsModalOpen(false);
  };

  const togglePermission = (key: keyof UserPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setRole('personalizzato');
  };

  return (
    <div className="min-h-screen bg-ink-950 text-mist-100 animate-fadeIn">
      <div className="mx-auto max-w-6xl px-3 sm:px-5 py-5 space-y-5">
      {/* Intestazione */}
      <div className="surface p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-brand-500/15 text-brand-300 border border-brand-500/25 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-mist-100">
              Personale &amp; Permessi
            </h1>
            <p className="mt-0.5 text-xs text-mist-500">
              {users.length} {users.length === 1 ? 'account' : 'account'} · crea i conti dei
              dipendenti e decidi cosa può fare ciascuno.
            </p>
          </div>
        </div>

        <Btn onClick={handleOpenAdd} variant="primary" size="lg" className="w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Nuovo dipendente
        </Btn>
      </div>

      {/* Consiglio */}
      <div className="surface-raised border-brand-500/20 bg-brand-500/5 px-4 py-3 flex items-start gap-3">
        <Shield className="w-4 h-4 text-brand-300 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed text-mist-300">
          Ogni dipendente entra con <strong>nome utente e password</strong> personali.
          Il ruolo predefinito assegna i permessi giusti, poi puoi personalizzarli
          uno a uno.
        </p>
      </div>

      {/* Schede dei dipendenti */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {users.map((user) => {
          const isMe = currentUser?.id === user.id;
          return (
            <div
              key={user.id}
              className={`surface p-4 flex flex-col justify-between gap-4 transition ${
                isMe ? 'border-brand-500/50' : 'hover:border-ink-600'
              }`}
            >
              <div>
                {/* Intestazione scheda */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-white font-bold text-sm ${user.avatarColor}`}
                    >
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-mist-100 text-sm leading-tight truncate">
                        {user.displayName}
                        {isMe && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-brand-300">
                            tu
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-mist-500 truncate">@{user.username}</p>
                    </div>
                  </div>

                  <Badge tone={user.role === 'admin' ? 'brand' : 'neutral'}>
                    {ROLE_LABELS[user.role] || user.role}
                  </Badge>
                </div>

                {/* PIN e permessi */}
                <div className="mt-3.5 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-mist-500">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>PIN:</span>
                    <strong className="text-mist-100 font-mono tracking-widest">{user.pin}</strong>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {user.permissions.canAccessCassa && <Badge tone="mint">Cassa</Badge>}
                    {user.permissions.canAccessMagazzino && <Badge tone="amber">Magazzino</Badge>}
                    {user.permissions.canAccessCucina && <Badge tone="rose">Cucina</Badge>}
                    {user.permissions.canAccessTavoli && <Badge tone="brand">Tavoli</Badge>}
                    {user.permissions.canViewReports && <Badge tone="neutral">Report</Badge>}
                    {user.permissions.canManageUsers && <Badge tone="brand">Personale</Badge>}
                    {user.permissions.canManageBackup && <Badge tone="neutral">Backup</Badge>}
                    {user.permissions.canAccessBar && <Badge tone="neutral">Bar</Badge>}
                  </div>
                </div>
              </div>

              {/* Azioni */}
              <div className="pt-3 border-t border-ink-700 flex items-center justify-between gap-2">
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => loginUserDirect(user)}
                  className="!px-2"
                >
                  <UserCheck className="w-3.5 h-3.5 text-brand-300" />
                  Passa a questo turno
                </Btn>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setUserForPasswordChange(user)}
                    title="Modifica password"
                    className="p-2 rounded-lg text-mist-500 hover:text-brand-300 hover:bg-ink-800 transition-colors"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(user)}
                    title="Modifica profilo e permessi"
                    className="p-2 rounded-lg text-mist-500 hover:text-mist-100 hover:bg-ink-800 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {users.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Eliminare l'account di ${user.displayName}?`)) {
                          deleteUser(user.id);
                        }
                      }}
                      title="Elimina account"
                      className="p-2 rounded-lg text-mist-500 hover:text-rose-400 hover:bg-rose-600/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {users.length === 0 && (
        <div className="surface">
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="Nessun dipendente"
            description="Crea il primo account per i tuoi collaboratori: scegli il ruolo e i permessi."
            action={
              <Btn onClick={handleOpenAdd} variant="primary">
                <Plus className="w-4 h-4" />
                Nuovo dipendente
              </Btn>
            }
          />
        </div>
      )}

      {/* MODALE: CREA / MODIFICA DIPENDENTE */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Modifica dipendente' : 'Nuovo dipendente'}
        subtitle={
          editingUser
            ? 'Cambia ruolo, permessi o credenziali'
            : 'Crea un account per un collaboratore'
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome e cognome">
              <Input
                type="text"
                required
                placeholder="Es. Mario Rossi"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </Field>

            <Field label="Nome utente (per l'accesso)">
              <Input
                type="text"
                required
                placeholder="Es. mario"
                autoCapitalize="none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field>
          </div>

          <Field
            label="Password / PIN"
            hint="Almeno 4 caratteri. Il dipendente la usa per accedere al proprio turno."
          >
            <Input
              type="text"
              required
              placeholder="Es. 5555"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="!text-lg font-bold tracking-widest font-mono"
            />
          </Field>

          {/* Ruoli predefiniti */}
          <div>
            <span className="label">Ruolo</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(
                [
                  { id: 'admin', label: 'Direttore', sub: 'Tutto' },
                  { id: 'cameriere', label: 'Cameriere', sub: 'Tavoli & conto' },
                  { id: 'cucina', label: 'Cucina', sub: 'Ordini & dispensa' },
                  { id: 'bar_cucina', label: 'Bar', sub: 'Bar & cucina' },
                  { id: 'cassiere', label: 'Cassiere', sub: 'Cassa & report' },
                  { id: 'personalizzato', label: 'Personalizzato', sub: 'Scegli tu' },
                ] as { id: UserRole; label: string; sub: string }[]
              ).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => applyRolePreset(r.id)}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    role === r.id
                      ? 'border-brand-500/50 bg-brand-500/15'
                      : 'border-ink-700 bg-ink-900 hover:border-ink-500'
                  }`}
                >
                  <div
                    className={`text-xs font-bold ${
                      role === r.id ? 'text-brand-300' : 'text-mist-100'
                    }`}
                  >
                    {r.label}
                  </div>
                  <div className="text-[10px] text-mist-500">{r.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Matrice dei permessi */}
          <div>
            <span className="label">Permessi</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PERMISSION_LIST.map((perm) => {
                const active = permissions[perm.key];
                return (
                  <button
                    key={perm.key}
                    type="button"
                    onClick={() => togglePermission(perm.key)}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                      active
                        ? 'border-brand-500/40 bg-brand-500/10'
                        : 'border-ink-700 bg-ink-900 hover:border-ink-500'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                        active
                          ? 'bg-brand-500 border-brand-500 text-ink-950'
                          : 'border-ink-600 bg-ink-950'
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-mist-100">
                        {perm.label}
                      </span>
                      <span className="block text-[10px] text-mist-500">{perm.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Colore avatar */}
          <div>
            <span className="label">Colore</span>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAvatarColor(c)}
                  className={`h-8 w-8 rounded-lg ${c} transition ${
                    avatarColor === c
                      ? 'ring-2 ring-brand-400 ring-offset-2 ring-offset-ink-850'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Btn type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Annulla
            </Btn>
            <Btn type="submit" variant="primary">
              {editingUser ? 'Salva modifiche' : 'Crea account'}
            </Btn>
          </div>
        </form>
      </Modal>
      {/* Change Password Modal */}
      {userForPasswordChange && (
        <ChangePasswordModal
          userToEdit={userForPasswordChange}
          onClose={() => setUserForPasswordChange(null)}
        />
      )}
      </div>
    </div>
  );
};
