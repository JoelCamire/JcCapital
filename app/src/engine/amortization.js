// ============================================================
// Shared loan amortization math — THE single implementation used by
// the projection, the debt engine, real-estate, rent-vs-buy, the
// timeline and the toolbox, so every screen shows the same payoff
// date and the same interest.
//
// Compounding: Canadian mortgages compound SEMI-ANNUALLY (Interest
// Act), while consumer loans / lines of credit compound monthly.
// effectiveMonthlyRate() converts a quoted annual rate accordingly.
// ============================================================

/** Effective monthly rate for a quoted annual rate. */
export function effectiveMonthlyRate(annualRate, compounding = 'monthly') {
  const r = Number.isFinite(+annualRate) ? Math.max(0, +annualRate) : 0;
  if (r === 0) return 0;
  if (compounding === 'semi-annual') return Math.pow(1 + r / 2, 1 / 6) - 1;
  if (compounding === 'annual') return Math.pow(1 + r, 1 / 12) - 1;
  return r / 12;
}

/** Default compounding convention by liability type (Canada). */
export function compoundingFor(type, country = 'CA') {
  if (country === 'CA' && type === 'mortgage') return 'semi-annual';
  return 'monthly';
}

/** Level monthly payment to amortize `principal` over `years`. */
export function monthlyPayment(principal, annualRate, years, compounding = 'monthly') {
  const P = Math.max(0, Number.isFinite(+principal) ? +principal : 0);
  const n = Math.max(1, Math.round((Number.isFinite(+years) ? +years : 25) * 12));
  if (P <= 0) return 0;
  const i = effectiveMonthlyRate(annualRate, compounding);
  if (i === 0) return P / n;
  return P * i / (1 - Math.pow(1 + i, -n));
}

/** Remaining balance after `months` level payments (closed form). */
export function remainingBalance(principal, annualRate, years, months, compounding = 'monthly') {
  const P = Math.max(0, +principal || 0);
  const n = Math.max(1, Math.round((+years || 25) * 12));
  const k = Math.max(0, Math.min(n, Math.round(+months || 0)));
  if (P <= 0) return 0;
  const i = effectiveMonthlyRate(annualRate, compounding);
  if (i === 0) return Math.max(0, P * (1 - k / n));
  return Math.max(0, P * (Math.pow(1 + i, n) - Math.pow(1 + i, k)) / (Math.pow(1 + i, n) - 1));
}

/**
 * Step a loan forward `months` months with a fixed payment (+ extra).
 * Returns { balance, interest, principal, paid, months } for the period.
 */
export function stepLoan(balance, annualRate, payment, months = 12, { extra = 0, compounding = 'monthly' } = {}) {
  let bal = Math.max(0, +balance || 0);
  const i = effectiveMonthlyRate(annualRate, compounding);
  const pay = Math.max(0, (+payment || 0) + (+extra || 0));
  let interest = 0, principal = 0, paid = 0, m = 0;
  for (; m < months && bal > 0.005; m++) {
    const int = bal * i;
    const due = Math.min(pay, bal + int);
    const pr = Math.max(0, due - int);
    // if the payment does not cover interest the balance grows (negative amortization)
    bal = Math.max(0, bal + int - due);
    interest += int; principal += pr; paid += due;
  }
  return { balance: bal, interest, principal, paid, months: m };
}

/**
 * Full month-by-month amortization until paid off (cap 1200 months).
 * Yearly snapshots + final month. `unpayable` when the payment cannot
 * cover the first month's interest.
 */
export function amortize(balance, annualRate, monthlyPay, extra = 0, compounding = 'monthly') {
  const i = effectiveMonthlyRate(annualRate, compounding);
  const payment = Math.max(0, (+monthlyPay || 0) + (+extra || 0));
  let bal = Math.max(0, +balance || 0);
  if (bal <= 0) return { months: 0, totalInterest: 0, totalPaid: 0, schedule: [], unpayable: false };
  if (payment <= bal * i) return { months: Infinity, totalInterest: Infinity, totalPaid: Infinity, schedule: [], unpayable: true };
  let totalInterest = 0, totalPaid = 0, month = 0;
  const schedule = [];
  const start = bal;
  while (bal > 0.005 && month < 1200) {
    month++;
    const interest = bal * i;
    const principal = Math.min(payment - interest, bal);
    bal = Math.max(0, bal - principal);
    totalInterest += interest; totalPaid += interest + principal;
    if (month % 12 === 0 || bal <= 0.005) schedule.push({ month, interest: Math.round(totalInterest), principal: Math.round(start - bal), balance: Math.round(bal) });
  }
  return { months: month, totalInterest: Math.round(totalInterest), totalPaid: Math.round(totalPaid), schedule, unpayable: false };
}

/** Internal rate of return of a cash-flow series (t=0 first), by bisection on [-0.99, 10]. */
export function irr(cashflows) {
  const cf = (cashflows || []).map(v => (Number.isFinite(+v) ? +v : 0));
  if (cf.length < 2) return 0;
  const npv = (r) => cf.reduce((s, v, t) => s + v / Math.pow(1 + r, t), 0);
  let lo = -0.99, hi = 10;
  let fLo = npv(lo), fHi = npv(hi);
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || fLo * fHi > 0) return 0;
  for (let k = 0; k < 100; k++) {
    const mid = (lo + hi) / 2, fm = npv(mid);
    if (Math.abs(fm) < 1e-7) return mid;
    if (fLo * fm < 0) { hi = mid; fHi = fm; } else { lo = mid; fLo = fm; }
  }
  return (lo + hi) / 2;
}
