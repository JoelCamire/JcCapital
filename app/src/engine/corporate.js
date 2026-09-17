// ============================================================
// Corporate / business-owner engine
// CCPC (Canada) salary-vs-dividend integration with the employer's
// CPP/QPP cost, owner EI exemption, SBD ladder (eligible vs
// non-eligible dividends), passive-income grind, tax deferral,
// LCGE and simplified US (S-corp/QBI) and UK (salary/dividend) models.
// Every limit comes from the jurisdiction (RRSP limit, LCGE, rates).
// ============================================================
import { computeTax, caPayroll } from './tax.js';
import { accountMeta } from '../jurisdictions/index.js';
import { t } from '../i18n.js';

const fin = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

// ---------- Canadian corporate tax ----------

/** Corporate tax on active + passive income for a CCPC. */
export function corporateTaxCA(jur, activeIncome, passiveIncome = 0) {
  activeIncome = Math.max(0, fin(activeIncome)); passiveIncome = Math.max(0, fin(passiveIncome));
  const C = jur.corporate, rd = jur.regionData || {};
  const sbRate = C.fedSB + (rd.provSB ?? 0.032);
  const genRate = C.fedGeneral + (rd.provGen ?? 0.115);
  // SBD grind from passive (AAII) income: $5 of limit lost per $1 above the threshold
  const grind = Math.max(0, Math.min(C.sbdLimit, (passiveIncome - C.passiveGrindStart) * 5));
  const sbdLimit = Math.max(0, C.sbdLimit - grind);
  const atSB = Math.max(0, Math.min(activeIncome, sbdLimit));
  const atGen = Math.max(0, activeIncome - atSB);
  const sbTax = atSB * sbRate;
  const genTax = atGen * genRate;
  const activeTax = sbTax + genTax;
  const passiveTax = passiveIncome * C.passiveRate;
  const refundable = passiveIncome * C.refundableRate;
  return {
    sbRate, genRate, sbdLimit, grind, atSB, atGen, sbTax, genTax, activeTax,
    afterTaxActive: activeIncome - activeTax,
    passiveTax, refundable, netPassive: passiveIncome - passiveTax,
    effectiveActiveRate: activeIncome > 0 ? activeTax / activeIncome : 0,
    // dividends the after-tax profit can fund, by type (SBD income → non-eligible; general-rate income → eligible/GRIP)
    nonEligibleCapacity: atSB * (1 - sbRate), eligibleCapacity: atGen * (1 - genRate),
  };
}

// ---------- Salary vs dividend (CCPC integration) ----------

/**
 * opts = { otherActiveIncome (corporate profit already earned this year, positions
 *          `profit` on the SBD ladder), passiveIncome, age, ownerEiExempt (default true) }
 */
function caSalaryVsDividend(jur, profit, otherIncome, opts = {}) {
  profit = Math.max(0, fin(profit)); otherIncome = Math.max(0, fin(otherIncome));
  const age = fin(opts.age, 45), ownerEiExempt = opts.ownerEiExempt !== false;
  const base = computeTax(jur, { ordinary: otherIncome, withPayroll: false, employment: false, age });

  // SALARY: the corporation spends `profit` on salary + employer CPP/QPP (+EI unless owner-exempt)
  let salary = profit;
  for (let k = 0; k < 6; k++) { const emp = caPayroll(jur, { employmentIncome: salary, ownerEiExempt, age }).employer; salary = Math.max(0, profit - emp); }
  const employerCost = profit - salary;
  const salFull = computeTax(jur, { ordinary: otherIncome + salary, employmentIncome: salary, ownerEiExempt, age, withPayroll: true, employment: true });
  const salPersonal = salFull.total - base.total;                 // income tax + employee CPP/QPP
  const salaryNet = salary - salPersonal;
  const rrspMeta = accountMeta(jur.country, 'rrsp');
  const rrspRoom = Math.min(salary * (rrspMeta.limitPctIncome || 0.18), rrspMeta.limit || 0);
  const cppEmployee = salFull.payroll;

  // DIVIDEND: corporate tax on the profit (positioned after any other active income), then dividends by type
  const c0 = corporateTaxCA(jur, fin(opts.otherActiveIncome), fin(opts.passiveIncome));
  const c1 = corporateTaxCA(jur, fin(opts.otherActiveIncome) + profit, fin(opts.passiveIncome));
  const corpTax = c1.activeTax - c0.activeTax;
  const nonEligibleDiv = c1.nonEligibleCapacity - c0.nonEligibleCapacity;
  const eligibleDiv = c1.eligibleCapacity - c0.eligibleCapacity;
  const dividend = nonEligibleDiv + eligibleDiv;
  const divFull = computeTax(jur, { ordinary: otherIncome, nonEligibleDiv, eligibleDiv, withPayroll: false, employment: false, age });
  const divPersonal = divFull.total - base.total;
  const dividendNet = dividend - divPersonal;

  const salaryTotalTax = salPersonal + employerCost;             // employer CPP/EI is a real cost of the salary route
  const dividendTotalTax = corpTax + divPersonal;
  const recommended = salaryNet >= dividendNet ? 'salary' : 'dividend';
  return {
    applicable: true, profit, otherIncome,
    salary: { gross: salary, employerCost, cppEmployee, corpTax: 0, personalTax: salPersonal, totalTax: salaryTotalTax, net: salaryNet, rrspRoom },
    dividend: { gross: dividend, nonEligibleDiv, eligibleDiv, corpTax, personalTax: divPersonal, totalTax: dividendTotalTax, net: dividendNet, rrspRoom: 0 },
    recommended,
    advantage: Math.abs(salaryNet - dividendNet),
    integrationCost: dividendTotalTax - salaryTotalTax,
    note: t(
      'Le salaire est déductible et crée des droits REER + des cotisations RRQ (pension future) mais coûte la part de l’employeur; le dividende évite les charges sociales mais ne génère aucun droit REER ni RRQ. L’intégration rend les deux proches; le choix dépend des droits REER souhaités, du RRQ et du revenu de retraite.',
      'Salary is deductible and creates RRSP room + CPP/QPP (future pension) but costs the employer share; dividends avoid payroll but build no RRSP room or CPP. Integration makes both close; the choice depends on desired RRSP room, CPP and retirement income.'),
  };
}

