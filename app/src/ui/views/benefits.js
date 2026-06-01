// ============================================================
// Government Benefits Optimisation — View
// Bilingual FR/EN via t() from '../dom.js' (re-exported from i18n.js).
// render({store, client, jur, navigate}) → HTMLElement
// ============================================================
import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { lineChart, barChart, PALETTE } from '../charts.js';
import { benefitAtAge, claimingAnalysis, oasClawback, buildCumulativeSeries } from '../../engine/benefits.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return list of candidate claim ages filtered to what the pension allows. */
function candidateAges(pension) {
  if (!pension || !pension.maxAnnual) return [];
  const normal = pension.startAge || 65;
  // Always include 60 (or normal-5), normal, and 70; skip duplicates.
  const raw = [Math.max(60, normal - 5), Math.max(60, normal - 3), normal, Math.min(70, normal + 3), 70];
  return [...new Set(raw)].filter((a) => a >= 60 && a <= 70).sort((a, b) => a - b);
}

/** Chip element for recommended-age highlighting. */
function chipBest() {
  return h('span', { class: 'chip pos', style: { marginLeft: '6px' }, html: icon('check', 11) + ' ' + t('Optimal', 'Optimal') });
}

// ---------------------------------------------------------------------------
// Member claiming-analysis card
// ---------------------------------------------------------------------------

function memberClaimingCard(member, pension, pensionName, cur) {
  const le = member.lifeExpectancy || 90;
  const ages = candidateAges(pension);

  if (!pension || !pension.maxAnnual || ages.length === 0) {
    return card(
      `${t('Analyse', 'Analysis')} — ${member.name}`,
      { sub: pensionName },
      h('div', { class: 'empty' }, t('Données de pension non disponibles pour cette juridiction.', 'Pension data not available for this jurisdiction.')),
    );
  }

  const { rows, recommendedAge } = claimingAnalysis(pension, ages, le);

  // ----- Table of claim ages -----
  const tableRows = rows.map((r) => {
    const isRec = r.age === recommendedAge;
    return h('tr', { class: isRec ? 'pos-row' : '' },
      h('td', { class: 'num mono' },
        h('b', {}, String(r.age)),
        isRec ? chipBest() : null,
      ),
      h('td', { class: 'num mono' }, money(Math.round(r.annual), { currency: cur })),
      h('td', { class: 'num mono' }, money(Math.round(r.cumulative), { currency: cur, compact: true })),
    );
  });

  const table = h('div', { class: 'tbl-wrap' },
    h('table', { class: 'tbl' },
      h('thead', {},
        h('tr', {},
          h('th', { class: 'num' }, t('Âge de demande', 'Claim age')),
          h('th', { class: 'num' }, t('Rente annuelle', 'Annual benefit')),
          h('th', { class: 'num' }, t(`Cumul à vie (≤ ${le} ans)`, `Lifetime total (to ${le})`)),
        ),
      ),
      h('tbody', {}, ...tableRows),
    ),
  );

  // ----- Break-even line chart -----
  // Show 3 representative claim ages: earliest / normal / latest
  const earliest = ages[0];
  const normal = pension.startAge || 65;
  const latest = ages[ages.length - 1];
  const chartAges = [...new Set([earliest, normal, latest])];
  const chartColors = [PALETTE[4], PALETTE[0], PALETTE[1]];

  const chartStartAge = member.currentAge || 50;
  const xLabels = Array.from({ length: le - chartStartAge + 1 }, (_, i) => chartStartAge + i);

  const series = chartAges.map((ca, si) => ({
    name: String(ca),
    color: chartColors[si % chartColors.length],
    values: buildCumulativeSeries(pension, ca, chartStartAge, le),
  }));

  const chartLegend = legend(chartAges.map((ca, si) => ({
    color: chartColors[si % chartColors.length],
    label: `${t('Demande à', 'Claim at')} ${ca} ${t('ans', 'yrs')}`,
  })));

  const tradeOffNote = h('p', { class: 'tiny muted', style: { marginTop: '10px', lineHeight: '1.5' } },
    t(
      'Demander tôt signifie plus d\'années de prestations mais des montants réduits. Retarder donne de plus gros chèques mais moins d\'années. Le point de rentabilité se situe typiquement vers 80-83 ans — avantageusement si vous êtes en bonne santé et disposez d\'autres sources de revenu.',
      'Claiming early means more years of benefits but smaller amounts. Delaying gives larger cheques but fewer years. The break-even point is typically around age 80-83 — delaying is advantageous if you are in good health and have other income sources.',
    ),
  );

  return card(
    `${t('Analyse de l\'âge de demande', 'Claiming age analysis')} — ${member.name}`,
    {
      sub: `${pensionName} · ${t('espérance de vie', 'life expectancy')} ${le} ${t('ans', 'yrs')}`,
      right: chartLegend,
    },
    table,
    h('div', { class: 'sep' }),
    h('div', { html: lineChart({ series, xLabels: xLabels.map(String), area: false, height: 260 }) }),
    tradeOffNote,
  );
}

