import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, PALETTE } from '../charts.js';
import { compareLifeProducts } from '../../engine/insurancecompare.js';
import { lifeInsuranceNeeds } from '../../engine/analysis.js';
import { activePolicies } from '../../engine/policies.js';
import { annualPremium } from '../../state/models.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';

export function render({ store, client, jur }) {
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const primary = F.primary || { id: null, age: 40, lifeExpectancy: 85 };

  // Defaults from the file: coverage = capital need, horizon = life expectancy, term premium = existing life policies
  const need = primary.id ? lifeInsuranceNeeds(client, primary.id).need : 0;
  const existingLife = primary.id ? F.coverage[primary.id].life : 0;
  const lifePolicies = activePolicies(client).filter(p => p.kind === 'life' && (p.insuredId === primary.id || (p.insuredId == null && primary.id === client.members[0]?.id)));
  const existingPremium = lifePolicies.reduce((s, p) => s + annualPremium(p), 0);
  const coverageDefault = Math.round(need > 0 ? need : existingLife);
  const defaults = {
    coverage: coverageDefault,
    termPremium: existingPremium > 0 ? Math.round(existingPremium) : Math.round(Math.max(100, coverageDefault * 0.0012)),
    wholePremium: Math.round(Math.max(1000, coverageDefault * 0.013)),
    t100Premium: Math.round(Math.max(500, coverageDefault * 0.0076)),
    csvGrowth: 0.045, csvAllocation: 0.55, investReturn: F.assumptions.preReturn, termYears: 20,
  };
  const W = whatIf(client, 'insurancecompare', defaults);
  // age and horizon are facts of the member, never persisted
  const p = { ...W, currentAge: primary.age, horizonAge: primary.lifeExpectancy };
  const save = (patch) => { Object.assign(p, patch); saveWhatIf(store, 'insurancecompare', patch); };

  const out = h('div', {});
  function draw() {
    const r = compareLifeProducts(p);
    out.replaceChildren(
      h('div', { class: 'grid cols-4', style: { marginBottom: '12px' } },
        kpi({ label: t('Temporaire — coût total', 'Term — total cost'), value: money(r.term.paid, { currency: cur, compact: true }), sub: t(`protection ${p.termYears} ans`, `${p.termYears}-yr protection`) }),
        kpi({ label: t('Vie entière — coût net', 'Whole life — net cost'), value: money(r.whole.netCost, { currency: cur, compact: true }), sub: t('valeur de rachat ' + money(r.whole.cv, { currency: cur, compact: true }), 'cash value ' + money(r.whole.cv, { currency: cur, compact: true })) }),
        kpi({ label: t('T100 — coût net', 'T100 — net cost'), value: money(r.t100.netCost, { currency: cur, compact: true }) }),
        kpi({ label: t('Avantage BTID vs vie entière', 'BTID advantage vs whole life'), value: money(r.btidVsWhole, { currency: cur, compact: true }), accent: r.btidVsWhole > 0 ? 'var(--pos)' : 'var(--neg)' }),
      ),
      h('div', { class: 'grid cols-2' },
        card(t('Primes vs valeur de rachat', 'Premiums vs cash value'), { sub: t(`Sur ${r.years} ans (de ${p.currentAge} à ${p.horizonAge} ans)`, `Over ${r.years} years (age ${p.currentAge} to ${p.horizonAge})`) },
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

  const ctrl = card(t('Paramètres des produits', 'Product parameters'), {
    sub: t(`Capital = besoin calculé (${money(need, { currency: cur, compact: true })}) · horizon = espérance de vie de ${primary.name || ''} (${primary.lifeExpectancy} ans) · prime temporaire = polices vie en vigueur (${money(existingPremium, { currency: cur })}/an) · vos ajustements sont conservés — exiger des illustrations réelles`,
      `Coverage = computed need (${money(need, { currency: cur, compact: true })}) · horizon = ${primary.name || ''}'s life expectancy (${primary.lifeExpectancy}) · term premium = in-force life policies (${money(existingPremium, { currency: cur })}/yr) · your adjustments are kept — request real illustrations`) },
    h('div', { class: 'grid cols-3' },
      slider({ label: t('Capital assuré', 'Coverage'), value: p.coverage, min: 0, max: 5000000, step: 25000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { save({ coverage: v }); draw(); } }),
      slider({ label: t('Durée de la temporaire', 'Term length'), value: p.termYears, min: 10, max: 30, step: 5, format: v => `${v} ${t('ans', 'yrs')}`, onInput: v => { save({ termYears: v }); draw(); } }),
      h('div', { class: 'field' }, h('label', {}, t('Âge → horizon (dossier)', 'Age → horizon (file)')), h('input', { value: `${p.currentAge} → ${p.horizonAge} ${t('ans', 'yrs')}`, disabled: true })),
      slider({ label: t('Prime temporaire / an', 'Term premium / yr'), value: p.termPremium, min: 100, max: 5000, step: 50, format: v => money(v, { currency: cur }), onInput: v => { save({ termPremium: v }); draw(); } }),
      slider({ label: t('Prime vie entière / an', 'Whole life premium / yr'), value: p.wholePremium, min: 1000, max: 30000, step: 250, format: v => money(v, { currency: cur }), onInput: v => { save({ wholePremium: v }); draw(); } }),
      slider({ label: t('Prime T100 / an', 'T100 premium / yr'), value: p.t100Premium, min: 500, max: 20000, step: 100, format: v => money(v, { currency: cur }), onInput: v => { save({ t100Premium: v }); draw(); } }),
      slider({ label: t('Rendement investissement (BTID)', 'Investment return (BTID)'), value: p.investReturn, min: 0.02, max: 0.1, step: 0.005, format: v => pct(v), onInput: v => { save({ investReturn: v }); draw(); } }),
      slider({ label: t('Croissance de la valeur de rachat', 'Cash value growth'), value: p.csvGrowth, min: 0.01, max: 0.08, step: 0.005, format: v => pct(v), onInput: v => { save({ csvGrowth: v }); draw(); } }),
    ));

  return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, ctrl), h('div', { class: 'span-full' }, out));
}
