import { h, money, pct, num, icon } from '../dom.js';
import { kpi, card, legend, statList, badgeScore } from '../widgets.js';
import { lineChart, donutChart, barChart, gauge, PALETTE } from '../charts.js';
import { runProjection } from '../../engine/projection.js';
import { runMonteCarlo } from '../../engine/montecarlo.js';
import { netWorthBreakdown } from '../../engine/analysis.js';
import { computeTax } from '../../engine/tax.js';

export function render({ client, jur, navigate }) {
  const cur = jur.currency;
  const proj = runProjection(client);
  const mc = runMonteCarlo(client, { trials: 400 });
  const nw = netWorthBreakdown(client);
  const r0 = proj.rows[0];

  // savings rate
  const grossIncome = client.incomes.filter(i => ['employment', 'self'].includes(i.type)).reduce((s, i) => s + i.amount, 0);
  const annualSavings = client.assets.reduce((s, a) => s + (a.annualContribution || 0), 0);
  const savingsRate = grossIncome > 0 ? annualSavings / grossIncome : 0;

  const nwSeries = proj.rows.map(r => r.netWorth);
  const investSeries = proj.rows.map(r => r.investable);
  const xLabels = proj.rows.map(r => r.primaryAge);

  // income vs expense (first 1 year) breakdown across next 10 yrs aggregated bars
  const sampleYears = proj.rows.filter((_, i) => i % Math.ceil(proj.rows.length / 10) === 0);

  const donutSegs = nw.byTreat.map((b, i) => ({ label: b.label, value: b.value, color: PALETTE[i % PALETTE.length] }));

  const wrap = h('div', { class: 'grid' });

  // KPI row
  wrap.appendChild(h('div', { class: 'grid cols-4 span-full' },
    kpi({ label: 'Valeur nette', value: money(nw.netWorth, { currency: cur, compact: true }), iconName: 'networth',
      sub: `${money(nw.assets, { currency: cur, compact: true })} actifs · ${money(nw.liabilities, { currency: cur, compact: true })} dettes`,
      spark: nwSeries.filter((_, i) => i % 3 === 0) }),
    kpi({ label: 'Probabilité de succès', value: pct(mc.successRate, 0), iconName: 'monte',
      sub: `${mc.trials} simulations Monte Carlo`, accent: mc.successRate >= 0.85 ? 'var(--pos)' : mc.successRate >= 0.6 ? 'var(--warn)' : 'var(--neg)' }),
    kpi({ label: "Taux d'épargne", value: pct(savingsRate, 0), iconName: 'cashflow',
      sub: `${money(annualSavings, { currency: cur, compact: true })} / an investis` }),
    kpi({ label: 'Impôt à vie estimé', value: money(proj.summary.totalLifetimeTax, { currency: cur, compact: true }), iconName: 'tax',
      sub: `Taux marg. actuel ${pct(r0.marginalRate, 0)}` }),
  ));

  // Net worth projection (big)
  wrap.appendChild(card('Projection de la valeur nette', {
    class: 'span-3',
    sub: `De ${r0.primaryAge} à ${proj.summary.lifeExpectancy} ans · ${jur.name} (${jur.regionName})`,
    right: legend([{ color: PALETTE[0], label: 'Valeur nette' }, { color: PALETTE[1], label: 'Actifs investissables' }]),
  },
    h('div', { html: lineChart({
      series: [
        { name: 'Valeur nette', color: PALETTE[0], values: nwSeries },
        { name: 'Investissable', color: PALETTE[1], values: investSeries },
      ], xLabels, area: true,
    }) }),
  ));

  // Retirement readiness gauge
  wrap.appendChild(card('Préparation à la retraite', { sub: `Retraite à ${proj.summary.retirementAge} ans` },
    h('div', { style: { textAlign: 'center' } }, h('div', { html: gauge({ value: mc.successRate, label: pct(mc.successRate, 0), sub: 'succès' }) })),
    h('div', { class: 'flex center', style: { justifyContent: 'center', gap: '8px', marginTop: '4px' } }, badgeScore(mc.successRate)),
    h('div', { class: 'sep' }),
    statList([
      ['Capital au décès (médian)', money(proj.summary.finalInvestable, { currency: cur, compact: true })],
      ['Revenu requis à la retraite', proj.summary.retirementIncomeNeed ? money(proj.summary.retirementIncomeNeed, { currency: cur, compact: true }) : '—'],
      ['Épuisement du capital', proj.summary.depletionAge ? `${proj.summary.depletionAge} ans` : 'Aucun ✓', proj.summary.depletionAge ? 'neg' : 'pos'],
    ]),
  ));

  // Asset composition donut
  wrap.appendChild(card('Composition des actifs', { sub: 'Par traitement fiscal' },
    h('div', { class: 'flex center', style: { justifyContent: 'center' } },
      h('div', { html: donutChart({ segments: donutSegs, centerLabel: money(nw.assets, { currency: cur, compact: true }), centerSub: 'actifs' }) })),
    h('div', { class: 'sep' }),
    legend(donutSegs.map(s => ({ color: s.color, label: `${s.label} · ${money(s.value, { currency: cur, compact: true })}` }))),
  ));

  // Income vs expenses over time
  wrap.appendChild(card('Revenus vs dépenses dans le temps', { class: 'span-2',
    right: legend([{ color: PALETTE[1], label: 'Revenus après impôt' }, { color: PALETTE[4], label: 'Dépenses + dettes' }]) },
    h('div', { html: barChart({
      xLabels: sampleYears.map(r => r.primaryAge),
      series: [
        { name: 'Revenu net', color: PALETTE[1], values: sampleYears.map(r => Math.round(r.afterTaxIncome)) },
        { name: 'Dépenses', color: PALETTE[4], values: sampleYears.map(r => Math.round(r.need)) },
      ],
    }) }),
  ));

  // Alerts / recommendations
  const alerts = buildAlerts(client, proj, mc, nw, savingsRate);
  wrap.appendChild(card('Recommandations', { sub: 'Générées par le moteur de planification' },
    alerts.length ? h('div', {}, ...alerts.map(a => h('div', {
      class: 'flex', style: { gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' } },
      h('span', { class: 'chip ' + a.kind, style: { flex: 'none', marginTop: '1px' }, html: icon(a.kind === 'neg' ? 'warning' : 'check', 13) }),
      h('div', {}, h('b', {}, a.title), h('div', { class: 'tiny muted' }, a.text)),
    ))) : h('div', { class: 'empty' }, 'Tout est optimal ✓'),
  ));

  return wrap;
}

function buildAlerts(client, proj, mc, nw, savingsRate) {
  const a = [];
  if (mc.successRate < 0.75) a.push({ kind: 'neg', title: 'Plan de retraite à risque',
    text: `La probabilité de succès est de ${pct(mc.successRate, 0)}. Envisagez de reporter la retraite, d'augmenter l'épargne ou de réduire les dépenses cibles.` });
  if (proj.summary.depletionAge) a.push({ kind: 'neg', title: 'Épuisement du capital projeté',
    text: `Le capital investissable s'épuise vers ${proj.summary.depletionAge} ans selon le scénario déterministe.` });
  if (savingsRate < 0.1) a.push({ kind: 'warn', title: "Taux d'épargne faible",
    text: `Le taux d'épargne est de ${pct(savingsRate, 0)}. Une cible de 15 % accélère l'atteinte des objectifs.` });
  if (nw.debtToAsset > 0.4) a.push({ kind: 'warn', title: 'Levier élevé',
    text: `Le ratio dettes/actifs est de ${pct(nw.debtToAsset, 0)}.` });
  // TFSA / tax-free room
  const tfree = client.assets.filter(x => ['tfsa', 'roth', 'isa'].includes(x.type)).reduce((s, x) => s + (x.annualContribution || 0), 0);
  if (tfree === 0) a.push({ kind: 'warn', title: 'Compte libre d’impôt sous-utilisé',
    text: `Aucune cotisation périodique à un compte libre d'impôt (${proj.jur.labels.taxFree}). C'est l'abri le plus efficace pour la croissance.` });
  if (mc.successRate >= 0.85 && !proj.summary.depletionAge) a.push({ kind: 'pos', title: 'Trajectoire solide',
    text: `Le plan atteint ${pct(mc.successRate, 0)} de succès. Opportunité d'optimisation fiscale ou de devancement de la retraite.` });
  return a;
}
