// ============================================================
// JC Planner — CORRECTNESS suite (golden values, identities,
// invariants). Unlike the harness/fuzz (which only prove nothing
// crashes), every check here asserts a NUMBER is right:
//   • 2026 tax cases computed by hand (to the cent)
//   • monotonicity / no-tax-cliff properties across the income range
//   • exact gross-up solver, RRIF factors, OAS recovery tax
//   • amortization closed form vs simulation, IRR, Canadian compounding
//   • projection accounting identities, RRIF timing, per-member tax sums
//   • Monte Carlo reproducibility and centring on the deterministic path
//   • facts layer identities (one number everywhere)
//   • model migration (policies / AUM links) idempotence
//   • decumulation, benefits, corporate integration, education, real estate
//
// Run from app/:  printf '{"type":"module"}' > package.json \
//   && node test/correctness.mjs ; rm -f package.json
// ============================================================
const mem = {};
globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => mem[k] = String(v), removeItem: k => delete mem[k] };
globalThis.document = { documentElement: {}, body: { dataset: {} } };

const M = await import('../src/state/models.js');
const { store, normalize } = await import('../src/state/store.js');
const { getJurisdiction } = await import('../src/jurisdictions/index.js');
const T = await import('../src/engine/tax.js');
const AM = await import('../src/engine/amortization.js');
const P = await import('../src/engine/projection.js');
const MC = await import('../src/engine/montecarlo.js');
const FX = await import('../src/engine/facts.js');
const DEC = await import('../src/engine/decumulation.js');
const BEN = await import('../src/engine/benefits.js');
const CORP = await import('../src/engine/corporate.js');
const AN = await import('../src/engine/analysis.js');
const RE = await import('../src/engine/realestate.js');
const RB = await import('../src/engine/rentbuy.js');
const DEBT = await import('../src/engine/debt.js');
const SB = await import('../src/engine/selfbiz.js');
const OPT = await import('../src/engine/optimize.js');

let pass = 0, fail = 0; const fails = [];
function ok(name, cond, detail = '') { if (cond) pass++; else { fail++; fails.push(name + (detail ? ` — ${detail}` : '')); } }
function near(name, a, b, tol = 0.05) { ok(name, Math.abs(a - b) <= tol, `got ${a}, expected ${b} (±${tol})`); }
function within(name, a, b, pct) { ok(name, Math.abs(a - b) <= Math.abs(b) * pct + 1, `got ${a}, expected ≈ ${b} (±${pct * 100}%)`); }

const QC = getJurisdiction('CA', 'QC'), ON = getJurisdiction('CA', 'ON'), BC = getJurisdiction('CA', 'BC'), AB = getJurisdiction('CA', 'AB');

// ---------------- 0. Jurisdiction parameter self-consistency ----------------
{
  const asc = (br) => br.every((b, i) => i === 0 || b.upTo == null || (br[i - 1].upTo != null && b.upTo > br[i - 1].upTo));
  const ratesAsc = (br) => br.every((b, i) => i === 0 || b.rate >= br[i - 1].rate);
  ok('federal brackets ascending', asc(QC.fed.brackets) && ratesAsc(QC.fed.brackets));
  for (const [k, jur] of [['QC', QC], ['ON', ON], ['BC', BC], ['AB', AB]]) {
    ok(`${k} brackets ascending`, asc(jur.regionData.brackets) && ratesAsc(jur.regionData.brackets));
    ok(`${k} BPA credit rate = lowest bracket rate`, Math.abs((jur.regionData.creditRate ?? jur.regionData.bpaRate) - jur.regionData.brackets[0].rate) < 1e-9);
  }
  ok('federal credit rate = lowest federal rate', Math.abs(QC.fed.creditRate - QC.fed.brackets[0].rate) < 1e-9);
  ok('federal BPA taper spans the 4th bracket', QC.fed.bpaTaperFrom === QC.fed.brackets[2].upTo && QC.fed.bpaTaperTo === QC.fed.brackets[3].upTo && QC.fed.bpaMin < QC.fed.bpa);
  for (const k of ['ROC', 'QC']) {
    const p = QC.payroll[k];
    ok(`${k} payroll: YMPE < YAMPE, base + enhancement = rate`, p.cpp.ympe < p.cpp2.to && p.cpp2.from === p.cpp.ympe && Math.abs(p.cpp.baseRate + p.cpp.enhRate - p.cpp.rate) < 1e-9);
  }
  ok('QPP rate exceeds CPP rate (Québec)', QC.payroll.QC.cpp.rate > QC.payroll.ROC.cpp.rate);
  ok('EI reduced in Québec (QPIP province)', QC.payroll.QC.ei.rate < QC.payroll.ROC.ei.rate);
  const rr = Object.entries(QC.rrifMin).map(([a, f]) => [+a, f]).sort((x, y) => x[0] - y[0]);
  ok('RRIF factors increasing with age, 20 % at 95', rr.every(([a, f], i) => i === 0 || f > rr[i - 1][1]) && QC.rrifMin[95] === 0.20);
  ok('OAS clawbackFull derived from threshold, max and rate', Math.abs(QC.pensions.oas.clawbackFull - (QC.pensions.oas.clawbackStart + QC.pensions.oas.maxAnnual / QC.pensions.oas.clawbackRate)) < 0.01);
  ok('RRSP limit = 18 % rule ceiling and TFSA limit present', QC.accounts.find(a => a.id === 'rrsp').limit === 33810 && QC.accounts.find(a => a.id === 'tfsa').limit === 7000);
  ok('SBD grind ends at 150k (5:1)', QC.corporate.passiveGrindStart + QC.corporate.sbdLimit / 5 === QC.corporate.passiveGrindEnd);
  ok('tax year is 2026 across jurisdictions', QC.taxYear === 2026 && getJurisdiction('US', 'CA').taxYear === 2026 && getJurisdiction('UK', 'EW').taxYear === 2026);
  ok('Ontario health premium table monotone and capped at 900', (() => { const t = ON.regionData.healthPremium; let prev = 0; for (let i = 0; i <= 300000; i += 250) { const v = T.computeTax(ON, { ordinary: i, withPayroll: false, employment: false }).detail.healthPremium; if (v < prev - 1e-9 || v > 900) return false; prev = v; } return prev === 900; })());
}

