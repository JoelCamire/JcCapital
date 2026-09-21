// ============================================================
// JC Planner — MEGA generative stress suite
//
// Invents thousands of realistic, deliberately COMPLEX client files
// (incorporated couples with a holdco and passive income, blended
// families, decumulating retirees in OAS-clawback territory, HNW
// households with a dozen accounts and several properties, snowbirds,
// self-employed, farmers, single parents with an RDSP, FIRE savers,
// legacy/dirty data, extreme values …) with a seeded generator, runs
// EVERY engine on each one and asserts strict invariants:
//   • finiteness and ranges everywhere
//   • accounting identities per projected year (net worth, investable
//     flow, tax = Σ members, balances ≥ 0, shortfall only in retirement)
//   • determinism (same file → same numbers), normalisation idempotence,
//     export → import round-trip
//   • Monte Carlo reproducibility and ordered bands
//   • pension splitting never increases tax; corporate integration ties
//   • monotone sensitivities on paired variants (more income ⇒ ≥ wealth,
//     more spending ⇒ ≤ wealth)
//   • CRM reconciliation; facts = engines
// and (optionally) renders all 64 views on the most complex files,
// scanning the DOM for NaN / undefined.
// Reports per-engine timings (p50 / p95 / max) against a speed budget.
//
// Run from app/:  printf '{"type":"module"}' > package.json
//   && node test/mega.mjs --n 10000 --shard 0 --of 4 --views 60 ; rm -f package.json
// (or ./test/run.sh mega — runs 4 shards in parallel and aggregates)
// ============================================================
import { writeFileSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1'] : []).filter(Boolean));
const N = +args.n || 2000, SHARD = +args.shard || 0, OF = +args.of || 1, VIEWS = args.views != null ? +args.views : 40, TRIALS = +args.trials || 120, OUT = args.out || null;
const QUIET = !!args.quiet;

// ---------- DOM shim (views need jsdom; engines only need a stub) ----------
let JSDOM = null;
try { ({ JSDOM } = await import('jsdom')); } catch (e) { /* engines-only mode */ }
if (JSDOM && VIEWS > 0) {
  const dom = new JSDOM('<!DOCTYPE html><body data-theme="light"><div id="app"></div></body>', { url: 'http://localhost/app/' });
  for (const k of ['document', 'DOMParser', 'Node', 'HTMLElement', 'localStorage', 'FileReader', 'Blob', 'URL', 'getComputedStyle', 'location']) { try { globalThis[k] = dom.window[k]; } catch (e) {} }
  globalThis.window = dom.window;
  globalThis.addEventListener = dom.window.addEventListener.bind(dom.window);
} else {
  const mem = {};
  globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => mem[k] = String(v), removeItem: k => delete mem[k] };
  globalThis.document = { documentElement: {}, body: { dataset: {} } };
}

const M = await import('../src/state/models.js');
const { store, normalize, syncDerived } = await import('../src/state/store.js');
const { getJurisdiction } = await import('../src/jurisdictions/index.js');
const { setLang } = await import('../src/i18n.js');
const T = await import('../src/engine/tax.js');
const P = await import('../src/engine/projection.js');
const MC = await import('../src/engine/montecarlo.js');
const FX = await import('../src/engine/facts.js');
const HC = await import('../src/engine/healthcheck.js');
const IG = await import('../src/engine/integrity.js');
const DEC = await import('../src/engine/decumulation.js');
const OPT = await import('../src/engine/optimize.js');
const SUG = await import('../src/engine/suggestions.js');
const CORP = await import('../src/engine/corporate.js');
const AN = await import('../src/engine/analysis.js');
const CRM = await import('../src/engine/crm.js');
const BEN = await import('../src/engine/benefits.js');
const SB = await import('../src/engine/selfbiz.js');

