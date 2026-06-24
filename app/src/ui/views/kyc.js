// ============================================================
// Compliance & KYC dashboard — completeness of required client
// documentation across the book, with gaps by item and by client.
// ============================================================
import { h, icon, num, t, fmtDate } from '../dom.js';
import { kpi, card } from '../widgets.js';
import { complianceOverview } from '../../engine/crm.js';

export function render({ store, navigate }) {
  const goto = (id) => { store.setActive(id); navigate('relation'); };
  const ov = complianceOverview(store.state.clients);
  const bookPct = ov.total ? ov.rows.reduce((s, r) => s + r.pct, 0) / ov.total : 1;

  const kpis = h('div', { class: 'grid cols-3' },
    kpi({ label: t('Clients pleinement conformes', 'Fully compliant clients'), value: `${ov.fullyCompliant}/${ov.total}`, iconName: 'check', accent: 'var(--pos)' }),
    kpi({ label: t('Complétude du book', 'Book completeness'), value: Math.round(bookPct * 100) + ' %', iconName: 'report', accent: bookPct >= 0.9 ? 'var(--pos)' : bookPct >= 0.6 ? 'var(--warn)' : 'var(--neg)' }),
    kpi({ label: t('Documents manquants', 'Missing documents'), value: num(ov.byItem.reduce((s, i) => s + i.missing, 0)), iconName: 'warning', accent: 'var(--neg)' }),
  );

  const gapsCard = card(t('Lacunes par document', 'Gaps by document'), { sub: t('Nombre de clients concernés', 'Number of clients affected') },
    h('div', {}, ...ov.byItem.map(it => h('div', { class: 'flex between center', style: { padding: '8px 0', borderBottom: '1px solid var(--border)' } },
      h('span', { class: 'tiny', style: { fontWeight: it.missing ? '600' : '400', opacity: it.missing ? '1' : '.6' } }, it.label),
      h('span', { class: 'chip ' + (it.missing ? 'neg' : 'pos') }, it.missing ? String(it.missing) : '✓')))));

  const clientsCard = card(t('Conformité par client', 'Compliance by client'), { sub: t('Du moins complet au plus complet', 'Least to most complete') },
    ov.rows.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, t('Client', 'Client')), h('th', { class: 'num' }, t('Complétude', 'Completeness')), h('th', {}, t('Manquants', 'Missing')))),
      h('tbody', {}, ...ov.rows.map(r => h('tr', { style: { cursor: 'pointer' }, onClick: () => goto(r.clientId) },
        h('td', {}, h('b', {}, r.clientName), h('div', { class: 'tiny muted' }, r.contact)),
        h('td', { class: 'num' }, h('div', { class: 'inline', style: { flexWrap: 'nowrap', justifyContent: 'flex-end', gap: '8px' } },
          h('span', { class: 'bar', style: { width: '70px' } }, h('span', { style: { width: `${Math.round(r.pct * 100)}%`, background: r.pct >= 1 ? 'var(--pos)' : 'var(--warn)' } })),
          h('span', { class: 'mono tiny' }, Math.round(r.pct * 100) + ' %'))),
        h('td', {}, r.missing.length ? h('div', { class: 'inline', style: { gap: '5px' } }, ...r.missing.slice(0, 3).map(mi => h('span', { class: 'chip neg', style: { fontSize: '10px' } }, mi.label.split(' ')[0])), r.missing.length > 3 ? h('span', { class: 'tiny muted' }, `+${r.missing.length - 3}`) : null) : h('span', { class: 'chip pos' }, '✓')),
      )))),
    ) : h('div', { class: 'empty' }, h('div', { class: 'big' }, '🗂️'), t('Aucun client — les prospects sont exclus du suivi KYC', 'No clients — prospects are excluded from KYC tracking')));

  return h('div', { class: 'grid', style: { gap: '18px' } },
    kpis,
    h('div', { class: 'grid cols-2', style: { alignItems: 'start' } }, clientsCard, gapsCard),
    h('div', { class: 'card', style: { background: 'var(--surface-2)' } },
      h('div', { class: 'flex center gap-8' }, h('span', { class: 'chip info', html: icon('check', 13) }),
        h('div', { class: 'tiny muted' }, t('Modifiez l’état de chaque document dans l’onglet « Relation client » de chaque fiche. Les prospects sont exclus tant qu’ils ne sont pas convertis en clients.',
          'Edit each document’s status in each file’s “Client relationship” tab. Prospects are excluded until converted to clients.')))),
  );
}
