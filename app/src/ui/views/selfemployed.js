import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { donutChart, PALETTE } from '../charts.js';
import { selfEmployedAnalysis } from '../../engine/selfbiz.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';
import { store as appStore } from '../../state/store.js';

export function render({ store, client, jur }) {
  store = store || appStore;
  const cur = jur.currency;
  const isCA = jur.country === 'CA';
  const F = clientFacts(client, jur);
  const prim = F.primary || { age: 45, employmentIncome: 0 };

  // Net self-employment income defaults to the primary member's work income on file;
  // revenue = 1.25× only when nothing has been saved yet (whatIf keeps the saved value).
  const incomeGuess = Math.round(prim.employmentIncome) || 90000;
  const P = whatIf(client, 'selfemployed', { netSelfEmployment: incomeGuess, revenue: Math.round(incomeGuess * 1.25), homeOfficeAnnual: 4000, vehicleAnnual: 8000, vehicleBusinessPct: 0.4, services: true });
  const setP = (k, v) => { P[k] = v; saveWhatIf(store, 'selfemployed', { [k]: v }); };
  const params = () => ({ ...P, age: prim.age });

  const out = h('div', {});
  const salesBox = h('div', {});
  function draw() {
    const r = selfEmployedAnalysis(jur, params());
    const segs = [
      { label: t('Impôt sur le revenu', 'Income tax'), value: r.incomeTax, color: PALETTE[5] },
      { label: t('RRQ/RPC (2 parts)', 'CPP/QPP (both)'), value: r.cpp, color: PALETTE[3] },
      { label: t('Revenu net', 'Net income'), value: Math.max(0, r.afterTax), color: PALETTE[6] },
    ].filter(s => s.value > 0);
    out.replaceChildren(
      h('div', { class: 'grid cols-4', style: { marginBottom: '12px' } },
        kpi({ label: t('Impôt + cotisations', 'Tax + contributions'), value: money(r.totalTax, { currency: cur, compact: true }), accent: 'var(--neg)' }),
        kpi({ label: t('Revenu net', 'Net income'), value: money(r.afterTax, { currency: cur, compact: true }), accent: 'var(--pos)' }),
        kpi({ label: t('Taux moyen / marginal', 'Average / marginal rate'), value: pct(r.averageRate, 1), sub: t(`marginal ${pct(r.marginalRate, 1)}`, `marginal ${pct(r.marginalRate, 1)}`) }),
        kpi({ label: t('Acompte trimestriel', 'Quarterly installment'), value: r.installmentsRequired ? money(r.quarterlyInstallment, { currency: cur, compact: true }) : t('Aucun', 'None'), sub: t(`seuil ${money(r.installmentThreshold, { currency: cur })}`, `threshold ${money(r.installmentThreshold, { currency: cur })}`) }),
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
        [t('Taux marginal sur le prochain dollar', 'Marginal rate on the next dollar'), pct(r.marginalRate, 1)],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } }, r.note),
    );
    salesBox.replaceChildren(statList([
      [t(`Inscription obligatoire (> ${money(jur.salesTax?.registrationThreshold ?? 30000, { currency: cur, compact: true })})`, `Registration required (> ${money(jur.salesTax?.registrationThreshold ?? 30000, { currency: cur, compact: true })})`), r.mustRegister ? t('Oui', 'Yes') : t('Non', 'No'), r.mustRegister ? 'warn' : 'pos'],
      [t('Taux TPS/TVH', 'GST/HST rate'), pct(r.gstRate, 2)],
      [t(`Taux provincial (${jur.region})`, `Provincial rate (${jur.region})`), pct(r.pstRate, 3)],
      [t('Taxes perçues (est.)', 'Sales tax collected (est.)'), money(r.salesTaxCollected, { currency: cur })],
      [t('Remise — méthode rapide', 'Remittance — quick method'), money(r.quickRemit, { currency: cur }), 'neg'],
      [t('Conservé (méthode rapide)', 'Kept (quick method)'), money(r.salesTaxKept, { currency: cur }), 'pos'],
    ]));
  }
  draw();

  const ctrl = card(t('Travailleur autonome', 'Self-employed'), { sub: t(`Impôt, RRQ/RPC, TPS/TVQ et acomptes — revenu du dossier ${money(prim.employmentIncome, { currency: cur, compact: true })}, âge ${prim.age}`, `Tax, CPP/QPP, sales tax and installments — file income ${money(prim.employmentIncome, { currency: cur, compact: true })}, age ${prim.age}`),
    right: isCA ? null : h('span', { class: 'chip warn' }, t('Optimisé pour le Canada', 'Optimized for Canada')) },
    h('div', { class: 'grid cols-3' },
      slider({ label: t('Revenu net d’entreprise', 'Net business income'), value: P.netSelfEmployment, min: 0, max: 500000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('netSelfEmployment', v); draw(); } }),
      slider({ label: t('Chiffre d’affaires (revenus)', 'Revenue (turnover)'), value: P.revenue, min: 0, max: 800000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('revenue', v); draw(); } }),
      slider({ label: t('Bureau à domicile / an', 'Home office / yr'), value: P.homeOfficeAnnual, min: 0, max: 30000, step: 500, format: v => money(v, { currency: cur }), onInput: v => { setP('homeOfficeAnnual', v); draw(); } }),
      slider({ label: t('Dépenses véhicule / an', 'Vehicle expenses / yr'), value: P.vehicleAnnual, min: 0, max: 30000, step: 500, format: v => money(v, { currency: cur }), onInput: v => { setP('vehicleAnnual', v); draw(); } }),
      slider({ label: t('% d’usage affaires du véhicule', 'Vehicle business-use %'), value: P.vehicleBusinessPct, min: 0, max: 1, step: 0.05, format: v => pct(v, 0), onInput: v => { setP('vehicleBusinessPct', v); draw(); } }),
      h('div', { class: 'field' }, h('label', {}, t('Méthode rapide — type d’activité', 'Quick method — activity type')),
        h('select', { onChange: e => { setP('services', e.target.value === 'services'); draw(); } },
          h('option', { value: 'services', selected: !!P.services }, t('Services', 'Services')),
          h('option', { value: 'goods', selected: !P.services }, t('Biens / revente', 'Goods / resale')))),
    ));

  const sales = card(t('TPS/TVH + TVQ', 'GST/HST + sales tax'), { sub: t(`Taux de la juridiction (${jur.taxYear})`, `Jurisdiction rates (${jur.taxYear})`) },
    salesBox,
    h('p', { class: 'tiny muted', style: { marginTop: '8px' } }, t('La méthode rapide simplifie la remise et laisse souvent un petit gain pour les entreprises de services.', 'The quick method simplifies remittance and often leaves a small gain for service businesses.')));

  const tips = card(t('À retenir', 'Key points'), {},
    h('div', {}, ...[
      [t('Double cotisation au RRQ/RPC', 'Double CPP/QPP'), t('Vous payez les parts employeur ET employé; la moitié est déductible.', 'You pay employer AND employee halves; half is deductible.')],
      [t('Acomptes provisionnels', 'Tax installments'), t(`Trimestriels si l’impôt net dépasse ${money(jur.installments?.thresholdQC ?? 1800, { currency: cur })} (QC) / ${money(jur.installments?.thresholdROC ?? 3000, { currency: cur })} (ailleurs).`, `Quarterly if net tax exceeds ${money(jur.installments?.thresholdQC ?? 1800, { currency: cur })} (QC) / ${money(jur.installments?.thresholdROC ?? 3000, { currency: cur })} (elsewhere).`)],
      [t('REER pour revenu irrégulier', 'RRSP for irregular income'), t('Cotiser les bonnes années lisse l’impôt et bâtit la retraite (pas de régime d’employeur).', 'Contributing in good years smooths tax and builds retirement (no employer plan).')],
    ].map(([ti, tx]) => h('div', { style: { padding: '9px 0', borderBottom: '1px solid var(--border)' } }, h('b', {}, ti), h('div', { class: 'tiny muted' }, tx)))));

  return h('div', { class: 'grid' },
    h('div', { class: 'span-full' }, ctrl),
    h('div', { class: 'span-full' }, card(t('Charge fiscale', 'Tax burden'), {}, out)),
    h('div', { class: 'grid cols-2 span-full' }, sales, tips));
}
