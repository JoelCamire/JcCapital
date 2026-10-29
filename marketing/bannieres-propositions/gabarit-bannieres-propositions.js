// Propositions de bannières (2026-10-29) : 3 directions x 2 formats.
//   Facebook (page JC Capital) 1640x624 : zone centrale du bas libre (photo de profil ronde ~340 px),
//   texte important dans les ~1200 px centraux (zone sûre mobile).
//   LinkedIn (page) 1128x191 : coin inférieur gauche libre (logo de la page).
// Le slogan n'utilise jamais « Fiscalité ». Le logo complet (qui contient « Fiscalité ») n'est pas utilisé :
// seul le monogramme JC est recadré à partir de img/final_logo.png.
// Usage : node gabarit-bannieres-propositions.js [--guides]   (écrit les .html dans ce dossier)
// Rendu : chrome --headless=new --virtual-time-budget=8000 --window-size=1640,624 --screenshot=... fichier.html
const fs = require('fs');
const path = require('path');
const guides = process.argv.includes('--guides');
const outDir = process.argv.find(a => a.startsWith('--out='))?.slice(6) || __dirname;
const LOGO = process.argv.find(a => a.startsWith('--logo='))?.slice(7) || '../../img/final_logo.png';
const PHOTO = 'https://images.pexels.com/photos/32332105/pexels-photo-32332105.jpeg?w=2400';

// Monogramme JC : carré du logo, x 0-1573 / y 481-2052 sur une image de 4607 x 2449.
const mono = (s) => `<div class="mono" style="width:${s}px;height:${s}px;background:url('${LOGO}') no-repeat;background-size:${(4607 / 1573 * s).toFixed(1)}px auto;background-position:0 ${(-481 / 1573 * s).toFixed(1)}px"></div>`;

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;500;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">`;
const base = (w, h) => `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${w}px; height: ${h}px; overflow: hidden; }
  body { font-family: 'Outfit', sans-serif; color: #F4EEE4; background: #0C1417; position: relative; }
  em { font-style: normal; color: #C6AC8F; }
  .mono { flex: none; }
  .mm { font-family: 'IBM Plex Mono', monospace; font-weight: 500; letter-spacing: .2em; text-transform: uppercase; color: #C6AC8F; }
  .abs { position: absolute; }
`;
const guideFB = guides ? `<div class="abs" style="left:220px;top:0;width:1200px;height:624px;outline:3px dashed #f0f;"></div><div class="abs" style="left:650px;top:284px;width:340px;height:340px;border-radius:50%;background:rgba(255,0,255,.35);"></div>` : '';
const guideLI = guides ? `<div class="abs" style="left:24px;top:95px;width:150px;height:150px;background:rgba(255,0,255,.35);"></div>` : '';
const page = (w, h, css, body, g) => `<!doctype html><html lang="fr"><head><meta charset="utf-8">${FONTS}<style>${base(w, h)}${css}</style></head><body>${body}${g}</body></html>`;

// Bloc de marque (monogramme + nom), réutilisé
const brand = (s, fs, color = '#F4EEE4') => `<div style="display:flex;align-items:center;gap:${Math.round(s * .28)}px">${mono(s)}<div style="font-weight:700;font-size:${fs}px;letter-spacing:.14em;color:${color};line-height:1">JC CAPITAL</div></div>`;

const files = {};

// ============ 1. PHOTO : champ agricole au lever du soleil ============
files['facebook-1-photo-champ'] = page(1640, 624, `
  .photo { position: absolute; inset: 0; background: url('${PHOTO}') 50% 62% / cover no-repeat; filter: saturate(1.05) brightness(.9); }
  .veil { position: absolute; inset: 0; background:
     linear-gradient(180deg, rgba(12,20,23,.88) 0%, rgba(12,20,23,.55) 40%, rgba(12,20,23,.25) 62%, rgba(12,20,23,.8) 100%); }
  .top { position: absolute; left: 220px; right: 220px; top: 62px; text-align: center; }
  .top .mm { font-size: 22px; }
  h1 { margin-top: 20px; font-weight: 800; font-size: 68px; line-height: 1.02; letter-spacing: -.025em; text-shadow: 0 4px 30px rgba(0,0,0,.5); }
  .bl { position: absolute; left: 250px; bottom: 58px; }
  .br { position: absolute; right: 250px; bottom: 58px; text-align: right; }
  .br .a { font-size: 28px; font-weight: 500; letter-spacing: .02em; text-shadow: 0 2px 14px rgba(0,0,0,.6); }
  .br .b { margin-top: 8px; font-family: 'IBM Plex Mono', monospace; font-size: 22px; color: rgba(244,238,228,.8); letter-spacing: .06em; }
`, `<div class="photo"></div><div class="veil"></div>
  <div class="top"><div class="mm">Protection · Épargne · Retraite</div>
  <h1>Protection et stratégie financière<br><em>pour entrepreneurs.</em></h1></div>
  <div class="bl">${brand(84, 30)}</div>
  <div class="br"><div class="a">Chaudière-Appalaches<br>et Québec</div><div class="b">jccapital.ca</div></div>`, guideFB);

files['linkedin-1-photo-champ'] = page(1128, 191, `
  .photo { position: absolute; inset: 0; background: url('${PHOTO}') 50% 58% / cover no-repeat; filter: brightness(.9); }
  .veil { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(12,20,23,.35) 0%, rgba(12,20,23,.55) 30%, rgba(12,20,23,.9) 100%); }
  .txt { position: absolute; right: 64px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; align-items: flex-end; text-align: right; }
  .txt .mm { font-size: 15px; }
  h1 { margin-top: 10px; font-weight: 800; font-size: 38px; line-height: 1.05; letter-spacing: -.02em; }
`, `<div class="photo"></div><div class="veil"></div>
  <div class="txt"><div class="mm">Protection · Épargne · Retraite</div><h1>Protection et stratégie financière<br><em>pour entrepreneurs.</em></h1></div>`, guideLI);

