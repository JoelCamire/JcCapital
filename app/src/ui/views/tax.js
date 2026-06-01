import { h, money, pct, num, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, donutChart, PALETTE } from '../charts.js';
import { computeTax } from '../../engine/tax.js';
import { getJurisdiction } from '../../jurisdictions/index.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  let income = client.incomes.filter(i => ['employment', 'self'].includes(i.type)).reduce((s, i) => s + i.amount, 0) || 90000;
  let capGains = 0, eligibleDiv = 0;
  const fs = client.filingStatus;

  const out = h('div', { class: 'grid', style: { gridColumn: '1 / -1' } });

  function redraw() {
    const tx = computeTax(jur, { ordinary: income, capGains, eligibleDiv, filingStatus: fs });
    const segs = [
      { label: t('Fédéral', 'Federal'), value: tx.federal, color: PALETTE[0] },
      { label: jur.regionLabel, value: tx.regional, color: PALETTE[2] },
      { label: t('Cotisations sociales', 'Payroll / social'), value: tx.payroll, color: PALETTE[4] },
      { label: t('Revenu net', 'Net income'), value: tx.afterTax, color: PALETTE[6] },
    ].filter(s => s.value > 0.5);

    out.replaceChildren(
      h('div', { class: 'grid cols-4 span-full' },
        kpi({ label: t('Impôt total', 'Total tax'), value: money(tx.total, { currency: cur }), iconName: 'tax', accent: 'var(--neg)' }),
        kpi({ label: t('Revenu net', 'Net income'), value: money(tx.afterTax, { currency: cur }), accent: 'var(--pos)' }),
        kpi({ label: t('Taux marginal', 'Marginal rate'), value: pct(tx.marginalRate, 1), sub: t('sur le prochain dollar', 'on the next dollar') }),
        kpi({ label: t('Taux moyen', 'Average rate'), value: pct(tx.averageRate, 1), sub: t('effectif global', 'overall effective') }),
      ),
      card(t('Décomposition de la charge fiscale', 'Tax burden breakdown'), { sub: `${jur.flag} ${jur.name} — ${jur.regionName} · ${t('revenu', 'income')} ${money(income, { currency: cur })}` },
        h('div', { class: 'flex center', style: { justifyContent: 'center' } },
          h('div', { html: donutChart({ segments: segs, centerLabel: pct(tx.averageRate, 0), centerSub: t('taux moyen', 'avg rate') }) })),
        h('div', { class: 'sep' }),
        legend(segs.map(s => ({ color: s.color, label: `${s.label} · ${money(s.value, { currency: cur })}` }))),
      ),
      card(t('Détail', 'Detail'), {},
        statList([
          [t('Revenu imposable', 'Taxable income'), money(income + capGains + eligibleDiv, { currency: cur })],
          [t('Impôt fédéral', 'Federal tax'), money(tx.federal, { currency: cur }), 'neg'],
          [t(`Impôt ${jur.regionLabel.toLowerCase()}`, `${jur.regionLabel} tax`), money(tx.regional, { currency: cur }), 'neg'],
          [t('Cotisations sociales', 'Payroll / social'), money(tx.payroll, { currency: cur }), 'neg'],
          [t('— Impôt total', '— Total tax'), money(tx.total, { currency: cur }), 'neg'],
          [t('Revenu après impôt', 'After-tax income'), money(tx.afterTax, { currency: cur }), 'pos'],
          [t('Revenu net mensuel', 'Net monthly income'), money(tx.afterTax / 12, { currency: cur }), 'pos'],
        ])),
      regionComparison(),
    );
  }

  function regionComparison() {
    const regions = Object.keys(jur.regions);
    const data = regions.map(r => {
      const jr = getJurisdiction(jur.country, r);
      const tx = computeTax(jr, { ordinary: income, capGains, eligibleDiv, filingStatus: fs });
      return { region: r, name: jur.regions[r], total: tx.total, net: tx.afterTax, avg: tx.averageRate, marginal: tx.marginalRate };
    }).sort((a, b) => a.total - b.total);

    return card(t(`Comparaison — ${jur.regionLabel}s du ${jur.name}`, `Comparison — ${jur.name} ${jur.regionLabel.toLowerCase()}s`), { class: 'span-full',
      sub: t(`Impôt total sur un revenu de ${money(income, { currency: cur })}`, `Total tax on income of ${money(income, { currency: cur })}`),
      right: legend([{ color: PALETTE[5], label: t('Impôt total', 'Total tax') }, { color: PALETTE[6], label: t('Revenu net', 'Net income') }]) },
      h('div', { html: barChart({
        xLabels: data.map(d => d.name.length > 14 ? d.region : d.name),
        series: [
          { color: PALETTE[5], values: data.map(d => Math.round(d.total)) },
          { color: PALETTE[6], values: data.map(d => Math.round(d.net)) },
        ], stacked: true,
      }) }),
      h('div', { class: 'tbl-wrap', style: { marginTop: '12px', maxHeight: '300px' } },
        h('table', { class: 'tbl' },
          h('thead', {}, h('tr', {}, h('th', {}, jur.regionLabel), h('th', { class: 'num' }, t('Impôt total', 'Total tax')),
            h('th', { class: 'num' }, t('Taux moyen', 'Avg rate')), h('th', { class: 'num' }, t('Taux marginal', 'Marginal')), h('th', { class: 'num' }, t('Revenu net', 'Net income')))),
          h('tbody', {}, ...data.map((d, i) => h('tr', {},
            h('td', {}, h('b', {}, d.name), i === 0 ? h('span', { class: 'chip pos', style: { marginLeft: '8px' } }, t('plus avantageux', 'most favorable')) : null),
            h('td', { class: 'num mono' }, money(d.total, { currency: cur })),
            h('td', { class: 'num mono' }, pct(d.avg, 1)),
            h('td', { class: 'num mono' }, pct(d.marginal, 1)),
            h('td', { class: 'num mono' }, money(d.net, { currency: cur })),
          ))))));
  }

  const ctrl = card(t('Paramètres de revenu', 'Income parameters'), { sub: t('Calculateur d\'impôt en temps réel', 'Real-time tax calculator') },
    h('div', { class: 'grid cols-3' },
      slider({ label: t('Revenu ordinaire', 'Ordinary income'), value: income, min: 0, max: 500000, step: 1000,
        format: v => money(v, { currency: cur, compact: true }), onInput: v => { income = v; redraw(); } }),
      slider({ label: jur.country === 'CA' ? t('Gain en capital réalisé', 'Realized capital gain') : t('Gain en capital LT', 'Long-term capital gains'), value: capGains, min: 0, max: 300000, step: 1000,
        format: v => money(v, { currency: cur, compact: true }), onInput: v => { capGains = v; redraw(); } }),
      jur.country === 'CA'
        ? slider({ label: t('Dividendes déterminés', 'Eligible dividends'), value: eligibleDiv, min: 0, max: 150000, step: 1000,
          format: v => money(v, { currency: cur, compact: true }), onInput: v => { eligibleDiv = v; redraw(); } })
        : h('div', { class: 'field' }, h('label', {}, t('Statut', 'Status')), h('input', { value: fs === 'married' ? t('Marié (MFJ)', 'Married (MFJ)') : t('Célibataire', 'Single'), disabled: true })),
    ));

  redraw();
  return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, ctrl), out);
}
