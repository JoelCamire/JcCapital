// ============================================================
// RDSP (Registered Disability Savings Plan) — Canada
//   CDSG (grant, up to 300 % match, $70k lifetime)
//   CDSB (bond, low income, $1,000/yr, $20k lifetime)
//   Requires the Disability Tax Credit (DTC). Grants/bond to age 49.
// Thresholds come from the jurisdiction (ca.js `rdsp`, indexed yearly).
// ============================================================
import { t } from '../i18n.js';
import { cleanse } from './util.js';
import CA from '../jurisdictions/ca.js';

const P = (jur) => (jur && jur.rdsp) || CA.rdsp;
const fin = (v) => (Number.isFinite(+v) ? +v : 0);

/** Annual grant + bond for a given contribution and family net income. */
export function rdspGrantBond(annualContribution, familyIncome, jur = null) {
  const R = P(jur);
  annualContribution = fin(annualContribution); familyIncome = fin(familyIncome);
  let grant = 0;
  if (familyIncome <= R.grantIncomeThreshold) {
    let rem = annualContribution, last = 0;
    for (const tier of R.tiers) { const slice = Math.max(0, Math.min(rem, tier.upTo - last)); grant += slice * tier.match; rem -= slice; last = tier.upTo; }
  } else {
    grant = Math.min(R.lowMatchUpTo, annualContribution) * R.lowMatch;
  }
  let bond = 0;
  if (familyIncome <= R.bondFullThreshold) bond = R.bondAnnual;
  else if (familyIncome < R.bondPhaseout) bond = R.bondAnnual * (1 - (familyIncome - R.bondFullThreshold) / (R.bondPhaseout - R.bondFullThreshold));
  return { grant: Math.round(grant), bond: Math.round(bond) };
}

/** Year-by-year RDSP projection to age 60. */
export function rdspProjection(p, jur = null) {
  const R = P(jur);
  let { beneficiaryAge = 0, annualContribution = 0, familyIncome = 0, growth = 0.05, grantsUsed = 0, bondsUsed = 0 } = cleanse(p);
  growth = Math.max(-0.9, Math.min(0.5, Number(growth) || 0));
  let value = 0, totalGrant = fin(grantsUsed), totalBond = fin(bondsUsed), totalContrib = 0, newGrant = 0, newBond = 0;
  const series = [];
  for (let age = Math.max(0, Math.min(60, Number(beneficiaryAge) || 0)); age <= 60; age++) {
    let g = 0, b = 0, contrib = 0;
    if (age <= R.maxAge) {
      const gb = rdspGrantBond(annualContribution, familyIncome, jur);
      g = Math.max(0, Math.min(gb.grant, R.grantLifetime - totalGrant));
      b = Math.max(0, Math.min(gb.bond, R.bondLifetime - totalBond));
      contrib = annualContribution;
    }
    value = value * (1 + growth) + contrib + g + b;
    totalGrant += g; totalBond += b; totalContrib += contrib; newGrant += g; newBond += b;
    series.push({ age, value, contrib, grant: g, bond: b });
  }
  return {
    series, totalGrant: newGrant, totalBond: newBond, totalContrib, finalValue: value,
    governmentTotal: newGrant + newBond,
    leverage: totalContrib > 0 ? (newGrant + newBond) / totalContrib : 0,
    params: R,
    note: t('Le REEI exige l’admissibilité au crédit d’impôt pour personnes handicapées (CIPH). Subventions et bons sont versés jusqu’à 49 ans, avec report sur 10 ans des droits inutilisés. Les retraits doivent respecter la règle de remboursement (10 ans).',
      'The RDSP requires Disability Tax Credit (DTC) eligibility. Grants and bonds are paid until age 49, with a 10-year carry-forward of unused entitlements. Withdrawals are subject to the 10-year assistance holdback rule.'),
  };
}

export const constants = { GRANT_LIFETIME: CA.rdsp.grantLifetime, BOND_LIFETIME: CA.rdsp.bondLifetime, GRANT_INCOME_THRESHOLD: CA.rdsp.grantIncomeThreshold, BOND_FULL_THRESHOLD: CA.rdsp.bondFullThreshold };