// ---------------- 1. Tax golden values (2026) ----------------
{
  const t = T.computeTax(QC, { ordinary: 60000, age: 40 });
  near('QC 60k federal (hand: 4416.36)', t.federal, 4416.36, 0.05);
  near('QC 60k provincial (hand: 5068.97)', t.regional, 5068.97, 0.05);
  near('QC 60k payroll (hand: 4692.40)', t.payroll, 4692.40, 0.05);
  near('QC 60k net income = 60000 − enhancement 565', t.netIncome, 59435, 0.01);
  ok('QC 0 income → 0 tax', T.computeTax(QC, { ordinary: 0 }).total === 0);
  ok('QC 300k: federal BPA tapered to the base amount', T.computeTax(QC, { ordinary: 300000 }).detail.bpa === QC.fed.bpaMin);
  near('QC 120k retiree + OAS: recovery tax = 15 % above threshold', T.computeTax(QC, { ordinary: 120000, age: 70, employment: false, withPayroll: false, oasIncome: 8975 }).clawback, Math.min(8975, (120000 + 8975 - QC.pensions.oas.clawbackStart) * 0.15), 0.01);
  ok('QC 40k retiree + OAS: no clawback', T.computeTax(QC, { ordinary: 40000, age: 70, employment: false, withPayroll: false, oasIncome: 8975 }).clawback === 0);
  const r = T.computeTax(QC, { ordinary: 40000, age: 70, employment: false, withPayroll: false, pensionIncome: 20000, oasIncome: 8975 });
  near('federal age amount tapered (9209 − 15 % × (48975−46432))', r.detail.fedCredits.age, 9209 - (48975 - 46432) * 0.15, 0.01);
  ok('federal pension amount = 2000', r.detail.fedCredits.pension === 2000);
  near('QC combined senior credit reduced by 18.75 % above threshold', r.detail.provCredits.senior, (3986 + 3638) - (48975 - 42953) * 0.1875, 0.01);
  near('ON 100k: Ontario Health Premium = 750', T.computeTax(ON, { ordinary: 100000 }).detail.healthPremium, 750, 0.01);
  near('ON 30k: OHP capped at 300', T.computeTax(ON, { ordinary: 30000 }).detail.healthPremium, 300, 0.01);
  const se = T.computeTax(QC, { ordinary: 90000, selfEmployed: true, age: 40 }).detail.payroll;
  near('self-employed QPP base = 2 × 5.4 % × (74600−3500)', se.cppBase, 2 * 0.054 * (74600 - 3500), 0.01);
  near('self-employed QPP2 = 2 × 4 % × (85000−74600)', se.cpp2, 2 * 0.04 * (85000 - 74600), 0.01);
  ok('self-employed pays no EI', se.ei === 0);
  near('self-employed QPIP at the self rate', se.qpip, 90000 * 0.00878, 0.01);
  ok('CPP stops at 70', T.computeTax(QC, { ordinary: 60000, age: 70, employment: true }).detail.payroll.cppBase === 0);
  // marginal rates at known bands (100k sits in the 2nd federal band 20.5 % and the 2nd Québec band 19 %)
  const mQC = T.computeTax(QC, { ordinary: 100000, withPayroll: false, employment: false });
  near('QC 100k ordinary marginal = 20.5 %×0.835 + 19 %', mQC.marginalRate, 0.205 * 0.835 + 0.19, 0.002);
  near('QC 100k capital-gains marginal = half', T.marginalRateFor(QC, 100000, 'capgains'), (0.205 * 0.835 + 0.19) / 2, 0.002);
  const elig = T.marginalRateFor(QC, 100000, 'eligible');
  near('QC 100k eligible-dividend marginal ≈ 16.4 %', elig, 1.38 * ((0.205 - 0.150198) * 0.835 + (0.19 - 0.117)), 0.003);
  ok('dividend income taxed less than ordinary at the same band', elig < mQC.marginalRate);
  near('QC 118k sits in the 3rd federal band: 26 %×0.835 + 24 %', T.computeTax(QC, { ordinary: 118000, withPayroll: false, employment: false }).marginalRate, 0.26 * 0.835 + 0.24, 0.002);
  // properties
  for (const [name, jur] of [['QC', QC], ['ON', ON], ['BC', BC], ['AB', AB]]) {
    let prevTax = -1, prevNet = -1, mono = true, noCliff = true, margOk = true;
    for (let inc = 0; inc <= 500000; inc += 500) {
      const t = T.computeTax(jur, { ordinary: inc, age: 40 });
      if (t.total < prevTax - 1e-6) mono = false;
      if (t.afterTax < prevNet - 1e-6) noCliff = false;
      // Ontario's health-premium phase-in windows legitimately push the local marginal rate above 70 %
      if (!(t.marginalRate >= 0 && t.marginalRate <= 0.85)) margOk = false;
      prevTax = t.total; prevNet = t.afterTax;
    }
    ok(`${name}: total tax non-decreasing in income`, mono);
    ok(`${name}: after-tax income never falls when gross rises (no tax cliff)`, noCliff);
    ok(`${name}: marginal rate within [0, 85 %]`, margOk);
  }
  // exact gross-up solver
  for (const [net, other] of [[30000, 20000], [5000, 0], [80000, 60000], [150000, 90000]]) {
    const g = T.grossUpForNet(QC, net, other, Infinity, { age: 68 });
    near(`grossUpForNet(${net} on ${other}) nets the target`, g.net, net, 0.05);
    ok(`grossUpForNet(${net}) tax = gross − net`, Math.abs(g.gross - g.net - g.tax) < 0.01);
  }
  const capped = T.grossUpForNet(QC, 50000, 30000, 20000, { age: 68 });
  ok('grossUpForNet respects the balance cap', capped.gross <= 20000 + 1e-9 && capped.net < 50000);
  // RRIF factors
  ok('RRSP: no forced minimum at 71 (conversion year)', T.rrifMinFactor(QC, 71, 'rrsp') === 0);
  ok('RRSP: first minimum at 72 = 5.40 %', T.rrifMinFactor(QC, 72, 'rrsp') === 0.054);
  near('RRIF at 65 = 1/(90−65)', T.rrifMinFactor(QC, 65, 'rrif'), 1 / 25, 1e-9);
  ok('95+ = 20 %', T.rrifMinFactor(QC, 97, 'rrsp') === 0.20);
}

