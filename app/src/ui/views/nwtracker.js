import { h, money, pct, num, icon, toast, fmtDate, t } from '../dom.js';
import { kpi, card, dataTable, legend } from '../widgets.js';
import { lineChart, PALETTE } from '../charts.js';
import { store } from '../../state/store.js';
import { netWorthBreakdown } from '../../engine/analysis.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const nw = netWorthBreakdown(client);
  const snaps = (client.snapshots || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));

  const first = snaps[0], last = snaps[snaps.length - 1];
  const change = (snaps.length >= 2) ? last.netWorth - first.netWorth : 0;
  const changePct = (snaps.length >= 2 && first.netWorth) ? change / Math.abs(first.netWorth) : 0;

  const kpis = h('div', { class: 'grid cols-4 span-full' },
    kpi({ label: t('Valeur nette actuelle', 'Current net worth'), value: money(nw.netWorth, { currency: cur, compact: true }), iconName: 'networth' }),
    kpi({ label: t('Instantanés enregistrés', 'Saved snapshots'), value: snaps.length, iconName: 'timeline' }),
    kpi({ label: t('Variation totale', 'Total change'), value: snaps.length >= 2 ? money(change, { currency: cur, compact: true }) : '—', accent: change >= 0 ? 'var(--pos)' : 'var(--neg)', sub: snaps.length >= 2 ? pct(changePct, 0) : '' }),
    kpi({ label: t('Depuis le premier relevé', 'Since first record'), value: first ? fmtDate(first.date) : '—' }),
  );

  function capture() {
    const snap = { id: Math.random().toString(36).slice(2, 9), date: new Date().toISOString().slice(0, 10), assets: nw.assets, liabilities: nw.liabilities, netWorth: nw.netWorth };
    store.update(c => { c.snapshots = c.snapshots || []; c.snapshots.push(snap); });
    toast(t('Valeur nette capturée ✓', 'Net worth captured ✓'));
  }

  const chartCard = card(t('Évolution de la valeur nette', 'Net worth over time'), { class: 'span-full',
    sub: t('Enregistrez la valeur nette à chaque révision pour suivre la tendance', 'Record net worth at each review to track the trend'),
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' ' + t('Capturer maintenant', 'Capture now'), onClick: capture }) },
    snaps.length >= 2
      ? h('div', {},
          h('div', { html: lineChart({ series: [{ color: PALETTE[0], values: snaps.map(s => Math.round(s.netWorth)) }], xLabels: snaps.map(s => fmtDate(s.date)), area: true }) }),
          legend([{ color: PALETTE[0], label: t('Valeur nette', 'Net worth') }]))
      : h('div', { class: 'empty' }, h('div', { class: 'big' }, '📈'),
          t('Capturez au moins deux relevés pour visualiser la tendance.', 'Capture at least two records to see the trend.')));

  const rows = snaps.map((s, i) => ({ ...s, delta: i > 0 ? s.netWorth - snaps[i - 1].netWorth : 0 }));
  const tableCard = card(t('Historique des relevés', 'Snapshot history'), { class: 'span-full' },
    dataTable({
      rows: rows.slice().reverse(),
      cols: [
        { key: 'date', label: 'Date', fmt: fmtDate },
        { key: 'assets', label: t('Actifs', 'Assets'), num: true, fmt: v => money(v, { currency: cur }) },
        { key: 'liabilities', label: t('Passifs', 'Liabilities'), num: true, fmt: v => money(v, { currency: cur }) },
        { key: 'netWorth', label: t('Valeur nette', 'Net worth'), num: true, fmt: v => money(v, { currency: cur }) },
        { key: 'delta', label: t('Variation', 'Change'), num: true, fmt: (v, r2) => snaps.indexOf(snaps.find(x => x.id === r2.id)) === 0 ? '—' : money(v, { currency: cur, sign: v >= 0 }) },
      ],
      onDelete: (r2) => { store.update(c => c.snapshots = (c.snapshots || []).filter(x => x.id !== r2.id)); toast(t('Relevé supprimé', 'Record removed')); },
      empty: t('Aucun relevé. Cliquez « Capturer maintenant ».', 'No records. Click “Capture now”.'),
    }));

  return h('div', { class: 'grid' }, kpis, chartCard, tableCard);
}
