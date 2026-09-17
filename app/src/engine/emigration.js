// ============================================================
// Emigration / departure tax (Canada-centric) & arrival step-up.
// Ceasing Canadian residency triggers a deemed disposition of most
// property at FMV. Excluded: Canadian real property, RRSP/RRIF,
// pensions, and property of a Canadian business PE.
// Tax is EXACT when `jur` and `otherIncome` are supplied (the deemed
// gain is stacked on the departure-year income through the tax engine).
// ============================================================
import { t } from '../i18n.js';
import { cleanse } from './util.js';
import { computeTax } from './tax.js';

/**
 * p = { portfolioFMV, portfolioACB, realEstateFMV, rrspValue, privateCoFMV,
 *       privateCoACB, marginalRate (full ordinary marginal), otherIncome, age }
 */
export function departureTax(p, jur = null) {
  p = cleanse(p);
  const { portfolioFMV = 0, portfolioACB = 0, realEstateFMV = 0,
    rrspValue = 0, privateCoFMV = 0, privateCoACB = 0, marginalRate = 0.50, otherIncome = null, age = 45 } = p;
  const inclusion = jur && jur.capGainsInclusion != null ? jur.capGainsInclusion : 0.5;

  const portfolioGain = Math.max(0, portfolioFMV - portfolioACB);
  const privateGain = Math.max(0, privateCoFMV - privateCoACB);
  const deemedGain = portfolioGain + privateGain;
  const taxableGain = deemedGain * inclusion;
  let tax, method;
  if (jur && otherIncome != null && Number.isFinite(+otherIncome)) {
    const t0 = computeTax(jur, { ordinary: +otherIncome, withPayroll: false, employment: false, age });
    const t1 = computeTax(jur, { ordinary: +otherIncome, capGains: deemedGain, withPayroll: false, employment: false, age });
    tax = Math.max(0, t1.total - t0.total); method = 'exact';
  } else { tax = taxableGain * marginalRate; method = 'marginal'; }

  const excluded = realEstateFMV + rrspValue;
  return {
    deemedGain, taxableGain, tax, method, inclusion,
    effectiveRateOnGain: deemedGain > 0 ? tax / deemedGain : 0,
    excludedFromDeparture: excluded,
    realEstateFMV, rrspValue,
    canDeferWithSecurity: true,
    note: t('Le départ du Canada déclenche une disposition réputée à la JVM. Les biens immobiliers canadiens, REER/FERR et pensions en sont exclus. On peut reporter le paiement en fournissant une garantie à l’ARC (formulaire T1244).',
      'Leaving Canada triggers a deemed disposition at FMV. Canadian real property, RRSP/RRIF and pensions are excluded. Payment can be deferred by posting security with the CRA (Form T1244).'),
  };
}

/** Arrival in a new country generally steps up the cost base to FMV. */
export function arrivalStepUp(portfolioFMV) {
  return {
    newCostBase: portfolioFMV,
    note: t('À l’arrivée dans un nouveau pays, le coût des biens est généralement réputé être leur JVM (majoration), évitant la double imposition sur les gains antérieurs.',
      'On arrival in a new country, property cost is generally deemed to be FMV (step-up), avoiding double taxation on prior gains.'),
  };
}
