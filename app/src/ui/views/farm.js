import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, PALETTE } from '../charts.js';
import { farmTransfer, agriInvest } from '../../engine/farm.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const isCA = jur.country === 'CA';
  const p = { landFMV: 2000000, landACB: 300000, quotaFMV: 800000, quotaACB: 0, buildingsFMV: 400000, buildingsACB: 200000, owners: 1, otherIncome: 60000 };

  const out = h('div', {});
  function draw() {
    const r = farmTransfer(jur, p);
    out.replaceChildren(
      h('div', { class: 'grid cols-4', style: { marginBottom: '12px' } },
        kpi({ label: t('Gain en capital total', 'Total capital gain'), value: money(r.totalGain, { currency: cur, compact: true }) }),
        kpi({ label: t('Économie d’impôt (EGC)', 'Tax saved (LCGE)'), value: money(r.lcgeSaving, { currency: cur, compact: true }), accent: 'var(--pos)' }),
        kpi({ label: t('Impôt — vente avec EGC', 'Tax — sale with LCGE'), value: money(r.taxOnSale, { currency: cur, compact: true }), accent: 'var(--neg)' }),
        kpi({ label: t('Impôt — roulement aux enfants', 'Tax — rollover to child'), value: money(r.rolloverTaxNow, { currency: cur, compact: true }), accent: 'var(--pos)', sub: t('reporté', 'deferred') }),
      ),
      h('div', { html: barChart({
        xLabels: [t('Vente sans EGC', 'Sale, no LCGE'), t('Vente avec EGC', 'Sale with LCGE'), t('Roulement', 'Rollover')],
        series: [{ color: PALETTE[5], values: [Math.round(r.taxNoLcge), Math.round(r.taxOnSale), Math.round(r.rolloverTaxNow)] }],
      }) }),
      legend([{ color: PALETTE[5], label: t('Impôt déclenché', 'Tax triggered') }]),
      h('div', { class: 'sep' }),
      statList([
        [t('Gain — terres', 'Gain — land'), money(r.landGain, { currency: cur })],
        [t('Gain — quotas', 'Gain — quota'), money(r.quotaGain, { currency: cur })],
        [t('Gain — bâtiments', 'Gain — buildings'), money(r.buildingGain, { currency: cur })],
        [t(`Exonération cumulative (EGC × ${r.owners})`, `Lifetime exemption (LCGE × ${r.owners})`), money(r.lcgeTotal, { currency: cur }), 'pos'],
        [t('Portion exonérée', 'Exempt portion'), money(r.exempt, { currency: cur }), 'pos'],
        [t('Gain imposable résiduel', 'Residual taxable gain'), money(r.taxableGain, { currency: cur })],
        [t('Produit net après impôt (vente)', 'Net after-tax proceeds (sale)'), money(r.netSale, { currency: cur }), 'pos'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '10px' } }, r.note),
    );
  }
  draw();

  const ctrl = card(t('Transfert / vente de la ferme', 'Farm transfer / sale'), { sub: t('Biens agricoles admissibles (BAA)', 'Qualified farm property'),
    right: isCA ? null : h('span', { class: 'chip warn' }, t('Règles canadiennes', 'Canadian rules')) },
    h('div', { class: 'grid cols-3' },
      slider({ label: t('Valeur des terres', 'Land value'), value: p.landFMV, min: 0, max: 10000000, step: 50000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { p.landFMV = v; draw(); } }),
      slider({ label: t('Coût des terres (PBR)', 'Land cost (ACB)'), value: p.landACB, min: 0, max: 5000000, step: 25000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { p.landACB = v; draw(); } }),
      slider({ label: t('Valeur des quotas', 'Quota value'), value: p.quotaFMV, min: 0, max: 5000000, step: 25000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { p.quotaFMV = v; draw(); } }),
      slider({ label: t('Valeur des bâtiments', 'Buildings value'), value: p.buildingsFMV, min: 0, max: 5000000, step: 25000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { p.buildingsFMV = v; draw(); } }),
      slider({ label: t('Nombre de détenteurs (EGC)', 'Number of owners (LCGE)'), value: p.owners, min: 1, max: 4, step: 1, format: v => `${v}`, onInput: v => { p.owners = v; draw(); } }),
      slider({ label: t('Autre revenu (année de vente)', 'Other income (sale year)'), value: p.otherIncome, min: 0, max: 300000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { p.otherIncome = v; draw(); } }),
    ));

  // AgriInvest mini
  let netSales = 500000;
  const aiBox = h('div', {});
  function drawAI() { const a = agriInvest({ netSales }); aiBox.replaceChildren(statList([
    [t('Ventes nettes admissibles', 'Allowable net sales'), money(a.netSales, { currency: cur })],
    [t('Dépôt du producteur (1 %)', 'Producer deposit (1%)'), money(a.maxDeposit, { currency: cur })],
    [t('Contribution gouvernementale', 'Government match'), money(a.govMatch, { currency: cur }), 'pos'],
    [t('Total au compte', 'Total to account'), money(a.totalToAccount, { currency: cur }), 'pos'],
  ])); }
  drawAI();
  const agri = card('AgriInvest', { sub: t('Compte d’épargne agricole avec contrepartie', 'Matched farm savings account') },
    slider({ label: t('Ventes nettes admissibles', 'Allowable net sales'), value: netSales, min: 0, max: 5000000, step: 50000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { netSales = v; drawAI(); } }),
    aiBox);

  const strat = card(t('Stratégies agricoles', 'Farm strategies'), {},
    h('div', {}, ...[
      [t('Roulement intergénérationnel', 'Intergenerational rollover'), t('Transfert de la ferme à un enfant au coût (art. 73(3)/70(9)) — report total de l’impôt, propre à l’agriculture.', 'Transfer the farm to a child at cost (s.73(3)/70(9)) — full tax deferral, unique to farming.')],
      [t('Multiplier l’EGC', 'Multiply the LCGE'), t('Détenir via plusieurs membres de la famille (société agricole / société de personnes) démultiplie l’exonération.', 'Holding across family members (farm corp / partnership) multiplies the exemption.')],
      [t('Comptabilité de caisse', 'Cash accounting'), t('Permet de différer le revenu lié aux stocks invendus et de payer d’avance des dépenses.', 'Lets you defer income tied to unsold inventory and prepay expenses.')],
      [t('AgriStability / AgriInvest', 'AgriStability / AgriInvest'), t('Programmes de gestion des risques : stabilisation de la marge et épargne avec contrepartie.', 'Risk-management programs: margin stabilization and matched savings.')],
    ].map(([ti, tx]) => h('div', { class: 'flex', style: { gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' } },
      h('span', { class: 'chip info', style: { flex: 'none' }, html: icon('check', 13) }),
      h('div', {}, h('b', {}, ti), h('div', { class: 'tiny muted' }, tx))))));

  return h('div', { class: 'grid' },
    h('div', { class: 'span-full' }, ctrl),
    h('div', { class: 'span-full' }, card(t('Vente avec EGC vs roulement', 'Sale with LCGE vs rollover'), {}, out)),
    h('div', { class: 'grid cols-2 span-full' }, agri, strat));
}
