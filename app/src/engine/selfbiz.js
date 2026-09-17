// ============================================================
// Incorporation decision & self-employed (Canada).
//   Sole proprietor vs CCPC: tax deferral on retained earnings,
//   integration on extracted funds, break-even income level.
//   Self-employed: both halves of CPP/QPP (exact, from the
//   jurisdiction payroll table), GST/QST quick method, instalments.
// ============================================================
import { computeTax } from './tax.js';
import { corporateTaxCA } from './corporate.js';
import { cleanse } from './util.js';
import { t } from '../i18n.js';

const fin = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

/**
 * Should you incorporate?  p = { businessIncome, personalNeed, adminCost, age }
 * personalNeed = after-tax cash the owner must draw to live.
 */
export function incorporationAnalysis(jur, p) {
  p = cleanse(p);
  const { businessIncome = 150000, personalNeed = 70000, adminCost = 2500, age = 45 } = p;

  // ---- Sole proprietor: all income taxed personally as self-employment (both CPP halves, no EI) ----
  const soleTax = computeTax(jur, { ordinary: businessIncome, employmentIncome: businessIncome, selfEmployed: true, age });
  const soleNet = businessIncome - soleTax.total;

  // ---- Incorporated: corp pays low rate; owner draws a salary that nets personalNeed; rest deferred ----
  const corp = corporateTaxCA(jur, businessIncome, 0);
  const sbRate = corp.sbRate;
  const netOf = (s) => s - computeTax(jur, { ordinary: s, employmentIncome: s, ownerEiExempt: true, age }).total;
  let lo = 0, hi = Math.min(businessIncome, personalNeed * 2.5 + 1000), salary = 0;
  if (netOf(hi) < personalNeed) salary = hi; else { for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (netOf(mid) < personalNeed) lo = mid; else hi = mid; if (hi - lo < 1) break; } salary = hi; }
  const ownerTax = computeTax(jur, { ordinary: salary, employmentIncome: salary, ownerEiExempt: true, age });
  const employerCost = ownerTax.detail?.payroll?.employer || 0;
  const surplus = Math.max(0, businessIncome - salary - employerCost);          // retained in corp
  const corpTaxOnSurplus = surplus * sbRate;
  const retainedAfterCorpTax = surplus - corpTaxOnSurplus;
  const personalMarginalOnSurplus = soleTax.marginalRate;
  const deferralBenefit = surplus * Math.max(0, personalMarginalOnSurplus - sbRate);

  const incorpTaxThisYear = ownerTax.total + employerCost + corpTaxOnSurplus;
  const soleTaxThisYear = soleTax.total;
  const taxDeferred = Math.max(0, soleTaxThisYear - incorpTaxThisYear);
  const netAdvantage = deferralBenefit - adminCost;

  return {
    businessIncome, personalNeed, salary, employerCost, surplus,
    sbRate, soleTax: soleTaxThisYear, soleNet,
    corpTaxOnSurplus, retainedAfterCorpTax, ownerPersonalTax: ownerTax.total,
    incorpTaxThisYear, taxDeferred, deferralBenefit, adminCost, netAdvantage,
    worthwhile: netAdvantage > 0,
    note: t('L’incorporation est surtout avantageuse lorsque vous n’avez pas besoin de tout le revenu : le surplus est imposé au faible taux des PME et reporté. Si vous décaissez tout, l’intégration rend les deux quasi équivalents — moins les frais d’administration.',
      'Incorporation pays off mainly when you don’t need all the income: the surplus is taxed at the low small-business rate and deferred. If you draw everything, integration makes the two nearly equal — minus admin costs.'),
  };
}

/** Break-even business income where incorporation net advantage turns positive (coarse-to-fine search). */
export function incorporationBreakeven(jur, personalNeed = 70000, adminCost = 2500) {
  const adv = (inc) => incorporationAnalysis(jur, { businessIncome: inc, personalNeed, adminCost }).netAdvantage;
  let lo = personalNeed, hi = null;
  for (let inc = personalNeed; inc <= 1000000; inc += 25000) { if (adv(inc) > 0) { hi = inc; break; } lo = inc; }
  if (hi == null) return null;
  for (let k = 0; k < 12; k++) { const mid = (lo + hi) / 2; if (adv(mid) > 0) hi = mid; else lo = mid; if (hi - lo < 500) break; }
  return Math.round(hi / 100) * 100;
}

