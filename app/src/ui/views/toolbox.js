// ============================================================
// Toolbox — financial quick-calculators hub
// ============================================================
import { h, money, pct, num, icon, t } from '../dom.js';
import { card, kpi, slider, statList, legend } from '../widgets.js';
import { lineChart, PALETTE } from '../charts.js';

// ---------------------------------------------------------------------------
// Helper: present value of an annuity (payment per period)
// PV = PMT * [1 - (1+r)^-n] / r
// ---------------------------------------------------------------------------
function pvAnnuity(pmt, r, n) {
  if (r === 0) return pmt * n;
  return pmt * (1 - Math.pow(1 + r, -n)) / r;
}

// ---------------------------------------------------------------------------
// 1. Intérêt composé / Compound interest
// ---------------------------------------------------------------------------
function compoundInterestCalc(cur) {
  let principal    = 10000;
  let monthly      = 500;
  let annualReturn = 0.06;
  let years        = 20;

  const resultBox = h('div');

  function rebuild() {
    const r  = annualReturn / 12;
    const n  = years * 12;
    // Future value of lump-sum
    const fvPrincipal = principal * Math.pow(1 + r, n);
    // Future value of annuity (monthly contributions)
    const fvContribs  = r > 0
      ? monthly * (Math.pow(1 + r, n) - 1) / r
      : monthly * n;
    const fv          = fvPrincipal + fvContribs;
    const contributed = principal + monthly * n;
    const growth      = fv - contributed;

    // Year-by-year balances for chart (annual snapshots)
    const xLabels = [];
    const balances = [];
    for (let y = 0; y <= years; y++) {
      const nn = y * 12;
      const fvP = principal * Math.pow(1 + r, nn);
      const fvC = r > 0 ? monthly * (Math.pow(1 + r, nn) - 1) / r : monthly * nn;
      xLabels.push(String(y));
      balances.push(Math.round(fvP + fvC));
    }

    const chart = lineChart({
      series: [{ color: PALETTE[0], values: balances }],
      xLabels,
      area: true,
      height: 240,
    });

    resultBox.replaceChildren(
      h('div', { class: 'grid cols-3', style: { marginTop: '10px' } },
        kpi({ label: t('Valeur future', 'Future value'),    value: money(fv,          { currency: cur, compact: true }), accent: 'var(--pos)' }),
        kpi({ label: t('Total versé',   'Total contributed'), value: money(contributed, { currency: cur, compact: true }) }),
        kpi({ label: t('Croissance',    'Growth'),            value: money(growth,      { currency: cur, compact: true }), accent: 'var(--accent)' }),
      ),
      h('div', { html: chart }),
      legend([
        { color: PALETTE[0], label: t('Solde projeté', 'Projected balance') },
      ]),
    );
  }

  rebuild();

  return card(
    t('Intérêt composé', 'Compound interest'),
    { class: 'span-full', sub: t('Croissance de votre épargne au fil du temps', 'Growth of your savings over time') },
    h('div', { class: 'grid cols-2', style: { marginBottom: '4px' } },
      slider({ label: t('Capital initial', 'Initial principal'), value: principal, min: 0, max: 500000, step: 1000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { principal = v; rebuild(); } }),
      slider({ label: t('Versement mensuel', 'Monthly contribution'), value: monthly, min: 0, max: 5000, step: 50,
        format: v => money(v, { currency: cur }),
        onInput: v => { monthly = v; rebuild(); } }),
      slider({ label: t('Rendement annuel', 'Annual return'), value: annualReturn, min: 0.01, max: 0.15, step: 0.005,
        format: v => pct(v),
        onInput: v => { annualReturn = v; rebuild(); } }),
      slider({ label: t('Horizon (années)', 'Horizon (years)'), value: years, min: 1, max: 40, step: 1,
        format: v => `${v} ${t('ans', 'yrs')}`,
        onInput: v => { years = v; rebuild(); } }),
    ),
    resultBox,
  );
}

