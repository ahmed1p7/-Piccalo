/**
 * 🧮 Calcoli di cassa puri (divisione del conto, resto, riepiloghi)
 *
 * Separati dalla UI per poter essere testati: sono la parte che, se
 * sbaglia, fa perdere soldi al ristorante.
 */

export const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

/**
 * 👥 Divide un totale in N quote uguali.
 * L'ultima quota assorbe la differenza di arrotondamento (0,01 €).
 */
export function splitEqual(total: number, people: number): number[] {
  const n = Math.max(1, Math.floor(people));
  const base = round2(total / n);
  const out: number[] = [];
  for (let i = 0; i < n - 1; i++) out.push(base);
  out.push(round2(total - base * (n - 1)));
  return out;
}

/**
 * 👥 Divide un totale secondo percentuali.
 * Le percentuali non devono per forza sommare a 100: vengono normalizzate.
 */
export function splitByRatio(total: number, ratios: number[]): number[] {
  const nums = ratios.map((r) => (Number.isFinite(Number(r)) ? Number(r) : 0));
  const sum = nums.reduce((a, b) => a + b, 0);
  if (sum <= 0) return splitEqual(total, nums.length || 1);
  const out = nums.map((r) => round2((total * r) / sum));
  // correzione degli arrotondamenti: l'ultima quota chiude il totale esatto
  if (out.length > 0) {
    const partial = out.slice(0, -1).reduce((a, b) => a + b, 0);
    out[out.length - 1] = round2(total - partial);
  }
  return out;
}

/**
 * 💵 Resto da restituire (0 se il contante è sufficiente).
 */
export function computeChange(cashGiven: number, amountDue: number): number {
  const given = Number(cashGiven) || 0;
  const due = Number(amountDue) || 0;
  return given > due ? round2(given - due) : 0;
}

/**
 * 💳 Riepilogo di più pagamenti (uno o più metodi sullo stesso conto).
 */
export function summarizePayments(
  payments: { amount: number; method: 'contanti' | 'carta'; changeGiven?: number }[]
): { cash: number; card: number; total: number; change: number; methods: number } {
  let cash = 0;
  let card = 0;
  let change = 0;
  const methods = new Set<string>();

  for (const p of payments || []) {
    const amount = round2(p.amount);
    if (p.method === 'carta') {
      card = round2(card + amount);
      methods.add('carta');
    } else {
      cash = round2(cash + amount);
      methods.add('contanti');
    }
    change = round2(change + (Number(p.changeGiven) || 0));
  }

  return {
    cash,
    card,
    total: round2(cash + card),
    change,
    methods: methods.size,
  };
}

/**
 * ✅ Un conto è coperto quando quanto incassato copre il totale (con tolleranza
 * di 1 centesimo per gli arrotondamenti).
 */
export function isFullyPaid(total: number, paid: number): boolean {
  return round2(Number(paid) || 0) + 0.009 >= round2(Number(total) || 0);
}

/**
 * 👥 Distribuisce un importo sulle quote selezionate.
 *
 * Usato quando una persona paga per conto di altre (o quando una quota
 * viene saldata parzialmente): l'importo viene distribuito in ordine,
 * fino a coprire il dovuto di ciascuna.
 */
export interface SplitShareLike {
  amountDue: number;
  amountPaid: number;
  isPaid?: boolean;
  method?: string;
}

export interface SplitAllocation {
  index: number;
  amount: number;
  method: 'contanti' | 'carta';
}

export function allocatePayment(
  shares: SplitShareLike[],
  indexes: number[],
  amount: number
): SplitAllocation[] {
  const out: SplitAllocation[] = [];
  let left = round2(amount);
  for (const idx of indexes) {
    if (left <= 0.009) break;
    const share = shares[idx];
    if (!share || share.isPaid) continue;
    const owed = round2(share.amountDue - share.amountPaid);
    const take = round2(Math.min(owed, left));
    if (take > 0) {
      out.push({
        index: idx,
        amount: take,
        method: share.method === 'carta' ? 'carta' : 'contanti',
      });
      left = round2(left - take);
    }
  }
  return out;
}

/**
 * 💳 Raggruppa le quote da incassare per metodo di pagamento.
 * Se un gruppo paga per conto di più persone, si registra UN solo
 * pagamento (il totale del gruppo) con l'etichetta delle persone.
 */
export function groupAllocationsByMethod(
  allocations: SplitAllocation[]
): { method: 'contanti' | 'carta'; amount: number; indexes: number[] }[] {
  const groups: { method: 'contanti' | 'carta'; amount: number; indexes: number[] }[] = [];
  for (const alloc of allocations) {
    const g = groups.find((x) => x.method === alloc.method);
    if (g) {
      g.amount = round2(g.amount + alloc.amount);
      g.indexes.push(alloc.index);
    } else {
      groups.push({
        method: alloc.method,
        amount: alloc.amount,
        indexes: [alloc.index],
      });
    }
  }
  return groups;
}

/**
 * 💵 Totale in contante delle quote selezionate (serve per calcolare
 * il resto quando qualcuno paga per conto di altri).
 */
export function selectedCashTotal(
  shares: SplitShareLike[],
  indexes: number[]
): number {
  return round2(
    indexes.reduce((acc, i) => {
      const share = shares[i];
      if (!share || share.isPaid) return acc;
      const owed = round2(share.amountDue - share.amountPaid);
      return share.method === 'carta' ? acc : round2(acc + owed);
    }, 0)
  );
}
