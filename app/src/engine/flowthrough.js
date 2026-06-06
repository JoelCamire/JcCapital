// ============================================================
// Flow-through shares (actions accréditives) & charitable
// flow-through donation ("PearTree" method) — Canadian mining
// exploration tax strategy.
//   CEE (Canadian Exploration Expense) 100% deduction
//   METC (Mineral Exploration Tax Credit) 15% federal + provincial
//   ACB of FTS = $0  -> full proceeds are a capital gain
//   Gift of listed securities -> 0% capital-gains inclusion
// All figures CAD. Rates are parameters so the advisor can tune them.
// ============================================================
import { t } from '../i18n.js';
import { cleanse, fin } from './util.js';

// Reasonable provincial add-on exploration credits (illustrative).
export const PROV_EXPLORATION_CREDIT = { QC: 0.20, BC: 0.20, ON: 0.05, SK: 0.10, MB: 0.30, AB: 0.0, OTHER: 0.0 };
// Approx combined top-bracket charitable donation credit by province.
export const DONATION_CREDIT = { QC: 0.53, ON: 0.5053, BC: 0.4980, AB: 0.50, OTHER: 0.50 };

export function provExploration(region) { return PROV_EXPLORATION_CREDIT[region] ?? PROV_EXPLORATION_CREDIT.OTHER; }
export function donationCreditRate(region) { return DONATION_CREDIT[region] ?? DONATION_CREDIT.OTHER; }

/**
 * Straight flow-through share INVESTMENT (held, not donated).
 * p = { amount, marginalRate, ceeRate=1.0, metcRate=0.15, provCredit=0, saleValue }
 */
export function flowThroughInvestment(p) {
  p = cleanse(p);
  const { amount = 0, marginalRate = 0.5, ceeRate = 1.0, metcRate = 0.15, provCredit = 0, saleValue = null } = p;
  const ceeDeduction = amount * ceeRate;
  const ceeSaving = ceeDeduction * marginalRate;
  const metcCredit = amount * (metcRate + provCredit);
  const metcInclusionTax = metcCredit * marginalRate;        // METC is taxable income next year
  const netMetc = metcCredit - metcInclusionTax;
  const firstYearBenefit = ceeSaving + netMetc;
  const netCostAfterTax = amount - firstYearBenefit;          // out-of-pocket after tax relief

  const sale = saleValue == null ? amount * 0.85 : saleValue; // ACB = 0
  const capGain = sale;                                        // entire proceeds are a gain
  const capGainsTax = capGain * 0.5 * marginalRate;
  const afterTaxProceeds = sale - capGainsTax;
  const netPosition = afterTaxProceeds - netCostAfterTax;
  // break-even sale value where after-tax proceeds recover the net cost
  const breakEven = (1 - 0.5 * marginalRate) !== 0 ? netCostAfterTax / (1 - 0.5 * marginalRate) : 0;

  return {
    amount, ceeDeduction, ceeSaving, metcCredit, netMetc, firstYearBenefit,
    netCostAfterTax, effectiveCostPct: amount > 0 ? netCostAfterTax / amount : 0,
    sale, capGain, capGainsTax, afterTaxProceeds, netPosition, breakEven,
  };
}

/**
 * Charitable flow-through donation ("PearTree" structure):
 * subscribe FTS, immediately donate the listed shares to a charity.
 * Stacks CEE deduction + METC + donation credit + 0% gains inclusion.
 * p = { amount, marginalRate, donationCredit, ceeRate=1.0, metcRate=0.15,
 *       provCredit=0, liquidityDiscount=0.12 }
 */
export function peartreeDonation(p) {
  p = cleanse(p);
  const { amount = 0, marginalRate = 0.5, donationCredit = 0.5, ceeRate = 1.0, metcRate = 0.15, provCredit = 0, liquidityDiscount = 0.12 } = p;
  const ceeSaving = amount * ceeRate * marginalRate;
  const metcCredit = amount * (metcRate + provCredit);
  const netMetc = metcCredit * (1 - marginalRate);
  const donationReceipt = amount;                              // FMV of donated shares
  const donationSaving = donationReceipt * donationCredit;
  // ACB = 0 -> capital gain = amount; gift of listed security => 0% inclusion
  const capGainsAvoided = amount * 0.5 * marginalRate;         // tax avoided vs selling first
  const liquidityCost = amount * liquidityDiscount;            // dealer spread / structuring cost

  const totalRelief = ceeSaving + netMetc + donationSaving;
  const netCost = amount - totalRelief + liquidityCost;
  const costPerDollar = amount > 0 ? netCost / amount : 0;

  // Comparison: simple cash gift of the same amount
  const cashGiftNetCost = amount * (1 - donationCredit);

  return {
    amount, ceeSaving, metcCredit, netMetc, donationSaving, capGainsAvoided,
    liquidityCost, totalRelief, netCost, costPerDollar,
    cashGiftNetCost, advantageVsCash: cashGiftNetCost - netCost,
    note: t('Structure agressive scrutée par l’ARC : exige une émission admissible, une fiducie de bienfaisance et un avis fiscal/juridique. Les chiffres sont illustratifs.',
      'Aggressive structure scrutinized by the CRA: requires a qualifying issuance, a charitable vehicle and tax/legal advice. Figures are illustrative.'),
  };
}
