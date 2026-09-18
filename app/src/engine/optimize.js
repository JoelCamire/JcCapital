// ============================================================
// Tax & decumulation optimization engine.
// Pure functions — no DOM, no side effects. Reads every number from
// facts.js (current) or retirementFacts (projected) so its answers
// agree with the rest of the app.
// ============================================================
import { computeTax } from './tax.js';
import { treatmentOf, PENSION_TYPES } from './projection.js';
import { clientFacts, retirementFacts } from './facts.js';
import { t } from '../i18n.js';

const fin = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const fmtMoney = (v) => Math.round(v).toLocaleString('fr-CA') + ' $';

// ----------------------------------------------------------------
// 1. Pension income splitting (Canada: up to 50 % of ELIGIBLE pension
//    income; CPP can be shared ~50 % between spouses). Employment income
//    cannot be split, so it is never moved.
// ----------------------------------------------------------------

function splitTax(jur, hi, lo, transfer, ageHi, ageLo) {
  // moving `transfer` of eligible pension income from hi to lo
  const th = computeTax(jur, { ordinary: hi.ordinary - transfer, pensionIncome: Math.max(0, hi.pension - transfer), oasIncome: hi.oas, age: ageHi, withPayroll: false, employment: false });
  const tl = computeTax(jur, { ordinary: lo.ordinary + transfer, pensionIncome: lo.pension + transfer, oasIncome: lo.oas, age: ageLo, withPayroll: false, employment: false });
  return th.total + tl.total;
}

const NOT_APPLICABLE = (note) => ({ current: null, optimized: null, savings: 0, transfer: 0, maxTransfer: 0, eligiblePension: 0, applicable: false, note });

export function incomeSplitting(client, jur, { atRetirement = false } = {}) {
  const married = client.filingStatus === 'married';
  const hasPair = (client.members || []).length >= 2;
  if (!married || !hasPair) {
    return NOT_APPLICABLE(t('Le fractionnement s\'applique uniquement aux couples (conjoints) avec deux membres au dossier.', 'Income splitting applies only to couples with two members on file.'));
  }
  let mem;
  if (atRetirement) {
    const R = retirementFacts(client, jur);
    const row = R.projection.summary.retirementRow;
    if (!row) return NOT_APPLICABLE(t('Aucune année de retraite dans l’horizon.', 'No retirement year within the horizon.'));
    mem = client.members.slice(0, 2).map(m => { const b = row.byMember[m.id]; const bk = b?.buckets || {}; const age = row.ages[m.id];
      return { id: m.id, name: m.name, age, ordinary: b?.ordinary || 0, pension: (bk.pension || 0) + (age >= 65 ? (bk.rrif || 0) : 0) + 0.5 * (bk.cpp || 0), oas: bk.oas || 0, tax: b?.tax || 0 }; });
  } else {
    const F = clientFacts(client, jur);
    mem = F.members.slice(0, 2).map(m => ({ id: m.id, name: m.name, age: m.age, ordinary: m.ordinary, pension: m.pensionIncome + 0.5 * m.cppIncome, oas: m.oasIncome, tax: m.tax.total }));
  }
  const [a, b] = mem;
  const hi = a.ordinary >= b.ordinary ? a : b, lo = hi === a ? b : a;
  const current = splitTax(jur, hi, lo, 0, hi.age, lo.age);
  const maxTransfer = Math.min(hi.pension * 0.5, Math.max(0, (hi.ordinary - lo.ordinary) / 2));
  let best = { transfer: 0, tax: current };
  const steps = 40;
  for (let k = 1; k <= steps; k++) {
    const tr = maxTransfer * k / steps;
    const tx = splitTax(jur, hi, lo, tr, hi.age, lo.age);
    if (tx < best.tax - 0.5) best = { transfer: tr, tax: tx };
  }
  return {
    applicable: true, current, optimized: best.tax, savings: Math.max(0, current - best.tax), transfer: best.transfer,
    eligiblePension: hi.pension, maxTransfer,
    member0: { name: hi.name, income: hi.ordinary, tax: computeTax(jur, { ordinary: hi.ordinary, pensionIncome: hi.pension, oasIncome: hi.oas, age: hi.age, withPayroll: false, employment: false }).total },
    member1: { name: lo.name, income: lo.ordinary, tax: computeTax(jur, { ordinary: lo.ordinary, pensionIncome: lo.pension, oasIncome: lo.oas, age: lo.age, withPayroll: false, employment: false }).total },
    totalIncome: hi.ordinary + lo.ordinary,
    note: hi.pension > 0
      ? t(`Jusqu’à 50 % du revenu de pension admissible (${fmtMoney(hi.pension)}) peut être attribué au conjoint; le RRQ peut être partagé. Le revenu d’emploi n’est pas fractionnable.`,
          `Up to 50 % of eligible pension income (${fmtMoney(hi.pension)}) can be allocated to the spouse; CPP can be shared. Employment income cannot be split.`)
      : t('Aucun revenu de pension admissible aujourd’hui : le fractionnement deviendra possible à la retraite (rentes, FERR à 65 ans, RRQ).', 'No eligible pension income today: splitting becomes possible in retirement (annuities, RRIF at 65, CPP).'),
  };
}

