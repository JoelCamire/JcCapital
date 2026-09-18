// ============================================================
// Tax engine — unified income-tax calculator across jurisdictions.
// computeTax() returns federal / regional / payroll / total with
// marginal & average rates derived numerically so it stays correct
// for surtaxes, credit tapers, contribution caps and clawbacks.
//
// Canada (2026 rules) models:
//   • progressive federal + provincial brackets
//   • basic personal amount (federal enhanced BPA taper)
//   • Canada employment amount, pension income amount, age amount
//   • CPP/QPP base contributions, EI and QPIP premiums as credits;
//     the CPP/QPP ENHANCEMENT (1 % + CPP2) as a deduction
//   • self-employed (both halves of CPP/QPP, no EI, QPIP self rate)
//   • dividend gross-up + credits (eligible / non-eligible)
//   • Québec abatement, Québec worker deduction and combined senior
//     credit (age / retirement income / living alone) with reduction
//   • Ontario surtax + Ontario Health Premium
//   • OAS recovery tax (clawback) when oasIncome is supplied
// Every parameter comes from src/jurisdictions — nothing is hard-coded.
// ============================================================

/** Progressive bracket tax on an amount. brackets: [{upTo, rate}]. */
export function bracketTax(amount, brackets) {
  if (!(amount > 0)) return 0;
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
  for (const b of brackets) {
    const cap = b.upTo == null ? Infinity : b.upTo;
    if (amount <= cap) return b.rate;
  }
  return brackets[brackets.length - 1].rate;
}

const fin = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

// ---------- Canada: statutory contributions ----------

const ZERO_PAY = { cppBase: 0, cppEnh: 0, cpp2: 0, ei: 0, qpip: 0, total: 0, creditable: 0, deduction: 0, employer: 0 };

/**
 * Employee (or self-employed) CPP/QPP, EI and QPIP for one person.
 * Returns the amounts plus the portion that is a non-refundable CREDIT
 * (base CPP/QPP + EI + QPIP) and the portion DEDUCTED from income
 * (CPP/QPP enhancement; for the self-employed also the employer half of base).
 */
export function caPayroll(jur, { employmentIncome = 0, selfEmployed = false, ownerEiExempt = false, age = 45 } = {}) {
  const rd = jur.regionData || {};
  const p = jur.payroll && jur.payroll[rd.payroll || 'ROC'];
  const inc = Math.max(0, fin(employmentIncome));
  if (!p || inc <= 0) return { ...ZERO_PAY };
  const mult = selfEmployed ? (p.selfEmployedMultiplier || 2) : 1;
  const cppOn = age < 70;                                              // contributions stop at 70
  const pensionable = cppOn ? Math.max(0, Math.min(inc, p.cpp.ympe) - p.cpp.exempt) : 0;
  const baseRate = p.cpp.baseRate ?? (p.cpp.rate - (p.cpp.enhRate ?? 0.01));
  const enhRate = p.cpp.enhRate ?? (p.cpp.rate - baseRate);
  const cppBase = pensionable * baseRate * mult;
  const cppEnh = pensionable * enhRate * mult;
  const cpp2 = cppOn && inc > p.cpp2.from ? (Math.min(inc, p.cpp2.to) - p.cpp2.from) * p.cpp2.rate * mult : 0;
  const ei = (selfEmployed || ownerEiExempt) ? 0 : Math.min(inc, p.ei.max) * p.ei.rate;
  const qpipEmployeeEq = p.qpip ? Math.min(inc, p.qpip.max) * p.qpip.rate : 0;
  const qpip = p.qpip ? Math.min(inc, p.qpip.max) * (selfEmployed ? (p.qpip.selfRate || p.qpip.rate) : p.qpip.rate) : 0;
  const total = cppBase + cppEnh + cpp2 + ei + qpip;
  // credit: employee-equivalent base CPP + EI + employee-equivalent QPIP
  const creditable = cppBase / mult + ei + qpipEmployeeEq;
  // deduction: enhancement (all of it) + for self-employed the employer half of base + extra QPIP
  const deduction = cppEnh + cpp2 + (selfEmployed ? cppBase / mult : 0) + (qpip - qpipEmployeeEq);
  // employer cost (for salary-vs-dividend and incorporation analysis)
  const employer = selfEmployed ? 0 : (cppBase + cppEnh + cpp2) * (jur.corporate?.employerCppMultiplier ?? 1)
    + (ownerEiExempt ? 0 : ei * (p.ei.employerMultiplier || 1.4))
    + (p.qpip ? Math.min(inc, p.qpip.max) * (p.qpip.employerRate || 0) : 0);
  return { cppBase, cppEnh, cpp2, ei, qpip, total, creditable, deduction, employer };
}

