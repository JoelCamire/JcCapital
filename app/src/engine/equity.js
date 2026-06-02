// ============================================================
// Equity / stock-based compensation
//   CA : CCPC options (deferral + 50% deduction), public options
//        ($200k vesting cap), RSUs
//   US : NSO, ISO (AMT), RSU
//   UK : EMI / unapproved options, RSUs
// Illustrative modelling. CAD/USD/GBP per jurisdiction.
// ============================================================
import { t } from '../i18n.js';

/** Stock options. instrument: 'option' | 'rsu'. */
export function equityComp(jur, p) {
  const { shares = 1000, strike = 10, fmvExercise = 30, fmvSale = 45, grantFmv = 10,
    marginalRate = 0.50, instrument = 'option', isCCPC = false, isISO = false } = p;
  const proceeds = fmvSale * shares;
  const cost = strike * shares;

  if (instrument === 'rsu') {
    const incomeAtVest = fmvExercise * shares;             // FMV at vest treated as fmvExercise input
    const taxAtVest = incomeAtVest * marginalRate;
    const capGain = Math.max(0, (fmvSale - fmvExercise) * shares);
    const capTax = capGain * 0.5 * (jur.country === 'CA' ? marginalRate : marginalRate); // CA 50% incl; US LTCG approx
    const capTaxAdj = jur.country === 'CA' ? capGain * 0.5 * marginalRate : capGain * 0.20;
    const totalTax = taxAtVest + capTaxAdj;
    return {
      instrument: 'rsu', employmentBenefit: incomeAtVest, deduction: 0, taxableBenefit: incomeAtVest,
      taxOnBenefit: taxAtVest, capGain, capGainsTax: capTaxAdj, totalTax,
      netAfterTax: proceeds - totalTax, timing: t('Imposé à l’acquisition (vesting)', 'Taxed at vesting'),
      note: t('Les UAR sont imposées comme un revenu d’emploi à leur juste valeur à l’acquisition; tout gain ultérieur est un gain en capital.',
        'RSUs are taxed as employment income at fair value on vesting; later appreciation is a capital gain.'),
    };
  }

  const benefit = Math.max(0, (fmvExercise - strike) * shares);

  if (jur.country === 'CA') {
    const eligible = isCCPC || strike >= grantFmv;
    const deduction = eligible ? benefit * 0.5 : 0;
    const taxableBenefit = benefit - deduction;
    const taxOnBenefit = taxableBenefit * marginalRate;
    const capGain = Math.max(0, (fmvSale - fmvExercise) * shares);
    const capGainsTax = capGain * 0.5 * marginalRate;
    const totalTax = taxOnBenefit + capGainsTax;
    return {
      instrument: 'option', employmentBenefit: benefit, deduction, taxableBenefit,
      taxOnBenefit, capGain, capGainsTax, totalTax, netAfterTax: proceeds - cost - totalTax,
      timing: isCCPC ? t('Avantage reporté à la vente (SPCC)', 'Benefit deferred to sale (CCPC)') : t('Avantage imposé à l’exercice', 'Benefit taxed at exercise'),
      eligible,
      note: isCCPC
        ? t('Options de SPCC : aucun impôt à l’exercice; l’avantage est imposé à la vente avec une déduction de 50 % si les actions sont conservées 2 ans.', 'CCPC options: no tax at exercise; the benefit is taxed at sale with a 50% deduction if shares are held 2 years.')
        : t('Options de société publique : avantage imposé à l’exercice; déduction de 50 % si le prix de levée ≥ JVM au moment de l’octroi (plafond de 200 000 $ d’acquisition annuelle pour les grands employeurs).', 'Public-company options: benefit taxed at exercise; 50% deduction if strike ≥ grant FMV ($200k annual vesting cap for large employers).'),
    };
  }

  if (jur.country === 'US') {
    if (isISO) {
      const amtPreference = benefit;                       // AMT preference item at exercise
      const ltcg = Math.max(0, (fmvSale - strike) * shares);
      const ltcgTax = ltcg * 0.20;                         // qualifying disposition -> LTCG
      return {
        instrument: 'option', iso: true, employmentBenefit: 0, amtPreference, deduction: 0,
        taxOnBenefit: 0, capGain: ltcg, capGainsTax: ltcgTax, totalTax: ltcgTax,
        netAfterTax: proceeds - cost - ltcgTax, timing: t('AMT à l’exercice; LTCG à la vente admissible', 'AMT at exercise; LTCG on qualifying sale'),
        note: t('ISO : aucun impôt ordinaire à l’exercice mais préférence pour l’AMT. Disposition admissible (2 ans/octroi, 1 an/exercice) → tout le gain en LTCG.',
          'ISO: no ordinary tax at exercise but an AMT preference. Qualifying disposition (2y grant / 1y exercise) → all gain as LTCG.'),
      };
    }
    // NSO
    const taxOnBenefit = benefit * marginalRate;
    const ltcg = Math.max(0, (fmvSale - fmvExercise) * shares);
    const ltcgTax = ltcg * 0.20;
    return {
      instrument: 'option', employmentBenefit: benefit, deduction: 0, taxableBenefit: benefit,
      taxOnBenefit, capGain: ltcg, capGainsTax: ltcgTax, totalTax: taxOnBenefit + ltcgTax,
      netAfterTax: proceeds - cost - taxOnBenefit - ltcgTax, timing: t('Revenu ordinaire à l’exercice', 'Ordinary income at exercise'),
      note: t('NSO : écart imposé en revenu ordinaire (+ charges sociales) à l’exercice; gain ultérieur en plus-value.', 'NSO: spread taxed as ordinary income (+ payroll) at exercise; later gain is capital.'),
    };
  }

  // UK
  const taxOnBenefit = benefit * marginalRate;
  const capGain = Math.max(0, (fmvSale - fmvExercise) * shares);
  const cgt = capGain * 0.20;
  return {
    instrument: 'option', employmentBenefit: benefit, deduction: 0, taxableBenefit: benefit,
    taxOnBenefit, capGain, capGainsTax: cgt, totalTax: taxOnBenefit + cgt,
    netAfterTax: proceeds - cost - taxOnBenefit - cgt, timing: t('Revenu à l’exercice (sauf EMI)', 'Income at exercise (unless EMI)'),
    note: t('Les options EMI/approuvées bénéficient d’un traitement en plus-value (CGT 10–20 %); les options non approuvées sont imposées comme un revenu à l’exercice.',
      'EMI/approved options get capital-gains treatment (CGT 10–20%); unapproved options are taxed as income at exercise.'),
  };
}
