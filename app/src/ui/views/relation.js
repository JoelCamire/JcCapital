// ============================================================
// Relationship tab (per active client) — the CRM heart of a file.
// Contact + lifecycle, opportunities, activities, tasks, products,
// email templates (mailto) and add-to-calendar (Google / .ics).
// products[] is the single ledger for policies AND investments; the
// store links investment products to balance-sheet assets on save.
// ============================================================
import { h, icon, money, t, fmtDate, modal, toast, field } from '../dom.js';
import { card } from '../widgets.js';
import {
  primaryMember, contactName, lifecycleOf, LIFECYCLE_META, STAGE_META, STAGE_ORDER, OPEN_STAGES,
  ACTIVITY_META, PRODUCT_KIND_META, PRODUCT_STATUS_META, SOURCE_OPTIONS, OPP_TYPE_OPTIONS,
  complianceStatus, CADENCES, cadenceTasks, applyStage, kindForOpportunity, normalizeStage,
  clientAum, clientAnnualPremium, clientRecurring, todayLocalISO,
} from '../../engine/crm.js';
import { aumOf } from '../../engine/policies.js';
import { newOpportunity, newTask, newProduct, newActivity, annualPremium, INVESTMENT_KINDS } from '../../state/models.js';
import { openLog } from './activities.js';

const ADVISOR = 'Joel Camire';
const FIRM = 'JC Capital';
const num0 = (v) => (Number.isFinite(+v) ? +v : 0);

