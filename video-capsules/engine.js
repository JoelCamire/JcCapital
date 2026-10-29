/* JC Capital — moteur de capsules vidéo verticales (canvas 1080x1920)
 * Timeline déterministe : draw(t) ne dépend que de t (secondes).
 * Modes (paramètres d'URL) :
 *   ?v=celi                 aperçu en boucle
 *   ?v=celi&record=1        enregistrement MediaRecorder + envoi au serveur Node local
 *   ?v=celi&frames=2,20,end exporte des PNG de la timeline (contrôle)
 */
'use strict';
const W = 1080, H = 1920;
const C = {
  bg0: '#0C1417', bg1: '#22333B', gold: '#C6AC8F', g1: '#DCC3A2', g2: '#AC9376',
  beige: '#EAE0D5', text: '#F4EEE4', brown: '#5E503F', dim: 'rgba(244,238,228,0.55)',
  faint: 'rgba(244,238,228,0.14)'
};
const MX = 100;            // marge gauche
const CW = 860;            // largeur utile du texte (zone sûre Reels/TikTok)
const VIDEOS = {};

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, t0, d) => clamp((t - t0) / d);
const E = {
  out3: x => 1 - Math.pow(1 - x, 3),
  out5: x => 1 - Math.pow(1 - x, 5),
  inOut3: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  outBack: x => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  in2: x => x * x
};
const fmt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const font = (w, s, fam = 'Outfit') => `${w} ${s}px "${fam}"`;

/* ---------- dégradés ---------- */
function goldGrad(y0, y1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, C.g1); g.addColorStop(1, C.g2); return g;
}

