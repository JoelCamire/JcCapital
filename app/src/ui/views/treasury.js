// ============================================================
// Treasury & Working Capital view
// ============================================================
import { h, money, pct, num, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { lineChart, PALETTE } from '../charts.js';

export function render({ client, jur }) {
  const cur = jur.currency;

  // Defaults from client data where available
  const monthlyRevDef = (() => {
    const inc = (client.incomes || []).reduce((s, i) => s + (i.amount || 0), 0);
    return Math.round(inc / 12) || 50000;
  })();

  const p = {
    revenue: monthlyRevDef,
    expenses: Math.round(monthlyRevDef * 0.75) || 37500,
    cash: 60000,
    ar: 40000,
    ap: 25000,
    inventory: 15000,
  };

  const out = h('div', {});

  function compute() {
    const monthlySurplus = p.revenue - p.expenses;
    const burning = monthlySurplus < 0;
    const runway = burning && p.expenses > 0 ? p.cash / Math.abs(monthlySurplus) : Infinity;

    const currentAssets = p.ar + p.inventory + p.cash;
    const currentLiabilities = p.ap;
    const workingCapital = currentAssets - currentLiabilities;
    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : Infinity;

    const reserveMin = p.expenses * 3;
    const reserveMax = p.expenses * 6;
    const reserveOk = p.cash >= reserveMin;

    // 12-month cash projection
    const cashSeries = [];
    const xLabels = [];
    let runningCash = p.cash;
    for (let m = 0; m <= 12; m++) {
      cashSeries.push(Math.round(runningCash));
      xLabels.push(m === 0 ? t('Auj.', 'Now') : `M${m}`);
      if (m < 12) runningCash += monthlySurplus;
    }

    return { monthlySurplus, burning, runway, workingCapital, currentRatio, reserveMin, reserveMax, reserveOk, cashSeries, xLabels };
  }

  function draw() {
    const r = compute();

    const runwayDisplay = r.burning
      ? (r.runway < 1 ? t('< 1 mois', '< 1 month') : `${num(r.runway, 1)} ${t('mois', 'months')}`)
      : t('Positif', 'Positive');

    const crDisplay = isFinite(r.currentRatio)
      ? num(r.currentRatio, 2) + 'x'
      : t('N/A', 'N/A');

    out.replaceChildren(
      h('div', { class: 'grid cols-4', style: { marginBottom: '12px' } },
        kpi({
          label: t('Surplus / déficit mensuel', 'Monthly surplus / burn'),
          value: money(r.monthlySurplus, { currency: cur }),
          accent: r.monthlySurplus >= 0 ? 'var(--pos)' : 'var(--neg)',
          iconName: 'cashflow',
        }),
        kpi({
          label: t('Piste de liquidité', 'Cash runway'),
          value: runwayDisplay,
          sub: r.burning ? t('au taux actuel', 'at current burn') : t('cash flow positif', 'positive cash flow'),
          accent: r.burning && r.runway < 3 ? 'var(--neg)' : r.burning ? 'var(--warn)' : 'var(--pos)',
          iconName: 'bank',
        }),
        kpi({
          label: t('Fonds de roulement', 'Working capital'),
          value: money(r.workingCapital, { currency: cur, compact: true }),
          accent: r.workingCapital >= 0 ? 'var(--pos)' : 'var(--neg)',
          iconName: 'briefcase',
        }),
        kpi({
          label: t('Ratio de liquidité', 'Current ratio'),
          value: crDisplay,
          sub: t('actif c./passif c.', 'current assets/liabilities'),
          accent: r.currentRatio >= 1.5 ? 'var(--pos)' : r.currentRatio >= 1 ? 'var(--warn)' : 'var(--neg)',
          iconName: 'scale',
        }),
      ),
      h('div', { html: lineChart({
        series: [{ color: PALETTE[0], values: r.cashSeries }],
        xLabels: r.xLabels,
        area: true,
        height: 220,
      }) }),
      legend([{ color: PALETTE[0], label: t('Trésorerie projetée (12 mois)', 'Projected cash (12 months)') }]),
      h('div', { class: 'sep' }),
      statList([
        [t('Revenus mensuels', 'Monthly revenue'), money(p.revenue, { currency: cur })],
        [t('Charges mensuelles', 'Monthly expenses'), money(p.expenses, { currency: cur })],
        [t('Trésorerie actuelle', 'Current cash on hand'), money(p.cash, { currency: cur })],
        [t('Comptes clients (C/R)', 'Accounts receivable (A/R)'), money(p.ar, { currency: cur })],
        [t('Comptes fournisseurs (C/P)', 'Accounts payable (A/P)'), money(p.ap, { currency: cur })],
        [t('Stocks', 'Inventory'), money(p.inventory, { currency: cur })],
        [
          t('Réserve opérationnelle recommandée (3-6 mois)', 'Recommended operating reserve (3-6 months)'),
          money(p.expenses * 3, { currency: cur }) + ' – ' + money(p.expenses * 6, { currency: cur }),
          r.reserveOk ? 'pos' : 'neg',
        ],
      ]),
      h('div', { class: 'sep' }),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } },
        t(
          'Conseils : constituez une réserve de 3 à 6 mois de charges, surveillez les jours de créances clients (objectif < 45 jours) et envisagez une marge de crédit d\'exploitation pour absorber les creux saisonniers.',
          'Tips: build a 3-to-6-month expense reserve, monitor accounts receivable days (target < 45 days), and consider an operating line of credit to absorb seasonal dips.'
        )),
    );
  }

  draw();

  const ctrl = card(
    t('Trésorerie et fonds de roulement', 'Treasury & working capital'),
    { sub: t('Analyse de liquidité et projection sur 12 mois', 'Liquidity analysis and 12-month projection') },
    h('div', { class: 'grid cols-3' },
      slider({
        label: t('Revenus mensuels', 'Monthly revenue'),
        value: p.revenue, min: 0, max: 1000000, step: 2500,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { p.revenue = v; draw(); },
      }),
      slider({
        label: t('Charges mensuelles', 'Monthly expenses'),
        value: p.expenses, min: 0, max: 1000000, step: 2500,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { p.expenses = v; draw(); },
      }),
      slider({
        label: t('Trésorerie disponible', 'Cash on hand'),
        value: p.cash, min: 0, max: 2000000, step: 5000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { p.cash = v; draw(); },
      }),
      slider({
        label: t('Comptes clients (C/R)', 'Accounts receivable (A/R)'),
        value: p.ar, min: 0, max: 1000000, step: 2500,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { p.ar = v; draw(); },
      }),
      slider({
        label: t('Comptes fournisseurs (C/P)', 'Accounts payable (A/P)'),
        value: p.ap, min: 0, max: 500000, step: 2500,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { p.ap = v; draw(); },
      }),
      slider({
        label: t('Stocks', 'Inventory'),
        value: p.inventory, min: 0, max: 1000000, step: 2500,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { p.inventory = v; draw(); },
      }),
    ),
  );

  return h('div', { class: 'grid' },
    h('div', { class: 'span-full' }, ctrl),
    h('div', { class: 'span-full' }, out),
  );
}
