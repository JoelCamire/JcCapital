// ============================================================
// Automated financial health check — scans the whole client
// across every planning dimension and produces a scorecard
// (category scores 0-100) plus a prioritized action list.
// All thresholds come from the jurisdiction / assumptions; the
// Monte Carlo result is the SAME cached run every other screen uses.
// ============================================================
import { runMonteCarlo } from './montecarlo.js';
import { treatmentOf } from './projection.js';
import { netWorthBreakdown, lifeInsuranceNeeds, disabilityNeeds } from './analysis.js';
import { computeTax, bracketMarginal } from './tax.js';
import { clientFacts } from './facts.js';
import { integrityChecks } from './integrity.js';
import { accountTypesFor } from '../jurisdictions/index.js';
import { t } from '../i18n.js';

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const statusOf = (s) => s >= 80 ? 'good' : s >= 55 ? 'warn' : 'risk';
const fin = (v) => (Number.isFinite(+v) ? +v : 0);

/** "High" marginal rate = within 8 points of the top combined rate. */
export function highMarginalThreshold(jur) {
  const top = bracketMarginal(1e9, jur.fed?.brackets || []) * (1 - (jur.regionData?.federalAbatement || 0)) + bracketMarginal(1e9, jur.regionData?.brackets || jur.fed?.brackets || []);
  return Math.max(0.3, top - 0.08);
}