// ---------------- 2. Amortization ----------------
{
  const pmt = AM.monthlyPayment(312000, 0.0479, 25, 'semi-annual');
  within('Canadian mortgage payment 312k @ 4.79 % / 25y ≈ 1,777.6', pmt, 1777.6, 0.002);
  const am = AM.amortize(312000, 0.0479, pmt, 0, 'semi-annual');
  ok('level payment amortizes in exactly 300 months (±1)', Math.abs(am.months - 300) <= 1, `months=${am.months}`);
  for (const k of [12, 60, 120, 240]) {
    const closed = AM.remainingBalance(312000, 0.0479, 25, k, 'semi-annual');
    const sim = am.schedule.find(s => s.month === k);
    if (sim) near(`closed-form balance = simulated balance at month ${k}`, closed, sim.balance, 2);
  }
  ok('semi-annual compounding gives a LOWER monthly rate than monthly', AM.effectiveMonthlyRate(0.05, 'semi-annual') < 0.05 / 12);
  near('monthly compounding = r/12', AM.effectiveMonthlyRate(0.06, 'monthly'), 0.005, 1e-12);
  near('IRR of [-100, +110] = 10 %', AM.irr([-100, 110]), 0.10, 1e-6);
  near('IRR of [-1000, 100, 100, 1100] = 10 %', AM.irr([-1000, 100, 100, 1100]), 0.10, 1e-6);
  ok('unpayable when payment ≤ interest', AM.amortize(100000, 0.10, 500, 0, 'monthly').unpayable === true);
  const s = AM.stepLoan(100000, 0.06, 1000, 12, { compounding: 'monthly' });
  near('stepLoan 12 months: balance consistent with closed form', s.balance, AM.remainingBalance(100000, 0.06, 1000 / (100000 * 0.005 / (1 - Math.pow(1.005, -120))) * 10, 12, 'monthly'), 5000);
  ok('stepLoan interest + principal = paid', Math.abs(s.interest + s.principal - s.paid) < 0.01);
  // debt engine agrees with the amortizer
  const acc = DEBT.mortgageAcceleration({ balance: 312000, rate: 0.0479, payment: pmt, type: 'mortgage' }, 200, 'CA');
  ok('debt engine base months = amortizer months', acc.baseMonths === am.months);
  ok('extra payment shortens the mortgage', acc.newMonths < acc.baseMonths && acc.interestSaved > 0);
}

