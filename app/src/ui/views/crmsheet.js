// ============================================================
// Printable CRM sheet — a clean one-page summary of a contact
// (coordinates, products, coverage, opportunities, tasks, history, KYC)
// suitable for a meeting or a file. Use Print → PDF.
// ============================================================
import { h, icon, money, t, fmtDate } from '../dom.js';
import {
  primaryMember, contactName, lifecycleOf, LIFECYCLE_META, STAGE_META, normalizeStage,
  PRODUCT_KIND_META, PRODUCT_STATUS_META, complianceStatus, activityFeed, lastTouch,
  clientAum, clientAnnualPremium, clientRecurring,
} from '../../engine/crm.js';
import { coverageOf, premiumsOf, aumOf } from '../../engine/policies.js';
import { annualPremium } from '../../state/models.js';

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
  const cur = jur?.currency || 'CAD';
  const yr = t('an', 'yr');

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
      h('td', {}, STAGE_META[normalizeStage(o.stage)].label()),
      h('td', { class: 'num mono' }, money(o.value, { currency: cur, compact: true }) + (o.valueKind === 'premium' ? '/' + yr : ' AUM')))))) : h('div', { class: 'tiny muted' }, t('Aucune', 'None')));

  // Products — amount by kind (AUM through the linked asset), status shown, totals from the status-filtered helpers
  const amountOf = (p) => {
    const measure = (PRODUCT_KIND_META[p.kind] || {}).measure;
    if (measure === 'aum') return money(aumOf(c, p), { currency: cur, compact: true });
    if (measure === 'face') return money(+p.faceAmount || 0, { currency: cur, compact: true });
    return '—';
  };
  const prodCard = section(t('Produits & polices', 'Products & policies'), prods.length ? h('div', {},
    h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, t('Type', 'Type')), h('th', {}, t('Assureur', 'Carrier')), h('th', { class: 'num' }, t('Montant', 'Amount')), h('th', { class: 'num' }, t('Prime/an', 'Premium/yr')))),
      h('tbody', {}, ...prods.map(p => h('tr', { style: (p.status === 'lapsed' || p.status === 'cancelled') ? { opacity: '.55' } : {} },
        h('td', {}, (PRODUCT_KIND_META[p.kind] || { label: () => p.kind }).label(), h('div', { class: 'tiny muted' }, (PRODUCT_STATUS_META[p.status] || {}).label?.() || '')),
        h('td', {}, p.carrier || '—', p.policyNumber ? h('div', { class: 'tiny muted' }, p.policyNumber) : null),
        h('td', { class: 'num mono' }, amountOf(p)),
        h('td', { class: 'num mono' }, +p.premium ? money(annualPremium(p), { currency: cur, compact: true }) : '—'))))),
    h('div', { class: 'grid cols-3', style: { gap: '0 12px', marginTop: '6px' } },
      kv('AUM', money(clientAum(c), { currency: cur, compact: true })),
      kv(t('Primes/an', 'Premium/yr'), money(clientAnnualPremium(c), { currency: cur, compact: true })),
      kv(t('Récurrent/an', 'Recurring/yr'), money(clientRecurring(c), { currency: cur, compact: true })))) : h('div', { class: 'tiny muted' }, t('Aucun', 'None')));

  // Coverage in force per member (engine/policies.js is the single reader of the ledger)
  const covRows = (c.members || []).map(m => {
    const life = coverageOf(c, m.id, 'life'), di = coverageOf(c, m.id, 'di'), ci = coverageOf(c, m.id, 'ci'), ltc = coverageOf(c, m.id, 'ltc');
    const parts = [
      life ? t(`Vie ${money(life, { currency: cur, compact: true })}`, `Life ${money(life, { currency: cur, compact: true })}`) : null,
      di ? t(`Invalidité ${money(di, { currency: cur, compact: true })}/an`, `Disability ${money(di, { currency: cur, compact: true })}/yr`) : null,
      ci ? t(`MG ${money(ci, { currency: cur, compact: true })}`, `CI ${money(ci, { currency: cur, compact: true })}`) : null,
      ltc ? t(`SLD ${money(ltc, { currency: cur, compact: true })}`, `LTC ${money(ltc, { currency: cur, compact: true })}`) : null,
    ].filter(Boolean);
    return kv(m.name, parts.length ? parts.join(' · ') + ` (${money(premiumsOf(c, m.id), { currency: cur, compact: true })}/${yr})` : t('Aucune couverture', 'No coverage'));
  });
  const covCard = section(t('Couverture en vigueur', 'Coverage in force'), h('div', {}, ...covRows));

  const taskCard = section(t('Tâches ouvertes', 'Open tasks'), openTasks.length ? h('div', {}, ...openTasks.map(tk =>
    h('div', { style: { fontSize: '12.5px', padding: '2px 0' } }, `☐ ${tk.title}${tk.due ? ' — ' + fmtDate(tk.due) : ''}`))) : h('div', { class: 'tiny muted' }, t('Aucune', 'None')));

  const compCard = section(t('Conformité / KYC', 'Compliance / KYC') + ` (${comp.done}/${comp.total})`, h('div', {}, ...comp.items.map(it =>
    h('div', { class: 'flex between', style: { fontSize: '12.5px', padding: '2px 0' } },
      h('span', {}, `${it.status === 'done' ? '☑' : it.status === 'na' ? '–' : '☐'} ${it.label}${it.derived ? ' ' + t('(auto)', '(auto)') : ''}`),
      h('span', { class: 'muted' }, it.date ? fmtDate(it.date) : '')))));

  const actCard = section(t('Historique récent', 'Recent history'), acts.length ? h('div', {}, ...acts.map(a =>
    h('div', { style: { fontSize: '12.5px', padding: '2px 0' } }, `${fmtDate(a.date)} · ${a.subject || a.type}`))) : h('div', { class: 'tiny muted' }, t('Aucun', 'None')));

  const notes = c.household?.advisorNotes;
  const noteCard = notes ? section(t('Notes', 'Notes'), h('div', { class: 'tiny', style: { whiteSpace: 'pre-wrap' } }, notes)) : null;

  return h('div', {}, header,
    h('div', { class: 'card' }, idCard,
      h('div', { class: 'grid cols-2', style: { gap: '0 24px' } }, h('div', {}, opCard, taskCard, actCard), h('div', {}, prodCard, covCard, compCard)),
      noteCard));
}
