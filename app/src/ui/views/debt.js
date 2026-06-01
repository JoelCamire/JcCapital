// ============================================================
// Debt & Mortgage Management view
// ============================================================
import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, dataTable, legend } from '../widgets.js';
import { lineChart, barChart, PALETTE } from '../charts.js';
import { amortize, compareStrategies, mortgageAcceleration } from '../../engine/debt.js';

// ---- helpers ----------------------------------------------------------------

/** Format months as "X ans Y mois / X yrs Y mo" */
function fmtMonths(months, fr = true) {
  if (!isFinite(months) || months <= 0) return t('—', '—');
  const yrs = Math.floor(months / 12);
  const mo = months % 12;
  if (fr) {
    if (yrs && mo) return `${yrs} an${yrs > 1 ? 's' : ''} ${mo} mois`;
    if (yrs) return `${yrs} an${yrs > 1 ? 's' : ''}`;
    return `${mo} mois`;
  } else {
    if (yrs && mo) return `${yrs} yr${yrs !== 1 ? 's' : ''} ${mo} mo`;
    if (yrs) return `${yrs} yr${yrs !== 1 ? 's' : ''}`;
    return `${mo} mo`;
  }
}

function fmtDuration(months) {
  return t(fmtMonths(months, true), fmtMonths(months, false));
}

/** Add months to today, return localized date string */
function debtFreeDate(months) {
  if (!isFinite(months) || months <= 0) return '—';
  const d = new Date();
  d.setMonth(d.getMonth() + Math.round(months));
  return d.toLocaleDateString(t('fr-CA', 'en-CA'), { year: 'numeric', month: 'long' });
}

/** Weighted average interest rate across all liabilities */
function weightedAvgRate(liabilities) {
  const totalBal = liabilities.reduce((s, l) => s + (l.balance || 0), 0);
  if (!totalBal) return 0;
  return liabilities.reduce((s, l) => s + (l.rate || 0) * (l.balance || 0), 0) / totalBal;
}

// ---- Main render ------------------------------------------------------------

