import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, PALETTE } from '../charts.js';
import { equityComp } from '../../engine/equity.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';
import { store as appStore } from '../../state/store.js';

export function render({ store, client, jur }) {
  store = store || appStore;
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const prim = F.primary || { marginal: { ordinary: 0.5 }, ordinary: 100000 };

  // Marginal rate & other income from the primary member's derived facts; overrides persisted
  const P = whatIf(client, 'equity', {
    shares: 10000, strike: 5, fmvExercise: 25, fmvSale: 40, grantFmv: 5,
    marginalRate: Math.round(prim.marginal.ordinary * 100) / 100,
    instrument: 'option', isCCPC: jur.country === 'CA' && !!(F.business && F.business.incorporated), isISO: false,
  });
  const setP = (k, v) => { P[k] = v; saveWhatIf(store, 'equity', { [k]: v }); };
  const params = () => ({ ...P, otherIncome: prim.ordinary });

  const out = h('div', {});
  function draw() {
    const r = equityComp(jur, params());
    const rows = [
      [t('Actions', 'Shares'), num(P.shares)],
      r.instrument === 'rsu'
        ? [t('Revenu d’emploi à l’acquisition', 'Employment income at vest'), money(r.employmentBenefit, { currency: cur })]
        : [t('Avantage (écart à l’exercice)', 'Benefit (spread at exercise)'), money(r.employmentBenefit, { currency: cur })],
      r.deduction ? [t(`Déduction pour options (${pct(jur.capGainsInclusion ?? 0.5, 0)})`, `Stock-option deduction (${pct(jur.capGainsInclusion ?? 0.5, 0)})`), '− ' + money(r.deduction, { currency: cur }), 'pos'] : null,
      r.amtPreference ? [t('Préférence AMT (ISO)', 'AMT preference (ISO)'), money(r.amtPreference, { currency: cur }), 'warn'] : null,
      [t(`Impôt sur l’avantage (${pct(P.marginalRate, 0)})`, `Tax on benefit (${pct(P.marginalRate, 0)})`), money(r.taxOnBenefit, { currency: cur }), 'neg'],
      [t('Gain en capital (exercice → vente)', 'Capital gain (exercise → sale)'), money(r.capGain, { currency: cur })],
      [t('Taux effectif sur le gain', 'Effective rate on the gain'), pct(r.capGainsRate, 1)],
      [t('Impôt sur le gain', 'Tax on gain'), money(r.capGainsTax, { currency: cur }), 'neg'],
      [t('Impôt total', 'Total tax'), money(r.totalTax, { currency: cur }), 'neg'],
      [t('Net après impôt', 'Net after tax'), money(r.netAfterTax, { currency: cur }), 'pos'],
    ].filter(Boolean);

    out.replaceChildren(
      h('div', { class: 'grid cols-3', style: { marginBottom: '12px' } },
        kpi({ label: t('Impôt total', 'Total tax'), value: money(r.totalTax, { currency: cur, compact: true }), accent: 'var(--neg)' }),
        kpi({ label: t('Net après impôt', 'Net after tax'), value: money(r.netAfterTax, { currency: cur, compact: true }), accent: 'var(--pos)' }),
        kpi({ label: t('Moment de l’imposition', 'Tax timing'), value: r.timing, sub: t(`gain imposé à ${pct(r.capGainsRate, 1)}`, `gain taxed at ${pct(r.capGainsRate, 1)}`) }),
      ),
      h('div', { html: barChart({ xLabels: [t('Impôt', 'Tax'), t('Net', 'Net')],
        series: [{ color: PALETTE[4], values: [Math.round(r.totalTax), 0] }, { color: PALETTE[6], values: [0, Math.round(r.netAfterTax)] }] }) }),
      statList(rows),
      h('p', { class: 'tiny muted', style: { marginTop: '10px' } }, r.note),
    );
  }

  const seg = (label, active, onClick) => h('button', { class: 'btn sm' + (active ? ' primary' : ''), onClick }, label);
  const ctrlBox = h('div', {});
  function rebuild() {
    const toggles = h('div', { class: 'inline', style: { marginBottom: '6px' } },
      seg(t('Options', 'Options'), P.instrument === 'option', () => { setP('instrument', 'option'); rebuild(); }),
      seg(t('UAR / RSU', 'RSU'), P.instrument === 'rsu', () => { setP('instrument', 'rsu'); rebuild(); }),
      jur.country === 'CA' ? seg(t('SPCC', 'CCPC'), P.isCCPC, () => { setP('isCCPC', !P.isCCPC); rebuild(); }) : null,
      jur.country === 'US' ? seg('ISO', P.isISO, () => { setP('isISO', !P.isISO); rebuild(); }) : null,
    );
    ctrlBox.replaceChildren(
      toggles,
      h('div', { class: 'grid cols-3' },
        slider({ label: t('Nombre d’actions', 'Number of shares'), value: P.shares, min: 100, max: 100000, step: 100, format: v => num(v), onInput: v => { setP('shares', v); draw(); } }),
        slider({ label: t('Prix de levée', 'Strike price'), value: P.strike, min: 0, max: 100, step: 1, format: v => money(v, { currency: cur }), onInput: v => { setP('strike', v); draw(); } }),
        slider({ label: t('JVM à l’octroi', 'FMV at grant'), value: P.grantFmv, min: 0, max: 100, step: 1, format: v => money(v, { currency: cur }), onInput: v => { setP('grantFmv', v); draw(); } }),
        slider({ label: P.instrument === 'rsu' ? t('JVM à l’acquisition', 'FMV at vest') : t('JVM à l’exercice', 'FMV at exercise'), value: P.fmvExercise, min: 0, max: 200, step: 1, format: v => money(v, { currency: cur }), onInput: v => { setP('fmvExercise', v); draw(); } }),
        slider({ label: t('JVM à la vente', 'FMV at sale'), value: P.fmvSale, min: 0, max: 300, step: 1, format: v => money(v, { currency: cur }), onInput: v => { setP('fmvSale', v); draw(); } }),
        slider({ label: t('Taux marginal (dérivé du dossier)', 'Marginal rate (derived from file)'), value: P.marginalRate, min: 0.2, max: 0.55, step: 0.01, format: v => pct(v, 0), onInput: v => { setP('marginalRate', v); draw(); } }),
      ));
    draw();
  }
  rebuild();

  const ctrl = card(t('Paramètres de la rémunération en actions', 'Equity compensation parameters'), {
    sub: t(`Options d’achat, UAR — SPCC, ISO/NSO, EMI · autres revenus du titulaire ${money(prim.ordinary, { currency: cur, compact: true })}, taux marginal ${pct(prim.marginal.ordinary, 1)}`, `Stock options, RSUs — CCPC, ISO/NSO, EMI · holder's other income ${money(prim.ordinary, { currency: cur, compact: true })}, marginal rate ${pct(prim.marginal.ordinary, 1)}`) }, ctrlBox);

  return h('div', { class: 'grid' },
    h('div', { class: 'span-full' }, ctrl),
    h('div', { class: 'span-full' }, card(t('Résultat', 'Result'), {}, out)),
  );
}