// ---------- seeded randomness ----------
function rngOf(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let R = rngOf(1);
const ri = (a, b) => Math.floor(a + R() * (b - a + 1));
const rf = (a, b) => a + R() * (b - a);
const pick = (arr) => arr[Math.floor(R() * arr.length)];
const chance = (p) => R() < p;
const idc = () => 'id' + Math.floor(R() * 1e9).toString(36);   // deterministic ids

// ---------- counters ----------
let checks = 0, fails = 0; const failLog = [];
const okc = (cond, msg, ctx) => { checks++; if (!cond) { fails++; if (failLog.length < 80) failLog.push(`[${ctx}] ${msg}`); } };
const isFin = (v) => typeof v === 'number' && Number.isFinite(v);
function scanFinite(label, obj, ctx, depth = 0, seen = new WeakSet()) {
  if (depth > 6 || obj == null) return;
  if (typeof obj === 'number') { okc(Number.isFinite(obj), `${label} non-finite (${obj})`, ctx); return; }
  if (typeof obj !== 'object') return;
  if (seen.has(obj)) return; seen.add(obj);
  if (Array.isArray(obj)) { obj.slice(0, 40).forEach((x, i) => scanFinite(`${label}[${i}]`, x, ctx, depth + 1, seen)); return; }
  for (const k of Object.keys(obj)) { if (['jur', 'projection', 'det', 'member', 'label', 'note', 'name'].includes(k)) continue; scanFinite(`${label}.${k}`, obj[k], ctx, depth + 1, seen); }
}

// ---------- archetype generators (each returns a NON-normalised client) ----------
const JURIS = [['CA', 'QC'], ['CA', 'QC'], ['CA', 'QC'], ['CA', 'ON'], ['CA', 'BC'], ['CA', 'AB'], ['US', 'CA'], ['US', 'NY'], ['US', 'TX'], ['UK', 'EW'], ['UK', 'SC']];
const A_TYPES = { CA: { deferred: ['rrsp', 'rrsp', 'lira', 'rrif', 'lif', 'fhsa'], taxfree: ['tfsa'], taxable: ['nonreg', 'cash'], edu: ['resp'] }, US: { deferred: ['401k', 'ira'], taxfree: ['roth', 'hsa'], taxable: ['nonreg', 'cash'], edu: ['529'] }, UK: { deferred: ['pension'], taxfree: ['isa', 'lisa'], taxable: ['nonreg', 'cash'], edu: ['jisa'] } };
const dobFor = (age) => { const y = new Date().getFullYear() - age; return `${y}-${String(ri(1, 12)).padStart(2, '0')}-${String(ri(1, 28)).padStart(2, '0')}`; };

function base(name, co, re) {
  const c = M.newClient(name, co, re);
  c.id = idc(); c.members[0].id = idc();
  c.insurance = []; c.products = []; c.assets = []; c.liabilities = []; c.incomes = []; c.expenses = []; c.goals = []; c.dependents = []; c.opportunities = []; c.activities = []; c.tasks = []; c.documents = []; c.beneficiaries = [];
  return c;
}
function member(c, over) { const m = M.newMember({ id: idc(), ...over }); if (chance(0.7)) m.dob = dobFor(m.currentAge); c.members.push(m); return m; }
function spouse(c, age, retire, le) { const m = member(c, { name: 'Conjoint', role: 'spouse', currentAge: age, retirementAge: retire, lifeExpectancy: le }); c.filingStatus = 'married'; c.household.maritalStatus = pick(['married', 'common-law']); return m; }
function accounts(c, m, co, { deferred = 0, taxfree = 0, taxable = 0, edu = 0, contrib = 0, growth = 0.058 }) {
  const T = A_TYPES[co];
  if (deferred > 0) { const n = ri(1, 3); for (let i = 0; i < n; i++) c.assets.push(M.newAsset({ id: idc(), ownerId: m.id, type: pick(T.deferred), value: deferred / n, costBasis: deferred / n, growth: rf(growth - 0.01, growth + 0.01), annualContribution: contrib / n, employerMatch: chance(0.3) ? contrib / n * 0.5 : 0 })); }
  if (taxfree > 0) { const n = ri(1, 2); for (let i = 0; i < n; i++) c.assets.push(M.newAsset({ id: idc(), ownerId: m.id, type: pick(T.taxfree), value: taxfree / n, costBasis: taxfree / n, growth: rf(0.05, 0.075), annualContribution: chance(0.6) ? 7000 / n : 0 })); }
  if (taxable > 0) { const n = ri(1, 3); for (let i = 0; i < n; i++) { const v = taxable / n; c.assets.push(M.newAsset({ id: idc(), ownerId: m.id, type: pick(T.taxable), value: v, costBasis: v * rf(0.3, 1), growth: rf(0.02, 0.07), annualContribution: chance(0.4) ? rf(0, 20000) : 0 })); } }
  if (edu > 0) c.assets.push(M.newAsset({ id: idc(), ownerId: m.id, type: T.edu[0], value: edu, costBasis: edu, growth: 0.05, annualContribution: rf(0, 5000) }));
}
function property(c, m, value, mortgagePct, rate = rf(0.04, 0.065)) {
  c.assets.push(M.newAsset({ id: idc(), ownerId: m.id, type: 'realestate', label: 'Propriété', value, costBasis: value * rf(0.4, 0.9), growth: rf(0.02, 0.045), annualContribution: 0 }));
  if (mortgagePct > 0) { const bal = value * mortgagePct; c.liabilities.push(M.newLiability({ id: idc(), type: 'mortgage', label: 'Hypothèque', balance: bal, rate, payment: Math.max(300, bal * rf(0.0055, 0.0075)), extraPayment: chance(0.3) ? rf(0, 500) : 0, amortizationYears: pick([20, 25, 30]) })); }
}
function policies(c, m, { life = 0, di = 0, ci = 0, ltc = 0 }) {
  const add = (kind, face, prem) => c.products.push(M.newProduct({ id: idc(), kind, carrier: pick(['Canada Vie', 'RBC', 'Manuvie', 'iA', 'Sun Life']), policyNumber: 'P' + Math.floor(R() * 1e6), status: chance(0.9) ? 'inforce' : pick(['pending', 'lapsed', 'cancelled']), faceAmount: face, premium: prem, frequency: pick(['annual', 'monthly']), insuredId: m.id, issueDate: `${ri(2010, 2026)}-0${ri(1, 9)}-15`, renewalDate: chance(0.6) ? `${ri(2026, 2030)}-0${ri(1, 9)}-01` : '', firstYearCommission: chance(0.4) ? rf(0, 5000) : 0, renewalCommission: rf(0, 1500) }));
  if (life) add('life', life, life * rf(0.001, 0.004));
  if (di) add('disability', di, di * rf(0.02, 0.04));
  if (ci) add('ci', ci, ci * rf(0.005, 0.012));
  if (ltc) add('ltc', ltc, ltc * rf(0.03, 0.06));
}
function investmentProduct(c, m, aum, link = true) {
  const asset = link ? c.assets.find(a => (a.ownerId === m.id) && a.type !== 'realestate' && !c.products.some(p => p.assetId === a.id)) : null;
  c.products.push(M.newProduct({ id: idc(), kind: pick(['investment', 'segfund']), carrier: pick(['Mackenzie', 'Fidelity', 'iA', 'Manuvie']), policyNumber: 'F' + Math.floor(R() * 1e6), status: 'inforce', aum: asset ? asset.value : aum, assetId: asset ? asset.id : null, insuredId: m.id, renewalCommission: aum * rf(0.005, 0.01) }));
}
function crm(c, level = 1) {
  c.crm = M.defaultCRM({ lifecycle: pick(['client', 'client', 'prospect', 'lead']), source: pick(['referral', 'web', 'event', 'coi']), referredBy: chance(0.4) ? c.members[0].name : '', tags: ['gen'], rating: pick(['A', 'B', 'C']), nextActionDate: chance(0.5) ? `2026-${String(ri(1, 12)).padStart(2, '0')}-${String(ri(1, 28)).padStart(2, '0')}` : '' });
  for (let i = 0; i < ri(0, 3 * level); i++) c.opportunities.push(M.newOpportunity({ id: idc(), type: pick(['life', 'disability', 'ci', 'investment', 'mortgage', 'group']), stage: pick(M.PIPELINE_STAGES), value: rf(500, 500000), valueKind: pick(['premium', 'aum']), probability: ri(0, 100), expectedClose: `2026-${String(ri(1, 12)).padStart(2, '0')}-15`, closedAt: chance(0.4) ? Date.now() - ri(0, 800) * 86400000 : null }));
  for (let i = 0; i < ri(0, 4 * level); i++) c.activities.push(M.newActivity({ id: idc(), type: pick(['call', 'email', 'meeting', 'note']), subject: 'Suivi', date: `2026-${String(ri(1, 9)).padStart(2, '0')}-${String(ri(1, 28)).padStart(2, '0')}` }));
  for (let i = 0; i < ri(0, 3 * level); i++) c.tasks.push(M.newTask({ id: idc(), title: 'Tâche', due: chance(0.8) ? `2026-${String(ri(1, 12)).padStart(2, '0')}-${String(ri(1, 28)).padStart(2, '0')}` : '', done: chance(0.3) }));
  c.household.reviewDate = chance(0.5) ? `2026-${String(ri(1, 12)).padStart(2, '0')}-10` : '';
  if (chance(0.6)) c.documents.push(M.newDocument({ id: idc(), type: 'will', status: pick(['done', 'todo']), date: '2021-05-10' }));
  if (chance(0.5)) c.beneficiaries.push(M.newBeneficiary({ id: idc(), name: 'B', scope: 'rrsp' }));
  c.compliance = Object.fromEntries(M.PIPELINE_STAGES.slice(0, 0).map(x => [x, {}]));
}
function expenses(c, living, extra = true) {
  c.expenses.push(M.newExpense({ id: idc(), label: 'Coût de vie', amount: living, category: 'living', growth: 0.021, retirementFactor: rf(0.65, 0.95) }));
  if (extra) {
    if (chance(0.7)) c.expenses.push(M.newExpense({ id: idc(), label: 'Logement', amount: living * rf(0.2, 0.5), category: 'housing', growth: 0.025, retirementFactor: rf(0.5, 1) }));
    if (chance(0.7)) c.expenses.push(M.newExpense({ id: idc(), label: 'Loisirs', amount: living * rf(0.1, 0.3), category: 'lifestyle', growth: 0.021, retirementFactor: rf(1, 1.3) }));
    if (chance(0.5)) c.expenses.push(M.newExpense({ id: idc(), label: 'Transport', amount: living * rf(0.05, 0.2), category: 'transport', growth: 0.02, retirementFactor: rf(0.5, 0.9) }));
  }
}
function govBenefits(c, m, co, level = 1) {
  const j = getJurisdiction(co, c.jurisdiction.region);
  const cppMax = j.pensions?.cpp?.maxAnnual || 17000, oasMax = j.pensions?.oas?.maxAnnual || 8900;
  c.incomes.push(M.newIncome({ id: idc(), memberId: m.id, label: 'Rente publique', type: 'cpp', amount: cppMax * rf(0.4, 1) * level, growth: 0.021, startAge: pick([60, 62, 65, 67, 70]) }));
  if (oasMax > 0) c.incomes.push(M.newIncome({ id: idc(), memberId: m.id, label: 'PSV', type: 'oas', amount: oasMax * rf(0.9, 1), growth: 0.021, startAge: pick([65, 65, 67, 70]) }));
}

const ARCHETYPES = {
  // 1. incorporated couple, holdco, passive income above the grind, 3 kids, rental
  entrepreneurCouple(co, re) {
    const c = base('Entrepreneurs inc.', co, re); const a = c.members[0]; a.name = 'Fondateur'; a.currentAge = ri(38, 58); a.retirementAge = ri(58, 68); a.lifeExpectancy = ri(88, 97);
    const b = spouse(c, a.currentAge - ri(-3, 6), ri(58, 66), ri(90, 98));
    c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'employment', label: 'Salaire (société)', amount: rf(90000, 260000), growth: 0.03 }));
    c.incomes.push(M.newIncome({ id: idc(), memberId: b.id, type: pick(['employment', 'self']), amount: rf(40000, 150000), growth: 0.025 }));
    if (chance(0.5)) c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'other', label: 'Dividendes holdco', amount: rf(10000, 80000), growth: 0.02 }));
    govBenefits(c, a, co); govBenefits(c, b, co);
    accounts(c, a, co, { deferred: rf(150000, 900000), taxfree: rf(30000, 120000), taxable: rf(50000, 600000), contrib: rf(10000, 30000) });
    accounts(c, b, co, { deferred: rf(50000, 400000), taxfree: rf(20000, 110000), edu: rf(20000, 120000), contrib: rf(5000, 20000) });
    property(c, a, rf(500000, 1600000), rf(0, 0.7)); if (chance(0.6)) property(c, a, rf(300000, 900000), rf(0.3, 0.8));
    if (chance(0.5)) c.liabilities.push(M.newLiability({ id: idc(), type: 'heloc', label: 'Marge', balance: rf(20000, 150000), rate: rf(0.06, 0.08), payment: rf(300, 1500) }));
    if (chance(0.4)) c.liabilities.push(M.newLiability({ id: idc(), type: 'loan', label: 'Auto', balance: rf(10000, 60000), rate: rf(0.04, 0.09), payment: rf(300, 900) }));
    for (let i = 0; i < ri(1, 4); i++) c.dependents.push(M.newDependent({ id: idc(), name: 'Enfant' + i, age: ri(0, 17), educationGoalAge: pick([17, 18, 19]) }));
    const active = rf(200000, 1500000);
    c.business = M.newBusiness({ name: 'Opco inc.', structure: 'incorporated', ownerId: a.id, activeIncome: active, passiveIncome: rf(0, 200000), retainedEarnings: rf(100000, 3000000), corpInvestments: rf(0, 2500000), otherPersonalIncome: 0, valuation: { ebitda: active * rf(0.15, 0.4), ebitdaMultiple: rf(3, 7), revenue: active * rf(2, 6), revenueMultiple: rf(0.5, 2) }, sale: { proceeds: rf(500000, 6000000), acb: rf(0, 300000), owners: ri(1, 3) } });
    policies(c, a, { life: rf(500000, 3000000), di: rf(48000, 150000), ci: chance(0.5) ? rf(50000, 250000) : 0 }); policies(c, b, { life: rf(250000, 1500000), di: chance(0.6) ? rf(30000, 90000) : 0 });
    investmentProduct(c, a, 0); if (chance(0.5)) investmentProduct(c, b, 0);
    expenses(c, rf(70000, 180000)); crm(c, 2);
    c.goals.push(M.newGoal({ id: idc(), type: 'retirement', amount: rf(80000, 200000), targetAge: a.retirementAge }), M.newGoal({ id: idc(), type: 'education', name: 'Études — Enfant0', amount: rf(60000, 150000), targetAge: 18 }), M.newGoal({ id: idc(), type: 'purchase', name: 'Chalet', amount: rf(150000, 800000), targetAge: a.currentAge + ri(3, 12) }));
    return c;
  },
  // 2. retired couple decumulating, RRIF+LIF+TFSA+non-reg with big gains, OAS clawback, splitting
  retiredCouple(co, re) {
    const c = base('Retraités', co, re); const a = c.members[0]; a.currentAge = ri(66, 84); a.retirementAge = ri(58, 65); a.lifeExpectancy = ri(a.currentAge + 3, 100);
    const b = spouse(c, a.currentAge - ri(-4, 8), ri(58, 65), ri(a.currentAge + 2, 100));
    c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'pension', label: 'RPA', amount: rf(20000, 90000), growth: 0.015 }));
    if (chance(0.5)) c.incomes.push(M.newIncome({ id: idc(), memberId: b.id, type: 'pension', amount: rf(5000, 40000), growth: 0.015 }));
    govBenefits(c, a, co); govBenefits(c, b, co);
    c.assets.push(M.newAsset({ id: idc(), ownerId: a.id, type: co === 'CA' ? 'rrif' : co === 'US' ? 'rmd' : 'pension', value: rf(200000, 2500000), costBasis: 0, growth: rf(0.03, 0.055) }));
    if (co === 'CA' && chance(0.5)) c.assets.push(M.newAsset({ id: idc(), ownerId: b.id, type: 'lif', value: rf(50000, 600000), costBasis: 0, growth: 0.04 }));
    accounts(c, b, co, { deferred: rf(50000, 800000), taxfree: rf(50000, 200000) });
    c.assets.push(M.newAsset({ id: idc(), ownerId: a.id, type: 'nonreg', value: rf(100000, 2000000), costBasis: rf(0.1, 0.5) * 500000, growth: rf(0.03, 0.06) }));
    c.assets.push(M.newAsset({ id: idc(), ownerId: a.id, type: 'tfsa', value: rf(60000, 180000), costBasis: 60000, growth: 0.05 }));
    property(c, a, rf(400000, 1500000), chance(0.3) ? rf(0.05, 0.3) : 0);
    policies(c, a, { life: chance(0.6) ? rf(50000, 500000) : 0, ltc: chance(0.3) ? rf(30000, 80000) : 0 });
    expenses(c, rf(50000, 160000)); crm(c, 1);
    if (chance(0.4)) c.documents.push(M.newDocument({ id: idc(), type: 'mandate', status: 'done' }));
    return c;
  },
  // 3. high-net-worth, many accounts, several properties, estate freeze territory
  hnw(co, re) {
    const c = base('Fortune familiale', co, re); const a = c.members[0]; a.currentAge = ri(45, 70); a.retirementAge = ri(55, 70); a.lifeExpectancy = ri(90, 100);
    const b = chance(0.8) ? spouse(c, a.currentAge - ri(-5, 5), ri(55, 68), ri(90, 100)) : null;
    c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'employment', amount: rf(200000, 900000), growth: 0.03 }));
    if (b) c.incomes.push(M.newIncome({ id: idc(), memberId: b.id, type: pick(['employment', 'pension', 'other']), amount: rf(30000, 300000), growth: 0.02 }));
    c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'rental', label: 'Loyers nets', amount: rf(20000, 150000), growth: 0.025 }));
    govBenefits(c, a, co); if (b) govBenefits(c, b, co);
    for (const m of c.members) accounts(c, m, co, { deferred: rf(300000, 2500000), taxfree: rf(80000, 200000), taxable: rf(500000, 8000000), contrib: rf(20000, 35000) });
    for (let i = 0; i < ri(2, 5); i++) property(c, a, rf(400000, 4000000), chance(0.5) ? rf(0.1, 0.6) : 0);
    c.assets.push(M.newAsset({ id: idc(), ownerId: a.id, type: 'corp', label: 'Holdco', value: rf(500000, 10000000), costBasis: rf(0, 500000), growth: 0.05 }));
    if (chance(0.6)) c.business = M.newBusiness({ name: 'Groupe', structure: 'holdco', ownerId: a.id, activeIncome: rf(0, 800000), passiveIncome: rf(100000, 600000), retainedEarnings: rf(1000000, 12000000), corpInvestments: rf(1000000, 10000000), valuation: { ebitda: rf(200000, 3000000), ebitdaMultiple: rf(4, 9), revenue: rf(1000000, 20000000), revenueMultiple: rf(0.8, 2.5) }, sale: { proceeds: rf(2000000, 30000000), acb: rf(0, 1000000), owners: ri(1, 4) } });
    policies(c, a, { life: rf(2000000, 15000000), di: rf(100000, 300000), ci: rf(100000, 500000) }); if (b) policies(c, b, { life: rf(1000000, 5000000) });
    investmentProduct(c, a, 0); investmentProduct(c, a, 0); if (b) investmentProduct(c, b, 0);
    for (let i = 0; i < ri(0, 3); i++) c.dependents.push(M.newDependent({ id: idc(), name: 'Enfant' + i, age: ri(0, 22), educationGoalAge: 18 }));
    expenses(c, rf(150000, 600000)); crm(c, 3);
    c.goals.push(M.newGoal({ id: idc(), type: 'retirement', amount: rf(150000, 500000), targetAge: a.retirementAge }), M.newGoal({ id: idc(), type: 'estate', name: 'Legs', amount: rf(1000000, 10000000), targetAge: a.lifeExpectancy }));
    return c;
  },
  // 4. blended family: two incomes, four dependents, alimony, two mortgages, debts
  blendedFamily(co, re) {
    const c = base('Famille recomposée', co, re); const a = c.members[0]; a.currentAge = ri(35, 52); a.retirementAge = ri(60, 67); a.lifeExpectancy = ri(85, 95);
    const b = spouse(c, a.currentAge - ri(-6, 8), ri(60, 67), ri(85, 97));
    c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'employment', amount: rf(55000, 140000), growth: 0.025 }), M.newIncome({ id: idc(), memberId: b.id, type: 'employment', amount: rf(35000, 120000), growth: 0.025 }));
    c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'other', label: 'Pension alimentaire', amount: rf(6000, 24000), growth: 0, endAge: a.currentAge + ri(3, 12), taxable: chance(0.5) }));
    govBenefits(c, a, co); govBenefits(c, b, co);
    for (let i = 0; i < ri(3, 5); i++) c.dependents.push(M.newDependent({ id: idc(), name: 'Enfant' + i, age: ri(1, 19), educationGoalAge: pick([17, 18]), financiallyDependent: chance(0.9) }));
    accounts(c, a, co, { deferred: rf(40000, 300000), taxfree: rf(5000, 60000), edu: rf(5000, 60000), contrib: rf(3000, 15000) }); accounts(c, b, co, { deferred: rf(10000, 200000), taxfree: rf(0, 40000), contrib: rf(0, 8000) });
    property(c, a, rf(350000, 900000), rf(0.5, 0.9)); if (chance(0.5)) property(c, b, rf(250000, 600000), rf(0.4, 0.85));
    c.liabilities.push(M.newLiability({ id: idc(), type: 'credit', label: 'Cartes', balance: rf(2000, 30000), rate: rf(0.12, 0.22), payment: rf(150, 900) }));
    if (chance(0.6)) c.liabilities.push(M.newLiability({ id: idc(), type: 'loan', label: 'Auto', balance: rf(8000, 50000), rate: rf(0.05, 0.1), payment: rf(250, 800) }));
    policies(c, a, { life: rf(250000, 1000000), di: chance(0.5) ? rf(40000, 90000) : 0 }); policies(c, b, { life: rf(100000, 750000) });
    expenses(c, rf(60000, 130000)); crm(c, 1);
    c.goals.push(M.newGoal({ id: idc(), type: 'education', name: 'Études — Enfant0', amount: rf(40000, 100000), targetAge: 18 }));
    return c;
  },
  // 5. self-employed professional with QPIP, home office, saving aggressively in FHSA/TFSA
  selfEmployed(co, re) {
    const c = base('Autonome', co, re); const a = c.members[0]; a.currentAge = ri(27, 55); a.retirementAge = ri(55, 70); a.lifeExpectancy = ri(85, 96); a.employmentStatus = 'self';
    c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'self', label: 'Honoraires nets', amount: rf(40000, 320000), growth: rf(0.02, 0.06) }));
    govBenefits(c, a, co);
    accounts(c, a, co, { deferred: rf(0, 400000), taxfree: rf(0, 100000), taxable: rf(0, 250000), contrib: rf(0, 30000) });
    if (chance(0.5)) property(c, a, rf(300000, 1200000), rf(0.4, 0.95));
    if (chance(0.5)) c.liabilities.push(M.newLiability({ id: idc(), type: 'loan', label: 'Prêt étudiant', balance: rf(5000, 90000), rate: rf(0.03, 0.08), payment: rf(150, 800) }));
    c.business = chance(0.5) ? M.newBusiness({ name: 'Pratique', structure: 'sole', ownerId: a.id, activeIncome: rf(60000, 350000), passiveIncome: 0, retainedEarnings: 0, corpInvestments: 0, valuation: { ebitda: rf(30000, 200000), ebitdaMultiple: rf(1, 4), revenue: rf(80000, 500000), revenueMultiple: rf(0.3, 1.5) }, sale: { proceeds: rf(0, 800000), acb: 0, owners: 1 } }) : null;
    policies(c, a, { di: rf(36000, 120000), life: chance(0.6) ? rf(200000, 1000000) : 0, ci: chance(0.4) ? rf(50000, 150000) : 0 });
    expenses(c, rf(35000, 120000)); crm(c, 1);
    if (chance(0.5)) c.goals.push(M.newGoal({ id: idc(), type: 'purchase', name: 'Première propriété', amount: rf(50000, 150000), targetAge: a.currentAge + ri(2, 8) }));
    return c;
  },
  // 6. FIRE saver: high income, tiny expenses, retire at 40-50, long horizon
  fire(co, re) {
    const c = base('FIRE', co, re); const a = c.members[0]; a.currentAge = ri(26, 42); a.retirementAge = ri(a.currentAge + 3, 52); a.lifeExpectancy = ri(92, 105);
    c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'employment', amount: rf(120000, 400000), growth: 0.04 }));
    govBenefits(c, a, co, 0.6);
    accounts(c, a, co, { deferred: rf(100000, 900000), taxfree: rf(50000, 150000), taxable: rf(100000, 2500000), contrib: rf(25000, 35000) });
    expenses(c, rf(25000, 55000), false); crm(c, 0);
    c.goals.push(M.newGoal({ id: idc(), type: 'retirement', amount: rf(40000, 90000), targetAge: a.retirementAge }));
    return c;
  },
  // 7. single parent, disability claim in progress, RDSP child
  singleParent(co, re) {
    const c = base('Parent seul', co, re); const a = c.members[0]; a.currentAge = ri(30, 55); a.retirementAge = ri(62, 70); a.lifeExpectancy = ri(82, 95); c.household.maritalStatus = pick(['single', 'divorced', 'widowed']);
    c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'employment', amount: rf(28000, 95000), growth: 0.02 }));
    if (chance(0.4)) c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'other', label: 'Prestation invalidité', amount: rf(12000, 40000), growth: 0.01, endAge: a.currentAge + ri(1, 5), taxable: chance(0.5) }));
    govBenefits(c, a, co);
    for (let i = 0; i < ri(1, 3); i++) c.dependents.push(M.newDependent({ id: idc(), name: 'Enfant' + i, age: ri(0, 17), educationGoalAge: 18 }));
    accounts(c, a, co, { deferred: rf(0, 120000), taxfree: rf(0, 40000), edu: rf(0, 30000), contrib: rf(0, 6000) });
    if (chance(0.5)) property(c, a, rf(250000, 550000), rf(0.6, 0.95));
    c.liabilities.push(M.newLiability({ id: idc(), type: 'credit', label: 'Cartes', balance: rf(500, 15000), rate: rf(0.18, 0.24), payment: rf(50, 400) }));
    policies(c, a, { life: rf(100000, 600000), di: chance(0.5) ? rf(24000, 60000) : 0 });
    expenses(c, rf(30000, 75000)); crm(c, 1);
    return c;
  },
  // 8. cross-border / snowbird with US property and US-situs assets
  snowbird(co, re) {
    const c = ARCHETYPES.retiredCouple(co, re); c.name = 'Snowbirds';
    c.assets.push(M.newAsset({ id: idc(), ownerId: c.members[0].id, type: 'realestate', label: 'Condo Floride', value: rf(250000, 900000), costBasis: rf(150000, 500000), growth: 0.03 }));
    c.assets.push(M.newAsset({ id: idc(), ownerId: c.members[0].id, type: 'nonreg', label: 'Titres US', value: rf(100000, 1500000), costBasis: rf(50000, 500000), growth: 0.06 }));
    c.calc = { crossborder: { daysThis: ri(90, 200), daysLast: ri(90, 200), days2Ago: ri(60, 200) } };
    return c;
  },
  // 9. farm family
  farm(co, re) {
    const c = ARCHETYPES.entrepreneurCouple(co, re); c.name = 'Ferme familiale';
    c.business.name = 'Ferme'; c.business.structure = pick(['incorporated', 'partnership']);
    c.assets.push(M.newAsset({ id: idc(), ownerId: c.members[0].id, type: 'realestate', label: 'Terres', value: rf(1000000, 8000000), costBasis: rf(100000, 1500000), growth: 0.03 }));
    return c;
  },
  // 10. young renter with student debt and nothing else
  youngRenter(co, re) {
    const c = base('Jeune locataire', co, re); const a = c.members[0]; a.currentAge = ri(22, 32); a.retirementAge = ri(60, 70); a.lifeExpectancy = ri(85, 100);
    c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'employment', amount: rf(25000, 80000), growth: 0.035 }));
    govBenefits(c, a, co, 0.7);
    if (chance(0.7)) c.liabilities.push(M.newLiability({ id: idc(), type: 'loan', label: 'Prêt étudiant', balance: rf(5000, 60000), rate: rf(0.03, 0.07), payment: rf(100, 600) }));
    if (chance(0.5)) accounts(c, a, co, { taxfree: rf(0, 25000), contrib: rf(0, 7000) });
    expenses(c, rf(22000, 50000), chance(0.5)); crm(c, 1);
    return c;
  },
  // 11. widow(er) with insurance proceeds, no employment income, dependents
  widow(co, re) {
    const c = base('Veuve', co, re); const a = c.members[0]; a.currentAge = ri(45, 70); a.retirementAge = Math.min(a.currentAge, 65); a.lifeExpectancy = ri(85, 100); c.household.maritalStatus = 'widowed';
    if (chance(0.5)) c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'pension', label: 'Rente de conjoint survivant', amount: rf(8000, 40000), growth: 0.015 }));
    govBenefits(c, a, co);
    accounts(c, a, co, { deferred: rf(50000, 700000), taxfree: rf(20000, 150000), taxable: rf(300000, 2500000) });
    property(c, a, rf(300000, 1200000), 0);
    for (let i = 0; i < ri(0, 3); i++) c.dependents.push(M.newDependent({ id: idc(), name: 'Enfant' + i, age: ri(5, 22), educationGoalAge: 18 }));
    expenses(c, rf(40000, 120000)); crm(c, 1);
    return c;
  },
  // 12. LEGACY / dirty file: old insurance[] rows, products with drifted AUM, missing dob, string numbers, nulls
  legacy(co, re) {
    const c = pick([ARCHETYPES.entrepreneurCouple, ARCHETYPES.blendedFamily, ARCHETYPES.retiredCouple])(co, re); c.name = 'Dossier hérité';
    const a = c.members[0];
    c.insurance = [M.newInsurance({ id: idc(), type: pick(['life', 'di', 'ci']), insuredId: a.id, coverage: rf(50000, 800000), premium: rf(200, 3000) }), M.newInsurance({ id: idc(), type: 'life', insuredId: a.id, coverage: rf(50000, 800000), premium: rf(200, 3000) })];
    c.products.push(M.newProduct({ id: idc(), kind: 'investment', aum: rf(10000, 900000), insuredId: a.id }));
    for (const m of c.members) delete m.dob;
    if (chance(0.5)) c.assumptions = { preReturn: '0.06', inflation: null, rriffConvertAge: 70, mcTrials: '300' };
    if (chance(0.5)) c.incomes[0].amount = String(c.incomes[0].amount);
    if (chance(0.3)) c.liabilities.push({ id: idc(), type: 'mortgage', balance: rf(50000, 400000), rate: rf(0.03, 0.07), payment: rf(500, 2500) });   // missing fields
    if (chance(0.3)) c.crm = { lifecycle: 'client', lastContactAt: Date.now(), tags: null };
    delete c.calc; delete c.snapshots;
    return c;
  },
  // 13. EXTREMES: huge / tiny / edge ages
  extreme(co, re) {
    const c = base('Extrême', co, re); const a = c.members[0];
    const mode = pick(['huge', 'tiny', 'old', 'young', 'longlife', 'negative']);
    a.currentAge = mode === 'old' ? ri(85, 99) : mode === 'young' ? 18 : ri(30, 70);
    a.retirementAge = mode === 'old' ? 65 : mode === 'young' ? ri(19, 25) : ri(a.currentAge, 75);
    a.lifeExpectancy = mode === 'longlife' ? ri(105, 115) : Math.max(a.currentAge + 1, ri(70, 100));
    const k = mode === 'huge' ? 100 : mode === 'tiny' ? 0.01 : 1;
    c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'employment', amount: rf(50000, 200000) * k, growth: 0.02 }));
    govBenefits(c, a, co);
    accounts(c, a, co, { deferred: rf(0, 1000000) * k, taxfree: rf(0, 100000) * k, taxable: rf(0, 1000000) * k, contrib: rf(0, 30000) * k });
    property(c, a, rf(200000, 2000000) * k, mode === 'negative' ? 1.4 : rf(0, 0.8));
    if (mode === 'negative') c.liabilities.push(M.newLiability({ id: idc(), type: 'loan', balance: rf(100000, 800000), rate: 0.09, payment: rf(1000, 4000) }));
    expenses(c, rf(30000, 200000) * (mode === 'tiny' ? 0.01 : 1)); crm(c, 0);
    return c;
  },
  // 15. divorced with support payments both ways, split assets, shared kids
  divorced(co, re) {
    const c = base('Divorcé·e', co, re); const a = c.members[0]; a.currentAge = ri(38, 60); a.retirementAge = ri(60, 70); a.lifeExpectancy = ri(84, 96); c.household.maritalStatus = 'divorced'; c.filingStatus = 'single';
    c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'employment', amount: rf(45000, 180000), growth: 0.025 }));
    if (chance(0.6)) c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'other', label: 'Pension alimentaire reçue', amount: rf(6000, 30000), growth: 0, endAge: a.currentAge + ri(2, 10), taxable: chance(0.5) }));
    if (chance(0.6)) c.expenses.push(M.newExpense({ id: idc(), label: 'Pension alimentaire versée', amount: rf(6000, 36000), category: 'other', growth: 0, retirementFactor: 0 }));
    govBenefits(c, a, co);
    for (let i = 0; i < ri(1, 3); i++) c.dependents.push(M.newDependent({ id: idc(), name: 'Enfant' + i, age: ri(2, 17), educationGoalAge: 18, financiallyDependent: chance(0.7) }));
    accounts(c, a, co, { deferred: rf(20000, 400000) * 0.5, taxfree: rf(0, 80000), taxable: rf(0, 150000), edu: rf(0, 40000), contrib: rf(0, 15000) });
    if (chance(0.6)) property(c, a, rf(300000, 800000), rf(0.5, 0.9));
    if (chance(0.5)) c.liabilities.push(M.newLiability({ id: idc(), type: 'loan', label: 'Prêt (égalisation)', balance: rf(20000, 150000), rate: rf(0.05, 0.09), payment: rf(400, 2000) }));
    policies(c, a, { life: rf(200000, 1000000), di: chance(0.5) ? rf(30000, 90000) : 0 });
    expenses(c, rf(40000, 110000)); crm(c, 1);
    c.goals.push(M.newGoal({ id: idc(), type: 'education', name: 'Études — Enfant0', amount: rf(30000, 90000), targetAge: 18 }));
    return c;
  },
  // 16. public-sector couple with indexed DB pensions and bridge benefits, early retirement
  dbPension(co, re) {
    const c = base('Régime à prestations déterminées', co, re); const a = c.members[0]; a.currentAge = ri(50, 64); a.retirementAge = ri(55, 62); a.lifeExpectancy = ri(88, 98);
    const b = chance(0.7) ? spouse(c, a.currentAge - ri(-3, 5), ri(55, 65), ri(88, 99)) : null;
    c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'employment', amount: rf(70000, 140000), growth: 0.025 }));
    c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'dbpension', label: 'RREGOP', amount: rf(35000, 90000), growth: 0.015, startAge: a.retirementAge }));
    if (chance(0.7)) c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'dbpension', label: 'Rente de raccordement', amount: rf(5000, 12000), growth: 0, startAge: a.retirementAge, endAge: 65 }));
    if (b) { c.incomes.push(M.newIncome({ id: idc(), memberId: b.id, type: pick(['employment', 'self']), amount: rf(40000, 110000), growth: 0.02 })); if (chance(0.5)) c.incomes.push(M.newIncome({ id: idc(), memberId: b.id, type: 'dbpension', amount: rf(15000, 50000), growth: 0.015, startAge: b.retirementAge })); }
    govBenefits(c, a, co); if (b) govBenefits(c, b, co);
    accounts(c, a, co, { deferred: rf(20000, 250000), taxfree: rf(40000, 130000), taxable: rf(0, 200000), contrib: rf(0, 8000) }); if (b) accounts(c, b, co, { deferred: rf(50000, 500000), taxfree: rf(0, 100000), contrib: rf(0, 15000) });
    property(c, a, rf(350000, 1000000), chance(0.5) ? rf(0.05, 0.4) : 0);
    policies(c, a, { life: chance(0.6) ? rf(100000, 500000) : 0 });
    expenses(c, rf(50000, 120000)); crm(c, 1);
    return c;
  },
  // 17. rental investor: several income properties, big mortgages, HELOC leverage, rental income
  rentalInvestor(co, re) {
    const c = base('Investisseur immobilier', co, re); const a = c.members[0]; a.currentAge = ri(32, 62); a.retirementAge = ri(55, 70); a.lifeExpectancy = ri(85, 97);
    const b = chance(0.5) ? spouse(c, a.currentAge - ri(-4, 4), ri(58, 68), ri(88, 98)) : null;
    c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: pick(['employment', 'self']), amount: rf(50000, 200000), growth: 0.025 }));
    const n = ri(2, 6); let rent = 0;
    for (let i = 0; i < n; i++) { const v = rf(250000, 1500000); property(c, a, v, rf(0.4, 0.85), rf(0.045, 0.07)); rent += v * rf(0.03, 0.06); }
    c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'rental', label: `Loyers nets (${n} immeubles)`, amount: rent, growth: 0.025 }));
    if (b) c.incomes.push(M.newIncome({ id: idc(), memberId: b.id, type: 'employment', amount: rf(30000, 100000), growth: 0.02 }));
    c.liabilities.push(M.newLiability({ id: idc(), type: 'heloc', label: 'Marge (mises de fonds)', balance: rf(50000, 400000), rate: rf(0.06, 0.085), payment: rf(500, 3000) }));
    govBenefits(c, a, co); if (b) govBenefits(c, b, co);
    accounts(c, a, co, { deferred: rf(0, 300000), taxfree: rf(0, 100000), taxable: rf(0, 200000), contrib: rf(0, 12000) });
    policies(c, a, { life: rf(500000, 3000000), di: chance(0.4) ? rf(40000, 100000) : 0 });
    c.calc = { realestate: { price: rf(300000, 900000), rent: rf(1500, 4500), down: rf(0.2, 0.35) } };
    expenses(c, rf(50000, 140000)); crm(c, 2);
    return c;
  },
  // 18. family with a child eligible for the DTC (RDSP), caregiver income drop, LTC for a parent
  disabledChild(co, re) {
    const c = base('Famille — enfant handicapé', co, re); const a = c.members[0]; a.currentAge = ri(34, 56); a.retirementAge = ri(60, 68); a.lifeExpectancy = ri(85, 96);
    const b = chance(0.8) ? spouse(c, a.currentAge - ri(-4, 4), ri(60, 68), ri(86, 98)) : null;
    c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'employment', amount: rf(45000, 150000), growth: 0.025 }));
    if (b) c.incomes.push(M.newIncome({ id: idc(), memberId: b.id, type: 'employment', amount: rf(0, 60000), growth: 0.02 }));
    govBenefits(c, a, co); if (b) govBenefits(c, b, co);
    c.dependents.push(M.newDependent({ id: idc(), name: 'Enfant DTC', age: ri(1, 30), educationGoalAge: 18, financiallyDependent: true, relationship: 'child' }));
    for (let i = 0; i < ri(0, 2); i++) c.dependents.push(M.newDependent({ id: idc(), name: 'Enfant' + i, age: ri(1, 17), educationGoalAge: 18 }));
    if (chance(0.5)) c.dependents.push(M.newDependent({ id: idc(), name: 'Parent âgé', age: ri(75, 92), relationship: 'parent', financiallyDependent: chance(0.5) }));
    accounts(c, a, co, { deferred: rf(20000, 400000), taxfree: rf(0, 80000), edu: rf(0, 50000), contrib: rf(0, 15000) });
    if (co === 'CA') c.assets.push(M.newAsset({ id: idc(), ownerId: a.id, type: 'rdsp', label: 'REEI', value: rf(0, 150000), costBasis: rf(0, 50000), growth: 0.05, annualContribution: rf(0, 5000) }));
    property(c, a, rf(300000, 900000), rf(0.3, 0.85));
    c.calc = { rdsp: { beneficiaryAge: ri(1, 30), annualContribution: rf(0, 5000), familyIncome: rf(40000, 200000) }, ltc: { age: ri(75, 90), monthlyCost: rf(3000, 9000), years: ri(2, 8) } };
    policies(c, a, { life: rf(300000, 2000000), di: rf(40000, 100000), ci: chance(0.5) ? rf(50000, 200000) : 0 }); if (b) policies(c, b, { life: rf(100000, 800000) });
    c.expenses.push(M.newExpense({ id: idc(), label: 'Soins et thérapies', amount: rf(5000, 40000), category: 'health', growth: 0.03, retirementFactor: 1 }));
    expenses(c, rf(50000, 130000)); crm(c, 1);
    return c;
  },
  // 19. CHAOS: any archetype with random fields corrupted (null, '', text, negative, absurd) — the app must still render
  chaos(co, re) {
    const keys = ['entrepreneurCouple', 'retiredCouple', 'hnw', 'blendedFamily', 'selfEmployed', 'fire', 'singleParent', 'snowbird', 'farm', 'youngRenter', 'widow', 'divorced', 'dbPension', 'rentalInvestor', 'disabledChild'];
    const c = ARCHETYPES[pick(keys)](co, re); c.name = 'Chaos';
    const POISON = [null, '', 'abc', -1, 1e12, 0, '12abc', [], {}, true, '1e3', '  42 '];
    const FIELDS = ['amount', 'value', 'costBasis', 'growth', 'balance', 'rate', 'payment', 'extraPayment', 'currentAge', 'retirementAge', 'lifeExpectancy', 'age', 'faceAmount', 'premium', 'aum', 'coverage', 'targetAge', 'startAge', 'endAge', 'annualContribution', 'employerMatch', 'probability', 'educationGoalAge', 'amortizationYears', 'retirementFactor'];
    const ARRAYS = ['members', 'incomes', 'expenses', 'assets', 'liabilities', 'goals', 'dependents', 'products', 'opportunities'];
    for (let k = 0; k < ri(3, 10); k++) {
      const arr = c[pick(ARRAYS)]; if (!arr || !arr.length) continue;
      const row = pick(arr); const field = pick(FIELDS);
      if (chance(0.15)) delete row[field]; else row[field] = pick(POISON);
    }
    if (chance(0.3)) c.assumptions = Object.assign(c.assumptions || {}, { [pick(['preReturn', 'postReturn', 'inflation', 'returnStdev', 'mcTrials', 'spendingLevel', 'rrifConvertAge'])]: pick(POISON) });
    if (chance(0.2)) c.filingStatus = pick(POISON);
    if (chance(0.2)) c.calc = pick([null, {}, { decumulation: { spending: pick(POISON), bracketTarget: pick(POISON) } }, { budget: pick(POISON) }]);
    return c;
  },
  // 14. tiny/empty variants
  minimal(co, re) {
    const c = base('Minimal', co, re); const a = c.members[0]; a.currentAge = ri(20, 80); a.retirementAge = ri(55, 75); a.lifeExpectancy = ri(a.currentAge + 1, 100);
    if (chance(0.5)) c.incomes.push(M.newIncome({ id: idc(), memberId: a.id, type: 'employment', amount: rf(0, 100000) }));
    if (chance(0.5)) c.expenses.push(M.newExpense({ id: idc(), amount: rf(0, 60000) }));
    if (chance(0.3)) accounts(c, a, co, { deferred: rf(0, 100000) });
    return c;
  },
};
const ARCH_KEYS = Object.keys(ARCHETYPES);

