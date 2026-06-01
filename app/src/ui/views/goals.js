import { h, money, pct, icon, toast } from '../dom.js';
import { card } from '../widgets.js';
import { formModal } from '../editor.js';
import { store } from '../../state/store.js';
import { newGoal } from '../../state/models.js';
import { runProjection } from '../../engine/projection.js';
import { educationFunding } from '../../engine/analysis.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const proj = runProjection(client);
  const primaryAge = client.members[0].currentAge;

  const typeOpts = [
    { value: 'retirement', label: 'Retraite' }, { value: 'education', label: 'Études' },
    { value: 'purchase', label: 'Achat majeur' }, { value: 'estate', label: 'Legs / succession' }, { value: 'other', label: 'Autre' },
  ];
  const prioOpts = [{ value: 'high', label: 'Élevée' }, { value: 'medium', label: 'Moyenne' }, { value: 'low', label: 'Faible' }];

  function fundingFor(goal) {
    if (goal.type === 'retirement') {
      const ok = proj.summary.success && !proj.summary.depletionAge;
      const retRow = proj.rows.find(r => r.primaryRetired);
      const funded = retRow ? Math.min(1, retRow.investable / (goal.amount * 12)) : 0;
      return { funded: proj.summary.success ? 1 : Math.max(0.3, funded), note: ok ? 'Sur la bonne voie' : 'Sous-financé', monthly: null };
    }
    if (goal.type === 'education') {
      const ef = educationFunding(client, goal);
      const current = client.assets.filter(a => ['resp', '529', 'jisa'].includes(a.type)).reduce((s, a) => s + a.value, 0);
      return { funded: Math.min(1, current / goal.amount), note: `${money(ef.monthly, { currency: cur })}/mois requis`, monthly: ef.monthly };
    }
    // purchase / other : compare to projected investable at target age
    const row = proj.rows.find(r => r.primaryAge >= goal.targetAge) || proj.rows[proj.rows.length - 1];
    const avail = row ? row.investable : 0;
    return { funded: Math.min(1, avail / (goal.amount || 1)), note: `Capital projeté: ${money(avail, { currency: cur, compact: true })}`, monthly: null };
  }

  const cards = client.goals.map(g => {
    const f = fundingFor(g);
    const cls = f.funded >= 0.85 ? 'pos' : f.funded >= 0.5 ? 'warn' : 'neg';
    return h('div', { class: 'card' },
      h('div', { class: 'flex between center' },
        h('div', {},
          h('div', { class: 'flex center gap-8' },
            h('span', { class: 'chip ' + (g.priority === 'high' ? 'neg' : g.priority === 'medium' ? 'warn' : 'info') }, prioOpts.find(o => o.value === g.priority)?.label || ''),
            h('h3', { style: { margin: 0, fontFamily: 'var(--font-display)' } }, g.name)),
          h('div', { class: 'tiny muted', style: { marginTop: '4px' } }, `${typeOpts.find(o => o.value === g.type)?.label} · cible ${money(g.amount, { currency: cur })}${g.type !== 'retirement' ? ` à ${g.targetAge} ans` : '/an'}`)),
        h('div', { class: 'inline', style: { flexWrap: 'nowrap' } },
          h('button', { class: 'btn icon sm ghost', html: icon('edit', 15), onClick: () => edit(g, false) }),
          h('button', { class: 'btn icon sm ghost', html: icon('trash', 15), onClick: () => { store.update(c => c.goals = c.goals.filter(x => x.id !== g.id)); toast('Objectif supprimé'); } }),
        )),
      h('div', { class: 'flex between', style: { marginTop: '14px', marginBottom: '5px' } },
        h('span', { class: 'tiny muted' }, f.note),
        h('b', { class: cls === 'pos' ? '' : '', style: { color: `var(--${cls})` } }, pct(f.funded, 0) + ' financé')),
      h('div', { class: 'bar' }, h('span', { style: { width: pct(Math.min(1, f.funded), 0), background: cls === 'neg' ? 'var(--neg)' : cls === 'warn' ? 'linear-gradient(90deg,var(--warn),var(--accent-2))' : 'linear-gradient(90deg,var(--brand-500),var(--accent))' } })),
    );
  });

  const head = card('Objectifs financiers', { class: 'span-full',
    sub: 'Suivi du financement par rapport aux projections',
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' Objectif', onClick: () => edit(newGoal(), true) }) },
    cards.length ? h('div', { class: 'grid cols-2' }, ...cards) : h('div', { class: 'empty' }, h('div', { class: 'big' }, '🎯'), 'Aucun objectif défini'));

  return h('div', { class: 'grid' }, head);

  function edit(item, isNew) {
    formModal({ title: isNew ? 'Nouvel objectif' : 'Modifier l\'objectif', item,
      fields: [
        { key: 'name', label: 'Nom de l\'objectif' },
        { key: 'type', label: 'Type', type: 'select', opts: typeOpts },
        { key: 'amount', label: `Montant cible (${cur})`, type: 'number', hint: 'Pour la retraite : revenu annuel souhaité' },
        { key: 'targetAge', label: 'Âge cible', type: 'number' },
        { key: 'priority', label: 'Priorité', type: 'select', opts: prioOpts },
      ],
      onSave: (d) => store.update(c => { if (isNew) c.goals.push(d); else Object.assign(c.goals.find(g => g.id === d.id), d); }),
    });
  }
}
