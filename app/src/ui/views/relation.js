// ============================================================
// Relationship tab (per active client) — the CRM heart of a file.
// Contact + lifecycle, opportunities, activities, tasks, products,
// email templates (mailto) and add-to-calendar (Google / .ics).
// ============================================================
import { h, icon, money, t, fmtDate, modal, toast, field } from '../dom.js';
import { card } from '../widgets.js';
import {
  primaryMember, contactName, lifecycleOf, LIFECYCLE_META, STAGE_META, STAGE_ORDER,
  ACTIVITY_META, PRODUCT_KIND_META, SOURCE_OPTIONS, annualizePremium,
  complianceStatus, CADENCES, cadenceTasks,
} from '../../engine/crm.js';
import { newOpportunity, newTask, newProduct, newActivity, todayISO } from '../../state/models.js';
import { openLog } from './activities.js';

const ADVISOR = 'Joel Camire';
const FIRM = 'JC Capital';

export function render({ store, client, navigate }) {
  const c = client;
  const m0 = primaryMember(c);
  const crm = c.crm || {};
  const up = (fn) => store.update(fn);

  // ---------- Contact header ----------
  const lifeSel = h('select', { style: { width: 'auto' }, onChange: e => up(x => { x.crm.lifecycle = e.target.value; }) },
    ...Object.keys(LIFECYCLE_META).map(k => h('option', { value: k, selected: k === lifecycleOf(c) }, LIFECYCLE_META[k].label())));
  const ratingSel = h('select', { style: { width: 'auto' }, onChange: e => up(x => { x.crm.rating = e.target.value; }) },
    h('option', { value: '', selected: !crm.rating }, t('Cote —', 'Rating —')),
    ...['A', 'B', 'C'].map(r => h('option', { value: r, selected: crm.rating === r }, r)));

  const header = card(contactName(c), {
      sub: `${m0.occupation || ''}${m0.employer ? ' · ' + m0.employer : ''}`,
      right: h('div', { class: 'inline' }, lifeSel, ratingSel) },
    h('div', { class: 'grid cols-2', style: { gap: '14px' } },
      h('div', {},
        contactLine('mail', m0.email, m0.email ? `mailto:${m0.email}` : null),
        contactLine('phone', m0.phone, m0.phone ? `tel:${m0.phone}` : null),
        contactLine('estate', [c.household?.city, c.household?.region].filter(Boolean).join(', ') || null),
      ),
      h('div', {},
        editRow(t('Source', 'Source'), h('select', { style: { width: 'auto' }, onChange: e => up(x => { x.crm.source = e.target.value; }) },
          h('option', { value: '', selected: !crm.source }, '—'),
          ...SOURCE_OPTIONS.map(([v, l]) => h('option', { value: v, selected: crm.source === v }, l())))),
        editRow(t('Référé par', 'Referred by'), h('input', { value: crm.referredBy || '', style: { maxWidth: '200px' }, onInput: e => store.quietUpdate(x => { x.crm.referredBy = e.target.value; }) })),
        editRow(t('Prochaine action', 'Next action'), h('input', { type: 'date', value: crm.nextActionDate || '', style: { maxWidth: '170px' }, onChange: e => up(x => { x.crm.nextActionDate = e.target.value; }) })),
      ),
    ),
    h('div', { class: 'field', style: { marginTop: '10px' } },
      h('label', {}, t('Étiquettes', 'Tags')),
      h('input', { value: (crm.tags || []).join(', '), placeholder: 'VIP, Entreprise, …',
        onChange: e => up(x => { x.crm.tags = e.target.value.split(',').map(s => s.trim()).filter(Boolean); }) })),
    h('div', { class: 'inline', style: { marginTop: '12px', gap: '8px' } },
      h('button', { class: 'btn primary sm', html: icon('message', 14) + ' ' + t('Consigner', 'Log'), onClick: () => openLog(store, () => store.set(s => s), c.id) }),
      m0.email ? h('button', { class: 'btn sm', html: icon('mail', 14) + ' ' + t('Courriel', 'Email'), onClick: () => openEmailTemplates(store, c.id, m0) }) : null,
      m0.phone ? h('a', { class: 'btn sm', href: `tel:${m0.phone}`, html: icon('phone', 14) + ' ' + t('Appeler', 'Call') }) : null,
      h('button', { class: 'btn sm', html: icon('calendar', 14) + ' ' + t('Agenda', 'Calendar'), onClick: () => openCalendar(c, m0) }),
      h('button', { class: 'btn sm', html: icon('refresh', 14) + ' ' + t('Séquence de suivi', 'Follow-up sequence'), onClick: () => openCadence(store, c.id) }),
      h('a', { class: 'btn sm ghost', href: '#clienttimeline', html: icon('timeline', 14) + ' ' + t('Ligne du temps', 'Timeline') }),
      h('a', { class: 'btn sm ghost', href: '#crmsheet', html: icon('report', 14) + ' ' + t('Fiche imprimable', 'Printable sheet') }),
      h('a', { class: 'btn sm ghost', href: '#profile', html: icon('client', 14) + ' ' + t('Profil complet', 'Full profile') }),
    ),
  );

  // ---------- Compliance / KYC ----------
  const comp = complianceStatus(c);
  const complianceCard = card(t('Conformité / KYC', 'Compliance / KYC'), {
      sub: `${comp.done}/${comp.total} · ${Math.round(comp.pct * 100)} %`,
      right: h('span', { class: 'bar', style: { width: '90px' } }, h('span', { style: { width: `${Math.round(comp.pct * 100)}%`, background: comp.pct >= 1 ? 'var(--pos)' : 'var(--warn)' } })) },
    h('div', {}, ...comp.items.map(it => h('div', { class: 'flex between center', style: { padding: '7px 0', borderBottom: '1px solid var(--border)' } },
      h('span', { class: 'tiny', style: { fontWeight: '500', maxWidth: '60%' } }, it.label),
      h('div', { class: 'inline', style: { flexWrap: 'nowrap', gap: '6px' } },
        it.date ? h('span', { class: 'tiny muted' }, fmtDate(it.date)) : null,
        h('select', { style: { width: 'auto', fontSize: '12px' }, onChange: e => up(x => { x.compliance = x.compliance || {}; const cur = x.compliance[it.key] || {}; x.compliance[it.key] = { status: e.target.value, date: e.target.value === 'done' ? (cur.date || todayISO()) : (cur.date || '') }; }) },
          h('option', { value: 'todo', selected: it.status === 'todo' }, t('À faire', 'To do')),
          h('option', { value: 'done', selected: it.status === 'done' }, t('Complété', 'Done')),
          h('option', { value: 'na', selected: it.status === 'na' }, t('S.O.', 'N/A'))),
      ),
    ))));

  // ---------- Opportunities ----------
  const ops = c.opportunities || [];
  const oppCard = card(t('Opportunités', 'Opportunities'), { sub: `${ops.filter(o => ['new', 'contacted', 'meeting', 'proposal'].includes(o.stage)).length} ${t('ouverte(s)', 'open')}`,
      right: h('button', { class: 'btn sm', html: icon('plus', 13), onClick: () => openOpp(store, c.id) }) },
    ops.length ? h('div', {}, ...ops.map(o => h('div', { class: 'flex between center', style: { padding: '9px 0', borderBottom: '1px solid var(--border)' } },
      h('div', {}, h('div', { style: { fontWeight: '600', fontSize: '13px' } }, o.title),
        h('div', { class: 'tiny muted' }, `${money(o.value, { compact: true })}${o.valueKind === 'premium' ? '/an' : ' AUM'} · ${o.probability || 0} %${o.expectedClose ? ' · ' + fmtDate(o.expectedClose) : ''}`)),
      h('div', { class: 'inline', style: { flexWrap: 'nowrap' } },
        h('select', { style: { width: 'auto', fontSize: '12px' }, onChange: e => up(x => { const z = x.opportunities.find(q => q.id === o.id); z.stage = e.target.value; z.closedAt = (e.target.value === 'won' || e.target.value === 'lost') ? Date.now() : null; }) },
          ...STAGE_ORDER.map(s => h('option', { value: s, selected: s === o.stage }, STAGE_META[s].label()))),
        h('button', { class: 'btn icon sm ghost', html: icon('trash', 14), onClick: () => up(x => { x.opportunities = x.opportunities.filter(q => q.id !== o.id); }) }),
      ),
    ))) : h('div', { class: 'empty tiny' }, t('Aucune opportunité', 'No opportunities')));

  // ---------- Products / policies ----------
  const prods = c.products || [];
  const aum = prods.reduce((s, p) => s + (+p.aum || 0), 0);
  const prem = prods.reduce((s, p) => s + annualizePremium(p), 0);
  const prodCard = card(t('Produits & polices', 'Products & policies'), {
      sub: `${money(aum, { compact: true })} AUM · ${money(prem, { compact: true })}/an`,
      right: h('button', { class: 'btn sm', html: icon('plus', 13), onClick: () => openProduct(store, c.id) }) },
    prods.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, t('Type', 'Type')), h('th', {}, t('Assureur', 'Carrier')),
        h('th', { class: 'num' }, t('Montant', 'Amount')), h('th', { class: 'num' }, t('Prime', 'Premium')), h('th', {}, ''))),
      h('tbody', {}, ...prods.map(p => h('tr', {},
        h('td', {}, (PRODUCT_KIND_META[p.kind] || {}).label?.() || p.kind),
        h('td', {}, h('div', {}, p.carrier || '—'), p.policyNumber ? h('div', { class: 'tiny muted' }, p.policyNumber) : null),
        h('td', { class: 'num mono' }, money(p.aum > 0 ? p.aum : p.faceAmount, { compact: true })),
        h('td', { class: 'num mono' }, p.premium ? money(annualizePremium(p), { compact: true }) : '—'),
        h('td', { class: 'num' }, h('button', { class: 'btn icon sm ghost', html: icon('trash', 14), onClick: () => up(x => { x.products = x.products.filter(q => q.id !== p.id); }) })),
      ))),
    )) : h('div', { class: 'empty tiny' }, t('Aucun produit en vigueur', 'No in-force products')));

  // ---------- Tasks ----------
  const tasks = (c.tasks || []);
  const taskCard = card(t('Tâches', 'Tasks'), { sub: `${tasks.filter(x => !x.done).length} ${t('ouverte(s)', 'open')}`,
      right: h('button', { class: 'btn sm', html: icon('plus', 13), onClick: () => openTask(store, c.id) }) },
    tasks.length ? h('div', {}, ...tasks.map(tk => h('div', { class: 'flex between center', style: { padding: '8px 0', borderBottom: '1px solid var(--border)' } },
      h('label', { class: 'inline', style: { cursor: 'pointer', flexWrap: 'nowrap' } },
        h('input', { type: 'checkbox', checked: tk.done, style: { width: 'auto' }, onChange: () => up(x => { const z = x.tasks.find(q => q.id === tk.id); z.done = !z.done; z.completedAt = z.done ? Date.now() : null; }) }),
        h('span', { style: { fontSize: '13px', textDecoration: tk.done ? 'line-through' : 'none', opacity: tk.done ? '.6' : '1' } }, tk.title)),
      h('div', { class: 'inline', style: { flexWrap: 'nowrap' } },
        h('span', { class: 'chip ' + (tk.due && !tk.done ? '' : '') }, tk.due ? fmtDate(tk.due) : '—'),
        h('button', { class: 'btn icon sm ghost', html: icon('trash', 14), onClick: () => up(x => { x.tasks = x.tasks.filter(q => q.id !== tk.id); }) })),
    ))) : h('div', { class: 'empty tiny' }, t('Aucune tâche', 'No tasks')));

  // ---------- Activity timeline ----------
  const acts = [...(c.activities || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const actCard = card(t('Historique des contacts', 'Contact history'), { sub: `${acts.length}`,
      right: h('button', { class: 'btn sm', html: icon('plus', 13), onClick: () => openLog(store, () => store.set(s => s), c.id) }) },
    acts.length ? h('div', {}, ...acts.map(a => h('div', { style: { padding: '10px 0', borderBottom: '1px solid var(--border)' } },
      h('div', { class: 'flex between' },
        h('div', { class: 'inline', style: { flexWrap: 'nowrap', gap: '8px' } },
          h('span', { class: 'muted', html: icon((ACTIVITY_META[a.type] || ACTIVITY_META.note).icon, 14) }),
          h('b', { style: { fontSize: '13px' } }, a.subject || (ACTIVITY_META[a.type] || ACTIVITY_META.note).label())),
        h('span', { class: 'tiny muted' }, fmtDate(a.date))),
      a.body ? h('div', { class: 'tiny', style: { color: 'var(--text-2)', marginTop: '4px', marginLeft: '22px' } }, a.body) : null,
    ))) : h('div', { class: 'empty tiny' }, t('Aucun contact consigné', 'No logged contact')));

  return h('div', { class: 'grid', style: { gap: '18px' } },
    header,
    h('div', { class: 'grid cols-2' }, oppCard, prodCard),
    h('div', { class: 'grid cols-2' }, taskCard, complianceCard),
    actCard,
  );
}

function openCadence(store, clientId) {
  let key = CADENCES[0].key, from = todayISO();
  const preview = h('div', { class: 'tiny muted', style: { marginTop: '4px' } });
  const refresh = () => { preview.replaceChildren(...cadenceTasks(key, from).map(x => h('div', { style: { padding: '2px 0' } }, `• ${x.title} — ${fmtDate(x.due)}`))); };
  const cadSel = h('select', { onChange: e => { key = e.target.value; refresh(); } }, ...CADENCES.map(c => h('option', { value: c.key, selected: c.key === key }, `${c.label()} — ${c.desc()}`)));
  const dateInp = h('input', { type: 'date', value: from, onInput: e => { from = e.target.value; refresh(); } });
  refresh();
  const m = modal({
    title: t('Appliquer une séquence de suivi', 'Apply a follow-up sequence'),
    body: h('div', { class: 'grid', style: { gap: '12px' } },
      field(t('Séquence', 'Sequence'), cadSel),
      field(t('Date de départ', 'Start date'), dateInp),
      h('div', {}, h('div', { class: 'tiny', style: { fontWeight: '600' } }, t('Tâches qui seront créées :', 'Tasks that will be created:')), preview)),
    footer: [
      h('button', { class: 'btn ghost', onClick: () => m.close() }, t('Annuler', 'Cancel')),
      h('button', { class: 'btn primary', onClick: () => {
        const ts = cadenceTasks(key, from);
        store.updateClient(clientId, c => { c.tasks = c.tasks || []; ts.forEach(x => c.tasks.push(newTask(x))); });
        m.close(); toast(t(`${ts.length} tâche(s) ajoutée(s)`, `${ts.length} task(s) added`));
      } }, t('Créer les tâches', 'Create tasks')),
    ],
  });
}

// ---------- small UI helpers ----------
function contactLine(ic, val, href) {
  if (!val) return null;
  const inner = h('span', { class: 'inline', style: { flexWrap: 'nowrap', gap: '8px' } },
    h('span', { class: 'muted', html: icon(ic, 15) }), href ? h('a', { href }, val) : h('span', {}, val));
  return h('div', { style: { padding: '5px 0' } }, inner);
}
function editRow(label, control) {
  return h('div', { class: 'flex between center', style: { padding: '5px 0' } },
    h('span', { class: 'tiny muted' }, label), control);
}

// ---------- modals ----------
function openOpp(store, clientId) {
  const draft = newOpportunity();
  const m = modal({ title: t('Nouvelle opportunité', 'New opportunity'),
    body: h('div', { class: 'grid', style: { gap: '12px' } },
      field(t('Titre', 'Title'), h('input', { value: draft.title, onInput: e => draft.title = e.target.value })),
      h('div', { class: 'grid cols-2', style: { gap: '12px' } },
        field(t('Valeur', 'Value'), h('input', { type: 'number', value: draft.value, onInput: e => draft.value = parseFloat(e.target.value) || 0 })),
        field(t('Type de valeur', 'Value type'), h('select', { onChange: e => draft.valueKind = e.target.value },
          h('option', { value: 'aum', selected: true }, t('Actifs (AUM)', 'Assets (AUM)')),
          h('option', { value: 'premium' }, t('Prime annuelle', 'Annual premium'))))),
      h('div', { class: 'grid cols-2', style: { gap: '12px' } },
        field(t('Probabilité (%)', 'Probability (%)'), h('input', { type: 'number', value: draft.probability, onInput: e => draft.probability = parseFloat(e.target.value) || 0 })),
        field(t('Clôture prévue', 'Expected close'), h('input', { type: 'date', onInput: e => draft.expectedClose = e.target.value }))),
    ),
    footer: [h('button', { class: 'btn ghost', onClick: () => m.close() }, t('Annuler', 'Cancel')),
      h('button', { class: 'btn primary', onClick: () => { store.updateClient(clientId, c => { (c.opportunities = c.opportunities || []).push(draft); }); m.close(); toast(t('Ajouté', 'Added')); } }, t('Ajouter', 'Add'))] });
}
function openTask(store, clientId) {
  const draft = newTask();
  const m = modal({ title: t('Nouvelle tâche', 'New task'),
    body: h('div', { class: 'grid', style: { gap: '12px' } },
      field(t('Tâche', 'Task'), h('input', { value: draft.title, onInput: e => draft.title = e.target.value })),
      h('div', { class: 'grid cols-2', style: { gap: '12px' } },
        field(t('Échéance', 'Due'), h('input', { type: 'date', onInput: e => draft.due = e.target.value })),
        field(t('Priorité', 'Priority'), h('select', { onChange: e => draft.priority = e.target.value },
          h('option', { value: 'high' }, t('Haute', 'High')), h('option', { value: 'medium', selected: true }, t('Moyenne', 'Medium')), h('option', { value: 'low' }, t('Basse', 'Low')))))),
    footer: [h('button', { class: 'btn ghost', onClick: () => m.close() }, t('Annuler', 'Cancel')),
      h('button', { class: 'btn primary', onClick: () => { store.updateClient(clientId, c => { (c.tasks = c.tasks || []).push(draft); }); m.close(); toast(t('Ajouté', 'Added')); } }, t('Ajouter', 'Add'))] });
}
function openProduct(store, clientId) {
  const draft = newProduct();
  const m = modal({ title: t('Nouveau produit', 'New product'),
    body: h('div', { class: 'grid', style: { gap: '12px' } },
      h('div', { class: 'grid cols-2', style: { gap: '12px' } },
        field(t('Type', 'Type'), h('select', { onChange: e => draft.kind = e.target.value },
          ...Object.keys(PRODUCT_KIND_META).map(k => h('option', { value: k, selected: k === draft.kind }, PRODUCT_KIND_META[k].label())))),
        field(t('Assureur / firme', 'Carrier / firm'), h('input', { onInput: e => draft.carrier = e.target.value }))),
      field(t('N° de police / compte', 'Policy / account #'), h('input', { onInput: e => draft.policyNumber = e.target.value })),
      h('div', { class: 'grid cols-2', style: { gap: '12px' } },
        field(t('Capital assuré', 'Face amount'), h('input', { type: 'number', onInput: e => draft.faceAmount = parseFloat(e.target.value) || 0 })),
        field('AUM', h('input', { type: 'number', onInput: e => draft.aum = parseFloat(e.target.value) || 0 }))),
      h('div', { class: 'grid cols-2', style: { gap: '12px' } },
        field(t('Prime', 'Premium'), h('input', { type: 'number', onInput: e => draft.premium = parseFloat(e.target.value) || 0 })),
        field(t('Fréquence', 'Frequency'), h('select', { onChange: e => draft.frequency = e.target.value },
          h('option', { value: 'monthly', selected: true }, t('Mensuelle', 'Monthly')), h('option', { value: 'annual' }, t('Annuelle', 'Annual')), h('option', { value: 'single' }, t('Unique', 'Single'))))),
      h('div', { class: 'grid cols-2', style: { gap: '12px' } },
        field(t('Renouvellement', 'Renewal'), h('input', { type: 'date', onInput: e => draft.renewalDate = e.target.value })),
        field(t('Commission récurrente', 'Recurring commission'), h('input', { type: 'number', onInput: e => draft.renewalCommission = parseFloat(e.target.value) || 0 }))),
    ),
    footer: [h('button', { class: 'btn ghost', onClick: () => m.close() }, t('Annuler', 'Cancel')),
      h('button', { class: 'btn primary', onClick: () => { store.updateClient(clientId, c => { (c.products = c.products || []).push(draft); }); m.close(); toast(t('Ajouté', 'Added')); } }, t('Ajouter', 'Add'))] });
}

// ---------- email templates (mailto) ----------
const TEMPLATES = [
  { name: () => t('Prise de rendez-vous', 'Schedule a meeting'),
    subj: () => t('Rencontre — planification financière', 'Meeting — financial planning'),
    body: (f) => t(`Bonjour ${f},\n\nJ’aimerais planifier une rencontre pour faire le point sur vos objectifs. Quelles seraient vos disponibilités au cours des prochaines semaines ?\n\nAu plaisir,\n${ADVISOR}\n${FIRM}`,
      `Hi ${f},\n\nI’d like to schedule a meeting to review your goals. What is your availability over the coming weeks?\n\nBest,\n${ADVISOR}\n${FIRM}`) },
  { name: () => t('Suivi de rencontre', 'Meeting follow-up'),
    subj: () => t('Suivi de notre rencontre', 'Follow-up on our meeting'),
    body: (f) => t(`Bonjour ${f},\n\nMerci pour votre temps aujourd’hui. Voici un résumé des points discutés et des prochaines étapes :\n\n• \n• \n\nN’hésitez pas si vous avez des questions.\n\n${ADVISOR}\n${FIRM}`,
      `Hi ${f},\n\nThank you for your time today. Here is a summary of what we discussed and the next steps:\n\n• \n• \n\nFeel free to reach out with any questions.\n\n${ADVISOR}\n${FIRM}`) },
  { name: () => t('Revue annuelle', 'Annual review'),
    subj: () => t('Votre revue annuelle', 'Your annual review'),
    body: (f) => t(`Bonjour ${f},\n\nC’est le moment de votre revue annuelle. J’aimerais revoir votre portefeuille, vos protections et vos objectifs. Proposez-moi quelques disponibilités et je m’ajuste.\n\n${ADVISOR}\n${FIRM}`,
      `Hi ${f},\n\nIt’s time for your annual review. I’d like to go over your portfolio, coverage and goals. Send me a few times that work and I’ll adjust.\n\n${ADVISOR}\n${FIRM}`) },
  { name: () => t('Joyeux anniversaire', 'Happy birthday'),
    subj: () => t('Joyeux anniversaire !', 'Happy birthday!'),
    body: (f) => t(`Bonjour ${f},\n\nToute l’équipe de ${FIRM} vous souhaite un très joyeux anniversaire !\n\n${ADVISOR}`,
      `Hi ${f},\n\nThe whole team at ${FIRM} wishes you a very happy birthday!\n\n${ADVISOR}`) },
];
function openEmailTemplates(store, clientId, member) {
  const first = (member.name || '').split(' ')[0] || '';
  const send = (tpl) => {
    window.location.href = `mailto:${member.email}?subject=${encodeURIComponent(tpl.subj())}&body=${encodeURIComponent(tpl.body(first))}`;
    store.updateClient(clientId, cc => {
      (cc.activities = cc.activities || []).push(newActivity({ type: 'email', subject: tpl.name(), date: todayISO(), body: t('Courriel envoyé (modèle).', 'Email sent (template).') }));
      cc.crm = cc.crm || {}; cc.crm.lastContactAt = Date.now();
    });
    toast(t('Courriel ouvert et consigné ✓', 'Email opened and logged ✓'));
  };
  const m = modal({ title: t('Modèles de courriel', 'Email templates'),
    body: h('div', { class: 'grid', style: { gap: '10px' } },
      h('div', { class: 'tiny muted' }, t('Ouvre votre messagerie avec le message pré-rempli, et consigne l’envoi dans l’historique.', 'Opens your mail app pre-filled, and logs the send in the history.')),
      ...TEMPLATES.map(tpl => h('button', { class: 'btn', style: { justifyContent: 'flex-start' }, onClick: () => { send(tpl); m.close(); } },
        icon('mail', 14), ' ', tpl.name()))),
  });
}

// ---------- add to calendar (Google + .ics) ----------
function openCalendar(client, member) {
  const date = client.crm?.nextActionDate || client.household?.reviewDate || '';
  const title = t(`Rencontre — ${contactName(client)}`, `Meeting — ${contactName(client)}`);
  let d = date;
  const body = h('div', { class: 'grid', style: { gap: '12px' } },
    field(t('Titre', 'Title'), h('input', { id: '_caltitle', value: title })),
    field(t('Date', 'Date'), h('input', { type: 'date', value: d, onInput: e => d = e.target.value })),
    h('div', { class: 'tiny muted' }, t('Crée un événement d’une heure à 10 h.', 'Creates a one-hour event at 10 AM.')),
  );
  const m = modal({ title: t('Ajouter à l’agenda', 'Add to calendar'), body,
    footer: [
      h('button', { class: 'btn', onClick: () => { if (!d) { toast(t('Choisissez une date', 'Pick a date')); return; } window.open(googleUrl(getTitle(), d, member), '_blank'); m.close(); } }, t('Google Agenda', 'Google Calendar')),
      h('button', { class: 'btn primary', onClick: () => { if (!d) { toast(t('Choisissez une date', 'Pick a date')); return; } downloadIcs(getTitle(), d, member); m.close(); } }, t('Télécharger .ics', 'Download .ics')),
    ] });
  function getTitle() { const el = document.getElementById('_caltitle'); return el ? el.value : title; }
}
function stamp(date, time) { return date.replace(/-/g, '') + 'T' + time; }
function googleUrl(title, date, member) {
  const dates = `${stamp(date, '100000')}/${stamp(date, '110000')}`;
  const details = member.email ? `Contact: ${member.email}` : '';
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dates}&details=${encodeURIComponent(details)}`;
}
function downloadIcs(title, date, member) {
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//JC Capital//CRM//FR', 'BEGIN:VEVENT',
    `DTSTART:${stamp(date, '100000')}`, `DTEND:${stamp(date, '110000')}`,
    `SUMMARY:${title}`, member.email ? `DESCRIPTION:Contact ${member.email}` : 'DESCRIPTION:', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const a = h('a', { href: URL.createObjectURL(blob), download: 'rencontre.ics' });
  document.body.appendChild(a); a.click(); a.remove();
}
