// ============================================================
// Reusable UI widgets
// ============================================================
import { h, icon, money } from './dom.js';
import { sparkline } from './charts.js';

export function kpi({ label, value, sub, delta, deltaDir, spark, iconName, accent }) {
  return h('div', { class: 'kpi' },
    h('div', { class: 'label' }, iconName ? h('span', { html: icon(iconName, 15) }) : null, label),
    h('div', { class: 'value', style: accent ? { color: accent } : {} }, value),
    sub ? h('div', { class: 'tiny muted', style: { marginTop: '3px' } }, sub) : null,
    delta != null ? h('div', { class: 'delta ' + (deltaDir || 'up') },
      h('span', { html: icon(deltaDir === 'down' ? 'down' : 'up', 13) }), delta) : null,
    spark ? h('div', { class: 'spark', html: sparkline(spark) }) : null,
  );
}

export function card(title, opts = {}, ...children) {
  const head = title ? h('div', { class: 'card-head' },
    h('div', {},
      h('h3', {}, title),
      opts.sub ? h('div', { class: 'sub' }, opts.sub) : null),
    opts.right ? h('div', { class: 'right' }, opts.right) : null,
  ) : null;
  return h('div', { class: 'card ' + (opts.class || '') }, head, ...children);
}

export function legend(items) {
  return h('div', { class: 'legend' },
    items.map(it => h('span', {}, h('i', { style: { background: it.color } }), it.label)));
}

/** Range slider bound to a value with live readout. */
export function slider({ label, value, min, max, step = 1, format, onInput }) {
  const out = h('b', {}, format ? format(value) : value);
  const input = h('input', {
    type: 'range', min, max, step, value,
    onInput: (e) => { const v = parseFloat(e.target.value); out.textContent = format ? format(v) : v; onInput(v); },
  });
  return h('div', { class: 'slider' },
    h('div', { class: 'top' }, h('span', { class: 'muted' }, label), out), input);
}

/** Inline editable data table. cols:[{key,label,type,num,fmt,opts}] */
export function dataTable({ rows, cols, onEdit, onDelete, empty = 'Aucune donnée' }) {
  if (!rows.length) return h('div', { class: 'empty' }, h('div', { class: 'big' }, '∅'), empty);
  return h('div', { class: 'tbl-wrap' },
    h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, ...cols.map(c => h('th', { class: c.num ? 'num' : '' }, c.label)),
        (onEdit || onDelete) ? h('th', { style: { width: '70px' } }, '') : null)),
      h('tbody', {}, ...rows.map(r => h('tr', {},
        ...cols.map(c => h('td', { class: c.num ? 'num mono' : '' }, c.fmt ? c.fmt(r[c.key], r) : (r[c.key] ?? '—'))),
        (onEdit || onDelete) ? h('td', { class: 'num' },
          h('div', { class: 'inline', style: { justifyContent: 'flex-end', flexWrap: 'nowrap' } },
            onEdit ? h('button', { class: 'btn icon sm ghost', title: 'Modifier', onClick: () => onEdit(r), html: icon('edit', 15) }) : null,
            onDelete ? h('button', { class: 'btn icon sm ghost', title: 'Supprimer', onClick: () => onDelete(r), html: icon('trash', 15) }) : null,
          )) : null,
      ))))
  );
}

/** Build a stat list (label / value pairs). */
export function statList(pairs) {
  return h('div', {}, ...pairs.map(([k, v, cls]) =>
    h('div', { class: 'flex between', style: { padding: '7px 0', borderBottom: '1px solid var(--border)' } },
      h('span', { class: 'muted tiny' }, k),
      h('b', { class: 'mono', style: cls === 'neg' ? { color: 'var(--neg)' } : cls === 'pos' ? { color: 'var(--pos)' } : {} }, v))));
}

/** A simple text/number/select form control bound to an object key. */
export function bound(obj, key, { type = 'text', step, opts, transform } = {}) {
  if (opts) {
    return h('select', { onChange: (e) => obj[key] = transform ? transform(e.target.value) : e.target.value },
      ...opts.map(o => h('option', { value: o.value, selected: String(obj[key]) === String(o.value) }, o.label)));
  }
  return h('input', {
    type, step, value: obj[key] ?? '',
    onInput: (e) => {
      let v = e.target.value;
      if (type === 'number') v = v === '' ? 0 : parseFloat(v);
      obj[key] = transform ? transform(v) : v;
    },
  });
}

export function badgeScore(rate) {
  const cls = rate >= 0.85 ? 'pos' : rate >= 0.6 ? 'warn' : 'neg';
  const txt = rate >= 0.85 ? 'Solide' : rate >= 0.6 ? 'À surveiller' : 'À risque';
  return h('span', { class: 'chip ' + cls }, txt);
}
