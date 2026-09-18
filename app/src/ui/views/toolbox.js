// ============================================================
// Toolbox — financial quick-calculators hub
// Every calculator is prefilled from the client file (income, debt
// service, mortgage rate, marginal rates, return assumption) and
// the jurisdiction (GDS/TDS, stress test); inputs are persisted.
// ============================================================
import { h, money, pct, num, icon, t } from '../dom.js';
import { card, kpi, slider, statList, legend } from '../widgets.js';
import { lineChart, PALETTE } from '../charts.js';
import { monthlyPayment, compoundingFor } from '../../engine/amortization.js';
import { clientFacts, retirementFacts, whatIf, saveWhatIf } from '../../engine/facts.js';
import { JURISDICTIONS } from '../../jurisdictions/index.js';
import { store as appStore } from '../../state/store.js';

// ---------------------------------------------------------------------------
// 1. Intérêt composé / Compound interest
// ---------------------------------------------------------------------------
function compoundInterestCalc(cur, P, setP) {
  const resultBox = h('div');

  function rebuild() {
    const r  = P.ciReturn / 12;
    const n  = P.ciYears * 12;
    const fvPrincipal = P.ciPrincipal * Math.pow(1 + r, n);
    const fvContribs  = r > 0
      ? P.ciMonthly * (Math.pow(1 + r, n) - 1) / r
      : P.ciMonthly * n;
    const fv          = fvPrincipal + fvContribs;
    const contributed = P.ciPrincipal + P.ciMonthly * n;
    const growth      = fv - contributed;

    const xLabels = [];
    const balances = [];
    for (let y = 0; y <= P.ciYears; y++) {
      const nn = y * 12;
      const fvP = P.ciPrincipal * Math.pow(1 + r, nn);
      const fvC = r > 0 ? P.ciMonthly * (Math.pow(1 + r, nn) - 1) / r : P.ciMonthly * nn;
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
    { class: 'span-full', sub: t('Croissance de votre épargne au fil du temps — capital et versements tirés du dossier', 'Growth of your savings over time — capital and contributions from the file') },
    h('div', { class: 'grid cols-2', style: { marginBottom: '4px' } },
      slider({ label: t('Capital initial', 'Initial principal'), value: P.ciPrincipal, min: 0, max: 500000, step: 1000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('ciPrincipal', v); rebuild(); } }),
      slider({ label: t('Versement mensuel', 'Monthly contribution'), value: P.ciMonthly, min: 0, max: 5000, step: 50,
        format: v => money(v, { currency: cur }),
        onInput: v => { setP('ciMonthly', v); rebuild(); } }),
      slider({ label: t('Rendement annuel (hypothèse du dossier)', 'Annual return (file assumption)'), value: P.ciReturn, min: 0.01, max: 0.15, step: 0.005,
        format: v => pct(v),
        onInput: v => { setP('ciReturn', v); rebuild(); } }),
      slider({ label: t('Horizon (années)', 'Horizon (years)'), value: P.ciYears, min: 1, max: 40, step: 1,
        format: v => `${v} ${t('ans', 'yrs')}`,
        onInput: v => { setP('ciYears', v); rebuild(); } }),
    ),
    resultBox,
  );
}

// ---------------------------------------------------------------------------
// 2. Règle de 72 / Rule of 72
// ---------------------------------------------------------------------------
function rule72Calc(P, setP) {
  const resultBox = h('div');

  function rebuild() {
    const ratePct    = P.r72 * 100;
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
    slider({ label: t('Taux de rendement annuel', 'Annual return rate'), value: P.r72, min: 0.01, max: 0.20, step: 0.005,
      format: v => pct(v),
      onInput: v => { setP('r72', v); rebuild(); } }),
    resultBox,
  );
}

