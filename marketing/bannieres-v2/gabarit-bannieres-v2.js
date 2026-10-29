// Bannières v2 (2026-10-29) : mélange des trois directions refusées (photo, typographie, barres du logo).
// Principes : vrai logo JC Capital recadré (monogramme seul, ou monogramme + « CAPITAL »), JAMAIS le slogan
// « Finance · Fiscalité · Assurance » (Joël n'offre pas de services fiscaux) ; images du site très assombries,
// traitées en texture (grain, dégradé, lumière douce) ; barres du logo en élément discret ; peu de texte.
//
// Variantes :
//   1-marbre   : marbre noir veiné d'or du site (img/quarts.jpg), composition centrée, filets or.
//   2-terroir  : champ du site (img/field-agricole.jpg) en duotone bleu nuit, lueur dorée à l'horizon.
//   3-lumiere  : voile lumineux du site (img/wall.webp) et les trois barres du logo en colonnes de lumière.
// Formats :
//   facebook   1640x624  : rond de profil (~340 px) au centre bas -> zone libre ; texte dans les 1200 px centraux.
//   linkedin   1128x191  : logo de la page au coin inférieur gauche -> zone libre.
//   linkedin-perso 1584x396 : photo de profil x 0-420, moitié inférieure -> zone libre.
// Usage : node gabarit-bannieres-v2.js [--guides]   (écrit les .html dans ce dossier)
// Rendu : voir rendu.sh (Chrome headless, --allow-file-access-from-files).
const fs = require('fs');
const path = require('path');
const guides = process.argv.includes('--guides');
const outDir = __dirname;
const IMG = '../../img/';
const LOGO = IMG + 'final_logo.png';

// ---------- Logo recadré (mesures en px sur final_logo.png 4607 x 2449) ----------
// Monogramme : x 0-1572, y 481-2054 (carré 1573). « CAPITAL » : x 1755-4596, y 1108-1533. Slogan : y >= 1630 (exclu).
const LW = 4607, M0Y = 481, MS = 1573;
const crop = (s, x, y, w, h) => `background:url('${LOGO}') no-repeat;background-size:${(LW * s).toFixed(2)}px auto;background-position:${(-x * s).toFixed(2)}px ${(-y * s).toFixed(2)}px;width:${(w * s).toFixed(2)}px;height:${(h * s).toFixed(2)}px`;
// Monogramme seul, sur un fond bleu nuit plein dans le carré, pour que la barre bleu nuit du logo reste lisible et que le logo soit net sur la texture.
const mono = (size) => {
  const s = size / MS;
  return `<div class="mono" style="position:relative;width:${size}px;height:${size}px;flex:none">
    <div style="position:absolute;inset:0;background:linear-gradient(160deg,#1C2C33 0%,#111C21 55%,#0B1215 100%)"></div>
    <div style="position:absolute;left:0;top:0;${crop(s, 0, M0Y, MS, MS)}"></div></div>`;
};
// Monogramme + « CAPITAL » (logo officiel sans le slogan).
const lockup = (size) => {
  const s = size / MS;
  const w = 4597 * s;
  return `<div class="lockup" style="position:relative;width:${w.toFixed(1)}px;height:${size}px;flex:none">
    <div style="position:absolute;left:0;top:0">${mono(size)}</div>
    <div style="position:absolute;left:${(1755 * s).toFixed(2)}px;top:${((1108 - M0Y) * s).toFixed(2)}px;${crop(s, 1755, 1108, 2842, 426)}"></div></div>`;
};
const lockupW = (size) => 4597 * size / MS;

