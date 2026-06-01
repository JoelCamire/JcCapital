// ============================================================
// Tax & decumulation optimization engine.
// Pure functions — no DOM, no side effects.
// ============================================================
import { computeTax } from './tax.js';
import { treatmentOf } from './projection.js';
import { t } from '../i18n.js';

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/** Sum ordinary taxable incomes for a member across relevant income types. */
function memberOrdinaryIncome(client, memberId) {
  const ordinaryTypes = ['employment', 'self', 'pension', 'cpp', 'oas'];
  return client.incomes
    .filter(i => (i.memberId == null ? true : i.memberId === memberId) && ordinaryTypes.includes(i.type))
    .reduce((s, i) => s + (i.amount || 0), 0);
}

/** Primary member (first in members array). */
function primaryMember(client) {
  return client.members[0] || { id: null, currentAge: 45, retirementAge: 65, name: '' };
}

// ----------------------------------------------------------------
// 1. Income splitting
// ----------------------------------------------------------------

/**
 * incomeSplitting(client, jur)
 * Only meaningful when filingStatus === 'married' and there are 2+ members.
 * Returns { current, optimized, savings, applicable }
 */
export function incomeSplitting(client, jur) {
  const married = client.filingStatus === 'married';
  const hasPair = client.members.length >= 2;

  if (!married || !hasPair) {
    return {
      current: null,
      optimized: null,
      savings: 0,
      applicable: false,
      note: t(
        'Le fractionnement s\'applique uniquement aux couples mariés avec deux membres.',
        'Income splitting applies only to married couples with two members.'
      ),
    };
  }

  const m0 = client.members[0];
  const m1 = client.members[1];
  const inc0 = memberOrdinaryIncome(client, m0.id);
  const inc1 = memberOrdinaryIncome(client, m1.id);
  const totalIncome = inc0 + inc1;

  // Current tax: each member pays on their own income
  const tx0cur = computeTax(jur, { ordinary: inc0, withPayroll: true, filingStatus: 'single' });
  const tx1cur = computeTax(jur, { ordinary: inc1, withPayroll: true, filingStatus: 'single' });
  const current = tx0cur.total + tx1cur.total;

  // Optimized: equalize 50/50 (proxy for pension/income splitting)
  const half = totalIncome / 2;
  const tx0opt = computeTax(jur, { ordinary: half, withPayroll: true, filingStatus: 'single' });
  const tx1opt = computeTax(jur, { ordinary: half, withPayroll: true, filingStatus: 'single' });
  const optimized = tx0opt.total + tx1opt.total;

  const savings = Math.max(0, current - optimized);

  return {
    current,
    optimized,
    savings,
    applicable: true,
    member0: { name: m0.name, income: inc0, tax: tx0cur.total },
    member1: { name: m1.name, income: inc1, tax: tx1cur.total },
    totalIncome,
  };
}

// ----------------------------------------------------------------
// 2. RRSP vs TFSA (tax-advantaged vs tax-free)
// ----------------------------------------------------------------

/**
 * rrspVsTfsa(client, jur)
 * Compares current marginal rate vs estimated retirement marginal rate.
 * Returns { currentMarginal, retireMarginal, recommend, spread }
 */
export function rrspVsTfsa(client, jur) {
  const primary = primaryMember(client);
  const ordinaryTypes = ['employment', 'self', 'pension', 'cpp', 'oas'];
  const currentIncome = client.incomes
    .filter(i => (i.memberId == null || i.memberId === primary.id) && ordinaryTypes.includes(i.type))
    .reduce((s, i) => s + (i.amount || 0), 0) || 60000;

  const txNow = computeTax(jur, { ordinary: currentIncome, withPayroll: false });
  const currentMarginal = txNow.marginalRate;

  // Estimate retirement income as ~60% of current ordinary income (simplified)
  const retirementIncome = currentIncome * 0.6;
  const txRetire = computeTax(jur, { ordinary: retirementIncome, withPayroll: false });
  const retireMarginal = txRetire.marginalRate;

  const spread = currentMarginal - retireMarginal;
  // Recommend deferred (RRSP/401k) if current bracket is higher; taxfree (TFSA/Roth) otherwise
  const recommend = currentMarginal > retireMarginal ? 'deferred' : 'taxfree';

  return { currentMarginal, retireMarginal, recommend, spread };
}