// ---------------------------------------------------------------------------
// 3. Capacité hypothécaire / Mortgage affordability
// ---------------------------------------------------------------------------
function mortgageAffordCalc(cur, P, setP, jur, lending) {
  const resultBox = h('div');
  const compounding = compoundingFor('mortgage', jur.country);
  const GDS = lending.gds, TDS = lending.tds;

  function rebuild() {
    const monthlyIncome = P.mgIncome / 12;
    const maxHousingGDS = monthlyIncome * GDS;
    const maxHousingTDS = monthlyIncome * TDS - P.mgDebts;
    const maxPayment    = Math.max(0, Math.min(maxHousingGDS, maxHousingTDS));

    // Qualifying (stress-test) rate from the jurisdiction, when it defines one
    const qualRate = lending.stressTestBuffer != null
      ? Math.max(P.mgRate + (lending.stressTestBuffer || 0), lending.stressTestFloor || 0)
      : P.mgRate;
    // Loan whose level payment at the qualifying rate equals the affordable payment (shared amortizer)
    const perDollar   = monthlyPayment(1, qualRate, P.mgYears, compounding);
    const maxMortgage = perDollar > 0 ? maxPayment / perDollar : 0;
    const maxHome     = maxMortgage + P.mgDown;
    const actualPayment = monthlyPayment(maxMortgage, P.mgRate, P.mgYears, compounding);

    const gdsRatio = monthlyIncome > 0 ? maxPayment / monthlyIncome : 0;
    const tdsRatio = monthlyIncome > 0 ? (maxPayment + P.mgDebts) / monthlyIncome : 0;
    const gdsOk    = gdsRatio <= GDS + 1e-9;
    const tdsOk    = tdsRatio <= TDS + 1e-9;
    const minDown  = lending.minDownPct != null ? maxHome * lending.minDownPct : 0;

    resultBox.replaceChildren(
      h('div', { class: 'grid cols-2', style: { marginTop: '10px' } },
        kpi({ label: t('Paiement mensuel max (au taux de qualification)', 'Max monthly payment (at qualifying rate)'), value: money(maxPayment, { currency: cur }), accent: 'var(--pos)', sub: t(`taux de qualification ${pct(qualRate, 2)}`, `qualifying rate ${pct(qualRate, 2)}`) }),
        kpi({ label: t('Montant hypothèque max', 'Max mortgage principal'), value: money(maxMortgage, { currency: cur, compact: true }), accent: 'var(--accent)', sub: t(`paiement réel ${money(actualPayment, { currency: cur })}/mois à ${pct(P.mgRate, 2)}`, `actual payment ${money(actualPayment, { currency: cur })}/mo at ${pct(P.mgRate, 2)}`) }),
        kpi({ label: t('Prix max de la propriété', 'Max home price'), value: money(maxHome, { currency: cur, compact: true }), accent: 'var(--pos)' }),
        kpi({ label: t('Mise de fonds', 'Down payment'), value: money(P.mgDown, { currency: cur, compact: true }), sub: pct(maxHome > 0 ? P.mgDown / maxHome : 0) + (minDown > 0 && P.mgDown < minDown ? ' — ' + t(`min. ${pct(lending.minDownPct, 0)}`, `min. ${pct(lending.minDownPct, 0)}`) : ''), accent: minDown > 0 && P.mgDown < minDown ? 'var(--warn)' : undefined }),
      ),
      statList([
        [t(`Ratio ABD (max ${pct(GDS, 0)})`, `GDS ratio (max ${pct(GDS, 0)})`), pct(gdsRatio), gdsOk ? 'pos' : 'neg'],
        [t(`Ratio ATD (max ${pct(TDS, 0)})`, `TDS ratio (max ${pct(TDS, 0)})`), pct(tdsRatio), tdsOk ? 'pos' : 'neg'],
        [t('Dettes mensuelles existantes', 'Existing monthly debts'), money(P.mgDebts, { currency: cur })],
        [t('Amortissement', 'Amortization'), `${P.mgYears} ${t('ans', 'yrs')}`],
        [t('Capitalisation', 'Compounding'), compounding === 'semi-annual' ? t('semestrielle (hypothèque canadienne)', 'semi-annual (Canadian mortgage)') : t('mensuelle', 'monthly')],
      ]),
    );
  }

  rebuild();

  return card(
    t('Capacité hypothécaire', 'Mortgage affordability'),
    { class: 'span-full', sub: t(`Calcul ABD / ATD — ratios ${pct(GDS, 0)} / ${pct(TDS, 0)} de la juridiction; revenu, dettes et taux tirés du dossier`, `GDS / TDS calculation — jurisdiction ratios ${pct(GDS, 0)} / ${pct(TDS, 0)}; income, debts and rate from the file`) },
    h('div', { class: 'grid cols-2', style: { marginBottom: '4px' } },
      slider({ label: t('Revenu brut annuel', 'Gross annual income'), value: P.mgIncome, min: 30000, max: 500000, step: 1000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('mgIncome', v); rebuild(); } }),
      slider({ label: t('Dettes mensuelles existantes', 'Existing monthly debts'), value: P.mgDebts, min: 0, max: 5000, step: 50,
        format: v => money(v, { currency: cur }),
        onInput: v => { setP('mgDebts', v); rebuild(); } }),
      slider({ label: t('Taux hypothécaire', 'Mortgage rate'), value: P.mgRate, min: 0.01, max: 0.12, step: 0.0025,
        format: v => pct(v, 2),
        onInput: v => { setP('mgRate', v); rebuild(); } }),
      slider({ label: t('Amortissement', 'Amortization'), value: P.mgYears, min: 5, max: 30, step: 5,
        format: v => `${v} ${t('ans', 'yrs')}`,
        onInput: v => { setP('mgYears', v); rebuild(); } }),
      slider({ label: t('Mise de fonds', 'Down payment'), value: P.mgDown, min: 0, max: 300000, step: 5000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('mgDown', v); rebuild(); } }),
    ),
    resultBox,
  );
}

