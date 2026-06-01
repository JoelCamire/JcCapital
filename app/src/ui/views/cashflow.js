import { h, money, pct, t } from '../dom.js';
import { card, legend } from '../widgets.js';
import { stackedAreaChart, lineChart, PALETTE } from '../charts.js';
import { runProjection } from '../../engine/projection.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const proj = runProjection(client);
  const rows = proj.rows;
  const xLabels = rows.map(r => r.primaryAge);

  const inflow = card(t('Flux de trésorerie — composition des revenus', 'Cash flow — income composition'), { class: 'span-full',
    sub: t('Emploi, prestations publiques, revenus de placement et décaissements', 'Employment, public benefits, investment income and withdrawals'),
    right: legend([
      { color: PALETTE[0], label: t('Emploi', 'Employment') }, { color: PALETTE[1], label: t('Prestations', 'Benefits') },
      { color: PALETTE[2], label: t('Placements', 'Investments') }, { color: PALETTE[3], label: t('Décaissements', 'Withdrawals') },
    ]) },
    h('div', { html: stackedAreaChart({
      xLabels,
      series: [
        { color: PALETTE[0], values: rows.map(r => Math.round(r.employmentIncome)) },
        { color: PALETTE[1], values: rows.map(r => Math.round(r.pensionIncome)) },
        { color: PALETTE[2], values: rows.map(r => Math.round(r.investmentIncome)) },
        { color: PALETTE[3], values: rows.map(r => Math.round(r.totalWithdrawals)) },
      ],
    }) }));

  const outflow = card(t('Dépenses, impôts et service de la dette', 'Expenses, taxes and debt service'), { class: 'span-full',
    right: legend([
      { color: PALETTE[4], label: t('Dépenses', 'Expenses') }, { color: PALETTE[5], label: t('Impôt', 'Tax') }, { color: PALETTE[7], label: t('Dette', 'Debt') },
    ]) },
    h('div', { html: stackedAreaChart({
      xLabels,
      series: [
        { color: PALETTE[4], values: rows.map(r => Math.round(r.expenses)) },
        { color: PALETTE[5], values: rows.map(r => Math.round(r.tax)) },
        { color: PALETTE[7], values: rows.map(r => Math.round(r.debtPayments)) },
      ],
    }) }));

  const tableCard = card(t('Détail annuel', 'Annual detail'), { class: 'span-full', sub: t(`${rows.length} années projetées`, `${rows.length} years projected`) },
    h('div', { class: 'tbl-wrap', style: { maxHeight: '520px' } },
      h('table', { class: 'tbl' },
        h('thead', {}, h('tr', {},
          h('th', {}, t('Âge', 'Age')), h('th', {}, t('Année', 'Year')),
          h('th', { class: 'num' }, t('Revenu brut', 'Gross income')), h('th', { class: 'num' }, t('Impôt', 'Tax')),
          h('th', { class: 'num' }, t('Tx moy.', 'Avg rate')), h('th', { class: 'num' }, t('Dépenses', 'Expenses')),
          h('th', { class: 'num' }, t('Décaiss.', 'Withdraw.')), h('th', { class: 'num' }, t('Actifs invest.', 'Investable')),
          h('th', { class: 'num' }, t('Valeur nette', 'Net worth')), h('th', {}, t('Statut', 'Status')))),
        h('tbody', {}, ...rows.map(r => h('tr', {},
          h('td', {}, r.primaryAge), h('td', {}, r.year),
          h('td', { class: 'num mono' }, money(r.grossIncome, { currency: cur })),
          h('td', { class: 'num mono' }, money(r.tax, { currency: cur })),
          h('td', { class: 'num mono' }, pct(r.averageRate, 0)),
          h('td', { class: 'num mono' }, money(r.expenses, { currency: cur })),
          h('td', { class: 'num mono' }, r.totalWithdrawals ? money(r.totalWithdrawals, { currency: cur }) : '—'),
          h('td', { class: 'num mono' }, money(r.investable, { currency: cur })),
          h('td', { class: 'num mono', style: r.netWorth < 0 ? { color: 'var(--neg)' } : {} }, money(r.netWorth, { currency: cur })),
          h('td', {}, r.shortfall > 0 ? h('span', { class: 'chip neg' }, t('Manque', 'Shortfall'))
            : r.primaryRetired ? h('span', { class: 'chip info' }, t('Retraite', 'Retired')) : h('span', { class: 'chip pos' }, t('Actif', 'Working'))),
        ))))));

  return h('div', { class: 'grid' }, inflow, outflow, tableCard);
}
