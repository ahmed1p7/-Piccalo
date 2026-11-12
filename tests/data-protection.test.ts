// ═══════════════════════════════════════════════════════════════════
// 🛡️ Test di protezione dei dati (v1.6.0)
//
// Verificano le regole che impediscono la perdita dei dati del
// ristorante:
//   1. un valore VUOTO non cancella mai un valore pieno (profilo)
//   2. i dati DEMO del vecchio seed non sovrascrivono i dati reali
//   3. gli account demo vengono rimossi, ma MAI l'ultimo admin
//   4. ogni ristorante ha il proprio spazio cloud (rid stabile)
//   5. la copia di sicurezza locale è integra e ripristinabile
//
// Eseguire con:  npx tsx tests/data-protection.test.ts
// ═══════════════════════════════════════════════════════════════════

import {
  mergeValue,
  mergeCollection,
  isDeepEqual,
} from '../src/sync/merge';
import {
  isLegacyDemoCollection,
  hasLegacyDemoItems,
  stripLegacyDemoItems,
  stripLegacyDemoUsersSafely,
  LEGACY_USER_IDS,
  LEGACY_TABLE_IDS,
  LEGACY_INVENTORY_IDS,
} from '../src/sync/legacyData';
import { ridFromName, randomRid, isValidRid, normalizeRestaurantKey } from '../src/utils/identity';

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

// ───────────────────────────────────────────────────────────────────
console.log('\n── 1. Un valore vuoto non cancella un valore pieno ──');
{
  // ⚠️ questo era il bug che svuotava il profilo del ristorante
  check(
    'profilo: locale vuoto non cancella il nome remoto',
    mergeValue(undefined, '', 'Ristorante Malih') === 'Ristorante Malih'
  );
  check(
    'profilo: remoto vuoto non cancella il nome locale',
    mergeValue(undefined, 'Ristorante Malih', '') === 'Ristorante Malih'
  );
  check(
    'profilo: entrambi vuoti → vuoto',
    mergeValue(undefined, '', '') === ''
  );
  check(
    'profilo: entrambi pieni → conflitto, vince il locale',
    mergeValue('A', 'B', 'C') === 'B'
  );

  const mergedProfile = mergeCollection(
    'profile',
    { name: 'Ristorante Malih', address: 'Lungomare 18' },
    { name: '', address: 'Lungomare 18' },
    { name: 'Ristorante Malih', address: '' }
  );
  check(
    'merge profilo: il nome non viene svuotato',
    (mergedProfile as any).name === 'Ristorante Malih',
    mergedProfile
  );
  check(
    'merge profilo: l\u2019indirizzo non viene svuotato',
    (mergedProfile as any).address === 'Lungomare 18',
    mergedProfile
  );
}

// ───────────────────────────────────────────────────────────────────
console.log('\n── 2. I dati demo non sovrascrivono i dati reali ──');
{
  const demoUsers = LEGACY_USER_IDS.map((id) => ({
    id,
    username: id === 'user_admin' ? 'Admin' : id,
    pin: '5555',
    role: 'admin',
  }));
  const realUsers = [
    { id: 'user_ahmed', username: 'ahmed', pin: '1234', role: 'admin' },
    { id: 'user_giuseppe', username: 'giuseppe', pin: '4321', role: 'personalizzato' },
  ];

  check(
    'collezione demo riconosciuta (utenti)',
    isLegacyDemoCollection('users', demoUsers) === true
  );
  check(
    'collezione reale NON riconosciuta come demo',
    isLegacyDemoCollection('users', realUsers) === false
  );
  check(
    'collezione mista NON è "solo demo"',
    isLegacyDemoCollection('users', [...demoUsers, ...realUsers]) === false
  );
  check(
    'tavoli demo riconosciuti',
    isLegacyDemoCollection('tables', LEGACY_TABLE_IDS.map((id) => ({ id }))) === true
  );
  check(
    'magazzino demo riconosciuto',
    isLegacyDemoCollection(
      'inventory',
      LEGACY_INVENTORY_IDS.map((id) => ({ id }))
    ) === true
  );
  check(
    'ricevute seed demo riconosciute',
    isLegacyDemoCollection('receipts', [
      { id: 'rec_seed_1' },
      { id: 'rec_seed_2' },
    ]) === true
  );
  check(
    'hasLegacyDemoItems trova un elemento demo mescolato',
    hasLegacyDemoItems('users', [...realUsers, demoUsers[0]]) === true
  );

  // Il merge con dati reali locali e demo remoti NON deve perdere i reali
  const merged = mergeCollection(
    'users',
    undefined,
    realUsers,
    demoUsers,
    { allowRemoteDeletions: true }
  );
  check(
    'il merge conserva gli utenti reali',
    (merged as any[]).some((u) => u.username === 'ahmed'),
    merged
  );
}

