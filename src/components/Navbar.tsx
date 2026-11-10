import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart3,
  ChefHat,
  CreditCard,
  Database,
  Grid,
  Home,
  KeyRound,
  LogOut,
  Package,
  Users,
  Waves,
  Wifi,
} from 'lucide-react';
import { ActiveView } from '../context/AppContext';
import { BackupModal } from './BackupModal';
import { WifiModal } from './WifiModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { SyncModal } from './SyncModal';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    logout,
    activeView,
    setActiveView,
    profile,
    lowStockItems,
    tables,
    wifiConnected,
    syncDevicesCount,
  } = useApp();

  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  if (!currentUser) return null;

  const permissions = currentUser.permissions;
  const activeTablesCount = tables.filter((t) => t.status === 'occupato' || t.status === 'in_conto').length;

  const navItems: { id: ActiveView; label: string; icon: React.ReactNode; badge?: number; visible: boolean }[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home className="w-3.5 h-3.5" />,
      visible: true,
    },
    {
      id: 'tavoli',
      label: 'Tavoli',
      icon: <Grid className="w-3.5 h-3.5" />,
      badge: activeTablesCount,
      visible: permissions.canAccessTavoli,
    },
    {
      id: 'cassa',
      label: 'Cassa & Conto',
      icon: <CreditCard className="w-3.5 h-3.5" />,
      visible: permissions.canAccessCassa,
    },
    {
      id: 'magazzino',
      label: 'Magazzino',
      icon: <Package className="w-3.5 h-3.5" />,
      badge: lowStockItems.length,
      visible: permissions.canAccessMagazzino,
    },
    {
      id: 'cucina',
      label: 'Dispensa Cucina',
      icon: <ChefHat className="w-3.5 h-3.5" />,
      visible: permissions.canAccessCucina,
    },
    {
      id: 'report',
      label: 'Chiusura & Report',
      icon: <BarChart3 className="w-3.5 h-3.5" />,
      visible: permissions.canViewReports,
    },
    {
      id: 'utenti',
      label: 'Personale',
      icon: <Users className="w-3.5 h-3.5" />,
      visible: permissions.canManageUsers,
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#1a1a1a]/90 backdrop-blur-md border-b border-neutral-800/80 text-neutral-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Zone 1: Brand Wordmark & Local Wi-Fi badge */}
            <div
              onClick={() => setActiveView('home')}
              className="flex items-center gap-3 cursor-pointer group shrink-0"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 flex items-center justify-center text-neutral-950 font-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform duration-200">
                <Waves className="w-5 h-5 text-neutral-950" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight text-white font-sans">
                    Sea
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-amber-400/90 tracking-wider">
                    POS
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 font-normal hidden sm:block">
                  {profile.name}
                </div>
              </div>
            </div>

            {/* Zone 2: Navigation Links - تصميم محسّن */}
            <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
              {navItems
                .filter((item) => item.visible)
                .map((item) => {
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveView(item.id)}
                      className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-600/30 to-cyan-500/20 text-white shadow-lg border border-amber-500/40'
                          : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                      }`}
                    >
                      <span className={isActive ? 'text-amber-300' : 'text-neutral-400'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                            isActive
                              ? 'bg-amber-500/30 text-amber-200'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
            </nav>

            {/* Zone 3: Wi-Fi, Tools & User Profile */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Wi-Fi Status Button */}
              <button
                onClick={() => setShowWifiModal(true)}
                title="Stato Rete Wi-Fi Locale"
                className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                  wifiConnected
                    ? 'border-emerald-500/20 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/50'
                    : 'border-rose-500/20 bg-rose-950/30 text-rose-400 hover:bg-rose-950/50'
                }`}
              >
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden xl:inline text-[11px] font-medium font-mono">
                  {wifiConnected ? profile.wifiSsid : 'Offline'}
                </span>
              </button>

              {/* 🆕 Sync Button - تزامن الأجهزة */}
              <button
                onClick={() => setShowSyncModal(true)}
                title="Sincronizzazione cloud tra i dispositivi"
                className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                  wifiConnected
                    ? 'border-amber-500/20 bg-amber-950/30 text-amber-400 hover:bg-amber-950/50'
                    : 'border-neutral-700 bg-neutral-900/30 text-neutral-500 hover:bg-neutral-800/50'
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9m0 18c2.5-2.5 3.5-5.5 3.5-9s-1-6.5-3.5-9"/>
                </svg>
                <span className="hidden xl:inline text-[11px] font-medium font-mono">
                  {wifiConnected
                    ? `Sync ON · ${Math.max(syncDevicesCount, 1)}`
                    : 'Sync'}
                </span>
              </button>

              {/* Backup & System Data */}
              {permissions.canManageBackup && (
                <button
                  onClick={() => setShowBackupModal(true)}
                  title="Backup & Ripristino Dati"
                  className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition-colors"
                >
                  <Database className="w-4 h-4" />
                </button>
              )}

              {/* Staff Profile and Actions */}
              <div className="flex items-center gap-2 pl-2 border-l border-neutral-800">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-sm ${currentUser.avatarColor}`}
                  >
                    {currentUser.displayName.charAt(0)}
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-xs font-semibold text-white leading-tight">
                      {currentUser.displayName}
                    </div>
                    <div className="text-[10px] text-neutral-400 capitalize">
                      {currentUser.role.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowChangePasswordModal(true)}
                  title="Modifica password personale"
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-300 hover:bg-neutral-800 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={logout}
                  title="Esci dal turno"
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Modals */}
      {showBackupModal && <BackupModal onClose={() => setShowBackupModal(false)} />}
      {showWifiModal && <WifiModal onClose={() => setShowWifiModal(false)} />}
      {showSyncModal && <SyncModal onClose={() => setShowSyncModal(false)} />}
      {showChangePasswordModal && (
        <ChangePasswordModal onClose={() => setShowChangePasswordModal(false)} />
      )}
    </>
  );
};