// ----------------------------------------------------------------
// 2. RRSP vs TFSA — compares today's marginal rate with the PROJECTED
//    marginal rate in the first retirement year (from the projection).
// ----------------------------------------------------------------

export function rrspVsTfsa(client, jur) {
  const F = clientFacts(client, jur);
  const R = retirementFacts(client, jur);
  const currentMarginal = F.primary ? F.primary.marginal.ordinary : 0;
  const retireMarginal = R.marginalRate != null ? R.marginalRate : computeTax(jur, { ordinary: (F.primary?.ordinary || 60000) * 0.6, withPayroll: false, employment: false, age: 66 }).marginalRate;
  const spread = currentMarginal - retireMarginal;
  const recommend = currentMarginal > retireMarginal ? 'deferred' : 'taxfree';
  return { currentMarginal, retireMarginal, recommend, spread, retirementTaxableIncome: R.taxableIncome, currentIncome: F.primary?.ordinary || 0 };
}

// ----------------------------------------------------------------
// 3. Asset location
// ----------------------------------------------------------------

export function assetLocation(client, jur) {
  const findings = [];
  if (!client.assets || client.assets.length === 0) {
    findings.push({ label: t('Aucun actif enregistré', 'No assets on record'), detail: t('Ajoutez des actifs pour obtenir des recommandations d\'emplacement.', 'Add assets to receive location recommendations.'), severity: 'ok' });
    return { findings, annualTaxDrag: 0 };
  }
  const F = clientFacts(client, jur);
  const distYield = F.assumptions.distributionYield;
  let annualTaxDrag = 0;
  for (const asset of client.assets) {
    const treatment = treatmentOf(asset.type);
    const value = fin(asset.value), growth = fin(asset.growth), label = asset.label || asset.type;
    const owner = F.byMember[asset.ownerId] || F.primary;
    const marginalRate = owner ? owner.marginal.ordinary : 0.4;
    if (treatment === 'taxable') {
      const drag = value * growth * distYield * marginalRate;
      annualTaxDrag += drag;
      if (growth < 0.03 && value > 10000) findings.push({ label: t(`${label} — faible croissance en non-enregistré`, `${label} — low growth in non-registered`), detail: t(`Un placement à faible rendement (${(growth * 100).toFixed(1)} %) en compte non-enregistré génère des revenus d'intérêt entièrement imposables. Préférez un compte enregistré ou à l'abri de l'impôt.`, `A low-yield asset (${(growth * 100).toFixed(1)} %) in a non-registered account generates fully taxable interest income. Prefer a registered or tax-free account.`), severity: 'warn' });
      else if (growth >= 0.05 && value > 10000) findings.push({ label: t(`${label} — croissance en non-enregistré`, `${label} — growth asset in non-registered`), detail: t(`Ce placement à forte croissance (${(growth * 100).toFixed(1)} %) pourrait bénéficier d'un abri fiscal (CELI/REER) pour différer ou éliminer l'impôt sur les gains.`, `This high-growth asset (${(growth * 100).toFixed(1)} %) could benefit from a tax shelter (TFSA/RRSP) to defer or eliminate gains tax.`), severity: 'warn' });
    } else if (treatment === 'taxfree') {
      if (growth < 0.03 && value > 5000) findings.push({ label: t(`${label} — faible rendement en compte libre d'impôt`, `${label} — low yield in tax-free account`), detail: t(`Un actif à faible rendement occupe de la précieuse marge de cotisation dans un compte libre d'impôt. Envisagez d'y loger plutôt des placements à forte croissance.`, `A low-yield asset occupies valuable contribution room in a tax-free account. Consider placing high-growth investments there instead.`), severity: 'warn' });
      else if (growth >= 0.05) findings.push({ label: t(`${label} — bien positionné`, `${label} — well positioned`), detail: t(`Excellent : les actifs à forte croissance dans un compte libre d'impôt maximisent la croissance à l'abri de l'impôt.`, `Excellent: high-growth assets in a tax-free account maximize tax-sheltered growth.`), severity: 'ok' });
    } else if (treatment === 'deferred') {
      if (growth >= 0.06) findings.push({ label: t(`${label} — croissance élevée en compte différé`, `${label} — high growth in deferred account`), detail: t(`Croissance à l'abri de l'impôt jusqu'au retrait — approprié. Les retraits seront imposés comme revenu ordinaire ; comparez avec un compte libre d'impôt si votre taux à la retraite dépasse le taux actuel.`, `Growth is tax-sheltered until withdrawal — appropriate. Withdrawals are taxed as ordinary income; compare with a tax-free account if your retirement rate exceeds today's rate.`), severity: 'ok' });
    }
  }
  if (findings.length === 0) findings.push({ label: t('Emplacement des actifs optimal', 'Asset location looks optimal'), detail: t('Aucune amélioration immédiate détectée selon l\'analyse heuristique.', 'No immediate improvements detected based on heuristic analysis.'), severity: 'ok' });
  return { findings, annualTaxDrag };
}

