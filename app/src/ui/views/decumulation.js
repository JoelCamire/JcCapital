import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend, badgeScore } from '../widgets.js';
import { lineChart, barChart, PALETTE } from '../charts.js';
import { compareDecumulation, strategyLabel, strategyDesc } from '../../engine/decumulation.js';
import { treatmentOf } from '../../engine/projection.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const primary = client.members[0] || { retirementAge: 65, lifeExpectancy: 92 };
  const sum = (pred) => client.assets.filter(pred).reduce((s, a) => s + a.value, 0);
  const sumBasis = (pred) => client.assets.filter(pred).reduce((s, a) => s + (a.costBasis ?? a.value), 0);

  const p = {
    startAge: primary.retirementAge, endAge: primary.lifeExpectancy,
    deferred: Math.round(sum(a => treatmentOf(a.type) === 'deferred') || 1200000),
    tfsa: Math.round(sum(a => treatmentOf(a.type) === 'taxfree') || 150000),
    nonreg: Math.round(sum(a => treatmentOf(a.type) === 'taxable') || 400000),
    nonregBasis: Math.round(sumBasis(a => treatmentOf(a.type) === 'taxable') || 280000),
    otherIncomeNow: Math.round(client.incomes.filter(i => ['cpp', 'pension'].includes(i.type)).reduce((s, i) => s + i.amount, 0) || 22000),
    oasAnnual: Math.round(client.incomes.filter(i => i.type === 'oas').reduce((s, i) => s + i.amount, 0) || 8700),
    spending: Math.round(client.expenses.reduce((s, e) => s + e.amount * (e.retirementFactor ?? 1), 0) || 80000),
    inflation: client.assumptions.inflation, returnRate: client.assumptions.postReturn, bracketTarget: 60000,
  };

  const out = h('div', {});
  function draw() {
    const cmp = compareDecumulation(jur, p);
    const byKey = Object.fromEntries(cmp.results.map(r => [r.strategy, r]));
    const best = byKey[cmp.best];
    const baseline = byKey.nonregFirst;
    const taxSaved = baseline.totalTax - best.totalTax;
    const estateGain = best.finalEstate - baseline.finalEstate;
    const labels = cmp.results.map(r => strategyLabel(r.strategy));

    out.replaceChildren(
      h('div', { class: 'grid cols-3', style: { marginBottom: '12px' } },
        kpi({ label: t('Stratégie optimale', 'Optimal strategy'), value: strategyLabel(cmp.best), accent: 'var(--pos)' }),
        kpi({ label: t('Impôt à vie économisé', 'Lifetime tax saved'), value: money(taxSaved, { currency: cur, compact: true }), accent: 'var(--pos)' }),
        kpi({ label: t('Succession nette de plus', 'Extra net estate'), value: money(estateGain, { currency: cur, compact: true }), accent: 'var(--pos)' }),
      ),
      h('div', { class: 'grid cols-2' },
        card(t('Impôt à vie + récupération PSV', 'Lifetime tax + OAS clawback'), {},
          h('div', { html: barChart({ xLabels: labels.map((l, i) => l.length > 14 ? l.slice(0, 12) + '…' : l),
            series: [{ color: PALETTE[5], values: cmp.results.map(r => Math.round(r.totalTax)) }, { color: PALETTE[3], values: cmp.results.map(r => Math.round(r.totalClawback)) }] }) }),
          legend([{ color: PALETTE[5], label: t('Impôt à vie', 'Lifetime tax') }, { color: PALETTE[3], label: t('Récupération PSV', 'OAS clawback') }])),
        card(t('Succession nette projetée', 'Projected net estate'), {},
          h('div', { html: barChart({ xLabels: labels.map((l, i) => l.length > 14 ? l.slice(0, 12) + '…' : l),
            series: [{ color: PALETTE[1], values: cmp.results.map(r => Math.round(r.finalEstate)) }] }) })),
      ),
      card(t('Évolution de la succession (stratégie optimale)', 'Estate over time (optimal strategy)'), { class: 'span-full',
        right: legend([{ color: PALETTE[0], label: strategyLabel(cmp.best) }, { color: PALETTE[4], label: strategyLabel('nonregFirst') }]) },
        h('div', { html: lineChart({ series: [
          { color: PALETTE[0], values: best.rows.map(r => Math.round(r.estate)) },
          { color: PALETTE[4], values: baseline.rows.map(r => Math.round(r.estate)) },
        ], xLabels: best.rows.map(r => r.age), area: true }) })),
      card(t('Détail des stratégies', 'Strategy detail'), { class: 'span-full' },
        h('div', { class: 'grid cols-3' }, ...cmp.results.map(r => h('div', { class: 'card', style: { background: r.strategy === cmp.best ? 'var(--pos-soft)' : 'var(--surface-2)' } },
          h('div', { class: 'flex between center' }, h('b', {}, strategyLabel(r.strategy)), r.strategy === cmp.best ? h('span', { class: 'chip pos' }, t('Optimal', 'Optimal')) : null),
          h('div', { class: 'tiny muted', style: { margin: '6px 0' } }, strategyDesc(r.strategy)),
          statList([
            [t('Impôt à vie', 'Lifetime tax'), money(r.totalTax, { currency: cur, compact: true })],
            [t('Récupération PSV', 'OAS clawback'), money(r.totalClawback, { currency: cur, compact: true })],
            [t('Succession nette', 'Net estate'), money(r.finalEstate, { currency: cur, compact: true })],
          ]))))),
    );
  }
  draw();

  const ctrl = card(t('Hypothèses de décaissement', 'Decumulation assumptions'), {
    sub: t('Soldes à la retraite et besoin de revenu', 'Balances at retirement and income need') },
    h('div', { class: 'grid cols-3' },
      slider({ label: t('REER / FERR', 'RRSP/RRIF'), value: p.deferred, min: 0, max: 5000000, step: 50000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { p.deferred = v; draw(); } }),
      slider({ label: 'CELI / TFSA', value: p.tfsa, min: 0, max: 1000000, step: 10000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { p.tfsa = v; draw(); } }),
      slider({ label: t('Non enregistré', 'Non-registered'), value: p.nonreg, min: 0, max: 3000000, step: 25000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { p.nonreg = v; draw(); } }),
      slider({ label: t('Dépenses annuelles (retraite)', 'Annual spending (retirement)'), value: p.spending, min: 20000, max: 250000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { p.spending = v; draw(); } }),
      slider({ label: t('Autre revenu imposable (RRQ/rentes)', 'Other taxable income (CPP/pension)'), value: p.otherIncomeNow, min: 0, max: 100000, step: 1000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { p.otherIncomeNow = v; draw(); } }),
      slider({ label: t('Cible de tranche (fonte)', 'Bracket target (meltdown)'), value: p.bracketTarget, min: 30000, max: 120000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { p.bracketTarget = v; draw(); } }),
    ),
    h('p', { class: 'tiny muted', style: { marginTop: '8px' } },
      t('Compare trois ordres de décaissement en modélisant les retraits minimaux du FERR et la récupération de la PSV. La « fonte du REER » lisse l’impôt et réduit souvent la récupération de la PSV pour les portefeuilles enregistrés importants.',
        'Compares three withdrawal orders, modelling forced RRIF minimums and OAS clawback. The “RRSP meltdown” smooths tax and often reduces OAS clawback for large registered portfolios.')));

  return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, ctrl), h('div', { class: 'span-full' }, out));
}