// ---------- Matières ----------
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">`;
const base = (w, h) => `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${w}px; height: ${h}px; overflow: hidden; }
  body { font-family: 'Outfit', sans-serif; color: #EAE0D5; background: #0A0908; position: relative; -webkit-font-smoothing: antialiased; }
  .abs { position: absolute; }
  .grain { position: absolute; inset: 0; background-image: ${GRAIN}; mix-blend-mode: overlay; opacity: .22; pointer-events: none; }
  .vign { position: absolute; inset: 0; pointer-events: none; }
  .gold { background: linear-gradient(180deg, #DCC3A2 0%, #C6AC8F 45%, #AC9376 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .mm { font-family: 'IBM Plex Mono', monospace; font-weight: 400; text-transform: uppercase; color: #C6AC8F; }
  .hair { height: 1px; background: linear-gradient(90deg, rgba(198,172,143,0) 0%, #DCC3A2 50%, rgba(198,172,143,0) 100%); }
  .hairL { height: 1px; background: linear-gradient(90deg, rgba(172,147,118,0) 0%, #DCC3A2 100%); }
  .hairR { height: 1px; background: linear-gradient(90deg, #DCC3A2 0%, rgba(172,147,118,0) 100%); }
  .sl { font-weight: 200; letter-spacing: .02em; color: #EAE0D5; line-height: 1.25; }
  .sl b { font-weight: 400; }
`;
const G = {
  facebook: `<div class="abs" style="left:220px;top:0;width:1200px;height:624px;outline:2px dashed #f0f;z-index:99"></div><div class="abs" style="left:650px;top:284px;width:340px;height:340px;border-radius:50%;background:rgba(255,0,255,.35);z-index:99"></div>`,
  linkedin: `<div class="abs" style="left:24px;top:80px;width:150px;height:111px;background:rgba(255,0,255,.35);z-index:99"></div>`,
  perso: `<div class="abs" style="left:0;top:198px;width:420px;height:198px;background:rgba(255,0,255,.35);z-index:99"></div>`,
};
const page = (w, h, css, body, g) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>JC Capital - bannière</title>${FONTS}<style>${base(w, h)}${css}</style></head><body>${body}<div class="grain"></div>${guides ? g : ''}</body></html>`;

// Barres du logo (proportions du logo : 94 / 175 / 275), en colonnes de lumière fines.
const BAR_H = [94 / 275, 175 / 275, 1];
const lightBars = (x, bottom, w, gap, hMax, op = 1) => {
  const fills = [
    'linear-gradient(180deg, rgba(74,104,118,.95) 0%, rgba(34,51,59,.55) 55%, rgba(34,51,59,0) 100%)',
    'linear-gradient(180deg, #DCC3A2 0%, rgba(172,147,118,.55) 55%, rgba(172,147,118,0) 100%)',
    'linear-gradient(180deg, rgba(140,120,96,.95) 0%, rgba(94,80,63,.55) 55%, rgba(94,80,63,0) 100%)',
  ];
  return BAR_H.map((r, i) => `<div class="abs" style="left:${x + i * (w + gap)}px;bottom:${bottom}px;width:${w}px;height:${Math.round(hMax * r)}px;background:${fills[i]};opacity:${op};box-shadow:0 0 ${Math.round(w * 2.2)}px rgba(220,195,162,${i === 1 ? .22 : .08})"></div>`).join('');
};
// Petite signature de barres (trois traits pleins, couleurs du logo).
const sigBars = (w, gap, h) => `<div style="display:inline-flex;align-items:flex-end;gap:${gap}px;height:${h}px">${BAR_H.map((r, i) => `<span style="display:block;width:${w}px;height:${Math.round(h * r)}px;background:${['#4A6876', 'linear-gradient(180deg,#DCC3A2,#AC9376)', '#7A6852'][i]}"></span>`).join('')}</div>`;

const files = {};

// =====================================================================
// 1. MARBRE : marbre noir veiné d'or, composition centrée, très « maison »
// =====================================================================
const marbreBg = (pos, bright = .42) => `
  .marble { position: absolute; inset: -20px; background: url('${IMG}quarts.jpg') ${pos} / cover no-repeat; filter: brightness(${bright}) saturate(.75) contrast(1.08); }
  .tint { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(12,20,23,.35), rgba(10,9,8,.55)); mix-blend-mode: multiply; }