// ----------------------------------------------------------------
// 3. Asset location
// ----------------------------------------------------------------

/**
 * assetLocation(client, jur)
 * Returns { findings: [{label, detail, severity}], annualTaxDrag }
 */
export function assetLocation(client, jur) {
  const findings = [];

  if (!client.assets || client.assets.length === 0) {
    findings.push({
      label: t('Aucun actif enregistré', 'No assets on record'),
      detail: t(
        'Ajoutez des actifs pour obtenir des recommandations d\'emplacement.',
        'Add assets to receive location recommendations.'
      ),
      severity: 'ok',
    });
    return { findings, annualTaxDrag: 0 };
  }

  // Marginal rate for tax drag estimate (primary member)
  const primary = primaryMember(client);
  const primaryIncome = client.incomes
    .filter(i => (i.memberId == null || i.memberId === primary.id) && ['employment', 'self'].includes(i.type))
    .reduce((s, i) => s + (i.amount || 0), 0) || 60000;
  const txPrimary = computeTax(jur, { ordinary: primaryIncome, withPayroll: false });
  const marginalRate = txPrimary.marginalRate || 0.4;

  let annualTaxDrag = 0;

  for (const asset of client.assets) {
    const treatment = treatmentOf(asset.type);
    const value = asset.value || 0;
    const growth = asset.growth || 0;
    const label = asset.label || asset.type;

    if (treatment === 'taxable') {
      // Estimate annual tax drag: growth income * partial inclusion * marginal rate
      const dragRate = growth * 0.45 * marginalRate;
      const drag = value * dragRate;
      annualTaxDrag += drag;

      if (growth < 0.03 && value > 10000) {
        // Low-growth (interest-bearing) in non-registered — should be in registered
        findings.push({
          label: t(
            `${label} — faible croissance en non-enregistré`,
            `${label} — low growth in non-registered`
          ),
          detail: t(
            `Un placement à faible rendement (${(growth * 100).toFixed(1)} %) en compte non-enregistré génère des revenus d'intérêt entièrement imposables. Préférez un compte enregistré ou à l'abri de l'impôt.`,
            `A low-yield asset (${(growth * 100).toFixed(1)} %) in a non-registered account generates fully taxable interest income. Prefer a registered or tax-free account.`
          ),
          severity: 'warn',
        });
      } else if (growth >= 0.05 && value > 10000) {
        // Growth asset in non-registered — cap gains are generally OK but suboptimal vs TFSA
        findings.push({
          label: t(
            `${label} — croissance en non-enregistré`,
            `${label} — growth asset in non-registered`
          ),
          detail: t(
            `Ce placement à forte croissance (${(growth * 100).toFixed(1)} %) pourrait bénéficier d'un abri fiscal (CELI/REER) pour différer ou éliminer l'impôt sur les gains.`,
            `This high-growth asset (${(growth * 100).toFixed(1)} %) could benefit from a tax shelter (TFSA/RRSP) to defer or eliminate gains tax.`
          ),
          severity: 'warn',
        });
      }
    } else if (treatment === 'taxfree') {
      if (growth < 0.03 && value > 5000) {
        findings.push({
          label: t(
            `${label} — faible rendement en compte libre d'impôt`,
            `${label} — low yield in tax-free account`
          ),
          detail: t(
            `Un actif à faible rendement occupe de la précieuse marge de cotisation dans un compte libre d'impôt. Envisagez d'y loger plutôt des placements à forte croissance.`,
            `A low-yield asset occupies valuable contribution room in a tax-free account. Consider placing high-growth investments there instead.`
          ),
          severity: 'warn',
        });
      } else if (growth >= 0.05) {
        findings.push({
          label: t(
            `${label} — bien positionné`,
            `${label} — well positioned`
          ),
          detail: t(
            `Excellent : les actifs à forte croissance dans un compte libre d'impôt maximisent la croissance à l'abri de l'impôt.`,
            `Excellent: high-growth assets in a tax-free account maximize tax-sheltered growth.`
          ),
          severity: 'ok',
        });
      }
    } else if (treatment === 'deferred') {
      if (growth >= 0.06) {
        findings.push({
          label: t(
            `${label} — croissance élevée en compte différé`,
            `${label} — high growth in deferred account`
          ),
          detail: t(
            `Croissance à l'abri de l'impôt jusqu'au retrait — approprié. Les retraits seront imposés comme revenu ordinaire ; comparez avec un compte libre d'impôt si votre taux à la retraite dépasse le taux actuel.`,
            `Growth is tax-sheltered until withdrawal — appropriate. Withdrawals are taxed as ordinary income; compare with a tax-free account if your retirement rate exceeds today's rate.`
          ),
          severity: 'ok',
        });
      }
    }
  }

  if (findings.length === 0) {
    findings.push({
      label: t('Emplacement des actifs optimal', 'Asset location looks optimal'),
      detail: t(
        'Aucune amélioration immédiate détectée selon l\'analyse heuristique.',
        'No immediate improvements detected based on heuristic analysis.'
      ),
      severity: 'ok',
    });
  }

  return { findings, annualTaxDrag };
}

