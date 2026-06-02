// ============================================================
// Crypto & alternative assets view
// ============================================================
import { h, money, pct, num, icon, toast, t } from '../dom.js';
import { kpi, card, slider, statList, legend, dataTable } from '../widgets.js';
import { donutChart, PALETTE } from '../charts.js';
import { formModal } from '../editor.js';
import { store } from '../../state/store.js';
import { portfolioSummary, dispositionTax, typeLabel } from '../../engine/crypto.js';

// ---- default holdings shown before any user edits ----
const DEFAULT_HOLDINGS = [
  { id: 'btc_1', name: 'Bitcoin',          symbol: 'BTC', quantity: 0.25,  priceNow: 90000,  costBasis: 15000, type: 'crypto'  },
  { id: 'eth_1', name: 'Ethereum',          symbol: 'ETH', quantity: 2.0,   priceNow: 3200,   costBasis: 4800,  type: 'crypto'  },
  { id: 'prv_1', name: 'Fonds privé tech',  symbol: '',    quantity: 1,     priceNow: 25000,  costBasis: 20000, type: 'private' },
];

// ---- type selector options ----
function typeOpts() {
  return [
    { value: 'crypto',      label: t('Cryptomonnaie', 'Cryptocurrency') },
    { value: 'private',     label: t('Placement priv’', 'Private investment') },
    { value: 'collectible', label: t('Collection', 'Collectible') },
    { value: 'commodity',   label: t('Matière première', 'Commodity') },
    { value: 'other',       label: t('Autre', 'Other') },
  ];
}

// ---- color palette per type ----
const TYPE_COLORS = {
  crypto:      PALETTE[0],
  private:     PALETTE[2],
  collectible: PALETTE[4],
  commodity:   PALETTE[3],
  other:       PALETTE[7],
};
function typeColor(type) { return TYPE_COLORS[type] || PALETTE[8]; }

