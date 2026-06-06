import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { lineChart, PALETTE } from '../charts.js';
import { treatmentOf } from '../../engine/projection.js';

// Investment fee / product comparator — defaults pulled from the client's
// investable portfolio and savings rate.
export function render({ client, jur }) {
  const cur = jur.currency;
  const investable = client.assets.filter(a => ['taxable', 'taxfree', 'deferred'].includes(treatmentOf(a.type))).reduce((s, a) => s + a.value, 0);
  const annualContrib = client.assets.reduce((s, a) => s + (a.annualContribution || 0), 0);

  const p = { start: Math.round(investable || 200000), contrib: Math.round(annualContrib || 12000), years: 25,
    grossReturn: client.assumptions.preReturn ?? 0.06, merHigh: 0.0200, merLow: 0.0040 };

  const out = h('div', {});
  function grow(mer) {
    const r = p.grossReturn - mer; let bal = p.start; const series = [bal]; let feesPaid = 0;
    for (let y = 0; y < p.years; y++) { feesPaid += bal * mer; bal = bal * (1 + r) + p.contrib; series.push(bal); }
    return { final: bal, series, feesPaid };
  }
  function draw() {
    const a = grow(p.merHigh), b = grow(p.merLow);
    const gross = grow(0);
    out.replaceChildren(
      h('div', { class: 'grid cols-4', style: { marginBottom: '12px' } },
        kpi({ label: t('Valeur — frais élevés', 'Value — high fees'), value: money(a.final, { currency: cur, compact: true }), sub: `MER ${pct(p.merHigh, 2)}` }),
        kpi({ label: t('Valeur — frais bas', 'Value — low fees'), value: money(b.final, { currency: cur, compact: true }), sub: `MER ${pct(p.merLow, 2)}`, accent: 'var(--pos)' }),
        kpi({ label: t('Écart (coût des frais)', 'Difference (fee cost)'), value: money(b.final - a.final, { currency: cur, compact: true }), accent: 'var(--pos)' }),
        kpi({ label: t('Frais totaux payés (élevés)', 'Total fees paid (high)'), value: money(a.feesPaid, { currency: cur, compact: true }), accent: 'var(--neg)' }),
      ),
      h('div', { html: lineChart({ series: [
        { color: PALETTE[6], values: b.series.map(v => Math.round(v)) },
        { color: PALETTE[5], values: a.series.map(v => Math.round(v)) },
      ], xLabels: b.series.map((_, i) => i), area: false }) }),
      legend([{ color: PALETTE[6], label: t('Frais bas (FNB)', 'Low fees (ETF)') }, { color: PALETTE[5], label: t('Frais élevés (fonds communs)', 'High fees (mutual funds)') }]),
      h('div', { class: 'sep' }),
      statList([
        [t('Capital de départ', 'Starting capital'), money(p.start, { currency: cur })],
        [t('Cotisation annuelle', 'Annual contribution'), money(p.contrib, { currency: cur })],
        [t('Rendement brut', 'Gross return'), pct(p.grossReturn)],
        [t('Frais payés — frais élevés', 'Fees paid — high'), money(a.feesPaid, { currency: cur }), 'neg'],
        [t('Frais payés — frais bas', 'Fees paid — low'), money(b.feesPaid, { currency: cur })],
        [t('Économie sur les frais', 'Fee savings'), money(a.feesPaid - b.feesPaid, { currency: cur }), 'pos'],
        [t('Patrimoine supplémentaire à la fin', 'Extra wealth at the end'), money(b.final - a.final, { currency: cur }), 'pos'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } },
        t('Une différence de frais de 1 à 2 % par an compose en une somme énorme sur des décennies — souvent des centaines de milliers de dollars. C’est l’un des leviers les plus puissants et les plus contrôlables du plan.',
          'A 1–2% annual fee difference compounds into a huge sum over decades — often hundreds of thousands of dollars. It is one of the most powerful and controllable levers in the plan.')),
    );
  }
  draw();

  const ctrl = card(t('Comparer les frais de placement', 'Compare investment fees'), { sub: t('FNB à faible coût vs fonds communs à frais élevés', 'Low-cost ETFs vs high-fee mutual funds') },
    h('div', { class: 'grid cols-3' },
      slider({ label: t('Capital de départ', 'Starting capital'), value: p.start, min: 0, max: 5000000, step: 25000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { p.start = v; draw(); } }),
      slider({ label: t('Cotisation annuelle', 'Annual contribution'), value: p.contrib, min: 0, max: 200000, step: 1000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { p.contrib = v; draw(); } }),
      slider({ label: t('Horizon (ans)', 'Horizon (yrs)'), value: p.years, min: 5, max: 50, step: 1, format: v => `${v}`, onInput: v => { p.years = v; draw(); } }),
      slider({ label: t('Rendement brut', 'Gross return'), value: p.grossReturn, min: 0.02, max: 0.12, step: 0.005, format: v => pct(v), onInput: v => { p.grossReturn = v; draw(); } }),
      slider({ label: t('MER élevé (fonds communs)', 'High MER (mutual funds)'), value: p.merHigh, min: 0.005, max: 0.035, step: 0.0005, format: v => pct(v, 2), onInput: v => { p.merHigh = v; draw(); } }),
      slider({ label: t('MER bas (FNB)', 'Low MER (ETF)'), value: p.merLow, min: 0.0005, max: 0.02, step: 0.0005, format: v => pct(v, 2), onInput: v => { p.merLow = v; draw(); } }),
    ));

  return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, ctrl), h('div', { class: 'span-full' }, out));
}
