// ============================================================
// Equity / stock-based compensation
//   CA : CCPC options (deferral + 50% deduction), public options
//        ($200k vesting cap), RSUs
//   US : NSO, ISO (AMT), RSU — LTCG rate from the jurisdiction table
//   UK : EMI / unapproved options, RSUs — CGT from the jurisdiction
// Illustrative modelling. CAD/USD/GBP per jurisdiction.
// ============================================================
import { t } from '../i18n.js';
import { cleanse } from './util.js';
import { bracketMarginal } from './tax.js';

/** Long-term capital gains / CGT rate for the jurisdiction at a given other income. */
function capGainsRate(jur, marginalRate, otherIncome = 0) {
  if (jur.country === 'CA') return (jur.capGainsInclusion ?? 0.5) * marginalRate;
  if (jur.country === 'US') return jur.fed?.ltcg ? bracketMarginal(Math.max(0, otherIncome), jur.fed.ltcg) : 0.20;
  const cg = jur.regionData?.capGains || jur.fed?.capGains;
  return cg ? (otherIncome > (jur.regionData?.brackets?.[0]?.upTo || 50270) ? cg.higher : cg.basic) : 0.20;
}

/** Stock options. instrument: 'option' | 'rsu'. */
export function equityComp(jur, p) {
  p = cleanse(p);
  const { shares = 1000, strike = 10, fmvExercise = 30, fmvSale = 45, grantFmv = 10,
    marginalRate = 0.50, instrument = 'option', isCCPC = false, isISO = false, otherIncome = 100000 } = p;
  const proceeds = fmvSale * shares;
  const cost = strike * shares;
  const cgRate = capGainsRate(jur, marginalRate, otherIncome);
  const inclusion = jur.capGainsInclusion ?? 0.5;

  if (instrument === 'rsu') {
    const incomeAtVest = fmvExercise * shares;
    const taxAtVest = incomeAtVest * marginalRate;
    const capGain = Math.max(0, (fmvSale - fmvExercise) * shares);
    const capGainsTax = capGain * cgRate;
    const totalTax = taxAtVest + capGainsTax;
    return {
      instrument: 'rsu', employmentBenefit: incomeAtVest, deduction: 0, taxableBenefit: incomeAtVest,
      taxOnBenefit: taxAtVest, capGain, capGainsTax, totalTax, capGainsRate: cgRate,
      netAfterTax: proceeds - totalTax, timing: t('Imposé à l’acquisition (vesting)', 'Taxed at vesting'),
      note: t('Les UAR sont imposées comme un revenu d’emploi à leur juste valeur à l’acquisition; tout gain ultérieur est un gain en capital.',
        'RSUs are taxed as employment income at fair value on vesting; later appreciation is a capital gain.'),
    };
  }

  const benefit = Math.max(0, (fmvExercise - strike) * shares);

  if (jur.country === 'CA') {
    const eligible = isCCPC || strike >= grantFmv;
    const deduction = eligible ? benefit * inclusion : 0;       // stock-option deduction mirrors the inclusion rate
    const taxableBenefit = benefit - deduction;
    const taxOnBenefit = taxableBenefit * marginalRate;
    const capGain = Math.max(0, (fmvSale - fmvExercise) * shares);
    const capGainsTax = capGain * cgRate;
    const totalTax = taxOnBenefit + capGainsTax;
    return {
      instrument: 'option', employmentBenefit: benefit, deduction, taxableBenefit,
      taxOnBenefit, capGain, capGainsTax, totalTax, capGainsRate: cgRate, netAfterTax: proceeds - cost - totalTax,
      timing: isCCPC ? t('Avantage reporté à la vente (SPCC)', 'Benefit deferred to sale (CCPC)') : t('Avantage imposé à l’exercice', 'Benefit taxed at exercise'),
      eligible,
      note: isCCPC
        ? t('Options de SPCC : aucun impôt à l’exercice; l’avantage est imposé à la vente avec une déduction de 50 % si les actions sont conservées 2 ans.', 'CCPC options: no tax at exercise; the benefit is taxed at sale with a 50% deduction if shares are held 2 years.')
        : t('Options de société publique : avantage imposé à l’exercice; déduction de 50 % si le prix de levée ≥ JVM au moment de l’octroi (plafond de 200 000 $ d’acquisition annuelle pour les grands employeurs).', 'Public-company options: benefit taxed at exercise; 50% deduction if strike ≥ grant FMV ($200k annual vesting cap for large employers).'),
    };
  }

  if (jur.country === 'US') {
    if (isISO) {
      const amtPreference = benefit;
      const ltcg = Math.max(0, (fmvSale - strike) * shares);
      const ltcgTax = ltcg * cgRate;
      return {
        instrument: 'option', iso: true, employmentBenefit: 0, amtPreference, deduction: 0,
        taxOnBenefit: 0, capGain: ltcg, capGainsTax: ltcgTax, totalTax: ltcgTax, capGainsRate: cgRate,
        netAfterTax: proceeds - cost - ltcgTax, timing: t('AMT à l’exercice; LTCG à la vente admissible', 'AMT at exercise; LTCG on qualifying sale'),
        note: t('ISO : aucun impôt ordinaire à l’exercice mais préférence pour l’AMT. Disposition admissible (2 ans/octroi, 1 an/exercice) → tout le gain en LTCG.',
          'ISO: no ordinary tax at exercise but an AMT preference. Qualifying disposition (2y grant / 1y exercise) → all gain as LTCG.'),
      };
    }
    const taxOnBenefit = benefit * marginalRate;
    const ltcg = Math.max(0, (fmvSale - fmvExercise) * shares);
    const ltcgTax = ltcg * cgRate;
    return {
      instrument: 'option', employmentBenefit: benefit, deduction: 0, taxableBenefit: benefit,
      taxOnBenefit, capGain: ltcg, capGainsTax: ltcgTax, totalTax: taxOnBenefit + ltcgTax, capGainsRate: cgRate,
      netAfterTax: proceeds - cost - taxOnBenefit - ltcgTax, timing: t('Revenu ordinaire à l’exercice', 'Ordinary income at exercise'),
      note: t('NSO : écart imposé en revenu ordinaire (+ charges sociales) à l’exercice; gain ultérieur en plus-value.', 'NSO: spread taxed as ordinary income (+ payroll) at exercise; later gain is capital.'),
    };
  }

  const taxOnBenefit = benefit * marginalRate;
  const capGain = Math.max(0, (fmvSale - fmvExercise) * shares);
  const cgt = capGain * cgRate;
  return {
    instrument: 'option', employmentBenefit: benefit, deduction: 0, taxableBenefit: benefit,
    taxOnBenefit, capGain, capGainsTax: cgt, totalTax: taxOnBenefit + cgt, capGainsRate: cgRate,
    netAfterTax: proceeds - cost - taxOnBenefit - cgt, timing: t('Revenu à l’exercice (sauf EMI)', 'Income at exercise (unless EMI)'),
    note: t('Les options EMI/approuvées bénéficient d’un traitement en plus-value (CGT 18–24 %); les options non approuvées sont imposées comme un revenu à l’exercice.',
      'EMI/approved options get capital-gains treatment (CGT 18–24%); unapproved options are taxed as income at exercise.'),
  };
}