/* ---------- texte enrichi : *mot en or*, ~ = espace insécable ---------- */
function parseRich(str) {
  // typographie française : pas de coupure dans « 1 500 $ », « 1 % », ni avant « : ? ! »
  str = str.replace(/(\d) (?=\d{3}(?!\d))/g, "$1~").replace(/(\d) (?=[$%])/g, "$1~")
    .replace(/ (?=[:;?!»])/g, "~").replace(/« /g, "«~");
  const out = []; let gold = false;
  str.split(/\n/).forEach((para, pi) => {
    if (pi > 0) out.push({ br: true });
    para.split(' ').filter(s => s.length).forEach(raw => {
      let w = raw, g = gold;
      if (w.startsWith('*')) { w = w.slice(1); g = true; gold = true; }
      if (w.endsWith('*')) { w = w.slice(0, -1); gold = false; }
      else if (w.includes('*')) { const i = w.indexOf('*'); w = w.slice(0, i) + w.slice(i + 1); gold = false; }
      out.push({ w: w.replace(/~/g, ' '), gold: g });
    });
  });
  return out;
}
function layoutRich(str, o) {
  ctx.font = font(o.weight, o.size, o.fam);
  if (o.ls) ctx.letterSpacing = o.ls + 'px'; else ctx.letterSpacing = '0px';
  const sp = ctx.measureText(' ').width;
  const toks = parseRich(str);
  const lines = [[]]; let lw = 0;
  toks.forEach(tk => {
    if (tk.br) { lines.push([]); lw = 0; return; }
    tk.width = ctx.measureText(tk.w).width;
    const cur = lines[lines.length - 1];
    const add = (cur.length ? sp : 0) + tk.width;
    if (cur.length && lw + add > o.maxW) { lines.push([tk]); lw = tk.width; }
    else { cur.push(tk); lw += add; }
  });
  return { lines, sp };
}
/* Révélation mot par mot. Renvoie la géométrie des lignes (pour barrer, souligner...). */
function words(str, x, y, opt, lt) {
  const o = Object.assign({ size: 80, weight: 800, fam: 'Outfit', color: C.text, lh: 1.12, maxW: CW,
    t0: 0, stagger: 0.06, dur: 0.55, align: 'left', alpha: 1, rise: 34 }, opt);
  const { lines, sp } = layoutRich(str, o);
  const geo = []; let i = 0;
  lines.forEach((ln, li) => {
    const lw = ln.reduce((a, tk, k) => a + tk.width + (k ? sp : 0), 0);
    let cx = o.align === 'center' ? x - lw / 2 : (o.align === 'right' ? x - lw : x);
    const ly = y + li * o.size * o.lh;
    geo.push({ x: cx, y: ly, w: lw });
    ln.forEach(tk => {
      const p = E.out3(prog(lt, o.t0 + i * o.stagger, o.dur));
      if (p > 0) {
        ctx.save();
        ctx.globalAlpha *= p * o.alpha;
        ctx.font = font(o.weight, o.size, o.fam);
        ctx.letterSpacing = (o.ls || 0) + 'px';
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = tk.gold ? goldGrad(ly - o.size * 0.8, ly + o.size * 0.1) : o.color;
        ctx.fillText(tk.w, cx, ly + (1 - p) * o.rise);
        ctx.restore();
      }
      cx += tk.width + sp; i++;
    });
  });
  return { lines: geo, bottom: y + (lines.length - 1) * o.size * o.lh, count: i, end: o.t0 + i * o.stagger + o.dur };
}
function text(str, x, y, o = {}) {
  ctx.save();
  ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha);
  ctx.font = font(o.weight || 500, o.size || 40, o.fam || 'Outfit');
  ctx.letterSpacing = (o.ls || 0) + 'px';
  ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
  ctx.fillStyle = o.gold ? goldGrad(y - (o.size || 40) * 0.85, y + (o.size || 40) * 0.1) : (o.color || C.text);
  if (o.glow) { ctx.shadowColor = 'rgba(198,172,143,0.35)'; ctx.shadowBlur = o.glow; }
  ctx.fillText(str, x, y);
  ctx.restore();
}
function mono(str, x, y, o = {}) {
  text(str, x, y, Object.assign({ fam: 'IBM Plex Mono', weight: 500, size: 30, ls: 4, color: C.gold }, o));
}
/* Étiquette de section : petit trait + texte mono */
function kicker(label, lt, y = 470, t0 = 0) {
  const p = E.out3(prog(lt, t0, 0.6));
  ctx.save(); ctx.globalAlpha *= p;
  ctx.strokeStyle = C.gold; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(MX, y - 11); ctx.lineTo(MX + 56 * p, y - 11); ctx.stroke();
  mono(label, MX + 76, y, { size: 30, ls: 5 });
  ctx.restore();
}
/* Grand chiffre doré */
function big(str, x, y, size, o = {}) {
  text(str, x, y, Object.assign({ weight: 800, size, gold: true, glow: 40, align: 'left' }, o));
}
function stamp(str, x, y, size, lt, t0, o = {}) {
  const p = prog(lt, t0, 0.5); if (p <= 0) return;
  const s = 1.35 - 0.35 * E.outBack(p);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha *= E.out3(p);
  text(str, 0, 0, Object.assign({ weight: 800, size, gold: true, glow: 50, align: 'center', base: 'middle' }, o));
  ctx.restore();
}
function strike(geo, lt, t0, color = C.gold) {
  geo.lines.forEach((ln, i) => {
    const p = E.inOut3(prog(lt, t0 + i * 0.18, 0.4)); if (p <= 0) return;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ln.x - 8, ln.y - 28); ctx.lineTo(ln.x - 8 + (ln.w + 16) * p, ln.y - 28); ctx.stroke();
    ctx.restore();
  });
}
function hline(x1, x2, y, p, o = {}) {
  if (p <= 0) return;
  ctx.save(); ctx.strokeStyle = o.color || C.gold; ctx.lineWidth = o.lw || 3; ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha);
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 + (x2 - x1) * p, y); ctx.stroke(); ctx.restore();
}
function rrect(x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}
function card(x, y, w, h, p, o = {}) {
  if (p <= 0) return;
  ctx.save(); ctx.globalAlpha *= E.out3(p);
  rrect(x, y + (1 - E.out3(p)) * 40, w, h, o.r || 28);
  ctx.fillStyle = o.fill || 'rgba(244,238,228,0.045)'; ctx.fill();
  ctx.strokeStyle = o.stroke || 'rgba(198,172,143,0.45)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}
/* Barre verticale qui monte */
function vbar(x, base, w, h, p, o = {}) {
  const hh = h * E.out3(clamp(p)); if (hh <= 0.5) return;
  ctx.save(); ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha);
  ctx.fillStyle = o.fill || goldGrad(base - h, base);
  rrect(x, base - hh, w, hh, Math.min(o.r == null ? 10 : o.r, w / 2, hh / 2)); ctx.fill();
  ctx.restore();
}