`;
files['facebook-1-marbre'] = page(1640, 624, marbreBg('50% 40%') + `
  .vign { background: radial-gradient(60% 75% at 50% 32%, rgba(10,9,8,0) 0%, rgba(10,9,8,.55) 70%, rgba(10,9,8,.9) 100%); }
  .glow { position: absolute; left: 470px; top: -60px; width: 700px; height: 420px; background: radial-gradient(closest-side, rgba(220,195,162,.16), rgba(220,195,162,0)); }
  .lk { position: absolute; left: ${(1640 - lockupW(178)) / 2}px; top: 62px; }
  .rowL { position: absolute; left: 220px; width: ${(1640 - lockupW(178)) / 2 - 220 - 34}px; top: 151px; }
  .rowR { position: absolute; right: 220px; width: ${(1640 - lockupW(178)) / 2 - 220 - 34}px; top: 151px; }
  .tag { position: absolute; left: 0; right: 0; top: 268px; text-align: center; font-size: 15px; letter-spacing: .5em; padding-left: .5em; }
  .bl { position: absolute; left: 250px; bottom: 66px; }
  .bl .sl { font-size: 33px; line-height: 1.22; }
  .br { position: absolute; right: 250px; bottom: 66px; text-align: right; }
  .br .mm { font-size: 15px; letter-spacing: .38em; line-height: 2.3; } .br .mm span { margin-right: -.38em; }
  .br .url { margin-top: 14px; font-family: 'IBM Plex Mono', monospace; font-size: 16px; letter-spacing: .1em; color: rgba(234,224,213,.66); text-transform: none; }
