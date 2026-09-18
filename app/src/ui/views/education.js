// ============================================================
// Education Planning View — per-child funding projections.
// Cost/years/inflation/return are what-if levers persisted per client;
// grants, RESP balance and dependents come from the facts layer and
// the required saving from educationFunding() (respects lifetime caps).
// ============================================================
import { h, money, pct, icon, t } from '../dom.js';
import { kpi, card, slider, legend, statList } from '../widgets.js';
import { lineChart, PALETTE } from '../charts.js';
import { educationFunding } from '../../engine/analysis.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';

// Typical annual cost by country — a starting point for the what-if only (no jurisdiction data exists for it)
const COST_DEFAULTS = { CA: { annualCost: 12000, studyYears: 4 }, US: { annualCost: 30000, studyYears: 4 }, UK: { annualCost: 15000, studyYears: 3 } };

/** Future cost of the study years, inflated from now. */
function futureTotalCost(annualCost, studyYears, eduInflation, yearsUntilStart) {
  let total = 0;
  for (let i = 0; i < studyYears; i++) total += annualCost * Math.pow(1 + eduInflation, yearsUntilStart + i);
  return total;
}

/** Year-by-year savings path with the SAME grant caps as the engine (for the chart only). */
function buildPath(existing, annual, r, years, G, target) {
  let v = existing, fed = 0, pr = 0;
  const savings = [Math.round(v)], targets = [], labels = ['Y0'];
  for (let y = 0; y < years; y++) {
    const g1 = Math.min(G.max || Infinity, annual * G.rate, Math.max(0, (G.lifetime || Infinity) - fed));
    const g2 = Math.min(G.provMax || Infinity, annual * G.provRate, Math.max(0, (G.provLifetime || Infinity) - pr));
    fed += g1; pr += g2;
    v = v * (1 + r) + annual + g1 + g2;
    savings.push(Math.round(v)); labels.push('Y' + (y + 1));
  }
  for (let y = 0; y <= years; y++) targets.push(Math.round(target / Math.pow(1 + r, years - y)));   // PV of the target at each year
  return { savings, targets, labels };
}

function grantExplanation(country, eduLabel, G, cur) {
  if (country === 'CA') {
    return t(
      `Le ${eduLabel} (REEE) bénéficie de la Subvention canadienne pour l'épargne-études (SCEE) : ${pct(G.rate, 0)} des cotisations (max ${money(G.max, { currency: cur })}/an, plafond à vie de ${money(G.lifetime, { currency: cur })})${G.provRate > 0 ? `, plus l'incitatif provincial de ${pct(G.provRate, 0)} (max ${money(G.provMax, { currency: cur })}/an, ${money(G.provLifetime, { currency: cur })} à vie)` : ''}. Les revenus croissent à l'abri de l'impôt jusqu'au retrait.`,
      `The ${eduLabel} (RESP) benefits from the Canada Education Savings Grant (CESG): ${pct(G.rate, 0)} of contributions (max ${money(G.max, { currency: cur })}/yr, ${money(G.lifetime, { currency: cur })} lifetime)${G.provRate > 0 ? `, plus the provincial incentive of ${pct(G.provRate, 0)} (max ${money(G.provMax, { currency: cur })}/yr, ${money(G.provLifetime, { currency: cur })} lifetime)` : ''}. Growth is tax-deferred until withdrawal.`);
  }
  if (country === 'US') {
    return t(`Le ${eduLabel} offre une croissance libre d'impôt pour les dépenses d'études admissibles. Il n'y a pas de subvention fédérale directe, mais certains États offrent des déductions fiscales. Les retraits pour frais d'études sont exonérés d'impôt.`,
      `The ${eduLabel} offers tax-free growth for qualified education expenses. There is no direct federal grant, but some states offer tax deductions on contributions. Withdrawals for education expenses are tax-free.`);
  }
  if (country === 'UK') {
    return t(`Le ${eduLabel} permet d'épargner pour un enfant avec une croissance et des retraits entièrement exonérés d'impôt. Il n'y a pas de subvention gouvernementale directe. Le solde appartient à l'enfant à 18 ans.`,
      `The ${eduLabel} allows saving for a child with completely tax-free growth and withdrawals. There is no direct government grant. The balance belongs to the child at 18.`);
  }
  return t(`Utilisez le véhicule d'épargne-études approprié (${eduLabel}) pour votre juridiction.`, `Use the appropriate education savings vehicle (${eduLabel}) for your jurisdiction.`);
}