// ---------------------------------------------------------------------------
// 4. REER vs CELI rapide / RRSP vs TFSA quick
// ---------------------------------------------------------------------------
function rrspTfsaCalc(cur, P, setP, jur, capGainsMarginal) {
  const resultBox = h('div');

  function rebuild() {
    const g = Math.pow(1 + P.rtReturn, P.rtYears);
    // RRSP: the gross contribution grows sheltered, the whole withdrawal is taxed at the retirement rate
    const rrspFV       = P.rtAmount * g;
    const rrspAfterTax = rrspFV * (1 - P.rtMarginalRet);
    // Refund reinvested in a taxable account: only its GROWTH is taxed, at the capital-gains marginal rate
    const refund       = P.rtAmount * P.rtMarginalNow;
    const refundGrowth = refund * (g - 1);
    const refundFV     = refund + refundGrowth * (1 - capGainsMarginal);
    const rrspTotal    = rrspAfterTax + refundFV;

    // TFSA: contribute after-tax, grows tax-free
    const afterTaxAmount = P.rtAmount * (1 - P.rtMarginalNow);
    const tfsaFV         = afterTaxAmount * g;

    const diff     = rrspTotal - tfsaFV;
    const rrspWins = diff > 0;

    const recommend = P.rtMarginalRet < P.rtMarginalNow
      ? t('REER recommandé — taux à la retraite plus bas', 'RRSP recommended — lower tax rate in retirement')
      : P.rtMarginalRet > P.rtMarginalNow
        ? t('CELI recommandé — taux à la retraite plus élevé', 'TFSA recommended — higher tax rate in retirement')
        : t('Équivalents à taux identiques (le remboursement réinvesti fait la différence)', 'Equivalent at identical rates (the reinvested refund makes the difference)');

    resultBox.replaceChildren(
      h('div', { class: 'grid cols-2', style: { marginTop: '10px' } },
        kpi({ label: t('REER — valeur nette', 'RRSP — after-tax value'), value: money(rrspTotal, { currency: cur, compact: true }), accent: rrspWins ? 'var(--pos)' : undefined }),
        kpi({ label: t('CELI — valeur nette', 'TFSA — after-tax value'), value: money(tfsaFV,   { currency: cur, compact: true }), accent: !rrspWins ? 'var(--pos)' : undefined }),
      ),
      statList([
        [t('Différence (REER − CELI)', 'Difference (RRSP − TFSA)'), money(Math.abs(diff), { currency: cur, compact: true }), rrspWins ? 'pos' : 'neg'],
        [t('REER après impôt au retrait', 'RRSP after withdrawal tax'), money(rrspAfterTax, { currency: cur, compact: true })],
        [t(`Remboursement réinvesti (croissance imposée à ${pct(capGainsMarginal, 1)})`, `Refund reinvested (growth taxed at ${pct(capGainsMarginal, 1)})`), money(refundFV, { currency: cur, compact: true }), 'pos'],
        [t('Recommandation', 'Recommendation'), recommend],
      ]),
    );
  }

  rebuild();

  return card(
    t('REER vs CELI rapide', 'RRSP vs TFSA quick'),
    { class: 'span-full', sub: t('Valeur après impôt selon le véhicule — taux marginaux actuel et à la retraite dérivés du dossier', 'After-tax value by account type — current and retirement marginal rates derived from the file') },
    h('div', { class: 'grid cols-2', style: { marginBottom: '4px' } },
      slider({ label: t('Montant cotisé (brut)', 'Contribution amount (gross)'), value: P.rtAmount, min: 1000, max: 100000, step: 1000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('rtAmount', v); rebuild(); } }),
      slider({ label: t('Taux marginal actuel (dossier)', 'Current marginal rate (file)'), value: P.rtMarginalNow, min: 0.15, max: 0.55, step: 0.01,
        format: v => pct(v),
        onInput: v => { setP('rtMarginalNow', v); rebuild(); } }),
      slider({ label: t('Taux marginal à la retraite (projection)', 'Retirement marginal rate (projection)'), value: P.rtMarginalRet, min: 0.10, max: 0.55, step: 0.01,
        format: v => pct(v),
        onInput: v => { setP('rtMarginalRet', v); rebuild(); } }),
      slider({ label: t('Rendement annuel (hypothèse du dossier)', 'Annual return (file assumption)'), value: P.rtReturn, min: 0.01, max: 0.12, step: 0.005,
        format: v => pct(v),
        onInput: v => { setP('rtReturn', v); rebuild(); } }),
      slider({ label: t('Horizon (années)', 'Horizon (years)'), value: P.rtYears, min: 1, max: 40, step: 1,
        format: v => `${v} ${t('ans', 'yrs')}`,
        onInput: v => { setP('rtYears', v); rebuild(); } }),
    ),
    resultBox,
  );
}