/* ---------- icônes SVG (boîte 100x100) tracées au trait ---------- */
const ICON_SRC = {
  shield: ['M50 8 L84 20 V46 C84 70 69 85 50 92 C31 85 16 70 16 46 V20 Z', 'M35 50 L46 61 L67 38'],
  house: ['M10 50 L50 14 L90 50', 'M22 40 V88 H78 V40', 'M42 88 V64 H58 V88'],
  check: ['M18 52 L41 74 L84 28'],
  cross: ['M26 26 L74 74', 'M74 26 L26 74'],
  warning: ['M50 10 L92 86 H8 Z', 'M50 38 V60', 'M50 71 V73'],
  calendar: ['M14 24 H86 V88 H14 Z', 'M14 42 H86', 'M32 12 V32', 'M68 12 V32'],
  coin: ['M50 12 A38 38 0 1 1 49.9 12', 'M50 26 V74', 'M62 36 C58 30 38 28 38 40 C38 52 62 48 62 60 C62 72 42 70 37 64'],
  arrowUp: ['M50 88 V14', 'M24 40 L50 14 L76 40'],
  arrowDown: ['M50 12 V86', 'M24 60 L50 86 L76 60'],
  chat: ['M12 18 H88 V68 H44 L24 86 V68 H12 Z'],
  heart: ['M50 86 C20 64 8 48 12 32 C16 16 38 12 50 30 C62 12 84 16 88 32 C92 48 80 64 50 86 Z'],
  person: ['M50 12 A15 15 0 1 1 49.9 12', 'M20 90 C20 64 33 52 50 52 C67 52 80 64 80 90'],
  clock: ['M50 10 A40 40 0 1 1 49.9 10', 'M50 26 V50 L67 60'],
  hourglass: ['M26 10 H74', 'M26 90 H74', 'M30 10 C30 38 50 42 50 50 C50 58 30 62 30 90', 'M70 10 C70 38 50 42 50 50 C50 58 70 62 70 90'],
  lock: ['M26 46 H74 V88 H26 Z', 'M36 46 V32 C36 12 64 12 64 32 V46', 'M50 62 V72'],
  box: ['M12 36 L50 18 L88 36 L50 54 Z', 'M12 36 V74 L50 92 L88 74 V36', 'M50 54 V92'],
  key: ['M30 50 A18 18 0 1 1 29.9 50', 'M48 50 H90', 'M78 50 V64', 'M88 50 V60'],
  chart: ['M14 86 H88', 'M24 86 V62', 'M44 86 V48', 'M64 86 V30', 'M20 52 L44 36 L62 42 L84 16', 'M70 16 H84 V30']
};
const ICONS = {};
(function buildIcons() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  document.body.appendChild(svg);
  for (const k in ICON_SRC) {
    ICONS[k] = ICON_SRC[k].map(d => {
      const pe = document.createElementNS(svgNS, 'path'); pe.setAttribute('d', d); svg.appendChild(pe);
      return { p: new Path2D(d), len: pe.getTotalLength() };
    });
  }
  svg.remove();
})();
/* p : progression du tracé 0..1 */
function icon(name, cx, cy, size, p, o = {}) {
  if (p <= 0) return;
  const parts = ICONS[name]; const total = parts.reduce((a, b) => a + b.len, 0);
  const s = size / 100;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2); ctx.scale(s, s);
  ctx.lineWidth = (o.lw || 7) / s;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = o.color || goldGrad(0, 100);
  if (o.glow !== false) { ctx.shadowColor = 'rgba(198,172,143,0.45)'; ctx.shadowBlur = 24; }
  let acc = 0; const target = total * clamp(p);
  parts.forEach(pt => {
    const vis = clamp((target - acc) / pt.len); acc += pt.len;
    if (vis <= 0) return;
    ctx.setLineDash([pt.len, pt.len + 1]); ctx.lineDashOffset = pt.len * (1 - vis);
    ctx.stroke(pt.p);
  });
  if (o.fill && p >= 1) { ctx.globalAlpha *= 0.12; ctx.fillStyle = C.gold; ctx.fill(parts[0].p); }
  ctx.restore();
}
/* Halo circulaire derrière une icône */
function halo(cx, cy, r, p) {
  if (p <= 0) return;
  ctx.save(); ctx.globalAlpha *= E.out3(p);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, 'rgba(198,172,143,0.20)'); g.addColorStop(1, 'rgba(198,172,143,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(198,172,143,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * E.out3(p)); ctx.stroke();
  ctx.restore();
}
/* Liste à puces cochées */
function checklist(items, x, y, gap, lt, t0, step, o = {}) {
  items.forEach((it, i) => {
    const ti = t0 + i * step;
    const p = prog(lt, ti, 0.6);
    if (p <= 0) return;
    ctx.save(); ctx.globalAlpha *= E.out3(p);
    ctx.beginPath(); ctx.arc(x + 42, y + i * gap - 24, 42, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(198,172,143,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    icon(o.icon || 'check', x + 42, y + i * gap - 24, 48, prog(lt, ti + 0.1, 0.5), { lw: 6 });
    words(it, x + 120, y + i * gap - 4, { size: o.size || 60, weight: 500, maxW: o.maxW || 720, t0: ti + 0.15, stagger: 0.04, lh: 1.15 }, lt);
  });
}
/* Lettres d'un sigle avec leur mot dessous */
function acronym(letters, wordsArr, y, lt, t0 = 0) {
  const n = letters.length, colW = CW / n;
  letters.forEach((L, i) => {
    const cx = MX + colW * i + colW / 2;
    const p = prog(lt, t0 + i * 0.16, 0.6);
    if (p <= 0) return;
    ctx.save(); ctx.globalAlpha *= E.out3(p);
    text(L, cx, y + (1 - E.out3(p)) * 60, { weight: 800, size: 200, gold: true, glow: 40, align: 'center' });
    ctx.restore();
    const q = prog(lt, t0 + 0.7 + i * 0.16, 0.5);
    if (q > 0) text(wordsArr[i], cx, y + 78, { size: 38, weight: 500, color: C.beige, align: 'center', alpha: E.out3(q) });
  });
  hline(MX, MX + CW, y + 130, E.inOut3(prog(lt, t0 + 0.9, 0.9)), { alpha: 0.5, lw: 2 });
}

/* ---------- fond, en-tête, progression ---------- */
let BG = null, LOGO = null;
function buildBg() {
  BG = document.createElement('canvas'); BG.width = W; BG.height = H;
  const b = BG.getContext('2d');
  const g = b.createLinearGradient(0, 0, W * 0.35, H);
  g.addColorStop(0, C.bg1); g.addColorStop(0.55, '#162228'); g.addColorStop(1, C.bg0);
  b.fillStyle = g; b.fillRect(0, 0, W, H);
  // fines lignes diagonales très discrètes
  b.strokeStyle = 'rgba(234,224,213,0.025)'; b.lineWidth = 1;
  for (let i = -H; i < W; i += 46) { b.beginPath(); b.moveTo(i, H); b.lineTo(i + H * 0.55, 0); b.stroke(); }
  // vignette
  const v = b.createRadialGradient(W / 2, H * 0.45, H * 0.2, W / 2, H * 0.5, H * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)');
  b.fillStyle = v; b.fillRect(0, 0, W, H);
}
function drawBg(t) {
  ctx.drawImage(BG, 0, 0);
  const gx = W * (0.62 + 0.18 * Math.sin(t * 0.21)), gy = H * (0.36 + 0.10 * Math.cos(t * 0.17));
  const r = ctx.createRadialGradient(gx, gy, 0, gx, gy, 760);
  r.addColorStop(0, 'rgba(198,172,143,0.13)'); r.addColorStop(1, 'rgba(198,172,143,0)');
  ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  // coins décoratifs
  ctx.save(); ctx.strokeStyle = 'rgba(198,172,143,0.35)'; ctx.lineWidth = 2;
  const m = 46, L = 60;
  [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) => {
    ctx.beginPath(); ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y); ctx.stroke();
  });
  ctx.restore();
}
function drawHeader(t, V, sceneIdx, local) {
  if (LOGO && sceneIdx < V.scenes.length - 1) {
    // logo recadré (le PNG a de grandes marges)
    const sx = 0, sy = 470, sw = 4607, sh = 1600, dh = 74, dw = dh * sw / sh;
    ctx.drawImage(LOGO, sx, sy, sw, sh, MX, 118, dw, dh);
  }
  mono(V.label, W - MX, 168, { align: 'right', size: 26, ls: 4, color: C.beige, alpha: 0.85 });
  // progression segmentée
  const y = 248, gap = 10, n = V.scenes.length, segW = (W - 2 * MX - gap * (n - 1)) / n;
  V.scenes.forEach((s, i) => {
    const x = MX + i * (segW + gap);
    ctx.fillStyle = C.faint; ctx.fillRect(x, y, segW, 4);
    const f = i < sceneIdx ? 1 : (i === sceneIdx ? clamp(local / s.d) : 0);
    if (f > 0) { ctx.fillStyle = C.gold; ctx.fillRect(x, y, segW * f, 4); }
  });
}
/* Écran de fin commun */
function endScene(lt) {
  icon('chat', W / 2, 560, 150, prog(lt, 0.1, 0.9), { lw: 6 });
  words('Une question ?', W / 2, 820, { size: 112, align: 'center', t0: 0.3, stagger: 0.1 }, lt);
  words('Écrivez *PLAN*', W / 2, 990, { size: 104, align: 'center', t0: 0.9, stagger: 0.12 }, lt);
  const p = E.out3(prog(lt, 1.5, 0.7));
  hline(W / 2 - 230 * p, W / 2 + 230 * p, 1060, p > 0 ? 1 : 0, { alpha: 0.6, lw: 2 });
  text('jccapital.ca', W / 2, 1160, { size: 72, weight: 500, color: C.beige, align: 'center', alpha: p, ls: 1 });
  const q = E.out3(prog(lt, 2.0, 0.8));
  if (LOGO && q > 0) {
    const sx = 0, sy = 470, sw = 4607, sh = 1600, dh = 120, dw = dh * sw / sh;
    ctx.save(); ctx.globalAlpha *= q; ctx.drawImage(LOGO, sx, sy, sw, sh, W / 2 - dw / 2, 1260, dw, dh); ctx.restore();
  }
  const r = E.out3(prog(lt, 2.4, 0.8));
  mono('Joël Camiré, conseiller en sécurité financière', W / 2, 1490, { align: 'center', size: 28, ls: 1, color: C.beige, alpha: r * 0.9 });
  mono('Contenu informatif', W / 2, 1536, { align: 'center', size: 28, ls: 1, color: C.beige, alpha: r * 0.7 });
}