function ontarioHealthPremium(taxable, table) {
  for (const b of table) {
    if (b.upTo == null || taxable <= b.upTo) return Math.min(b.cap, b.base + Math.max(0, taxable - b.over) * b.rate);
  }
  return 0;
}

// ---------- Country-specific core (income tax + payroll) ----------

function caCore(jur, inc) {
  const {
    ordinary = 0, capGains = 0, eligibleDiv = 0, nonEligibleDiv = 0,
    age = 45, employment = true, withPayroll = true,
    employmentIncome = null, pensionIncome = 0, oasIncome = 0,
    selfEmployed = false, ownerEiExempt = false, otherDeductions = 0, livingAlone = false,
    familyNetIncome = null,
  } = inc;
  const F = jur.fed;
  const rd = jur.regionData || {};
  const ord = Math.max(0, fin(ordinary));
  // Income subject to statutory contributions: explicit when given, else all ordinary income when employed.
  const empInc = employmentIncome != null ? Math.max(0, fin(employmentIncome)) : (employment ? ord : 0);
  const pay = (withPayroll && empInc > 0) ? caPayroll(jur, { employmentIncome: empInc, selfEmployed, ownerEiExempt, age }) : { ...ZERO_PAY };

  const grossedDiv = Math.max(0, fin(eligibleDiv)) * F.eligibleDivGrossUp;
  const grossedNonElig = Math.max(0, fin(nonEligibleDiv)) * (F.nonEligDivGrossUp || 1.15);
  const inclGains = Math.max(0, fin(capGains)) * F.capGainsInclusion;
  const totalIncome = ord + inclGains + grossedDiv + grossedNonElig + Math.max(0, fin(oasIncome));
  const netIncome = Math.max(0, totalIncome - pay.deduction - Math.max(0, fin(otherDeductions)));
  const taxableIncome = netIncome;

  // ---- Federal ----
  let fed = bracketTax(taxableIncome, F.brackets);
  const cr = F.creditRate ?? F.bpaRate;
  let bpa = F.bpa;
  if (F.bpaTaperFrom && F.bpaMin != null && netIncome > F.bpaTaperFrom) {
    const span = Math.max(1, (F.bpaTaperTo || F.bpaTaperFrom) - F.bpaTaperFrom);
    bpa = Math.max(F.bpaMin, F.bpa - (F.bpa - F.bpaMin) * Math.min(1, (netIncome - F.bpaTaperFrom) / span));
  }
  const fedCredits = { bpa: Math.min(bpa, taxableIncome), employment: 0, contributions: pay.creditable, pension: 0, age: 0 };
  if (empInc > 0 && !selfEmployed && F.employmentAmount) fedCredits.employment = Math.min(F.employmentAmount, empInc);
  if (pensionIncome > 0 && F.pensionAmount) fedCredits.pension = Math.min(F.pensionAmount, fin(pensionIncome));
  if (age >= 65 && F.ageAmount) fedCredits.age = Math.max(0, F.ageAmount.amount - Math.max(0, netIncome - F.ageAmount.threshold) * F.ageAmount.rate);
  const fedCreditTotal = Object.values(fedCredits).reduce((s, v) => s + v, 0);
  fed -= fedCreditTotal * cr;
  fed -= grossedDiv * F.eligibleDivCredit;
  fed -= grossedNonElig * (F.nonEligDivCredit || 0.090301);
  fed = Math.max(0, fed);
  const basicFederal = fed;
  if (rd.federalAbatement) fed *= (1 - rd.federalAbatement);          // Québec abatement

  // ---- Provincial ----
  let provTaxable = taxableIncome;
  let workerDed = 0;
  if (rd.workerDeduction && empInc > 0) { workerDed = Math.min(rd.workerDeduction.max, empInc * rd.workerDeduction.rate); provTaxable = Math.max(0, provTaxable - workerDed); }
  let prov = bracketTax(provTaxable, rd.brackets || F.brackets);
  const pcr = rd.creditRate ?? rd.bpaRate ?? 0;
  const provCredits = { bpa: Math.min(rd.bpa || 0, provTaxable), contributions: 0, senior: 0 };
  if (rd.contributionsCredit) provCredits.contributions = pay.creditable;
  if (rd.ageAmount != null) {                                          // Québec combined senior credit
    let amt = 0;
    if (age >= 65) amt += rd.ageAmount;
    if (pensionIncome > 0) amt += Math.min(rd.retirementAmount || 0, fin(pensionIncome));
    if (livingAlone) amt += rd.livingAloneAmount || 0;
    // The reduction is tested on FAMILY net income (both spouses), not the individual's.
    const testedIncome = familyNetIncome != null && Number.isFinite(+familyNetIncome) ? Math.max(netIncome, +familyNetIncome) : netIncome;
    if (amt > 0 && rd.seniorReduction) amt = Math.max(0, amt - Math.max(0, testedIncome - rd.seniorReduction.threshold) * rd.seniorReduction.rate);
    provCredits.senior = amt;
  }
  prov -= Object.values(provCredits).reduce((s, v) => s + v, 0) * pcr;
  prov -= grossedDiv * (rd.divCredit || 0);
  prov -= grossedNonElig * (rd.divCreditNonElig || 0);
  prov = Math.max(0, prov);
  if (rd.surtax) {                                                     // Ontario-style surtax
    let s = 0; for (const t of rd.surtax) if (prov > t.over) s += (prov - t.over) * t.rate;
    prov += s;
  }
  let healthPremium = 0;
  if (rd.healthPremium) { healthPremium = ontarioHealthPremium(taxableIncome, rd.healthPremium); prov += healthPremium; }

  // ---- OAS recovery tax ----
  let oasClawback = 0;
  const oas = jur.pensions?.oas;
  if (oasIncome > 0 && oas && oas.clawbackStart) {
    oasClawback = Math.min(fin(oasIncome), Math.max(0, netIncome - oas.clawbackStart) * (oas.clawbackRate || 0.15));
  }

  return {
    federal: fed, regional: prov, payroll: pay.total, taxable: taxableIncome, netIncome, oasClawback,
    detail: { basicFederal, fedCredits, provCredits, workerDeduction: workerDed, healthPremium, payroll: pay, bpa },
  };
}

