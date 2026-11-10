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
  RefreshCw,
  Store,
  Users,
  Waves,
  Wifi,
} from 'lucide-react';
import { ActiveView } from '../context/AppContext';
import { BackupModal } from './BackupModal';
import { WifiModal } from './WifiModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { SyncModal } from './SyncModal';
import { DesktopSidebar } from './DesktopSidebar';
import { useKeyboardShortcuts, ShortcutMap } from '../utils/useShortcuts';

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
    users,
    syncStatus,
  } = useApp();

  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (!currentUser) return null;

  const permissions = currentUser.permissions;
  const activeTablesCount = tables.filter(
    (t) => t.status === 'occupato' || t.status === 'in_conto'
  ).length;

  const navItems: {
    id: ActiveView;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    visible: boolean;
  }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-4 h-4" />, visible: true },
    {
      id: 'tavoli',
      label: 'Tavoli',
      icon: <Grid className="w-4 h-4" />,
      badge: activeTablesCount,
      visible: permissions.canAccessTavoli,
    },
    {
      id: 'cassa',
      label: 'Cassa',
      icon: <CreditCard className="w-4 h-4" />,
      visible: permissions.canAccessCassa,
    },
    {
      id: 'magazzino',
      label: 'Magazzino',
      icon: <Package className="w-4 h-4" />,
      badge: lowStockItems.length,
      visible: permissions.canAccessMagazzino,
    },
    {
      id: 'cucina',
      label: 'Cucina',
      icon: <ChefHat className="w-4 h-4" />,
      visible: permissions.canAccessCucina,
    },
    {
      id: 'report',
      label: 'Report',
      icon: <BarChart3 className="w-4 h-4" />,
      visible: permissions.canViewReports,
    },
    {
      id: 'utenti',
      label: 'Personale',
      icon: <Users className="w-4 h-4" />,
      badge: users.length,
      visible: permissions.canManageUsers,
    },
  ];

  const visibleItems = navItems.filter((i) => i.visible);

  const goTo = (view: ActiveView) => {
    setActiveView(view);
    setShowMenu(false);
  };

  // ⌨️ Scorciatoie da tastiera (uso computer): F1..F7 e Alt+1..7
  // cambiano schermata, Esc chiude le modali (gestito dal componente Modal).
  const shortcutMap: ShortcutMap = {};
  visibleItems.forEach((item, index) => {
    shortcutMap[`f${index + 1}`] = () => goTo(item.id);
    shortcutMap[`alt+${index + 1}`] = () => goTo(item.id);
  });
  useKeyboardShortcuts(shortcutMap);

  return (
    <>
      {/* ══ Barra laterale (computer ≥ 1024px) ══ */}
      <DesktopSidebar
        items={visibleItems}
        activeView={activeView}
        onNavigate={goTo}
        restaurantName={profile.name?.trim() || 'Il mio ristorante'}
        userName={currentUser.displayName}
        userRole={currentUser.role.replace('_', ' ')}
        syncOnline={wifiConnected}
        syncError={syncStatus === 'error'}
        devicesCount={syncDevicesCount}
        onOpenSync={() => setShowSyncModal(true)}
        onLogout={logout}
      />

      {/* ══ Barra superiore ══ */}
      <header className="sticky top-0 z-40 lg:pl-60 bg-ink-900/95 backdrop-blur-md border-b border-ink-700 text-mist-100 safe-t">
        <div className="mx-auto max-w-6xl px-3 sm:px-5">
          <div className="flex items-center justify-between h-14 gap-2">
            {/* Marchio */}
            <button
              onClick={() => goTo('home')}
              className="flex items-center gap-2.5 min-w-0 group lg:hidden"
            >
              <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-brand-300 flex items-center justify-center shadow-md shadow-brand-500/25">
                <Waves className="w-5 h-5 text-ink-950" />
              </div>
              <div className="leading-tight min-w-0 text-left">
                <div className="text-sm font-bold tracking-tight text-mist-100 truncate max-w-[10rem]">
                  {profile.name?.trim() || 'Il mio ristorante'}
                </div>
                <div className="text-[10px] text-mist-500 truncate max-w-[10rem]">
                  {currentUser.displayName}
                </div>
              </div>
            </button>

            {/* Navigazione desktop */}
            <nav className="hidden md:flex lg:hidden items-center gap-1">
              {visibleItems.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => goTo(item.id)}
                    className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30'
                        : 'text-mist-500 hover:text-mist-100 hover:bg-ink-800 border border-transparent'
                    }`}
                  >
                    <span className={isActive ? 'text-brand-300' : 'text-mist-500'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                          isActive
                            ? 'bg-brand-500/25 text-brand-300'
                            : item.id === 'utenti'
                            ? 'bg-ink-700 text-mist-300'
                            : 'bg-rose-600/20 text-rose-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Titolo pagina (desktop: la navigazione è nella sidebar) */}
            <div className="hidden lg:block flex-1 min-w-0">
              <h1 className="text-base font-bold tracking-tight text-mist-100 truncate">
                {visibleItems.find((i) => i.id === activeView)?.label ?? 'Sea POS'}
              </h1>
              <p className="text-[11px] text-mist-500 truncate">
                {profile.name?.trim() || 'Il mio ristorante'} · sessione di
                cassa
              </p>
            </div>

            {/* Strumenti */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setShowSyncModal(true)}
                title={
                  syncStatus === 'error'
                    ? 'Sincronizzazione cloud bloccata — tocca per la soluzione'
                    : 'Sincronizzazione cloud tra i dispositivi'
                }
                className={`relative p-2 rounded-lg border transition-colors ${
                  syncStatus === 'error'
                    ? 'border-rose-400/40 bg-rose-600/15 text-rose-400'
                    : wifiConnected
                    ? 'border-brand-500/25 bg-brand-500/15 text-brand-300'
                    : 'border-ink-700 bg-ink-900 text-mist-500'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                {syncDevicesCount > 1 && (
                  <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-brand-500 text-[9px] font-bold text-ink-950 flex items-center justify-center">
                    {syncDevicesCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowWifiModal(true)}
                title="Stato rete Wi-Fi locale"
                className={`hidden sm:flex p-2 rounded-lg border transition-colors ${
                  wifiConnected
                    ? 'border-mint-400/25 bg-mint-600/15 text-mint-400'
                    : 'border-rose-400/25 bg-rose-600/15 text-rose-400'
                }`}
              >
                <Wifi className="w-4 h-4" />
              </button>

              {/* Menu utente */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu((v) => !v)}
                  className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold text-xs text-white ${currentUser.avatarColor}`}
                  title="Menu utente"
                >
                  {currentUser.displayName.charAt(0).toUpperCase()}
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 top-11 z-50 w-56 surface p-2 shadow-2xl animate-scaleIn">
                      <div className="px-2.5 py-2 border-b border-ink-700 mb-1.5">
                        <div className="text-sm font-bold text-mist-100 truncate">
                          {currentUser.displayName}
                        </div>
                        <div className="text-[11px] text-mist-500 capitalize">
                          {currentUser.role.replace('_', ' ')}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowChangePasswordModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-mist-300 hover:bg-ink-800 hover:text-mist-100 transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        Cambia password
                      </button>

                      {permissions.canManageBackup && (
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            setShowBackupModal(true);
                          }}
                          className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-mist-300 hover:bg-ink-800 hover:text-mist-100 transition-colors"
                        >
                          <Database className="w-3.5 h-3.5" />
                          Backup &amp; ripristino
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowMenu(false);
                          goTo('impostazioni');
                        }}
                        className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-mist-300 hover:bg-ink-800 hover:text-mist-100 transition-colors"
                      >
                        <Store className="w-3.5 h-3.5" />
                        Impostazioni
                      </button>

                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowWifiModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-mist-300 hover:bg-ink-800 hover:text-mist-100 transition-colors"
                      >
                        <Wifi className="w-3.5 h-3.5" />
                        Rete locale Wi-Fi
                      </button>

                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-600/10 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Esci dal turno
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ══ Barra di navigazione inferiore (mobile) ══ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-ink-900/95 backdrop-blur-md border-t border-ink-700 safe-b safe-x">
        <div className="flex items-stretch overflow-x-auto scrollbar-none">
          {visibleItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => goTo(item.id)}
                className={`relative flex-1 min-w-[64px] flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                  isActive ? 'text-brand-300' : 'text-mist-500'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b-full bg-brand-400" />
                )}
                <span className="relative">
                  {item.icon}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-1 rounded-full bg-rose-600 text-[9px] font-bold text-white flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Spazio per la barra inferiore */}
      <div className="md:hidden bottom-nav-space" />

      {/* Modali */}
      {showBackupModal && <BackupModal onClose={() => setShowBackupModal(false)} />}
      {showWifiModal && <WifiModal onClose={() => setShowWifiModal(false)} />}
      {showSyncModal && <SyncModal onClose={() => setShowSyncModal(false)} />}
      {showChangePasswordModal && (
        <ChangePasswordModal onClose={() => setShowChangePasswordModal(false)} />
      )}
    </>
  );
};
