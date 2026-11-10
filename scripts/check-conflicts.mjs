// ═══════════════════════════════════════════════════════════════════
// 🔍 Controllo marcatori di conflitto di merge
// ═══════════════════════════════════════════════════════════════════
// Un merge fatto a mano può finire committato per errore con le righe
//   <<<<<<< HEAD
//   =======
//   >>>>>>> branch
// dentro il codice: la build si rompe con un errore incomprensibile
// ("Unexpected token") che sembra un bug di Vite.
//
// Questo controllo si esegue PRIMA di build e test (npm run prebuild)
// e anche in GitHub Actions, così il problema viene intercettato subito.
//
// Uso:  node scripts/check-conflicts.mjs
// ═══════════════════════════════════════════════════════════════════

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();

// cartelle da controllare
const DIRS = ['src', 'scripts', 'server', 'tests', '.github'];
// estensioni controllate
const EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|yml|yaml|css|html|md|java|kt|xml|gradle|properties)$/i;
// nomi da ignorare (dipendenze, build, lockfile)
const IGNORE = /(^|\/)(node_modules|dist|build|\.git|android\/app\/build|\.gradle|coverage)(\/|$)/;

const MARKERS = [
  { re: /^<<<<<<< /m, label: '<<<<<<< (inizio conflitto)' },
  { re: /^>>>>>>> /m, label: '>>>>>>> (fine conflitto)' },
];

// ⚠️ "=======" da solo è ambiguo (compare anche come separatore in certi file
// markdown/YAML). Per questo lo cerchiamo SOLO dentro file che contengono
// anche uno degli altri due marcatori.
const CONFLICT_MARKER = /^=======$/m;

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (IGNORE.test(relative(ROOT, full))) continue;
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) yield* walk(full);
    else if (EXT.test(entry)) yield full;
  }
}

const problems = [];

for (const dir of DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    let content;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const hasHead = MARKERS[0].re.test(content);
    const hasEnd = MARKERS[1].re.test(content);
    const hasBar = CONFLICT_MARKER.test(content);

    if (!hasHead && !hasEnd && !hasBar) continue;

    // "=======" senza <<<<<<< / >>>>>>> → non è un conflitto (es. markdown)
    if (!hasHead && !hasEnd) continue;

    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (MARKERS[0].re.test(line) || MARKERS[1].re.test(line) || CONFLICT_MARKER.test(line)) {
        problems.push({
          file: relative(ROOT, file),
          line: i + 1,
          text: line.trim().slice(0, 60),
        });
      }
    });
  }
}

if (problems.length > 0) {
  console.error('\n❌ ERRORE: marcatori di conflitto di merge non risolti!\n');
  for (const p of problems) {
    console.error(`   ${p.file}:${p.line}  ${p.text}`);
  }
  console.error('\n   ➜ Come risolvere:');
  console.error('     1. apri i file indicati e cancella le righe <<<<<<< / ======= / >>>>>>>');
  console.error('     2. tieni la versione giusta (git checkout --ours <file> | git checkout --theirs <file>)');
  console.error('     3. git add <file> && git commit -m "risolvi conflitto"');
  console.error('     4. npm run build   (ora deve passare)\n');
  process.exit(1);
}

console.log('✅ nessun marcatore di conflitto di merge');