export function render({ store, client, navigate }) {
  const c = client;
  const m0 = primaryMember(c);
  const crm = c.crm || {};
  const up = (fn) => store.update(fn);
  const memberName = (id) => ((c.members || []).find(m => m.id === id) || {}).name || '';

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
        it.derived
          ? h('span', { class: 'chip pos', title: t('Dérivé du dossier (bénéficiaires / profil de risque saisis) — verrouillé', 'Derived from the file (beneficiaries / risk profile on record) — locked') }, '✓ ' + t('Auto', 'Auto'))
          : h('select', { style: { width: 'auto', fontSize: '12px' }, onChange: e => up(x => { x.compliance = x.compliance || {}; const cur = x.compliance[it.key] || {}; x.compliance[it.key] = { status: e.target.value, date: e.target.value === 'done' ? (cur.date || todayLocalISO()) : (cur.date || '') }; }) },
            h('option', { value: 'todo', selected: it.status === 'todo' }, t('À faire', 'To do')),
            h('option', { value: 'done', selected: it.status === 'done' }, t('Complété', 'Done')),
            h('option', { value: 'na', selected: it.status === 'na' }, t('S.O.', 'N/A'))),
      ),
    ))));

  // ---------- Opportunities ----------
  const ops = c.opportunities || [];
  const changeStage = (oppId, stage) => {
    let won = null;
    up(x => { const z = x.opportunities.find(q => q.id === oppId); if (!z) return; const before = normalizeStage(z.stage); applyStage(z, stage); if (z.stage === 'won' && before !== 'won') won = { ...z }; });
    if (won) openProductFromOpportunity(store, c.id, won);
  };
  const oppCard = card(t('Opportunités', 'Opportunities'), { sub: `${ops.filter(o => OPEN_STAGES.includes(normalizeStage(o.stage))).length} ${t('ouverte(s)', 'open')}`,
      right: h('button', { class: 'btn sm', html: icon('plus', 13), onClick: () => openOpp(store, c.id) }) },
    ops.length ? h('div', {}, ...ops.map(o => h('div', { class: 'flex between center', style: { padding: '9px 0', borderBottom: '1px solid var(--border)' } },
      h('div', {}, h('div', { style: { fontWeight: '600', fontSize: '13px' } }, o.title),
        h('div', { class: 'tiny muted' }, `${money(o.value, { compact: true })}${o.valueKind === 'premium' ? '/an' : ' AUM'} · ${o.probability || 0} %${o.expectedClose ? ' · ' + fmtDate(o.expectedClose) : ''}`)),
      h('div', { class: 'inline', style: { flexWrap: 'nowrap' } },
        h('select', { style: { width: 'auto', fontSize: '12px' }, onChange: e => changeStage(o.id, e.target.value) },
          ...STAGE_ORDER.map(s => h('option', { value: s, selected: s === normalizeStage(o.stage) }, STAGE_META[s].label()))),
        normalizeStage(o.stage) === 'won' ? h('button', { class: 'btn icon sm ghost', title: t('Créer le produit', 'Create the product'), html: icon('insurance', 14), onClick: () => openProductFromOpportunity(store, c.id, o) }) : null,
        h('button', { class: 'btn icon sm ghost', html: icon('trash', 14), onClick: () => up(x => { x.opportunities = x.opportunities.filter(q => q.id !== o.id); }) }),
      ),
    ))) : h('div', { class: 'empty tiny' }, t('Aucune opportunité', 'No opportunities')));

  // ---------- Products / policies (status-filtered totals; AUM read through the linked asset) ----------
  const prods = c.products || [];
  const aum = clientAum(c), prem = clientAnnualPremium(c), rec = clientRecurring(c);
  const amountOf = (p) => {
    const measure = (PRODUCT_KIND_META[p.kind] || {}).measure;
    if (measure === 'aum') return money(aumOf(c, p), { compact: true });
    if (measure === 'face') return money(num0(p.faceAmount), { compact: true });
    return '—';
  };
  const prodCard = card(t('Produits & polices', 'Products & policies'), {
      sub: `${money(aum, { compact: true })} AUM · ${money(prem, { compact: true })}/${t('an', 'yr')} ${t('primes', 'premium')} · ${money(rec, { compact: true })}/${t('an', 'yr')} ${t('récurrent', 'recurring')}`,
      right: h('button', { class: 'btn sm', html: icon('plus', 13), onClick: () => openProduct(store, c.id) }) },
    prods.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, t('Type', 'Type')), h('th', {}, t('Assureur', 'Carrier')),
        h('th', { class: 'num' }, t('Montant', 'Amount')), h('th', { class: 'num' }, t('Prime/an', 'Premium/yr')), h('th', {}, ''))),
      h('tbody', {}, ...prods.map(p => {
        const inactive = p.status === 'lapsed' || p.status === 'cancelled';
        return h('tr', { style: inactive ? { opacity: '.55' } : {} },
          h('td', {}, h('div', {}, (PRODUCT_KIND_META[p.kind] || { label: () => p.kind }).label()),
            h('div', { class: 'tiny muted' }, [memberName(p.insuredId), (PRODUCT_STATUS_META[p.status] || {}).label?.()].filter(Boolean).join(' · '))),
          h('td', {}, h('div', {}, p.carrier || '—'), p.policyNumber ? h('div', { class: 'tiny muted' }, p.policyNumber) : null),
          h('td', { class: 'num mono' }, amountOf(p)),
          h('td', { class: 'num mono' }, num0(p.premium) ? money(annualPremium(p), { compact: true }) : '—'),
          h('td', { class: 'num', style: { whiteSpace: 'nowrap' } },
            h('button', { class: 'btn icon sm ghost', title: t('Modifier', 'Edit'), html: icon('edit', 14), onClick: () => openProduct(store, c.id, p, { existingId: p.id }) }),
            h('button', { class: 'btn icon sm ghost', html: icon('trash', 14), onClick: () => up(x => { x.products = x.products.filter(q => q.id !== p.id); }) })),
        );
      })),
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
        h('span', { class: 'chip' }, tk.due ? fmtDate(tk.due) : '—'),
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
  let key = CADENCES[0].key, from = todayLocalISO();
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
      field(t('Type', 'Type'), h('select', { onChange: e => draft.type = e.target.value },
        ...OPP_TYPE_OPTIONS.map(([v, l]) => h('option', { value: v, selected: v === draft.type }, l())))),
      h('div', { class: 'grid cols-2', style: { gap: '12px' } },
        field(t('Valeur', 'Value'), h('input', { type: 'number', value: draft.value, onInput: e => draft.value = num0(e.target.value) })),
        field(t('Type de valeur', 'Value type'), h('select', { onChange: e => draft.valueKind = e.target.value },
          h('option', { value: 'aum', selected: draft.valueKind === 'aum' }, t('Actifs (AUM)', 'Assets (AUM)')),
          h('option', { value: 'premium', selected: draft.valueKind === 'premium' }, t('Prime annuelle', 'Annual premium'))))),
      h('div', { class: 'grid cols-2', style: { gap: '12px' } },
        field(t('Probabilité (%)', 'Probability (%)'), h('input', { type: 'number', value: draft.probability, onInput: e => draft.probability = num0(e.target.value) })),
        field(t('Clôture prévue', 'Expected close'), h('input', { type: 'date', onInput: e => draft.expectedClose = e.target.value }))),
      field(t('Notes', 'Notes'), h('textarea', { rows: 2, onInput: e => draft.notes = e.target.value })),
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

