// ============================================================
// Philanthropy / charitable giving strategies
//   Cash vs gift of appreciated listed securities
//   Donor-Advised Fund vs Private Foundation (qualitative)
//   Donation credit, capital-gains elimination, bunching
// ============================================================
import { t } from '../i18n.js';
import { cleanse, fin } from './util.js';

/**
 * Compare donating cash vs donating appreciated listed securities.
 * p = { amount, costBasis, marginalRate, donationCredit }
 */
export function charitableGift(jur, p) {
  p = cleanse(p);
  const { amount = 0, costBasis = 0, marginalRate = 0.50, donationCredit = 0.50 } = p;
  const credit = amount * donationCredit;

  // Capital-gains tax that WOULD apply if the securities were sold (then cash donated)
  const gain = Math.max(0, amount - costBasis);
  const capGainsTaxIfSold = jur.country === 'CA'
    ? gain * jur.capGainsInclusion * marginalRate
    : gain * 0.20; // US/UK long-term/CGT approx

  // Gift of listed securities: 0% inclusion -> that tax is eliminated
  const cashNetCost = amount - credit;
  const securitiesNetCost = amount - credit;          // same credit, but no gains tax triggered
  const securitiesAdvantage = capGainsTaxIfSold;      // saving vs sell-then-donate-cash

  return {
    amount, credit, gain, capGainsTaxIfSold,
    cashNetCost, securitiesNetCost, securitiesAdvantage,
    costPerDollarCash: amount > 0 ? cashNetCost / amount : 0,
    costPerDollarSecurities: amount > 0 ? securitiesNetCost / amount : 0,
    effectiveAdvantagePct: amount > 0 ? securitiesAdvantage / amount : 0,
    note: t('Le don de titres cotés en bourse donne le même crédit qu’un don en argent tout en éliminant l’impôt sur le gain en capital latent (inclusion de 0 %). C’est presque toujours préférable à vendre puis donner l’argent.',
      'A gift of publicly-listed securities gives the same credit as a cash gift while eliminating tax on the latent capital gain (0% inclusion). It is almost always better than selling then donating cash.'),
  };
}

/**
 * Multi-year giving with carry-forward / bunching illustration.
 * Donation credits can be carried forward up to 5 years (CA).
 * firstTier / lowerRate default to the jurisdiction's donation table when `jur` is given.
 */
export function bunchingStrategy({ annualGift, years = 5, donationCredit = 0.50, lowerRate = null, firstTier = null }, jur = null) {
  const tier = fin(firstTier, jur?.fed?.donation?.first ?? 200);
  const low = lowerRate != null ? lowerRate : (jur ? (fin(jur.fed?.donation?.lowRate, 0.14) * (1 - fin(jur.regionData?.federalAbatement)) + fin(jur.regionData?.donation?.lowRate, 0.2)) : 0.20);
  const gift = Math.max(0, fin(annualGift));
  const creditOn = (amt) => Math.min(amt, tier) * low + Math.max(0, amt - tier) * donationCredit;
  const spreadCredit = years * creditOn(gift);
  const bunchedTotal = gift * years;
  const bunchedCredit = creditOn(bunchedTotal);
  return { spreadCredit, bunchedCredit, advantage: bunchedCredit - spreadCredit, bunchedTotal, firstTier: tier, lowerRate: low };
}

export const VEHICLES = () => [
  {
    name: t('Don direct', 'Direct gift'),
    pros: t('Simple, crédit immédiat, aucun frais.', 'Simple, immediate credit, no fees.'),
    cons: t('Aucun contrôle ni étalement dans le temps.', 'No control or timing flexibility.'),
  },
  {
    name: t('Fonds orienté par le donateur (DAF)', 'Donor-Advised Fund (DAF)'),
    pros: t('Crédit immédiat, octroi des dons dans le temps, faible coût, croissance à l’abri de l’impôt, simplicité.', 'Immediate credit, grant over time, low cost, tax-sheltered growth, simplicity.'),
    cons: t('Recommandations non contraignantes; moins de contrôle qu’une fondation.', 'Non-binding recommendations; less control than a foundation.'),
  },
  {
    name: t('Fondation privée', 'Private Foundation'),
    pros: t('Contrôle total, legs familial, embauche, programmes propres.', 'Full control, family legacy, staffing, own programs.'),
    cons: t('Contingent de versement (3,5 %), restrictions de participations, administration et coûts élevés.', 'Disbursement quota (3.5%), holding restrictions, heavy admin and cost.'),
  },
  {
    name: t('Don d’assurance vie / CDC', 'Gift of life insurance / CDA'),
    pros: t('Effet de levier philanthropique; le capital-décès corporatif crédite le CDC.', 'Philanthropic leverage; corporate death benefit credits the CDA.'),
    cons: t('Engagement de primes; bénéfice surtout au décès.', 'Premium commitment; benefit mainly at death.'),
  },
];