function generate(i) {
  R = rngOf(0x9E3779B1 ^ (i * 2654435761));
  const key = ARCH_KEYS[i % ARCH_KEYS.length];
  const [co, re] = pick(JURIS);
  const c = ARCHETYPES[key](co, re);
  return { key, co, re, client: normalize(c) };
}

// ---------- timing ----------
const times = {};
function timed(name, fn) { const t0 = performance.now(); const r = fn(); (times[name] = times[name] || []).push(performance.now() - t0); return r; }
const pctl = (arr, p) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; };

// ---------- per-file checks ----------
function checkFile(f, i) {
  const { key, co, re, client } = f; const ctx = `${key}#${i} ${co}/${re}`;
  const jur = getJurisdiction(co, re);

  // normalisation idempotence + export/import round trip
  const snap = JSON.stringify(client); syncDerived(client);
  okc(JSON.stringify(client) === snap, 'normalize not idempotent', ctx);
  const rt = normalize(JSON.parse(JSON.stringify(client)));
  okc(JSON.stringify(rt) === JSON.stringify(client), 'export→import changes the file', ctx);

  // facts
  const F = timed('facts', () => FX.clientFacts(client, jur));
  scanFinite('facts.household', F.household, ctx); scanFinite('facts.buckets', F.buckets, ctx);
  okc(Math.abs(F.household.tax - F.members.reduce((s, m) => s + m.tax.total, 0)) < 0.01, 'household tax ≠ Σ member tax', ctx);
  okc(Math.abs(F.netWorth.netWorth - (F.netWorth.assets - F.netWorth.liabilities)) < 0.01, 'net worth identity', ctx);
  okc(F.members.every(m => m.rrspRoom >= 0 && m.rrspRoom <= (m.rrspLimit || Infinity) + 1e-6), 'rrsp room out of bounds', ctx);
  // CA: 50 % inclusion ⇒ gains marginal ≤ ordinary. US: long-term gains (15-20 % + NIIT + state) can
  // exceed a 10-12 % ordinary bracket, so only bound them. UK: 18/24 % < 20/40/45 %.
  okc(F.members.every(m => m.marginal.ordinary >= 0 && m.marginal.ordinary <= 0.9 && m.marginal.capgains >= 0 && (co === 'US' ? m.marginal.capgains <= 0.6 : m.marginal.capgains <= m.marginal.ordinary + 1e-9)), 'marginal rates incoherent', ctx);
  okc(Object.values(F.coverage).every(cv => cv.life >= 0 && cv.di >= 0), 'negative coverage', ctx);
  okc(F.premiums >= 0 && F.aum >= 0, 'negative premiums/aum', ctx);

  // projection
  const p = timed('projection', () => P.runProjection(client));
  scanFinite('summary', p.summary, ctx);
  const rows = p.rows; okc(rows.length >= 1, 'no rows', ctx);
  let idNW = true, idFlow = true, idTax = true, nonneg = true, sfOk = true, defl = true, splitOk = true, wdOk = true;
  for (let y = 0; y < rows.length; y++) {
    const r = rows[y];
    if (!(isFin(r.tax) && isFin(r.netWorth) && isFin(r.investable) && isFin(r.grossIncome))) { nonneg = false; break; }
    if (Math.abs(r.assetsTotal - r.liabilitiesTotal - r.netWorth) > 0.01) idNW = false;
    if (y > 0) { const implied = rows[y - 1].investable * (1 + r.detReturn) + r.netFlow; if (Math.abs(implied - r.investable) > Math.max(1, Math.abs(r.investable) * 1e-9)) idFlow = false; }
    const mt = Object.values(r.byMember).reduce((s, m) => s + m.tax, 0); if (Math.abs(mt - r.tax) > 1) idTax = false;
    if (Object.values(r.balances).some(v => v < -0.01) || r.tax < -0.01 || r.oasClawback < -0.01 || r.forced < -0.01) nonneg = false;
    if (r.shortfall > 0.5 && !r.primaryRetired) sfOk = false;
    if (y > 0 && !(r.deflator <= rows[y - 1].deflator + 1e-12)) defl = false;
    if (r.pensionSplit > 0 && client.filingStatus !== 'married') splitOk = false;
    if (r.withdrawals.deferred < -0.01 || r.withdrawals.taxable < -0.01 || r.withdrawals.taxfree < -0.01) wdOk = false;
  }
  okc(idNW, 'net worth ≠ assets − liabilities in some year', ctx);
  okc(idFlow, 'investable flow identity broken', ctx);
  okc(idTax, 'row tax ≠ Σ member tax', ctx);
  okc(nonneg, 'negative balance/tax or non-finite row', ctx);
  okc(sfOk, 'shortfall before retirement', ctx);
  okc(defl, 'deflator not decreasing', ctx);
  okc(splitOk, 'pension split on a single', ctx);
  okc(wdOk, 'negative withdrawal', ctx);
  okc(p.summary.totalLifetimeTax >= 0 && p.summary.totalOasClawback >= 0, 'negative lifetime tax', ctx);
  // determinism
  const p2 = P.runProjection(client);
  okc(p2.summary.finalNetWorth === p.summary.finalNetWorth && p2.summary.totalLifetimeTax === p.summary.totalLifetimeTax, 'projection not deterministic', ctx);
  // splitting never increases tax (couples)
  if (client.filingStatus === 'married' && client.members.length >= 2 && i % 5 === 0) {
    const c2 = JSON.parse(JSON.stringify(client)); c2.assumptions.pensionSplitting = false;
    okc(p.summary.totalLifetimeTax <= P.runProjection(c2).summary.totalLifetimeTax + 1e-6, 'pension splitting increased lifetime tax', ctx);
  }

  // Monte Carlo (reduced trials for scale)
  const mc = timed('montecarlo', () => MC.runMonteCarlo(client, { trials: TRIALS }));
  okc(mc.successRate >= 0 && mc.successRate <= 1 && isFin(mc.medianFinal) && isFin(mc.p10Final) && isFin(mc.p90Final), 'MC out of range', ctx);
  okc(mc.bands.every(b => b.p10 <= b.p25 + 1e-6 && b.p25 <= b.p50 + 1e-6 && b.p50 <= b.p75 + 1e-6 && b.p75 <= b.p90 + 1e-6), 'MC bands unordered', ctx);
  okc(MC.runMonteCarlo(client, { trials: TRIALS }).successRate === mc.successRate, 'MC not reproducible', ctx);

  // retirement facts / health / integrity
  const RF = timed('retirementFacts', () => FX.retirementFacts(client, jur));
  scanFinite('retirementFacts', { a: RF.taxableIncome, b: RF.marginalRate, c: RF.spending, d: RF.finalNetWorth }, ctx);
  const H = timed('healthcheck', () => HC.healthCheck(client, jur));
  okc(H.overallScore >= 0 && H.overallScore <= 100 && /^[A-E]$/.test(H.grade) && H.categories.every(c => c.score >= 0 && c.score <= 100), 'health score out of range', ctx);
  const I = timed('integrity', () => IG.integrityChecks(client, jur));
  okc(I.score >= 0 && I.score <= 100 && Array.isArray(I.findings), 'integrity out of range', ctx);

  // decumulation from file-derived params
  const prim = F.primary;
  if (prim) {
    const d = timed('decumulation', () => DEC.compareDecumulation(jur, { startAge: Math.max(prim.age, prim.retirementAge), endAge: Math.max(prim.lifeExpectancy, prim.age + 1), deferred: F.buckets.deferred, tfsa: F.buckets.taxfree, nonreg: F.buckets.taxable, nonregBasis: F.buckets.basisTaxable, otherIncomeNow: prim.pensionIncome, pensionIncomeNow: prim.pensionIncome, cppAnnual: F.pensions[prim.id]?.cpp.annual || 0, cppStartAge: F.pensions[prim.id]?.cpp.startAge || 65, oasAnnual: F.pensions[prim.id]?.oas.annual || 0, spending: F.household.expenses, inflation: F.assumptions.inflation, returnRate: F.assumptions.postReturn }));
    okc(d.results.every(r => isFin(r.totalTax) && isFin(r.finalEstate) && r.totalTax >= -0.01 && r.rows.every(x => x.estate <= (x.deferred + x.tfsa + x.nonreg) * (1 + 1e-9) + 0.01)), 'decumulation invariants', ctx);
    okc(d.best === d.results.reduce((b, r) => r.finalEstate > b.finalEstate ? r : b, d.results[0]).strategy, 'compareDecumulation.best is not the max-estate strategy', ctx);
    // "best result" oracle: the bracket-target search must never do worse than the default target
    if (co === 'CA' && F.buckets.deferred > 0 && i % 3 === 0) {
      const params = { startAge: Math.max(prim.age, prim.retirementAge), endAge: Math.max(prim.lifeExpectancy, prim.age + 1), deferred: F.buckets.deferred, tfsa: F.buckets.taxfree, nonreg: F.buckets.taxable, nonregBasis: F.buckets.basisTaxable, otherIncomeNow: prim.pensionIncome, pensionIncomeNow: prim.pensionIncome, cppAnnual: F.pensions[prim.id]?.cpp.annual || 0, oasAnnual: F.pensions[prim.id]?.oas.annual || 0, spending: F.household.expenses, inflation: F.assumptions.inflation, returnRate: F.assumptions.postReturn };
      const opt = timed('bracketOpt', () => DEC.optimizeBracketTarget(jur, params));
      const sfOf = (r) => r.rows.filter(x => x.shortfall > 0.5).length;
      const dflt = ['meltdown', 'tfsaPreserve'].map(st => DEC.simulateDecumulation(jur, params, st)).reduce((b, r) => (sfOf(r) < sfOf(b) || (sfOf(r) === sfOf(b) && r.finalEstate > b.finalEstate)) ? r : b);
      okc(opt.target >= 20000 && opt.target <= 150000 && isFin(opt.finalEstate), 'bracket target out of range', ctx);
      okc(opt.shortfallYears < sfOf(dflt) || (opt.shortfallYears === sfOf(dflt) && opt.finalEstate >= dflt.finalEstate - 0.5), 'optimised bracket target worse than the default', ctx);
      okc(opt.grid.every(g => !(g.shortfallYears < opt.shortfallYears) && !(g.shortfallYears === opt.shortfallYears && g.finalEstate > opt.finalEstate + 0.5)), 'a grid point beats the reported optimum', ctx);
    }
  }
  // benefits: deferral bonus ⇒ annual benefit non-decreasing in the claim age; cumulative columns agree with the chart series
  for (const key of ['cpp', 'oas']) {
    const pen = jur.pensions?.[key]; if (!pen || !(pen.maxAnnual > 0)) continue;
    const [lo, hi] = BEN.claimWindow(pen); let mono = true;
    for (let a = lo; a < hi; a++) if (BEN.benefitAtAge(pen, a + 1) < BEN.benefitAtAge(pen, a) - 1e-9) mono = false;
    okc(mono, `${key} benefit decreases with a later claim`, ctx);
    const ages = []; for (let a = lo; a <= hi; a++) ages.push(a);
    const an = BEN.claimingAnalysis(pen, ages, prim ? prim.lifeExpectancy : 90);
    const le = prim ? prim.lifeExpectancy : 90;
    okc(an.rows.every(r => { const ser = BEN.buildCumulativeSeries(pen, r.age, r.age, Math.max(le, r.age)); return Math.abs(r.cumulative - (le > r.age ? ser[ser.length - 1] : 0)) < 1e-6; }), `${key} cumulative ≠ chart series`, ctx);
    okc(an.rows.every(r => r.presentValue <= r.cumulative + 1e-6) && an.recommendedAge === an.rows.reduce((b, r) => r.cumulative > b.cumulative ? r : b, an.rows[0]).age, `${key} recommendation is not the argmax`, ctx);
  }

  // optimisation & suggestions
  const sp = timed('optimize', () => OPT.incomeSplitting(client, jur));
  okc(!sp.applicable || (sp.savings >= 0 && sp.optimized <= sp.current + 1e-6), 'splitting increases tax', ctx);
  const rv = OPT.rrspVsTfsa(client, jur); okc(isFin(rv.currentMarginal) && isFin(rv.retireMarginal), 'rrspVsTfsa non-finite', ctx);
  const sg = timed('suggestions', () => SUG.suggestGoals(client, jur));
  okc(Array.isArray(sg) && sg.every(s => isFin(s.amount) && s.name), 'suggestions malformed', ctx);
  for (const m of client.members) { const ln = AN.lifeInsuranceNeeds(client, m.id); okc(ln.need >= 0 && ln.gap >= 0 && ln.gap <= ln.need + 1e-6, 'life needs incoherent', ctx); }

  // corporate integration ties
  if (client.business && co === 'CA') {
    const B = client.business;
    const svd = timed('corporate', () => CORP.salaryVsDividend(jur, Math.min(B.activeIncome, 250000) || 100000, prim ? prim.ordinary : 0, { otherActiveIncome: 0, passiveIncome: B.passiveIncome, age: prim ? prim.age : 45 }));
    okc(Math.abs(svd.salary.gross + svd.salary.employerCost - (Math.min(B.activeIncome, 250000) || 100000)) < 1, 'salary route ≠ profit', ctx);
    okc(Math.abs(svd.dividend.gross - ((Math.min(B.activeIncome, 250000) || 100000) - svd.dividend.corpTax)) < 1, 'dividend route ≠ profit − corp tax', ctx);
    const ct = CORP.corporateTaxCA(jur, B.activeIncome, B.passiveIncome); okc(ct.sbdLimit >= 0 && ct.sbdLimit <= jur.corporate.sbdLimit + 1e-6 && ct.activeTax >= 0, 'corporate tax bounds', ctx);
    const inc = SB.incorporationAnalysis(jur, { businessIncome: B.activeIncome, personalNeed: F.household.expenses, adminCost: 2500, age: prim ? prim.age : 45 }); okc(isFin(inc.netAdvantage) && inc.salary >= 0, 'incorporation non-finite', ctx);
  }

  // CRM
  const rep = timed('crm', () => CRM.revenueReport([client], 2026));
  okc(rep.reconciles && isFin(rep.recurring) && rep.aum >= 0, 'revenue report does not reconcile', ctx);
  const ps = CRM.pipelineSummary([client]); okc(ps.weightedPremium <= ps.openPremium + 1e-6 && ps.weightedAum <= ps.openAum + 1e-6 && ps.conversion >= 0 && ps.conversion <= 1, 'pipeline weights', ctx);
  const cs = CRM.complianceStatus(client); okc(cs.pct >= 0 && cs.pct <= 1, 'compliance pct', ctx);
  okc(Math.abs(CRM.clientAum(client) - F.aum) < 0.01, 'CRM AUM ≠ facts AUM', ctx);

  // monotone sensitivities (paired variants) on a subset
  if (i % 4 === 0) {
    const up = JSON.parse(JSON.stringify(client)); up.assumptions.spendingLevel = M.assumptionsOf(client).spendingLevel * 1.15;   // from the SANITISED value (a corrupted one is 1)
    okc(P.runProjection(normalize(up)).summary.finalNetWorth <= p.summary.finalNetWorth + 1, 'more spending raised final net worth', ctx);
    if (client.incomes.some(x => ['employment', 'self'].includes(x.type) && +x.amount > 0)) {
      const inc = JSON.parse(JSON.stringify(client)); inc.incomes.forEach(x => { if (['employment', 'self'].includes(x.type)) x.amount = +x.amount * 1.1; });
      okc(P.runProjection(normalize(inc)).summary.finalNetWorth >= p.summary.finalNetWorth - 1, 'more income lowered final net worth', ctx);
    }
  }
  return { key, complexity: client.assets.length + client.liabilities.length + client.products.length + client.incomes.length + client.members.length * 3 };
}

