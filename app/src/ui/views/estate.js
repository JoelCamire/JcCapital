import { h, money, pct, icon, t } from '../dom.js';
import { kpi, card, statList, legend } from '../widgets.js';
import { donutChart, lineChart, PALETTE } from '../charts.js';
import { computeTax } from '../../engine/tax.js';
import { clientFacts, retirementFacts } from '../../engine/facts.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const R = retirementFacts(client, jur);
  const proj = R.projection;
  const last = proj.rows[proj.rows.length - 1];
  const bal = last.balances;
  const est = estimateEstateTax(jur, last, client, F);

  const segs = [
    { label: t('Régimes imposables', 'Taxable plans'), value: bal.deferred, color: PALETTE[0] },
    { label: t('Libre d\'impôt', 'Tax-free'), value: bal.taxfree, color: PALETTE[1] },
    { label: t('Non enregistré', 'Non-registered'), value: bal.taxable, color: PALETTE[2] },
    { label: t('Immobilier', 'Real estate'), value: bal.realestate, color: PALETTE[3] },
    { label: t('Société', 'Corporation'), value: bal.corporate || 0, color: PALETTE[5] },
    { label: t('Épargne-études', 'Education'), value: bal.education || 0, color: PALETTE[6] },
  ].filter(s => s.value > 0);

  const lifeCoverage = F.members.reduce((s, m) => s + (F.coverage[m.id]?.life || 0), 0);
  const liquid = bal.taxfree + bal.taxable + lifeCoverage;
  const liquidityOk = liquid >= est.total;

  const kpis = h('div', { class: 'grid cols-4 span-full' },
    kpi({ label: t('Succession brute (proj.)', 'Gross estate (proj.)'), value: money(est.gross, { currency: cur, compact: true }), iconName: 'estate',
      sub: t(`À ${last.primaryAge} ans · actifs ${money(last.assetsTotal, { currency: cur, compact: true })} − dettes ${money(last.liabilitiesTotal, { currency: cur, compact: true })}`, `At age ${last.primaryAge} · assets ${money(last.assetsTotal, { currency: cur, compact: true })} − debts ${money(last.liabilitiesTotal, { currency: cur, compact: true })}`) }),
    kpi({ label: t('Impôts / droits au décès', 'Taxes / duties at death'), value: money(est.total, { currency: cur, compact: true }), accent: 'var(--neg)', sub: est.label }),
    kpi({ label: t('Legs net aux héritiers', 'Net legacy to heirs'), value: money(est.gross - est.total, { currency: cur, compact: true }), accent: 'var(--pos)' }),
    kpi({ label: t('Liquidité au décès', 'Liquidity at death'), value: liquidityOk ? t('Suffisante', 'Sufficient') : t('Insuffisante', 'Insufficient'), accent: liquidityOk ? 'var(--pos)' : 'var(--neg)',
      sub: t(`${money(liquid, { currency: cur, compact: true })} liquides${lifeCoverage > 0 ? ` (dont ${money(lifeCoverage, { currency: cur, compact: true })} d’assurance vie)` : ''}`, `${money(liquid, { currency: cur, compact: true })} liquid${lifeCoverage > 0 ? ` (incl. ${money(lifeCoverage, { currency: cur, compact: true })} life insurance)` : ''}`) }),
  );

  const breakdown = card(t('Estimation des impôts au décès', 'Estimated taxes at death'), { sub: t(`${jur.flag} ${jur.name} — ${jur.regionName} · règles ${jur.taxYear}`, `${jur.flag} ${jur.name} — ${jur.regionName} · ${jur.taxYear} rules`) },
    statList(est.lines.map(l => [l.label, money(l.value, { currency: cur }), l.value > 0 ? 'neg' : ''])),
    h('div', { class: 'sep' }),
    statList([[t('Total estimé', 'Estimated total'), money(est.total, { currency: cur }), 'neg']]),
    h('p', { class: 'tiny muted', style: { marginTop: '12px' } }, est.note),
  );

  const compo = card(t('Composition de la succession projetée', 'Projected estate composition'), { sub: t(`Actifs bruts à ${last.primaryAge} ans`, `Gross assets at age ${last.primaryAge}`) },
    h('div', { class: 'flex center', style: { justifyContent: 'center' } },
      h('div', { html: donutChart({ segments: segs, centerLabel: money(est.gross, { currency: cur, compact: true }), centerSub: t('succession nette de dettes', 'estate net of debt') }) })),
    h('div', { class: 'sep' }),
    legend(segs.map(s => ({ color: s.color, label: `${s.label} · ${money(s.value, { currency: cur, compact: true })}` }))),
  );

  const trajectory = card(t('Trajectoire de la valeur nette jusqu\'au décès', 'Net worth trajectory to death'), { class: 'span-full',
    right: legend([{ color: PALETTE[0], label: t('Valeur nette', 'Net worth') }]) },
    h('div', { html: lineChart({ series: [{ color: PALETTE[0], values: proj.rows.map(r => r.netWorth) }], xLabels: proj.rows.map(r => r.primaryAge), area: true }) }));

  const strategies = card(t('Stratégies successorales', 'Estate strategies'), { class: 'span-full' },
    h('div', { class: 'grid cols-2' }, ...est.strategies.map(s =>
      h('div', { class: 'flex', style: { gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' } },
        h('span', { class: 'chip info', style: { flex: 'none' }, html: icon('check', 13) }),
        h('div', {}, h('b', {}, s.title), h('div', { class: 'tiny muted' }, s.text))))));

  return h('div', { class: 'grid' }, kpis,
    h('div', { class: 'grid cols-2 span-full' }, breakdown, compo),
    trajectory, strategies);
}

/** Probate / estate administration fee from the jurisdiction table. */
function probateFee(jur, value) {
  const P = jur.probate && jur.probate[jur.region];
  if (!P) return { fee: 0, known: false };
  if (P.flatMax != null) return { fee: Math.min(P.flatMax, value * (P.rate || 0) || P.flatMax), known: true };
  let fee = 0;
  const exempt = P.exempt || 0;
  if (P.lowRate != null && P.lowFrom != null) {
    fee += Math.max(0, Math.min(value, exempt) - P.lowFrom) * P.lowRate;
    fee += Math.max(0, value - exempt) * (P.rate || 0);
  } else fee = Math.max(0, value - exempt) * (P.rate || 0);
  return { fee, known: true };
}

function estimateEstateTax(jur, row, client, F) {
  const lines = []; let total = 0;
  const bal = row.balances;
  const age = row.primaryAge;
  const gross = Math.max(0, row.assetsTotal - row.liabilitiesTotal);      // final assets − liabilities
  // other income in the year of death (projected): the primary's ordinary income that year
  const primaryId = client.members?.[0]?.id;
  const otherIncome = (row.byMember && primaryId && row.byMember[primaryId]) ? row.byMember[primaryId].ordinary : (row.taxableIncome || 0);
  const oasIncome = (row.byMember && primaryId && row.byMember[primaryId]) ? row.byMember[primaryId].oasIncome : 0;
  const base = { withPayroll: false, employment: false, age, oasIncome, filingStatus: client.filingStatus };
  const t0 = computeTax(jur, { ordinary: otherIncome, ...base }).total;

  if (jur.country === 'CA') {
    const rrspTax = bal.deferred > 0 ? Math.max(0, computeTax(jur, { ordinary: otherIncome + bal.deferred, ...base }).total - t0) : 0;
    lines.push({ label: t('Impôt sur REER/FERR (revenu réputé, stacké sur le revenu de l’année)', 'Tax on RRSP/RRIF (deemed income, stacked on that year’s income)'), value: rrspTax });
    total += rrspTax;
    const gain = Math.max(0, bal.taxable - (row.basisTaxable || 0));    // latent gain from the projected cost basis
    const capTax = gain > 0 ? Math.max(0, computeTax(jur, { ordinary: otherIncome + bal.deferred, capGains: gain, ...base }).total - computeTax(jur, { ordinary: otherIncome + bal.deferred, ...base }).total) : 0;
    lines.push({ label: t(`Gain en capital réputé (non enreg., gain latent ${money(gain, { currency: jur.currency, compact: true })})`, `Deemed capital gain (non-reg., latent gain ${money(gain, { currency: jur.currency, compact: true })})`), value: capTax });
    total += capTax;
    const pr = probateFee(jur, row.assetsTotal);
    const P = jur.probate && jur.probate[jur.region];
    if (pr.fee > 0) { lines.push({ label: t(`Frais d'homologation (${jur.regionName})`, `Probate fees (${jur.regionName})`), value: pr.fee }); total += pr.fee; }
    else lines.push({ label: t(`Frais d'homologation (${jur.regionName})`, `Probate fees (${jur.regionName})`), value: 0 });
    return {
      gross, total, lines, label: t('Impôt sur le revenu + homologation', 'Income tax + probate'),
      note: t(`Au Canada, il n'existe pas d'impôt successoral distinct : le décès déclenche une disposition réputée. Le REER/FERR est pleinement imposable, les gains en capital à ${pct(jur.capGainsInclusion || 0.5, 0)}. La résidence principale est exonérée. Un roulement au conjoint reporte l'impôt.${P && P.note ? ' ' + P.note : ''}`,
        `In Canada there is no separate estate tax: death triggers a deemed disposition. RRSP/RRIF is fully taxable, capital gains at ${pct(jur.capGainsInclusion || 0.5, 0)}. The principal residence is exempt. A spousal rollover defers the tax.${P && P.note ? ' ' + P.note : ''}`),
      strategies: [
        { title: t('Roulement au conjoint', 'Spousal rollover'), text: t('Reporte l\'impôt sur le REER/FERR et les gains jusqu\'au décès du second conjoint.', 'Defers tax on RRSP/RRIF and gains until the second spouse dies.') },
        { title: t('Assurance vie permanente', 'Permanent life insurance'), text: t('Fournit la liquidité pour payer l\'impôt au décès et maximise le legs net.', 'Provides liquidity to pay tax at death and maximizes the net legacy.') },
        { title: t('Don de bienfaisance', 'Charitable gift'), text: t('Un don testamentaire génère un crédit pouvant compenser l\'impôt final.', 'A testamentary gift generates a credit that can offset the final tax.') },
        { title: t('Gel successoral (société)', 'Estate freeze (corp.)'), text: t('Cristallise la valeur actuelle et transfère la croissance future à la génération suivante.', 'Crystallizes current value and transfers future growth to the next generation.') },
      ],
    };
  }
  if (jur.country === 'US') {
    const E = jur.estate || { exemption: 0, rate: 0.4 };
    const width = client.filingStatus === 'married' ? 2 : 1;                 // portability: two exemptions for a couple
    const exempt = E.exemption * width;
    const estateTax = Math.max(0, gross - exempt) * E.rate;
    lines.push({ label: t(`Impôt successoral fédéral (${pct(E.rate, 0)} au-delà de ${money(exempt, { currency: 'USD', compact: true })})`, `Federal estate tax (${pct(E.rate, 0)} above ${money(exempt, { currency: 'USD', compact: true })})`), value: estateTax });
    total += estateTax;
    const ird = bal.deferred > 0 ? Math.max(0, computeTax(jur, { ordinary: otherIncome + bal.deferred, ...base }).total - t0) : 0;
    lines.push({ label: t('Impôt sur le revenu différé (héritiers, IRD)', 'Income in respect of decedent (heirs)'), value: ird });
    total += ird;
    return {
      gross, total, lines, label: gross > exempt ? t('Impôt successoral fédéral', 'Federal estate tax') : t('Sous l\'exemption fédérale', 'Under federal exemption'),
      note: t(`L'exemption fédérale ${jur.taxYear} est de ${money(E.exemption, { currency: 'USD', compact: true })} par personne${width > 1 ? ' (portabilité entre conjoints)' : ''}. Les actifs reçoivent une majoration de la base (step-up) éliminant les gains latents, mais les comptes avant impôt (401(k)/IRA) restent imposables pour les héritiers.`,
        `The ${jur.taxYear} federal exemption is ${money(E.exemption, { currency: 'USD', compact: true })} per person${width > 1 ? ' (portability between spouses)' : ''}. Assets receive a step-up in basis eliminating unrealized gains, but pre-tax accounts (401(k)/IRA) remain taxable to heirs.`),
      strategies: [
        { title: t('Majoration de la base (step-up)', 'Step-up in basis'), text: t('Les actifs appréciés voient leur base réévaluée au décès — aucun impôt sur les gains latents.', 'Appreciated assets are revalued at death — no tax on unrealized gains.') },
        { title: t('Fiducie irrévocable (ILIT)', 'Irrevocable trust (ILIT)'), text: t('Sort l\'assurance vie de la succession imposable.', 'Removes life insurance from the taxable estate.') },
        { title: t('Dons annuels', 'Annual gifting'), text: t('Réduisent la succession imposable via l\'exclusion annuelle.', 'Reduce the taxable estate via the annual exclusion.') },
        { title: t('Conversions Roth', 'Roth conversions'), text: t('Réduisent l\'IRD futur en payant l\'impôt du vivant.', 'Reduce future IRD by paying tax while living.') },
      ],
    };
  }
  const E = jur.estate || { nilRateBand: 0, residenceNilRateBand: 0, rate: 0.4 };
  const hasHome = (bal.realestate || 0) > 0;
  const NRB = E.nilRateBand + (hasHome ? E.residenceNilRateBand : 0);
  const iht = Math.max(0, gross - NRB) * E.rate;
  lines.push({ label: t(`Inheritance Tax (${pct(E.rate, 0)} au-delà de ${money(NRB, { currency: 'GBP', compact: true })})`, `Inheritance Tax (${pct(E.rate, 0)} above ${money(NRB, { currency: 'GBP', compact: true })})`), value: iht });
  total += iht;
  return {
    gross, total, lines, label: 'Inheritance Tax',
    note: t(`Au Royaume-Uni, l'IHT s'applique à ${pct(E.rate, 0)} au-delà de la bande à taux nul (${money(E.nilRateBand, { currency: 'GBP', compact: true })}${hasHome ? ` + ${money(E.residenceNilRateBand, { currency: 'GBP', compact: true })} résidence` : ''}). Les transferts au conjoint sont exonérés et les bandes inutilisées sont transférables.`,
      `In the UK, IHT applies at ${pct(E.rate, 0)} above the nil-rate band (${money(E.nilRateBand, { currency: 'GBP', compact: true })}${hasHome ? ` + ${money(E.residenceNilRateBand, { currency: 'GBP', compact: true })} residence` : ''}). Spousal transfers are exempt and unused bands are transferable.`),
    strategies: [
      { title: t('Exemption entre conjoints', 'Spousal exemption'), text: t('Transferts illimités exonérés entre époux/partenaires civils.', 'Unlimited exempt transfers between spouses/civil partners.') },
      { title: t('Dons sur 7 ans (PETs)', '7-year gifts (PETs)'), text: t('Les dons deviennent exonérés s\'ils survivent 7 ans.', 'Gifts become exempt if you survive 7 years.') },
      { title: 'Trusts', text: t('Sortent des actifs de la succession imposable sous conditions.', 'Remove assets from the taxable estate under conditions.') },
    ],
  };
}
