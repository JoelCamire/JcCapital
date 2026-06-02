import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, PALETTE } from '../charts.js';
import { equityComp } from '../../engine/equity.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const st = { shares: 10000, strike: 5, fmvExercise: 25, fmvSale: 40, grantFmv: 5,
    marginalRate: Math.round((jur.country === 'US' ? 0.45 : jur.country === 'UK' ? 0.45 : 0.50) * 100) / 100,
    instrument: 'option', isCCPC: jur.country === 'CA', isISO: false };

  const out = h('div', {});
  function draw() {
    const r = equityComp(jur, st);
    const rows = [
      [t('Actions', 'Shares'), num(st.shares)],
      r.instrument === 'rsu'
        ? [t('Revenu d’emploi à l’acquisition', 'Employment income at vest'), money(r.employmentBenefit, { currency: cur })]
        : [t('Avantage (écart à l’exercice)', 'Benefit (spread at exercise)'), money(r.employmentBenefit, { currency: cur })],
      r.deduction ? [t('Déduction pour options (50 %)', 'Stock-option deduction (50%)'), '− ' + money(r.deduction, { currency: cur }), 'pos'] : null,
      r.amtPreference ? [t('Préférence AMT (ISO)', 'AMT preference (ISO)'), money(r.amtPreference, { currency: cur }), 'warn'] : null,
      [t('Impôt sur l’avantage', 'Tax on benefit'), money(r.taxOnBenefit, { currency: cur }), 'neg'],
      [t('Gain en capital (exercice → vente)', 'Capital gain (exercise → sale)'), money(r.capGain, { currency: cur })],
      [t('Impôt sur le gain', 'Tax on gain'), money(r.capGainsTax, { currency: cur }), 'neg'],
      [t('Impôt total', 'Total tax'), money(r.totalTax, { currency: cur }), 'neg'],
      [t('Net après impôt', 'Net after tax'), money(r.netAfterTax, { currency: cur }), 'pos'],
    ].filter(Boolean);

    out.replaceChildren(
      h('div', { class: 'grid cols-3', style: { marginBottom: '12px' } },
        kpi({ label: t('Impôt total', 'Total tax'), value: money(r.totalTax, { currency: cur, compact: true }), accent: 'var(--neg)' }),
        kpi({ label: t('Net après impôt', 'Net after tax'), value: money(r.netAfterTax, { currency: cur, compact: true }), accent: 'var(--pos)' }),
        kpi({ label: t('Moment de l’imposition', 'Tax timing'), value: r.timing }),
      ),
      h('div', { html: barChart({ xLabels: [t('Impôt', 'Tax'), t('Net', 'Net')],
        series: [{ color: PALETTE[4], values: [Math.round(r.totalTax), 0] }, { color: PALETTE[6], values: [0, Math.round(r.netAfterTax)] }] }) }),
      statList(rows),
      h('p', { class: 'tiny muted', style: { marginTop: '10px' } }, r.note),
    );
  }

  const seg = (label, active, onClick) => h('button', { class: 'btn sm' + (active ? ' primary' : ''), onClick }, label);
  const toggles = h('div', { class: 'inline', style: { marginBottom: '6px' } },
    seg(t('Options', 'Options'), st.instrument === 'option', () => { st.instrument = 'option'; rebuild(); }),
    seg(t('UAR / RSU', 'RSU'), st.instrument === 'rsu', () => { st.instrument = 'rsu'; rebuild(); }),
    jur.country === 'CA' ? seg(t('SPCC', 'CCPC'), st.isCCPC, () => { st.isCCPC = !st.isCCPC; rebuild(); }) : null,
    jur.country === 'US' ? seg('ISO', st.isISO, () => { st.isISO = !st.isISO; rebuild(); }) : null,
  );

  const ctrlBox = h('div', {});
  function rebuild() {
    ctrlBox.replaceChildren(
      toggles,
      h('div', { class: 'grid cols-3' },
        slider({ label: t('Nombre d’actions', 'Number of shares'), value: st.shares, min: 100, max: 100000, step: 100, format: v => num(v), onInput: v => { st.shares = v; draw(); } }),
        slider({ label: t('Prix de levée', 'Strike price'), value: st.strike, min: 0, max: 100, step: 1, format: v => money(v, { currency: cur }), onInput: v => { st.strike = v; draw(); } }),
        slider({ label: st.instrument === 'rsu' ? t('JVM à l’acquisition', 'FMV at vest') : t('JVM à l’exercice', 'FMV at exercise'), value: st.fmvExercise, min: 0, max: 200, step: 1, format: v => money(v, { currency: cur }), onInput: v => { st.fmvExercise = v; draw(); } }),
        slider({ label: t('JVM à la vente', 'FMV at sale'), value: st.fmvSale, min: 0, max: 300, step: 1, format: v => money(v, { currency: cur }), onInput: v => { st.fmvSale = v; draw(); } }),
        slider({ label: t('Taux marginal', 'Marginal rate'), value: st.marginalRate, min: 0.2, max: 0.55, step: 0.01, format: v => pct(v, 0), onInput: v => { st.marginalRate = v; draw(); } }),
      ));
    draw();
  }
  rebuild();

  const ctrl = card(t('Paramètres de la rémunération en actions', 'Equity compensation parameters'), {
    sub: t('Options d’achat, UAR — SPCC, ISO/NSO, EMI', 'Stock options, RSUs — CCPC, ISO/NSO, EMI') }, ctrlBox);

  return h('div', { class: 'grid' },
    h('div', { class: 'span-full' }, ctrl),
    h('div', { class: 'span-full' }, card(t('Résultat', 'Result'), {}, out)),
  );
}
