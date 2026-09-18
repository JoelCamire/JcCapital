import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { lineChart, PALETTE } from '../charts.js';
import { analyzeRentBuy } from '../../engine/rentbuy.js';
import { compoundingFor } from '../../engine/amortization.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';
import { store as appStore } from '../../state/store.js';

export function render({ store, client, jur }) {
  store = store || appStore;
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const compounding = compoundingFor('mortgage', jur.country);
  const home = F.home, mtg = F.mortgage;

  // Price / rate / amortization / down payment from the home & mortgage on file when present
  const priceDef = home && home.value > 0 ? Math.round(home.value) : 600000;
  const downDef = home && mtg && home.value > 0 ? Math.min(1, Math.max(0.05, Math.round((1 - mtg.balance / home.value) * 20) / 20)) : 0.20;
  const P = whatIf(client, 'rentbuy', {
    price: priceDef, downPct: downDef,
    rate: mtg ? Math.round(mtg.rate * 10000) / 10000 : 0.05,
    amortYears: mtg && mtg.amortizationYears ? mtg.amortizationYears : 25,
    propertyTaxPct: 0.01, maintenancePct: 0.01, closingPct: 0.015, sellingCostPct: 0.05,
    appreciation: F.assumptions.realEstateGrowth,
    rentMonthly: Math.round(priceDef * 0.004 / 100) * 100,          // ~0.4 % of price per month as a starting point
    rentGrowth: F.assumptions.inflation,
    investmentReturn: F.assumptions.preReturn, holdYears: 25,
  });
  const setP = (k, v) => { P[k] = v; saveWhatIf(store, 'rentbuy', { [k]: v }); };

  const out = h('div', {});
  function draw() {
    const r = analyzeRentBuy({ ...P, compounding });
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
        [t(`Versement hypothécaire mensuel (capitalisation ${compounding === 'semi-annual' ? 'semestrielle' : 'mensuelle'})`, `Monthly mortgage payment (${compounding === 'semi-annual' ? 'semi-annual' : 'monthly'} compounding)`), money(r.monthlyMortgage, { currency: cur })],
        [t('Avoir net après ' + P.holdYears + ' ans — acheter', 'Net worth after ' + P.holdYears + ' yrs — buy'), money(r.buyFinal, { currency: cur }), 'pos'],
        [t('Avoir net après ' + P.holdYears + ' ans — louer', 'Net worth after ' + P.holdYears + ' yrs — rent'), money(r.rentFinal, { currency: cur }), 'pos'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } }, r.note),
    );
  }
  draw();

  const ctrl = card(t('Hypothèses — Achat vs Location', 'Assumptions — Rent vs Buy'), {
    sub: t(`Valeurs initiales du dossier : ${home ? 'immeuble ' + money(home.value, { currency: cur, compact: true }) : 'aucun immeuble'}, ${mtg ? 'hypothèque à ' + pct(mtg.rate, 2) : 'aucune hypothèque'}, croissance immobilière ${pct(F.assumptions.realEstateGrowth, 1)}, rendement ${pct(F.assumptions.preReturn, 1)}`, `Initial values from the file: ${home ? 'property ' + money(home.value, { currency: cur, compact: true }) : 'no property'}, ${mtg ? 'mortgage at ' + pct(mtg.rate, 2) : 'no mortgage'}, real-estate growth ${pct(F.assumptions.realEstateGrowth, 1)}, return ${pct(F.assumptions.preReturn, 1)}`) },
    h('div', { class: 'grid cols-3' },
      slider({ label: t('Prix de la propriété', 'Property price'), value: P.price, min: 200000, max: 3000000, step: 25000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('price', v); draw(); } }),
      slider({ label: t('Mise de fonds', 'Down payment'), value: P.downPct, min: 0.05, max: 1, step: 0.05, format: v => pct(v, 0), onInput: v => { setP('downPct', v); draw(); } }),
      slider({ label: t('Taux hypothécaire', 'Mortgage rate'), value: P.rate, min: 0.02, max: 0.1, step: 0.0025, format: v => pct(v, 2), onInput: v => { setP('rate', v); draw(); } }),
      slider({ label: t('Amortissement (ans)', 'Amortization (yrs)'), value: P.amortYears, min: 5, max: 30, step: 1, format: v => `${v}`, onInput: v => { setP('amortYears', v); draw(); } }),
      slider({ label: t('Loyer mensuel comparable', 'Comparable monthly rent'), value: P.rentMonthly, min: 800, max: 8000, step: 100, format: v => money(v, { currency: cur }), onInput: v => { setP('rentMonthly', v); draw(); } }),
      slider({ label: t('Appréciation immobilière', 'Home appreciation'), value: P.appreciation, min: 0, max: 0.08, step: 0.005, format: v => pct(v), onInput: v => { setP('appreciation', v); draw(); } }),
      slider({ label: t('Rendement des placements', 'Investment return'), value: P.investmentReturn, min: 0.02, max: 0.12, step: 0.005, format: v => pct(v), onInput: v => { setP('investmentReturn', v); draw(); } }),
      slider({ label: t('Croissance des loyers', 'Rent growth'), value: P.rentGrowth, min: 0, max: 0.06, step: 0.0025, format: v => pct(v, 2), onInput: v => { setP('rentGrowth', v); draw(); } }),
      slider({ label: t('Durée de détention (ans)', 'Holding period (yrs)'), value: P.holdYears, min: 3, max: 40, step: 1, format: v => `${v}`, onInput: v => { setP('holdYears', v); draw(); } }),
    ));

  return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, ctrl), h('div', { class: 'span-full' }, card(t('Résultat', 'Result'), {}, out)));
}
