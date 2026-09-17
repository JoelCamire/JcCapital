// ============================================================
// FACTS — the single derived model of a client file.
//
// Every view and every calculator reads its defaults from here
// instead of asking the advisor to re-type a number that already
// exists in the file (income, marginal rate, account balances,
// debt service, coverage, business figures, pensions, …).
// Memoised per client object until the file changes (store bumps
// client._rev on every mutation), so it is free to call everywhere.
// ============================================================
import { getJurisdiction, accountMeta } from '../jurisdictions/index.js';
import { computeTax, marginalRateFor } from './tax.js';
import { treatmentOf, incomeBucket, runProjection } from './projection.js';
import { netWorthBreakdown } from './analysis.js';
import { corporateTaxCA, businessValuation } from './corporate.js';
import { amortize, compoundingFor, effectiveMonthlyRate } from './amortization.js';
import { activePolicies, coverageOf, premiumsOf, investmentProducts, aumOf } from './policies.js';
import { assumptionsOf } from '../state/models.js';

const fin = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const cache = new WeakMap();
const retCache = new WeakMap();
const stampOf = (c, jur) => `${c._rev || 0}|${c.updatedAt || 0}|${jur.country}|${jur.region}`;

/** Main entry — memoised. */
export function clientFacts(client, jur) {
  jur = jur || getJurisdiction(client.jurisdiction?.country, client.jurisdiction?.region);
  const stamp = stampOf(client, jur);
  const hit = cache.get(client);
  if (hit && hit.stamp === stamp) return hit.facts;
  const facts = build(client, jur);
  cache.set(client, { stamp, facts });
  return facts;
}

/** Facts that need the full projection (retirement-year figures) — memoised separately. */
export function retirementFacts(client, jur) {
  jur = jur || getJurisdiction(client.jurisdiction?.country, client.jurisdiction?.region);
  const stamp = stampOf(client, jur);
  const hit = retCache.get(client);
  if (hit && hit.stamp === stamp) return hit.facts;
  const p = runProjection(client);
  const S = p.summary; const row = S.retirementRow;
  const facts = {
    projection: p,
    retirementAge: S.retirementAge, success: S.success, depletionAge: S.depletionAge, firstShortfallAge: S.firstShortfallAge,
    taxableIncome: S.retirementTaxableIncome, grossIncome: S.retirementGrossIncome,
    marginalRate: S.retireMarginalRate, averageRate: S.avgTaxRateRetire,
    spending: S.retirementIncomeNeed,
    oasIncome: row ? row.oasIncome : 0, pensionIncome: row ? row.pensionIncome : 0,
    balances: row ? row.balances : null, basisTaxable: row ? row.basisTaxable : 0,
    finalBalances: S.finalBalances, finalInvestable: S.finalInvestable, finalNetWorth: S.finalNetWorth,
    totalLifetimeTax: S.totalLifetimeTax, totalOasClawback: S.totalOasClawback,
  };
  retCache.set(client, { stamp, facts });
  return facts;
}

/** Persisted what-if parameters for a view, merged over engine-derived defaults. */
export function whatIf(client, view, defaults) {
  const saved = (client && client.calc && client.calc[view]) || {};
  const out = { ...defaults };
  for (const k of Object.keys(defaults)) {
    if (saved[k] === undefined || saved[k] === null) continue;
    if (typeof defaults[k] === 'number') { if (Number.isFinite(+saved[k])) out[k] = +saved[k]; }
    else out[k] = saved[k];
  }
  return out;
}
/** Save what-if parameters without re-rendering. */
export function saveWhatIf(store, view, patch) {
  store.quietUpdate(c => { c.calc = c.calc || {}; c.calc[view] = { ...(c.calc[view] || {}), ...patch }; });
}

/** Marginal rate for a member (default primary) and income kind: ordinary | capgains | eligible | noneligible. */
export function marginalRateOf(client, jur, memberId = null, kind = 'ordinary') {
  const F = clientFacts(client, jur);
  const m = (memberId && F.members.find(x => x.id === memberId)) || F.primary;
  return m ? (m.marginal[kind] ?? m.marginal.ordinary) : 0;
}

