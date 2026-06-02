// ============================================================
// Strategy Comparison — "Value of Advice" meta-dashboard
// Quantifies the combined impact of planning strategies vs
// the current baseline. No store mutation; deep-clones only.
// ============================================================
import { h, money, pct, icon, t } from '../dom.js';
import { kpi, card, legend, statList, badgeScore } from '../widgets.js';
import { barChart, lineChart, gauge, PALETTE } from '../charts.js';
import { runProjection, treatmentOf } from '../../engine/projection.js';
import { runMonteCarlo } from '../../engine/montecarlo.js';

// ---------------------------------------------------------------------------
// Strategy definitions
// Each strategy: { key, nameFr, nameEn, descFr, descEn, apply(clone) }
// apply() MUTATES the clone in-place (clone is already a deep copy)
// ---------------------------------------------------------------------------
const STRATEGIES = [
  {
    key: 'maxTaxFree',
    nameFr: 'Maximiser le compte libre d’impôt',
    nameEn: 'Max tax-free accounts',
    descFr: 'Augmente les cotisations aux comptes libres d’impôt (CELI, ROTH, ISA) jusqu’à 7 000 $/an chacun.',
    descEn: 'Increases contributions to tax-free accounts (TFSA, Roth, ISA) up to $7,000/yr each.',
    apply(clone) {
      (clone.assets || []).forEach(a => {
        if (treatmentOf(a.type) === 'taxfree') {
          a.annualContribution = Math.max(a.annualContribution || 0, 7000);
        }
      });
    },
  },
  {
    key: 'maxDeferred',
    nameFr: 'Augmenter l’épargne-retraite différée',
    nameEn: 'Boost deferred retirement savings',
    descFr: 'Ajoute 5 000 $/an aux comptes à imposition différée (REER, 401k, IRA).',
    descEn: 'Adds $5,000/yr to tax-deferred accounts (RRSP, 401k, IRA).',
    apply(clone) {
      (clone.assets || []).forEach(a => {
        if (treatmentOf(a.type) === 'deferred') {
          a.annualContribution = (a.annualContribution || 0) + 5000;
        }
      });
    },
  },
  {
    key: 'delayRetirement2',
    nameFr: 'Reporter la retraite de 2 ans',
    nameEn: 'Delay retirement by 2 years',
    descFr: 'Ajoute 2 ans à l’âge de retraite de chaque membre — plus d’accumulation, moins de décaissement.',
    descEn: 'Adds 2 years to each member retirement age — more accumulation, less decumulation.',
    apply(clone) {
      (clone.members || []).forEach(m => {
        m.retirementAge = (m.retirementAge || 65) + 2;
      });
    },
  },
  {
    key: 'payDownDebt',
    nameFr: 'Accélérer le remboursement des dettes',
    nameEn: 'Accelerate debt paydown',
    descFr: 'Redirige 10 000 $/an supplémentaires vers les dettes (augmentation des paiements de ~20 %).',
    descEn: 'Redirects $10,000/yr extra to debt (increases payments by ~20%).',
    apply(clone) {
      const liabs = clone.liabilities || [];
      if (!liabs.length) return;
      const extra = 10000 / liabs.length;
      liabs.forEach(l => {
        const current = l.payment || 0;
        l.payment = current + Math.min(extra, current * 0.2 || extra);
      });
    },
  },
  {
    key: 'delayCPP',
    nameFr: 'Reporter la RPC/PSV à 70 ans',
    nameEn: 'Delay CPP/OAS to age 70',
    descFr: 'Reporte les revenus CPP/RPC et PSV/OAS à 70 ans et augmente le montant de 42 % (0,7 % par mois de report).',
    descEn: 'Delays CPP and OAS income to age 70 and increases the amount by 42% (0.7% per month deferred).',
    apply(clone) {
      (clone.incomes || []).forEach(inc => {
        const tp = (inc.type || '').toLowerCase();
        if (tp === 'cpp' || tp === 'oas' || tp === 'rpc' || tp === 'psv') {
          inc.startAge = 70;
          inc.amount = (inc.amount || 0) * 1.42;
        }
      });
    },
  },
  {
    key: 'reduceSpending5',
    nameFr: 'Réduire les dépenses de 5 %',
    nameEn: 'Reduce spending by 5%',
    descFr: 'Applique une réduction de 5 % sur toutes les dépenses — petits gestes, grand impact cumulé.',
    descEn: 'Applies a 5% reduction across all expenses — small adjustments, large cumulative impact.',
    apply(clone) {
      (clone.expenses || []).forEach(e => {
        e.amount = (e.amount || 0) * 0.95;
      });
    },
  },
  {
    key: 'higherReturn',
    nameFr: 'Optimiser le portefeuille (+0,5 %)',
    nameEn: 'Optimize portfolio (+0.5%)',
    descFr: 'Augmente les rendements hypothétiques de 0,5 % (meilleure allocation ou réduction des frais).',
    descEn: 'Increases assumed returns by 0.5% (better allocation or lower fees).',
    apply(clone) {
      if (clone.assumptions) {
        clone.assumptions.preReturn  = (clone.assumptions.preReturn  || 0.05) + 0.005;
        clone.assumptions.postReturn = (clone.assumptions.postReturn || 0.04) + 0.005;
      }
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
function signPct(v) {
  if (v == null || isNaN(v)) return '—';
  return (v >= 0 ? '+' : '') + pct(Math.abs(v)) + (v < 0 ? '' : '');
}

// ---------------------------------------------------------------------------
// Build the results sub-section (rebuilt on toggle)
// ---------------------------------------------------------------------------
function buildResults(client, selected, cur) {
  // --- Baseline (always computed once per toggle; safe because no mutation) ---
  const baseProj = runProjection(client);
  const baseMC   = runMonteCarlo(client, { trials: 400 });
  const baseSum  = baseProj.summary;

  const noSelection = selected.size === 0;

  if (noSelection) {
    // Show baseline only with a hint
    const xLabels = baseProj.rows.map(r => r.primaryAge);
    const nwValues = baseProj.rows.map(r => r.netWorth);

    return h('div', { class: 'grid' },
      // hint banner
      card(t('Aucune stratégie sélectionnée', 'No strategy selected'), {},
        h('p', { class: 'muted', style: { margin: '0', lineHeight: '1.7' } },
          t(
            'Activez une ou plusieurs stratégies ci-dessus pour mesurer leur impact combiné sur votre plan.',
            'Enable one or more strategies above to measure their combined impact on your plan.',
          ),
        ),
      ),
      // KPI baseline
      h('div', { class: 'grid cols-3 span-full' },
        kpi({
          label: t('Valeur nette finale (base)', 'Final net worth (base)'),
          value: money(baseSum.finalNetWorth, { currency: cur, compact: true }),
          iconName: 'networth',
          sub: t('Scénario de base — déterministe', 'Base scenario — deterministic'),
        }),
        kpi({
          label: t('Probabilité de succès (base)', 'Success probability (base)'),
          value: pct(baseMC.successRate, 0),
          iconName: 'monte',
          accent: baseMC.successRate >= 0.85 ? 'var(--pos)' : baseMC.successRate >= 0.6 ? 'var(--warn)' : 'var(--neg)',
          sub: t('Monte Carlo 400 simulations', 'Monte Carlo 400 simulations'),
        }),
        kpi({
          label: t('Impôt total estimé (base)', 'Estimated lifetime tax (base)'),
          value: money(baseSum.totalLifetimeTax, { currency: cur, compact: true }),
          iconName: 'tax',
          sub: t('Scénario de base', 'Base scenario'),
        }),
      ),
      // Baseline line chart
      card(
        t('Trajectoire de la valeur nette (base)', 'Net worth trajectory (base)'),
        {
          class: 'span-full',
          right: legend([{ color: PALETTE[0], label: t('Valeur nette (base)', 'Net worth (base)') }]),
        },
        h('div', { html: lineChart({ series: [{ color: PALETTE[0], values: nwValues }], xLabels, area: true }) }),
      ),
    );
  }

  // --- Optimized: deep-clone and apply selected strategies ---
  const optClone = JSON.parse(JSON.stringify(client));
  STRATEGIES.forEach(s => {
    if (selected.has(s.key)) s.apply(optClone);
  });

  const optProj = runProjection(optClone);
  const optMC   = runMonteCarlo(optClone, { trials: 400 });
  const optSum  = optProj.summary;

  // Deltas
  const deltaNW    = (optSum.finalNetWorth    || 0) - (baseSum.finalNetWorth    || 0);
  const deltaInv   = (optSum.finalInvestable  || 0) - (baseSum.finalInvestable  || 0);
  const deltaTax   = (optSum.totalLifetimeTax || 0) - (baseSum.totalLifetimeTax || 0);
  const deltaSR    = optMC.successRate - baseMC.successRate;
  const deltaDepl  = (baseSum.depletionAge || 0) - (optSum.depletionAge || 0); // positive = deferred later

  const xLabels  = baseProj.rows.map(r => r.primaryAge);
  const baseNW   = baseProj.rows.map(r => r.netWorth);
  const optNW    = optProj.rows.map(r => {
    // align lengths: optProj may have more rows if retirement delayed
    return r.netWorth;
  });
  // Ensure same length for lineChart (trim or pad with last value)
  const len = xLabels.length;
  const optNWAligned = optProj.rows.slice(0, len).map(r => r.netWorth);
  while (optNWAligned.length < len) optNWAligned.push(optNWAligned[optNWAligned.length - 1] || 0);

  // Bar chart data: final net worth + final investable — base vs optimized
  const barLabels = [
    t('Valeur nette finale', 'Final net worth'),
    t('Actifs investissables finaux', 'Final investable assets'),
  ];
  const barSeries = [
    { color: PALETTE[0], name: t('Base', 'Base'),        values: [baseSum.finalNetWorth || 0, baseSum.finalInvestable || 0] },
    { color: PALETTE[1], name: t('Optimisé', 'Optimized'), values: [optSum.finalNetWorth  || 0, optSum.finalInvestable  || 0] },
  ];

  return h('div', { class: 'grid' },

    // KPI row — 4 metrics
    h('div', { class: 'grid cols-4 span-full' },
      kpi({
        label: t('Valeur nette finale', 'Final net worth'),
        value: money(optSum.finalNetWorth, { currency: cur, compact: true }),
        iconName: 'networth',
        delta: signMoney(deltaNW, cur),
        deltaDir: deltaNW >= 0 ? 'up' : 'down',
        sub: t('Base : ', 'Base: ') + money(baseSum.finalNetWorth, { currency: cur, compact: true }),
      }),
      kpi({
        label: t('Impôt total estimé', 'Estimated lifetime tax'),
        value: money(optSum.totalLifetimeTax, { currency: cur, compact: true }),
        iconName: 'tax',
        delta: signMoney(deltaTax, cur),
        deltaDir: deltaTax <= 0 ? 'up' : 'down',
        sub: t('Base : ', 'Base: ') + money(baseSum.totalLifetimeTax, { currency: cur, compact: true }),
      }),
      kpi({
        label: t('Probabilité de succès', 'Success probability'),
        value: pct(optMC.successRate, 0),
        iconName: 'monte',
        accent: optMC.successRate >= 0.85 ? 'var(--pos)' : optMC.successRate >= 0.6 ? 'var(--warn)' : 'var(--neg)',
        delta: (deltaSR >= 0 ? '+' : '') + pct(Math.abs(deltaSR), 1),
        deltaDir: deltaSR >= 0 ? 'up' : 'down',
        sub: t('Base : ', 'Base: ') + pct(baseMC.successRate, 0),
      }),
      kpi({
        label: t('Capital médian (Monte Carlo)', 'Median capital (Monte Carlo)'),
        value: money(optMC.medianFinal, { currency: cur, compact: true }),
        iconName: 'retire',
        delta: signMoney(optMC.medianFinal - baseMC.medianFinal, cur),
        deltaDir: optMC.medianFinal >= baseMC.medianFinal ? 'up' : 'down',
        sub: t('Base : ', 'Base: ') + money(baseMC.medianFinal, { currency: cur, compact: true }),
      }),
    ),

    // Gauges side by side
    card(
      t('Probabilité de succès — avant vs après', 'Success probability — before vs after'),
      { class: 'span-full' },
      h('div', { class: 'grid cols-2' },
        h('div', { style: { textAlign: 'center' } },
          h('div', { class: 'muted tiny', style: { marginBottom: '6px' } }, t('Avant la stratégie', 'Before strategy')),
          h('div', { html: gauge({ value: baseMC.successRate, label: pct(baseMC.successRate, 0), sub: t('base', 'base') }) }),
          h('div', { class: 'flex center', style: { justifyContent: 'center', marginTop: '6px' } }, badgeScore(baseMC.successRate)),
        ),
        h('div', { style: { textAlign: 'center' } },
          h('div', { class: 'muted tiny', style: { marginBottom: '6px' } }, t('Après la stratégie', 'After strategy')),
          h('div', { html: gauge({ value: optMC.successRate, label: pct(optMC.successRate, 0), sub: t('optimisé', 'optimized') }) }),
          h('div', { class: 'flex center', style: { justifyContent: 'center', marginTop: '6px' } }, badgeScore(optMC.successRate)),
        ),
      ),
    ),

    // Bar chart — wealth comparison
    card(
      t('Comparaison des résultats patrimoniaux', 'Wealth outcome comparison'),
      {
        class: 'span-full',
        right: legend([
          { color: PALETTE[0], label: t('Base', 'Base') },
          { color: PALETTE[1], label: t('Optimisé', 'Optimized') },
        ]),
      },
      h('div', { html: barChart({ series: barSeries, xLabels: barLabels, height: 240 }) }),
    ),

    // Line chart — net worth trajectory over time
    card(
      t('Trajectoire de la valeur nette dans le temps', 'Net worth trajectory over time'),
      {
        class: 'span-full',
        right: legend([
          { color: PALETTE[0], label: t('Base', 'Base') },
          { color: PALETTE[1], label: t('Optimisé', 'Optimized') },
        ]),
      },
      h('div', { html: lineChart({
        series: [
          { color: PALETTE[0], values: baseNW },
          { color: PALETTE[1], values: optNWAligned },
        ],
        xLabels,
        area: false,
      }) }),
    ),

    // Stat list — per-metric deltas
    card(
      t('Récapitulatif des impacts', 'Impact summary'),
      { class: 'span-full', sub: t('Stratégies combinées vs base', 'Combined strategies vs baseline') },
      statList([
        [
          t('Valeur nette finale', 'Final net worth'),
          signMoney(deltaNW, cur),
          deltaDir(deltaNW),
        ],
        [
          t('Actifs investissables finaux', 'Final investable assets'),
          signMoney(deltaInv, cur),
          deltaDir(deltaInv),
        ],
        [
          t('Impôt total à vie', 'Total lifetime tax'),
          signMoney(deltaTax, cur),
          deltaTax <= 0 ? 'pos' : 'neg',
        ],
        [
          t('Probabilité de succès (Monte Carlo)', 'Success probability (Monte Carlo)'),
          (deltaSR >= 0 ? '+' : '') + pct(Math.abs(deltaSR), 1),
          deltaDir(deltaSR),
        ],
        [
          t('Capital médian (Monte Carlo)', 'Median capital (Monte Carlo)'),
          signMoney(optMC.medianFinal - baseMC.medianFinal, cur),
          deltaDir(optMC.medianFinal - baseMC.medianFinal),
        ],
        [
          t('Épuisement du capital', 'Capital depletion'),
          optSum.depletionAge
            ? `${optSum.depletionAge} ${t('ans', 'yrs')}`
            : t('Aucun ✓', 'None ✓'),
          optSum.depletionAge ? 'neg' : 'pos',
        ],
        [
          t('Report de l’épuisement (ans)', 'Depletion deferral (yrs)'),
          deltaDepl > 0 ? `+${deltaDepl} ${t('ans', 'yrs')}` : (deltaDepl < 0 ? `${deltaDepl} ${t('ans', 'yrs')}` : '—'),
          deltaDepl > 0 ? 'pos' : deltaDepl < 0 ? 'neg' : '',
        ],
      ]),
    ),
  );
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------
export function render({ client, jur }) {
  const cur = jur.currency;

  // Selected strategy keys — mutable local Set (never touches store)
  const selected = new Set();

  // Placeholder container rebuilt on toggle
  const resultsContainer = h('div', { class: 'span-full' });

  function rebuild() {
    const content = buildResults(client, selected, cur);
    resultsContainer.replaceChildren(content);
  }

  // ---------------------------------------------------------------------------
  // Intro card
  // ---------------------------------------------------------------------------
  const introCard = card(
    t('Valeur du conseil — impact combiné des stratégies', 'Value of advice — combined strategy impact'),
    { right: h('span', { html: icon('scale', 20) }) },
    h('p', { class: 'muted', style: { margin: '0', lineHeight: '1.7' } },
      t(
        'Ce tableau de bord mesure l’impact patrimonial de l’application simultanée de plusieurs stratégies de planification. ' +
        'Activez les stratégies souhaitées ci-dessous pour voir, en temps réel, leur effet combiné sur votre valeur nette finale, ' +
        'votre charge fiscale à vie et votre probabilité de succès à la retraite. ' +
        'Aucune donnée de votre dossier n’est modifiée — tout est calculé sur une copie.',
        'This dashboard measures the wealth impact of simultaneously applying several planning strategies. ' +
        'Toggle the strategies below to see, in real time, their combined effect on your final net worth, ' +
        'lifetime tax burden, and retirement success probability. ' +
        'None of your file data is ever modified — all calculations use a deep copy.',
      ),
    ),
  );

  // ---------------------------------------------------------------------------
  // Controls card — one toggle button per strategy
  // ---------------------------------------------------------------------------
  const strategyButtons = STRATEGIES.map(s => {
    const btn = h('button', {
      class: 'btn ghost',
      style: { textAlign: 'left', padding: '10px 14px', borderRadius: '8px', border: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '3px', cursor: 'pointer', transition: 'border-color .15s, background .15s' },
      onClick: () => {
        if (selected.has(s.key)) {
          selected.delete(s.key);
          btn.style.borderColor = 'var(--border)';
          btn.style.background  = '';
        } else {
          selected.add(s.key);
          btn.style.borderColor = 'var(--brand-600, #2473b3)';
          btn.style.background  = 'var(--surface-2, rgba(36,115,179,.07))';
        }
        rebuild();
      },
    },
      h('span', { class: 'flex', style: { gap: '6px', alignItems: 'center', fontWeight: '600', fontSize: '14px' } },
        h('span', { html: icon('check', 14) }),
        t(s.nameFr, s.nameEn),
      ),
      h('span', { class: 'muted tiny', style: { lineHeight: '1.5' } }, t(s.descFr, s.descEn)),
    );
    return btn;
  });

  const controlsCard = card(
    t('Stratégies à simuler', 'Strategies to simulate'),
    {
      sub: t(
        'Cliquez pour activer ou désactiver — les résultats se recalculent instantanément',
        'Click to toggle — results recompute instantly',
      ),
    },
    h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '10px',
        marginTop: '4px',
      },
    }, ...strategyButtons),
  );

  // Initial build (no strategies selected)
  rebuild();

  return h('div', { class: 'grid' },
    introCard,
    controlsCard,
    resultsContainer,
  );
}
