// ============================================================
// JC Planner — adversarial engine fuzzer
// 160 seeded random + dirty-input client scenarios run through
// every engine, asserting all numeric outputs are finite and in
// range. Bounded, cycle-safe deep-scan keeps it fast (no jsdom).
//
// Run from app/:  printf '{"type":"module"}' > package.json \
//   && node test/fuzz.mjs ; rm -f package.json
// ============================================================
const store = {}; globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => store[k] = String(v), removeItem: k => delete store[k] };
globalThis.document = { documentElement: {} };

const M = await import('../src/state/models.js');
const { getJurisdiction } = await import('../src/jurisdictions/index.js');
const proj = await import('../src/engine/projection.js');
const mc = await import('../src/engine/montecarlo.js');
const tax = await import('../src/engine/tax.js');
const analysis = await import('../src/engine/analysis.js');
const corp = await import('../src/engine/corporate.js');
const decum = await import('../src/engine/decumulation.js');
const health = await import('../src/engine/healthcheck.js');
const suggest = await import('../src/engine/suggestions.js');
const rentbuy = await import('../src/engine/rentbuy.js');
const ltc = await import('../src/engine/ltc.js');
const equity = await import('../src/engine/equity.js');
const emig = await import('../src/engine/emigration.js');
const flow = await import('../src/engine/flowthrough.js');
const istrat = await import('../src/engine/insurancestrat.js');
const rdsp = await import('../src/engine/rdsp.js');
const adv = await import('../src/engine/advstructures.js');
const icmp = await import('../src/engine/insurancecompare.js');
const re = await import('../src/engine/realestate.js');
const phil = await import('../src/engine/philanthropy.js');