export function healthCheck(client, jur) {
  const F = clientFacts(client, jur);
  const A = F.assumptions;
  const mc = runMonteCarlo(client);
  const proj = mc.det;
  const nw = F.netWorth;
  const categories = [];
  const add = (arr, title, text, severity) => arr.push({ title, text, severity });
  const cur = jur.currency === 'GBP' ? '£' : '$';
  const M = (v) => Math.round(v).toLocaleString(t('fr-CA', 'en-CA')) + (cur === '$' ? ' $' : '');

  // ---- Retirement ----
  {
    const f = [];
    const score = clamp(mc.successRate * 100);
    if (mc.successRate < 0.75) add(f, t('Plan de retraite fragile', 'Fragile retirement plan'), t(`Probabilité de succès de ${Math.round(mc.successRate * 100)} %. Reporter la retraite, épargner plus ou réduire les dépenses cibles.`, `Success probability ${Math.round(mc.successRate * 100)}%. Delay retirement, save more, or lower target spending.`), 'risk');
    else if (mc.successRate < 0.85) add(f, t('Marge de sécurité limitée', 'Limited safety margin'), t('Le plan tient mais reste sensible aux marchés défavorables.', 'The plan holds but is sensitive to poor markets.'), 'warn');
    else add(f, t('Retraite bien financée', 'Well-funded retirement'), t('Possibilité de devancer la retraite ou d’optimiser la fiscalité.', 'Room to retire earlier or optimize taxes.'), 'good');
    if (proj.summary.depletionAge) add(f, t('Épuisement du capital', 'Capital depletion'), t(`Le capital s’épuise vers ${proj.summary.depletionAge} ans.`, `Capital is depleted around age ${proj.summary.depletionAge}.`), 'risk');
    if (proj.summary.totalOasClawback > 50000) add(f, t('Récupération de la PSV importante', 'Significant OAS clawback'), t(`≈ ${M(proj.summary.totalOasClawback)} de PSV récupérée sur la vie du plan — une fonte du REER avant 65 ans ou le fractionnement peut l’atténuer.`, `≈ ${M(proj.summary.totalOasClawback)} of OAS clawed back over the plan — an RRSP meltdown before 65 or pension splitting can reduce it.`), 'warn');
    categories.push({ key: 'retirement', label: t('Retraite', 'Retirement'), score, status: statusOf(score), findings: f });
  }

  // ---- Tax efficiency ----
  {
    const f = [];
    const income = F.household.employmentIncome;
    const tf = F.household.contributionsByTreatment.taxfree || 0;
    const df = F.household.contributionsByTreatment.deferred || 0;
    const tfMeta = accountTypesFor(jur.country).find(a => treatmentOf(a.id) === 'taxfree');
    const tfLimit = fin(tfMeta?.limit) * Math.max(1, F.members.length);
    const dfRoom = F.members.reduce((s, m) => s + m.rrspRoom, 0);
    let score = 60;
    if (tfLimit > 0 && tf >= tfLimit * 0.8) score += 20; else if (tfLimit > 0) { score -= 10; add(f, t('Compte libre d’impôt sous-utilisé', 'Tax-free account underused'), t(`Cotisez davantage au ${jur.labels.taxFree} (limite ${M(tfLimit)}/an pour le ménage).`, `Contribute more to the ${jur.labels.taxFree} (household limit ${M(tfLimit)}/yr).`), 'warn'); }
    if (income > 0 && dfRoom > 0 && df >= dfRoom * 0.6) score += 20; else if (income > 0 && dfRoom > 0) { score -= 5; add(f, t('Droits de cotisation inutilisés', 'Unused contribution room'), t(`Le ${jur.labels.taxAdvantaged} offre une déduction immédiate (jusqu’à ~${M(dfRoom)}/an pour le ménage).`, `The ${jur.labels.taxAdvantaged} gives an immediate deduction (up to ~${M(dfRoom)}/yr for the household).`), 'warn'); }
    if (F.household.marginalRate > highMarginalThreshold(jur)) add(f, t('Taux marginal élevé', 'High marginal rate'), t(`Taux marginal de ${Math.round(F.household.marginalRate * 100)} % : envisagez le fractionnement, le REER, ou (si en société) le mix salaire/dividende.`, `Marginal rate of ${Math.round(F.household.marginalRate * 100)}%: consider income splitting, the RRSP, or (if incorporated) the salary/dividend mix.`), 'warn');
    if (!f.length) add(f, t('Fiscalité bien optimisée', 'Tax well optimized'), t('Les abris fiscaux sont bien utilisés.', 'Tax shelters are well used.'), 'good');
    score = clamp(score);
    categories.push({ key: 'tax', label: t('Fiscalité', 'Tax'), score, status: statusOf(score), findings: f });
  }

  // ---- Protection (insurance) ----
  {
    const f = [];
    let gapTotal = 0, needTotal = 0;
    for (const m of client.members) { const n = lifeInsuranceNeeds(client, m.id); gapTotal += n.gap; needTotal += n.need; const di = disabilityNeeds(client, m.id); if (di.gap > 500) add(f, t(`Protection invalidité — ${m.name}`, `Disability protection — ${m.name}`), t(`Manque ~${M(di.gap)}/mois de revenu protégé.`, `~${M(di.gap)}/mo income protection gap.`), 'warn'); }
    let score = needTotal > 0 ? clamp(100 - (gapTotal / needTotal) * 100) : 85;
    if (gapTotal > 50000) add(f, t('Couverture vie insuffisante', 'Insufficient life coverage'), t(`Écart de couverture total d’environ ${M(gapTotal)}.`, `Total coverage gap of about ${M(gapTotal)}.`), gapTotal > 250000 ? 'risk' : 'warn');
    if (!f.length) add(f, t('Bien protégé', 'Well protected'), t('La couverture d’assurance correspond aux besoins.', 'Insurance coverage matches the needs.'), 'good');
    categories.push({ key: 'protection', label: t('Protection', 'Protection'), score, status: statusOf(score), findings: f });
  }

  // ---- Estate ----
  {
    const f = [];
    let score = 70;
    const hasWill = (client.documents || []).some(d => d.type === 'will' && d.status === 'done');
    const hasMandate = (client.documents || []).some(d => ['mandate', 'poa'].includes(d.type) && d.status === 'done');
    const hasBenef = (client.beneficiaries || []).length > 0;
    if (!hasWill) { score -= 30; add(f, t('Testament manquant ou désuet', 'Will missing or outdated'), t('Mettez à jour le testament — essentiel pour protéger la famille et éviter l’intestat.', 'Update the will — essential to protect the family and avoid intestacy.'), 'risk'); } else score += 15;
    if (!hasMandate) { score -= 10; add(f, t('Mandat / procuration absent', 'Mandate / POA missing'), t('Prévoyez un mandat de protection et des procurations.', 'Put a protection mandate and powers of attorney in place.'), 'warn'); }
    if (!hasBenef) { score -= 10; add(f, t('Bénéficiaires non désignés', 'Beneficiaries not designated'), t('Désignez des bénéficiaires (REER, CELI, assurance) pour éviter l’homologation.', 'Designate beneficiaries (RRSP, TFSA, insurance) to avoid probate.'), 'warn'); }
    // liquidity at death: exact tax on the deemed disposition of registered assets at the end of the plan
    const last = proj.rows[proj.rows.length - 1];
    const estTax = computeTax(jur, { ordinary: last.balances.deferred || 0, withPayroll: false, employment: false, age: last.primaryAge }).total;
    const liquid = (last.balances.taxfree || 0) + (last.balances.taxable || 0) + F.coverage[client.members[0]?.id]?.life || 0;
    if (estTax > liquid) add(f, t('Liquidité au décès insuffisante', 'Insufficient liquidity at death'), t(`L’impôt au décès (~${M(estTax)}) pourrait dépasser les actifs liquides et l’assurance — l’assurance vie (personnelle ou corporative via le CDC) peut combler ce besoin.`, `Tax at death (~${M(estTax)}) may exceed liquid assets and insurance — life insurance (personal or corporate via the CDA) can fill the gap.`), 'warn');
    if (!f.length) add(f, t('Succession bien organisée', 'Estate well organized'), t('Documents et bénéficiaires à jour.', 'Documents and beneficiaries up to date.'), 'good');
    score = clamp(score);
    categories.push({ key: 'estate', label: t('Succession', 'Estate'), score, status: statusOf(score), findings: f });
  }

  // ---- Debt & liquidity ----
  {
    const f = [];
    let score = 80;
    if (nw.debtToAsset > 0.4) { score -= 20; add(f, t('Levier élevé', 'High leverage'), t(`Ratio dettes/actifs de ${Math.round(nw.debtToAsset * 100)} %.`, `Debt-to-asset ratio of ${Math.round(nw.debtToAsset * 100)}%.`), 'warn'); }
    const badDebt = (client.liabilities || []).filter(l => fin(l.rate) > 0.06);
    if (badDebt.length) { score -= 15; add(f, t('Dettes à intérêt élevé', 'High-interest debt'), t('Priorisez le remboursement des dettes à plus de 6 %.', 'Prioritize paying off debt above 6%.'), 'warn'); }
    const monthly = F.household.expensesMonthly;
    if (F.cash < monthly * A.emergencyMonths) { score -= 15; add(f, t('Fonds d’urgence insuffisant', 'Insufficient emergency fund'), t(`Visez ${A.emergencyMonths} à ${A.emergencyMonths * 2} mois de dépenses (${M(monthly * A.emergencyMonths)}) en liquidités accessibles.`, `Aim for ${A.emergencyMonths}–${A.emergencyMonths * 2} months of expenses (${M(monthly * A.emergencyMonths)}) in accessible cash.`), 'warn'); }
    if (F.household.surplus < 0) { score -= 10; add(f, t('Budget déficitaire', 'Budget deficit'), t(`Les dépenses, dettes et cotisations dépassent le revenu net de ${M(-F.household.surplus)}/an.`, `Expenses, debt service and contributions exceed net income by ${M(-F.household.surplus)}/yr.`), 'warn'); }
    if (!f.length) add(f, t('Endettement sain', 'Healthy debt position'), t('Niveau d’endettement et liquidités appropriés.', 'Appropriate debt level and liquidity.'), 'good');
    score = clamp(score);
    categories.push({ key: 'debt', label: t('Dettes & liquidité', 'Debt & liquidity'), score, status: statusOf(score), findings: f });
  }

  // ---- Business (if applicable) ----
  if (client.business && jur.country === 'CA') {
    const f = []; let score = 70;
    const B = client.business;
    const grindStart = jur.corporate?.passiveGrindStart || 50000;
    if (fin(B.passiveIncome) > grindStart) { score -= 15; add(f, t('Érosion de la déduction PME', 'Small-business deduction grind'), t(`Le revenu passif dépasse ${M(grindStart)} — plafond PME réduit de ${M(F.business?.corp?.grind || 0)}. Envisagez une assurance ou une structure pour préserver le taux des PME.`, `Passive income exceeds ${M(grindStart)} — SBD limit reduced by ${M(F.business?.corp?.grind || 0)}. Consider insurance or structure to preserve the small-business rate.`), 'warn'); }
    if (fin(B.corpInvestments) > 250000) add(f, t('Purification / Holdco', 'Purification / Holdco'), t('Des liquidités excédentaires importantes : un Holdco protège les actifs et préserve l’admissibilité à l’EGC.', 'Significant excess cash: a Holdco protects assets and preserves LCGE eligibility.'), 'warn');
    add(f, t('Mix salaire / dividende', 'Salary / dividend mix'), t('Revalidez chaque année la rémunération optimale (REER, RRQ, CDC, fractionnement).', 'Re-check the optimal remuneration each year (RRSP, CPP, CDA, splitting).'), 'good');
    score = clamp(score);
    categories.push({ key: 'business', label: t('Entreprise', 'Business'), score, status: statusOf(score), findings: f });
  }

  // ---- Data integrity (coherence between every source of truth) ----
  {
    const I = integrityChecks(client, jur);
    const f = I.findings.filter(x => x.severity !== 'info').slice(0, 6).map(x => ({ title: x.title, text: x.text || x.detail, severity: x.severity === 'error' ? 'risk' : 'warn', view: x.view }));
    if (!f.length) add(f, t('Dossier cohérent', 'File is coherent'), t('Aucune contradiction entre les données saisies.', 'No contradiction between the entered data.'), 'good');
    categories.push({ key: 'integrity', label: t('Cohérence du dossier', 'Data integrity'), score: I.score, status: statusOf(I.score), findings: f, infos: I.findings.filter(x => x.severity === 'info').length });
  }

  const overall = Math.round(categories.reduce((s, c) => s + c.score, 0) / categories.length);
  const grade = overall >= 85 ? 'A' : overall >= 70 ? 'B' : overall >= 55 ? 'C' : overall >= 40 ? 'D' : 'E';
  const rank = { risk: 0, warn: 1, good: 2 };
  const actions = categories.flatMap(c => c.findings.filter(x => x.severity !== 'good').map(x => ({ ...x, category: c.label })))
    .sort((a, b) => rank[a.severity] - rank[b.severity]);

  return { overallScore: overall, grade, categories, actions, successRate: mc.successRate, netWorth: nw.netWorth };
}
