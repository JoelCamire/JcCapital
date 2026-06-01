// ============================================================
// Corporate / business-owner engine
// CCPC (Canada) salary-vs-dividend integration, small business
// deduction, passive-income grind, tax deferral, LCGE and
// simplified US (S-corp/QBI) and UK (salary/dividend) models.
// ============================================================
import { computeTax } from './tax.js';
import { t } from '../i18n.js';

// ---------- Canadian corporate tax ----------

/** Corporate tax on active + passive income for a CCPC. */
export function corporateTaxCA(jur, activeIncome, passiveIncome = 0) {
  const C = jur.corporate, rd = jur.regionData || {};
  const sbRate = C.fedSB + (rd.provSB ?? 0.032);
  const genRate = C.fedGeneral + (rd.provGen ?? 0.115);
  // SBD grind from passive (AAII) income
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
  };
}

// ---------- Salary vs dividend (CCPC integration) ----------

function caSalaryVsDividend(jur, profit, otherIncome) {
  const base = computeTax(jur, { ordinary: otherIncome, withPayroll: false });
  // SALARY: fully deductible -> corp tax 0 on this profit
  const salTaxFull = computeTax(jur, { ordinary: otherIncome + profit });
  const salPersonal = salTaxFull.total - computeTax(jur, { ordinary: otherIncome }).total;
  const salaryNet = profit - salPersonal;
  const rrspRoom = Math.min(profit * 0.18, 32490);

  // DIVIDEND: corp pays SB-rate tax, distributes non-eligible dividend
  const corp = corporateTaxCA(jur, profit, 0);
  const dividend = corp.afterTaxActive;
  const divTaxFull = computeTax(jur, { ordinary: otherIncome, nonEligibleDiv: dividend, withPayroll: false });
  const divPersonal = divTaxFull.total - base.total;
  const dividendNet = dividend - divPersonal;

  const salaryTotalTax = salPersonal;                 // corp tax 0
  const dividendTotalTax = corp.activeTax + divPersonal;

  const recommended = salaryNet >= dividendNet ? 'salary' : 'dividend';
  return {
    applicable: true, profit, otherIncome,
    salary: { corpTax: 0, personalTax: salPersonal, totalTax: salaryTotalTax, net: salaryNet, rrspRoom },
    dividend: { corpTax: corp.activeTax, personalTax: divPersonal, totalTax: dividendTotalTax, net: dividendNet, rrspRoom: 0 },
    recommended,
    advantage: Math.abs(salaryNet - dividendNet),
    integrationCost: dividendTotalTax - salaryTotalTax,
    note: t(
      'Le salaire est déductible (crée des droits REER + RRQ), le dividende évite les charges sociales mais ne génère pas de droits REER. L’intégration rend les deux proches; le choix dépend des droits REER souhaités, du RRQ et du revenu de retraite.',
      'Salary is deductible (creates RRSP room + CPP); dividends avoid payroll but create no RRSP room. Integration makes both close; the choice depends on desired RRSP room, CPP and retirement income.'),
  };
}

function usSalaryVsDividend(jur, profit, otherIncome) {
  const C = jur.corporate;
  // Sole prop / SE: full profit subject to SE tax + income tax, with QBI 20% deduction
  const seTax = Math.min(profit, C.seWageBase) * C.seTaxRate * 0.9235;
  const qbi = profit * (1 - C.qbiDeduction);
  const seIncomeTax = computeTax(jur, { ordinary: otherIncome + qbi }).total - computeTax(jur, { ordinary: otherIncome }).total;
  const seTotal = seTax + seIncomeTax;
  const seNet = profit - seTotal;

  // S-corp: reasonable salary (~45% of profit) payroll-taxed, remainder distribution (no payroll), QBI on distribution
  const salary = profit * 0.45;
  const dist = profit - salary;
  const payroll = Math.min(salary, C.seWageBase) * C.seTaxRate;
  const sIncomeTax = computeTax(jur, { ordinary: otherIncome + salary + dist * (1 - C.qbiDeduction) }).total - computeTax(jur, { ordinary: otherIncome }).total;
  const sTotal = payroll + sIncomeTax;
  const sNet = profit - sTotal;

  const recommended = sNet >= seNet ? 'scorp' : 'sole';
  return {
    applicable: true, profit, otherIncome, us: true,
    salary: { label: t('Société S', 'S-Corp'), corpTax: payroll, personalTax: sIncomeTax, totalTax: sTotal, net: sNet, rrspRoom: 0 },
    dividend: { label: t('Entreprise individuelle', 'Sole proprietor'), corpTax: seTax, personalTax: seIncomeTax, totalTax: seTotal, net: seNet, rrspRoom: 0 },
    recommended: recommended === 'scorp' ? 'salary' : 'dividend',
    advantage: Math.abs(sNet - seNet),
    integrationCost: seTotal - sTotal,
    note: t('La société S réduit l’impôt sur le travail indépendant en versant un salaire raisonnable plus des distributions, tout en conservant la déduction QBI (199A).',
      'An S-Corp reduces self-employment tax by paying a reasonable salary plus distributions, while keeping the QBI (199A) deduction.'),
  };
}