function usSalaryVsDividend(jur, profit, otherIncome) {
  const C = jur.corporate;
  const seTax = Math.min(profit, C.seWageBase) * C.seTaxRate * 0.9235;
  const qbi = profit * (1 - C.qbiDeduction);
  const seIncomeTax = computeTax(jur, { ordinary: otherIncome + qbi, withPayroll: false, employment: false }).total - computeTax(jur, { ordinary: otherIncome, withPayroll: false, employment: false }).total;
  const seTotal = seTax + seIncomeTax;
  const seNet = profit - seTotal;
  const salary = profit * 0.45;
  const dist = profit - salary;
  const payroll = Math.min(salary, C.seWageBase) * C.seTaxRate;
  const sIncomeTax = computeTax(jur, { ordinary: otherIncome + salary + dist * (1 - C.qbiDeduction), withPayroll: false, employment: false }).total - computeTax(jur, { ordinary: otherIncome, withPayroll: false, employment: false }).total;
  const sTotal = payroll + sIncomeTax;
  const sNet = profit - sTotal;
  const recommended = sNet >= seNet ? 'scorp' : 'sole';
  return {
    applicable: true, profit, otherIncome, us: true,
    salary: { label: t('Société S', 'S-Corp'), gross: profit, corpTax: payroll, personalTax: sIncomeTax, totalTax: sTotal, net: sNet, rrspRoom: 0 },
    dividend: { label: t('Entreprise individuelle', 'Sole proprietor'), gross: profit, corpTax: seTax, personalTax: seIncomeTax, totalTax: seTotal, net: seNet, rrspRoom: 0 },
    recommended: recommended === 'scorp' ? 'salary' : 'dividend',
    advantage: Math.abs(sNet - seNet),
    integrationCost: seTotal - sTotal,
    note: t('La société S réduit l’impôt sur le travail indépendant en versant un salaire raisonnable plus des distributions, tout en conservant la déduction QBI (199A).',
      'An S-Corp reduces self-employment tax by paying a reasonable salary plus distributions, while keeping the QBI (199A) deduction.'),
  };
}

function ukSalaryVsDividend(jur, profit, otherIncome) {
  const C = jur.corporate;
  let corpRate = C.smallRate;
  if (profit > C.upperLimit) corpRate = C.mainRate;
  else if (profit > C.lowerLimit) corpRate = C.smallRate + (C.mainRate - C.smallRate) * (profit - C.lowerLimit) / (C.upperLimit - C.lowerLimit);
  const employerNI = profit * C.employerNI / (1 + C.employerNI);
  const salary = profit - employerNI;
  const salPersonal = computeTax(jur, { ordinary: otherIncome + salary }).total - computeTax(jur, { ordinary: otherIncome }).total;
  const salaryNet = salary - salPersonal;
  const corpTax = profit * corpRate;
  const dividend = profit - corpTax;
  const rd = jur.regionData || jur.fed;
  const pa = rd.personalAllowance, basicTop = rd.brackets[0].upTo - pa, higherTop = rd.brackets[1].upTo - pa;
  const remainingPA = Math.max(0, pa - otherIncome);
  const taxableDiv = Math.max(0, dividend - C.divAllowance - remainingPA);
  const startPos = Math.max(0, otherIncome - pa);
  const bands = [[basicTop, C.divBasic], [higherTop, C.divHigher], [Infinity, C.divAdditional]];
  let divPersonal = 0, pos = startPos, rem = taxableDiv;
  for (const [top, rate] of bands) {
    if (rem <= 0) break;
    const room = Math.max(0, top - pos);
    const amt = Math.min(rem, room);
    divPersonal += amt * rate; pos += amt; rem -= amt;
  }
  const dividendNet = dividend - divPersonal;
  const recommended = salaryNet >= dividendNet ? 'salary' : 'dividend';
  return {
    applicable: true, profit, otherIncome,
    salary: { gross: salary, corpTax: employerNI, personalTax: salPersonal, totalTax: employerNI + salPersonal, net: salaryNet, rrspRoom: 0 },
    dividend: { gross: dividend, corpTax, personalTax: divPersonal, totalTax: corpTax + divPersonal, net: dividendNet, rrspRoom: 0 },
    recommended, advantage: Math.abs(salaryNet - dividendNet),
    integrationCost: (corpTax + divPersonal) - (employerNI + salPersonal),
    note: t('Au Royaume-Uni, une combinaison d’un petit salaire (jusqu’au seuil de NI) et de dividendes est généralement la plus efficace.',
      'In the UK, a mix of a small salary (up to the NI threshold) plus dividends is generally most efficient.'),
  };
}