function usCore(jur, inc) {
  const { ordinary = 0, capGains = 0, age = 45, employment = true, withPayroll = true, filingStatus = 'single', employmentIncome = null } = inc;
  const F = jur.fed, st = jur.regionData || {};
  const width = (jur.filingStatusWidth?.[filingStatus]) || 1;
  const widen = (br) => br.map(b => ({ upTo: b.upTo == null ? null : b.upTo * width, rate: b.rate }));
  const stdFed = F.standardDeduction[filingStatus] || F.standardDeduction.single;
  const ord = Math.max(0, fin(ordinary));
  const empInc = employmentIncome != null ? Math.max(0, fin(employmentIncome)) : (employment ? ord : 0);

  const ordTaxable = Math.max(0, ord - stdFed);
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
    if (F.niit && ord > F.niit.threshold * (filingStatus === 'married' ? 1.25 : 1)) fed += capGains * F.niit.rate;
  }
  fed = Math.max(0, fed);

  // State
  let state = 0;
  if (!st.noIncomeTax) {
    const stTaxable = Math.max(0, ord + capGains - (st.standardDeduction || 0));
    state = bracketTax(stTaxable, st.brackets || [{ upTo: null, rate: 0 }]);
    if (st.mentalHealth && ord > st.mentalHealth.over) state += (ord - st.mentalHealth.over) * st.mentalHealth.rate;
  }
  if (st.capGainsTax && capGains > st.capGainsTax.over) state += (capGains - st.capGainsTax.over) * st.capGainsTax.rate;

  // FICA
  let payroll = 0;
  if (withPayroll && empInc > 0) {
    const P = jur.payroll;
    payroll += Math.min(empInc, P.socialSecurity.wageBase) * P.socialSecurity.rate;
    payroll += empInc * P.medicare.rate;
    if (empInc > P.medicare.additional.threshold) payroll += (empInc - P.medicare.additional.threshold) * P.medicare.additional.rate;
  }
  return { federal: fed, regional: state, payroll, taxable: ordTaxable, netIncome: ord + capGains, oasClawback: 0, detail: {} };
}

