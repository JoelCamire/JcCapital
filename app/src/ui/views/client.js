import { h, money, pct, num, icon, toast } from '../dom.js';
import { card, dataTable } from '../widgets.js';
import { formModal } from '../editor.js';
import { store } from '../../state/store.js';
import { newMember, newIncome, newExpense } from '../../state/models.js';

export function render({ client, jur }) {
  const memberOpts = client.members.map(m => ({ value: m.id, label: m.name }));
  const cur = jur.currency;

  const incomeTypeOpts = [
    { value: 'employment', label: 'Emploi' }, { value: 'self', label: 'Travail autonome' },
    { value: 'pension', label: 'Rente / pension privée' }, { value: 'cpp', label: jur.pensions.cpp.name },
    { value: 'oas', label: jur.pensions.oas.name || 'Pension publique 2' },
    { value: 'rental', label: 'Revenu locatif' }, { value: 'other', label: 'Autre' },
  ];
  const expenseCatOpts = [
    { value: 'living', label: 'Coût de vie' }, { value: 'lifestyle', label: 'Style de vie' },
    { value: 'transport', label: 'Transport' }, { value: 'housing', label: 'Logement' },
    { value: 'health', label: 'Santé' }, { value: 'other', label: 'Autre' },
  ];

  const nameOf = (id) => client.members.find(m => m.id === id)?.name || '—';

  // ---- Members ----
  const memberCard = card('Membres du ménage', {
    sub: `${jur.flag} ${jur.name} — ${jur.regionName}`,
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' Membre',
      onClick: () => editMember(newMember({ role: 'spouse' }), true) }),
  },
    dataTable({
      rows: client.members,
      cols: [
        { key: 'name', label: 'Nom' },
        { key: 'role', label: 'Rôle', fmt: v => v === 'primary' ? 'Titulaire' : 'Conjoint(e)' },
        { key: 'currentAge', label: 'Âge', num: true },
        { key: 'retirementAge', label: 'Retraite', num: true },
        { key: 'lifeExpectancy', label: 'Espérance', num: true },
      ],
      onEdit: (r) => editMember(r, false),
      onDelete: client.members.length > 1 ? (r) => { store.update(c => c.members = c.members.filter(m => m.id !== r.id)); toast('Membre supprimé'); } : null,
    }));

  // ---- Incomes ----
  const incomeCard = card('Revenus', {
    sub: 'Salaires, rentes et prestations publiques',
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' Revenu',
      onClick: () => editIncome(newIncome({ memberId: client.members[0].id }), true) }),
  },
    dataTable({
      rows: client.incomes,
      cols: [
        { key: 'label', label: 'Source' },
        { key: 'memberId', label: 'Membre', fmt: nameOf },
        { key: 'type', label: 'Type', fmt: v => incomeTypeOpts.find(o => o.value === v)?.label || v },
        { key: 'amount', label: 'Montant/an', num: true, fmt: v => money(v, { currency: cur }) },
        { key: 'growth', label: 'Croissance', num: true, fmt: v => pct(v) },
        { key: 'startAge', label: 'Début', num: true, fmt: v => v ?? '—' },
      ],
      onEdit: (r) => editIncome(r, false),
      onDelete: (r) => { store.update(c => c.incomes = c.incomes.filter(i => i.id !== r.id)); toast('Revenu supprimé'); },
    }));

  // ---- Expenses ----
  const totalExp = client.expenses.reduce((s, e) => s + e.amount, 0);
  const expenseCard = card('Dépenses', {
    sub: `${money(totalExp, { currency: cur })} / an au total`,
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' Dépense',
      onClick: () => editExpense(newExpense(), true) }),
  },
    dataTable({
      rows: client.expenses,
      cols: [
        { key: 'label', label: 'Poste' },
        { key: 'category', label: 'Catégorie', fmt: v => expenseCatOpts.find(o => o.value === v)?.label || v },
        { key: 'amount', label: 'Montant/an', num: true, fmt: v => money(v, { currency: cur }) },
        { key: 'retirementFactor', label: 'Facteur retraite', num: true, fmt: v => pct(v, 0) },
      ],
      onEdit: (r) => editExpense(r, false),
      onDelete: (r) => { store.update(c => c.expenses = c.expenses.filter(e => e.id !== r.id)); toast('Dépense supprimée'); },
    }));

  // ---- Household settings ----
  const settingsCard = card('Paramètres du ménage', {},
    h('div', { class: 'grid cols-2' },
      h('div', { class: 'field' }, h('label', {}, 'Nom du dossier'),
        h('input', { value: client.name, onInput: e => store.quietUpdate(c => c.name = e.target.value), onChange: e => store.update(c => c.name = e.target.value) })),
      h('div', { class: 'field' }, h('label', {}, 'Statut fiscal'),
        h('select', { onChange: e => store.update(c => c.filingStatus = e.target.value) },
          h('option', { value: 'single', selected: client.filingStatus === 'single' }, 'Célibataire / individuel'),
          h('option', { value: 'married', selected: client.filingStatus === 'married' }, 'Couple'))),
    ));

  return h('div', { class: 'grid' },
    h('div', { class: 'span-full' }, memberCard),
    h('div', { class: 'grid cols-2 span-full' }, incomeCard, expenseCard),
    h('div', { class: 'span-full' }, settingsCard),
  );

  // ---- Editors ----
  function editMember(item, isNew) {
    formModal({ title: isNew ? 'Nouveau membre' : 'Modifier le membre', item,
      fields: [
        { key: 'name', label: 'Nom' },
        { key: 'role', label: 'Rôle', type: 'select', opts: [{ value: 'primary', label: 'Titulaire' }, { value: 'spouse', label: 'Conjoint(e)' }] },
        { key: 'currentAge', label: 'Âge actuel', type: 'number' },
        { key: 'retirementAge', label: 'Âge de retraite', type: 'number' },
        { key: 'lifeExpectancy', label: 'Espérance de vie', type: 'number' },
      ],
      onSave: (d) => store.update(c => { if (isNew) c.members.push(d); else Object.assign(c.members.find(m => m.id === d.id), d); }),
    });
  }
  function editIncome(item, isNew) {
    formModal({ title: isNew ? 'Nouveau revenu' : 'Modifier le revenu', item,
      fields: [
        { key: 'label', label: 'Description' },
        { key: 'memberId', label: 'Membre', type: 'select', opts: memberOpts },
        { key: 'type', label: 'Type', type: 'select', opts: incomeTypeOpts },
        { key: 'amount', label: `Montant annuel (${cur})`, type: 'number' },
        { key: 'growth', label: 'Croissance annuelle', type: 'pct', hint: 'Indexation / progression' },
        { key: 'startAge', label: 'Âge de début', type: 'number', hint: 'Vide = dès maintenant' },
        { key: 'endAge', label: 'Âge de fin', type: 'number', hint: 'Vide = à vie' },
      ],
      onSave: (d) => store.update(c => { if (isNew) c.incomes.push(d); else Object.assign(c.incomes.find(i => i.id === d.id), d); }),
    });
  }
  function editExpense(item, isNew) {
    formModal({ title: isNew ? 'Nouvelle dépense' : 'Modifier la dépense', item,
      fields: [
        { key: 'label', label: 'Description' },
        { key: 'category', label: 'Catégorie', type: 'select', opts: expenseCatOpts },
        { key: 'amount', label: `Montant annuel (${cur})`, type: 'number' },
        { key: 'growth', label: 'Inflation appliquée', type: 'pct' },
        { key: 'retirementFactor', label: 'Facteur à la retraite', type: 'pct', hint: '80 % = baisse de 20 % à la retraite' },
      ],
      onSave: (d) => store.update(c => { if (isNew) c.expenses.push(d); else Object.assign(c.expenses.find(e => e.id === d.id), d); }),
    });
  }
}