/**
 * Product / policy modal. `seed` pre-fills the draft (a won opportunity, or an existing product when
 * `existingId` is given → edit in place). Investment kinds may link an existing balance-sheet asset;
 * left blank, the store creates the asset on save and mirrors its value into p.aum.
 */
export function openProduct(store, clientId, seed = {}, { existingId = null, title = null } = {}) {
  const client = store.state.clients.find(x => x.id === clientId); if (!client) return;
  const members = client.members || [];
  const draft = existingId ? { ...seed } : newProduct({ insuredId: primaryMember(client).id || null, ...seed });
  const measure = () => (PRODUCT_KIND_META[draft.kind] || {}).measure || 'face';
  const isInv = () => INVESTMENT_KINDS.includes(draft.kind);
  const numInput = (key, extra = {}) => h('input', { type: 'number', value: num0(draft[key]) || '', placeholder: '0', onInput: e => draft[key] = num0(e.target.value), ...extra });
  const txtInput = (key, extra = {}) => h('input', { value: draft[key] || '', onInput: e => draft[key] = e.target.value, ...extra });
  const dateInput = (key) => h('input', { type: 'date', value: draft[key] || '', onInput: e => draft[key] = e.target.value });

  const aumInp = numInput('aum');
  const faceField = field(t('Capital assuré', 'Face amount'), numInput('faceAmount'));
  const aumField = field(t('Actifs (AUM)', 'Assets (AUM)'), aumInp, t('Reflète la valeur de l’actif lié au bilan.', 'Mirrors the linked balance-sheet asset.'));
  const linkedElsewhere = new Set((client.products || []).filter(p => p.assetId && p.id !== draft.id).map(p => p.assetId));
  const assetSel = h('select', { onChange: e => { draft.assetId = e.target.value || null; const a = (client.assets || []).find(x => x.id === draft.assetId); if (a) { draft.aum = num0(a.value); aumInp.value = draft.aum; } } },
    h('option', { value: '', selected: !draft.assetId }, t('— Créer un nouvel actif au bilan —', '— Create a new balance-sheet asset —')),
    ...(client.assets || []).filter(a => !linkedElsewhere.has(a.id) || a.id === draft.assetId).map(a => h('option', { value: a.id, selected: a.id === draft.assetId }, `${a.label || a.type} · ${money(num0(a.value), { compact: true })}`)));
  const assetField = field(t('Actif lié (bilan)', 'Linked asset (balance sheet)'), assetSel, t('Laissez vide pour créer l’actif automatiquement à l’enregistrement.', 'Leave blank to create the asset automatically on save.'));
  const refreshKind = () => { const m = measure(); faceField.style.display = m === 'face' ? '' : 'none'; aumField.style.display = m === 'aum' ? '' : 'none'; assetField.style.display = isInv() ? '' : 'none'; };
  const kindSel = h('select', { onChange: e => { draft.kind = e.target.value; refreshKind(); } },
    ...Object.keys(PRODUCT_KIND_META).map(k => h('option', { value: k, selected: k === draft.kind }, PRODUCT_KIND_META[k].label())));
  const statusSel = h('select', { onChange: e => draft.status = e.target.value },
    ...Object.keys(PRODUCT_STATUS_META).map(k => h('option', { value: k, selected: k === (draft.status || 'inforce') }, PRODUCT_STATUS_META[k].label())));
  const insuredSel = h('select', { onChange: e => draft.insuredId = e.target.value || null },
    ...members.map(mm => h('option', { value: mm.id, selected: mm.id === draft.insuredId }, mm.name)));
  const freqSel = h('select', { onChange: e => draft.frequency = e.target.value },
    h('option', { value: 'annual', selected: (draft.frequency || 'annual') === 'annual' }, t('Annuelle', 'Annual')),
    h('option', { value: 'monthly', selected: draft.frequency === 'monthly' }, t('Mensuelle', 'Monthly')),
    h('option', { value: 'single', selected: draft.frequency === 'single' }, t('Unique', 'Single')));
  refreshKind();

  const m = modal({ title: title || (existingId ? t('Modifier le produit', 'Edit product') : t('Nouveau produit', 'New product')),
    body: h('div', { class: 'grid', style: { gap: '12px' } },
      h('div', { class: 'grid cols-2', style: { gap: '12px' } },
        field(t('Type', 'Type'), kindSel),
        field(t('Statut', 'Status'), statusSel)),
      h('div', { class: 'grid cols-2', style: { gap: '12px' } },
        field(t('Assureur / firme', 'Carrier / firm'), txtInput('carrier')),
        field(t('N° de police / compte', 'Policy / account #'), txtInput('policyNumber'))),
      h('div', { class: 'grid cols-2', style: { gap: '12px' } },
        field(t('Assuré / titulaire', 'Insured / owner'), insuredSel),
        faceField, aumField),
      assetField,
      h('div', { class: 'grid cols-2', style: { gap: '12px' } },
        field(t('Prime', 'Premium'), numInput('premium')),
        field(t('Fréquence', 'Frequency'), freqSel)),
      h('div', { class: 'grid cols-2', style: { gap: '12px' } },
        field(t('Date d’émission', 'Issue date'), dateInput('issueDate')),
        field(t('Renouvellement', 'Renewal'), dateInput('renewalDate'))),
      h('div', { class: 'grid cols-2', style: { gap: '12px' } },
        field(t('Commission 1re année', 'First-year commission'), numInput('firstYearCommission')),
        field(t('Commission récurrente / an', 'Recurring commission / yr'), numInput('renewalCommission'))),
      field(t('Notes', 'Notes'), h('textarea', { rows: 2, onInput: e => draft.notes = e.target.value }, draft.notes || '')),
    ),
    footer: [h('button', { class: 'btn ghost', onClick: () => m.close() }, t('Annuler', 'Cancel')),
      h('button', { class: 'btn primary', onClick: () => {
        if (!isInv()) { draft.assetId = null; draft.aum = 0; }
        store.updateClient(clientId, c => {
          c.products = c.products || [];
          const i = existingId ? c.products.findIndex(q => q.id === existingId) : -1;
          if (i >= 0) c.products[i] = draft; else c.products.push(draft);
          // investment kinds: the store's syncDerived links the chosen asset (or creates one) and mirrors its value into p.aum
        });
        m.close(); toast(existingId ? t('Produit mis à jour ✓', 'Product updated ✓') : t('Produit ajouté ✓', 'Product added ✓'));
      } }, existingId ? t('Enregistrer', 'Save') : t('Ajouter', 'Add'))] });
}

/** Won opportunity → pre-filled product (type → kind, value → AUM or annual premium by valueKind, issued today). */
export function openProductFromOpportunity(store, clientId, o) {
  const client = store.state.clients.find(x => x.id === clientId); if (!client || !o) return;
  const kind = kindForOpportunity(o);
  const seed = { kind, status: 'pending', insuredId: primaryMember(client).id || null, issueDate: todayLocalISO(), firstYearCommission: 0, notes: o.title || '' };
  if (o.valueKind === 'premium') { seed.premium = num0(o.value); seed.frequency = 'annual'; }
  else seed.aum = num0(o.value);
  openProduct(store, clientId, seed, { title: t('Opportunité gagnée — créer le produit', 'Won opportunity — create the product') });
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
      (cc.activities = cc.activities || []).push(newActivity({ type: 'email', subject: tpl.name(), date: todayLocalISO(), body: t('Courriel envoyé (modèle).', 'Email sent (template).') }));
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
