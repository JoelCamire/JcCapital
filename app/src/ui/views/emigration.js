import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, PALETTE } from '../charts.js';
import { departureTax, arrivalStepUp } from '../../engine/emigration.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const isCA = jur.country === 'CA';

  // seed from client data
  const assets = client.assets || [];
  const sum = (pred) => assets.filter(pred).reduce((s, a) => s + a.value, 0);
  const st = {
    portfolioFMV: Math.round(sum(a => ['nonreg', 'cash'].includes(a.type)) || 1500000),
    portfolioACB: Math.round((sum(a => ['nonreg', 'cash'].includes(a.type)) * 0.6) || 900000),
    realEstateFMV: Math.round(sum(a => a.type === 'realestate') || 800000),
    rrspValue: Math.round(sum(a => ['rrsp', 'rrif'].includes(a.type)) || 400000),
    privateCoFMV: client.business ? Math.round((client.business.retainedEarnings || 0) + 1000000) : 0,
    privateCoACB: 100000,
    marginalRate: 0.26,
  };

  const out = h('div', {});
  function draw() {
    const d = departureTax(st);
    out.replaceChildren(
      h('div', { class: 'grid cols-3', style: { marginBottom: '12px' } },
        kpi({ label: t('Gain réputé au départ', 'Deemed gain at departure'), value: money(d.deemedGain, { currency: cur, compact: true }) }),
        kpi({ label: t('Impôt de départ', 'Departure tax'), value: money(d.tax, { currency: cur, compact: true }), accent: 'var(--neg)' }),
        kpi({ label: t('Exclu de l’impôt de départ', 'Excluded from departure tax'), value: money(d.excludedFromDeparture, { currency: cur, compact: true }), accent: 'var(--pos)' }),
      ),
      h('div', { html: barChart({
        xLabels: [t('Gain imposable', 'Taxable gain'), t('Exclu (immo + REER)', 'Excluded (real estate + RRSP)')],
        series: [{ color: PALETTE[4], values: [Math.round(d.taxableGain), 0] }, { color: PALETTE[1], values: [0, Math.round(d.excludedFromDeparture)] }],
      }) }),
      statList([
        [t('Portefeuille non enregistré (JVM)', 'Non-registered portfolio (FMV)'), money(st.portfolioFMV, { currency: cur })],
        [t('Actions de société privée (gain)', 'Private company shares (gain)'), money(Math.max(0, st.privateCoFMV - st.privateCoACB), { currency: cur })],
        [t('Gain en capital réputé total', 'Total deemed capital gain'), money(d.deemedGain, { currency: cur })],
        [t('Portion imposable (50 %)', 'Taxable portion (50%)'), money(d.taxableGain, { currency: cur })],
        [t('Impôt de départ estimé', 'Estimated departure tax'), money(d.tax, { currency: cur }), 'neg'],
        [t('Immobilier canadien (exclu)', 'Canadian real estate (excluded)'), money(st.realEstateFMV, { currency: cur }), 'pos'],
        [t('REER / FERR (exclu, imposé au retrait)', 'RRSP/RRIF (excluded, taxed on withdrawal)'), money(st.rrspValue, { currency: cur }), 'pos'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '10px' } }, d.note),
    );
  }
  draw();

  const ctrl = card(t('Actifs au moment du départ', 'Assets at time of departure'), {
    sub: t('Disposition réputée à la juste valeur marchande', 'Deemed disposition at fair market value') },
    h('div', { class: 'grid cols-3' },
      slider({ label: t('Portefeuille non enregistré (JVM)', 'Non-reg portfolio (FMV)'), value: st.portfolioFMV, min: 0, max: 10000000, step: 50000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { st.portfolioFMV = v; draw(); } }),
      slider({ label: t('Coût du portefeuille (PBR)', 'Portfolio cost (ACB)'), value: st.portfolioACB, min: 0, max: 10000000, step: 50000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { st.portfolioACB = v; draw(); } }),
      slider({ label: t('Actions de société privée (JVM)', 'Private company shares (FMV)'), value: st.privateCoFMV, min: 0, max: 20000000, step: 100000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { st.privateCoFMV = v; draw(); } }),
      slider({ label: t('Immobilier canadien (JVM)', 'Canadian real estate (FMV)'), value: st.realEstateFMV, min: 0, max: 10000000, step: 50000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { st.realEstateFMV = v; draw(); } }),
      slider({ label: t('REER / FERR', 'RRSP/RRIF'), value: st.rrspValue, min: 0, max: 5000000, step: 25000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { st.rrspValue = v; draw(); } }),
      slider({ label: t('Taux marginal (gain)', 'Marginal rate (gain)'), value: st.marginalRate, min: 0.2, max: 0.27, step: 0.005, format: v => pct(v, 0), onInput: v => { st.marginalRate = v; draw(); } }),
    ));

  const tips = card(t('Points clés & arrivée', 'Key points & arrival'), { class: 'span-full' },
    h('div', { class: 'grid cols-2' }, ...[
      [t('Report du paiement', 'Payment deferral'), t('On peut reporter le paiement de l’impôt de départ sans intérêt en fournissant une garantie acceptable à l’ARC (formulaire T1244).', 'You can defer paying the departure tax interest-free by posting acceptable security with the CRA (Form T1244).')],
      [t('Majoration à l’arrivée', 'Step-up on arrival'), t('Le nouveau pays répute souvent acquérir les biens à leur JVM : les gains accumulés avant l’arrivée échappent à son impôt.', 'The new country often deems property acquired at FMV: gains accrued before arrival escape its tax.')],
      [t('Biens exclus', 'Excluded property'), t('Immobilier canadien, REER/FERR, CELI, pensions et options d’employés restent imposables au Canada selon leurs propres règles.', 'Canadian real estate, RRSP/RRIF, TFSA, pensions and employee options remain taxable in Canada under their own rules.')],
      [t('CELI & nouveau pays', 'TFSA & new country'), t('Le CELI n’est pas reconnu par plusieurs pays (ex. États-Unis) : son revenu peut y devenir imposable. Réviser avant le départ.', 'The TFSA is not recognized by several countries (e.g. the US): its income may become taxable there. Review before leaving.')],
    ].map(([ti, tx]) => h('div', { class: 'flex', style: { gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' } },
      h('span', { class: 'chip info', style: { flex: 'none' }, html: icon('check', 13) }),
      h('div', {}, h('b', {}, ti), h('div', { class: 'tiny muted' }, tx))))));

  if (!isCA) {
    const note = jur.country === 'US'
      ? t('Aux États-Unis, l’« exit tax » (art. 877A) s’applique aux « covered expatriates » qui renoncent à la citoyenneté/carte verte : disposition réputée mark-to-market au-delà d’une exclusion (~866 000 $ en 2025).', 'In the US, the exit tax (§877A) applies to “covered expatriates” who renounce citizenship/green card: mark-to-market deemed disposition above an exclusion (~$866,000 in 2025).')
      : t('Au Royaume-Uni, il n’y a pas d’impôt de départ général, mais les règles de « temporary non-residence » peuvent réimposer certains gains au retour dans les 5 ans.', 'In the UK there is no general exit tax, but “temporary non-residence” rules can re-tax certain gains if you return within 5 years.');
    return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, ctrl), h('div', { class: 'span-full' }, card(t('Résultat', 'Result'), {}, out)),
      card(t('Règles locales', 'Local rules'), { class: 'span-full' }, h('p', {}, note)), tips);
  }

  return h('div', { class: 'grid' },
    h('div', { class: 'span-full' }, ctrl),
    h('div', { class: 'span-full' }, card(t('Impôt de départ estimé', 'Estimated departure tax'), {}, out)),
    tips);
}
