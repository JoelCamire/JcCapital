// ============================================================
// Treasury & Working Capital view
// Defaults from the file: monthly revenue = business active income
// (or household gross income), expenses = household monthly
// expenses for a personal file, cash = cash on hand. All persisted.
// ============================================================
import { h, money, pct, num, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { lineChart, PALETTE } from '../charts.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';
import { store as appStore } from '../../state/store.js';

export function render({ store, client, jur }) {
  store = store || appStore;
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const hasBiz = !!(F.business && F.business.activeIncome > 0);

  const revenueDef = Math.round((hasBiz ? F.business.activeIncome : F.household.grossIncome) / 12);
  const expensesDef = hasBiz
    ? Math.round(revenueDef * 0.75)                                            // business file: operating margin assumption (override & persist)
    : Math.round(F.household.expensesMonthly + F.household.debtServiceMonthly); // personal file: what the household actually spends
  const reserveMonths = (Number.isFinite(+F.assumptions.emergencyMonths) ? +F.assumptions.emergencyMonths : 3);

  const P = whatIf(client, 'treasury', {
    revenue: revenueDef,
    expenses: expensesDef,
    cash: Math.round(F.cash),
    ar: hasBiz ? 40000 : 0,
    ap: hasBiz ? 25000 : 0,
    inventory: hasBiz ? 15000 : 0,
  });
  const setP = (k, v) => { P[k] = v; saveWhatIf(store, 'treasury', { [k]: v }); };

  const out = h('div', {});

  function compute() {
    const monthlySurplus = P.revenue - P.expenses;
    const burning = monthlySurplus < 0;
    const runway = burning && P.expenses > 0 ? P.cash / Math.abs(monthlySurplus) : Infinity;

    const currentAssets = P.ar + P.inventory + P.cash;
    const currentLiabilities = P.ap;
    const workingCapital = currentAssets - currentLiabilities;
    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : Infinity;

    const reserveMin = P.expenses * reserveMonths;
    const reserveMax = P.expenses * Math.max(reserveMonths, 6);
    const reserveOk = P.cash >= reserveMin;

    // 12-month cash projection
    const cashSeries = [];
    const xLabels = [];
    let runningCash = P.cash;
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
        [t('Revenus mensuels', 'Monthly revenue'), money(P.revenue, { currency: cur })],
        [t('Charges mensuelles', 'Monthly expenses'), money(P.expenses, { currency: cur })],
        [t('Trésorerie actuelle', 'Current cash on hand'), money(P.cash, { currency: cur })],
        [t('Comptes clients (C/R)', 'Accounts receivable (A/R)'), money(P.ar, { currency: cur })],
        [t('Comptes fournisseurs (C/P)', 'Accounts payable (A/P)'), money(P.ap, { currency: cur })],
        [t('Stocks', 'Inventory'), money(P.inventory, { currency: cur })],
        [
          t(`Réserve opérationnelle recommandée (${reserveMonths}-${Math.max(reserveMonths, 6)} mois)`, `Recommended operating reserve (${reserveMonths}-${Math.max(reserveMonths, 6)} months)`),
          money(r.reserveMin, { currency: cur }) + ' – ' + money(r.reserveMax, { currency: cur }),
          r.reserveOk ? 'pos' : 'neg',
        ],
      ]),
      h('div', { class: 'sep' }),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } },
        t(
          `Conseils : constituez une réserve de ${reserveMonths} à ${Math.max(reserveMonths, 6)} mois de charges, surveillez les jours de créances clients (objectif < 45 jours) et envisagez une marge de crédit d'exploitation pour absorber les creux saisonniers.`,
          `Tips: build a ${reserveMonths}-to-${Math.max(reserveMonths, 6)}-month expense reserve, monitor accounts receivable days (target < 45 days), and consider an operating line of credit to absorb seasonal dips.`
        )),
    );
  }

  draw();

  const ctrl = card(
    t('Trésorerie et fonds de roulement', 'Treasury & working capital'),
    { sub: hasBiz
      ? t(`Analyse de liquidité et projection sur 12 mois — revenu actif de l’entreprise ${money(F.business.activeIncome, { currency: cur, compact: true })}/an, encaisse ${money(F.cash, { currency: cur, compact: true })}`, `Liquidity analysis and 12-month projection — business active income ${money(F.business.activeIncome, { currency: cur, compact: true })}/yr, cash ${money(F.cash, { currency: cur, compact: true })}`)
      : t(`Dossier personnel — revenu brut ${money(F.household.grossIncome, { currency: cur, compact: true })}/an, dépenses + dettes ${money(expensesDef, { currency: cur, compact: true })}/mois, encaisse ${money(F.cash, { currency: cur, compact: true })}`, `Personal file — gross income ${money(F.household.grossIncome, { currency: cur, compact: true })}/yr, expenses + debt ${money(expensesDef, { currency: cur, compact: true })}/mo, cash ${money(F.cash, { currency: cur, compact: true })}`) },
    h('div', { class: 'grid cols-3' },
      slider({
        label: t('Revenus mensuels', 'Monthly revenue'),
        value: P.revenue, min: 0, max: 1000000, step: 2500,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('revenue', v); draw(); },
      }),
      slider({
        label: t('Charges mensuelles', 'Monthly expenses'),
        value: P.expenses, min: 0, max: 1000000, step: 2500,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('expenses', v); draw(); },
      }),
      slider({
        label: t('Trésorerie disponible', 'Cash on hand'),
        value: P.cash, min: 0, max: 2000000, step: 5000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('cash', v); draw(); },
      }),
      slider({
        label: t('Comptes clients (C/R)', 'Accounts receivable (A/R)'),
        value: P.ar, min: 0, max: 1000000, step: 2500,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('ar', v); draw(); },
      }),
      slider({
        label: t('Comptes fournisseurs (C/P)', 'Accounts payable (A/P)'),
        value: P.ap, min: 0, max: 500000, step: 2500,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('ap', v); draw(); },
      }),
      slider({
        label: t('Stocks', 'Inventory'),
        value: P.inventory, min: 0, max: 1000000, step: 2500,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('inventory', v); draw(); },
      }),
    ),
  );

  return h('div', { class: 'grid' },
    h('div', { class: 'span-full' }, ctrl),
    h('div', { class: 'span-full' }, out),
  );
}
