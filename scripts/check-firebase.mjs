// ═══════════════════════════════════════════════════════════════════
// 🔍 Sea POS - Controllo configurazione Firebase
// ═══════════════════════════════════════════════════════════════════
// Verifica se il progetto Firebase è pronto per la sincronizzazione
// multi-dispositivo e dice esattamente cosa manca.
//
// Uso:  node scripts/check-firebase.mjs [apiKey] [projectId]
// ═══════════════════════════════════════════════════════════════════

const API_KEY =
  process.argv[2] || process.env.VITE_FIREBASE_API_KEY || 'AIzaSyBybQ6ytEjqzkByvV1sKDn1ZAgh2ktq4zY';
const PROJECT_ID =
  process.argv[3] || process.env.VITE_FIREBASE_PROJECT_ID || 'sea-restaurant';

const ok = (s) => `\x1b[32m✔\x1b[0m ${s}`;
const bad = (s) => `\x1b[31m✘\x1b[0m ${s}`;
const warn = (s) => `\x1b[33m!\x1b[0m ${s}`;

async function checkFirestore() {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/sea_pos/_probe?key=${API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { ping: { stringValue: '1' } } }) }
    );
    const text = await res.text();
    if (res.ok) {
      // pulizia
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/sea_pos/_probe?key=${API_KEY}`,
        { method: 'DELETE' }
      );
      return { ok: true };
    }
    const msg = text.includes('SERVICE_DISABLED')
      ? 'API Firestore non attivato'
      : text.includes('PERMISSION_DENIED') || res.status === 403
      ? 'Regole Firestore chiuse (o API non attivata)'
      : `HTTP ${res.status}`;
    return { ok: false, msg };
  } catch (e) {
    return { ok: false, msg: e.message };
  }
}

async function checkAuth() {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnSecureToken: true }) }
    );
    const data = await res.json().catch(() => ({}));
    if (data.idToken) return { ok: true, uid: data.localId };
    return { ok: false, msg: data?.error?.message || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, msg: e.message };
  }
}

console.log('');
console.log(`  Progetto Firebase: \x1b[1m${PROJECT_ID}\x1b[0m`);
console.log(`  API key:           ${API_KEY.slice(0, 12)}…`);
console.log('');

const fs = await checkFirestore();
console.log(
  fs.ok
    ? ok('Firestore: scrivibile (sincronizzazione pronta)')
    : bad(`Firestore: ${fs.msg}`)
);

const auth = await checkAuth();
console.log(
  auth.ok
    ? ok('Accesso anonimo: attivo')
    : warn(`Accesso anonimo: ${auth.msg} — (facoltativo se le regole sono in modalità "test")`)
);

console.log('');
if (!fs.ok) {
  console.log('  Per completare (2 minuti):');
  console.log(`  1) Attiva l'API: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${PROJECT_ID}`);
  console.log('     → clicca "Abilita"');
  console.log(`  2) Crea il database: https://console.firebase.google.com/project/${PROJECT_ID}/firestore`);
  console.log('     → "Crea database" → modalità "test"');
  console.log('  3) (facoltativo) Accesso anonimo:');
  console.log(`     https://console.firebase.google.com/project/${PROJECT_ID}/authentication/providers`);
  console.log('     → "Anonimo" → Abilita');
  console.log('');
  console.log('  Poi rilancia:  node scripts/check-firebase.mjs');
  console.log('');
  process.exit(1);
}
console.log('  ✅ Tutto pronto: la sincronizzazione multi-dispositivo funziona.');
console.log('');
