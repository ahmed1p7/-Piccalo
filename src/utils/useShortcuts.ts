import { useEffect, useRef } from 'react';

/**
 * Scorciatoie da tastiera per l'uso da computer (cassa veloce).
 *
 * La mappa associa una combinazione a un'azione. Sono supportate:
 *   - tasto singolo      → "f1", "escape", "enter"
 *   - con modificatore   → "alt+1", "ctrl+s"
 *
 * Le combinazioni vengono cercate prima con i modificatori e poi senza,
 * così "alt+1" ha la precedenza su "1".
 *
 * Gli eventi scattano solo quando il focus NON è in un campo di testo:
 * digitare "1" in un campo numerico non deve cambiare schermata.
 */
export type ShortcutMap = Record<string, () => void>;

const isTypingTarget = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

export const useKeyboardShortcuts = (map: ShortcutMap, enabled = true) => {
  const mapRef = useRef(map);
  mapRef.current = map;

  useEffect(() => {
    if (!enabled) return;

    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      const key = e.key.toLowerCase();
      const mods = `${e.altKey ? 'alt+' : ''}${e.ctrlKey ? 'ctrl+' : ''}${
        e.metaKey ? 'meta+' : ''
      }`;

      const fn = mapRef.current[mods + key] ?? mapRef.current[key];
      if (!fn) return;

      e.preventDefault();
      fn();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
};

export default useKeyboardShortcuts;
