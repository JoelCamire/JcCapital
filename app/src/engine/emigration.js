// ============================================================
// Emigration / departure tax (Canada-centric) & arrival step-up.
// Ceasing Canadian residency triggers a deemed disposition of most
// property at FMV. Excluded: Canadian real property, RRSP/RRIF,
// pensions, and property of a Canadian business PE.
// ============================================================
import { t } from '../i18n.js';
import { cleanse, fin } from './util.js';

/**
 * p = { portfolioFMV, portfolioACB, realEstateFMV, rrspValue, privateCoFMV,
 *       privateCoACB, marginalRate }
 */
export function departureTax(p) {
  p = cleanse(p);
  const { portfolioFMV = 0, portfolioACB = 0, realEstateFMV = 0,
    rrspValue = 0, privateCoFMV = 0, privateCoACB = 0, marginalRate = 0.26 } = p;

  // Deemed disposition applies to non-registered portfolio and private shares.
  const portfolioGain = Math.max(0, portfolioFMV - portfolioACB);
  const privateGain = Math.max(0, privateCoFMV - privateCoACB);
  const deemedGain = portfolioGain + privateGain;
  const taxableGain = deemedGain * 0.5;                       // 50% inclusion
  const tax = taxableGain * marginalRate;                     // tax on the deemed gain

  const excluded = realEstateFMV + rrspValue;                 // not subject to departure tax
  return {
    deemedGain, taxableGain, tax,
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