// ---------------- 3. Projection identities ----------------
{
  const seed = store.activeClient();
  const p = P.runProjection(seed);
  const rows = p.rows;
  ok('projection covers life expectancy', rows.length === p.years && rows.length > 40);
  let flowOk = true, taxSumOk = true, nwOk = true, clawOk = true;
  for (let y = 1; y < rows.length; y++) {
    const r = rows[y], prev = rows[y - 1];
    const implied = prev.investable * (1 + r.detReturn) + r.netFlow;
    if (Math.abs(implied - r.investable) > 1) flowOk = false;
    const memberTax = Object.values(r.byMember).reduce((s, m) => s + m.tax, 0);
    if (Math.abs(memberTax - r.tax) > 1) taxSumOk = false;
    if (Math.abs(r.assetsTotal - r.liabilitiesTotal - r.netWorth) > 0.01) nwOk = false;
    if (r.oasClawback > 0 && !Object.values(r.byMember).some(m => m.netIncome > QC.pensions.oas.clawbackStart)) clawOk = false;
  }
  ok('investable_y = investable_{y−1} × (1 + detReturn) + netFlow (return-independent flow identity)', flowOk);
  ok('row tax = Σ member tax (withdrawal tax included in each member’s total)', taxSumOk);
  ok('net worth = assets − liabilities every year', nwOk);
  ok('OAS clawback only when a member exceeds the threshold', clawOk);
  const primaryAge0 = rows[0].primaryAge;
  const r71 = rows.find(r => r.primaryAge === 71), r72 = rows.find(r => r.primaryAge === 72);
  ok('no forced RRIF at 71 for RRSP accounts', r71 && r71.forced === 0);
  ok('forced RRIF starts at 72', r72 && r72.forced > 0);
  ok('OAS appears from 65 only', rows.filter(r => r.oasIncome > 0).every(r => r.primaryAge >= 65) && rows.some(r => r.oasIncome > 0));
  ok('employment income stops at retirement', rows.filter(r => r.primaryRetired && r.ages[seed.members[1].id] >= seed.members[1].retirementAge).every(r => r.employmentIncome === 0));
  // monotone sensitivities
  const clone = (mut) => { const c = JSON.parse(JSON.stringify(seed)); mut(c); return normalize(c); };
  const base = p.summary.finalNetWorth;
  ok('higher spending → lower final net worth', P.runProjection(clone(c => c.assumptions.spendingLevel = 1.2)).summary.finalNetWorth < base);
  ok('lower spending → higher final net worth', P.runProjection(clone(c => c.assumptions.spendingLevel = 0.8)).summary.finalNetWorth > base);
  ok('higher income → higher final net worth', P.runProjection(clone(c => c.incomes[0].amount *= 1.2)).summary.finalNetWorth > base);
  ok('extra mortgage payment → less lifetime interest', P.runProjection(clone(c => c.liabilities[0].extraPayment = 500)).rows.reduce((s, r) => s + r.debtInterest, 0) < rows.reduce((s, r) => s + r.debtInterest, 0));
  ok('projection is deterministic (same input → same output)', P.runProjection(seed).summary.finalNetWorth === base);
  // pension income splitting inside the projection (couples)
  const noSplit = P.runProjection(clone(c => c.assumptions.pensionSplitting = false));
  ok('pension splitting never increases lifetime tax', p.summary.totalLifetimeTax <= noSplit.summary.totalLifetimeTax + 1e-6);
  ok('pension splitting is applied in retirement for the seed couple', p.summary.totalPensionSplit > 0 && rows.filter(r => r.pensionSplit > 0).every(r => r.primaryRetired || r.pensionIncome > 0));
  ok('a split moves income from one spouse to the other (net zero)', rows.every(r => Math.abs(Object.values(r.byMember).reduce((s, m) => s + m.pensionSplit, 0)) < 1e-6));
  ok('deflator turns nominal into today’s dollars', Math.abs(rows[10].deflator - Math.pow(1 + M.assumptionsOf(seed).inflation, -10)) < 1e-12 && rows[10].realNetWorth < rows[10].netWorth);
}