function ukSalaryVsDividend(jur, profit, otherIncome) {
  const C = jur.corporate;
  // corp tax rate (marginal relief between lower/upper)
  let corpRate = C.smallRate;
  if (profit > C.upperLimit) corpRate = C.mainRate;
  else if (profit > C.lowerLimit) corpRate = C.smallRate + (C.mainRate - C.smallRate) * (profit - C.lowerLimit) / (C.upperLimit - C.lowerLimit);

  // SALARY: deductible, but employer NI 13.8% + personal tax/NI
  const employerNI = profit * C.employerNI / (1 + C.employerNI);
  const salary = profit - employerNI;
  const salPersonal = computeTax(jur, { ordinary: otherIncome + salary }).total - computeTax(jur, { ordinary: otherIncome }).total;
  const salaryNet = salary - salPersonal;

  // DIVIDEND: corp tax then dividend taxed across bands (8.75 / 33.75 / 39.35 %)
  const corpTax = profit * corpRate;
  const dividend = profit - corpTax;
  const pa = 12570, basicTop = 37700, higherTop = 125140 - pa;
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
    salary: { corpTax: employerNI, personalTax: salPersonal, totalTax: employerNI + salPersonal, net: salaryNet, rrspRoom: 0 },
    dividend: { corpTax, personalTax: divPersonal, totalTax: corpTax + divPersonal, net: dividendNet, rrspRoom: 0 },
    recommended, advantage: Math.abs(salaryNet - dividendNet),
    integrationCost: (corpTax + divPersonal) - (employerNI + salPersonal),
    note: t('Au Royaume-Uni, une combinaison d’un petit salaire (jusqu’au seuil de NI) et de dividendes est généralement la plus efficace.',
      'In the UK, a mix of a small salary (up to the NI threshold) plus dividends is generally most efficient.'),
  };
}

export function salaryVsDividend(jur, profit, otherIncome = 0) {
  if (!jur.corporate) return { applicable: false };
  if (jur.country === 'CA') return caSalaryVsDividend(jur, profit, otherIncome);
  if (jur.country === 'US') return usSalaryVsDividend(jur, profit, otherIncome);
  return ukSalaryVsDividend(jur, profit, otherIncome);
}

// ---------- Tax deferral: retain & invest in corp vs distribute ----------

export function retainVsDistribute(jur, preTax, years, grossReturn, personalMarginal = 0.50) {
  const corpRate = jur.country === 'CA'
    ? jur.corporate.fedSB + (jur.regionData?.provSB ?? 0.032)
    : (jur.country === 'US' ? 0.21 : jur.corporate.smallRate);
  // Non-refundable part of the passive tax is the true accumulation drag;
  // the refundable portion (RDTOH) is recovered when dividends are paid out.
  const passiveDrag = jur.country === 'CA'
    ? jur.corporate.passiveRate - jur.corporate.refundableRate
    : 0.30;
  const divEff = personalMarginal * 0.85;          // effective tax on extracting corporate growth
  const persInvDrag = personalMarginal * 0.40;     // personal investment-income drag (cap gains/dividends)

  const corpInitial = preTax * (1 - corpRate);
  const persInitial = preTax * (1 - personalMarginal);

  // Corp: bigger base; passive return taxed each year (net of RDTOH recovery)
  const corpVal = corpInitial * Math.pow(1 + grossReturn * (1 - passiveDrag), years);
  // Integration: extracting the principal is ≈ neutral vs taking it personally;
  // only the corporate GROWTH is taxed again on extraction.
  const corpFinalNet = persInitial + (corpVal - corpInitial) * (1 - divEff);

  // Personal: smaller base, lighter ongoing drag
  const persVal = persInitial * Math.pow(1 + grossReturn * (1 - persInvDrag), years);

  return {
    corpRate, passiveDrag, years, divEff,
    corpInitial, persInitial,
    deferralToday: corpInitial - persInitial,        // extra capital working immediately
    corpFinal: corpFinalNet, persFinal: persVal,
    advantage: corpFinalNet - persVal,
  };
}

// ---------- Business valuation ----------

export function businessValuation({ ebitda = 0, ebitdaMultiple = 5, sde = 0, sdeMultiple = 3, revenue = 0, revenueMultiple = 1 }) {
  const byEbitda = ebitda * ebitdaMultiple;
  const bySde = sde * sdeMultiple;
  const byRevenue = revenue * revenueMultiple;
  const methods = [byEbitda, bySde, byRevenue].filter(v => v > 0);
  const estimate = methods.length ? methods.reduce((s, v) => s + v, 0) / methods.length : 0;
  return { byEbitda, bySde, byRevenue, estimate };
}

// ---------- Lifetime capital gains exemption on sale ----------

export function lcgeSale(jur, saleProceeds, acb = 0, owners = 1) {
  const gain = Math.max(0, saleProceeds - acb);
  const lcge = jur.corporate?.lcge || 0;
  const exemptionTotal = lcge * owners;
  const exempt = Math.min(gain, exemptionTotal);
  const taxableGain = gain - exempt;
  const inclusion = jur.capGainsInclusion;
  // tax on taxable gain at top-ish marginal (approx using computeTax delta at 150k other income)
  const t0 = computeTax(jur, { ordinary: 150000, withPayroll: false });
  const t1 = computeTax(jur, { ordinary: 150000, capGains: taxableGain, withPayroll: false });
  const taxWithLcge = t1.total - t0.total;
  const t1NoLcge = computeTax(jur, { ordinary: 150000, capGains: gain, withPayroll: false });
  const taxNoLcge = t1NoLcge.total - t0.total;
  return {
    gain, lcge, owners, exemptionTotal, exempt, taxableGain,
    taxWithLcge, taxNoLcge, taxSaved: taxNoLcge - taxWithLcge,
    netProceeds: saleProceeds - taxWithLcge,
  };
}