// ---------- builder ----------
function build(client, jur) {
  const A = assumptionsOf(client);
  const members = (client.members || []).map(m => ({ ...m, currentAge: fin(m.currentAge, 40), retirementAge: fin(m.retirementAge, 65), lifeExpectancy: fin(m.lifeExpectancy, 90) }));
  const primaryId = members[0]?.id;
  const byId = Object.fromEntries(members.map(m => [m.id, m]));

  // ----- incomes active today, per member -----
  const memberFacts = members.map(m => {
    const b = { employment: 0, self: 0, pension: 0, cpp: 0, oas: 0, other: 0, rental: 0, nontaxable: 0 };
    const items = [];
    for (const i of (client.incomes || [])) {
      const mId = (i.memberId && byId[i.memberId]) ? i.memberId : primaryId;
      if (mId !== m.id) continue;
      const bucket = incomeBucket(i.type);
      const isEmp = bucket === 'employment' || bucket === 'self';
      const age = m.currentAge;
      const active = (i.startAge == null || i.startAge === '' || age >= fin(i.startAge)) && (i.endAge == null || i.endAge === '' || age <= fin(i.endAge)) && (!isEmp || age < m.retirementAge);
      items.push({ ...i, bucket, active });
      if (!active) continue;
      const amt = fin(i.amount);
      if (i.taxable === false) b.nontaxable += amt;
      else { b[bucket] += amt; if (i.type === 'rental') b.rental += amt; }
    }
    const deferredContrib = (client.assets || []).filter(a => treatmentOf(a.type) === 'deferred' && ((a.ownerId && byId[a.ownerId]) ? a.ownerId : primaryId) === m.id && m.currentAge < m.retirementAge).reduce((s, a) => s + fin(a.annualContribution), 0);
    const employmentIncome = b.employment + b.self;
    const earnedIncome = employmentIncome + b.rental;
    const grossIncome = employmentIncome + b.pension + b.cpp + b.oas + b.other + b.nontaxable;
    const ordinary = Math.max(0, employmentIncome + b.pension + b.cpp + b.other - deferredContrib);
    const selfEmployed = b.self > b.employment;
    const taxOpts = { age: m.currentAge, pensionIncome: b.pension, oasIncome: b.oas, filingStatus: client.filingStatus };
    const tax = computeTax(jur, { ordinary, employmentIncome, selfEmployed, employment: employmentIncome > 0, withPayroll: true, ...taxOpts });
    const taxNoPayroll = computeTax(jur, { ordinary, withPayroll: false, employment: false, ...taxOpts });
    const marginal = {
      ordinary: taxNoPayroll.marginalRate,
      withPayroll: tax.marginalRate,
      capgains: marginalRateFor(jur, ordinary, 'capgains', taxOpts),
      eligible: marginalRateFor(jur, ordinary, 'eligible', taxOpts),
      noneligible: marginalRateFor(jur, ordinary, 'noneligible', taxOpts),
    };
    const rrspMeta = accountMeta(jur.country, jur.country === 'CA' ? 'rrsp' : jur.country === 'US' ? '401k' : 'pension');
    const rrspRoom = jur.country === 'CA' ? Math.min(earnedIncome * (rrspMeta.limitPctIncome || 0.18), rrspMeta.limit || 0) : (rrspMeta.limit || 0);
    return {
      id: m.id, name: m.name, role: m.role, age: m.currentAge, retirementAge: m.retirementAge, lifeExpectancy: m.lifeExpectancy,
      retired: m.currentAge >= m.retirementAge, yearsToRetirement: Math.max(0, m.retirementAge - m.currentAge),
      incomes: items, buckets: b,
      employmentIncome, selfEmployed, earnedIncome, pensionIncome: b.pension, cppIncome: b.cpp, oasIncome: b.oas, otherIncome: b.other, grossIncome,
      deferredContrib, ordinary, taxableIncome: tax.taxable, netIncome: tax.netIncome,
      tax, afterTax: grossIncome - tax.total, averageRate: grossIncome > 0 ? tax.total / grossIncome : 0,
      marginal, marginalRate: marginal.ordinary, payroll: tax.payroll,
      rrspRoom, rrspLimit: rrspMeta.limit || 0,
    };
  });
  const primary = memberFacts[0] || null;

  // ----- household -----
  const sum = (k) => memberFacts.reduce((s, m) => s + fin(m[k]), 0);
  const expensesAnnual = (client.expenses || []).reduce((s, e) => s + fin(e.amount), 0);
  const expensesByCategory = {};
  for (const e of (client.expenses || [])) expensesByCategory[e.category || 'other'] = (expensesByCategory[e.category || 'other'] || 0) + fin(e.amount);
  const contributions = (client.assets || []).reduce((s, a) => { const o = byId[a.ownerId] || members[0]; return s + ((!o || o.currentAge < o.retirementAge) ? fin(a.annualContribution) : 0); }, 0);
  const employerMatch = (client.assets || []).reduce((s, a) => s + fin(a.employerMatch), 0);
  const contributionsByTreatment = {};
  for (const a of (client.assets || [])) { const t = treatmentOf(a.type); contributionsByTreatment[t] = (contributionsByTreatment[t] || 0) + fin(a.annualContribution); }

  // ----- liabilities -----
  const liabilities = (client.liabilities || []).map(l => {
    const compounding = l.compounding || compoundingFor(l.type, jur.country);
    const am = amortize(fin(l.balance), fin(l.rate), fin(l.payment), fin(l.extraPayment), compounding);
    const yr1 = am.schedule[0];
    return {
      ...l, compounding, monthlyRate: effectiveMonthlyRate(fin(l.rate), compounding),
      payoffMonths: am.months, payoffYears: Number.isFinite(am.months) ? am.months / 12 : Infinity,
      totalInterest: am.totalInterest, unpayable: am.unpayable,
      interestYear1: yr1 ? yr1.interest : 0, annualPayment: (fin(l.payment) + fin(l.extraPayment)) * 12,
    };
  });
  const totalDebt = liabilities.reduce((s, l) => s + fin(l.balance), 0);
  const monthlyDebtService = liabilities.reduce((s, l) => s + fin(l.payment) + fin(l.extraPayment), 0);
  const annualDebtService = monthlyDebtService * 12;
  const weightedRate = totalDebt > 0 ? liabilities.reduce((s, l) => s + fin(l.balance) * fin(l.rate), 0) / totalDebt : 0;
  const mortgage = liabilities.filter(l => l.type === 'mortgage').sort((a, b) => fin(b.balance) - fin(a.balance))[0] || null;

  const grossIncome = sum('grossIncome');
  const totalTax = memberFacts.reduce((s, m) => s + m.tax.total, 0);
  const netIncome = grossIncome - totalTax;
  const surplus = netIncome - expensesAnnual - annualDebtService - contributions;
  const household = {
    grossIncome, employmentIncome: sum('employmentIncome'), pensionIncome: sum('pensionIncome') + sum('cppIncome'), oasIncome: sum('oasIncome'),
    tax: totalTax, incomeTax: memberFacts.reduce((s, m) => s + m.tax.incomeTax, 0), payroll: memberFacts.reduce((s, m) => s + m.tax.payroll, 0),
    netIncome, netIncomeMonthly: netIncome / 12,
    averageRate: grossIncome > 0 ? totalTax / grossIncome : 0,
    marginalRate: memberFacts.length ? Math.max(...memberFacts.map(m => m.marginalRate)) : 0,
    expenses: expensesAnnual, expensesMonthly: expensesAnnual / 12, expensesByCategory,
    contributions, employerMatch, contributionsByTreatment,
    debtService: annualDebtService, debtServiceMonthly: monthlyDebtService,
    surplus, surplusMonthly: surplus / 12,
    savingsRate: grossIncome > 0 ? contributions / grossIncome : 0,          // what is actually being saved
    surplusRate: netIncome > 0 ? surplus / netIncome : 0,                    // what is left after everything
    savingsTarget: A.savingsTarget,
  };

  // ----- net worth & buckets -----
  const nw = netWorthBreakdown(client);
  const buckets = { deferred: 0, taxfree: 0, taxable: 0, education: 0, realestate: 0, corporate: 0, cash: 0, basisTaxable: 0 };
  for (const a of (client.assets || [])) {
    const t = treatmentOf(a.type); const v = fin(a.value);
    buckets[t] = (buckets[t] || 0) + v;
    if (a.type === 'cash') buckets.cash += v;
    if (t === 'taxable') buckets.basisTaxable += Math.min(v, fin(a.costBasis ?? a.value));
  }
  const investable = nw.assets - buckets.realestate;
  const investableAssets = (client.assets || []).filter(a => treatmentOf(a.type) !== 'realestate');
  const wGrowth = investableAssets.reduce((s, a) => s + fin(a.value) * fin(a.growth, A.preReturn), 0);
  const expectedReturn = investable > 0 ? wGrowth / investable : A.preReturn;

  // ----- policies (products[] is the ledger) -----
  const policies = activePolicies(client);
  const coverage = {};
  for (const m of members) coverage[m.id] = { life: coverageOf(client, m.id, 'life'), di: coverageOf(client, m.id, 'di'), ci: coverageOf(client, m.id, 'ci'), ltc: coverageOf(client, m.id, 'ltc') };
  const premiums = premiumsOf(client);
  const premiumsByMember = Object.fromEntries(members.map(m => [m.id, premiumsOf(client, m.id)]));
  const aum = investmentProducts(client).reduce((s, p) => s + aumOf(client, p), 0);

  // ----- public pensions per member (client-specific when on file, else jurisdiction estimate) -----
  const pensions = Object.fromEntries(members.map(m => {
    const cppInc = (client.incomes || []).find(i => i.type === 'cpp' && ((i.memberId && byId[i.memberId]) ? i.memberId : primaryId) === m.id);
    const oasInc = (client.incomes || []).find(i => i.type === 'oas' && ((i.memberId && byId[i.memberId]) ? i.memberId : primaryId) === m.id);
    const J = jur.pensions || {};
    return [m.id, {
      cpp: { annual: cppInc ? fin(cppInc.amount) : fin(J.cpp?.avgAnnual), startAge: cppInc && cppInc.startAge != null ? fin(cppInc.startAge) : fin(J.cpp?.startAge, 65), onFile: !!cppInc, max: fin(J.cpp?.maxAnnual) },
      oas: { annual: oasInc ? fin(oasInc.amount) : fin(J.oas?.maxAnnual), startAge: oasInc && oasInc.startAge != null ? fin(oasInc.startAge) : fin(J.oas?.startAge, 65), onFile: !!oasInc, max: fin(J.oas?.maxAnnual) },
    }];
  }));

  // ----- business -----
  let business = null;
  if (client.business) {
    const B = client.business;
    const owner = memberFacts.find(m => m.id === B.ownerId) || primary;
    const val = businessValuation(B.valuation || {});
    const corp = jur.country === 'CA' ? corporateTaxCA(jur, fin(B.activeIncome), fin(B.passiveIncome)) : null;
    const ownerOtherIncome = fin(B.otherPersonalIncome) || (owner ? owner.ordinary : 0);
    business = {
      ...B, owner, ownerOtherIncome, valuation: val, value: val.estimate || fin(B.retainedEarnings), corp,
      sbRate: corp ? corp.sbRate : null, genRate: corp ? corp.genRate : null,
      owners: Math.max(1, fin(B.sale?.owners, 1)),
      structure: B.structure || 'incorporated', incorporated: (B.structure || 'incorporated') === 'incorporated',
    };
  }

  // ----- education -----
  const respBalance = (client.assets || []).filter(a => treatmentOf(a.type) === 'education').reduce((s, a) => s + fin(a.value), 0);
  const respContrib = (client.assets || []).filter(a => treatmentOf(a.type) === 'education').reduce((s, a) => s + fin(a.annualContribution), 0);
  const respMeta = accountMeta(jur.country, jur.country === 'CA' ? 'resp' : jur.country === 'US' ? '529' : 'jisa');
  const regionResp = jur.regionData?.resp || null;
  const dependents = (client.dependents || []).map(d => ({ ...d, age: fin(d.age), yearsToGoal: Math.max(0, fin(d.educationGoalAge, 18) - fin(d.age)) }));
  const education = {
    dependents, respBalance, respContrib,
    perChild: dependents.length ? respBalance / dependents.length : 0,
    grant: { rate: fin(respMeta.grant), max: fin(respMeta.grantMax), lifetime: fin(respMeta.grantLifetime), provRate: fin(regionResp?.grant), provMax: fin(regionResp?.grantMax), provLifetime: fin(regionResp?.grantLifetime) },
    goals: (client.goals || []).filter(g => g.type === 'education'),
  };

  return {
    jur, taxYear: jur.taxYear, assumptions: A,
    members: memberFacts, primary, byMember: Object.fromEntries(memberFacts.map(m => [m.id, m])),
    household, netWorth: nw, buckets, investable, liquid: nw.liquid, expectedReturn,
    liabilities, totalDebt, monthlyDebtService, annualDebtService, weightedRate, mortgage,
    policies, coverage, premiums, premiumsByMember, aum,
    pensions, business, education,
    goals: client.goals || [],
    home: (client.assets || []).filter(a => a.type === 'realestate').sort((a, b) => fin(b.value) - fin(a.value))[0] || null,
    cash: buckets.cash,
  };
}
