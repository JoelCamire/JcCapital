import { h, money, pct, icon, toast, t } from '../dom.js';
import { card } from '../widgets.js';
import { formModal } from '../editor.js';
import { store } from '../../state/store.js';
import { newGoal } from '../../state/models.js';
import { runProjection } from '../../engine/projection.js';
import { educationFunding } from '../../engine/analysis.js';
import { suggestGoals } from '../../engine/suggestions.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const proj = runProjection(client);

  const typeOpts = [
    { value: 'retirement', label: t('Retraite', 'Retirement') }, { value: 'education', label: t('Études', 'Education') },
    { value: 'purchase', label: t('Achat majeur', 'Major purchase') }, { value: 'estate', label: t('Legs / succession', 'Estate / legacy') }, { value: 'other', label: t('Autre', 'Other') },
  ];
  const prioOpts = [{ value: 'high', label: t('Élevée', 'High') }, { value: 'medium', label: t('Moyenne', 'Medium') }, { value: 'low', label: t('Faible', 'Low') }];
  const prioLabel = v => (prioOpts.find(o => o.value === v) || {}).label || v;
  const typeLabel = v => (typeOpts.find(o => o.value === v) || {}).label || v;

  function fundingFor(goal) {
    if (goal.type === 'retirement') {
      const ok = proj.summary.success && !proj.summary.depletionAge;
      const retRow = proj.rows.find(r => r.primaryRetired);
      const funded = retRow ? Math.min(1, retRow.investable / (goal.amount * 12)) : 0;
      return { funded: proj.summary.success ? 1 : Math.max(0.3, funded), note: ok ? t('Sur la bonne voie', 'On track') : t('Sous-financé', 'Underfunded') };
    }
    if (goal.type === 'education') {
      const ef = educationFunding(client, goal);
      const current = client.assets.filter(a => ['resp', '529', 'jisa'].includes(a.type)).reduce((s, a) => s + a.value, 0);
      return { funded: Math.min(1, current / goal.amount), note: t(`${money(ef.monthly, { currency: cur })}/mois requis`, `${money(ef.monthly, { currency: cur })}/mo required`) };
    }
    const row = proj.rows.find(r => r.primaryAge >= goal.targetAge) || proj.rows[proj.rows.length - 1];
    const avail = row ? row.investable : 0;
    return { funded: Math.min(1, avail / (goal.amount || 1)), note: t(`Capital projeté : ${money(avail, { currency: cur, compact: true })}`, `Projected capital: ${money(avail, { currency: cur, compact: true })}`) };
  }

  const cards = client.goals.map(g => {
    const f = fundingFor(g);
    const cls = f.funded >= 0.85 ? 'pos' : f.funded >= 0.5 ? 'warn' : 'neg';
    return h('div', { class: 'card' },
      h('div', { class: 'flex between center' },
        h('div', {},
          h('div', { class: 'flex center gap-8' },
            h('span', { class: 'chip ' + (g.priority === 'high' ? 'neg' : g.priority === 'medium' ? 'warn' : 'info') }, prioLabel(g.priority)),
            h('h3', { style: { margin: 0, fontFamily: 'var(--font-display)' } }, g.name)),
          h('div', { class: 'tiny muted', style: { marginTop: '4px' } }, `${typeLabel(g.type)} · ${t('cible', 'target')} ${money(g.amount, { currency: cur })}${g.type !== 'retirement' ? ` ${t('à', 'at')} ${g.targetAge} ${t('ans', 'yrs')}` : '/' + t('an', 'yr')}`)),
        h('div', { class: 'inline', style: { flexWrap: 'nowrap' } },
          h('button', { class: 'btn icon sm ghost', html: icon('edit', 15), onClick: () => edit(g, false) }),
          h('button', { class: 'btn icon sm ghost', html: icon('trash', 15), onClick: () => { store.update(c => c.goals = c.goals.filter(x => x.id !== g.id)); toast(t('Objectif supprimé', 'Goal removed')); } }),
        )),
      h('div', { class: 'flex between', style: { marginTop: '14px', marginBottom: '5px' } },
        h('span', { class: 'tiny muted' }, f.note),
        h('b', { style: { color: `var(--${cls})` } }, pct(f.funded, 0) + ' ' + t('financé', 'funded'))),
      h('div', { class: 'bar' }, h('span', { style: { width: pct(Math.min(1, f.funded), 0), background: cls === 'neg' ? 'var(--neg)' : cls === 'warn' ? 'linear-gradient(90deg,var(--warn),var(--accent-2))' : 'linear-gradient(90deg,var(--brand-500),var(--accent))' } })),
    );
  });

  const head = card(t('Objectifs financiers', 'Financial goals'), { class: 'span-full',
    sub: t('Suivi du financement par rapport aux projections', 'Funding tracked against projections'),
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' ' + t('Objectif', 'Goal'), onClick: () => edit(newGoal(), true) }) },
    cards.length ? h('div', { class: 'grid cols-2' }, ...cards) : h('div', { class: 'empty' }, h('div', { class: 'big' }, '🎯'), t('Aucun objectif défini', 'No goals yet')));

  // ---- Suggestions ----
  const suggestions = suggestGoals(client, jur);
  const sugCards = suggestions.map(s => h('div', { class: 'flex', style: { gap: '12px', padding: '13px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' } },
    h('span', { class: 'chip ' + (s.priority === 'high' ? 'neg' : 'info'), style: { flex: 'none', marginTop: '2px' }, html: icon(s.icon || 'goals', 14) }),
    h('div', { class: 'grow' },
      h('div', { class: 'flex between center' },
        h('b', {}, s.name),
        s.amount > 0 ? h('span', { class: 'mono tiny muted' }, money(s.amount, { currency: cur, compact: true })) : null),
      h('div', { class: 'tiny muted', style: { marginTop: '3px' } }, s.rationale)),
    h('button', { class: 'btn accent sm', style: { flex: 'none' }, html: icon('plus', 13) + ' ' + t('Ajouter', 'Add'),
      onClick: () => {
        store.update(c => c.goals.push(newGoal({ type: s.type, name: s.name, amount: s.amount, targetAge: s.targetAge, priority: s.priority })));
        toast(t('Objectif ajouté ✓', 'Goal added ✓'));
      } }),
  ));

  const sugCard = card(t('Suggestions personnalisées', 'Personalized suggestions'), { class: 'span-full',
    sub: t('Générées à partir du profil complet du client', 'Generated from the full client profile'),
    right: h('span', { class: 'chip info' }, suggestions.length + ' ' + t('idées', 'ideas')) },
    suggestions.length ? h('div', {}, ...sugCards) : h('div', { class: 'empty' }, h('div', { class: 'big' }, '✓'), t('Aucune lacune majeure détectée', 'No major gaps detected')));

  return h('div', { class: 'grid' }, head, sugCard);

  function edit(item, isNew) {
    formModal({ title: isNew ? t('Nouvel objectif', 'New goal') : t('Modifier l’objectif', 'Edit goal'), item,
      fields: [
        { key: 'name', label: t('Nom de l’objectif', 'Goal name') },
        { key: 'type', label: 'Type', type: 'select', opts: typeOpts },
        { key: 'amount', label: t(`Montant cible (${cur})`, `Target amount (${cur})`), type: 'number', hint: t('Pour la retraite : revenu annuel souhaité', 'For retirement: desired annual income') },
        { key: 'targetAge', label: t('Âge cible', 'Target age'), type: 'number' },
        { key: 'priority', label: t('Priorité', 'Priority'), type: 'select', opts: prioOpts },
      ],
      onSave: (d) => store.update(c => { if (isNew) c.goals.push(d); else Object.assign(c.goals.find(g => g.id === d.id), d); }),
    });
  }
}
