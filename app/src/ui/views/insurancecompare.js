import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, PALETTE } from '../charts.js';
import { compareLifeProducts } from '../../engine/insurancecompare.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const primary = client.members[0] || { currentAge: 40 };
  const p = { coverage: 500000, currentAge: primary.currentAge, horizonAge: 85, termPremium: 600,
    wholePremium: 6500, t100Premium: 3800, csvGrowth: 0.045, csvAllocation: 0.55, investReturn: client.assumptions.preReturn ?? 0.06, termYears: 20 };

  const out = h('div', {});
  function draw() {
    const r = compareLifeProducts(p);
    out.replaceChildren(
      h('div', { class: 'grid cols-4', style: { marginBottom: '12px' } },
        kpi({ label: t('Temporaire — coût total', 'Term — total cost'), value: money(r.term.paid, { currency: cur, compact: true }), sub: t('protection limitée', 'limited protection') }),
        kpi({ label: t('Vie entière — coût net', 'Whole life — net cost'), value: money(r.whole.netCost, { currency: cur, compact: true }), sub: t('valeur de rachat ' + money(r.whole.cv, { currency: cur, compact: true }), 'cash value ' + money(r.whole.cv, { currency: cur, compact: true })) }),
        kpi({ label: t('T100 — coût net', 'T100 — net cost'), value: money(r.t100.netCost, { currency: cur, compact: true }) }),
        kpi({ label: t('Avantage BTID vs vie entière', 'BTID advantage vs whole life'), value: money(r.btidVsWhole, { currency: cur, compact: true }), accent: r.btidVsWhole > 0 ? 'var(--pos)' : 'var(--neg)' }),
      ),
      h('div', { class: 'grid cols-2' },
        card(t('Primes vs valeur de rachat', 'Premiums vs cash value'), {},
          h('div', { html: barChart({ xLabels: [t('Temporaire', 'Term'), t('Vie entière', 'Whole life'), 'T100'],
            series: [{ color: PALETTE[5], values: [Math.round(r.term.paid), Math.round(r.whole.paid), Math.round(r.t100.paid)] },
              { color: PALETTE[1], values: [0, Math.round(r.whole.cv), Math.round(r.t100.cv)] }] }) }),
          legend([{ color: PALETTE[5], label: t('Primes payées', 'Premiums paid') }, { color: PALETTE[1], label: t('Valeur de rachat', 'Cash value') }])),
        card(t('Acheter temporaire + investir la différence (BTID)', 'Buy term + invest the difference (BTID)'), {},
          h('div', { html: barChart({ xLabels: [t('Fonds BTID', 'BTID fund'), t('Valeur rachat vie entière', 'Whole life CSV')],
            series: [{ color: PALETTE[6], values: [Math.round(r.btid.sideFund), Math.round(r.whole.cv)] }] }) }),
          statList([
            [t('Fonds accumulé (BTID)', 'Accumulated fund (BTID)'), money(r.btid.sideFund, { currency: cur }), 'pos'],
            [t('Valeur de rachat (vie entière)', 'Cash value (whole life)'), money(r.whole.cv, { currency: cur })],
          ])),
      ),
      card(t('Quand choisir quoi', 'When to choose what'), { class: 'span-full' },
        h('div', { class: 'grid cols-3' }, ...[
          [t('Temporaire', 'Term'), t('Besoin temporaire : hypothèque, jeunes enfants, remplacement de revenu jusqu’à la retraite. Coût le plus bas.', 'Temporary need: mortgage, young children, income replacement until retirement. Lowest cost.')],
          [t('Vie entière', 'Whole life'), t('Besoin permanent + valeur de rachat garantie, dividendes, planification successorale et corporative (CDC).', 'Permanent need + guaranteed cash value, dividends, estate and corporate planning (CDA).')],
          [t('T100 / Universelle', 'T100 / Universal'), t('Protection permanente au coût le plus bas, peu ou pas de valeur de rachat; idéale pour l’impôt au décès.', 'Permanent protection at lowest cost, little or no cash value; ideal for tax at death.')],
        ].map(([ti, tx]) => h('div', { class: 'card', style: { background: 'var(--surface-2)' } }, h('b', {}, ti), h('div', { class: 'tiny muted', style: { marginTop: '4px' } }, tx)))),
        h('p', { class: 'tiny muted', style: { marginTop: '10px' } }, r.note)),
    );
  }
  draw();

  const ctrl = card(t('Paramètres des produits', 'Product parameters'), { sub: t('Comparaison illustrative — exiger des illustrations réelles', 'Illustrative comparison — request real illustrations') },
    h('div', { class: 'grid cols-3' },
      slider({ label: t('Capital assuré', 'Coverage'), value: p.coverage, min: 100000, max: 5000000, step: 50000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { p.coverage = v; draw(); } }),
      slider({ label: t('Âge actuel', 'Current age'), value: p.currentAge, min: 20, max: 70, step: 1, format: v => `${v}`, onInput: v => { p.currentAge = v; draw(); } }),
      slider({ label: t('Horizon (âge)', 'Horizon (age)'), value: p.horizonAge, min: 60, max: 100, step: 1, format: v => `${v}`, onInput: v => { p.horizonAge = v; draw(); } }),
      slider({ label: t('Prime temporaire / an', 'Term premium / yr'), value: p.termPremium, min: 100, max: 5000, step: 50, format: v => money(v, { currency: cur }), onInput: v => { p.termPremium = v; draw(); } }),
      slider({ label: t('Prime vie entière / an', 'Whole life premium / yr'), value: p.wholePremium, min: 1000, max: 30000, step: 250, format: v => money(v, { currency: cur }), onInput: v => { p.wholePremium = v; draw(); } }),
      slider({ label: t('Rendement investissement (BTID)', 'Investment return (BTID)'), value: p.investReturn, min: 0.02, max: 0.1, step: 0.005, format: v => pct(v), onInput: v => { p.investReturn = v; draw(); } }),
    ));

  return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, ctrl), h('div', { class: 'span-full' }, out));
}
