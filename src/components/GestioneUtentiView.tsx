import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Check,
  CheckSquare,
  ChefHat,
  Coffee,
  CreditCard,
  Edit2,
  KeyRound,
  Package,
  Plus,
  Shield,
  Square,
  Trash2,
  UserCheck,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { UserAccount, UserPermissions, UserRole } from '../types';
import { ChangePasswordModal } from './ChangePasswordModal';

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
        setAvatarColor('bg-orange-600');
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
        setAvatarColor('bg-blue-600');
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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Gestione Personale &amp; Permessi Account
            </h1>
            <p className="text-xs text-neutral-400">
              Crea account per camerieri, cuochi, barman e cassieri con PIN a 4 cifre e permessi personalizzati.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nuovo Dipendente</span>
        </button>
      </div>

      {/* Staff Accounts Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => {
          const isMe = currentUser?.id === user.id;
          return (
            <div
              key={user.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between min-h-[220px] ${
                isMe
                  ? 'bg-neutral-900 border-amber-500/60 shadow-lg shadow-amber-500/10'
                  : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div>
                {/* Header card */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow ${user.avatarColor}`}
                    >
                      {user.displayName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight">
                        {user.displayName}
                      </h3>
                      <p className="text-xs text-neutral-400">@{user.username}</p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700 capitalize">
                    {user.role.replace('_', ' ')}
                  </span>
                </div>

                {/* PIN and Permissions chips */}
                <div className="space-y-2 mt-4">
                  <div className="text-xs text-neutral-400 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>PIN di Accesso:</span>
                    <strong className="text-white font-mono tracking-widest">{user.pin}</strong>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {user.permissions.canAccessCassa && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800">
                        Cassa
                      </span>
                    )}
                    {user.permissions.canAccessMagazzino && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800">
                        Magazzino
                      </span>
                    )}
                    {user.permissions.canAccessCucina && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-orange-950 text-orange-300 border border-orange-800">
                        Cucina
                      </span>
                    )}
                    {user.permissions.canAccessTavoli && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800">
                        Tavoli
                      </span>
                    )}
                    {user.permissions.canViewReports && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-950 text-teal-300 border border-teal-800">
                        Report
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
                <button
                  onClick={() => loginUserDirect(user)}
                  className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Passa a questo turno</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setUserForPasswordChange(user)}
                    title="Modifica password di questo utente"
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-300 hover:bg-amber-950/40 transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(user)}
                    title="Modifica profilo e permessi"
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {users.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Eliminare l'account di ${user.displayName}?`)) {
                          deleteUser(user.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: ADD / EDIT USER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl my-auto space-y-5 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white text-base">
                {editingUser ? 'Modifica Account Dipendente' : 'Crea Nuovo Account Dipendente'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">
                    Nome Completo:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Es. Mario Rossi"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-300 block mb-1">
                    Username (Login):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Es. mario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-300 block mb-1">
                  PIN di Accesso a 4 Cifre *:
                </label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  placeholder="Es. 5555"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-white font-mono font-black text-xl tracking-widest focus:outline-none focus:border-amber-500"
                />
                <span className="text-[11px] text-neutral-400 mt-1 block">
                  Usato per il login rapido dal tastierino numerico su tablet.
                </span>
              </div>

              {/* Role Presets */}
              <div>
                <label className="font-semibold text-neutral-300 block mb-1.5">
                  Ruolo Predefinito (Imposta i permessi standard):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'admin', label: 'Direttore (Tutto)' },
                    { id: 'cameriere', label: 'Cameriere (Tavoli & Conto)' },
                    { id: 'cucina', label: 'Cucina (Magazzino Cucina)' },
                    { id: 'cassiere', label: 'Cassiere (Cassa & Report)' },
                    { id: 'personalizzato', label: 'Personalizzato' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => applyRolePreset(r.id as UserRole)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        role === r.id
                          ? 'bg-amber-500 text-neutral-950 border-amber-400'
                          : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Granular Checkboxes for Permissions */}
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <span className="font-semibold text-neutral-300 block">
                  Permessi &amp; Sezioni Visibili:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'canAccessCassa', label: 'Punto Cassa & Pagamenti' },
                    { key: 'canAccessMagazzino', label: 'Magazzino & Scorte Generali' },
                    { key: 'canAccessCucina', label: 'Magazzino Cucina & Dispensa' },
                    { key: 'canAccessTavoli', label: 'Mappa Tavoli & Conti' },
                    { key: 'canViewReports', label: 'Report & Chiusura Giornaliera' },
                    { key: 'canManageUsers', label: 'Gestione Personale & Dipendenti' },
                    { key: 'canManageBackup', label: 'Backup & Dati di Sistema' },
                  ].map(({ key, label }) => {
                    const isChecked = permissions[key as keyof UserPermissions];
                    return (
                      <div
                        key={key}
                        onClick={() => togglePermission(key as keyof UserPermissions)}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-amber-950/40 border-amber-500/50 text-white font-medium'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition-all shadow-md shadow-amber-500/20"
                >
                  {editingUser ? 'Salva Modifiche' : 'Crea Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Change Password Modal */}
      {userForPasswordChange && (
        <ChangePasswordModal
          userToEdit={userForPasswordChange}
          onClose={() => setUserForPasswordChange(null)}
        />
      )}
    </div>
  );
};
