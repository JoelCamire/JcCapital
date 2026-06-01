// ============================================================
// DOM helpers, formatters, icons, toast & modal primitives
// ============================================================
import { t, locale, getLang } from '../i18n.js';
export { t, locale, getLang } from '../i18n.js';

/** Hyperscript element builder. */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset' && typeof v === 'object') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  add(el, children);
  return el;
}
function add(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false || c === true) continue;
    el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
}

/** Parse an SVG string into a live SVG node. */
export function svg(str) {
  const wrap = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const doc = new DOMParser().parseFromString(str, 'image/svg+xml');
  return doc.documentElement;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

// ---- Formatters ----
const CUR_SYMBOL = { CAD: '$', USD: '$', EUR: '€', GBP: '£', AUD: '$', CHF: 'CHF ' };

export function money(v, { currency = 'CAD', dp = 0, sign = false, compact = false } = {}) {
  if (v == null || isNaN(v)) return '—';
  const neg = v < 0;
  let abs = Math.abs(v);
  let suffix = '';
  if (compact) {
    if (abs >= 1e6) { abs /= 1e6; suffix = ' M'; dp = abs >= 100 ? 0 : 1; }
    else if (abs >= 1e3) { abs /= 1e3; suffix = ' k'; dp = abs >= 100 ? 0 : 1; }
  }
  const s = CUR_SYMBOL[currency] || '$';
  const body = abs.toLocaleString(locale(), { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const out = `${s}${body}${suffix}`;
  if (neg) return `(${out})`;
  return sign ? `+${out}` : out;
}

export function pct(v, dp = 1) {
  if (v == null || isNaN(v)) return '—';
  const s = `${(v * 100).toFixed(dp)} %`;
  return getLang() === 'en' ? s : s.replace('.', ',');
}
export function num(v, dp = 0) {
  if (v == null || isNaN(v)) return '—';
  return v.toLocaleString(locale(), { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
export function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s); if (isNaN(d)) return s;
  return d.toLocaleDateString(locale(), { year: 'numeric', month: 'short', day: 'numeric' });
}
export function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob); if (isNaN(d)) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

// ---- Icons (inline SVG, stroke-based) ----
const I = {
  dashboard: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  client: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-3.3 3.6-5 8-5s8 1.7 8 5',
  networth: 'M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6',
  cashflow: 'M3 12h18M3 12l4-4M3 12l4 4M21 6l-4 4M21 6l-4-4',
  retire: 'M12 2a7 7 0 00-7 7c0 3 2 5 2 7h10c0-2 2-4 2-7a7 7 0 00-7-7zM9 21h6M10 18v3M14 18v3',
  tax: 'M9 3h6l1 4H8zM6 7h12v14H6zM9 11h6M9 15h4',
  goals: 'M12 2v4M12 18v4M2 12h4M18 12h4M12 8a4 4 0 100 8 4 4 0 000-8zM12 12h.01',
  insurance: 'M12 2l8 3v6c0 5-3.5 8-8 11-4.5-3-8-6-8-11V5z',
  estate: 'M3 21h18M6 21V10l6-4 6 4v11M10 21v-5h4v5M9 13h.01M15 13h.01',
  monte: 'M3 18l5-6 4 3 6-9M3 18h18',
  settings: 'M12 9a3 3 0 100 6 3 3 0 000-6zM19 12l2-1-1-3-2 .5a7 7 0 00-1.5-1.3L16 4h-3l-.5 2.2A7 7 0 0011 7.5L9 7 6 8l1 3-2 1 1 3 2-.5a7 7 0 001.5 1.3L13 20h3l.5-2.2A7 7 0 0018 16.5l2 .5 1-3z',
  doc: 'M6 2h8l4 4v16H6zM14 2v4h4',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14',
  edit: 'M4 20h4L18 10l-4-4L4 16zM14 6l4 4',
  chevron: 'M9 6l6 6-6 6',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  menu: 'M3 6h18M3 12h18M3 18h18',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M6 6L4 4M18 18l2 2M18 6l2-2M6 18l-2 2M12 8a4 4 0 100 8 4 4 0 000-8z',
  moon: 'M21 13A9 9 0 1111 3a7 7 0 0010 10z',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  warning: 'M12 3l9 16H3zM12 9v5M12 17h.01',
  check: 'M5 12l5 5L20 7',
  scale: 'M12 3v18M5 7h14M5 7l-3 7h6zM19 7l-3 7h6z',
  bank: 'M3 9l9-5 9 5M4 9h16v2H4zM6 11v7M10 11v7M14 11v7M18 11v7M3 21h18',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18',
};
export function icon(name, size = 18, extra = '') {
  const d = I[name] || I.doc;
  return `<svg class="ic ${extra}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
}

// ---- Toast ----
export function toast(msg, kind = '') {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) { wrap = h('div', { class: 'toast-wrap' }); document.body.appendChild(wrap); }
  const t = h('div', { class: 'toast ' + kind }, msg);
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = '.3s'; setTimeout(() => t.remove(), 300); }, 2600);
}

// ---- Modal ----
export function modal({ title, body, footer, wide = false, onClose }) {
  const bg = h('div', { class: 'modal-bg' });
  const close = () => { bg.remove(); onClose && onClose(); };
  bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
  const m = h('div', { class: 'modal' + (wide ? ' wide' : '') },
    h('div', { class: 'modal-head' },
      h('h2', {}, title),
      h('button', { class: 'x', onClick: close }, '×')
    ),
    h('div', { class: 'modal-body' }, body),
    footer ? h('div', { class: 'modal-foot' }, footer) : null
  );
  bg.appendChild(m);
  document.body.appendChild(bg);
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
  return { close, el: bg };
}

/** Build a labelled form field. */
export function field(label, control, hint) {
  return h('div', { class: 'field' },
    label ? h('label', {}, label) : null,
    control,
    hint ? h('div', { class: 'hint' }, hint) : null
  );
}
