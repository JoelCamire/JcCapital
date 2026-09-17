// ============================================================
// Net-worth, insurance-needs and education-funding analytics.
// Reads coverage from the unified products[] ledger (policies.js)
// and every planning-policy constant from client.assumptions.
// ============================================================
import { treatmentOf } from './projection.js';
import { getJurisdiction, accountMeta } from '../jurisdictions/index.js';
import { coverageOf } from './policies.js';
import { assumptionsOf } from '../state/models.js';
import { t } from '../i18n.js';

const fin = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

const TREAT_LABEL = () => ({
  deferred: t('Régimes imposables au retrait', 'Taxable-on-withdrawal plans'),
  taxfree: t('Comptes libres d’impôt', 'Tax-free accounts'),
  taxable: t('Placements non enregistrés', 'Non-registered investments'),
  education: t('Épargne-études', 'Education savings'),
  realestate: t('Immobilier', 'Real estate'),
  corporate: t('Société', 'Corporation'),
});

export function netWorthBreakdown(client) {
  const byTreat = {}; const byType = {};
  let assets = 0, cash = 0;
  for (const a of (client.assets || [])) {
    const tr = treatmentOf(a.type); const v = fin(a.value);
    byTreat[tr] = (byTreat[tr] || 0) + v;
    byType[a.type] = (byType[a.type] || 0) + v;
    assets += v; if (a.type === 'cash') cash += v;
  }
  const liabilities = (client.liabilities || []).reduce((s, l) => s + fin(l.balance), 0);
  const liquid = (client.assets || []).filter(a => ['taxable', 'taxfree'].includes(treatmentOf(a.type)))
    .reduce((s, a) => s + fin(a.value), 0);
  return {
    assets, liabilities, netWorth: assets - liabilities, liquid, cash,
    byTreat: Object.entries(byTreat).map(([k, v]) => ({ key: k, label: (TREAT_LABEL()[k] || k), value: v })),
    byType,
    debtToAsset: assets > 0 ? liabilities / assets : 0,
  };
}

/** Capital-needs life insurance analysis for one insured member. */
export function lifeInsuranceNeeds(client, memberId) {
  const A = assumptionsOf(client);
  const member = (client.members || []).find(m => m.id === memberId) || client.members[0];
  const incomeOf = (client.incomes || [])
    .filter(i => (i.memberId === memberId || (i.memberId == null && member === client.members[0])) && (i.type === 'employment' || i.type === 'self'))
    .reduce((s, i) => s + fin(i.amount), 0);
  const yearsToReplace = Math.max(0, Math.min(70, fin(member.retirementAge, 65) - fin(member.currentAge, 40)));
  const replaceRate = A.lifeReplaceRate, disc = A.lifeDiscount;
  let incomeReplacement = 0;
  for (let y = 0; y < yearsToReplace; y++) incomeReplacement += (incomeOf * replaceRate) / Math.pow(1 + disc, y);

  const debt = (client.liabilities || []).reduce((s, l) => s + fin(l.balance), 0);
  const finalExpenses = A.finalExpenses;
  const respBalance = (client.assets || []).filter(a => treatmentOf(a.type) === 'education').reduce((s, a) => s + fin(a.value), 0);
  const education = Math.max(0, (client.goals || []).filter(g => g.type === 'education').reduce((s, g) => s + fin(g.amount), 0) - respBalance);
  const liquidAssets = (client.assets || [])
    .filter(a => ['taxable', 'taxfree', 'deferred'].includes(treatmentOf(a.type)))
    .reduce((s, a) => s + fin(a.value), 0);
  const existingCoverage = coverageOf(client, memberId, 'life');

  const gross = incomeReplacement + debt + finalExpenses + education;
  const need = Math.max(0, gross - liquidAssets);
  return {
    member, incomeOf, yearsToReplace, replaceRate, incomeReplacement, debt, finalExpenses, education,
    liquidAssets, gross, need, existingCoverage,
    gap: Math.max(0, need - existingCoverage),
    surplus: Math.max(0, existingCoverage - need),
  };
}

