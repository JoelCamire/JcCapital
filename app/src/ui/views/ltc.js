import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { lineChart, barChart, PALETTE } from '../charts.js';
import { projectLTC, CARE_LEVELS } from '../../engine/ltc.js';
import { activePolicies } from '../../engine/policies.js';
import { annualPremium } from '../../state/models.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';
import { store as appStore } from '../../state/store.js';

export function render({ store, client, jur }) {
  store = store || appStore;
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const prim = F.primary || { id: null, age: 60, lifeExpectancy: 90 };
  const levels = CARE_LEVELS();

  // LTC policies on file for the primary member → coverage & premium defaults
  const ltcPolicies = activePolicies(client).filter(p => p.kind === 'ltc' && (p.insuredId === prim.id || (p.insuredId == null && client.members[0]?.id === prim.id)));
  const ltcCoverage = (prim.id && F.coverage[prim.id]?.ltc) || 0;
  const ltcPremium = ltcPolicies.reduce((s, p) => s + annualPremium(p), 0);

  const P = whatIf(client, 'ltc', {
    levelIdx: 1,
    currentAge: Math.max(40, Math.min(85, Math.round(prim.age))),
    onsetAge: 84, durationYears: 4,
    annualCostToday: levels[1].annual,
    healthInflation: Math.max(F.assumptions.inflation, 0.04),
    insurancePremiumAnnual: ltcPremium > 0 ? Math.round(ltcPremium) : 3500,
    insuranceCoverageAnnual: ltcCoverage > 0 ? Math.round(ltcCoverage) : 50000,
  });
  const setP = (k, v) => { P[k] = v; saveWhatIf(store, 'ltc', { [k]: v }); };

  const out = h('div', {});
  function draw() {
    const r = projectLTC(P);
    out.replaceChildren(
      h('div', { class: 'grid cols-4', style: { marginBottom: '12px' } },
        kpi({ label: t('Coût annuel à l’entrée en soins', 'Annual cost at care onset'), value: money(r.costAtOnset, { currency: cur, compact: true }), sub: t(`dans ${r.yearsToOnset} ans`, `in ${r.yearsToOnset} yrs`) }),
        kpi({ label: t('Coût total des soins', 'Total cost of care'), value: money(r.totalCost, { currency: cur, compact: true }), accent: 'var(--neg)' }),
        kpi({ label: t('Reste à charge si assuré', 'Out-of-pocket if insured'), value: money(r.netOutOfPocketInsured, { currency: cur, compact: true }) }),
        kpi({ label: t('Avantage de l’assurance SLD', 'LTC insurance advantage'), value: money(r.insuranceAdvantage, { currency: cur, compact: true }), accent: r.insuranceAdvantage > 0 ? 'var(--pos)' : 'var(--neg)' }),
      ),
      h('div', { class: 'grid cols-2' },
        card(t('Auto-financement vs assurance', 'Self-funding vs insurance'), {},
          h('div', { html: barChart({ xLabels: [t('Auto-financement', 'Self-funding'), t('Assurance SLD', 'LTC insurance')],
            series: [{ color: PALETTE[5], values: [Math.round(r.totalCost), Math.round(r.netOutOfPocketInsured)] }] }) }),
          legend([{ color: PALETTE[5], label: t('Coût net total', 'Total net cost') }])),
        card(t('Coût annuel pendant les soins', 'Annual cost during care'), {},
          h('div', { html: lineChart({ series: [{ color: PALETTE[3], values: r.series.map(s => Math.round(s.cost)) }], xLabels: r.series.map(s => s.age), area: true }) })),
      ),
      card(t('Détail', 'Detail'), { class: 'span-full' },
        statList([
          [t('Années avant l’entrée en soins', 'Years until care onset'), `${r.yearsToOnset}`],
          [t('Coût total (indexé)', 'Total cost (indexed)'), money(r.totalCost, { currency: cur }), 'neg'],
          [t('Primes totales d’assurance', 'Total insurance premiums'), money(r.totalPremiums, { currency: cur })],
          [t('Prestations couvertes', 'Benefits covered'), money(r.coveredTotal, { currency: cur }), 'pos'],
          [t('Reste à charge net (assuré)', 'Net out-of-pocket (insured)'), money(r.netOutOfPocketInsured, { currency: cur })],
        ]),
        h('p', { class: 'tiny muted', style: { marginTop: '8px' } }, r.note)),
    );
  }
  draw();

  const ctrlBox = h('div', {});
  function rebuild() {
    const levelBtns = h('div', { class: 'inline', style: { marginBottom: '6px' } },
      ...levels.map((lv, i) => h('button', { class: 'btn sm' + (i === P.levelIdx ? ' primary' : ''), onClick: () => { setP('levelIdx', i); setP('annualCostToday', lv.annual); rebuild(); } }, lv.label)));
    ctrlBox.replaceChildren(levelBtns,
      h('div', { class: 'grid cols-3' },
        slider({ label: t('Âge actuel (dossier)', 'Current age (file)'), value: P.currentAge, min: 40, max: 85, step: 1, format: v => `${v}`, onInput: v => { setP('currentAge', v); draw(); } }),
        slider({ label: t('Âge d’entrée en soins', 'Age care begins'), value: P.onsetAge, min: 65, max: 95, step: 1, format: v => `${v}`, onInput: v => { setP('onsetAge', v); draw(); } }),
        slider({ label: t('Durée des soins (ans)', 'Care duration (yrs)'), value: P.durationYears, min: 1, max: 12, step: 1, format: v => `${v}`, onInput: v => { setP('durationYears', v); draw(); } }),
        slider({ label: t('Coût annuel actuel', 'Annual cost today'), value: P.annualCostToday, min: 20000, max: 200000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('annualCostToday', v); draw(); } }),
        slider({ label: t('Inflation des soins de santé (≥ inflation du dossier)', 'Health-cost inflation (≥ file inflation)'), value: P.healthInflation, min: 0.02, max: 0.07, step: 0.005, format: v => pct(v), onInput: v => { setP('healthInflation', v); draw(); } }),
        slider({ label: t('Prime annuelle assurance SLD', 'Annual LTC premium'), value: P.insurancePremiumAnnual, min: 0, max: 15000, step: 500, format: v => money(v, { currency: cur }), onInput: v => { setP('insurancePremiumAnnual', v); draw(); } }),
        slider({ label: t('Couverture annuelle assurance', 'Annual insurance coverage'), value: P.insuranceCoverageAnnual, min: 0, max: 150000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('insuranceCoverageAnnual', v); draw(); } }),
      ));
    draw();
  }
  rebuild();

  const ctrl = card(t('Soins de longue durée & longévité', 'Long-term care & longevity'), {
    sub: t(`Projeter le coût des soins et comparer assurance vs auto-financement — ${ltcPolicies.length ? `police SLD au dossier : ${money(ltcCoverage, { currency: cur, compact: true })}/an pour ${money(ltcPremium, { currency: cur })}/an` : 'aucune police SLD au dossier'}`, `Project care costs and compare insurance vs self-funding — ${ltcPolicies.length ? `LTC policy on file: ${money(ltcCoverage, { currency: cur, compact: true })}/yr for ${money(ltcPremium, { currency: cur })}/yr` : 'no LTC policy on file'}`) }, ctrlBox);

  return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, ctrl), h('div', { class: 'span-full' }, out));
}
