// ═══════════════════════════════════════════════════════════════════
// 🧪 Test dei calcoli di cassa (divisione conto, resto, riepiloghi)
// ═══════════════════════════════════════════════════════════════════
import {
  splitEqual,
  splitByRatio,
  computeChange,
  summarizePayments,
  isFullyPaid,
  round2,
} from '../src/utils/cassa';

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

console.log('\n── Divisione equa ──');
{
  const q = splitEqual(100, 2);
  check('100 € in 2 → 50/50', q[0] === 50 && q[1] === 50, q);

  const q3 = splitEqual(100, 3);
  check('100 € in 3 → 33.33/33.33/33.34', q3[0] === 33.33 && q3[1] === 33.33 && q3[2] === 33.34, q3);
  check('la somma delle quote è esatta', round2(q3.reduce((a, b) => a + b, 0)) === 100, q3);

  const q10 = splitEqual(10, 4);
  check('10 € in 4 → 2.50 x4', q10.every((v) => v === 2.5), q10);

  const qOdd = splitEqual(0.05, 3);
  check(
    '0.05 € in 3 non perde centesimi',
    round2(qOdd.reduce((a, b) => a + b, 0)) === 0.05,
    qOdd
  );
}

console.log('\n── Divisione per percentuali ──');
{
  const q = splitByRatio(100, [50, 30, 20]);
  check('50/30/20 → 50/30/20', q[0] === 50 && q[1] === 30 && q[2] === 20, q);

  const q2 = splitByRatio(100, [1, 1]);
  check('percentuali non sommano a 100 → normalizzate', q2[0] === 50 && q2[1] === 50, q2);

  const q3 = splitByRatio(10, [33.33, 33.33, 33.34]);
  check('la somma resta esatta', round2(q3.reduce((a, b) => a + b, 0)) === 10, q3);

  const q4 = splitByRatio(100, [0, 0]);
  check('percentuali a zero → divisione equa di sicurezza', q4.length === 2, q4);
}

console.log('\n── Resto ──');
check('contante 50 per un conto da 20 → 30 di resto', computeChange(50, 20) === 30);
check('contante esatto → 0 di resto', computeChange(20, 20) === 0);
check('contante insufficiente → 0 di resto (nessun negativo)', computeChange(10, 20) === 0);

console.log('\n── Pagamenti multipli ──');
{
  const r = summarizePayments([
    { amount: 30, method: 'contanti', changeGiven: 5 },
    { amount: 20, method: 'carta' },
    { amount: 50, method: 'contanti' },
  ]);
  check('contanti = 80', r.cash === 80, r);
  check('carta = 20', r.card === 20, r);
  check('totale = 100', r.total === 100, r);
  check('resto = 5', r.change === 5, r);
  check('2 metodi di pagamento', r.methods === 2, r);

  const solo = summarizePayments([{ amount: 10, method: 'carta' }]);
  check('un solo metodo', solo.methods === 1 && solo.cash === 0 && solo.card === 10, solo);
}

console.log('\n── Copertura del conto ──');
check('100 coperti da 100 → coperto', isFullyPaid(100, 100));
check('100 coperti da 99.99 → non coperto', !isFullyPaid(100, 99.99));
check('100 coperti da 100.01 → coperto', isFullyPaid(100, 100.01));
check('0 coperti da 0 → coperto', isFullyPaid(0, 0));

console.log(`\n═══ Risultato: ${passed} test passati, ${failed} falliti ═══\n`);
process.exit(failed > 0 ? 1 : 0);
