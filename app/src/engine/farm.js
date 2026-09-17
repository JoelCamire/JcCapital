// ============================================================
// Farm / agricultural planning (Canada).
//   QFFP lifetime capital gains exemption, intergenerational
//   rollover (s.73(3)/70(9)), AgriInvest matching, quota.
//   Illustrative modelling — requires an ag-tax specialist.
// ============================================================
import { computeTax } from './tax.js';
import { cleanse } from './util.js';
import { t } from '../i18n.js';
import CA from '../jurisdictions/ca.js';

/** Qualified farm/fishing property LCGE — same indexed amount as the QSBC exemption, from the jurisdiction. */
const qffpLcge = (jur) => (jur && jur.corporate && jur.corporate.lcge) || CA.corporate.lcge;

/**
 * Sale of the farm vs intergenerational rollover to a child.
 * p = { landFMV, landACB, quotaFMV, quotaACB, buildingsFMV, owners,
 *       marginalRate, otherIncome }
 */
export function farmTransfer(jur, p) {
  p = cleanse(p);
  const { landFMV = 2000000, landACB = 300000, quotaFMV = 800000, quotaACB = 0,
    buildingsFMV = 400000, buildingsACB = 200000, owners = 1, otherIncome = 60000 } = p;

  const landGain = Math.max(0, landFMV - landACB);
  const quotaGain = Math.max(0, quotaFMV - quotaACB);        // quota = class 14.1 / ECP
  const buildingGain = Math.max(0, buildingsFMV - buildingsACB);
  const totalGain = landGain + quotaGain + buildingGain;
  const QFFP_LCGE = qffpLcge(jur);
  const age = Number.isFinite(+p.age) ? +p.age : 55;

  // ---- Option A: arm's-length SALE, using QFFP LCGE (per owner) ----
  const n = Math.max(1, owners);
  const lcgeTotal = QFFP_LCGE * n;
  const exempt = Math.min(totalGain, lcgeTotal);
  const taxableGain = totalGain - exempt;
  const perOwnerTax = (g) => { const t0 = computeTax(jur, { ordinary: otherIncome, withPayroll: false, employment: false, age }); const t1 = computeTax(jur, { ordinary: otherIncome, capGains: g / n, withPayroll: false, employment: false, age }); return Math.max(0, t1.total - t0.total) * n; };
  const taxOnSale = perOwnerTax(taxableGain);
  const proceeds = landFMV + quotaFMV + buildingsFMV;
  const netSale = proceeds - taxOnSale;

  // Tax if NO exemption claimed (for comparison)
  const taxNoLcge = perOwnerTax(totalGain);

  // ---- Option B: intergenerational ROLLOVER to a child at cost (tax-deferred) ----
  // Transfer at an elected amount between ACB and FMV; default = ACB -> $0 tax now.
  const rolloverTaxNow = 0;
  const deferredGain = totalGain;

  return {
    landGain, quotaGain, buildingGain, totalGain,
    lcge: QFFP_LCGE, owners, lcgeTotal, exempt, taxableGain,
    taxOnSale, taxNoLcge, lcgeSaving: taxNoLcge - taxOnSale, proceeds, netSale,
    rolloverTaxNow, deferredGain,
    note: t('Les biens agricoles admissibles bénéficient de l’EGC (≈ 1,25 M$/personne) ET d’un roulement aux enfants au coût, reportant tout l’impôt — un avantage unique à l’agriculture. Le choix entre vendre (et utiliser l’EGC) ou rouler dépend de la relève et des liquidités.',
      'Qualified farm property gets the LCGE (≈ $1.25M/person) AND a tax-deferred rollover to a child at cost — an advantage unique to farming. Choosing to sell (using the LCGE) vs roll over depends on succession and liquidity.'),
  };
}

/** AgriInvest: producer deposits up to 1% of Allowable Net Sales, matched by govt. */
export function agriInvest(p) {
  p = cleanse(p);
  const { netSales = 500000, depositRate = 0.01 } = p;
  const maxDeposit = netSales * Math.min(0.01, depositRate);
  const govMatch = maxDeposit;                                // ~100% match (Fund 2)
  return { netSales, maxDeposit, govMatch, totalToAccount: maxDeposit + govMatch };
}

/** Cash vs accrual: farmers may use cash accounting to smooth/defer income. */
export function cashVsAccrual(p) {
  p = cleanse(p);
  const { accrualIncome = 120000, deferrableInventory = 40000 } = p;
  // Cash basis lets a farmer defer income tied to unsold inventory / prepay expenses.
  const cashIncome = Math.max(0, accrualIncome - deferrableInventory);
  return { accrualIncome, cashIncome, deferred: accrualIncome - cashIncome };
}
