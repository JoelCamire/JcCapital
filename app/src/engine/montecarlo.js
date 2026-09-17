// ============================================================
// Monte Carlo simulation — runs N return sequences against the
// deterministic cash-flow schedule to estimate probability of
// success and percentile wealth bands.
//
// Consistency guarantees:
//   • each year's random return is centred on the deterministic
//     blended return of that year (rows[y].detReturn), so the median
//     path tracks the deterministic projection;
//   • the random sequence is SEEDED from the client id + trial count,
//     so the same file shows the same probability on every screen;
//   • results are cached per client object until the file changes,
//     so dashboard / health check / report share ONE run.
// ============================================================
import { runProjection } from './projection.js';
import { assumptionsOf } from '../state/models.js';

// mulberry32 — small, fast, seedable PRNG
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function gaussFrom(rand, mean, sd) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const pctile = (sorted, p) => {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
};

const cache = new WeakMap();   // client object -> { stamp, result }

export function runMonteCarlo(client, { trials = null, assumptions = null, seed = null } = {}) {
  const A = { ...assumptionsOf(client), ...(assumptions || {}) };
  const T = Math.max(50, Math.min(10000, Math.round(trials || A.mcTrials || 1000)));
  const stamp = `${client._rev || 0}|${client.updatedAt || 0}|${T}|${seed ?? ''}|${assumptions ? JSON.stringify(assumptions) : ''}`;
  const hit = cache.get(client);
  if (hit && hit.stamp === stamp) return hit.result;

  const det = runProjection(client, assumptions ? { assumptions } : {});
  const rows = det.rows;
  const N = rows.length;
  // rows[0].investable is the END of year 0; unwind that year to get the opening balance,
  // so replaying (return, flow) for y = 0..N−1 reproduces the deterministic path exactly.
  const start = Math.max(0, (rows[0].investable - rows[0].netFlow) / (1 + (Number.isFinite(rows[0].detReturn) ? rows[0].detReturn : 0)));
  const flow = rows.map(r => r.netFlow);
  const rand = rng(seed != null ? (seed >>> 0) : hashStr(String(client.id || 'x') + '|' + T + '|' + N));

  const matrix = Array.from({ length: N }, () => new Float64Array(T));
  let successes = 0;
  const finals = new Float64Array(T);
  const volRetired = A.returnStdev * (A.retiredVolFactor ?? 0.8);

  for (let t = 0; t < T; t++) {
    let bal = start, ruined = false;
    for (let y = 0; y < N; y++) {
      const retired = rows[y].primaryRetired;
      const geo = Number.isFinite(rows[y].detReturn) ? rows[y].detReturn : (retired ? A.postReturn : A.preReturn);
      const sd = retired ? volRetired : A.returnStdev;
      // The deterministic return is an expected COMPOUND (geometric) return; the
      // arithmetic mean of the sampled returns must be higher by ≈ σ²/2 so the
      // median trajectory tracks the deterministic projection (volatility drag).
      const mean = geo + sd * sd / 2;
      let r = gaussFrom(rand, mean, sd);
      r = Math.max(-0.55, r);                 // floor catastrophic year
      bal = bal * (1 + r) + flow[y];
      if (bal < 0) { bal = 0; if (retired) ruined = true; }
      matrix[y][t] = bal;
    }
    finals[t] = bal;
    if (!ruined && bal > 0) successes++;
  }

  const bands = rows.map((r, y) => {
    const col = Array.from(matrix[y]).sort((a, b) => a - b);
    return {
      year: r.year, age: r.primaryAge, retired: r.primaryRetired,
      p10: pctile(col, 0.10), p25: pctile(col, 0.25), p50: pctile(col, 0.50),
      p75: pctile(col, 0.75), p90: pctile(col, 0.90), det: r.investable,
    };
  });

  const sortedFinals = Array.from(finals).sort((a, b) => a - b);
  const result = {
    det, bands, trials: T,
    successRate: successes / T,
    medianFinal: pctile(sortedFinals, 0.5),
    p10Final: pctile(sortedFinals, 0.10),
    p90Final: pctile(sortedFinals, 0.90),
  };
  cache.set(client, { stamp, result });
  return result;
}