// ---------------------------------------------------------------------------
// OAS Clawback card
// ---------------------------------------------------------------------------

function oasClawbackCard(jur, initialIncome, cur) {
  const oas = jur && jur.pensions && jur.pensions.oas;
  const hasClawback = oas && oas.clawbackStart && oas.clawbackRate;

  if (!hasClawback) {
    const note = jur && jur.country === 'US'
      ? t(
          'La récupération de la Sécurité sociale (Windfall Elimination Provision / Government Pension Offset) est calculée séparément selon vos revenus passés. Il n\'y a pas de récupération progressive basée sur le revenu comme la PSV canadienne.',
          'Social Security benefit reduction (Windfall Elimination Provision / Government Pension Offset) is calculated separately based on your earnings history. There is no income-based progressive clawback like Canada\'s OAS.',
        )
      : t(
          'Il n\'y a pas de récupération de pension publique basée sur le revenu applicable dans cette juridiction.',
          'There is no income-based public pension clawback applicable in this jurisdiction.',
        );
    return card(
      t('Récupération de la PSV / OAS Clawback', 'OAS Clawback'),
      { sub: jur ? jur.name : '' },
      h('div', { class: 'empty' }, h('span', { html: icon('gov', 22) }), h('p', { class: 'muted' }, note)),
    );
  }

  // Interactive version — render result area, rebuild on slider
  const result = h('div', {});
  let income = initialIncome;

  function redrawClawback() {
    const cb = oasClawback(jur, income);
    if (!cb) { result.replaceChildren(); return; }

    const clawPct = oas.maxAnnual > 0 ? cb.clawback / oas.maxAnnual : 0;
    const pairs = [
      [t('Revenu de retraite estimé', 'Estimated retirement income'), money(Math.round(income), { currency: cur })],
      [t('Seuil de récupération', 'Clawback threshold'), money(Math.round(cb.threshold), { currency: cur })],
      [t('Récupération (impôt)', 'Clawback (recovery tax)'), cb.clawback > 0 ? money(Math.round(cb.clawback), { currency: cur }) : t('Aucune', 'None'), cb.clawback > 0 ? 'neg' : 'pos'],
      [t('PSV nette reçue', 'Net OAS received'), money(Math.round(cb.net), { currency: cur }), cb.net < oas.maxAnnual ? 'warn' : 'pos'],
      [t('PSV max (avant récupération)', 'Max OAS (before clawback)'), money(Math.round(oas.maxAnnual), { currency: cur })],
      [t('Récupération totale à partir de', 'Full clawback at'), cb.fullAt ? money(Math.round(cb.fullAt), { currency: cur }) : '—'],
    ];

    // Simple bar: full OAS vs net OAS
    const barSvg = barChart({
      xLabels: [t('PSV max', 'Max OAS'), t('PSV nette', 'Net OAS')],
      series: [
        { color: PALETTE[0], values: [oas.maxAnnual, cb.net] },
        { color: PALETTE[4], values: [0, cb.clawback] },
      ],
      stacked: true,
      height: 200,
    });

    result.replaceChildren(
      statList(pairs),
      h('div', { class: 'sep' }),
      h('div', { html: barSvg }),
      legend([
        { color: PALETTE[0], label: t('Prestation nette', 'Net benefit') },
        { color: PALETTE[4], label: t('Récupération', 'Clawback') },
      ]),
    );
  }

  const sl = slider({
    label: t('Revenu de retraite estimé', 'Estimated retirement income'),
    value: income,
    min: 0,
    max: 250000,
    step: 1000,
    format: (v) => money(v, { currency: cur, compact: true }),
    onInput: (v) => { income = v; redrawClawback(); },
  });

  redrawClawback();

  return card(
    t('Récupération de la PSV / OAS Clawback', 'OAS Clawback'),
    { sub: `${oas.name} · ${jur.name}` },
    sl,
    h('div', { class: 'sep' }),
    result,
  );
}

// ---------------------------------------------------------------------------
// Strategy card
// ---------------------------------------------------------------------------