// ---------------------------------------------------------------------------
// 2. Règle de 72 / Rule of 72
// ---------------------------------------------------------------------------
function rule72Calc() {
  let rate = 0.06;

  const resultBox = h('div');

  function rebuild() {
    const ratePct    = rate * 100;
    const yearsDouble = ratePct > 0 ? 72 / ratePct : Infinity;
    const doublesPer30 = yearsDouble > 0 && isFinite(yearsDouble) ? (30 / yearsDouble).toFixed(1) : '—';

    resultBox.replaceChildren(
      h('div', { class: 'grid cols-2', style: { marginTop: '10px' } },
        kpi({
          label: t('Années pour doubler', 'Years to double'),
          value: isFinite(yearsDouble) ? num(yearsDouble, 1) + ' ' + t('ans', 'yrs') : '∞',
          accent: 'var(--pos)',
        }),
        kpi({
          label: t('Doublements en 30 ans', 'Doublings in 30 yrs'),
          value: isFinite(yearsDouble) ? doublesPer30 + 'x' : '—',
          sub: t('au même taux', 'at same rate'),
        }),
      ),
    );
  }

  rebuild();

  return card(
    t('Règle de 72', 'Rule of 72'),
    { sub: t('Estimation rapide du temps de doublement', 'Quick doubling-time estimate') },
    slider({ label: t('Taux de rendement annuel', 'Annual return rate'), value: rate, min: 0.01, max: 0.20, step: 0.005,
      format: v => pct(v),
      onInput: v => { rate = v; rebuild(); } }),
    resultBox,
  );
}

// ---------------------------------------------------------------------------
// 3. Capacité hypothécaire / Mortgage affordability
// ---------------------------------------------------------------------------
function mortgageAffordCalc(cur) {
  let grossIncome = 120000;
  let monthlyDebts = 500;
  let rate         = 0.055;
  let amortYears   = 25;
  let downPayment  = 60000;

  const resultBox = h('div');

  function rebuild() {
    const monthlyIncome = grossIncome / 12;
    // Max GDS ratio = 39 %: housing costs / monthly gross income
    // Max TDS ratio = 44 %: (housing + other debts) / monthly gross income
    const maxHousingGDS = monthlyIncome * 0.39;
    const maxHousingTDS = monthlyIncome * 0.44 - monthlyDebts;
    const maxPayment    = Math.max(0, Math.min(maxHousingGDS, maxHousingTDS));

    // PV of that payment stream (monthly rate, n months)
    const mr = rate / 12;
    const n  = amortYears * 12;
    const maxMortgage = pvAnnuity(maxPayment, mr, n);
    const maxHome     = maxMortgage + downPayment;

    // Actual ratios if the max is used
    const gdsRatio = monthlyIncome > 0 ? maxPayment / monthlyIncome : 0;
    const tdsRatio = monthlyIncome > 0 ? (maxPayment + monthlyDebts) / monthlyIncome : 0;
    const gdsOk    = gdsRatio <= 0.39;
    const tdsOk    = tdsRatio <= 0.44;

    resultBox.replaceChildren(
      h('div', { class: 'grid cols-2', style: { marginTop: '10px' } },
        kpi({ label: t('Paiement mensuel max', 'Max monthly payment'), value: money(maxPayment, { currency: cur }), accent: 'var(--pos)' }),
        kpi({ label: t('Montant hypothèque max', 'Max mortgage principal'), value: money(maxMortgage, { currency: cur, compact: true }), accent: 'var(--accent)' }),
        kpi({ label: t('Prix max de la propriété', 'Max home price'), value: money(maxHome, { currency: cur, compact: true }), accent: 'var(--pos)' }),
        kpi({ label: t('Mise de fonds', 'Down payment'), value: money(downPayment, { currency: cur, compact: true }), sub: pct(maxHome > 0 ? downPayment / maxHome : 0) }),
      ),
      statList([
        [t('Ratio RBD (max 39 %)', 'GDS ratio (max 39 %)'), pct(gdsRatio), gdsOk ? 'pos' : 'neg'],
        [t('Ratio RTD (max 44 %)', 'TDS ratio (max 44 %)'), pct(tdsRatio), tdsOk ? 'pos' : 'neg'],
        [t('Dettes mensuelles existantes', 'Existing monthly debts'), money(monthlyDebts, { currency: cur })],
        [t('Amortissement', 'Amortization'), `${amortYears} ${t('ans', 'yrs')}`],
      ]),
    );
  }

  rebuild();

  return card(
    t('Capacité hypothécaire', 'Mortgage affordability'),
    { class: 'span-full', sub: t('Calcul RBD / RTD — règles canadiennes standard', 'GDS / TDS calculation — standard Canadian rules') },
    h('div', { class: 'grid cols-2', style: { marginBottom: '4px' } },
      slider({ label: t('Revenu brut annuel', 'Gross annual income'), value: grossIncome, min: 30000, max: 500000, step: 1000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { grossIncome = v; rebuild(); } }),
      slider({ label: t('Dettes mensuelles existantes', 'Existing monthly debts'), value: monthlyDebts, min: 0, max: 5000, step: 50,
        format: v => money(v, { currency: cur }),
        onInput: v => { monthlyDebts = v; rebuild(); } }),
      slider({ label: t('Taux hypothécaire', 'Mortgage rate'), value: rate, min: 0.01, max: 0.12, step: 0.0025,
        format: v => pct(v),
        onInput: v => { rate = v; rebuild(); } }),
      slider({ label: t('Amortissement', 'Amortization'), value: amortYears, min: 5, max: 30, step: 5,
        format: v => `${v} ${t('ans', 'yrs')}`,
        onInput: v => { amortYears = v; rebuild(); } }),
      slider({ label: t('Mise de fonds', 'Down payment'), value: downPayment, min: 0, max: 300000, step: 5000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { downPayment = v; rebuild(); } }),
    ),
    resultBox,
  );
}

