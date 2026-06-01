import { h, money, pct, icon, toast, fmtDate, ageFromDob, t } from '../dom.js';
import { kpi, card, dataTable, statList } from '../widgets.js';
import { formModal } from '../editor.js';
import { store } from '../../state/store.js';
import { newMember, newDependent, newBeneficiary, newDocument, newContact } from '../../state/models.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const hh = client.household || {};
  const memberOpts = client.members.map(m => ({ value: m.id, label: m.name }));

  const yes = t('Oui', 'Yes'), no = t('Non', 'No');
  const maskSin = (s) => s ? '•••-•••-' + String(s).replace(/\D/g, '').slice(-3) : '—';

  // ---- Completeness score ----
  const completeness = computeCompleteness(client);

  const kpis = h('div', { class: 'grid cols-4 span-full' },
    kpi({ label: t('Membres', 'Members'), value: client.members.length, iconName: 'client' }),
    kpi({ label: t('Personnes à charge', 'Dependents'), value: (client.dependents || []).length, iconName: 'client' }),
    kpi({ label: t('Documents', 'Documents'), value: (client.documents || []).length, iconName: 'doc',
      sub: t(`${(client.documents || []).filter(d => d.status === 'done').length} complétés`, `${(client.documents || []).filter(d => d.status === 'done').length} complete`) }),
    kpi({ label: t('Dossier complété', 'Profile complete'), value: pct(completeness, 0), accent: completeness >= 0.8 ? 'var(--pos)' : completeness >= 0.5 ? 'var(--warn)' : 'var(--neg)',
      sub: t('Mis à jour', 'Updated') + ' ' + fmtDate(new Date(client.updatedAt || Date.now()).toISOString()) }),
  );

  // ---- Household ----
  const householdCard = card(t('Ménage', 'Household'), {
    sub: t('Coordonnées et révision', 'Contact & review'),
    right: h('button', { class: 'btn sm', html: icon('edit', 14) + ' ' + t('Modifier', 'Edit'), onClick: editHousehold }),
  },
    h('div', { class: 'grid cols-2' },
      statList([
        [t('Adresse', 'Address'), [hh.address, hh.city].filter(Boolean).join(', ') || '—'],
        [t('Code postal', 'Postal code'), hh.postal || '—'],
        [t('État civil', 'Marital status'), maritalLabel(hh.maritalStatus || client.filingStatus)],
      ]),
      statList([
        [t('Juridiction', 'Jurisdiction'), `${jur.flag} ${jur.name} · ${jur.regionName}`],
        [t('Prochaine révision', 'Next review'), fmtDate(hh.reviewDate)],
        [t('Profil de risque', 'Risk profile'), riskLabel(client.riskProfile)],
      ]),
    ),
    hh.advisorNotes ? h('div', {}, h('div', { class: 'sep' }),
      h('div', { class: 'tiny muted', style: { marginBottom: '4px', fontWeight: 600 } }, t('Notes du conseiller', 'Advisor notes')),
      h('div', { class: 'tiny' }, hh.advisorNotes)) : null,
  );

  // ---- Members (detailed personal info) ----
  const memberCards = client.members.map(m => {
    const age = m.dob ? ageFromDob(m.dob) : m.currentAge;
    return card(m.name, { sub: m.role === 'primary' ? t('Titulaire', 'Primary') : t('Conjoint(e)', 'Spouse'),
      right: h('button', { class: 'btn sm', html: icon('edit', 14), onClick: () => editMember(m, false) }) },
      statList([
        [t('Date de naissance', 'Date of birth'), `${fmtDate(m.dob)}${age != null ? ` · ${age} ${t('ans', 'yrs')}` : ''}`],
        [t('Profession', 'Occupation'), m.occupation || '—'],
        [t('Employeur', 'Employer'), m.employer || '—'],
        [t('Statut d’emploi', 'Employment'), employmentLabel(m.employmentStatus)],
        [t('Courriel', 'Email'), m.email || '—'],
        [t('Téléphone', 'Phone'), m.phone || '—'],
        [t('NAS / SIN', 'SIN / SSN'), maskSin(m.sin)],
        [t('Citoyenneté / Résidence', 'Citizenship / Residency'), [m.citizenship, m.residency].filter(Boolean).join(' / ') || '—'],
        [t('Fumeur', 'Smoker'), m.smoker ? yes : no],
        [t('Tolérance au risque', 'Risk tolerance'), riskLabel(m.riskTolerance)],
        [t('Retraite / Espérance', 'Retirement / Life exp.'), `${m.retirementAge} / ${m.lifeExpectancy} ${t('ans', 'yrs')}`],
      ]));
  });
  const membersWrap = card(t('Personnes', 'People'), { class: 'span-full',
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' ' + t('Membre', 'Member'), onClick: () => editMember(newMember(), true) }) },
    h('div', { class: 'grid cols-2' }, ...memberCards));

  // ---- Dependents ----
  const depCard = card(t('Personnes à charge', 'Dependents'), { class: 'span-full',
    sub: t('Enfants et personnes à charge', 'Children & dependents'),
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' ' + t('Ajouter', 'Add'), onClick: () => editDependent(newDependent(), true) }) },
    dataTable({
      rows: client.dependents || [],
      cols: [
        { key: 'name', label: t('Nom', 'Name') },
        { key: 'relationship', label: t('Lien', 'Relationship'), fmt: relationshipLabel },
        { key: 'dob', label: t('Naissance', 'Birth'), fmt: (v, r) => v ? `${fmtDate(v)} (${ageFromDob(v)})` : `${r.age} ${t('ans', 'yrs')}` },
        { key: 'educationGoalAge', label: t('Études à', 'Education at'), num: true, fmt: v => v ? v + ' ' + t('ans', 'yrs') : '—' },
        { key: 'financiallyDependent', label: t('À charge', 'Dependent'), fmt: v => v ? yes : no },
      ],
      onEdit: (r) => editDependent(r, false),
      onDelete: (r) => { store.update(c => c.dependents = c.dependents.filter(x => x.id !== r.id)); toast(t('Supprimé', 'Removed')); },
      empty: t('Aucune personne à charge', 'No dependents'),
    }));

  // ---- Beneficiaries ----
  const benCard = card(t('Bénéficiaires', 'Beneficiaries'), {
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14), onClick: () => editBeneficiary(newBeneficiary(), true) }) },
    dataTable({
      rows: client.beneficiaries || [],
      cols: [
        { key: 'name', label: t('Nom', 'Name') },
        { key: 'relationship', label: t('Lien', 'Relationship'), fmt: relationshipLabel },
        { key: 'scope', label: t('Sur', 'Scope'), fmt: scopeLabel },
        { key: 'allocation', label: '%', num: true, fmt: v => v + ' %' },
      ],
      onEdit: (r) => editBeneficiary(r, false),
      onDelete: (r) => { store.update(c => c.beneficiaries = c.beneficiaries.filter(x => x.id !== r.id)); toast(t('Supprimé', 'Removed')); },
      empty: t('Aucun bénéficiaire désigné', 'No beneficiaries'),
    }));

  // ---- Documents ----
  const docCard = card(t('Documents juridiques', 'Legal documents'), {
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14), onClick: () => editDocument(newDocument(), true) }) },
    dataTable({
      rows: client.documents || [],
      cols: [
        { key: 'name', label: t('Document', 'Document') },
        { key: 'type', label: 'Type', fmt: docTypeLabel },
        { key: 'date', label: 'Date', fmt: fmtDate },
        { key: 'status', label: t('Statut', 'Status'), fmt: statusChip },
      ],
      onEdit: (r) => editDocument(r, false),
      onDelete: (r) => { store.update(c => c.documents = c.documents.filter(x => x.id !== r.id)); toast(t('Supprimé', 'Removed')); },
      empty: t('Aucun document', 'No documents'),
    }));

  // ---- Contacts ----
  const contactCard = card(t('Professionnels', 'Professional contacts'), { class: 'span-full',
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' ' + t('Contact', 'Contact'), onClick: () => editContact(newContact(), true) }) },
    dataTable({
      rows: client.contacts || [],
      cols: [
        { key: 'name', label: t('Nom', 'Name') },
        { key: 'role', label: t('Rôle', 'Role'), fmt: contactRoleLabel },
        { key: 'firm', label: t('Cabinet', 'Firm') },
        { key: 'phone', label: t('Téléphone', 'Phone') },
        { key: 'email', label: t('Courriel', 'Email') },
      ],
      onEdit: (r) => editContact(r, false),
      onDelete: (r) => { store.update(c => c.contacts = c.contacts.filter(x => x.id !== r.id)); toast(t('Supprimé', 'Removed')); },
      empty: t('Aucun professionnel', 'No contacts'),
    }));

  return h('div', { class: 'grid' },
    kpis,
    h('div', { class: 'span-full' }, householdCard),
    membersWrap,
    depCard,
    h('div', { class: 'grid cols-2 span-full' }, benCard, docCard),
    contactCard,
  );

  // ---------- Editors ----------
  function editHousehold() {
    const item = { ...hh, maritalStatus: hh.maritalStatus || client.filingStatus };
    formModal({ title: t('Modifier le ménage', 'Edit household'), item, wide: true,
      fields: [
        { key: 'address', label: t('Adresse', 'Address'), span: 2 },
        { key: 'city', label: t('Ville', 'City') },
        { key: 'postal', label: t('Code postal', 'Postal code') },
        { key: 'maritalStatus', label: t('État civil', 'Marital status'), type: 'select', opts: maritalOpts() },
        { key: 'reviewDate', label: t('Prochaine révision', 'Next review'), type: 'date' },
        { key: 'advisorNotes', label: t('Notes du conseiller', 'Advisor notes'), type: 'textarea', span: 2 },
      ],
      onSave: (d) => store.update(c => { c.household = { ...c.household, ...d }; if (d.maritalStatus) c.filingStatus = (d.maritalStatus === 'married' || d.maritalStatus === 'commonlaw') ? 'married' : 'single'; }),
    });
  }
  function editMember(item, isNew) {
    formModal({ title: isNew ? t('Nouveau membre', 'New member') : item.name, item, wide: true,
      fields: [
        { key: 'name', label: t('Nom complet', 'Full name') },
        { key: 'role', label: t('Rôle', 'Role'), type: 'select', opts: [{ value: 'primary', label: t('Titulaire', 'Primary') }, { value: 'spouse', label: t('Conjoint(e)', 'Spouse') }] },
        { key: 'dob', label: t('Date de naissance', 'Date of birth'), type: 'date', hint: t('Met l’âge à jour', 'Updates age') },
        { key: 'gender', label: t('Genre', 'Gender'), type: 'select', opts: [{ value: '', label: '—' }, { value: 'M', label: 'M' }, { value: 'F', label: 'F' }, { value: 'X', label: 'X' }] },
        { key: 'sin', label: t('NAS / SIN', 'SIN / SSN') },
        { key: 'occupation', label: t('Profession', 'Occupation') },
        { key: 'employer', label: t('Employeur', 'Employer') },
        { key: 'employmentStatus', label: t('Statut d’emploi', 'Employment status'), type: 'select', opts: employmentOpts() },
        { key: 'email', label: t('Courriel', 'Email'), type: 'email' },
        { key: 'phone', label: t('Téléphone', 'Phone'), type: 'tel' },
        { key: 'citizenship', label: t('Citoyenneté', 'Citizenship') },
        { key: 'residency', label: t('Pays de résidence', 'Residency') },
        { key: 'riskTolerance', label: t('Tolérance au risque', 'Risk tolerance'), type: 'select', opts: riskOpts() },
        { key: 'smoker', label: t('Fumeur', 'Smoker'), type: 'checkbox', onLabel: t('Fumeur', 'Smoker') },
        { key: 'currentAge', label: t('Âge actuel', 'Current age'), type: 'number' },
        { key: 'retirementAge', label: t('Âge de retraite', 'Retirement age'), type: 'number' },
        { key: 'lifeExpectancy', label: t('Espérance de vie', 'Life expectancy'), type: 'number' },
      ],
      onSave: (d) => store.update(c => {
        if (d.dob) { const a = ageFromDob(d.dob); if (a != null) d.currentAge = a; }
        if (isNew) c.members.push(d); else Object.assign(c.members.find(m => m.id === d.id), d);
      }),
    });
  }
  function editDependent(item, isNew) {
    formModal({ title: isNew ? t('Nouvelle personne à charge', 'New dependent') : item.name, item,
      fields: [
        { key: 'name', label: t('Nom', 'Name') },
        { key: 'relationship', label: t('Lien', 'Relationship'), type: 'select', opts: relationshipOpts() },
        { key: 'dob', label: t('Date de naissance', 'Date of birth'), type: 'date' },
        { key: 'age', label: t('Âge', 'Age'), type: 'number' },
        { key: 'educationGoalAge', label: t('Âge début études', 'Education start age'), type: 'number' },
        { key: 'financiallyDependent', label: t('À charge', 'Financially dependent'), type: 'checkbox', onLabel: t('À charge', 'Dependent') },
      ],
      onSave: (d) => store.update(c => {
        if (d.dob) { const a = ageFromDob(d.dob); if (a != null) d.age = a; }
        c.dependents = c.dependents || []; if (isNew) c.dependents.push(d); else Object.assign(c.dependents.find(x => x.id === d.id), d);
      }),
    });
  }
  function editBeneficiary(item, isNew) {
    formModal({ title: isNew ? t('Nouveau bénéficiaire', 'New beneficiary') : item.name, item,
      fields: [
        { key: 'name', label: t('Nom', 'Name') },
        { key: 'relationship', label: t('Lien', 'Relationship'), type: 'select', opts: relationshipOpts() },
        { key: 'scope', label: t('S’applique à', 'Applies to'), type: 'select', opts: scopeOpts() },
        { key: 'allocation', label: t('Allocation (%)', 'Allocation (%)'), type: 'number' },
        { key: 'notes', label: 'Notes', type: 'textarea', span: 2 },
      ],
      onSave: (d) => store.update(c => { c.beneficiaries = c.beneficiaries || []; if (isNew) c.beneficiaries.push(d); else Object.assign(c.beneficiaries.find(x => x.id === d.id), d); }),
    });
  }
  function editDocument(item, isNew) {
    formModal({ title: isNew ? t('Nouveau document', 'New document') : item.name, item,
      fields: [
        { key: 'name', label: t('Nom', 'Name') },
        { key: 'type', label: 'Type', type: 'select', opts: docTypeOpts() },
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'status', label: t('Statut', 'Status'), type: 'select', opts: statusOpts() },
        { key: 'notes', label: 'Notes', type: 'textarea', span: 2 },
      ],
      onSave: (d) => store.update(c => { c.documents = c.documents || []; if (isNew) c.documents.push(d); else Object.assign(c.documents.find(x => x.id === d.id), d); }),
    });
  }
  function editContact(item, isNew) {
    formModal({ title: isNew ? t('Nouveau contact', 'New contact') : item.name, item,
      fields: [
        { key: 'name', label: t('Nom', 'Name') },
        { key: 'role', label: t('Rôle', 'Role'), type: 'select', opts: contactRoleOpts() },
        { key: 'firm', label: t('Cabinet', 'Firm') },
        { key: 'phone', label: t('Téléphone', 'Phone'), type: 'tel' },
        { key: 'email', label: t('Courriel', 'Email'), type: 'email' },
      ],
      onSave: (d) => store.update(c => { c.contacts = c.contacts || []; if (isNew) c.contacts.push(d); else Object.assign(c.contacts.find(x => x.id === d.id), d); }),
    });
  }
}

