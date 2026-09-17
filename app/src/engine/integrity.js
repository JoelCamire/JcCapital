// ============================================================
// Data-integrity checks — the "is this file coherent?" pass.
// Because every number now flows from one source of truth, this
// module can detect contradictions between them: contributions
// above the legal room, incomes pointing at nobody, retirement
// before today, a mortgage payment that does not cover interest,
// a spouse-less "married" file, a benefit start age outside the
// legal window, … Each finding names the screen where to fix it.
// ============================================================
import { clientFacts } from './facts.js';
import { treatmentOf, EMPLOYMENT_TYPES } from './projection.js';
import { accountTypesFor } from '../jurisdictions/index.js';
import { INSURANCE_KINDS, INVESTMENT_KINDS, isActiveProduct } from '../state/models.js';
import { t } from '../i18n.js';

const fin = (v) => (Number.isFinite(+v) ? +v : NaN);

export function integrityChecks(client, jur) {
  const F = clientFacts(client, jur);
  const out = [];
  const add = (severity, key, title, detail, view) => out.push({ severity, key, title, detail, view });
  const members = client.members || [];
  const ids = new Set(members.map(m => m.id));
  const M = (v) => Math.round(v).toLocaleString(t('fr-CA', 'en-CA')) + ' $';

  // ---- people ----
  for (const m of members) {
    if (!m.dob) add('info', 'dob-' + m.id, t(`${m.name} : âge saisi manuellement`, `${m.name}: age entered manually`), t('Ajoutez la date de naissance pour que l’âge se mette à jour tout seul chaque année.', 'Add the date of birth so the age updates itself every year.'), 'profile');
    if (fin(m.lifeExpectancy) <= fin(m.retirementAge)) add('error', 'le-' + m.id, t(`${m.name} : espérance de vie ≤ âge de retraite`, `${m.name}: life expectancy ≤ retirement age`), t('La projection n’a aucune année de retraite à couvrir.', 'The projection has no retirement year to cover.'), 'profile');
    if (fin(m.retirementAge) < fin(m.currentAge) && (client.incomes || []).some(i => i.memberId === m.id && EMPLOYMENT_TYPES.includes(i.type) && fin(i.amount) > 0)) add('warn', 'ret-' + m.id, t(`${m.name} : revenu d’emploi après l’âge de retraite`, `${m.name}: employment income after retirement age`), t('L’âge de retraite est déjà passé : ce revenu est ignoré par la projection. Ajustez l’âge de retraite ou le type de revenu.', 'Retirement age is already past: this income is ignored by the projection. Adjust the retirement age or the income type.'), 'client');
  }
  if (client.filingStatus === 'married' && members.length < 2) add('warn', 'spouse', t('Couple sans conjoint au dossier', 'Couple without a spouse on file'), t('Le statut est « couple » mais un seul membre est saisi : fractionnement et crédits de conjoint ne peuvent pas s’appliquer.', 'Status is “couple” but only one member is entered: splitting and spousal credits cannot apply.'), 'profile');

  // ---- references ----
  for (const i of (client.incomes || [])) if (i.memberId && !ids.has(i.memberId)) add('error', 'inc-' + i.id, t(`Revenu « ${i.label} » sans membre`, `Income “${i.label}” without a member`), t('Ce revenu pointe vers un membre supprimé; il est attribué au titulaire par défaut.', 'This income points to a deleted member; it is assigned to the primary member by default.'), 'client');
  for (const a of (client.assets || [])) if (a.ownerId && !ids.has(a.ownerId)) add('warn', 'own-' + a.id, t(`Actif « ${a.label} » sans propriétaire`, `Asset “${a.label}” without an owner`), t('Attribué au titulaire par défaut. Vérifiez le propriétaire (impact sur l’impôt des retraits).', 'Assigned to the primary member by default. Check the owner (affects withdrawal tax).'), 'networth');
  for (const p of (client.products || [])) {
    if (INSURANCE_KINDS.includes(p.kind) && isActiveProduct(p) && !p.insuredId) add('warn', 'ins-' + p.id, t(`Police ${p.policyNumber || p.carrier || ''} sans assuré`, `Policy ${p.policyNumber || p.carrier || ''} without an insured`), t('La couverture ne peut pas être rattachée à un membre dans l’analyse des besoins.', 'The coverage cannot be attached to a member in the needs analysis.'), 'insurance');
    if (INVESTMENT_KINDS.includes(p.kind) && isActiveProduct(p) && !p.assetId) add('info', 'aum-' + p.id, t(`Produit de placement sans actif lié`, `Investment product without a linked asset`), t('Son actif sous gestion n’apparaît pas au bilan.', 'Its AUM does not appear in the balance sheet.'), 'relation');
  }

  // ---- benefit ages ----
  for (const i of (client.incomes || [])) {
    const pen = i.type === 'cpp' ? jur.pensions?.cpp : i.type === 'oas' ? jur.pensions?.oas : null;
    if (!pen || i.startAge == null || i.startAge === '') continue;
    const min = pen.minAge ?? pen.startAge, max = pen.maxAge ?? pen.startAge;
    if (fin(i.startAge) < min || fin(i.startAge) > max) add('error', 'age-' + i.id, t(`${pen.name} : âge de début ${i.startAge} hors fenêtre ${min}–${max}`, `${pen.name}: start age ${i.startAge} outside the ${min}–${max} window`), t('La prestation ne peut pas commencer à cet âge.', 'The benefit cannot start at that age.'), 'client');
  }

  // ---- contribution room ----
  for (const m of F.members) {
    const deferred = (client.assets || []).filter(a => treatmentOf(a.type) === 'deferred' && ['rrsp', 'fhsa', '401k', 'ira', 'pension'].includes(a.type) && (a.ownerId || members[0]?.id) === m.id).reduce((s, a) => s + (fin(a.annualContribution) || 0), 0);
    if (jur.country === 'CA' && deferred > m.rrspRoom + 1 && m.age < m.retirementAge) add('warn', 'room-' + m.id, t(`${m.name} : cotisations REER (${M(deferred)}) au-delà des droits (${M(m.rrspRoom)})`, `${m.name}: RRSP contributions (${M(deferred)}) exceed room (${M(m.rrspRoom)})`), t('18 % du revenu gagné, plafonné. Les cotisations excédentaires sont pénalisées (1 %/mois au-delà de 2 000 $).', '18 % of earned income, capped. Excess contributions are penalised (1 %/month above $2,000).'), 'networth');
  }
  const tfMeta = accountTypesFor(jur.country).find(a => treatmentOf(a.id) === 'taxfree');
  const tfContrib = F.household.contributionsByTreatment.taxfree || 0;
  if (tfMeta?.limit && tfContrib > tfMeta.limit * Math.max(1, members.length) + 1) add('warn', 'tfsa', t(`Cotisations ${tfMeta.name} (${M(tfContrib)}) au-delà de la limite annuelle`, `${tfMeta.name} contributions (${M(tfContrib)}) above the annual limit`), t(`Limite ${M(tfMeta.limit)} par personne (droits inutilisés non pris en compte ici).`, `Limit ${M(tfMeta.limit)} per person (unused room not considered here).`), 'networth');

  // ---- cash flow ----
  if (F.household.surplus < -1) add('warn', 'deficit', t(`Budget déficitaire de ${M(-F.household.surplus)}/an`, `Budget deficit of ${M(-F.household.surplus)}/yr`), t('Dépenses + dettes + cotisations dépassent le revenu net : la projection comble l’écart en puisant dans les placements.', 'Expenses + debt + contributions exceed net income: the projection funds the gap from investments.'), 'budget');
  if (!(client.expenses || []).length) add('info', 'noexp', t('Aucune dépense saisie', 'No expenses entered'), t('Sans dépenses, la retraite paraît financée quoi qu’il arrive.', 'Without expenses, retirement always looks funded.'), 'client');
  for (const l of F.liabilities) if (l.unpayable) add('error', 'debt-' + l.id, t(`« ${l.label} » : le paiement ne couvre pas l’intérêt`, `“${l.label}”: payment does not cover interest`), t('Le solde augmente chaque mois. Corrigez le paiement ou le taux.', 'The balance grows every month. Fix the payment or the rate.'), 'debt');

  // ---- assumptions sanity ----
  const A = F.assumptions;
  if (A.preReturn > 0.12 || A.postReturn > 0.12) add('warn', 'ret', t('Rendement supposé très élevé', 'Very high assumed return'), t(`${(A.preReturn * 100).toFixed(1)} % / ${(A.postReturn * 100).toFixed(1)} % — au-delà des normes FP Canada.`, `${(A.preReturn * 100).toFixed(1)} % / ${(A.postReturn * 100).toFixed(1)} % — above FP Canada guidelines.`), 'settings');
  if (A.inflation > 0.06) add('warn', 'infl', t('Inflation supposée très élevée', 'Very high assumed inflation'), `${(A.inflation * 100).toFixed(1)} %`, 'settings');
  if (A.postReturn > A.preReturn) add('info', 'postpre', t('Rendement à la retraite supérieur au rendement d’accumulation', 'Retirement return above accumulation return'), t('Inhabituel : le portefeuille est normalement dé-risqué à la retraite.', 'Unusual: portfolios are normally de-risked in retirement.'), 'settings');

  // ---- goals ----
  if ((client.goals || []).some(g => g.type === 'education') && !(client.dependents || []).length) add('warn', 'edu', t('Objectif d’études sans personne à charge', 'Education goal without a dependent'), t('Ajoutez l’enfant au profil pour que l’âge cible et les subventions soient calculés.', 'Add the child to the profile so the target age and grants are computed.'), 'profile');

  const rank = { error: 0, warn: 1, info: 2 };
  out.sort((a, b) => rank[a.severity] - rank[b.severity]);
  return { findings: out, errors: out.filter(x => x.severity === 'error').length, warnings: out.filter(x => x.severity === 'warn').length, score: Math.max(0, 100 - out.filter(x => x.severity === 'error').length * 25 - out.filter(x => x.severity === 'warn').length * 8) };
}
