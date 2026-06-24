// ============================================================
// Revenue reports — commissions & book economics across the book.
// By product type, by carrier, by renewal month, sales YTD.
// ============================================================
import { h, icon, money, num, t } from '../dom.js';
import { kpi, card } from '../widgets.js';
import { donutChart } from '../charts.js';
import { revenueReport } from '../../engine/crm.js';

const MONTHS = () => [t('Jan', 'Jan'), t('Fév', 'Feb'), t('Mar', 'Mar'), t('Avr', 'Apr'), t('Mai', 'May'), t('Juin', 'Jun'), t('Juil', 'Jul'), t('Août', 'Aug'), t('Sep', 'Sep'), t('Oct', 'Oct'), t('Nov', 'Nov'), t('Déc', 'Dec')];
const PALETTE = ['#C6AC8F', '#6E8CA0', '#8A6E4C', '#6F9461', '#B0573F', '#A98F70', '#4E6B74', '#C2922F', '#7A6855'];

export function render({ store }) {
  const r = revenueReport(store.state.clients);

  const kpis = h('div', { class: 'grid cols-4' },
    kpi({ label: t('Commissions récurrentes', 'Recurring commissions'), value: money(r.recurring, { compact: true }), sub: t('par année', 'per year'), iconName: 'dollar', accent: 'var(--pos)' }),
    kpi({ label: t('Actifs sous gestion', 'Assets under management'), value: money(r.aum, { compact: true }), iconName: 'bank' }),
    kpi({ label: t('Primes en vigueur', 'In-force premium'), value: money(r.annualPremium, { compact: true }), sub: t('par année', 'per year'), iconName: 'insurance' }),
    kpi({ label: t('Ventes gagnées (année)', 'Sales won (YTD)'), value: money(r.wonPremiumYTD + r.wonAumYTD, { compact: true }), sub: t(`${r.wonCountYTD} transaction(s)`, `${r.wonCountYTD} deal(s)`), iconName: 'funnel', accent: 'var(--c-gold)' }),
  );

  // by kind — donut on recurring
  const kindSegs = r.byKind.filter(k => k.recurring > 0).map((k, i) => ({ label: k.label, value: k.recurring, color: PALETTE[i % PALETTE.length] }));
  const byKindCard = card(t('Commissions par type de produit', 'Commissions by product type'), { sub: t('Récurrent annuel', 'Annual recurring') },
    h('div', { class: 'grid cols-2', style: { alignItems: 'center' } },
      kindSegs.length ? h('div', { style: { display: 'grid', placeItems: 'center' } },
        donutChart({ segments: kindSegs, size: 180, thickness: 26, centerLabel: money(r.recurring, { compact: true }), centerSub: t('par an', 'per yr') })) : h('div', { class: 'empty tiny' }, t('Aucune donnée', 'No data')),
      h('div', {}, ...r.byKind.map((k, i) => h('div', { class: 'flex between center', style: { padding: '6px 0', borderBottom: '1px solid var(--border)' } },
        h('span', { class: 'inline', style: { gap: '7px' } }, h('i', { style: { width: '10px', height: '10px', borderRadius: '3px', background: PALETTE[i % PALETTE.length], display: 'inline-block' } }), h('span', { class: 'tiny' }, `${k.label} (${k.count})`)),
        h('b', { class: 'mono tiny' }, money(k.recurring, { compact: true })))))),
  );

  // by carrier table
  const byCarrierCard = card(t('Par assureur / firme', 'By carrier / firm'), { sub: `${r.byCarrier.length}` },
    r.byCarrier.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, t('Assureur', 'Carrier')), h('th', { class: 'num' }, t('Produits', 'Products')),
        h('th', { class: 'num' }, 'AUM'), h('th', { class: 'num' }, t('Récurrent', 'Recurring')))),
      h('tbody', {}, ...r.byCarrier.map(cr => h('tr', {},
        h('td', {}, cr.carrier), h('td', { class: 'num mono' }, num(cr.count)),
        h('td', { class: 'num mono' }, money(cr.aum, { compact: true })),
        h('td', { class: 'num mono' }, money(cr.recurring, { compact: true })))))),
    ) : h('div', { class: 'empty tiny' }, t('Aucun produit', 'No products')));

  // renewals by month
  const maxM = Math.max(1, ...r.byMonth.map(m => m.recurring));
  const monthCard = card(t('Renouvellements par mois', 'Renewals by month'), { sub: t('Commissions récurrentes attendues', 'Expected recurring commissions') },
    h('div', {}, ...r.byMonth.map((m, i) => h('div', { style: { margin: '7px 0' } },
      h('div', { class: 'flex between', style: { marginBottom: '3px' } }, h('span', { class: 'tiny' }, MONTHS()[i]), h('span', { class: 'tiny muted mono' }, money(m.recurring, { compact: true }))),
      h('div', { class: 'bar' }, h('span', { style: { width: `${Math.round(m.recurring / maxM * 100)}%`, background: 'var(--c-gold)' } }))))),
  );

  if (!r.byKind.length) {
    return h('div', {}, kpis, h('div', { class: 'card empty', style: { marginTop: '18px' } }, h('div', { class: 'big' }, '💰'),
      t('Ajoutez des produits/polices aux fiches pour voir vos revenus ici', 'Add products/policies to contacts to see your revenue here')));
  }
  return h('div', { class: 'grid', style: { gap: '18px' } },
    kpis,
    h('div', { class: 'grid cols-2' }, byKindCard, byCarrierCard),
    monthCard,
  );
}
