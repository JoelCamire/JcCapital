// ============================================================
// Goal suggestion engine — analyses the complete client profile
// (people, dependents, accounts, debts, insurance, documents) and
// proposes personalized, prioritized goals with a rationale.
// ============================================================
import { t } from '../i18n.js';
import { treatmentOf } from './projection.js';
import { lifeInsuranceNeeds, disabilityNeeds } from './analysis.js';
import { accountTypesFor } from '../jurisdictions/index.js';

const has = (arr, fn) => (arr || []).some(fn);

export function suggestGoals(client, jur) {
  const S = [];
  const cur = jur.currency;
  const annualExpenses = client.expenses.reduce((s, e) => s + e.amount, 0);
  const employmentIncome = client.incomes.filter(i => ['employment', 'self'].includes(i.type)).reduce((s, i) => s + i.amount, 0);
  const cash = client.assets.filter(a => a.type === 'cash').reduce((s, a) => s + a.value, 0);
  const primary = client.members[0];
  const labels = jur.labels;

  const push = (o) => S.push({ priority: 'medium', addable: true, icon: 'goals', ...o });

  // 1) Emergency fund (3–6 months)
  const targetEmergency = Math.round(annualExpenses / 2);
  if (cash < annualExpenses / 4) {
    push({ key: 'emergency', type: 'other', icon: 'cashflow', priority: 'high',
      name: t('Fonds d’urgence', 'Emergency fund'), amount: targetEmergency, targetAge: primary.currentAge + 2,
      rationale: t(`Vous détenez peu d’encaisse. Visez 3 à 6 mois de dépenses (~${money(targetEmergency, cur)}) en liquidités accessibles.`,
        `You hold little cash. Aim for 3–6 months of expenses (~${money(targetEmergency, cur)}) in accessible savings.`) });
  }

  // 2) Education per dependent
  for (const d of (client.dependents || [])) {
    const age = d.age || 0;
    if (age >= 18) continue;
    const already = has(client.goals, g => g.type === 'education' && (g.name || '').includes(d.name));
    if (already) continue;
    const yearsTo = Math.max(1, (d.educationGoalAge || 18) - age);
    push({ key: 'edu-' + d.id, type: 'education', icon: 'goals', priority: 'high',
      name: t(`Études — ${d.name}`, `Education — ${d.name}`), amount: 80000, targetAge: d.educationGoalAge || 18,
      rationale: t(`${d.name} a ${age} ans. Ouvrir/alimenter un ${labels.education} capte la subvention gouvernementale et lisse l’épargne sur ${yearsTo} ans.`,
        `${d.name} is ${age}. Funding a ${labels.education} now captures government grants and spreads saving over ${yearsTo} years.`) });
  }

  // 3) Maximize tax-free account
  const taxFreeContrib = client.assets.filter(a => treatmentOf(a.type) === 'taxfree').reduce((s, a) => s + (a.annualContribution || 0), 0);
  const tfMeta = accountTypesFor(client.jurisdiction.country).find(a => treatmentOf(a.id) === 'taxfree');
  if (tfMeta && taxFreeContrib < (tfMeta.limit || 7000) * 0.5) {
    push({ key: 'maxtaxfree', type: 'other', icon: 'networth', priority: 'high',
      name: t(`Maximiser le ${labels.taxFree}`, `Maximize ${labels.taxFree}`), amount: (tfMeta.limit || 7000), targetAge: primary.currentAge + 1,
      rationale: t(`Le ${labels.taxFree} offre une croissance et des retraits libres d’impôt. Vos cotisations actuelles sont sous la limite annuelle de ${money(tfMeta.limit || 7000, cur)}.`,
        `The ${labels.taxFree} offers tax-free growth and withdrawals. Your contributions are below the ${money(tfMeta.limit || 7000, cur)} annual limit.`) });
  }

  // 4) Maximize tax-advantaged retirement account (room)
  const deferredContrib = client.assets.filter(a => treatmentOf(a.type) === 'deferred').reduce((s, a) => s + (a.annualContribution || 0), 0);
  const room = client.jurisdiction.country === 'CA' ? Math.min(employmentIncome * 0.18, 32490) : (client.jurisdiction.country === 'US' ? 23500 : 60000);
  if (employmentIncome > 0 && deferredContrib < room * 0.6) {
    push({ key: 'maxdeferred', type: 'other', icon: 'tax', priority: 'medium',
      name: t(`Optimiser le ${labels.taxAdvantaged}`, `Optimize ${labels.taxAdvantaged}`), amount: Math.round(room), targetAge: primary.retirementAge,
      rationale: t(`Vous avez des droits de cotisation inutilisés (~${money(room, cur)}/an). Cotiser réduit l’impôt courant et accélère l’accumulation.`,
        `You have unused contribution room (~${money(room, cur)}/yr). Contributing lowers current tax and accelerates accumulation.`) });
  }

  // 5) High-interest debt payoff
  const badDebt = client.liabilities.filter(l => l.rate > 0.06);
  if (badDebt.length) {
    const tot = badDebt.reduce((s, l) => s + l.balance, 0);
    push({ key: 'debt', type: 'other', icon: 'cashflow', priority: 'high',
      name: t('Rembourser les dettes à intérêt élevé', 'Pay off high-interest debt'), amount: Math.round(tot), targetAge: primary.currentAge + 4,
      rationale: t(`${money(tot, cur)} de dettes à plus de 6 %. Les rembourser offre un rendement garanti supérieur à la plupart des placements.`,
        `${money(tot, cur)} of debt above 6 %. Paying it down is a guaranteed return that beats most investments.`) });
  }

  // 6) Mortgage-free by retirement
  const mortgage = client.liabilities.find(l => l.type === 'mortgage');
  if (mortgage && !has(client.goals, g => /hypoth|mortgage/i.test(g.name))) {
    push({ key: 'mortgage', type: 'other', icon: 'estate', priority: 'medium',
      name: t('Libérer l’hypothèque avant la retraite', 'Mortgage-free by retirement'), amount: Math.round(mortgage.balance), targetAge: primary.retirementAge,
      rationale: t('Éliminer l’hypothèque avant la retraite réduit fortement le revenu requis et le risque de séquence des rendements.',
        'Clearing the mortgage before retirement sharply lowers required income and sequence-of-returns risk.') });
  }

  // 7) Retirement income goal
  if (!has(client.goals, g => g.type === 'retirement')) {
    const target = Math.round(employmentIncome * 0.7);
    push({ key: 'retirement', type: 'retirement', icon: 'retire', priority: 'high',
      name: t('Revenu de retraite cible', 'Target retirement income'), amount: target, targetAge: primary.retirementAge,
      rationale: t(`Définir un revenu de retraite cible (~70 % du revenu actuel, soit ${money(target, cur)}/an) ancre toute la planification.`,
        `Setting a target retirement income (~70 % of current income, i.e. ${money(target, cur)}/yr) anchors the whole plan.`) });
  }

  // 8) Estate documents
  const hasWill = has(client.documents, d => d.type === 'will' && d.status === 'done');
  if (!hasWill) {
    push({ key: 'will', type: 'estate', icon: 'estate', priority: 'high',
      name: t('Mettre à jour le testament et les mandats', 'Update will & mandates'), amount: 0, targetAge: primary.currentAge + 1,
      rationale: t('Aucun testament à jour au dossier. Un testament, un mandat de protection et des procurations protègent la famille et accélèrent la succession.',
        'No up-to-date will on file. A will, protection mandate and powers of attorney protect the family and speed up the estate.') });
  }

  // 9) Life insurance gap
  for (const m of client.members) {
    const n = lifeInsuranceNeeds(client, m.id);
    if (n.gap > 25000) {
      push({ key: 'life-' + m.id, type: 'other', icon: 'insurance', priority: 'high',
        name: t(`Combler l’assurance vie — ${m.name}`, `Close life insurance gap — ${m.name}`), amount: Math.round(n.gap), targetAge: m.currentAge + 1,
        rationale: t(`Besoin estimé de ${money(n.need, cur)} contre ${money(n.existingCoverage, cur)} en vigueur : un manque de ${money(n.gap, cur)}.`,
          `Estimated need of ${money(n.need, cur)} vs ${money(n.existingCoverage, cur)} in force: a ${money(n.gap, cur)} gap.`) });
      break; // one at a time to avoid clutter
    }
  }

  // 10) Disability protection
  for (const m of client.members) {
    const di = disabilityNeeds(client, m.id);
    if (di.gap > 500 && di.income > 0) {
      push({ key: 'di-' + m.id, type: 'other', icon: 'insurance', priority: 'medium',
        name: t(`Protection invalidité — ${m.name}`, `Disability protection — ${m.name}`), amount: Math.round(di.gap * 12), targetAge: m.currentAge + 1,
        rationale: t(`La couverture invalidité de ${m.name} laisse un manque d’environ ${money(di.gap, cur)}/mois de revenu protégé.`,
          `${m.name}'s disability coverage leaves a gap of about ${money(di.gap, cur)}/month of protected income.`) });
      break;
    }
  }

  // 11) First home (FHSA) for young renters
  const ownsHome = client.assets.some(a => a.type === 'realestate');
  if (!ownsHome && primary.currentAge < 45) {
    push({ key: 'firsthome', type: 'purchase', icon: 'estate', priority: 'medium',
      name: t('Mise de fonds — première propriété', 'Down payment — first home'), amount: 80000, targetAge: Math.min(primary.currentAge + 7, 45),
      rationale: t(client.jurisdiction.country === 'CA' ? 'Le CELIAPP combine déduction à la cotisation et retrait libre d’impôt pour une première propriété.' : 'Dedicated first-home savings can be highly tax-efficient.',
        client.jurisdiction.country === 'CA' ? 'The FHSA combines a contribution deduction with a tax-free withdrawal for a first home.' : 'Dedicated first-home savings can be highly tax-efficient.') });
  }

  // Sort by priority
  const rank = { high: 0, medium: 1, low: 2 };
  return S.sort((x, y) => rank[x.priority] - rank[y.priority]);
}

// local money (avoid UI import in engine)
function money(v, cur) {
  const s = (cur === 'GBP') ? '£' : (cur === 'EUR') ? '€' : '$';
  return s + Math.round(v).toLocaleString(t('fr-CA', 'en-CA'));
}