// ---------- --dump i : print one generated file (debugging a failure) ----------
if (args.dump != null) {
  const f = generate(+args.dump);
  const jur = getJurisdiction(f.co, f.re); const F = FX.clientFacts(f.client, jur);
  console.log(JSON.stringify({ key: f.key, co: f.co, re: f.re, members: F.members.map(m => ({ name: m.name, age: m.age, employmentIncome: m.employmentIncome, ordinary: m.ordinary, marginal: m.marginal, tax: m.tax.total })) }, null, 1));
  if (args.full) console.log(JSON.stringify(f.client, null, 1));
  process.exit(0);
}

// ---------- run ----------
const t0 = performance.now();
const VIEW_NAMES = ['crmdash', 'clients', 'pipeline', 'tasks', 'calendar', 'activities', 'relation', 'clienttimeline', 'crmsheet', 'revenue', 'referrals', 'segments', 'kyc', 'dashboard', 'healthcheck', 'profile', 'client', 'networth', 'nwtracker', 'cashflow', 'budget', 'debt', 'business', 'succession', 'empbenefits', 'flowthrough', 'insurancestrat', 'advstructures', 'incorporation', 'selfemployed', 'farm', 'sred', 'treasury', 'borrowing', 'portfolio', 'feecompare', 'realestate', 'rentbuy', 'crypto', 'retirement', 'decumulation', 'montecarlo', 'scenarios', 'strategycompare', 'tax', 'multitax', 'optimize', 'equity', 'benefits', 'insurance', 'insurancecompare', 'estate', 'philanthropy', 'crossborder', 'emigration', 'goals', 'education', 'rdsp', 'ltc', 'timeline', 'compliance', 'toolbox', 'reports', 'settings'];
let files = 0; const byArch = {}; const complex = [];
for (let i = SHARD; i < N; i += OF) {
  const f = generate(i);
  try { const r = checkFile(f, i); byArch[r.key] = (byArch[r.key] || 0) + 1; complex.push({ i, c: r.complexity, f }); }
  catch (e) { fails++; checks++; if (failLog.length < 80) failLog.push(`[${f.key}#${i} ${f.co}/${f.re}] THREW ${e.message} @ ${(e.stack || '').split('\n')[1]?.trim()}`); }
  files++;
  if (!QUIET && files % 500 === 0) console.log(`  shard ${SHARD}: ${files} files, ${checks} checks, ${fails} failures, ${((performance.now() - t0) / 1000).toFixed(0)}s`);
}