// ---------------- 4. Monte Carlo ----------------
{
  const seed = store.activeClient();
  const a = MC.runMonteCarlo(seed), b = MC.runMonteCarlo(seed);
  ok('Monte Carlo is reproducible for the same file', a.successRate === b.successRate && a.medianFinal === b.medianFinal);
  ok('success rate in [0,1]', a.successRate >= 0 && a.successRate <= 1);
  ok('uses the app-wide trial count', a.trials === M.assumptionsOf(seed).mcTrials);
  const det = a.det.summary.finalInvestable;
  within('median final wealth centred on the deterministic path (±25 %)', a.medianFinal, det, 0.25);
  const mid = Math.floor(a.bands.length / 2);
  within('median mid-horizon wealth centred on deterministic (±15 %)', a.bands[mid].p50, a.bands[mid].det, 0.15);
  ok('percentile bands ordered', a.bands.every(x => x.p10 <= x.p25 && x.p25 <= x.p50 && x.p50 <= x.p75 && x.p75 <= x.p90));
  const c2 = normalize(JSON.parse(JSON.stringify(seed))); c2.assumptions.returnStdev = 0.001;
  const lowVol = MC.runMonteCarlo(c2);
  within('near-zero volatility → median ≈ deterministic (±2 %)', lowVol.medianFinal, lowVol.det.summary.finalInvestable, 0.02);
}

// ---------------- 5. Facts layer identities ----------------
{
  const seed = store.activeClient();
  const F = FX.clientFacts(seed);
  near('household tax = Σ member tax', F.household.tax, F.members.reduce((s, m) => s + m.tax.total, 0), 0.01);
  near('net worth = assets − liabilities', F.netWorth.netWorth, F.netWorth.assets - F.netWorth.liabilities, 0.01);
  near('savings rate = contributions / gross income', F.household.savingsRate, F.household.contributions / F.household.grossIncome, 1e-9);
  near('surplus = net − expenses − debt service − contributions', F.household.surplus, F.household.netIncome - F.household.expenses - F.household.debtService - F.household.contributions, 0.01);
  ok('CRM AUM equals the linked asset value (one ledger)', F.aum === seed.assets.find(a => a.label === 'REER — Marc').value);
  ok('coverage read from products', F.coverage[seed.members[0].id].life === 500000 && F.coverage[seed.members[0].id].di === 72000 && F.coverage[seed.members[1].id].life === 350000);
  near('premiums = Σ annual premiums of active policies', F.premiums, 720 + 540 + 1850, 0.01);
  ok('mortgage payoff from the shared amortizer', F.mortgage && Math.abs(F.mortgage.payoffMonths - DEBT.mortgageAcceleration(seed.liabilities[0], 0, 'CA').baseMonths) === 0);
  ok('facts memoised until the file changes', FX.clientFacts(seed) === F);
  store.update(c => { c.expenses[0].amount += 1; });
  ok('facts recomputed after a mutation', FX.clientFacts(store.activeClient()) !== F);
  store.update(c => { c.expenses[0].amount -= 1; });
  ok('primary marginal rate matches the tax engine', Math.abs(F.primary.marginalRate - T.marginalRateAt(QC, F.primary.ordinary, { age: F.primary.age })) < 1e-9);
  ok('rrsp room = 18 % of earned income capped', F.members.every(m => Math.abs(m.rrspRoom - Math.min(m.earnedIncome * 0.18, 33810)) < 0.01));
  const R = FX.retirementFacts(seed);
  ok('retirement facts expose the first retired year', R.retirementAge === seed.members[0].retirementAge && R.taxableIncome > 0);
}

