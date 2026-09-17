// ============================================================
// Flow-through shares (actions accréditives) & charitable
// flow-through donation ("PearTree" method) — Canadian mining
// exploration tax strategy.
//   CEE (Canadian Exploration Expense) 100% deduction
//   METC (Mineral Exploration Tax Credit) 15% federal + provincial
//   ACB of FTS = $0  -> full proceeds are a capital gain
//   Gift of listed securities -> 0% capital-gains inclusion
// Donation credit rates are DERIVED from the jurisdiction's donation
// tables (federal top rate net of the Québec abatement + provincial).
// ============================================================
import { t } from '../i18n.js';
import { cleanse } from './util.js';
import CA from '../jurisdictions/ca.js';

// Provincial add-on exploration credits (planning values).
export const PROV_EXPLORATION_CREDIT = { QC: 0.20, BC: 0.20, ON: 0.05, SK: 0.10, MB: 0.30, AB: 0.0, OTHER: 0.0 };
export const METC_RATE = 0.15;

export function provExploration(region) { return PROV_EXPLORATION_CREDIT[region] ?? PROV_EXPLORATION_CREDIT.OTHER; }

/**
 * Combined donation credit rate on gifts above the first tier, for a top-bracket donor:
 * federal highRate/topRate × (1 − Québec abatement) + provincial highRate/topRate.
 * Accepts a jurisdiction object or a region code.
 */
export function donationCreditRate(jurOrRegion, { topBracket = true } = {}) {
  const region = typeof jurOrRegion === 'string' ? jurOrRegion : jurOrRegion?.region;
  const jur = typeof jurOrRegion === 'object' && jurOrRegion ? jurOrRegion : null;
  const fed = (jur && jur.fed && jur.fed.donation) || CA.fed.donation;
  const prov = (jur && jur.regionData && jur.regionData.donation) || (CA.prov[region] && CA.prov[region].donation) || CA.prov.QC.donation;
  const abate = (jur && jur.regionData && jur.regionData.federalAbatement) || (CA.prov[region] && CA.prov[region].federalAbatement) || 0;
  const fedRate = topBracket ? (fed.topRate || fed.highRate) : fed.highRate;
  const provRate = topBracket ? (prov.topRate || prov.highRate) : prov.highRate;
  return fedRate * (1 - abate) + provRate;
}
/** Combined credit rate on the first tier ($200) of donations. */
export function donationLowRate(jurOrRegion) {
  const region = typeof jurOrRegion === 'string' ? jurOrRegion : jurOrRegion?.region;
  const jur = typeof jurOrRegion === 'object' && jurOrRegion ? jurOrRegion : null;
  const fed = (jur && jur.fed && jur.fed.donation) || CA.fed.donation;
  const prov = (jur && jur.regionData && jur.regionData.donation) || (CA.prov[region] && CA.prov[region].donation) || CA.prov.QC.donation;
  const abate = (jur && jur.regionData && jur.regionData.federalAbatement) || (CA.prov[region] && CA.prov[region].federalAbatement) || 0;
  return fed.lowRate * (1 - abate) + prov.lowRate;
}

/**
 * Straight flow-through share INVESTMENT (held, not donated).
 * p = { amount, marginalRate, ceeRate=1.0, metcRate=0.15, provCredit=0, saleValue, capGainsInclusion }
 */
export function flowThroughInvestment(p, jur = null) {
  p = cleanse(p);
  const inclusion = p.capGainsInclusion ?? (jur?.capGainsInclusion ?? 0.5);
  const { amount = 0, marginalRate = 0.5, ceeRate = 1.0, metcRate = METC_RATE, provCredit = 0, saleValue = null } = p;
  const ceeDeduction = amount * ceeRate;
  const ceeSaving = ceeDeduction * marginalRate;
  const metcCredit = amount * (metcRate + provCredit);
  const metcInclusionTax = metcCredit * marginalRate;        // the METC reduces next year's CEE pool (taxable)
  const netMetc = metcCredit - metcInclusionTax;
  const firstYearBenefit = ceeSaving + netMetc;
  const netCostAfterTax = amount - firstYearBenefit;

  const sale = saleValue == null ? amount * 0.85 : saleValue; // ACB = 0
  const capGain = sale;
  const capGainsTax = capGain * inclusion * marginalRate;
  const afterTaxProceeds = sale - capGainsTax;
  const netPosition = afterTaxProceeds - netCostAfterTax;
  const breakEven = (1 - inclusion * marginalRate) !== 0 ? netCostAfterTax / (1 - inclusion * marginalRate) : 0;

  return {
    amount, ceeDeduction, ceeSaving, metcCredit, netMetc, firstYearBenefit,
    netCostAfterTax, effectiveCostPct: amount > 0 ? netCostAfterTax / amount : 0,
    sale, capGain, capGainsTax, afterTaxProceeds, netPosition, breakEven, inclusion,
  };
}

/**
 * Charitable flow-through donation ("PearTree" structure).
 * p = { amount, marginalRate, donationCredit, ceeRate=1.0, metcRate=0.15, provCredit=0, liquidityDiscount=0.12 }
 */
export function peartreeDonation(p, jur = null) {
  p = cleanse(p);
  const inclusion = p.capGainsInclusion ?? (jur?.capGainsInclusion ?? 0.5);
  const { amount = 0, marginalRate = 0.5, ceeRate = 1.0, metcRate = METC_RATE, provCredit = 0, liquidityDiscount = 0.12 } = p;
  const donationCredit = p.donationCredit ?? donationCreditRate(jur || 'QC');
  const ceeSaving = amount * ceeRate * marginalRate;
  const metcCredit = amount * (metcRate + provCredit);
  const netMetc = metcCredit * (1 - marginalRate);
  const donationReceipt = amount;
  const donationSaving = donationReceipt * donationCredit;
  const capGainsAvoided = amount * inclusion * marginalRate;
  const liquidityCost = amount * liquidityDiscount;

  const totalRelief = ceeSaving + netMetc + donationSaving;
  const netCost = amount - totalRelief + liquidityCost;
  const costPerDollar = amount > 0 ? netCost / amount : 0;
  const cashGiftNetCost = amount * (1 - donationCredit);

  return {
    amount, ceeSaving, metcCredit, netMetc, donationSaving, capGainsAvoided, donationCredit,
    liquidityCost, totalRelief, netCost, costPerDollar,
    cashGiftNetCost, advantageVsCash: cashGiftNetCost - netCost,
    note: t('Structure agressive scrutée par l’ARC : exige une émission admissible, une fiducie de bienfaisance et un avis fiscal/juridique. Les chiffres sont illustratifs.',
      'Aggressive structure scrutinized by the CRA: requires a qualifying issuance, a charitable vehicle and tax/legal advice. Figures are illustrative.'),
  };
}
