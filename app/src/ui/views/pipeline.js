// ============================================================
// Sales pipeline — Kanban board of opportunities across the book.
// Move a card through the stages; click to open the contact.
// ============================================================
import { h, icon, money, t, fmtDate, modal, toast, field } from '../dom.js';
import { allOpportunities, pipelineSummary, STAGE_META, STAGE_ORDER, contactName } from '../../engine/crm.js';
import { newOpportunity } from '../../state/models.js';

const TYPE_OPTS = [
  ['investment', () => t('Placement', 'Investment')], ['life', () => t('Assurance vie', 'Life')],
  ['disability', () => t('Invalidité', 'Disability')], ['ci', () => t('Maladies graves', 'Critical illness')],
  ['mortgage', () => t('Hypothèque', 'Mortgage')], ['group', () => t('Collectif', 'Group')],
  ['planning', () => t('Planification', 'Planning')], ['other', () => t('Autre', 'Other')],
];

export function render({ store, navigate }) {
  const clients = store.state.clients;
  const goto = (id) => { store.setActive(id); navigate('relation'); };
  const pipe = pipelineSummary(clients);
  const ops = allOpportunities(clients);

  const move = (op, dir) => {
    const i = STAGE_ORDER.indexOf(op.stage);
    const ni = Math.max(0, Math.min(STAGE_ORDER.length - 1, i + dir));
    const ns = STAGE_ORDER[ni];
    store.updateClient(op.clientId, c => {
      const o = (c.opportunities || []).find(z => z.id === op.id); if (!o) return;
      o.stage = ns;
      o.closedAt = (ns === 'won' || ns === 'lost') ? Date.now() : null;
      if (ns === 'won') o.probability = 100; else if (ns === 'lost') o.probability = 0;
    });
  };

  const columns = STAGE_ORDER.map(stage => {
    const meta = STAGE_META[stage];
    const list = ops.filter(o => o.stage === stage);
    const sum = pipe.stages.find(s => s.key === stage) || { premium: 0, aum: 0 };
    return h('div', { style: { flex: '1 0 230px', minWidth: '230px', background: 'var(--surface-2)', borderRadius: 'var(--r)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '9px' } },
      h('div', { class: 'flex between center', style: { paddingBottom: '8px', borderBottom: `2px solid ${meta.color}` } },
        h('span', { style: { fontWeight: '700', fontSize: '13px' } }, meta.label()),
        h('span', { class: 'chip', style: { background: meta.color, color: 'var(--c-black)' } }, String(list.length))),
      h('div', { class: 'tiny muted', style: { marginTop: '-4px' } }, money(sum.premium + sum.aum, { compact: true })),
      ...(list.length ? list.map(op => opCard(op, stage, move, goto)) :
        [h('div', { class: 'tiny muted', style: { textAlign: 'center', padding: '18px 4px', opacity: '.6' } }, '—')]),
    );
  });

  const board = h('div', { style: { display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', alignItems: 'flex-start' } }, ...columns);

  const header = h('div', { class: 'flex between center', style: { marginBottom: '16px', flexWrap: 'wrap', gap: '10px' } },
    h('div', { class: 'legend' },
      h('span', {}, h('b', { class: 'mono' }, money(pipe.weightedPremium, { compact: true })), ' ', t('pipeline pondéré', 'weighted pipeline')),
      h('span', {}, h('b', { class: 'mono' }, money(pipe.openAum, { compact: true })), ' ', t('AUM en jeu', 'AUM in play')),
      h('span', {}, h('b', { class: 'mono', style: { color: 'var(--pos)' } }, pipe.conversion ? Math.round(pipe.conversion * 100) + ' %' : '—'), ' ', t('conversion', 'conversion'))),
    h('button', { class: 'btn primary', html: icon('plus', 14) + ' ' + t('Nouvelle opportunité', 'New opportunity'),
      onClick: () => openNewOpp(store, clients) }),
  );

  if (!ops.length) {
    return h('div', {}, header, h('div', { class: 'card empty' }, h('div', { class: 'big' }, '🎯'),
      t('Aucune opportunité — ajoutez-en une pour démarrer votre pipeline', 'No opportunities — add one to start your pipeline')));
  }
  return h('div', {}, header, board);
}

function opCard(op, stage, move, goto) {
  const i = STAGE_ORDER.indexOf(stage);
  return h('div', { class: 'card', style: { padding: '11px 12px', boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }, onClick: () => goto(op.clientId) },
    h('div', { style: { fontWeight: '700', fontSize: '13px', marginBottom: '2px' } }, op.title),
    h('div', { class: 'tiny muted' }, `${op.contact} · ${op.clientName}`),
    h('div', { class: 'flex between center', style: { marginTop: '8px' } },
      h('span', { class: 'chip' }, money(op.value, { compact: true }) + (op.valueKind === 'premium' ? '/an' : ' AUM')),
      h('span', { class: 'tiny muted' }, (op.probability || 0) + ' %')),
    op.expectedClose ? h('div', { class: 'tiny muted', style: { marginTop: '5px' } }, icon('calendar', 11) + '') : null,
    op.expectedClose ? h('div', { class: 'tiny muted', style: { marginTop: '2px' } }, t('Clôture ', 'Close ') + fmtDate(op.expectedClose)) : null,
    h('div', { class: 'inline', style: { marginTop: '9px', justifyContent: 'space-between', flexWrap: 'nowrap' } },
      h('button', { class: 'btn icon sm ghost', title: t('Reculer', 'Back'), disabled: i === 0,
        html: '◀', onClick: e => { e.stopPropagation(); move(op, -1); } }),
      h('button', { class: 'btn icon sm ghost', title: t('Avancer', 'Advance'), disabled: i >= STAGE_ORDER.length - 1,
        html: '▶', onClick: e => { e.stopPropagation(); move(op, 1); } }),
    ),
  );
}

function openNewOpp(store, clients) {
  if (!clients.length) { toast(t('Créez d’abord un contact', 'Create a contact first')); return; }
  const draft = newOpportunity({ stage: 'new' });
  let clientId = store.state.activeId || clients[0].id;
  const m = modal({
    title: t('Nouvelle opportunité', 'New opportunity'),
    body: h('div', { class: 'grid', style: { gap: '12px' } },
      field(t('Contact', 'Contact'),
        h('select', { onChange: e => clientId = e.target.value },
          ...clients.map(c => h('option', { value: c.id, selected: c.id === clientId }, `${c.name}`)))),
      field(t('Titre', 'Title'), h('input', { value: draft.title, onInput: e => draft.title = e.target.value })),
      field(t('Type', 'Type'),
        h('select', { onChange: e => draft.type = e.target.value }, ...TYPE_OPTS.map(([v, l]) => h('option', { value: v, selected: v === draft.type }, l())))),
      h('div', { class: 'grid cols-2', style: { gap: '12px' } },
        field(t('Valeur', 'Value'), h('input', { type: 'number', value: draft.value, onInput: e => draft.value = parseFloat(e.target.value) || 0 })),
        field(t('Type de valeur', 'Value type'),
          h('select', { onChange: e => draft.valueKind = e.target.value },
            h('option', { value: 'aum', selected: draft.valueKind === 'aum' }, t('Actifs (AUM)', 'Assets (AUM)')),
            h('option', { value: 'premium', selected: draft.valueKind === 'premium' }, t('Prime annuelle', 'Annual premium'))))),
      h('div', { class: 'grid cols-2', style: { gap: '12px' } },
        field(t('Probabilité (%)', 'Probability (%)'), h('input', { type: 'number', value: draft.probability, onInput: e => draft.probability = parseFloat(e.target.value) || 0 })),
        field(t('Clôture prévue', 'Expected close'), h('input', { type: 'date', value: draft.expectedClose, onInput: e => draft.expectedClose = e.target.value }))),
      field(t('Notes', 'Notes'), h('textarea', { rows: 2, onInput: e => draft.notes = e.target.value })),
    ),
    footer: [
      h('button', { class: 'btn ghost', onClick: () => m.close() }, t('Annuler', 'Cancel')),
      h('button', { class: 'btn primary', onClick: () => {
        store.updateClient(clientId, c => { (c.opportunities = c.opportunities || []).push(draft); });
        m.close(); toast(t('Opportunité ajoutée', 'Opportunity added'));
      } }, t('Ajouter', 'Add')),
    ],
  });
}
