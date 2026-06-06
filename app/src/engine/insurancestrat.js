// ============================================================
// Advanced insurance techniques
//   CDA credit on corporate-owned life insurance
//   Insured Retirement Plan (IRP) — tax-free policy loans
//   Immediate Financing Arrangement (IFA) — leverage the premium
//   Buy-sell / key-person / estate-equalization sizing
// Figures are illustrative modelling, not policy illustrations.
// ============================================================
import { t } from '../i18n.js';
import { cleanse, fin } from './util.js';

/**
 * Capital Dividend Account credit from a corporate-owned policy.
 * The death benefit less the policy's ACB credits the CDA and can be
 * paid to the estate/shareholders tax-free.
 */
export function cdaCredit(deathBenefit, policyACB = 0) {
  deathBenefit = Number.isFinite(+deathBenefit) ? +deathBenefit : 0; policyACB = Number.isFinite(+policyACB) ? +policyACB : 0;
  const cda = Math.max(0, deathBenefit - policyACB);
  const taxable = Math.min(deathBenefit, policyACB);
  return {
    deathBenefit, policyACB, cda, taxablePortion: taxable,
    taxFreePct: deathBenefit > 0 ? cda / deathBenefit : 0,
  };
}

/**
 * Compare extracting corporate cash at death WITHOUT insurance (taxable
 * dividend) vs WITH a corporate policy crediting the CDA.
 */
export function corporateInsuranceEstate(needAtDeath, deathBenefit, policyACB, dividendTaxRate = 0.47) {
  const taxableRoute = needAtDeath * (1 - dividendTaxRate); // net after dividend tax to extract `need`
  const grossToExtract = needAtDeath / (1 - dividendTaxRate);
  const cda = cdaCredit(deathBenefit, policyACB);
  const insuredNet = cda.cda + cda.taxablePortion * (1 - dividendTaxRate);
  return { taxableRoute, grossToExtract, cda: cda.cda, insuredNet, advantage: insuredNet - taxableRoute };
}

/**
 * Insured Retirement Plan: over-fund a permanent policy, let cash value
 * grow tax-sheltered, then borrow against it tax-free in retirement.
 * p = { annualPremium, fundingYears, currentAge, retireAge, endAge,
 *       creditingRate, costDrag, loanRate, ltvPayout }
 */
export function insuredRetirementPlan(p) {
  p = cleanse(p);
  const { annualPremium = 0, creditingRate = 0.05, costDrag = 0.012, loanRate = 0.055, faceAmount = null } = p;
  // Sanitize ages/counts so extreme inputs never hang.
  const fundingYears = Math.max(0, Math.min(60, Number(p.fundingYears) || 0));
  const currentAge = Number.isFinite(+p.currentAge) ? Math.max(0, Math.min(110, +p.currentAge)) : 40;
  const retireAge = Number.isFinite(+p.retireAge) ? Math.max(currentAge, Math.min(110, +p.retireAge)) : Math.max(currentAge, 65);
  const endAge = Number.isFinite(+p.endAge) ? Math.max(retireAge, Math.min(115, +p.endAge)) : 90;
  const net = creditingRate - costDrag;
  // Death benefit (face) — repays the loan at death. Rough default if not supplied.
  const face = faceAmount || annualPremium * fundingYears * 2.5;
  const series = []; let cv = 0; let age = currentAge;
  for (let y = 0; y < fundingYears; y++) { cv = cv * (1 + net) + annualPremium; series.push({ age: age++, cv, loan: 0 }); }
  while (age < retireAge) { cv = cv * (1 + net); series.push({ age: age++, cv, loan: 0 }); }
  const cvAtRetire = cv;
  // Sustainable annual tax-free loan (~5 % of cash value)
  const annualIncome = cvAtRetire * 0.05;
  let loanBalance = 0;
  for (; age <= endAge; age++) {
    cv = cv * (1 + net);
    loanBalance = loanBalance * (1 + loanRate) + annualIncome;
    series.push({ age, cv, loan: loanBalance });
  }
  const totalPremiums = annualPremium * fundingYears;
  const totalTaxFreeIncome = annualIncome * (endAge - retireAge + 1);
  return {
    series, cvAtRetire, annualIncome, totalPremiums, totalTaxFreeIncome, face,
    loanAtDeath: loanBalance, netToEstate: Math.max(0, face + cv - loanBalance),
  };
}

/**
 * Immediate Financing Arrangement: corp buys the policy then borrows back
 * the premium to keep capital working; interest + collateral insurance
 * deduction reduce the net cost of the coverage.
 * p = { annualPremium, years, loanRate, reinvestReturn, marginalRate, ncpiRate }
 */
export function immediateFinancingArrangement(p) {
  p = cleanse(p);
  const { annualPremium = 0, years = 0, loanRate = 0.06, reinvestReturn = 0.07, marginalRate = 0.50, ncpiRate = 0.4 } = p;
  let loan = 0, reinvest = 0, cumInterest = 0, cumInterestSaving = 0, cumCollateralDed = 0;
  for (let y = 0, _ny = Math.max(0, Math.min(80, Number(years) || 0)); y < _ny; y++) {
    loan += annualPremium;                       // borrow back each premium
    reinvest = reinvest * (1 + reinvestReturn) + annualPremium;
    const interest = loan * loanRate;
    cumInterest += interest;
    cumInterestSaving += interest * marginalRate;          // interest deductible
    cumCollateralDed += annualPremium * ncpiRate * marginalRate; // collateral insurance deduction (NCPI)
  }
  const grossPremiums = annualPremium * years;
  const investmentGain = reinvest - grossPremiums;
  const netCost = grossPremiums - cumInterestSaving - cumCollateralDed - investmentGain + cumInterest;
  return {
    grossPremiums, reinvestValue: reinvest, investmentGain,
    cumInterest, cumInterestSaving, cumCollateralDed,
    netCostOfInsurance: netCost,
  };
}

/** Buy-sell funding: each owner insured for the value of their stake. */
export function buySellNeed(businessValue, owners = 2) {
  const perOwner = businessValue / owners;
  return { perOwner, total: businessValue, owners };
}

/** Key-person coverage ~ multiple of contribution + replacement cost. */
export function keyPersonNeed(annualProfitContribution, replacementCost = 0, multiple = 5) {
  return { coverage: annualProfitContribution * multiple + replacementCost, multiple };
}

/** Estate equalization: insurance to balance an illiquid business left to one heir. */
export function estateEqualization(businessValue, heirs = 2, activeHeirs = 1) {
  const inactive = Math.max(0, heirs - activeHeirs);
  const perHeir = businessValue / heirs;
  return { insuranceNeeded: perHeir * inactive, perHeir, inactiveHeirs: inactive };
}
