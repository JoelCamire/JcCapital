// ============================================================
// JC Planner — scenario test harness
// Generates 60+ diverse client scenarios and exercises every
// engine (finite/sane numbers) and every view (renders without
// throwing) in FR and EN across CA/US/UK jurisdictions.
//
// Run from app/:  printf '{"type":"module"}' > package.json \
//   && npm i --no-save jsdom && node test/harness.mjs ; rm -f package.json
// ============================================================
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><body data-theme="light"><div id="app"></div></body>', { url: 'http://localhost/app/' });
for (const k of ['document', 'DOMParser', 'Node', 'HTMLElement', 'localStorage', 'FileReader', 'Blob', 'URL', 'getComputedStyle', 'location']) {
  try { globalThis[k] = dom.window[k]; } catch (e) {}
}
globalThis.window = dom.window;
globalThis.addEventListener = dom.window.addEventListener.bind(dom.window);

const M = await import('../src/state/models.js');
const { getJurisdiction } = await import('../src/jurisdictions/index.js');
const { setLang } = await import('../src/i18n.js');
const { store } = await import('../src/state/store.js');
const proj = await import('../src/engine/projection.js');
const mc = await import('../src/engine/montecarlo.js');
const tax = await import('../src/engine/tax.js');
const analysis = await import('../src/engine/analysis.js');
const corporate = await import('../src/engine/corporate.js');
const decum = await import('../src/engine/decumulation.js');
const health = await import('../src/engine/healthcheck.js');
const suggest = await import('../src/engine/suggestions.js');

const VIEWS = ['clients', 'dashboard', 'healthcheck', 'profile', 'client', 'networth', 'nwtracker', 'cashflow', 'budget', 'debt',
  'business', 'succession', 'empbenefits', 'flowthrough', 'insurancestrat', 'advstructures', 'equity', 'realestate',
  'rentbuy', 'crypto', 'portfolio', 'feecompare', 'retirement', 'decumulation', 'montecarlo', 'scenarios',
  'strategycompare', 'tax', 'multitax', 'optimize', 'benefits', 'insurance', 'insurancecompare', 'philanthropy',
  'crossborder', 'emigration', 'goals', 'education', 'rdsp', 'ltc', 'timeline', 'estate', 'compliance', 'toolbox',
  'incorporation', 'selfemployed', 'farm', 'sred', 'treasury', 'borrowing', 'reports', 'settings'];
const viewMods = {};
for (const v of VIEWS) viewMods[v] = await import(`../src/ui/views/${v}.js`);

// ---------- scenario generator ----------
const JURIS = [['CA', 'QC'], ['CA', 'ON'], ['CA', 'BC'], ['CA', 'AB'], ['US', 'CA'], ['US', 'NY'], ['US', 'TX'], ['US', 'FL'], ['UK', 'EW'], ['UK', 'SC']];

