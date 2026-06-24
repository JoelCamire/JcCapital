// ============================================================
// CRM dashboard — command center across the whole book.
// Pipeline, tasks due, reminders, revenue, recent activity.
// ============================================================
import { h, icon, money, num, t, fmtDate } from '../dom.js';
import { kpi, card } from '../widgets.js';
import { donutChart } from '../charts.js';
import {
  pipelineSummary, taskBuckets, reminders, revenueSummary, activityFeed,
  lifecycleCounts, LIFECYCLE_META, STAGE_META, ACTIVITY_META, daysUntil, revenueReport,
} from '../../engine/crm.js';

function goalBar(label, actual, target) {
  const pct = target > 0 ? Math.min(1, actual / target) : 0;
  return h('div', {},
    h('div', { class: 'flex between', style: { marginBottom: '4px' } },
      h('span', { class: 'tiny', style: { fontWeight: '600' } }, label),
      h('span', { class: 'tiny muted mono' }, `${money(actual, { compact: true })}${target > 0 ? ' / ' + money(target, { compact: true }) : ''}`)),
    h('div', { class: 'bar' }, h('span', { style: { width: `${Math.round(pct * 100)}%`, background: pct >= 1 ? 'var(--pos)' : 'var(--c-gold)' } })));
}

function relLabel(d) {
  if (d == null) return '';
  if (d === 0) return t('aujourd’hui', 'today');
  if (d < 0) return t(`il y a ${-d} j`, `${-d}d ago`);
  return t(`dans ${d} j`, `in ${d}d`);
}
const REMINDER_META = {
  birthday:   { icon: 'goals', label: () => t('Anniversaire', 'Birthday') },
  review:     { icon: 'refresh', label: () => t('Revue', 'Review') },
  renewal:    { icon: 'insurance', label: () => t('Renouvellement', 'Renewal') },
  nextaction: { icon: 'bell', label: () => t('Prochaine action', 'Next action') },
};

