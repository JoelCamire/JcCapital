// Visuel unique 18 nov. 2026, v2 (17 nov.) : Joël veut « moitié de la photo entreprise, l'autre ferme ».
// v3 (17 nov.) : « 2 ou 3 ans » jugé trop serré par Joël → « cinq ans avant ».
// v4 (17 nov.) : questions plus personnelles demandées par Joël (plus d'« impôt » dans la question, « reprendre les rênes »).
// v5 (18 nov.) : Q3 « Combien il vous en restera, après ? » jugée floue → « Et vous, vous allez vivre de quoi ? ».
// Gauche = atelier (silhouette d'un artisan, Pexels 37681628), droite = tracteur au coucher du soleil (Pexels 36610244), filet doré au centre.
// Usage : node 2026-11-18-vendre-entreprise-ferme.js <dossier-de-construction>   (pexels-37681628.jpg et pexels-36610244.jpg doivent s'y trouver)
// Rendu : chrome --headless=new --virtual-time-budget=8000 --window-size=1080,1350 --screenshot=<png> <html>
const fs = require('fs');
const path = require('path');
const out = process.argv[2] || '.';
fs.mkdirSync(out, { recursive: true });
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;800&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">`;
const fr = (t) => t.replace(/« /g, '«&nbsp;').replace(/ ([»?!:;%$])/g, '&nbsp;$1').replace(/(\d) (\d{3})/g, '$1&nbsp;$2');
const p = {
  left:  { photo: 37681628, size: 'auto 130%', pos: '37% 0%', bright: 1.05, sat: 1.0 },
  right: { photo: 36610244, size: 'auto 118%', pos: '17% 100%', bright: 1.0, sat: 1.05 },
  eyebrow: 'Entreprise ou ferme',
  h1: 'Vendre un jour ? <em>Trois questions à vous poser cinq ans avant.</em>',
  items: ['Qui va reprendre les rênes ?', 'Vous vous voyez partir quand ?', 'Et vous, vous allez vivre de quoi ?'],
  cta: 'Un « je ne sais pas » à l\'une des trois ? <strong>C\'est le bon moment d\'en parler.</strong>',
};
const half = (h, side) => `.photo.${side} { ${side}: 0; background: url('pexels-${h.photo}.jpg') ${h.pos} / ${h.size} no-repeat; filter: saturate(${h.sat}) contrast(1.05) brightness(${h.bright}); }`;
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">${FONTS}<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1350px; overflow: hidden; }
  body { font-family: 'Outfit', sans-serif; color: #F4EEE4; background: #0C1417; position: relative; }
  em { font-style: normal; color: #C6AC8F; }
  .photo { position: absolute; top: 0; bottom: 0; width: 540px; }
  ${half(p.left, 'left')}
  ${half(p.right, 'right')}
  .seam { position: absolute; top: 0; bottom: 0; left: 538px; width: 4px; background: #C6AC8F; opacity: .85; }
  .veil { position: absolute; inset: 0; background:
      linear-gradient(180deg, rgba(12,20,23,.55) 0%, rgba(12,20,23,.3) 30%, rgba(12,20,23,.12) 48%, rgba(12,20,23,.6) 66%, rgba(12,20,23,.97) 100%),
      linear-gradient(90deg, rgba(34,51,59,.35) 0%, rgba(34,51,59,.1) 50%, rgba(34,51,59,.25) 100%); }
  .wrap { position: absolute; inset: 0; padding: 88px 88px 128px; display: flex; flex-direction: column; }
  .eyebrow { font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 34px; letter-spacing: .22em; text-transform: uppercase; color: #C6AC8F; text-shadow: 0 2px 14px rgba(0,0,0,.55); }
  h1 { margin-top: 30px; font-weight: 800; font-size: 92px; line-height: 1.0; letter-spacing: -.03em; text-wrap: balance; text-shadow: 0 6px 40px rgba(0,0,0,.75); }
  ul { list-style: none; margin-top: auto; display: flex; flex-direction: column; gap: 22px; }
  li { display: grid; grid-template-columns: 64px 1fr; gap: 14px; align-items: baseline; font-size: 52px; line-height: 1.14; font-weight: 700; text-shadow: 0 2px 18px rgba(0,0,0,.75); }
  li b { font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 34px; color: #C6AC8F; }
  .cta { margin-top: 40px; font-size: 40px; line-height: 1.3; font-weight: 500; text-shadow: 0 2px 18px rgba(0,0,0,.6); max-width: 900px; }
  .cta strong { color: #C6AC8F; font-weight: 700; }
  .foot { position: absolute; left: 88px; right: 88px; bottom: 44px; display: flex; justify-content: space-between; align-items: baseline; font-family: 'IBM Plex Mono', monospace; font-size: 26px; color: rgba(244,238,228,.6); letter-spacing: .06em; }
  .foot .brand { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 30px; color: #F4EEE4; letter-spacing: .06em; }
  .foot .brand i { font-style: normal; color: #C6AC8F; }
</style></head><body>
<div class="photo left"></div><div class="photo right"></div><div class="seam"></div><div class="veil"></div><div class="wrap">
  <div class="eyebrow">${p.eyebrow}</div>
  <h1>${p.h1}</h1>
  <ul>${p.items.map((it, k) => `<li><b>0${k + 1}</b><span>${it}</span></li>`).join('')}</ul>
  <div class="cta">${p.cta}</div>
</div>
<div class="foot"><span>jccapital.ca</span><span class="brand">JC CAPITAL <i>•</i></span></div>
</body></html>`;
const id = '2026-11-18-vendre-entreprise-ferme-photo';
fs.writeFileSync(path.join(out, `${id}.html`), fr(html));
console.log(`${id}.html généré dans ${out}`);