// ============ 2. TYPOGRAPHIQUE : noir, filets or, très épuré ============
files['facebook-2-typographique'] = page(1640, 624, `
  body { background: radial-gradient(70% 90% at 50% 0%, #1A1714 0%, #0A0908 70%); }
  .frame { position: absolute; inset: 28px; border: 1px solid rgba(198,172,143,.35); }
  .top { position: absolute; left: 220px; right: 220px; top: 70px; text-align: center; }
  .word { font-weight: 200; font-size: 104px; letter-spacing: .32em; line-height: 1; padding-left: .32em; color: #F4EEE4; }
  .rule { width: 90px; height: 2px; background: #C6AC8F; margin: 30px auto 26px; }
  .sl { font-weight: 300; font-size: 36px; letter-spacing: .04em; color: rgba(244,238,228,.92); }
  .sl em { font-weight: 500; }
  .bl, .br { position: absolute; bottom: 70px; font-family: 'IBM Plex Mono', monospace; font-size: 21px; letter-spacing: .16em; text-transform: uppercase; color: #C6AC8F; line-height: 1.7; }
  .bl { left: 250px; } .br { right: 250px; text-align: right; }
`, `<div class="frame"></div>
  <div class="top"><div class="word">JC CAPITAL</div><div class="rule"></div>
  <div class="sl">Protection et stratégie financière <em>pour entrepreneurs</em></div></div>
  <div class="bl">Protection<br>Épargne<br>Retraite</div>
  <div class="br">Lévis · Québec<br>Chaudière-Appalaches<br><span style="text-transform:none;letter-spacing:.08em;color:rgba(244,238,228,.75)">jccapital.ca</span></div>`, guideFB);

files['linkedin-2-typographique'] = page(1128, 191, `
  body { background: radial-gradient(60% 140% at 60% 0%, #1A1714 0%, #0A0908 75%); }
  .frame { position: absolute; inset: 14px; border: 1px solid rgba(198,172,143,.3); }
  .txt { position: absolute; left: 230px; right: 14px; top: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .word { font-weight: 200; font-size: 46px; letter-spacing: .3em; padding-left: .3em; line-height: 1; }
  .rule { width: 56px; height: 2px; background: #C6AC8F; margin: 16px auto 14px; }
  .sl { font-weight: 300; font-size: 21px; letter-spacing: .04em; color: rgba(244,238,228,.9); }
  .sl em { font-weight: 500; }
`, `<div class="frame"></div>
  <div class="txt"><div class="word">JC CAPITAL</div><div class="rule"></div>
  <div class="sl">Protection et stratégie financière <em>pour entrepreneurs</em></div></div>`, guideLI);

// ============ 3. MOTIF DE MARQUE : barres du logo en courbe de croissance ============
const bars = (W, H, n, x0, x1, hMin, hMax, gap, op) => {
  const cols = ['#22333B', '#C6AC8F', '#5E503F'];
  const bw = (x1 - x0 - gap * (n - 1)) / n;
  let out = '';
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const h = hMin + (hMax - hMin) * Math.pow(t, 2.1);   // courbe de croissance
    const c = cols[i % 3];
    const o = (op[0] + (op[1] - op[0]) * t).toFixed(2);
    out += `<div class="abs" style="left:${(x0 + i * (bw + gap)).toFixed(1)}px;bottom:0;width:${bw.toFixed(1)}px;height:${h.toFixed(1)}px;background:${c};opacity:${o}"></div>`;
  }
  return out;
};
files['facebook-3-motif-barres'] = page(1640, 624, `
  body { background: linear-gradient(160deg, #22333B 0%, #13212A 55%, #0C1417 100%); }
  .curve { position: absolute; inset: 0; }
  .shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(12,20,23,.0) 0%, rgba(12,20,23,.0) 55%, rgba(12,20,23,.55) 100%); }
  .top { position: absolute; left: 250px; top: 70px; width: 1140px; }
  .top .mm { font-size: 22px; }
  h1 { margin-top: 18px; font-weight: 800; font-size: 66px; line-height: 1.03; letter-spacing: -.025em; }
  .bl { position: absolute; left: 250px; bottom: 60px; }
`, `${bars(1640, 624, 21, 0, 1640, 26, 560, 14, [.55, 1])}<div class="shade"></div>
  <div class="top"><div class="mm">Protection · Épargne · Retraite</div>
  <h1>Protection et stratégie financière<br><em>pour entrepreneurs.</em></h1></div>
  <div class="bl">${brand(78, 28)}</div>`, guideFB);

files['linkedin-3-motif-barres'] = page(1128, 191, `
  body { background: linear-gradient(160deg, #22333B 0%, #13212A 60%, #0C1417 100%); }
  .txt { position: absolute; left: 250px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; }
  .txt .mm { font-size: 15px; }
  h1 { margin-top: 10px; font-weight: 800; font-size: 36px; line-height: 1.05; letter-spacing: -.02em; }
`, `${bars(1128, 191, 14, 760, 1128, 14, 191, 8, [.5, 1])}
  <div class="txt"><div class="mm">Protection · Épargne · Retraite</div><h1>Protection et stratégie financière<br><em>pour entrepreneurs.</em></h1></div>`, guideLI);

fs.mkdirSync(outDir, { recursive: true });
for (const [k, v] of Object.entries(files)) fs.writeFileSync(path.join(outDir, `${k}.html`), v);
console.log(Object.keys(files).join('\n'));
