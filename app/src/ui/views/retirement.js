import { h, money, pct, icon, toast } from '../dom.js';
import { kpi, card, slider, statList, badgeScore, legend } from '../widgets.js';
import { lineChart, gauge, PALETTE } from '../charts.js';
import { runProjection } from '../../engine/projection.js';
import { runMonteCarlo } from '../../engine/montecarlo.js';
import { store } from '../../state/store.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  // Working copy so sliders feel instant without persisting on every tick
  const scen = JSON.parse(JSON.stringify(client));
  const primary = scen.members[0];
  let spendingMult = 1;

  const results = h('div', { class: 'grid cols-3', style: { gridColumn: '1 / -1' } });

  function redraw() {
    const work = JSON.parse(JSON.stringify(scen));
    work.expenses.forEach(e => e.amount *= spendingMult);
    const proj = runProjection(work);
    const mc = runMonteCarlo(work, { trials: 500 });
    const rows = proj.rows;
    const xLabels = rows.map(r => r.primaryAge);
    const retIdx = rows.findIndex(r => r.primaryRetired);

    const chart = lineChart({
      series: [{ name: 'Actifs investissables', color: PALETTE[0], values: rows.map(r => r.investable) }],
      xLabels, area: true,
    });

    results.replaceChildren(
      // gauge + verdict
      card('Probabilité de succès', { class: '' },
        h('div', { style: { textAlign: 'center' } }, h('div', { html: gauge({ value: mc.successRate, label: pct(mc.successRate, 0), sub: 'à vie' }) })),
        h('div', { class: 'flex center', style: { justifyContent: 'center', marginTop: '2px' } }, badgeScore(mc.successRate)),
      ),
      // KPIs
      card('Indicateurs', { class: 'span-2' },
        h('div', { class: 'grid cols-2' },
          statList([
            ['Âge de retraite', `${primary.retirementAge} ans`],
            ['Revenu requis (1re année)', proj.summary.retirementIncomeNeed ? money(proj.summary.retirementIncomeNeed, { currency: cur, compact: true }) : '—'],
            ['Taux d\'imposition moyen retraite', proj.summary.avgTaxRateRetire != null ? pct(proj.summary.avgTaxRateRetire, 0) : '—'],
          ]),
          statList([
            ['Capital médian au décès', money(mc.medianFinal, { currency: cur, compact: true })],
            ['Scénario pessimiste (P10)', money(mc.p10Final, { currency: cur, compact: true }), mc.p10Final <= 0 ? 'neg' : ''],
            ['Épuisement du capital', proj.summary.depletionAge ? `${proj.summary.depletionAge} ans` : 'Aucun', proj.summary.depletionAge ? 'neg' : 'pos'],
          ]),
        )),
      // projection chart
      card('Trajectoire des actifs investissables', { class: 'span-3',
        sub: retIdx > 0 ? `Retraite à ${rows[retIdx].primaryAge} ans` : '',
        right: legend([{ color: PALETTE[0], label: 'Actifs investissables (déterministe)' }]) },
        h('div', { html: chart })),
    );
  }

  const controls = card('Scénario interactif', { sub: 'Ajustez les leviers — recalcul en direct',
    right: h('button', { class: 'btn accent sm', html: icon('check', 14) + ' Appliquer au dossier',
      onClick: () => { store.update(c => { c.members[0].retirementAge = primary.retirementAge; c.assumptions = scen.assumptions; }); toast('Scénario appliqué ✓', ''); } }) },
    h('div', { class: 'grid cols-2' },
      slider({ label: 'Âge de retraite', value: primary.retirementAge, min: 50, max: 75, step: 1,
        format: v => `${v} ans`, onInput: v => { primary.retirementAge = v; redraw(); } }),
      slider({ label: 'Inflation', value: scen.assumptions.inflation, min: 0, max: 0.06, step: 0.001,
        format: v => pct(v), onInput: v => { scen.assumptions.inflation = v; redraw(); } }),
      slider({ label: 'Rendement avant retraite', value: scen.assumptions.preReturn, min: 0.01, max: 0.1, step: 0.001,
        format: v => pct(v), onInput: v => { scen.assumptions.preReturn = v; redraw(); } }),
      slider({ label: 'Rendement à la retraite', value: scen.assumptions.postReturn, min: 0.01, max: 0.08, step: 0.001,
        format: v => pct(v), onInput: v => { scen.assumptions.postReturn = v; redraw(); } }),
      slider({ label: 'Volatilité (écart-type)', value: scen.assumptions.returnStdev, min: 0.03, max: 0.2, step: 0.005,
        format: v => pct(v), onInput: v => { scen.assumptions.returnStdev = v; redraw(); } }),
      slider({ label: 'Niveau de dépenses cible', value: 1, min: 0.6, max: 1.4, step: 0.02,
        format: v => pct(v, 0), onInput: v => { spendingMult = v; redraw(); } }),
    ));

  redraw();
  return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, controls), results);
}
