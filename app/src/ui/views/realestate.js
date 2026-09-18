// ============================================================
// Rental / Investment Real Estate Analysis view
// Defaults from the file (property value, mortgage rate, growth
// assumption, marginal rate) and the jurisdiction (inclusion rate,
// compounding); after-tax results and IRR from the engine.
// ============================================================
import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { lineChart, barChart, PALETTE } from '../charts.js';
import { analyzeProperty } from '../../engine/realestate.js';
import { compoundingFor } from '../../engine/amortization.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';
import { store as appStore } from '../../state/store.js';

// ---- Jurisdiction-specific tax note -------------------------------------
function taxNote(jur) {
  const country = jur.country;
  if (country === 'CA') {
    return t(
      `Canada — Gain en capital : ${pct(jur.capGainsInclusion, 0)} d’inclusion dans le revenu imposable (taux marginal s’applique sur la portion incluse). Lors de la vente, la récupération de la DPA (déduction pour amortissement) est entièrement imposable comme revenu ordinaire.`,
      `Canada — Capital gain: ${pct(jur.capGainsInclusion, 0)} inclusion in taxable income (marginal rate applies on the included portion). On sale, CCA recapture is fully taxable as ordinary income.`,
    );
  }
  if (country === 'US') {
    return t(
      'États-Unis — Gain en capital à long terme : taux préférentiel (0 %, 15 % ou 20 % selon le revenu). La récupération de la dépréciation (depreciation recapture) est imposée à 25 %. Un échange 1031 permet de reporter l’impôt si un bien équivalent est acheté dans les délais prescrits.',
      'United States — Long-term capital gain: preferential rate (0 %, 15 % or 20 % depending on income). Depreciation recapture is taxed at 25 %. A 1031 exchange can defer tax if a like-kind property is acquired within the required timeframes.',
    );
  }
  if (country === 'UK') {
    return t(
      'Royaume-Uni — Aucun amortissement fiscal sur les propriétés résidentielles locatives (les travaux admissibles peuvent être déduits). Impôt sur les plus-values (CGT) lors de la vente : taux de 18 % ou 24 % selon le revenu imposable.',
      'United Kingdom — No depreciation on residential rental property (qualifying repairs may be deducted). Capital Gains Tax (CGT) applies on disposal: 18 % or 24 % depending on taxable income.',
    );
  }
  return t(
    'Consultez un conseiller fiscal local pour les règles d’amortissement et de gain en capital applicables dans votre juridiction.',
    'Consult a local tax adviser for the depreciation and capital-gain rules applicable in your jurisdiction.',
  );
}

// ---- Leverage explainer text --------------------------------------------
function leverageNote() {
  return t(
    'L’effet de levier permet de contrôler un actif de grande valeur avec un capital propre limité. Un rendement immobilier de 4 % sur un bien financé à 80 % peut produire un rendement sur capital propre nettement supérieur — mais le levier amplifie aussi les pertes si la valeur du bien recule ou si les flux de trésorerie sont insuffisants pour couvrir le service de la dette.',
    'Leverage lets you control a large asset with limited equity capital. A 4 % property return on an 80 %-financed asset can produce a far higher return on equity — but leverage also amplifies losses if property values fall or cash flows are insufficient to cover debt service.',
  );
}

// ---- Helpers -------------------------------------------------------------
function safeNum(v) { return isFinite(v) && !isNaN(v) ? v : 0; }