const SEED = 0xC0FFEE;
let _s = SEED >>> 0;
function rnd() { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const rf = (a, b) => a + rnd() * (b - a);
const pick = a => a[Math.floor(rnd() * a.length)];
const DIRT = [NaN, undefined, '', -1, -999999, Infinity, -Infinity, null, '12abc', 0];
const dirt = () => pick(DIRT);

const JURIS = [['CA', 'QC'], ['CA', 'ON'], ['CA', 'BC'], ['CA', 'AB'], ['US', 'CA'], ['US', 'NY'], ['US', 'TX'], ['US', 'FL'], ['US', 'WA'], ['UK', 'EW'], ['UK', 'SC']];
const A_TYPES = { CA: ['rrsp', 'tfsa', 'fhsa', 'nonreg', 'cash', 'realestate', 'resp'], US: ['401k', 'ira', 'roth', 'hsa', 'nonreg', 'cash', 'realestate', '529'], UK: ['pension', 'isa', 'lisa', 'nonreg', 'cash', 'realestate', 'jisa'] };

function genClient(dirty) {
  const [co, reg] = pick(JURIS);
  const c = M.newClient('Fuzz', co, reg);
  const m0 = c.members[0];
  m0.currentAge = dirty && rnd() < 0.5 ? dirt() : ri(18, 92);
  m0.retirementAge = dirty && rnd() < 0.5 ? dirt() : ri(50, 78);
  m0.lifeExpectancy = dirty && rnd() < 0.5 ? dirt() : ri(70, 101);
  c.filingStatus = rnd() < 0.5 ? 'married' : 'single';
  if (c.filingStatus === 'married') c.members.push(M.newMember({ role: 'spouse', currentAge: ri(20, 90), retirementAge: ri(50, 78), lifeExpectancy: ri(70, 101) }));
  const inc = dirty && rnd() < 0.4 ? dirt() : rf(0, 2000000);
  c.incomes = rnd() < 0.9 ? [M.newIncome({ memberId: m0.id, type: pick(['employment', 'self', 'cpp', 'oas', 'pension']), amount: inc })] : [];
  c.expenses = rnd() < 0.85 ? [M.newExpense({ amount: dirty && rnd() < 0.4 ? dirt() : rf(0, 200000), retirementFactor: rf(0.4, 1.3) })] : [];
  c.assets = [];
  for (let i = 0, nA = ri(0, 6); i < nA; i++) c.assets.push(M.newAsset({ ownerId: m0.id, type: pick(A_TYPES[co]), value: dirty && rnd() < 0.4 ? dirt() : rf(0, 5000000), costBasis: rf(0, 5000000), annualContribution: dirty && rnd() < 0.3 ? dirt() : rf(0, 50000), growth: rf(0, 0.12) }));
  c.liabilities = [];
  for (let i = 0, n = ri(0, 3); i < n; i++) c.liabilities.push(M.newLiability({ balance: dirty && rnd() < 0.4 ? dirt() : rf(0, 2000000), rate: rf(0, 0.15), payment: rf(0, 15000) }));
  for (let i = 0, n = ri(0, 4); i < n; i++) c.dependents.push(M.newDependent({ age: ri(0, 25), educationGoalAge: ri(16, 22) }));
  if (rnd() < 0.4) c.business = M.newBusiness({ ownerId: m0.id, activeIncome: dirty && rnd() < 0.4 ? dirt() : rf(0, 3000000), passiveIncome: rf(0, 400000), retainedEarnings: rf(0, 3000000), corpInvestments: rf(0, 2000000) });
  c.goals = rnd() < 0.7 ? [M.newGoal({ type: pick(['retirement', 'education', 'purchase']), amount: rf(0, 500000), targetAge: ri(18, 80) })] : [];
  return c;
}

// bounded, cycle-safe finite scanner; skips large static jurisdiction blocks and echoed input objects
const SKIP = new Set(['jur', 'brackets', 'prov', 'states', 'accounts', 'fed', 'corporate', 'payroll', 'regionsData', 'regionData', 'pensions', 'rrifMin', 'labels', 'note', 'timing', 'label', 'name', 'member']);
function scan(path, o, fails, seen = new WeakSet(), depth = 0) {
  if (depth > 5 || o == null) return;
  if (typeof o === 'number') { if (!isFinite(o)) fails.push(`${path} = ${o}`); return; }
  if (typeof o !== 'object') return;
  if (seen.has(o)) return; seen.add(o);
  if (Array.isArray(o)) { o.slice(0, 8).forEach((x, i) => scan(`${path}[${i}]`, x, fails, seen, depth + 1)); return; }
  for (const k of Object.keys(o)) { if (SKIP.has(k)) continue; scan(`${path}.${k}`, o[k], fails, seen, depth + 1); }
}

const fails = [];
let clients = 0, calls = 0;
function run(label, fn) { calls++; try { const r = fn(); scan(label, r, fails); } catch (e) { fails.push(`${label} THREW: ${e.message}`); } }

const N = 160;
for (let n = 0; n < N; n++) {
  const dirty = n >= 130;
  const c = genClient(dirty); clients++;
  const jur = getJurisdiction(c.jurisdiction.country, c.jurisdiction.region);
  run('projection', () => proj.runProjection(c));
  run('montecarlo', () => { const r = mc.runMonteCarlo(c, { trials: 60 }); if (!(r.successRate >= 0 && r.successRate <= 1)) fails.push(`successRate out of range ${r.successRate}`); return { successRate: r.successRate, medianFinal: r.medianFinal, p10: r.p10Final, p90: r.p90Final }; });
  for (const inc of [0, 1, 55000, 250000, 800000]) run(`tax ${inc}`, () => tax.computeTax(jur, { ordinary: inc, capGains: rf(0, 200000), eligibleDiv: rf(0, 100000) }));
  run('networth', () => analysis.netWorthBreakdown(c));
  for (const mem of c.members) { run('life', () => analysis.lifeInsuranceNeeds(c, mem.id)); run('di', () => analysis.disabilityNeeds(c, mem.id)); }
  run('health', () => { const r = health.healthCheck(c, jur); if (!(r.overallScore >= 0 && r.overallScore <= 100)) fails.push(`score out of range ${r.overallScore}`); return { score: r.overallScore }; });
  run('decum', () => decum.compareDecumulation(jur, { startAge: ri(50, 70), endAge: ri(75, 100), deferred: rf(0, 2e6), tfsa: rf(0, 5e5), nonreg: rf(0, 1e6), nonregBasis: rf(0, 1e6), otherIncomeNow: rf(0, 5e4), oasAnnual: rf(0, 1e4), spending: rf(2e4, 2e5), inflation: 0.02, returnRate: 0.045, bracketTarget: 57000 }));
  run('suggest', () => suggest.suggestGoals(c, jur));
  if (c.business && jur.country === 'CA') { run('corpTax', () => corp.corporateTaxCA(jur, c.business.activeIncome, c.business.passiveIncome)); run('svd', () => corp.salaryVsDividend(jur, rf(0, 5e5), rf(0, 2e5))); run('lcge', () => corp.lcgeSale(jur, rf(0, 5e6), rf(0, 1e6), ri(1, 4))); run('retain', () => corp.retainVsDistribute(jur, rf(0, 5e5), ri(1, 35), rf(0.02, 0.1), rf(0.2, 0.55))); }
  run('rentbuy', () => rentbuy.analyzeRentBuy(rnd() < 0.5 ? { price: rf(1e5, 3e6), downPct: rf(0.05, 1), rate: rf(0.02, 0.1), rentMonthly: rf(500, 8000), holdYears: ri(1, 40) } : { price: dirt(), rate: dirt(), holdYears: dirt(), rentMonthly: dirt() }));
  run('ltc', () => ltc.projectLTC(rnd() < 0.5 ? { currentAge: ri(40, 85), onsetAge: ri(65, 95), durationYears: ri(1, 12), annualCostToday: rf(2e4, 2e5) } : { currentAge: dirt(), onsetAge: dirt(), durationYears: dirt(), annualCostToday: dirt() }));
  run('equity', () => equity.equityComp(jur, rnd() < 0.5 ? { shares: ri(0, 1e5), strike: rf(0, 100), fmvExercise: rf(0, 200), fmvSale: rf(0, 300), marginalRate: rf(0.2, 0.55), instrument: pick(['option', 'rsu']) } : { shares: dirt(), strike: dirt(), fmvExercise: dirt(), fmvSale: dirt(), marginalRate: dirt() }));
  run('emigration', () => emig.departureTax(rnd() < 0.5 ? { portfolioFMV: rf(0, 5e6), portfolioACB: rf(0, 5e6), realEstateFMV: rf(0, 3e6), rrspValue: rf(0, 1e6), privateCoFMV: rf(0, 1e7), privateCoACB: rf(0, 1e6), marginalRate: rf(0.2, 0.27) } : { portfolioFMV: dirt(), marginalRate: dirt() }));
  run('flow', () => flow.flowThroughInvestment(rnd() < 0.5 ? { amount: rf(1e4, 1e6), marginalRate: rf(0.2, 0.55), provCredit: rf(0, 0.3) } : { amount: dirt(), marginalRate: dirt() }));
  run('peartree', () => flow.peartreeDonation(rnd() < 0.5 ? { amount: rf(1e4, 1e6), marginalRate: rf(0.2, 0.55), donationCredit: rf(0.3, 0.55) } : { amount: dirt(), marginalRate: dirt(), donationCredit: dirt() }));
  run('irp', () => istrat.insuredRetirementPlan(rnd() < 0.5 ? { annualPremium: rf(5e3, 1e5), fundingYears: ri(5, 30), currentAge: ri(30, 60), retireAge: ri(55, 75), faceAmount: rf(2.5e5, 5e6) } : { annualPremium: dirt(), fundingYears: dirt(), currentAge: dirt(), retireAge: dirt(), endAge: dirt() }));
  run('ifa', () => istrat.immediateFinancingArrangement(rnd() < 0.5 ? { annualPremium: rf(1e4, 2e5), years: ri(1, 30), loanRate: rf(0.03, 0.1), reinvestReturn: rf(0.03, 0.12), marginalRate: rf(0.2, 0.55) } : { annualPremium: dirt(), years: dirt() }));
  run('cda', () => istrat.cdaCredit(rnd() < 0.5 ? rf(0, 5e6) : dirt(), rnd() < 0.5 ? rf(0, 2e6) : dirt()));
  run('rdsp', () => rdsp.rdspProjection(rnd() < 0.5 ? { beneficiaryAge: ri(0, 49), annualContribution: rf(0, 1e4), familyIncome: rf(0, 2e5), growth: rf(0.02, 0.08) } : { beneficiaryAge: dirt(), annualContribution: dirt(), familyIncome: dirt(), growth: dirt() }));
  run('prescribed', () => adv.prescribedRateLoan(rnd() < 0.5 ? { loan: rf(1e5, 5e6), returnRate: rf(0.03, 0.12), prescribedRate: rf(0.01, 0.07), highMarg: rf(0.3, 0.55), lowMarg: rf(0, 0.4), years: ri(1, 30) } : { loan: dirt(), returnRate: dirt(), prescribedRate: dirt(), highMarg: dirt(), lowMarg: dirt(), years: dirt() }));
  run('freeze', () => adv.estateFreezeLCGE(rnd() < 0.5 ? { currentValue: rf(0, 1e7), futureValue: rf(0, 2e7), beneficiaries: ri(1, 6), marginalRate: rf(0.2, 0.27) } : { currentValue: dirt(), futureValue: dirt(), beneficiaries: dirt(), marginalRate: dirt() }));
  run('holdco', () => adv.holdcoAnalysis(rnd() < 0.5 ? { activeAssets: rf(0, 1e7), passiveAssets: rf(0, 5e6) } : { activeAssets: dirt(), passiveAssets: dirt() }));
  run('rca', () => adv.rcaAnalysis(rnd() < 0.5 ? { contribution: rf(2e4, 5e5), years: ri(3, 25) } : { contribution: dirt(), years: dirt() }));
  run('inscompare', () => icmp.compareLifeProducts(rnd() < 0.5 ? { coverage: rf(1e5, 5e6), currentAge: ri(20, 70), horizonAge: ri(60, 100), termPremium: rf(100, 5e3), wholePremium: rf(1e3, 3e4), t100Premium: rf(1e3, 2e4), investReturn: rf(0.02, 0.1) } : { coverage: dirt(), currentAge: dirt(), horizonAge: dirt(), termPremium: dirt(), wholePremium: dirt() }));
  run('realestate', () => re.analyzeProperty(rnd() < 0.5 ? { price: rf(1e5, 3e6), downPct: rf(0.05, 1), rate: rf(0.02, 0.1), amortYears: ri(5, 30), grossRent: rf(0, 2e5), vacancyPct: rf(0, 0.2), opexPct: rf(0, 0.5), appreciation: rf(0, 0.08), holdYears: ri(1, 40) } : { price: dirt(), rate: dirt(), holdYears: dirt(), grossRent: dirt() }));
  run('philanthropy', () => phil.charitableGift(jur, rnd() < 0.5 ? { amount: rf(1e3, 1e6), costBasis: rf(0, 1e6), marginalRate: rf(0.2, 0.55), donationCredit: rf(0.2, 0.55) } : { amount: dirt(), costBasis: dirt(), marginalRate: dirt(), donationCredit: dirt() }));
}

console.log(`\n===== JC Planner fuzz (seed 0x${SEED.toString(16)}) =====`);
console.log(`Clients:      ${clients}  (130 random + 30 dirty-input)`);
console.log(`Engine calls: ${calls}`);
console.log(`Failures:     ${fails.length}`);
if (fails.length) { console.log('\n--- FAILURES ---'); [...new Set(fails)].slice(0, 60).forEach(f => console.log('  ✗ ' + f)); }
else console.log('\n✓ ALL ENGINE OUTPUTS FINITE & IN RANGE (random + dirty inputs)');
process.exit(fails.length ? 1 : 0);
