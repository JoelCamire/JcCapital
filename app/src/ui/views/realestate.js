// ============================================================
// Rental / Investment Real Estate Analysis view
// ============================================================
import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { lineChart, barChart, PALETTE } from '../charts.js';
import { analyzeProperty } from '../../engine/realestate.js';

// ---- Default assumptions -------------------------------------------------
const DEFAULTS = {
  price       : 500000,
  downPct     : 0.20,
  rate        : 0.055,
  amortYears  : 25,
  grossRent   : 24000,
  vacancyPct  : 0.05,
  opexPct     : 0.35,
  appreciation: 0.03,
  rentGrowth  : 0.02,
  marginalRate: 0.46,
  ccaRate     : 0.04,
  holdYears   : 10,
};

// ---- Jurisdiction-specific tax note -------------------------------------
function taxNote(country) {
  if (country === 'CA') {
    return t(
      'Canada — Gain en capital : 50 % d’inclusion dans le revenu imposàble (taux marginal s’applique sur la moitié du gain). Lors de la vente, la Récapture de la DPA (déduction pour amortissement) est entièrement imposàble comme revenu ordinaire.',
      'Canada — Capital gain: 50 % inclusion in taxable income (marginal rate applies on half the gain). On sale, CCA recapture is fully taxable as ordinary income.',
    );
  }
  if (country === 'US') {
    return t(
      'États-Unis — Gain en capital à long terme : taux préférentiel (0 %, 15 % ou 20 % selon le revenu). La récapture de la dépréciation (depreciation recapture) est imposée à 25 %. Un échange 1031 permet de reporter l’impôt si un bien équivalent est acheté dans les délais préscrits.',
      'United States — Long-term capital gain: preferential rate (0 %, 15 % or 20 % depending on income). Depreciation recapture is taxed at 25 %. A 1031 exchange can defer tax if a like-kind property is acquired within the required timeframes.',
    );
  }
  if (country === 'UK') {
    return t(
      'Royaume-Uni — Aucun amortissement fiscal sur les propriétés résididentielles locatives (les travaux admissibles peuvent être déduits). Impôt sur les plus-values (CGT) lors de la vente : taux de 18 % ou 24 % selon le revenu imposàble.',
      'United Kingdom — No depreciation on residential rental property (qualifying repairs may be deducted). Capital Gains Tax (CGT) applies on disposal: 18 % or 24 % depending on taxable income.',
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
    'L’effet de levier permet de contrôler un actif de grande valeur avec un capital propre limité. Un rendement immobilier de 4 % sur un bien financé à 80 % peut produire un rendement sur capital propre nettement supérieur — mais le levier amplifie aussi les pertes si la valeur du bien recule ou si les flux de trésorerie sont insuffisants pour couvrir le service de la dette.',
    'Leverage lets you control a large asset with limited equity capital. A 4 % property return on an 80 %-financed asset can produce a far higher return on equity — but leverage also amplifies losses if property values fall or cash flows are insufficient to cover debt service.',
  );
}

// ---- Helpers -------------------------------------------------------------
function safeNum(v) { return isFinite(v) && !isNaN(v) ? v : 0; }

// ---- Main render ---------------------------------------------------------
export function render({ client, jur }) {
  const cur     = jur.currency;
  const country = (jur.country || 'CA').toUpperCase();

  // Mutable state — no store.update; local only
  const p = Object.assign({}, DEFAULTS);

  // ---- KPI row (updates with results) -----------------------------------
  const kpiCapRate   = kpi({ label: t('Taux de capitalisation', 'Cap rate'),     value: '—', iconName: 'pie' });
  const kpiCoC       = kpi({ label: t('Rendement cash-on-cash', 'Cash-on-cash'), value: '—', iconName: 'cashflow' });
  const kpiMonthlyCF = kpi({ label: t('Flux mensuel avant impôt', 'Monthly cash flow (pre-tax)'), value: '—', iconName: 'bank' });
  const kpiDSCR      = kpi({ label: t('Ratio de couverture (DSCR)', 'Debt service coverage (DSCR)'), value: '—', iconName: 'scale' });
  const kpiRow = h('div', { class: 'grid cols-4 span-full' }, kpiCapRate, kpiCoC, kpiMonthlyCF, kpiDSCR);

  // Container that gets rebuilt on each change
  const resultsContainer = h('div', { class: 'grid span-full' });

  // ---- Rebuild results sub-container ------------------------------------
  function rebuildResults() {
    const r = analyzeProperty(p);
    const s = r.series;

    // Update KPIs
    const capRateEl = kpiCapRate.querySelector('.value');
    if (capRateEl) capRateEl.textContent = p.price > 0 ? pct(safeNum(r.capRate), 2) : '—';
    const cocEl = kpiCoC.querySelector('.value');
    if (cocEl) {
      const v = safeNum(r.cashOnCash);
      cocEl.textContent = p.price > 0 ? pct(v, 2) : '—';
      cocEl.style.color = v >= 0 ? 'var(--pos)' : 'var(--neg)';
    }
    const cfEl = kpiMonthlyCF.querySelector('.value');
    if (cfEl) {
      const v = safeNum(r.monthlyNetCashFlow);
      cfEl.textContent = p.price > 0 ? money(v, { currency: cur }) : '—';
      cfEl.style.color = v >= 0 ? 'var(--pos)' : 'var(--neg)';
    }
    const dscrEl = kpiDSCR.querySelector('.value');
    if (dscrEl) {
      const v = safeNum(r.dscr);
      dscrEl.textContent = p.price > 0 ? num(v, 2) : '—';
      dscrEl.style.color = v >= 1.2 ? 'var(--pos)' : v >= 1 ? 'var(--warn)' : 'var(--neg)';
    }

    // Guard: nothing to show
    if (!p.price || !s.length) {
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
      { sub: t('Projection sur la période de détention', 'Projection over the hold period') },
      valueLegend,
      valueChartEl,
    );

    // ---- Chart: annual NOI / debt service / cash flow -------------------
    const incomeSeries = [
      { color: PALETTE[1], name: t('Résultat net d’exploitation (RNE)', 'Net operating income (NOI)'), values: s.map(r2 => r2.yearNOI) },
      { color: PALETTE[4], name: t('Service de la dette', 'Debt service'), values: s.map(r2 => r2.yearDebtSvc) },
      { color: r.cfbt >= 0 ? PALETTE[0] : PALETTE[4], name: t('Flux de trésorerie', 'Cash flow'), values: s.map(r2 => r2.cashFlow) },
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
      [t('Mise de fonds',    'Down payment'),          money(r.downPayment,       { currency: cur }) + '  (' + pct(p.downPct, 0) + ')'],
      [t('Montant emprunté', 'Loan amount'),      money(r.loanAmount,        { currency: cur })],
      [t('Paiement mensuel', 'Monthly mortgage'),      money(r.monthlyMortgage,   { currency: cur })],
      [t('Revenu brut (ann.)', 'Gross rent (ann.)'),   money(r.effectiveGrossIncome + r.operatingExpenses, { currency: cur })],
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
      [t('Solde résiduel', 'Remaining mortgage'),                       money(r.saleValue - r.finalEquity, { currency: cur })],
      [t('Capital propre à la vente', 'Equity at sale'),               money(r.finalEquity, { currency: cur }), 'pos'],
      [t('Flux cumulés (avant impôt)', 'Cumulative cash flow (pre-tax)'),
        money(r.cumCashFlow, { currency: cur }), r.cumCashFlow >= 0 ? 'pos' : 'neg'],
      [t('Gain en capital estimé', 'Estimated capital gain'),          money(r.capitalGain, { currency: cur })],
      [t('Récapture DPA / CCA estimée', 'CCA recapture (est.)'), money(r.ccaRecapture, { currency: cur })],
      [t('Profit total (net de la mise)', 'Total profit (net of down payment)'),
        money(r.totalProfit, { currency: cur }), r.totalProfit >= 0 ? 'pos' : 'neg'],
      [t('Rendement annualisé simple', 'Simple annualized return'),
        pct(safeNum(r.annReturn), 2), r.annReturn >= 0 ? 'pos' : 'neg'],
    ]);

    const metricsCard = card(
      t('Métriques d’achat', 'Purchase metrics'),
      { sub: t('Indicateurs clés de la propriété', 'Key property indicators') },
      h('div', { class: 'grid cols-2' },
        h('div', {}, purchaseStats),
        h('div', {}, saleStats),
      ),
    );

    // ---- Leverage explainer + tax note ----------------------------------
    const notesCard = card(
      t('Notes importantes', 'Important notes'),
      { sub: t('Effet de levier, fiscalité et récapture', 'Leverage, taxation & recapture') },
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
          h('p', { class: 'tiny', style: { lineHeight: '1.55' } }, taxNote(country)),
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
    { sub: t('Ajustez les curseurs — les résultats se recalculent en direct', 'Adjust sliders — results recalculate live') },
    h('div', { class: 'grid cols-2' },
      slider({
        label: t('Prix d’achat', 'Purchase price'),
        value: p.price, min: 50000, max: 5000000, step: 10000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { p.price = v; rebuildResults(); },
      }),
      slider({
        label: t('Mise de fonds (%)', 'Down payment (%)'),
        value: p.downPct, min: 0.05, max: 0.50, step: 0.01,
        format: v => pct(v, 0),
        onInput: v => { p.downPct = v; rebuildResults(); },
      }),
      slider({
        label: t('Taux hypothécaire', 'Mortgage rate'),
        value: p.rate, min: 0.01, max: 0.12, step: 0.001,
        format: v => pct(v, 2),
        onInput: v => { p.rate = v; rebuildResults(); },
      }),
      slider({
        label: t('Période d’amortissement (années)', 'Amortization (years)'),
        value: p.amortYears, min: 5, max: 30, step: 1,
        format: v => `${v} ${t('ans', 'yrs')}`,
        onInput: v => { p.amortYears = v; rebuildResults(); },
      }),
      slider({
        label: t('Loyer brut annuel', 'Gross annual rent'),
        value: p.grossRent, min: 0, max: 200000, step: 1000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { p.grossRent = v; rebuildResults(); },
      }),
      slider({
        label: t('Taux d’inoccupation (%)', 'Vacancy rate (%)'),
        value: p.vacancyPct, min: 0, max: 0.25, step: 0.01,
        format: v => pct(v, 0),
        onInput: v => { p.vacancyPct = v; rebuildResults(); },
      }),
      slider({
        label: t('Charges d’exploitation (% loyer brut)', 'Operating expenses (% of gross rent)'),
        value: p.opexPct, min: 0, max: 0.70, step: 0.01,
        format: v => pct(v, 0),
        onInput: v => { p.opexPct = v; rebuildResults(); },
      }),
      slider({
        label: t('Appréciation annuelle (%)', 'Annual appreciation (%)'),
        value: p.appreciation, min: -0.05, max: 0.10, step: 0.005,
        format: v => pct(v, 1),
        onInput: v => { p.appreciation = v; rebuildResults(); },
      }),
      slider({
        label: t('Croissance des loyers (%/an)', 'Rent growth (%/yr)'),
        value: p.rentGrowth, min: 0, max: 0.08, step: 0.005,
        format: v => pct(v, 1),
        onInput: v => { p.rentGrowth = v; rebuildResults(); },
      }),
      slider({
        label: t('Période de détention (années)', 'Hold period (years)'),
        value: p.holdYears, min: 1, max: 40, step: 1,
        format: v => `${v} ${t('ans', 'yrs')}`,
        onInput: v => { p.holdYears = v; rebuildResults(); },
      }),
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