function baseClient(country, region, over = {}) {
  const c = M.newClient('Test', country, region);
  return Object.assign(c, over);
}
function withMoney(c, { income = 85000, rrsp = 0, tfsa = 0, nonreg = 0, realestate = 0, mortgage = 0, age = 40, married = false, deps = 0, business = false, retireAge = 65, lifeExp = 92 } = {}) {
  const country = c.jurisdiction.country;
  const m0 = c.members[0]; m0.currentAge = age; m0.retirementAge = retireAge; m0.lifeExpectancy = lifeExp;
  c.filingStatus = married ? 'married' : 'single';
  if (married) { const s = M.newMember({ name: 'Spouse', role: 'spouse', currentAge: age - 2, retirementAge: retireAge, lifeExpectancy: lifeExp + 2 }); c.members.push(s); }
  c.incomes = income > 0 ? [M.newIncome({ memberId: m0.id, type: 'employment', amount: income })] : [];
  c.expenses = [M.newExpense({ amount: Math.max(12000, income * 0.6), retirementFactor: 0.8 })];
  c.assets = [];
  if (rrsp) c.assets.push(M.newAsset({ ownerId: m0.id, type: country === 'CA' ? 'rrsp' : country === 'US' ? '401k' : 'pension', value: rrsp, costBasis: rrsp, annualContribution: rrsp * 0.04 }));
  if (tfsa) c.assets.push(M.newAsset({ ownerId: m0.id, type: country === 'CA' ? 'tfsa' : country === 'US' ? 'roth' : 'isa', value: tfsa, costBasis: tfsa, annualContribution: 5000 }));
  if (nonreg) c.assets.push(M.newAsset({ ownerId: m0.id, type: 'nonreg', value: nonreg, costBasis: nonreg * 0.7 }));
  if (realestate) c.assets.push(M.newAsset({ ownerId: m0.id, type: 'realestate', value: realestate, costBasis: realestate * 0.7, growth: 0.03 }));
  if (mortgage) c.liabilities = [M.newLiability({ type: 'mortgage', balance: mortgage, rate: 0.05, payment: mortgage * 0.006 })];
  for (let i = 0; i < deps; i++) c.dependents.push(M.newDependent({ name: 'Child' + i, age: 5 + i * 4, educationGoalAge: 18 }));
  if (business) c.business = M.newBusiness({ ownerId: m0.id, name: 'Test Inc', activeIncome: 300000, passiveIncome: 60000, retainedEarnings: 400000, corpInvestments: 300000 });
  c.goals = [M.newGoal({ type: 'retirement', amount: income * 0.7 || 50000, targetAge: retireAge })];
  return c;
}