// ---------------------------------------------------------------------------
// 5. Valeur actuelle / future — PV ↔ FV toggle
// ---------------------------------------------------------------------------
function pvFvCalc(cur, P, setP) {
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
      result = P.pvAmount * Math.pow(1 + P.pvRate, P.pvYears);
      label  = t('Valeur future', 'Future value');
      sub    = t('du montant actuel', 'of present amount');
    } else {
      result = P.pvAmount / Math.pow(1 + P.pvRate, P.pvYears);
      label  = t('Valeur actuelle', 'Present value');
      sub    = t('du montant futur', 'of future amount');
    }

    resultBox.replaceChildren(
      h('div', { class: 'grid cols-2', style: { marginTop: '10px' } },
        kpi({ label: mode === 'FV' ? t('Montant de départ (VA)', 'Starting amount (PV)') : t('Montant cible (VF)', 'Target amount (FV)'),
          value: money(P.pvAmount, { currency: cur, compact: true }) }),
        kpi({ label, value: money(result, { currency: cur, compact: true }), accent: 'var(--pos)', sub }),
      ),
      statList([
        [t('Facteur', 'Factor'), num(Math.pow(1 + P.pvRate, P.pvYears), 3) + 'x'],
        [t('Gain / Actualisation', 'Gain / Discount'), money(Math.abs(result - P.pvAmount), { currency: cur, compact: true }), result > P.pvAmount ? 'pos' : 'neg'],
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
      slider({ label: t('Montant', 'Amount'),
        value: P.pvAmount, min: 1000, max: 1000000, step: 1000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('pvAmount', v); rebuild(); } }),
      slider({ label: t('Taux annuel', 'Annual rate'), value: P.pvRate, min: 0.005, max: 0.15, step: 0.005,
        format: v => pct(v),
        onInput: v => { setP('pvRate', v); rebuild(); } }),
      slider({ label: t('Horizon (années)', 'Horizon (years)'), value: P.pvYears, min: 1, max: 40, step: 1,
        format: v => `${v} ${t('ans', 'yrs')}`,
        onInput: v => { setP('pvYears', v); rebuild(); } }),
    ),
    resultBox,
  );
}

