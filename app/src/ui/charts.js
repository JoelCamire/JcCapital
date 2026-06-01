// ============================================================
// Dependency-free SVG charting. Each fn returns an SVG string;
// wrap with chartEl() to get a live, responsive node.
// ============================================================
import { svg } from './dom.js';

export const PALETTE = ['#2473b3', '#16b8a6', '#f5a623', '#8e6fd6', '#e0556b', '#4cb5e6', '#6bbf59', '#d98a3a', '#b95da8', '#3d8fa0'];

export function chartEl(str) {
  const wrap = document.createElement('div');
  wrap.style.width = '100%';
  wrap.appendChild(svg(str));
  return wrap;
}

function niceMax(v) {
  if (v <= 0) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * mag;
}
const fmtK = (v) => {
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
  if (a >= 1e3) return Math.round(v / 1e3) + 'k';
  return Math.round(v).toString();
};

const W = 760, H = 320, P = { t: 16, r: 18, b: 34, l: 50 };

function gridAndAxes(maxY, minY, xs, xLabels) {
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  let g = '';
  const ticks = 5;
  for (let i = 0; i <= ticks; i++) {
    const v = minY + (maxY - minY) * (i / ticks);
    const y = P.t + ih - (ih * (i / ticks));
    g += `<line x1="${P.l}" y1="${y.toFixed(1)}" x2="${W - P.r}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="1"/>`;
    g += `<text x="${P.l - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="10.5" fill="var(--text-3)">${fmtK(v)}</text>`;
  }
  // x labels (thin out)
  const step = Math.ceil(xLabels.length / 8);
  xLabels.forEach((lb, i) => {
    if (i % step !== 0 && i !== xLabels.length - 1) return;
    const x = xs(i);
    g += `<text x="${x.toFixed(1)}" y="${H - P.b + 18}" text-anchor="middle" font-size="10.5" fill="var(--text-3)">${lb}</text>`;
  });
  return g;
}

