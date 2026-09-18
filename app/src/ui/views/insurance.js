// ============================================================
// Insurance — needs analysis + the policy ledger.
// client.products[] is the ONLY source of truth for policies
// (client.insurance[] is a read-only mirror rebuilt by the store).
// ============================================================
import { h, money, pct, icon, toast, fmtDate, t } from '../dom.js';
import { kpi, card, dataTable, statList } from '../widgets.js';
import { formModal } from '../editor.js';
import { store } from '../../state/store.js';
import { newProduct, annualPremium, KIND_TO_INSURANCE } from '../../state/models.js';
import { policiesOf } from '../../engine/policies.js';
import { lifeInsuranceNeeds, disabilityNeeds } from '../../engine/analysis.js';
import { clientFacts } from '../../engine/facts.js';

const KINDS = ['life', 'disability', 'ci', 'ltc', 'health'];

export function render({ client, jur }) {
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const memberOpts = client.members.map(m => ({ value: m.id, label: m.name }));
  const nameOf = (id) => client.members.find(m => m.id === id)?.name || client.members[0]?.name || '—';
  const kindOpts = [
    { value: 'life', label: t('Assurance vie', 'Life insurance') }, { value: 'disability', label: t('Invalidité', 'Disability') },
    { value: 'ci', label: t('Maladies graves', 'Critical illness') }, { value: 'ltc', label: t('Soins de longue durée', 'Long-term care') },
    { value: 'health', label: t('Santé / dentaire', 'Health / dental') },
  ];
  const statusOpts = [
    { value: 'inforce', label: t('En vigueur', 'In force') }, { value: 'pending', label: t('En attente', 'Pending') },
    { value: 'lapsed', label: t('Déchue', 'Lapsed') }, { value: 'cancelled', label: t('Annulée', 'Cancelled') },
  ];
  const freqOpts = [{ value: 'annual', label: t('Annuelle', 'Annual') }, { value: 'monthly', label: t('Mensuelle', 'Monthly') }, { value: 'single', label: t('Unique', 'Single') }];
  const kindLbl = v => (kindOpts.find(o => o.value === v) || {}).label || v;
  const statusChip = v => { const s = v || 'inforce'; const cls = s === 'inforce' ? 'pos' : s === 'pending' ? 'warn' : 'neg'; return h('span', { class: 'chip ' + cls }, (statusOpts.find(o => o.value === s) || {}).label || s); };

  const needsCards = F.members.map(m => {
    const n = lifeInsuranceNeeds(client, m.id);
    const di = disabilityNeeds(client, m.id);
    const cov = F.coverage[m.id] || { life: 0, di: 0, ci: 0, ltc: 0 };
    const covered = Math.min(1, n.existingCoverage / (n.need || 1));
    return card(`${m.name}`, { sub: t(`Analyse des besoins en assurance · ${n.yearsToReplace} ans de remplacement à ${pct(n.replaceRate, 0)}`, `Insurance needs analysis · ${n.yearsToReplace} yrs of replacement at ${pct(n.replaceRate, 0)}`) },
      h('div', { class: 'flex between', style: { marginBottom: '5px' } },
        h('span', { class: 'tiny muted' }, t('Couverture vie vs besoin', 'Life coverage vs need')),
        n.gap > 0 ? h('span', { class: 'chip neg' }, t(`Manque ${money(n.gap, { currency: cur, compact: true })}`, `Gap ${money(n.gap, { currency: cur, compact: true })}`))
          : h('span', { class: 'chip pos' }, t('Couvert ✓', 'Covered ✓'))),
      h('div', { class: 'bar', style: { marginBottom: '14px' } }, h('span', { style: { width: pct(covered, 0), background: n.gap > 0 ? 'linear-gradient(90deg,var(--warn),var(--accent-2))' : 'linear-gradient(90deg,var(--brand-500),var(--accent))' } })),
      statList([
        [t('Remplacement de revenu', 'Income replacement'), money(n.incomeReplacement, { currency: cur, compact: true })],
        [t('Remboursement des dettes', 'Debt repayment'), money(n.debt, { currency: cur, compact: true })],
        [t('Dernières dépenses', 'Final expenses'), money(n.finalExpenses, { currency: cur, compact: true })],
        [t('Fonds études', 'Education fund'), money(n.education, { currency: cur, compact: true })],
        [t('(–) Actifs disponibles', '(–) Available assets'), money(-n.liquidAssets, { currency: cur, compact: true }), 'pos'],
        [t('= Besoin total', '= Total need'), money(n.need, { currency: cur, compact: true })],
        [t('Couverture vie actuelle', 'Current life coverage'), money(n.existingCoverage, { currency: cur, compact: true })],
      ]),
      h('div', { class: 'sep' }),
      h('div', { class: 'flex between' }, h('span', { class: 'tiny muted' }, t('Invalidité — revenu mensuel', 'Disability — monthly income')),
        h('b', { style: { color: di.gap > 0 ? 'var(--neg)' : 'var(--pos)' } }, `${money(di.existingMonthly, { currency: cur })} / ${money(di.monthlyNeed, { currency: cur })}`)),
      (cov.ci > 0 || cov.ltc > 0) ? h('div', { class: 'flex between', style: { marginTop: '6px' } }, h('span', { class: 'tiny muted' }, t('Maladies graves · Soins longue durée', 'Critical illness · Long-term care')),
        h('b', {}, `${money(cov.ci, { currency: cur, compact: true })} · ${money(cov.ltc, { currency: cur, compact: true })}`)) : null,
    );
  });

  const policies = policiesOf(client).filter(p => KINDS.includes(p.kind));
  const polCard = card(t('Polices', 'Policies'), { class: 'span-full',
    sub: t(`${F.policies.length} en vigueur · primes ${money(F.premiums, { currency: cur })}/an`, `${F.policies.length} in force · premiums ${money(F.premiums, { currency: cur })}/yr`),
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' ' + t('Police', 'Policy'), onClick: () => edit(newProduct({ kind: 'life', insuredId: client.members[0].id, faceAmount: 250000, premium: 600, frequency: 'annual' }), true) }) },
    dataTable({
      rows: policies,
      cols: [
        { key: 'kind', label: 'Type', fmt: kindLbl },
        { key: 'insuredId', label: t('Assuré', 'Insured'), fmt: nameOf },
        { key: 'carrier', label: t('Assureur', 'Carrier'), fmt: (v, r) => [v, r.policyNumber].filter(Boolean).join(' · ') || '—' },
        { key: 'faceAmount', label: t('Capital', 'Face amount'), num: true, fmt: (v, r) => `${money(v, { currency: cur })}${r.kind === 'disability' ? t('/an', '/yr') : ''}` },
        { key: 'premium', label: t('Prime', 'Premium'), num: true, fmt: (v, r) => `${money(v, { currency: cur })} ${r.frequency === 'monthly' ? t('/mois', '/mo') : r.frequency === 'single' ? t('(unique)', '(single)') : t('/an', '/yr')}` },
        { key: 'id', label: t('Prime annuelle', 'Annual premium'), num: true, fmt: (v, r) => money(annualPremium(r), { currency: cur }) },
        { key: 'renewalDate', label: t('Renouvellement', 'Renewal'), fmt: v => v ? fmtDate(v) : '—' },
        { key: 'status', label: t('Statut', 'Status'), fmt: statusChip },
      ],
      onEdit: (r) => edit(r, false),
      onDelete: (r) => { store.update(c => c.products = c.products.filter(p => p.id !== r.id)); toast(t('Police supprimée', 'Policy removed')); },
      empty: t('Aucune police — ajoutez les contrats du client (produits)', 'No policies — add the client\'s contracts (products)'),
    }));

  const totalLife = F.members.reduce((s, m) => s + (F.coverage[m.id]?.life || 0), 0);
  const kpis = h('div', { class: 'grid cols-3 span-full' },
    kpi({ label: t('Couverture vie totale (en vigueur)', 'Total life coverage (in force)'), value: money(totalLife, { currency: cur, compact: true }), iconName: 'insurance' }),
    kpi({ label: t('Primes annuelles', 'Annual premiums'), value: money(F.premiums, { currency: cur }), sub: t(`${money(F.premiums / 12, { currency: cur })}/mois`, `${money(F.premiums / 12, { currency: cur })}/mo`) }),
    kpi({ label: t('Polices actives', 'Active policies'), value: F.policies.length, iconName: 'doc', sub: policies.length > F.policies.length ? t(`${policies.length - F.policies.length} inactive(s)`, `${policies.length - F.policies.length} inactive`) : '' }),
  );

  return h('div', { class: 'grid' },
    kpis,
    h('div', { class: 'grid cols-2 span-full' }, ...needsCards),
    polCard,
  );

  function edit(item, isNew) {
    formModal({ title: isNew ? t('Nouvelle police', 'New policy') : t('Modifier la police', 'Edit policy'), item, wide: true,
      fields: [
        { key: 'kind', label: 'Type', type: 'select', opts: kindOpts },
        { key: 'insuredId', label: t('Assuré', 'Insured'), type: 'select', opts: memberOpts },
        { key: 'faceAmount', label: t(`Capital assuré (${cur})`, `Face amount (${cur})`), type: 'number', hint: t('Invalidité : prestation annuelle', 'Disability: annual benefit') },
        { key: 'premium', label: t(`Prime (${cur})`, `Premium (${cur})`), type: 'number' },
        { key: 'frequency', label: t('Fréquence de la prime', 'Premium frequency'), type: 'select', opts: freqOpts },
        { key: 'status', label: t('Statut', 'Status'), type: 'select', opts: statusOpts },
        { key: 'carrier', label: t('Assureur', 'Carrier') },
        { key: 'policyNumber', label: t('No de police', 'Policy number') },
        { key: 'issueDate', label: t('Date d’émission', 'Issue date'), type: 'date' },
        { key: 'renewalDate', label: t('Renouvellement', 'Renewal date'), type: 'date' },
        { key: 'notes', label: 'Notes', type: 'textarea', span: 2 },
      ],
      onSave: (d) => store.update(c => {
        c.products = c.products || [];
        if (isNew) c.products.push(d); else Object.assign(c.products.find(p => p.id === d.id), d);   // insurance[] mirror is rebuilt by the store
      }),
    });
  }
}
