import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, lineChart, PALETTE } from '../charts.js';
import { computeTax } from '../../engine/tax.js';
import { flowThroughInvestment, peartreeDonation, provExploration, donationCreditRate } from '../../engine/flowthrough.js';

export function render({ client, jur, navigate }) {
  const cur = jur.currency;
  const isCA = jur.country === 'CA';

  // Defaults tied to the jurisdiction
  let amount = 100000;
  let m = Math.round(computeTax(jur, { ordinary: 250000 }).marginalRate * 100) / 100;
  let provC = provExploration(jur.region);
  let donC = donationCreditRate(jur.region);
  let liq = 0.12;

  const out = h('div', { class: 'grid', style: { gridColumn: '1 / -1' } });

  function draw() {
    if (!isCA) { out.replaceChildren(analogCard()); return; }
    const inv = flowThroughInvestment({ amount, marginalRate: m, provCredit: provC });
    const pt = peartreeDonation({ amount, marginalRate: m, donationCredit: donC, provCredit: provC, liquidityDiscount: liq });

    out.replaceChildren(
      h('div', { class: 'grid cols-4 span-full' },
        kpi({ label: t('Investissement', 'Investment'), value: money(amount, { currency: cur, compact: true }), iconName: 'briefcase' }),
        kpi({ label: t('Coût net après impôt (détention)', 'Net after-tax cost (hold)'), value: money(inv.netCostAfterTax, { currency: cur, compact: true }),
          sub: pct(inv.effectiveCostPct, 0) + t(' du capital', ' of capital') }),
        kpi({ label: t('Don PearTree — coût net', 'PearTree gift — net cost'), value: money(pt.netCost, { currency: cur, compact: true }),
          accent: pt.netCost <= 0 ? 'var(--pos)' : 'var(--warn)', sub: t('par $ donné ', 'per $ given ') + pt.costPerDollar.toFixed(2) + ' $' }),
        kpi({ label: t('Avantage vs don en argent', 'Advantage vs cash gift'), value: money(pt.advantageVsCash, { currency: cur, compact: true }), accent: 'var(--pos)' }),
      ),

      // PearTree donation breakdown
      card(t('Méthode PearTree — don d’actions accréditives', 'PearTree method — flow-through share donation'), {
        sub: t('Empile la déduction d’exploration, le CIEM, le crédit de don et l’exonération du gain', 'Stacks the exploration deduction, METC, donation credit and gains exemption') },
        h('div', { html: barChart({
          xLabels: [t('Don PearTree', 'PearTree gift'), t('Don en argent', 'Cash gift')],
          series: [{ color: PALETTE[1], values: [Math.round(Math.max(0, pt.netCost)), Math.round(pt.cashGiftNetCost)] }],
        }) }),
        h('div', { class: 'sep' }),
        statList([
          [t('Montant du don (reçu)', 'Gift amount (receipt)'), money(amount, { currency: cur })],
          [t('Déduction CEE (exploration)', 'CEE deduction (exploration)'), '− ' + money(pt.ceeSaving, { currency: cur }), 'pos'],
          [t('CIEM net (crédit minier)', 'Net METC (mining credit)'), '− ' + money(pt.netMetc, { currency: cur }), 'pos'],
          [t('Crédit pour don de bienfaisance', 'Charitable donation credit'), '− ' + money(pt.donationSaving, { currency: cur }), 'pos'],
          [t('Gain en capital évité (don de titres)', 'Capital gain avoided (gift of securities)'), '− ' + money(pt.capGainsAvoided, { currency: cur }), 'pos'],
          [t('Coût de liquidité / structuration', 'Liquidity / structuring cost'), '+ ' + money(pt.liquidityCost, { currency: cur }), 'neg'],
          [t('= Coût net du don', '= Net cost of the gift'), money(pt.netCost, { currency: cur }), pt.netCost <= 0 ? 'pos' : 'neg'],
        ]),
        h('p', { class: 'tiny muted', style: { marginTop: '10px' } }, pt.note),
      ),

      // Straight investment
      card(t('Investissement accréditif (détention)', 'Flow-through investment (held)'), { class: '',
        sub: t('Actions minières d’exploration conservées', 'Mining exploration shares held') },
        statList([
          [t('Déduction CEE (100 %)', 'CEE deduction (100%)'), money(inv.ceeDeduction, { currency: cur })],
          [t('Économie d’impôt CEE', 'CEE tax saving'), money(inv.ceeSaving, { currency: cur }), 'pos'],
          [t('CIEM net', 'Net METC'), money(inv.netMetc, { currency: cur }), 'pos'],
          [t('Coût net après impôt', 'Net after-tax cost'), money(inv.netCostAfterTax, { currency: cur })],
          [t('PBR des actions', 'Share ACB'), money(0, { currency: cur })],
          [t('Valeur de revente requise (seuil)', 'Break-even resale value'), money(inv.breakEven, { currency: cur }), 'warn'],
        ]),
        h('p', { class: 'tiny muted', style: { marginTop: '10px' } },
          t('Le PBR tombe à 0 $ : toute la revente est un gain en capital. Le placement comporte un risque de marché (exploration minière) — le rabais fiscal compense une partie de la baisse.',
            'ACB drops to $0: the entire resale is a capital gain. The investment carries market risk (mining exploration) — the tax break offsets part of any decline.')),
      ),

      strategyCard(),
    );
  }

  function strategyCard() {
    return card(t('Comment ça fonctionne & mises en garde', 'How it works & cautions'), { class: 'span-full' },
      h('div', { class: 'grid cols-2' },
        h('div', {}, ...[
          [t('Actions accréditives', 'Flow-through shares'), t('Une société minière renonce à ses frais d’exploration (FEC) en faveur de l’investisseur, qui les déduit à 100 %. Le CIEM fédéral (15 %) et les crédits provinciaux s’ajoutent.', 'A mining company renounces its exploration expenses (CEE) to the investor, who deducts them 100 %. The federal METC (15 %) and provincial credits stack on top.')],
          [t('Méthode PearTree (don)', 'PearTree method (gift)'), t('L’investisseur souscrit puis donne immédiatement les actions cotées à une œuvre de bienfaisance : crédit de don + aucune imposition du gain (don de titres) + déductions d’exploration. Le coût net du don peut approcher zéro en tranche supérieure.', 'The investor subscribes then immediately gifts the listed shares to a charity: donation credit + no tax on the gain (gift of securities) + exploration deductions. Net cost of the gift can approach zero in the top bracket.')],
        ].map(([ti, tx]) => h('div', { style: { padding: '9px 0', borderBottom: '1px solid var(--border)' } }, h('b', {}, ti), h('div', { class: 'tiny muted' }, tx)))),
        h('div', {}, ...[
          [t('Risques & ARC', 'Risks & CRA'), t('Risque de marché élevé (exploration). L’ARC scrute les structures de don agressives ; le montant admissible du don peut être réduit par tout « avantage ». Avis fiscal et juridique requis.', 'High market risk (exploration). The CRA scrutinizes aggressive donation structures; the eligible gift amount may be reduced by any “advantage”. Tax and legal advice required.')],
          [t('Profil visé', 'Target profile'), t('Contribuables en tranche d’imposition élevée avec un revenu imposable suffisant pour absorber les déductions, à l’aise avec le risque et la philanthropie.', 'High-bracket taxpayers with enough taxable income to absorb the deductions, comfortable with risk and philanthropy.')],
        ].map(([ti, tx]) => h('div', { style: { padding: '9px 0', borderBottom: '1px solid var(--border)' } }, h('b', {}, ti), h('div', { class: 'tiny muted' }, tx)))),
      ));
  }

  function analogCard() {
    const txt = jur.country === 'US'
      ? t('Les actions accréditives sont une stratégie canadienne. Équivalents américains : zones d’opportunité qualifiées (QOZ) — report et exonération des gains après 10 ans — et l’exclusion §1202 (QSBS).', 'Flow-through shares are a Canadian strategy. US equivalents: Qualified Opportunity Zones (QOZ) — gain deferral and tax-free appreciation after 10 years — and the §1202 (QSBS) exclusion.')
      : t('Les actions accréditives sont une stratégie canadienne. Équivalents britanniques : EIS (30 % de dégrèvement) et SEIS (50 %), avec report et exonération des gains.', 'Flow-through shares are a Canadian strategy. UK equivalents: EIS (30 % relief) and SEIS (50 %), with gain deferral and exemption.');
    const relief = jur.country === 'UK' ? amount * 0.30 : 0;
    return card(t('Stratégie locale équivalente', 'Local equivalent strategy'), { class: 'span-full' },
      h('p', {}, txt),
      jur.country === 'UK' ? statList([[t('Dégrèvement EIS estimé (30 %)', 'Estimated EIS relief (30 %)'), money(relief, { currency: cur }), 'pos']]) : null,
    );
  }

  const ctrl = card(t('Paramètres', 'Parameters'), { sub: t('Actions accréditives minières & don PearTree', 'Mining flow-through shares & PearTree gift') },
    h('div', { class: 'grid cols-3' },
      slider({ label: t('Montant', 'Amount'), value: amount, min: 10000, max: 1000000, step: 10000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { amount = v; draw(); } }),
      slider({ label: t('Taux marginal', 'Marginal rate'), value: m, min: 0.2, max: 0.55, step: 0.01, format: v => pct(v, 0), onInput: v => { m = v; draw(); } }),
      isCA ? slider({ label: t('Crédit d’exploration provincial', 'Provincial exploration credit'), value: provC, min: 0, max: 0.4, step: 0.01, format: v => pct(v, 0), onInput: v => { provC = v; draw(); } }) : h('div'),
      isCA ? slider({ label: t('Crédit de don combiné', 'Combined donation credit'), value: donC, min: 0.3, max: 0.55, step: 0.01, format: v => pct(v, 0), onInput: v => { donC = v; draw(); } }) : h('div'),
      isCA ? slider({ label: t('Coût de liquidité / structuration', 'Liquidity / structuring cost'), value: liq, min: 0, max: 0.3, step: 0.01, format: v => pct(v, 0), onInput: v => { liq = v; draw(); } }) : h('div'),
    ));

  draw();
  return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, ctrl), out);
}
