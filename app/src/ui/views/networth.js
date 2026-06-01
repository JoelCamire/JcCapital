import { h, money, pct, icon, toast } from '../dom.js';
import { kpi, card, dataTable, legend, statList } from '../widgets.js';
import { donutChart, barChart, PALETTE } from '../charts.js';
import { formModal } from '../editor.js';
import { store } from '../../state/store.js';
import { newAsset, newLiability } from '../../state/models.js';
import { accountTypesFor, accountMeta } from '../../jurisdictions/index.js';
import { netWorthBreakdown } from '../../engine/analysis.js';
import { treatmentOf } from '../../engine/projection.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const nw = netWorthBreakdown(client);
  const accTypes = accountTypesFor(client.jurisdiction.country);
  const accOpts = [...accTypes.map(a => ({ value: a.id, label: `${a.name}` })),
    { value: 'realestate', label: 'Immobilier' }, { value: 'cash', label: 'Encaisse' }, { value: 'other', label: 'Autre actif' }];
  const liabOpts = [
    { value: 'mortgage', label: 'Hypothèque' }, { value: 'loan', label: 'Prêt personnel / auto' },
    { value: 'credit', label: 'Crédit / marge' }, { value: 'student', label: 'Prêt étudiant' }, { value: 'other', label: 'Autre' },
  ];
  const memberOpts = client.members.map(m => ({ value: m.id, label: m.name }));
  const nameOf = (id) => client.members.find(m => m.id === id)?.name || '—';

  const donutSegs = nw.byTreat.map((b, i) => ({ label: b.label, value: b.value, color: PALETTE[i % PALETTE.length] }));

  const kpis = h('div', { class: 'grid cols-4 span-full' },
    kpi({ label: 'Actifs totaux', value: money(nw.assets, { currency: cur, compact: true }), iconName: 'bank' }),
    kpi({ label: 'Passifs totaux', value: money(nw.liabilities, { currency: cur, compact: true }), iconName: 'doc', accent: 'var(--neg)' }),
    kpi({ label: 'Valeur nette', value: money(nw.netWorth, { currency: cur, compact: true }), iconName: 'networth', accent: 'var(--pos)' }),
    kpi({ label: 'Actifs liquides', value: money(nw.liquid, { currency: cur, compact: true }), sub: `Ratio dettes/actifs ${pct(nw.debtToAsset, 0)}` }),
  );

  const assetsCard = card('Actifs', {
    sub: 'Comptes, placements et biens',
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' Actif', onClick: () => editAsset(newAsset({ ownerId: client.members[0].id }), true) }),
  },
    dataTable({
      rows: client.assets,
      cols: [
        { key: 'label', label: 'Description' },
        { key: 'type', label: 'Type', fmt: v => accountMeta(client.jurisdiction.country, v).name || v },
        { key: 'ownerId', label: 'Titulaire', fmt: nameOf },
        { key: 'value', label: 'Valeur', num: true, fmt: v => money(v, { currency: cur }) },
        { key: 'growth', label: 'Rendement', num: true, fmt: v => pct(v) },
        { key: 'annualContribution', label: 'Cotisation/an', num: true, fmt: v => v ? money(v, { currency: cur }) : '—' },
      ],
      onEdit: (r) => editAsset(r, false),
      onDelete: (r) => { store.update(c => c.assets = c.assets.filter(a => a.id !== r.id)); toast('Actif supprimé'); },
    }));

  const liabCard = card('Passifs', {
    sub: 'Dettes et engagements',
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' Passif', onClick: () => editLiab(newLiability(), true) }),
  },
    dataTable({
      rows: client.liabilities,
      cols: [
        { key: 'label', label: 'Description' },
        { key: 'type', label: 'Type', fmt: v => liabOpts.find(o => o.value === v)?.label || v },
        { key: 'balance', label: 'Solde', num: true, fmt: v => money(v, { currency: cur }) },
        { key: 'rate', label: 'Taux', num: true, fmt: v => pct(v, 2) },
        { key: 'payment', label: 'Paiement/mois', num: true, fmt: v => money(v, { currency: cur }) },
      ],
      onEdit: (r) => editLiab(r, false),
      onDelete: (r) => { store.update(c => c.liabilities = c.liabilities.filter(l => l.id !== r.id)); toast('Passif supprimé'); },
    }));

  const breakdownCard = card('Répartition fiscale des actifs', { sub: 'Optimisation de l\'emplacement des actifs' },
    h('div', { class: 'flex center', style: { justifyContent: 'center' } },
      h('div', { html: donutChart({ segments: donutSegs, centerLabel: money(nw.assets, { currency: cur, compact: true }), centerSub: 'actifs' }) })),
    h('div', { class: 'sep' }),
    legend(donutSegs.map(s => ({ color: s.color, label: `${s.label} · ${pct(nw.assets ? s.value / nw.assets : 0, 0)}` }))),
  );

  // selected account info
  const infoCard = card('Notes sur les régimes — ' + jur.name, { sub: 'Règles fiscales applicables' },
    h('div', {}, ...accTypes.map(a => h('div', { style: { padding: '9px 0', borderBottom: '1px solid var(--border)' } },
      h('div', { class: 'flex between' }, h('b', {}, `${a.name}`), a.limit ? h('span', { class: 'chip info' }, `Max ${money(a.limit, { currency: cur })}/an`) : null),
      h('div', { class: 'tiny muted' }, a.note),
    ))));

  return h('div', { class: 'grid' },
    kpis,
    h('div', { class: 'span-full' }, assetsCard),
    h('div', { class: 'span-full' }, liabCard),
    h('div', { class: 'grid cols-2 span-full' }, breakdownCard, infoCard),
  );

  function editAsset(item, isNew) {
    const meta = accountMeta(client.jurisdiction.country, item.type);
    formModal({ title: isNew ? 'Nouvel actif' : 'Modifier l\'actif', item,
      intro: meta.note,
      fields: [
        { key: 'label', label: 'Description' },
        { key: 'type', label: 'Type de compte', type: 'select', opts: accOpts },
        { key: 'ownerId', label: 'Titulaire', type: 'select', opts: memberOpts },
        { key: 'value', label: `Valeur actuelle (${cur})`, type: 'number' },
        { key: 'costBasis', label: `Coût / base (${cur})`, type: 'number', hint: 'Pour le calcul des gains en capital' },
        { key: 'growth', label: 'Rendement annuel', type: 'pct' },
        { key: 'annualContribution', label: `Cotisation annuelle (${cur})`, type: 'number' },
        { key: 'employerMatch', label: `Contribution employeur (${cur})`, type: 'number' },
      ],
      onSave: (d) => store.update(c => { if (isNew) c.assets.push(d); else Object.assign(c.assets.find(a => a.id === d.id), d); }),
    });
  }
  function editLiab(item, isNew) {
    formModal({ title: isNew ? 'Nouveau passif' : 'Modifier le passif', item,
      fields: [
        { key: 'label', label: 'Description' },
        { key: 'type', label: 'Type', type: 'select', opts: liabOpts },
        { key: 'balance', label: `Solde (${cur})`, type: 'number' },
        { key: 'rate', label: 'Taux d\'intérêt', type: 'pct', step: 0.01 },
        { key: 'payment', label: `Paiement mensuel (${cur})`, type: 'number' },
      ],
      onSave: (d) => store.update(c => { if (isNew) c.liabilities.push(d); else Object.assign(c.liabilities.find(l => l.id === d.id), d); }),
    });
  }
}
