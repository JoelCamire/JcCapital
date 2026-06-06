// ============================================================
// Incorporation decision & self-employed (Canada).
//   Sole proprietor vs CCPC: tax deferral on retained earnings,
//   integration on extracted funds, break-even income level.
//   Self-employed: double CPP/QPP, GST/QST, tax installments.
// ============================================================
import { computeTax } from './tax.js';
import { corporateTaxCA } from './corporate.js';
import { cleanse } from './util.js';
import { t } from '../i18n.js';

/**
 * Should you incorporate?  p = { businessIncome, personalNeed, adminCost }
 * personalNeed = after-tax cash the owner must draw to live.
 */
export function incorporationAnalysis(jur, p) {
  p = cleanse(p);
  const { businessIncome = 150000, personalNeed = 70000, adminCost = 2500 } = p;

  // ---- Sole proprietor: all income taxed personally (employment-style) ----
  const soleTax = computeTax(jur, { ordinary: businessIncome, employment: true });
  const soleNet = businessIncome - soleTax.total;

  // ---- Incorporated: corp pays low rate; owner draws personalNeed; rest deferred ----
  const corp = corporateTaxCA(jur, businessIncome, 0);
  const sbRate = corp.sbRate;
  // salary needed (pre-tax) to net personalNeed for the owner
  let salary = personalNeed, guardLoop = 0;
  while (guardLoop++ < 40) {
    const txt = computeTax(jur, { ordinary: salary, employment: true });
    const net = salary - txt.total;
    const err = personalNeed - net;
    if (Math.abs(err) < 50) break;
    salary += err * 1.3;
  }
  salary = Math.max(0, Math.min(salary, businessIncome));
  const ownerTax = computeTax(jur, { ordinary: salary, employment: true });
  const surplus = Math.max(0, businessIncome - salary);          // retained in corp
  const corpTaxOnSurplus = surplus * sbRate;
  const retainedAfterCorpTax = surplus - corpTaxOnSurplus;
  // Deferral = tax you DON'T pay now by leaving money in the corp at the low rate
  const personalMarginalOnSurplus = computeTax(jur, { ordinary: businessIncome, employment: true }).marginalRate;
  const deferralBenefit = surplus * (personalMarginalOnSurplus - sbRate);

  const incorpTaxThisYear = ownerTax.total + corpTaxOnSurplus;
  const soleTaxThisYear = soleTax.total;
  const taxDeferred = Math.max(0, soleTaxThisYear - incorpTaxThisYear);
  const netAdvantage = deferralBenefit - adminCost;

  return {
    businessIncome, personalNeed, salary, surplus,
    sbRate, soleTax: soleTaxThisYear, soleNet,
    corpTaxOnSurplus, retainedAfterCorpTax, ownerPersonalTax: ownerTax.total,
    incorpTaxThisYear, taxDeferred, deferralBenefit, adminCost, netAdvantage,
    worthwhile: netAdvantage > 0,
    note: t('L’incorporation est surtout avantageuse lorsque vous n’avez pas besoin de tout le revenu : le surplus est imposé au faible taux des PME et reporté. Si vous décaissez tout, l’intégration rend les deux quasi équivalents — moins les frais d’administration.',
      'Incorporation pays off mainly when you don’t need all the income: the surplus is taxed at the low small-business rate and deferred. If you draw everything, integration makes the two nearly equal — minus admin costs.'),
  };
}

/** Break-even business income where incorporation net advantage turns positive. */
export function incorporationBreakeven(jur, personalNeed = 70000, adminCost = 2500) {
  for (let inc = personalNeed; inc <= 1000000; inc += 5000) {
    if (incorporationAnalysis(jur, { businessIncome: inc, personalNeed, adminCost }).netAdvantage > 0) return inc;
  }
  return null;
}

// ---- Self-employed ----
const SE = {
  QC: { cppRate: 0.128, exempt: 3500, ympe: 71300, cpp2: { rate: 0.08, from: 71300, to: 81200 }, qpip: 0.00878, gst: 0.05, pst: 0.09975, quick: 0.036, instThresh: 1800 },
  ROC: { cppRate: 0.119, exempt: 3500, ympe: 71300, cpp2: { rate: 0.08, from: 71300, to: 81200 }, qpip: 0, gst: 0.05, pst: 0.0, quick: 0.036, instThresh: 3000 },
};

/**
 * p = { netSelfEmployment, revenue, gstCollected, homeOfficePct, vehicleBusinessKm, totalKm, vehicleCost }
 */
export function selfEmployedAnalysis(jur, p) {
  p = cleanse(p);
  const region = jur.region;
  const cfg = region === 'QC' ? SE.QC : SE.ROC;
  const { netSelfEmployment = 90000, revenue = 110000, homeOfficeAnnual = 0, vehicleBusinessPct = 0, vehicleAnnual = 0 } = p;

  // deductions
  const homeOfficeDed = Math.max(0, homeOfficeAnnual);
  const vehicleDed = Math.max(0, vehicleAnnual) * Math.max(0, Math.min(1, vehicleBusinessPct));
  const netAfterDed = Math.max(0, netSelfEmployment - homeOfficeDed - vehicleDed);

  // CPP/QPP — self-employed pay BOTH portions
  const pensionable = Math.max(0, Math.min(netAfterDed, cfg.ympe) - cfg.exempt);
  let cpp = pensionable * cfg.cppRate;
  if (netAfterDed > cfg.cpp2.from) cpp += (Math.min(netAfterDed, cfg.cpp2.to) - cfg.cpp2.from) * cfg.cpp2.rate;
  const cppDeductible = cpp / 2;

  // income tax (CPP half deductible). withPayroll:false since CPP handled here
  const tax = computeTax(jur, { ordinary: Math.max(0, netAfterDed - cppDeductible), withPayroll: false, employment: false });
  const totalTax = tax.total + cpp;
  const afterTax = netSelfEmployment - homeOfficeDed - vehicleDed - totalTax;

  // GST/QST — quick method illustrative
  const mustRegister = revenue > 30000;
  const salesTaxCollected = revenue * (cfg.gst + cfg.pst);
  const quickRemit = revenue * cfg.quick; // simplified quick-method remittance
  const salesTaxKept = Math.max(0, salesTaxCollected - quickRemit);

  // installments
  const installmentsRequired = totalTax > cfg.instThresh;
  const quarterlyInstallment = installmentsRequired ? totalTax / 4 : 0;

  return {
    netSelfEmployment, homeOfficeDed, vehicleDed, netAfterDed,
    cpp, cppDeductible, incomeTax: tax.total, totalTax, afterTax,
    averageRate: netSelfEmployment > 0 ? totalTax / netSelfEmployment : 0,
    mustRegister, salesTaxCollected, quickRemit, salesTaxKept,
    installmentsRequired, quarterlyInstallment,
    note: t('Le travailleur autonome paie les DEUX parts du RRQ/RPC (la moitié est déductible). Inscription TPS/TVQ obligatoire au-delà de 30 000 $ de revenus; la méthode rapide simplifie la remise. Des acomptes provisionnels trimestriels s’appliquent si l’impôt net dépasse le seuil.',
      'The self-employed pay BOTH halves of CPP/QPP (half is deductible). GST/QST registration is mandatory above $30,000 of revenue; the quick method simplifies remittance. Quarterly tax installments apply if net tax exceeds the threshold.'),
  };
}
