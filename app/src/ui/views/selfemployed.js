import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { donutChart, PALETTE } from '../charts.js';
import { selfEmployedAnalysis } from '../../engine/selfbiz.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const isCA = jur.country === 'CA';
  const incomeGuess = client.incomes.filter(i => ['self', 'employment'].includes(i.type)).reduce((s, i) => s + i.amount, 0) || 90000;
  const p = { netSelfEmployment: Math.round(incomeGuess), revenue: Math.round(incomeGuess * 1.25), homeOfficeAnnual: 4000, vehicleAnnual: 8000, vehicleBusinessPct: 0.4 };

  const out = h('div', {});
  function draw() {
    const r = selfEmployedAnalysis(jur, p);
    const segs = [
      { label: t('Impôt sur le revenu', 'Income tax'), value: r.incomeTax, color: PALETTE[5] },
      { label: t('RRQ/RPC (2 parts)', 'CPP/QPP (both)'), value: r.cpp, color: PALETTE[3] },
      { label: t('Revenu net', 'Net income'), value: Math.max(0, r.afterTax), color: PALETTE[6] },
    ].filter(s => s.value > 0);
    out.replaceChildren(
      h('div', { class: 'grid cols-4', style: { marginBottom: '12px' } },
        kpi({ label: t('Impôt + cotisations', 'Tax + contributions'), value: money(r.totalTax, { currency: cur, compact: true }), accent: 'var(--neg)' }),
        kpi({ label: t('Revenu net', 'Net income'), value: money(r.afterTax, { currency: cur, compact: true }), accent: 'var(--pos)' }),
        kpi({ label: t('Taux moyen', 'Average rate'), value: pct(r.averageRate, 1) }),
        kpi({ label: t('Acompte trimestriel', 'Quarterly installment'), value: r.installmentsRequired ? money(r.quarterlyInstallment, { currency: cur, compact: true }) : t('Aucun', 'None') }),
      ),
      h('div', { class: 'flex center', style: { justifyContent: 'center' } },
        h('div', { html: donutChart({ segments: segs, centerLabel: pct(r.averageRate, 0), centerSub: t('charge', 'burden') }) })),
      h('div', { class: 'sep' }),
      statList([
        [t('Déduction bureau à domicile', 'Home-office deduction'), money(r.homeOfficeDed, { currency: cur }), 'pos'],
        [t('Déduction véhicule (usage affaires)', 'Vehicle deduction (business use)'), money(r.vehicleDed, { currency: cur }), 'pos'],
        [t('Revenu net après déductions', 'Net income after deductions'), money(r.netAfterDed, { currency: cur })],
        [t('RRQ/RPC — deux parts', 'CPP/QPP — both halves'), money(r.cpp, { currency: cur }), 'neg'],
        [t('(dont déductible)', '(of which deductible)'), money(r.cppDeductible, { currency: cur })],
        [t('Impôt sur le revenu', 'Income tax'), money(r.incomeTax, { currency: cur }), 'neg'],
        [t('Charge totale', 'Total burden'), money(r.totalTax, { currency: cur }), 'neg'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } }, r.note),
    );
  }
  draw();

  const ctrl = card(t('Travailleur autonome', 'Self-employed'), { sub: t('Impôt, RRQ/RPC, TPS/TVQ et acomptes', 'Tax, CPP/QPP, sales tax and installments'),
    right: isCA ? null : h('span', { class: 'chip warn' }, t('Optimisé pour le Canada', 'Optimized for Canada')) },
    h('div', { class: 'grid cols-3' },
      slider({ label: t('Revenu net d’entreprise', 'Net business income'), value: p.netSelfEmployment, min: 0, max: 500000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { p.netSelfEmployment = v; draw(); } }),
      slider({ label: t('Chiffre d’affaires (revenus)', 'Revenue (turnover)'), value: p.revenue, min: 0, max: 800000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { p.revenue = v; draw(); } }),
      slider({ label: t('Bureau à domicile / an', 'Home office / yr'), value: p.homeOfficeAnnual, min: 0, max: 30000, step: 500, format: v => money(v, { currency: cur }), onInput: v => { p.homeOfficeAnnual = v; draw(); } }),
      slider({ label: t('Dépenses véhicule / an', 'Vehicle expenses / yr'), value: p.vehicleAnnual, min: 0, max: 30000, step: 500, format: v => money(v, { currency: cur }), onInput: v => { p.vehicleAnnual = v; draw(); } }),
      slider({ label: t('% d’usage affaires du véhicule', 'Vehicle business-use %'), value: p.vehicleBusinessPct, min: 0, max: 1, step: 0.05, format: v => pct(v, 0), onInput: v => { p.vehicleBusinessPct = v; draw(); } }),
    ));

  const sales = card(t('TPS/TVH + TVQ', 'GST/HST + sales tax'), {},
    h('div', {}, (() => { const r = selfEmployedAnalysis(jur, p); return statList([
      [t('Inscription obligatoire (>30 000 $)', 'Registration required (>$30k)'), r.mustRegister ? t('Oui', 'Yes') : t('Non', 'No'), r.mustRegister ? 'warn' : 'pos'],
      [t('Taxes perçues (est.)', 'Sales tax collected (est.)'), money(r.salesTaxCollected, { currency: cur })],
      [t('Remise — méthode rapide', 'Remittance — quick method'), money(r.quickRemit, { currency: cur }), 'neg'],
      [t('Conservé (méthode rapide)', 'Kept (quick method)'), money(r.salesTaxKept, { currency: cur }), 'pos'],
    ]); })()),
    h('p', { class: 'tiny muted', style: { marginTop: '8px' } }, t('La méthode rapide simplifie la remise et laisse souvent un petit gain pour les entreprises de services.', 'The quick method simplifies remittance and often leaves a small gain for service businesses.')));

  const tips = card(t('À retenir', 'Key points'), {},
    h('div', {}, ...[
      [t('Double cotisation au RRQ/RPC', 'Double CPP/QPP'), t('Vous payez les parts employeur ET employé; la moitié est déductible.', 'You pay employer AND employee halves; half is deductible.')],
      [t('Acomptes provisionnels', 'Tax installments'), t('Trimestriels si l’impôt net dépasse 1 800 $ (QC) / 3 000 $ (ailleurs).', 'Quarterly if net tax exceeds $1,800 (QC) / $3,000 (elsewhere).')],
      [t('REER pour revenu irrégulier', 'RRSP for irregular income'), t('Cotiser les bonnes années lisse l’impôt et bâtit la retraite (pas de régime d’employeur).', 'Contributing in good years smooths tax and builds retirement (no employer plan).')],
    ].map(([ti, tx]) => h('div', { style: { padding: '9px 0', borderBottom: '1px solid var(--border)' } }, h('b', {}, ti), h('div', { class: 'tiny muted' }, tx)))));

  return h('div', { class: 'grid' },
    h('div', { class: 'span-full' }, ctrl),
    h('div', { class: 'span-full' }, card(t('Charge fiscale', 'Tax burden'), {}, out)),
    h('div', { class: 'grid cols-2 span-full' }, sales, tips));
}