// ---------- views on the most complex files ----------
let viewRenders = 0;
if (JSDOM && VIEWS > 0) {
  const viewMods = {}; for (const v of VIEW_NAMES) viewMods[v] = await import(`../src/ui/views/${v}.js`);
  complex.sort((a, b) => b.c - a.c);
  const subset = complex.slice(0, VIEWS);
  for (const { i, f } of subset) {
    const jur = getJurisdiction(f.co, f.re);
    store.state.clients = [f.client]; store.state.activeId = f.client.id;
    for (const lang of (i % 3 === 0 ? ['fr', 'en'] : ['fr'])) {
      setLang(lang);
      for (const v of VIEW_NAMES) {
        const ctx = `${f.key}#${i} ${f.co}/${f.re} [${lang}] ${v}`;
        try {
          const node = timed('view', () => timed('view:' + v, () => viewMods[v].render({ store, client: f.client, jur, navigate: () => {} })));
          checks++; viewRenders++;
          if (!node || !node.nodeType) throw new Error('no node');
          const html = node.innerHTML || '';
          const bad = html.match(/(?:x|y|cx|cy|r|width|height|points|d|offset)="[^"]*(?:NaN|Infinity|undefined)[^"]*"/);
          if (bad) throw new Error('broken SVG attribute ' + bad[0].slice(0, 60));
          const txt = node.textContent || '';
          const badTxt = txt.match(/NaN|\[object Object\]|undefined/);
          if (badTxt) throw new Error('text contains ' + badTxt[0]);
        } catch (e) { fails++; if (failLog.length < 80) failLog.push(`[${ctx}] ${e.message}`); }
      }
    }
  }
}