// ---------------------------------------------------------------------------
// 4. REER vs CELI rapide / RRSP vs TFSA quick
// ---------------------------------------------------------------------------
function rrspTfsaCalc(cur) {
  let amount       = 10000;
  let marginalNow  = 0.40;
  let marginalRet  = 0.30;
  let returnRate   = 0.06;
  let years        = 20;

  const resultBox = h('div');

  function rebuild() {
    // RRSP: contribute pre-tax, grows gross, taxed on withdrawal
    const rrspFV      = amount * Math.pow(1 + returnRate, years);
    const rrspAfterTax = rrspFV * (1 - marginalRet);
    // Tax refund reinvested at same rate
    const refund      = amount * marginalNow;
    const refundFV    = refund * Math.pow(1 + returnRate, years) * (1 - marginalRet);
    const rrspTotal   = rrspAfterTax + refundFV;

    // TFSA: contribute after-tax, grows tax-free
    const afterTaxAmount = amount * (1 - marginalNow);
    const tfsaFV         = afterTaxAmount * Math.pow(1 + returnRate, years);

    const diff     = rrspTotal - tfsaFV;
    const rrspWins = diff > 0;

    const recommend = marginalRet < marginalNow
      ? t('REER recommandé — taux à la retraite plus bas', 'RRSP recommended — lower tax rate in retirement')
      : marginalRet > marginalNow
        ? t('CELI recommandé — taux à la retraite plus élevé', 'TFSA recommended — higher tax rate in retirement')
        : t('Équivalents à taux identiques', 'Equivalent at identical rates');

    resultBox.replaceChildren(
      h('div', { class: 'grid cols-2', style: { marginTop: '10px' } },
        kpi({ label: t('REER — valeur nette', 'RRSP — after-tax value'), value: money(rrspTotal, { currency: cur, compact: true }), accent: rrspWins ? 'var(--pos)' : undefined }),
        kpi({ label: t('CELI — valeur nette', 'TFSA — after-tax value'), value: money(tfsaFV,   { currency: cur, compact: true }), accent: !rrspWins ? 'var(--pos)' : undefined }),
      ),
      statList([
        [t('Différence (REER − CELI)', 'Difference (RRSP − TFSA)'), money(Math.abs(diff), { currency: cur, compact: true }), rrspWins ? 'pos' : 'neg'],
        [t('Remboursement fiscal REER réinvesti', 'RRSP refund reinvested FV'), money(refundFV, { currency: cur, compact: true }), 'pos'],
        [t('Recommandation', 'Recommendation'), recommend],
      ]),
    );
  }

  rebuild();

  return card(
    t('REER vs CELI rapide', 'RRSP vs TFSA quick'),
    { class: 'span-full', sub: t('Valeur après impôt selon le véhicule', 'After-tax value by account type') },
    h('div', { class: 'grid cols-2', style: { marginBottom: '4px' } },
      slider({ label: t('Montant cotisé (brut)', 'Contribution amount (gross)'), value: amount, min: 1000, max: 100000, step: 1000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { amount = v; rebuild(); } }),
      slider({ label: t('Taux marginal actuel', 'Current marginal rate'), value: marginalNow, min: 0.15, max: 0.55, step: 0.01,
        format: v => pct(v),
        onInput: v => { marginalNow = v; rebuild(); } }),
      slider({ label: t('Taux marginal à la retraite', 'Retirement marginal rate'), value: marginalRet, min: 0.10, max: 0.55, step: 0.01,
        format: v => pct(v),
        onInput: v => { marginalRet = v; rebuild(); } }),
      slider({ label: t('Rendement annuel', 'Annual return'), value: returnRate, min: 0.01, max: 0.12, step: 0.005,
        format: v => pct(v),
        onInput: v => { returnRate = v; rebuild(); } }),
      slider({ label: t('Horizon (années)', 'Horizon (years)'), value: years, min: 1, max: 40, step: 1,
        format: v => `${v} ${t('ans', 'yrs')}`,
        onInput: v => { years = v; rebuild(); } }),
    ),
    resultBox,
  );
}

