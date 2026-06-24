// ============================================================
// Client timeline — one chronological thread merging activities,
// tasks, opportunities and products for the active contact.
// ============================================================
import { h, icon, t, fmtDate } from '../dom.js';
import { card } from '../widgets.js';
import { clientTimeline, contactName } from '../../engine/crm.js';

const KIND = {
  activity:    { icon: 'message',   color: '#6E8CA0', label: () => t('Contact', 'Touch') },
  task:        { icon: 'check',     color: '#C2922F', label: () => t('Tâche', 'Task') },
  opportunity: { icon: 'funnel',    color: '#C6AC8F', label: () => t('Opportunité', 'Opportunity') },
  product:     { icon: 'insurance', color: '#6F9461', label: () => t('Produit', 'Product') },
};

export function render({ client }) {
  const events = clientTimeline(client);

  if (!events.length) {
    return h('div', { class: 'card empty' }, h('div', { class: 'big' }, '🧭'),
      t('Aucun événement encore — consignez des activités, ajoutez des opportunités ou des produits dans l’onglet Relation.',
        'No events yet — log activities, add opportunities or products in the Relationship tab.'));
  }

  let lastYear = null;
  const rows = [];
  for (const e of events) {
    const yr = (e.date || '').slice(0, 4);
    if (yr !== lastYear) { lastYear = yr; rows.push(h('div', { class: 'nav-group', style: { padding: '14px 0 4px', opacity: 1 } }, yr)); }
    const k = KIND[e.kind] || KIND.activity;
    rows.push(h('div', { class: 'flex', style: { gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border)' } },
      h('div', { style: { flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' } },
        h('span', { style: { width: '30px', height: '30px', borderRadius: '50%', display: 'grid', placeContent: 'center', background: k.color, color: 'var(--c-black)' }, html: icon(k.icon, 16) })),
      h('div', { style: { flex: 1, minWidth: 0 } },
        h('div', { class: 'flex between center' },
          h('b', { style: { fontSize: '13.5px' } }, e.title),
          h('span', { class: 'tiny muted', style: { whiteSpace: 'nowrap' } }, fmtDate(e.date))),
        h('div', { class: 'tiny muted' }, `${k.label()}${e.detail ? ' · ' + e.detail : ''}`)),
    ));
  }

  return h('div', {},
    card(t('Ligne du temps', 'Timeline'), { sub: t(`${contactName(client)} — ${events.length} événement(s)`, `${contactName(client)} — ${events.length} event(s)`) },
      h('div', {}, ...rows)),
  );
}
