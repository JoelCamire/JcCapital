// ============================================================
// Stress-scenario definitions and stress-test runner.
// Each scenario describes a realistic adverse event and how
// to mutate a deep-cloned client before running the engines.
// ============================================================
import { runProjection } from './projection.js';
import { runMonteCarlo } from './montecarlo.js';
import { t } from '../i18n.js';

// ---------------------------------------------------------------------------
// Scenario definitions
// ---------------------------------------------------------------------------

/** Return true when an asset is investable (non-real-estate). */
function isInvestable(asset) {
  return asset.type !== 'realestate';
}

/** Return true when an income is employment or self-employment. */
function isEmployment(inc) {
  return inc.type === 'employment' || inc.type === 'self';
}

export const SCENARIOS = [
  // 1. Market crash --------------------------------------------------------
  {
    key: 'marketCrash',
    name: () => t('Krach boursier', 'Market crash'),
    desc: () => t(
      'Chute de 30 % des actifs investissables et baisse durable des rendements de 2 pts.',
      'Investable assets drop 30 % and returns fall by 2 pts permanently.',
    ),
    apply(c) {
      for (const a of c.assets) {
        if (isInvestable(a)) {
          a.value = a.value * 0.70;
          if (a.costBasis != null) a.costBasis = Math.min(a.costBasis, a.value);
        }
      }
      c.assumptions.preReturn  = Math.max(0, c.assumptions.preReturn  - 0.02);
      c.assumptions.postReturn = Math.max(0, c.assumptions.postReturn - 0.02);
    },
  },

  // 2. Sustained low returns -----------------------------------------------
  {
    key: 'lowReturns',
    name: () => t('Décennie perdue', 'Lost decade'),
    desc: () => t(
      'Rendements réduits de 1,5 pt avant et après retraite (stagnation prolongée).',
      'Returns reduced by 1.5 pts before and after retirement (prolonged stagnation).',
    ),
    apply(c) {
      c.assumptions.preReturn  = Math.max(0, c.assumptions.preReturn  - 0.015);
      c.assumptions.postReturn = Math.max(0, c.assumptions.postReturn - 0.015);
    },
  },

  // 3. High inflation -------------------------------------------------------
  {
    key: 'highInflation',
    name: () => t('Forte inflation', 'High inflation'),
    desc: () => t(
      "Inflation en hausse de 2,5 pts — rogne le pouvoir d'achat et alourdit les dépenses.",
      'Inflation rises by 2.5 pts — erodes purchasing power and lifts expenses.',
    ),
    apply(c) {
      c.assumptions.inflation += 0.025;
      for (const e of c.expenses) {
        if (e.growth != null) e.growth = (e.growth || 0) + 0.02;
      }
    },
  },

  // 4. Longevity risk -------------------------------------------------------
  {
    key: 'longevity',
    name: () => t('Longévité accrue', 'Longevity risk'),
    desc: () => t(
      'Chaque membre vit 5 ans de plus que prévu — le plan doit tenir plus longtemps.',
      'Each member lives 5 years longer than planned — the plan must last longer.',
    ),
    apply(c) {
      for (const m of c.members) {
        m.lifeExpectancy = (m.lifeExpectancy || 90) + 5;
      }
    },
  },

  // 5. Death of primary -----------------------------------------------------
  {
    key: 'deathOfPrimary',
    name: () => t('Décès du titulaire', 'Death of primary'),
    desc: () => t(
      "Les revenus d'emploi du titulaire sont perdus; les dépenses reculent de 20 %.",
      "Primary's employment income is lost; expenses fall 20 %.",
    ),
    apply(c) {
      const primaryId = c.members[0] ? c.members[0].id : null;
      if (!primaryId) return;
      for (const inc of c.incomes) {
        if (inc.memberId === primaryId && isEmployment(inc)) inc.amount = 0;
      }
      for (const e of c.expenses) {
        e.amount = e.amount * 0.80;
      }
    },
  },

  // 6. Disability -----------------------------------------------------------
  {
    key: 'disability',
    name: () => t('Invalidité du titulaire', 'Primary disability'),
    desc: () => t(
      "Capacité de gain du titulaire réduite à 40 % jusqu'à la retraite (invalidité partielle).",
      "Primary's earning capacity reduced to 40 % until retirement (partial disability).",
    ),
    apply(c) {
      const primaryId = c.members[0] ? c.members[0].id : null;
      if (!primaryId) return;
      for (const inc of c.incomes) {
        if (inc.memberId === primaryId && isEmployment(inc)) {
          inc.amount = inc.amount * 0.40;
        }
      }
    },
  },
];

// ---------------------------------------------------------------------------
// Verdict helper
// ---------------------------------------------------------------------------

/** Short bilingual verdict label for a given success rate. */
export function verdict(successRate) {
  if (successRate >= 0.85) return t('Solide', 'Solid');
  if (successRate >= 0.70) return t('Acceptable', 'Acceptable');
  if (successRate >= 0.60) return t('À surveiller', 'Watch');
  return t('À risque', 'At risk');
}

// ---------------------------------------------------------------------------
// Main stress runner
// ---------------------------------------------------------------------------

/**
 * runStress(client) -> { base, scenarios[] }
 *
 * base: { successRate, medianFinal, finalInvestable, depletionAge }
 * scenarios[i]: { key, name, desc, successRate, medianFinal, finalInvestable,
 *                 depletionAge, deltaSuccess, deltaFinal }
 *
 * Uses 400 MC trials per run. The real client is NEVER mutated.
 */
export function runStress(client) {
  const TRIALS = 400;

  // --- Base run ---
  const baseMC   = runMonteCarlo(client, { trials: TRIALS });
  const baseProj = baseMC.det;

  const base = {
    successRate:     baseMC.successRate,
    medianFinal:     baseMC.medianFinal,
    finalInvestable: baseProj.summary.finalInvestable,
    depletionAge:    baseProj.summary.depletionAge,
  };

  // --- Scenario runs ---
  const scenarios = SCENARIOS.map(scen => {
    const clone = JSON.parse(JSON.stringify(client));
    scen.apply(clone);

    const mc   = runMonteCarlo(clone, { trials: TRIALS });
    const proj = mc.det;

    return {
      key:             scen.key,
      name:            scen.name(),
      desc:            scen.desc(),
      successRate:     mc.successRate,
      medianFinal:     mc.medianFinal,
      finalInvestable: proj.summary.finalInvestable,
      depletionAge:    proj.summary.depletionAge,
      deltaSuccess:    mc.successRate - base.successRate,
      deltaFinal:      mc.medianFinal - base.medianFinal,
    };
  });

  return { base, scenarios };
}

