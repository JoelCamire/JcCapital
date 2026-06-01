// ============================================================
// Net-worth, insurance-needs and education-funding analytics
// ============================================================
import { treatmentOf } from './projection.js';
import { getJurisdiction } from '../jurisdictions/index.js';

const TREAT_LABEL = {
  deferred: 'Régimes immobilisés / imposables au retrait',
  taxfree: 'Comptes libres d’impôt',
  taxable: 'Placements non enregistrés',
  education: 'Épargne-études',
  realestate: 'Immobilier',
  corporate: 'Société',
};

export function netWorthBreakdown(client) {
  const byTreat = {}; const byType = {};
  let assets = 0;
  for (const a of client.assets) {
    const t = treatmentOf(a.type);
    byTreat[t] = (byTreat[t] || 0) + a.value;
    byType[a.type] = (byType[a.type] || 0) + a.value;
    assets += a.value;
  }
  const liabilities = client.liabilities.reduce((s, l) => s + l.balance, 0);
  const liquid = client.assets.filter(a => ['taxable', 'taxfree'].includes(treatmentOf(a.type)))
    .reduce((s, a) => s + a.value, 0);
  return {
    assets, liabilities, netWorth: assets - liabilities, liquid,
    byTreat: Object.entries(byTreat).map(([k, v]) => ({ key: k, label: TREAT_LABEL[k] || k, value: v })),
    byType,
    debtToAsset: assets > 0 ? liabilities / assets : 0,
  };
}

/** Capital-needs life insurance analysis for one insured member. */
export function lifeInsuranceNeeds(client, memberId) {
  const A = client.assumptions;
  const member = client.members.find(m => m.id === memberId) || client.members[0];
  const incomeOf = client.incomes
    .filter(i => i.memberId === memberId && (i.type === 'employment' || i.type === 'self'))
    .reduce((s, i) => s + i.amount, 0);
  const yearsToReplace = Math.max(0, member.retirementAge - member.currentAge);
  // Income replacement (after-tax ~70 %), present-valued at a 3 % real discount
  const replaceRate = 0.7, disc = 0.03;
  let incomeReplacement = 0;
  for (let y = 0; y < yearsToReplace; y++) incomeReplacement += (incomeOf * replaceRate) / Math.pow(1 + disc, y);

  const debt = client.liabilities.reduce((s, l) => s + l.balance, 0);
  const finalExpenses = 25000;
  const education = client.goals.filter(g => g.type === 'education').reduce((s, g) => s + g.amount, 0);
  const liquidAssets = client.assets
    .filter(a => ['taxable', 'taxfree', 'deferred'].includes(treatmentOf(a.type)))
    .reduce((s, a) => s + a.value, 0);
  const existingCoverage = client.insurance
    .filter(i => i.type === 'life' && i.insuredId === memberId)
    .reduce((s, i) => s + i.coverage, 0);

  const gross = incomeReplacement + debt + finalExpenses + education;
  const need = Math.max(0, gross - liquidAssets);
  return {
    member, incomeOf, incomeReplacement, debt, finalExpenses, education,
    liquidAssets, gross, need, existingCoverage,
    gap: Math.max(0, need - existingCoverage),
    surplus: Math.max(0, existingCoverage - need),
  };
}

/** Required level monthly saving to hit an education goal. */
export function educationFunding(client, goal) {
  const A = client.assumptions;
  const r = (client.jurisdiction.country === 'CA' ? 0.058 : 0.06);
  const grantRate = client.jurisdiction.country === 'CA' ? 0.20 : 0; // CESG-style top-up
  const years = Math.max(1, goal.targetAge - 0);
  const months = years * 12, mr = r / 12;
  // future value target funded partly by grants
  const target = goal.amount;
  const pmt = target * mr / (Math.pow(1 + mr, months) - 1);
  const netPmt = pmt / (1 + grantRate);
  return { target, years, monthly: netPmt, grantRate, annual: netPmt * 12 };
}

/** Disability income-protection quick check. */
export function disabilityNeeds(client, memberId) {
  const income = client.incomes
    .filter(i => i.memberId === memberId && (i.type === 'employment' || i.type === 'self'))
    .reduce((s, i) => s + i.amount, 0);
  const monthlyNeed = income * 0.65 / 12;
  const existing = client.insurance.filter(i => i.type === 'di' && i.insuredId === memberId)
    .reduce((s, i) => s + i.coverage, 0) / 12;
  return { income, monthlyNeed, existingMonthly: existing, gap: Math.max(0, monthlyNeed - existing) };
}
