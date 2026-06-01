// ============================================================
// Debt & mortgage engine
// ============================================================
import { t } from '../i18n.js';

/**
 * Amortize a single loan month-by-month until paid off (cap 1200 months).
 * Stores yearly snapshots + final month to keep arrays small.
 *
 * @param {number} balance       Outstanding principal
 * @param {number} annualRate    Annual interest rate (decimal, e.g. 0.0479)
 * @param {number} monthlyPayment Regular monthly payment
 * @param {number} [extra=0]     Extra monthly principal payment
 * @returns {{ months, totalInterest, totalPaid, schedule, unpayable }}
 */
export function amortize(balance, annualRate, monthlyPayment, extra = 0) {
  const monthlyRate = annualRate / 12;
  const payment = monthlyPayment + extra;
  let bal = balance;
  let totalInterest = 0;
  let totalPaid = 0;
  const schedule = [];
  let month = 0;

  // Guard: payment too small to cover first month's interest
  const firstInterest = bal * monthlyRate;
  if (payment <= firstInterest && bal > 0) {
    return { months: Infinity, totalInterest: Infinity, totalPaid: Infinity, schedule: [], unpayable: true };
  }

  while (bal > 0.005 && month < 1200) {
    month++;
    const interest = bal * monthlyRate;
    const principal = Math.min(payment - interest, bal);
    bal = Math.max(0, bal - principal);
    totalInterest += interest;
    totalPaid += interest + principal;

    // Store every 12th month as a yearly snapshot, or the final month
    if (month % 12 === 0 || bal <= 0.005) {
      schedule.push({ month, interest: Math.round(totalInterest), principal: Math.round(balance - bal), balance: Math.round(bal) });
    }
  }

  return {
    months: month,
    totalInterest: Math.round(totalInterest),
    totalPaid: Math.round(totalPaid),
    schedule,
    unpayable: false,
  };
}

/**
 * Multi-debt payoff strategy simulation (avalanche or snowball).
 * Rolls paid-off debt's payment into the next debt.
 *
 * @param {Array}  liabilities    Array of liability objects {id, label, balance, rate, payment}
 * @param {number} extraMonthly   Extra monthly payment to allocate on top of minimums
 * @param {string} method         'avalanche' | 'snowball'
 * @returns {{ months, totalInterest, debtFreeMonths, order, unpayable }}
 */
export function payoffStrategy(liabilities, extraMonthly, method = 'avalanche') {
  if (!liabilities.length) {
    return { months: 0, totalInterest: 0, debtFreeMonths: 0, order: [], unpayable: false };
  }

  // Deep copy and sort
  const debts = liabilities
    .filter(l => l.balance > 0 && l.payment > 0)
    .map(l => ({ id: l.id, label: l.label, balance: l.balance, rate: l.rate, payment: l.payment }));

  if (!debts.length) {
    return { months: 0, totalInterest: 0, debtFreeMonths: 0, order: [], unpayable: false };
  }

  // Sort: avalanche = highest rate first, snowball = lowest balance first
  if (method === 'avalanche') {
    debts.sort((a, b) => b.rate - a.rate);
  } else {
    debts.sort((a, b) => a.balance - b.balance);
  }

  const order = debts.map(d => d.label);
  const remainders = debts.map(d => d.balance);
  const totalMinPayment = debts.reduce((s, d) => s + d.payment, 0);
  let extra = extraMonthly;
  let totalInterest = 0;
  let month = 0;
  let allPaid = false;

  // Check if minimum payments can cover first month interest for all debts
  for (let i = 0; i < debts.length; i++) {
    const interest = remainders[i] * (debts[i].rate / 12);
    if (debts[i].payment <= interest && remainders[i] > 0.005) {
      return { months: Infinity, totalInterest: Infinity, debtFreeMonths: Infinity, order, unpayable: true };
    }
  }

  while (!allPaid && month < 1200) {
    month++;
    // Each debt gets its minimum payment; focus target gets the extra
    let focusIdx = debts.findIndex((_, i) => remainders[i] > 0.005);
    if (focusIdx === -1) { allPaid = true; break; }

    for (let i = 0; i < debts.length; i++) {
      if (remainders[i] <= 0.005) continue;
      const monthlyRate = debts[i].rate / 12;
      const interest = remainders[i] * monthlyRate;
      const pay = debts[i].payment + (i === focusIdx ? extra : 0);
      const principal = Math.min(pay - interest, remainders[i]);
      totalInterest += interest;
      remainders[i] = Math.max(0, remainders[i] - principal);

      // When paid off, roll its payment into the extra pool
      if (remainders[i] <= 0.005) {
        extra += debts[i].payment;
      }
    }

    allPaid = remainders.every(b => b <= 0.005);
  }

  return {
    months: month,
    totalInterest: Math.round(totalInterest),
    debtFreeMonths: month,
    order,
    unpayable: false,
  };
}

/**
 * Compare three strategies: minimum-only, avalanche, snowball.
 *
 * @param {Array}  liabilities  Array of liability objects
 * @param {number} extra        Extra monthly payment applied to non-minimum strategies
 * @returns {{ minimumOnly, avalanche, snowball }}
 */
export function compareStrategies(liabilities, extra = 0) {
  const minimumOnly = payoffStrategy(liabilities, 0, 'avalanche');
  const avalanche = payoffStrategy(liabilities, extra, 'avalanche');
  const snowball = payoffStrategy(liabilities, extra, 'snowball');

  return {
    minimumOnly: {
      ...minimumOnly,
      interestSaved: 0,
      monthsSaved: 0,
    },
    avalanche: {
      ...avalanche,
      interestSaved: minimumOnly.unpayable ? 0 : Math.max(0, minimumOnly.totalInterest - avalanche.totalInterest),
      monthsSaved: minimumOnly.unpayable ? 0 : Math.max(0, minimumOnly.months - avalanche.months),
    },
    snowball: {
      ...snowball,
      interestSaved: minimumOnly.unpayable ? 0 : Math.max(0, minimumOnly.totalInterest - snowball.totalInterest),
      monthsSaved: minimumOnly.unpayable ? 0 : Math.max(0, minimumOnly.months - snowball.months),
    },
  };
}

/**
 * Compare mortgage payoff with and without extra monthly payment.
 *
 * @param {{ balance, rate, payment }} mortgage  Mortgage liability object
 * @param {number} extraMonthly                  Extra monthly payment
 * @returns {{ interestSaved, monthsSaved, baseMonths, newMonths, baseSchedule, accelSchedule }}
 */
export function mortgageAcceleration(mortgage, extraMonthly) {
  const base = amortize(mortgage.balance, mortgage.rate, mortgage.payment, 0);
  const accel = amortize(mortgage.balance, mortgage.rate, mortgage.payment, extraMonthly);
  return {
    interestSaved: base.unpayable ? 0 : Math.max(0, base.totalInterest - accel.totalInterest),
    monthsSaved: base.unpayable ? 0 : Math.max(0, base.months - accel.months),
    baseMonths: base.months,
    newMonths: accel.months,
    baseSchedule: base.schedule,
    accelSchedule: accel.schedule,
  };
}
