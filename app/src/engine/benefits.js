// ============================================================
// Government Benefits Engine
// Claiming-age analysis, OAS clawback, break-even calculations
// ============================================================
import { t } from '../i18n.js';

/**
 * Compute annual benefit (today's $) for a given claim age.
 * pension: { maxAnnual, startAge, early?, defer? }
 * claimAge: integer age at which benefits are claimed
 */
export function benefitAtAge(pension, claimAge) {
  if (!pension || pension.maxAnnual == null) return 0;
  const base = pension.maxAnnual;
  const normalAge = pension.startAge || 65;
  let factor = 1;
  if (claimAge < normalAge) {
    // Each year earlier reduces benefit; early is stored as negative (e.g. -0.072)
    const earlyRate = Math.abs(pension.early != null ? pension.early : 0.072);
    factor = 1 + (claimAge - normalAge) * earlyRate; // diff is negative → reduction
  } else if (claimAge > normalAge) {
    const deferRate = pension.defer != null ? pension.defer : 0.07;
    factor = 1 + (claimAge - normalAge) * deferRate;
  }
  factor = Math.max(0.5, factor);
  return base * factor;
}

/**
 * Full claiming analysis for a pension across a range of ages.
 * Returns { rows:[{age, annual, cumulative}], recommendedAge }
 * lifeExpectancy: the member's expected age at death
 */
export function claimingAnalysis(pension, claimAges, lifeExpectancy) {
  if (!pension || pension.maxAnnual == null) {
    return { rows: [], recommendedAge: null };
  }
  const ages = (claimAges || [60, 62, 65, 67, 70]).filter(a => a >= 60 && a <= 70);
  const le = lifeExpectancy || 90;

  const rows = ages.map(age => {
    const annual = benefitAtAge(pension, age);
    const yearsReceiving = Math.max(0, le - age);
    const cumulative = annual * yearsReceiving;
    return { age, annual, cumulative };
  });

  // Recommended age: highest cumulative payout
  let recommendedAge = null;
  let maxCum = -Infinity;
  for (const row of rows) {
    if (row.cumulative > maxCum) {
      maxCum = row.cumulative;
      recommendedAge = row.age;
    }
  }

  return { rows, recommendedAge };
}

/**
 * Compute OAS clawback (Canada only).
 * Returns { clawback, net, threshold, fullAt } or null if not applicable.
 */
export function oasClawback(jur, retirementIncome) {
  if (!jur || !jur.pensions || !jur.pensions.oas) return null;
  const oas = jur.pensions.oas;
  if (!oas.clawbackStart || !oas.clawbackRate) return null;

  const clawbackStart = oas.clawbackStart;
  const clawbackRate = oas.clawbackRate;
  const maxOas = oas.maxAnnual || 0;
  const fullAt = oas.clawbackFull || clawbackStart + maxOas / clawbackRate;

  const clawback = Math.min(maxOas, Math.max(0, (retirementIncome - clawbackStart) * clawbackRate));
  const net = Math.max(0, maxOas - clawback);

  return { clawback, net, threshold: clawbackStart, fullAt };
}

/**
 * Build a cumulative-payout series indexed by age (from startAge to endAge).
 * Used by the view to render the cross-over / break-even line chart.
 *
 * @param {object} pension
 * @param {number} claimAge   age at which benefits are claimed
 * @param {number} startAge   first age on the x-axis (typically member's current age)
 * @param {number} endAge     last age on the x-axis  (lifeExpectancy)
 * @returns {number[]}
 */
export function buildCumulativeSeries(pension, claimAge, startAge, endAge) {
  const annual = benefitAtAge(pension, claimAge);
  return Array.from({ length: endAge - startAge + 1 }, (_, i) => {
    const age = startAge + i;
    if (age < claimAge) return 0;
    return annual * (age - claimAge + 1);
  });
}
