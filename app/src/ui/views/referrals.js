// ============================================================
// Referral network — who refers whom, value generated per referrer,
// and acquisition source breakdown.
// ============================================================
import { h, icon, money, num, t } from '../dom.js';
import { kpi, card } from '../widgets.js';
import { donutChart } from '../charts.js';
import { referralNetwork } from '../../engine/crm.js';

const PALETTE = ['#C6AC8F', '#6E8CA0', '#8A6E4C', '#6F9461', '#B0573F', '#A98F70', '#4E6B74'];

export function render({ store, navigate }) {
  const clients = store.state.clients;
  const goto = (id) => { store.setActive(id); navigate('relation'); };
  const net = referralNetwork(clients);
  const totalReferred = net.referrers.reduce((s, r) => s + r.count, 0);
  const totalValue = net.referrers.reduce((s, r) => s + r.value, 0);

  const kpis = h('div', { class: 'grid cols-3' },
    kpi({ label: t('Référents actifs', 'Active referrers'), value: num(net.referrers.length), iconName: 'users' }),
    kpi({ label: t('Contacts référés', 'Referred contacts'), value: num(totalReferred), iconName: 'funnel', accent: 'var(--c-gold)' }),
    kpi({ label: t('Commissions issues de références', 'Commissions from referrals'), value: money(totalValue, { compact: true }), sub: t('récurrent / an', 'recurring / yr'), iconName: 'dollar', accent: 'var(--pos)' }),
  );

  const refCard = card(t('Meilleurs référents', 'Top referrers'), { sub: t('Triés par valeur générée', 'Sorted by value generated') },
    net.referrers.length ? h('div', {}, ...net.referrers.map(r => h('div', { style: { padding: '11px 0', borderBottom: '1px solid var(--border)' } },
      h('div', { class: 'flex between center' },
        h('div', { class: 'inline', style: { gap: '8px' } }, h('span', { style: { color: 'var(--c-gold)' }, html: icon('users', 16) }), h('b', { style: { fontSize: '13.5px' } }, r.name)),
        h('div', { style: { textAlign: 'right' } }, h('b', { class: 'mono' }, money(r.value, { compact: true })), h('div', { class: 'tiny muted' }, t(`${r.count} référé(s)`, `${r.count} referred`)))),
      h('div', { class: 'inline', style: { gap: '6px', marginTop: '7px' } }, ...r.referred.map(rc =>
        h('span', { class: 'chip', style: { cursor: 'pointer' }, onClick: () => goto(rc.id) }, rc.name))),
    ))) : h('div', { class: 'empty tiny' }, h('div', { class: 'big' }, '🤝'),
      t('Aucune référence consignée — renseignez « Référé par » dans les fiches', 'No referrals logged — fill “Referred by” on contacts')));

  const srcSegs = net.bySource.map((s, i) => ({ label: s.label, value: s.count, color: PALETTE[i % PALETTE.length] }));
  const srcCard = card(t('Sources d’acquisition', 'Acquisition sources'), { sub: t('Répartition des contacts', 'Contact breakdown') },
    srcSegs.length ? h('div', { style: { display: 'grid', placeItems: 'center' } },
      donutChart({ segments: srcSegs, size: 180, thickness: 26, centerLabel: String(net.bySource.reduce((s, x) => s + x.count, 0)), centerSub: t('contacts', 'contacts') })) : h('div', { class: 'empty tiny' }, t('Aucune source', 'No source')),
    h('div', { class: 'legend', style: { justifyContent: 'center', marginTop: '10px' } },
      ...srcSegs.map(s => h('span', {}, h('i', { style: { background: s.color } }), `${s.label} (${s.value})`))));

  return h('div', { class: 'grid', style: { gap: '18px' } },
    kpis,
    h('div', { class: 'grid cols-2', style: { alignItems: 'start' } }, refCard, srcCard),
  );
}
