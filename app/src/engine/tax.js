// ============================================================
// Tax engine — unified income-tax calculator across jurisdictions.
// computeTax() returns federal / regional / payroll / total with
// marginal & average rates derived numerically so it stays correct
// for surtaxes, allowance tapers and contribution caps.
// ============================================================

/** Progressive bracket tax on an amount. brackets: [{upTo, rate}]. */
export function bracketTax(amount, brackets) {
  if (amount <= 0) return 0;
  let tax = 0, last = 0;
  for (const b of brackets) {
    const cap = b.upTo == null ? Infinity : b.upTo;
    if (amount > last) tax += (Math.min(amount, cap) - last) * b.rate;
    last = cap;
    if (amount <= cap) break;
  }
  return tax;
}

/** Top marginal rate of a bracket schedule at a given income. */
export function bracketMarginal(amount, brackets) {
  let last = 0;
  for (const b of brackets) {
    const cap = b.upTo == null ? Infinity : b.upTo;
    if (amount <= cap) return b.rate;
    last = cap;
  }
  return brackets[brackets.length - 1].rate;
}

// ---------- Country-specific core (income tax + payroll) ----------

function caCore(jur, inc) {
  const { ordinary = 0, capGains = 0, eligibleDiv = 0, nonEligibleDiv = 0, age = 45, employment = true, withPayroll = true } = inc;
  const F = jur.fed;
  const rd = jur.regionData || {};
  const grossedDiv = eligibleDiv * F.eligibleDivGrossUp;
  const grossedNonElig = nonEligibleDiv * (F.nonEligDivGrossUp || 1.15);
  const inclGains = capGains * F.capGainsInclusion;
  const taxableIncome = Math.max(0, ordinary + inclGains + grossedDiv + grossedNonElig);

  // Federal
  let fed = bracketTax(taxableIncome, F.brackets);
  fed -= Math.min(F.bpa, taxableIncome) * F.bpaRate;                 // basic personal credit
  fed -= grossedDiv * F.eligibleDivCredit;                            // eligible dividend tax credit
  fed -= grossedNonElig * (F.nonEligDivCredit || 0.090301);          // non-eligible dividend tax credit
  fed = Math.max(0, fed);
  if (rd.federalAbatement) fed *= (1 - rd.federalAbatement);         // Quebec abatement

  // Provincial
  let prov = bracketTax(taxableIncome, rd.brackets || F.brackets);
  prov -= Math.min(rd.bpa || 0, taxableIncome) * (rd.bpaRate || 0);
  prov -= grossedDiv * (rd.divCredit || 0);
  prov -= grossedNonElig * (rd.divCreditNonElig || 0);
  prov = Math.max(0, prov);
  if (rd.surtax) {                                                    // Ontario-style surtax
    let s = 0; for (const t of rd.surtax) if (prov > t.over) s += (prov - t.over) * t.rate;
    prov += s;
  }

  // Payroll (employee): CPP/QPP + CPP2 + EI (+ QPIP)
  let payroll = 0;
  if (withPayroll && employment && ordinary > 0) {
    const p = jur.payroll[rd.payroll || 'ROC'];
    payroll += Math.max(0, Math.min(ordinary, p.cpp.ympe) - p.cpp.exempt) * p.cpp.rate;
    if (ordinary > p.cpp2.from) payroll += (Math.min(ordinary, p.cpp2.to) - p.cpp2.from) * p.cpp2.rate;
    payroll += Math.min(ordinary, p.ei.max) * p.ei.rate;
    if (p.qpip) payroll += Math.min(ordinary, p.qpip.max) * p.qpip.rate;
  }
  return { federal: fed, regional: prov, payroll, taxable: taxableIncome };
}

