// ============================================================
// Strategy Comparison — "Value of Advice" meta-dashboard
// Quantifies the combined impact of planning strategies vs
// the current baseline. No store mutation of the file; deep-clones
// only. Every lever amount comes from the jurisdiction / facts and
// the selection is persisted in calc.strategycompare.
// ============================================================
import { h, money, pct, icon, t } from '../dom.js';
import { kpi, card, legend, statList, badgeScore } from '../widgets.js';
import { barChart, lineChart, gauge, PALETTE } from '../charts.js';
import { runProjection, treatmentOf } from '../../engine/projection.js';
import { runMonteCarlo } from '../../engine/montecarlo.js';
import { benefitAtAge } from '../../engine/benefits.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';
import { accountMeta } from '../../jurisdictions/index.js';

const fmtM = (v, cur) => money(v, { currency: cur, compact: true });

// ---------------------------------------------------------------------------
// Strategy definitions — name/desc are functions of the context so the
// numbers shown are the ones actually applied (limits, deferral rates…).
// ctx = { jur, F, cur }
// ---------------------------------------------------------------------------
const STRATEGIES = [
  {
    key: 'maxTaxFree',
    name: () => t('Maximiser le compte libre d’impôt', 'Max tax-free accounts'),
    desc: ({ jur, F, cur }) => {
      const meta = accountMeta(jur.country, jur.country === 'CA' ? 'tfsa' : jur.country === 'US' ? 'roth' : 'isa');
      return t(`Porte les cotisations de chaque compte libre d’impôt (${jur.labels.taxFree}) au plafond annuel ${jur.taxYear} : ${fmtM(meta.limit || 0, cur)}/an.`,
        `Raises each tax-free account (${jur.labels.taxFree}) contribution to the ${jur.taxYear} annual limit: ${fmtM(meta.limit || 0, cur)}/yr.`);
    },
    apply(clone, { jur }) {
      (clone.assets || []).forEach(a => {
        if (treatmentOf(a.type) !== 'taxfree') return;
        const limit = accountMeta(jur.country, a.type).limit || accountMeta(jur.country, jur.country === 'CA' ? 'tfsa' : jur.country === 'US' ? 'roth' : 'isa').limit || 0;
        if (limit > 0) a.annualContribution = Math.max(a.annualContribution || 0, limit);
      });
    },
  },
  {
    key: 'maxDeferred',
    name: () => t('Maximiser l’épargne-retraite différée', 'Max deferred retirement savings'),
    desc: ({ jur, F, cur }) => t(`Porte les cotisations ${jur.labels.taxAdvantaged} de chaque membre à ses droits de cotisation (${F.members.map(m => `${m.name.split(' ')[0]} ${fmtM(m.rrspRoom, cur)}`).join(', ')}).`,
      `Raises each member's ${jur.labels.taxAdvantaged} contributions to their contribution room (${F.members.map(m => `${m.name.split(' ')[0]} ${fmtM(m.rrspRoom, cur)}`).join(', ')}).`),
    apply(clone, { F }) {
      const primaryId = clone.members?.[0]?.id;
      for (const m of F.members) {
        const accts = (clone.assets || []).filter(a => treatmentOf(a.type) === 'deferred' && ((a.ownerId || primaryId) === m.id));
        if (!accts.length || !(m.rrspRoom > 0)) continue;
        const current = accts.reduce((s, a) => s + (a.annualContribution || 0), 0);
        if (current >= m.rrspRoom) continue;
        accts[0].annualContribution = (accts[0].annualContribution || 0) + (m.rrspRoom - current);
      }
    },
  },
  {
    key: 'delayRetirement2',
    name: () => t('Reporter la retraite de 2 ans', 'Delay retirement by 2 years'),
    desc: () => t('Ajoute 2 ans à l’âge de retraite de chaque membre — plus d’accumulation, moins de décaissement.', 'Adds 2 years to each member retirement age — more accumulation, less decumulation.'),
    apply(clone) { (clone.members || []).forEach(m => { m.retirementAge = (m.retirementAge || 65) + 2; }); },
  },
  {
    key: 'payDownDebt',
    name: () => t('Accélérer le remboursement des dettes', 'Accelerate debt paydown'),
    desc: ({ F, cur }) => t(`Ajoute ${fmtM(Math.min(10000, Math.max(0, F.household.surplus)) || 10000, cur)}/an de paiements additionnels sur les dettes (réparti au prorata des soldes).`,
      `Adds ${fmtM(Math.min(10000, Math.max(0, F.household.surplus)) || 10000, cur)}/yr of extra debt payments (spread pro rata to balances).`),
    apply(clone, { F }) {
      const liabs = (clone.liabilities || []).filter(l => (l.balance || 0) > 0);
      if (!liabs.length) return;
      const annual = Math.min(10000, Math.max(0, F.household.surplus)) || 10000;
      const total = liabs.reduce((s, l) => s + l.balance, 0);
      liabs.forEach(l => { l.extraPayment = (l.extraPayment || 0) + (annual / 12) * (l.balance / total); });   // the projection uses extraPayment
    },
  },
  {
    key: 'delayCPP',
    name: ({ jur }) => t(`Reporter ${jur.pensions.cpp.name}${jur.pensions.oas?.maxAnnual ? ' / ' + jur.pensions.oas.name : ''} à ${jur.pensions.cpp.maxAge || 70} ans`,
      `Delay ${jur.pensions.cpp.name}${jur.pensions.oas?.maxAnnual ? ' / ' + jur.pensions.oas.name : ''} to age ${jur.pensions.cpp.maxAge || 70}`),
    desc: ({ jur }) => {
      const c = jur.pensions.cpp, o = jur.pensions.oas;
      const cppBonus = c.defer != null ? pct(c.defer * ((c.maxAge || 70) - (c.startAge || 65)), 0) : '—';
      const oasBonus = o && o.defer != null ? pct(o.defer * ((o.maxAge || 70) - (o.startAge || 65)), 0) : null;
      return t(`Reporte les prestations à l’âge maximal : ${c.name} +${cppBonus} (${pct(c.defer || 0, 1)}/an)${oasBonus ? `, ${o.name} +${oasBonus} (${pct(o.defer, 1)}/an)` : ''}.`,
        `Defers benefits to the maximum age: ${c.name} +${cppBonus} (${pct(c.defer || 0, 1)}/yr)${oasBonus ? `, ${o.name} +${oasBonus} (${pct(o.defer, 1)}/yr)` : ''}.`);
    },
    apply(clone, { jur }) {
      (clone.incomes || []).forEach(inc => {
        const pension = inc.type === 'cpp' ? jur.pensions.cpp : inc.type === 'oas' ? jur.pensions.oas : null;
        if (!pension || pension.defer == null) return;
        const maxAge = pension.maxAge ?? ((pension.startAge || 65) + 5);
        const fromAge = inc.startAge != null && inc.startAge !== '' ? +inc.startAge : (pension.startAge || 65);
        // entitlement at the normal age implied by the amount on file at its current start age
        const atNormal = benefitAtAge(pension, fromAge, 1) > 0 ? (inc.amount || 0) / benefitAtAge(pension, fromAge, 1) : (inc.amount || 0);
        inc.amount = benefitAtAge(pension, maxAge, atNormal);
        inc.startAge = maxAge;
      });
    },
  },
  {
    key: 'reduceSpending5',
    name: () => t('Réduire les dépenses de 5 %', 'Reduce spending by 5%'),
    desc: () => t('Applique une réduction de 5 % sur toutes les dépenses — petits gestes, grand impact cumulé.', 'Applies a 5% reduction across all expenses — small adjustments, large cumulative impact.'),
    apply(clone) { clone.assumptions = clone.assumptions || {}; clone.assumptions.spendingLevel = (clone.assumptions.spendingLevel || 1) * 0.95; },
  },
  {
    key: 'higherReturn',
    name: () => t('Optimiser le portefeuille (+0,5 %)', 'Optimize portfolio (+0.5%)'),
    desc: () => t('Augmente les rendements hypothétiques de 0,5 % (meilleure allocation ou réduction des frais).', 'Increases assumed returns by 0.5% (better allocation or lower fees).'),
    apply(clone) {
      clone.assumptions = clone.assumptions || {};
      clone.assumptions.preReturn  = (clone.assumptions.preReturn  || 0.05) + 0.005;
      clone.assumptions.postReturn = (clone.assumptions.postReturn || 0.04) + 0.005;
      (clone.assets || []).forEach(a => { if (treatmentOf(a.type) !== 'realestate' && a.growth != null) a.growth = a.growth + 0.005; });
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function deltaDir(v) { return v >= 0 ? 'pos' : 'neg'; }
function signMoney(v, cur) {
  if (v == null || isNaN(v)) return '—';
  return (v >= 0 ? '+' : '') + money(v, { currency: cur, compact: true });
}

// ---------------------------------------------------------------------------
// Build the results sub-section (rebuilt on toggle)
// ---------------------------------------------------------------------------
function buildResults(client, selected, ctx) {
  const { cur } = ctx;
  const baseMC   = runMonteCarlo(client);            // cached, app-wide setting
  const baseProj = baseMC.det;
  const baseSum  = baseProj.summary;

  if (selected.size === 0) {
    const xLabels = baseProj.rows.map(r => r.primaryAge);
    const nwValues = baseProj.rows.map(r => r.netWorth);
    return h('div', { class: 'grid' },
      card(t('Aucune stratégie sélectionnée', 'No strategy selected'), {},
        h('p', { class: 'muted', style: { margin: '0', lineHeight: '1.7' } },
          t('Activez une ou plusieurs stratégies ci-dessus pour mesurer leur impact combiné sur votre plan.', 'Enable one or more strategies above to measure their combined impact on your plan.'))),
      h('div', { class: 'grid cols-3 span-full' },
        kpi({ label: t('Valeur nette finale (base)', 'Final net worth (base)'), value: money(baseSum.finalNetWorth, { currency: cur, compact: true }), iconName: 'networth', sub: t('Scénario de base — déterministe', 'Base scenario — deterministic') }),
        kpi({ label: t('Probabilité de succès (base)', 'Success probability (base)'), value: pct(baseMC.successRate, 0), iconName: 'monte',
          accent: baseMC.successRate >= 0.85 ? 'var(--pos)' : baseMC.successRate >= 0.6 ? 'var(--warn)' : 'var(--neg)',
          sub: t(`Monte Carlo ${baseMC.trials} simulations`, `Monte Carlo ${baseMC.trials} simulations`) }),
        kpi({ label: t('Impôt total estimé (base)', 'Estimated lifetime tax (base)'), value: money(baseSum.totalLifetimeTax, { currency: cur, compact: true }), iconName: 'tax', sub: t('Scénario de base', 'Base scenario') }),
      ),
      card(t('Trajectoire de la valeur nette (base)', 'Net worth trajectory (base)'), { class: 'span-full', right: legend([{ color: PALETTE[0], label: t('Valeur nette (base)', 'Net worth (base)') }]) },
        h('div', { html: lineChart({ series: [{ color: PALETTE[0], values: nwValues }], xLabels, area: true }) })),
    );
  }

  const optClone = JSON.parse(JSON.stringify(client));
  STRATEGIES.forEach(s => { if (selected.has(s.key)) s.apply(optClone, ctx); });

  const optMC   = runMonteCarlo(optClone);
  const optProj = optMC.det;
  const optSum  = optProj.summary;

  const deltaNW    = (optSum.finalNetWorth    || 0) - (baseSum.finalNetWorth    || 0);
  const deltaInv   = (optSum.finalInvestable  || 0) - (baseSum.finalInvestable  || 0);
  const deltaTax   = (optSum.totalLifetimeTax || 0) - (baseSum.totalLifetimeTax || 0);
  const deltaSR    = optMC.successRate - baseMC.successRate;
  const dBase = baseSum.depletionAge, dOpt = optSum.depletionAge;
  const deplDelta  = (dBase != null && dOpt != null) ? dOpt - dBase : null;   // positive = deferred later
  const deplText = deplDelta == null
    ? (dBase != null && dOpt == null ? t('Éliminé ✓', 'Eliminated ✓') : dBase == null && dOpt != null ? t('Nouveau risque', 'New risk') : '—')
    : `${deplDelta >= 0 ? '+' : ''}${deplDelta} ${t('ans', 'yrs')}`;
  const deplCls = deplDelta == null ? (dBase != null && dOpt == null ? 'pos' : dOpt != null ? 'neg' : '') : deplDelta > 0 ? 'pos' : deplDelta < 0 ? 'neg' : '';

  const xLabels = baseProj.rows.map(r => r.primaryAge);
  const baseNW  = baseProj.rows.map(r => r.netWorth);
  const len = xLabels.length;
  const optNWAligned = optProj.rows.slice(0, len).map(r => r.netWorth);
  while (optNWAligned.length < len) optNWAligned.push(optNWAligned[optNWAligned.length - 1] || 0);

  const barLabels = [t('Valeur nette finale', 'Final net worth'), t('Actifs investissables finaux', 'Final investable assets')];
  const barSeries = [
    { color: PALETTE[0], name: t('Base', 'Base'),        values: [baseSum.finalNetWorth || 0, baseSum.finalInvestable || 0] },
    { color: PALETTE[1], name: t('Optimisé', 'Optimized'), values: [optSum.finalNetWorth  || 0, optSum.finalInvestable  || 0] },
  ];

  return h('div', { class: 'grid' },
    h('div', { class: 'grid cols-4 span-full' },
      kpi({ label: t('Valeur nette finale', 'Final net worth'), value: money(optSum.finalNetWorth, { currency: cur, compact: true }), iconName: 'networth',
        delta: signMoney(deltaNW, cur), deltaDir: deltaNW >= 0 ? 'up' : 'down', sub: t('Base : ', 'Base: ') + money(baseSum.finalNetWorth, { currency: cur, compact: true }) }),
      kpi({ label: t('Impôt total estimé', 'Estimated lifetime tax'), value: money(optSum.totalLifetimeTax, { currency: cur, compact: true }), iconName: 'tax',
        delta: signMoney(deltaTax, cur), deltaDir: deltaTax <= 0 ? 'up' : 'down', sub: t('Base : ', 'Base: ') + money(baseSum.totalLifetimeTax, { currency: cur, compact: true }) }),
      kpi({ label: t('Probabilité de succès', 'Success probability'), value: pct(optMC.successRate, 0), iconName: 'monte',
        accent: optMC.successRate >= 0.85 ? 'var(--pos)' : optMC.successRate >= 0.6 ? 'var(--warn)' : 'var(--neg)',
        delta: (deltaSR >= 0 ? '+' : '−') + pct(Math.abs(deltaSR), 1), deltaDir: deltaSR >= 0 ? 'up' : 'down', sub: t('Base : ', 'Base: ') + pct(baseMC.successRate, 0) }),
      kpi({ label: t('Capital médian (Monte Carlo)', 'Median capital (Monte Carlo)'), value: money(optMC.medianFinal, { currency: cur, compact: true }), iconName: 'retire',
        delta: signMoney(optMC.medianFinal - baseMC.medianFinal, cur), deltaDir: optMC.medianFinal >= baseMC.medianFinal ? 'up' : 'down', sub: t('Base : ', 'Base: ') + money(baseMC.medianFinal, { currency: cur, compact: true }) }),
    ),
    card(t('Probabilité de succès — avant vs après', 'Success probability — before vs after'), { class: 'span-full' },
      h('div', { class: 'grid cols-2' },
        h('div', { style: { textAlign: 'center' } },
          h('div', { class: 'muted tiny', style: { marginBottom: '6px' } }, t('Avant la stratégie', 'Before strategy')),
          h('div', { html: gauge({ value: baseMC.successRate, label: pct(baseMC.successRate, 0), sub: t('base', 'base') }) }),
          h('div', { class: 'flex center', style: { justifyContent: 'center', marginTop: '6px' } }, badgeScore(baseMC.successRate))),
        h('div', { style: { textAlign: 'center' } },
          h('div', { class: 'muted tiny', style: { marginBottom: '6px' } }, t('Après la stratégie', 'After strategy')),
          h('div', { html: gauge({ value: optMC.successRate, label: pct(optMC.successRate, 0), sub: t('optimisé', 'optimized') }) }),
          h('div', { class: 'flex center', style: { justifyContent: 'center', marginTop: '6px' } }, badgeScore(optMC.successRate))),
      )),
    card(t('Comparaison des résultats patrimoniaux', 'Wealth outcome comparison'), { class: 'span-full',
      right: legend([{ color: PALETTE[0], label: t('Base', 'Base') }, { color: PALETTE[1], label: t('Optimisé', 'Optimized') }]) },
      h('div', { html: barChart({ series: barSeries, xLabels: barLabels, height: 240 }) })),
    card(t('Trajectoire de la valeur nette dans le temps', 'Net worth trajectory over time'), { class: 'span-full',
      right: legend([{ color: PALETTE[0], label: t('Base', 'Base') }, { color: PALETTE[1], label: t('Optimisé', 'Optimized') }]) },
      h('div', { html: lineChart({ series: [{ color: PALETTE[0], values: baseNW }, { color: PALETTE[1], values: optNWAligned }], xLabels, area: false }) })),
    card(t('Récapitulatif des impacts', 'Impact summary'), { class: 'span-full', sub: t('Stratégies combinées vs base', 'Combined strategies vs baseline') },
      statList([
        [t('Valeur nette finale', 'Final net worth'), signMoney(deltaNW, cur), deltaDir(deltaNW)],
        [t('Actifs investissables finaux', 'Final investable assets'), signMoney(deltaInv, cur), deltaDir(deltaInv)],
        [t('Impôt total à vie', 'Total lifetime tax'), signMoney(deltaTax, cur), deltaTax <= 0 ? 'pos' : 'neg'],
        [t('Probabilité de succès (Monte Carlo)', 'Success probability (Monte Carlo)'), (deltaSR >= 0 ? '+' : '−') + pct(Math.abs(deltaSR), 1), deltaDir(deltaSR)],
        [t('Capital médian (Monte Carlo)', 'Median capital (Monte Carlo)'), signMoney(optMC.medianFinal - baseMC.medianFinal, cur), deltaDir(optMC.medianFinal - baseMC.medianFinal)],
        [t('Épuisement du capital', 'Capital depletion'), dOpt ? `${dOpt} ${t('ans', 'yrs')}` : t('Aucun ✓', 'None ✓'), dOpt ? 'neg' : 'pos'],
        [t('Report de l’épuisement', 'Depletion deferral'), deplText, deplCls],
      ])),
  );
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------
export function render({ store, client, jur }) {
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const ctx = { jur, F, cur };

  // Selection persisted per client (calc.strategycompare.selected)
  const W = whatIf(client, 'strategycompare', { selected: [] });
  const selected = new Set(Array.isArray(W.selected) ? W.selected.filter(k => STRATEGIES.some(s => s.key === k)) : []);
  const persist = () => saveWhatIf(store, 'strategycompare', { selected: [...selected] });

  const resultsContainer = h('div', { class: 'span-full' });
  function rebuild() { resultsContainer.replaceChildren(buildResults(client, selected, ctx)); }

  const introCard = card(
    t('Valeur du conseil — impact combiné des stratégies', 'Value of advice — combined strategy impact'),
    { right: h('span', { html: icon('scale', 20) }) },
    h('p', { class: 'muted', style: { margin: '0', lineHeight: '1.7' } },
      t('Ce tableau de bord mesure l’impact patrimonial de l’application simultanée de plusieurs stratégies de planification. ' +
        'Activez les stratégies souhaitées ci-dessous pour voir, en temps réel, leur effet combiné sur votre valeur nette finale, ' +
        'votre charge fiscale à vie et votre probabilité de succès à la retraite. ' +
        'Aucune donnée de votre dossier n’est modifiée — tout est calculé sur une copie; votre sélection est conservée.',
        'This dashboard measures the wealth impact of simultaneously applying several planning strategies. ' +
        'Toggle the strategies below to see, in real time, their combined effect on your final net worth, ' +
        'lifetime tax burden, and retirement success probability. ' +
        'None of your file data is ever modified — all calculations use a deep copy; your selection is kept.')),
  );

  const ON = { borderColor: 'var(--brand-600, #2473b3)', background: 'var(--surface-2, rgba(36,115,179,.07))' };
  const OFF = { borderColor: 'var(--border)', background: '' };
  const strategyButtons = STRATEGIES.map(s => {
    const on = selected.has(s.key);
    const btn = h('button', {
      class: 'btn ghost',
      style: { textAlign: 'left', padding: '10px 14px', borderRadius: '8px', border: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '3px', cursor: 'pointer', transition: 'border-color .15s, background .15s', ...(on ? ON : {}) },
      onClick: () => {
        if (selected.has(s.key)) { selected.delete(s.key); Object.assign(btn.style, OFF); }
        else { selected.add(s.key); Object.assign(btn.style, ON); }
        persist(); rebuild();
      },
    },
      h('span', { class: 'flex', style: { gap: '6px', alignItems: 'center', fontWeight: '600', fontSize: '14px' } }, h('span', { html: icon('check', 14) }), s.name(ctx)),
      h('span', { class: 'muted tiny', style: { lineHeight: '1.5' } }, s.desc(ctx)),
    );
    return btn;
  });

  const controlsCard = card(
    t('Stratégies à simuler', 'Strategies to simulate'),
    { sub: t('Cliquez pour activer ou désactiver — les résultats se recalculent instantanément', 'Click to toggle — results recompute instantly') },
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px', marginTop: '4px' } }, ...strategyButtons),
  );

  rebuild();
  return h('div', { class: 'grid' }, introCard, controlsCard, resultsContainer);
}
