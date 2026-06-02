// ============================================================
// Real estate / rental property analysis engine
// ============================================================
import { t } from '../i18n.js';

/**
 * Compute standard monthly mortgage payment (fixed-rate amortization).
 * Returns 0 if loanAmount <= 0 or rate <= 0 but amort > 0.
 */
function monthlyMortgagePayment(loanAmount, annualRate, amortYears) {
  if (loanAmount <= 0) return 0;
  if (annualRate <= 0) return amortYears > 0 ? loanAmount / (amortYears * 12) : 0;
  const r = annualRate / 12;
  const n = amortYears * 12;
  return loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * Remaining mortgage balance after k months of payments.
 */
function remainingBalance(loanAmount, annualRate, amortYears, months) {
  if (loanAmount <= 0) return 0;
  if (annualRate <= 0) {
    const n = amortYears * 12;
    return Math.max(0, loanAmount * (1 - months / n));
  }
  const r = annualRate / 12;
  const n = amortYears * 12;
  return loanAmount * (Math.pow(1 + r, n) - Math.pow(1 + r, months)) / (Math.pow(1 + r, n) - 1);
}

/**
 * Annual mortgage interest paid in year y (1-indexed).
 * Computes the total interest between month (y-1)*12 and y*12.
 */
function annualInterest(loanAmount, annualRate, amortYears, year) {
  if (loanAmount <= 0 || annualRate <= 0) return 0;
  const r = annualRate / 12;
  const monthlyPmt = monthlyMortgagePayment(loanAmount, annualRate, amortYears);
  const startMonth = (year - 1) * 12;
  const endMonth = year * 12;
  const maxMonth = amortYears * 12;
  let totalInterest = 0;
  for (let m = startMonth + 1; m <= Math.min(endMonth, maxMonth); m++) {
    const bal = remainingBalance(loanAmount, annualRate, amortYears, m - 1);
    if (bal <= 0) break;
    totalInterest += bal * r;
  }
  return totalInterest;
}

/**
 * Simple annualized return from total return over holdYears.
 * Uses: (1 + totalReturn)^(1/holdYears) - 1
 */
function annualizedReturn(totalReturn, holdYears) {
  if (holdYears <= 0 || !isFinite(totalReturn)) return 0;
  return Math.pow(1 + totalReturn, 1 / holdYears) - 1;
}

/**
 * Analyze a rental / investment real estate property.
 *
 * @param {object} p
 * @param {number} p.price           Purchase price
 * @param {number} p.downPct         Down payment as fraction (e.g. 0.20)
 * @param {number} p.rate            Annual mortgage rate (e.g. 0.055)
 * @param {number} p.amortYears      Amortization in years
 * @param {number} p.grossRent       Gross annual rent income
 * @param {number} p.vacancyPct      Vacancy rate fraction (e.g. 0.05)
 * @param {number} p.opexPct         Operating expenses as fraction of gross rent (e.g. 0.35)
 * @param {number} p.appreciation    Annual property appreciation rate (e.g. 0.03)
 * @param {number} p.rentGrowth      Annual rent growth rate (e.g. 0.02)
 * @param {number} p.marginalRate    Investor marginal income tax rate (e.g. 0.46)
 * @param {number} [p.ccaRate=0.04]  CCA (depreciation) rate on building (e.g. 0.04)
 * @param {number} p.holdYears       Hold period in years
 *
 * @returns {object} Rich metrics + yearly series
 */
export function analyzeProperty(p) {
  const price        = Math.max(0, p.price        || 0);
  const downPct      = Math.min(1, Math.max(0, p.downPct      ?? 0.20));
  const rate         = Math.max(0, p.rate         ?? 0.055);
  const amortYears   = Math.max(1, p.amortYears   || 25);
  const grossRent    = Math.max(0, p.grossRent    || 0);
  const vacancyPct   = Math.min(1, Math.max(0, p.vacancyPct   ?? 0.05));
  const opexPct      = Math.min(1, Math.max(0, p.opexPct      ?? 0.35));
  const appreciation = p.appreciation ?? 0.03;
  const rentGrowth   = p.rentGrowth   ?? 0.02;
  const marginalRate = Math.min(1, Math.max(0, p.marginalRate ?? 0.46));
  const ccaRate      = Math.max(0, p.ccaRate      ?? 0.04);
  const holdYears    = Math.max(1, Math.min(50, p.holdYears || 10));

  // ---- Purchase metrics ---------------------------------------------------
  const downPayment   = price * downPct;
  const loanAmount    = price - downPayment;
  const monthlyMortgage = monthlyMortgagePayment(loanAmount, rate, amortYears);
  const annualDebtService = monthlyMortgage * 12;

  // Year-1 income statement
  const effectiveGrossIncome = grossRent * (1 - vacancyPct);
  const operatingExpenses    = grossRent * opexPct;
  const noi                  = effectiveGrossIncome - operatingExpenses;
  const capRate              = price > 0 ? noi / price : 0;
  const cfbt                 = noi - annualDebtService; // cash flow before tax
  const cashOnCash           = downPayment > 0 ? cfbt / downPayment : 0;
  const dscr                 = annualDebtService > 0 ? noi / annualDebtService : Infinity;

  // CCA base = building value (assume 80 % of price is building, land is not depreciable)
  const buildingBase = price * 0.80;

  // ---- Year-by-year projection --------------------------------------------
  const series = [];
  let cumCashFlow = 0;

  // CCA declining balance tracking (half-year rule in year 1 for CA)
  let ccaUndepreciated = buildingBase * 0.50; // half-year rule opening balance

  for (let y = 1; y <= holdYears; y++) {
    const growthFactor  = Math.pow(1 + appreciation, y);
    const rentFactor    = Math.pow(1 + rentGrowth, y - 1);

    const value         = price * growthFactor;
    const balance       = Math.max(0, remainingBalance(loanAmount, rate, amortYears, y * 12));
    const equity        = value - balance;

    // Income for this year
    const yearGrossRent = grossRent * rentFactor;
    const yearEGI       = yearGrossRent * (1 - vacancyPct);
    const yearOpex      = yearGrossRent * opexPct;
    const yearNOI       = yearEGI - yearOpex;
    const yearInterest  = annualInterest(loanAmount, rate, amortYears, y);
    const yearPrincipal = Math.max(0, Math.min(annualDebtService - yearInterest, loanAmount - Math.max(0, remainingBalance(loanAmount, rate, amortYears, y * 12))));
    const cashFlow      = yearNOI - annualDebtService;
    cumCashFlow        += cashFlow;

    // CCA for this year (declining balance)
    const ccaThisYear   = ccaUndepreciated * ccaRate;
    ccaUndepreciated    = Math.max(0, ccaUndepreciated - ccaThisYear);
    // Add back half-year basis in year 2 (second half of first-year addition)
    if (y === 1) ccaUndepreciated += buildingBase * 0.50;

    // Taxable income (for informational purposes — not factored into cashFlow)
    const taxableIncome = yearNOI - yearInterest - ccaThisYear;

    series.push({
      year: y,
      value        : Math.round(value),
      balance      : Math.round(balance),
      equity       : Math.round(equity),
      cashFlow     : Math.round(cashFlow),
      cumCashFlow  : Math.round(cumCashFlow),
      yearNOI      : Math.round(yearNOI),
      yearInterest : Math.round(yearInterest),
      yearDebtSvc  : Math.round(annualDebtService),
      yearCCA      : Math.round(ccaThisYear),
      taxableIncome: Math.round(taxableIncome),
    });
  }

  // ---- Sale metrics -------------------------------------------------------
  const lastRow     = series[series.length - 1];
  const saleValue   = lastRow.value;
  const finalBalance = lastRow.balance;
  const finalEquity  = lastRow.equity;

  // Capital gain = saleValue - original price (simplified, no selling costs)
  const capitalGain  = Math.max(0, saleValue - price);
  // CCA recapture = original building base - remaining UCC (if UCC < building base)
  const totalCCAused = buildingBase - ccaUndepreciated;
  const ccaRecapture = Math.max(0, Math.min(totalCCAused, saleValue * 0.80 - ccaUndepreciated));

  // Total profit: net sale proceeds + cumulative cash flow - down payment
  const saleProceeds = finalEquity; // saleValue - remaining mortgage
  const totalProfit  = saleProceeds + cumCashFlow - downPayment;
  const simpleTotal  = downPayment > 0 ? totalProfit / downPayment : 0;
  const annReturn    = annualizedReturn(simpleTotal, holdYears);

  return {
    // Purchase
    price,
    downPayment  : Math.round(downPayment),
    loanAmount   : Math.round(loanAmount),
    monthlyMortgage: Math.round(monthlyMortgage),
    annualDebtService: Math.round(annualDebtService),

    // Year-1 income statement
    effectiveGrossIncome: Math.round(effectiveGrossIncome),
    operatingExpenses   : Math.round(operatingExpenses),
    noi                 : Math.round(noi),
    cfbt                : Math.round(cfbt),
    monthlyNetCashFlow  : Math.round(cfbt / 12),

    // Ratios
    capRate,
    cashOnCash,
    dscr: isFinite(dscr) ? dscr : 999,

    // Sale
    saleValue    : Math.round(saleValue),
    capitalGain  : Math.round(capitalGain),
    ccaRecapture : Math.round(ccaRecapture),
    totalCCAused : Math.round(totalCCAused),
    finalEquity  : Math.round(finalEquity),
    cumCashFlow  : Math.round(cumCashFlow),
    totalProfit  : Math.round(totalProfit),
    annReturn,

    // Series
    series,
  };
}