export function salaryVsDividend(jur, profit, otherIncome = 0, opts = {}) {
  if (!jur.corporate) return { applicable: false };
  if (jur.country === 'CA') return caSalaryVsDividend(jur, profit, otherIncome, opts);
  if (jur.country === 'US') return usSalaryVsDividend(jur, profit, otherIncome);
  return ukSalaryVsDividend(jur, profit, otherIncome);
}

// ---------- Tax deferral: retain & invest in corp vs distribute ----------

export function retainVsDistribute(jur, preTax, years, grossReturn, personalMarginal = 0.50, opts = {}) {
  const corpRate = jur.country === 'CA'
    ? jur.corporate.fedSB + (jur.regionData?.provSB ?? 0.032)
    : (jur.country === 'US' ? 0.21 : jur.corporate.smallRate);
  // Non-refundable part of the passive tax is the true accumulation drag;
  // the refundable portion (RDTOH) is recovered when dividends are paid out.
  const passiveDrag = jur.country === 'CA' ? jur.corporate.passiveRate - jur.corporate.refundableRate : 0.30;
  const divEff = fin(opts.dividendRate, personalMarginal * 0.85);    // effective tax on extracting corporate growth (non-eligible dividend)
  const persInvDrag = fin(opts.personalInvestmentDrag, personalMarginal * 0.40); // personal investment-income drag (mix of gains/dividends)
  const corpInitial = preTax * (1 - corpRate);
  const persInitial = preTax * (1 - personalMarginal);
  const corpVal = corpInitial * Math.pow(1 + grossReturn * (1 - passiveDrag), years);
  const corpFinalNet = persInitial + (corpVal - corpInitial) * (1 - divEff);
  const persVal = persInitial * Math.pow(1 + grossReturn * (1 - persInvDrag), years);
  return {
    corpRate, passiveDrag, years, divEff, persInvDrag,
    corpInitial, persInitial,
    deferralToday: corpInitial - persInitial,
    corpFinal: corpFinalNet, persFinal: persVal,
    advantage: corpFinalNet - persVal,
  };
}

// ---------- Business valuation ----------

export function businessValuation({ ebitda = 0, ebitdaMultiple = 5, sde = 0, sdeMultiple = 3, revenue = 0, revenueMultiple = 1 } = {}) {
  const byEbitda = fin(ebitda) * fin(ebitdaMultiple, 5);
  const bySde = fin(sde) * fin(sdeMultiple, 3);
  const byRevenue = fin(revenue) * fin(revenueMultiple, 1);
  const methods = [byEbitda, bySde, byRevenue].filter(v => v > 0);
  const estimate = methods.length ? methods.reduce((s, v) => s + v, 0) / methods.length : 0;
  return { byEbitda, bySde, byRevenue, estimate };
}

// ---------- Lifetime capital gains exemption on sale ----------

/** otherIncome: the seller's other taxable income in the year of sale (exact stacking). */
export function lcgeSale(jur, saleProceeds, acb = 0, owners = 1, otherIncome = null, opts = {}) {
  const gain = Math.max(0, fin(saleProceeds) - fin(acb));
  const lcge = jur.corporate?.lcge || 0;
  const n = Math.max(1, Math.round(fin(owners, 1)));
  const exemptionTotal = lcge * n;
  const exempt = Math.min(gain, exemptionTotal);
  const taxableGain = gain - exempt;
  const other = otherIncome != null ? Math.max(0, fin(otherIncome)) : 150000;
  const age = fin(opts.age, 50);
  // each owner reports his share; tax computed per owner then summed
  const perOwner = (g) => { const t0 = computeTax(jur, { ordinary: other, withPayroll: false, employment: false, age }); const t1 = computeTax(jur, { ordinary: other, capGains: g / n, withPayroll: false, employment: false, age }); return Math.max(0, t1.total - t0.total) * n; };
  const taxWithLcge = perOwner(taxableGain);
  const taxNoLcge = perOwner(gain);
  return {
    gain, lcge, owners: n, exemptionTotal, exempt, taxableGain, otherIncome: other,
    taxWithLcge, taxNoLcge, taxSaved: taxNoLcge - taxWithLcge,
    netProceeds: fin(saleProceeds) - taxWithLcge,
  };
}