// ---------------------------------------------------------------------------
// 5. Valeur actuelle / future — PV ↔ FV toggle
// ---------------------------------------------------------------------------
function pvFvCalc(cur) {
  let amount = 100000;
  let rate   = 0.05;
  let years  = 10;
  let mode   = 'FV'; // 'FV' = compute future value; 'PV' = compute present value

  const resultBox = h('div');
  const toggleBtn  = h('button', { class: 'btn sm ghost' });

  function updateToggle() {
    toggleBtn.textContent = mode === 'FV'
      ? t('Passer en VA', 'Switch to PV')
      : t('Passer en VF', 'Switch to FV');
  }

  function rebuild() {
    let result, label, sub;
    if (mode === 'FV') {
      result = amount * Math.pow(1 + rate, years);
      label  = t('Valeur future', 'Future value');
      sub    = t('du montant actuel', 'of present amount');
    } else {
      result = amount / Math.pow(1 + rate, years);
      label  = t('Valeur actuelle', 'Present value');
      sub    = t('du montant futur', 'of future amount');
    }

    resultBox.replaceChildren(
      h('div', { class: 'grid cols-2', style: { marginTop: '10px' } },
        kpi({ label: mode === 'FV' ? t('Montant de départ (VA)', 'Starting amount (PV)') : t('Montant cible (VF)', 'Target amount (FV)'),
          value: money(amount, { currency: cur, compact: true }) }),
        kpi({ label, value: money(result, { currency: cur, compact: true }), accent: 'var(--pos)', sub }),
      ),
      statList([
        [t('Facteur', 'Factor'), num(Math.pow(1 + rate, years), 3) + 'x'],
        [t('Gain / Actualisation', 'Gain / Discount'), money(Math.abs(result - amount), { currency: cur, compact: true }), result > amount ? 'pos' : 'neg'],
      ]),
    );
  }

  updateToggle();
  rebuild();

  toggleBtn.addEventListener('click', () => {
    mode = mode === 'FV' ? 'PV' : 'FV';
    updateToggle();
    rebuild();
  });

  return card(
    t('Valeur actuelle / future', 'Present value / future value'),
    { sub: t('Actualisation et capitalisation', 'Discounting and compounding'), right: toggleBtn },
    h('div', { class: 'grid cols-3', style: { marginBottom: '4px' } },
      slider({ label: mode === 'FV' ? t('Montant actuel (VA)', 'Present amount (PV)') : t('Montant futur (VF)', 'Future amount (FV)'),
        value: amount, min: 1000, max: 1000000, step: 1000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { amount = v; rebuild(); } }),
      slider({ label: t('Taux annuel', 'Annual rate'), value: rate, min: 0.005, max: 0.15, step: 0.005,
        format: v => pct(v),
        onInput: v => { rate = v; rebuild(); } }),
      slider({ label: t('Horizon (années)', 'Horizon (years)'), value: years, min: 1, max: 40, step: 1,
        format: v => `${v} ${t('ans', 'yrs')}`,
        onInput: v => { years = v; rebuild(); } }),
    ),
    resultBox,
  );
}