// ----------------------------------------------------------------
// 4. Withdrawal order
// ----------------------------------------------------------------

/**
 * withdrawalOrder(client, jur)
 * Returns array of [{name, desc, note, recommended}] — qualitative, educational.
 */
export function withdrawalOrder(client, jur) {
  const primary = primaryMember(client);
  const income = client.incomes
    .filter(i => (i.memberId == null || i.memberId === primary.id) && ['employment', 'self'].includes(i.type))
    .reduce((s, i) => s + (i.amount || 0), 0) || 60000;
  const tx = computeTax(jur, { ordinary: income * 0.6, withPayroll: false });
  const lowRate = tx.marginalRate < 0.3;

  return [
    {
      name: t('Taxable en premier', 'Taxable first'),
      desc: t(
        'Puiser d\'abord dans les comptes non-enregistrés pour laisser croître les comptes enregistrés. Les gains en capital bénéficient d\'un taux préférentiel.',
        'Draw first from non-registered accounts, letting registered accounts continue to grow. Capital gains benefit from preferential rates.'
      ),
      note: t(
        'Stratégie par défaut — réduit l\'impôt différé mais peut créer des coupures de cotisations sociales.',
        'Default strategy — reduces deferred tax but may affect benefit clawbacks.'
      ),
      recommended: false,
    },
    {
      name: t('Proportionnel', 'Proportional'),
      desc: t(
        'Retirer de chaque bucket au prorata de sa valeur pour lisser les revenus imposables et éviter les sauts de palier.',
        'Withdraw from each bucket proportionally to its value, smoothing taxable income and avoiding bracket jumps.'
      ),
      note: t(
        'Recommandé dans la plupart des cas : équilibre l\'impôt annuel, préserve le CELI et atténue les coupures (SV, PSV).',
        'Generally recommended: balances annual tax, preserves TFSA/ISA room, and mitigates benefit clawbacks (OAS, GIS).'
      ),
      recommended: true,
    },
    {
      name: t('Différé en premier (REER/FERR)', 'Deferred first (RRSP/RRIF)'),
      desc: t(
        'Vider les comptes différés avant la retraite complète ou tôt en retraite pour éviter les retraits forcés à taux élevé.',
        'Deplete deferred accounts before full retirement or early in retirement to avoid forced withdrawals at high rates.'
      ),
      note: lowRate
        ? t(
            'Opportunité : votre taux marginal projeté à la retraite est faible — accélérer les retraits REER/FERR peut être avantageux.',
            'Opportunity: your projected retirement marginal rate is low — accelerating RRSP/RRIF withdrawals may be advantageous.'
          )
        : t(
            'Convient si le taux marginal futur dépasse le taux actuel, ou pour gérer les retraits minimums obligatoires.',
            'Suitable if the future marginal rate exceeds the current rate, or to manage mandatory minimum withdrawals.'
          ),
      recommended: false,
    },
  ];
}

