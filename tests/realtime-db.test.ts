// ═══════════════════════════════════════════════════════════════════
// 🧪 Test del trasporto Realtime Database (contro l'emulatore Firebase)
// ═══════════════════════════════════════════════════════════════════
// Verifica che due "dispositivi" collegati al Realtime Database si
// vedano le modifiche in tempo reale.
//
// Avvio emulatore:
//   npx firebase emulators:start --only database --project demo-sea-pos
//
// Esecuzione:
//   npx tsx tests/realtime-db.test.ts
// ═══════════════════════════════════════════════════════════════════

import { RealtimeDbTransport } from '../src/sync/transports/RealtimeDbTransport';

const EMULATOR_URL = 'http://127.0.0.1:9000?ns=demo-sea-pos-default-rtdb';
const API_KEY = 'demo-key';
const PROJECT_ID = 'demo-sea-pos';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, extra?: any) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`, extra !== undefined ? JSON.stringify(extra) : '');
  }
}

const config = {
  apiKey: API_KEY,
  authDomain: `${PROJECT_ID}.firebaseapp.com`,
  projectId: PROJECT_ID,
  databaseURL: EMULATOR_URL,
};

async function main() {
  console.log('\n── Realtime Database: due dispositivi ──');

  // Telefono A
  const A = new RealtimeDbTransport(config);
  const aOk = await A.connect();
  check('A si connette', aOk);

  // Telefono B
  const B = new RealtimeDbTransport(config);
  const bOk = await B.connect();
  check('B si connette', bOk);

  // B ascolta gli stati
  const received: any[] = [];
  B.subscribe((state) => received.push(state), () => {});

  await new Promise((r) => setTimeout(r, 800));

  // A scrive una collezione
  const t0 = Date.now();
  await A.writeCollection('users', {
    data: [{ id: 'u1', username: 'mario_test', pin: '7777' }],
    updatedAt: Date.now(),
    deviceId: 'deviceA',
  });

  // B deve riceverla quasi subito
  let elapsed = 0;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const found = received.some(
      (s) => s.collections?.users?.data?.[0]?.username === 'mario_test'
    );
    if (found) {
      elapsed = Date.now() - t0;
      break;
    }
  }

  check(
    `B riceve la modifica in tempo reale (${elapsed} ms)`,
    elapsed > 0 && elapsed < 3000,
    { elapsed }
  );

  // Presenza dei dispositivi
  await A.writeDevice({
    id: 'deviceA',
    name: 'Cassa',
    role: 'cassa',
    platform: 'android',
    createdAt: Date.now(),
  });

  let deviceSeen = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 100));
    if (received.some((s) => s.devices?.deviceA?.name === 'Cassa')) {
      deviceSeen = true;
      break;
    }
  }
  check('B vede il dispositivo "Cassa" registrato', deviceSeen);

  // Scrittura di più collezioni
  await A.writeCollection('receipts', {
    data: [{ id: 'r1', totalAmount: 42 }],
    updatedAt: Date.now(),
    deviceId: 'deviceA',
  });
  await new Promise((r) => setTimeout(r, 600));
  check(
    'B vede anche gli scontrini',
    received.some((s) => s.collections?.receipts?.data?.[0]?.totalAmount === 42)
  );

  A.disconnect();
  B.disconnect();

  console.log(`\n═══ Risultato: ${passed} test passati, ${failed} falliti ═══\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Errore:', e);
  process.exit(1);
});
