import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { lineChart, PALETTE } from '../charts.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';
import { store as appStore } from '../../state/store.js';

// ---- Shared fee model (used by the Portfolio view too) ----------------------
/** Low-cost ETF MER used as the benchmark everywhere in the app. */
export const LOW_MER = 0.0040;
/**
 * Grow a balance with yearly contributions, netting a MER from the gross return.
 * Returns { final, series, feesPaid }. Same model in Fee compare and Portfolio.
 */
export function growWithFees({ start = 0, contrib = 0, years = 25, grossReturn = 0.06, mer = 0 }) {
  const r = grossReturn - mer; let bal = Math.max(0, +start || 0); const series = [bal]; let feesPaid = 0;
  const n = Math.max(0, Math.min(80, Math.round(+years || 0)));
  for (let y = 0; y < n; y++) { feesPaid += bal * mer; bal = bal * (1 + r) + (+contrib || 0); series.push(bal); }
  return { final: bal, series, feesPaid };
}

// Investment fee / product comparator — defaults pulled from the client's
// investable portfolio, actual contributions and the file's return assumption.
export function render({ store, client, jur }) {
  store = store || appStore;
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const investable = F.buckets.taxable + F.buckets.taxfree + F.buckets.deferred;
  const annualContrib = F.household.contributions;

  const P = whatIf(client, 'feecompare', { start: Math.round(investable || 200000), contrib: Math.round(annualContrib || 12000), years: 25,
    grossReturn: F.assumptions.preReturn, merHigh: 0.0200, merLow: LOW_MER });
  const setP = (k, v) => { P[k] = v; saveWhatIf(store, 'feecompare', { [k]: v }); };

  const out = h('div', {});
  const grow = (mer) => growWithFees({ start: P.start, contrib: P.contrib, years: P.years, grossReturn: P.grossReturn, mer });
  function draw() {
    const a = grow(P.merHigh), b = grow(P.merLow);
    out.replaceChildren(
      h('div', { class: 'grid cols-4', style: { marginBottom: '12px' } },
        kpi({ label: t('Valeur — frais élevés', 'Value — high fees'), value: money(a.final, { currency: cur, compact: true }), sub: `MER ${pct(P.merHigh, 2)}` }),
        kpi({ label: t('Valeur — frais bas', 'Value — low fees'), value: money(b.final, { currency: cur, compact: true }), sub: `MER ${pct(P.merLow, 2)}`, accent: 'var(--pos)' }),
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
        [t('Capital de départ', 'Starting capital'), money(P.start, { currency: cur })],
        [t('Cotisation annuelle', 'Annual contribution'), money(P.contrib, { currency: cur })],
        [t('Rendement brut', 'Gross return'), pct(P.grossReturn)],
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

  const ctrl = card(t('Comparer les frais de placement', 'Compare investment fees'), { sub: t(`FNB à faible coût vs fonds communs à frais élevés — placements du dossier ${money(investable, { currency: cur, compact: true })}, cotisations ${money(annualContrib, { currency: cur, compact: true })}/an`, `Low-cost ETFs vs high-fee mutual funds — investments on file ${money(investable, { currency: cur, compact: true })}, contributions ${money(annualContrib, { currency: cur, compact: true })}/yr`) },
    h('div', { class: 'grid cols-3' },
      slider({ label: t('Capital de départ', 'Starting capital'), value: P.start, min: 0, max: 5000000, step: 25000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('start', v); draw(); } }),
      slider({ label: t('Cotisation annuelle', 'Annual contribution'), value: P.contrib, min: 0, max: 200000, step: 1000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('contrib', v); draw(); } }),
      slider({ label: t('Horizon (ans)', 'Horizon (yrs)'), value: P.years, min: 5, max: 50, step: 1, format: v => `${v}`, onInput: v => { setP('years', v); draw(); } }),
      slider({ label: t('Rendement brut (hypothèse du dossier)', 'Gross return (file assumption)'), value: P.grossReturn, min: 0.02, max: 0.12, step: 0.005, format: v => pct(v), onInput: v => { setP('grossReturn', v); draw(); } }),
      slider({ label: t('MER élevé (fonds communs)', 'High MER (mutual funds)'), value: P.merHigh, min: 0.005, max: 0.035, step: 0.0005, format: v => pct(v, 2), onInput: v => { setP('merHigh', v); draw(); } }),
      slider({ label: t('MER bas (FNB)', 'Low MER (ETF)'), value: P.merLow, min: 0.0005, max: 0.02, step: 0.0005, format: v => pct(v, 2), onInput: v => { setP('merLow', v); draw(); } }),
    ));

  return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, ctrl), h('div', { class: 'span-full' }, out));
}
