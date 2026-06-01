// ============================================================
// Education Planning View — per-child funding projections
// ============================================================
import { h, money, pct, icon, ageFromDob, t } from '../dom.js';
import { kpi, card, slider, legend, statList } from '../widgets.js';
import { lineChart, PALETTE } from '../charts.js';
import { treatmentOf } from '../../engine/projection.js';

// ── Jurisdiction defaults ──────────────────────────────────
const JUR_DEFAULTS = {
  CA: { annualCost: 12000, studyYears: 4, grantRate: 0.20, grantMaxAnnual: 500, grantLifetime: 7200 },
  US: { annualCost: 30000, studyYears: 4, grantRate: 0,    grantMaxAnnual: 0,   grantLifetime: 0 },
  UK: { annualCost: 15000, studyYears: 3, grantRate: 0,    grantMaxAnnual: 0,   grantLifetime: 0 },
};

// ── Math helpers ───────────────────────────────────────────
/** Future value of a lump sum. */
function fv(pv, r, n) { return pv * Math.pow(1 + r, n); }

/**
 * Future cost of education: sum of each study year's annual cost,
 * inflated from now to when that year occurs.
 * yearsUntilStart = years until child begins university.
 */
function futureTotalCost(annualCost, studyYears, eduInflation, yearsUntilStart) {
  let total = 0;
  for (let i = 0; i < studyYears; i++) {
    total += annualCost * Math.pow(1 + eduInflation, yearsUntilStart + i);
  }
  return total;
}

/**
 * Present value (today) of that future cost stream,
 * discounted at the savings return rate.
 * Used to compare against current savings.
 */
function pvOfCosts(annualCost, studyYears, eduInflation, returnRate, yearsUntilStart) {
  let pv = 0;
  for (let i = 0; i < studyYears; i++) {
    const futCost = annualCost * Math.pow(1 + eduInflation, yearsUntilStart + i);
    pv += futCost / Math.pow(1 + returnRate, yearsUntilStart + i);
  }
  return pv;
}

/**
 * Monthly contribution required (ordinary annuity) to accumulate `fvTarget`
 * over `months` at monthly rate `mr`, reduced by effective grant coverage.
 *
 * Grant logic (CA CESG): government adds 20 % on first $2500/yr contributed
 * (max grant $500/yr, lifetime $7200). We reduce the required PMT by the
 * effective grant subsidy on contributions.
 */
function monthlyRequired(fvTarget, months, returnRate, currentSaved, grantRate, grantMaxAnnual, grantLifetimeRemaining) {
  if (months <= 0) return 0;
  const mr = returnRate / 12;
  // FV of current savings at end of period
  const fvCurrent = fv(currentSaved, mr, months);
  const netTarget = Math.max(0, fvTarget - fvCurrent);
  if (netTarget <= 0) return 0;
  // Annuity factor
  const factor = mr > 0 ? (Math.pow(1 + mr, months) - 1) / mr : months;
  let pmt = netTarget / factor;
  // Adjust for grants: contributions earn grantRate top-up (capped)
  if (grantRate > 0 && grantLifetimeRemaining > 0) {
    // Annual contribution implied by pmt
    const annualPmt = pmt * 12;
    // Max grant-eligible annual contribution so that grant <= grantMaxAnnual
    const maxEligibleContrib = grantRate > 0 ? grantMaxAnnual / grantRate : 0;
    const eligibleContrib = Math.min(annualPmt, maxEligibleContrib);
    const annualGrant = eligibleContrib * grantRate;
    // Effective subsidy fraction on total PMT
    const subsidyFraction = annualPmt > 0 ? (annualGrant / annualPmt) : 0;
    pmt = pmt / (1 + subsidyFraction);
  }
  return Math.max(0, pmt);
}

/**
 * Build year-by-year savings projection and cost target line.
 * Returns { savingsValues, costValues, xLabels }.
 */
function buildProjection(currentSaved, monthlyContrib, returnRate, grantRate, grantMaxAnnual, grantLifetime,
  annualCost, studyYears, eduInflation, yearsUntilStart) {
  const savingsValues = [];
  const costValues = [];
  const xLabels = [];
  let balance = currentSaved;
  let lifetimeGrantUsed = 0;
  const mr = returnRate / 12;

  for (let yr = 0; yr <= yearsUntilStart; yr++) {
    // Project balance for this year (monthly compounding)
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + mr) + monthlyContrib;
      // Add grant monthly equivalent (capped)
      if (grantRate > 0 && lifetimeGrantUsed < grantLifetime) {
        const monthlyGrant = Math.min(
          monthlyContrib * grantRate,
          grantMaxAnnual / 12,
          (grantLifetime - lifetimeGrantUsed) / Math.max(1, (yearsUntilStart - yr) * 12)
        );
        balance += monthlyGrant;
        lifetimeGrantUsed += monthlyGrant;
      }
    }
    savingsValues.push(Math.round(balance));
    // Cost target at this year = total future cost discounted back from this point
    const costAtYear = pvOfCosts(annualCost, studyYears, eduInflation, returnRate, Math.max(0, yearsUntilStart - yr));
    costValues.push(Math.round(costAtYear));
    xLabels.push('Y' + yr);
  }
  return { savingsValues, costValues, xLabels };
}

