// ============================================================
// Advanced planning structures (Canada-focused)
//   Holdco (two-tier) — purification & creditor protection
//   Family trust + estate freeze — LCGE multiplication
//   RCA (Retirement Compensation Arrangement)
//   Prescribed-rate loan — income splitting
// All figures CAD. Illustrative modelling — requires professional advice.
// ============================================================
import { t } from '../i18n.js';

const LCGE = 1250000; // lifetime capital gains exemption per individual, 2025

/**
 * Two-tier Holdco analysis: how much passive cash/investments should move
 * up to Holdco to keep Opco a Qualified Small Business Corporation (QSBC),
 * plus creditor-protection benefit. (QSBC ≈ 90% active assets at sale.)
 */
export function holdcoAnalysis({ activeAssets, passiveAssets }) {
  const total = activeAssets + passiveAssets;
  const activeRatio = total > 0 ? activeAssets / total : 1;
  const maxPassiveForQSBC = activeAssets / 9;                 // passive ≤ 10% of total
  const excessToMoveUp = Math.max(0, passiveAssets - maxPassiveForQSBC);
  return {
    total, activeRatio, qsbcEligible: activeRatio >= 0.90,
    maxPassiveForQSBC, excessToMoveUp,
    creditorProtected: excessToMoveUp,                        // moved out of operating risk
    intercorpDividend: excessToMoveUp,                        // tax-free Opco -> Holdco (connected)
  };
}

/**
 * Estate freeze + family trust: freeze today's value to the founder, grow
 * future value in a trust whose beneficiaries each claim their own LCGE.
 */
export function estateFreezeLCGE({ currentValue, futureValue, beneficiaries = 1, marginalRate = 0.26 }) {
  const growth = Math.max(0, futureValue - currentValue);
  const lcgeTotal = beneficiaries * LCGE;
  const exemptWithFreeze = Math.min(growth, lcgeTotal);
  const exemptSingle = Math.min(growth, LCGE);
  const extraExemption = exemptWithFreeze - exemptSingle;     // captured by multiplication
  const inclusion = 0.5;
  const taxSaved = extraExemption * inclusion * marginalRate; // effective tax on cap gains ≈ marginal/2
  const taxableGrowth = Math.max(0, growth - exemptWithFreeze);
  return {
    growth, beneficiaries, lcge: LCGE, lcgeTotal,
    exemptWithFreeze, exemptSingle, extraExemption, taxableGrowth, taxSaved,
  };
}

/**
 * RCA: corp contributes for the owner; 50% goes to a refundable tax account,
 * 50% is invested. Contribution is deductible to the corp.
 */
export function rcaAnalysis({ contribution, corpRate = 0.122, years = 10, returnRate = 0.05 }) {
  const toInvest = contribution * 0.5;
  const toRTA = contribution * 0.5;                           // refundable to corp as benefits are paid
  const corpDeductionSaving = contribution * corpRate;
  // accumulate invested half (investment income also 50% refundable -> net ~ half the return invested)
  let invested = 0;
  for (let y = 0; y < years; y++) invested = invested * (1 + returnRate * 0.5) + toInvest;
  const totalContributed = contribution * years;
  return {
    contribution, toInvest, toRTA, corpDeductionSaving,
    totalContributed, fundAfterYears: invested + toRTA * years,
    note: t('La moitié de chaque cotisation et des revenus est versée à l’ARC (compte d’impôt remboursable), récupérée à raison de 1 $ pour 2 $ de prestations versées. Idéal au-delà des plafonds REER/RRI, avec protection contre les créanciers.',
      'Half of each contribution and of investment income is remitted to the CRA (refundable tax account), recovered $1 for every $2 of benefits paid. Ideal beyond RRSP/IPP limits, with creditor protection.'),
  };
}

/**
 * Prescribed-rate loan income splitting. Higher-income spouse lends to the
 * lower-income spouse (or family trust) at the CRA prescribed rate; only the
 * interest is attributed back, the excess return is taxed in low-income hands.
 * Saving/yr = loan*(return − prescribed)*(highMarg − lowMarg).
 */
export function prescribedRateLoan({ loan, returnRate, prescribedRate, highMarg, lowMarg, years = 10 }) {
  const annualReturn = loan * returnRate;
  const annualInterest = loan * prescribedRate;
  const splitIncome = Math.max(0, annualReturn - annualInterest);
  const annualSaving = Math.max(0, splitIncome * (highMarg - lowMarg));
  let cumulative = 0, bal = 0;
  const series = [];
  for (let y = 1; y <= years; y++) {
    cumulative += annualSaving;
    bal = bal * (1 + returnRate) + splitIncome;              // compounding shifted income
    series.push({ year: y, cumulative, shifted: bal });
  }
  return { annualReturn, annualInterest, splitIncome, annualSaving, cumulative, series };
}