// ---- Self-employed ----

/**
 * p = { netSelfEmployment, revenue, homeOfficeAnnual, vehicleAnnual, vehicleBusinessPct, age, services (bool: quick-method service rate) }
 */
export function selfEmployedAnalysis(jur, p) {
  p = cleanse(p);
  const region = jur.region;
  const { netSelfEmployment = 90000, revenue = 110000, homeOfficeAnnual = 0, vehicleBusinessPct = 0, vehicleAnnual = 0, age = 45, services = true } = p;
  const ST = jur.salesTax || { gst: 0.05, qst: 0.09975, registrationThreshold: 30000, quickMethod: { gstServices: 0.036, qstServices: 0.066, gstGoods: 0.018, qstGoods: 0.034 } };
  const INST = jur.installments || { thresholdQC: 1800, thresholdROC: 3000 };

  // deductions
  const homeOfficeDed = Math.max(0, homeOfficeAnnual);
  const vehicleDed = Math.max(0, vehicleAnnual) * Math.max(0, Math.min(1, vehicleBusinessPct));
  const netAfterDed = Math.max(0, netSelfEmployment - homeOfficeDed - vehicleDed);

  // income tax + both halves of CPP/QPP (+ QPIP self-employed rate), exact from the tax engine
  const tax = computeTax(jur, { ordinary: netAfterDed, employmentIncome: netAfterDed, selfEmployed: true, age });
  const cpp = tax.payroll;
  const cppDeductible = tax.detail?.payroll?.deduction || 0;
  const totalTax = tax.total;
  const afterTax = netSelfEmployment - homeOfficeDed - vehicleDed - totalTax;

  // GST/QST — quick method: remittance = rate × tax-included sales
  const mustRegister = revenue > (ST.registrationThreshold || 30000);
  const isQC = region === 'QC';
  const gstRate = ST.gst, pstRate = isQC ? ST.qst : (region === 'ON' ? (ST.hstON - ST.gst) : 0);
  const salesTaxCollected = revenue * (gstRate + pstRate);
  const qm = ST.quickMethod || {};
  const gstQuick = services ? fin(qm.gstServices, 0.036) : fin(qm.gstGoods, 0.018);
  const qstQuick = services ? fin(qm.qstServices, 0.066) : fin(qm.qstGoods, 0.034);
  const quickRemit = revenue * (1 + gstRate) * gstQuick + (isQC ? revenue * (1 + pstRate) * qstQuick : 0);
  const salesTaxKept = Math.max(0, salesTaxCollected - quickRemit);

  // instalments
  const threshold = isQC ? INST.thresholdQC : INST.thresholdROC;
  const installmentsRequired = tax.incomeTax + cpp > threshold;
  const quarterlyInstallment = installmentsRequired ? (tax.incomeTax + cpp) / 4 : 0;

  return {
    netSelfEmployment, homeOfficeDed, vehicleDed, netAfterDed,
    cpp, cppDeductible, incomeTax: tax.incomeTax, totalTax, afterTax,
    averageRate: netSelfEmployment > 0 ? totalTax / netSelfEmployment : 0, marginalRate: tax.marginalRate,
    mustRegister, salesTaxCollected, quickRemit, salesTaxKept, gstRate, pstRate,
    installmentsRequired, quarterlyInstallment, installmentThreshold: threshold,
    note: t('Le travailleur autonome paie les DEUX parts du RRQ/RPC (la part de l’employeur et la bonification sont déductibles) et le RQAP au taux autonome; pas d’AE. Inscription TPS/TVQ obligatoire au-delà de 30 000 $ de revenus; la méthode rapide simplifie la remise. Des acomptes provisionnels trimestriels s’appliquent si l’impôt net dépasse le seuil.',
      'The self-employed pay BOTH halves of CPP/QPP (the employer half and the enhancement are deductible) and QPIP at the self-employed rate; no EI. GST/QST registration is mandatory above $30,000 of revenue; the quick method simplifies remittance. Quarterly tax instalments apply if net tax exceeds the threshold.'),
  };
}