// ── Grant explanation by jurisdiction ─────────────────────
function grantExplanation(country, eduLabel) {
  if (country === 'CA') {
    return t(
      `Le ${eduLabel} (REEE) bénéficie de la Subvention canadienne pour l'épargne-études (SCEE) : le gouvernement verse 20 % sur les premiers 2 500 $ cotisés par an (max 500 $/an, plafond à vie de 7 200 $). Les revenus croissent à l'abri de l'impôt jusqu'au retrait.`,
      `The ${eduLabel} (RESP) benefits from the Canada Education Savings Grant (CESG): the government adds 20% on the first $2,500 contributed per year (max $500/yr, $7,200 lifetime). Growth is tax-deferred until withdrawal.`
    );
  }
  if (country === 'US') {
    return t(
      `Le ${eduLabel} offre une croissance libre d'impôt pour les dépenses d'études admissibles. Il n'y a pas de subvention fédérale directe, mais certains États offrent des déductions fiscales. Les retraits pour frais d'études sont exonérés d'impôt.`,
      `The ${eduLabel} offers tax-free growth for qualified education expenses. There is no direct federal grant, but some states offer tax deductions on contributions. Withdrawals for education expenses are tax-free.`
    );
  }
  if (country === 'UK') {
    return t(
      `Le ${eduLabel} permet d'épargner jusqu'à 9 000 £ par an pour un enfant, avec une croissance et des retraits entièrement exonérés d'impôt. Il n'y a pas de subvention gouvernementale directe. Le solde appartient à l'enfant à 18 ans.`,
      `The ${eduLabel} allows saving up to £9,000 per year for a child, with completely tax-free growth and withdrawals. There is no direct government grant. The balance belongs to the child at 18.`
    );
  }
  return t(
    `Utilisez le véhicule d'épargne-études approprié (${eduLabel}) pour votre juridiction.`,
    `Use the appropriate education savings vehicle (${eduLabel}) for your jurisdiction.`
  );
}