// ---------------------------------------------------------------------------
// 6. Coût d'opportunité / Purchase opportunity cost
// ---------------------------------------------------------------------------
function opportunityCostCalc(cur, P, setP) {
  const resultBox = h('div');

  function rebuild() {
    const fv         = P.ocPurchase * Math.pow(1 + P.ocReturn, P.ocYears);
    const costOfBuy  = fv - P.ocPurchase;

    const xLabels = [];
    const values  = [];
    for (let y = 0; y <= P.ocYears; y++) {
      xLabels.push(String(y));
      values.push(Math.round(P.ocPurchase * Math.pow(1 + P.ocReturn, y)));
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
      slider({ label: t('Montant de l’achat', 'Purchase amount'), value: P.ocPurchase, min: 100, max: 100000, step: 100,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('ocPurchase', v); rebuild(); } }),
      slider({ label: t('Rendement annuel (hypothèse du dossier)', 'Annual return (file assumption)'), value: P.ocReturn, min: 0.01, max: 0.15, step: 0.005,
        format: v => pct(v),
        onInput: v => { setP('ocReturn', v); rebuild(); } }),
      slider({ label: t('Horizon (années)', 'Horizon (years)'), value: P.ocYears, min: 1, max: 40, step: 1,
        format: v => `${v} ${t('ans', 'yrs')}`,
        onInput: v => { setP('ocYears', v); rebuild(); } }),
    ),
    resultBox,
  );
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------
export function render({ store, client, jur, navigate }) {
  store = store || appStore;
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const prim = F.primary || { marginal: { ordinary: 0.4, capgains: 0.2 } };
  let retMarginal = prim.marginal.ordinary * 0.75;
  try { const R = retirementFacts(client, jur); if (Number.isFinite(R.marginalRate) && R.marginalRate > 0) retMarginal = R.marginalRate; } catch (e) { /* projection unavailable → keep fallback */ }
  // GDS/TDS & stress test from the jurisdiction (Canadian ratios when the jurisdiction has none)
  const lending = jur.lending || JURISDICTIONS.CA.lending;
  const ret = F.assumptions.preReturn;
  const r4 = (v) => Math.round(v * 10000) / 10000;

  const P = whatIf(client, 'toolbox', {
    ciPrincipal: Math.round(Math.min(500000, F.cash)) || 10000, ciMonthly: Math.round(Math.min(5000, F.household.contributions / 12) / 50) * 50 || 500, ciReturn: r4(ret), ciYears: 20,
    r72: r4(ret),
    mgIncome: Math.round(F.household.grossIncome) || 120000, mgDebts: Math.round(F.monthlyDebtService - (F.mortgage ? F.mortgage.payment : 0)) || 0,
    mgRate: F.mortgage ? r4(F.mortgage.rate) : (lending.stressTestFloor || 0.055), mgYears: 25,
    mgDown: Math.round(Math.min(300000, F.cash + F.buckets.taxfree)) || 60000,
    rtAmount: 10000, rtMarginalNow: r4(prim.marginal.ordinary), rtMarginalRet: r4(retMarginal), rtReturn: r4(ret), rtYears: Math.max(1, prim.yearsToRetirement || 20),
    pvAmount: 100000, pvRate: r4(ret), pvYears: 10,
    ocPurchase: 5000, ocReturn: r4(ret), ocYears: 10,
  });
  const setP = (k, v) => { P[k] = v; saveWhatIf(store, 'toolbox', { [k]: v }); };

  return h('div', { class: 'grid' },
    h('div', { class: 'span-full' }, compoundInterestCalc(cur, P, setP)),
    h('div', { class: 'grid cols-2 span-full' },
      rule72Calc(P, setP),
      pvFvCalc(cur, P, setP),
    ),
    h('div', { class: 'span-full' }, mortgageAffordCalc(cur, P, setP, jur, lending)),
    h('div', { class: 'span-full' }, rrspTfsaCalc(cur, P, setP, jur, prim.marginal.capgains)),
    h('div', { class: 'span-full' }, opportunityCostCalc(cur, P, setP)),
  );
}
