import { h, money, pct, icon, t } from '../dom.js';
import { kpi, card, slider, statList, badgeScore, legend } from '../widgets.js';
import { fanChart, gauge, PALETTE } from '../charts.js';
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
        kpi({ label: t('Probabilité de succès', 'Probability of success'), value: pct(mc.successRate, 0), iconName: 'monte',
          accent: mc.successRate >= 0.85 ? 'var(--pos)' : mc.successRate >= 0.6 ? 'var(--warn)' : 'var(--neg)',
          sub: t(`${trials} trajectoires`, `${trials} paths`) }),
        kpi({ label: t('Capital médian (P50)', 'Median capital (P50)'), value: money(mc.medianFinal, { currency: cur, compact: true }), iconName: 'networth' }),
        kpi({ label: t('Pessimiste (P10)', 'Pessimistic (P10)'), value: money(mc.p10Final, { currency: cur, compact: true }), accent: mc.p10Final <= 0 ? 'var(--neg)' : '' }),
        kpi({ label: t('Optimiste (P90)', 'Optimistic (P90)'), value: money(mc.p90Final, { currency: cur, compact: true }), accent: 'var(--pos)' }),
      ),
      card(t('Éventail des trajectoires de patrimoine', 'Range of wealth paths'), {
        sub: t('Bandes de percentiles P10–P90, médiane en gras', 'Percentile bands P10–P90, median in bold'),
        right: legend([{ color: 'var(--brand-400)', label: 'P10–P90' }, { color: 'var(--brand-600)', label: t('Médiane', 'Median') }]) },
        h('div', { html: fanChart({ bands: mc.bands }) })),
      card(t('Verdict', 'Verdict'), {},
        h('div', { style: { textAlign: 'center' } }, h('div', { html: gauge({ value: mc.successRate, label: pct(mc.successRate, 0), sub: t('succès', 'success') }) })),
        h('div', { class: 'flex center', style: { justifyContent: 'center', margin: '4px 0 10px' } }, badgeScore(mc.successRate)),
        h('p', { class: 'tiny muted' }, interpret(mc.successRate)),
        h('div', { class: 'sep' }),
        statList([
          [t('Capital initial investissable', 'Initial investable capital'), money(det.rows[0].investable, { currency: cur, compact: true })],
          [t('Année de retraite', 'Retirement age'), `${det.summary.retirementAge} ${t('ans', 'yrs')}`],
          [t('Horizon', 'Horizon'), `${det.summary.lifeExpectancy} ${t('ans', 'yrs')}`],
        ])),
    );
  }

  const ctrl = card(t('Paramètres de simulation', 'Simulation parameters'), { sub: t('Méthode de Monte Carlo à rendements stochastiques (loi normale)', 'Monte Carlo with stochastic returns (normal distribution)'),
    right: h('button', { class: 'btn primary sm', html: icon('monte', 14) + ' ' + t('Relancer', 'Re-run'), onClick: run }) },
    h('div', { class: 'grid cols-3' },
      slider({ label: t('Nombre de trajectoires', 'Number of paths'), value: trials, min: 200, max: 3000, step: 100, format: v => `${v}`, onInput: v => trials = v }),
      h('div', { class: 'field' }, h('label', {}, t('Rendement moyen (accum.)', 'Mean return (accum.)')), h('input', { value: pct(client.assumptions.preReturn), disabled: true })),
      h('div', { class: 'field' }, h('label', {}, t('Volatilité', 'Volatility')), h('input', { value: pct(client.assumptions.returnStdev), disabled: true })),
    ),
    h('p', { class: 'tiny muted mb-0' }, t('Astuce : ajustez les rendements et la volatilité dans l’onglet Retraite ou Paramètres.', 'Tip: adjust returns and volatility in the Retirement or Settings tab.')));

  run();
  return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, ctrl), out);
}

function interpret(r) {
  if (r >= 0.9) return t('Plan très robuste : le capital survit dans la grande majorité des marchés simulés. Possibilité d’optimiser la fiscalité ou de devancer la retraite.',
    'Very robust plan: capital survives in the vast majority of simulated markets. Room to optimize taxes or retire earlier.');
  if (r >= 0.75) return t('Plan solide mais sensible aux marchés défavorables. Une marge de sécurité (épargne accrue ou flexibilité des dépenses) renforcerait la résilience.',
    'Solid plan but sensitive to poor markets. A safety margin (more saving or flexible spending) would strengthen resilience.');
  if (r >= 0.6) return t('Plan fragile : un nombre significatif de scénarios mènent à l’épuisement du capital. Reportez la retraite ou ajustez l’épargne et les dépenses.',
    'Fragile plan: a significant number of scenarios deplete capital. Delay retirement or adjust saving and spending.');
  return t('Plan à risque élevé : la majorité des scénarios échouent. Une révision en profondeur des hypothèses est recommandée.',
    'High-risk plan: most scenarios fail. A thorough review of the assumptions is recommended.');
}