function usCore(jur, inc) {
  const { ordinary = 0, capGains = 0, age = 45, employment = true, withPayroll = true, filingStatus = 'single' } = inc;
  const F = jur.fed, st = jur.regionData || {};
  const width = (jur.filingStatusWidth?.[filingStatus]) || 1;
  const widen = (br) => br.map(b => ({ upTo: b.upTo == null ? null : b.upTo * width, rate: b.rate }));
  const stdFed = F.standardDeduction[filingStatus] || F.standardDeduction.single;

  const ordTaxable = Math.max(0, ordinary - stdFed);
  let fed = bracketTax(ordTaxable, widen(F.brackets));
  // Long-term cap gains stacked on top of ordinary taxable income
  if (capGains > 0) {
    const ltcg = widen(F.ltcg);
    let lo = ordTaxable, hi = ordTaxable + capGains, g = 0, last = 0;
    for (const b of ltcg) {
      const cap = b.upTo == null ? Infinity : b.upTo;
      const seg = Math.max(0, Math.min(hi, cap) - Math.max(lo, last));
      if (seg > 0) g += seg * b.rate;
      last = cap; if (hi <= cap) break;
    }
    fed += g;
    if (F.niit && ordinary > F.niit.threshold) fed += capGains * F.niit.rate;
  }
  fed = Math.max(0, fed);

  // State
  let state = 0;
  if (!st.noIncomeTax) {
    const stTaxable = Math.max(0, ordinary + capGains - (st.standardDeduction || 0));
    state = bracketTax(stTaxable, st.brackets || [{ upTo: null, rate: 0 }]);
    if (st.mentalHealth && ordinary > st.mentalHealth.over) state += (ordinary - st.mentalHealth.over) * st.mentalHealth.rate;
  }
  if (st.capGainsTax && capGains > st.capGainsTax.over) state += (capGains - st.capGainsTax.over) * st.capGainsTax.rate;

  // FICA
  let payroll = 0;
  if (withPayroll && employment && ordinary > 0) {
    const P = jur.payroll;
    payroll += Math.min(ordinary, P.socialSecurity.wageBase) * P.socialSecurity.rate;
    payroll += ordinary * P.medicare.rate;
    if (ordinary > P.medicare.additional.threshold) payroll += (ordinary - P.medicare.additional.threshold) * P.medicare.additional.rate;
  }
  return { federal: fed, regional: state, payroll, taxable: ordTaxable };
}

function ukCore(jur, inc) {
  const { ordinary = 0, capGains = 0, withPayroll = true } = inc;
  const rd = jur.regionData || jur.fed;
  let pa = rd.personalAllowance;
  if (ordinary > rd.paTaperFrom) pa = Math.max(0, pa - (ordinary - rd.paTaperFrom) * rd.paTaperRate);
  const taxable = Math.max(0, ordinary - pa);
  let fed = bracketTax(taxable, rd.brackets);
  // Capital gains (simplified: above allowance at higher rate band)
  if (capGains > rd.capGains.allowance) {
    const g = capGains - rd.capGains.allowance;
    const rate = ordinary > 50270 ? rd.capGains.higher : rd.capGains.basic;
    fed += g * rate;
  }
  // National Insurance
  let payroll = 0;
  if (withPayroll && ordinary > rd.ni.lower) {
    payroll += (Math.min(ordinary, rd.ni.upper) - rd.ni.lower) * rd.ni.rate;
    if (ordinary > rd.ni.upper) payroll += (ordinary - rd.ni.upper) * rd.ni.upperRate;
  }
  return { federal: fed, regional: 0, payroll, taxable };
}

const CORES = { CA: caCore, US: usCore, UK: ukCore };

/** Total income tax (excl. payroll) — used for numerical marginal rate. */
function totalIncomeTax(jur, inc) {
  const c = (CORES[jur.country] || caCore)(jur, inc);
  return c.federal + c.regional + c.payroll;
}

/**
 * Main entry. inc = { ordinary, capGains, eligibleDiv, age, employment,
 *                     filingStatus, withPayroll }.
 */
export function computeTax(jur, inc = {}) {
  const core = (CORES[jur.country] || caCore)(jur, inc);
  const total = core.federal + core.regional + core.payroll;
  const base = (inc.ordinary || 0) + (inc.capGains || 0) + (inc.eligibleDiv || 0) + (inc.nonEligibleDiv || 0);
  // Numerical marginal rate on the next $1,000 of ordinary income
  const bump = totalIncomeTax(jur, { ...inc, ordinary: (inc.ordinary || 0) + 1000 });
  const marginalRate = Math.max(0, (bump - total) / 1000);
  return {
    federal: core.federal,
    regional: core.regional,
    payroll: core.payroll,
    incomeTax: core.federal + core.regional,
    total,
    taxable: core.taxable,
    afterTax: base - total,
    averageRate: base > 0 ? total / base : 0,
    marginalRate,
  };
}

/** After-tax value of a marginal withdrawal of `amount` at given other income. */
export function afterTaxWithdrawal(jur, amount, otherOrdinary = 0, opts = {}) {
  const t0 = computeTax(jur, { ordinary: otherOrdinary, withPayroll: false, ...opts });
  const t1 = computeTax(jur, { ordinary: otherOrdinary + amount, withPayroll: false, ...opts });
  const tax = t1.total - t0.total;
  return { net: amount - tax, tax, effectiveRate: amount > 0 ? tax / amount : 0 };
}
