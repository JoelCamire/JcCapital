import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, legend, statList, badgeScore } from '../widgets.js';
import { lineChart, donutChart, barChart, gauge, PALETTE } from '../charts.js';
import { runProjection } from '../../engine/projection.js';
import { runMonteCarlo } from '../../engine/montecarlo.js';
import { netWorthBreakdown } from '../../engine/analysis.js';
import { suggestGoals } from '../../engine/suggestions.js';

export function render({ client, jur, navigate }) {
  const cur = jur.currency;
  const proj = runProjection(client);
  const mc = runMonteCarlo(client, { trials: 400 });
  const nw = netWorthBreakdown(client);
  const r0 = proj.rows[0];

  const grossIncome = client.incomes.filter(i => ['employment', 'self'].includes(i.type)).reduce((s, i) => s + i.amount, 0);
  const annualSavings = client.assets.reduce((s, a) => s + (a.annualContribution || 0), 0);
  const savingsRate = grossIncome > 0 ? annualSavings / grossIncome : 0;

  const nwSeries = proj.rows.map(r => r.netWorth);
  const investSeries = proj.rows.map(r => r.investable);
  const xLabels = proj.rows.map(r => r.primaryAge);
  const sampleYears = proj.rows.filter((_, i) => i % Math.ceil(proj.rows.length / 10) === 0);
  const donutSegs = nw.byTreat.map((b, i) => ({ label: b.label, value: b.value, color: PALETTE[i % PALETTE.length] }));

  const wrap = h('div', { class: 'grid' });

  wrap.appendChild(h('div', { class: 'grid cols-4 span-full' },
    kpi({ label: t('Valeur nette', 'Net worth'), value: money(nw.netWorth, { currency: cur, compact: true }), iconName: 'networth',
      sub: t(`${money(nw.assets, { currency: cur, compact: true })} actifs · ${money(nw.liabilities, { currency: cur, compact: true })} dettes`,
        `${money(nw.assets, { currency: cur, compact: true })} assets · ${money(nw.liabilities, { currency: cur, compact: true })} debt`),
      spark: nwSeries.filter((_, i) => i % 3 === 0) }),
    kpi({ label: t('Probabilité de succès', 'Probability of success'), value: pct(mc.successRate, 0), iconName: 'monte',
      sub: t(`${mc.trials} simulations Monte Carlo`, `${mc.trials} Monte Carlo simulations`), accent: mc.successRate >= 0.85 ? 'var(--pos)' : mc.successRate >= 0.6 ? 'var(--warn)' : 'var(--neg)' }),
    kpi({ label: t("Taux d'épargne", 'Savings rate'), value: pct(savingsRate, 0), iconName: 'cashflow',
      sub: t(`${money(annualSavings, { currency: cur, compact: true })} / an investis`, `${money(annualSavings, { currency: cur, compact: true })} / yr invested`) }),
    kpi({ label: t('Impôt à vie estimé', 'Estimated lifetime tax'), value: money(proj.summary.totalLifetimeTax, { currency: cur, compact: true }), iconName: 'tax',
      sub: t(`Taux marg. actuel ${pct(r0.marginalRate, 0)}`, `Current marginal rate ${pct(r0.marginalRate, 0)}`) }),
  ));

  wrap.appendChild(card(t('Projection de la valeur nette', 'Net worth projection'), {
    class: 'span-3',
    sub: t(`De ${r0.primaryAge} à ${proj.summary.lifeExpectancy} ans · ${jur.name} (${jur.regionName})`,
      `From age ${r0.primaryAge} to ${proj.summary.lifeExpectancy} · ${jur.name} (${jur.regionName})`),
    right: legend([{ color: PALETTE[0], label: t('Valeur nette', 'Net worth') }, { color: PALETTE[1], label: t('Actifs investissables', 'Investable assets') }]),
  },
    h('div', { html: lineChart({
      series: [
        { name: 'nw', color: PALETTE[0], values: nwSeries },
        { name: 'inv', color: PALETTE[1], values: investSeries },
      ], xLabels, area: true,
    }) }),
  ));

  wrap.appendChild(card(t('Préparation à la retraite', 'Retirement readiness'), { sub: t(`Retraite à ${proj.summary.retirementAge} ans`, `Retirement at ${proj.summary.retirementAge}`) },
    h('div', { style: { textAlign: 'center' } }, h('div', { html: gauge({ value: mc.successRate, label: pct(mc.successRate, 0), sub: t('succès', 'success') }) })),
    h('div', { class: 'flex center', style: { justifyContent: 'center', gap: '8px', marginTop: '4px' } }, badgeScore(mc.successRate)),
    h('div', { class: 'sep' }),
    statList([
      [t('Capital au décès (médian)', 'Capital at death (median)'), money(proj.summary.finalInvestable, { currency: cur, compact: true })],
      [t('Revenu requis à la retraite', 'Income needed at retirement'), proj.summary.retirementIncomeNeed ? money(proj.summary.retirementIncomeNeed, { currency: cur, compact: true }) : '—'],
      [t('Épuisement du capital', 'Capital depletion'), proj.summary.depletionAge ? `${proj.summary.depletionAge} ${t('ans', 'yrs')}` : t('Aucun ✓', 'None ✓'), proj.summary.depletionAge ? 'neg' : 'pos'],
    ]),
  ));

  wrap.appendChild(card(t('Composition des actifs', 'Asset composition'), { sub: t('Par traitement fiscal', 'By tax treatment') },
    h('div', { class: 'flex center', style: { justifyContent: 'center' } },
      h('div', { html: donutChart({ segments: donutSegs, centerLabel: money(nw.assets, { currency: cur, compact: true }), centerSub: t('actifs', 'assets') }) })),
    h('div', { class: 'sep' }),
    legend(donutSegs.map(s => ({ color: s.color, label: `${s.label} · ${money(s.value, { currency: cur, compact: true })}` }))),
  ));

  wrap.appendChild(card(t('Revenus vs dépenses dans le temps', 'Income vs expenses over time'), { class: 'span-2',
    right: legend([{ color: PALETTE[1], label: t('Revenus après impôt', 'After-tax income') }, { color: PALETTE[4], label: t('Dépenses + dettes', 'Expenses + debt') }]) },
    h('div', { html: barChart({
      xLabels: sampleYears.map(r => r.primaryAge),
      series: [
        { name: 'net', color: PALETTE[1], values: sampleYears.map(r => Math.round(r.afterTaxIncome)) },
        { name: 'exp', color: PALETTE[4], values: sampleYears.map(r => Math.round(r.need)) },
      ],
    }) }),
  ));

  const alerts = buildAlerts(client, proj, mc, nw, savingsRate, jur);
  wrap.appendChild(card(t('Recommandations', 'Recommendations'), { sub: t('Générées par le moteur de planification', 'Generated by the planning engine'),
    right: h('button', { class: 'btn sm ghost', onClick: () => navigate('goals'), html: t('Voir les objectifs', 'View goals') + ' ' + icon('chevron', 13) }) },
    alerts.length ? h('div', {}, ...alerts.map(a => h('div', {
      class: 'flex', style: { gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' } },
      h('span', { class: 'chip ' + a.kind, style: { flex: 'none', marginTop: '1px' }, html: icon(a.kind === 'neg' ? 'warning' : 'check', 13) }),
      h('div', {}, h('b', {}, a.title), h('div', { class: 'tiny muted' }, a.text)),
    ))) : h('div', { class: 'empty' }, t('Tout est optimal ✓', 'Everything looks optimal ✓')),
  ));

  return wrap;
}

function buildAlerts(client, proj, mc, nw, savingsRate, jur) {
  const a = [];
  if (mc.successRate < 0.75) a.push({ kind: 'neg', title: t('Plan de retraite à risque', 'Retirement plan at risk'),
    text: t(`La probabilité de succès est de ${pct(mc.successRate, 0)}. Envisagez de reporter la retraite, d'augmenter l'épargne ou de réduire les dépenses cibles.`,
      `Probability of success is ${pct(mc.successRate, 0)}. Consider delaying retirement, saving more, or lowering target spending.`) });
  if (proj.summary.depletionAge) a.push({ kind: 'neg', title: t('Épuisement du capital projeté', 'Projected capital depletion'),
    text: t(`Le capital investissable s'épuise vers ${proj.summary.depletionAge} ans selon le scénario déterministe.`,
      `Investable capital is depleted around age ${proj.summary.depletionAge} under the deterministic scenario.`) });
  if (savingsRate < 0.1) a.push({ kind: 'warn', title: t("Taux d'épargne faible", 'Low savings rate'),
    text: t(`Le taux d'épargne est de ${pct(savingsRate, 0)}. Une cible de 15 % accélère l'atteinte des objectifs.`,
      `Savings rate is ${pct(savingsRate, 0)}. A 15 % target accelerates reaching your goals.`) });
  if (nw.debtToAsset > 0.4) a.push({ kind: 'warn', title: t('Levier élevé', 'High leverage'),
    text: t(`Le ratio dettes/actifs est de ${pct(nw.debtToAsset, 0)}.`, `Debt-to-asset ratio is ${pct(nw.debtToAsset, 0)}.`) });
  const tfree = client.assets.filter(x => ['tfsa', 'roth', 'isa'].includes(x.type)).reduce((s, x) => s + (x.annualContribution || 0), 0);
  if (tfree === 0) a.push({ kind: 'warn', title: t('Compte libre d’impôt sous-utilisé', 'Tax-free account underused'),
    text: t(`Aucune cotisation périodique à un compte libre d'impôt (${jur.labels.taxFree}). C'est l'abri le plus efficace pour la croissance.`,
      `No regular contribution to a tax-free account (${jur.labels.taxFree}). It is the most efficient shelter for growth.`) });
  if (mc.successRate >= 0.85 && !proj.summary.depletionAge) a.push({ kind: 'pos', title: t('Trajectoire solide', 'Solid trajectory'),
    text: t(`Le plan atteint ${pct(mc.successRate, 0)} de succès. Opportunité d'optimisation fiscale ou de devancement de la retraite.`,
      `The plan reaches ${pct(mc.successRate, 0)} success. Opportunity for tax optimization or earlier retirement.`) });
  return a;
}
