// ============================================================
// Monthly calendar — tasks, reminders, renewals and birthdays
// for the whole book on one month grid.
// ============================================================
import { h, icon, t, locale } from '../dom.js';
import { monthEvents, EVENT_COLOR } from '../../engine/crm.js';

const WEEKDAYS = () => (locale() === 'en-CA'
  ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']);

export function render({ store, navigate }) {
  const goto = (id) => { store.setActive(id); navigate('relation'); };
  const now = new Date();
  let year = now.getFullYear(), month = now.getMonth();

  const wrap = h('div', {});

  function build() {
    const events = monthEvents(store.state.clients, year, month);
    const first = new Date(year, month, 1);
    const lead = (first.getDay() + 6) % 7; // Monday-first offset
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const monthLabel = first.toLocaleDateString(locale(), { month: 'long', year: 'numeric' });

    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(h('div', { style: cellStyle(true) }));
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${pad(month + 1)}-${pad(d)}`;
      const evs = events[key] || [];
      const isToday = key === todayKey;
      cells.push(h('div', { style: { ...cellStyle(false), ...(isToday ? { outline: '2px solid var(--c-gold)', outlineOffset: '-2px' } : {}) } },
        h('div', { class: 'tiny', style: { fontWeight: isToday ? '800' : '600', color: isToday ? 'var(--c-gold)' : 'var(--text-2)', marginBottom: '3px' } }, String(d)),
        ...evs.slice(0, 4).map(ev => h('div', { title: `${ev.label} · ${ev.clientName}`, onClick: () => goto(ev.clientId),
          style: { cursor: 'pointer', fontSize: '10.5px', lineHeight: '1.3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '1px 4px', borderRadius: '4px', marginBottom: '2px', background: 'color-mix(in srgb, ' + EVENT_COLOR[ev.type] + ' 22%, transparent)', borderLeft: '2px solid ' + EVENT_COLOR[ev.type] } },
          ev.label)),
        evs.length > 4 ? h('div', { class: 'tiny muted' }, `+${evs.length - 4}`) : null,
      ));
    }

    const head = h('div', { class: 'flex between center', style: { marginBottom: '14px', flexWrap: 'wrap', gap: '10px' } },
      h('div', { class: 'inline' },
        h('button', { class: 'btn icon sm', html: '‹', onClick: () => { month--; if (month < 0) { month = 11; year--; } build(); } }),
        h('h2', { style: { margin: 0, fontFamily: 'var(--font-display)', textTransform: 'capitalize', minWidth: '210px', textAlign: 'center' } }, monthLabel),
        h('button', { class: 'btn icon sm', html: '›', onClick: () => { month++; if (month > 11) { month = 0; year++; } build(); } }),
        h('button', { class: 'btn sm ghost', onClick: () => { year = now.getFullYear(); month = now.getMonth(); build(); } }, t('Aujourd’hui', 'Today'))),
      h('div', { class: 'legend' },
        ...[['task', t('Tâche', 'Task')], ['birthday', t('Anniversaire', 'Birthday')], ['review', t('Revue', 'Review')], ['renewal', t('Renouvellement', 'Renewal')], ['nextaction', t('Action', 'Action')]]
          .map(([k, l]) => h('span', {}, h('i', { style: { background: EVENT_COLOR[k] } }), l))));

    const weekHead = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px', marginBottom: '6px' } },
      ...WEEKDAYS().map(w => h('div', { class: 'tiny muted', style: { textAlign: 'center', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.04em' } }, w)));
    const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px' } }, ...cells);

    wrap.replaceChildren(head, h('div', { class: 'card' }, weekHead, grid));
  }
  build();
  return wrap;
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function cellStyle(blank) {
  return { minHeight: '92px', borderRadius: '8px', padding: '6px', background: blank ? 'transparent' : 'var(--surface-2)', border: blank ? 'none' : '1px solid var(--border)', overflow: 'hidden' };
}