// ── Main render ────────────────────────────────────────────
export function render({ client, jur, navigate }) {
  const cur = jur.currency;
  const country = jur.country || 'CA';
  const jDefaults = JUR_DEFAULTS[country] || JUR_DEFAULTS.CA;
  const eduLabel = (jur.labels && jur.labels.education) || 'RESP';

  // Local mutable state (not persisted to store)
  const local = {
    annualCost:   jDefaults.annualCost,
    studyYears:   jDefaults.studyYears,
    eduInflation: 0.04,
    returnRate:   0.058,
  };

  // Education savings = assets whose treatment is 'education'
  const eduAssets = (client.assets || []).filter(a => treatmentOf(a.type) === 'education');
  const totalEduSavings = eduAssets.reduce((s, a) => s + (a.value || 0), 0);

  // Dependents under 18
  const deps = (client.dependents || []).filter(dep => {
    const age = dep.dob ? ageFromDob(dep.dob) : (dep.age || 0);
    return age < 18;
  });

  // Container for the dynamic portion
  const dynContainer = h('div', { class: 'grid' });

  function rebuild() {
    // Clear and re-render dynamic content
    while (dynContainer.firstChild) dynContainer.removeChild(dynContainer.firstChild);

    const { annualCost, studyYears, eduInflation, returnRate } = local;
    const grantRate       = jDefaults.grantRate;
    const grantMaxAnnual  = jDefaults.grantMaxAnnual;
    const grantLifetime   = jDefaults.grantLifetime;

    // Split education savings evenly across eligible dependents
    const savingsPerChild = deps.length > 0 ? totalEduSavings / deps.length : 0;

    // Per-child calculations
    const childResults = deps.map(dep => {
      const currentAge      = dep.dob ? ageFromDob(dep.dob) : (dep.age || 0);
      const goalAge         = dep.educationGoalAge || 18;
      const yearsUntilStart = Math.max(0, goalAge - currentAge);
      const months          = yearsUntilStart * 12;

      const futureCost = futureTotalCost(annualCost, studyYears, eduInflation, yearsUntilStart);
      const pvCost     = pvOfCosts(annualCost, studyYears, eduInflation, returnRate, yearsUntilStart);
      const monthly    = monthlyRequired(
        futureCost, months, returnRate, savingsPerChild,
        grantRate, grantMaxAnnual,
        Math.max(0, grantLifetime - (savingsPerChild > 0 ? Math.min(savingsPerChild * grantRate, grantLifetime) : 0))
      );
      const progress   = pvCost > 0 ? Math.min(1, savingsPerChild / pvCost) : 0;

      // Build chart projection
      const { savingsValues, costValues, xLabels } = buildProjection(
        savingsPerChild, monthly, returnRate, grantRate, grantMaxAnnual, grantLifetime,
        annualCost, studyYears, eduInflation, yearsUntilStart
      );

      return { dep, currentAge, goalAge, yearsUntilStart, futureCost, pvCost, monthly, progress, savingsValues, costValues, xLabels };
    });

    // ── KPI row ──────────────────────────────────────────
    const totalFutureCost    = childResults.reduce((s, r) => s + r.futureCost, 0);
    const totalMonthlyNeeded = childResults.reduce((s, r) => s + r.monthly, 0);
    const totalPvCost        = childResults.reduce((s, r) => s + r.pvCost, 0);
    const projectedShortfall = totalPvCost - totalEduSavings;

    const kpiRow = h('div', { class: 'grid cols-4 span-full' },
      kpi({
        label:    t('Coût futur total', 'Total future cost'),
        value:    money(totalFutureCost, { currency: cur, compact: true }),
        iconName: 'cap',
        sub:      t(`${deps.length} enfant(s) · ${studyYears} ans d'études`, `${deps.length} child(ren) · ${studyYears} yrs study`),
      }),
      kpi({
        label:    t('Cotisation mensuelle requise', 'Monthly contribution required'),
        value:    money(totalMonthlyNeeded, { currency: cur }),
        iconName: 'cashflow',
        sub:      t('Tous enfants combinés', 'All children combined'),
      }),
      kpi({
        label:    t('Épargne-études actuelle', 'Current education savings'),
        value:    money(totalEduSavings, { currency: cur, compact: true }),
        iconName: 'bank',
        sub:      eduLabel,
      }),
      kpi({
        label:    projectedShortfall > 0 ? t('Déficit projeté', 'Projected shortfall') : t('Surplus projeté', 'Projected surplus'),
        value:    money(Math.abs(projectedShortfall), { currency: cur, compact: true }),
        iconName: projectedShortfall > 0 ? 'warning' : 'check',
        accent:   projectedShortfall > 0 ? 'var(--neg)' : 'var(--pos)',
      }),
    );

    // ── Per-child cards ───────────────────────────────────
    const childCards = childResults.map((r, idx) => {
      const { dep, currentAge, goalAge, yearsUntilStart, futureCost, monthly, progress, savingsValues, costValues, xLabels } = r;
      const progCls = progress >= 0.85 ? 'pos' : progress >= 0.4 ? 'warn' : 'neg';

      const chartSvg = savingsValues.length > 1
        ? lineChart({
            series: [
              { name: t('Épargne projetée', 'Projected savings'), color: PALETTE[idx % PALETTE.length], values: savingsValues },
              { name: t('Cible (VP coût)', 'Target (PV cost)'), color: PALETTE[(idx + 5) % PALETTE.length], values: costValues },
            ],
            xLabels,
            area: true,
            height: 200,
          })
        : null;

      return card(
        dep.name,
        {
          sub: `${currentAge} ${t('ans', 'yrs')} · ${t('début études', 'school start')} ${goalAge} ${t('ans', 'yrs')} · ${yearsUntilStart} ${t('ans restants', 'yrs remaining')}`,
        },
        h('div', { class: 'grid cols-2', style: { gap: '16px', alignItems: 'start' } },
          h('div', {},
            statList([
              [t('Coût futur total', 'Total future cost'),   money(futureCost, { currency: cur })],
              [t('Mensualité requise', 'Monthly required'),   money(monthly, { currency: cur }), monthly > 0 ? '' : 'pos'],
              [t('Épargne actuelle (part)', 'Current savings (share)'), money(savingsPerChild, { currency: cur })],
              [t('Ans avant le début', 'Years until start'), yearsUntilStart + ' ' + t('ans', 'yrs')],
              country === 'CA'
                ? [t('Subvention SCEE est.', 'Est. CESG grant'), money(Math.min(grantMaxAnnual, monthly * 12 * grantRate) * yearsUntilStart, { currency: cur })]
                : [t('Subvention gouvernementale', 'Gov. grant'), t('Aucune', 'None')],
            ]),
            h('div', { style: { marginTop: '12px' } },
              h('div', { class: 'flex between', style: { marginBottom: '4px' } },
                h('span', { class: 'tiny muted' }, t('Financement', 'Funding progress')),
                h('b', { style: { color: `var(--${progCls})` } }, pct(progress, 0))),
              h('div', { class: 'bar' },
                h('span', {
                  style: {
                    width: pct(Math.min(1, progress), 0),
                    background: progCls === 'neg'
                      ? 'var(--neg)'
                      : progCls === 'warn'
                        ? 'linear-gradient(90deg,var(--warn),var(--accent-2))'
                        : 'linear-gradient(90deg,var(--brand-500),var(--accent))',
                  },
                })),
            ),
          ),
          chartSvg
            ? h('div', {},
                h('div', { html: chartSvg }),
                legend([
                  { color: PALETTE[idx % PALETTE.length],        label: t('Épargne projetée', 'Projected savings') },
                  { color: PALETTE[(idx + 5) % PALETTE.length],  label: t('Valeur présente du coût', 'PV of cost target') },
                ]),
              )
            : h('div', { class: 'muted tiny', style: { padding: '8px' } },
                t('Données insuffisantes pour le graphique.', 'Insufficient data for chart.')),
        ),
      );
    });

    // ── Summary / vehicle card ────────────────────────────
    const summaryCard = card(
      eduLabel,
      {
        class: 'span-full',
        sub: t('Véhicule d’épargne-études recommandé', 'Recommended education savings vehicle'),
        right: h('span', { class: 'chip info', html: icon('cap', 14) + ' ' + eduLabel }),
      },
      h('div', { class: 'tiny', style: { lineHeight: '1.7' } }, grantExplanation(country, eduLabel)),
    );

    // Append everything to dynContainer
    dynContainer.appendChild(kpiRow);
    childCards.forEach(cc => dynContainer.appendChild(cc));
    dynContainer.appendChild(summaryCard);
  }

  // ── Controls card (sliders) ────────────────────────────
  const controlsCard = card(
    t('Hypothèses', 'Assumptions'),
    {
      class: 'span-full',
      sub: t('Paramètres locaux — non enregistrés', 'Local parameters — not persisted'),
      right: h('span', { class: 'chip info' }, jur.name || country),
    },
    h('div', { class: 'grid cols-2', style: { gap: '12px', alignItems: 'start' } },
      slider({
        label:   t('Coût annuel des études', 'Annual education cost') + ` (${cur})`,
        value:   local.annualCost,
        min:     2000,
        max:     80000,
        step:    500,
        format:  v => money(v, { currency: cur }),
        onInput: v => { local.annualCost = v; rebuild(); },
      }),
      slider({
        label:   t('Nombre d’années d’études', 'Years of study'),
        value:   local.studyYears,
        min:     2,
        max:     6,
        step:    1,
        format:  v => v + ' ' + t('ans', 'yrs'),
        onInput: v => { local.studyYears = Math.round(v); rebuild(); },
      }),
      slider({
        label:   t('Inflation des études', 'Education inflation'),
        value:   local.eduInflation,
        min:     0,
        max:     0.06,
        step:    0.005,
        format:  v => pct(v),
        onInput: v => { local.eduInflation = v; rebuild(); },
      }),
      slider({
        label:   t('Rendement espéré du portefeuille', 'Expected portfolio return'),
        value:   local.returnRate,
        min:     0.03,
        max:     0.08,
        step:    0.005,
        format:  v => pct(v),
        onInput: v => { local.returnRate = v; rebuild(); },
      }),
    ),
  );

  // ── No-dependents empty state ─────────────────────────
  if (deps.length === 0) {
    const emptyCard = card(
      t('Planification des études', 'Education planning'),
      { class: 'span-full' },
      h('div', { class: 'empty', style: { padding: '40px 0' } },
        h('div', { class: 'big', html: icon('cap', 48) }),
        h('div', { style: { marginTop: '12px', fontWeight: 600 } },
          t('Aucun enfant à charge (moins de 18 ans) trouvé.', 'No dependents under 18 found.')),
        h('div', { class: 'muted tiny', style: { marginTop: '6px', marginBottom: '16px' } },
          t('Ajoutez des personnes à charge dans le profil pour utiliser le planificateur d’études.',
            'Add dependents in the profile to use the education planner.')),
        h('button', {
          class: 'btn primary',
          onClick: () => navigate('profile'),
        }, icon('client', 14) + ' ' + t('Aller au profil', 'Go to profile')),
      ),
    );
    return h('div', { class: 'grid' }, emptyCard);
  }

  // Initial build
  rebuild();

  return h('div', { class: 'grid' }, controlsCard, dynContainer);
}