export function render({ store, navigate }) {
  const clients = store.state.clients;
  const goto = (id, route = 'relation') => { store.setActive(id); navigate(route); };

  const pipe = pipelineSummary(clients);
  const tasks = taskBuckets(clients);
  const rem = reminders(clients);
  const rev = revenueSummary(clients);
  const feed = activityFeed(clients, 12);
  const life = lifecycleCounts(clients);

  const dueNow = [...tasks.overdue, ...tasks.today, ...tasks.soon];

  // ---- KPIs ----
  const kpis = h('div', { class: 'grid cols-4' },
    kpi({ label: t('Pipeline pondéré', 'Weighted pipeline'), value: money(pipe.weightedPremium, { compact: true }),
      sub: t(`${pipe.openCount} opportunité(s) · ${money(pipe.openAum, { compact: true })} AUM`, `${pipe.openCount} open · ${money(pipe.openAum, { compact: true })} AUM`),
      iconName: 'funnel', accent: 'var(--c-gold)' }),
    kpi({ label: t('Tâches à traiter', 'Tasks to handle'), value: num(dueNow.length),
      sub: t(`${tasks.overdue.length} en retard · ${tasks.today.length} aujourd’hui`, `${tasks.overdue.length} overdue · ${tasks.today.length} today`),
      iconName: 'check', accent: tasks.overdue.length ? 'var(--neg)' : 'var(--text)' }),
    kpi({ label: t('Actifs sous gestion', 'Assets under management'), value: money(rev.aum, { compact: true }),
      sub: t(`${rev.policies} produit(s) · prime ${money(rev.annualPremium, { compact: true })}/an`, `${rev.policies} product(s) · ${money(rev.annualPremium, { compact: true })}/yr premium`),
      iconName: 'bank' }),
    kpi({ label: t('Commissions récurrentes', 'Recurring commissions'), value: money(rev.recurringCommission, { compact: true }),
      sub: t(`Potentiel 1re année ${money(rev.firstYearPotential, { compact: true })}`, `1st-yr potential ${money(rev.firstYearPotential, { compact: true })}`),
      iconName: 'dollar', accent: 'var(--pos)' }),
  );

  // ---- Pipeline funnel + lifecycle donut ----
  const maxCount = Math.max(1, ...pipe.stages.map(s => s.count));
  const funnel = card(t('Pipeline des ventes', 'Sales pipeline'), { sub: t('Opportunités par étape', 'Opportunities by stage'),
      right: h('a', { class: 'btn sm ghost', href: '#pipeline' }, t('Ouvrir', 'Open')) },
    h('div', {},
      ...pipe.stages.map(s => h('div', { style: { margin: '10px 0' } },
        h('div', { class: 'flex between', style: { marginBottom: '4px' } },
          h('span', { class: 'tiny', style: { fontWeight: '600' } }, s.label),
          h('span', { class: 'tiny muted' }, `${s.count} · ${money(s.premium + s.aum, { compact: true })}`)),
        h('div', { class: 'bar' }, h('span', { style: { width: `${Math.round(s.count / maxCount * 100)}%`, background: s.color } })),
      )),
      h('div', { class: 'flex between', style: { marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' } },
        h('span', { class: 'tiny muted' }, t('Taux de conversion (gagné / décidé)', 'Conversion (won / decided)')),
        h('b', { class: 'mono', style: { color: 'var(--pos)' } }, pipe.conversion ? Math.round(pipe.conversion * 100) + ' %' : '—')),
    ));

  const lifeSegs = ['prospect', 'client', 'lead', 'inactive']
    .filter(k => life[k]).map(k => ({ label: LIFECYCLE_META[k].label(), value: life[k], color: LIFECYCLE_META[k].color }));
  const lifeCard = card(t('Répartition du book', 'Book breakdown'), { sub: t('Par cycle de vie', 'By lifecycle') },
    h('div', { style: { display: 'grid', placeItems: 'center' } },
      lifeSegs.length ? h('div', { html: '' }, donutChart({ segments: lifeSegs, size: 180, thickness: 26,
        centerLabel: String(life.total), centerSub: t('contacts', 'contacts') })) : h('div', { class: 'empty tiny' }, t('Aucun contact', 'No contacts'))),
    h('div', { class: 'legend', style: { justifyContent: 'center', marginTop: '10px' } },
      ...lifeSegs.map(s => h('span', {}, h('i', { style: { background: s.color } }), `${s.label} (${s.value})`))),
  );

  // ---- Tasks + reminders ----
  const tasksCard = card(t('À faire', 'To do'), { sub: t('Tâches en retard et à venir', 'Overdue & upcoming tasks'),
      right: h('a', { class: 'btn sm ghost', href: '#tasks' }, t('Tout voir', 'See all')) },
    dueNow.length ? h('div', {}, ...dueNow.slice(0, 8).map(tk => taskRow(tk, store, goto))) :
      h('div', { class: 'empty tiny' }, h('div', { class: 'big' }, '✓'), t('Rien d’urgent — beau travail', 'Nothing urgent — nice work')));

  const remCard = card(t('Rappels', 'Reminders'), { sub: t('Anniversaires, revues, renouvellements', 'Birthdays, reviews, renewals') },
    rem.length ? h('div', {}, ...rem.slice(0, 8).map(r => h('div', {
        class: 'flex between center', style: { padding: '9px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' },
        onClick: () => goto(r.clientId) },
      h('div', { class: 'inline', style: { flexWrap: 'nowrap', gap: '9px' } },
        h('span', { style: { color: 'var(--c-gold)' }, html: icon(REMINDER_META[r.type].icon, 16) }),
        h('div', {}, h('div', { style: { fontWeight: '600', fontSize: '13px' } }, `${REMINDER_META[r.type].label()} — ${r.who}`),
          h('div', { class: 'tiny muted' }, r.clientName))),
      h('span', { class: 'chip ' + (r.days <= 3 ? 'warn' : ''), style: { whiteSpace: 'nowrap' } }, relLabel(r.days)),
    )) ) : h('div', { class: 'empty tiny' }, t('Aucun rappel à l’horizon', 'No reminders on the horizon')));

  // ---- Activity feed ----
  const feedCard = card(t('Activité récente', 'Recent activity'), { sub: t('Derniers contacts consignés', 'Latest logged touches'),
      right: h('a', { class: 'btn sm ghost', href: '#activities' }, t('Tout voir', 'See all')) },
    feed.length ? h('div', {}, ...feed.map(a => h('div', {
        class: 'flex between center', style: { padding: '9px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' },
        onClick: () => goto(a.clientId) },
      h('div', { class: 'inline', style: { flexWrap: 'nowrap', gap: '9px' } },
        h('span', { class: 'muted', html: icon((ACTIVITY_META[a.type] || ACTIVITY_META.note).icon, 15) }),
        h('div', {}, h('div', { style: { fontWeight: '600', fontSize: '13px' } }, a.subject || (ACTIVITY_META[a.type] || ACTIVITY_META.note).label()),
          h('div', { class: 'tiny muted' }, `${a.contact} · ${a.clientName}`))),
      h('span', { class: 'tiny muted', style: { whiteSpace: 'nowrap' } }, fmtDate(a.date)),
    )) ) : h('div', { class: 'empty tiny' }, t('Aucune activité — commencez à consigner vos contacts', 'No activity — start logging your touches')));

  // ---- Sales goals progress ----
  const g = store.state.crmGoals || {};
  const rr = revenueReport(clients);
  const goalsStrip = (g.firstYear || g.recurring || g.aum)
    ? card(t('Objectifs de ventes', 'Sales goals'), { sub: `${g.year || ''}`, right: h('a', { class: 'btn sm ghost', href: '#revenue' }, t('Détails', 'Details')) },
        h('div', { class: 'grid cols-3' },
          goalBar(t('Commissions 1re année', 'First-year commissions'), rr.firstYearYTD, g.firstYear || 0),
          goalBar(t('Récurrent', 'Recurring'), rr.recurring, g.recurring || 0),
          goalBar('AUM', rr.aum, g.aum || 0)))
    : null;

  return h('div', { class: 'grid', style: { gap: '18px' } },
    kpis,
    goalsStrip,
    h('div', { class: 'grid cols-2' }, funnel, lifeCard),
    h('div', { class: 'grid cols-2' }, tasksCard, remCard),
    feedCard,
  );
}

function taskRow(tk, store, goto) {
  const overdue = tk.days != null && tk.days < 0;
  return h('div', { class: 'flex between center', style: { padding: '9px 0', borderBottom: '1px solid var(--border)' } },
    h('div', { class: 'inline', style: { flexWrap: 'nowrap', gap: '9px' } },
      h('input', { type: 'checkbox', style: { width: 'auto' }, title: t('Marquer fait', 'Mark done'),
        onChange: () => store.updateClient(tk.clientId, c => { const x = c.tasks.find(z => z.id === tk.id); if (x) { x.done = true; x.completedAt = Date.now(); } }) }),
      h('div', { style: { cursor: 'pointer' }, onClick: () => goto(tk.clientId) },
        h('div', { style: { fontWeight: '600', fontSize: '13px' } }, tk.title),
        h('div', { class: 'tiny muted' }, `${tk.contact} · ${tk.clientName}`))),
    h('span', { class: 'chip ' + (overdue ? 'neg' : tk.days === 0 ? 'warn' : ''), style: { whiteSpace: 'nowrap' } },
      tk.due ? relLabelShort(tk.days) : t('—', '—')),
  );
}
function relLabelShort(d) {
  if (d == null) return '—';
  if (d === 0) return t('aujourd’hui', 'today');
  if (d < 0) return t(`retard ${-d}j`, `${-d}d late`);
  return t(`${d}j`, `${d}d`);
}
