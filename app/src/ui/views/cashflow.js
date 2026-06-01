import { h, money, pct } from '../dom.js';
import { card, legend } from '../widgets.js';
import { stackedAreaChart, lineChart, PALETTE } from '../charts.js';
import { runProjection } from '../../engine/projection.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const proj = runProjection(client);
  const rows = proj.rows;
  const xLabels = rows.map(r => r.primaryAge);

  const inflow = card('Flux de trésorerie — composition des revenus', { class: 'span-full',
    sub: 'Emploi, prestations publiques, revenus de placement et décaissements',
    right: legend([
      { color: PALETTE[0], label: 'Emploi' }, { color: PALETTE[1], label: 'Prestations' },
      { color: PALETTE[2], label: 'Placements' }, { color: PALETTE[3], label: 'Décaissements' },
    ]) },
    h('div', { html: stackedAreaChart({
      xLabels,
      series: [
        { name: 'Emploi', color: PALETTE[0], values: rows.map(r => Math.round(r.employmentIncome)) },
        { name: 'Prestations', color: PALETTE[1], values: rows.map(r => Math.round(r.pensionIncome)) },
        { name: 'Placements', color: PALETTE[2], values: rows.map(r => Math.round(r.investmentIncome)) },
        { name: 'Décaissements', color: PALETTE[3], values: rows.map(r => Math.round(r.totalWithdrawals)) },
      ],
    }) }));

  const outflow = card('Dépenses, impôts et service de la dette', { class: 'span-full',
    right: legend([
      { color: PALETTE[4], label: 'Dépenses' }, { color: PALETTE[5], label: 'Impôt' }, { color: PALETTE[7], label: 'Dette' },
    ]) },
    h('div', { html: stackedAreaChart({
      xLabels,
      series: [
        { name: 'Dépenses', color: PALETTE[4], values: rows.map(r => Math.round(r.expenses)) },
        { name: 'Impôt', color: PALETTE[5], values: rows.map(r => Math.round(r.tax)) },
        { name: 'Dette', color: PALETTE[7], values: rows.map(r => Math.round(r.debtPayments)) },
      ],
    }) }));

  // table — show every other year to keep it readable
  const shown = rows.filter((_, i) => i % 1 === 0);
  const tableCard = card('Détail annuel', { class: 'span-full', sub: `${rows.length} années projetées` },
    h('div', { class: 'tbl-wrap', style: { maxHeight: '520px' } },
      h('table', { class: 'tbl' },
        h('thead', {}, h('tr', {},
          h('th', {}, 'Âge'), h('th', {}, 'Année'),
          h('th', { class: 'num' }, 'Revenu brut'), h('th', { class: 'num' }, 'Impôt'),
          h('th', { class: 'num' }, 'Tx moy.'), h('th', { class: 'num' }, 'Dépenses'),
          h('th', { class: 'num' }, 'Décaiss.'), h('th', { class: 'num' }, 'Actifs invest.'),
          h('th', { class: 'num' }, 'Valeur nette'), h('th', {}, 'Statut'))),
        h('tbody', {}, ...shown.map(r => h('tr', {},
          h('td', {}, r.primaryAge), h('td', {}, r.year),
          h('td', { class: 'num mono' }, money(r.grossIncome, { currency: cur })),
          h('td', { class: 'num mono' }, money(r.tax, { currency: cur })),
          h('td', { class: 'num mono' }, pct(r.averageRate, 0)),
          h('td', { class: 'num mono' }, money(r.expenses, { currency: cur })),
          h('td', { class: 'num mono' }, r.totalWithdrawals ? money(r.totalWithdrawals, { currency: cur }) : '—'),
          h('td', { class: 'num mono' }, money(r.investable, { currency: cur })),
          h('td', { class: 'num mono', style: r.netWorth < 0 ? { color: 'var(--neg)' } : {} }, money(r.netWorth, { currency: cur })),
          h('td', {}, r.shortfall > 0 ? h('span', { class: 'chip neg' }, 'Manque')
            : r.primaryRetired ? h('span', { class: 'chip info' }, 'Retraite') : h('span', { class: 'chip pos' }, 'Actif')),
        ))))));

  return h('div', { class: 'grid' }, inflow, outflow, tableCard);
}