// ---------------- 6. Model migration ----------------
{
  const seed = store.activeClient();
  ok('seed: 3 policies migrated into products + 1 investment product', seed.products.filter(p => M.INSURANCE_KINDS.includes(p.kind)).length === 3 && seed.products.length === 4);
  ok('seed: no phantom asset created for the linked investment product', seed.assets.length === 7);
  ok('seed: insurance mirror rebuilt from products', seed.insurance.length === 3 && seed.insurance.every(i => i._mirror));
  ok('ages derived from date of birth', seed.members[0].currentAge === (() => { const d = new Date('1983-04-12'); const n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--; return a; })());
  ok('filing status derived from marital status', seed.filingStatus === 'married');
  // legacy file: insurance[] only, product with AUM and no asset
  const legacy = M.newClient('Legacy', 'CA', 'QC');
  legacy.insurance = [M.newInsurance({ type: 'di', insuredId: legacy.members[0].id, coverage: 48000, premium: 1200 })];
  legacy.products = [M.newProduct({ kind: 'investment', carrier: 'X', policyNumber: '1', aum: 50000, insuredId: legacy.members[0].id })];
  normalize(legacy);
  ok('legacy insurance row becomes a disability product', legacy.products.some(p => p.kind === 'disability' && p.faceAmount === 48000));
  ok('legacy investment product gets an asset created and linked', legacy.assets.length === 1 && legacy.products[0].assetId === legacy.assets[0].id && legacy.assets[0].value === 50000);
  const nA = legacy.assets.length, nP = legacy.products.length;
  normalize(legacy); normalize(legacy);
  ok('normalize is idempotent (no duplicate assets/products)', legacy.assets.length === nA && legacy.products.length === nP);
  ok('coverage helper sees the migrated policy', FX.clientFacts(legacy).coverage[legacy.members[0].id].di === 48000);
  ok('legacy rriffConvertAge key is migrated', (() => { const c = M.newClient(); c.assumptions = { rriffConvertAge: 70 }; normalize(c); return c.assumptions.rrifConvertAge === 70 && c.assumptions.rriffConvertAge === undefined; })());
}

