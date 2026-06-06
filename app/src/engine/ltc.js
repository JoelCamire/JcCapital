// ============================================================
// Longevity & long-term care (LTC) cost projection.
// Compares self-funding the care cost vs LTC insurance.
// ============================================================
import { t } from '../i18n.js';
import { cleanse, fin } from './util.js';

// Illustrative annual costs of care (today's dollars).
export const CARE_LEVELS = () => [
  { key: 'home', label: t('Soins à domicile', 'Home care'), annual: 35000 },
  { key: 'assisted', label: t('Résidence assistée', 'Assisted living'), annual: 60000 },
  { key: 'nursing', label: t('Soins infirmiers (CHSLD)', 'Nursing home'), annual: 100000 },
];

/**
 * p = { currentAge, onsetAge, durationYears, annualCostToday, healthInflation,
 *       insurancePremiumAnnual, insuranceCoverageAnnual, portfolioReturn }
 */
export function projectLTC(p) {
  p = cleanse(p);
  const {
    currentAge = 60, onsetAge = 84, durationYears = 4, annualCostToday = 60000,
    healthInflation = 0.04, insurancePremiumAnnual = 3500, insuranceCoverageAnnual = 50000,
  } = p;

  const _n=(v,d)=>Number.isFinite(+v)?+v:d; const _cur=_n(currentAge,60),_ons=_n(onsetAge,84),_cost=_n(annualCostToday,60000),_hi=Math.max(-0.5,Math.min(0.3,_n(healthInflation,0.04)));
  const yearsToOnset = Math.max(0, Math.min(80, _ons - _cur));
  const costAtOnset = _cost * Math.pow(1 + _hi, yearsToOnset);

  // Self-funding: total inflated cost across the care period
  let totalCost = 0; const series = [];
  for (let i = 0, _n = Math.max(0, Math.min(60, Number(durationYears) || 0)); i < _n; i++) {
    const c = _cost * Math.pow(1 + _hi, yearsToOnset + i);
    totalCost += c; series.push({ age: onsetAge + i, cost: c });
  }

  // Insurance: premiums paid from now until end of care; benefit offsets cost
  const premiumYears = yearsToOnset + durationYears;
  const totalPremiums = insurancePremiumAnnual * premiumYears;
  let coveredTotal = 0;
  for (let i = 0, _n = Math.max(0, Math.min(60, Number(durationYears) || 0)); i < _n; i++) {
    const cov = (Number.isFinite(+insuranceCoverageAnnual)?+insuranceCoverageAnnual:50000) * Math.pow(1 + _hi * 0.5, yearsToOnset + i); // partial indexing
    coveredTotal += Math.min(cov, series[i].cost);
  }
  const netOutOfPocketInsured = Math.max(0, totalCost - coveredTotal) + totalPremiums;

  return {
    yearsToOnset, costAtOnset, totalCost, series,
    totalPremiums, coveredTotal, netOutOfPocketInsured,
    insuranceAdvantage: totalCost - netOutOfPocketInsured,
    note: t('Le risque de soins de longue durée est l’une des plus grandes inconnues de la retraite. L’auto-financement exige une réserve importante; l’assurance SLD transforme un coût incertain en prime fixe. Comparez selon votre santé, vos antécédents et votre patrimoine.',
      'Long-term care is one of retirement’s biggest unknowns. Self-funding requires a large reserve; LTC insurance turns an uncertain cost into a fixed premium. Compare based on your health, family history and wealth.'),
  };
}