// ---------- Label helpers ----------
function maritalOpts() { return [{ value: 'single', label: t('Célibataire', 'Single') }, { value: 'married', label: t('Marié(e)', 'Married') }, { value: 'commonlaw', label: t('Conjoint de fait', 'Common-law') }, { value: 'divorced', label: t('Divorcé(e)', 'Divorced') }, { value: 'widowed', label: t('Veuf/Veuve', 'Widowed') }]; }
function maritalLabel(v) { return (maritalOpts().find(o => o.value === v) || {}).label || v || '—'; }
function employmentOpts() { return [{ value: 'employed', label: t('Salarié', 'Employed') }, { value: 'self', label: t('Travailleur autonome', 'Self-employed') }, { value: 'business', label: t('Propriétaire d’entreprise', 'Business owner') }, { value: 'retired', label: t('Retraité', 'Retired') }, { value: 'unemployed', label: t('Sans emploi', 'Unemployed') }, { value: 'student', label: t('Étudiant', 'Student') }]; }
function employmentLabel(v) { return (employmentOpts().find(o => o.value === v) || {}).label || v || '—'; }
function riskOpts() { return [{ value: 'conservative', label: t('Conservateur', 'Conservative') }, { value: 'balanced', label: t('Équilibré', 'Balanced') }, { value: 'growth', label: t('Croissance', 'Growth') }, { value: 'aggressive', label: t('Dynamique', 'Aggressive') }]; }
function riskLabel(v) { return (riskOpts().find(o => o.value === v) || {}).label || v || '—'; }
function relationshipOpts() { return [{ value: 'child', label: t('Enfant', 'Child') }, { value: 'spouse', label: t('Conjoint(e)', 'Spouse') }, { value: 'children', label: t('Enfants', 'Children') }, { value: 'parent', label: t('Parent', 'Parent') }, { value: 'sibling', label: t('Fratrie', 'Sibling') }, { value: 'other', label: t('Autre', 'Other') }, { value: 'charity', label: t('Organisme', 'Charity') }]; }
function relationshipLabel(v) { return (relationshipOpts().find(o => o.value === v) || {}).label || v || '—'; }
function scopeOpts() { return [{ value: 'estate', label: t('Succession', 'Estate') }, { value: 'rrsp', label: t('Régime de retraite', 'Retirement plan') }, { value: 'tfsa', label: t('Compte libre d’impôt', 'Tax-free account') }, { value: 'insurance', label: t('Assurance', 'Insurance') }, { value: 'all', label: t('Tous', 'All') }]; }
function scopeLabel(v) { return (scopeOpts().find(o => o.value === v) || {}).label || v || '—'; }
function docTypeOpts() { return [{ value: 'will', label: t('Testament', 'Will') }, { value: 'mandate', label: t('Mandat de protection', 'Protection mandate') }, { value: 'poa', label: t('Procuration', 'Power of attorney') }, { value: 'trust', label: t('Fiducie', 'Trust') }, { value: 'insurance', label: t('Police d’assurance', 'Insurance policy') }, { value: 'tax', label: t('Documents fiscaux', 'Tax documents') }, { value: 'other', label: t('Autre', 'Other') }]; }
function docTypeLabel(v) { return (docTypeOpts().find(o => o.value === v) || {}).label || v || '—'; }
function statusOpts() { return [{ value: 'done', label: t('Complété', 'Complete') }, { value: 'review', label: t('À réviser', 'Needs review') }, { value: 'todo', label: t('À faire', 'To do') }]; }
function statusChip(v) {
  const cls = v === 'done' ? 'pos' : v === 'review' ? 'warn' : 'neg';
  const lbl = (statusOpts().find(o => o.value === v) || {}).label || v;
  return h('span', { class: 'chip ' + cls }, lbl);
}
function contactRoleOpts() { return [{ value: 'accountant', label: t('Comptable', 'Accountant') }, { value: 'notary', label: t('Notaire', 'Notary') }, { value: 'lawyer', label: t('Avocat', 'Lawyer') }, { value: 'banker', label: t('Banquier', 'Banker') }, { value: 'insurance', label: t('Assureur', 'Insurance agent') }, { value: 'tax', label: t('Fiscaliste', 'Tax specialist') }, { value: 'other', label: t('Autre', 'Other') }]; }
function contactRoleLabel(v) { return (contactRoleOpts().find(o => o.value === v) || {}).label || v || '—'; }

function computeCompleteness(c) {
  const checks = [];
  const m = c.members[0] || {};
  checks.push(!!m.dob, !!m.occupation, !!m.email, !!m.sin, !!(c.household && c.household.address));
  checks.push((c.incomes || []).length > 0, (c.expenses || []).length > 0, (c.assets || []).length > 0);
  checks.push((c.goals || []).length > 0, (c.insurance || []).length > 0, (c.documents || []).some(d => d.status === 'done'), (c.beneficiaries || []).length > 0);
  return checks.filter(Boolean).length / checks.length;
}
