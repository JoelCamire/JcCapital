// ============================================================
// Retirement decumulation optimizer (Canada-centric)
// Simulates the retirement phase under different withdrawal
// strategies with EXACT taxes (all credits, OAS recovery tax),
// forced RRIF minimums from the jurisdiction table (RRSP → first
// minimum at 72), and an exact after-tax estate value (deemed
// disposition of the RRIF + latent capital gains).
// ============================================================
import { computeTax, grossUpForNet, rrifMinFactor } from './tax.js';
import { t } from '../i18n.js';

const fin = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
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

/** Default bracket target = top of the first federal bracket (today's $). */
export function defaultBracketTarget(jur) { return fin(jur?.fed?.brackets?.[0]?.upTo, 57000); }

/**
 * params = {
 *   startAge, endAge, deferred, tfsa, nonreg, nonregBasis, deferredType ('rrsp'|'rrif'),
 *   otherIncomeNow (taxable pensions excl. CPP/OAS, today's $), otherIncomeStartAge,
 *   pensionIncomeNow (eligible pension part of otherIncomeNow),
 *   cppAnnual, cppStartAge (CPP/QPP, today's $ at that age),
 *   oasAnnual, oasStartAge, spending (today's $), inflation, returnRate, distributionYield,
 *   bracketTarget (meltdown/tfsaPreserve target taxable income, today's $)
 * }
 */
