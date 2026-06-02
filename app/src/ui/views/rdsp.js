import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { lineChart, barChart, PALETTE } from '../charts.js';
import { rdspProjection, rdspGrantBond } from '../../engine/rdsp.js';

export function render({ client, jur, navigate }) {
  const cur = jur.currency;
  const isCA = jur.country === 'CA';
  let age = 25, contrib = 1500, income = 45000, growth = 0.05;

  const out = h('div', {});
  function draw() {
    const p = rdspProjection({ beneficiaryAge: age, annualContribution: contrib, familyIncome: income, growth });
    const gb = rdspGrantBond(contrib, income);
    out.replaceChildren(
      h('div', { class: 'grid cols-4', style: { marginBottom: '12px' } },
        kpi({ label: t('Subventions à vie (SCEI)', 'Lifetime grants (CDSG)'), value: money(p.totalGrant, { currency: cur, compact: true }), accent: 'var(--pos)' }),
        kpi({ label: t('Bons à vie (BCEI)', 'Lifetime bonds (CDSB)'), value: money(p.totalBond, { currency: cur, compact: true }), accent: 'var(--pos)' }),
        kpi({ label: t('Effet de levier gouvernemental', 'Government leverage'), value: p.leverage.toFixed(1) + '×', sub: t(`${money(p.governmentTotal, { currency: cur, compact: true })} gratuits`, `${money(p.governmentTotal, { currency: cur, compact: true })} free`) }),
        kpi({ label: t('Valeur projetée (60 ans)', 'Projected value (age 60)'), value: money(p.finalValue, { currency: cur, compact: true }), iconName: 'networth' }),
      ),
      h('div', { html: lineChart({ series: [{ color: PALETTE[1], values: p.series.map(s => Math.round(s.value)) }], xLabels: p.series.map(s => s.age), area: true }) }),
      h('div', { class: 'flex between', style: { marginTop: '6px' } },
        h('span', { class: 'tiny muted' }, t('Cette année', 'This year') + ' : ' + t('subvention', 'grant') + ' ' + money(gb.grant, { currency: cur }) + ' · ' + t('bon', 'bond') + ' ' + money(gb.bond, { currency: cur })),
        legend([{ color: PALETTE[1], label: t('Valeur du REEI', 'RDSP value') }])),
      h('div', { class: 'sep' }),
      statList([
        [t('Cotisations totales', 'Total contributions'), money(p.totalContrib, { currency: cur })],
        [t('Subventions reçues', 'Grants received'), money(p.totalGrant, { currency: cur }), 'pos'],
        [t('Bons reçus', 'Bonds received'), money(p.totalBond, { currency: cur }), 'pos'],
        [t('Apport gouvernemental total', 'Total government contribution'), money(p.governmentTotal, { currency: cur }), 'pos'],
        [t('Valeur finale projetée', 'Projected final value'), money(p.finalValue, { currency: cur }), 'pos'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } }, p.note),
    );
  }
  draw();

  const ctrl = card(t('Paramètres du REEI', 'RDSP parameters'), {
    sub: t('Régime enregistré d’épargne-invalidité', 'Registered Disability Savings Plan') },
    h('div', { class: 'grid cols-4' },
      slider({ label: t('Âge du bénéficiaire', 'Beneficiary age'), value: age, min: 0, max: 49, step: 1, format: v => `${v}`, onInput: v => { age = v; draw(); } }),
      slider({ label: t('Cotisation annuelle', 'Annual contribution'), value: contrib, min: 0, max: 10000, step: 250, format: v => money(v, { currency: cur, compact: true }), onInput: v => { contrib = v; draw(); } }),
      slider({ label: t('Revenu familial net', 'Family net income'), value: income, min: 0, max: 200000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { income = v; draw(); } }),
      slider({ label: t('Rendement', 'Return'), value: growth, min: 0.02, max: 0.08, step: 0.005, format: v => pct(v), onInput: v => { growth = v; draw(); } }),
    ));

  const info = card(t('Programmes pour proches & invalidité', 'Disability & caregiver programs'), { class: 'span-full' },
    h('div', { class: 'grid cols-2' }, ...[
      [t('Crédit d’impôt pour personnes handicapées (CIPH)', 'Disability Tax Credit (DTC)'), t('Porte d’entrée du REEI et de plusieurs mesures; non remboursable mais transférable à un proche aidant.', 'Gateway to the RDSP and several measures; non-refundable but transferable to a supporting relative.')],
      [t('Crédit pour aidant naturel', 'Caregiver credit'), t('Allègement fiscal pour le soutien d’un proche à charge ayant une déficience.', 'Tax relief for supporting a dependent relative with an impairment.')],
      [t('Fiducie Henson', 'Henson trust'), t('Protège l’admissibilité aux prestations provinciales d’invalidité tout en pourvoyant à la personne.', 'Protects eligibility for provincial disability benefits while providing for the person.')],
      [t('REEI — règle de remboursement (10 ans)', 'RDSP — 10-year holdback'), t('Les subventions et bons des 10 dernières années doivent être remboursés si on retire trop tôt.', 'Grants and bonds from the last 10 years must be repaid if you withdraw too early.')],
    ].map(([ti, tx]) => h('div', { class: 'flex', style: { gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' } },
      h('span', { class: 'chip info', style: { flex: 'none' }, html: icon('check', 13) }),
      h('div', {}, h('b', {}, ti), h('div', { class: 'tiny muted' }, tx))))));

  if (!isCA) {
    const note = jur.country === 'US'
      ? t('Aux États-Unis, le compte ABLE permet une épargne à l’abri de l’impôt pour personnes handicapées sans perdre les prestations (SSI/Medicaid), avec plafonds annuels.', 'In the US, an ABLE account allows tax-free savings for people with disabilities without losing benefits (SSI/Medicaid), subject to annual caps.')
      : t('Au Royaume-Uni, il n’existe pas d’équivalent direct du REEI; on utilise des fiducies pour personnes vulnérables et le Junior ISA.', 'In the UK there is no direct RDSP equivalent; vulnerable-person trusts and the Junior ISA are used.');
    return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, ctrl),
      h('div', { class: 'span-full' }, card(t('Projection', 'Projection'), {}, out)),
      card(t('Équivalent local', 'Local equivalent'), { class: 'span-full' }, h('p', {}, note)), info);
  }

  return h('div', { class: 'grid' },
    h('div', { class: 'span-full' }, ctrl),
    h('div', { class: 'span-full' }, card(t('Projection du REEI', 'RDSP projection'), {}, out)),
    info);
}
