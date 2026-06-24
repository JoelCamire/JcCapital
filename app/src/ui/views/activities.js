// ============================================================
// Activity feed — chronological log of every touch across the book.
// Log a call / email / meeting / note against any contact.
// ============================================================
import { h, icon, t, fmtDate, modal, toast, field } from '../dom.js';
import { activityFeed, ACTIVITY_META } from '../../engine/crm.js';
import { newActivity, todayISO } from '../../state/models.js';

export function render({ store, navigate }) {
  const clients = store.state.clients;
  const goto = (id) => { store.setActive(id); navigate('relation'); };
  let filter = 'all';

  const listWrap = h('div', { class: 'card' });
  const rebuild = () => {
    const feed = activityFeed(store.state.clients, 0).filter(a => filter === 'all' || a.type === filter);
    const body = feed.length ? h('div', {}, ...feed.map(a => h('div', {
        class: 'flex between', style: { padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', gap: '12px' }, onClick: () => goto(a.clientId) },
      h('div', { class: 'inline', style: { flexWrap: 'nowrap', gap: '11px', alignItems: 'flex-start' } },
        h('span', { style: { color: 'var(--c-gold)', marginTop: '2px' }, html: icon((ACTIVITY_META[a.type] || ACTIVITY_META.note).icon, 16) }),
        h('div', {},
          h('div', { style: { fontWeight: '600', fontSize: '13.5px' } }, a.subject || (ACTIVITY_META[a.type] || ACTIVITY_META.note).label()),
          h('div', { class: 'tiny muted', style: { marginBottom: a.body ? '4px' : '0' } }, `${a.contact} · ${a.clientName}`),
          a.body ? h('div', { class: 'tiny', style: { color: 'var(--text-2)', maxWidth: '560px' } }, a.body) : null)),
      h('span', { class: 'tiny muted', style: { whiteSpace: 'nowrap' } }, fmtDate(a.date)),
    ))) : h('div', { class: 'empty' }, h('div', { class: 'big' }, '🗒️'),
      t('Aucune activité consignée', 'No logged activity'));
    listWrap.firstChild ? listWrap.firstChild.replaceWith(body) : listWrap.appendChild(body);
  };

  const filterPills = h('div', { class: 'pill-tabs' },
    ...[['all', t('Toutes', 'All')], ...Object.keys(ACTIVITY_META).filter(k => k !== 'task').map(k => [k, ACTIVITY_META[k].label()])]
      .map(([k, label]) => h('a', { href: 'javascript:void 0', class: 'on-target', onClick: e => { e.preventDefault(); filter = k; document.querySelectorAll('.pill-tabs a').forEach(x => x.classList.remove('on')); e.target.classList.add('on'); rebuild(); } }, label)));
  filterPills.firstChild.classList.add('on');

  const header = h('div', { class: 'flex between center', style: { marginBottom: '16px', flexWrap: 'wrap', gap: '10px' } },
    filterPills,
    h('button', { class: 'btn primary', html: icon('plus', 14) + ' ' + t('Consigner une activité', 'Log activity'),
      onClick: () => openLog(store, rebuild) }),
  );

  rebuild();
  return h('div', {}, header, listWrap);
}

export function openLog(store, after, fixedClientId) {
  const clients = store.state.clients;
  if (!clients.length) { toast(t('Créez d’abord un contact', 'Create a contact first')); return; }
  const draft = newActivity({ date: todayISO() });
  let clientId = fixedClientId || store.state.activeId || clients[0].id;
  const m = modal({
    title: t('Consigner une activité', 'Log activity'),
    body: h('div', { class: 'grid', style: { gap: '12px' } },
      fixedClientId ? null : field(t('Contact', 'Contact'), h('select', { onChange: e => clientId = e.target.value },
        ...clients.map(c => h('option', { value: c.id, selected: c.id === clientId }, c.name)))),
      h('div', { class: 'grid cols-2', style: { gap: '12px' } },
        field(t('Type', 'Type'), h('select', { onChange: e => draft.type = e.target.value },
          ...Object.keys(ACTIVITY_META).map(k => h('option', { value: k, selected: k === draft.type }, ACTIVITY_META[k].label())))),
        field(t('Date', 'Date'), h('input', { type: 'date', value: draft.date, onInput: e => draft.date = e.target.value }))),
      field(t('Sujet', 'Subject'), h('input', { value: draft.subject, onInput: e => draft.subject = e.target.value })),
      field(t('Détails', 'Details'), h('textarea', { rows: 3, onInput: e => draft.body = e.target.value })),
    ),
    footer: [
      h('button', { class: 'btn ghost', onClick: () => m.close() }, t('Annuler', 'Cancel')),
      h('button', { class: 'btn primary', onClick: () => {
        store.updateClient(clientId, c => {
          (c.activities = c.activities || []).push(draft);
          c.crm = c.crm || {}; c.crm.lastContactAt = Date.now();
        });
        m.close(); after && after(); toast(t('Activité consignée', 'Activity logged'));
      } }, t('Enregistrer', 'Save')),
    ],
  });
}
