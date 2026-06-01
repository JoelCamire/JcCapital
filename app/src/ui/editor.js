// ============================================================
// Generic record editor modal driven by a field spec
// ============================================================
import { h, modal, field } from './dom.js';

/**
 * fields: [{ key, label, type:'text'|'number'|'pct'|'select', opts, step, hint, span }]
 * pct fields store a fraction (0.05) but display as percent (5).
 */
export function formModal({ title, item, fields, onSave, wide = false, intro }) {
  const draft = JSON.parse(JSON.stringify(item));
  const controls = fields.map(f => {
    let ctl;
    if (f.type === 'select') {
      ctl = h('select', { onChange: e => draft[f.key] = coerce(f, e.target.value) },
        ...f.opts.map(o => h('option', { value: o.value, selected: String(draft[f.key]) === String(o.value) }, o.label)));
    } else if (f.type === 'pct') {
      ctl = h('input', { type: 'number', step: f.step || 0.1, value: ((draft[f.key] ?? 0) * 100),
        onInput: e => draft[f.key] = (parseFloat(e.target.value) || 0) / 100 });
    } else {
      ctl = h('input', { type: f.type || 'text', step: f.step, value: draft[f.key] ?? '',
        onInput: e => draft[f.key] = coerce(f, e.target.value) });
    }
    return h('div', { class: f.span === 2 ? 'span-full' : '', style: f.span === 2 ? { gridColumn: '1 / -1' } : {} },
      field(f.label, ctl, f.hint));
  });

  const m = modal({
    title, wide,
    body: h('div', {},
      intro ? h('p', { class: 'tiny muted', style: { marginTop: 0 } }, intro) : null,
      h('div', { class: 'grid cols-2' }, ...controls)),
    footer: [
      h('button', { class: 'btn ghost', onClick: () => m.close() }, 'Annuler'),
      h('button', { class: 'btn primary', onClick: () => { onSave(draft); m.close(); } }, 'Enregistrer'),
    ],
  });
  return m;
}

function coerce(f, v) {
  if (f.type === 'number') return v === '' ? 0 : parseFloat(v);
  if (f.transform) return f.transform(v);
  return v;
}
