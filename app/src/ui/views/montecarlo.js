import { h, money, pct, icon } from '../dom.js';
import { kpi, card, slider, statList, badgeScore, legend } from '../widgets.js';
import { fanChart, gauge, barChart, PALETTE } from '../charts.js';
import { runMonteCarlo } from '../../engine/montecarlo.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  let trials = 1000;
  const out = h('div', { class: 'grid', style: { gridColumn: '1 / -1' } });

  function run() {
    const mc = runMonteCarlo(client, { trials });
    const det = mc.det;

    out.replaceChildren(
      h('div', { class: 'grid cols-4 span-full' },
        kpi({ label: 'Probabilité de succès', value: pct(mc.successRate, 0), iconName: 'monte',
          accent: mc.successRate >= 0.85 ? 'var(--pos)' : mc.successRate >= 0.6 ? 'var(--warn)' : 'var(--neg)',
          sub: `${trials} trajectoires` }),
        kpi({ label: 'Capital médian (P50)', value: money(mc.medianFinal, { currency: cur, compact: true }), iconName: 'networth' }),
        kpi({ label: 'Pessimiste (P10)', value: money(mc.p10Final, { currency: cur, compact: true }), accent: mc.p10Final <= 0 ? 'var(--neg)' : '' }),
        kpi({ label: 'Optimiste (P90)', value: money(mc.p90Final, { currency: cur, compact: true }), accent: 'var(--pos)' }),
      ),
      card('Éventail des trajectoires de patrimoine', { class: 'span-3',
        sub: 'Bandes de percentiles P10–P90, médiane en gras',
        right: legend([{ color: 'var(--brand-400)', label: 'P10–P90' }, { color: 'var(--brand-600)', label: 'Médiane' }]) },
        h('div', { html: fanChart({ bands: mc.bands }) })),
      card('Verdict', {},
        h('div', { style: { textAlign: 'center' } }, h('div', { html: gauge({ value: mc.successRate, label: pct(mc.successRate, 0), sub: 'succès' }) })),
        h('div', { class: 'flex center', style: { justifyContent: 'center', margin: '4px 0 10px' } }, badgeScore(mc.successRate)),
        h('p', { class: 'tiny muted' }, interpret(mc.successRate)),
        h('div', { class: 'sep' }),
        statList([
          ['Capital initial investissable', money(det.rows[0].investable, { currency: cur, compact: true })],
          ['Année de retraite', `${det.summary.retirementAge} ans`],
          ['Horizon', `${det.summary.lifeExpectancy} ans`],
        ])),
    );
  }

  const ctrl = card('Paramètres de simulation', { sub: 'Méthode de Monte Carlo à rendements stochastiques (loi normale)',
    right: h('button', { class: 'btn primary sm', html: icon('monte', 14) + ' Relancer', onClick: run }) },
    h('div', { class: 'grid cols-3' },
      slider({ label: 'Nombre de trajectoires', value: trials, min: 200, max: 3000, step: 100,
        format: v => `${v}`, onInput: v => trials = v }),
      h('div', { class: 'field' }, h('label', {}, 'Rendement moyen (accum.)'), h('input', { value: pct(client.assumptions.preReturn), disabled: true })),
      h('div', { class: 'field' }, h('label', {}, 'Volatilité'), h('input', { value: pct(client.assumptions.returnStdev), disabled: true })),
    ),
    h('p', { class: 'tiny muted mb-0' }, 'Astuce : ajustez les rendements et la volatilité dans l’onglet Retraite ou Paramètres.'));

  run();
  return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, ctrl), out);
}

function interpret(r) {
  if (r >= 0.9) return 'Plan très robuste : le capital survit dans la grande majorité des marchés simulés. Possibilité d’optimiser la fiscalité ou de devancer la retraite.';
  if (r >= 0.75) return 'Plan solide mais sensible aux marchés défavorables. Une marge de sécurité (épargne accrue ou flexibilité des dépenses) renforcerait la résilience.';
  if (r >= 0.6) return 'Plan fragile : un nombre significatif de scénarios mènent à l’épuisement du capital. Reportez la retraite ou ajustez l’épargne et les dépenses.';
  return 'Plan à risque élevé : la majorité des scénarios échouent. Une révision en profondeur des hypothèses est recommandée.';
}
