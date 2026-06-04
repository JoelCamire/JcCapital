// ============================================================
// Automated financial health check — scans the whole client
// across every planning dimension and produces a scorecard
// (category scores 0-100) plus a prioritized action list.
// Ties all modules together into one review.
// ============================================================
import { runProjection } from './projection.js';
import { runMonteCarlo } from './montecarlo.js';
import { treatmentOf } from './projection.js';
import { netWorthBreakdown, lifeInsuranceNeeds, disabilityNeeds } from './analysis.js';
import { corporateTaxCA } from './corporate.js';
import { t } from '../i18n.js';

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const statusOf = (s) => s >= 80 ? 'good' : s >= 55 ? 'warn' : 'risk';

export function healthCheck(client, jur) {
  const cur = jur.currency;
  const proj = runProjection(client);
  const mc = runMonteCarlo(client, { trials: 400 });
  const nw = netWorthBreakdown(client);
  const categories = [];
  const add = (arr, title, text, severity) => arr.push({ title, text, severity });

  // ---- Retirement ----
  {
    const f = [];
    const score = clamp(mc.successRate * 100);
    if (mc.successRate < 0.75) add(f, t('Plan de retraite fragile', 'Fragile retirement plan'), t(`Probabilité de succès de ${Math.round(mc.successRate * 100)} %. Reporter la retraite, épargner plus ou réduire les dépenses cibles.`, `Success probability ${Math.round(mc.successRate * 100)}%. Delay retirement, save more, or lower target spending.`), 'risk');
    else if (mc.successRate < 0.85) add(f, t('Marge de sécurité limitée', 'Limited safety margin'), t('Le plan tient mais reste sensible aux marchés défavorables.', 'The plan holds but is sensitive to poor markets.'), 'warn');
    else add(f, t('Retraite bien financée', 'Well-funded retirement'), t('Possibilité de devancer la retraite ou d’optimiser la fiscalité.', 'Room to retire earlier or optimize taxes.'), 'good');
    if (proj.summary.depletionAge) add(f, t('Épuisement du capital', 'Capital depletion'), t(`Le capital s’épuise vers ${proj.summary.depletionAge} ans.`, `Capital is depleted around age ${proj.summary.depletionAge}.`), 'risk');
    categories.push({ key: 'retirement', label: t('Retraite', 'Retirement'), score, status: statusOf(score), findings: f });
  }

  // ---- Tax efficiency ----
  {
    const f = [];
    const income = client.incomes.filter(i => ['employment', 'self'].includes(i.type)).reduce((s, i) => s + i.amount, 0);
    const tf = client.assets.filter(a => treatmentOf(a.type) === 'taxfree').reduce((s, a) => s + (a.annualContribution || 0), 0);
    const df = client.assets.filter(a => treatmentOf(a.type) === 'deferred').reduce((s, a) => s + (a.annualContribution || 0), 0);
    const tfLimit = jur.country === 'CA' ? 7000 : jur.country === 'US' ? 7000 : 20000;
    const dfRoom = jur.country === 'CA' ? Math.min(income * 0.18, 32490) : jur.country === 'US' ? 23500 : 60000;
    let score = 60;
    if (tf >= tfLimit * 0.8) score += 20; else { score -= 10; add(f, t('Compte libre d’impôt sous-utilisé', 'Tax-free account underused'), t(`Cotisez davantage au ${jur.labels.taxFree} (limite ${Math.round(tfLimit)} $/an).`, `Contribute more to the ${jur.labels.taxFree} (limit ${Math.round(tfLimit)}/yr).`), 'warn'); }
    if (income > 0 && df >= dfRoom * 0.6) score += 20; else if (income > 0) { score -= 5; add(f, t('Droits de cotisation inutilisés', 'Unused contribution room'), t(`Le ${jur.labels.taxAdvantaged} offre une déduction immédiate (jusqu’à ~${Math.round(dfRoom)} $/an).`, `The ${jur.labels.taxAdvantaged} gives an immediate deduction (up to ~${Math.round(dfRoom)}/yr).`), 'warn'); }
    if (proj.rows[0].marginalRate > 0.45) add(f, t('Taux marginal élevé', 'High marginal rate'), t('Envisagez le fractionnement de revenu, le REER, ou (si en société) le mix salaire/dividende.', 'Consider income splitting, the RRSP, or (if incorporated) the salary/dividend mix.'), 'warn');
    if (!f.length) add(f, t('Fiscalité bien optimisée', 'Tax well optimized'), t('Les abris fiscaux sont bien utilisés.', 'Tax shelters are well used.'), 'good');
    score = clamp(score);
    categories.push({ key: 'tax', label: t('Fiscalité', 'Tax'), score, status: statusOf(score), findings: f });
  }

  // ---- Protection (insurance) ----
  {
    const f = [];
    let gapTotal = 0, needTotal = 0;
    for (const m of client.members) { const n = lifeInsuranceNeeds(client, m.id); gapTotal += n.gap; needTotal += n.need; const di = disabilityNeeds(client, m.id); if (di.gap > 500) add(f, t(`Protection invalidité — ${m.name}`, `Disability protection — ${m.name}`), t(`Manque ~${Math.round(di.gap)} $/mois de revenu protégé.`, `~${Math.round(di.gap)}/mo income protection gap.`), 'warn'); }
    let score = needTotal > 0 ? clamp(100 - (gapTotal / needTotal) * 100) : 85;
    if (gapTotal > 50000) add(f, t('Couverture vie insuffisante', 'Insufficient life coverage'), t(`Écart de couverture total d’environ ${Math.round(gapTotal).toLocaleString()} $.`, `Total coverage gap of about ${Math.round(gapTotal).toLocaleString()}.`), gapTotal > 250000 ? 'risk' : 'warn');
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
    // liquidity at death
    const last = proj.rows[proj.rows.length - 1].balances;
    const estTax = (last.deferred || 0) * 0.40;
    const liquid = (last.taxfree || 0) + (last.taxable || 0);
    if (estTax > liquid) add(f, t('Liquidité au décès insuffisante', 'Insufficient liquidity at death'), t('L’impôt au décès pourrait dépasser les actifs liquides — l’assurance corporative (CDC) peut combler ce besoin.', 'Tax at death may exceed liquid assets — corporate insurance (CDA) can fill the gap.'), 'warn');
    if (!f.length) add(f, t('Succession bien organisée', 'Estate well organized'), t('Documents et bénéficiaires à jour.', 'Documents and beneficiaries up to date.'), 'good');
    score = clamp(score);
    categories.push({ key: 'estate', label: t('Succession', 'Estate'), score, status: statusOf(score), findings: f });
  }

  // ---- Debt & liquidity ----
  {
    const f = [];
    let score = 80;
    if (nw.debtToAsset > 0.4) { score -= 20; add(f, t('Levier élevé', 'High leverage'), t(`Ratio dettes/actifs de ${Math.round(nw.debtToAsset * 100)} %.`, `Debt-to-asset ratio of ${Math.round(nw.debtToAsset * 100)}%.`), 'warn'); }
    const badDebt = client.liabilities.filter(l => l.rate > 0.06);
    if (badDebt.length) { score -= 15; add(f, t('Dettes à intérêt élevé', 'High-interest debt'), t('Priorisez le remboursement des dettes à plus de 6 %.', 'Prioritize paying off debt above 6%.'), 'warn'); }
    const cash = client.assets.filter(a => a.type === 'cash').reduce((s, a) => s + a.value, 0);
    const monthly = client.expenses.reduce((s, e) => s + e.amount, 0) / 12;
    if (cash < monthly * 3) { score -= 15; add(f, t('Fonds d’urgence insuffisant', 'Insufficient emergency fund'), t('Visez 3 à 6 mois de dépenses en liquidités accessibles.', 'Aim for 3–6 months of expenses in accessible cash.'), 'warn'); }
    if (!f.length) add(f, t('Endettement sain', 'Healthy debt position'), t('Niveau d’endettement et liquidités appropriés.', 'Appropriate debt level and liquidity.'), 'good');
    score = clamp(score);
    categories.push({ key: 'debt', label: t('Dettes & liquidité', 'Debt & liquidity'), score, status: statusOf(score), findings: f });
  }

  // ---- Business (if applicable) ----
  if (client.business && jur.country === 'CA') {
    const f = []; let score = 70;
    const B = client.business;
    if (B.passiveIncome > 50000) { score -= 15; add(f, t('Érosion de la déduction PME', 'Small-business deduction grind'), t('Le revenu passif dépasse 50 000 $ — envisagez une assurance ou une structure pour préserver le taux des PME.', 'Passive income exceeds $50,000 — consider insurance or structure to preserve the small-business rate.'), 'warn'); }
    const corp = corporateTaxCA(jur, B.activeIncome, B.passiveIncome);
    if ((B.corpInvestments || 0) > 250000) add(f, t('Purification / Holdco', 'Purification / Holdco'), t('Des liquidités excédentaires importantes : un Holdco protège les actifs et préserve l’admissibilité à l’EGC.', 'Significant excess cash: a Holdco protects assets and preserves LCGE eligibility.'), 'warn');
    add(f, t('Mix salaire / dividende', 'Salary / dividend mix'), t('Revalidez chaque année la rémunération optimale (REER, RRQ, CDC, fractionnement).', 'Re-check the optimal remuneration each year (RRSP, CPP, CDA, splitting).'), 'good');
    score = clamp(score);
    categories.push({ key: 'business', label: t('Entreprise', 'Business'), score, status: statusOf(score), findings: f });
  }

  const overall = Math.round(categories.reduce((s, c) => s + c.score, 0) / categories.length);
  const grade = overall >= 85 ? 'A' : overall >= 70 ? 'B' : overall >= 55 ? 'C' : overall >= 40 ? 'D' : 'E';
  const rank = { risk: 0, warn: 1, good: 2 };
  const actions = categories.flatMap(c => c.findings.filter(x => x.severity !== 'good').map(x => ({ ...x, category: c.label })))
    .sort((a, b) => rank[a.severity] - rank[b.severity]);

  return { overallScore: overall, grade, categories, actions, successRate: mc.successRate, netWorth: nw.netWorth };
}
