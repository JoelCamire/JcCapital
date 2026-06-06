// ============================================================
// Rent vs buy analysis — compares net worth of buying a home
// vs renting and investing the difference, year by year.
// ============================================================
import { t } from '../i18n.js';
import { cleanse, fin } from './util.js';

export function analyzeRentBuy(p) {
  p = cleanse(p);
  const {
    price = 600000, downPct = 0.20, rate = 0.05, amortYears = 25,
    propertyTaxPct = 0.01, maintenancePct = 0.01, closingPct = 0.015,
    appreciation = 0.03, rentMonthly = 2400, rentGrowth = 0.025,
    investmentReturn = 0.05, holdYears = 25,
  } = p;

  const down = price * downPct;
  const closing = price * closingPct;
  const loan0 = price - down;
  const mRate = rate / 12, n = amortYears * 12;
  const monthlyMortgage = mRate > 0 ? loan0 * mRate / (1 - Math.pow(1 + mRate, -n)) : loan0 / n;

  let homeValue = price, balance = loan0, sideFund = down + closing; // renter invests down+closing
  const series = [];
  let breakeven = null;

  for (let y = 1, _n = Math.max(0, Math.min(60, Number(holdYears) || 0)); y <= _n; y++) {
    // Buyer ownership cost this year
    homeValue *= 1 + appreciation;
    let interestYr = 0;
    for (let m = 0; m < 12; m++) { const interest = balance * mRate; interestYr += interest; balance = Math.max(0, balance - (monthlyMortgage - interest)); }
    const propTax = homeValue * propertyTaxPct;
    const maintenance = homeValue * maintenancePct;
    const ownCostYr = monthlyMortgage * 12 + propTax + maintenance;

    // Renter cost this year
    const rentYr = rentMonthly * 12 * Math.pow(1 + rentGrowth, y - 1);
    // Renter invests the difference if ownership costs more
    const diff = ownCostYr - rentYr;
    sideFund *= 1 + investmentReturn;
    if (diff > 0) sideFund += diff;

    const buyNetWorth = homeValue - balance - homeValue * 0.05; // less ~5% selling cost
    const rentNetWorth = sideFund;
    if (breakeven == null && buyNetWorth >= rentNetWorth) breakeven = y;
    series.push({ year: y, buyNetWorth, rentNetWorth, homeValue, balance, sideFund, ownCostYr, rentYr });
  }

  const last = series[series.length - 1] || { buyNetWorth: 0, rentNetWorth: down + closing };
  return {
    down, closing, monthlyMortgage, series,
    buyFinal: last.buyNetWorth, rentFinal: last.rentNetWorth,
    advantage: last.buyNetWorth - last.rentNetWorth, breakeven,
    note: t('Acheter bâtit de l’avoir mais immobilise des capitaux et ajoute taxes/entretien; louer libère des capitaux à investir. Le résultat dépend surtout de l’appréciation immobilière vs le rendement des placements et de la durée de détention.',
      'Buying builds equity but ties up capital and adds taxes/maintenance; renting frees capital to invest. The outcome depends mainly on home appreciation vs investment return and the holding period.'),
  };
}
