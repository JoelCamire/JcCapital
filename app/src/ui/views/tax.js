import { h, money, pct, num } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, donutChart, PALETTE } from '../charts.js';
import { computeTax } from '../../engine/tax.js';
import { getJurisdiction, JURISDICTIONS } from '../../jurisdictions/index.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  let income = client.incomes.filter(i => ['employment', 'self'].includes(i.type)).reduce((s, i) => s + i.amount, 0) || 90000;
  let capGains = 0, eligibleDiv = 0;
  const fs = client.filingStatus;

  const out = h('div', { class: 'grid', style: { gridColumn: '1 / -1' } });

  function redraw() {
    const t = computeTax(jur, { ordinary: income, capGains, eligibleDiv, filingStatus: fs });

    // bracket fill visualization (ordinary income only)
    const brackets = (jur.regionData?.brackets && jur.country !== 'US') ? null : null;
    const segs = [
      { label: 'Fédéral', value: t.federal, color: PALETTE[0] },
      { label: jur.regionLabel, value: t.regional, color: PALETTE[2] },
      { label: 'Cotisations sociales', value: t.payroll, color: PALETTE[4] },
      { label: 'Revenu net', value: t.afterTax, color: PALETTE[6] },
    ].filter(s => s.value > 0.5);

    out.replaceChildren(
      h('div', { class: 'grid cols-4 span-full' },
        kpi({ label: 'Impôt total', value: money(t.total, { currency: cur }), iconName: 'tax', accent: 'var(--neg)' }),
        kpi({ label: 'Revenu net', value: money(t.afterTax, { currency: cur }), accent: 'var(--pos)' }),
        kpi({ label: 'Taux marginal', value: pct(t.marginalRate, 1), sub: 'sur le prochain dollar' }),
        kpi({ label: 'Taux moyen', value: pct(t.averageRate, 1), sub: 'effectif global' }),
      ),
      card('Décomposition de la charge fiscale', { sub: `${jur.flag} ${jur.name} — ${jur.regionName} · revenu ${money(income, { currency: cur })}` },
        h('div', { class: 'flex center', style: { justifyContent: 'center' } },
          h('div', { html: donutChart({ segments: segs, centerLabel: pct(t.averageRate, 0), centerSub: 'taux moyen' }) })),
        h('div', { class: 'sep' }),
        legend(segs.map(s => ({ color: s.color, label: `${s.label} · ${money(s.value, { currency: cur })}` }))),
      ),
      card('Détail', {},
        statList([
          ['Revenu imposable', money(income + capGains + eligibleDiv, { currency: cur })],
          ['Impôt fédéral', money(t.federal, { currency: cur }), 'neg'],
          [`Impôt ${jur.regionLabel.toLowerCase()}`, money(t.regional, { currency: cur }), 'neg'],
          ['Cotisations sociales', money(t.payroll, { currency: cur }), 'neg'],
          ['— Impôt total', money(t.total, { currency: cur }), 'neg'],
          ['Revenu après impôt', money(t.afterTax, { currency: cur }), 'pos'],
          ['Revenu net mensuel', money(t.afterTax / 12, { currency: cur }), 'pos'],
        ])),
      regionComparison(),
    );
  }

  function regionComparison() {
    const regions = Object.keys(jur.regions);
    const data = regions.map(r => {
      const jr = getJurisdiction(jur.country, r);
      const t = computeTax(jr, { ordinary: income, capGains, eligibleDiv, filingStatus: fs });
      return { region: r, name: jur.regions[r], total: t.total, net: t.afterTax, avg: t.averageRate, marginal: t.marginalRate };
    }).sort((a, b) => a.total - b.total);

    return card(`Comparaison — ${jur.regionLabel}s du ${jur.name}`, { class: 'span-full',
      sub: `Impôt total sur un revenu de ${money(income, { currency: cur })}`,
      right: legend([{ color: PALETTE[5], label: 'Impôt total' }, { color: PALETTE[6], label: 'Revenu net' }]) },
      h('div', { html: barChart({
        xLabels: data.map(d => d.name.length > 14 ? d.region : d.name),
        series: [
          { name: 'Impôt', color: PALETTE[5], values: data.map(d => Math.round(d.total)) },
          { name: 'Net', color: PALETTE[6], values: data.map(d => Math.round(d.net)) },
        ], stacked: true,
      }) }),
      h('div', { class: 'tbl-wrap', style: { marginTop: '12px', maxHeight: '300px' } },
        h('table', { class: 'tbl' },
          h('thead', {}, h('tr', {}, h('th', {}, jur.regionLabel), h('th', { class: 'num' }, 'Impôt total'),
            h('th', { class: 'num' }, 'Taux moyen'), h('th', { class: 'num' }, 'Taux marginal'), h('th', { class: 'num' }, 'Revenu net'))),
          h('tbody', {}, ...data.map((d, i) => h('tr', {},
            h('td', {}, h('b', {}, d.name), i === 0 ? h('span', { class: 'chip pos', style: { marginLeft: '8px' } }, 'plus avantageux') : null),
            h('td', { class: 'num mono' }, money(d.total, { currency: cur })),
            h('td', { class: 'num mono' }, pct(d.avg, 1)),
            h('td', { class: 'num mono' }, pct(d.marginal, 1)),
            h('td', { class: 'num mono' }, money(d.net, { currency: cur })),
          ))))));
  }

  const ctrl = card('Paramètres de revenu', { sub: 'Calculateur d\'impôt en temps réel' },
    h('div', { class: 'grid cols-3' },
      slider({ label: 'Revenu ordinaire', value: income, min: 0, max: 500000, step: 1000,
        format: v => money(v, { currency: cur, compact: true }), onInput: v => { income = v; redraw(); } }),
      slider({ label: jur.country === 'CA' ? 'Gain en capital réalisé' : 'Long-term capital gains', value: capGains, min: 0, max: 300000, step: 1000,
        format: v => money(v, { currency: cur, compact: true }), onInput: v => { capGains = v; redraw(); } }),
      jur.country === 'CA'
        ? slider({ label: 'Dividendes déterminés', value: eligibleDiv, min: 0, max: 150000, step: 1000,
          format: v => money(v, { currency: cur, compact: true }), onInput: v => { eligibleDiv = v; redraw(); } })
        : h('div', { class: 'field' }, h('label', {}, 'Statut'), h('input', { value: fs === 'married' ? 'Marié (MFJ)' : 'Célibataire', disabled: true })),
    ));

  redraw();
  return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, ctrl), out);
}
