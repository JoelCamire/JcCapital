// ============================================================
// Printable CRM sheet — a clean one-page summary of a contact
// (coordinates, products, opportunities, tasks, history, KYC)
// suitable for a meeting or a file. Use Print → PDF.
// ============================================================
import { h, icon, money, t, fmtDate } from '../dom.js';
import { card } from '../widgets.js';
import {
  primaryMember, contactName, lifecycleOf, LIFECYCLE_META, STAGE_META,
  PRODUCT_KIND_META, annualizePremium, complianceStatus, activityFeed, lastTouch,
} from '../../engine/crm.js';

function section(title, body) {
  return h('div', { style: { marginBottom: '16px' } },
    h('div', { style: { fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '13px', borderBottom: '2px solid var(--c-gold)', paddingBottom: '4px', marginBottom: '8px' } }, title),
    body);
}
function kv(k, v) {
  return h('div', { class: 'flex between', style: { padding: '3px 0', fontSize: '12.5px' } },
    h('span', { class: 'muted' }, k), h('b', {}, v || '—'));
}

export function render({ client, jur }) {
  const c = client;
  const m0 = primaryMember(c);
  const crm = c.crm || {};
  const lm = LIFECYCLE_META[lifecycleOf(c)] || LIFECYCLE_META.client;
  const ops = (c.opportunities || []);
  const prods = (c.products || []);
  const openTasks = (c.tasks || []).filter(x => !x.done);
  const acts = activityFeed([c], 8);
  const comp = complianceStatus(c);

  const header = h('div', { class: 'flex between center', style: { marginBottom: '16px' } },
    h('div', {}, h('h2', { style: { margin: 0, fontFamily: 'var(--font-display)' } }, c.name),
      h('div', { class: 'muted tiny' }, `${contactName(c)} · ${jur.flag} ${jur.name} · ${jur.regionName}`)),
    h('button', { class: 'btn primary', html: icon('report', 14) + ' ' + t('Imprimer / PDF', 'Print / PDF'), onClick: () => window.print() }));

  const idCard = section(t('Coordonnées', 'Contact details'), h('div', { class: 'grid cols-2', style: { gap: '0 24px' } },
    kv(t('Cycle de vie', 'Lifecycle'), lm.label()),
    kv(t('Cote', 'Rating'), crm.rating || '—'),
    kv(t('Courriel', 'Email'), m0.email),
    kv(t('Téléphone', 'Phone'), m0.phone),
    kv(t('Profession', 'Occupation'), m0.occupation),
    kv(t('Employeur', 'Employer'), m0.employer),
    kv(t('Source', 'Source'), crm.source),
    kv(t('Référé par', 'Referred by'), crm.referredBy),
    kv(t('Ville', 'City'), [c.household?.city, c.household?.region].filter(Boolean).join(', ')),
    kv(t('Dernier contact', 'Last touch'), lastTouch(c) ? fmtDate(lastTouch(c)) : '—'),
  ));

  const opCard = section(t('Opportunités', 'Opportunities'), ops.length ? h('table', { class: 'tbl' },
    h('tbody', {}, ...ops.map(o => h('tr', {}, h('td', {}, o.title),
      h('td', {}, (STAGE_META[o.stage] || {}).label?.() || o.stage),
      h('td', { class: 'num mono' }, money(o.value, { compact: true }) + (o.valueKind === 'premium' ? '/an' : ' AUM')))))) : h('div', { class: 'tiny muted' }, t('Aucune', 'None')));

  const prodCard = section(t('Produits & polices', 'Products & policies'), prods.length ? h('table', { class: 'tbl' },
    h('thead', {}, h('tr', {}, h('th', {}, t('Type', 'Type')), h('th', {}, t('Assureur', 'Carrier')), h('th', { class: 'num' }, t('Montant', 'Amount')), h('th', { class: 'num' }, t('Prime/an', 'Premium/yr')))),
    h('tbody', {}, ...prods.map(p => h('tr', {},
      h('td', {}, (PRODUCT_KIND_META[p.kind] || { label: () => p.kind }).label()),
      h('td', {}, p.carrier || '—'),
      h('td', { class: 'num mono' }, money(p.aum > 0 ? p.aum : p.faceAmount, { compact: true })),
      h('td', { class: 'num mono' }, p.premium ? money(annualizePremium(p), { compact: true }) : '—'))))) : h('div', { class: 'tiny muted' }, t('Aucun', 'None')));

  const taskCard = section(t('Tâches ouvertes', 'Open tasks'), openTasks.length ? h('div', {}, ...openTasks.map(tk =>
    h('div', { style: { fontSize: '12.5px', padding: '2px 0' } }, `☐ ${tk.title}${tk.due ? ' — ' + fmtDate(tk.due) : ''}`))) : h('div', { class: 'tiny muted' }, t('Aucune', 'None')));

  const compCard = section(t('Conformité / KYC', 'Compliance / KYC') + ` (${comp.done}/${comp.total})`, h('div', {}, ...comp.items.map(it =>
    h('div', { class: 'flex between', style: { fontSize: '12.5px', padding: '2px 0' } },
      h('span', {}, `${it.status === 'done' ? '☑' : it.status === 'na' ? '–' : '☐'} ${it.label}`),
      h('span', { class: 'muted' }, it.date ? fmtDate(it.date) : '')))));

  const actCard = section(t('Historique récent', 'Recent history'), acts.length ? h('div', {}, ...acts.map(a =>
    h('div', { style: { fontSize: '12.5px', padding: '2px 0' } }, `${fmtDate(a.date)} · ${a.subject || a.type}`))) : h('div', { class: 'tiny muted' }, t('Aucun', 'None')));

  const notes = crm.advisorNotes || c.household?.advisorNotes;
  const noteCard = notes ? section(t('Notes', 'Notes'), h('div', { class: 'tiny', style: { whiteSpace: 'pre-wrap' } }, notes)) : null;

  return h('div', {}, header,
    h('div', { class: 'card' }, idCard,
      h('div', { class: 'grid cols-2', style: { gap: '0 24px' } }, h('div', {}, opCard, taskCard, actCard), h('div', {}, prodCard, compCard)),
      noteCard));
}
