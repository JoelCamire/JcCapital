// ============================================================
// RDSP (Registered Disability Savings Plan) — Canada
//   CDSG (grant, up to 300% match, $70k lifetime)
//   CDSB (bond, low income, $1,000/yr, $20k lifetime)
//   Requires the Disability Tax Credit (DTC). Grants/bond to age 49.
// 2025 income thresholds (approx).
// ============================================================
import { t } from '../i18n.js';
import { cleanse } from './util.js';

const GRANT_INCOME_THRESHOLD = 111733;   // above -> 100% match on first $1,000 only
const BOND_FULL_THRESHOLD = 36502;       // at/below -> full $1,000 bond
const BOND_PHASEOUT = 58249;             // above -> no bond
const GRANT_LIFETIME = 70000;
const BOND_LIFETIME = 20000;

/** Annual grant + bond for a given contribution and family net income. */
export function rdspGrantBond(annualContribution, familyIncome) {
  annualContribution = Number.isFinite(+annualContribution) ? +annualContribution : 0;
  familyIncome = Number.isFinite(+familyIncome) ? +familyIncome : 0;
  let grant = 0;
  if (familyIncome <= GRANT_INCOME_THRESHOLD) {
    // 300% on first $500, 200% on next $1,000
    grant = Math.min(500, annualContribution) * 3
      + Math.max(0, Math.min(1000, annualContribution - 500)) * 2;
  } else {
    grant = Math.min(1000, annualContribution) * 1; // 100% on first $1,000
  }
  let bond = 0;
  if (familyIncome <= BOND_FULL_THRESHOLD) bond = 1000;
  else if (familyIncome < BOND_PHASEOUT) bond = 1000 * (1 - (familyIncome - BOND_FULL_THRESHOLD) / (BOND_PHASEOUT - BOND_FULL_THRESHOLD));
  return { grant: Math.round(grant), bond: Math.round(bond) };
}

/** Year-by-year RDSP projection to age 60. */
export function rdspProjection(p) {
  let { beneficiaryAge = 0, annualContribution = 0, familyIncome = 0, growth = 0.05 } = cleanse(p);
  growth = Math.max(-0.9, Math.min(0.5, Number(growth) || 0));
  let value = 0, totalGrant = 0, totalBond = 0, totalContrib = 0;
  const series = [];
  for (let age = Math.max(0, Math.min(60, Number(beneficiaryAge) || 0)); age <= 60; age++) {
    let g = 0, b = 0, contrib = 0;
    if (age <= 49) {
      const gb = rdspGrantBond(annualContribution, familyIncome);
      g = Math.min(gb.grant, GRANT_LIFETIME - totalGrant);
      b = Math.min(gb.bond, BOND_LIFETIME - totalBond);
      contrib = annualContribution;
    }
    value = value * (1 + growth) + contrib + g + b;
    totalGrant += g; totalBond += b; totalContrib += contrib;
    series.push({ age, value, contrib, grant: g, bond: b });
  }
  return {
    series, totalGrant, totalBond, totalContrib, finalValue: value,
    governmentTotal: totalGrant + totalBond,
    leverage: totalContrib > 0 ? (totalGrant + totalBond) / totalContrib : 0,
    note: t('Le REEI exige l’admissibilité au crédit d’impôt pour personnes handicapées (CIPH). Subventions et bons sont versés jusqu’à 49 ans, avec report sur 10 ans des droits inutilisés. Les retraits doivent respecter la règle de remboursement (10 ans).',
      'The RDSP requires Disability Tax Credit (DTC) eligibility. Grants and bonds are paid until age 49, with a 10-year carry-forward of unused entitlements. Withdrawals are subject to the 10-year assistance holdback rule.'),
  };
}

export const constants = { GRANT_LIFETIME, BOND_LIFETIME, GRANT_INCOME_THRESHOLD, BOND_FULL_THRESHOLD };
