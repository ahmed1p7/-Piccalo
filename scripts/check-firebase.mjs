// ═══════════════════════════════════════════════════════════════════
// 🔍 Sea POS - Controllo configurazione Firebase
// ═══════════════════════════════════════════════════════════════════
// Verifica se il progetto Firebase è pronto per la sincronizzazione
// multi-dispositivo e dice esattamente cosa manca.
//
// Usa:  node scripts/check-firebase.mjs [apiKey] [databaseURL]
// ═══════════════════════════════════════════════════════════════════

const API_KEY =
  process.argv[2] ||
  process.env.VITE_FIREBASE_API_KEY ||
  'AIzaSyBybQ6ytEjqzkByvV1sKDn1ZAgh2ktq4zY';

const DATABASE_URL =
  process.argv[3] ||
  process.env.VITE_FIREBASE_DATABASE_URL ||
  'https://sea-restaurant-default-rtdb.europe-west1.firebasedatabase.app';

const ok = (s) => `\x1b[32m✔\x1b[0m ${s}`;
const bad = (s) => `\x1b[31m✘\x1b[0m ${s}`;
const warn = (s) => `\x1b[33m!\x1b[0m ${s}`;

async function testDatabase() {
  const probe = `${DATABASE_URL}/sea_pos/_probe.json?auth=${API_KEY}`;
  try {
    // scrittura
    const write = await fetch(probe, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ping: '1' }),
    });

    if (!write.ok) {
      const text = await write.text();
      if (text.includes('Permission denied')) {
        return {
          ok: false,
          code: 'RULES',
          msg: 'regole chiuse (Permission denied)',
        };
      }
      if (text.includes('404') || write.status === 404) {
        return { ok: false, code: 'NO_DB', msg: 'database non trovato' };
      }
      return { ok: false, code: 'OTHER', msg: `HTTP ${write.status}` };
    }

    // lettura
    const read = await fetch(probe);
    const body = await read.json().catch(() => null);
    if (!body || body.ping !== '1') {
      return { ok: false, code: 'READ', msg: 'scrittura ok ma lettura fallita' };
    }

    // pulizia
    await fetch(probe, { method: 'DELETE' });

    return { ok: true };
  } catch (e) {
    return { ok: false, code: 'NET', msg: e.message };
  }
}

async function testAuth() {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnSecureToken: true }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (data.idToken) return { ok: true };
    return { ok: false, msg: data?.error?.message || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, msg: e.message };
  }
}

console.log('');
console.log(`  Realtime Database: \x1b[1m${DATABASE_URL}\x1b[0m`);
console.log(`  API key:           ${API_KEY.slice(0, 12)}…`);
console.log('');

const db = await testDatabase();
if (db.ok) {
  console.log(ok('Realtime Database: scrivibile e leggibile'));
} else if (db.code === 'RULES') {
  console.log(bad('Realtime Database: le regole chiudono gli accessi'));
} else if (db.code === 'NO_DB') {
  console.log(bad(`Realtime Database: ${db.msg}`));
} else {
  console.log(bad(`Realtime Database: ${db.msg}`));
}

const auth = await testAuth();
console.log(
  auth.ok
    ? ok('Accesso anonimo: attivo')
    : warn(`Accesso anonimo: ${auth.msg} — (facoltativo con regole aperte)`)
);

console.log('');
if (!db.ok) {
  console.log('  Per completare (1 minuto):');
  console.log('  1) Apri le regole del Realtime Database:');
  console.log('     https://console.firebase.google.com/project/sea-restaurant/database/sea-restaurant-default-rtdb/data');
  console.log('     → Realtime Database → scheda "Rules"');
  console.log('     → incolla questo testo e clicca "Publish":');
  console.log('');
  console.log('       {');
  console.log('         "rules": {');
  console.log('           ".read": true,');
  console.log('           ".write": true');
  console.log('         }');
  console.log('       }');
  console.log('');
  console.log('  Poi rilancia:  node scripts/check-firebase.mjs');
  console.log('');
  process.exit(1);
}

console.log('  ✅ Tutto pronto: la sincronizzazione multi-dispositivo funziona.');
console.log('');