/* ---------- timeline ---------- */
let V = null, DUR = 0;
function prepare(id) {
  V = VIDEOS[id];
  let acc = 0; V.scenes.forEach(s => { s.start = acc; acc += s.d; });
  DUR = acc;
}
function draw(t) {
  t = clamp(t, 0, DUR - 0.001);
  drawBg(t);
  let idx = V.scenes.findIndex(s => t >= s.start && t < s.start + s.d);
  if (idx < 0) idx = V.scenes.length - 1;
  const s = V.scenes[idx], lt = t - s.start;
  const last = idx === V.scenes.length - 1;
  // transition : entrée douce, sortie vers le haut
  const out = last ? 0 : E.in2(prog(lt, s.d - 0.45, 0.45));
  const inn = idx === 0 ? 1 : E.out3(prog(lt, 0, 0.35));
  ctx.save();
  ctx.globalAlpha = (1 - out) * inn;
  ctx.translate(0, 60 - 60 * out);   // +60 : recentre le contenu verticalement
  s.draw(lt, s.d);
  ctx.restore();
  // balayage doré entre les scènes
  if (idx > 0) {
    const w = prog(lt, 0, 0.5);
    if (w < 1) {
      ctx.save(); ctx.globalAlpha = Math.sin(w * Math.PI) * 0.8;
      const x = -200 + (W + 400) * E.inOut3(w);
      const g = ctx.createLinearGradient(x - 200, 0, x + 200, 0);
      g.addColorStop(0, 'rgba(220,195,162,0)'); g.addColorStop(0.5, 'rgba(220,195,162,0.5)'); g.addColorStop(1, 'rgba(220,195,162,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 200, 300, 400, 3);
      ctx.restore();
    }
  }
  drawHeader(t, V, idx, lt);
}

/* ---------- musique de fond WebAudio (ambiance spa) ----------
 * Une seule fonction, partagée par les 4 capsules, déterministe (graine fixe).
 * Do majeur, 80 BPM (1 mesure = 3 s), un accord toutes les 2 mesures :
 * Cmaj9 – Am9 – Fmaj7 – G(add9), en boucle.
 * Couches : nappe (sinus + triangles, passe-bas 1 200-1 700 Hz qui respire),
 * basse sinus, pouls feutré à 80 BPM (à peine audible), cloche douce ou
 * arpège lent toutes les 2 mesures, réverbération par convolution
 * (bruit décroissant généré). Fondu d'entrée 1,5 s, fondu de sortie 2 s.
 * Fonctionne aussi avec un OfflineAudioContext (dest = ac.destination). */
function makeAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = new AC({ sampleRate: 48000 });
  const dest = ac.createMediaStreamDestination();
  return { ac, dest };
}
function scheduleAudio(ac, dest, dur, lead) {
  const T0 = ac.currentTime + lead, END = T0 + dur;
  const BEAT = 60 / 80, BAR = 4 * BEAT, CH = 2 * BAR;          // 0,75 s · 3 s · 6 s
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  let seed = 20261029;                                          // graine fixe : même musique à chaque rendu
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

  // ---- chaîne de sortie : bus -> passe-bas 1 800 Hz -> compresseur doux -> volume général -> dest
  const master = ac.createGain();
  const LVL = 0.28;
  master.gain.setValueAtTime(0, T0);
  master.gain.linearRampToValueAtTime(LVL, T0 + 1.5);           // fondu d'entrée 1,5 s
  master.gain.setValueAtTime(LVL, END - 2);
  master.gain.linearRampToValueAtTime(0, END);                  // fondu de sortie 2 s
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 18; comp.ratio.value = 2.5; comp.attack.value = 0.08; comp.release.value = 0.6;
  const top = ac.createBiquadFilter(); top.type = 'lowpass'; top.frequency.value = 1800; top.Q.value = 0.5;
  const bus = ac.createGain();
  bus.connect(top); top.connect(comp); comp.connect(master); master.connect(dest);

  // ---- réverbération : convolution avec un bruit stéréo décroissant (3,5 s)
  const rev = ac.createConvolver();
  const len = Math.floor(ac.sampleRate * 3.5), ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) { const x = i / len; d[i] = (rnd() * 2 - 1) * Math.pow(1 - x, 2.2) * Math.exp(-3 * x); }
  }
  rev.buffer = ir;
  const revTone = ac.createBiquadFilter(); revTone.type = 'lowpass'; revTone.frequency.value = 1500;
  const wet = ac.createGain(); wet.gain.value = 0.55;
  rev.connect(revTone); revTone.connect(wet); wet.connect(bus);
  const out = (node, dry, send) => {
    const g = ac.createGain(); g.gain.value = dry; node.connect(g); g.connect(bus);
    const s = ac.createGain(); s.gain.value = send; node.connect(s); s.connect(rev);
  };

  // ---- nappe : passe-bas qui respire lentement entre ~1 200 et ~1 700 Hz
  const padBus = ac.createGain(); padBus.gain.value = 1;
  const padLp = ac.createBiquadFilter(); padLp.type = 'lowpass'; padLp.frequency.value = 1450; padLp.Q.value = 0.4;
  const lfo = ac.createOscillator(); lfo.frequency.value = 1 / 16;
  const lfoG = ac.createGain(); lfoG.gain.value = 250;
  lfo.connect(lfoG); lfoG.connect(padLp.frequency); lfo.start(T0); lfo.stop(END + 4);
  padBus.connect(padLp); out(padLp, 0.8, 0.45);

  const CHORDS = [                                              // basse, nappe, motif
    { b: 36, pad: [52, 55, 59, 62], bell: [76] },               // Cmaj9 (I)
    { b: 45, pad: [52, 55, 59, 60], arp: [69, 72, 76] },        // Am9 (vi)
    { b: 41, pad: [53, 57, 60, 64], bell: [72] },               // Fmaj7 (IV)
    { b: 43, pad: [50, 55, 59, 62], arp: [67, 71, 74] }         // G(add9) (V)
  ];
  const env = (g, st, peak, a, en, r) => {                      // longues attaques et relâchements
    g.gain.setValueAtTime(0, st);
    g.gain.linearRampToValueAtTime(peak, st + a);
    g.gain.setValueAtTime(peak, en);
    g.gain.linearRampToValueAtTime(0, en + r);
  };
  const N = Math.ceil(dur / CH) + 1;
  for (let k = 0; k < N; k++) {
    const P = CHORDS[k % CHORDS.length];
    const st = T0 + k * CH - (k ? 1.2 : 0);                     // chevauchement : fondu enchaîné des accords
    if (st > END) break;
    const en = T0 + (k + 1) * CH - 0.6, a = k ? 2.6 : 1.5, r = 3;
    // nappe : chaque note = sinus + triangle légèrement désaccordé
    P.pad.forEach((m, j) => {
      [['sine', 0.05, 0], ['triangle', 0.018, 7]].forEach(([type, peak, det]) => {
        const o = ac.createOscillator(); o.type = type; o.frequency.value = hz(m);
        o.detune.value = (j % 2 ? det : -det) + (rnd() - 0.5) * 4;
        const g = ac.createGain(); env(g, st, peak / (1 + j * 0.15), a, en, r);
        o.connect(g); g.connect(padBus); o.start(st); o.stop(en + r + 0.05);
      });
    });
    // basse : sinus rond
    { const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = hz(P.b);
      const g = ac.createGain(); env(g, st, 0.11, a, en, r);
      o.connect(g); out(g, 0.9, 0.15); o.start(st); o.stop(en + r + 0.05); }
    // pouls feutré à 80 BPM : sinus grave, attaque arrondie, temps 1 un peu plus présent
    const c0 = T0 + k * CH;
    for (let b = 0; b < 8; b++) {
      const t = c0 + b * BEAT;
      if (t < T0 + 3 || t > END - 2.5) continue;                // absent de l'intro et de la fin
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = hz(P.b + 12);
      const g = ac.createGain(), pk = b % 4 === 0 ? 0.05 : 0.03;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(pk, t + 0.07);
      g.gain.setTargetAtTime(0, t + 0.07, 0.16);
      o.connect(g); out(g, 0.9, 0.2); o.start(t); o.stop(t + 1.2);
    }
    // motif : cloche douce (accords pairs) ou arpège lent feutré (accords impairs), une fois toutes les 2 mesures
    const notes = P.bell || P.arp, t1 = c0 + (P.bell ? 2 * BEAT : BAR), gap = 2 * BEAT / 1.5;
    notes.forEach((m, i) => {
      const t = t1 + i * gap;
      if (t < T0 + 2 || t > END - 3) return;
      const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
      const g = ac.createGain(), pk = P.bell ? 0.045 : 0.032;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(pk, t + 0.06);             // pas d'attaque sèche
      g.gain.setTargetAtTime(0, t + 0.06, P.bell ? 1.1 : 0.8);
      [[1, 1], [2, 0.18]].forEach(([mul, lv]) => {              // fondamentale + octave très discrète
        const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = hz(m) * mul;
        const og = ac.createGain(); og.gain.value = lv; o.connect(og); og.connect(g);
        o.start(t); o.stop(t + 6);
      });
      if (pan) { pan.pan.value = (i % 2 ? 0.25 : -0.25); g.connect(pan); out(pan, 0.55, 0.7); }
      else out(g, 0.55, 0.7);
    });
  }
}

