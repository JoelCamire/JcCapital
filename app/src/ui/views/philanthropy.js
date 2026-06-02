import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, PALETTE } from '../charts.js';
import { charitableGift, bunchingStrategy, VEHICLES } from '../../engine/philanthropy.js';

export function render({ client, jur, navigate }) {
  const cur = jur.currency;
  let amount = 100000, acb = 30000;
  let marg = jur.country === 'US' ? 0.37 : jur.country === 'UK' ? 0.45 : 0.53;
  let donC = jur.country === 'US' ? 0.37 : jur.country === 'UK' ? 0.45 : 0.50;

  const giftBox = h('div', {});
  function drawGift() {
    const g = charitableGift(jur, { amount, costBasis: acb, marginalRate: marg, donationCredit: donC });
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
        [t('Montant du don', 'Gift amount'), money(amount, { currency: cur })],
        [t('Gain en capital latent', 'Latent capital gain'), money(g.gain, { currency: cur })],
        [t('Crédit d’impôt pour don', 'Charitable tax credit'), '− ' + money(g.credit, { currency: cur }), 'pos'],
        [t('Impôt sur gain si vendu', 'Gains tax if sold first'), money(g.capGainsTaxIfSold, { currency: cur }), 'neg'],
        [t('Coût net — don de titres', 'Net cost — securities gift'), money(g.securitiesNetCost, { currency: cur }), 'pos'],
        [t('Avantage vs vendre puis donner', 'Advantage vs sell-then-donate'), money(g.securitiesAdvantage, { currency: cur }), 'pos'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } }, g.note),
    );
  }
  drawGift();
  const giftCard = card(t('Don de titres cotés vs argent', 'Gift of securities vs cash'), { class: 'span-full',
    sub: t('Éliminer l’impôt sur le gain en capital tout en obtenant le crédit', 'Eliminate capital-gains tax while keeping the credit') },
    h('div', { class: 'grid cols-4' },
      slider({ label: t('Montant du don', 'Gift amount'), value: amount, min: 1000, max: 1000000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { amount = v; drawGift(); } }),
      slider({ label: t('Coût d’acquisition (PBR)', 'Cost basis (ACB)'), value: acb, min: 0, max: 1000000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { acb = v; drawGift(); } }),
      slider({ label: t('Taux marginal', 'Marginal rate'), value: marg, min: 0.2, max: 0.55, step: 0.01, format: v => pct(v, 0), onInput: v => { marg = v; drawGift(); } }),
      slider({ label: t('Crédit de don combiné', 'Combined donation credit'), value: donC, min: 0.2, max: 0.55, step: 0.01, format: v => pct(v, 0), onInput: v => { donC = v; drawGift(); } }),
    ),
    giftBox);

  // Bunching
  let bgift = 5000, byears = 5;
  const bunchBox = h('div', {});
  function drawBunch() {
    const b = bunchingStrategy({ annualGift: bgift, years: byears, donationCredit: donC, lowerRate: 0.20 });
    bunchBox.replaceChildren(statList([
      [t('Crédit si étalé', 'Credit if spread out'), money(b.spreadCredit, { currency: cur })],
      [t('Crédit si regroupé', 'Credit if bunched'), money(b.bunchedCredit, { currency: cur }), 'pos'],
      [t('Avantage du regroupement', 'Bunching advantage'), money(b.advantage, { currency: cur }), 'pos'],
    ]));
  }
  drawBunch();
  const bunchCard = card(t('Regroupement des dons (bunching)', 'Donation bunching'), {
    sub: t('Report des crédits sur 5 ans', 'Carry credits forward up to 5 years') },
    h('div', { class: 'grid cols-2' },
      slider({ label: t('Don annuel', 'Annual gift'), value: bgift, min: 500, max: 100000, step: 500, format: v => money(v, { currency: cur, compact: true }), onInput: v => { bgift = v; drawBunch(); } }),
      slider({ label: t('Années', 'Years'), value: byears, min: 2, max: 10, step: 1, format: v => `${v}`, onInput: v => { byears = v; drawBunch(); } }),
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