export function render({ store: storeArg, client, jur }) {
  const cur = jur.currency;

  // Load local state — never mutate during render
  const cr = (client.crypto && Array.isArray(client.crypto.holdings) && client.crypto.holdings.length)
    ? client.crypto
    : { holdings: DEFAULT_HOLDINGS.map(h => ({ ...h })) };

  const holdings = cr.holdings;
  const summary  = portfolioSummary(holdings);

  // Total net worth: existing assets + alt assets (defensive sum)
  const assetsTotal = Array.isArray(client.assets)
    ? client.assets.reduce((s, a) => s + (a.value || 0), 0)
    : 0;
  const networthTotal = assetsTotal + summary.total;
  const networthPct = networthTotal > 0 ? summary.total / networthTotal : 0;

  // Estimated tax at disposition (use first member marginal rate, default 40%)
  const marginalRate = (client.taxProfile && client.taxProfile.marginalRate != null)
    ? client.taxProfile.marginalRate : 0.40;
  const dispEst = dispositionTax(jur, {
    proceeds: summary.total,
    costBasis: summary.totalCost,
    marginalRate,
    asBusinessIncome: false,
  });

  // ---- KPI row ----
  const kpiRow = h('div', { class: 'grid cols-4 span-full' },
    kpi({
      label: t('Valeur totale — actifs alternatifs', 'Total alt-asset value'),
      value: money(summary.total, { currency: cur, compact: true }),
      iconName: 'pie',
    }),
    kpi({
      label: t('Plus-value latente', 'Unrealized gain'),
      value: money(summary.unrealizedGain, { currency: cur, compact: true }),
      iconName: summary.unrealizedGain >= 0 ? 'up' : 'down',
      accent: summary.unrealizedGain >= 0 ? 'var(--pos)' : 'var(--neg)',
    }),
    kpi({
      label: t('Part de la valeur nette', '% of net worth'),
      value: pct(networthPct),
      iconName: 'networth',
    }),
    kpi({
      label: t('Impôt estimé si cession', 'Est. tax if sold now'),
      value: money(dispEst.tax, { currency: cur, compact: true }),
      iconName: 'tax',
      accent: 'var(--neg)',
    }),
  );

  // ---- Portfolio card ----
  const donutSegs = summary.allocation.map((a) => ({
    label: a.label,
    value: a.value,
    color: typeColor(a.type),
  }));

  const portfolioCard = card(
    t('Portefeuille d’actifs alternatifs', 'Alternative asset portfolio'),
    {
      class: 'span-full',
      sub: t('Répartition et détail des positions', 'Allocation and position detail'),
      right: h('button', {
        class: 'btn primary sm',
        html: icon('plus', 14) + ' ' + t('Ajouter', 'Add'),
        onClick: () => editHolding({ id: '', name: '', symbol: '', quantity: 0, priceNow: 0, costBasis: 0, type: 'crypto' }, true),
      }),
    },
    donutSegs.length
      ? h('div', { class: 'flex center', style: { justifyContent: 'center', flexWrap: 'wrap', gap: '24px' } },
          h('div', { html: donutChart({
            segments: donutSegs,
            size: 200,
            centerLabel: money(summary.total, { currency: cur, compact: true }),
            centerSub: t('total', 'total'),
          }) }),
          legend(donutSegs.map(s => ({
            color: s.color,
            label: s.label + ' · ' + money(s.value, { currency: cur, compact: true }),
          }))),
        )
      : null,
    h('div', { class: 'sep' }),
    dataTable({
      rows: holdings,
      empty: t('Aucune position', 'No positions'),
      cols: [
        { key: 'name',   label: t('Nom', 'Name') },
        { key: 'symbol', label: t('Symbole', 'Symbol') },
        { key: 'type',   label: 'Type', fmt: (v) => typeLabel(v) },
        { key: 'quantity', label: t('Qté', 'Qty'), num: true, fmt: (v) => num(v, 4) },
        { key: 'priceNow', label: t('Prix actuel', 'Price'), num: true, fmt: (v) => money(v, { currency: cur }) },
        {
          key: '_value', label: t('Valeur', 'Value'), num: true,
          fmt: (_, row) => money((row.quantity || 0) * (row.priceNow || 0), { currency: cur }),
        },
        { key: 'costBasis', label: t('Coût total', 'Cost basis'), num: true, fmt: (v) => money(v, { currency: cur }) },
        {
          key: '_gain', label: t('G/P latent', 'Unr. G/L'), num: true,
          fmt: (_, row) => {
            const g = (row.quantity || 0) * (row.priceNow || 0) - (row.costBasis || 0);
            return h('span', { style: { color: g >= 0 ? 'var(--pos)' : 'var(--neg)' } }, money(g, { currency: cur }));
          },
        },
      ],
      onEdit:   (row) => editHolding(row, false),
      onDelete: (row) => {
        store.update(c => {
          c.crypto = c.crypto || {};
          c.crypto.holdings = holdings.filter(x => x.id !== row.id);
        });
        toast(t('Position supprimée', 'Position removed'));
      },
    }),
  );

  // ---- Disposition & tax card ----
  let dispProceeds  = summary.total;
  let dispCostBasis = summary.totalCost;
  let dispBusiness  = false;
  const dispOut = h('div', {});

  function redrawDisp() {
    const d = dispositionTax(jur, {
      proceeds: dispProceeds,
      costBasis: dispCostBasis,
      marginalRate,
      asBusinessIncome: dispBusiness && jur.country === 'CA',
    });
    dispOut.replaceChildren(
      statList([
        [t('Produit de cession', 'Proceeds'),                money(dispProceeds, { currency: cur })],
        [t('Prix de base rajusté', 'Cost basis'),             money(dispCostBasis, { currency: cur })],
        [t('Gain ou perte', 'Gain / loss'),                   money(d.gain, { currency: cur }), d.gain >= 0 ? 'pos' : 'neg'],
        [t('Traitement fiscal', 'Tax treatment'),             d.treatment],
        [t('Portion imposable', 'Taxable portion'),           money(d.taxableGain, { currency: cur })],
        [t('Taux marginal appliqué', 'Marginal rate applied'), pct(marginalRate)],
        [t('Impôt estimé', 'Estimated tax'),                  money(d.tax, { currency: cur }), 'neg'],
        [t('Produit net après impôt', 'Net after tax'),       money(d.net, { currency: cur }), 'pos'],
      ])
    );
  }

  const dispCard = card(
    t('Disposition et impôt', 'Disposition & tax'),
    { sub: t('Simulateur de cession — gain ou perte', 'Disposition simulator — gain or loss') },
    h('div', { class: 'grid cols-2' },
      slider({
        label: t('Produit de cession', 'Proceeds'),
        value: dispProceeds,
        min: 0,
        max: Math.max(summary.total * 3, 100000),
        step: 500,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { dispProceeds = v; redrawDisp(); },
      }),
      slider({
        label: t('Prix de base rajusté (PBR)', 'Adjusted cost base (ACB)'),
        value: dispCostBasis,
        min: 0,
        max: Math.max(summary.total * 3, 100000),
        step: 500,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { dispCostBasis = v; redrawDisp(); },
      }),
    ),
    jur.country === 'CA'
      ? h('div', { class: 'field', style: { marginBottom: '8px' } },
          h('label', { class: 'inline', style: { gap: '8px', display: 'flex', alignItems: 'center' } },
            h('input', {
              type: 'checkbox',
              style: { width: 'auto' },
              onChange: e => { dispBusiness = e.target.checked; redrawDisp(); },
            }),
            h('span', { class: 'tiny muted' },
              t('Négociation active — revenu d’entreprise (100 % imposable)', 'Active trading — business income (100% taxable)'),
            ),
          ),
        )
      : null,
    h('div', { class: 'sep' }),
    dispOut,
  );

  // ---- Fiscal rules & risks card ----
  const rulesCard = card(
    t('Règles fiscales et risques', 'Tax rules & risks'),
    { sub: t('Résumé par juridiction et mise en garde', 'Summary by jurisdiction and caution') },
    h('div', { class: 'grid cols-2 span-full', style: { gap: '24px' } },
      h('div', {},
        h('div', { class: 'flex', style: { alignItems: 'center', gap: '8px', marginBottom: '10px' } },
          h('span', { html: icon('tax', 16) }),
          h('b', {}, t('Canada', 'Canada')),
        ),
        statList([
          [
            t('Traitement par défaut', 'Default treatment'),
            t('Gain en capital (50 % inclusion)', 'Capital gain (50% inclusion)'),
          ],
          [
            t('Négociation active', 'Active trading'),
            t('Revenu d’entreprise — 100 % imposable', 'Business income — 100% taxable'),
          ],
          [
            t('Perte apparente', 'Superficial loss'),
            t('Rachat dans 30 j avant/après — perte refusée', 'Repurchased within 30 d before/after — loss denied'),
          ],
          [
            t('CELI', 'TFSA'),
            t('Détention directe de crypto non permise', 'Direct crypto holding not allowed'),
          ],
          [
            t('Tenue de registres PBR', 'ACB record-keeping'),
            t('Obligatoire pour chaque transaction', 'Required for every transaction'),
          ],
        ]),
      ),
      h('div', {},
        h('div', { class: 'flex', style: { alignItems: 'center', gap: '8px', marginBottom: '10px' } },
          h('span', { html: icon('globe', 16) }),
          h('b', {}, t('États-Unis et Royaume-Uni', 'United States and United Kingdom')),
        ),
        statList([
          [
            'USA — Wash-sale',
            t('Ne s’applique pas aux cryptos actuellement', 'Does not apply to crypto currently'),
          ],
          [
            t('USA — Durée de détention', 'USA — Holding period'),
            t('Court terme vs long terme — taux différents', 'Short-term vs long-term — different rates'),
          ],
          [
            t('USA — Staking et minage', 'USA — Staking and mining'),
            t('Revenu ordinaire à la réception', 'Ordinary income at receipt'),
          ],
          [
            t('USA — Chaque transaction', 'USA — Every transaction'),
            t('Imposable : échange, vente, achat', 'Taxable: swap, sale, purchase'),
          ],
          [
            t('UK — Regroupement art. 104', 'UK — Section 104 pooling'),
            t('CGT sur cessions; règle de regroupement', 'CGT on dispositions; pooling rule applies'),
          ],
        ]),
        h('div', { class: 'sep' }),
        h('div', { class: 'flex', style: { gap: '8px', alignItems: 'flex-start' } },
          h('span', { html: icon('warning', 15), style: { color: 'var(--neg)', flexShrink: '0', marginTop: '2px' } }),
          h('span', { class: 'tiny muted' },
            t(
              'Mise en garde : les cryptomonnaies et actifs alternatifs sont hautement volatils. '
              + 'Conservez vos clés privées en lieu sûr et consultez un fiscaliste avant toute transaction importante.',
              'Caution: cryptocurrencies and alternative assets are highly volatile. '
              + 'Keep your private keys secure and consult a tax professional before any significant transaction.',
            ),
          ),
        ),
      ),
    ),
  );

  // ---- assemble ----
  redrawDisp();
  return h('div', { class: 'grid' },
    kpiRow,
    portfolioCard,
    h('div', { class: 'span-full' }, dispCard),
    h('div', { class: 'span-full' }, rulesCard),
  );

  // ---- inner helpers ----

  function editHolding(item, isNew) {
    const draft = isNew
      ? { id: Math.random().toString(36).slice(2, 10), name: '', symbol: '', quantity: 0, priceNow: 0, costBasis: 0, type: 'crypto' }
      : { ...item };
    formModal({
      title: isNew ? t('Nouvel actif alternatif', 'New alternative asset') : t('Modifier la position', 'Edit position'),
      item: draft,
      fields: [
        { key: 'name',      label: t('Nom', 'Name'),             type: 'text',   span: 2 },
        { key: 'symbol',    label: t('Symbole', 'Symbol'),       type: 'text' },
        { key: 'type',      label: 'Type',                       type: 'select', opts: typeOpts() },
        { key: 'quantity',  label: t('Quantité', 'Quantity'),    type: 'number', step: 0.0001 },
        { key: 'priceNow',  label: t('Prix unitaire (' + cur + ')', 'Unit price (' + cur + ')'), type: 'number' },
        { key: 'costBasis', label: t('Coût total PBR (' + cur + ')', 'Total cost basis (' + cur + ')'), type: 'number',
          hint: t('Montant total payé incluant frais', 'Total amount paid including fees') },
      ],
      onSave: (d) => {
        store.update(c => {
          c.crypto = c.crypto || {};
          const base = (c.crypto.holdings && c.crypto.holdings.length) ? c.crypto.holdings : holdings.slice();
          c.crypto.holdings = isNew ? [...base, d] : base.map(x => x.id === d.id ? d : x);
        });
        toast(isNew ? t('Position ajoutée', 'Position added') : t('Position mise à jour', 'Position updated'));
      },
    });
  }
}
