import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, legend, statList, badgeScore } from '../widgets.js';
import { lineChart, donutChart, barChart, gauge, PALETTE } from '../charts.js';
import { treatmentOf } from '../../engine/projection.js';
import { runMonteCarlo } from '../../engine/montecarlo.js';
import { clientFacts, retirementFacts } from '../../engine/facts.js';

export function render({ client, jur, navigate }) {
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const R = retirementFacts(client, jur);
  const proj = R.projection;
  const mc = runMonteCarlo(client);                 // the ONE app-wide run (same probability on every screen)
  const nw = F.netWorth;
  const r0 = proj.rows[0];

  const annualSavings = F.household.contributions;
  const savingsRate = F.household.savingsRate;
  const target = F.assumptions.savingsTarget;

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
      accent: savingsRate >= target ? 'var(--pos)' : savingsRate >= target / 2 ? 'var(--warn)' : 'var(--neg)',
      sub: t(`${money(annualSavings, { currency: cur, compact: true })} / an investis · cible ${pct(target, 0)}`, `${money(annualSavings, { currency: cur, compact: true })} / yr invested · target ${pct(target, 0)}`) }),
    kpi({ label: t('Impôt à vie estimé', 'Estimated lifetime tax'), value: money(R.totalLifetimeTax, { currency: cur, compact: true }), iconName: 'tax',
      sub: t(`Taux marg. actuel ${pct(F.household.marginalRate, 0)} · ${jur.taxYear}`, `Current marginal rate ${pct(F.household.marginalRate, 0)} · ${jur.taxYear}`) }),
  ));

  wrap.appendChild(card(t('Projection de la valeur nette', 'Net worth projection'), {
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

  wrap.appendChild(h('div', { class: 'grid cols-2 span-full' },
    card(t('Préparation à la retraite', 'Retirement readiness'), { sub: t(`Retraite à ${R.retirementAge} ans`, `Retirement at ${R.retirementAge}`) },
      h('div', { style: { textAlign: 'center' } }, h('div', { html: gauge({ value: mc.successRate, label: pct(mc.successRate, 0), sub: t('succès', 'success') }) })),
      h('div', { class: 'flex center', style: { justifyContent: 'center', gap: '8px', marginTop: '4px' } }, badgeScore(mc.successRate)),
      h('div', { class: 'sep' }),
      statList([
        [t('Capital au décès (médian)', 'Capital at death (median)'), money(mc.medianFinal, { currency: cur, compact: true })],
        [t('Revenu requis à la retraite', 'Income needed at retirement'), R.spending ? money(R.spending, { currency: cur, compact: true }) : '—'],
        [t('Épuisement du capital', 'Capital depletion'), R.depletionAge ? `${R.depletionAge} ${t('ans', 'yrs')}` : t('Aucun ✓', 'None ✓'), R.depletionAge ? 'neg' : 'pos'],
      ]),
    ),
    card(t('Composition des actifs', 'Asset composition'), { sub: t('Par traitement fiscal', 'By tax treatment') },
      h('div', { class: 'flex center', style: { justifyContent: 'center' } },
        h('div', { html: donutChart({ segments: donutSegs, centerLabel: money(nw.assets, { currency: cur, compact: true }), centerSub: t('actifs', 'assets') }) })),
      h('div', { class: 'sep' }),
      legend(donutSegs.map(s => ({ color: s.color, label: `${s.label} · ${money(s.value, { currency: cur, compact: true })}` }))),
    ),
  ));

  const alerts = buildAlerts(client, F, R, mc, jur);
  wrap.appendChild(h('div', { class: 'grid cols-2 span-full' },
    card(t('Revenus vs dépenses dans le temps', 'Income vs expenses over time'), {
      right: legend([{ color: PALETTE[1], label: t('Revenus après impôt', 'After-tax income') }, { color: PALETTE[4], label: t('Dépenses + dettes', 'Expenses + debt') }]) },
      h('div', { html: barChart({
        xLabels: sampleYears.map(r => r.primaryAge),
        series: [
          { name: 'net', color: PALETTE[1], values: sampleYears.map(r => Math.round(r.afterTaxIncome)) },
          { name: 'exp', color: PALETTE[4], values: sampleYears.map(r => Math.round(r.need)) },
        ],
      }) }),
    ),
    card(t('Recommandations', 'Recommendations'), { sub: t('Générées par le moteur de planification', 'Generated by the planning engine'),
      right: h('button', { class: 'btn sm ghost', onClick: () => navigate('goals'), html: t('Voir les objectifs', 'View goals') + ' ' + icon('chevron', 13) }) },
      alerts.length ? h('div', {}, ...alerts.map(a => h('div', {
        class: 'flex', style: { gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' } },
        h('span', { class: 'chip ' + a.kind, style: { flex: 'none', marginTop: '1px' }, html: icon(a.kind === 'neg' ? 'warning' : 'check', 13) }),
        h('div', {}, h('b', {}, a.title), h('div', { class: 'tiny muted' }, a.text)),
      ))) : h('div', { class: 'empty' }, t('Tout est optimal ✓', 'Everything looks optimal ✓')),
    ),
  ));

  return wrap;
}

function buildAlerts(client, F, R, mc, jur) {
  const a = [];
  const nw = F.netWorth;
  const savingsRate = F.household.savingsRate;
  const target = F.assumptions.savingsTarget;
  if (mc.successRate < 0.75) a.push({ kind: 'neg', title: t('Plan de retraite à risque', 'Retirement plan at risk'),
    text: t(`La probabilité de succès est de ${pct(mc.successRate, 0)}. Envisagez de reporter la retraite, d'augmenter l'épargne ou de réduire les dépenses cibles.`,
      `Probability of success is ${pct(mc.successRate, 0)}. Consider delaying retirement, saving more, or lowering target spending.`) });
  if (R.depletionAge) a.push({ kind: 'neg', title: t('Épuisement du capital projeté', 'Projected capital depletion'),
    text: t(`Le capital investissable s'épuise vers ${R.depletionAge} ans selon le scénario déterministe.`,
      `Investable capital is depleted around age ${R.depletionAge} under the deterministic scenario.`) });
  if (F.household.grossIncome > 0 && savingsRate < target) a.push({ kind: 'warn', title: t("Taux d'épargne sous la cible", 'Savings rate below target'),
    text: t(`Le taux d'épargne est de ${pct(savingsRate, 0)}. La cible du dossier est ${pct(target, 0)} du revenu brut.`,
      `Savings rate is ${pct(savingsRate, 0)}. The file's target is ${pct(target, 0)} of gross income.`) });
  if (nw.debtToAsset > 0.4) a.push({ kind: 'warn', title: t('Levier élevé', 'High leverage'),
    text: t(`Le ratio dettes/actifs est de ${pct(nw.debtToAsset, 0)}.`, `Debt-to-asset ratio is ${pct(nw.debtToAsset, 0)}.`) });
  const tfree = F.household.contributionsByTreatment.taxfree || 0;
  if (tfree === 0 && F.household.grossIncome > 0) a.push({ kind: 'warn', title: t('Compte libre d’impôt sous-utilisé', 'Tax-free account underused'),
    text: t(`Aucune cotisation périodique à un compte libre d'impôt (${jur.labels.taxFree}). C'est l'abri le plus efficace pour la croissance.`,
      `No regular contribution to a tax-free account (${jur.labels.taxFree}). It is the most efficient shelter for growth.`) });
  if (F.household.surplus < 0) a.push({ kind: 'warn', title: t('Budget déficitaire', 'Budget deficit'),
    text: t(`Dépenses, dettes et cotisations dépassent le revenu net de ${money(-F.household.surplus, { currency: jur.currency, compact: true })}/an.`,
      `Expenses, debt and contributions exceed net income by ${money(-F.household.surplus, { currency: jur.currency, compact: true })}/yr.`) });
  if (mc.successRate >= 0.85 && !R.depletionAge) a.push({ kind: 'pos', title: t('Trajectoire solide', 'Solid trajectory'),
    text: t(`Le plan atteint ${pct(mc.successRate, 0)} de succès. Opportunité d'optimisation fiscale ou de devancement de la retraite.`,
      `The plan reaches ${pct(mc.successRate, 0)} success. Opportunity for tax optimization or earlier retirement.`) });
  return a;
}
