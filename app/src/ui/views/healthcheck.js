import { h, money, pct, icon, t } from '../dom.js';
import { kpi, card, statList } from '../widgets.js';
import { gauge, PALETTE } from '../charts.js';
import { healthCheck } from '../../engine/healthcheck.js';

export function render({ client, jur, navigate }) {
  const cur = jur.currency;
  const r = healthCheck(client, jur);
  const sevChip = (s) => s === 'risk' ? 'neg' : s === 'warn' ? 'warn' : 'pos';
  const gradeColor = r.overallScore >= 85 ? 'var(--pos)' : r.overallScore >= 55 ? 'var(--warn)' : 'var(--neg)';

  const header = card('', { class: 'span-full' },
    h('div', { class: 'flex center', style: { gap: '28px', flexWrap: 'wrap' } },
      h('div', { style: { textAlign: 'center' } },
        h('div', { html: gauge({ value: r.overallScore / 100, label: r.grade, sub: t('cote globale', 'overall grade') }) })),
      h('div', { class: 'grow' },
        h('h2', { style: { margin: '0 0 4px', fontFamily: 'var(--font-display)' } }, t('Bilan de santé financière', 'Financial health check')),
        h('div', { class: 'muted', style: { marginBottom: '12px' } }, t(`Pointage global de ${r.overallScore}/100 — généré à partir de l’ensemble du dossier`, `Overall score ${r.overallScore}/100 — generated from the full client file`)),
        h('div', { class: 'grid cols-3' },
          kpi({ label: t('Valeur nette', 'Net worth'), value: money(r.netWorth, { currency: cur, compact: true }) }),
          kpi({ label: t('Probabilité de succès', 'Success probability'), value: pct(r.successRate, 0), accent: gradeColor }),
          kpi({ label: t('Actions prioritaires', 'Priority actions'), value: r.actions.length, accent: r.actions.length > 4 ? 'var(--warn)' : 'var(--pos)' }),
        ))));

  // Category scorecards
  const cats = card(t('Pointage par domaine', 'Scores by area'), { class: 'span-full' },
    h('div', { class: 'grid cols-3' }, ...r.categories.map(c => h('div', { class: 'card', style: { background: 'var(--surface-2)' } },
      h('div', { class: 'flex between center' },
        h('b', {}, c.label),
        h('span', { class: 'chip ' + sevChip(c.status) }, Math.round(c.score) + '/100')),
      h('div', { class: 'bar', style: { margin: '10px 0' } }, h('span', { style: { width: Math.round(c.score) + '%', background: c.status === 'risk' ? 'var(--neg)' : c.status === 'warn' ? 'linear-gradient(90deg,var(--warn),var(--accent-2))' : 'linear-gradient(90deg,var(--brand-500),var(--accent))' } })),
      h('div', {}, ...c.findings.slice(0, 2).map(fi => h('div', { class: 'tiny muted', style: { marginTop: '4px' } }, '• ' + fi.title)))))));

  // Prioritized action plan
  const actionsCard = card(t('Plan d’action priorisé', 'Prioritized action plan'), { class: 'span-full',
    sub: t('Du plus urgent au moins urgent', 'Most to least urgent'),
    right: h('button', { class: 'btn sm ghost', onClick: () => navigate('goals'), html: t('Voir les objectifs', 'View goals') + ' ' + icon('chevron', 13) }) },
    r.actions.length ? h('div', {}, ...r.actions.map((a, i) => h('div', { class: 'flex', style: { gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' } },
      h('div', { style: { flex: 'none', width: '26px', height: '26px', borderRadius: '50%', display: 'grid', placeContent: 'center', fontWeight: 700, fontSize: '12px', background: a.severity === 'risk' ? 'var(--neg-soft)' : 'var(--warn-soft)', color: a.severity === 'risk' ? 'var(--neg)' : 'var(--warn)' } }, String(i + 1)),
      h('div', { class: 'grow' },
        h('div', { class: 'flex center gap-8' }, h('b', {}, a.title), h('span', { class: 'chip ' + sevChip(a.severity) }, a.category)),
        h('div', { class: 'tiny muted', style: { marginTop: '2px' } }, a.text)),
    ))) : h('div', { class: 'empty' }, h('div', { class: 'big' }, '✓'), t('Aucune action urgente — excellent dossier', 'No urgent actions — excellent file')));

  return h('div', { class: 'grid' }, header, cats, actionsCard);
}
