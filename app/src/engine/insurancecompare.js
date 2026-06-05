// ============================================================
// Life insurance product comparison
//   Term vs Whole Life vs T100/Universal, plus the classic
//   "buy term and invest the difference" (BTID) analysis.
// Illustrative modelling — real policy illustrations required.
// ============================================================
import { t } from '../i18n.js';

/**
 * p = { coverage, currentAge, horizonAge, termPremium, wholePremium,
 *       t100Premium, csvGrowth, csvAllocation, investReturn, termYears }
 */
export function compareLifeProducts(p) {
  const {
    coverage = 500000, currentAge = 40, horizonAge = 85,
    termPremium = 600, wholePremium = 6500, t100Premium = 3800,
    csvGrowth = 0.045, csvAllocation = 0.55, investReturn = 0.06, termYears = 20,
  } = p;
  const years = Math.max(1, horizonAge - currentAge);

  // Term: level premium for termYears, then coverage ends (or renews much higher)
  const termPaid = termPremium * Math.min(termYears, years);

  // Whole life: lifelong level premium, builds cash value
  let wholeCV = 0, wholePaid = 0;
  for (let y = 0; y < years; y++) { wholeCV = wholeCV * (1 + csvGrowth) + wholePremium * csvAllocation; wholePaid += wholePremium; }

  // T100 / Universal: permanent, cheaper, minimal cash value
  let t100CV = 0, t100Paid = 0;
  for (let y = 0; y < years; y++) { t100CV = t100CV * (1 + csvGrowth) + t100Premium * 0.15; t100Paid += t100Premium; }

  // BTID: buy term, invest (whole - term) difference at investReturn
  let sideFund = 0;
  const diff = Math.max(0, wholePremium - termPremium);
  for (let y = 0; y < years; y++) {
    sideFund = sideFund * (1 + investReturn);
    if (y < termYears) sideFund += diff; else sideFund += wholePremium; // after term, redirect full premium
  }

  return {
    years, coverage,
    term: { paid: termPaid, cv: 0, netCost: termPaid, lifelong: false },
    whole: { paid: wholePaid, cv: wholeCV, netCost: wholePaid - wholeCV, lifelong: true },
    t100: { paid: t100Paid, cv: t100CV, netCost: t100Paid - t100CV, lifelong: true },
    btid: { sideFund, termPaid, coverageGap: true },
    btidVsWhole: sideFund - wholeCV,
    note: t('« Acheter temporaire et investir la différence » bat souvent la vie entière sur le plan du rendement, mais l’assurance permanente garantit une protection à vie, une valeur de rachat et des avantages successoraux/corporatifs (CDC). Le bon choix dépend du besoin (temporaire vs permanent) et de la discipline d’épargne.',
      '“Buy term and invest the difference” often beats whole life on return, but permanent insurance guarantees lifelong protection, cash value and estate/corporate benefits (CDA). The right choice depends on the need (temporary vs permanent) and saving discipline.'),
  };
}
