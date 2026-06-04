// ============================================================
// Retirement decumulation optimizer (Canada-centric)
// Simulates the retirement phase under different withdrawal
// strategies, modelling forced RRIF minimums and OAS clawback,
// to compare lifetime tax and after-tax estate value.
// ============================================================
import { computeTax } from './tax.js';
import { t } from '../i18n.js';

// RRIF minimum factors (age 71+)
const RRIF = { 71:0.0528,72:0.0540,73:0.0553,74:0.0567,75:0.0582,76:0.0598,77:0.0617,78:0.0636,79:0.0658,80:0.0682,81:0.0708,82:0.0738,83:0.0771,84:0.0808,85:0.0851,86:0.0899,87:0.0955,88:0.1021,89:0.1099,90:0.1192,91:0.1306,92:0.1449,93:0.1634,94:0.1879,95:0.20 };

const STRATEGIES = ['nonregFirst', 'meltdown', 'tfsaPreserve'];

export function strategyLabel(key) {
  return {
    nonregFirst: t('Non enregistré en premier', 'Non-registered first'),
    meltdown: t('Fonte du REER (meltdown)', 'RRSP meltdown'),
    tfsaPreserve: t('Préserver le CELI', 'Preserve the TFSA'),
  }[key];
}
export function strategyDesc(key) {
  return {
    nonregFirst: t('Dépenser le compte non enregistré d’abord, puis le REER/FERR, et garder le CELI en dernier. Simple, mais peut gonfler l’impôt et la récupération de la PSV plus tard.',
      'Spend the non-registered account first, then RRSP/RRIF, keeping the TFSA for last. Simple, but can inflate later tax and OAS clawback.'),
    meltdown: t('Retirer davantage du REER tôt (en remplissant une tranche d’imposition cible) pour réduire les retraits forcés du FERR et la récupération de la PSV plus tard.',
      'Withdraw more from the RRSP early (filling a target bracket) to reduce later forced RRIF withdrawals and OAS clawback.'),
    tfsaPreserve: t('Combler le revenu avec le REER jusqu’à une tranche cible, puis le non enregistré, et préserver le CELI pour la croissance libre d’impôt et la succession.',
      'Top up income from the RRSP to a target bracket, then non-registered, preserving the TFSA for tax-free growth and estate.'),
  }[key];
}

/**
 * params = {
 *   startAge, endAge, deferred, tfsa, nonreg, nonregBasis,
 *   otherIncomeNow (taxable pensions excl OAS, today's $), oasAnnual,
 *   spending (today's $), inflation, returnRate, oasThreshold, oasClawRate,
 *   bracketTarget (meltdown/tfsaPreserve target taxable income)
 * }
 */
export function simulateDecumulation(jur, params, strategy) {
  const {
    startAge, endAge, inflation = 0.021, returnRate = 0.045,
    oasThreshold = 93454, oasClawRate = 0.15, bracketTarget = 57000,
  } = params;
  let deferred = params.deferred, tfsa = params.tfsa, nonreg = params.nonreg;
  let basis = params.nonregBasis ?? nonreg;
  let totalTax = 0, totalClawback = 0;
  const rows = [];

  for (let i = 0, age = startAge; age <= endAge; age++, i++) {
    const infl = Math.pow(1 + inflation, i);
    const otherIncome = params.otherIncomeNow * infl;
    const oas = params.oasAnnual * infl;
    const spending = params.spending * infl;

    // grow balances
    deferred *= 1 + returnRate; tfsa *= 1 + returnRate;
    const nonregGrowth = nonreg * returnRate;
    nonreg += nonregGrowth; basis += nonregGrowth * 0.45; // distributions reinvested
    let ordinaryTaxable = otherIncome + oas + nonregGrowth * 0.45;

    // forced RRIF minimum (age >= 72 modelled; convert at 71)
    let forced = 0;
    const f = RRIF[age];
    if (f && deferred > 0) { forced = deferred * f; deferred -= forced; ordinaryTaxable += forced; }

    // discretionary RRSP draw to a bracket target (meltdown / tfsaPreserve)
    let deferredW = 0;
    if ((strategy === 'meltdown' || strategy === 'tfsaPreserve') && deferred > 0) {
      const room = Math.max(0, bracketTarget * infl - ordinaryTaxable);
      const extra = Math.min(deferred, room);
      deferredW += extra; deferred -= extra; ordinaryTaxable += extra;
    }

    // tax + OAS clawback on the mandatory taxable income
    const tx = computeTax(jur, { ordinary: ordinaryTaxable, withPayroll: false });
    const baseTax = tx.total;
    const marg = tx.marginalRate;
    let claw = ordinaryTaxable > oasThreshold * infl
      ? Math.min(oas, (ordinaryTaxable - oasThreshold * infl) * oasClawRate) : 0;
    const afterTaxIncome = ordinaryTaxable - baseTax - claw;

    // fill the remaining spending gap: non-reg → RRSP → TFSA
    let gap = spending - afterTaxIncome;
    let extraTax = 0, wNonreg = 0, wTfsa = 0;
    if (gap > 0 && nonreg > 0) {
      const gainFrac = Math.max(0, (nonreg - basis) / nonreg);
      const eff = Math.min(0.27, marg * 0.5 * gainFrac);
      const take = Math.min(nonreg, gap / (1 - eff));
      nonreg -= take; basis = Math.max(0, basis - take * (1 - gainFrac));
      wNonreg += take; gap -= take * (1 - eff); extraTax += take * eff;
    }
    if (gap > 0 && deferred > 0) {
      const mr = Math.min(0.53, Math.max(0.20, marg));
      const gross = Math.min(deferred, gap / (1 - mr));
      deferred -= gross; deferredW += gross; ordinaryTaxable += gross;
      gap -= gross * (1 - mr); extraTax += gross * mr;
    }
    if (gap > 0 && tfsa > 0) { const take = Math.min(tfsa, gap); tfsa -= take; wTfsa += take; gap -= take; }
    else if (gap < 0) { nonreg += -gap; basis += -gap; gap = 0; } // reinvest after-tax surplus

    const yearTax = baseTax + extraTax + claw;
    totalTax += baseTax + extraTax; totalClawback += claw;
    const estate = deferred * (1 - 0.40) + tfsa + nonreg; // RRSP/RRIF ~40% taxable at death
    rows.push({ age, deferred, tfsa, nonreg, taxable: ordinaryTaxable, tax: yearTax, clawback: claw, estate, shortfall: Math.max(0, gap), withdrawals: { deferred: deferredW, nonreg: wNonreg, tfsa: wTfsa } });
  }

  const finalEstate = rows[rows.length - 1].estate;
  return { strategy, rows, totalTax, totalClawback, finalEstate };
}

/** Run all strategies and pick the one with the highest after-tax estate. */
export function compareDecumulation(jur, params) {
  const results = STRATEGIES.map(s => simulateDecumulation(jur, params, s));
  const best = results.reduce((b, r) => r.finalEstate > b.finalEstate ? r : b, results[0]);
  return { results, best: best.strategy };
}
