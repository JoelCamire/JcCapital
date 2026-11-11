// Carrousel 6 diapositives, version 2 (11 nov. 2026, soir) : TOUTES les diapositives en photo plein cadre.
// Joël : « la première image est bien et attrape l'œil, mais pas les autres ».
// Usage : node 2026-11-11-mythe-employeur-v2.js <dossier-de-construction>   (pexels-<id>.jpg doivent s'y trouver)
// Rendu : chrome --headless=new --virtual-time-budget=8000 --window-size=1080,1350 --screenshot=<png> <html>
const fs = require('fs');
const path = require('path');
const out = process.argv[2] || '.';
fs.mkdirSync(out, { recursive: true });
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;800&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">`;
const fr = (t) => t.replace(/« /g, '«&nbsp;').replace(/ ([»?!:;%$])/g, '&nbsp;$1').replace(/(\d) (\d{3})/g, '$1&nbsp;$2');
const css = (p) => `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1350px; overflow: hidden; }
  body { font-family: 'Outfit', sans-serif; color: #F4EEE4; background: #0C1417; position: relative; }
  em { font-style: normal; color: #C6AC8F; }
  .photo { position: absolute; inset: 0; background: url('pexels-${p.photo}.jpg') ${p.pos} / cover no-repeat; filter: saturate(${p.sat ?? 1.05}) contrast(1.05) brightness(${p.bright}); }
  .veil { position: absolute; inset: 0; background:
      linear-gradient(180deg, rgba(12,20,23,${p.veilTop}) 0%, rgba(12,20,23,.2) 32%, rgba(12,20,23,.55) 55%, rgba(12,20,23,.97) 100%),
      linear-gradient(90deg, rgba(34,51,59,.5) 0%, rgba(34,51,59,.12) 60%, rgba(34,51,59,0) 100%); }
  .wrap { position: absolute; inset: 0; padding: 88px 88px 128px; display: flex; flex-direction: column; }
  .eyebrow { font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 34px; letter-spacing: .22em; text-transform: uppercase; color: #C6AC8F; text-shadow: 0 2px 14px rgba(0,0,0,.55); }
  .small { margin-top: 28px; font-size: 52px; font-weight: 500; color: rgba(244,238,228,.92); line-height: 1.18; max-width: 900px; text-shadow: 0 2px 18px rgba(0,0,0,.6); }
  .small.strike { text-decoration: line-through; text-decoration-color: #C6AC8F; text-decoration-thickness: 4px; color: rgba(244,238,228,.8); }
  .rule { width: 132px; height: 3px; background: #C6AC8F; margin-top: 40px; }
  h1 { margin-top: auto; font-weight: 800; font-size: ${p.h1Size || 104}px; line-height: .98; letter-spacing: -.03em; text-wrap: balance; text-shadow: 0 6px 40px rgba(0,0,0,.65); }
  .sub { margin-top: 34px; font-size: 38px; font-weight: 500; line-height: 1.26; max-width: 880px; color: rgba(244,238,228,.95); text-shadow: 0 2px 18px rgba(0,0,0,.6); }
  ul { list-style: none; margin-top: 36px; display: flex; flex-direction: column; gap: 18px; }
  li { display: grid; grid-template-columns: 64px 1fr; gap: 14px; align-items: baseline; font-size: 44px; line-height: 1.18; font-weight: 700; text-shadow: 0 2px 18px rgba(0,0,0,.6); }
  li b { font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 32px; color: #C6AC8F; }
  .cta { margin-top: 34px; font-size: 42px; line-height: 1.3; font-weight: 500; text-shadow: 0 2px 18px rgba(0,0,0,.6); }
  .cta strong { color: #C6AC8F; font-weight: 700; }
  .note { margin-top: 26px; font-size: 26px; line-height: 1.38; color: rgba(244,238,228,.62); }
  .foot { position: absolute; left: 88px; right: 88px; bottom: 44px; display: flex; justify-content: space-between; align-items: baseline; font-family: 'IBM Plex Mono', monospace; font-size: 26px; color: rgba(244,238,228,.6); letter-spacing: .06em; }
  .foot .brand { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 30px; color: #F4EEE4; letter-spacing: .06em; }
  .foot .brand i { font-style: normal; color: #C6AC8F; }
  .swipe { color: #C6AC8F; }
`;
const page = (p, i, n) => `<!doctype html><html lang="fr"><head><meta charset="utf-8">${FONTS}<style>${css(p)}</style></head><body>
<div class="photo"></div><div class="veil"></div><div class="wrap">
  <div class="eyebrow">${p.eyebrow}</div>
  ${p.small ? `<div class="small${p.strike ? ' strike' : ''}">${p.small}</div>` : ''}
  <div class="rule"></div>
  <h1>${p.h1}</h1>
  ${p.items ? `<ul>${p.items.map((it, k) => `<li><b>${String(k + 1).padStart(2, '0')}</b><span>${it}</span></li>`).join('')}</ul>` : ''}
  ${p.sub ? `<div class="sub">${p.sub}</div>` : ''}
  ${p.cta ? `<div class="cta">${p.cta}</div>` : ''}
  ${p.note ? `<div class="note">${p.note}</div>` : ''}
</div>
<div class="foot"><span>${i + 1} / ${n}${i + 1 < n ? ' <span class="swipe">→</span>' : ''}</span><span class="brand">JC CAPITAL <i>•</i></span></div>
</body></html>`;