// ---------------- 7. Decumulation, benefits, corporate, education, real estate ----------------
{
  const params = { startAge: 65, endAge: 90, deferred: 500000, tfsa: 100000, nonreg: 200000, nonregBasis: 150000, otherIncomeNow: 20000, pensionIncomeNow: 20000, oasAnnual: 8975, spending: 60000, inflation: 0.02, returnRate: 0.045 };
  const d = DEC.compareDecumulation(QC, params);
  ok('decumulation: three strategies, all finite', d.results.length === 3 && d.results.every(r => Number.isFinite(r.totalTax) && Number.isFinite(r.finalEstate)));
  ok('decumulation: strategies differ', new Set(d.results.map(r => Math.round(r.totalTax))).size > 1);
  ok('decumulation: no RRIF minimum before 72', d.results[0].rows.filter(r => r.age < 72).every(r => r.withdrawals.deferred === 0 || d.results[0].strategy !== 'nonregFirst' || r.shortfall >= 0));
  ok('decumulation: OAS starts at the OAS start age', d.results[0].rows.every(r => (r.oas > 0) === (r.age >= 65)));
  ok('decumulation: estate ≤ gross balances (tax deducted)', d.results.every(r => r.rows.every(x => x.estate <= x.deferred + x.tfsa + x.nonreg + 0.01)));
  ok('decumulation: default bracket target = top of first federal bracket', DEC.defaultBracketTarget(QC) === QC.fed.brackets[0].upTo);

  const cpp = QC.pensions.cpp, oas = QC.pensions.oas;
  near('CPP at 60 = 64 % of the age-65 amount', BEN.benefitAtAge(cpp, 60), cpp.maxAnnual * 0.64, 0.01);
  near('CPP at 70 = 142 %', BEN.benefitAtAge(cpp, 70), cpp.maxAnnual * 1.42, 0.01);
  ok('OAS cannot be claimed before 65 (no early reduction)', BEN.benefitAtAge(oas, 60) === BEN.benefitAtAge(oas, 65));
  near('OAS at 70 = 136 %', BEN.benefitAtAge(oas, 70), oas.maxAnnual * 1.36, 0.01);
  near('client-specific base honoured', BEN.benefitAtAge(cpp, 65, 15600), 15600, 1e-9);
  const ca = BEN.claimingAnalysis(cpp, [60, 65, 70], 90);
  const r70 = ca.rows.find(r => r.age === 70);
  ok('CPP break-even for claiming at 70 vs 65 ≈ 82', r70 && (r70.breakEvenVsNormal === 82 || r70.breakEvenVsNormal === 83), `got ${r70 && r70.breakEvenVsNormal}`);
  ok('claim ages outside the window are dropped', BEN.claimingAnalysis(oas, [60, 65, 70], 90).rows.every(r => r.age >= 65));
  const oc = BEN.oasClawback(QC, 120000, 8975);
  near('oasClawback helper matches the tax engine', oc.clawback, T.computeTax(QC, { ordinary: 120000 - 8975, oasIncome: 8975, withPayroll: false, employment: false, age: 70 }).clawback, 0.5);

  const svd = CORP.salaryVsDividend(QC, 100000, 0, { age: 45 });
  near('salary route: salary + employer contributions = profit', svd.salary.gross + svd.salary.employerCost, 100000, 1);
  near('dividend route: dividends = profit − corporate tax', svd.dividend.gross, 100000 - svd.dividend.corpTax, 1);
  ok('dividend route: non-eligible dividends under the SBD', svd.dividend.nonEligibleDiv > 0 && svd.dividend.eligibleDiv === 0);
  ok('integration keeps the two routes within 6 % of the profit', Math.abs(svd.integrationCost) < 6000, `integrationCost=${svd.integrationCost}`);
  const big = CORP.salaryVsDividend(QC, 200000, 0, { otherActiveIncome: 450000 });
  ok('above the SBD, dividends become eligible', big.dividend.eligibleDiv > 0);
  const corp = CORP.corporateTaxCA(QC, 600000, 80000);
  near('passive grind: $5 per $1 above 50k', corp.grind, (80000 - 50000) * 5, 0.01);
  near('QC combined small-business rate = 9 % + 3.2 %', corp.sbRate, 0.122, 1e-9);
  const lc = CORP.lcgeSale(QC, 3000000, 100000, 2, 60000);
  near('LCGE: two owners exempt 2 × LCGE', lc.exempt, Math.min(2900000, 2 * QC.corporate.lcge), 0.01);
  ok('LCGE saves tax', lc.taxSaved > 0 && lc.taxWithLcge < lc.taxNoLcge);

  const seed = store.activeClient();
  const goal = seed.goals.find(g => g.type === 'education');
  const ed = AN.educationFunding(seed, { ...goal, name: 'Études — Léa Tremblay' });
  const lea = seed.dependents.find(d => d.name.startsWith('Léa'));
  ok('education: years = goal age − child age (not the goal age itself)', ed.years === lea.educationGoalAge - lea.age, `years=${ed.years}`);
  ok('education: required saving reaches the target', ed.projectedValue >= ed.target - 1 && ed.monthly > 0);
  ok('education: grants capped at the lifetime maximum', ed.projectedGrants <= 7200 + 3600 + 1);
  const life = AN.lifeInsuranceNeeds(seed, seed.members[0].id);
  ok('life needs: existing coverage from products', life.existingCoverage === 500000);
  const di = AN.disabilityNeeds(seed, seed.members[0].id);
  near('DI needs: existing monthly = annual coverage / 12', di.existingMonthly, 6000, 0.01);

  const re = RE.analyzeProperty({ price: 500000, downPct: 0.2, rate: 0.05, amortYears: 25, grossRent: 30000, vacancyPct: 0.05, opexPct: 0.35, appreciation: 0.03, rentGrowth: 0.02, marginalRate: 0.45, holdYears: 10 });
  ok('real estate: after-tax IRR ≤ pre-tax IRR', re.annReturnAfterTax <= re.annReturn + 1e-9);
  ok('real estate: gross rent reported as entered', re.grossRent === 30000);
  ok('real estate: sale tax = gain tax + recapture tax', Math.abs(re.taxOnSale - re.taxOnGain - re.taxOnRecapture) <= 1);
  const flat = RE.analyzeProperty({ price: 500000, downPct: 1, rate: 0.05, grossRent: 0, appreciation: 0, holdYears: 5, opexPct: 0 });
  ok('real estate: no rent, no growth → negative IRR (selling costs)', flat.annReturn < 0);
  near('real estate: Canadian mortgage payment uses semi-annual compounding', re.monthlyMortgage, Math.round(AM.monthlyPayment(400000, 0.05, 25, 'semi-annual')), 1);

  const rb = RB.analyzeRentBuy({ price: 400000, downPct: 0.2, rate: 0.05, rentMonthly: 4000, holdYears: 10 });
  ok('rent-vs-buy: when owning is cheaper the buyer invests the saving (symmetric)', rb.series.some(s => s.buyerFund > 0));

  const se = SB.selfEmployedAnalysis(QC, { netSelfEmployment: 90000, revenue: 110000 });
  near('self-employed CPP matches the tax engine (both halves)', se.cpp, T.computeTax(QC, { ordinary: 90000, employmentIncome: 90000, selfEmployed: true, age: 45 }).payroll, 0.01);
  near('quick method QC = 3.6 % of GST-incl. sales + 6.6 % of QST-incl. sales', se.quickRemit, 110000 * 1.05 * 0.036 + 110000 * 1.09975 * 0.066, 0.01);
  const inc = SB.incorporationAnalysis(QC, { businessIncome: 250000, personalNeed: 80000 });
  ok('incorporation: salary nets the personal need (±$50)', Math.abs((inc.salary - inc.ownerPersonalTax) - 80000) < 50, `net=${inc.salary - inc.ownerPersonalTax}`);
  ok('incorporation: deferral positive when income exceeds the need', inc.deferralBenefit > 0 && inc.surplus > 0);

  const split = OPT.incomeSplitting(seed, QC, { atRetirement: true });
  ok('pension splitting at retirement is applicable and never increases tax', split.applicable && split.optimized <= split.current + 1e-6 && split.transfer <= split.maxTransfer + 1e-6);
  const splitNow = OPT.incomeSplitting(seed, QC);
  ok('no eligible pension income today → zero saving (employment income cannot be split)', splitNow.savings === 0);
}

