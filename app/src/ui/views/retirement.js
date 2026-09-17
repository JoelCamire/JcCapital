import { h, money, pct, icon, toast, t } from '../dom.js';
import { kpi, card, slider, statList, badgeScore, legend } from '../widgets.js';
import { lineChart, gauge, PALETTE } from '../charts.js';
import { runProjection } from '../../engine/projection.js';
import { runMonteCarlo } from '../../engine/montecarlo.js';
import { clientFacts } from '../../engine/facts.js';

export function render({ store, client, jur }) {
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  // Working copy: every lever lives where the engines read it (members[].retirementAge, assumptions.*)
  const scen = JSON.parse(JSON.stringify(client));
  scen.assumptions = { ...F.assumptions, ...(scen.assumptions || {}) };
  const A = scen.assumptions;
  const primary = scen.members[0];

  const results = h('div', { class: 'grid cols-3', style: { gridColumn: '1 / -1' } });

  function redraw() {
    const work = JSON.parse(JSON.stringify(scen));       // spendingLevel is honoured by the projection itself
    const proj = runProjection(work);
    const mc = runMonteCarlo(work);                      // app-wide trial count, no override
    const rows = proj.rows;
    const xLabels = rows.map(r => r.primaryAge);
    const retIdx = rows.findIndex(r => r.primaryRetired);

    const chart = lineChart({ series: [{ color: PALETTE[0], values: rows.map(r => r.investable) }], xLabels, area: true });

    results.replaceChildren(
      card(t('Probabilité de succès', 'Probability of success'), { sub: t(`${mc.trials} trajectoires`, `${mc.trials} paths`) },
        h('div', { style: { textAlign: 'center' } }, h('div', { html: gauge({ value: mc.successRate, label: pct(mc.successRate, 0), sub: t('à vie', 'lifetime') }) })),
        h('div', { class: 'flex center', style: { justifyContent: 'center', marginTop: '2px' } }, badgeScore(mc.successRate)),
      ),
      card(t('Indicateurs', 'Indicators'), { class: 'span-2' },
        h('div', { class: 'grid cols-2' },
          statList([
            [t('Âge de retraite', 'Retirement age'), scen.members.map(m => `${m.name.split(' ')[0]} ${m.retirementAge}`).join(' · ')],
            [t('Revenu requis (1re année)', 'Income needed (year 1)'), proj.summary.retirementIncomeNeed ? money(proj.summary.retirementIncomeNeed, { currency: cur, compact: true }) : '—'],
            [t('Taux d\'imposition moyen retraite', 'Avg tax rate in retirement'), proj.summary.avgTaxRateRetire != null ? pct(proj.summary.avgTaxRateRetire, 0) : '—'],
          ]),
          statList([
            [t('Capital médian au décès', 'Median capital at death'), money(mc.medianFinal, { currency: cur, compact: true })],
            [t('Scénario pessimiste (P10)', 'Pessimistic (P10)'), money(mc.p10Final, { currency: cur, compact: true }), mc.p10Final <= 0 ? 'neg' : ''],
            [t('Épuisement du capital', 'Capital depletion'), proj.summary.depletionAge ? `${proj.summary.depletionAge} ${t('ans', 'yrs')}` : t('Aucun', 'None'), proj.summary.depletionAge ? 'neg' : 'pos'],
          ]),
        )),
      card(t('Trajectoire des actifs investissables', 'Investable assets trajectory'), { class: 'span-3',
        sub: retIdx > 0 ? t(`Retraite à ${rows[retIdx].primaryAge} ans`, `Retirement at ${rows[retIdx].primaryAge}`) : '',
        right: legend([{ color: PALETTE[0], label: t('Actifs investissables (déterministe)', 'Investable assets (deterministic)') }]) },
        h('div', { html: chart })),
    );
  }

  const apply = () => {
    store.update(c => {
      for (const m of scen.members) { const target = c.members.find(x => x.id === m.id); if (target) target.retirementAge = m.retirementAge; }
      c.assumptions = { ...c.assumptions, inflation: A.inflation, preReturn: A.preReturn, postReturn: A.postReturn, returnStdev: A.returnStdev, spendingLevel: A.spendingLevel };
    });
    toast(t('Scénario appliqué ✓', 'Scenario applied ✓'));
  };

  const memberSliders = scen.members.map(m => slider({
    label: t(`Âge de retraite — ${m.name}`, `Retirement age — ${m.name}`), value: m.retirementAge, min: 50, max: 75, step: 1,
    format: v => `${v} ${t('ans', 'yrs')}`, onInput: v => { m.retirementAge = v; redraw(); } }));

  const controls = card(t('Scénario interactif', 'Interactive scenario'), { sub: t('Ajustez les leviers — recalcul en direct · « Appliquer » écrit les valeurs dans le dossier (âges de retraite, hypothèses, niveau de dépenses)', 'Adjust the levers — live recompute · “Apply” writes the values into the file (retirement ages, assumptions, spending level)'),
    right: h('button', { class: 'btn accent sm', html: icon('check', 14) + ' ' + t('Appliquer au dossier', 'Apply to file'), onClick: apply }) },
    h('div', { class: 'grid cols-2' },
      ...memberSliders,
      slider({ label: 'Inflation', value: A.inflation, min: 0, max: 0.06, step: 0.001, format: v => pct(v), onInput: v => { A.inflation = v; redraw(); } }),
      slider({ label: t('Rendement avant retraite', 'Return before retirement'), value: A.preReturn, min: 0.01, max: 0.1, step: 0.001, format: v => pct(v), onInput: v => { A.preReturn = v; redraw(); } }),
      slider({ label: t('Rendement à la retraite', 'Return in retirement'), value: A.postReturn, min: 0.01, max: 0.08, step: 0.001, format: v => pct(v), onInput: v => { A.postReturn = v; redraw(); } }),
      slider({ label: t('Volatilité (écart-type)', 'Volatility (std-dev)'), value: A.returnStdev, min: 0.03, max: 0.2, step: 0.005, format: v => pct(v), onInput: v => { A.returnStdev = v; redraw(); } }),
      slider({ label: t('Niveau de dépenses cible', 'Target spending level'), value: A.spendingLevel, min: 0.6, max: 1.4, step: 0.02, format: v => pct(v, 0), onInput: v => { A.spendingLevel = v; redraw(); } }),
    ));

  redraw();
  return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, controls), results);
}