function ukCore(jur, inc) {
  const { ordinary = 0, capGains = 0, withPayroll = true, employment = true, employmentIncome = null } = inc;
  const rd = jur.regionData || jur.fed;
  const ord = Math.max(0, fin(ordinary));
  const empInc = employmentIncome != null ? Math.max(0, fin(employmentIncome)) : (employment ? ord : 0);
  let pa = rd.personalAllowance;
  if (ord > rd.paTaperFrom) pa = Math.max(0, pa - (ord - rd.paTaperFrom) * rd.paTaperRate);
  const taxable = Math.max(0, ord - pa);
  let fed = bracketTax(taxable, rd.brackets);
  if (capGains > rd.capGains.allowance) {
    const g = capGains - rd.capGains.allowance;
    const rate = ord > (rd.brackets[0].upTo || 50270) ? rd.capGains.higher : rd.capGains.basic;
    fed += g * rate;
  }
  let payroll = 0;
  if (withPayroll && empInc > rd.ni.lower) {
    payroll += (Math.min(empInc, rd.ni.upper) - rd.ni.lower) * rd.ni.rate;
    if (empInc > rd.ni.upper) payroll += (empInc - rd.ni.upper) * rd.ni.upperRate;
  }
  return { federal: fed, regional: 0, payroll, taxable, netIncome: ord + capGains, oasClawback: 0, detail: {} };
}

const CORES = { CA: caCore, US: usCore, UK: ukCore };

/** Total tax incl. payroll and clawback — used for the numerical marginal rate. */
function totalTax(jur, inc) {
  const c = (CORES[jur.country] || caCore)(jur, inc);
  return c.federal + c.regional + c.payroll + (c.oasClawback || 0);
}

/**
 * Main entry.
 * inc = { ordinary, capGains, eligibleDiv, nonEligibleDiv, age, employment, withPayroll,
 *         filingStatus, employmentIncome, pensionIncome, oasIncome, selfEmployed,
 *         ownerEiExempt, otherDeductions, livingAlone }
 *   ordinary        all ordinary income (salary, pensions, interest, RRIF, …) EXCLUDING oasIncome
 *   employmentIncome the part of `ordinary` subject to CPP/EI (defaults to all of it when employment=true)
 *   pensionIncome   eligible pension income (for the pension credit) — a subset of `ordinary`
 *   oasIncome       OAS received (added to income; recovery tax computed)
 */
export function computeTax(jur, inc = {}) {
  const core = (CORES[jur.country] || caCore)(jur, inc);
  const clawback = core.oasClawback || 0;
  const incomeTax = core.federal + core.regional;
  const total = incomeTax + core.payroll + clawback;
  const base = Math.max(0, fin(inc.ordinary)) + Math.max(0, fin(inc.capGains)) + Math.max(0, fin(inc.eligibleDiv)) + Math.max(0, fin(inc.nonEligibleDiv)) + Math.max(0, fin(inc.oasIncome));
  // Numerical marginal rate on the next $1,000 of ordinary income.
  // The extra dollars are only EMPLOYMENT income when the taxpayer already has some:
  // adding $1,000 of salary to a retiree would hand them the employment amount and the
  // Québec worker deduction, understating the true marginal rate by several points.
  const hasEmployment = fin(inc.employmentIncome) > 0;
  const bump = totalTax(jur, { ...inc, ordinary: Math.max(0, fin(inc.ordinary)) + 1000, employmentIncome: hasEmployment ? fin(inc.employmentIncome) + 1000 : inc.employmentIncome });
  const marginalRate = Math.max(0, (bump - total) / 1000);
  return {
    federal: core.federal,
    regional: core.regional,
    payroll: core.payroll,
    clawback,
    incomeTax,
    total,
    taxable: core.taxable,
    netIncome: core.netIncome,
    afterTax: base - total,
    averageRate: base > 0 ? total / base : 0,
    marginalRate,
    detail: core.detail || {},
  };
}

/** Marginal rate on ordinary income at a given income (no payroll unless requested). */
export function marginalRateAt(jur, ordinary, opts = {}) {
  return computeTax(jur, { ordinary, withPayroll: false, employment: false, ...opts }).marginalRate;
}

