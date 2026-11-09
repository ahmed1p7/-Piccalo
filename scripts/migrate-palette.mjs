/**
 * 🎨 Migrazione palette: dal vecchio set (slate/cyan/emerald…) al design system
 *    (ink/mist/brand/mint/amber/rose).
 *
 * Uso: node scripts/migrate-palette.mjs [file...]
 *      node scripts/migrate-palette.mjs --all
 *
 * Sostituisce i NOMI delle classi Tailwind, non i valori inline.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** scala: nome vecchio → nome nuovo */
const SCALE = {
  slate: 'ink',
  cyan: 'brand',
  teal: 'brand',
  sky: 'brand',
  emerald: 'mint',
  green: 'mint',
  rose: 'rose',
  red: 'rose',
  amber: 'amber',
  orange: 'amber',
  yellow: 'amber',
  indigo: 'violet',
  violet: 'violet',
  blue: 'brand',
  gray: 'ink',
  stone: 'ink',
  neutral: 'ink',
  zinc: 'ink',
};

/** valori di sfondo/ testo personalizzati → nuovi */
const CUSTOM = [
  [/bg-\[#0d1527\]/g, 'bg-ink-850'],
  [/bg-\[#0a1122\]/g, 'bg-ink-900'],
  [/bg-\[#070c18\]/g, 'bg-ink-950'],
  [/bg-\[#080d1a\]/g, 'bg-ink-950'],
  [/text-\[#070c18\]/g, 'text-ink-950'],
];

const TARGETS = [
  'src/components/HomeDashboard.tsx',
  'src/components/CassaView.tsx',
  'src/components/TavoliView.tsx',
  'src/components/ChangePasswordModal.tsx',
  'src/components/WifiModal.tsx',
  'src/components/ReceiptPrintModal.tsx',
  'src/components/UpdateNotification.tsx',
  'src/components/SyncModal.tsx',
  'src/components/MagazzinoView.tsx',
  'src/components/ReportView.tsx',
  'src/components/CucinaMagazzinoView.tsx',
  'src/components/GestioneUtentiView.tsx',
  'src/components/HomeDashboard.tsx',
];

function migrate(text) {
  let out = text;

  // 1. colori personalizzati
  for (const [re, rep] of CUSTOM) out = out.replace(re, rep);

  // 2. scale Tailwind: (bg|text|border|from|to|via|ring|shadow|fill|stroke)-{scala}-{numero}
  const prefix =
    '(bg|text|border|from|via|to|ring|shadow|fill|stroke|outline|decoration|divide|placeholder|accent|caret)';
  const re = new RegExp(`\\b${prefix}-(slate|cyan|teal|sky|emerald|green|rose|red|amber|orange|yellow|indigo|violet|blue|gray|stone|neutral|zinc)-(\\d{2,3})\\b`, 'g');
  out = out.replace(re, (_m, p, scale, num) => {
    const ns = SCALE[scale];
    if (!ns) return _m;
    return `${p}-${ns}-${num}`;
  });

  return out;
}

const args = process.argv.slice(2);
const files = args.includes('--all')
  ? TARGETS
  : args.length
  ? args
  : TARGETS;

let changed = 0;
for (const f of files) {
  const path = join(process.cwd(), f);
  if (!existsSync(path)) continue;
  const before = readFileSync(path, 'utf8');
  const after = migrate(before);
  if (before !== after) {
    writeFileSync(path, after);
    changed++;
    console.log(`🎨  ${f}`);
  }
}
console.log(`\n${changed} file aggiornati.`);
