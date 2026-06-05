import { h, money, pct, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend, dataTable } from '../widgets.js';
import { donutChart, PALETTE } from '../charts.js';

// Category groupings for the 50/30/20 rule
const NEEDS_CATS = ['living', 'housing', 'transport', 'health'];
const WANTS_CATS = ['lifestyle'];
// 'other' is split proportionally between needs and wants — kept as needs by default

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

export function render({ client, jur }) {
  const cur = jur.currency;

  // ── Raw numbers (annual → monthly) ──────────────────────────────────────
  const EMPLOYABLE_TYPES = ['employment', 'self'];
  const grossMonthly = client.incomes.reduce((s, inc) => s + (inc.amount || 0), 0) / 12;
  const employableMonthly = client.incomes
    .filter(inc => EMPLOYABLE_TYPES.includes(inc.type))
    .reduce((s, inc) => s + (inc.amount || 0), 0) / 12;

  // Simple ~28 % estimated tax applied only on employment / self-employment income
  const TAX_RATE = 0.28;
  const taxEstimate = employableMonthly * TAX_RATE;
  const netMonthly = grossMonthly - taxEstimate;

  const totalExpMonthly = client.expenses.reduce((s, e) => s + (e.amount || 0), 0) / 12;
  const surplus = netMonthly - totalExpMonthly;
  const savingsRate = netMonthly > 0 ? surplus / netMonthly : 0;

  // ── 50/30/20 classification ──────────────────────────────────────────────
  let needsAmt = 0, wantsAmt = 0;
  client.expenses.forEach(e => {
    const mo = (e.amount || 0) / 12;
    if (NEEDS_CATS.includes(e.category)) needsAmt += mo;
    else if (WANTS_CATS.includes(e.category)) wantsAmt += mo;
    else needsAmt += mo; // 'other' counts as needs
  });
  const savingsAmt = Math.max(0, surplus);

  const needsPct  = netMonthly > 0 ? needsAmt  / netMonthly : 0;
  const wantsPct  = netMonthly > 0 ? wantsAmt  / netMonthly : 0;
  const savPct    = netMonthly > 0 ? savingsAmt / netMonthly : 0;

  // ── Expense breakdown by category ───────────────────────────────────────
  const catMap = {};
  client.expenses.forEach(e => {
    const cat = e.category || 'other';
    catMap[cat] = (catMap[cat] || 0) + (e.amount || 0) / 12;
  });
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  // ── Build UI ─────────────────────────────────────────────────────────────

  // 1. KPI row
  const kpiRow = h('div', { class: 'grid cols-4 span-full' },
    kpi({
      label: t('Revenu net mensuel (estimé)', 'Monthly net income (est.)'),
      value: money(netMonthly, { currency: cur }),
      sub: t('Après impôt estimé ~28 % sur emploi', 'After ~28 % estimated tax on employment'),
      iconName: 'cashflow',
      accent: 'var(--pos)',
    }),
    kpi({
      label: t('Dépenses mensuelles', 'Monthly expenses'),
      value: money(totalExpMonthly, { currency: cur }),
      iconName: 'doc',
    }),
    kpi({
      label: surplus >= 0 ? t('Surplus mensuel', 'Monthly surplus') : t('Déficit mensuel', 'Monthly deficit'),
      value: money(Math.abs(surplus), { currency: cur }),
      iconName: surplus >= 0 ? 'check' : 'warning',
      accent: surplus >= 0 ? 'var(--pos)' : 'var(--neg)',
      sub: surplus >= 0 ? t('Marge disponible', 'Available margin') : t('Dépenses supérieures au revenu net', 'Expenses exceed net income'),
    }),
    kpi({
      label: t('Taux épargne', 'Savings rate'),
      value: pct(savingsRate, 1),
      iconName: 'goals',
      accent: savingsRate >= 0.2 ? 'var(--pos)' : savingsRate >= 0.1 ? 'var(--warn)' : 'var(--neg)',
      sub: savingsRate >= 0.2 ? t('Objectif atteint', 'Goal reached') : t('Objectif : 20 %', 'Target: 20 %'),
    }),
  );

  // 2. 50/30/20 card — progress bars
  function progressBar(label, actual, target, color) {
    const filledPct = Math.min(1, actual) * 100;
    const targetPct = target * 100;
    const overBudget = actual > target;
    return h('div', { style: { marginBottom: '16px' } },
      h('div', { class: 'flex between', style: { marginBottom: '5px' } },
        h('span', { class: 'muted tiny' }, label),
        h('span', { class: 'mono', style: { fontSize: '13px', color: overBudget ? 'var(--neg)' : 'inherit' } },
          pct(actual, 0) + ' / ' + pct(target, 0))),
      h('div', { style: { position: 'relative', height: '10px', borderRadius: '6px', background: 'var(--surface-3)', overflow: 'hidden' } },
        h('div', { style: {
          position: 'absolute', left: '0', top: '0', height: '100%',
          width: filledPct.toFixed(1) + '%',
          background: overBudget ? 'var(--neg)' : color,
          borderRadius: '6px',
          transition: 'width .3s',
        } }),
        // target marker
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
    { sub: t('Besoins / Envies / Épargne sur le revenu net mensuel estimé', 'Needs / Wants / Savings of estimated monthly net income') },
    h('div', { style: { padding: '8px 0' } },
      progressBar(t('Besoins (logement, vie, santé, transport)', 'Needs (housing, living, health, transport)'), needsPct, 0.5, PALETTE[0]),
      progressBar(t('Envies (style de vie)', 'Wants (lifestyle)'), wantsPct, 0.3, PALETTE[1]),
      progressBar(t('Épargne et surplus', 'Savings and surplus'), savPct, 0.2, PALETTE[2]),
    ),
    h('div', { class: 'sep' }),
    h('div', { style: { fontSize: '12px', lineHeight: '1.6' } },
      h('div', { style: { marginBottom: '4px' } },
        h('span', { html: icon(needsPct > 0.5 ? 'warning' : 'check', 13) }),
        ' ', needsGuidance),
      h('div', { style: { marginBottom: '4px' } },
        h('span', { html: icon(wantsPct > 0.3 ? 'warning' : 'check', 13) }),
        ' ', wantsGuidance),
      h('div', {},
        h('span', { html: icon(savPct >= 0.2 ? 'check' : 'warning', 13) }),
        ' ', savGuidance),
    ),
  );

  // 3. Donut + table breakdown card
  const donutSegments = catEntries.length
    ? catEntries.map(([cat, amt]) => ({
        label: (CAT_LABELS[cat] || (() => cat))(),
        value: amt,
        color: CAT_COLORS[cat] || PALETTE[5],
      }))
    : [{ label: t('Aucune dépense', 'No expenses'), value: 1, color: 'var(--surface-3)' }];

  const centerLabel = totalExpMonthly > 0
    ? money(totalExpMonthly, { currency: cur, compact: true })
    : '—';

  const breakdownCard = card(
    t('Répartition des dépenses', 'Spending breakdown'),
    { sub: t('Par catégorie — mensuel', 'By category — monthly') },
    h('div', { class: 'flex', style: { alignItems: 'center', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px 0' } },
      h('div', { html: donutChart({
        segments: donutSegments,
        centerLabel,
        centerSub: t('/mois', '/mo'),
      }) }),
      h('div', { style: { flex: '1', minWidth: '220px' } },
        legend(donutSegments.map(s => ({ color: s.color, label: s.label }))),
      ),
    ),
    h('div', { class: 'sep' }),
    dataTable({
      rows: catEntries.length
        ? catEntries.map(([cat, amt]) => ({
            cat,
            label: (CAT_LABELS[cat] || (() => cat))(),
            monthly: amt,
            share: totalExpMonthly > 0 ? amt / totalExpMonthly : 0,
          }))
        : [],
      cols: [
        { key: 'label', label: t('Catégorie', 'Category') },
        { key: 'monthly', label: t('Mensuel', 'Monthly'), num: true, fmt: v => money(v, { currency: cur }) },
        { key: 'share', label: t('% dépenses', '% of expenses'), num: true, fmt: v => pct(v, 1) },
      ],
      empty: t('Aucune dépense enregistrée', 'No expenses recorded'),
    }),
  );

  // 4. Balance simulator card — sub-container rebuilt on slider change, no store mutation
  const simContainer = h('div');

  function rebuildSim(extraSaving, returnRate) {
    const annualExtra = extraSaving * 12;
    const tenYearFV = annualExtra > 0
      ? annualExtra * ((Math.pow(1 + returnRate, 10) - 1) / returnRate)
      : 0;
    const annualSurplus = (surplus + extraSaving) * 12;

    simContainer.replaceChildren(
      h('div', { class: 'grid cols-3', style: { marginTop: '12px' } },
        statList([
          [t('Surplus annuel projeté', 'Projected annual surplus'), money(annualSurplus, { currency: cur }), annualSurplus >= 0 ? 'pos' : 'neg'],
          [t('Épargne additionnelle / an', 'Additional saving / yr'), money(annualExtra, { currency: cur })],
        ]),
        statList([
          [t('Valeur accumulée sur 10 ans', '10-year compounded value'), money(tenYearFV, { currency: cur, compact: true }), 'pos'],
          [t('Taux de rendement hypothétique', 'Hypothetical return rate'), pct(returnRate)],
        ]),
        statList([
          [t('Taux épargne simulé', 'Simulated savings rate'),
            netMonthly > 0 ? pct(Math.max(0, (surplus + extraSaving)) / netMonthly) : '—',
            (surplus + extraSaving) / netMonthly >= 0.2 ? 'pos' : ''],
          [t('Objectif 20 % atteint', '20 % target reached'),
            (netMonthly > 0 && (surplus + extraSaving) / netMonthly >= 0.2)
              ? t('Oui', 'Yes')
              : t('Non', 'No'),
            (netMonthly > 0 && (surplus + extraSaving) / netMonthly >= 0.2) ? 'pos' : 'neg'],
        ]),
      ),
    );
  }

  let simExtra = 0;
  let simReturn = 0.05;
  rebuildSim(simExtra, simReturn);

  const simCard = card(
    t('Simulateur de budget', 'Budget simulator'),
    { sub: t('Impact sur épargne annuelle et valeur future — sans modifier le dossier', 'Impact on annual savings and future value — without changing the file') },
    h('div', { class: 'grid cols-2', style: { marginBottom: '4px' } },
      slider({
        label: t('Économie mensuelle additionnelle', 'Additional monthly saving'),
        value: 0, min: 0, max: 2000, step: 50,
        format: v => money(v, { currency: cur }),
        onInput: v => { simExtra = v; rebuildSim(simExtra, simReturn); },
      }),
      slider({
        label: t('Rendement annuel hypothétique', 'Hypothetical annual return'),
        value: 0.05, min: 0.01, max: 0.12, step: 0.005,
        format: v => pct(v),
        onInput: v => { simReturn = v; rebuildSim(simExtra, simReturn); },
      }),
    ),
    simContainer,
  );

  // 5. Budgeting tips card
  const tipsCard = card(
    t('Conseils de gestion budgétaire', 'Budgeting tips'),
    { sub: t('Bonnes pratiques', 'Best practices') },
    h('div', {},
      h('div', { style: { display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border)' } },
        h('span', { html: icon('check', 15), style: { color: 'var(--pos)', flexShrink: '0', marginTop: '1px' } }),
        h('div', {},
          h('b', {}, t('Payez-vous en premier', 'Pay yourself first')),
          h('div', { class: 'tiny muted', style: { marginTop: '2px' } },
            t('Prélevez votre épargne dès réception du salaire avant toute autre dépense.', 'Set aside your savings as soon as you receive your pay, before any other spending.')),
        ),
      ),
      h('div', { style: { display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border)' } },
        h('span', { html: icon('check', 15), style: { color: 'var(--pos)', flexShrink: '0', marginTop: '1px' } }),
        h('div', {},
          h('b', {}, t('Automatisez vos épargnes', 'Automate your savings')),
          h('div', { class: 'tiny muted', style: { marginTop: '2px' } },
            t('Un virement automatique élimine la tentation de dépenser. Configurez-le dès maintenant.', 'An automatic transfer eliminates the temptation to spend. Set it up right away.')),
        ),
      ),
      h('div', { style: { display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border)' } },
        h('span', { html: icon('check', 15), style: { color: 'var(--pos)', flexShrink: '0', marginTop: '1px' } }),
        h('div', {},
          h('b', {}, t('Révisez vos abonnements', 'Review your subscriptions')),
          h('div', { class: 'tiny muted', style: { marginTop: '2px' } },
            t('Vérifiez chaque mois les services récurrents et annulez ceux inutilisés.', 'Check your recurring services each month and cancel any unused ones.')),
        ),
      ),
      h('div', { style: { display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 0' } },
        h('span', { html: icon('check', 15), style: { color: 'var(--pos)', flexShrink: '0', marginTop: '1px' } }),
        h('div', {},
          h('b', {}, t('Règle du 24 heures', '24-hour rule')),
          h('div', { class: 'tiny muted', style: { marginTop: '2px' } },
            t('Avant tout achat non essentiel, attendez 24 heures pour éviter les achats impulsifs.', 'Before any non-essential purchase, wait 24 hours to avoid impulse buying.')),
        ),
      ),
    ),
  );

  // ── Layout ────────────────────────────────────────────────────────────────
  return h('div', { class: 'grid' },
    kpiRow,
    h('div', { class: 'grid cols-2 span-full' },
      rule5030Card,
      breakdownCard,
    ),
    h('div', { class: 'span-full' }, simCard),
    h('div', { class: 'span-full' }, tipsCard),
  );
}
