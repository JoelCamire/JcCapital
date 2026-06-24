// ============================================================
// Segments & campaigns — dynamic lists of contacts matching useful
// criteria, with one-click bulk email (mailto bcc) and copy.
// ============================================================
import { h, icon, t, toast } from '../dom.js';
import { card } from '../widgets.js';
import { buildSegments, lifecycleOf, LIFECYCLE_META, contactName } from '../../engine/crm.js';

export function render({ store, navigate }) {
  const goto = (id) => { store.setActive(id); navigate('relation'); };
  const segs = buildSegments(store.state.clients);

  const bulkEmail = (emails) => {
    if (!emails.length) { toast(t('Aucun courriel dans ce segment', 'No email in this segment')); return; }
    window.location.href = `mailto:?bcc=${encodeURIComponent(emails.join(','))}`;
  };
  const copyEmails = (emails) => {
    if (!emails.length) { toast(t('Aucun courriel', 'No email')); return; }
    const txt = emails.join(', ');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast(t('Courriels copiés ✓', 'Emails copied ✓'))).catch(() => {});
    else toast(txt);
  };

  const cards = segs.map(s => {
    const list = h('div', { style: { display: 'none', marginTop: '10px' } },
      ...(s.clients.length ? s.clients.map(c => {
        const lm = LIFECYCLE_META[lifecycleOf(c)] || LIFECYCLE_META.client;
        return h('div', { class: 'flex between center', style: { padding: '7px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }, onClick: () => goto(c.id) },
          h('div', {}, h('b', { style: { fontSize: '13px' } }, c.name), h('div', { class: 'tiny muted' }, contactName(c))),
          h('span', { class: 'chip', style: { background: lm.color, color: 'var(--c-black)' } }, lm.label()));
      }) : [h('div', { class: 'empty tiny' }, t('Aucun contact', 'No contact'))]));
    const toggle = h('button', { class: 'btn sm ghost', html: icon('chevron', 14) + ' ' + t('Voir', 'View'),
      onClick: () => { const vis = list.style.display === 'none'; list.style.display = vis ? 'block' : 'none'; } });

    return card(s.label, { sub: s.desc, right: h('span', { class: 'chip ' + (s.clients.length ? 'warn' : '') }, String(s.clients.length)) },
      h('div', { class: 'inline', style: { gap: '8px' } },
        toggle,
        h('button', { class: 'btn sm', html: icon('mail', 13) + ' ' + t('Courriel groupé', 'Bulk email'), disabled: !s.emails.length, onClick: () => bulkEmail(s.emails) }),
        h('button', { class: 'btn sm ghost', html: icon('doc', 13) + ' ' + t('Copier courriels', 'Copy emails'), disabled: !s.emails.length, onClick: () => copyEmails(s.emails) }),
        h('span', { class: 'tiny muted' }, t(`${s.emails.length} courriel(s)`, `${s.emails.length} email(s)`))),
      list);
  });

  const intro = h('div', { class: 'card', style: { background: 'var(--surface-2)' } },
    h('div', { class: 'flex center gap-8' }, h('span', { class: 'chip info', html: icon('funnel', 13) }),
      h('div', { class: 'tiny muted' }, t('Listes dynamiques recalculées en direct. « Courriel groupé » ouvre votre messagerie avec les destinataires en copie cachée (Cci).',
        'Dynamic lists recalculated live. “Bulk email” opens your mail app with recipients in blind copy (Bcc).'))));

  return h('div', { class: 'grid', style: { gap: '18px' } }, intro, h('div', { class: 'grid cols-2', style: { alignItems: 'start' } }, ...cards));
}
