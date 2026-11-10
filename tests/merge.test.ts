// ═══════════════════════════════════════════════════════════════════
// 🧪 Test del motore di merge multi-dispositivo
// Eseguire con:  npx tsx tests/merge.test.ts
// ═══════════════════════════════════════════════════════════════════

import {
  mergeCollection,
  mergeCounter,
  mergeValue,
  isDeepEqual,
  normalizeCollectionData,
} from '../src/sync/merge';

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

console.log('\n── mergeValue (3-way) ──');
{
  const base = { a: 1 };
  check('nessuna modifica → remote', mergeValue(1, 1, 1) === 1);
  check('solo remote cambiato → remote', mergeValue(1, 1, 2) === 2);
  check('solo local cambiato → local', mergeValue(1, 3, 1) === 3);
  check('conflitto → local vince', mergeValue(1, 3, 2) === 3);
}

console.log('\n── mergeCounter (quantità magazzino) ──');
{
  check('solo remote cambiato', mergeCounter(10, 10, 12) === 12);
  check('solo local cambiato → delta applicato al remoto', mergeCounter(10, 7, 10) === 7);
  check('entrambi cambiati → delta sommato', mergeCounter(10, 7, 15) === 12);
}

console.log('\n── receipts: due telefoni creano scontrini ──');
{
  const base: any[] = [];
  const local = [{ id: 'r1', totalAmount: 10 }];
  const remote = [{ id: 'r2', totalAmount: 20 }];
  const merged = mergeCollection('receipts', base, local, remote);
  check('entrambi gli scontrini conservati', merged.length === 2, merged);
  check('scontrino locale presente', merged.some((r: any) => r.id === 'r1'));
  check('scontrino remoto presente', merged.some((r: any) => r.id === 'r2'));
}

console.log('\n── inventory: scarico su A, carico su B ──');
{
  const base = [{ id: 'i1', name: 'Farina', currentQuantity: 50 }];
  const local = [{ id: 'i1', name: 'Farina', currentQuantity: 47 }]; // A scarica 3
  const remote = [{ id: 'i1', name: 'Farina', currentQuantity: 55 }]; // B carica 5
  const merged = mergeCollection('inventory', base, local, remote);
  check('quantità sommata (50 -3 +5 = 52)', merged[0].currentQuantity === 52, merged);
  check('nessuna modifica persa', merged.length === 1);
}

console.log('\n── inventory: lo stesso scarico non viene contato due volte ──');
{
  const base = [{ id: 'i1', currentQuantity: 50 }];
  const local = [{ id: 'i1', currentQuantity: 47 }];
  const remote = [{ id: 'i1', currentQuantity: 47 }];
  const merged = mergeCollection('inventory', base, local, remote);
  check('quantità unica (47)', merged[0].currentQuantity === 47, merged);
}

console.log('\n── tables: cassa cambia importo, cucina cambia stato ordine ──');
{
  const base = [
    {
      id: 't1',
      status: 'occupato',
      billAmount: 0,
      currentOrderItems: [{ id: 'o1', name: 'Pizza', status: 'ordinato', quantity: 1 }],
    },
  ];
  const local = [
    {
      id: 't1',
      status: 'occupato',
      billAmount: 25,
      currentOrderItems: [{ id: 'o1', name: 'Pizza', status: 'ordinato', quantity: 1 }],
    },
  ];
  const remote = [
    {
      id: 't1',
      status: 'occupato',
      billAmount: 0,
      currentOrderItems: [{ id: 'o1', name: 'Pizza', status: 'pronto', quantity: 1 }],
    },
  ];
  const merged = mergeCollection('tables', base, local, remote);
  check('importo della cassa conservato', merged[0].billAmount === 25, merged);
  check(
    "stato dell'ordine della cucina conservato",
    merged[0].currentOrderItems[0].status === 'pronto',
    merged
  );
}

console.log('\n── tables: ordine nuovo su A + ordine nuovo su B ──');
{
  const base: any[] = [];
  const local = [
    { id: 't1', status: 'occupato', currentOrderItems: [{ id: 'o1', name: 'Pizza' }] },
  ];
  const remote = [
    { id: 't1', status: 'occupato', currentOrderItems: [{ id: 'o2', name: 'Birra' }] },
  ];
  const merged = mergeCollection('tables', base, local, remote);
  check('2 ordini nel tavolo', merged[0].currentOrderItems.length === 2, merged);
}