export function render({ store, client, jur, navigate }) {
  const cur = jur.currency;
  const country = jur.country || 'CA';
  const F = clientFacts(client, jur);
  const E = F.education;
  const G = E.grant;
  const eduLabel = (jur.labels && jur.labels.education) || 'RESP';
  const costDef = COST_DEFAULTS[country] || COST_DEFAULTS.CA;

  // What-if levers (persisted); inflation and return default from the file's assumptions
  const W = whatIf(client, 'education', { annualCost: costDef.annualCost, studyYears: costDef.studyYears, eduInflation: F.assumptions.educationInflation, returnRate: F.assumptions.preReturn });
  const save = (patch) => { Object.assign(W, patch); saveWhatIf(store, 'education', patch); };

  // Children who have not yet reached their education start age (ages kept current by the store)
  const deps = E.dependents.filter(d => d.yearsToGoal > 0 || d.age < (d.educationGoalAge || 18));

  const dynContainer = h('div', { class: 'grid' });

  function rebuild() {
    while (dynContainer.firstChild) dynContainer.removeChild(dynContainer.firstChild);
    const { annualCost, studyYears, eduInflation, returnRate } = W;
    const savingsPerChild = E.perChild;

    const childResults = deps.map(dep => {
      const yearsUntilStart = dep.yearsToGoal;
      const futureCost = futureTotalCost(annualCost, Math.round(studyYears), eduInflation, yearsUntilStart);
      const ef = educationFunding(client, { amount: futureCost, dependentId: dep.id, name: dep.name, targetAge: dep.educationGoalAge || 18 }, { years: Math.max(1, yearsUntilStart), returnRate, existing: savingsPerChild });
      const fvExisting = savingsPerChild * Math.pow(1 + returnRate, ef.years);
      const progress = futureCost > 0 ? Math.min(1, fvExisting / futureCost) : 1;
      const path = buildPath(savingsPerChild, ef.annual, returnRate, ef.years, G, futureCost);
      return { dep, yearsUntilStart, futureCost, ef, progress, path };
    });

    const totalFutureCost = childResults.reduce((s, r) => s + r.futureCost, 0);
    const totalMonthlyNeeded = childResults.reduce((s, r) => s + r.ef.monthly, 0);
    const totalGrants = childResults.reduce((s, r) => s + r.ef.projectedGrants, 0);
    const fvSavings = childResults.reduce((s, r) => s + savingsPerChild * Math.pow(1 + returnRate, r.ef.years), 0);
    const projectedShortfall = totalFutureCost - fvSavings;

    const kpiRow = h('div', { class: 'grid cols-4 span-full' },
      kpi({ label: t('Coût futur total', 'Total future cost'), value: money(totalFutureCost, { currency: cur, compact: true }), iconName: 'cap',
        sub: t(`${deps.length} enfant(s) · ${Math.round(studyYears)} ans d'études · inflation ${pct(eduInflation)}`, `${deps.length} child(ren) · ${Math.round(studyYears)} yrs study · inflation ${pct(eduInflation)}`) }),
      kpi({ label: t('Cotisation mensuelle requise', 'Monthly contribution required'), value: money(totalMonthlyNeeded, { currency: cur }), iconName: 'cashflow',
        sub: t(`Tous enfants · subventions projetées ${money(totalGrants, { currency: cur, compact: true })}`, `All children · projected grants ${money(totalGrants, { currency: cur, compact: true })}`) }),
      kpi({ label: t('Épargne-études actuelle', 'Current education savings'), value: money(E.respBalance, { currency: cur, compact: true }), iconName: 'bank',
        sub: E.respContrib > 0 ? t(`${eduLabel} · ${money(E.respContrib, { currency: cur })}/an cotisés`, `${eduLabel} · ${money(E.respContrib, { currency: cur })}/yr contributed`) : eduLabel }),
      kpi({ label: projectedShortfall > 0 ? t('Déficit projeté (sans cotisation)', 'Projected shortfall (no contributions)') : t('Surplus projeté', 'Projected surplus'),
        value: money(Math.abs(projectedShortfall), { currency: cur, compact: true }), iconName: projectedShortfall > 0 ? 'warning' : 'check', accent: projectedShortfall > 0 ? 'var(--neg)' : 'var(--pos)' }),
    );

    const childCards = childResults.map((r, idx) => {
      const { dep, yearsUntilStart, futureCost, ef, progress, path } = r;
      const progCls = progress >= 0.85 ? 'pos' : progress >= 0.4 ? 'warn' : 'neg';
      const chartSvg = path.savings.length > 1
        ? lineChart({ series: [
            { name: t('Épargne projetée', 'Projected savings'), color: PALETTE[idx % PALETTE.length], values: path.savings },
            { name: t('Cible (VP coût)', 'Target (PV cost)'), color: PALETTE[(idx + 5) % PALETTE.length], values: path.targets },
          ], xLabels: path.labels, area: true, height: 200 })
        : null;

      return card(dep.name, { sub: `${dep.age} ${t('ans', 'yrs')} · ${t('début études', 'school start')} ${dep.educationGoalAge || 18} ${t('ans', 'yrs')} · ${yearsUntilStart} ${t('ans restants', 'yrs remaining')}` },
        h('div', { class: 'grid cols-2', style: { gap: '16px', alignItems: 'start' } },
          h('div', {},
            statList([
              [t('Coût futur total', 'Total future cost'), money(futureCost, { currency: cur })],
              [t('Mensualité requise', 'Monthly required'), money(ef.monthly, { currency: cur }), ef.monthly > 0 ? '' : 'pos'],
              [t('Épargne actuelle (part)', 'Current savings (share)'), money(savingsPerChild, { currency: cur })],
              [t('Ans avant le début', 'Years until start'), yearsUntilStart + ' ' + t('ans', 'yrs')],
              G.rate > 0
                ? [t('Subventions projetées (plafonds respectés)', 'Projected grants (caps respected)'), money(ef.projectedGrants, { currency: cur })]
                : [t('Subvention gouvernementale', 'Gov. grant'), t('Aucune', 'None')],
              [t('Valeur projetée au début des études', 'Projected value at school start'), money(ef.projectedValue, { currency: cur }), ef.projectedValue >= futureCost - 1 ? 'pos' : 'neg'],
            ]),
            h('div', { style: { marginTop: '12px' } },
              h('div', { class: 'flex between', style: { marginBottom: '4px' } },
                h('span', { class: 'tiny muted' }, t('Financement (épargne actuelle, sans nouvelle cotisation)', 'Funding (current savings, no new contributions)')),
                h('b', { style: { color: `var(--${progCls})` } }, pct(progress, 0))),
              h('div', { class: 'bar' }, h('span', { style: { width: pct(Math.min(1, progress), 0), background: progCls === 'neg' ? 'var(--neg)' : progCls === 'warn' ? 'linear-gradient(90deg,var(--warn),var(--accent-2))' : 'linear-gradient(90deg,var(--brand-500),var(--accent))' } })),
            ),
          ),
          chartSvg
            ? h('div', {}, h('div', { html: chartSvg }),
                legend([{ color: PALETTE[idx % PALETTE.length], label: t('Épargne projetée (avec la mensualité requise)', 'Projected savings (with the required monthly)') }, { color: PALETTE[(idx + 5) % PALETTE.length], label: t('Valeur présente du coût', 'PV of cost target') }]))
            : h('div', { class: 'muted tiny', style: { padding: '8px' } }, t('Données insuffisantes pour le graphique.', 'Insufficient data for chart.')),
        ),
      );
    });

    const summaryCard = card(eduLabel, { class: 'span-full', sub: t('Véhicule d’épargne-études recommandé', 'Recommended education savings vehicle'),
      right: h('span', { class: 'chip info', html: icon('cap', 14) + ' ' + eduLabel }) },
      h('div', { class: 'tiny', style: { lineHeight: '1.7' } }, grantExplanation(country, eduLabel, G, cur)));

    dynContainer.appendChild(kpiRow);
    childCards.forEach(cc => dynContainer.appendChild(cc));
    dynContainer.appendChild(summaryCard);
  }

  const controlsCard = card(t('Hypothèses', 'Assumptions'), { class: 'span-full',
    sub: t('Inflation des études et rendement tirés des hypothèses du dossier — vos ajustements sont conservés', 'Education inflation and return from the file assumptions — your adjustments are kept'),
    right: h('span', { class: 'chip info' }, jur.name || country) },
    h('div', { class: 'grid cols-2', style: { gap: '12px', alignItems: 'start' } },
      slider({ label: t('Coût annuel des études', 'Annual education cost') + ` (${cur})`, value: W.annualCost, min: 2000, max: 80000, step: 500, format: v => money(v, { currency: cur }), onInput: v => { save({ annualCost: v }); rebuild(); } }),
      slider({ label: t('Nombre d’années d’études', 'Years of study'), value: W.studyYears, min: 2, max: 6, step: 1, format: v => v + ' ' + t('ans', 'yrs'), onInput: v => { save({ studyYears: Math.round(v) }); rebuild(); } }),
      slider({ label: t('Inflation des études', 'Education inflation'), value: W.eduInflation, min: 0, max: 0.06, step: 0.005, format: v => pct(v), onInput: v => { save({ eduInflation: v }); rebuild(); } }),
      slider({ label: t('Rendement espéré du portefeuille', 'Expected portfolio return'), value: W.returnRate, min: 0.03, max: 0.08, step: 0.005, format: v => pct(v), onInput: v => { save({ returnRate: v }); rebuild(); } }),
    ),
  );

  if (deps.length === 0) {
    const emptyCard = card(t('Planification des études', 'Education planning'), { class: 'span-full' },
      h('div', { class: 'empty', style: { padding: '40px 0' } },
        h('div', { class: 'big', html: icon('cap', 48) }),
        h('div', { style: { marginTop: '12px', fontWeight: 600 } }, t('Aucun enfant à charge n’ayant pas encore atteint l’âge des études.', 'No dependent below their education start age.')),
        h('div', { class: 'muted tiny', style: { marginTop: '6px', marginBottom: '16px' } }, t('Ajoutez des personnes à charge dans le profil pour utiliser le planificateur d’études.', 'Add dependents in the profile to use the education planner.')),
        h('button', { class: 'btn primary', onClick: () => navigate('profile') }, icon('client', 14) + ' ' + t('Aller au profil', 'Go to profile')),
      ));
    return h('div', { class: 'grid' }, emptyCard);
  }

  rebuild();
  return h('div', { class: 'grid' }, controlsCard, dynContainer);
}
