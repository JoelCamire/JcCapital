// ============================================================
// Deterministic year-by-year financial projection.
// Models accumulation, contributions, taxes (per member, with all
// statutory credits), OAS recovery tax, debt amortization (monthly,
// with the Canadian semi-annual mortgage convention), retirement
// decumulation with tax-efficient withdrawal ordering and EXACT
// gross-up of taxable withdrawals, and forced RRIF/RMD minimums
// (RRSP converts at 71 → first minimum at 72; RRIFs at any age).
// Every parameter comes from the client file or the jurisdiction.
// ============================================================
import { getJurisdiction } from '../jurisdictions/index.js';
import { computeTax, grossUpForNet, rrifMinFactor, incrementalTax } from './tax.js';
import { CURRENT_YEAR, assumptionsOf } from '../state/models.js';
import { stepLoan, compoundingFor } from './amortization.js';

// Map asset type -> tax treatment bucket
const TREATMENT = {
  rrsp: 'deferred', rrif: 'deferred', fhsa: 'deferred', lira: 'deferred', lif: 'deferred', '401k': 'deferred', ira: 'deferred', rmd: 'deferred', pension: 'deferred',
  tfsa: 'taxfree', roth: 'taxfree', hsa: 'taxfree', isa: 'taxfree', lisa: 'taxfree',
  nonreg: 'taxable', cash: 'taxable', gia: 'taxable',
  resp: 'education', '529': 'education', jisa: 'education',
  realestate: 'realestate', corp: 'corporate', other: 'taxable',
};
export const treatmentOf = (type) => TREATMENT[type] || 'taxable';