`, `<div class="marble"></div><div class="tint"></div><div class="glow"></div><div class="vign"></div>
  <div class="lk">${lockup(178)}</div>
  <div class="rowL hairL"></div><div class="rowR hairR"></div>
  <div class="bl"><div style="margin-bottom:24px">${sigBars(7, 6, 30)}</div><div class="sl">Protection et<br>stratégie financière<br><b class="gold">pour entrepreneurs</b></div></div>
  <div class="br"><div class="mm"><span>Protection</span><br><span>Épargne</span><br><span>Retraite</span></div><div class="url">jccapital.ca</div></div>`, G.facebook);

files['linkedin-1-marbre'] = page(1128, 191, marbreBg('50% 45%', .4) + `
  .vign { background: linear-gradient(90deg, rgba(10,9,8,.85) 0%, rgba(10,9,8,.35) 30%, rgba(10,9,8,.2) 60%, rgba(10,9,8,.7) 100%); }
  .lk { position: absolute; left: 262px; top: 42px; }
  .rule { position: absolute; left: ${262 + lockupW(106) + 40}px; top: 52px; width: 1px; height: 87px; background: linear-gradient(180deg, rgba(198,172,143,0), #DCC3A2, rgba(198,172,143,0)); }
  .txt { position: absolute; left: ${262 + lockupW(106) + 81}px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; }
  .txt .sl { font-size: 26px; }
  .txt .mm { margin-top: 12px; font-size: 12px; letter-spacing: .32em; }
`, `<div class="marble"></div><div class="tint"></div><div class="vign"></div>
  <div class="lk">${lockup(106)}</div><div class="rule"></div>
  <div class="txt"><div class="sl">Protection et stratégie financière<br><b class="gold">pour entrepreneurs</b></div><div class="mm">Protection · Épargne · Retraite</div></div>`, G.linkedin);

// =====================================================================
// 2. TERROIR : le champ du site en duotone bleu nuit, lueur d'or à l'horizon
// =====================================================================
const terroirBg = (pos, size = 'cover') => `
  .field { position: absolute; inset: 0; background: url('${IMG}field-agricole.jpg') ${pos} / ${size} no-repeat; filter: grayscale(1) contrast(1.3) brightness(1.05); }
  .duo { position: absolute; inset: 0; background: linear-gradient(180deg, #1A2A31 0%, #2E4550 30%, #C6AC8F 47%, #5E503F 58%, #22333B 76%, #0C1417 100%); mix-blend-mode: multiply; }
  .dark { position: absolute; inset: 0; background: rgba(10,9,8,.30); }
  .warm { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(198,172,143,0) 0%, rgba(198,172,143,0) 32%, rgba(220,195,162,.20) 50%, rgba(198,172,143,0) 66%); mix-blend-mode: soft-light; }
`;
files['facebook-2-terroir'] = page(1640, 624, terroirBg('62% 40%', '118% auto') + `
  .vign { background: linear-gradient(90deg, rgba(10,9,8,.92) 0%, rgba(10,9,8,.7) 25%, rgba(10,9,8,.15) 60%, rgba(10,9,8,.35) 100%),
                      linear-gradient(180deg, rgba(10,9,8,.55) 0%, rgba(10,9,8,0) 30%, rgba(10,9,8,0) 70%, rgba(10,9,8,.75) 100%); }
  .sun { position: absolute; left: 1080px; top: 170px; width: 640px; height: 300px; background: radial-gradient(closest-side, rgba(220,195,162,.30), rgba(220,195,162,0)); mix-blend-mode: screen; }
  .blk { position: absolute; left: 250px; top: 84px; display: flex; align-items: center; gap: 38px; }
  .blk .vr { width: 1px; height: 150px; background: linear-gradient(180deg, rgba(198,172,143,0), #DCC3A2, rgba(198,172,143,0)); }
  .blk .sl { font-size: 46px; line-height: 1.18; }
  .blk .mm { margin-top: 20px; font-size: 15px; letter-spacing: .42em; }
  .bl { position: absolute; left: 250px; bottom: 70px; }
  .br { position: absolute; right: 250px; bottom: 70px; text-align: right; font-family: 'IBM Plex Mono', monospace; font-size: 16px; letter-spacing: .28em; text-transform: uppercase; color: rgba(234,224,213,.72); line-height: 2; }
`, `<div class="field"></div><div class="duo"></div><div class="dark"></div><div class="warm"></div><div class="sun"></div><div class="vign"></div>
  <div class="blk">${mono(176)}<div class="vr"></div>
    <div><div class="sl">Protection et stratégie financière<br><b class="gold">pour entrepreneurs</b></div><div class="mm">Protection · Épargne · Retraite</div></div></div>
  <div class="bl">${sigBars(7, 6, 30)}</div>
  <div class="br">Entreprises · Fermes<br>Chaudière-Appalaches</div>`, G.facebook);

files['linkedin-2-terroir'] = page(1128, 191, terroirBg('80% 41%', '100% auto') + `
  .vign { background: linear-gradient(90deg, rgba(10,9,8,.9) 0%, rgba(10,9,8,.65) 45%, rgba(10,9,8,.1) 80%, rgba(10,9,8,.3) 100%); }
  .sun { position: absolute; left: 760px; top: 20px; width: 460px; height: 170px; background: radial-gradient(closest-side, rgba(220,195,162,.28), rgba(220,195,162,0)); mix-blend-mode: screen; }
  .blk { position: absolute; left: 262px; top: 0; bottom: 0; display: flex; align-items: center; gap: 30px; }
  .blk .vr { width: 1px; height: 96px; background: linear-gradient(180deg, rgba(198,172,143,0), #DCC3A2, rgba(198,172,143,0)); }
  .blk .sl { font-size: 28px; line-height: 1.18; }
  .blk .mm { margin-top: 10px; font-size: 12px; letter-spacing: .36em; }
`, `<div class="field"></div><div class="duo"></div><div class="dark"></div><div class="warm"></div><div class="sun"></div><div class="vign"></div>
  <div class="blk">${mono(112)}<div class="vr"></div>
    <div><div class="sl">Protection et stratégie financière<br><b class="gold">pour entrepreneurs</b></div><div class="mm">Protection · Épargne · Retraite</div></div></div>`, G.linkedin);

// =====================================================================
// 3. LUMIÈRE : voile lumineux du site + les trois barres du logo en colonnes de lumière
// =====================================================================
const lumiereBg = (pos) => `
  .silk { position: absolute; inset: -10px; background: url('${IMG}wall.webp') ${pos} / cover no-repeat; filter: brightness(1.05) saturate(1.05) contrast(1.1); }
  .deep { position: absolute; inset: 0; background: linear-gradient(105deg, rgba(10,9,8,.88) 0%, rgba(10,9,8,.66) 38%, rgba(12,20,23,.28) 75%, rgba(12,20,23,.4) 100%); }
  .floor { position: absolute; left: 0; right: 0; bottom: 0; height: 1px; background: linear-gradient(90deg, rgba(198,172,143,0), rgba(220,195,162,.6) 70%, rgba(198,172,143,0)); }
`;
files['facebook-3-lumiere'] = page(1640, 624, lumiereBg('50% 50%') + `
  .vign { background: radial-gradient(70% 90% at 78% 100%, rgba(10,9,8,0) 0%, rgba(10,9,8,.5) 100%); }
  .halo { position: absolute; left: 1060px; top: 120px; width: 520px; height: 520px; background: radial-gradient(closest-side, rgba(220,195,162,.18), rgba(220,195,162,0)); }
  .lk { position: absolute; left: 250px; top: 70px; }
  .sl { position: absolute; left: 250px; top: 284px; font-size: 36px; line-height: 1.22; }
  .mm.t { position: absolute; left: 250px; bottom: 64px; font-size: 14px; letter-spacing: .38em; }
  .hl { position: absolute; left: 250px; top: 254px; width: 96px; height: 1px; background: linear-gradient(90deg, #DCC3A2, rgba(172,147,118,0)); }
`, `<div class="silk"></div><div class="deep"></div><div class="halo"></div>
  ${lightBars(1196, 0, 44, 30, 470)}
  <div class="floor"></div><div class="vign"></div>
  <div class="lk">${lockup(150)}</div><div class="hl"></div>
  <div class="sl">Protection et<br>stratégie financière<br><b class="gold">pour entrepreneurs</b></div>
  <div class="mm t">Protection · Épargne · Retraite</div>`, G.facebook);

files['linkedin-3-lumiere'] = page(1128, 191, lumiereBg('50% 55%') + `
  .halo { position: absolute; left: 880px; top: -40px; width: 300px; height: 300px; background: radial-gradient(closest-side, rgba(220,195,162,.18), rgba(220,195,162,0)); }
  .lk { position: absolute; left: 262px; top: 46px; }
  .txt { position: absolute; left: ${262 + lockupW(98) + 44}px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; }
  .txt .sl { font-size: 25px; }
  .txt .mm { margin-top: 10px; font-size: 11.5px; letter-spacing: .34em; }
`, `<div class="silk"></div><div class="deep"></div><div class="halo"></div>
  ${lightBars(962, 0, 22, 16, 160)}
  <div class="floor"></div>
  <div class="lk">${lockup(98)}</div>
  <div class="txt"><div class="sl">Protection et stratégie financière<br><b class="gold">pour entrepreneurs</b></div><div class="mm">Protection · Épargne · Retraite</div></div>`, G.linkedin);

// =====================================================================
// LinkedIn perso 1584x396 : variante retenue (voir rapport) -> MARBRE
// =====================================================================
files['linkedin-perso-marbre'] = page(1584, 396, marbreBg('50% 42%', .42) + `
  .vign { background: radial-gradient(55% 95% at 62% 40%, rgba(10,9,8,0) 0%, rgba(10,9,8,.5) 70%, rgba(10,9,8,.88) 100%); }
  .glow { position: absolute; left: 640px; top: -80px; width: 760px; height: 420px; background: radial-gradient(closest-side, rgba(220,195,162,.15), rgba(220,195,162,0)); }
  .lk { position: absolute; left: 520px; top: 70px; }
  .hr { position: absolute; left: 520px; top: ${70 + 150 + 34}px; width: ${lockupW(150)}px; }
  .sl { position: absolute; left: 520px; top: ${70 + 150 + 58}px; font-size: 32px; }
  .side { position: absolute; right: 90px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; align-items: flex-end; text-align: right; }
  .side .mm { font-size: 15px; letter-spacing: .34em; line-height: 2.1; }
  .side .url { margin-top: 10px; font-family: 'IBM Plex Mono', monospace; font-size: 16px; letter-spacing: .12em; color: rgba(234,224,213,.7); }
`, `<div class="marble"></div><div class="tint"></div><div class="glow"></div><div class="vign"></div>
  <div class="lk">${lockup(150)}</div><div class="hr hairR"></div>
  <div class="sl">Protection et stratégie financière <b class="gold">pour entrepreneurs</b></div>
  <div class="side"><div style="margin-bottom:22px">${sigBars(7, 6, 30)}</div><div class="mm">Protection<br>Épargne<br>Retraite</div><div class="url">jccapital.ca</div></div>`, G.perso);

for (const [k, v] of Object.entries(files)) fs.writeFileSync(path.join(outDir, `${k}.html`), v);
console.log(Object.keys(files).join('\n'));
