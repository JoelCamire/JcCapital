// ============================================================
// Rent vs buy analysis — compares net worth of buying a home
// vs renting and investing the difference, year by year.
// Symmetric: whichever option is cheaper in a given year, the
// saving is invested on that side. Canadian mortgages compound
// semi-annually.
// ============================================================
import { t } from '../i18n.js';
import { cleanse } from './util.js';
import { monthlyPayment, effectiveMonthlyRate } from './amortization.js';

export function analyzeRentBuy(p) {
  p = cleanse(p);
  const {
    price = 600000, downPct = 0.20, rate = 0.05, amortYears = 25,
    propertyTaxPct = 0.01, maintenancePct = 0.01, closingPct = 0.015, sellingCostPct = 0.05,
    appreciation = 0.03, rentMonthly = 2400, rentGrowth = 0.025,
    investmentReturn = 0.05, holdYears = 25, compounding = 'semi-annual',
  } = p;

  const down = price * downPct;
  const closing = price * closingPct;
  const loan0 = Math.max(0, price - down);
  const i = effectiveMonthlyRate(rate, compounding);
  const mortgage = monthlyPayment(loan0, rate, amortYears, compounding);

  let homeValue = price, balance = loan0, renterFund = down + closing, buyerFund = 0;
  const series = [];
  let breakeven = null;

  for (let y = 1, _n = Math.max(0, Math.min(60, Number(holdYears) || 0)); y <= _n; y++) {
    homeValue *= 1 + appreciation;
    let interestYr = 0, paidYr = 0;
    for (let m = 0; m < 12 && balance > 0; m++) { const interest = balance * i; const due = Math.min(mortgage, balance + interest); interestYr += interest; paidYr += due; balance = Math.max(0, balance + interest - due); }
    const propTax = homeValue * propertyTaxPct;
    const maintenance = homeValue * maintenancePct;
    const ownCostYr = paidYr + propTax + maintenance;
    const rentYr = rentMonthly * 12 * Math.pow(1 + rentGrowth, y - 1);
    const diff = ownCostYr - rentYr;                     // >0: renting is cheaper → renter invests; <0: owning cheaper → buyer invests
    renterFund *= 1 + investmentReturn; buyerFund *= 1 + investmentReturn;
    if (diff > 0) renterFund += diff; else buyerFund += -diff;
    const buyNetWorth = homeValue * (1 - sellingCostPct) - balance + buyerFund;
    const rentNetWorth = renterFund;
    if (breakeven == null && buyNetWorth >= rentNetWorth) breakeven = y;
    series.push({ year: y, buyNetWorth, rentNetWorth, homeValue, balance, sideFund: renterFund, buyerFund, ownCostYr, rentYr, interestYr });
  }

  const last = series[series.length - 1] || { buyNetWorth: 0, rentNetWorth: down + closing };
  return {
    down, closing, monthlyMortgage: mortgage, series,
    buyFinal: last.buyNetWorth, rentFinal: last.rentNetWorth,
    advantage: last.buyNetWorth - last.rentNetWorth, breakeven,
    note: t('Acheter bâtit de l’avoir mais immobilise des capitaux et ajoute taxes/entretien; louer libère des capitaux à investir. Le résultat dépend surtout de l’appréciation immobilière vs le rendement des placements et de la durée de détention.',
      'Buying builds equity but ties up capital and adds taxes/maintenance; renting frees capital to invest. The outcome depends mainly on home appreciation vs investment return and the holding period.'),
  };
}