// Income types
export const EMPLOYMENT_TYPES = ['employment', 'self'];
export const PENSION_TYPES = ['pension', 'rrif', 'annuity', 'dbpension', 'lif'];   // eligible pension income
export const GOV_TYPES = ['cpp', 'oas'];
export function incomeBucket(type) {
  if (type === 'employment') return 'employment';
  if (type === 'self') return 'self';
  if (PENSION_TYPES.includes(type)) return 'pension';
  if (type === 'cpp') return 'cpp';
  if (type === 'oas') return 'oas';
  return 'other';                                  // rental, interest, other ordinary
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fin = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

/**
 * runProjection(client, { assumptions? })
 * Returns { jur, rows, years, summary }.
 */
export function runProjection(client, opts = {}) {
  const jur = getJurisdiction(client.jurisdiction?.country, client.jurisdiction?.region);
  const A = { ...assumptionsOf(client), ...(opts.assumptions || {}) };
  const safeAge = (v, d) => Number.isFinite(+v) ? clamp(+v, 0, 120) : d;
  const members = (client.members || []).map(m => ({
    ...m,
    currentAge: safeAge(m.currentAge, 40),
    retirementAge: safeAge(m.retirementAge, 65),
    lifeExpectancy: safeAge(m.lifeExpectancy, 90),
  }));
  if (!members.length) members.push({ id: 'p', name: '', currentAge: 40, retirementAge: 65, lifeExpectancy: 90 });
  const primary = members[0];
  const byId = Object.fromEntries(members.map(m => [m.id, m]));
  const endAge = Math.max(...members.map(m => m.lifeExpectancy), primary.currentAge + 1);
  const years = Math.max(1, Math.min(90, endAge - primary.currentAge + 1));
  const spendingLevel = clamp(fin(A.spendingLevel, 1), 0, 5);
  const distYield = clamp(fin(A.distributionYield, 0.45), 0, 1);

  const assets = (client.assets || []).map(a => ({
    ...a, bal: fin(a.value), basis: fin(a.costBasis ?? a.value), growth: fin(a.growth, 0.05),
    annualContribution: fin(a.annualContribution), employerMatch: fin(a.employerMatch),
    treat: treatmentOf(a.type), owner: (a.ownerId && byId[a.ownerId]) ? a.ownerId : primary.id,
  }));
  const liabs = (client.liabilities || []).map(l => ({
    ...l, bal: fin(l.balance), rate: fin(l.rate), payment: fin(l.payment), extra: Math.max(0, fin(l.extraPayment)),
    compounding: l.compounding || compoundingFor(l.type, jur.country),
  }));

  const rows = [];
  let depletionAge = null, firstShortfallAge = null;

  for (let y = 0; y < years; y++) {
    const year = CURRENT_YEAR + y;
    const ages = {}; members.forEach(m => ages[m.id] = m.currentAge + y);
    const primaryAge = ages[primary.id];
    const primaryRetired = primaryAge >= primary.retirementAge;

    // ---------- Income per member, by bucket ----------
    const inc = {}; members.forEach(m => inc[m.id] = { employment: 0, self: 0, pension: 0, cpp: 0, oas: 0, other: 0, rrif: 0, nontaxable: 0 });
    for (const i of (client.incomes || [])) {
      const mId = (i.memberId && byId[i.memberId]) ? i.memberId : primary.id;
      const m = byId[mId]; const age = ages[mId];
      const bucket = incomeBucket(i.type);
      const isEmp = bucket === 'employment' || bucket === 'self';
      const startOk = i.startAge == null || i.startAge === '' || age >= fin(i.startAge);
      const endOk = i.endAge == null || i.endAge === '' || age <= fin(i.endAge);
      const empOk = !isEmp || age < m.retirementAge;
      if (!(startOk && endOk && empOk)) continue;
      const amt = fin(i.amount) * Math.pow(1 + fin(i.growth ?? A.inflation, A.inflation), y);
      if (i.taxable === false) inc[mId].nontaxable += amt; else inc[mId][bucket] += amt;
    }

    // ---------- Asset growth, contributions, distributions ----------
    const startInvestable = assets.filter(a => a.treat !== 'realestate').reduce((s, a) => s + Math.max(0, a.bal), 0);
    let contributions = 0, employerMatch = 0, investmentIncome = 0, investableGrowth = 0;
    const deferredContrib = {}; members.forEach(m => deferredContrib[m.id] = 0);
    for (const a of assets) {
      const ownerAge = ages[a.owner] ?? primaryAge;
      const owner = byId[a.owner] || primary;
      const ownerRetired = ownerAge >= owner.retirementAge;
      const g = a.treat === 'realestate' ? fin(a.growth, A.realEstateGrowth) : (ownerRetired ? Math.min(a.growth, A.postReturn) : a.growth);
      const growthAmt = a.bal * g;
      a.bal += growthAmt;
      if (a.treat !== 'realestate') investableGrowth += growthAmt;
      if (a.treat === 'taxable' && growthAmt > 0) {
        const dist = growthAmt * distYield;              // distributed & taxed yearly
        investmentIncome += dist;
        inc[a.owner].other += dist;
        a.basis += dist;                                  // reinvested distributions raise the ACB
      }
      if (!ownerRetired && a.annualContribution > 0) {
        const c = a.annualContribution * Math.pow(1 + A.salaryGrowth, y);
        const mtch = (a.employerMatch || 0) * Math.pow(1 + A.salaryGrowth, y);
        a.bal += c + mtch; a.basis += c + mtch;
        contributions += c; employerMatch += mtch;
        if (a.treat === 'deferred') deferredContrib[a.owner] += c;
      }
    }

    // ---------- Forced minimums (RRIF / RMD) ----------
    let forced = 0;
    for (const a of assets) {
      if (a.treat !== 'deferred') continue;
      const ownerAge = ages[a.owner] ?? primaryAge;
      const factor = rrifMinFactor(jur, ownerAge, a.type);
      if (factor > 0 && a.bal > 0) { const w = a.bal * factor; a.bal -= w; forced += w; inc[a.owner].rrif += w; }
    }

    // ---------- Debt amortization (monthly, exact) ----------
    let debtPayments = 0, debtInterest = 0;
    for (const l of liabs) {
      if (l.bal <= 0) continue;
      const r = stepLoan(l.bal, l.rate, l.payment, 12, { extra: l.extra, compounding: l.compounding });
      l.bal = r.balance; debtPayments += r.paid; debtInterest += r.interest;
    }

    // ---------- Expenses ----------
    let expenses = 0;
    for (const e of (client.expenses || [])) {
      const base = fin(e.amount) * Math.pow(1 + fin(e.growth ?? A.inflation, A.inflation), y) * spendingLevel;
      expenses += primaryRetired ? base * fin(e.retirementFactor, 1) : base;
    }

    // ---------- Taxes (per member, exact) ----------
    const byMember = {};
    let totalTax = 0, oasClawback = 0, grossOrdinary = 0, grossIncome = 0, employmentIncome = 0, pensionIncome = 0, oasIncome = 0;
    const ordinaryOf = {};
    for (const m of members) {
      const b = inc[m.id]; const age = ages[m.id];
      const emp = b.employment + b.self;
      const eligiblePension = b.pension + (age >= 65 ? b.rrif : 0);
      const ordinary = Math.max(0, emp + b.pension + b.cpp + b.other + b.rrif - deferredContrib[m.id]);
      ordinaryOf[m.id] = ordinary;
      const t = computeTax(jur, {
        ordinary, employmentIncome: emp, selfEmployed: b.self > b.employment, pensionIncome: eligiblePension, oasIncome: b.oas,
        age, employment: emp > 0, withPayroll: true, filingStatus: client.filingStatus,
      });
      byMember[m.id] = { ordinary, oasIncome: b.oas, tax: t.total, incomeTax: t.incomeTax, payroll: t.payroll, clawback: t.clawback, marginalRate: t.marginalRate, averageRate: t.averageRate, netIncome: t.netIncome, buckets: { ...b } };
      totalTax += t.total; oasClawback += t.clawback; grossOrdinary += ordinary;
      grossIncome += emp + b.pension + b.cpp + b.oas + b.other + b.rrif + b.nontaxable;
      employmentIncome += emp; pensionIncome += b.pension + b.cpp; oasIncome += b.oas;
    }
    const afterTaxIncome = grossIncome - totalTax;

    // ---------- Cash-flow gap & decumulation ----------
    const need = expenses + debtPayments;
    let gap = need + contributions - afterTaxIncome;     // >0 ⇒ must withdraw to balance
    const wd = { taxable: 0, deferred: 0, taxfree: 0 };
    let withdrawalTax = 0, shortfall = 0;

    if (gap > 0.5) {
      for (const bucket of ['taxable', 'deferred', 'taxfree']) {
        if (gap <= 0.5) break;
        for (const a of assets.filter(x => x.treat === bucket && x.bal > 0)) {
          if (gap <= 0.5) break;
          const ownerId = a.owner; const m = byId[ownerId] || primary; const age = ages[ownerId];
          const b = inc[ownerId];
          const taxOpts = { age, pensionIncome: b.pension + (age >= 65 ? b.rrif : 0), oasIncome: b.oas, filingStatus: client.filingStatus };
          if (bucket === 'deferred') {
            const g = grossUpForNet(jur, gap, ordinaryOf[ownerId], a.bal, taxOpts);
            if (g.gross <= 0) continue;
            a.bal -= g.gross; wd.deferred += g.gross; withdrawalTax += g.tax; gap -= g.net;
            ordinaryOf[ownerId] += g.gross; inc[ownerId].rrif += g.gross;
          } else if (bucket === 'taxable') {
            const gainFrac = a.bal > 0 ? clamp((a.bal - a.basis) / a.bal, 0, 1) : 0;
            // exact capital-gains tax on the realised fraction, solved in two passes
            let gross = Math.min(a.bal, gap);
            for (let k = 0; k < 3; k++) {
              const tax = gainFrac > 0 ? incrementalTaxCap(jur, gross * gainFrac, ordinaryOf[ownerId], taxOpts) : 0;
              const net = gross - tax;
              if (net >= gap - 0.5 || gross >= a.bal) { gross = Math.min(a.bal, gross); break; }
              gross = Math.min(a.bal, gross + (gap - net) / Math.max(0.3, 1 - (gross > 0 ? tax / gross : 0)));
            }
            const tax = gainFrac > 0 ? incrementalTaxCap(jur, gross * gainFrac, ordinaryOf[ownerId], taxOpts) : 0;
            a.bal -= gross; a.basis = Math.max(0, a.basis - gross * (1 - gainFrac));
            wd.taxable += gross; withdrawalTax += tax; gap -= gross - tax;
          } else {
            const gross = Math.min(a.bal, gap);
            a.bal -= gross; wd.taxfree += gross; gap -= gross;
          }
        }
      }
      if (gap > 0.5 && primaryRetired) { shortfall = gap; if (firstShortfallAge == null) firstShortfallAge = primaryAge; }
    } else if (gap < -0.5) {
      const surplus = -gap;
      const sink = assets.find(a => a.treat === 'taxable') || assets.find(a => a.treat === 'taxfree');
      if (sink) { sink.bal += surplus; sink.basis += surplus; }
    }
    totalTax += withdrawalTax;

    // ---------- Balances & net worth ----------
    const bal = { deferred: 0, taxfree: 0, taxable: 0, education: 0, realestate: 0, corporate: 0 };
    const basis = { taxable: 0 };
    for (const a of assets) { bal[a.treat] = (bal[a.treat] || 0) + Math.max(0, a.bal); if (a.treat === 'taxable') basis.taxable += Math.max(0, Math.min(a.basis, a.bal)); }
    const assetsTotal = Object.values(bal).reduce((s, v) => s + v, 0);
    const liabilitiesTotal = liabs.reduce((s, l) => s + Math.max(0, l.bal), 0);
    const investable = assetsTotal - bal.realestate;
    if (investable <= 0 && primaryRetired && depletionAge == null) depletionAge = primaryAge;
    const netFlow = investable - startInvestable - investableGrowth;   // return-independent flow (for Monte Carlo)
    const detReturn = startInvestable > 0 ? investableGrowth / startInvestable : (primaryRetired ? A.postReturn : A.preReturn);

    const blended = computeTax(jur, { ordinary: grossOrdinary, withPayroll: false, employment: false, filingStatus: client.filingStatus });

    rows.push({
      year, primaryAge, ages, primaryRetired,
      employmentIncome, pensionIncome, oasIncome, investmentIncome, forced,
      grossIncome, contributions, employerMatch, expenses, debtPayments, debtInterest,
      tax: totalTax, incomeTaxAndPayroll: totalTax - oasClawback - withdrawalTax, withdrawalTax, oasClawback,
      afterTaxIncome, taxableIncome: grossOrdinary,
      withdrawals: wd, totalWithdrawals: wd.taxable + wd.deferred + wd.taxfree + forced,
      shortfall, need, netFlow, detReturn,
      balances: bal, basisTaxable: basis.taxable, assetsTotal, liabilitiesTotal, investable,
      netWorth: assetsTotal - liabilitiesTotal,
      marginalRate: blended.marginalRate, averageRate: grossIncome > 0 ? totalTax / grossIncome : 0,
      byMember,
    });
  }

  // ---------- Summary ----------
  const retRow = rows.find(r => r.primaryRetired) || null;
  const peak = rows.reduce((mx, r) => r.netWorth > mx.netWorth ? r : mx, rows[0]);
  const finalRow = rows[rows.length - 1];
  const success = firstShortfallAge == null && finalRow.investable > 0;
  const retireMarginal = retRow ? Math.max(...Object.values(retRow.byMember).map(m => m.marginalRate)) : null;

  return {
    jur, rows, years, assumptions: A,
    summary: {
      retirementAge: primary.retirementAge,
      currentNetWorth: rows[0].netWorth,
      finalNetWorth: finalRow.netWorth,
      finalInvestable: finalRow.investable,
      finalBalances: finalRow.balances,
      peakNetWorth: peak.netWorth, peakAge: peak.primaryAge,
      depletionAge, firstShortfallAge, success,
      lifeExpectancy: endAge,
      retirementIncomeNeed: retRow ? retRow.need : null,
      retirementTaxableIncome: retRow ? retRow.taxableIncome : null,
      retirementGrossIncome: retRow ? retRow.grossIncome : null,
      retireMarginalRate: retireMarginal,
      avgTaxRateRetire: retRow ? retRow.averageRate : null,
      totalLifetimeTax: rows.reduce((s, r) => s + r.tax, 0),
      totalOasClawback: rows.reduce((s, r) => s + r.oasClawback, 0),
      retirementRow: retRow,
    },
  };
}

/** Exact tax on a realised capital gain stacked on other ordinary income. */
function incrementalTaxCap(jur, capGain, otherOrdinary, opts) {
  const t0 = computeTax(jur, { ordinary: otherOrdinary, withPayroll: false, employment: false, ...opts });
  const t1 = computeTax(jur, { ordinary: otherOrdinary, capGains: capGain, withPayroll: false, employment: false, ...opts });
  return Math.max(0, t1.total - t0.total);
}