/** Marginal rate for a specific income KIND stacked on top of `otherOrdinary`. */
export function marginalRateFor(jur, otherOrdinary = 0, kind = 'ordinary', opts = {}) {
  const base = computeTax(jur, { ordinary: otherOrdinary, withPayroll: false, employment: false, ...opts });
  const probe = 1000;
  const key = kind === 'capgains' ? 'capGains' : kind === 'eligible' ? 'eligibleDiv' : kind === 'noneligible' ? 'nonEligibleDiv' : 'ordinary';
  const t1 = computeTax(jur, { ordinary: otherOrdinary, withPayroll: false, employment: false, ...opts, [key]: (key === 'ordinary' ? otherOrdinary : 0) + probe });
  return Math.max(0, (t1.total - base.total) / probe);
}

/** Exact tax on `amount` of additional ordinary income stacked on `otherOrdinary`. */
export function incrementalTax(jur, amount, otherOrdinary = 0, opts = {}) {
  const t0 = computeTax(jur, { ordinary: otherOrdinary, withPayroll: false, employment: false, ...opts });
  const t1 = computeTax(jur, { ordinary: otherOrdinary + amount, withPayroll: false, employment: false, ...opts });
  return Math.max(0, t1.total - t0.total);
}

/** After-tax value of a marginal withdrawal of `amount` at given other income. */
export function afterTaxWithdrawal(jur, amount, otherOrdinary = 0, opts = {}) {
  const tax = incrementalTax(jur, amount, otherOrdinary, opts);
  return { net: amount - tax, tax, effectiveRate: amount > 0 ? tax / amount : 0 };
}

/**
 * Solve for the GROSS taxable withdrawal that leaves exactly `netNeeded`
 * after tax, given other ordinary income. Monotone → bisection.
 * Returns { gross, tax, net } with gross ≤ maxGross.
 */
export function grossUpForNet(jur, netNeeded, otherOrdinary = 0, maxGross = Infinity, opts = {}) {
  netNeeded = Number.isFinite(+netNeeded) ? +netNeeded : 0;
  otherOrdinary = Number.isFinite(+otherOrdinary) ? Math.max(0, +otherOrdinary) : 0;
  maxGross = Number.isFinite(+maxGross) ? Math.max(0, +maxGross) : Infinity;
  if (!(netNeeded > 0) || maxGross <= 0) return { gross: 0, tax: 0, net: 0 };
  const t0 = computeTax(jur, { ordinary: otherOrdinary, withPayroll: false, employment: false, ...opts }).total;
  const netOf = (g) => g - (computeTax(jur, { ordinary: otherOrdinary + g, withPayroll: false, employment: false, ...opts }).total - t0);
  let hi = Math.min(maxGross, netNeeded * 2.5 + 1000), lo = 0;
  if (netOf(hi) < netNeeded) { // even the cap is not enough (or cap is maxGross)
    if (hi >= maxGross) { const g = maxGross; const n = netOf(g); return { gross: g, tax: g - n, net: n }; }
    hi = Math.min(maxGross, netNeeded * 4 + 1000);
    if (netOf(hi) < netNeeded) { const g = hi; const n = netOf(g); return { gross: g, tax: g - n, net: n }; }
  }
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (netOf(mid) < netNeeded) lo = mid; else hi = mid;
    if (hi - lo < 0.01) break;
  }
  const g = hi, n = netOf(g);
  return { gross: g, tax: g - n, net: n };
}

/**
 * RRIF/RMD minimum withdrawal factor for the year in which the owner is `age`.
 *   • accounts already in RRIF form use the prescribed factor at any age (1/(90−age) below 71)
 *   • RRSPs convert at 71 and pay their first minimum the year the owner turns 72
 */
export function rrifMinFactor(jur, age, accountType = 'rrsp') {
  const table = jur.rrifMin || {};
  const a = Math.floor(fin(age));
  if (jur.country !== 'CA') return table[a] || 0;
  const isRrif = accountType === 'rrif';
  if (!isRrif && a < 72) return 0;
  if (a >= 95) return table[95] || 0.20;
  if (table[a] != null) return table[a];
  if (isRrif && a < 71 && a < 90) return 1 / (90 - a);
  return 0;
}
