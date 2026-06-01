// ============================================================
// Monte Carlo simulation — runs N return sequences against the
// deterministic cash-flow schedule to estimate probability of
// success and percentile wealth bands.
// ============================================================
import { runProjection } from './projection.js';

// Normal sample via Box-Muller
function gauss(mean, sd) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const pctile = (sorted, p) => {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
};

export function runMonteCarlo(client, { trials = 700 } = {}) {
  const det = runProjection(client);
  const A = client.assumptions;
  const rows = det.rows;
  const N = rows.length;
  const start = Math.max(0, rows[0].investable);

  // Deterministic per-year exogenous portfolio flow (+in / -out), already
  // return-independent so it can be replayed against random return sequences.
  const flow = rows.map(r => r.netFlow);

  const matrix = Array.from({ length: N }, () => new Float64Array(trials));
  let successes = 0;
  const finals = new Float64Array(trials);

  for (let t = 0; t < trials; t++) {
    let bal = start, ruined = false;
    for (let y = 0; y < N; y++) {
      const retired = rows[y].primaryRetired;
      const mean = retired ? A.postReturn : A.preReturn;
      const sd = A.returnStdev * (retired ? 0.8 : 1);
      let r = gauss(mean, sd);
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
      p75: pctile(col, 0.75), p90: pctile(col, 0.90),
    };
  });

  const sortedFinals = Array.from(finals).sort((a, b) => a - b);
  return {
    det, bands, trials,
    successRate: successes / trials,
    medianFinal: pctile(sortedFinals, 0.5),
    p10Final: pctile(sortedFinals, 0.10),
    p90Final: pctile(sortedFinals, 0.90),
  };
}