// ----------------------------------------------------------------
// 5. Roth / RRSP meltdown / ISA strategy
// ----------------------------------------------------------------

/**
 * rothOrMeltdown(client, jur)
 * Returns { title, text } — country-specific advanced strategy suggestion.
 */
export function rothOrMeltdown(client, jur) {
  const country = jur.country;

  if (country === 'US') {
    return {
      title: t('Conversion Roth en année à faible revenu', 'Roth Conversion in Low-Income Years'),
      text: t(
        'Profitez des années de faible revenu (avant la retraite complète, après une démission ou une baisse de salaire) pour convertir des fonds IRA/401 k traditionnels en Roth. Les montants convertis sont imposés au taux ordinaire de l\'année, mais la croissance future est entièrement libre d\'impôt. Cela réduit les distributions minimales obligatoires (RMD) et l\'impôt sur la succession.',
        'Take advantage of low-income years (before full retirement, after a job change or salary reduction) to convert traditional IRA/401k funds to Roth. Converted amounts are taxed at the current year\'s ordinary rate, but all future growth is completely tax-free. This reduces Required Minimum Distributions (RMDs) and estate tax exposure.'
      ),
    };
  }

  if (country === 'CA') {
    return {
      title: t('Stratégie de fonte du REER / retrait anticipé FERR', 'RRSP Meltdown / Early RRIF Withdrawal'),
      text: t(
        'Si votre revenu de retraite sera élevé (revenus de pension, SV, régimes d\'entreprise), envisagez des retraits REER anticipés dans les années à faible revenu, avant 65 ans, pour lisser les paliers d\'imposition et réduire l\'effet des coupures sur la Sécurité de la vieillesse (71 000 $ en 2025). La stratégie consiste à transférer ces retraits en CELI pour maintenir la croissance libre d\'impôt. Consultez un fiscaliste pour l\'impact sur le Supplément de revenu garanti.',
        'If your retirement income will be high (pension income, OAS, corporate plans), consider early RRSP withdrawals in low-income years before age 65 to smooth tax brackets and reduce OAS clawback exposure ($71 000 threshold in 2025). The approach involves re-sheltering those withdrawals into TFSA to maintain tax-free growth. Consult a tax advisor regarding GIS impact.'
      ),
    };
  }

  if (country === 'UK') {
    return {
      title: t('Maximiser l\'ISA + Allocation de retraite annuelle', 'Maximise ISA + Annual Pension Allowance'),
      text: t(
        'Au Royaume-Uni, combinez le plafond ISA (20 000 £/an) avec l\'allocation annuelle de pension (60 000 £ en 2024-25) pour maximiser la croissance libre d\'impôt. En retraite, les retraits ISA ne sont pas imposés et n\'affectent pas le crédit de pension. Le Lifetime ISA (LISA) offre un bonus gouvernemental de 25 % jusqu\'à 4 000 £/an pour les moins de 40 ans. Planifiez les revenus de pension pour rester sous le seuil de récupération de l\'allocation personnelle (100 000 £).',
        'In the UK, combine the ISA allowance (£20,000/year) with the annual pension allowance (£60,000 in 2024-25) to maximise tax-free growth. In retirement, ISA withdrawals are untaxed and do not affect pension credit eligibility. The Lifetime ISA (LISA) offers a 25% government bonus up to £4,000/year for under-40s. Plan pension income to stay below the personal allowance taper threshold (£100,000).'
      ),
    };
  }

  // Fallback generic
  return {
    title: t('Stratégie avancée de décaissement', 'Advanced Decumulation Strategy'),
    text: t(
      'Optimisez l\'ordre des retraits en tenant compte de votre taux marginal actuel et futur, des prestations publiques et de la planification successorale.',
      'Optimise withdrawal order considering your current and future marginal rates, government benefits, and estate planning goals.'
    ),
  };
}