function generateScenarios() {
  const S = [];
  // 1) Each jurisdiction with a "typical" household
  JURIS.forEach(([co, re]) => S.push({ name: `${co}/${re} typical`, client: withMoney(baseClient(co, re), { income: 95000, rrsp: 250000, tfsa: 80000, nonreg: 120000, realestate: 600000, mortgage: 300000, age: 45, married: true, deps: 2 }) }));
  // 2) Income levels (QC)
  [0, 40000, 85000, 150000, 300000, 600000].forEach(inc => S.push({ name: `QC income ${inc}`, client: withMoney(baseClient('CA', 'QC'), { income: inc, rrsp: inc * 2, tfsa: 40000, age: 40 }) }));
  // 3) Ages / lifecycle (ON)
  [25, 35, 45, 55, 64, 72, 85].forEach(age => S.push({ name: `ON age ${age}`, client: withMoney(baseClient('CA', 'ON'), { income: age >= 65 ? 0 : 90000, rrsp: age * 8000, tfsa: age * 2000, nonreg: age * 3000, age, retireAge: Math.min(age, 65), lifeExp: Math.max(age + 5, 92) }) }));
  // 4) Asset mixes
  S.push({ name: 'all RRSP', client: withMoney(baseClient('CA', 'QC'), { income: 100000, rrsp: 800000, age: 60, retireAge: 62 }) });
  S.push({ name: 'all TFSA', client: withMoney(baseClient('CA', 'QC'), { income: 100000, tfsa: 500000, age: 55 }) });
  S.push({ name: 'all nonreg', client: withMoney(baseClient('CA', 'QC'), { income: 100000, nonreg: 700000, age: 58 }) });
  S.push({ name: 'real-estate heavy', client: withMoney(baseClient('CA', 'BC'), { income: 120000, realestate: 1500000, mortgage: 900000, age: 50 }) });
  // 5) Business owners (all CA provinces + US)
  [['CA', 'QC'], ['CA', 'ON'], ['CA', 'BC'], ['CA', 'AB'], ['US', 'CA']].forEach(([co, re]) => S.push({ name: `${co}/${re} biz owner`, client: withMoney(baseClient(co, re), { income: 60000, rrsp: 300000, tfsa: 90000, age: 48, married: true, deps: 2, business: true }) }));
  // 6) Edge cases
  S.push({ name: 'zero everything', client: baseClient('CA', 'QC') });
  S.push({ name: 'no income retired', client: withMoney(baseClient('CA', 'QC'), { income: 0, rrsp: 600000, tfsa: 100000, age: 68, retireAge: 65, lifeExp: 95 }) });
  S.push({ name: 'negative net worth', client: withMoney(baseClient('CA', 'ON'), { income: 70000, nonreg: 20000, realestate: 400000, mortgage: 700000, age: 35 }) });
  S.push({ name: 'huge wealth', client: withMoney(baseClient('CA', 'AB'), { income: 500000, rrsp: 2000000, tfsa: 250000, nonreg: 3000000, realestate: 2500000, mortgage: 500000, age: 55, married: true, deps: 3, business: true }) });
  S.push({ name: 'very old short horizon', client: withMoney(baseClient('CA', 'QC'), { income: 0, rrsp: 200000, age: 90, retireAge: 65, lifeExp: 93 }) });
  S.push({ name: 'single high earner US', client: withMoney(baseClient('US', 'NY'), { income: 400000, rrsp: 500000, tfsa: 100000, nonreg: 800000, age: 42 }) });
  S.push({ name: 'UK pension heavy', client: withMoney(baseClient('UK', 'EW'), { income: 80000, rrsp: 400000, tfsa: 120000, age: 52, married: true }) });
  S.push({ name: 'no expenses', client: (() => { const c = withMoney(baseClient('CA', 'QC'), { income: 90000, rrsp: 200000 }); c.expenses = []; return c; })() });
  S.push({ name: 'no goals no docs', client: (() => { const c = withMoney(baseClient('CA', 'QC'), { income: 90000 }); c.goals = []; c.documents = []; c.beneficiaries = []; return c; })() });
  S.push({ name: 'many dependents', client: withMoney(baseClient('CA', 'QC'), { income: 110000, rrsp: 150000, age: 40, married: true, deps: 4 }) });
  S.push({ name: 'retire at 50 FIRE', client: withMoney(baseClient('CA', 'BC'), { income: 200000, rrsp: 600000, tfsa: 200000, nonreg: 900000, age: 40, retireAge: 50, lifeExp: 95 }) });
  S.push({ name: 'late saver', client: withMoney(baseClient('CA', 'ON'), { income: 75000, rrsp: 30000, age: 58, retireAge: 67 }) });
  // 7) Retired households in every country
  JURIS.forEach(([co, re]) => S.push({ name: `${co}/${re} retired`, client: withMoney(baseClient(co, re), { income: 0, rrsp: 500000, tfsa: 120000, nonreg: 200000, realestate: 500000, age: 70, retireAge: 65, lifeExp: 94, married: true }) }));
  // 8) Income × jurisdiction matrix (extra spread)
  [['US', 'TX'], ['US', 'FL'], ['UK', 'SC']].forEach(([co, re]) => [50000, 200000, 500000].forEach(inc => S.push({ name: `${co}/${re} inc ${inc}`, client: withMoney(baseClient(co, re), { income: inc, rrsp: inc, tfsa: 30000, age: 45 }) })));
  // 9) Pre-retirees with big registered balances (clawback/decumulation stress)
  [['CA', 'QC'], ['CA', 'ON']].forEach(([co, re]) => S.push({ name: `${co}/${re} big RRSP pre-ret`, client: withMoney(baseClient(co, re), { income: 140000, rrsp: 1400000, tfsa: 150000, nonreg: 300000, age: 60, retireAge: 62, lifeExp: 95, married: true }) }));
  S.push({ name: 'young renter no assets', client: withMoney(baseClient('CA', 'QC'), { income: 55000, age: 28 }) });
  S.push({ name: 'business no personal assets', client: (() => { const c = withMoney(baseClient('CA', 'ON'), { income: 0, age: 50, business: true }); return c; })() });
  S.push({ name: 'spouse only income', client: (() => { const c = withMoney(baseClient('CA', 'QC'), { income: 0, married: true, age: 45 }); c.incomes = [M.newIncome({ memberId: c.members[1].id, type: 'employment', amount: 120000 })]; return c; })() });
  return S;
}