// ----------------------------------------------------------------
// 4. Withdrawal order
// ----------------------------------------------------------------

export function withdrawalOrder(client, jur) {
  const R = retirementFacts(client, jur);
  const lowRate = (R.marginalRate ?? 0.3) < 0.3;
  return [
    { name: t('Taxable en premier', 'Taxable first'),
      desc: t('Puiser d\'abord dans les comptes non-enregistrés pour laisser croître les comptes enregistrés. Les gains en capital bénéficient d\'un taux préférentiel.', 'Draw first from non-registered accounts, letting registered accounts continue to grow. Capital gains benefit from preferential rates.'),
      note: t('Stratégie par défaut — réduit l\'impôt différé mais peut créer des coupures de cotisations sociales.', 'Default strategy — reduces deferred tax but may affect benefit clawbacks.'), recommended: false },
    { name: t('Proportionnel', 'Proportional'),
      desc: t('Retirer de chaque bucket au prorata de sa valeur pour lisser les revenus imposables et éviter les sauts de palier.', 'Withdraw from each bucket proportionally to its value, smoothing taxable income and avoiding bracket jumps.'),
      note: t('Recommandé dans la plupart des cas : équilibre l\'impôt annuel, préserve le CELI et atténue les coupures (SV, PSV).', 'Generally recommended: balances annual tax, preserves TFSA/ISA room, and mitigates benefit clawbacks (OAS, GIS).'), recommended: true },
    { name: t('Différé en premier (REER/FERR)', 'Deferred first (RRSP/RRIF)'),
      desc: t('Vider les comptes différés avant la retraite complète ou tôt en retraite pour éviter les retraits forcés à taux élevé.', 'Deplete deferred accounts before full retirement or early in retirement to avoid forced withdrawals at high rates.'),
      note: lowRate
        ? t(`Opportunité : votre taux marginal projeté à la retraite est faible (${Math.round((R.marginalRate ?? 0) * 100)} %) — accélérer les retraits REER/FERR peut être avantageux.`, `Opportunity: your projected retirement marginal rate is low (${Math.round((R.marginalRate ?? 0) * 100)} %) — accelerating RRSP/RRIF withdrawals may be advantageous.`)
        : t('Convient si le taux marginal futur dépasse le taux actuel, ou pour gérer les retraits minimums obligatoires.', 'Suitable if the future marginal rate exceeds the current rate, or to manage mandatory minimum withdrawals.'),
      recommended: false },
  ];
}