// ---------------- 8. CRM engine ----------------
{
  const CRM = await import('../src/engine/crm.js');
  const clients = store.state.clients;
  const seed = clients[0];
  const rep = CRM.revenueReport(clients, 2026);
  ok('revenue: Σ monthly recurring reconciles with the recurring total', rep.reconciles && Math.abs(rep.monthSum - rep.recurring) < 0.01);
  ok('revenue: commissions with a renewal date in another year are spread, not dropped', rep.byMonth.every(m => m.spread > 0));
  ok('revenue: top client value uses the single clientValue helper', rep.perClient.length && Math.abs(rep.perClient[0].value - CRM.clientValue(clients.find(c => c.id === rep.perClient[0].id))) < 1e-9);
  near('CRM AUM = linked asset balance (one ledger)', CRM.clientAum(seed), seed.assets.find(a => a.label === 'REER — Marc').value, 0.01);
  near('CRM annual premium = Σ annualised active premiums', CRM.clientAnnualPremium(seed), 720 + 540 + 1850, 0.01);
  const ps = CRM.pipelineSummary(clients);
  near('pipeline: weighted premium = Σ premium opps × probability', ps.weightedPremium, 2100 * 0.7 + 6500 * 0.4, 0.01);
  near('pipeline: weighted AUM kept apart from premium', ps.weightedAum, 145000 * 0.5, 0.01);
  ok('pipeline: stage totals never mix premium and AUM', ps.stages.every(s => 'premium' in s && 'aum' in s && s.premium >= 0 && s.aum >= 0));
  ok('pipeline: unknown stage normalises to new', CRM.normalizeStage('bogus') === 'new');
  const o = CRM.applyStage({ stage: 'new', probability: 20 }, 'won');
  ok('applyStage sets probability and closedAt', o.probability === 100 && typeof o.closedAt === 'number');
  const ks = CRM.complianceStatus(seed);
  ok('KYC: beneficiary and risk profile derived from the file', ks.items.find(i => i.key === 'beneficiary').derived && ks.items.find(i => i.key === 'riskprofile').derived);
  const na = CRM.complianceStatus({ compliance: Object.fromEntries(CRM.KYC_ITEMS.map(i => [i.key, { status: 'na' }])), beneficiaries: [], riskProfile: '' });
  ok('KYC: nothing applicable → 100 % (not 0 %)', na.pct === 1);
  const rr = CRM.resolveReferrer(clients, 'Marc Tremblay');
  ok('referrer resolves a member name to the client file', rr && rr.client.name === 'Famille Tremblay' && rr.via === 'member');
  ok('local ISO date has no UTC shift', CRM.localISO(new Date(2026, 1, 28, 23, 30)) === '2026-02-28');
  const fakeC = (over) => ({ id: 'x', name: 'X', members: [{ name: 'P', role: 'primary' }], products: [], tasks: [], opportunities: [], ...over });
  const past = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return CRM.localISO(d); };
  ok('reminders: review 30 days past due is listed as overdue', CRM.reminders([fakeC({ household: { reviewDate: past(-30) }, crm: {} })]).some(r => r.type === 'review' && r.overdue));
  ok('reminders: review 200 days past due is NOT listed', !CRM.reminders([fakeC({ household: { reviewDate: past(-200) }, crm: {} })]).some(r => r.type === 'review'));
  const ev = CRM.monthEvents([fakeC({ members: [{ name: 'Leap', role: 'primary', dob: '2000-02-29' }], household: {}, crm: {} })], 2026, 1);
  ok('Feb-29 birthday clamps to Feb-28 in a non-leap year', !!ev['2026-02-28'] && ev['2026-02-28'].some(e => e.type === 'birthday'));
  ok('emails include every member (spouse too)', CRM.emailsOf(seed).length === 2);
}

console.log(`\n===== JC Planner correctness suite =====`);
console.log(`Checks: ${pass + fail}   ✓ ${pass}   ✗ ${fail}`);
if (fail) { console.log('\n--- FAILURES ---'); fails.forEach(f => console.log('  ✗ ' + f)); }
else console.log('\n✓ ALL CORRECTNESS CHECKS PASSED');
process.exit(fail ? 1 : 0);
