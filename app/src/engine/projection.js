// ============================================================
// Deterministic year-by-year financial projection.
// Models accumulation, contributions, taxes, debt amortization,
// retirement decumulation with tax-efficient withdrawal ordering
// and forced RRIF/RMD minimums.
// ============================================================
import { getJurisdiction } from '../jurisdictions/index.js';
import { computeTax } from './tax.js';
import { CURRENT_YEAR } from '../state/models.js';

// Map asset type -> tax treatment bucket
const TREATMENT = {
  rrsp: 'deferred', rrif: 'deferred', fhsa: 'deferred', '401k': 'deferred', ira: 'deferred', rmd: 'deferred', pension: 'deferred',
  tfsa: 'taxfree', roth: 'taxfree', hsa: 'taxfree', isa: 'taxfree', lisa: 'taxfree',
  nonreg: 'taxable', cash: 'taxable', gia: 'taxable',
  resp: 'education', '529': 'education', jisa: 'education',
  realestate: 'realestate', corp: 'corporate', other: 'taxable',
};
export const treatmentOf = (type) => TREATMENT[type] || 'taxable';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function runProjection(client) {
  const jur = getJurisdiction(client.jurisdiction.country, client.jurisdiction.region);
  const A0 = client.assumptions || {};
  const finA = (v,d)=>Number.isFinite(+v)?+v:d;
  const A = { inflation:finA(A0.inflation,0.021), preReturn:finA(A0.preReturn,0.058), postReturn:finA(A0.postReturn,0.042), returnStdev:finA(A0.returnStdev,0.11), salaryGrowth:finA(A0.salaryGrowth,0.025), realEstateGrowth:finA(A0.realEstateGrowth,0.03) };
  // Sanitize member ages so pathological/empty inputs never hang or NaN the run.
  const safeAge = (v, d) => Number.isFinite(+v) ? Math.max(0, Math.min(120, +v)) : d;
  const members = client.members.map(m => ({
    ...m,
    currentAge: safeAge(m.currentAge, 40),
    retirementAge: safeAge(m.retirementAge, 65),
    lifeExpectancy: safeAge(m.lifeExpectancy, 90),
  }));
  const primary = members[0];
  const endAge = Math.max(...members.map(m => m.lifeExpectancy), primary.currentAge + 1);
  const years = Math.max(1, Math.min(90, endAge - primary.currentAge + 1));

  // Live asset state
  // fin() coerces any non-finite value (NaN/Infinity from corrupted/imported data) to a default.
  const fin = (v, d = 0) => Number.isFinite(+v) ? +v : d;
  const assets = client.assets.map(a => ({
    ...a, bal: fin(a.value), basis: fin(a.costBasis ?? a.value), growth: fin(a.growth, 0.05),
    annualContribution: fin(a.annualContribution), employerMatch: fin(a.employerMatch),
    treat: treatmentOf(a.type), owner: a.ownerId || primary.id,
  }));
  const liabs = client.liabilities.map(l => ({ ...l, bal: fin(l.balance), rate: fin(l.rate), payment: fin(l.payment) }));

  const rows = [];
  let depletionAge = null, firstShortfallAge = null;

  for (let y = 0; y < years; y++) {
    const year = CURRENT_YEAR + y;
    const ages = {};
    members.forEach(m => ages[m.id] = m.currentAge + y);
    const primaryAge = ages[primary.id];
    const primaryRetired = primaryAge >= primary.retirementAge;

    // ---------- Income (per member, taxable ordinary) ----------
    const memberOrdinary = {}; members.forEach(m => memberOrdinary[m.id] = 0);
    let employmentIncome = 0, pensionIncome = 0;
    for (const inc of client.incomes) {
      const m = inc.memberId || primary.id;
      const age = ages[m]; if (age == null) continue;
      const isEmp = inc.type === 'employment' || inc.type === 'self';
      const startOk = inc.startAge == null || age >= inc.startAge;
      const endOk = inc.endAge == null || age <= inc.endAge;
      const empOk = !isEmp || age < (members.find(x => x.id === m)?.retirementAge ?? 65);
      if (!(startOk && endOk && empOk)) continue;
      const amt = fin(inc.amount) * Math.pow(1 + fin(inc.growth ?? A.inflation, A.inflation), y);
      if (inc.taxable !== false) memberOrdinary[m] += amt;
      if (isEmp) employmentIncome += amt; else pensionIncome += amt;
    }

    // ---------- Asset growth, contributions, distributions ----------
    // Snapshot investable balance to derive the exogenous (return-independent)
    // cash flow later — this keeps Monte Carlo consistent with the deterministic run.
    const startInvestable = assets.filter(a => a.treat !== 'realestate').reduce((s, a) => s + Math.max(0, a.bal), 0);
    let contributions = 0, investmentIncome = 0, investableGrowth = 0;
    const deferredContribByMember = {}; members.forEach(m => deferredContribByMember[m.id] = 0);
    for (const a of assets) {
      const ownerAge = ages[a.owner] ?? primaryAge;
      const ownerRetired = ownerAge >= (members.find(m => m.id === a.owner)?.retirementAge ?? 65);
      // grow
      const g = ownerRetired ? Math.min(a.growth, A.postReturn + 0.01) : a.growth;
      const growthAmt = a.bal * g;
      a.bal += growthAmt;
      if (a.treat !== 'realestate') investableGrowth += growthAmt;
      if (a.treat === 'taxable') {
        const dist = growthAmt * 0.45;            // ~45 % of return distributed/taxable yearly
        investmentIncome += dist;
        memberOrdinary[a.owner] = (memberOrdinary[a.owner] || 0) + dist;
        a.basis += dist;                           // distributions reinvested raise basis
      }
      // contributions while working
      if (!ownerRetired && a.annualContribution > 0) {
        const c = a.annualContribution * Math.pow(1 + A.salaryGrowth, y);
        a.bal += c + (a.employerMatch || 0);
        a.basis += c + (a.employerMatch || 0);
        contributions += c;
        if (a.treat === 'deferred') {
          deferredContribByMember[a.owner] = (deferredContribByMember[a.owner] || 0) + c;
        }
      }
    }
    members.forEach(m => { memberOrdinary[m.id] = Math.max(0, memberOrdinary[m.id] - deferredContribByMember[m.id]); });

    // ---------- Forced minimums (RRIF / RMD) ----------
    let forced = 0;
    for (const a of assets) {
      if (a.treat !== 'deferred') continue;
      const ownerAge = ages[a.owner] ?? primaryAge;
      const factor = jur.rrifMin?.[ownerAge];
      if (factor && a.bal > 0) {
        const w = a.bal * factor;
        a.bal -= w; forced += w;
        memberOrdinary[a.owner] = (memberOrdinary[a.owner] || 0) + w;
      }
    }

    // ---------- Debt amortization ----------
    let debtPayments = 0, debtInterest = 0;
    for (const l of liabs) {
      if (l.bal <= 0) continue;
      const interest = l.bal * l.rate;
      const annualPay = Math.min(l.payment * 12, l.bal + interest);
      l.bal = Math.max(0, l.bal + interest - annualPay);
      debtPayments += annualPay; debtInterest += interest;
    }

    // ---------- Expenses ----------
    let expenses = 0;
    for (const e of client.expenses) {
      const base = fin(e.amount) * Math.pow(1 + fin(e.growth ?? A.inflation, A.inflation), y);
      expenses += primaryRetired ? base * fin(e.retirementFactor, 1) : base;
    }

    // ---------- Taxes (per member) ----------
    const taxByMember = {};
    let totalTax = 0, grossOrdinary = 0;
    for (const m of members) {
      const t = computeTax(jur, {
        ordinary: memberOrdinary[m.id], age: ages[m.id], employment: ages[m.id] < m.retirementAge,
        filingStatus: client.filingStatus,
      });
      taxByMember[m.id] = t; totalTax += t.total; grossOrdinary += memberOrdinary[m.id];
    }
    const afterTaxIncome = grossOrdinary - totalTax;

    // ---------- Cash-flow gap & decumulation ----------
    // After-tax income must fund expenses + debt + the cash put into contributions
    // (contributions were already deposited into the accounts above).
    const need = expenses + debtPayments;            // consumption + obligations
    let gap = need + contributions - afterTaxIncome;  // >0 ⇒ must withdraw to balance
    const wd = { taxable: 0, deferred: 0, taxfree: 0 };
    let shortfall = 0;

    if (gap > 0) {
      // order: taxable → deferred → tax-free
      const order = ['taxable', 'deferred', 'taxfree'];
      for (const bucket of order) {
        if (gap <= 0.5) break;
        const pool = assets.filter(a => a.treat === bucket && a.bal > 0);
        for (const a of pool) {
          if (gap <= 0.5) break;
          if (bucket === 'deferred') {
            // gross up for marginal tax on the owner
            const owner = members.find(m => m.id === a.owner) || primary;
            const t0 = computeTax(jur, { ordinary: memberOrdinary[a.owner], withPayroll: false });
            const mr = clamp(t0.marginalRate, 0.05, 0.6);
            const gross = Math.min(a.bal, gap / (1 - mr));
            a.bal -= gross; wd.deferred += gross;
            const net = gross * (1 - mr);
            gap -= net; totalTax += gross * mr;
            memberOrdinary[a.owner] += gross;
          } else if (bucket === 'taxable') {
            // small tax on embedded gains
            const gainFrac = a.bal > 0 ? Math.max(0, (a.bal - a.basis) / a.bal) : 0;
            const owner = a.owner;
            const t0 = computeTax(jur, { ordinary: memberOrdinary[owner], withPayroll: false });
            const eff = clamp(t0.marginalRate, 0.05, 0.55) * jur.capGainsInclusion * gainFrac;
            const gross = Math.min(a.bal, gap / (1 - eff));
            a.bal -= gross; a.basis = Math.max(0, a.basis - gross * (1 - gainFrac));
            wd.taxable += gross; const net = gross * (1 - eff);
            gap -= net; totalTax += gross * eff;
          } else { // taxfree
            const gross = Math.min(a.bal, gap);
            a.bal -= gross; wd.taxfree += gross; gap -= gross;
          }
        }
      }
      // Only a shortfall during retirement is a true plan failure; while working
      // it just means contributions can't be fully funded from income.
      if (gap > 0.5 && primaryRetired) { shortfall = gap; if (firstShortfallAge == null) firstShortfallAge = primaryAge; }
    } else {
      // surplus → sweep into first taxable/cash (or tax-free) account
      const surplus = -gap;
      const sink = assets.find(a => a.treat === 'taxable') || assets.find(a => a.treat === 'taxfree');
      if (sink) { sink.bal += surplus; sink.basis += surplus; }
    }

    // ---------- Balances & net worth ----------
    const bal = { deferred: 0, taxfree: 0, taxable: 0, education: 0, realestate: 0, corporate: 0 };
    for (const a of assets) bal[a.treat] = (bal[a.treat] || 0) + Math.max(0, a.bal);
    const assetsTotal = Object.values(bal).reduce((s, v) => s + v, 0);
    const liabilitiesTotal = liabs.reduce((s, l) => s + Math.max(0, l.bal), 0);
    const investable = assetsTotal - bal.realestate;
    if (investable <= 0 && primaryRetired && depletionAge == null) depletionAge = primaryAge;
    // Exogenous (return-independent) flow into/out of the investable portfolio.
    const netFlow = investable - startInvestable - investableGrowth;

    const blended = computeTax(jur, { ordinary: grossOrdinary, filingStatus: client.filingStatus });

    rows.push({
      year, primaryAge, ages, primaryRetired,
      employmentIncome, pensionIncome, investmentIncome, forced,
      grossIncome: employmentIncome + pensionIncome + investmentIncome,
      contributions, expenses, debtPayments, debtInterest,
      tax: totalTax, afterTaxIncome, taxableIncome: grossOrdinary,
      withdrawals: wd, totalWithdrawals: wd.taxable + wd.deferred + wd.taxfree + forced,
      shortfall, need, netFlow,
      balances: bal, assetsTotal, liabilitiesTotal, investable,
      netWorth: assetsTotal - liabilitiesTotal,
      marginalRate: blended.marginalRate, averageRate: blended.averageRate,
    });
  }

  // ---------- Summary ----------
  const retYear = rows.find(r => r.primaryRetired);
  const peak = rows.reduce((mx, r) => r.netWorth > mx.netWorth ? r : mx, rows[0]);
  const finalRow = rows[rows.length - 1];
  const success = firstShortfallAge == null && finalRow.investable > 0;

  return {
    jur, rows, years,
    summary: {
      retirementAge: primary.retirementAge,
      currentNetWorth: rows[0].netWorth,
      finalNetWorth: finalRow.netWorth,
      finalInvestable: finalRow.investable,
      peakNetWorth: peak.netWorth, peakAge: peak.primaryAge,
      depletionAge, firstShortfallAge, success,
      lifeExpectancy: endAge,
      retirementIncomeNeed: retYear ? retYear.need : null,
      avgTaxRateRetire: retYear ? retYear.averageRate : null,
      totalLifetimeTax: rows.reduce((s, r) => s + r.tax, 0),
    },
  };
}