// ----------------------------------------------------------------
// 5. Roth / RRSP meltdown / ISA strategy
// ----------------------------------------------------------------

export function rothOrMeltdown(client, jur) {
  const country = jur.country;
  if (country === 'US') {
    return { title: t('Conversion Roth en année à faible revenu', 'Roth Conversion in Low-Income Years'),
      text: t('Profitez des années de faible revenu (avant la retraite complète, après une démission ou une baisse de salaire) pour convertir des fonds IRA/401 k traditionnels en Roth. Les montants convertis sont imposés au taux ordinaire de l\'année, mais la croissance future est entièrement libre d\'impôt. Cela réduit les distributions minimales obligatoires (RMD) et l\'impôt sur la succession.',
        'Take advantage of low-income years (before full retirement, after a job change or salary reduction) to convert traditional IRA/401k funds to Roth. Converted amounts are taxed at the current year\'s ordinary rate, but all future growth is completely tax-free. This reduces Required Minimum Distributions (RMDs) and estate tax exposure.') };
  }
  if (country === 'CA') {
    const thr = fmtMoney(jur.pensions?.oas?.clawbackStart || 0);
    const yr = jur.taxYear || '';
    return { title: t('Stratégie de fonte du REER / retrait anticipé FERR', 'RRSP Meltdown / Early RRIF Withdrawal'),
      text: t(`Si votre revenu de retraite sera élevé (revenus de pension, RRQ, régimes d'entreprise), envisagez des retraits REER anticipés dans les années à faible revenu, avant 65 ans, pour lisser les paliers d'imposition et réduire la récupération de la Sécurité de la vieillesse (seuil de ${thr} en ${yr}). La stratégie consiste à transférer ces retraits dans le CELI pour maintenir la croissance libre d'impôt. Consultez un fiscaliste pour l'impact sur le Supplément de revenu garanti.`,
        `If your retirement income will be high (pension income, CPP, corporate plans), consider early RRSP withdrawals in low-income years before age 65 to smooth tax brackets and reduce OAS clawback exposure (${thr} threshold in ${yr}). The approach involves re-sheltering those withdrawals into the TFSA to maintain tax-free growth. Consult a tax advisor regarding GIS impact.`) };
  }
  if (country === 'UK') {
    const isa = fin(jur.isaLimit, 20000).toLocaleString('en-GB'), pa = fin(jur.pensionAllowance, 60000).toLocaleString('en-GB'), lisa = fin(jur.lisaLimit, 4000).toLocaleString('en-GB'), taper = fin(jur.fed?.paTaperFrom, 100000).toLocaleString('en-GB');
    return { title: t('Maximiser l\'ISA + Allocation de retraite annuelle', 'Maximise ISA + Annual Pension Allowance'),
      text: t(`Au Royaume-Uni, combinez le plafond ISA (${isa} £/an) avec l'allocation annuelle de pension (${pa} £) pour maximiser la croissance libre d'impôt. En retraite, les retraits ISA ne sont pas imposés. Le Lifetime ISA (LISA) offre un bonus de 25 % jusqu'à ${lisa} £/an pour les moins de 40 ans. Planifiez les revenus pour rester sous le seuil de récupération de l'allocation personnelle (${taper} £).`,
        `In the UK, combine the ISA allowance (£${isa}/year) with the annual pension allowance (£${pa}) to maximise tax-free growth. In retirement, ISA withdrawals are untaxed. The Lifetime ISA (LISA) offers a 25% government bonus up to £${lisa}/year for under-40s. Plan income to stay below the personal allowance taper threshold (£${taper}).`) };
  }
  return { title: t('Stratégie avancée de décaissement', 'Advanced Decumulation Strategy'),
    text: t('Optimisez l\'ordre des retraits en tenant compte de votre taux marginal actuel et futur, des prestations publiques et de la planification successorale.', 'Optimise withdrawal order considering your current and future marginal rates, government benefits, and estate planning goals.') };
}