// ---------- report ----------
const secs = (performance.now() - t0) / 1000;
const timing = Object.fromEntries(Object.entries(times).map(([k, arr]) => [k, { n: arr.length, p50: +pctl(arr, 0.5).toFixed(2), p95: +pctl(arr, 0.95).toFixed(2), max: +Math.max(...arr).toFixed(2), total: +arr.reduce((s, v) => s + v, 0).toFixed(0) }]));
// Speed budgets (p95, ms) — "the best results, and the fastest". Enforced with --budget
// (a laptop or CI box under load can be noisy, so they are opt-in for the full battery).
// Budgets are calibrated on an idle core; on a loaded or slower machine they are scaled by
// the measured speed of a fixed workload (20 000 Québec tax computations ≈ 20 ms idle).
const BUDGET_IDLE = { facts: 2, projection: 15, montecarlo: 15, retirementFacts: 15, healthcheck: 45, decumulation: 6, bracketOpt: 80, integrity: 2, optimize: 3, crm: 2, view: 80 };
const calib = (() => { const jq = getJurisdiction('CA', 'QC'); const inc = { ordinary: 85000, employmentIncome: 85000, employment: true, withPayroll: true, age: 45 }; for (let i = 0; i < 2000; i++) T.computeTax(jq, inc); const t = performance.now(); for (let i = 0; i < 20000; i++) T.computeTax(jq, inc); return performance.now() - t; })();
const speedScale = Math.max(1, calib / 20);
const BUDGET = Object.fromEntries(Object.entries(BUDGET_IDLE).map(([k, v]) => [k, +(v * speedScale).toFixed(1)]));
const budgetFails = [];
for (const [k, lim] of Object.entries(BUDGET)) if (timing[k] && timing[k].p95 > lim) budgetFails.push(`${k} p95 ${timing[k].p95} ms > budget ${lim} ms (idle budget ${BUDGET_IDLE[k]} × machine factor ${speedScale.toFixed(2)})`);
if (args.budget && budgetFails.length) { fails += budgetFails.length; budgetFails.forEach(b => failLog.push('[budget] ' + b)); }
const slowViews = Object.entries(timing).filter(([k]) => k.startsWith('view:')).sort((a, b) => b[1].p95 - a[1].p95).slice(0, 8).map(([k, v]) => ({ view: k.slice(5), p50: v.p50, p95: v.p95, max: v.max }));
const summary = { shard: SHARD, of: OF, files, checks, fails, viewRenders, seconds: +secs.toFixed(1), byArch, timing, slowViews, budget: BUDGET, speedScale: +speedScale.toFixed(2), budgetFails, failLog };
if (OUT) writeFileSync(OUT, JSON.stringify(summary));
if (!QUIET) {
  console.log(`\n===== MEGA shard ${SHARD}/${OF} =====`);
  console.log(`Files: ${files}   Checks: ${checks}   Failures: ${fails}   Views: ${viewRenders}   Time: ${secs.toFixed(1)}s`);
  console.log('Archetypes:', JSON.stringify(byArch));
  console.log(`Timing (ms) — machine factor ${speedScale.toFixed(2)} (budgets scaled from an idle core):`); for (const [k, v] of Object.entries(timing)) if (!k.startsWith('view:')) console.log(`  ${k.padEnd(16)} n=${String(v.n).padStart(6)}  p50=${String(v.p50).padStart(8)}  p95=${String(v.p95).padStart(8)}  max=${String(v.max).padStart(8)}  ${BUDGET[k] ? (v.p95 <= BUDGET[k] ? '✓' : '⚠') + ' budget ' + BUDGET[k] : ''}`);
  if (slowViews.length) { console.log('Slowest views (p95 ms):'); for (const v of slowViews) console.log(`  ${v.view.padEnd(16)} p50=${String(v.p50).padStart(8)}  p95=${String(v.p95).padStart(8)}  max=${String(v.max).padStart(8)}`); }
  if (budgetFails.length && !args.budget) { console.log('Budget warnings (not enforced without --budget):'); budgetFails.forEach(b => console.log('  ⚠ ' + b)); }
  if (fails) { console.log('\n--- FAILURES (first 80) ---'); failLog.forEach(l => console.log('  ✗ ' + l)); }
  else console.log('\n✓ ALL INVARIANTS HOLD');
}
process.exit(fails ? 1 : 0);
