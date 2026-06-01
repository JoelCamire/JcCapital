import { h, money, pct, icon, toast } from '../dom.js';
import { kpi, card, dataTable, statList } from '../widgets.js';
import { barChart, PALETTE } from '../charts.js';
import { formModal } from '../editor.js';
import { store } from '../../state/store.js';
import { newInsurance } from '../../state/models.js';
import { lifeInsuranceNeeds, disabilityNeeds } from '../../engine/analysis.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const memberOpts = client.members.map(m => ({ value: m.id, label: m.name }));
  const nameOf = (id) => client.members.find(m => m.id === id)?.name || '—';
  const typeOpts = [
    { value: 'life', label: 'Assurance vie' }, { value: 'di', label: 'Invalidité' },
    { value: 'ci', label: 'Maladies graves' }, { value: 'ltc', label: 'Soins de longue durée' },
  ];

  // Needs analysis per member (life)
  const needsCards = client.members.map(m => {
    const n = lifeInsuranceNeeds(client, m.id);
    const di = disabilityNeeds(client, m.id);
    const covered = Math.min(1, n.existingCoverage / (n.need || 1));
    return card(`${m.name}`, { sub: 'Analyse des besoins en assurance' },
      h('div', { class: 'flex between', style: { marginBottom: '5px' } },
        h('span', { class: 'tiny muted' }, 'Couverture vie vs besoin'),
        n.gap > 0 ? h('span', { class: 'chip neg' }, `Manque ${money(n.gap, { currency: cur, compact: true })}`)
          : h('span', { class: 'chip pos' }, 'Couvert ✓')),
      h('div', { class: 'bar', style: { marginBottom: '14px' } }, h('span', { style: { width: pct(covered, 0), background: n.gap > 0 ? 'linear-gradient(90deg,var(--warn),var(--accent-2))' : 'linear-gradient(90deg,var(--brand-500),var(--accent))' } })),
      statList([
        ['Remplacement de revenu', money(n.incomeReplacement, { currency: cur, compact: true })],
        ['Remboursement des dettes', money(n.debt, { currency: cur, compact: true })],
        ['Fonds études', money(n.education, { currency: cur, compact: true })],
        ['(–) Actifs disponibles', money(-n.liquidAssets, { currency: cur, compact: true }), 'pos'],
        ['= Besoin total', money(n.need, { currency: cur, compact: true })],
        ['Couverture actuelle', money(n.existingCoverage, { currency: cur, compact: true })],
      ]),
      h('div', { class: 'sep' }),
      h('div', { class: 'flex between' }, h('span', { class: 'tiny muted' }, 'Invalidité — revenu mensuel'),
        h('b', { class: di.gap > 0 ? '' : '', style: { color: di.gap > 0 ? 'var(--neg)' : 'var(--pos)' } },
          `${money(di.existingMonthly, { currency: cur })} / ${money(di.monthlyNeed, { currency: cur })}`)),
    );
  });

  // policies table
  const polCard = card('Polices en vigueur', { class: 'span-full',
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' Police', onClick: () => edit(newInsurance({ insuredId: client.members[0].id }), true) }) },
    dataTable({
      rows: client.insurance,
      cols: [
        { key: 'type', label: 'Type', fmt: v => typeOpts.find(o => o.value === v)?.label || v },
        { key: 'insuredId', label: 'Assuré', fmt: nameOf },
        { key: 'coverage', label: 'Couverture', num: true, fmt: v => money(v, { currency: cur }) },
        { key: 'premium', label: 'Prime/an', num: true, fmt: v => money(v, { currency: cur }) },
      ],
      onEdit: (r) => edit(r, false),
      onDelete: (r) => { store.update(c => c.insurance = c.insurance.filter(i => i.id !== r.id)); toast('Police supprimée'); },
    }));

  const totalCov = client.insurance.filter(i => i.type === 'life').reduce((s, i) => s + i.coverage, 0);
  const totalPrem = client.insurance.reduce((s, i) => s + i.premium, 0);
  const kpis = h('div', { class: 'grid cols-3 span-full' },
    kpi({ label: 'Couverture vie totale', value: money(totalCov, { currency: cur, compact: true }), iconName: 'insurance' }),
    kpi({ label: 'Primes annuelles', value: money(totalPrem, { currency: cur }), sub: `${money(totalPrem / 12, { currency: cur })}/mois` }),
    kpi({ label: 'Polices actives', value: client.insurance.length, iconName: 'doc' }),
  );

  return h('div', { class: 'grid' },
    kpis,
    h('div', { class: 'grid cols-2 span-full' }, ...needsCards),
    polCard,
  );

  function edit(item, isNew) {
    formModal({ title: isNew ? 'Nouvelle police' : 'Modifier la police', item,
      fields: [
        { key: 'type', label: 'Type', type: 'select', opts: typeOpts },
        { key: 'insuredId', label: 'Assuré', type: 'select', opts: memberOpts },
        { key: 'coverage', label: `Capital assuré (${cur})`, type: 'number', hint: 'Invalidité : montant annuel' },
        { key: 'premium', label: `Prime annuelle (${cur})`, type: 'number' },
      ],
      onSave: (d) => store.update(c => { if (isNew) c.insurance.push(d); else Object.assign(c.insurance.find(i => i.id === d.id), d); }),
    });
  }
}
