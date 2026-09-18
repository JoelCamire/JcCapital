// ============================================================
// Debt & Mortgage Management view
// Every payoff figure comes from the facts layer (shared amortization
// engine, Canadian semi-annual mortgage convention). Extra payments
// are PERSISTED per liability so the projection uses them too.
// ============================================================
import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, dataTable, legend } from '../widgets.js';
import { lineChart, barChart, PALETTE } from '../charts.js';
import { compareStrategies, mortgageAcceleration } from '../../engine/debt.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';

// ---- helpers ----------------------------------------------------------------

/** Format months as "X ans Y mois / X yrs Y mo" */
function fmtMonths(months, fr = true) {
  if (!isFinite(months) || months <= 0) return t('—', '—');
  const yrs = Math.floor(months / 12);
  const mo = Math.round(months % 12);
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

// ---- Main render ------------------------------------------------------------

export function render({ store, client, jur }) {
  const cur = jur.currency;
  const country = jur.country;
  const facts = () => clientFacts(client, jur);
  const liabsOf = (F) => F.liabilities.filter(l => l.balance > 0);

  // ---- Empty state ----------------------------------------------------------
  if (!liabsOf(facts()).length) {
    return h('div', { class: 'grid' },
      h('div', { class: 'span-full' },
        card('', {},
          h('div', { class: 'empty', style: { padding: '60px 20px', textAlign: 'center' } },
            h('div', { html: icon('check', 48) }),
            h('h3', { style: { marginTop: '16px' } }, t('Aucune dette — félicitations !', 'No debt — congratulations!')),
            h('p', { class: 'muted' }, t('Ajoutez des passifs dans l\'onglet Patrimoine pour analyser vos dettes.', 'Add liabilities in the Net Worth tab to analyse your debts.')),
          ))));
  }

  /** Persist an extra payment on ONE liability (quiet: no re-render, facts recomputed on next read). */
  function setExtra(id, v) {
    const val = Math.max(0, +v || 0);
    const raw = client.liabilities.find(l => l.id === id); if (raw) raw.extraPayment = val;   // keep the rendered client in sync
    store.quietUpdate(c => { const l = (c.liabilities || []).find(x => x.id === id); if (l) l.extraPayment = val; });
    client._rev = (client._rev || 0) + 1;                                                     // invalidate the facts cache for this object
  }

  // ---- KPI row (rebuilt when persisted extras change) ------------------------
  const kpiRow = h('div', { class: 'grid cols-4 span-full' });
  function rebuildKpis() {
    const F = facts();
    const liabs = liabsOf(F);
    const cmp = compareStrategies(liabs, 0, country);
    const minMonths = cmp.minimumOnly.months;
    kpiRow.replaceChildren(
      kpi({ label: t('Dette totale', 'Total debt'), value: money(F.totalDebt, { currency: cur, compact: true }), iconName: 'card', accent: 'var(--neg)' }),
      kpi({ label: t('Taux moyen pondéré', 'Weighted avg rate'), value: pct(F.weightedRate, 2), iconName: 'flame', accent: F.weightedRate > 0.08 ? 'var(--neg)' : F.weightedRate > 0.04 ? 'var(--warn)' : undefined }),
      kpi({ label: t('Paiements mensuels', 'Monthly payments'), value: money(F.monthlyDebtService, { currency: cur }), iconName: 'cashflow',
        sub: t(`${money(F.annualDebtService, { currency: cur, compact: true })}/an · intérêts an 1 ${money(liabs.reduce((s, l) => s + l.interestYear1, 0), { currency: cur, compact: true })}`,
          `${money(F.annualDebtService, { currency: cur, compact: true })}/yr · year-1 interest ${money(liabs.reduce((s, l) => s + l.interestYear1, 0), { currency: cur, compact: true })}`) }),
      kpi({
        label: t('Sans dette (paiements actuels)', 'Debt-free (current payments)'),
        value: isFinite(minMonths) ? debtFreeDate(minMonths) : t('Impayable', 'Unpayable'),
        sub: isFinite(minMonths) ? fmtDuration(minMonths) : undefined,
        iconName: 'check',
        accent: !isFinite(minMonths) ? 'var(--neg)' : undefined,
      }),
    );
  }

  // ---- Amortization table + per-debt extra payment sliders -------------------
  const amortTable = h('div', {});
  function rebuildAmort() {
    const liabs = liabsOf(facts());
    amortTable.replaceChildren(dataTable({
      rows: liabs,
      cols: [
        { key: 'label', label: t('Description', 'Description') },
        { key: 'balance', label: t('Solde', 'Balance'), num: true, fmt: v => money(v, { currency: cur }) },
        { key: 'rate', label: t('Taux', 'Rate'), num: true, fmt: (v, r) => `${pct(v, 2)}${r.compounding === 'semi-annual' ? ' ½' : ''}` },
        { key: 'payment', label: t('Paiement/mois', 'Payment/mo'), num: true, fmt: (v, r) => r.extraPayment > 0 ? `${money(v, { currency: cur })} + ${money(r.extraPayment, { currency: cur })}` : money(v, { currency: cur }) },
        { key: 'payoffMonths', label: t('Durée', 'Duration'), num: true, fmt: (v, r) => r.unpayable ? t('Impayable', 'Unpayable') : fmtDuration(v) },
        { key: 'totalInterest', label: t('Intérêts totaux', 'Total interest'), num: true, fmt: (v, r) => r.unpayable ? '—' : money(v, { currency: cur }) },
      ],
    }));
  }
  const extraSliders = liabsOf(facts()).map(l => slider({
    label: t(`Paiement additionnel — ${l.label}`, `Extra payment — ${l.label}`),
    value: l.extraPayment || 0, min: 0, max: 2000, step: 25,
    format: v => money(v, { currency: cur }),
    onInput: v => { setExtra(l.id, v); rebuildAmort(); rebuildKpis(); rebuildStrategy(); rebuildBalances(); if (rebuildMortgage) rebuildMortgage(); },
  }));

  const amortCard = card(
    t('Échéancier d\'amortissement', 'Amortization schedule'),
    { sub: t('Durée et coût total par dette · ½ = capitalisation semestrielle (hypothèque canadienne)', 'Duration and total cost per debt · ½ = semi-annual compounding (Canadian mortgage)') },
    amortTable,
    h('div', { class: 'sep' }),
    h('div', { class: 'tiny muted', style: { marginBottom: '6px' } }, t('Paiements additionnels conservés dans le dossier — la projection et la ligne du temps les utilisent.', 'Extra payments are saved in the file — the projection and the timeline use them.')),
    h('div', { class: 'grid cols-2' }, ...extraSliders),
  );

  // ---- Strategy card (household-level extra on top of the per-debt extras) ---
  const W = whatIf(client, 'debt', { extra: 0, method: 'avalanche' });
  const strategyContainer = h('div', {});

  function rebuildStrategy() {
    const liabs = liabsOf(facts());
    const cmpLocal = compareStrategies(liabs, W.extra, country);
    const sel = cmpLocal[W.method] || cmpLocal.avalanche;
    const minSel = cmpLocal.minimumOnly;

    const chartLabels = [t('Minimum', 'Minimum'), t('Avalanche', 'Avalanche'), t('Boule de neige', 'Snowball')];
    const chartValues = [
      isFinite(minSel.totalInterest) ? minSel.totalInterest : 0,
      isFinite(cmpLocal.avalanche.totalInterest) ? cmpLocal.avalanche.totalInterest : 0,
      isFinite(cmpLocal.snowball.totalInterest) ? cmpLocal.snowball.totalInterest : 0,
    ];
    const chartColors = [PALETTE[4], PALETTE[0], PALETTE[1]];

    const statsEl = sel.unpayable
      ? h('div', { class: 'chip neg', style: { margin: '12px 0' } }, t('Paiements insuffisants pour couvrir les intérêts.', 'Payments too small to cover interest.'))
      : statList([
          [t('Sans dette dans', 'Debt-free in'), fmtDuration(sel.months)],
          [t('Date estimée', 'Estimated date'), debtFreeDate(sel.months)],
          [t('Intérêts totaux', 'Total interest'), money(sel.totalInterest, { currency: cur })],
          [t('Intérêts économisés vs minimum', 'Interest saved vs minimum'), isFinite(sel.interestSaved) && sel.interestSaved > 0 ? money(sel.interestSaved, { currency: cur }) : '—', sel.interestSaved > 0 ? 'pos' : ''],
          [t('Temps épargné', 'Time saved'), sel.monthsSaved > 0 ? fmtDuration(sel.monthsSaved) : '—'],
          [t('Ordre de remboursement', 'Payoff order'), (sel.order || []).join(' → ')],
        ]);

    // ONE series of three bars, one colour per bar (three 1-value series would
    // leave two thirds of the grid undefined).
    const barEl = h('div', { html: barChart({ series: [{ values: chartValues, colors: chartColors }], xLabels: chartLabels, stacked: false, height: 200 }) });
    const lgnd = legend(chartColors.map((color, i) => ({ color, label: chartLabels[i] })));
    strategyContainer.replaceChildren(statsEl, h('div', { class: 'sep' }), lgnd, barEl);
  }

  const avalancheBtn = h('button', { class: 'btn sm ' + (W.method === 'avalanche' ? 'primary' : 'ghost'),
    onClick: () => { W.method = 'avalanche'; saveWhatIf(store, 'debt', { method: 'avalanche' }); avalancheBtn.className = 'btn sm primary'; snowballBtn.className = 'btn sm ghost'; rebuildStrategy(); },
  }, t('Avalanche (taux le plus élevé)', 'Avalanche (highest rate)'));
  const snowballBtn = h('button', { class: 'btn sm ' + (W.method === 'snowball' ? 'primary' : 'ghost'),
    onClick: () => { W.method = 'snowball'; saveWhatIf(store, 'debt', { method: 'snowball' }); avalancheBtn.className = 'btn sm ghost'; snowballBtn.className = 'btn sm primary'; rebuildStrategy(); },
  }, t('Boule de neige (solde le plus bas)', 'Snowball (lowest balance)'));

  const extraSlider = slider({
    label: t('Paiement additionnel mensuel (ménage, en plus des paiements par dette)', 'Extra monthly payment (household, on top of per-debt extras)'),
    value: W.extra, min: 0, max: 2000, step: 25,
    format: v => money(v, { currency: cur }),
    onInput: v => { W.extra = v; saveWhatIf(store, 'debt', { extra: v }); rebuildStrategy(); },
  });

  const strategyCard = card(
    t('Stratégie de remboursement', 'Payoff strategy'),
    { sub: t('Comparez les approches — le curseur est conservé dans le dossier', 'Compare approaches — the slider is kept with the file') },
    extraSlider,
    h('div', { class: 'inline', style: { gap: '8px', marginTop: '12px', marginBottom: '12px' } },
      h('span', { class: 'muted tiny' }, t('Méthode :', 'Method:')), avalancheBtn, snowballBtn),
    h('div', { class: 'sep' }),
    strategyContainer,
  );

  // ---- Mortgage acceleration card (persisted extraPayment on the mortgage) ---
  const mortgage0 = facts().mortgage;
  let mortgageCard = null;
  let rebuildMortgage = null;

  if (mortgage0 && mortgage0.balance > 0) {
    const mortgageContainer = h('div', {});
    rebuildMortgage = function () {
      const m = facts().mortgage || mortgage0;
      // base = contractual payment only; accelerated = with the persisted extra payment
      const acc = mortgageAcceleration({ ...m, extraPayment: 0 }, m.extraPayment || 0, country);

      const statsEl = statList([
        [t('Capitalisation', 'Compounding'), acc.compounding === 'semi-annual' ? t('Semestrielle (Loi sur l’intérêt)', 'Semi-annual (Interest Act)') : t('Mensuelle', 'Monthly')],
        [t('Durée de base', 'Base duration'), fmtDuration(acc.baseMonths)],
        [t('Durée accélérée', 'Accelerated duration'), fmtDuration(acc.newMonths)],
        [t('Temps épargné', 'Time saved'), acc.monthsSaved > 0 ? fmtDuration(acc.monthsSaved) : '—', acc.monthsSaved > 0 ? 'pos' : ''],
        [t('Intérêts économisés', 'Interest saved'), acc.interestSaved > 0 ? money(acc.interestSaved, { currency: cur }) : '—', acc.interestSaved > 0 ? 'pos' : ''],
      ]);

      const baseSchedule = acc.baseSchedule || [];
      const accelSchedule = acc.accelSchedule || [];
      const longer = baseSchedule.length >= accelSchedule.length ? baseSchedule : accelSchedule;
      const xLabels = longer.map(s => `${t('An', 'Yr')} ${Math.round(s.month / 12)}`);
      const baseVals = baseSchedule.map(s => s.balance);
      const accelVals = accelSchedule.map(s => s.balance);
      while (accelVals.length < baseVals.length) accelVals.push(0);
      while (baseVals.length < accelVals.length) baseVals.push(0);

      const chartEl = (baseVals.length > 1)
        ? h('div', { html: lineChart({ series: [
            { color: PALETTE[4], name: t('Base', 'Base'), values: baseVals },
            { color: PALETTE[0], name: t('Accéléré', 'Accelerated'), values: accelVals },
          ], xLabels, area: true }) })
        : null;
      const lgnd = legend([{ color: PALETTE[4], label: t('Solde de base', 'Base balance') }, { color: PALETTE[0], label: t('Solde accéléré', 'Accelerated balance') }]);
      mortgageContainer.replaceChildren(statsEl, chartEl ? h('div', { class: 'sep' }) : null, chartEl ? lgnd : null, chartEl || h('div', {}));
    };

    const mortSlider = slider({
      label: t('Paiement additionnel mensuel (hypothèque) — conservé', 'Extra monthly payment (mortgage) — saved'),
      value: mortgage0.extraPayment || 0, min: 0, max: 2000, step: 50,
      format: v => money(v, { currency: cur }),
      onInput: v => { setExtra(mortgage0.id, v); rebuildMortgage(); rebuildAmort(); rebuildKpis(); rebuildStrategy(); rebuildBalances(); },
    });
    rebuildMortgage();

    mortgageCard = card(
      t('Accélération hypothécaire', 'Mortgage acceleration'),
      { sub: `${mortgage0.label} · ${money(mortgage0.balance, { currency: cur })} @ ${pct(mortgage0.rate, 2)}` },
      mortSlider,
      h('div', { class: 'sep' }),
      mortgageContainer,
    );
  }

  // ---- Balances over time card ---------------------------------------------
  const balancesBody = h('div', {});
  function rebuildBalances() {
    const liabs = liabsOf(facts());
    // The facts row exposes payoff figures; the yearly schedule for the chart comes from the same shared engine
    const series = [];
    const labels = [];
    let longest = [];
    liabs.forEach((l, i) => {
      const acc = mortgageAcceleration({ ...l, extraPayment: 0 }, l.extraPayment || 0, country);
      const sched = acc.accelSchedule || [];
      if (!sched.length) return;
      series.push({ color: PALETTE[i % PALETTE.length], values: sched.map(s => s.balance) });
      labels.push({ color: PALETTE[i % PALETTE.length], label: l.label });
      if (sched.length > longest.length) longest = sched;
    });
    if (!series.length) { balancesBody.replaceChildren(); return; }
    const xLabels = longest.map(s => `${t('An', 'Yr')} ${Math.round(s.month / 12)}`);
    for (const s of series) while (s.values.length < xLabels.length) s.values.push(0);
    balancesBody.replaceChildren(legend(labels), h('div', { html: lineChart({ series, xLabels, area: false }) }));
  }
  const balancesCard = card(
    t('Balance dans le temps', 'Balances over time'),
    { sub: t('Évolution annuelle du solde de chaque dette (paiements + additionnels)', 'Annual balance evolution per debt (payments + extras)') },
    balancesBody,
  );

  rebuildKpis(); rebuildAmort(); rebuildStrategy(); rebuildBalances();

  // ---- Compose view -------------------------------------------------------
  const children = [
    kpiRow,
    h('div', { class: 'span-full' }, amortCard),
    h('div', { class: 'span-full' },
      h('div', { class: mortgageCard ? 'grid cols-2' : '' },
        h('div', {}, strategyCard),
        mortgageCard ? h('div', {}, mortgageCard) : null,
      )
    ),
    h('div', { class: 'span-full' }, balancesCard),
  ].filter(Boolean);

  return h('div', { class: 'grid' }, ...children);
}
