// ============================================================
// Engine input sanitization helpers.
// cleanse(p): returns a shallow copy of a params object where any
// non-finite number (NaN / Infinity) — or a numeric string that
// parses to non-finite — is replaced with undefined, so the
// receiving function's destructuring DEFAULTS take over. This makes
// every calculator robust against corrupted/imported data without
// changing behaviour for valid inputs.
// ============================================================
export function cleanse(p) {
  if (p == null || typeof p !== 'object') return {};
  const out = {};
  for (const k of Object.keys(p)) {
    const v = p[k];
    if (v === null) out[k] = undefined;                       // null -> default
    else if (typeof v === 'number') out[k] = Number.isFinite(v) ? v : undefined;
    else if (typeof v === 'string') out[k] = (v.trim() === '' || !Number.isFinite(Number(v))) ? undefined : v; // '' / "12abc"
    else out[k] = v;
  }
  return out;
}

/** Coerce a single value to a finite number, else default. */
export function fin(v, d = 0) { return Number.isFinite(+v) ? +v : d; }
