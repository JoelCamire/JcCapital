import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, PALETTE } from '../charts.js';
import { charitableGift, bunchingStrategy, VEHICLES } from '../../engine/philanthropy.js';
import { donationCreditRate, donationLowRate } from '../../engine/flowthrough.js';
import { bracketMarginal } from '../../engine/tax.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';
import { store as appStore } from '../../state/store.js';

/** Value of a $1 gift as a tax reduction, from the jurisdiction's tables. */
function donationCreditFor(jur, prim) {
  if (jur.country === 'CA') return donationCreditRate(jur);
  // US: itemized deduction at the marginal bracket; UK: Gift Aid extends the basic-rate band (higher-rate relief)
  if (jur.country === 'US') return prim.marginal.ordinary;
  return prim.marginal.ordinary;
}

export function render({ store, client, jur, navigate }) {
  store = store || appStore;
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const prim = F.primary || { marginal: { ordinary: 0.5 }, ordinary: 0 };
  const isCA = jur.country === 'CA';

  const P = whatIf(client, 'philanthropy', {
    amount: 100000, acb: 30000,
    marg: Math.round(prim.marginal.ordinary * 100) / 100,
    donC: Math.round(donationCreditFor(jur, prim) * 1000) / 1000,
    bgift: 5000, byears: 5,
  });
  const setP = (k, v) => { P[k] = v; saveWhatIf(store, 'philanthropy', { [k]: v }); };

  const giftBox = h('div', {});
  function drawGift() {
    const g = charitableGift(jur, { amount: P.amount, costBasis: P.acb, marginalRate: P.marg, donationCredit: P.donC });
    giftBox.replaceChildren(
      h('div', { class: 'grid cols-3', style: { marginBottom: '10px' } },
        kpi({ label: t('Crédit pour don', 'Donation credit'), value: money(g.credit, { currency: cur, compact: true }), accent: 'var(--pos)' }),
        kpi({ label: t('Impôt sur gain évité (titres)', 'Gains tax avoided (securities)'), value: money(g.securitiesAdvantage, { currency: cur, compact: true }), accent: 'var(--pos)' }),
        kpi({ label: t('Coût net du don', 'Net cost of gift'), value: money(g.securitiesNetCost, { currency: cur, compact: true }) }),
      ),
      h('div', { html: barChart({
        xLabels: [t('Vendre puis donner l’argent', 'Sell then donate cash'), t('Donner les titres directement', 'Donate securities directly')],
        series: [{ color: PALETTE[5], values: [Math.round(g.cashNetCost + g.capGainsTaxIfSold), Math.round(g.securitiesNetCost)] }],
      }) }),
      statList([
        [t('Montant du don', 'Gift amount'), money(P.amount, { currency: cur })],
        [t('Gain en capital latent', 'Latent capital gain'), money(g.gain, { currency: cur })],
        [t(`Crédit d’impôt pour don (${pct(P.donC, 1)})`, `Charitable tax credit (${pct(P.donC, 1)})`), '− ' + money(g.credit, { currency: cur }), 'pos'],
        [t(`Impôt sur gain si vendu (inclusion ${pct(isCA ? jur.capGainsInclusion : 1, 0)} × ${pct(P.marg, 0)})`, `Gains tax if sold first (inclusion ${pct(isCA ? jur.capGainsInclusion : 1, 0)} × ${pct(P.marg, 0)})`), money(g.capGainsTaxIfSold, { currency: cur }), 'neg'],
        [t('Coût net — don de titres', 'Net cost — securities gift'), money(g.securitiesNetCost, { currency: cur }), 'pos'],
        [t('Avantage vs vendre puis donner', 'Advantage vs sell-then-donate'), money(g.securitiesAdvantage, { currency: cur }), 'pos'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } }, g.note),
    );
  }
  drawGift();
  const giftCard = card(t('Don de titres cotés vs argent', 'Gift of securities vs cash'), { class: 'span-full',
    sub: t(`Éliminer l’impôt sur le gain en capital tout en obtenant le crédit — taux marginal du dossier ${pct(prim.marginal.ordinary, 1)}, crédit de don ${pct(donationCreditFor(jur, prim), 1)} (${jur.regionName || jur.name}, ${jur.taxYear})`, `Eliminate capital-gains tax while keeping the credit — file marginal rate ${pct(prim.marginal.ordinary, 1)}, donation credit ${pct(donationCreditFor(jur, prim), 1)} (${jur.regionName || jur.name}, ${jur.taxYear})`) },
    h('div', { class: 'grid cols-4' },
      slider({ label: t('Montant du don', 'Gift amount'), value: P.amount, min: 1000, max: 1000000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('amount', v); drawGift(); } }),
      slider({ label: t('Coût d’acquisition (PBR)', 'Cost basis (ACB)'), value: P.acb, min: 0, max: 1000000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('acb', v); drawGift(); } }),
      slider({ label: t('Taux marginal (dérivé)', 'Marginal rate (derived)'), value: P.marg, min: 0.2, max: 0.55, step: 0.01, format: v => pct(v, 0), onInput: v => { setP('marg', v); drawGift(); drawBunch(); } }),
      slider({ label: t('Crédit de don combiné (barème)', 'Combined donation credit (table)'), value: P.donC, min: 0.2, max: 0.55, step: 0.005, format: v => pct(v, 1), onInput: v => { setP('donC', v); drawGift(); drawBunch(); } }),
    ),
    giftBox);

  // Bunching
  const bunchBox = h('div', {});
  function drawBunch() {
    const b = bunchingStrategy({ annualGift: P.bgift, years: P.byears, donationCredit: P.donC, lowerRate: isCA ? donationLowRate(jur) : P.donC }, jur);
    bunchBox.replaceChildren(statList([
      [t(`Première tranche (${money(b.firstTier, { currency: cur })}) au taux réduit`, `First tier (${money(b.firstTier, { currency: cur })}) at the low rate`), pct(b.lowerRate, 1)],
      [t('Crédit si étalé', 'Credit if spread out'), money(b.spreadCredit, { currency: cur })],
      [t('Crédit si regroupé', 'Credit if bunched'), money(b.bunchedCredit, { currency: cur }), 'pos'],
      [t('Avantage du regroupement', 'Bunching advantage'), money(b.advantage, { currency: cur }), 'pos'],
    ]));
  }
  drawBunch();
  const bunchCard = card(t('Regroupement des dons (bunching)', 'Donation bunching'), {
    sub: t('Report des crédits sur 5 ans — première tranche et taux tirés de la juridiction', 'Carry credits forward up to 5 years — first tier and rates from the jurisdiction') },
    h('div', { class: 'grid cols-2' },
      slider({ label: t('Don annuel', 'Annual gift'), value: P.bgift, min: 500, max: 100000, step: 500, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('bgift', v); drawBunch(); } }),
      slider({ label: t('Années', 'Years'), value: P.byears, min: 2, max: 10, step: 1, format: v => `${v}`, onInput: v => { setP('byears', v); drawBunch(); } }),
    ),
    bunchBox);

  const vehicles = card(t('Véhicules de don', 'Giving vehicles'), {},
    h('div', {}, ...VEHICLES().map(v => h('div', { style: { padding: '9px 0', borderBottom: '1px solid var(--border)' } },
      h('b', {}, v.name),
      h('div', { class: 'tiny', style: { color: 'var(--pos)' } }, '+ ' + v.pros),
      h('div', { class: 'tiny muted' }, '− ' + v.cons)))));

  return h('div', { class: 'grid' }, giftCard,
    h('div', { class: 'grid cols-2 span-full' }, bunchCard, vehicles),
    card(t('Conseil', 'Tip'), { class: 'span-full' }, h('p', { class: 'tiny muted', style: { margin: 0 } },
      t('Combinez avec le module Actions accréditives & PearTree pour amplifier l’efficacité, et avec l’assurance corporative (CDC) pour un legs philanthropique à faible coût.',
        'Combine with the Flow-through & PearTree module to amplify efficiency, and with corporate insurance (CDA) for a low-cost philanthropic legacy.'))),
  );
}
