// ============================================================
// Debt & mortgage engine — thin layer over the shared amortization
// module so the Debt view, the projection and the timeline agree.
// ============================================================
import { amortize as amortizeCore, effectiveMonthlyRate, compoundingFor } from './amortization.js';

const fin = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

/**
 * Amortize a single loan month-by-month until paid off (cap 1200 months).
 * compounding: 'monthly' | 'semi-annual' (Canadian mortgages) | 'annual'
 */
export function amortize(balance, annualRate, monthlyPayment, extra = 0, compounding = 'monthly') {
  return amortizeCore(balance, annualRate, monthlyPayment, extra, compounding);
}

/** Resolve the compounding convention for a liability. */
export function liabilityCompounding(l, country = 'CA') { return l?.compounding || compoundingFor(l?.type, country); }

/**
 * Multi-debt payoff strategy simulation (avalanche or snowball).
 * Rolls paid-off debt's payment into the next debt. Uses each debt's own
 * compounding convention and any per-debt extraPayment already committed.
 */
export function payoffStrategy(liabilities, extraMonthly, method = 'avalanche', country = 'CA') {
  const debts = (liabilities || [])
    .filter(l => fin(l.balance) > 0 && fin(l.payment) + fin(l.extraPayment) > 0)
    .map(l => ({ id: l.id, label: l.label, balance: fin(l.balance), rate: fin(l.rate), payment: fin(l.payment) + fin(l.extraPayment), i: effectiveMonthlyRate(fin(l.rate), liabilityCompounding(l, country)) }));
  if (!debts.length) return { months: 0, totalInterest: 0, debtFreeMonths: 0, order: [], unpayable: false, payoffByDebt: {} };

  if (method === 'avalanche') debts.sort((a, b) => b.rate - a.rate); else debts.sort((a, b) => a.balance - b.balance);
  const order = debts.map(d => d.label);
  const remainders = debts.map(d => d.balance);
  const payoffByDebt = {};
  let extra = Math.max(0, fin(extraMonthly));
  let totalInterest = 0, month = 0, allPaid = false;

  for (let k = 0; k < debts.length; k++) {
    if (debts[k].payment <= remainders[k] * debts[k].i && remainders[k] > 0.005) {
      return { months: Infinity, totalInterest: Infinity, debtFreeMonths: Infinity, order, unpayable: true, payoffByDebt: {} };
    }
  }
  while (!allPaid && month < 1200) {
    month++;
    const focusIdx = debts.findIndex((_, i) => remainders[i] > 0.005);
    if (focusIdx === -1) { allPaid = true; break; }
    let freed = 0;
    for (let k = 0; k < debts.length; k++) {
      if (remainders[k] <= 0.005) continue;
      const interest = remainders[k] * debts[k].i;
      const pay = debts[k].payment + (k === focusIdx ? extra : 0);
      const principal = Math.min(pay - interest, remainders[k]);
      totalInterest += interest;
      remainders[k] = Math.max(0, remainders[k] - principal);
      if (remainders[k] <= 0.005) { freed += debts[k].payment; payoffByDebt[debts[k].id] = month; }
    }
    extra += freed;                                   // snowball the freed payments
    allPaid = remainders.every(b => b <= 0.005);
  }
  return { months: month, totalInterest: Math.round(totalInterest), debtFreeMonths: month, order, unpayable: false, payoffByDebt };
}

/** Compare three strategies: minimum-only, avalanche, snowball. */
export function compareStrategies(liabilities, extra = 0, country = 'CA') {
  const minimumOnly = payoffStrategy(liabilities, 0, 'avalanche', country);
  const avalanche = payoffStrategy(liabilities, extra, 'avalanche', country);
  const snowball = payoffStrategy(liabilities, extra, 'snowball', country);
  const delta = (s) => ({
    ...s,
    interestSaved: minimumOnly.unpayable || s.unpayable ? 0 : Math.max(0, minimumOnly.totalInterest - s.totalInterest),
    monthsSaved: minimumOnly.unpayable || s.unpayable ? 0 : Math.max(0, minimumOnly.months - s.months),
  });
  return { minimumOnly: { ...minimumOnly, interestSaved: 0, monthsSaved: 0 }, avalanche: delta(avalanche), snowball: delta(snowball) };
}

/** Compare mortgage payoff with and without extra monthly payment. */
export function mortgageAcceleration(mortgage, extraMonthly, country = 'CA') {
  const comp = liabilityCompounding(mortgage, country);
  const base = amortizeCore(fin(mortgage.balance), fin(mortgage.rate), fin(mortgage.payment), fin(mortgage.extraPayment), comp);
  const accel = amortizeCore(fin(mortgage.balance), fin(mortgage.rate), fin(mortgage.payment), fin(mortgage.extraPayment) + fin(extraMonthly), comp);
  return {
    interestSaved: base.unpayable ? 0 : Math.max(0, base.totalInterest - accel.totalInterest),
    monthsSaved: base.unpayable ? 0 : Math.max(0, base.months - accel.months),
    baseMonths: base.months, newMonths: accel.months,
    baseSchedule: base.schedule, accelSchedule: accel.schedule, compounding: comp,
  };
}
