import { h, money, pct, icon, t } from '../dom.js';
import { kpi, card, statList, legend } from '../widgets.js';
import { donutChart, lineChart, PALETTE } from '../charts.js';
import { runProjection } from '../../engine/projection.js';
import { computeTax } from '../../engine/tax.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const proj = runProjection(client);
  const last = proj.rows[proj.rows.length - 1];
  const bal = last.balances;
  const est = estimateEstateTax(jur, bal, client);

  const segs = [
    { label: t('Régimes imposables', 'Taxable plans'), value: bal.deferred, color: PALETTE[0] },
    { label: t('Libre d\'impôt', 'Tax-free'), value: bal.taxfree, color: PALETTE[1] },
    { label: t('Non enregistré', 'Non-registered'), value: bal.taxable, color: PALETTE[2] },
    { label: t('Immobilier', 'Real estate'), value: bal.realestate, color: PALETTE[3] },
  ].filter(s => s.value > 0);

  const liquid = bal.taxfree + bal.taxable;
  const liquidityOk = liquid >= est.total;

  const kpis = h('div', { class: 'grid cols-4 span-full' },
    kpi({ label: t('Succession brute (proj.)', 'Gross estate (proj.)'), value: money(est.gross, { currency: cur, compact: true }), iconName: 'estate',
      sub: t(`À ${proj.summary.lifeExpectancy} ans`, `At age ${proj.summary.lifeExpectancy}`) }),
    kpi({ label: t('Impôts / droits au décès', 'Taxes / duties at death'), value: money(est.total, { currency: cur, compact: true }), accent: 'var(--neg)', sub: est.label }),
    kpi({ label: t('Legs net aux héritiers', 'Net legacy to heirs'), value: money(est.gross - est.total, { currency: cur, compact: true }), accent: 'var(--pos)' }),
    kpi({ label: t('Liquidité au décès', 'Liquidity at death'), value: liquidityOk ? t('Suffisante', 'Sufficient') : t('Insuffisante', 'Insufficient'), accent: liquidityOk ? 'var(--pos)' : 'var(--neg)',
      sub: t(`${money(liquid, { currency: cur, compact: true })} liquides`, `${money(liquid, { currency: cur, compact: true })} liquid`) }),
  );

  const breakdown = card(t('Estimation des impôts au décès', 'Estimated taxes at death'), { sub: t(`${jur.flag} ${jur.name} — règles applicables`, `${jur.flag} ${jur.name} — applicable rules`) },
    statList(est.lines.map(l => [l.label, money(l.value, { currency: cur }), l.value > 0 ? 'neg' : ''])),
    h('div', { class: 'sep' }),
    statList([[t('Total estimé', 'Estimated total'), money(est.total, { currency: cur }), 'neg']]),
    h('p', { class: 'tiny muted', style: { marginTop: '12px' } }, est.note),
  );

  const compo = card(t('Composition de la succession projetée', 'Projected estate composition'), {},
    h('div', { class: 'flex center', style: { justifyContent: 'center' } },
      h('div', { html: donutChart({ segments: segs, centerLabel: money(est.gross, { currency: cur, compact: true }), centerSub: t('succession', 'estate') }) })),
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

function estimateEstateTax(jur, bal, client) {
  const lines = []; let total = 0;
  const gross = bal.deferred + bal.taxfree + bal.taxable + bal.realestate + (bal.corporate || 0);

  if (jur.country === 'CA') {
    const rrspTax = computeTax(jur, { ordinary: bal.deferred, withPayroll: false }).total;
    lines.push({ label: t('Impôt sur REER/FERR (revenu réputé)', 'Tax on RRSP/RRIF (deemed income)'), value: rrspTax });
    total += rrspTax;
    const gain = bal.taxable * 0.35;
    const capTax = computeTax(jur, { ordinary: 90000, capGains: gain, withPayroll: false }).total - computeTax(jur, { ordinary: 90000, withPayroll: false }).total;
    lines.push({ label: t('Gain en capital réputé (non enreg.)', 'Deemed capital gain (non-reg.)'), value: Math.max(0, capTax) });
    total += Math.max(0, capTax);
    const probateRate = client.jurisdiction.region === 'ON' ? 0.015 : client.jurisdiction.region === 'QC' ? 0 : 0.004;
    const probate = gross * probateRate;
    if (probate > 0) { lines.push({ label: t('Frais d\'homologation', 'Probate fees'), value: probate }); total += probate; }
    return {
      gross, total, lines, label: t('Impôt sur le revenu + homologation', 'Income tax + probate'),
      note: t('Au Canada, il n\'existe pas d\'impôt successoral distinct : le décès déclenche une disposition réputée. Le REER/FERR est pleinement imposable, les gains en capital à 50 %. La résidence principale est exonérée. Un roulement au conjoint reporte l\'impôt.',
        'In Canada there is no separate estate tax: death triggers a deemed disposition. RRSP/RRIF is fully taxable, capital gains at 50 %. The principal residence is exempt. A spousal rollover defers the tax.'),
      strategies: [
        { title: t('Roulement au conjoint', 'Spousal rollover'), text: t('Reporte l\'impôt sur le REER/FERR et les gains jusqu\'au décès du second conjoint.', 'Defers tax on RRSP/RRIF and gains until the second spouse dies.') },
        { title: t('Assurance vie permanente', 'Permanent life insurance'), text: t('Fournit la liquidité pour payer l\'impôt au décès et maximise le legs net.', 'Provides liquidity to pay tax at death and maximizes the net legacy.') },
        { title: t('Don de bienfaisance', 'Charitable gift'), text: t('Un don testamentaire génère un crédit pouvant compenser l\'impôt final.', 'A testamentary gift generates a credit that can offset the final tax.') },
        { title: t('Gel successoral (société)', 'Estate freeze (corp.)'), text: t('Cristallise la valeur actuelle et transfère la croissance future à la génération suivante.', 'Crystallizes current value and transfers future growth to the next generation.') },
      ],
    };
  }
  if (jur.country === 'US') {
    const EXEMPT = 13990000;
    const estateTax = Math.max(0, gross - EXEMPT) * 0.40;
    lines.push({ label: t(`Impôt successoral fédéral (>${money(EXEMPT, { currency: 'USD', compact: true })})`, `Federal estate tax (>${money(EXEMPT, { currency: 'USD', compact: true })})`), value: estateTax });
    total += estateTax;
    const ird = computeTax(jur, { ordinary: bal.deferred, withPayroll: false }).total;
    lines.push({ label: t('Impôt sur le revenu différé (héritiers, IRD)', 'Income in respect of decedent (heirs)'), value: ird });
    total += ird;
    return {
      gross, total, lines, label: gross > EXEMPT ? t('Impôt successoral fédéral', 'Federal estate tax') : t('Sous l\'exemption fédérale', 'Under federal exemption'),
      note: t(`L\'exemption fédérale 2025 est de ${money(EXEMPT, { currency: 'USD', compact: true })} par personne. Les actifs reçoivent une majoration de la base (step-up) éliminant les gains latents, mais les comptes avant impôt (401(k)/IRA) restent imposables pour les héritiers.`,
        `The 2025 federal exemption is ${money(EXEMPT, { currency: 'USD', compact: true })} per person. Assets receive a step-up in basis eliminating unrealized gains, but pre-tax accounts (401(k)/IRA) remain taxable to heirs.`),
      strategies: [
        { title: t('Majoration de la base (step-up)', 'Step-up in basis'), text: t('Les actifs appréciés voient leur base réévaluée au décès — aucun impôt sur les gains latents.', 'Appreciated assets are revalued at death — no tax on unrealized gains.') },
        { title: t('Fiducie irrévocable (ILIT)', 'Irrevocable trust (ILIT)'), text: t('Sort l\'assurance vie de la succession imposable.', 'Removes life insurance from the taxable estate.') },
        { title: t('Dons annuels', 'Annual gifting'), text: t('Réduisent la succession imposable via l\'exclusion annuelle.', 'Reduce the taxable estate via the annual exclusion.') },
        { title: t('Conversions Roth', 'Roth conversions'), text: t('Réduisent l\'IRD futur en payant l\'impôt du vivant.', 'Reduce future IRD by paying tax while living.') },
      ],
    };
  }
  const NRB = 325000 + 175000;
  const iht = Math.max(0, gross - NRB) * 0.40;
  lines.push({ label: t(`Inheritance Tax (>${money(NRB, { currency: 'GBP', compact: true })})`, `Inheritance Tax (>${money(NRB, { currency: 'GBP', compact: true })})`), value: iht });
  total += iht;
  return {
    gross, total, lines, label: 'Inheritance Tax',
    note: t('Au Royaume-Uni, l\'IHT s\'applique à 40 % au-delà de la bande à taux nul (£325k + £175k résidence). Les transferts au conjoint sont exonérés et les bandes inutilisées sont transférables.',
      'In the UK, IHT applies at 40 % above the nil-rate band (£325k + £175k residence). Spousal transfers are exempt and unused bands are transferable.'),
    strategies: [
      { title: t('Exemption entre conjoints', 'Spousal exemption'), text: t('Transferts illimités exonérés entre époux/partenaires civils.', 'Unlimited exempt transfers between spouses/civil partners.') },
      { title: t('Dons sur 7 ans (PETs)', '7-year gifts (PETs)'), text: t('Les dons deviennent exonérés s\'ils survivent 7 ans.', 'Gifts become exempt if you survive 7 years.') },
      { title: 'Trusts', text: t('Sortent des actifs de la succession imposable sous conditions.', 'Remove assets from the taxable estate under conditions.') },
    ],
  };
}