// ---------------------------------------------------------------------------
// 6. Coût d'opportunité / Purchase opportunity cost
// ---------------------------------------------------------------------------
function opportunityCostCalc(cur) {
  let purchase = 5000;
  let retRate  = 0.07;
  let years    = 10;

  const resultBox = h('div');

  function rebuild() {
    const fv         = purchase * Math.pow(1 + retRate, years);
    const costOfBuy  = fv - purchase;

    // Year-by-year chart
    const xLabels = [];
    const values  = [];
    for (let y = 0; y <= years; y++) {
      xLabels.push(String(y));
      values.push(Math.round(purchase * Math.pow(1 + retRate, y)));
    }

    const chart = lineChart({
      series: [{ color: PALETTE[4], values }],
      xLabels,
      area: true,
      height: 200,
    });

    resultBox.replaceChildren(
      h('div', { class: 'grid cols-2', style: { marginTop: '10px' } },
        kpi({ label: t('Valeur si investi', 'Value if invested'), value: money(fv, { currency: cur, compact: true }), accent: 'var(--pos)' }),
        kpi({ label: t('Coût réel de l’achat', 'True cost of purchase'), value: money(costOfBuy, { currency: cur, compact: true }), accent: 'var(--neg)',
          sub: t('croissance sacrifiée', 'foregone growth') }),
      ),
      h('div', { html: chart }),
    );
  }

  rebuild();

  return card(
    t('Coût d’opportunité', 'Purchase opportunity cost'),
    { sub: t('Ce que votre achat pourrait valoir si investi', 'What your purchase could be worth if invested') },
    h('div', { class: 'grid cols-3', style: { marginBottom: '4px' } },
      slider({ label: t('Montant de l’achat', 'Purchase amount'), value: purchase, min: 100, max: 100000, step: 100,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { purchase = v; rebuild(); } }),
      slider({ label: t('Rendement annuel hypothétique', 'Hypothetical annual return'), value: retRate, min: 0.01, max: 0.15, step: 0.005,
        format: v => pct(v),
        onInput: v => { retRate = v; rebuild(); } }),
      slider({ label: t('Horizon (années)', 'Horizon (years)'), value: years, min: 1, max: 40, step: 1,
        format: v => `${v} ${t('ans', 'yrs')}`,
        onInput: v => { years = v; rebuild(); } }),
    ),
    resultBox,
  );
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------
export function render({ store, client, jur, navigate }) {
  const cur = jur.currency;

  return h('div', { class: 'grid' },
    // Row 1: compound interest (full width)
    h('div', { class: 'span-full' }, compoundInterestCalc(cur)),

    // Row 2: Rule 72 + PV/FV side by side
    h('div', { class: 'grid cols-2 span-full' },
      rule72Calc(),
      pvFvCalc(cur),
    ),

    // Row 3: mortgage affordability (full width)
    h('div', { class: 'span-full' }, mortgageAffordCalc(cur)),

    // Row 4: RRSP vs TFSA (full width)
    h('div', { class: 'span-full' }, rrspTfsaCalc(cur)),

    // Row 5: opportunity cost (full width)
    h('div', { class: 'span-full' }, opportunityCostCalc(cur)),
  );
}
