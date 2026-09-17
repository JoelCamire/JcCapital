// ============================================================
// Scenarios & Stress Testing view
// Shows base success metrics, a full stress-test table + chart,
// and an interactive what-if comparator whose levers are PERSISTED
// per client (calc.scenarios) — the file itself is never mutated.
// ============================================================
import { h, money, pct, icon, t } from '../dom.js';
import { kpi, card, slider, statList, badgeScore, legend } from '../widgets.js';
import { barChart, gauge, PALETTE } from '../charts.js';
import { runMonteCarlo } from '../../engine/montecarlo.js';
import { runStress, verdict } from '../../engine/scenarios.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function chipClass(rate) {
  if (rate >= 0.85) return 'pos';
  if (rate >= 0.60) return 'warn';
  return 'neg';
}

function fmtDelta(delta) {
  const pts = (delta * 100).toFixed(1);
  return (delta >= 0 ? '+' : '') + pts + ' pts';
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------
export function render({ store, client, jur }) {
  const cur = jur.currency;
  const F = clientFacts(client, jur);

  // Run all stress scenarios (shared cached base run + 6 clones). Acceptable cost on mount.
  const { base, scenarios } = runStress(client);
  const trials = runMonteCarlo(client).trials;      // cached — same run as `base`

  // =========================================================================
  // 1. Intro card
  // =========================================================================
  const introCard = card(
    t('Tests de résistance', 'Stress testing'),
    {
      sub: t("Simulez l'impact de chocs financiers sur votre plan de retraite.", 'Simulate the impact of financial shocks on your retirement plan.'),
      right: h('span', { html: icon('flame', 18) }),
    },
    h('p', { class: 'muted', style: { margin: '0', lineHeight: '1.6' } },
      t(
        `Chaque scénario applique un choc réaliste sur une copie de votre dossier. Les calculs Monte Carlo (${trials} simulations, réglage du dossier) mesurent la robustesse du plan face à chaque adversité. Aucune donnée n'est modifiée dans votre dossier.`,
        `Each scenario applies a realistic shock to a copy of your file. Monte Carlo (${trials} simulations, the file's setting) measures plan robustness against each adversity. No data in your file is ever modified.`,
      ),
    ),
  );

  // =========================================================================
  // 2. KPI row — base results
  // =========================================================================
  const kpiRow = h('div', { class: 'grid cols-4 span-full' },
    kpi({ label: t('Succès (base)', 'Success (base)'), value: pct(base.successRate, 0), iconName: 'monte',
      accent: base.successRate >= 0.85 ? 'var(--pos)' : base.successRate >= 0.6 ? 'var(--warn)' : 'var(--neg)',
      sub: t('Probabilité Monte Carlo', 'Monte Carlo probability') }),
    kpi({ label: t('Capital médian (base)', 'Median capital (base)'), value: money(base.medianFinal, { currency: cur, compact: true }), iconName: 'networth',
      sub: t(`Médiane de ${trials} simulations`, `Median of ${trials} simulations`) }),
    kpi({ label: t('Capital final (déterministe)', 'Final capital (deterministic)'), value: money(base.finalInvestable, { currency: cur, compact: true }), iconName: 'retire',
      sub: t('Projection centrale', 'Central projection') }),
    kpi({ label: t('Épuisement du capital', 'Capital depletion'),
      value: base.depletionAge ? `${base.depletionAge} ${t('ans', 'yrs')}` : t('Aucun ✓', 'None ✓'),
      iconName: base.depletionAge ? 'warning' : 'check', accent: base.depletionAge ? 'var(--neg)' : 'var(--pos)',
      sub: t('Scénario de base', 'Base scenario') }),
  );

  // =========================================================================
  // 3. Stress-test card — table + bar chart
  // =========================================================================
  const tableRows = (scenarios || []).map(s =>
    h('tr', {},
      h('td', {}, h('b', {}, s.name), h('div', { class: 'tiny muted', style: { marginTop: '2px' } }, s.desc)),
      h('td', { class: 'num' },
        h('span', { class: 'chip ' + chipClass(s.successRate) }, pct(s.successRate, 0)),
        h('div', { class: 'tiny muted', style: { marginTop: '3px' } }, verdict(s.successRate))),
      h('td', { class: 'num mono' }, money(s.medianFinal, { currency: cur, compact: true })),
      h('td', { class: 'num' }, h('b', { class: 'mono', style: { color: s.deltaSuccess >= 0 ? 'var(--pos)' : 'var(--neg)' } }, fmtDelta(s.deltaSuccess))),
      h('td', { class: 'num mono muted' }, s.depletionAge ? `${s.depletionAge} ${t('ans', 'yrs')}` : '—'),
    )
  );

  const stressTable = h('div', { class: 'tbl-wrap' },
    h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {},
        h('th', {}, t('Scénario', 'Scenario')),
        h('th', { class: 'num' }, t('Taux de succès', 'Success rate')),
        h('th', { class: 'num' }, t('Capital médian', 'Median capital')),
        h('th', { class: 'num' }, t('Impact succès', 'Success impact')),
        h('th', { class: 'num' }, t('Épuisement', 'Depletion')))),
      h('tbody', {}, ...tableRows),
    ),
  );

  const chartLabels = [t('Base', 'Base'), ...(scenarios || []).map(s => s.name)];
  const chartValues = [Math.round(base.successRate * 100), ...(scenarios || []).map(s => Math.round(s.successRate * 100))];

  const stressCard = card(
    t('Tests de résistance / Stress tests', 'Stress tests'),
    {
      sub: t(`${(scenarios || []).length} scénarios adverses — impact sur la probabilité de succès`, `${(scenarios || []).length} adverse scenarios — impact on success probability`),
      right: legend([
        { color: 'var(--pos)', label: t('Solide (≥ 85 %)', 'Solid (≥ 85 %)') },
        { color: 'var(--warn)', label: t('À surveiller (≥ 60 %)', 'Watch (≥ 60 %)') },
        { color: 'var(--neg)', label: t('À risque (< 60 %)', 'At risk (< 60 %)') },
      ]),
    },
    stressTable,
    h('div', { style: { marginTop: '16px' } },
      h('div', { class: 'muted tiny', style: { marginBottom: '6px' } }, t('Taux de succès (%) — base vs chaque scénario', 'Success rate (%) — base vs each scenario')),
      h('div', { html: barChart({ series: [{ color: PALETTE[0], values: chartValues }], xLabels: chartLabels, height: 260 }) }),
    ),
  );

  // =========================================================================
  // 4. What-if comparator — levers persisted in calc.scenarios
  // =========================================================================
  const primary = F.primary || { retirementAge: 65 };
  const W = whatIf(client, 'scenarios', { retirementAge: primary.retirementAge, spendingMult: 1.0, extraSavings: 0, returnAdj: 0 });
  const save = (patch) => { Object.assign(W, patch); saveWhatIf(store, 'scenarios', patch); };

  const cmpResults = h('div', { class: 'grid cols-2', style: { marginTop: '16px' } });

  function rebuildCmpResults() {
    // Deep-clone the ORIGINAL client — never mutate it
    const w = JSON.parse(JSON.stringify(client));
    if (w.members && w.members[0]) w.members[0].retirementAge = W.retirementAge;
    w.assumptions = w.assumptions || {};
    w.assumptions.spendingLevel = (F.assumptions.spendingLevel || 1) * W.spendingMult;   // the projection honours spendingLevel
    const firstInv = (w.assets || []).find(a => a.type !== 'realestate');
    if (firstInv) firstInv.annualContribution = (firstInv.annualContribution || 0) + W.extraSavings;
    w.assumptions.preReturn  = Math.max(0.001, (F.assumptions.preReturn  || 0) + W.returnAdj);
    w.assumptions.postReturn = Math.max(0.001, (F.assumptions.postReturn || 0) + W.returnAdj);

    const customMC   = runMonteCarlo(w);
    const customProj = customMC.det;

    const deltaSuccess = customMC.successRate - base.successRate;
    const deltaFinal   = customMC.medianFinal - base.medianFinal;

    const gaugeEl = (rate, medianFinal, subLabel) => h('div', { style: { textAlign: 'center' } },
      h('div', { html: gauge({ value: rate, label: pct(rate, 0), sub: subLabel }) }),
      h('div', { class: 'flex center', style: { justifyContent: 'center', marginTop: '4px' } }, badgeScore(rate)),
      h('div', { class: 'tiny muted', style: { marginTop: '6px' } }, t('Capital médian : ', 'Median capital: ') + money(medianFinal, { currency: cur, compact: true })),
    );

    const compareChartEl = h('div', { class: 'span-full', html: barChart({
      series: [{ color: PALETTE[0], values: [base.medianFinal, 0] }, { color: PALETTE[1], values: [0, customMC.medianFinal] }],
      xLabels: [t('Base', 'Base'), t('Scénario', 'Scenario')], height: 200,
    }) });

    const dBase = base.depletionAge, dNew = customProj.summary.depletionAge;
    const deplDelta = (dBase != null && dNew != null) ? dNew - dBase : null;
    const deltaEl = h('div', { class: 'span-full' },
      statList([
        [t('Écart taux de succès', 'Success rate delta'), fmtDelta(deltaSuccess), deltaSuccess >= 0 ? 'pos' : 'neg'],
        [t('Écart capital médian', 'Median capital delta'), (deltaFinal >= 0 ? '+' : '') + money(deltaFinal, { currency: cur, compact: true }), deltaFinal >= 0 ? 'pos' : 'neg'],
        [t('Épuisement du capital', 'Capital depletion'), dNew ? `${dNew} ${t('ans', 'yrs')}` : t('Aucun ✓', 'None ✓'), dNew ? 'neg' : 'pos'],
        [t('Report de l’épuisement', 'Depletion deferral'),
          deplDelta == null ? (dBase != null && dNew == null ? t('Éliminé ✓', 'Eliminated ✓') : dBase == null && dNew != null ? t('Nouveau risque', 'New risk') : '—') : `${deplDelta >= 0 ? '+' : ''}${deplDelta} ${t('ans', 'yrs')}`,
          deplDelta == null ? (dBase != null && dNew == null ? 'pos' : dNew != null ? 'neg' : '') : deplDelta > 0 ? 'pos' : deplDelta < 0 ? 'neg' : ''],
      ]),
    );

    cmpResults.replaceChildren(
      card(t('Base', 'Base'), {}, gaugeEl(base.successRate, base.medianFinal, t('base', 'base'))),
      card(t('Votre scénario', 'Your scenario'), {}, gaugeEl(customMC.successRate, customMC.medianFinal, t('scénario', 'scenario'))),
      compareChartEl,
      deltaEl,
    );
  }

  rebuildCmpResults();

  const slidersEl = h('div', { class: 'grid cols-2' },
    slider({ label: t('Âge de retraite (titulaire)', 'Retirement age (primary)'), value: W.retirementAge, min: 50, max: 75, step: 1,
      format: v => `${v} ${t('ans', 'yrs')}`, onInput: v => { save({ retirementAge: v }); rebuildCmpResults(); } }),
    slider({ label: t('Niveau de dépenses', 'Spending level'), value: W.spendingMult, min: 0.6, max: 1.5, step: 0.02,
      format: v => pct(v, 0), onInput: v => { save({ spendingMult: v }); rebuildCmpResults(); } }),
    slider({ label: t('Épargne annuelle supplémentaire', 'Extra annual savings'), value: W.extraSavings, min: 0, max: 30000, step: 500,
      format: v => money(v, { currency: cur, compact: true }), onInput: v => { save({ extraSavings: v }); rebuildCmpResults(); } }),
    slider({ label: t('Ajustement de rendement', 'Return adjustment'), value: W.returnAdj, min: -0.04, max: 0.04, step: 0.005,
      format: v => (v >= 0 ? '+' : '') + pct(v), onInput: v => { save({ returnAdj: v }); rebuildCmpResults(); } }),
  );

  const comparatorCard = card(
    t('Comparateur de scénarios', 'Scenario comparator'),
    {
      sub: t('Construisez un what-if personnalisé et comparez-le au scénario de base.', 'Build a custom what-if and compare it to the base scenario.'),
      right: h('span', { class: 'chip info', html: icon('compare', 13) + ' ' + t('Leviers conservés dans le dossier', 'Levers kept with the file') }),
    },
    slidersEl,
    cmpResults,
  );

  return h('div', { class: 'grid' },
    introCard,
    h('div', { class: 'span-full' }, kpiRow),
    stressCard,
    comparatorCard,
  );
}
