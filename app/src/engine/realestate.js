// ============================================================
// Real estate / rental property analysis engine
//   • Canadian mortgage math (semi-annual compounding by default)
//   • exact yearly interest / principal from the shared amortizer
//   • CCA (class 1) with half-year rule, recapture on sale
//   • AFTER-TAX result: recapture at the marginal rate, capital gain
//     at the inclusion rate, selling costs — and a true IRR on the
//     equity cash flows (pre-tax and after-tax).
// ============================================================
import { t } from '../i18n.js';
import { cleanse } from './util.js';
import { monthlyPayment, effectiveMonthlyRate, irr } from './amortization.js';

const fin = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

/**
 * @param {object} p
 *   price, downPct, rate, amortYears, grossRent (annual), vacancyPct, opexPct (of gross rent),
 *   appreciation, rentGrowth, marginalRate (full ordinary marginal), capGainsInclusion (0.5 CA),
 *   ccaRate (0.04), buildingPct (0.80), sellingCostPct (0.05), closingCostPct (0.015),
 *   holdYears, compounding ('semi-annual' | 'monthly'), claimCCA (bool)
 */
export function analyzeProperty(p) {
  p = cleanse(p);
  const price        = Math.max(0, p.price || 0);
  const downPct      = Math.min(1, Math.max(0, p.downPct ?? 0.20));
  const rate         = Math.max(0, p.rate ?? 0.055);
  const amortYears   = Math.max(1, p.amortYears || 25);
  const grossRent    = Math.max(0, p.grossRent || 0);
  const vacancyPct   = Math.min(1, Math.max(0, p.vacancyPct ?? 0.05));
  const opexPct      = Math.min(1, Math.max(0, p.opexPct ?? 0.35));
  const appreciation = p.appreciation ?? 0.03;
  const rentGrowth   = p.rentGrowth ?? 0.02;
  const marginalRate = Math.min(1, Math.max(0, p.marginalRate ?? 0.46));
  const inclusion    = Math.min(1, Math.max(0, p.capGainsInclusion ?? 0.5));
  const ccaRate      = Math.max(0, p.ccaRate ?? 0.04);
  const buildingPct  = Math.min(1, Math.max(0, p.buildingPct ?? 0.80));
  const sellingCostPct = Math.min(0.2, Math.max(0, p.sellingCostPct ?? 0.05));
  const closingCostPct = Math.min(0.1, Math.max(0, p.closingCostPct ?? 0.015));
  const holdYears    = Math.max(1, Math.min(50, p.holdYears || 10));
  const compounding  = p.compounding || 'semi-annual';
  const claimCCA     = p.claimCCA !== false;

  // ---- Purchase metrics ----
  const downPayment   = price * downPct;
  const closingCosts  = price * closingCostPct;
  const loanAmount    = price - downPayment;
  const i             = effectiveMonthlyRate(rate, compounding);
  const monthlyMortgage = monthlyPayment(loanAmount, rate, amortYears, compounding);
  const annualDebtService = monthlyMortgage * 12;

  // Year-1 income statement
  const effectiveGrossIncome = grossRent * (1 - vacancyPct);
  const operatingExpenses    = grossRent * opexPct;
  const noi                  = effectiveGrossIncome - operatingExpenses;
  const capRate              = price > 0 ? noi / price : 0;
  const cfbt                 = noi - annualDebtService;
  const cashOnCash           = downPayment > 0 ? cfbt / downPayment : 0;
  const dscr                 = annualDebtService > 0 ? noi / annualDebtService : Infinity;

  const buildingBase = price * buildingPct;
  let ucc = buildingBase;                 // undepreciated capital cost
  let balance = loanAmount;
  const series = [];
  let cumCashFlow = 0, cumCashFlowAfterTax = 0;
  const cfPre = [-(downPayment + closingCosts)], cfPost = [-(downPayment + closingCosts)];

  for (let y = 1; y <= holdYears; y++) {
    const value = price * Math.pow(1 + appreciation, y);
    // exact monthly amortization for the year
    let yearInterest = 0, yearPrincipal = 0;
    for (let m = 0; m < 12 && balance > 0; m++) { const int = balance * i; const due = Math.min(monthlyMortgage, balance + int); const pr = Math.max(0, due - int); yearInterest += int; yearPrincipal += pr; balance = Math.max(0, balance - pr); }
    const equity = value - balance;
    const rentFactor = Math.pow(1 + rentGrowth, y - 1);
    const yearGrossRent = grossRent * rentFactor;
    const yearEGI = yearGrossRent * (1 - vacancyPct);
    const yearOpex = yearGrossRent * opexPct;
    const yearNOI = yearEGI - yearOpex;
    const cashFlow = yearNOI - (yearInterest + yearPrincipal);
    cumCashFlow += cashFlow;
    // CCA: half-year rule in year 1; cannot create a rental loss
    const incomeBeforeCCA = yearNOI - yearInterest;
    let ccaThisYear = 0;
    if (claimCCA && incomeBeforeCCA > 0 && ucc > 0) ccaThisYear = Math.min(incomeBeforeCCA, ucc * ccaRate * (y === 1 ? 0.5 : 1));
    ucc = Math.max(0, ucc - ccaThisYear);
    const taxableIncome = incomeBeforeCCA - ccaThisYear;
    const taxThisYear = Math.max(0, taxableIncome) * marginalRate;   // rental losses assumed deductible against other income at the same rate
    const taxSaving = taxableIncome < 0 ? -taxableIncome * marginalRate : 0;
    const cashFlowAfterTax = cashFlow - taxThisYear + taxSaving;
    cumCashFlowAfterTax += cashFlowAfterTax;
    series.push({ year: y, value: Math.round(value), balance: Math.round(balance), equity: Math.round(equity), cashFlow: Math.round(cashFlow), cashFlowAfterTax: Math.round(cashFlowAfterTax), cumCashFlow: Math.round(cumCashFlow), yearNOI: Math.round(yearNOI), yearInterest: Math.round(yearInterest), yearPrincipal: Math.round(yearPrincipal), yearDebtSvc: Math.round(yearInterest + yearPrincipal), yearCCA: Math.round(ccaThisYear), taxableIncome: Math.round(taxableIncome), tax: Math.round(taxThisYear - taxSaving), grossRent: Math.round(yearGrossRent) });
    cfPre.push(cashFlow); cfPost.push(cashFlowAfterTax);
  }

  // ---- Sale metrics ----
  const last = series[series.length - 1];
  const saleValue = last.value;
  const sellingCosts = saleValue * sellingCostPct;
  const capitalGain = Math.max(0, saleValue - sellingCosts - price - closingCosts);
  const totalCCAused = buildingBase - ucc;
  const ccaRecapture = Math.min(totalCCAused, Math.max(0, Math.min(saleValue * buildingPct, buildingBase) - ucc));
  const taxOnGain = capitalGain * inclusion * marginalRate;
  const taxOnRecapture = ccaRecapture * marginalRate;
  const netSaleProceeds = saleValue - sellingCosts - last.balance;
  const netSaleProceedsAfterTax = netSaleProceeds - taxOnGain - taxOnRecapture;
  const totalProfit = netSaleProceeds + cumCashFlow - downPayment - closingCosts;
  const totalProfitAfterTax = netSaleProceedsAfterTax + cumCashFlowAfterTax - downPayment - closingCosts;
  cfPre[cfPre.length - 1] += netSaleProceeds;
  cfPost[cfPost.length - 1] += netSaleProceedsAfterTax;
  const annReturn = irr(cfPre);
  const annReturnAfterTax = irr(cfPost);

  return {
    price, downPayment: Math.round(downPayment), closingCosts: Math.round(closingCosts), loanAmount: Math.round(loanAmount),
    monthlyMortgage: Math.round(monthlyMortgage), annualDebtService: Math.round(annualDebtService), compounding,
    grossRent: Math.round(grossRent), effectiveGrossIncome: Math.round(effectiveGrossIncome), operatingExpenses: Math.round(operatingExpenses),
    noi: Math.round(noi), cfbt: Math.round(cfbt), monthlyNetCashFlow: Math.round(cfbt / 12),
    capRate, cashOnCash, dscr: isFinite(dscr) ? dscr : 999,
    saleValue: Math.round(saleValue), sellingCosts: Math.round(sellingCosts), capitalGain: Math.round(capitalGain), ccaRecapture: Math.round(ccaRecapture), totalCCAused: Math.round(totalCCAused),
    taxOnGain: Math.round(taxOnGain), taxOnRecapture: Math.round(taxOnRecapture), taxOnSale: Math.round(taxOnGain + taxOnRecapture),
    finalEquity: Math.round(saleValue - last.balance), netSaleProceeds: Math.round(netSaleProceeds), netSaleProceedsAfterTax: Math.round(netSaleProceedsAfterTax),
    cumCashFlow: Math.round(cumCashFlow), cumCashFlowAfterTax: Math.round(cumCashFlowAfterTax),
    totalProfit: Math.round(totalProfit), totalProfitAfterTax: Math.round(totalProfitAfterTax),
    annReturn, annReturnAfterTax,
    series,
    note: t('Rendement = TRI des flux nets sur la mise de fonds (avant et après impôt : récupération de la DPA au taux marginal, gain en capital au taux d’inclusion, frais de vente).',
      'Return = IRR of the equity cash flows (pre- and after-tax: CCA recapture at the marginal rate, capital gain at the inclusion rate, selling costs).'),
  };
}