const id = '2026-11-11-mythe-employeur-v2';
const slides = [
  { photo: 8487720, pos: '50% 40%', bright: .78, veilTop: .6, strike: true,
    eyebrow: 'Mythe · Vérité', small: '« L\'assurance de mon employeur me suffit. »',
    h1: 'Elle part <em>quand vous partez.</em>', h1Size: 112,
    sub: 'Changement d\'emploi, mise à pied, lancement d\'entreprise : la collective disparaît, souvent au pire moment.' },
  { photo: 5483147, pos: '50% 30%', bright: .9, veilTop: .45,
    eyebrow: 'Souvent vrai',
    h1: 'Assuré au travail. <em>Mais pas à vous.</em>',
    sub: 'L\'assurance vie et l\'assurance salaire du groupe appartiennent au contrat de votre employeur. Vous en profitez tant que vous y travaillez. Pas un jour de plus.' },
  { photo: 28666795, pos: '50% 85%', bright: .85, veilTop: .5, sat: .9,
    eyebrow: 'Le jour où vous partez',
    h1: 'Trois départs, <em>un même résultat.</em>',
    items: ['Vous changez d\'emploi', 'Vous êtes mis à pied', 'Vous partez à votre compte'],
    sub: 'Dans les trois cas, la couverture du groupe prend fin. Certains contrats permettent de convertir une partie de l\'assurance vie, dans un court délai.' },
  { photo: 6753424, pos: '50% 50%', bright: .6, veilTop: .55, sat: .8,
    eyebrow: 'Le vrai piège',
    h1: 'Au travail, assuré <em>sans questions.</em>',
    sub: 'Seul, votre santé du moment compte. Un diagnostic reçu entre-temps peut faire grimper la prime, ou fermer la porte.' },
  { photo: 33702577, pos: '50% 45%', bright: .95, veilTop: .45,
    eyebrow: 'Ce qui vous appartient',
    h1: 'Une assurance à vous <em>vous suit partout.</em>',
    items: ['Elle ne dépend pas de votre emploi', 'Elle se prend pendant que tout va bien', 'Elle complète la collective, tant que vous l\'avez'] },
  { photo: 814544, pos: '50% 50%', bright: .7, veilTop: .55, sat: 1,
    eyebrow: 'Et vous ?',
    h1: 'Que resterait‑il <em>si vous quittiez demain ?</em>',
    cta: 'Faites le diagnostic assurance :<br><strong>jccapital.ca</strong> › Assurance<br>ou écrivez <strong>PLAN</strong> en message.',
    note: 'Joël Camiré, conseiller en sécurité financière (JC Capital).' },
];
slides.forEach((s, k) => fs.writeFileSync(path.join(out, `${id}-0${k + 1}.html`), fr(page(s, k, slides.length))));
console.log(`${id} : ${slides.length} diapositives générées dans ${out}`);