function strategyCard(jur) {
  const country = jur && jur.country;

  // Tips common to CA
  const caTips = [
    {
      kind: 'pos',
      title: t('Retarder si vous êtes en bonne santé', 'Delay if in good health'),
      text: t(
        'Si votre espérance de vie dépasse 83 ans et que vous disposez d\'autres revenus pour couvrir vos besoins immédiats, retarder la RPC/RRQ jusqu\'à 70 ans maximise généralement le cumul à vie (+42 % vs 65 ans).',
        'If your life expectancy exceeds 83 and you have other income to cover near-term needs, delaying CPP/QPP to 70 typically maximises lifetime total (+42 % vs age 65).',
      ),
    },
    {
      kind: 'pos',
      title: t('Demander tôt si nécessaire', 'Claim early if needed'),
      text: t(
        'Si votre santé est fragile, si vous avez peu d\'autres revenus ou si vous avez besoin de liquidités immédiatement, demander à 60 ans peut être rationnel même si le montant mensuel est réduit.',
        'If your health is poor, you have limited other income, or you need cash flow right away, claiming at 60 may be rational even though the monthly amount is reduced.',
      ),
    },
    {
      kind: 'warn',
      title: t('PSV — attention à la récupération', 'OAS — watch the clawback'),
      text: t(
        `La PSV est récupérée à 15 % sur les revenus dépassant ${money(93454, { currency: 'CAD' })}. En planifiant vos retraits REER/FERR et revenus non enregistrés, vous pouvez conserver plus de votre PSV.`,
        `OAS is clawed back at 15 % on income exceeding ${money(93454, { currency: 'CAD' })}. By timing RRSP/RRIF withdrawals and non-registered income, you can retain more of your OAS.`,
      ),
    },
    {
      kind: 'pos',
      title: t('Report de la PSV jusqu\'à 70 ans', 'Defer OAS to 70'),
      text: t(
        'La PSV peut être différée jusqu\'à 70 ans avec une bonification de 7,2 % par année de report (max +36 % à 70 ans vs 65 ans).',
        'OAS can be deferred to 70 with a 7.2 % per-year enhancement (max +36 % at 70 vs 65).',
      ),
    },
  ];

  // US-specific tips
  const usTips = [
    {
      kind: 'pos',
      title: t('Âge de pleine retraite (Social Security)', 'Full Retirement Age (Social Security)'),
      text: t(
        'L\'âge de pleine retraite pour la Sécurité sociale est 67 ans pour les personnes nées après 1960. Retarder jusqu\'à 70 ans ajoute 8 % par année de report (crédits de retraite différés).',
        'Full Retirement Age for Social Security is 67 for those born after 1960. Delaying to 70 adds 8 % per year in Delayed Retirement Credits, maximising your monthly benefit.',
      ),
    },
    {
      kind: 'warn',
      title: t('Revenus pendant la retraite anticipée', 'Earnings test before full retirement age'),
      text: t(
        'Si vous percevez la Sécurité sociale avant votre âge de pleine retraite tout en travaillant, votre prestation peut être temporairement réduite selon le test de revenus.',
        'If you collect Social Security before your Full Retirement Age while still working, your benefit may be temporarily reduced under the earnings test.',
      ),
    },
    {
      kind: 'pos',
      title: t('Stratégie de couple', 'Spousal strategy'),
      text: t(
        'Pour les couples, une stratégie commune est que le conjoint avec le revenu le plus élevé retarde jusqu\'à 70 ans (maximisant la prestation de survivant) tandis que l\'autre demande plus tôt.',
        'For couples, a common strategy is for the higher earner to delay to 70 (maximising survivor benefit) while the lower earner claims earlier.',
      ),
    },
  ];

  // UK-specific tips
  const ukTips = [
    {
      kind: 'pos',
      title: t('Report de la State Pension', 'Deferring the State Pension'),
      text: t(
        'La State Pension britannique peut être reportée après 67 ans. Chaque semaine de report augmente la prestation d\'environ 1 % (environ 5,8 % par an), ce qui peut être intéressant si votre espérance de vie est supérieure à la moyenne.',
        'The UK State Pension can be deferred past 67. Each week deferred increases the benefit by about 1 % (approx. 5.8 % per year), which can be worthwhile if your life expectancy is above average.',
      ),
    },
    {
      kind: 'warn',
      title: t('Historique de cotisations NI', 'NI contribution history'),
      text: t(
        'Le montant de votre State Pension dépend de votre nombre d\'années de cotisation National Insurance. Vérifiez votre relevé sur le portail HMRC pour évaluer si vous devez combler des lacunes.',
        'Your State Pension amount depends on your number of qualifying National Insurance years. Check your record on the HMRC portal to see if you should fill any gaps.',
      ),
    },
  ];

  const tips = country === 'US' ? usTips : country === 'UK' ? ukTips : caTips;

  const items = tips.map((tip) =>
    h('div', {
      class: 'flex',
      style: { gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' },
    },
      h('span', { class: 'chip ' + tip.kind, style: { flex: 'none', marginTop: '1px' }, html: icon(tip.kind === 'warn' ? 'warning' : 'check', 13) }),
      h('div', {},
        h('b', {}, tip.title),
        h('div', { class: 'tiny muted', style: { marginTop: '3px', lineHeight: '1.5' } }, tip.text),
      ),
    ),
  );

  return card(
    t('Stratégie / Strategy', 'Strategy'),
    { sub: jur ? jur.name : '' },
    ...items,
  );
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------

export function render({ client, jur }) {
  const cur = jur.currency;
  const cpp = (jur.pensions && jur.pensions.cpp) || null;
  const oas = (jur.pensions && jur.pensions.oas) || null;
  const members = (client.members && client.members.length > 0) ? client.members : [];

  // ---- KPI row ----
  const kpiRow = h('div', { class: 'grid cols-4 span-full' },
    kpi({
      iconName: 'gov',
      label: cpp ? cpp.name : t('Pension publique', 'Public pension'),
      value: cpp ? money(cpp.maxAnnual, { currency: cur }) : '—',
      sub: cpp
        ? `${t('Max annuel', 'Max annual')} · ${t('Âge normal', 'Normal age')} ${cpp.startAge || 65} ${t('ans', 'yrs')}`
        : t('Non disponible', 'Not available'),
    }),
    kpi({
      iconName: 'retire',
      label: t('Âge normal de demande', 'Normal claim age'),
      value: cpp ? `${cpp.startAge || 65} ${t('ans', 'yrs')}` : '—',
      sub: cpp && cpp.defer != null
        ? t(`Report : +${pct(cpp.defer, 1)}/an`, `Deferral: +${pct(cpp.defer, 1)}/yr`)
        : '',
    }),
    jur.country === 'CA'
      ? kpi({
          iconName: 'gov',
          label: oas ? oas.name : 'OAS / PSV',
          value: oas ? money(oas.maxAnnual, { currency: cur }) : '—',
          sub: oas && oas.clawbackStart
            ? `${t('Récupération dès', 'Clawback from')} ${money(oas.clawbackStart, { currency: cur, compact: true })}`
            : '',
        })
      : kpi({
          iconName: 'gov',
          label: oas ? oas.name : t('Prestation secondaire', 'Secondary benefit'),
          value: oas && oas.maxAnnual ? money(oas.maxAnnual, { currency: cur }) : t('N/A', 'N/A'),
          sub: oas ? `${t('Âge', 'Age')} ${oas.startAge || 65}` : '',
        }),
    kpi({
      iconName: 'check',
      label: t('Espérance de vie moyenne', 'Avg life expectancy'),
      value: members.length > 0
        ? `${Math.round(members.reduce((s, m) => s + (m.lifeExpectancy || 90), 0) / members.length)} ${t('ans', 'yrs')}`
        : '—',
      sub: t('Membres du ménage', 'Household members'),
    }),
  );

  // ---- Per-member claiming analysis ----
  const memberCppCards = members.map((m) =>
    memberClaimingCard(m, cpp, cpp ? cpp.name : t('Pension publique', 'Public pension'), cur),
  );

  // ---- OAS second pension analysis (CA: OAS, others note) ----
  // Only render OAS analysis for CA (where oas.maxAnnual > 0) unless member count is 0.
  const oasMemberCards = (jur.country === 'CA' && oas && oas.maxAnnual > 0)
    ? members.map((m) =>
        memberClaimingCard(
          m,
          oas,
          oas.name || 'PSV',
          cur,
        ),
      )
    : [];

  // ---- OAS clawback ----
  // Default retirement income: try to estimate from incomes or use 80 000.
  const estRetirementIncome = (() => {
    if (!client.incomes || !client.incomes.length) return 80000;
    const total = client.incomes
      .filter((i) => ['cpp', 'oas', 'rrif', 'pension', 'employment', 'self', 'rental'].includes(i.type))
      .reduce((s, i) => s + (i.amount || 0), 0);
    return total > 0 ? total : 80000;
  })();

  const clawbackCard = oasClawbackCard(jur, estRetirementIncome, cur);

  // ---- Strategy ----
  const stratCard = strategyCard(jur);

  // ---- Assemble ----
  return h('div', { class: 'grid' },
    kpiRow,
    ...memberCppCards,
    ...oasMemberCards,
    h('div', { class: 'span-full' }, clawbackCard),
    h('div', { class: 'span-full' }, stratCard),
  );
}