export function render({ client, jur }) {
  const cur = jur.currency;
  const liabs = (client.liabilities || []).filter(l => l.balance > 0);

  // ---- Empty state ----------------------------------------------------------
  if (!liabs.length) {
    return h('div', { class: 'grid' },
      h('div', { class: 'span-full' },
        card('', {},
          h('div', { class: 'empty', style: { padding: '60px 20px', textAlign: 'center' } },
            h('div', { html: icon('check', 48) }),
            h('h3', { style: { marginTop: '16px' } }, t('Aucune dette — félicitations !', 'No debt — congratulations!')),
            h('p', { class: 'muted' }, t('Ajoutez des passifs dans l\'onglet Patrimoine pour analyser vos dettes.', 'Add liabilities in the Net Worth tab to analyse your debts.')),
          ))));
  }

  // ---- Pre-compute ---------------------------------------------------------
  const totalDebt = liabs.reduce((s, l) => s + (l.balance || 0), 0);
  const avgRate = weightedAvgRate(liabs);
  const totalPayment = liabs.reduce((s, l) => s + (l.payment || 0), 0);
  const cmp = compareStrategies(liabs, 0); // minimum-only for KPI row
  const minMonths = cmp.minimumOnly.months;

  // ---- KPI row -------------------------------------------------------------
  const kpiRow = h('div', { class: 'grid cols-4 span-full' },
    kpi({ label: t('Dette totale', 'Total debt'), value: money(totalDebt, { currency: cur, compact: true }), iconName: 'card', accent: 'var(--neg)' }),
    kpi({ label: t('Taux moyen pondéré', 'Weighted avg rate'), value: pct(avgRate, 2), iconName: 'flame', accent: avgRate > 0.08 ? 'var(--neg)' : avgRate > 0.04 ? 'var(--warn)' : undefined }),
    kpi({ label: t('Paiements mensuels', 'Monthly payments'), value: money(totalPayment, { currency: cur }), iconName: 'cashflow' }),
    kpi({
      label: t('Sans dette (paiements min.)', 'Debt-free (min. payments)'),
      value: isFinite(minMonths) ? debtFreeDate(minMonths) : t('Impayable', 'Unpayable'),
      sub: isFinite(minMonths) ? fmtDuration(minMonths) : undefined,
      iconName: 'check',
      accent: !isFinite(minMonths) ? 'var(--neg)' : undefined,
    }),
  );

  // ---- Amortization table --------------------------------------------------
  const amortRows = liabs.map(l => {
    const res = amortize(l.balance, l.rate, l.payment);
    return {
      ...l,
      _months: res.months,
      _totalInterest: res.totalInterest,
      _unpayable: res.unpayable,
    };
  });

  const amortCard = card(
    t('Échéancier d\'amortissement', 'Amortization schedule'),
    { sub: t('Durée et coût total par dette', 'Duration and total cost per debt') },
    dataTable({
      rows: amortRows,
      cols: [
        { key: 'label', label: t('Description', 'Description') },
        { key: 'balance', label: t('Solde', 'Balance'), num: true, fmt: v => money(v, { currency: cur }) },
        { key: 'rate', label: t('Taux', 'Rate'), num: true, fmt: v => pct(v, 2) },
        { key: 'payment', label: t('Paiement/mois', 'Payment/mo'), num: true, fmt: v => money(v, { currency: cur }) },
        {
          key: '_months', label: t('Durée', 'Duration'), num: true,
          fmt: (v, r) => r._unpayable ? t('Impayable', 'Unpayable') : fmtDuration(v),
        },
        {
          key: '_totalInterest', label: t('Intérêts totaux', 'Total interest'), num: true,
          fmt: (v, r) => r._unpayable ? '—' : money(v, { currency: cur }),
        },
      ],
    })
  );

  // ---- Strategy card (interactive) ----------------------------------------
  const strategyContainer = h('div', {});

  let extraPayment = 0;
  let strategyMethod = 'avalanche';

  function rebuildStrategy() {
    const cmpLocal = compareStrategies(liabs, extraPayment);
    const sel = cmpLocal[strategyMethod];
    const minSel = cmpLocal.minimumOnly;

    // Bar chart data: total interest comparison
    const chartLabels = [t('Minimum', 'Minimum'), t('Avalanche', 'Avalanche'), t('Boule de neige', 'Snowball')];
    const chartValues = [
      isFinite(minSel.totalInterest) ? minSel.totalInterest : 0,
      isFinite(cmpLocal.avalanche.totalInterest) ? cmpLocal.avalanche.totalInterest : 0,
      isFinite(cmpLocal.snowball.totalInterest) ? cmpLocal.snowball.totalInterest : 0,
    ];
    const chartColors = [PALETTE[4], PALETTE[0], PALETTE[1]];

    const statsEl = sel.unpayable
      ? h('div', { class: 'chip neg', style: { margin: '12px 0' } },
          t('Paiements insuffisants pour couvrir les intérêts.', 'Payments too small to cover interest.'))
      : statList([
          [t('Sans dette dans', 'Debt-free in'), fmtDuration(sel.months)],
          [t('Date estimée', 'Estimated date'), debtFreeDate(sel.months)],
          [t('Intérêts totaux', 'Total interest'), money(sel.totalInterest, { currency: cur })],
          [t('Intérêts économisés vs minimum', 'Interest saved vs minimum'),
            isFinite(sel.interestSaved) && sel.interestSaved > 0 ? money(sel.interestSaved, { currency: cur }) : '—', sel.interestSaved > 0 ? 'pos' : ''],
          [t('Temps épargné', 'Time saved'),
            sel.monthsSaved > 0 ? fmtDuration(sel.monthsSaved) : '—'],
          [t('Ordre de remboursement', 'Payoff order'), (sel.order || []).join(' → ')],
        ]);

    const barEl = h('div', { html: barChart({
      series: chartColors.map((color, i) => ({ color, values: [chartValues[i]] })),
      xLabels: chartLabels,
      stacked: false,
      height: 200,
    }) });

    const lgnd = legend(chartColors.map((color, i) => ({ color, label: chartLabels[i] })));

    strategyContainer.replaceChildren(statsEl, h('div', { class: 'sep' }), lgnd, barEl);
  }

  const avalancheBtn = h('button', {
    class: 'btn sm ' + (strategyMethod === 'avalanche' ? 'primary' : 'ghost'),
    onClick: () => {
      strategyMethod = 'avalanche';
      avalancheBtn.className = 'btn sm primary';
      snowballBtn.className = 'btn sm ghost';
      rebuildStrategy();
    },
  }, t('Avalanche (taux le plus élevé)', 'Avalanche (highest rate)'));

  const snowballBtn = h('button', {
    class: 'btn sm ghost',
    onClick: () => {
      strategyMethod = 'snowball';
      avalancheBtn.className = 'btn sm ghost';
      snowballBtn.className = 'btn sm primary';
      rebuildStrategy();
    },
  }, t('Boule de neige (solde le plus bas)', 'Snowball (lowest balance)'));

  const extraSlider = slider({
    label: t('Paiement additionnel mensuel', 'Extra monthly payment'),
    value: extraPayment,
    min: 0,
    max: 2000,
    step: 25,
    format: v => money(v, { currency: cur }),
    onInput: v => { extraPayment = v; rebuildStrategy(); },
  });

  rebuildStrategy();

  const strategyCard = card(
    t('Stratégie de remboursement', 'Payoff strategy'),
    { sub: t('Comparez les approches et simulez un paiement supplémentaire', 'Compare approaches and simulate an extra payment') },
    extraSlider,
    h('div', { class: 'inline', style: { gap: '8px', marginTop: '12px', marginBottom: '12px' } },
      h('span', { class: 'muted tiny' }, t('Méthode :', 'Method:')),
      avalancheBtn,
      snowballBtn,
    ),
    h('div', { class: 'sep' }),
    strategyContainer,
  );

  // ---- Mortgage acceleration card -----------------------------------------
  const mortgage = liabs.find(l => l.type === 'mortgage');
  let mortgageCard = null;

  if (mortgage) {
    const mortgageContainer = h('div', {});
    let mortExtra = 0;

    function rebuildMortgage() {
      const acc = mortgageAcceleration(mortgage, mortExtra);

      const statsEl = statList([
        [t('Durée de base', 'Base duration'), fmtDuration(acc.baseMonths)],
        [t('Durée accélérée', 'Accelerated duration'), fmtDuration(acc.newMonths)],
        [t('Temps épargné', 'Time saved'), acc.monthsSaved > 0 ? fmtDuration(acc.monthsSaved) : '—', acc.monthsSaved > 0 ? 'pos' : ''],
        [t('Intérêts économisés', 'Interest saved'), acc.interestSaved > 0 ? money(acc.interestSaved, { currency: cur }) : '—', acc.interestSaved > 0 ? 'pos' : ''],
      ]);

      // Build line chart: balance over time for base vs accelerated
      const buildBalanceSeries = (schedule) =>
        schedule.map(s => s.balance);
      const buildYearLabels = (schedule) =>
        schedule.map(s => `${t('An', 'Yr')} ${Math.round(s.month / 12)}`);

      const baseSchedule = acc.baseSchedule || [];
      const accelSchedule = acc.accelSchedule || [];

      // Merge x-axis to base (longer)
      const maxLen = Math.max(baseSchedule.length, accelSchedule.length);
      const xLabels = buildYearLabels(baseSchedule.length >= accelSchedule.length ? baseSchedule : accelSchedule);

      // Pad accelerated to same length with zeros
      const baseVals = buildBalanceSeries(baseSchedule);
      const accelVals = buildBalanceSeries(accelSchedule);
      while (accelVals.length < baseVals.length) accelVals.push(0);

      const chartEl = (baseVals.length > 1)
        ? h('div', { html: lineChart({
            series: [
              { color: PALETTE[4], name: t('Base', 'Base'), values: baseVals },
              { color: PALETTE[0], name: t('Accéléré', 'Accelerated'), values: accelVals },
            ],
            xLabels,
            area: true,
          }) })
        : null;

      const lgnd = legend([
        { color: PALETTE[4], label: t('Solde de base', 'Base balance') },
        { color: PALETTE[0], label: t('Solde accéléré', 'Accelerated balance') },
      ]);

      mortgageContainer.replaceChildren(statsEl, chartEl ? h('div', { class: 'sep' }) : null, chartEl ? lgnd : null, chartEl || h('div', {}));
    }

    const mortSlider = slider({
      label: t('Paiement additionnel mensuel (hypothèque)', 'Extra monthly payment (mortgage)'),
      value: mortExtra,
      min: 0,
      max: 2000,
      step: 50,
      format: v => money(v, { currency: cur }),
      onInput: v => { mortExtra = v; rebuildMortgage(); },
    });

    rebuildMortgage();

    mortgageCard = card(
      t('Accélération hypothécaire', 'Mortgage acceleration'),
      { sub: `${mortgage.label} · ${money(mortgage.balance, { currency: cur })} @ ${pct(mortgage.rate, 2)}` },
      mortSlider,
      h('div', { class: 'sep' }),
      mortgageContainer,
    );
  }

  // ---- Balances over time card ---------------------------------------------
  const balanceSeries = liabs.map((l, i) => {
    const res = amortize(l.balance, l.rate, l.payment);
    if (res.unpayable || !res.schedule.length) return null;
    return {
      color: PALETTE[i % PALETTE.length],
      name: l.label,
      values: res.schedule.map(s => s.balance),
      label: l.label,
      schedule: res.schedule,
    };
  }).filter(Boolean);

  let balancesCard = null;
  if (balanceSeries.length) {
    // Build unified x-axis from longest series
    const longestSeries = balanceSeries.reduce((a, b) => a.schedule.length >= b.schedule.length ? a : b);
    const xLabels = longestSeries.schedule.map(s => `${t('An', 'Yr')} ${Math.round(s.month / 12)}`);

    // Pad shorter series to same length with zeros
    const series = balanceSeries.map(s => {
      const vals = [...s.values];
      while (vals.length < xLabels.length) vals.push(0);
      return { color: s.color, values: vals };
    });

    const lgnd = legend(balanceSeries.map(s => ({ color: s.color, label: s.label })));

    balancesCard = card(
      t('Balance dans le temps', 'Balances over time'),
      { sub: t('Évolution annuelle du solde de chaque dette', 'Annual balance evolution per debt') },
      lgnd,
      h('div', { html: lineChart({ series, xLabels, area: false }) }),
    );
  }

  // ---- Compose view -------------------------------------------------------
  const children = [
    kpiRow,
    h('div', { class: 'span-full' }, amortCard),
    h('div', { class: mortgageCard ? 'span-full' : 'span-full' },
      h('div', { class: mortgageCard ? 'grid cols-2' : '' },
        h('div', {}, strategyCard),
        mortgageCard ? h('div', {}, mortgageCard) : null,
      )
    ),
    balancesCard ? h('div', { class: 'span-full' }, balancesCard) : null,
  ].filter(Boolean);

  return h('div', { class: 'grid' }, ...children);
}
