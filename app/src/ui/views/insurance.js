import { h, money, pct, icon, toast, t } from '../dom.js';
import { kpi, card, dataTable, statList } from '../widgets.js';
import { formModal } from '../editor.js';
import { store } from '../../state/store.js';
import { newInsurance } from '../../state/models.js';
import { lifeInsuranceNeeds, disabilityNeeds } from '../../engine/analysis.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const memberOpts = client.members.map(m => ({ value: m.id, label: m.name }));
  const nameOf = (id) => client.members.find(m => m.id === id)?.name || '—';
  const typeOpts = [
    { value: 'life', label: t('Assurance vie', 'Life insurance') }, { value: 'di', label: t('Invalidité', 'Disability') },
    { value: 'ci', label: t('Maladies graves', 'Critical illness') }, { value: 'ltc', label: t('Soins de longue durée', 'Long-term care') },
  ];
  const typeLbl = v => (typeOpts.find(o => o.value === v) || {}).label || v;

  const needsCards = client.members.map(m => {
    const n = lifeInsuranceNeeds(client, m.id);
    const di = disabilityNeeds(client, m.id);
    const covered = Math.min(1, n.existingCoverage / (n.need || 1));
    return card(`${m.name}`, { sub: t('Analyse des besoins en assurance', 'Insurance needs analysis') },
      h('div', { class: 'flex between', style: { marginBottom: '5px' } },
        h('span', { class: 'tiny muted' }, t('Couverture vie vs besoin', 'Life coverage vs need')),
        n.gap > 0 ? h('span', { class: 'chip neg' }, t(`Manque ${money(n.gap, { currency: cur, compact: true })}`, `Gap ${money(n.gap, { currency: cur, compact: true })}`))
          : h('span', { class: 'chip pos' }, t('Couvert ✓', 'Covered ✓'))),
      h('div', { class: 'bar', style: { marginBottom: '14px' } }, h('span', { style: { width: pct(covered, 0), background: n.gap > 0 ? 'linear-gradient(90deg,var(--warn),var(--accent-2))' : 'linear-gradient(90deg,var(--brand-500),var(--accent))' } })),
      statList([
        [t('Remplacement de revenu', 'Income replacement'), money(n.incomeReplacement, { currency: cur, compact: true })],
        [t('Remboursement des dettes', 'Debt repayment'), money(n.debt, { currency: cur, compact: true })],
        [t('Fonds études', 'Education fund'), money(n.education, { currency: cur, compact: true })],
        [t('(–) Actifs disponibles', '(–) Available assets'), money(-n.liquidAssets, { currency: cur, compact: true }), 'pos'],
        [t('= Besoin total', '= Total need'), money(n.need, { currency: cur, compact: true })],
        [t('Couverture actuelle', 'Current coverage'), money(n.existingCoverage, { currency: cur, compact: true })],
      ]),
      h('div', { class: 'sep' }),
      h('div', { class: 'flex between' }, h('span', { class: 'tiny muted' }, t('Invalidité — revenu mensuel', 'Disability — monthly income')),
        h('b', { style: { color: di.gap > 0 ? 'var(--neg)' : 'var(--pos)' } },
          `${money(di.existingMonthly, { currency: cur })} / ${money(di.monthlyNeed, { currency: cur })}`)),
    );
  });

  const polCard = card(t('Polices en vigueur', 'Policies in force'), { class: 'span-full',
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' ' + t('Police', 'Policy'), onClick: () => edit(newInsurance({ insuredId: client.members[0].id }), true) }) },
    dataTable({
      rows: client.insurance,
      cols: [
        { key: 'type', label: 'Type', fmt: typeLbl },
        { key: 'insuredId', label: t('Assuré', 'Insured'), fmt: nameOf },
        { key: 'coverage', label: t('Couverture', 'Coverage'), num: true, fmt: v => money(v, { currency: cur }) },
        { key: 'premium', label: t('Prime/an', 'Premium/yr'), num: true, fmt: v => money(v, { currency: cur }) },
      ],
      onEdit: (r) => edit(r, false),
      onDelete: (r) => { store.update(c => c.insurance = c.insurance.filter(i => i.id !== r.id)); toast(t('Police supprimée', 'Policy removed')); },
    }));

  const totalCov = client.insurance.filter(i => i.type === 'life').reduce((s, i) => s + i.coverage, 0);
  const totalPrem = client.insurance.reduce((s, i) => s + i.premium, 0);
  const kpis = h('div', { class: 'grid cols-3 span-full' },
    kpi({ label: t('Couverture vie totale', 'Total life coverage'), value: money(totalCov, { currency: cur, compact: true }), iconName: 'insurance' }),
    kpi({ label: t('Primes annuelles', 'Annual premiums'), value: money(totalPrem, { currency: cur }), sub: t(`${money(totalPrem / 12, { currency: cur })}/mois`, `${money(totalPrem / 12, { currency: cur })}/mo`) }),
    kpi({ label: t('Polices actives', 'Active policies'), value: client.insurance.length, iconName: 'doc' }),
  );

  return h('div', { class: 'grid' },
    kpis,
    h('div', { class: 'grid cols-2 span-full' }, ...needsCards),
    polCard,
  );

  function edit(item, isNew) {
    formModal({ title: isNew ? t('Nouvelle police', 'New policy') : t('Modifier la police', 'Edit policy'), item,
      fields: [
        { key: 'type', label: 'Type', type: 'select', opts: typeOpts },
        { key: 'insuredId', label: t('Assuré', 'Insured'), type: 'select', opts: memberOpts },
        { key: 'coverage', label: t(`Capital assuré (${cur})`, `Coverage (${cur})`), type: 'number', hint: t('Invalidité : montant annuel', 'Disability: annual amount') },
        { key: 'premium', label: t(`Prime annuelle (${cur})`, `Annual premium (${cur})`), type: 'number' },
      ],
      onSave: (d) => store.update(c => { if (isNew) c.insurance.push(d); else Object.assign(c.insurance.find(i => i.id === d.id), d); }),
    });
  }
}
