// ============================================================
// Revenue reports — commissions & book economics across the book.
// By product type, by carrier, by renewal month, sales YTD.
// ============================================================
import { h, icon, money, num, t, toast, fmtDate, modal, field } from '../dom.js';
import { kpi, card } from '../widgets.js';
import { donutChart } from '../charts.js';
import { revenueReport } from '../../engine/crm.js';

function goalRow(label, actual, target) {
  const pct = target > 0 ? Math.min(1, actual / target) : 0;
  return h('div', { style: { margin: '10px 0' } },
    h('div', { class: 'flex between', style: { marginBottom: '4px' } },
      h('span', { class: 'tiny', style: { fontWeight: '600' } }, label),
      h('span', { class: 'tiny muted mono' }, `${money(actual, { compact: true })} / ${target > 0 ? money(target, { compact: true }) : '—'}`)),
    h('div', { class: 'bar' }, h('span', { style: { width: `${Math.round(pct * 100)}%`, background: pct >= 1 ? 'var(--pos)' : 'var(--c-gold)' } })),
    target > 0 ? h('div', { class: 'tiny muted', style: { textAlign: 'right', marginTop: '2px' } }, `${Math.round(pct * 100)} %`) : null);
}

function goalsCard(store, r) {
  const g = store.state.crmGoals || {};
  const editBtn = h('button', { class: 'btn sm ghost', html: icon('edit', 13), onClick: () => openGoals(store) });
  return card(t('Objectifs de ventes', 'Sales goals'), { sub: `${g.year || new Date().getFullYear()}`, right: editBtn },
    goalRow(t('Commissions 1re année', 'First-year commissions'), r.firstYearYTD, g.firstYear || 0),
    goalRow(t('Commissions récurrentes', 'Recurring commissions'), r.recurring, g.recurring || 0),
    goalRow(t('Actifs sous gestion', 'Assets under management'), r.aum, g.aum || 0),
  );
}
function openGoals(store) {
  const g = { ...(store.state.crmGoals || {}) };
  const num0 = (v) => Number.isFinite(+v) ? +v : 0;
  const m = modal({
    title: t('Objectifs de ventes annuels', 'Annual sales goals'),
    body: h('div', { class: 'grid', style: { gap: '12px' } },
      field(t('Année', 'Year'), h('input', { type: 'number', value: g.year || new Date().getFullYear(), onInput: e => g.year = num0(e.target.value) })),
      field(t('Cible — commissions 1re année', 'Target — first-year commissions'), h('input', { type: 'number', value: g.firstYear || 0, onInput: e => g.firstYear = num0(e.target.value) })),
      field(t('Cible — commissions récurrentes', 'Target — recurring commissions'), h('input', { type: 'number', value: g.recurring || 0, onInput: e => g.recurring = num0(e.target.value) })),
      field(t('Cible — actifs sous gestion (AUM)', 'Target — assets under management (AUM)'), h('input', { type: 'number', value: g.aum || 0, onInput: e => g.aum = num0(e.target.value) })),
    ),
    footer: [
      h('button', { class: 'btn ghost', onClick: () => m.close() }, t('Annuler', 'Cancel')),
      h('button', { class: 'btn primary', onClick: () => { store.setCrmGoals(g); m.close(); toast(t('Objectifs enregistrés ✓', 'Goals saved ✓')); } }, t('Enregistrer', 'Save')),
    ],
  });
}

const MONTHS = () => [t('Jan', 'Jan'), t('Fév', 'Feb'), t('Mar', 'Mar'), t('Avr', 'Apr'), t('Mai', 'May'), t('Juin', 'Jun'), t('Juil', 'Jul'), t('Août', 'Aug'), t('Sep', 'Sep'), t('Oct', 'Oct'), t('Nov', 'Nov'), t('Déc', 'Dec')];
const PALETTE = ['#C6AC8F', '#6E8CA0', '#8A6E4C', '#6F9461', '#B0573F', '#A98F70', '#4E6B74', '#C2922F', '#7A6855'];

export function render({ store, navigate }) {
  const goto = (id) => { store.setActive(id); navigate('relation'); };
  const r = revenueReport(store.state.clients);

  const kpis = h('div', { class: 'grid cols-4' },
    kpi({ label: t('Commissions récurrentes', 'Recurring commissions'), value: money(r.recurring, { compact: true }), sub: t('par année', 'per year'), iconName: 'dollar', accent: 'var(--pos)' }),
    kpi({ label: t('Commissions 1re année (à ce jour)', 'First-year commissions (YTD)'), value: money(r.firstYearYTD, { compact: true }), sub: t('nouvelles affaires', 'new business'), iconName: 'funnel', accent: 'var(--c-gold)' }),
    kpi({ label: t('Actifs sous gestion', 'Assets under management'), value: money(r.aum, { compact: true }), iconName: 'bank' }),
    kpi({ label: t('Primes en vigueur', 'In-force premium'), value: money(r.annualPremium, { compact: true }), sub: t('par année', 'per year'), iconName: 'insurance' }),
  );

  // top clients by revenue
  const topCard = card(t('Meilleurs clients (revenus)', 'Top clients (revenue)'), { sub: t('Commissions récurrentes + AUM', 'Recurring commissions + AUM') },
    r.perClient.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, t('Client', 'Client')), h('th', { class: 'num' }, t('Récurrent', 'Recurring')), h('th', { class: 'num' }, 'AUM'))),
      h('tbody', {}, ...r.perClient.slice(0, 12).map(p => h('tr', { style: { cursor: 'pointer' }, onClick: () => goto(p.id) },
        h('td', {}, h('b', {}, p.name), h('div', { class: 'tiny muted' }, p.contact)),
        h('td', { class: 'num mono' }, money(p.recurring, { compact: true })),
        h('td', { class: 'num mono' }, money(p.aum, { compact: true })))))),
    ) : h('div', { class: 'empty tiny' }, t('Aucun client avec produits', 'No clients with products')));

  // upcoming renewals (90 days)
  const renewCard = card(t('Renouvellements à venir (90 j)', 'Upcoming renewals (90d)'), { sub: `${r.upcomingRenewals.length}` },
    r.upcomingRenewals.length ? h('div', {}, ...r.upcomingRenewals.map(rn => h('div', { class: 'flex between center', style: { padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }, onClick: () => goto(rn.clientId) },
      h('div', {}, h('div', { style: { fontWeight: '600', fontSize: '13px' } }, rn.clientName), h('div', { class: 'tiny muted' }, `${rn.carrier} · ${money(rn.recurring, { compact: true })}/an`)),
      h('span', { class: 'chip ' + (rn.days <= 14 ? 'warn' : '') }, fmtDate(rn.date))))) : h('div', { class: 'empty tiny' }, t('Aucun renouvellement dans 90 jours', 'No renewals within 90 days')));

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
    h('div', { class: 'grid cols-2', style: { alignItems: 'start' } }, goalsCard(store, r), byKindCard),
    h('div', { class: 'grid cols-2', style: { alignItems: 'start' } }, byCarrierCard, renewCard),
    h('div', { class: 'grid cols-2', style: { alignItems: 'start' } }, topCard, monthCard),
  );
}
