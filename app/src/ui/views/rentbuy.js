import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { lineChart, PALETTE } from '../charts.js';
import { analyzeRentBuy } from '../../engine/rentbuy.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const p = { price: 600000, downPct: 0.20, rate: 0.05, amortYears: 25, propertyTaxPct: 0.01, maintenancePct: 0.01,
    closingPct: 0.015, appreciation: client.assumptions.realEstateGrowth ?? 0.03, rentMonthly: 2400, rentGrowth: 0.025,
    investmentReturn: client.assumptions.preReturn ?? 0.05, holdYears: 25 };

  const out = h('div', {});
  function draw() {
    const r = analyzeRentBuy(p);
    const winner = r.advantage >= 0 ? t('Acheter', 'Buy') : t('Louer', 'Rent');
    out.replaceChildren(
      h('div', { class: 'grid cols-4', style: { marginBottom: '12px' } },
        kpi({ label: t('Avantage net', 'Net advantage'), value: winner, accent: 'var(--pos)', sub: money(Math.abs(r.advantage), { currency: cur, compact: true }) }),
        kpi({ label: t('Avoir net — acheter', 'Net worth — buy'), value: money(r.buyFinal, { currency: cur, compact: true }) }),
        kpi({ label: t('Avoir net — louer', 'Net worth — rent'), value: money(r.rentFinal, { currency: cur, compact: true }) }),
        kpi({ label: t('Point mort', 'Break-even'), value: r.breakeven ? t(`An ${r.breakeven}`, `Year ${r.breakeven}`) : t('Aucun', 'None') }),
      ),
      h('div', { html: lineChart({ series: [
        { color: PALETTE[0], values: r.series.map(s => Math.round(s.buyNetWorth)) },
        { color: PALETTE[2], values: r.series.map(s => Math.round(s.rentNetWorth)) },
      ], xLabels: r.series.map(s => s.year), area: false }) }),
      legend([{ color: PALETTE[0], label: t('Acheter (avoir net)', 'Buy (net worth)') }, { color: PALETTE[2], label: t('Louer + investir (avoir net)', 'Rent + invest (net worth)') }]),
      h('div', { class: 'sep' }),
      statList([
        [t('Mise de fonds + frais de clôture', 'Down payment + closing'), money(r.down + r.closing, { currency: cur })],
        [t('Versement hypothécaire mensuel', 'Monthly mortgage payment'), money(r.monthlyMortgage, { currency: cur })],
        [t('Avoir net après ' + p.holdYears + ' ans — acheter', 'Net worth after ' + p.holdYears + ' yrs — buy'), money(r.buyFinal, { currency: cur }), 'pos'],
        [t('Avoir net après ' + p.holdYears + ' ans — louer', 'Net worth after ' + p.holdYears + ' yrs — rent'), money(r.rentFinal, { currency: cur }), 'pos'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } }, r.note),
    );
  }
  draw();

  const ctrl = card(t('Hypothèses — Achat vs Location', 'Assumptions — Rent vs Buy'), {},
    h('div', { class: 'grid cols-3' },
      slider({ label: t('Prix de la propriété', 'Property price'), value: p.price, min: 200000, max: 3000000, step: 25000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { p.price = v; draw(); } }),
      slider({ label: t('Mise de fonds', 'Down payment'), value: p.downPct, min: 0.05, max: 1, step: 0.05, format: v => pct(v, 0), onInput: v => { p.downPct = v; draw(); } }),
      slider({ label: t('Taux hypothécaire', 'Mortgage rate'), value: p.rate, min: 0.02, max: 0.1, step: 0.0025, format: v => pct(v, 2), onInput: v => { p.rate = v; draw(); } }),
      slider({ label: t('Loyer mensuel comparable', 'Comparable monthly rent'), value: p.rentMonthly, min: 800, max: 8000, step: 100, format: v => money(v, { currency: cur }), onInput: v => { p.rentMonthly = v; draw(); } }),
      slider({ label: t('Appréciation immobilière', 'Home appreciation'), value: p.appreciation, min: 0, max: 0.08, step: 0.005, format: v => pct(v), onInput: v => { p.appreciation = v; draw(); } }),
      slider({ label: t('Rendement des placements', 'Investment return'), value: p.investmentReturn, min: 0.02, max: 0.12, step: 0.005, format: v => pct(v), onInput: v => { p.investmentReturn = v; draw(); } }),
      slider({ label: t('Durée de détention (ans)', 'Holding period (yrs)'), value: p.holdYears, min: 3, max: 40, step: 1, format: v => `${v}`, onInput: v => { p.holdYears = v; draw(); } }),
    ));

  return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, ctrl), h('div', { class: 'span-full' }, card(t('Résultat', 'Result'), {}, out)));
}
