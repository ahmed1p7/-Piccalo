// ═══════════════════════════════════════════════════════════════════
// 🔑 Genera il "codice di sincronizzazione" da una config Firebase
// ═══════════════════════════════════════════════════════════════════
//
// Uso:
//   node scripts/make-sync-code.mjs
//   → incolla la config JSON di Firebase Web App (quella che contiene
//     apiKey / authDomain / projectId / ...) → il codice viene stampato
//
//   oppure
//
//   node scripts/make-sync-code.mjs '{"apiKey":"...","projectId":"...",...}'
//
// Il codice è semplicemente la config in base64: incollalo nell'app
// (icona Sync → "Collega questo dispositivo") su ogni telefono.
// ═══════════════════════════════════════════════════════════════════

import fs from 'node:fs';

const PICK = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

function normalize(raw) {
  const out = {};
  PICK.forEach((key) => {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) out[key] = value.trim();
  });
  if (!out.apiKey || !out.projectId) {
    throw new Error('Config incompleta: servono almeno apiKey e projectId.');
  }
  if (!out.storageBucket) out.storageBucket = `${out.projectId}.appspot.com`;
  if (!out.authDomain) out.authDomain = `${out.projectId}.firebaseapp.com`;
  return out;
}

function encode(config) {
  const json = JSON.stringify(config);
  return Buffer.from(json, 'utf-8').toString('base64');
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf-8');
  } catch {
    return '';
  }
}

const arg = process.argv[2];
let raw = '';

// se viene indicato un file (.env / .json) lo legge
if (arg && fs.existsSync(arg)) {
  raw = fs.readFileSync(arg, 'utf-8');
} else {
  raw = arg || '';
}

if (!raw.trim()) {
  console.log(
    '\nIncolla qui la config JSON di Firebase (premi Invio, poi Ctrl+D):\n'
  );
  raw = readStdin();
}

// prova a interpretare la config come "chiave=valore"
function parseKeyValue(text) {
  const out = {};
  text.split(/[&\n,;]+/).forEach((chunk) => {
    const idx = chunk.indexOf('=');
    if (idx <= 0) return;
    let key = chunk.slice(0, idx).trim();
    const value = chunk.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    // accetta anche le chiavi con prefisso VITE_FIREBASE_ (file .env)
    if (key.startsWith('VITE_FIREBASE_')) {
      key = key.replace('VITE_FIREBASE_', '');
    }
    // riporta i nomi in maiuscolo/underscore ai nomi ufficiali del web config
    const ALIASES = {
      API_KEY: 'apiKey',
      AUTH_DOMAIN: 'authDomain',
      PROJECT_ID: 'projectId',
      STORAGE_BUCKET: 'storageBucket',
      MESSAGING_SENDER_ID: 'messagingSenderId',
      APP_ID: 'appId',
    };
    if (ALIASES[key]) key = ALIASES[key];
    if (key) out[key] = value;
  });
  return out;
}

let parsed;
try {
  parsed = JSON.parse(raw);
} catch {
  parsed = parseKeyValue(raw);
}

const config = normalize(parsed);

console.log('\n══════════════════════════════════════════════════════');
console.log('  🔑 CODICE DI SINCRONIZZAZIONE');
console.log('══════════════════════════════════════════════════════');
console.log(encode(config));
console.log('\n👉 Incollalo nell\'app: icona Sync → incolla → "Collega questo dispositivo"');
console.log('   (lo stesso codice su TUTTI i telefoni)\n');