// ---- Main render ---------------------------------------------------------
export function render({ store, client, jur }) {
  store = store || appStore;
  const cur     = jur.currency;
  const F = clientFacts(client, jur);
  const prim = F.primary || { marginal: { ordinary: 0.45 } };
  const compounding = compoundingFor('mortgage', jur.country);

  // Defaults from the file & jurisdiction; user overrides persisted
  const priceDef = F.home && F.home.value > 0 ? Math.round(F.home.value) : 500000;
  const P = whatIf(client, 'realestate', {
    price       : priceDef,
    downPct     : 0.20,
    rate        : F.mortgage ? Math.round(F.mortgage.rate * 10000) / 10000 : 0.055,
    amortYears  : F.mortgage && F.mortgage.amortizationYears ? F.mortgage.amortizationYears : 25,
    grossRent   : Math.round(priceDef * 0.048 / 1000) * 1000,     // ~4.8 % gross yield starting point
    vacancyPct  : 0.05,
    opexPct     : 0.35,
    appreciation: F.assumptions.realEstateGrowth,
    rentGrowth  : F.assumptions.inflation,
    marginalRate: Math.round(prim.marginal.ordinary * 100) / 100,
    ccaRate     : 0.04,
    holdYears   : 10,
    claimCCA    : true,
  });
  const setP = (k, v) => { P[k] = v; saveWhatIf(store, 'realestate', { [k]: v }); };
  const params = () => ({ ...P, capGainsInclusion: jur.capGainsInclusion, compounding });

  // ---- KPI row (updates with results) -----------------------------------
  const kpiCapRate   = kpi({ label: t('Taux de capitalisation', 'Cap rate'),     value: '—', iconName: 'pie' });
  const kpiCoC       = kpi({ label: t('Rendement cash-on-cash', 'Cash-on-cash'), value: '—', iconName: 'cashflow' });
  const kpiMonthlyCF = kpi({ label: t('Flux mensuel avant impôt', 'Monthly cash flow (pre-tax)'), value: '—', iconName: 'bank' });
  const kpiIRR       = kpi({ label: t('TRI après impôt', 'After-tax IRR'), value: '—', iconName: 'scale' });
  const kpiRow = h('div', { class: 'grid cols-4 span-full' }, kpiCapRate, kpiCoC, kpiMonthlyCF, kpiIRR);

  // Container that gets rebuilt on each change
  const resultsContainer = h('div', { class: 'grid span-full' });

  // ---- Rebuild results sub-container ------------------------------------
  function rebuildResults() {
    const r = analyzeProperty(params());
    const s = r.series;

    // Update KPIs
    const capRateEl = kpiCapRate.querySelector('.value');
    if (capRateEl) capRateEl.textContent = P.price > 0 ? pct(safeNum(r.capRate), 2) : '—';
    const cocEl = kpiCoC.querySelector('.value');
    if (cocEl) {
      const v = safeNum(r.cashOnCash);
      cocEl.textContent = P.price > 0 ? pct(v, 2) : '—';
      cocEl.style.color = v >= 0 ? 'var(--pos)' : 'var(--neg)';
    }
    const cfEl = kpiMonthlyCF.querySelector('.value');
    if (cfEl) {
      const v = safeNum(r.monthlyNetCashFlow);
      cfEl.textContent = P.price > 0 ? money(v, { currency: cur }) : '—';
      cfEl.style.color = v >= 0 ? 'var(--pos)' : 'var(--neg)';
    }
    const irrEl = kpiIRR.querySelector('.value');
    if (irrEl) {
      const v = safeNum(r.annReturnAfterTax);
      irrEl.textContent = P.price > 0 ? pct(v, 2) : '—';
      irrEl.style.color = v >= 0 ? 'var(--pos)' : 'var(--neg)';
    }

    // Guard: nothing to show
    if (!P.price || !s.length) {
      resultsContainer.replaceChildren(
        h('div', { class: 'span-full' },
          card('', {},
            h('div', { class: 'empty', style: { padding: '40px 20px', textAlign: 'center' } },
              h('div', { html: icon('estate', 48) }),
              h('p', { class: 'muted', style: { marginTop: '12px' } },
                t('Entrez un prix d’achat pour démarrer l’analyse.', 'Enter a purchase price to start the analysis.')),
            )
          )
        )
      );
      return;
    }

    // ---- Chart: value vs balance vs equity over time -------------------
    const xLabels = s.map(row => `${t('An', 'Yr')} ${row.year}`);
    const valuesSeries = [
      { color: PALETTE[0], name: t('Valeur du bien', 'Property value'),    values: s.map(r2 => r2.value) },
      { color: PALETTE[4], name: t('Solde hypothécaire', 'Mortgage balance'), values: s.map(r2 => r2.balance) },
      { color: PALETTE[1], name: t('Valeur nette (capital propre)', 'Equity'), values: s.map(r2 => r2.equity) },
    ];
    const valueChartEl = h('div', { html: lineChart({ series: valuesSeries, xLabels, area: false }) });
    const valueLegend  = legend(valuesSeries.map(sr => ({ color: sr.color, label: sr.name })));

    const valueCard = card(
      t('Valeur, solde et capital propre', 'Value, balance & equity'),
      { sub: t(`Projection sur la période de détention — hypothèque à capitalisation ${compounding === 'semi-annual' ? 'semestrielle' : 'mensuelle'}`, `Projection over the hold period — ${compounding === 'semi-annual' ? 'semi-annual' : 'monthly'} mortgage compounding`) },
      valueLegend,
      valueChartEl,
    );

    // ---- Chart: annual NOI / debt service / cash flow -------------------
    const incomeSeries = [
      { color: PALETTE[1], name: t('Résultat net d’exploitation (RNE)', 'Net operating income (NOI)'), values: s.map(r2 => r2.yearNOI) },
      { color: PALETTE[4], name: t('Service de la dette', 'Debt service'), values: s.map(r2 => r2.yearDebtSvc) },
      { color: PALETTE[0], name: t('Flux de trésorerie avant impôt', 'Pre-tax cash flow'), values: s.map(r2 => r2.cashFlow) },
      { color: PALETTE[2], name: t('Flux de trésorerie après impôt', 'After-tax cash flow'), values: s.map(r2 => r2.cashFlowAfterTax) },
    ];
    const incomeChartEl = h('div', { html: barChart({ series: incomeSeries, xLabels, stacked: false }) });
    const incomeLegend  = legend(incomeSeries.map(sr => ({ color: sr.color, label: sr.name })));

    const incomeCard = card(
      t('RNE, service de la dette et flux annuels', 'NOI, debt service & annual cash flows'),
      {},
      incomeLegend,
      incomeChartEl,
    );

    // ---- Stat list: purchase metrics ------------------------------------
    const dscrVal = safeNum(r.dscr);
    const purchaseStats = statList([
      [t('Prix d’achat', 'Purchase price'),       money(r.price,             { currency: cur })],
      [t('Mise de fonds',    'Down payment'),          money(r.downPayment,       { currency: cur }) + '  (' + pct(P.downPct, 0) + ')'],
      [t('Frais d’acquisition', 'Closing costs'),      money(r.closingCosts,      { currency: cur })],
      [t('Montant emprunté', 'Loan amount'),      money(r.loanAmount,        { currency: cur })],
      [t('Paiement mensuel', 'Monthly mortgage'),      money(r.monthlyMortgage,   { currency: cur })],
      [t('Revenu brut (ann.)', 'Gross rent (ann.)'),   money(r.grossRent, { currency: cur })],
      [t('Revenu brut effectif (après inoccupation)', 'Effective gross income (after vacancy)'), money(r.effectiveGrossIncome, { currency: cur })],
      [t('Résultat net d’exploitation (ann.)', 'NOI (ann.)'), money(r.noi, { currency: cur }),
        r.noi >= 0 ? 'pos' : 'neg'],
      [t('Taux de capitalisation', 'Cap rate'),        pct(r.capRate, 2)],
      [t('Rendement cash-on-cash', 'Cash-on-cash'),    pct(r.cashOnCash, 2), r.cashOnCash >= 0 ? 'pos' : 'neg'],
      [t('DSCR', 'DSCR'),                              num(dscrVal, 2),
        dscrVal >= 1.2 ? 'pos' : dscrVal >= 1 ? '' : 'neg'],
    ]);

    // ---- Stat list: sale & return metrics ------------------------------
    const saleStats = statList([
      [t('Valeur projetée à la vente', 'Projected sale value'),   money(r.saleValue,   { currency: cur })],
      [t('Frais de vente', 'Selling costs'),                         money(r.sellingCosts, { currency: cur }), 'neg'],
      [t('Solde résiduel', 'Remaining mortgage'),                       money(r.saleValue - r.finalEquity, { currency: cur })],
      [t('Capital propre à la vente', 'Equity at sale'),               money(r.finalEquity, { currency: cur }), 'pos'],
      [t('Flux cumulés (avant impôt)', 'Cumulative cash flow (pre-tax)'),
        money(r.cumCashFlow, { currency: cur }), r.cumCashFlow >= 0 ? 'pos' : 'neg'],
      [t('Flux cumulés (après impôt)', 'Cumulative cash flow (after-tax)'),
        money(r.cumCashFlowAfterTax, { currency: cur }), r.cumCashFlowAfterTax >= 0 ? 'pos' : 'neg'],
      [t('Gain en capital estimé', 'Estimated capital gain'),          money(r.capitalGain, { currency: cur })],
      [t('Récupération DPA / CCA estimée', 'CCA recapture (est.)'), money(r.ccaRecapture, { currency: cur })],
      [t(`Impôt à la vente (gain ${pct(jur.capGainsInclusion, 0)} inclus + récupération)`, `Tax on sale (gain ${pct(jur.capGainsInclusion, 0)} included + recapture)`), money(r.taxOnSale, { currency: cur }), 'neg'],
      [t('Profit total avant impôt (net de la mise)', 'Total pre-tax profit (net of down payment)'),
        money(r.totalProfit, { currency: cur }), r.totalProfit >= 0 ? 'pos' : 'neg'],
      [t('Profit total après impôt', 'Total after-tax profit'),
        money(r.totalProfitAfterTax, { currency: cur }), r.totalProfitAfterTax >= 0 ? 'pos' : 'neg'],
      [t('TRI avant impôt', 'Pre-tax IRR'),
        pct(safeNum(r.annReturn), 2), r.annReturn >= 0 ? 'pos' : 'neg'],
      [t('TRI après impôt', 'After-tax IRR'),
        pct(safeNum(r.annReturnAfterTax), 2), r.annReturnAfterTax >= 0 ? 'pos' : 'neg'],
    ]);

    const metricsCard = card(
      t('Métriques d’achat et de vente', 'Purchase & sale metrics'),
      { sub: t(`Indicateurs clés — taux marginal ${pct(P.marginalRate, 0)}, DPA ${P.claimCCA ? pct(P.ccaRate, 0) : 'non réclamée'}`, `Key indicators — marginal rate ${pct(P.marginalRate, 0)}, CCA ${P.claimCCA ? pct(P.ccaRate, 0) : 'not claimed'}`) },
      h('div', { class: 'grid cols-2' },
        h('div', {}, purchaseStats),
        h('div', {}, saleStats),
      ),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } }, r.note),
    );

    // ---- Leverage explainer + tax note ----------------------------------
    const notesCard = card(
      t('Notes importantes', 'Important notes'),
      { sub: t('Effet de levier, fiscalité et récupération', 'Leverage, taxation & recapture') },
      h('div', { class: 'grid cols-2' },
        h('div', {},
          h('div', { class: 'tiny muted', style: { fontWeight: '600', marginBottom: '6px' } },
            h('span', { html: icon('split', 14) }),
            ' ', t('Effet de levier', 'Leverage effect')),
          h('p', { class: 'tiny', style: { lineHeight: '1.55' } }, leverageNote()),
        ),
        h('div', {},
          h('div', { class: 'tiny muted', style: { fontWeight: '600', marginBottom: '6px' } },
            h('span', { html: icon('tax', 14) }),
            ' ', t('Fiscalité à la vente', 'Tax on sale')),
          h('p', { class: 'tiny', style: { lineHeight: '1.55' } }, taxNote(jur)),
        ),
      ),
    );

    resultsContainer.replaceChildren(
      h('div', { class: 'span-full' }, valueCard),
      h('div', { class: 'span-full' }, incomeCard),
      h('div', { class: 'span-full' }, metricsCard),
      h('div', { class: 'span-full' }, notesCard),
    );
  }

  // ---- Controls card ---------------------------------------------------
  const controlsCard = card(
    t('Paramètres de la propriété', 'Property parameters'),
    { sub: t(`Ajustez les curseurs — valeurs initiales du dossier (${F.home ? 'immeuble ' + money(F.home.value, { currency: cur, compact: true }) : 'aucun immeuble'}, ${F.mortgage ? 'hypothèque à ' + pct(F.mortgage.rate, 2) : 'aucune hypothèque'}, croissance ${pct(F.assumptions.realEstateGrowth, 1)}, taux marginal ${pct(prim.marginal.ordinary, 1)})`, `Adjust sliders — initial values from the file (${F.home ? 'property ' + money(F.home.value, { currency: cur, compact: true }) : 'no property'}, ${F.mortgage ? 'mortgage at ' + pct(F.mortgage.rate, 2) : 'no mortgage'}, growth ${pct(F.assumptions.realEstateGrowth, 1)}, marginal rate ${pct(prim.marginal.ordinary, 1)})`) },
    h('div', { class: 'grid cols-2' },
      slider({
        label: t('Prix d’achat', 'Purchase price'),
        value: P.price, min: 50000, max: 5000000, step: 10000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('price', v); rebuildResults(); },
      }),
      slider({
        label: t('Mise de fonds (%)', 'Down payment (%)'),
        value: P.downPct, min: 0.05, max: 0.50, step: 0.01,
        format: v => pct(v, 0),
        onInput: v => { setP('downPct', v); rebuildResults(); },
      }),
      slider({
        label: t('Taux hypothécaire', 'Mortgage rate'),
        value: P.rate, min: 0.01, max: 0.12, step: 0.001,
        format: v => pct(v, 2),
        onInput: v => { setP('rate', v); rebuildResults(); },
      }),
      slider({
        label: t('Période d’amortissement (années)', 'Amortization (years)'),
        value: P.amortYears, min: 5, max: 30, step: 1,
        format: v => `${v} ${t('ans', 'yrs')}`,
        onInput: v => { setP('amortYears', v); rebuildResults(); },
      }),
      slider({
        label: t('Loyer brut annuel', 'Gross annual rent'),
        value: P.grossRent, min: 0, max: 200000, step: 1000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('grossRent', v); rebuildResults(); },
      }),
      slider({
        label: t('Taux d’inoccupation (%)', 'Vacancy rate (%)'),
        value: P.vacancyPct, min: 0, max: 0.25, step: 0.01,
        format: v => pct(v, 0),
        onInput: v => { setP('vacancyPct', v); rebuildResults(); },
      }),
      slider({
        label: t('Charges d’exploitation (% loyer brut)', 'Operating expenses (% of gross rent)'),
        value: P.opexPct, min: 0, max: 0.70, step: 0.01,
        format: v => pct(v, 0),
        onInput: v => { setP('opexPct', v); rebuildResults(); },
      }),
      slider({
        label: t('Appréciation annuelle (%)', 'Annual appreciation (%)'),
        value: P.appreciation, min: -0.05, max: 0.10, step: 0.005,
        format: v => pct(v, 1),
        onInput: v => { setP('appreciation', v); rebuildResults(); },
      }),
      slider({
        label: t('Croissance des loyers (%/an)', 'Rent growth (%/yr)'),
        value: P.rentGrowth, min: 0, max: 0.08, step: 0.005,
        format: v => pct(v, 1),
        onInput: v => { setP('rentGrowth', v); rebuildResults(); },
      }),
      slider({
        label: t('Période de détention (années)', 'Hold period (years)'),
        value: P.holdYears, min: 1, max: 40, step: 1,
        format: v => `${v} ${t('ans', 'yrs')}`,
        onInput: v => { setP('holdYears', v); rebuildResults(); },
      }),
      slider({
        label: t('Taux marginal (revenu locatif & récupération)', 'Marginal rate (rental income & recapture)'),
        value: P.marginalRate, min: 0.15, max: 0.55, step: 0.01,
        format: v => pct(v, 0),
        onInput: v => { setP('marginalRate', v); rebuildResults(); },
      }),
      h('div', { class: 'field' }, h('label', {}, t('Déduction pour amortissement (DPA)', 'Capital cost allowance (CCA)')),
        h('select', { onChange: e => { setP('claimCCA', e.target.value === 'yes'); rebuildResults(); } },
          h('option', { value: 'yes', selected: !!P.claimCCA }, t('Réclamer la DPA (récupération à la vente)', 'Claim CCA (recapture on sale)')),
          h('option', { value: 'no', selected: !P.claimCCA }, t('Ne pas réclamer', 'Do not claim')))),
    ),
  );

  // Initial render
  rebuildResults();

  return h('div', { class: 'grid' },
    kpiRow,
    h('div', { class: 'span-full' }, controlsCard),
    resultsContainer,
  );
}