/* ---------- utilitaires réseau ---------- */
function log(msg) { try { fetch('/log', { method: 'POST', body: String(msg) }); } catch (e) {} console.log(msg); }
window.addEventListener('error', e => log('ERREUR JS: ' + e.message + ' @' + e.lineno));
async function post(name, blob) {
  const r = await fetch('/upload?name=' + encodeURIComponent(name), { method: 'POST', body: blob });
  return r.ok;
}

/* ---------- démarrage ---------- */
async function boot() {
  const qs = new URLSearchParams(location.search);
  const id = qs.get('v') || 'celi';
  prepare(id);
  await Promise.all([
    document.fonts.load(font(800, 100)), document.fonts.load(font(500, 100)),
    document.fonts.load(font(500, 30, 'IBM Plex Mono'))
  ]);
  await document.fonts.ready;
  const fontsOk = document.fonts.check(font(800, 100)) && document.fonts.check(font(500, 30, 'IBM Plex Mono'));
  log('polices chargées: ' + fontsOk);
  LOGO = await new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = '../img/final_logo.png'; });
  log('logo: ' + !!LOGO);
  buildBg();

  if (qs.get('frames')) {
    const fr = qs.get('frames');
    const list = fr === 'late' ? V.scenes.map(s => s.start + s.d - 0.75)
      : fr.split(',').map(s => s === 'end' ? DUR - 0.05 : parseFloat(s));
    const cols = 4, sw = 405, sh = 720, rows = Math.ceil(list.length / cols);
    const sheet = document.createElement('canvas'); sheet.width = cols * sw; sheet.height = rows * sh;
    const sc = sheet.getContext('2d'); sc.fillStyle = '#000'; sc.fillRect(0, 0, sheet.width, sheet.height);
    for (let k = 0; k < list.length; k++) {
      const tt = list[k];
      draw(tt);
      sc.drawImage(canvas, (k % cols) * sw, Math.floor(k / cols) * sh, sw - 4, sh - 4);
      if (fr !== 'late') {
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        await post(`src-${id}-${String(Math.round(tt)).padStart(2, '0')}s.png`, blob);
      }
    }
    const sb = await new Promise(r => sheet.toBlob(r, 'image/jpeg', 0.85));
    await post(`planche-${id}.jpg`, sb);
    await fetch('/done', { method: 'POST', body: 'frames' });
    return;
  }
  if (qs.get('record')) { await record(id); return; }
  // aperçu
  const st = performance.now();
  (function loop() { draw(((performance.now() - st) / 1000) % DUR); requestAnimationFrame(loop); })();
}

