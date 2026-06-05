import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { lineChart, barChart, PALETTE } from '../charts.js';
import { projectLTC, CARE_LEVELS } from '../../engine/ltc.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const primary = client.members[0] || { currentAge: 60 };
  const levels = CARE_LEVELS();
  let levelIdx = 1;
  const p = { currentAge: primary.currentAge, onsetAge: 84, durationYears: 4, annualCostToday: levels[1].annual,
    healthInflation: 0.04, insurancePremiumAnnual: 3500, insuranceCoverageAnnual: 50000 };

  const out = h('div', {});
  function draw() {
    const r = projectLTC(p);
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

  const levelBtns = h('div', { class: 'inline', style: { marginBottom: '6px' } },
    ...levels.map((lv, i) => h('button', { class: 'btn sm' + (i === levelIdx ? ' primary' : ''), onClick: () => { levelIdx = i; p.annualCostToday = lv.annual; rebuild(); } }, lv.label)));

  const ctrlBox = h('div', {});
  function rebuild() {
    ctrlBox.replaceChildren(levelBtns,
      h('div', { class: 'grid cols-3' },
        slider({ label: t('Âge actuel', 'Current age'), value: p.currentAge, min: 40, max: 85, step: 1, format: v => `${v}`, onInput: v => { p.currentAge = v; draw(); } }),
        slider({ label: t('Âge d’entrée en soins', 'Age care begins'), value: p.onsetAge, min: 65, max: 95, step: 1, format: v => `${v}`, onInput: v => { p.onsetAge = v; draw(); } }),
        slider({ label: t('Durée des soins (ans)', 'Care duration (yrs)'), value: p.durationYears, min: 1, max: 12, step: 1, format: v => `${v}`, onInput: v => { p.durationYears = v; draw(); } }),
        slider({ label: t('Coût annuel actuel', 'Annual cost today'), value: p.annualCostToday, min: 20000, max: 200000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { p.annualCostToday = v; draw(); } }),
        slider({ label: t('Inflation des soins de santé', 'Health-cost inflation'), value: p.healthInflation, min: 0.02, max: 0.07, step: 0.005, format: v => pct(v), onInput: v => { p.healthInflation = v; draw(); } }),
        slider({ label: t('Prime annuelle assurance SLD', 'Annual LTC premium'), value: p.insurancePremiumAnnual, min: 0, max: 15000, step: 500, format: v => money(v, { currency: cur }), onInput: v => { p.insurancePremiumAnnual = v; draw(); } }),
        slider({ label: t('Couverture annuelle assurance', 'Annual insurance coverage'), value: p.insuranceCoverageAnnual, min: 0, max: 150000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { p.insuranceCoverageAnnual = v; draw(); } }),
      ));
    draw();
  }
  rebuild();

  const ctrl = card(t('Soins de longue durée & longévité', 'Long-term care & longevity'), {
    sub: t('Projeter le coût des soins et comparer assurance vs auto-financement', 'Project care costs and compare insurance vs self-funding') }, ctrlBox);

  return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, ctrl), h('div', { class: 'span-full' }, out));
}
