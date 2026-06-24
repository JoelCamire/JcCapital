// ============================================================
// Tasks & reminders — every open task across the book, bucketed
// by urgency, plus upcoming reminders (birthdays/reviews/renewals).
// ============================================================
import { h, icon, t, fmtDate, modal, toast, field } from '../dom.js';
import { card } from '../widgets.js';
import { taskBuckets, reminders, TASK_CAT_META, daysUntil } from '../../engine/crm.js';
import { newTask } from '../../state/models.js';

const CAT_OPTS = Object.keys(TASK_CAT_META);
const PRIO = { high: 'neg', medium: 'warn', low: '' };

function relLabel(d) {
  if (d == null) return t('un jour', 'someday');
  if (d === 0) return t('aujourd’hui', 'today');
  if (d < 0) return t(`en retard de ${-d} j`, `${-d}d overdue`);
  return t(`dans ${d} j`, `in ${d}d`);
}

export function render({ store, navigate }) {
  const clients = store.state.clients;
  const goto = (id) => { store.setActive(id); navigate('relation'); };
  const b = taskBuckets(clients);
  const rem = reminders(clients, 60);
  let showDone = false;

  const wrap = h('div', { class: 'grid cols-2', style: { alignItems: 'start' } });

  const rebuild = () => {
    const b2 = taskBuckets(store.state.clients);
    const left = h('div', { class: 'grid', style: { gap: '18px' } });
    const sections = [
      ['overdue', t('En retard', 'Overdue'), 'neg'],
      ['today', t('Aujourd’hui', 'Today'), 'warn'],
      ['soon', t('Cette semaine', 'This week'), ''],
      ['upcoming', t('À venir', 'Upcoming'), ''],
      ['someday', t('Sans date', 'No date'), ''],
    ];
    let any = false;
    for (const [key, label, cls] of sections) {
      const list = b2[key]; if (!list.length) continue; any = true;
      left.appendChild(card(label, { sub: `${list.length}`, class: '' },
        h('div', {}, ...list.map(tk => taskRow(tk, store, goto, rebuild)))));
    }
    if (showDone && b2.done.length) {
      left.appendChild(card(t('Terminées', 'Done'), { sub: `${b2.done.length}` },
        h('div', {}, ...b2.done.slice(0, 30).map(tk => taskRow(tk, store, goto, rebuild)))));
    }
    if (!any && !(showDone && b2.done.length)) {
      left.appendChild(h('div', { class: 'card empty' }, h('div', { class: 'big' }, '✓'),
        t('Aucune tâche ouverte — tout est sous contrôle', 'No open tasks — all clear')));
    }
    const old = wrap.firstChild;
    if (old) old.replaceWith(left); else wrap.appendChild(left);
  };

  const remCard = card(t('Rappels (60 j)', 'Reminders (60d)'), { sub: t('Anniversaires, revues, renouvellements', 'Birthdays, reviews, renewals') },
    rem.length ? h('div', {}, ...rem.map(r => h('div', {
        class: 'flex between center', style: { padding: '9px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }, onClick: () => goto(r.clientId) },
      h('div', {}, h('div', { style: { fontWeight: '600', fontSize: '13px' } }, `${r.who}`),
        h('div', { class: 'tiny muted' }, `${r.clientName}`)),
      h('span', { class: 'chip ' + (r.days <= 3 ? 'warn' : '') }, relLabel(r.days)),
    ))) : h('div', { class: 'empty tiny' }, t('Aucun rappel', 'No reminders')));

  rebuild();
  wrap.appendChild(h('div', { class: 'grid', style: { gap: '18px' } }, remCard));

  const header = h('div', { class: 'flex between center', style: { marginBottom: '16px', flexWrap: 'wrap', gap: '10px' } },
    h('label', { class: 'inline tiny', style: { cursor: 'pointer' } },
      h('input', { type: 'checkbox', style: { width: 'auto' }, onChange: e => { showDone = e.target.checked; rebuild(); } }),
      t('Afficher les terminées', 'Show completed')),
    h('button', { class: 'btn primary', html: icon('plus', 14) + ' ' + t('Nouvelle tâche', 'New task'),
      onClick: () => openNewTask(store, rebuild) }),
  );

  return h('div', {}, header, wrap);
}

function taskRow(tk, store, goto, rebuild) {
  return h('div', { class: 'flex between center', style: { padding: '9px 0', borderBottom: '1px solid var(--border)' } },
    h('div', { class: 'inline', style: { flexWrap: 'nowrap', gap: '9px' } },
      h('input', { type: 'checkbox', checked: tk.done, style: { width: 'auto' },
        onChange: () => { store.updateClient(tk.clientId, c => { const x = c.tasks.find(z => z.id === tk.id); if (x) { x.done = !x.done; x.completedAt = x.done ? Date.now() : null; } }); rebuild(); } }),
      h('div', { style: { cursor: 'pointer' }, onClick: () => goto(tk.clientId) },
        h('div', { style: { fontWeight: '600', fontSize: '13px', textDecoration: tk.done ? 'line-through' : 'none', opacity: tk.done ? '.6' : '1' } }, tk.title),
        h('div', { class: 'tiny muted' }, `${tk.contact} · ${tk.clientName} · ${(TASK_CAT_META[tk.category] || TASK_CAT_META.followup).label()}`))),
    h('div', { class: 'inline', style: { flexWrap: 'nowrap' } },
      tk.priority && tk.priority !== 'medium' ? h('span', { class: 'chip ' + (PRIO[tk.priority] || ''), style: { textTransform: 'capitalize' } }, tk.priority) : null,
      h('span', { class: 'chip ' + (tk.days != null && tk.days < 0 && !tk.done ? 'neg' : '') }, tk.due ? fmtDate(tk.due) : t('—', '—')),
      h('button', { class: 'btn icon sm ghost', title: t('Supprimer', 'Delete'), html: icon('trash', 14),
        onClick: () => { store.updateClient(tk.clientId, c => { c.tasks = c.tasks.filter(z => z.id !== tk.id); }); rebuild(); } }),
    ),
  );
}

function openNewTask(store, rebuild) {
  const clients = store.state.clients;
  if (!clients.length) { toast(t('Créez d’abord un contact', 'Create a contact first')); return; }
  const draft = newTask();
  let clientId = store.state.activeId || clients[0].id;
  const m = modal({
    title: t('Nouvelle tâche', 'New task'),
    body: h('div', { class: 'grid', style: { gap: '12px' } },
      field(t('Contact', 'Contact'), h('select', { onChange: e => clientId = e.target.value },
        ...clients.map(c => h('option', { value: c.id, selected: c.id === clientId }, c.name)))),
      field(t('Tâche', 'Task'), h('input', { value: draft.title, onInput: e => draft.title = e.target.value })),
      h('div', { class: 'grid cols-2', style: { gap: '12px' } },
        field(t('Échéance', 'Due'), h('input', { type: 'date', value: draft.due, onInput: e => draft.due = e.target.value })),
        field(t('Priorité', 'Priority'), h('select', { onChange: e => draft.priority = e.target.value },
          h('option', { value: 'high', selected: draft.priority === 'high' }, t('Haute', 'High')),
          h('option', { value: 'medium', selected: draft.priority === 'medium' }, t('Moyenne', 'Medium')),
          h('option', { value: 'low', selected: draft.priority === 'low' }, t('Basse', 'Low'))))),
      field(t('Catégorie', 'Category'), h('select', { onChange: e => draft.category = e.target.value },
        ...CAT_OPTS.map(k => h('option', { value: k, selected: k === draft.category }, TASK_CAT_META[k].label())))),
    ),
    footer: [
      h('button', { class: 'btn ghost', onClick: () => m.close() }, t('Annuler', 'Cancel')),
      h('button', { class: 'btn primary', onClick: () => {
        store.updateClient(clientId, c => { (c.tasks = c.tasks || []).push(draft); });
        m.close(); rebuild(); toast(t('Tâche ajoutée', 'Task added'));
      } }, t('Ajouter', 'Add')),
    ],
  });
}
