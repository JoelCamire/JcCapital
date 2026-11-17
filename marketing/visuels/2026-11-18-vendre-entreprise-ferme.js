// Visuel unique 18 nov. 2026 (refonte photo, 17 nov.) : remplace le bloc typographique « liste » refusé par le format du 11 nov.
// Usage : node 2026-11-18-vendre-entreprise-ferme.js <dossier-de-construction>   (pexels-36610244.jpg doit s'y trouver)
// Rendu : chrome --headless=new --virtual-time-budget=8000 --window-size=1080,1350 --screenshot=<png> <html>
const fs = require('fs');
const path = require('path');
const out = process.argv[2] || '.';
fs.mkdirSync(out, { recursive: true });
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;800&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">`;
const fr = (t) => t.replace(/« /g, '«&nbsp;').replace(/ ([»?!:;%$])/g, '&nbsp;$1').replace(/(\d) (\d{3})/g, '$1&nbsp;$2');
const p = {
  photo: 36610244, size: '118%', pos: '40% 100%', bright: 1.0, veilTop: .5,
  eyebrow: 'Entreprise ou ferme',
  h1: 'Vendre un jour ? <em>Trois questions à vous poser 2 ou 3 ans avant.</em>',
  items: ['Qui va acheter ?', 'Quand voulez-vous partir ?', 'Êtes-vous prêt du côté de l\'impôt ?'],
  cta: 'Un « je ne sais pas » à l\'une des trois ? <strong>C\'est le bon moment d\'en parler.</strong>',
};
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">${FONTS}<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1350px; overflow: hidden; }
  body { font-family: 'Outfit', sans-serif; color: #F4EEE4; background: #0C1417; position: relative; }
  em { font-style: normal; color: #C6AC8F; }
  .photo { position: absolute; inset: 0; background: url('pexels-${p.photo}.jpg') ${p.pos} / ${p.size} no-repeat; filter: saturate(1.05) contrast(1.05) brightness(${p.bright}); }
  .veil { position: absolute; inset: 0; background:
      linear-gradient(180deg, rgba(12,20,23,${p.veilTop}) 0%, rgba(12,20,23,.3) 30%, rgba(12,20,23,.12) 48%, rgba(12,20,23,.6) 66%, rgba(12,20,23,.97) 100%),
      linear-gradient(90deg, rgba(34,51,59,.5) 0%, rgba(34,51,59,.12) 60%, rgba(34,51,59,0) 100%); }
  .wrap { position: absolute; inset: 0; padding: 88px 88px 128px; display: flex; flex-direction: column; }
  .eyebrow { font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 34px; letter-spacing: .22em; text-transform: uppercase; color: #C6AC8F; text-shadow: 0 2px 14px rgba(0,0,0,.55); }
  h1 { margin-top: 30px; font-weight: 800; font-size: 92px; line-height: 1.0; letter-spacing: -.03em; text-wrap: balance; text-shadow: 0 6px 40px rgba(0,0,0,.65); }
  ul { list-style: none; margin-top: auto; display: flex; flex-direction: column; gap: 22px; }
  li { display: grid; grid-template-columns: 64px 1fr; gap: 14px; align-items: baseline; font-size: 52px; line-height: 1.14; font-weight: 700; text-shadow: 0 2px 18px rgba(0,0,0,.7); }
  li b { font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 34px; color: #C6AC8F; }
  .cta { margin-top: 40px; font-size: 40px; line-height: 1.3; font-weight: 500; text-shadow: 0 2px 18px rgba(0,0,0,.6); max-width: 900px; }
  .cta strong { color: #C6AC8F; font-weight: 700; }
  .foot { position: absolute; left: 88px; right: 88px; bottom: 44px; display: flex; justify-content: space-between; align-items: baseline; font-family: 'IBM Plex Mono', monospace; font-size: 26px; color: rgba(244,238,228,.6); letter-spacing: .06em; }
  .foot .brand { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 30px; color: #F4EEE4; letter-spacing: .06em; }
  .foot .brand i { font-style: normal; color: #C6AC8F; }
</style></head><body>
<div class="photo"></div><div class="veil"></div><div class="wrap">
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
