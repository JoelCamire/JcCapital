import { h, money, pct, icon, t } from '../dom.js';
import { kpi, card, statList, legend } from '../widgets.js';
import { lineChart, donutChart, gauge, PALETTE } from '../charts.js';
import { runProjection } from '../../engine/projection.js';
import { runMonteCarlo } from '../../engine/montecarlo.js';
import { computeTax } from '../../engine/tax.js';
import { netWorthBreakdown, lifeInsuranceNeeds } from '../../engine/analysis.js';

// ─── Print CSS injection (once per page load) ─────────────────────────────────
function injectPrintCss() {
  if (document.getElementById('jc-print-css')) return;
  const style = document.createElement('style');
  style.id = 'jc-print-css';
  style.textContent = `
@media print {
  .sidebar, .topbar, .no-print { display: none !important; }
  .content { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
  body { background: #fff !important; }
  .card, .report-section { page-break-inside: avoid; break-inside: avoid; }
  @page { margin: 14mm; }
}
`;
  document.head.appendChild(style);
}

export function render({ client, jur }) {
  injectPrintCss();

  const cur = jur.currency;
  const primary = client.members[0] || {};
  const proj = runProjection(client);
  const mc = runMonteCarlo(client, { trials: 600 });
  const nw = netWorthBreakdown(client);
  const sum = proj.summary;
  const rows = proj.rows;
  const last = rows[rows.length - 1] || {};
  const r0 = rows[0] || {};

  // ── Tax snapshot ─────────────────────────────────────────────────────────────
  const employmentIncome = (client.incomes || [])
    .filter(i => ['employment', 'self'].includes(i.type))
    .reduce((s, i) => s + i.amount, 0);
  const taxResult = employmentIncome > 0
    ? computeTax(jur, { ordinary: employmentIncome, withPayroll: true })
    : null;

  // ── Asset donut segments ──────────────────────────────────────────────────────
  const donutSegs = (nw.byTreat || [])
    .filter(b => b.value > 0)
    .map((b, i) => ({ label: b.label, value: b.value, color: PALETTE[i % PALETTE.length] }));

  // ── Projection chart data ─────────────────────────────────────────────────────
  const xLabels = rows.map(r => r.primaryAge);
  const investSeries = rows.map(r => r.investable);

  // ─── Controls bar (no-print) ─────────────────────────────────────────────────
  const controlsBar = card(
    t('Rapport financier', 'Financial Report'),
    {
      class: 'no-print span-full',
      sub: t(
        'Générez un PDF professionnel prêt à remettre au client.',
        'Generate a professional PDF ready to deliver to the client.'
      ),
      right: h('button', {
        class: 'btn accent',
        html: icon('download', 15) + ' ' + t('Imprimer / Exporter PDF', 'Print / Export PDF'),
        onClick: () => window.print(),
      }),
    },
    h('div', { class: 'tiny muted', style: { padding: '4px 0 2px' } },
      icon('warning', 13) + ' ' +
      t(
        'Astuce : choisissez « Enregistrer en PDF » dans la boîte d\'impression.',
        'Tip: choose "Save as PDF" in the print dialog.'
      )
    )
  );

  // ─── SECTION 1 · Cover ───────────────────────────────────────────────────────
  const cover = h('div', { class: 'card report-section', style: { textAlign: 'center', padding: '48px 32px' } },
    h('div', { style: { fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px' } },
      'JC Capital — Joel Camire'),
    h('h1', { style: { fontSize: '2.4rem', fontWeight: '800', margin: '0 0 8px', color: 'var(--text)' } }, client.name || '—'),
    h('h2', { style: { fontSize: '1.25rem', fontWeight: '400', color: 'var(--text-2)', margin: '0 0 32px' } },
      t('Plan financier personnalisé', 'Personal Financial Plan')),
    h('div', { style: { display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap', marginBottom: '24px' } },
      infoChip(icon('timeline', 14), new Date().toLocaleDateString()),
      infoChip(icon('gov', 14), `${jur.flag} ${jur.name} — ${jur.regionName}`),
      infoChip(icon('report', 14), 'JC Capital — Joel Camire'),
    ),
  );

  // ─── SECTION 2 · Executive Summary ───────────────────────────────────────────
  const execSummary = h('div', { class: 'report-section' },
    sectionTitle(t('Sommaire exécutif', 'Executive Summary')),
    h('div', { class: 'grid cols-4 span-full' },
      kpi({
        label: t('Valeur nette', 'Net Worth'),
        value: money(nw.netWorth, { currency: cur, compact: true }),
        iconName: 'networth',
        sub: t(
          `${money(nw.assets, { currency: cur, compact: true })} actifs · ${money(nw.liabilities, { currency: cur, compact: true })} dettes`,
          `${money(nw.assets, { currency: cur, compact: true })} assets · ${money(nw.liabilities, { currency: cur, compact: true })} debt`
        ),
      }),
      kpi({
        label: t('Probabilité de succès', 'Success Probability'),
        value: pct(mc.successRate, 0),
        iconName: 'monte',
        sub: t('600 simulations Monte Carlo', '600 Monte Carlo simulations'),
        accent: mc.successRate >= 0.85 ? 'var(--pos)' : mc.successRate >= 0.6 ? 'var(--warn)' : 'var(--neg)',
      }),
      kpi({
        label: t('Âge de retraite', 'Retirement Age'),
        value: sum.retirementAge ? `${sum.retirementAge} ${t('ans', 'yrs')}` : '—',
        iconName: 'retire',
        sub: primary.name || '—',
      }),
      kpi({
        label: t('Impôt total à vie (estimé)', 'Estimated Lifetime Tax'),
        value: money(sum.totalLifetimeTax, { currency: cur, compact: true }),
        iconName: 'tax',
        sub: r0.marginalRate ? t(`Taux marg. ${pct(r0.marginalRate, 0)}`, `Marginal rate ${pct(r0.marginalRate, 0)}`) : '',
      }),
    )
  );

  // ─── SECTION 3 · Net Worth Statement ─────────────────────────────────────────
  // Group assets by type label
  const assetRows = (client.assets || []).map(a => ({
    label: a.label || a.type,
    value: a.value,
  }));
  const totalAssets = nw.assets;
  const totalLiabilities = nw.liabilities;

  const nwStatement = h('div', { class: 'report-section' },
    sectionTitle(t('Bilan patrimonial', 'Net Worth Statement')),
    h('div', { class: 'grid cols-2 span-full' },
      card(t('Actifs & Passifs', 'Assets & Liabilities'), {},
        assetRows.length
          ? h('div', {},
              h('div', { class: 'tiny muted', style: { padding: '6px 0 4px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' } },
                t('Actifs', 'Assets')),
              ...assetRows.map(r =>
                h('div', { class: 'flex between', style: { padding: '5px 0', borderBottom: '1px solid var(--border)' } },
                  h('span', { class: 'tiny muted' }, r.label),
                  h('b', { class: 'mono' }, money(r.value, { currency: cur }))
                )
              ),
              h('div', { class: 'flex between', style: { padding: '7px 0', borderBottom: '2px solid var(--border)' } },
                h('span', { class: 'tiny', style: { fontWeight: '700' } }, t('Total actifs', 'Total assets')),
                h('b', { class: 'mono' }, money(totalAssets, { currency: cur }))
              ),
              (client.liabilities || []).length
                ? h('div', {},
                    h('div', { class: 'tiny muted', style: { padding: '10px 0 4px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' } },
                      t('Passifs', 'Liabilities')),
                    ...(client.liabilities || []).map(l =>
                      h('div', { class: 'flex between', style: { padding: '5px 0', borderBottom: '1px solid var(--border)' } },
                        h('span', { class: 'tiny muted' }, l.label || l.type),
                        h('b', { class: 'mono', style: { color: 'var(--neg)' } }, money(l.balance, { currency: cur }))
                      )
                    ),
                    h('div', { class: 'flex between', style: { padding: '7px 0', borderBottom: '2px solid var(--border)' } },
                      h('span', { class: 'tiny', style: { fontWeight: '700' } }, t('Total passifs', 'Total liabilities')),
                      h('b', { class: 'mono', style: { color: 'var(--neg)' } }, money(totalLiabilities, { currency: cur }))
                    )
                  )
                : null,
              h('div', { class: 'flex between', style: { padding: '9px 0' } },
                h('span', { style: { fontWeight: '800', fontSize: '1rem' } }, t('Valeur nette', 'Net worth')),
                h('b', { class: 'mono', style: { fontSize: '1.1rem', color: nw.netWorth >= 0 ? 'var(--pos)' : 'var(--neg)' } },
                  money(nw.netWorth, { currency: cur }))
              )
            )
          : h('div', { class: 'empty' }, t('Aucun actif enregistré', 'No assets on record')),
      ),
      card(t('Répartition des actifs', 'Asset Breakdown'), { sub: t('Par traitement fiscal', 'By tax treatment') },
        donutSegs.length
          ? h('div', {},
              h('div', { class: 'flex center', style: { justifyContent: 'center' } },
                h('div', { html: donutChart({ segments: donutSegs, centerLabel: money(totalAssets, { currency: cur, compact: true }), centerSub: t('actifs', 'assets') }) })),
              h('div', { class: 'sep' }),
              legend(donutSegs.map(s => ({ color: s.color, label: `${s.label} · ${money(s.value, { currency: cur, compact: true })}` }))),
            )
          : h('div', { class: 'empty' }, t('Données insuffisantes', 'Insufficient data')),
      ),
    )
  );

  // ─── SECTION 4 · Retirement Projection ───────────────────────────────────────
  const retirementSection = h('div', { class: 'report-section' },
    sectionTitle(t('Projection de retraite', 'Retirement Projection')),
    card(
      t('Trajectoire des actifs investissables', 'Investable Assets Trajectory'),
      {
        class: 'span-full',
        sub: sum.retirementAge
          ? t(`Retraite à ${sum.retirementAge} ans · Espérance de vie ${sum.lifeExpectancy} ans`,
              `Retirement at ${sum.retirementAge} · Life expectancy ${sum.lifeExpectancy}`)
          : '',
        right: legend([{ color: PALETTE[0], label: t('Actifs investissables', 'Investable assets') }]),
      },
      rows.length
        ? h('div', { html: lineChart({ series: [{ color: PALETTE[0], values: investSeries }], xLabels, area: true }) })
        : h('div', { class: 'empty' }, t('Données insuffisantes', 'Insufficient data')),
      h('div', { class: 'sep' }),
      statList([
        [
          t('Revenu requis à la retraite', 'Income needed at retirement'),
          sum.retirementIncomeNeed ? money(sum.retirementIncomeNeed, { currency: cur, compact: true }) : '—',
        ],
        [
          t('Capital au décès (déterministe)', 'Capital at death (deterministic)'),
          money(sum.finalInvestable, { currency: cur, compact: true }),
        ],
        [
          t('Épuisement du capital', 'Capital depletion'),
          sum.depletionAge ? `${sum.depletionAge} ${t('ans', 'yrs')}` : t('Aucun ✓', 'None ✓'),
          sum.depletionAge ? 'neg' : 'pos',
        ],
        [
          t('Taux d\'imposition moyen (retraite)', 'Avg tax rate in retirement'),
          sum.avgTaxRateRetire != null ? pct(sum.avgTaxRateRetire, 0) : '—',
        ],
      ])
    )
  );

  // ─── SECTION 5 · Monte Carlo ──────────────────────────────────────────────────
  const mcInterp = mc.successRate >= 0.85
    ? t(
        `Le plan atteint ${pct(mc.successRate, 0)} de probabilité de succès — trajectoire solide. Des opportunités d'optimisation fiscale ou de devancement de la retraite méritent d'être explorées.`,
        `The plan achieves ${pct(mc.successRate, 0)} probability of success — a solid trajectory. Tax optimization and earlier retirement opportunities are worth exploring.`
      )
    : mc.successRate >= 0.6
      ? t(
          `Le plan atteint ${pct(mc.successRate, 0)} de probabilité de succès — à surveiller. Envisagez d'augmenter l'épargne, de reporter la retraite ou de réduire les dépenses cibles.`,
          `The plan achieves ${pct(mc.successRate, 0)} probability of success — watch closely. Consider increasing savings, delaying retirement, or reducing target spending.`
        )
      : t(
          `Le plan atteint seulement ${pct(mc.successRate, 0)} de probabilité de succès — à risque. Des ajustements significatifs sont recommandés : épargne accrue, retraite différée et révision des dépenses.`,
          `The plan achieves only ${pct(mc.successRate, 0)} probability of success — at risk. Significant adjustments are recommended: higher savings, delayed retirement, and spending review.`
        );

  const mcSection = h('div', { class: 'report-section' },
    sectionTitle(t('Analyse Monte Carlo', 'Monte Carlo Analysis')),
    h('div', { class: 'grid cols-2 span-full' },
      card(t('Probabilité de succès', 'Probability of Success'), { sub: t('600 simulations stochastiques', '600 stochastic simulations') },
        h('div', { style: { textAlign: 'center' } },
          h('div', { html: gauge({ value: mc.successRate, label: pct(mc.successRate, 0), sub: t('succès', 'success') }) })
        ),
      ),
      card(t('Interprétation', 'Interpretation'), {},
        h('p', { style: { lineHeight: '1.7', color: 'var(--text-2)', margin: '0 0 16px' } }, mcInterp),
        statList([
          [t('Médiane au décès (P50)', 'Median at death (P50)'), money(mc.medianFinal, { currency: cur, compact: true })],
          [t('Pessimiste (P10)', 'Pessimistic (P10)'), money(mc.p10Final, { currency: cur, compact: true }), mc.p10Final <= 0 ? 'neg' : ''],
          [t('Optimiste (P90)', 'Optimistic (P90)'), money(mc.p90Final, { currency: cur, compact: true }), 'pos'],
        ])
      ),
    )
  );

  // ─── SECTION 6 · Tax Snapshot ─────────────────────────────────────────────────
  const taxSection = h('div', { class: 'report-section' },
    sectionTitle(t('Portrait fiscal', 'Tax Snapshot')),
    card(
      t('Impôt sur le revenu d\'emploi', 'Employment Income Tax'),
      { sub: `${jur.flag} ${jur.name} (${jur.regionName})` },
      taxResult
        ? statList([
            [t('Revenu d\'emploi brut', 'Gross employment income'), money(employmentIncome, { currency: cur })],
            [t('Impôt fédéral', 'Federal tax'), money(taxResult.federal, { currency: cur }), 'neg'],
            [t('Impôt provincial / régional', 'Regional tax'), money(taxResult.regional, { currency: cur }), 'neg'],
            [t('Charges sociales (payroll)', 'Payroll charges'), money(taxResult.payroll, { currency: cur }), 'neg'],
            [t('Impôt total', 'Total tax'), money(taxResult.total, { currency: cur }), 'neg'],
            [t('Taux effectif moyen', 'Average effective rate'), pct(taxResult.averageRate, 1)],
            [t('Taux marginal', 'Marginal rate'), pct(taxResult.marginalRate, 1)],
          ])
        : h('div', { class: 'empty' }, t('Aucun revenu d\'emploi enregistré', 'No employment income on record')),
    )
  );

  // ─── SECTION 7 · Goals ───────────────────────────────────────────────────────
  const goals = client.goals || [];
  const finalInvestable = sum.finalInvestable || 0;

  const goalsSection = h('div', { class: 'report-section' },
    sectionTitle(t('Objectifs financiers', 'Financial Goals')),
    card(
      t('Objectifs', 'Goals'),
      { sub: t('Financement estimé via le capital projeté', 'Estimated funding from projected capital') },
      goals.length
        ? h('div', {},
            ...goals.map(g => {
              const funded = finalInvestable >= g.amount;
              return h('div', { class: 'flex', style: { gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' } },
                h('span', { class: `chip ${funded ? 'pos' : 'neg'}`, style: { flex: 'none', marginTop: '2px' }, html: icon(funded ? 'check' : 'warning', 13) }),
                h('div', { style: { flex: 1 } },
                  h('b', {}, g.name || g.type),
                  h('div', { class: 'tiny muted', style: { marginTop: '2px' } },
                    t(`Cible : ${money(g.amount, { currency: cur, compact: true })} à ${g.targetAge} ans`,
                      `Target: ${money(g.amount, { currency: cur, compact: true })} at age ${g.targetAge}`),
                  )
                ),
                h('span', { class: `chip sm ${funded ? 'pos' : 'neg'}` },
                  funded ? t('Financé ✓', 'Funded ✓') : t('Sous-financé', 'Underfunded')
                ),
              );
            })
          )
        : h('div', { class: 'empty' }, t('Aucun objectif défini', 'No goals defined')),
    )
  );

  // ─── SECTION 8 · Insurance ───────────────────────────────────────────────────
  const members = client.members || [];

  const insuranceSection = h('div', { class: 'report-section' },
    sectionTitle(t('Analyse d\'assurance vie', 'Life Insurance Analysis')),
    card(
      t('Besoins en assurance par membre', 'Insurance Needs by Member'),
      { sub: t('Méthode des besoins en capital', 'Capital needs method') },
      members.length
        ? h('div', {},
            ...members.map(m => {
              const ins = lifeInsuranceNeeds(client, m.id);
              const hasGap = ins.gap > 0;
              return h('div', { style: { marginBottom: '18px' } },
                h('div', { class: 'flex between', style: { marginBottom: '6px', alignItems: 'center' } },
                  h('b', {}, m.name),
                  h('span', { class: `chip sm ${hasGap ? 'neg' : 'pos'}` },
                    hasGap ? t('Couverture insuffisante', 'Coverage gap') : t('Couvert ✓', 'Covered ✓')
                  ),
                ),
                statList([
                  [t('Besoin brut estimé', 'Estimated gross need'), money(ins.gross, { currency: cur, compact: true })],
                  [t('Couverture existante', 'Existing coverage'), money(ins.existingCoverage, { currency: cur, compact: true })],
                  [t('Écart de couverture', 'Coverage gap'), money(ins.gap, { currency: cur, compact: true }), hasGap ? 'neg' : 'pos'],
                ]),
              );
            })
          )
        : h('div', { class: 'empty' }, t('Aucun membre défini', 'No members defined')),
    )
  );

  // ─── SECTION 9 · Estate ──────────────────────────────────────────────────────
  const lastBal = last.balances || {};
  const grossEstate = (lastBal.deferred || 0) + (lastBal.taxfree || 0) + (lastBal.taxable || 0) + (lastBal.realestate || 0) + (lastBal.corporate || 0);

  const estateSection = h('div', { class: 'report-section' },
    sectionTitle(t('Aperçu successoral', 'Estate Overview')),
    card(
      t('Succession projetée au décès', 'Projected Estate at Death'),
      { sub: sum.lifeExpectancy ? t(`À ${sum.lifeExpectancy} ans (espérance de vie)`, `At age ${sum.lifeExpectancy} (life expectancy)`) : '' },
      statList([
        [t('Valeur nette projetée finale', 'Projected final net worth'), money(last.netWorth || 0, { currency: cur, compact: true })],
        [t('Actifs investissables projetés', 'Projected investable assets'), money(sum.finalInvestable || 0, { currency: cur, compact: true })],
        [t('Succession brute estimée', 'Estimated gross estate'), money(grossEstate, { currency: cur, compact: true })],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '14px', lineHeight: '1.6' } },
        t(
          'Ces projections représentent le scénario déterministe. La succession réelle dépend de l\'évolution des marchés, du taux d\'imposition au décès, des stratégies de roulement et des legs planifiés. Consultez la section Planification successorale pour une analyse détaillée.',
          'These projections represent the deterministic scenario. Actual estate value depends on market performance, tax treatment at death, rollover strategies, and planned bequests. See the Estate Planning section for a detailed analysis.'
        )
      ),
    )
  );

  // ─── SECTION 10 · Disclaimer ─────────────────────────────────────────────────
  const disclaimer = h('div', { class: 'report-section' },
    h('div', { class: 'card', style: { background: 'var(--surface-2)', borderColor: 'var(--border)' } },
      h('p', { class: 'tiny muted', style: { lineHeight: '1.7', margin: 0 } },
        t(
          'Avis important — Les projections présentées dans ce rapport sont fondées sur les données fournies par le client et des hypothèses actuarielles et économiques déclarées (rendements, inflation, taux d\'imposition). Les résultats sont des estimations à titre indicatif uniquement et ne constituent pas un conseil financier, fiscal ou juridique. Les performances passées ne garantissent pas les résultats futurs. Validez tous les chiffres auprès des sources officielles et de votre conseiller qualifié avant de prendre toute décision.',
          'Important Notice — Projections presented in this report are based on client-supplied data and stated actuarial and economic assumptions (returns, inflation, tax rates). Results are estimates for illustrative purposes only and do not constitute financial, tax, or legal advice. Past performance does not guarantee future results. Validate all figures against official sources and your qualified advisor before making any decision.'
        )
      )
    )
  );

  // ─── Assemble report ─────────────────────────────────────────────────────────
  const report = h('div', { class: 'report' },
    cover,
    execSummary,
    nwStatement,
    retirementSection,
    mcSection,
    taxSection,
    goalsSection,
    insuranceSection,
    estateSection,
    disclaimer,
  );

  return h('div', { class: 'grid' },
    h('div', { class: 'span-full' }, controlsBar),
    h('div', { class: 'span-full' }, report),
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sectionTitle(label) {
  return h('div', {
    style: {
      fontSize: '11px',
      fontWeight: '700',
      letterSpacing: '2px',
      textTransform: 'uppercase',
      color: 'var(--text-3)',
      padding: '24px 0 10px',
      borderBottom: '2px solid var(--border)',
      marginBottom: '12px',
    },
  }, label);
}

function infoChip(iconStr, text) {
  return h('span', {
    class: 'chip',
    style: { display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', fontSize: '12px' },
    html: iconStr + ' ' + text,
  });
}