// ───────────────────────────────────────────────────────────────────
console.log('\n── 3. Gli account demo si rimuovono, ma non l\u2019ultimo admin ──');
{
  const demoAdmin = { id: 'user_admin', username: 'Admin', pin: '5555', role: 'admin' };
  const demoStaff = { id: 'user_cameriere', username: 'alessio', pin: '1111', role: 'cameriere' };
  const realAdmin = { id: 'user_ahmed', username: 'ahmed', pin: '1234', role: 'admin' };

  const res1 = stripLegacyDemoUsersSafely([demoAdmin, demoStaff, realAdmin]);
  check('l\u2019admin demo viene rimosso', res1.removed === 2, res1);
  check(
    'l\u2019admin reale resta',
    res1.users.some((u: any) => u.username === 'ahmed')
  );

  const res2 = stripLegacyDemoUsersSafely([demoAdmin, demoStaff]);
  check(
    'se l\u2019unico admin è demo NON viene rimosso (no blocco)',
    res2.removed === 0 && res2.keptLastAdmin === true,
    res2
  );

  const res3 = stripLegacyDemoUsersSafely([demoStaff, realAdmin]);
  check(
    'il dipendente demo viene rimosso',
    res3.removed === 1,
    res3
  );
}

// ───────────────────────────────────────────────────────────────────
console.log('\n── 4. Ogni ristorante ha il proprio spazio cloud ──');
{
  const a = ridFromName('Ristorante Malih');
  const b = ridFromName('Ristorante Malih');
  const c = ridFromName('Pizzeria Napoli');

  check('rid valido', isValidRid(a), a);
  check('rid stabile per lo stesso nome', a === b, { a, b });
  check('rid diverso per un altro ristorante', a !== c, { a, c });
  check('rid casuale valido', isValidRid(randomRid()));
  check('nome vuoto → nessun rid deterministico', ridFromName('') === '');
  check(
    'chiave normalizzata',
    normalizeRestaurantKey('  Ristorante Malih  ') === 'ristorante_malih'
  );
}

// ───────────────────────────────────────────────────────────────────
console.log('\n── 5. Copia di sicurezza locale ──');
{
  // la copia di sicurezza viene verificata con un checksum
  const { checksumOf, readWithBackup } = await import('../src/utils/localBackup');

  const data = { users: [{ id: 'a' }], tables: [{ id: 't1' }] };
  const sum = checksumOf(data);
  check('checksum stabile', sum === checksumOf(data));
  check('checksum diverso su dati diversi', sum !== checksumOf({ ...data, tables: [] }));

  // localStorage non disponibile in node → il fallback deve essere sicuro
  const fallback = readWithBackup<any[]>('chiave_inesistente', []);
  check('lettura di una chiave assente → fallback', Array.isArray(fallback.value));
}

console.log(
  `\n═══ Risultato: ${passed} test passati, ${failed} falliti ═══\n`
);

if (failed > 0) {
  process.exit(1);
}
