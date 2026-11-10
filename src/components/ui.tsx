/**
 * 🧩 Sea POS — Componenti di base condivisi
 * Un solo linguaggio visivo per tutte le schermate: card, bottoni,
 * campi, badge, modali, stati vuoti.
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// 📦 Superfici
// ═══════════════════════════════════════════════════════════════════

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
}> = ({ children, className = '', as: Tag = 'div' }) => (
  <Tag className={`surface ${className}`}>{children}</Tag>
);

export const SectionTitle: React.FC<{
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ children, action, className = '' }) => (
  <div className={`flex items-center justify-between gap-3 ${className}`}>
    <h2 className="section-title">{children}</h2>
    {action}
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// 🔘 Bottoni
// ═══════════════════════════════════════════════════════════════════

type BtnVariant = 'primary' | 'soft' | 'ghost' | 'danger' | 'success';

export const Btn: React.FC<{
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: BtnVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  title?: string;
  full?: boolean;
}> = ({
  children,
  onClick,
  variant = 'soft',
  size = 'md',
  className = '',
  disabled,
  type = 'button',
  title,
  full,
}) => {
  const variants: Record<BtnVariant, string> = {
    primary: 'btn-primary',
    soft: 'btn-soft',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    success: 'btn-success',
  };
  const sizes = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${variants[variant]} ${sizes[size]} ${full ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════
// 📝 Campi di input
// ═══════════════════════════════════════════════════════════════════

export const Field: React.FC<{
  label?: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
  className?: string;
}> = ({ label, children, hint, error, className = '' }) => (
  <div className={className}>
    {label && <label className="label">{label}</label>}
    {children}
    {hint && !error && <p className="mt-1.5 text-[11px] text-mist-500">{hint}</p>}
    {error && <p className="mt-1.5 text-[11px] font-semibold text-rose-400">{error}</p>}
  </div>
);

export const Input: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { small?: boolean }
> = ({ small, className = '', ...props }) => (
  <input
    {...props}
    className={`field ${small ? 'field-sm' : ''} ${className}`}
  />
);

export const Textarea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { small?: boolean }
> = ({ small, className = '', ...props }) => (
  <textarea
    {...props}
    className={`field ${small ? 'field-sm' : ''} ${className}`}
  />
);

export const Select: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & { small?: boolean }
> = ({ small, className = '', children, ...props }) => (
  <select {...props} className={`field ${small ? 'field-sm' : ''} ${className}`}>
    {children}
  </select>
);

// ═══════════════════════════════════════════════════════════════════
// 🏷️ Badge
// ═══════════════════════════════════════════════════════════════════

export type BadgeTone = 'brand' | 'mint' | 'amber' | 'rose' | 'neutral';

// ⚠️ Le classi devono essere SCRITTE PER ESTESO qui: Tailwind v4 scansiona
//    i sorgenti e non riconosce i nomi costruiti a runtime (`badge-${tone}`),
//    quindi il CSS non verrebbe generato e i badge resterebbero senza colore.
const BADGE_TONES: Record<BadgeTone, string> = {
  brand: 'badge-brand',
  mint: 'badge-mint',
  amber: 'badge-amber',
  rose: 'badge-rose',
  neutral: 'badge-neutral',
};

export const Badge: React.FC<{
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}> = ({ children, tone = 'neutral', className = '' }) => (
  <span className={`badge ${BADGE_TONES[tone]} ${className}`}>{children}</span>
);

// ═══════════════════════════════════════════════════════════════════
// 🪟 Modale
// ═══════════════════════════════════════════════════════════════════

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** nasconde la X (conferme critiche) */
  locked?: boolean;
}> = ({ open, onClose, title, subtitle, children, footer, size = 'md', locked }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !locked) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, locked]);

  if (!open) return null;

  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  // ⚠️ Portal: la modale viene montata su document.body così non resta
  //    intrappolata negli stacking context delle schermate (le animazioni
  //    creano un contesto di impilamento e "rubano" il relativo z-index).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm animate-fadeIn"
        onClick={() => !locked && onClose()}
      />
      <div
        ref={ref}
        className={`relative w-full ${widths[size]} max-h-[92vh] overflow-hidden
                    bg-ink-850 border border-ink-700 rounded-t-3xl sm:rounded-3xl
                    shadow-2xl shadow-ink-950/60 animate-slideUp flex flex-col`}
      >
        {(title || !locked) && (
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-ink-700 shrink-0">
            <div className="min-w-0">
              {title && <h3 className="text-base font-bold text-mist-100">{title}</h3>}
              {subtitle && <p className="text-xs text-mist-500 mt-0.5">{subtitle}</p>}
            </div>
            {!locked && (
              <button
                onClick={onClose}
                className="btn-ghost btn-sm !px-2 shrink-0"
                aria-label="Chiudi"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">{children}</div>

        {footer && (
          <div className="px-5 py-4 border-t border-ink-700 bg-ink-900/50 shrink-0 flex gap-2 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

// ═══════════════════════════════════════════════════════════════════
// 📊 Numeri
// ═══════════════════════════════════════════════════════════════════

export const Stat: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'brand' | 'mint' | 'amber' | 'rose' | 'neutral';
  icon?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}> = ({ label, value, sub, tone = 'neutral', icon, onClick }) => {
  const tones: Record<string, string> = {
    brand: 'text-brand-300 bg-brand-500/15 border-brand-500/25',
    mint: 'text-mint-400 bg-mint-600/15 border-mint-400/25',
    amber: 'text-amber-400 bg-amber-600/15 border-amber-400/25',
    rose: 'text-rose-400 bg-rose-600/15 border-rose-400/25',
    neutral: 'text-mist-300 bg-ink-700/60 border-ink-600',
  };
  const Cmp: any = onClick ? 'button' : 'div';
  return (
    <Cmp
      onClick={onClick}
      className={`surface p-4 text-left w-full ${onClick ? 'transition hover:border-brand-500/40 active:scale-[0.99]' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="section-title">{label}</span>
        {icon && (
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border ${tones[tone]}`}>
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold tnum text-mist-100">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-mist-500">{sub}</div>}
    </Cmp>
  );
};

// ═══════════════════════════════════════════════════════════════════
// 🕳️ Stato vuoto
// ═══════════════════════════════════════════════════════════════════

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-6">
    {icon && (
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-800 border border-ink-700 text-mist-500">
        {icon}
      </div>
    )}
    <h3 className="text-sm font-bold text-mist-100">{title}</h3>
    {description && (
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-mist-500">{description}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// 💶 Importo formattato (sempre in euro, 2 decimali)
// ═══════════════════════════════════════════════════════════════════

export const euro = (value: number | undefined | null): string => {
  const n = Number(value || 0);
  return n.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const Amount: React.FC<{
  value: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'default' | 'mint' | 'rose' | 'amber';
  className?: string;
}> = ({ value, size = 'md', tone = 'default', className = '' }) => {
  const sizes = {
    sm: 'text-xs',
    md: 'text-base',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };
  const tones = {
    default: 'text-mist-100',
    mint: 'text-mint-400',
    rose: 'text-rose-400',
    amber: 'text-amber-400',
  };
  return (
    <span className={`amount ${sizes[size]} ${tones[tone]} ${className}`}>
      {euro(value)} €
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════════
// 🧭 Scheda di sezione con barra laterale colorata
// ═══════════════════════════════════════════════════════════════════

export const NavItem: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}> = ({ active, onClick, icon, label, badge }) => (
  <button
    onClick={onClick}
    className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm
                font-semibold transition-colors
                ${active
                  ? 'bg-brand-500/15 text-brand-300'
                  : 'text-mist-300 hover:bg-ink-800 hover:text-mist-100'}`}
  >
    {active && (
      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand-400" />
    )}
    <span className={active ? 'text-brand-300' : 'text-mist-500'}>{icon}</span>
    <span className="flex-1 text-left">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="rounded-full bg-ink-700 px-2 py-0.5 text-[10px] font-bold text-mist-300">
        {badge}
      </span>
    )}
  </button>
);