async function record(id) {
  draw(0);
  const stream = canvas.captureStream(30);
  let audio = null;
  try {
    audio = makeAudio();
    await audio.ac.resume();
    const c0 = audio.ac.currentTime;
    // l’horloge audio de Chrome headless peut tarder à démarrer : on attend jusqu’à 3 s
    for (let i = 0; i < 30 && !(audio.ac.currentTime > c0); i++) await new Promise(r => setTimeout(r, 100));
    if (audio.ac.state === 'running' && audio.ac.currentTime > c0) {
      audio.dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
    } else { log('audio inactif: ' + audio.ac.state); audio = null; }
  } catch (e) { log('audio indisponible: ' + e.message); audio = null; }
  const hasA = stream.getAudioTracks().length > 0;
  const cands = hasA
    ? ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1,opus', 'video/webm;codecs=vp9,opus']
    : ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1', 'video/webm;codecs=vp9'];
  const mime = cands.find(m => MediaRecorder.isTypeSupported(m));
  log('mime: ' + mime + ' audio: ' + hasA);
  const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
  // Préchauffage : un premier enregistreur jetable initialise l'encodeur H.264
  // (sinon les ~2 premières secondes de la vidéo restent figées).
  {
    const warm = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: (window.__BR||8000000) });
    const wstop = new Promise(r => warm.onstop = r);
    warm.start(250);
    const ws = performance.now();
    await new Promise(res => { (function wl() { drawBg((performance.now() - ws) / 1000); if (performance.now() - ws > 3000) return res(); requestAnimationFrame(wl); })(); });
    warm.stop(); await wstop;
    draw(0);
    await new Promise(r => setTimeout(r, 200));
  }
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: (window.__BR||8000000), audioBitsPerSecond: 160000 });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise(r => rec.onstop = r);
  // La nappe et la timeline démarrent ensemble, 0,15 s après le début de l'enregistrement.
  const LEAD = 0.15;
  rec.start(1000);
  if (audio) scheduleAudio(audio.ac, audio.dest, DUR, LEAD);
  const st = performance.now() + LEAD * 1000;
  const audioLead = LEAD;
  let frames = 0;
  await new Promise(resolve => {
    (function loop() {
      const t = (performance.now() - st) / 1000;
      draw(clamp(t, 0, DUR - 0.001)); frames++;
      if (t >= DUR + 0.25) return resolve();
      requestAnimationFrame(loop);
    })();
  });
  rec.stop(); await stopped;
  const blob = new Blob(chunks, { type: mime });
  log(`images dessinées: ${frames}, durée timeline: ${DUR}s, taille: ${blob.size}, audioLead: ${audioLead.toFixed(2)}`);
  await post(`2026-capsule-${id}.${ext}`, blob);
  await fetch('/done', { method: 'POST', body: 'record ' + ext });
}
