import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, statList, legend } from '../widgets.js';
import { lineChart, PALETTE } from '../charts.js';
import { highMarginalThreshold } from '../../engine/healthcheck.js';
import { clientFacts, retirementFacts } from '../../engine/facts.js';

// Multi-year tax smoothing — reads the REAL projection and flags windows
// where the marginal rate is low (realize income) or high (defer).
// Thresholds are derived from the jurisdiction's brackets, never hard-coded.
export function render({ client, jur, navigate }) {
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const R = retirementFacts(client, jur);
  const proj = R.projection;
  const rows = proj.rows;
  const ages = rows.map(r => r.primaryAge);

  // low = first combined bracket rate (+2 pts of tolerance); high = within 8 pts of the top combined rate
  const fedFirst = jur.fed?.brackets?.[0]?.rate || 0;
  const regFirst = (jur.regionData?.brackets || jur.fed?.brackets || [])[0]?.rate || 0;
  const lowThresh = fedFirst * (1 - (jur.regionData?.federalAbatement || 0)) + regFirst + 0.02;
  const highThresh = Math.max(lowThresh + 0.05, highMarginalThreshold(jur));

  const windows = [];
  let cur2 = null;
  rows.forEach((r) => {
    const kind = r.marginalRate <= lowThresh ? 'low' : r.marginalRate >= highThresh ? 'high' : 'mid';
    if (!cur2 || cur2.kind !== kind) { if (cur2) windows.push(cur2); cur2 = { kind, from: r.primaryAge, to: r.primaryAge, avgMarg: r.marginalRate, n: 1 }; }
    else { cur2.to = r.primaryAge; cur2.avgMarg = (cur2.avgMarg * cur2.n + r.marginalRate) / (cur2.n + 1); cur2.n++; }
  });
  if (cur2) windows.push(cur2);
  const lowWindows = windows.filter(w => w.kind === 'low' && w.n >= 2);

  const kpis = h('div', { class: 'grid cols-4 span-full' },
    kpi({ label: t('Impôt à vie projeté', 'Projected lifetime tax'), value: money(R.totalLifetimeTax, { currency: cur, compact: true }), iconName: 'tax',
      sub: R.totalOasClawback > 0 ? t(`dont ${money(R.totalOasClawback, { currency: cur, compact: true })} de récupération PSV`, `incl. ${money(R.totalOasClawback, { currency: cur, compact: true })} OAS clawback`) : '' }),
    kpi({ label: t('Taux marginal actuel', 'Current marginal rate'), value: pct(F.household.marginalRate, 0), sub: t(`Seuils : faible ≤ ${pct(lowThresh, 0)} · élevé ≥ ${pct(highThresh, 0)}`, `Thresholds: low ≤ ${pct(lowThresh, 0)} · high ≥ ${pct(highThresh, 0)}`) }),
    kpi({ label: t('Fenêtres à faible taux', 'Low-rate windows'), value: lowWindows.length, accent: lowWindows.length ? 'var(--pos)' : '', sub: t('réaliser du revenu', 'realize income') }),
    kpi({ label: t('Taux moyen à la retraite', 'Avg rate in retirement'), value: R.averageRate != null ? pct(R.averageRate, 0) : '—', sub: R.marginalRate != null ? t(`marginal ${pct(R.marginalRate, 0)}`, `marginal ${pct(R.marginalRate, 0)}`) : '' }),
  );

  const chart = card(t('Taux marginal et revenu imposable dans le temps', 'Marginal rate & taxable income over time'), { class: 'span-full',
    sub: t('Identifier les années pour réaliser ou reporter du revenu', 'Spot years to realize or defer income'),
    right: legend([{ color: PALETTE[5], label: t('Taux marginal', 'Marginal rate') }, { color: PALETTE[0], label: t('Revenu imposable', 'Taxable income') }]) },
    h('div', { html: lineChart({ series: [{ color: PALETTE[0], values: rows.map(r => Math.round(r.taxableIncome)) }], xLabels: ages, area: true }) }),
    h('div', { html: lineChart({ series: [{ color: PALETTE[5], values: rows.map(r => Math.round(r.marginalRate * 100)) }], xLabels: ages, area: false, height: 180 }) }),
    h('div', { class: 'tiny muted' }, t('Courbe du haut : revenu imposable ($). Courbe du bas : taux marginal (%).', 'Top: taxable income ($). Bottom: marginal rate (%).')));

  const oppWindows = windows.filter(w => w.n >= 2);
  const windowRow = (w) => {
    const title = w.kind === 'low' ? t('Faible taux marginal — réaliser du revenu', 'Low marginal rate — realize income')
      : w.kind === 'high' ? t('Taux marginal élevé — reporter le revenu', 'High marginal rate — defer income')
        : t('Taux intermédiaire', 'Mid rate');
    const advice = w.kind === 'low' ? t('Idéal pour la fonte du REER, la réalisation de gains en capital, des dividendes ou des conversions.', 'Ideal for RRSP meltdown, realizing capital gains, dividends or conversions.')
      : w.kind === 'high' ? t('Maximisez les déductions (REER, RRI) et reportez les gains discrétionnaires.', 'Maximize deductions (RRSP, IPP) and defer discretionary gains.')
        : t('Équilibre — peu d’action requise.', 'Balanced — little action needed.');
    const prefix = t(`Taux marginal moyen ${pct(w.avgMarg, 0)}. `, `Average marginal rate ${pct(w.avgMarg, 0)}. `);
    return h('div', { class: 'flex', style: { gap: '12px', padding: '11px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' } },
      h('span', { class: 'chip ' + (w.kind === 'low' ? 'pos' : w.kind === 'high' ? 'neg' : 'info'), style: { flex: 'none' } }, `${w.from}–${w.to} ${t('ans', 'yrs')}`),
      h('div', { class: 'grow' }, h('b', {}, title), h('div', { class: 'tiny muted' }, prefix + advice)),
    );
  };
  const oppCard = card(t('Fenêtres d’opportunité fiscale', 'Tax opportunity windows'), { class: 'span-full',
    sub: t(`Seuils dérivés des tranches ${jur.taxYear} de ${jur.regionName} : faible ≤ ${pct(lowThresh, 1)}, élevé ≥ ${pct(highThresh, 1)}`, `Thresholds derived from the ${jur.taxYear} ${jur.regionName} brackets: low ≤ ${pct(lowThresh, 1)}, high ≥ ${pct(highThresh, 1)}`) },
    oppWindows.length
      ? h('div', {}, ...oppWindows.map(windowRow))
      : h('div', { class: 'empty' }, t('Données insuffisantes', 'Not enough data')),
    h('p', { class: 'tiny muted', style: { marginTop: '10px' } },
      t('Le lissage du revenu imposable d’une année à l’autre réduit l’impôt total payé à vie. Combinez avec le décaissement optimal et l’optimisation fiscale.',
        'Smoothing taxable income year to year reduces total lifetime tax. Combine with optimal decumulation and tax optimization.')),
    h('button', { class: 'btn sm ghost', style: { marginTop: '8px' }, onClick: () => navigate('decumulation'), html: t('Voir le décaissement optimal', 'See optimal decumulation') + ' ' + icon('chevron', 13) }));

  return h('div', { class: 'grid' }, kpis, chart, oppCard);
}
