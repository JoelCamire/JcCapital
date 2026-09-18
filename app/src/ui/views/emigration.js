import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, PALETTE } from '../charts.js';
import { departureTax, arrivalStepUp } from '../../engine/emigration.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';
import { store as appStore } from '../../state/store.js';

export function render({ store, client, jur }) {
  store = store || appStore;
  const cur = jur.currency;
  const isCA = jur.country === 'CA';
  const F = clientFacts(client, jur);
  const prim = F.primary || { age: 45, ordinary: 0, marginal: { ordinary: 0.5 } };

  // Seeded from the file: taxable portfolio value & actual cost basis, real estate, registered
  // balances, business value; marginal rate = full ordinary marginal (the engine applies inclusion).
  const P = whatIf(client, 'emigration', {
    portfolioFMV: Math.round(F.buckets.taxable),
    portfolioACB: Math.round(F.buckets.basisTaxable),
    realEstateFMV: Math.round(F.buckets.realestate),
    rrspValue: Math.round(F.buckets.deferred),
    privateCoFMV: F.business ? Math.round(F.business.value || 0) : 0,
    privateCoACB: F.business ? Math.round(F.business.sale?.acb || 0) : 0,
    marginalRate: Math.round(prim.marginal.ordinary * 100) / 100,
  });
  const setP = (k, v) => { P[k] = v; saveWhatIf(store, 'emigration', { [k]: v }); };
  const params = () => ({ ...P, otherIncome: prim.ordinary, age: prim.age });

  const out = h('div', {});
  function draw() {
    const d = departureTax(params(), jur);
    const methodLabel = d.method === 'exact'
      ? t(`Calcul exact — gain empilé sur ${money(prim.ordinary, { currency: cur, compact: true })} d’autres revenus (${jur.taxYear})`, `Exact calculation — gain stacked on ${money(prim.ordinary, { currency: cur, compact: true })} of other income (${jur.taxYear})`)
      : t(`Approximation au taux marginal ${pct(P.marginalRate, 0)}`, `Approximation at the ${pct(P.marginalRate, 0)} marginal rate`);
    out.replaceChildren(
      h('div', { class: 'grid cols-4', style: { marginBottom: '12px' } },
        kpi({ label: t('Gain réputé au départ', 'Deemed gain at departure'), value: money(d.deemedGain, { currency: cur, compact: true }) }),
        kpi({ label: t('Impôt de départ', 'Departure tax'), value: money(d.tax, { currency: cur, compact: true }), accent: 'var(--neg)', sub: methodLabel }),
        kpi({ label: t('Taux effectif sur le gain', 'Effective rate on the gain'), value: pct(d.effectiveRateOnGain, 1), sub: t(`inclusion ${pct(d.inclusion, 0)}`, `inclusion ${pct(d.inclusion, 0)}`) }),
        kpi({ label: t('Exclu de l’impôt de départ', 'Excluded from departure tax'), value: money(d.excludedFromDeparture, { currency: cur, compact: true }), accent: 'var(--pos)' }),
      ),
      h('div', { html: barChart({
        xLabels: [t('Gain imposable', 'Taxable gain'), t('Exclu (immo + REER)', 'Excluded (real estate + RRSP)')],
        series: [{ color: PALETTE[4], values: [Math.round(d.taxableGain), 0] }, { color: PALETTE[1], values: [0, Math.round(d.excludedFromDeparture)] }],
      }) }),
      statList([
        [t('Portefeuille non enregistré (JVM)', 'Non-registered portfolio (FMV)'), money(P.portfolioFMV, { currency: cur })],
        [t('Portefeuille — gain latent', 'Portfolio — latent gain'), money(Math.max(0, P.portfolioFMV - P.portfolioACB), { currency: cur })],
        [t('Actions de société privée (gain)', 'Private company shares (gain)'), money(Math.max(0, P.privateCoFMV - P.privateCoACB), { currency: cur })],
        [t('Gain en capital réputé total', 'Total deemed capital gain'), money(d.deemedGain, { currency: cur })],
        [t(`Portion imposable (${pct(d.inclusion, 0)})`, `Taxable portion (${pct(d.inclusion, 0)})`), money(d.taxableGain, { currency: cur })],
        [t('Méthode', 'Method'), d.method === 'exact' ? t('Exacte (moteur fiscal)', 'Exact (tax engine)') : t('Taux marginal', 'Marginal rate')],
        [t('Impôt de départ estimé', 'Estimated departure tax'), money(d.tax, { currency: cur }), 'neg'],
        [t('Immobilier canadien (exclu)', 'Canadian real estate (excluded)'), money(P.realEstateFMV, { currency: cur }), 'pos'],
        [t('REER / FERR (exclu, imposé au retrait)', 'RRSP/RRIF (excluded, taxed on withdrawal)'), money(P.rrspValue, { currency: cur }), 'pos'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '10px' } }, d.note),
    );
  }
  draw();

  const ctrl = card(t('Actifs au moment du départ', 'Assets at time of departure'), {
    sub: t(`Disposition réputée à la juste valeur marchande — valeurs et coûts tirés des comptes du dossier (PBR imposable ${money(F.buckets.basisTaxable, { currency: cur, compact: true })})`, `Deemed disposition at fair market value — values and cost from the accounts on file (taxable ACB ${money(F.buckets.basisTaxable, { currency: cur, compact: true })})`) },
    h('div', { class: 'grid cols-3' },
      slider({ label: t('Portefeuille non enregistré (JVM)', 'Non-reg portfolio (FMV)'), value: P.portfolioFMV, min: 0, max: 10000000, step: 50000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('portfolioFMV', v); draw(); } }),
      slider({ label: t('Coût du portefeuille (PBR)', 'Portfolio cost (ACB)'), value: P.portfolioACB, min: 0, max: 10000000, step: 50000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('portfolioACB', v); draw(); } }),
      slider({ label: t('Actions de société privée (JVM)', 'Private company shares (FMV)'), value: P.privateCoFMV, min: 0, max: 20000000, step: 100000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('privateCoFMV', v); draw(); } }),
      slider({ label: t('Actions de société privée (PBR)', 'Private company shares (ACB)'), value: P.privateCoACB, min: 0, max: 5000000, step: 25000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('privateCoACB', v); draw(); } }),
      slider({ label: t('Immobilier canadien (JVM)', 'Canadian real estate (FMV)'), value: P.realEstateFMV, min: 0, max: 10000000, step: 50000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('realEstateFMV', v); draw(); } }),
      slider({ label: t('REER / FERR', 'RRSP/RRIF'), value: P.rrspValue, min: 0, max: 5000000, step: 25000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('rrspValue', v); draw(); } }),
      slider({ label: t('Taux marginal ordinaire (repli si calcul exact indisponible)', 'Ordinary marginal rate (fallback when exact calc unavailable)'), value: P.marginalRate, min: 0.2, max: 0.55, step: 0.01, format: v => pct(v, 0), onInput: v => { setP('marginalRate', v); draw(); } }),
    ));

  const tips = card(t('Points clés & arrivée', 'Key points & arrival'), { class: 'span-full' },
    h('div', { class: 'grid cols-2' }, ...[
      [t('Report du paiement', 'Payment deferral'), t('On peut reporter le paiement de l’impôt de départ sans intérêt en fournissant une garantie acceptable à l’ARC (formulaire T1244).', 'You can defer paying the departure tax interest-free by posting acceptable security with the CRA (Form T1244).')],
      [t('Majoration à l’arrivée', 'Step-up on arrival'), arrivalStepUp(P.portfolioFMV).note],
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
