import { h, money, pct, icon, toast, t } from '../dom.js';
import { card } from '../widgets.js';
import { formModal } from '../editor.js';
import { store } from '../../state/store.js';
import { newGoal } from '../../state/models.js';
import { educationFunding } from '../../engine/analysis.js';
import { suggestGoals } from '../../engine/suggestions.js';
import { clientFacts, retirementFacts } from '../../engine/facts.js';

/**
 * ONE funding rule shared by the Goals view and the Report.
 *   retirement : amount = target ANNUAL income → funded = projected retirement-year gross income / amount
 *   education  : educationFunding() — FV of the existing education savings vs the target
 *   other      : projected investable capital at targetAge vs amount
 * Returns { funded (0..1), note, detail }.
 */
export function goalFunding(client, jur, goal) {
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const R = retirementFacts(client, jur);
  const amount = Math.max(0, +goal.amount || 0);
  if (goal.type === 'retirement') {
    const inc = R.grossIncome || 0;
    const funded = amount > 0 ? Math.min(1, inc / amount) : (inc > 0 ? 1 : 0);
    const ok = funded >= 1 && R.success;
    return { funded, note: t(`Revenu projeté la 1re année de retraite (${R.retirementAge} ans) : ${money(inc, { currency: cur, compact: true })}/an`, `Projected first-retirement-year income (age ${R.retirementAge}): ${money(inc, { currency: cur, compact: true })}/yr`),
      detail: ok ? t('Sur la bonne voie', 'On track') : R.depletionAge ? t(`Capital épuisé à ${R.depletionAge} ans`, `Capital depleted at ${R.depletionAge}`) : t('Sous-financé', 'Underfunded') };
  }
  if (goal.type === 'education') {
    const ef = educationFunding(client, goal);
    const fvExisting = ef.existing * Math.pow(1 + ef.returnRate, ef.years);
    const funded = ef.target > 0 ? Math.min(1, fvExisting / ef.target) : 1;
    return { funded, note: t(`${money(ef.monthly, { currency: cur })}/mois requis sur ${ef.years} ans (subventions ${money(ef.projectedGrants, { currency: cur, compact: true })})`, `${money(ef.monthly, { currency: cur })}/mo required over ${ef.years} yrs (grants ${money(ef.projectedGrants, { currency: cur, compact: true })})`),
      detail: ef.annual <= 0 ? t('Financé par l’épargne actuelle', 'Funded by current savings') : t('Cotisation requise', 'Contribution required') };
  }
  const rows = R.projection.rows;
  const row = rows.find(r => r.primaryAge >= (+goal.targetAge || 0)) || rows[rows.length - 1];
  const avail = row ? row.investable : 0;
  return { funded: amount > 0 ? Math.min(1, avail / amount) : 1, note: t(`Capital investissable projeté à ${row ? row.primaryAge : '—'} ans : ${money(avail, { currency: cur, compact: true })}`, `Projected investable capital at ${row ? row.primaryAge : '—'}: ${money(avail, { currency: cur, compact: true })}`),
    detail: avail >= amount ? t('Capital disponible', 'Capital available') : t('Capital insuffisant', 'Insufficient capital') };
}

export function render({ client, jur }) {
  const cur = jur.currency;

  const typeOpts = [
    { value: 'retirement', label: t('Retraite', 'Retirement') }, { value: 'education', label: t('Études', 'Education') },
    { value: 'purchase', label: t('Achat majeur', 'Major purchase') }, { value: 'estate', label: t('Legs / succession', 'Estate / legacy') }, { value: 'other', label: t('Autre', 'Other') },
  ];
  const prioOpts = [{ value: 'high', label: t('Élevée', 'High') }, { value: 'medium', label: t('Moyenne', 'Medium') }, { value: 'low', label: t('Faible', 'Low') }];
  const prioLabel = v => (prioOpts.find(o => o.value === v) || {}).label || v;
  const typeLabel = v => (typeOpts.find(o => o.value === v) || {}).label || v;

  const cards = client.goals.map(g => {
    const f = goalFunding(client, jur, g);
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
      h('div', { class: 'tiny muted', style: { marginTop: '5px' } }, f.detail),
    );
  });

  const head = card(t('Objectifs financiers', 'Financial goals'), { class: 'span-full',
    sub: t('Suivi du financement par rapport aux projections — même règle que le rapport', 'Funding tracked against projections — same rule as the report'),
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
    const depOpts = [{ value: '', label: t('— (le plus jeune)', '— (youngest)') }, ...(client.dependents || []).map(d => ({ value: d.id, label: d.name }))];
    formModal({ title: isNew ? t('Nouvel objectif', 'New goal') : t('Modifier l’objectif', 'Edit goal'), item: { ...item, dependentId: item.dependentId || '' },
      fields: [
        { key: 'name', label: t('Nom de l’objectif', 'Goal name') },
        { key: 'type', label: 'Type', type: 'select', opts: typeOpts },
        { key: 'amount', label: t(`Montant cible (${cur})`, `Target amount (${cur})`), type: 'number', hint: t('Pour la retraite : revenu annuel brut souhaité', 'For retirement: desired gross annual income') },
        { key: 'targetAge', label: t('Âge cible', 'Target age'), type: 'number', hint: t('Retraite : âge du titulaire · Études : âge de l’enfant', 'Retirement: primary\'s age · Education: child\'s age') },
        { key: 'dependentId', label: t('Enfant (objectif études)', 'Child (education goal)'), type: 'select', opts: depOpts },
        { key: 'priority', label: t('Priorité', 'Priority'), type: 'select', opts: prioOpts },
      ],
      onSave: (d) => store.update(c => { if (!d.dependentId) delete d.dependentId; if (isNew) c.goals.push(d); else Object.assign(c.goals.find(g => g.id === d.id), d); }),
    });
  }
}
