// ============================================================
// Goal suggestion engine — analyses the complete client profile
// (people, dependents, accounts, debts, insurance, documents) and
// proposes personalized, prioritized goals with a rationale.
// Limits come from the jurisdiction; policy constants from assumptions.
// ============================================================
import { t } from '../i18n.js';
import { treatmentOf } from './projection.js';
import { lifeInsuranceNeeds, disabilityNeeds } from './analysis.js';
import { accountTypesFor, accountMeta } from '../jurisdictions/index.js';
import { clientFacts } from './facts.js';

const has = (arr, fn) => (arr || []).some(fn);
const fin = (v) => (Number.isFinite(+v) ? +v : 0);

export function suggestGoals(client, jur) {
  const S = [];
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const A = F.assumptions;
  const annualExpenses = F.household.expenses;
  const employmentIncome = F.household.employmentIncome;
  const cash = F.cash;
  const primary = client.members[0];
  const pAge = fin(primary?.currentAge) || 40;
  const pRet = fin(primary?.retirementAge) || 65;
  const labels = jur.labels;
  const push = (o) => S.push({ priority: 'medium', addable: true, icon: 'goals', ...o });

  // 1) Emergency fund
  const targetEmergency = Math.round(annualExpenses / 12 * Math.max(A.emergencyMonths, 3) * 1.5);
  if (cash < annualExpenses / 12 * A.emergencyMonths) {
    push({ key: 'emergency', type: 'other', icon: 'cashflow', priority: 'high',
      name: t('Fonds d’urgence', 'Emergency fund'), amount: targetEmergency, targetAge: pAge + 2,
      rationale: t(`Vous détenez peu d’encaisse. Visez ${A.emergencyMonths} à ${Math.round(A.emergencyMonths * 2)} mois de dépenses (~${money(targetEmergency, cur)}) en liquidités accessibles.`,
        `You hold little cash. Aim for ${A.emergencyMonths}–${Math.round(A.emergencyMonths * 2)} months of expenses (~${money(targetEmergency, cur)}) in accessible savings.`) });
  }

  // 2) Education per dependent
  for (const d of (client.dependents || [])) {
    const age = fin(d.age);
    if (age >= 18) continue;
    const already = has(client.goals, g => g.type === 'education' && (g.name || '').includes(d.name));
    if (already) continue;
    const yearsTo = Math.max(1, (d.educationGoalAge || 18) - age);
    push({ key: 'edu-' + d.id, type: 'education', icon: 'goals', priority: 'high',
      name: t(`Études — ${d.name}`, `Education — ${d.name}`), amount: 80000, targetAge: d.educationGoalAge || 18, dependentId: d.id,
      rationale: t(`${d.name} a ${age} ans. Ouvrir/alimenter un ${labels.education} capte la subvention gouvernementale et lisse l’épargne sur ${yearsTo} ans.`,
        `${d.name} is ${age}. Funding a ${labels.education} now captures government grants and spreads saving over ${yearsTo} years.`) });
  }

  // 3) Maximize tax-free account
  const taxFreeContrib = F.household.contributionsByTreatment.taxfree || 0;
  const tfMeta = accountTypesFor(client.jurisdiction.country).find(a => treatmentOf(a.id) === 'taxfree');
  if (tfMeta && taxFreeContrib < (tfMeta.limit || 7000) * 0.5) {
    push({ key: 'maxtaxfree', type: 'other', icon: 'networth', priority: 'high',
      name: t(`Maximiser le ${labels.taxFree}`, `Maximize ${labels.taxFree}`), amount: (tfMeta.limit || 7000), targetAge: pAge + 1,
      rationale: t(`Le ${labels.taxFree} offre une croissance et des retraits libres d’impôt. Vos cotisations actuelles sont sous la limite annuelle de ${money(tfMeta.limit || 7000, cur)}.`,
        `The ${labels.taxFree} offers tax-free growth and withdrawals. Your contributions are below the ${money(tfMeta.limit || 7000, cur)} annual limit.`) });
  }

  // 4) Maximize tax-advantaged retirement account (room from the jurisdiction)
  const deferredContrib = F.household.contributionsByTreatment.deferred || 0;
  const room = F.members.reduce((s, m) => s + m.rrspRoom, 0);
  if (employmentIncome > 0 && deferredContrib < room * 0.6) {
    push({ key: 'maxdeferred', type: 'other', icon: 'tax', priority: 'medium',
      name: t(`Optimiser le ${labels.taxAdvantaged}`, `Optimize ${labels.taxAdvantaged}`), amount: Math.round(room), targetAge: pRet,
      rationale: t(`Vous avez des droits de cotisation inutilisés (~${money(room, cur)}/an). Cotiser réduit l’impôt courant et accélère l’accumulation.`,
        `You have unused contribution room (~${money(room, cur)}/yr). Contributing lowers current tax and accelerates accumulation.`) });
  }

  // 5) High-interest debt payoff
  const badDebt = (client.liabilities || []).filter(l => fin(l.rate) > 0.06);
  if (badDebt.length) {
    const tot = badDebt.reduce((s, l) => s + fin(l.balance), 0);
    push({ key: 'debt', type: 'other', icon: 'cashflow', priority: 'high',
      name: t('Rembourser les dettes à intérêt élevé', 'Pay off high-interest debt'), amount: Math.round(tot), targetAge: pAge + 4,
      rationale: t(`${money(tot, cur)} de dettes à plus de 6 %. Les rembourser offre un rendement garanti supérieur à la plupart des placements.`,
        `${money(tot, cur)} of debt above 6 %. Paying it down is a guaranteed return that beats most investments.`) });
  }

  // 6) Mortgage-free by retirement
  const mortgage = F.mortgage;
  if (mortgage && !has(client.goals, g => /hypoth|mortgage/i.test(g.name))) {
    const payoffAge = Number.isFinite(mortgage.payoffYears) ? Math.round(pAge + mortgage.payoffYears) : null;
    push({ key: 'mortgage', type: 'other', icon: 'estate', priority: payoffAge && payoffAge > pRet ? 'high' : 'medium',
      name: t('Libérer l’hypothèque avant la retraite', 'Mortgage-free by retirement'), amount: Math.round(fin(mortgage.balance)), targetAge: pRet,
      rationale: payoffAge
        ? t(`Au rythme actuel, l’hypothèque sera remboursée vers ${payoffAge} ans (retraite prévue à ${pRet} ans). Éliminer l’hypothèque avant la retraite réduit fortement le revenu requis.`, `At the current pace the mortgage is paid off around age ${payoffAge} (retirement planned at ${pRet}). Clearing it before retirement sharply lowers required income.`)
        : t('Éliminer l’hypothèque avant la retraite réduit fortement le revenu requis et le risque de séquence des rendements.', 'Clearing the mortgage before retirement sharply lowers required income and sequence-of-returns risk.') });
  }

  // 7) Retirement income goal
  if (!has(client.goals, g => g.type === 'retirement')) {
    const target = Math.round(employmentIncome * 0.7);
    push({ key: 'retirement', type: 'retirement', icon: 'retire', priority: 'high',
      name: t('Revenu de retraite cible', 'Target retirement income'), amount: target, targetAge: pRet,
      rationale: t(`Définir un revenu de retraite cible (~70 % du revenu actuel, soit ${money(target, cur)}/an) ancre toute la planification.`,
        `Setting a target retirement income (~70 % of current income, i.e. ${money(target, cur)}/yr) anchors the whole plan.`) });
  }

  // 8) Estate documents
  const hasWill = has(client.documents, d => d.type === 'will' && d.status === 'done');
  if (!hasWill) {
    push({ key: 'will', type: 'estate', icon: 'estate', priority: 'high',
      name: t('Mettre à jour le testament et les mandats', 'Update will & mandates'), amount: 0, targetAge: pAge + 1,
      rationale: t('Aucun testament à jour au dossier. Un testament, un mandat de protection et des procurations protègent la famille et accélèrent la succession.',
        'No up-to-date will on file. A will, protection mandate and powers of attorney protect the family and speed up the estate.') });
  }

  // 9) Life insurance gap
  for (const m of client.members) {
    const n = lifeInsuranceNeeds(client, m.id);
    if (n.gap > 25000) {
      push({ key: 'life-' + m.id, type: 'other', icon: 'insurance', priority: 'high',
        name: t(`Combler l’assurance vie — ${m.name}`, `Close life insurance gap — ${m.name}`), amount: Math.round(n.gap), targetAge: fin(m.currentAge) + 1,
        rationale: t(`Besoin estimé de ${money(n.need, cur)} contre ${money(n.existingCoverage, cur)} en vigueur : un manque de ${money(n.gap, cur)}.`,
          `Estimated need of ${money(n.need, cur)} vs ${money(n.existingCoverage, cur)} in force: a ${money(n.gap, cur)} gap.`) });
      break;
    }
  }

  // 10) Disability protection
  for (const m of client.members) {
    const di = disabilityNeeds(client, m.id);
    if (di.gap > 500 && di.income > 0) {
      push({ key: 'di-' + m.id, type: 'other', icon: 'insurance', priority: 'medium',
        name: t(`Protection invalidité — ${m.name}`, `Disability protection — ${m.name}`), amount: Math.round(di.gap * 12), targetAge: fin(m.currentAge) + 1,
        rationale: t(`La couverture invalidité de ${m.name} laisse un manque d’environ ${money(di.gap, cur)}/mois de revenu protégé.`,
          `${m.name}'s disability coverage leaves a gap of about ${money(di.gap, cur)}/month of protected income.`) });
      break;
    }
  }

  // 11) First home (FHSA) for young renters
  const ownsHome = client.assets.some(a => a.type === 'realestate');
  if (!ownsHome && pAge < 45) {
    const fhsa = accountMeta(client.jurisdiction.country, 'fhsa');
    push({ key: 'firsthome', type: 'purchase', icon: 'estate', priority: 'medium',
      name: t('Mise de fonds — première propriété', 'Down payment — first home'), amount: 80000, targetAge: Math.min(pAge + 7, 45),
      rationale: t(client.jurisdiction.country === 'CA' ? `Le CELIAPP (${money(fhsa.limit || 8000, cur)}/an, ${money(fhsa.lifetime || 40000, cur)} à vie) combine déduction à la cotisation et retrait libre d’impôt pour une première propriété.` : 'Une épargne dédiée à la première propriété peut être très efficace fiscalement.',
        client.jurisdiction.country === 'CA' ? `The FHSA (${money(fhsa.limit || 8000, cur)}/yr, ${money(fhsa.lifetime || 40000, cur)} lifetime) combines a contribution deduction with a tax-free withdrawal for a first home.` : 'Dedicated first-home savings can be highly tax-efficient.') });
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return S.sort((x, y) => rank[x.priority] - rank[y.priority]);
}

function money(v, cur) {
  const s = (cur === 'GBP') ? '£' : (cur === 'EUR') ? '€' : '$';
  return s + Math.round(v).toLocaleString(t('fr-CA', 'en-CA'));
}
