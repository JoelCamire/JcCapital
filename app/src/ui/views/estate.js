import { h, money, pct, icon } from '../dom.js';
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
    { label: 'Régimes imposables', value: bal.deferred, color: PALETTE[0] },
    { label: 'Libre d\'impôt', value: bal.taxfree, color: PALETTE[1] },
    { label: 'Non enregistré', value: bal.taxable, color: PALETTE[2] },
    { label: 'Immobilier', value: bal.realestate, color: PALETTE[3] },
  ].filter(s => s.value > 0);

  const liquid = bal.taxfree + bal.taxable;
  const liquidityOk = liquid >= est.total;

  const kpis = h('div', { class: 'grid cols-4 span-full' },
    kpi({ label: 'Succession brute (proj.)', value: money(est.gross, { currency: cur, compact: true }), iconName: 'estate',
      sub: `À ${proj.summary.lifeExpectancy} ans` }),
    kpi({ label: 'Impôts / droits au décès', value: money(est.total, { currency: cur, compact: true }), accent: 'var(--neg)',
      sub: est.label }),
    kpi({ label: 'Legs net aux héritiers', value: money(est.gross - est.total, { currency: cur, compact: true }), accent: 'var(--pos)' }),
    kpi({ label: 'Liquidité au décès', value: liquidityOk ? 'Suffisante' : 'Insuffisante', accent: liquidityOk ? 'var(--pos)' : 'var(--neg)',
      sub: `${money(liquid, { currency: cur, compact: true })} liquides` }),
  );

  const breakdown = card('Estimation des impôts au décès', { sub: `${jur.flag} ${jur.name} — règles applicables` },
    statList(est.lines.map(l => [l.label, money(l.value, { currency: cur }), l.value > 0 ? 'neg' : ''])),
    h('div', { class: 'sep' }),
    statList([['Total estimé', money(est.total, { currency: cur }), 'neg']]),
    h('p', { class: 'tiny muted', style: { marginTop: '12px' } }, est.note),
  );

  const compo = card('Composition de la succession projetée', {},
    h('div', { class: 'flex center', style: { justifyContent: 'center' } },
      h('div', { html: donutChart({ segments: segs, centerLabel: money(est.gross, { currency: cur, compact: true }), centerSub: 'succession' }) })),
    h('div', { class: 'sep' }),
    legend(segs.map(s => ({ color: s.color, label: `${s.label} · ${money(s.value, { currency: cur, compact: true })}` }))),
  );

  const trajectory = card('Trajectoire de la valeur nette jusqu\'au décès', { class: 'span-full',
    right: legend([{ color: PALETTE[0], label: 'Valeur nette' }]) },
    h('div', { html: lineChart({ series: [{ name: 'Valeur nette', color: PALETTE[0], values: proj.rows.map(r => r.netWorth) }], xLabels: proj.rows.map(r => r.primaryAge), area: true }) }));

  const strategies = card('Stratégies successorales', { class: 'span-full' },
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
    // RRSP/RRIF fully taxable as income in year of death
    const incTax = computeTax(jur, { ordinary: bal.deferred, withPayroll: false });
    const rrspTax = incTax.total;
    lines.push({ label: 'Impôt sur REER/FERR (revenu réputé)', value: rrspTax });
    total += rrspTax;
    // Deemed disposition on non-registered (50 % of gains). Approx gain = 35 % of balance.
    const gain = bal.taxable * 0.35;
    const capTax = computeTax(jur, { ordinary: 90000, capGains: gain, withPayroll: false }).total
      - computeTax(jur, { ordinary: 90000, withPayroll: false }).total;
    lines.push({ label: 'Gain en capital réputé (non enreg.)', value: Math.max(0, capTax) });
    total += Math.max(0, capTax);
    // Probate (province-dependent; QC ≈ 0, ON ≈ 1.5 %)
    const probateRate = client.jurisdiction.region === 'ON' ? 0.015 : client.jurisdiction.region === 'QC' ? 0 : 0.004;
    const probate = gross * probateRate;
    if (probate > 0) { lines.push({ label: 'Frais d\'homologation', value: probate }); total += probate; }
    return {
      gross, total, lines, label: 'Impôt sur le revenu + homologation',
      note: 'Au Canada, il n\'existe pas d\'impôt successoral distinct : le décès déclenche une disposition réputée. Le REER/FERR est pleinement imposable, les gains en capital à 50 %. La résidence principale est exonérée. Un roulement au conjoint reporte l\'impôt.',
      strategies: [
        { title: 'Roulement au conjoint', text: 'Reporte l\'impôt sur le REER/FERR et les gains jusqu\'au décès du second conjoint.' },
        { title: 'Assurance vie permanente', text: 'Fournit la liquidité pour payer l\'impôt au décès et maximise le legs net.' },
        { title: 'Don de bienfaisance', text: 'Un don testamentaire génère un crédit pouvant compenser l\'impôt final.' },
        { title: 'Gel successoral (société)', text: 'Cristallise la valeur actuelle et transfère la croissance future à la génération suivante.' },
      ],
    };
  }
  if (jur.country === 'US') {
    const EXEMPT = 13990000;
    const estateTax = Math.max(0, gross - EXEMPT) * 0.40;
    lines.push({ label: `Impôt successoral fédéral (>${money(EXEMPT, { currency: 'USD', compact: true })})`, value: estateTax });
    total += estateTax;
    // Income in respect of decedent on pre-tax accounts (heirs)
    const ird = computeTax(jur, { ordinary: bal.deferred, withPayroll: false }).total;
    lines.push({ label: 'Impôt sur le revenu différé (héritiers, IRD)', value: ird });
    total += ird;
    return {
      gross, total, lines, label: gross > EXEMPT ? 'Impôt successoral fédéral' : 'Sous l\'exemption fédérale',
      note: `L\'exemption fédérale 2025 est de ${money(EXEMPT, { currency: 'USD', compact: true })} par personne. Les actifs reçoivent une majoration de la base au coût (step-up) éliminant les gains latents, mais les comptes avant impôt (401(k)/IRA) restent imposables pour les héritiers.`,
      strategies: [
        { title: 'Step-up de la base', text: 'Les actifs appréciés voient leur base réévaluée au décès — aucun impôt sur les gains latents.' },
        { title: 'Trusts irrévocables (ILIT)', text: 'Sortent l\'assurance vie de la succession imposable.' },
        { title: 'Dons annuels', text: 'Réduisent la succession imposable via l\'exclusion annuelle (gift tax).' },
        { title: 'Conversions Roth', text: 'Réduisent l\'IRD futur en payant l\'impôt du vivant.' },
      ],
    };
  }
  // UK
  const NRB = 325000 + 175000;
  const iht = Math.max(0, gross - NRB) * 0.40;
  lines.push({ label: `Inheritance Tax (>${money(NRB, { currency: 'GBP', compact: true })})`, value: iht });
  total += iht;
  return {
    gross, total, lines, label: 'Inheritance Tax',
    note: 'Au Royaume-Uni, l\'IHT s\'applique à 40 % au-delà de la bande à taux nul (£325k + £175k résidence). Les transferts au conjoint sont exonérés et les bandes inutilisées sont transférables.',
    strategies: [
      { title: 'Exemption entre conjoints', text: 'Transferts illimités exonérés entre époux/partenaires civils.' },
      { title: 'Dons sur 7 ans (PETs)', text: 'Les dons deviennent exonérés s\'ils survivent 7 ans.' },
      { title: 'Trusts', text: 'Sortent des actifs de la succession imposable sous conditions.' },
    ],
  };
}
