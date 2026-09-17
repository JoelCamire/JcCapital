import { h, money, pct, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend, dataTable } from '../widgets.js';
import { donutChart, PALETTE } from '../charts.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';

// Category groupings for the 50/30/20 rule
const NEEDS_CATS = ['living', 'housing', 'transport', 'health'];
const WANTS_CATS = ['lifestyle'];
// 'other' is counted as needs by default

const CAT_LABELS = {
  living:    () => t('Coût de vie', 'Living'),
  lifestyle: () => t('Style de vie', 'Lifestyle'),
  transport: () => t('Transport', 'Transport'),
  housing:   () => t('Logement', 'Housing'),
  health:    () => t('Santé', 'Health'),
  other:     () => t('Autre', 'Other'),
};

const CAT_COLORS = {
  living:    PALETTE[0],
  lifestyle: PALETTE[1],
  transport: PALETTE[2],
  housing:   PALETTE[3],
  health:    PALETTE[4],
  other:     PALETTE[5],
};

export function render({ store, client, jur }) {
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const H = F.household;
  const A = F.assumptions;

  // ── Numbers straight from the facts layer (exact tax, gated incomes) ─────
  const grossMonthly   = H.grossIncome / 12;
  const taxMonthly     = H.tax / 12;
  const netMonthly     = H.netIncomeMonthly;
  const totalExpMonthly = H.expensesMonthly;
  const debtMonthly    = H.debtServiceMonthly;
  const contribMonthly = H.contributions / 12;
  const surplus        = H.surplusMonthly;                 // after expenses, debt AND contributions
  const savingsRate    = H.savingsRate;                    // contributions / gross income
  const target         = A.savingsTarget;

  // ── 50/30/20 classification (share of net income) ───────────────────────
  let needsAmt = 0, wantsAmt = 0;
  for (const [cat, amt] of Object.entries(H.expensesByCategory)) {
    const mo = amt / 12;
    if (WANTS_CATS.includes(cat)) wantsAmt += mo;
    else needsAmt += mo;                                    // living, housing, transport, health, other
  }
  needsAmt += debtMonthly;                                   // debt service is a need
  const savingsAmt = contribMonthly + Math.max(0, surplus);

  const needsPct = netMonthly > 0 ? needsAmt / netMonthly : 0;
  const wantsPct = netMonthly > 0 ? wantsAmt / netMonthly : 0;
  const savPct   = netMonthly > 0 ? savingsAmt / netMonthly : 0;

  // ── Expense breakdown by category ───────────────────────────────────────
  const catEntries = Object.entries(H.expensesByCategory).map(([cat, amt]) => [cat, amt / 12]).sort((a, b) => b[1] - a[1]);

  // 1. KPI row
  const kpiRow = h('div', { class: 'grid cols-4 span-full' },
    kpi({
      label: t('Revenu net mensuel', 'Monthly net income'),
      value: money(netMonthly, { currency: cur }),
      sub: t(`${money(grossMonthly, { currency: cur })} brut − ${money(taxMonthly, { currency: cur })} impôt et cotisations (${pct(H.averageRate, 0)})`,
        `${money(grossMonthly, { currency: cur })} gross − ${money(taxMonthly, { currency: cur })} tax & contributions (${pct(H.averageRate, 0)})`),
      iconName: 'cashflow',
      accent: 'var(--pos)',
    }),
    kpi({
      label: t('Dépenses mensuelles', 'Monthly expenses'),
      value: money(totalExpMonthly, { currency: cur }),
      iconName: 'doc',
      sub: debtMonthly > 0 ? t(`+ ${money(debtMonthly, { currency: cur })} service de la dette`, `+ ${money(debtMonthly, { currency: cur })} debt service`) : '',
    }),
    kpi({
      label: surplus >= 0 ? t('Surplus mensuel', 'Monthly surplus') : t('Déficit mensuel', 'Monthly deficit'),
      value: money(Math.abs(surplus), { currency: cur }),
      iconName: surplus >= 0 ? 'check' : 'warning',
      accent: surplus >= 0 ? 'var(--pos)' : 'var(--neg)',
      sub: surplus >= 0
        ? t(`Après ${money(contribMonthly, { currency: cur })} de cotisations`, `After ${money(contribMonthly, { currency: cur })} of contributions`)
        : t('Dépenses, dettes et cotisations dépassent le revenu net', 'Expenses, debt and contributions exceed net income'),
    }),
    kpi({
      label: t("Taux d'épargne", 'Savings rate'),
      value: pct(savingsRate, 1),
      iconName: 'goals',
      accent: savingsRate >= target ? 'var(--pos)' : savingsRate >= target / 2 ? 'var(--warn)' : 'var(--neg)',
      sub: savingsRate >= target
        ? t(`Cible de ${pct(target, 0)} atteinte`, `${pct(target, 0)} target reached`)
        : t(`Cible : ${pct(target, 0)} du revenu brut`, `Target: ${pct(target, 0)} of gross income`),
    }),
  );

  // 2. 50/30/20 card — progress bars
  function progressBar(label, actual, tgt, color) {
    const filledPct = Math.min(1, actual) * 100;
    const targetPct = tgt * 100;
    const overBudget = actual > tgt;
    return h('div', { style: { marginBottom: '16px' } },
      h('div', { class: 'flex between', style: { marginBottom: '5px' } },
        h('span', { class: 'muted tiny' }, label),
        h('span', { class: 'mono', style: { fontSize: '13px', color: overBudget ? 'var(--neg)' : 'inherit' } },
          pct(actual, 0) + ' / ' + pct(tgt, 0))),
      h('div', { style: { position: 'relative', height: '10px', borderRadius: '6px', background: 'var(--surface-3)', overflow: 'hidden' } },
        h('div', { style: {
          position: 'absolute', left: '0', top: '0', height: '100%',
          width: filledPct.toFixed(1) + '%',
          background: overBudget ? 'var(--neg)' : color,
          borderRadius: '6px',
          transition: 'width .3s',
        } }),
        h('div', { style: {
          position: 'absolute', top: '0', left: targetPct.toFixed(1) + '%',
          width: '2px', height: '100%',
          background: 'var(--text-2)', opacity: '0.5',
        } }),
      ),
    );
  }

  const needsGuidance = needsPct > 0.5
    ? t('Vos besoins dépassent la cible de 50 %. Cherchez à réduire logement ou transport.', 'Your needs exceed the 50 % target. Look to reduce housing or transport.')
    : t('Vos besoins sont dans la cible — continuez ainsi.', 'Your needs are within target — keep it up.');
  const wantsGuidance = wantsPct > 0.3
    ? t('Vos envies dépassent 30 %. Révisez abonnements et dépenses discrétionnaires.', 'Your wants exceed 30 %. Review subscriptions and discretionary spending.')
    : t('Vos envies sont sous contrôle.', 'Your wants are under control.');
  const savGuidance = savPct >= 0.2
    ? t('Excellent ! Vous épargnez au moins 20 % de votre revenu net.', 'Excellent! You are saving at least 20 % of your net income.')
    : t('Cherchez à épargner au moins 20 % de votre revenu net.', 'Aim to save at least 20 % of your net income.');

  const rule5030Card = card(
    t('Règle 50/30/20', '50/30/20 Rule'),
    { sub: t('Besoins / Envies / Épargne sur le revenu net mensuel (impôt exact)', 'Needs / Wants / Savings of monthly net income (exact tax)') },
    h('div', { style: { padding: '8px 0' } },
      progressBar(t('Besoins (logement, vie, santé, transport, dettes)', 'Needs (housing, living, health, transport, debt)'), needsPct, 0.5, PALETTE[0]),
      progressBar(t('Envies (style de vie)', 'Wants (lifestyle)'), wantsPct, 0.3, PALETTE[1]),
      progressBar(t('Épargne (cotisations + surplus)', 'Savings (contributions + surplus)'), savPct, 0.2, PALETTE[2]),
    ),
    h('div', { class: 'sep' }),
    h('div', { style: { fontSize: '12px', lineHeight: '1.6' } },
      h('div', { style: { marginBottom: '4px' } }, h('span', { html: icon(needsPct > 0.5 ? 'warning' : 'check', 13) }), ' ', needsGuidance),
      h('div', { style: { marginBottom: '4px' } }, h('span', { html: icon(wantsPct > 0.3 ? 'warning' : 'check', 13) }), ' ', wantsGuidance),
      h('div', {}, h('span', { html: icon(savPct >= 0.2 ? 'check' : 'warning', 13) }), ' ', savGuidance),
    ),
  );

  // 3. Donut + table breakdown card
  const donutSegments = catEntries.length
    ? catEntries.map(([cat, amt]) => ({ label: (CAT_LABELS[cat] || (() => cat))(), value: amt, color: CAT_COLORS[cat] || PALETTE[5] }))
    : [{ label: t('Aucune dépense', 'No expenses'), value: 1, color: 'var(--surface-3)' }];

  const breakdownCard = card(
    t('Répartition des dépenses', 'Spending breakdown'),
    { sub: t('Par catégorie — mensuel', 'By category — monthly') },
    h('div', { class: 'flex', style: { alignItems: 'center', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px 0' } },
      h('div', { html: donutChart({ segments: donutSegments, centerLabel: totalExpMonthly > 0 ? money(totalExpMonthly, { currency: cur, compact: true }) : '—', centerSub: t('/mois', '/mo') }) }),
      h('div', { style: { flex: '1', minWidth: '220px' } }, legend(donutSegments.map(s => ({ color: s.color, label: s.label })))),
    ),
    h('div', { class: 'sep' }),
    dataTable({
      rows: catEntries.map(([cat, amt]) => ({ cat, label: (CAT_LABELS[cat] || (() => cat))(), monthly: amt, share: totalExpMonthly > 0 ? amt / totalExpMonthly : 0 })),
      cols: [
        { key: 'label', label: t('Catégorie', 'Category') },
        { key: 'monthly', label: t('Mensuel', 'Monthly'), num: true, fmt: v => money(v, { currency: cur }) },
        { key: 'share', label: t('% dépenses', '% of expenses'), num: true, fmt: v => pct(v, 1) },
      ],
      empty: t('Aucune dépense enregistrée', 'No expenses recorded'),
    }),
  );

  // 4. Budget simulator — what-if levers persisted per client (enter once)
  const W = whatIf(client, 'budget', { simExtra: 0, simReturn: A.preReturn });
  const simContainer = h('div');

  function rebuildSim() {
    const annualExtra = W.simExtra * 12;
    const r = W.simReturn;
    const tenYearFV = annualExtra > 0 ? (r > 0 ? annualExtra * ((Math.pow(1 + r, 10) - 1) / r) : annualExtra * 10) : 0;
    const annualSurplus = (surplus - W.simExtra) * 12;          // extra saving comes out of the surplus
    const simRate = H.grossIncome > 0 ? (H.contributions + annualExtra) / H.grossIncome : 0;

    simContainer.replaceChildren(
      h('div', { class: 'grid cols-3', style: { marginTop: '12px' } },
        statList([
          [t('Surplus annuel restant', 'Remaining annual surplus'), money(annualSurplus, { currency: cur }), annualSurplus >= 0 ? 'pos' : 'neg'],
          [t('Épargne additionnelle / an', 'Additional saving / yr'), money(annualExtra, { currency: cur })],
        ]),
        statList([
          [t('Valeur accumulée sur 10 ans', '10-year compounded value'), money(tenYearFV, { currency: cur, compact: true }), 'pos'],
          [t('Taux de rendement hypothétique', 'Hypothetical return rate'), pct(r)],
        ]),
        statList([
          [t("Taux d'épargne simulé", 'Simulated savings rate'), pct(simRate, 1), simRate >= target ? 'pos' : ''],
          [t(`Cible ${pct(target, 0)} atteinte`, `${pct(target, 0)} target reached`), simRate >= target ? t('Oui', 'Yes') : t('Non', 'No'), simRate >= target ? 'pos' : 'neg'],
        ]),
      ),
    );
  }
  rebuildSim();

  const simCard = card(
    t('Simulateur de budget', 'Budget simulator'),
    { sub: t('Impact sur l’épargne annuelle et la valeur future — les curseurs sont conservés dans le dossier', 'Impact on annual savings and future value — sliders are kept with the file') },
    h('div', { class: 'grid cols-2', style: { marginBottom: '4px' } },
      slider({
        label: t('Économie mensuelle additionnelle', 'Additional monthly saving'),
        value: W.simExtra, min: 0, max: 2000, step: 50,
        format: v => money(v, { currency: cur }),
        onInput: v => { W.simExtra = v; saveWhatIf(store, 'budget', { simExtra: v }); rebuildSim(); },
      }),
      slider({
        label: t('Rendement annuel hypothétique', 'Hypothetical annual return'),
        value: W.simReturn, min: 0.01, max: 0.12, step: 0.005,
        format: v => pct(v),
        onInput: v => { W.simReturn = v; saveWhatIf(store, 'budget', { simReturn: v }); rebuildSim(); },
      }),
    ),
    simContainer,
  );

  // 5. Budgeting tips card
  const tip = (title, text, last) => h('div', { style: { display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 0', borderBottom: last ? 'none' : '1px solid var(--border)' } },
    h('span', { html: icon('check', 15), style: { color: 'var(--pos)', flexShrink: '0', marginTop: '1px' } }),
    h('div', {}, h('b', {}, title), h('div', { class: 'tiny muted', style: { marginTop: '2px' } }, text)));
  const tipsCard = card(
    t('Conseils de gestion budgétaire', 'Budgeting tips'),
    { sub: t('Bonnes pratiques', 'Best practices') },
    h('div', {},
      tip(t('Payez-vous en premier', 'Pay yourself first'), t('Prélevez votre épargne dès réception du salaire avant toute autre dépense.', 'Set aside your savings as soon as you receive your pay, before any other spending.')),
      tip(t('Automatisez vos épargnes', 'Automate your savings'), t('Un virement automatique élimine la tentation de dépenser. Configurez-le dès maintenant.', 'An automatic transfer eliminates the temptation to spend. Set it up right away.')),
      tip(t('Révisez vos abonnements', 'Review your subscriptions'), t('Vérifiez chaque mois les services récurrents et annulez ceux inutilisés.', 'Check your recurring services each month and cancel any unused ones.')),
      tip(t('Règle du 24 heures', '24-hour rule'), t('Avant tout achat non essentiel, attendez 24 heures pour éviter les achats impulsifs.', 'Before any non-essential purchase, wait 24 hours to avoid impulse buying.'), true),
    ),
  );

  return h('div', { class: 'grid' },
    kpiRow,
    h('div', { class: 'grid cols-2 span-full' }, rule5030Card, breakdownCard),
    h('div', { class: 'span-full' }, simCard),
    h('div', { class: 'span-full' }, tipsCard),
  );
}