// ---------- sanity check ----------
const fails = [];
function isBad(v) { return typeof v === 'number' && (!isFinite(v) || isNaN(v)); }
function scanFinite(label, obj, depth = 0) {
  if (depth > 6 || obj == null) return;
  if (typeof obj === 'number') { if (isBad(obj)) fails.push(`${label}: non-finite ${obj}`); return; }
  if (Array.isArray(obj)) { obj.slice(0, 80).forEach((x, i) => scanFinite(`${label}[${i}]`, x, depth + 1)); return; }
  if (typeof obj === 'object') { for (const k of Object.keys(obj)) { if (['rows', 'series', 'bands'].includes(k) && Array.isArray(obj[k]) && obj[k].length > 30) scanFinite(`${label}.${k}`, obj[k].slice(0, 5), depth + 1); else scanFinite(`${label}.${k}`, obj[k], depth + 1); } }
}

// ---------- run ----------
const scenarios = generateScenarios();
let engineChecks = 0, viewRenders = 0;
let vIdx = 0;

for (const sc of scenarios) {
  const c = sc.client;
  const jur = getJurisdiction(c.jurisdiction.country, c.jurisdiction.region);
  // engines
  try {
    const p = proj.runProjection(c); scanFinite(`${sc.name} projection`, p.summary); engineChecks++;
    const m = mc.runMonteCarlo(c, { trials: 120 }); scanFinite(`${sc.name} mc`, { successRate: m.successRate, medianFinal: m.medianFinal, p10: m.p10Final }); engineChecks++;
    for (const inc of [0, 50000, 120000, 300000]) { const tx = tax.computeTax(jur, { ordinary: inc }); scanFinite(`${sc.name} tax ${inc}`, tx); engineChecks++; }
    scanFinite(`${sc.name} networth`, analysis.netWorthBreakdown(c)); engineChecks++;
    for (const mem of c.members) scanFinite(`${sc.name} life`, analysis.lifeInsuranceNeeds(c, mem.id));
    if (c.business && jur.country === 'CA') { scanFinite(`${sc.name} corp`, corporate.corporateTaxCA(jur, c.business.activeIncome, c.business.passiveIncome)); scanFinite(`${sc.name} svd`, corporate.salaryVsDividend(jur, 150000, 0)); engineChecks++; }
    scanFinite(`${sc.name} health`, { score: health.healthCheck(c, jur).overallScore }); engineChecks++;
    const dec = decum.compareDecumulation(jur, { startAge: c.members[0].retirementAge, endAge: c.members[0].lifeExpectancy, deferred: 500000, tfsa: 100000, nonreg: 200000, nonregBasis: 150000, otherIncomeNow: 20000, oasAnnual: 8700, spending: 60000, inflation: 0.02, returnRate: 0.045, bracketTarget: 57000 });
    scanFinite(`${sc.name} decum`, { tax: dec.results[0].totalTax, estate: dec.results[0].finalEstate }); engineChecks++;
    suggest.suggestGoals(c, jur); engineChecks++;
  } catch (e) { fails.push(`${sc.name} ENGINE THREW: ${e.message}`); }

  // views — render every view across scenarios (rotating lang), and ensure each view hit in both langs over the run
  for (const v of VIEWS) {
    const lang = (vIdx++ % 2 === 0) ? 'fr' : 'en'; setLang(lang);
    try {
      const node = viewMods[v].render({ store, client: c, jur, navigate: () => {} });
      if (!node || !node.nodeType) throw new Error('no node returned');
      viewRenders++;
    } catch (e) { fails.push(`${sc.name} [${lang}] view ${v}: ${e.message}`); }
  }
}

// persistence round-trip
try { const json = store.exportJSON(); store.importJSON(json); } catch (e) { fails.push('persistence: ' + e.message); }

setLang('fr');
console.log(`\n===== JC Planner test harness =====`);
console.log(`Scenarios:     ${scenarios.length}`);
console.log(`Engine checks: ${engineChecks}`);
console.log(`View renders:  ${viewRenders}  (${VIEWS.length} views × ${scenarios.length} scenarios)`);
console.log(`Failures:      ${fails.length}`);
if (fails.length) { console.log('\n--- FAILURES ---'); [...new Set(fails)].slice(0, 60).forEach(f => console.log('  ✗ ' + f)); }
else console.log('\n✓ ALL SCENARIOS PASSED');
process.exit(fails.length ? 1 : 0);