export function simulateDecumulation(jur, params, strategy) {
  const inflation = fin(params.inflation, 0.021), returnRate = fin(params.returnRate, 0.045);
  const distYield = fin(params.distributionYield, 0.45);
  const bracketTarget = fin(params.bracketTarget, defaultBracketTarget(jur));
  const deferredType = params.deferredType || 'rrsp';
  let deferred = Math.max(0, fin(params.deferred)), tfsa = Math.max(0, fin(params.tfsa)), nonreg = Math.max(0, fin(params.nonreg));
  let basis = Math.max(0, Math.min(nonreg, fin(params.nonregBasis, nonreg)));
  let totalTax = 0, totalClawback = 0;
  const rows = [];
  const _sA = Number.isFinite(+params.startAge) ? Math.max(0, Math.min(120, +params.startAge)) : 65;
  const _eA = Number.isFinite(+params.endAge) ? Math.max(_sA, Math.min(120, +params.endAge)) : 90;
  const oasStart = fin(params.oasStartAge, fin(jur?.pensions?.oas?.startAge, 65));
  const cppStart = fin(params.cppStartAge, fin(jur?.pensions?.cpp?.startAge, 65));
  const otherStart = fin(params.otherIncomeStartAge, _sA);

  for (let i = 0, age = _sA; age <= _eA; age++, i++) {
    const infl = Math.pow(1 + inflation, i);
    const other = age >= otherStart ? fin(params.otherIncomeNow) * infl : 0;
    const cpp = age >= cppStart ? fin(params.cppAnnual) * infl : 0;
    const otherIncome = other + cpp;
    const pensionPart = age >= otherStart ? Math.min(other, fin(params.pensionIncomeNow, params.otherIncomeNow) * infl) : 0;
    const oas = age >= oasStart ? fin(params.oasAnnual) * infl : 0;
    const spending = fin(params.spending) * infl;

    // grow balances
    deferred *= 1 + returnRate; tfsa *= 1 + returnRate;
    const nonregGrowth = nonreg * returnRate;
    nonreg += nonregGrowth; basis += nonregGrowth * distYield;          // distributions reinvested
    let ordinaryTaxable = otherIncome + nonregGrowth * distYield;

    // forced RRIF minimum
    let forced = 0;
    const f = rrifMinFactor(jur, age, deferredType);
    if (f > 0 && deferred > 0) { forced = deferred * f; deferred -= forced; ordinaryTaxable += forced; }

    // discretionary RRSP draw to a bracket target (meltdown / tfsaPreserve)
    let deferredW = forced;
    if ((strategy === 'meltdown' || strategy === 'tfsaPreserve') && deferred > 0) {
      const room = Math.max(0, bracketTarget * infl - ordinaryTaxable);
      const extra = Math.min(deferred, room);
      deferredW += extra; deferred -= extra; ordinaryTaxable += extra;
    }

    const eligiblePension = pensionPart + (age >= 65 ? deferredW : 0);
    const taxOpts = { age, pensionIncome: eligiblePension, oasIncome: oas, withPayroll: false, employment: false };
    const tx = computeTax(jur, { ordinary: ordinaryTaxable, ...taxOpts });
    const baseTax = tx.incomeTax;
    let claw = tx.clawback;
    const afterTaxIncome = ordinaryTaxable + oas - baseTax - claw;

    // fill the remaining spending gap: non-reg → RRSP → TFSA (or RRSP → non-reg → TFSA for tfsaPreserve)
    let gap = spending - afterTaxIncome;
    let extraTax = 0, wNonreg = 0, wTfsa = 0;
    const drawNonreg = () => {
      if (gap <= 0.5 || nonreg <= 0) return;
      const gainFrac = nonreg > 0 ? Math.max(0, Math.min(1, (nonreg - basis) / nonreg)) : 0;
      let take = Math.min(nonreg, gap);
      let tax = 0;
      for (let k = 0; k < 3; k++) {
        const t1 = computeTax(jur, { ordinary: ordinaryTaxable, capGains: take * gainFrac, ...taxOpts });
        const t0 = computeTax(jur, { ordinary: ordinaryTaxable, ...taxOpts });
        tax = Math.max(0, t1.total - t0.total);
        const net = take - tax;
        if (net >= gap - 0.5 || take >= nonreg) break;
        take = Math.min(nonreg, take + (gap - net) / Math.max(0.5, 1 - tax / Math.max(1, take)));
      }
      nonreg -= take; basis = Math.max(0, basis - take * (1 - gainFrac));
      wNonreg += take; gap -= take - tax; extraTax += tax;
    };
    const drawDeferred = () => {
      if (gap <= 0.5 || deferred <= 0) return;
      const g = grossUpForNet(jur, gap, ordinaryTaxable, deferred, taxOpts);
      if (g.gross <= 0) return;
      deferred -= g.gross; deferredW += g.gross; ordinaryTaxable += g.gross;
      gap -= g.net; extraTax += g.tax;
      // recovery tax on the extra withdrawal is inside g.tax; split it out for reporting
      const after = computeTax(jur, { ordinary: ordinaryTaxable, ...taxOpts });
      claw = after.clawback;
    };
    if (strategy === 'tfsaPreserve') { drawDeferred(); drawNonreg(); } else { drawNonreg(); drawDeferred(); }
    if (gap > 0.5 && tfsa > 0) { const take = Math.min(tfsa, gap); tfsa -= take; wTfsa += take; gap -= take; }
    else if (gap < -0.5) { nonreg += -gap; basis += -gap; gap = 0; }   // reinvest after-tax surplus

    const yearTax = baseTax + extraTax;
    totalTax += yearTax; totalClawback += claw;

    // after-tax estate: deemed disposition of the RRIF as income + latent gains on the non-registered account
    const estateTaxDeferred = deferred > 0 ? computeTax(jur, { ordinary: deferred, withPayroll: false, employment: false, age }).total : 0;
    const gainLatent = Math.max(0, nonreg - basis);
    const estateTaxGains = gainLatent > 0 ? Math.max(0, computeTax(jur, { ordinary: 0, capGains: gainLatent, withPayroll: false, employment: false, age }).total) : 0;
    const estate = deferred - estateTaxDeferred + tfsa + nonreg - estateTaxGains;

    rows.push({ age, deferred, tfsa, nonreg, taxable: ordinaryTaxable, oas, cpp, otherIncome: other, tax: yearTax + claw, incomeTax: yearTax, clawback: claw, estate, estateTax: estateTaxDeferred + estateTaxGains, shortfall: Math.max(0, gap), withdrawals: { deferred: deferredW, nonreg: wNonreg, tfsa: wTfsa } });
  }

  const last = rows[rows.length - 1];
  return { strategy, rows, totalTax, totalClawback, finalEstate: last ? last.estate : 0, finalEstateTax: last ? last.estateTax : 0 };
}

/** Run all strategies and pick the one with the highest after-tax estate. */
export function compareDecumulation(jur, params) {
  const results = STRATEGIES.map(s => simulateDecumulation(jur, params, s));
  const best = results.reduce((b, r) => r.finalEstate > b.finalEstate ? r : b, results[0]);
  return { results, best: best.strategy };
}
