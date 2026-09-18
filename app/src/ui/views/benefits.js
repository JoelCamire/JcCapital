// ============================================================
// Government Benefits Optimisation — View
// Every rate, age window and threshold comes from jur.pensions;
// every entitlement comes from the client file (F.pensions) and the
// retirement-income slider is prefilled from the projection.
// render({store, client, jur, navigate}) → HTMLElement
// ============================================================
import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { lineChart, barChart, PALETTE } from '../charts.js';
import { benefitAtAge, claimingAnalysis, oasClawback, buildCumulativeSeries, claimWindow } from '../../engine/benefits.js';
import { clientFacts, retirementFacts, whatIf, saveWhatIf } from '../../engine/facts.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Every integer claim age the pension allows. */
function candidateAges(pension) {
  if (!pension) return [];
  const [minAge, maxAge] = claimWindow(pension);
  const out = [];
  for (let a = Math.round(minAge); a <= Math.round(maxAge); a++) out.push(a);
  return out;
}

const chip = (cls, label) => h('span', { class: 'chip ' + cls, style: { marginLeft: '6px' }, html: icon('check', 11) + ' ' + label });

// ---------------------------------------------------------------------------
// Member claiming-analysis card
// ---------------------------------------------------------------------------

function memberClaimingCard(member, pension, entitlement, pensionName, cur, discountRate) {
  const le = member.lifeExpectancy || 90;
  const ages = candidateAges(pension);
  const base = entitlement ? entitlement.annual : null;

  if (!pension || !(base > 0) || ages.length === 0) {
    return card(`${t('Analyse', 'Analysis')} — ${member.name}`, { sub: pensionName },
      h('div', { class: 'empty' }, t('Aucune prestation estimée : ajoutez le revenu correspondant au dossier ou vérifiez la juridiction.', 'No estimated benefit: add the matching income to the file or check the jurisdiction.')));
  }

  const { rows, recommendedAge, recommendedAgePV, normalAge } = claimingAnalysis(pension, ages, le, { base, discountRate });

  const tableRows = rows.map((r) => {
    const isRec = r.age === recommendedAge, isPV = r.age === recommendedAgePV;
    return h('tr', { class: isRec ? 'pos-row' : '' },
      h('td', { class: 'num mono' }, h('b', {}, String(r.age)), r.age === normalAge ? h('span', { class: 'tiny muted', style: { marginLeft: '6px' } }, t('normal', 'normal')) : null),
      h('td', { class: 'num mono' }, money(Math.round(r.annual), { currency: cur })),
      h('td', { class: 'num mono' }, `${r.yearsReceiving}`),
      h('td', { class: 'num mono' }, money(Math.round(r.cumulative), { currency: cur, compact: true }), isRec ? chip('pos', t('Cumul', 'Total')) : null),
      h('td', { class: 'num mono' }, money(Math.round(r.presentValue), { currency: cur, compact: true }), isPV ? chip('info', t('VA', 'PV')) : null),
      h('td', { class: 'num mono muted' }, r.breakEvenVsNormal ? `${r.breakEvenVsNormal} ${t('ans', 'yrs')}` : '—'),
    );
  });

  const table = h('div', { class: 'tbl-wrap' },
    h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {},
        h('th', { class: 'num' }, t('Âge de demande', 'Claim age')),
        h('th', { class: 'num' }, t('Rente annuelle', 'Annual benefit')),
        h('th', { class: 'num' }, t('Années', 'Years')),
        h('th', { class: 'num' }, t(`Cumul à vie (≤ ${le} ans)`, `Lifetime total (to ${le})`)),
        h('th', { class: 'num' }, t(`Valeur actualisée (${pct(discountRate, 1)})`, `Present value (${pct(discountRate, 1)})`)),
        h('th', { class: 'num' }, t('Seuil vs âge normal', 'Break-even vs normal')))),
      h('tbody', {}, ...tableRows)));

  // ----- Break-even line chart: earliest / normal / latest -----
  const chartAges = [...new Set([ages[0], normalAge, ages[ages.length - 1]])];
  const chartColors = [PALETTE[4], PALETTE[0], PALETTE[1]];
  const chartStartAge = Math.min(member.currentAge || 50, ages[0]);
  const xLabels = Array.from({ length: Math.max(2, le - chartStartAge + 1) }, (_, i) => chartStartAge + i);
  const series = chartAges.map((ca, si) => ({ name: String(ca), color: chartColors[si % chartColors.length], values: buildCumulativeSeries(pension, ca, chartStartAge, chartStartAge + xLabels.length - 1, base) }));
  const chartLegend = legend(chartAges.map((ca, si) => ({ color: chartColors[si % chartColors.length], label: `${t('Demande à', 'Claim at')} ${ca} ${t('ans', 'yrs')}` })));

  const latest = rows[rows.length - 1];
  const be = latest && latest.breakEvenVsNormal ? latest.breakEvenVsNormal : null;
  const tradeOffNote = h('p', { class: 'tiny muted', style: { marginTop: '10px', lineHeight: '1.5' } },
    t(`Demander tôt signifie plus d'années de prestations mais des montants réduits${pension.early != null ? ` (${pct(Math.abs(pension.early), 1)} par année d'anticipation)` : ''}. Retarder donne de plus gros chèques${pension.defer != null ? ` (+${pct(pension.defer, 1)} par année de report)` : ''} mais moins d'années.${be ? ` Le seuil de rentabilité du report à ${latest.age} ans se situe vers ${be} ans` : ''}${be ? ` — avantageux si l'espérance de vie (${le} ans) le dépasse et que d'autres revenus couvrent l'intervalle.` : ''}`,
      `Claiming early means more years of benefits but smaller amounts${pension.early != null ? ` (${pct(Math.abs(pension.early), 1)} per year early)` : ''}. Delaying gives larger cheques${pension.defer != null ? ` (+${pct(pension.defer, 1)} per year deferred)` : ''} but fewer years.${be ? ` The break-even for deferring to ${latest.age} is around age ${be}` : ''}${be ? ` — worthwhile when life expectancy (${le}) exceeds it and other income bridges the gap.` : ''}`));

  return card(
    `${t('Analyse de l\'âge de demande', 'Claiming age analysis')} — ${member.name}`,
    {
      sub: `${pensionName} · ${entitlement.onFile ? t('montant du dossier', 'amount on file') : t('estimation (moyenne de la juridiction)', 'estimate (jurisdiction average)')} ${money(base, { currency: cur })} ${t('à', 'at')} ${normalAge} · ${t('espérance de vie', 'life expectancy')} ${le} ${t('ans', 'yrs')}`,
      right: chartLegend,
    },
    table,
    h('div', { class: 'sep' }),
    h('div', { html: lineChart({ series, xLabels: xLabels.map(String), area: false, height: 260 }) }),
    tradeOffNote,
  );
}

// ---------------------------------------------------------------------------
// OAS Clawback card — income prefilled from the projection, persisted
// ---------------------------------------------------------------------------

function oasClawbackCard(store, jur, W, oasAnnual, cur) {
  const oas = jur && jur.pensions && jur.pensions.oas;
  const hasClawback = oas && oas.clawbackStart && oas.clawbackRate;

  if (!hasClawback) {
    const note = jur && jur.country === 'US'
      ? t('La récupération de la Sécurité sociale (Windfall Elimination Provision / Government Pension Offset) est calculée séparément selon vos revenus passés. Il n\'y a pas de récupération progressive basée sur le revenu comme la PSV canadienne.',
          'Social Security benefit reduction (Windfall Elimination Provision / Government Pension Offset) is calculated separately based on your earnings history. There is no income-based progressive clawback like Canada\'s OAS.')
      : t('Il n\'y a pas de récupération de pension publique basée sur le revenu applicable dans cette juridiction.', 'There is no income-based public pension clawback applicable in this jurisdiction.');
    return card(t('Récupération de la PSV / OAS Clawback', 'OAS Clawback'), { sub: jur ? jur.name : '' },
      h('div', { class: 'empty' }, h('span', { html: icon('gov', 22) }), h('p', { class: 'muted' }, note)));
  }

  const result = h('div', {});
  function redrawClawback() {
    const cb = oasClawback(jur, W.income, oasAnnual);
    if (!cb) { result.replaceChildren(); return; }
    const pairs = [
      [t('Revenu net de retraite (projeté)', 'Projected retirement net income'), money(Math.round(W.income), { currency: cur })],
      [t('Seuil de récupération', 'Clawback threshold'), money(Math.round(cb.threshold), { currency: cur })],
      [t(`Récupération (${pct(cb.rate, 0)} au-delà du seuil)`, `Clawback (${pct(cb.rate, 0)} above threshold)`), cb.clawback > 0 ? money(Math.round(cb.clawback), { currency: cur }) : t('Aucune', 'None'), cb.clawback > 0 ? 'neg' : 'pos'],
      [t('PSV nette reçue', 'Net OAS received'), money(Math.round(cb.net), { currency: cur }), cb.clawback > 0 ? 'warn' : 'pos'],
      [t('PSV du dossier (avant récupération)', 'OAS on file (before clawback)'), money(Math.round(oasAnnual), { currency: cur })],
      [t('Récupération totale à partir de', 'Full clawback at'), cb.fullAt ? money(Math.round(cb.fullAt), { currency: cur }) : '—'],
    ];
    const barSvg = barChart({
      xLabels: [t('PSV du dossier', 'OAS on file'), t('PSV nette', 'Net OAS')],
      series: [{ color: PALETTE[0], values: [oasAnnual, cb.net] }, { color: PALETTE[4], values: [0, cb.clawback] }],
      stacked: true, height: 200,
    });
    result.replaceChildren(statList(pairs), h('div', { class: 'sep' }), h('div', { html: barSvg }),
      legend([{ color: PALETTE[0], label: t('Prestation nette', 'Net benefit') }, { color: PALETTE[4], label: t('Récupération', 'Clawback') }]));
  }

  const sl = slider({
    label: t('Revenu net de retraite (1re année projetée — ajustable, conservé)', 'Retirement net income (first projected year — adjustable, kept)'),
    value: W.income, min: 0, max: 250000, step: 1000,
    format: (v) => money(v, { currency: cur, compact: true }),
    onInput: (v) => { W.income = v; saveWhatIf(store, 'benefits', { income: v }); redrawClawback(); },
  });
  redrawClawback();

  return card(t('Récupération de la PSV / OAS Clawback', 'OAS Clawback'), { sub: `${oas.name} · ${jur.name} · ${jur.taxYear}` }, sl, h('div', { class: 'sep' }), result);
}

// ---------------------------------------------------------------------------
// Strategy card — every number from jur.pensions / the analysis
// ---------------------------------------------------------------------------

function strategyCard(jur, cur, breakEven) {
  const country = jur && jur.country;
  const cpp = jur.pensions?.cpp || {}, oas = jur.pensions?.oas || {};
  const [cMin, cMax] = claimWindow(cpp);
  const cNormal = cpp.startAge || 65;
  const cppBonus = cpp.defer != null ? pct(cpp.defer * (cMax - cNormal), 0) : null;
  const [oMin, oMax] = claimWindow(oas);
  const oasBonus = oas.defer != null ? pct(oas.defer * (oMax - (oas.startAge || 65)), 0) : null;

  const caTips = [
    { kind: 'pos', title: t('Retarder si vous êtes en bonne santé', 'Delay if in good health'),
      text: t(`Si votre espérance de vie dépasse ${breakEven || '—'} ans et que vous disposez d'autres revenus pour couvrir vos besoins immédiats, retarder ${cpp.name} jusqu'à ${cMax} ans maximise généralement le cumul à vie (${cppBonus ? '+' + cppBonus : ''} vs ${cNormal} ans, soit +${pct(cpp.defer || 0, 1)} par année de report).`,
        `If your life expectancy exceeds ${breakEven || '—'} and you have other income to cover near-term needs, delaying ${cpp.name} to ${cMax} typically maximises lifetime total (${cppBonus ? '+' + cppBonus : ''} vs age ${cNormal}, i.e. +${pct(cpp.defer || 0, 1)} per year deferred).`) },
    { kind: 'pos', title: t('Demander tôt si nécessaire', 'Claim early if needed'),
      text: t(`Si votre santé est fragile, si vous avez peu d'autres revenus ou si vous avez besoin de liquidités immédiatement, demander à ${cMin} ans peut être rationnel même si le montant est réduit de ${pct(Math.abs(cpp.early || 0), 1)} par année d'anticipation.`,
        `If your health is poor, you have limited other income, or you need cash flow right away, claiming at ${cMin} may be rational even though the amount is reduced by ${pct(Math.abs(cpp.early || 0), 1)} per year early.`) },
    { kind: 'warn', title: t('PSV — attention à la récupération', 'OAS — watch the clawback'),
      text: t(`La PSV est récupérée à ${pct(oas.clawbackRate || 0, 0)} sur le revenu net dépassant ${money(oas.clawbackStart || 0, { currency: cur })} (${jur.taxYear}). En planifiant vos retraits REER/FERR et revenus non enregistrés, vous pouvez conserver plus de votre PSV.`,
        `OAS is clawed back at ${pct(oas.clawbackRate || 0, 0)} on net income exceeding ${money(oas.clawbackStart || 0, { currency: cur })} (${jur.taxYear}). By timing RRSP/RRIF withdrawals and non-registered income, you can retain more of your OAS.`) },
    { kind: 'pos', title: t(`Report de la PSV jusqu'à ${oMax} ans`, `Defer OAS to ${oMax}`),
      text: t(`La PSV peut être différée jusqu'à ${oMax} ans avec une bonification de ${pct(oas.defer || 0, 1)} par année de report (max ${oasBonus ? '+' + oasBonus : ''} à ${oMax} ans vs ${oas.startAge || 65} ans).`,
        `OAS can be deferred to ${oMax} with a ${pct(oas.defer || 0, 1)} per-year enhancement (max ${oasBonus ? '+' + oasBonus : ''} at ${oMax} vs ${oas.startAge || 65}).`) },
  ];

  const usTips = [
    { kind: 'pos', title: t('Âge de pleine retraite (Social Security)', 'Full Retirement Age (Social Security)'),
      text: t(`L'âge de pleine retraite pour la Sécurité sociale est ${cNormal} ans. Retarder jusqu'à ${cMax} ans ajoute ${pct(cpp.defer || 0, 0)} par année de report (crédits de retraite différés); demander dès ${cMin} ans réduit la prestation de ${pct(Math.abs(cpp.early || 0), 1)} par année.`,
        `Full Retirement Age for Social Security is ${cNormal}. Delaying to ${cMax} adds ${pct(cpp.defer || 0, 0)} per year in Delayed Retirement Credits; claiming from ${cMin} reduces the benefit by ${pct(Math.abs(cpp.early || 0), 1)} per year.`) },
    { kind: 'warn', title: t('Revenus pendant la retraite anticipée', 'Earnings test before full retirement age'),
      text: t('Si vous percevez la Sécurité sociale avant votre âge de pleine retraite tout en travaillant, votre prestation peut être temporairement réduite selon le test de revenus.',
        'If you collect Social Security before your Full Retirement Age while still working, your benefit may be temporarily reduced under the earnings test.') },
    { kind: 'pos', title: t('Stratégie de couple', 'Spousal strategy'),
      text: t(`Pour les couples, une stratégie commune est que le conjoint avec le revenu le plus élevé retarde jusqu'à ${cMax} ans (maximisant la prestation de survivant) tandis que l'autre demande plus tôt.`,
        `For couples, a common strategy is for the higher earner to delay to ${cMax} (maximising survivor benefit) while the lower earner claims earlier.`) },
  ];

  const ukTips = [
    { kind: 'pos', title: t('Report de la State Pension', 'Deferring the State Pension'),
      text: t(`La State Pension britannique peut être reportée après ${cNormal} ans. Chaque année de report augmente la prestation d'environ ${pct(cpp.defer || 0, 1)}, ce qui peut être intéressant si votre espérance de vie est supérieure à la moyenne.`,
        `The UK State Pension can be deferred past ${cNormal}. Each year deferred increases the benefit by about ${pct(cpp.defer || 0, 1)}, which can be worthwhile if your life expectancy is above average.`) },
    { kind: 'warn', title: t('Historique de cotisations NI', 'NI contribution history'),
      text: t('Le montant de votre State Pension dépend de votre nombre d\'années de cotisation National Insurance. Vérifiez votre relevé sur le portail HMRC pour évaluer si vous devez combler des lacunes.',
        'Your State Pension amount depends on your number of qualifying National Insurance years. Check your record on the HMRC portal to see if you should fill any gaps.') },
  ];

  const tips = country === 'US' ? usTips : country === 'UK' ? ukTips : caTips;
  const items = tips.map((tip) =>
    h('div', { class: 'flex', style: { gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' } },
      h('span', { class: 'chip ' + tip.kind, style: { flex: 'none', marginTop: '1px' }, html: icon(tip.kind === 'warn' ? 'warning' : 'check', 13) }),
      h('div', {}, h('b', {}, tip.title), h('div', { class: 'tiny muted', style: { marginTop: '3px', lineHeight: '1.5' } }, tip.text))));

  return card(t('Stratégie', 'Strategy'), { sub: `${jur ? jur.name : ''} · ${jur.taxYear}` }, ...items);
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------

export function render({ store, client, jur }) {
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const R = retirementFacts(client, jur);
  const cpp = (jur.pensions && jur.pensions.cpp) || null;
  const oas = (jur.pensions && jur.pensions.oas) || null;
  const members = F.members;
  const primary = F.primary;
  const discountRate = F.assumptions.lifeDiscount;   // real discount rate of the file

  // Retirement net income prefilled from the projection's first retirement year (persisted what-if)
  const W = whatIf(client, 'benefits', { income: Math.round(R.taxableIncome || 0) });
  const oasAnnual = primary ? F.pensions[primary.id].oas.annual : (oas ? oas.maxAnnual : 0);

  const pEnt = primary ? F.pensions[primary.id] : null;
  const [cMin, cMax] = claimWindow(cpp);
  const kpiRow = h('div', { class: 'grid cols-4 span-full' },
    kpi({ iconName: 'gov', label: cpp ? cpp.name : t('Pension publique', 'Public pension'),
      value: pEnt ? money(pEnt.cpp.annual, { currency: cur }) : '—',
      sub: pEnt ? (pEnt.cpp.onFile ? t(`Dossier · dès ${pEnt.cpp.startAge} ans · max ${money(pEnt.cpp.max, { currency: cur, compact: true })}`, `On file · from ${pEnt.cpp.startAge} · max ${money(pEnt.cpp.max, { currency: cur, compact: true })}`) : t(`Estimation · max ${money(pEnt.cpp.max, { currency: cur, compact: true })}`, `Estimate · max ${money(pEnt.cpp.max, { currency: cur, compact: true })}`)) : t('Non disponible', 'Not available') }),
    kpi({ iconName: 'retire', label: t('Fenêtre de demande', 'Claim window'),
      value: cpp ? `${cMin}–${cMax} ${t('ans', 'yrs')}` : '—',
      sub: cpp ? t(`Normal ${cpp.startAge || 65} · report +${pct(cpp.defer || 0, 1)}/an${cpp.early != null ? ` · anticipation ${pct(Math.abs(cpp.early), 1)}/an` : ''}`, `Normal ${cpp.startAge || 65} · deferral +${pct(cpp.defer || 0, 1)}/yr${cpp.early != null ? ` · early ${pct(Math.abs(cpp.early), 1)}/yr` : ''}`) : '' }),
    jur.country === 'CA'
      ? kpi({ iconName: 'gov', label: oas ? oas.name : 'OAS / PSV', value: money(oasAnnual, { currency: cur }),
          sub: oas && oas.clawbackStart ? `${pEnt && pEnt.oas.onFile ? t('Dossier', 'On file') : t('Max', 'Max')} · ${t('Récupération dès', 'Clawback from')} ${money(oas.clawbackStart, { currency: cur, compact: true })}` : '' })
      : kpi({ iconName: 'gov', label: oas ? oas.name : t('Prestation secondaire', 'Secondary benefit'),
          value: oas && oas.maxAnnual ? money(oas.maxAnnual, { currency: cur }) : t('N/A', 'N/A'), sub: oas ? `${t('Âge', 'Age')} ${oas.startAge || 65}` : '' }),
    kpi({ iconName: 'check', label: t('Espérance de vie moyenne', 'Avg life expectancy'),
      value: members.length > 0 ? `${Math.round(members.reduce((s, m) => s + (m.lifeExpectancy || 90), 0) / members.length)} ${t('ans', 'yrs')}` : '—',
      sub: t('Membres du ménage', 'Household members') }),
  );

  const memberOf = (m) => ({ name: m.name, currentAge: m.age, lifeExpectancy: m.lifeExpectancy });
  const memberCppCards = members.map((m) => memberClaimingCard(memberOf(m), cpp, F.pensions[m.id].cpp, cpp ? cpp.name : t('Pension publique', 'Public pension'), cur, discountRate));
  const oasMemberCards = (jur.country === 'CA' && oas && oas.maxAnnual > 0)
    ? members.map((m) => memberClaimingCard(memberOf(m), oas, F.pensions[m.id].oas, oas.name || 'PSV', cur, discountRate))
    : [];

  // break-even of deferring to the max age, for the primary (prose in the strategy card)
  let breakEven = null;
  if (primary && cpp && pEnt && pEnt.cpp.annual > 0) {
    const an = claimingAnalysis(cpp, candidateAges(cpp), primary.lifeExpectancy, { base: pEnt.cpp.annual, discountRate });
    const last = an.rows[an.rows.length - 1];
    breakEven = last ? last.breakEvenVsNormal : null;
  }

  return h('div', { class: 'grid' },
    kpiRow,
    ...memberCppCards,
    ...oasMemberCards,
    h('div', { class: 'span-full' }, oasClawbackCard(store, jur, W, oasAnnual, cur)),
    h('div', { class: 'span-full' }, strategyCard(jur, cur, breakEven)),
  );
}