/**
 * Required level monthly saving to hit an education goal, with an exact
 * year-by-year simulation of government grants (CESG + provincial top-up)
 * including their annual and lifetime caps, and the existing RESP balance.
 * goal: { amount (target at start of studies, today's or nominal $), targetAge, dependentId?, name }
 */
export function educationFunding(client, goal, opts = {}) {
  const A = assumptionsOf(client);
  const jur = getJurisdiction(client.jurisdiction?.country, client.jurisdiction?.region);
  const r = fin(opts.returnRate, A.preReturn);
  const deps = client.dependents || [];
  // which child? explicit id, else name match, else the youngest
  let dep = deps.find(d => d.id === goal.dependentId) || deps.find(d => goal.name && d.name && goal.name.includes(d.name)) || null;
  if (!dep && deps.length) dep = deps.reduce((y, d) => fin(d.age) < fin(y.age) ? d : y, deps[0]);
  const years = Math.max(1, fin(opts.years, dep ? fin(dep.educationGoalAge, 18) - fin(dep.age) : fin(goal.targetAge, 18) - 8));
  const respMeta = accountMeta(jur.country, jur.country === 'CA' ? 'resp' : jur.country === 'US' ? '529' : 'jisa');
  const prov = jur.regionData?.resp || null;
  const grantRate = fin(respMeta.grant), grantMax = fin(respMeta.grantMax), grantLifetime = fin(respMeta.grantLifetime, Infinity);
  const provRate = fin(prov?.grant), provMax = fin(prov?.grantMax), provLifetime = fin(prov?.grantLifetime, Infinity);
  const respTotal = (client.assets || []).filter(a => treatmentOf(a.type) === 'education').reduce((s, a) => s + fin(a.value), 0);
  const existing = fin(opts.existing, deps.length ? respTotal / deps.length : respTotal);
  const grantsUsed = fin(opts.grantsUsed, 0);
  const target = fin(goal.amount);

  // simulate: annual contribution c, grants credited yearly, growth at r
  const simulate = (c) => {
    let v = existing, fed = grantsUsed, pr = 0, gTot = 0;
    for (let y = 0; y < years; y++) {
      const g1 = Math.min(grantMax || Infinity, c * grantRate, Math.max(0, grantLifetime - fed));
      const g2 = Math.min(provMax || Infinity, c * provRate, Math.max(0, provLifetime - pr));
      fed += g1; pr += g2; gTot += g1 + g2;
      v = v * (1 + r) + c + g1 + g2;
    }
    return { value: v, grants: gTot };
  };
  let annual = 0;
  if (simulate(0).value < target) {
    let lo = 0, hi = Math.max(1000, target);
    for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (simulate(mid).value < target) lo = mid; else hi = mid; if (hi - lo < 0.5) break; }
    annual = hi;
  }
  const sim = simulate(annual);
  return { target, years, dependent: dep, annual, monthly: annual / 12, grantRate, provRate, existing, projectedGrants: sim.grants, projectedValue: sim.value, returnRate: r };
}

/** Disability income-protection quick check (coverage stored as ANNUAL benefit). */
export function disabilityNeeds(client, memberId) {
  const A = assumptionsOf(client);
  const member = (client.members || []).find(m => m.id === memberId) || client.members[0];
  const income = (client.incomes || [])
    .filter(i => (i.memberId === memberId || (i.memberId == null && member === client.members[0])) && (i.type === 'employment' || i.type === 'self'))
    .reduce((s, i) => s + fin(i.amount), 0);
  const monthlyNeed = income * A.diReplaceRate / 12;
  const existing = coverageOf(client, memberId, 'di') / 12;
  return { income, replaceRate: A.diReplaceRate, monthlyNeed, existingMonthly: existing, gap: Math.max(0, monthlyNeed - existing) };
}
