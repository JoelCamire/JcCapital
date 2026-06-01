import { h, money, pct, num, icon, toast, t } from '../dom.js';
import { card, dataTable } from '../widgets.js';
import { formModal } from '../editor.js';
import { store } from '../../state/store.js';
import { newMember, newIncome, newExpense } from '../../state/models.js';

export function render({ client, jur }) {
  const memberOpts = client.members.map(m => ({ value: m.id, label: m.name }));
  const cur = jur.currency;

  const incomeTypeOpts = [
    { value: 'employment', label: t('Emploi', 'Employment') }, { value: 'self', label: t('Travail autonome', 'Self-employment') },
    { value: 'pension', label: t('Rente / pension privée', 'Private pension / annuity') }, { value: 'cpp', label: jur.pensions.cpp.name },
    { value: 'oas', label: jur.pensions.oas.name || t('Pension publique 2', 'Public pension 2') },
    { value: 'rental', label: t('Revenu locatif', 'Rental income') }, { value: 'other', label: t('Autre', 'Other') },
  ];
  const expenseCatOpts = [
    { value: 'living', label: t('Coût de vie', 'Living') }, { value: 'lifestyle', label: t('Style de vie', 'Lifestyle') },
    { value: 'transport', label: 'Transport' }, { value: 'housing', label: t('Logement', 'Housing') },
    { value: 'health', label: t('Santé', 'Health') }, { value: 'other', label: t('Autre', 'Other') },
  ];

  const nameOf = (id) => client.members.find(m => m.id === id)?.name || '—';
  const incTypeLbl = v => (incomeTypeOpts.find(o => o.value === v) || {}).label || v;
  const expCatLbl = v => (expenseCatOpts.find(o => o.value === v) || {}).label || v;

  const memberCard = card(t('Membres du ménage', 'Household members'), {
    sub: `${jur.flag} ${jur.name} — ${jur.regionName}`,
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' ' + t('Membre', 'Member'),
      onClick: () => editMember(newMember({ role: 'spouse' }), true) }),
  },
    dataTable({
      rows: client.members,
      cols: [
        { key: 'name', label: t('Nom', 'Name') },
        { key: 'role', label: t('Rôle', 'Role'), fmt: v => v === 'primary' ? t('Titulaire', 'Primary') : t('Conjoint(e)', 'Spouse') },
        { key: 'currentAge', label: t('Âge', 'Age'), num: true },
        { key: 'retirementAge', label: t('Retraite', 'Retire'), num: true },
        { key: 'lifeExpectancy', label: t('Espérance', 'Life exp.'), num: true },
      ],
      onEdit: (r) => editMember(r, false),
      onDelete: client.members.length > 1 ? (r) => { store.update(c => c.members = c.members.filter(m => m.id !== r.id)); toast(t('Membre supprimé', 'Member removed')); } : null,
    }));

  const incomeCard = card(t('Revenus', 'Income'), {
    sub: t('Salaires, rentes et prestations publiques', 'Salaries, pensions and public benefits'),
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' ' + t('Revenu', 'Income'),
      onClick: () => editIncome(newIncome({ memberId: client.members[0].id }), true) }),
  },
    dataTable({
      rows: client.incomes,
      cols: [
        { key: 'label', label: t('Source', 'Source') },
        { key: 'memberId', label: t('Membre', 'Member'), fmt: nameOf },
        { key: 'type', label: 'Type', fmt: incTypeLbl },
        { key: 'amount', label: t('Montant/an', 'Amount/yr'), num: true, fmt: v => money(v, { currency: cur }) },
        { key: 'growth', label: t('Croissance', 'Growth'), num: true, fmt: v => pct(v) },
        { key: 'startAge', label: t('Début', 'Start'), num: true, fmt: v => v ?? '—' },
      ],
      onEdit: (r) => editIncome(r, false),
      onDelete: (r) => { store.update(c => c.incomes = c.incomes.filter(i => i.id !== r.id)); toast(t('Revenu supprimé', 'Income removed')); },
    }));

  const totalExp = client.expenses.reduce((s, e) => s + e.amount, 0);
  const expenseCard = card(t('Dépenses', 'Expenses'), {
    sub: t(`${money(totalExp, { currency: cur })} / an au total`, `${money(totalExp, { currency: cur })} / yr total`),
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' ' + t('Dépense', 'Expense'),
      onClick: () => editExpense(newExpense(), true) }),
  },
    dataTable({
      rows: client.expenses,
      cols: [
        { key: 'label', label: t('Poste', 'Item') },
        { key: 'category', label: t('Catégorie', 'Category'), fmt: expCatLbl },
        { key: 'amount', label: t('Montant/an', 'Amount/yr'), num: true, fmt: v => money(v, { currency: cur }) },
        { key: 'retirementFactor', label: t('Facteur retraite', 'Retirement factor'), num: true, fmt: v => pct(v, 0) },
      ],
      onEdit: (r) => editExpense(r, false),
      onDelete: (r) => { store.update(c => c.expenses = c.expenses.filter(e => e.id !== r.id)); toast(t('Dépense supprimée', 'Expense removed')); },
    }));

  const settingsCard = card(t('Paramètres du dossier', 'File settings'), {},
    h('div', { class: 'grid cols-2' },
      h('div', { class: 'field' }, h('label', {}, t('Nom du dossier', 'File name')),
        h('input', { value: client.name, onInput: e => store.quietUpdate(c => c.name = e.target.value), onChange: e => store.update(c => c.name = e.target.value) })),
      h('div', { class: 'field' }, h('label', {}, t('Statut fiscal', 'Filing status')),
        h('select', { onChange: e => store.update(c => c.filingStatus = e.target.value) },
          h('option', { value: 'single', selected: client.filingStatus === 'single' }, t('Célibataire / individuel', 'Single / individual')),
          h('option', { value: 'married', selected: client.filingStatus === 'married' }, t('Couple', 'Couple')))),
    ));

  return h('div', { class: 'grid' },
    h('div', { class: 'span-full' }, memberCard),
    h('div', { class: 'grid cols-2 span-full' }, incomeCard, expenseCard),
    h('div', { class: 'span-full' }, settingsCard),
  );

  function editMember(item, isNew) {
    formModal({ title: isNew ? t('Nouveau membre', 'New member') : t('Modifier le membre', 'Edit member'), item,
      fields: [
        { key: 'name', label: t('Nom', 'Name') },
        { key: 'role', label: t('Rôle', 'Role'), type: 'select', opts: [{ value: 'primary', label: t('Titulaire', 'Primary') }, { value: 'spouse', label: t('Conjoint(e)', 'Spouse') }] },
        { key: 'currentAge', label: t('Âge actuel', 'Current age'), type: 'number' },
        { key: 'retirementAge', label: t('Âge de retraite', 'Retirement age'), type: 'number' },
        { key: 'lifeExpectancy', label: t('Espérance de vie', 'Life expectancy'), type: 'number' },
      ],
      onSave: (d) => store.update(c => { if (isNew) c.members.push(d); else Object.assign(c.members.find(m => m.id === d.id), d); }),
    });
  }
  function editIncome(item, isNew) {
    formModal({ title: isNew ? t('Nouveau revenu', 'New income') : t('Modifier le revenu', 'Edit income'), item,
      fields: [
        { key: 'label', label: t('Description', 'Description') },
        { key: 'memberId', label: t('Membre', 'Member'), type: 'select', opts: memberOpts },
        { key: 'type', label: 'Type', type: 'select', opts: incomeTypeOpts },
        { key: 'amount', label: t(`Montant annuel (${cur})`, `Annual amount (${cur})`), type: 'number' },
        { key: 'growth', label: t('Croissance annuelle', 'Annual growth'), type: 'pct', hint: t('Indexation / progression', 'Indexation / progression') },
        { key: 'startAge', label: t('Âge de début', 'Start age'), type: 'number', hint: t('Vide = dès maintenant', 'Empty = from now') },
        { key: 'endAge', label: t('Âge de fin', 'End age'), type: 'number', hint: t('Vide = à vie', 'Empty = lifelong') },
      ],
      onSave: (d) => store.update(c => { if (isNew) c.incomes.push(d); else Object.assign(c.incomes.find(i => i.id === d.id), d); }),
    });
  }
  function editExpense(item, isNew) {
    formModal({ title: isNew ? t('Nouvelle dépense', 'New expense') : t('Modifier la dépense', 'Edit expense'), item,
      fields: [
        { key: 'label', label: t('Description', 'Description') },
        { key: 'category', label: t('Catégorie', 'Category'), type: 'select', opts: expenseCatOpts },
        { key: 'amount', label: t(`Montant annuel (${cur})`, `Annual amount (${cur})`), type: 'number' },
        { key: 'growth', label: t('Inflation appliquée', 'Applied inflation'), type: 'pct' },
        { key: 'retirementFactor', label: t('Facteur à la retraite', 'Retirement factor'), type: 'pct', hint: t('80 % = baisse de 20 % à la retraite', '80 % = 20 % lower in retirement') },
      ],
      onSave: (d) => store.update(c => { if (isNew) c.expenses.push(d); else Object.assign(c.expenses.find(e => e.id === d.id), d); }),
    });
  }
}
