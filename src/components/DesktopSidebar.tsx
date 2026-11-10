import React from 'react';
import {
  ChefHat,
  CreditCard,
  Grid,
  Home,
  LogOut,
  Package,
  RefreshCw,
  Users,
  Waves,
  BarChart3,
} from 'lucide-react';
import { ActiveView } from '../context/AppContext';

/**
 * Barra laterale fissa per l'uso da computer (>= 1024px).
 * Sostituisce la barra inferiore mobile e mostra le scorciatoie
 * da tastiera, utili al cassiere per cambiare schermata al volo.
 */
export const DesktopSidebar: React.FC<{
  items: {
    id: ActiveView;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[];
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  restaurantName: string;
  userName: string;
  userRole?: string;
  syncOnline: boolean;
  syncError: boolean;
  devicesCount: number;
  onOpenSync: () => void;
  onLogout: () => void;
}> = ({
  items,
  activeView,
  onNavigate,
  restaurantName,
  userName,
  userRole,
  syncOnline,
  syncError,
  devicesCount,
  onOpenSync,
  onLogout,
}) => {
  return (
    <aside
      className="hidden lg:flex fixed inset-y-0 left-0 w-60 z-40 flex-col
                 bg-ink-900 border-r border-ink-700 text-mist-100 safe-t safe-b"
    >
      {/* Marchio */}
      <div className="flex items-center gap-2.5 px-4 h-16 shrink-0 border-b border-ink-700">
        <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-brand-300 flex items-center justify-center shadow-md shadow-brand-500/25">
          <Waves className="w-5 h-5 text-ink-950" />
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-sm font-bold tracking-tight truncate">
            {restaurantName || 'Il mio ristorante'}
          </div>
          <div className="text-[10px] text-mist-500">Sea POS · computer</div>
        </div>
      </div>

      {/* Navigazione */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2.5 py-3 space-y-1">
        {items.map((item, index) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={`${item.label} (F${index + 1})`}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30'
                  : 'text-mist-300 hover:text-mist-100 hover:bg-ink-800 border border-transparent'
              }`}
            >
              <span className={isActive ? 'text-brand-300' : 'text-mist-500'}>
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                    item.id === 'utenti'
                      ? 'bg-ink-700 text-mist-300'
                      : 'bg-rose-600/20 text-rose-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
              <kbd
                className={`hidden xl:inline text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  isActive
                    ? 'border-brand-500/30 text-brand-300/80'
                    : 'border-ink-600 text-mist-500'
                }`}
              >
                F{index + 1}
              </kbd>
            </button>
          );
        })}
      </nav>

      {/* Stato sincronizzazione */}
      <div className="px-2.5 pb-2">
        <button
          onClick={onOpenSync}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
            syncError
              ? 'border-rose-400/40 bg-rose-600/15 text-rose-400'
              : syncOnline
              ? 'border-brand-500/25 bg-brand-500/10 text-brand-300'
              : 'border-ink-700 bg-ink-850 text-mist-500'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span className="flex-1 text-left">
            {syncError ? 'Sync bloccato' : syncOnline ? 'Sync attivo' : 'Sync non attivo'}
          </span>
          {devicesCount > 1 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-ink-700 text-mist-300">
              {devicesCount}
            </span>
          )}
        </button>
      </div>

      {/* Utente */}
      <div className="px-2.5 pb-3 pt-2 border-t border-ink-700">
        <div className="px-3 pb-2">
          <div className="text-xs font-bold text-mist-100 truncate">{userName}</div>
          {userRole && (
            <div className="text-[10px] text-mist-500 truncate">{userRole}</div>
          )}
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold
                     text-mist-300 hover:text-rose-400 hover:bg-rose-600/10 border border-transparent transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Esci dal turno
        </button>
      </div>
    </aside>
  );
};

/** Icone usate anche nella barra inferiore mobile: esportate per riuso. */
export const SIDEBAR_ICONS = {
  Home,
  Grid,
  CreditCard,
  Package,
  ChefHat,
  BarChart3,
  Users,
};

export default DesktopSidebar;