console.log('\n── profile: due campi modificati su due telefoni ──');
{
  const base = { name: 'Sea', phone: '111' };
  const local = { name: 'Sea', phone: '222' };
  const remote = { name: 'Sea Ristorante', phone: '111' };
  const merged = mergeCollection('profile', base, local, remote);
  check('nome aggiornato (da B)', merged.name === 'Sea Ristorante', merged);
  check('telefono aggiornato (da A)', merged.phone === '222', merged);
}

console.log('\n── users: un utente creato su un telefono ──');
{
  const base: any[] = [];
  const local = [{ id: 'u1', username: 'cucina', pin: '1111' }];
  const remote: any[] = [];
  const merged = mergeCollection('users', base, local, remote);
  check('utente presente', merged.length === 1 && merged[0].username === 'cucina', merged);
}

console.log('\n── users: nuovo account su A → appare su B ──');
{
  const base = [{ id: 'u1', username: 'admin', pin: '5555' }];
  const local = [{ id: 'u1', username: 'admin', pin: '5555' }];
  const remote = [
    { id: 'u1', username: 'admin', pin: '5555' },
    { id: 'u2', username: 'elena', pin: '4444' },
  ];
  const merged = mergeCollection('users', base, local, remote);
  check('2 utenti dopo la sincronizzazione', merged.length === 2, merged);
  check('il nuovo account è presente', merged.some((u: any) => u.username === 'elena'));
}

console.log('\n── users: account eliminato su A → sparisce su B ──');
{
  const base = [
    { id: 'u1', username: 'admin', pin: '5555' },
    { id: 'u2', username: 'elena', pin: '4444' },
  ];
  const local = [{ id: 'u1', username: 'admin', pin: '5555' }]; // A ha eliminato Elena
  const remote = base; // B la ha ancora
  const merged = mergeCollection('users', base, local, remote);
  check('l’account eliminato non è più presente', merged.length === 1, merged);
  check('resta solo admin', merged[0].username === 'admin');
}

console.log('\n── users: PIN modificato su A → si aggiorna su B ──');
{
  const base = [{ id: 'u1', username: 'admin', pin: '5555' }];
  const local = [{ id: 'u1', username: 'admin', pin: '5555' }];
  const remote = [{ id: 'u1', username: 'admin', pin: '9999' }];
  const merged = mergeCollection('users', base, local, remote);
  check('nuovo PIN applicato', merged[0].pin === '9999', merged);
}

console.log('\n── tables: tavolo eliminato su A → sparisce su B ──');
{
  const base = [{ id: 't1', status: 'occupato' }];
  const local: any[] = [];
  const remote = [{ id: 't1', status: 'occupato' }];
  const merged = mergeCollection('tables', base, local, remote);
  check('tavolo rimosso', merged.length === 0, merged);
}

console.log('\n── isDeepEqual ──');
{
  check('array uguali', isDeepEqual([{ a: 1 }], [{ a: 1 }]));
  check('array diversi', !isDeepEqual([{ a: 1 }], [{ a: 2 }]));
  check('null vs undefined', !isDeepEqual(null, undefined));
}

// ═══════════════════════════════════════════════════════════════════
// ⚠️ Normalizzazione dati dal cloud
//    Il Realtime Database NON salva le array vuote: senza normalizzare,
//    l'app riceverebbe undefined al posto di [] e andrebbe in crash.
// ═══════════════════════════════════════════════════════════════════
console.log('\n── Normalizzazione collezioni dal cloud ──');
{
  check(
    'users senza data (array vuota non salvata) → []',
    JSON.stringify(normalizeCollectionData('users', undefined)) === '[]'
  );
  check(
    'tables con data vuota → []',
    JSON.stringify(normalizeCollectionData('tables', null)) === '[]'
  );
  check(
    'inventory con array valido → invariato',
    normalizeCollectionData('inventory', [{ id: 'a' }]).length === 1
  );
  check(
    'profile senza data → {}',
    JSON.stringify(normalizeCollectionData('profile', undefined)) === '{}'
  );
  check(
    'profile con dati → invariato',
    normalizeCollectionData('profile', { name: 'X' }).name === 'X'
  );
  check(
    'profile con array (tipo sbagliato) → {}',
    JSON.stringify(normalizeCollectionData('profile', [1, 2])) === '{}'
  );
}

console.log(
  `\n═══ Risultato: ${passed} test passati, ${failed} falliti ═══\n`
);

if (failed > 0) {
  process.exit(1);
}