/** Multi-series line / area chart. series:[{name,color,values:[]}] */
export function lineChart({ series, xLabels, area = false, height = H }) {
  const ih = height - P.t - P.b, iw = W - P.l - P.r;
  const all = series.flatMap(s => s.values);
  let maxY = niceMax(Math.max(...all, 1));
  let minY = Math.min(0, ...all); if (minY < 0) minY = -niceMax(-minY);
  const n = series[0].values.length;
  const xs = (i) => P.l + (n <= 1 ? iw / 2 : iw * i / (n - 1));
  const ysc = (v) => P.t + ih - ih * (v - minY) / (maxY - minY);

  let paths = '';
  series.forEach((s, si) => {
    const col = s.color || PALETTE[si % PALETTE.length];
    const pts = s.values.map((v, i) => `${xs(i).toFixed(1)},${ysc(v).toFixed(1)}`);
    if (area) {
      const id = 'ag' + si + Math.random().toString(36).slice(2, 6);
      paths += `<defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${col}" stop-opacity="0.32"/>
        <stop offset="100%" stop-color="${col}" stop-opacity="0.02"/></linearGradient></defs>`;
      paths += `<path d="M${pts[0]} L${pts.join(' L')} L${xs(n - 1).toFixed(1)},${ysc(minY).toFixed(1)} L${xs(0).toFixed(1)},${ysc(minY).toFixed(1)} Z" fill="url(#${id})"/>`;
    }
    paths += `<polyline points="${pts.join(' ')}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
  });
  const baseline = minY < 0 ? `<line x1="${P.l}" y1="${ysc(0).toFixed(1)}" x2="${W - P.r}" y2="${ysc(0).toFixed(1)}" stroke="var(--text-3)" stroke-width="1" stroke-dasharray="2 2"/>` : '';
  return `<svg viewBox="0 0 ${W} ${height}" width="100%" preserveAspectRatio="xMidYMid meet" font-family="var(--font)">
    ${gridAndAxes(maxY, minY, xs, xLabels)}${baseline}${paths}</svg>`;
}

/** Stacked area chart. series:[{name,color,values:[]}] */
export function stackedAreaChart({ series, xLabels, height = H }) {
  const ih = height - P.t - P.b, iw = W - P.l - P.r;
  const n = series[0].values.length;
  const totals = Array.from({ length: n }, (_, i) => series.reduce((s, sr) => s + sr.values[i], 0));
  const maxY = niceMax(Math.max(...totals, 1));
  const xs = (i) => P.l + (n <= 1 ? iw / 2 : iw * i / (n - 1));
  const ysc = (v) => P.t + ih - ih * v / maxY;
  const cum = new Array(n).fill(0);
  let paths = '';
  series.forEach((s, si) => {
    const col = s.color || PALETTE[si % PALETTE.length];
    const top = s.values.map((v, i) => { cum[i] += v; return [xs(i), ysc(cum[i])]; });
    const bot = s.values.map((v, i) => [xs(i), ysc(cum[i] - v)]);
    const d = 'M' + top.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L')
      + ' L' + bot.reverse().map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L') + ' Z';
    paths += `<path d="${d}" fill="${col}" fill-opacity="0.82" stroke="${col}" stroke-width="0.6"/>`;
  });
  return `<svg viewBox="0 0 ${W} ${height}" width="100%" preserveAspectRatio="xMidYMid meet" font-family="var(--font)">
    ${gridAndAxes(maxY, 0, xs, xLabels)}${paths}</svg>`;
}

/** Grouped or stacked bars. series:[{name,color,values:[]}] */
export function barChart({ series, xLabels, stacked = false, height = H }) {
  const ih = height - P.t - P.b, iw = W - P.l - P.r;
  const n = xLabels.length;
  let maxY;
  if (stacked) maxY = niceMax(Math.max(...Array.from({ length: n }, (_, i) => series.reduce((s, sr) => s + Math.max(0, sr.values[i]), 0)), 1));
  else maxY = niceMax(Math.max(...series.flatMap(s => s.values), 1));
  let minY = Math.min(0, ...series.flatMap(s => s.values)); if (minY < 0) minY = -niceMax(-minY);
  const ysc = (v) => P.t + ih - ih * (v - minY) / (maxY - minY);
  const groupW = iw / n, pad = groupW * 0.22;
  const xs = (i) => P.l + groupW * i + groupW / 2;
  let bars = '';
  if (stacked) {
    xLabels.forEach((_, i) => {
      let cum = 0; const bw = groupW - pad * 2;
      series.forEach((s, si) => {
        const v = s.values[i]; const y0 = ysc(cum); const y1 = ysc(cum + v);
        bars += `<rect x="${(P.l + groupW * i + pad).toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.abs(y1 - y0).toFixed(1)}" fill="${s.color || PALETTE[si % PALETTE.length]}" rx="2"/>`;
        cum += v;
      });
    });
  } else {
    const bw = (groupW - pad * 2) / series.length;
    xLabels.forEach((_, i) => {
      series.forEach((s, si) => {
        const v = s.values[i]; const y0 = ysc(0); const y1 = ysc(v);
        bars += `<rect x="${(P.l + groupW * i + pad + bw * si).toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}" width="${(bw * 0.86).toFixed(1)}" height="${Math.abs(y1 - y0).toFixed(1)}" fill="${s.color || PALETTE[si % PALETTE.length]}" rx="2"/>`;
      });
    });
  }
  return `<svg viewBox="0 0 ${W} ${height}" width="100%" preserveAspectRatio="xMidYMid meet" font-family="var(--font)">
    ${gridAndAxes(maxY, minY, xs, xLabels)}${bars}</svg>`;
}

/** Donut chart. segments:[{label,value,color}] */
export function donutChart({ segments, size = 220, thickness = 30, centerLabel, centerSub }) {
  const r = size / 2, ir = r - thickness, cx = r, cy = r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let a0 = -Math.PI / 2, arcs = '';
  segments.forEach((seg, i) => {
    const frac = seg.value / total; const a1 = a0 + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const xi1 = cx + ir * Math.cos(a1), yi1 = cy + ir * Math.sin(a1);
    const xi0 = cx + ir * Math.cos(a0), yi0 = cy + ir * Math.sin(a0);
    const col = seg.color || PALETTE[i % PALETTE.length];
    arcs += `<path d="M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${large} 1 ${x1.toFixed(1)},${y1.toFixed(1)} L${xi1.toFixed(1)},${yi1.toFixed(1)} A${ir},${ir} 0 ${large} 0 ${xi0.toFixed(1)},${yi0.toFixed(1)} Z" fill="${col}"><title>${seg.label}: ${Math.round(frac * 100)}%</title></path>`;
    a0 = a1;
  });
  const center = centerLabel ? `<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="22" font-weight="800" fill="var(--text)" font-family="var(--font-display)">${centerLabel}</text>
    <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="11" fill="var(--text-3)">${centerSub || ''}</text>` : '';
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" font-family="var(--font)">${arcs}${center}</svg>`;
}

/** Monte Carlo fan chart. bands:[{age,p10,p25,p50,p75,p90,retired}] */
export function fanChart({ bands, height = 340 }) {
  const w = W, ih = height - P.t - P.b, iw = w - P.l - P.r;
  const n = bands.length;
  const maxY = niceMax(Math.max(...bands.map(b => b.p90), 1));
  const xs = (i) => P.l + iw * i / (n - 1);
  const ysc = (v) => P.t + ih - ih * v / maxY;
  const xLabels = bands.map(b => b.age);
  const areaBetween = (hi, lo, col, op) => {
    const top = bands.map((b, i) => `${xs(i).toFixed(1)},${ysc(b[hi]).toFixed(1)}`);
    const bot = bands.map((b, i) => `${xs(i).toFixed(1)},${ysc(b[lo]).toFixed(1)}`).reverse();
    return `<path d="M${top.join(' L')} L${bot.join(' L')} Z" fill="${col}" fill-opacity="${op}"/>`;
  };
  const median = `<polyline points="${bands.map((b, i) => `${xs(i).toFixed(1)},${ysc(b.p50).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--brand-600)" stroke-width="2.6"/>`;
  // retirement marker
  const retIdx = bands.findIndex(b => b.retired);
  let marker = '';
  if (retIdx > 0) {
    const x = xs(retIdx);
    marker = `<line x1="${x.toFixed(1)}" y1="${P.t}" x2="${x.toFixed(1)}" y2="${P.t + ih}" stroke="var(--accent-2)" stroke-width="1.4" stroke-dasharray="4 3"/>
      <text x="${(x + 5).toFixed(1)}" y="${P.t + 12}" font-size="10.5" fill="var(--accent-2)" font-weight="700">Retraite</text>`;
  }
  return `<svg viewBox="0 0 ${w} ${height}" width="100%" preserveAspectRatio="xMidYMid meet" font-family="var(--font)">
    ${gridAndAxes(maxY, 0, xs, xLabels)}
    ${areaBetween('p90', 'p10', 'var(--brand-400)', 0.16)}
    ${areaBetween('p75', 'p25', 'var(--brand-400)', 0.28)}
    ${median}${marker}</svg>`;
}

/** Radial gauge 0..1. */
export function gauge({ value, size = 180, label, sub }) {
  const r = size / 2 - 10, cx = size / 2, cy = size / 2;
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
  const ang = a0 + (a1 - a0) * Math.min(1, Math.max(0, value));
  const pt = (a, rr = r) => `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
  const arc = (from, to, col, sw) => {
    const large = (to - from) > Math.PI ? 1 : 0;
    return `<path d="M${pt(from)} A${r},${r} 0 ${large} 1 ${pt(to)}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round"/>`;
  };
  const col = value >= 0.85 ? 'var(--pos)' : value >= 0.6 ? 'var(--warn)' : 'var(--neg)';
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" font-family="var(--font)">
    ${arc(a0, a1, 'var(--surface-3)', 13)}
    ${arc(a0, ang, col, 13)}
    <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="30" font-weight="800" fill="${col}" font-family="var(--font-display)">${label}</text>
    <text x="${cx}" y="${cy + 24}" text-anchor="middle" font-size="11" fill="var(--text-3)">${sub || ''}</text></svg>`;
}

export function sparkline(values, color = 'var(--accent)', w = 90, hgt = 30) {
  if (!values.length) return '';
  const mn = Math.min(...values), mx = Math.max(...values);
  const rng = mx - mn || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1) * w).toFixed(1)},${(hgt - (v - mn) / rng * hgt).toFixed(1)}`);
  return `<svg width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}"><polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
