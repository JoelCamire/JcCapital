// ============================================================
// Government Benefits Engine
// Claiming-age analysis (nominal AND present-value), OAS clawback,
// break-even ages. All rates and age windows come from the
// jurisdiction's pension block (no hard-coded 60/65/70 or 7.2 %).
// ============================================================
import { t } from '../i18n.js';

const fin = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

/** Claim-age window for a pension: [minAge, maxAge]. */
export function claimWindow(pension) {
  const normal = fin(pension?.startAge, 65);
  const minAge = pension?.minAge != null ? pension.minAge : (pension?.early != null ? normal - 5 : normal);
  const maxAge = pension?.maxAge != null ? pension.maxAge : (pension?.defer != null ? normal + 5 : normal);
  return [minAge, maxAge];
}

/**
 * Compute annual benefit (today's $) for a given claim age.
 * pension: { maxAnnual, startAge, early?, defer?, minAge?, maxAge? }
 * base: override the entitlement at the normal age (client-specific), else pension.maxAnnual
 */
export function benefitAtAge(pension, claimAge, base = null) {
  if (!pension) return 0;
  const amount = base != null ? fin(base) : fin(pension.maxAnnual);
  if (amount <= 0) return 0;
  const normalAge = fin(pension.startAge, 65);
  const [minAge, maxAge] = claimWindow(pension);
  const age = Math.max(minAge, Math.min(maxAge, fin(claimAge, normalAge)));
  let factor = 1;
  if (age < normalAge && pension.early != null) factor = 1 + (age - normalAge) * Math.abs(pension.early);   // early reduction per year
  else if (age > normalAge && pension.defer != null) factor = 1 + (age - normalAge) * pension.defer;         // deferral bonus per year
  return amount * Math.max(0, factor);
}

/**
 * Full claiming analysis for a pension across candidate ages.
 * opts: { base (entitlement at normal age), discountRate (real, for PV), indexation (0 = today's $) }
 * Returns { rows:[{age, annual, yearsReceiving, cumulative, presentValue, breakEvenVsNormal}], recommendedAge, recommendedAgePV, normalAge }
 */
export function claimingAnalysis(pension, claimAges, lifeExpectancy, opts = {}) {
  if (!pension || !(fin(opts.base, pension.maxAnnual) > 0)) return { rows: [], recommendedAge: null, recommendedAgePV: null, normalAge: fin(pension?.startAge, 65) };
  const [minAge, maxAge] = claimWindow(pension);
  const normalAge = fin(pension.startAge, 65);
  const ages = [...new Set((claimAges || [minAge, normalAge, maxAge]).map(a => Math.round(fin(a))).filter(a => a >= minAge && a <= maxAge))].sort((a, b) => a - b);
  const le = fin(lifeExpectancy, 90);
  const disc = Math.max(0, fin(opts.discountRate, 0));
  const cumTo = (claimAge, toAge) => { const annual = benefitAtAge(pension, claimAge, opts.base); return annual * Math.max(0, toAge - claimAge); };
  const normalCumAt = (toAge) => cumTo(normalAge, toAge);

  const rows = ages.map(age => {
    const annual = benefitAtAge(pension, age, opts.base);
    const yearsReceiving = Math.max(0, le - age);
    const cumulative = annual * yearsReceiving;
    let presentValue = 0;
    for (let y = 0; y < yearsReceiving; y++) presentValue += annual / Math.pow(1 + disc, (age - Math.min(age, normalAge)) + y);
    // break-even vs claiming at the normal age
    let breakEvenVsNormal = null;
    if (age !== normalAge) {
      for (let a = Math.max(age, normalAge) + 1; a <= 110; a++) {
        const mine = cumTo(age, a), norm = normalCumAt(a);
        if ((age > normalAge && mine >= norm) || (age < normalAge && norm >= mine)) { breakEvenVsNormal = a; break; }
      }
    }
    return { age, annual, yearsReceiving, cumulative, presentValue, breakEvenVsNormal };
  });

  const best = (key) => rows.reduce((b, r) => (b == null || r[key] > b[key]) ? r : b, null);
  return { rows, recommendedAge: best('cumulative')?.age ?? null, recommendedAgePV: best('presentValue')?.age ?? null, normalAge, minAge, maxAge };
}

/**
 * Compute OAS clawback (Canada only) for a given net income.
 * Returns { clawback, net, threshold, fullAt } or null if not applicable.
 */
export function oasClawback(jur, netIncome, oasAnnual = null) {
  if (!jur || !jur.pensions || !jur.pensions.oas) return null;
  const oas = jur.pensions.oas;
  if (!oas.clawbackStart || !oas.clawbackRate) return null;
  const maxOas = oasAnnual != null ? fin(oasAnnual) : fin(oas.maxAnnual);
  const fullAt = oas.clawbackStart + maxOas / oas.clawbackRate;
  const clawback = Math.min(maxOas, Math.max(0, (fin(netIncome) - oas.clawbackStart) * oas.clawbackRate));
  return { clawback, net: Math.max(0, maxOas - clawback), threshold: oas.clawbackStart, fullAt, rate: oas.clawbackRate };
}

/** Cumulative-payout series indexed by age (from startAge to endAge) for the cross-over chart. */
export function buildCumulativeSeries(pension, claimAge, startAge, endAge, base = null) {
  const annual = benefitAtAge(pension, claimAge, base);
  const n = Math.max(0, Math.round(fin(endAge) - fin(startAge)) + 1);
  return Array.from({ length: n }, (_, i) => {
    const age = fin(startAge) + i;
    if (age < claimAge) return 0;
    return annual * (age - claimAge + 1);
  });
}

export const deferralLabel = (pension) => pension?.defer != null ? t(`+${(pension.defer * 100).toFixed(1).replace('.', ',')} % par année de report`, `+${(pension.defer * 100).toFixed(1)} % per year deferred`) : '';
