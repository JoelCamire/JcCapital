// Carrousel 6 diapositives (refonte du 11 nov. 2026) : couverture photo plein cadre (gabarit v2) + 5 diapositives typographiques.
// Usage : node 2026-11-11-mythe-employeur.js <dossier-de-construction>   (pexels-8487720.jpg doit s'y trouver)
// Rendu : chrome --headless=new --virtual-time-budget=8000 --window-size=1080,1350 --screenshot=<png> <html>
const fs = require('fs');
const path = require('path');
const out = process.argv[2] || '.';
fs.mkdirSync(out, { recursive: true });
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700;800&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">`;
const base = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1350px; overflow: hidden; }
  body { font-family: 'Outfit', sans-serif; color: #F4EEE4; background: #0C1417; position: relative; }
  em { font-style: normal; color: #C6AC8F; }
  .eyebrow { font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 32px; letter-spacing: .2em; text-transform: uppercase; color: #C6AC8F; }
  .rule { width: 120px; height: 3px; background: #C6AC8F; }
  .foot { position: absolute; left: 88px; right: 88px; bottom: 52px; display: flex; justify-content: space-between; align-items: baseline; font-family: 'IBM Plex Mono', monospace; font-size: 26px; color: rgba(244,238,228,.6); letter-spacing: .06em; }
  .foot .brand { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 30px; color: #F4EEE4; letter-spacing: .06em; }
  .foot .brand i { font-style: normal; color: #C6AC8F; }
  .swipe { color: #C6AC8F; }
  .strike { text-decoration: line-through; text-decoration-color: #C6AC8F; text-decoration-thickness: 4px; }
`;
const foot = (left) => `<div class="foot"><span>${left}</span><span class="brand">JC CAPITAL <i>•</i></span></div>`;
const fr = (t) => t.replace(/« /g, '«&nbsp;').replace(/ ([»?!:;%$])/g, '&nbsp;$1').replace(/(\d) (\d{3})/g, '$1&nbsp;$2');
const doc = (css, body) => `<!doctype html><html lang="fr"><head><meta charset="utf-8">${FONTS}<style>${base}${css}</style></head><body>${fr(body)}</body></html>`;

const photo = (p) => doc(`
  .photo { position: absolute; inset: 0; background: url('pexels-${p.photo}.jpg') ${p.pos} / cover no-repeat; filter: saturate(1.05) contrast(1.05) brightness(${p.bright}); }
  .veil { position: absolute; inset: 0; background:
      linear-gradient(180deg, rgba(12,20,23,${p.veilTop}) 0%, rgba(12,20,23,.2) 35%, rgba(12,20,23,.45) 60%, rgba(12,20,23,.95) 100%),
      linear-gradient(90deg, rgba(34,51,59,.5) 0%, rgba(34,51,59,.12) 60%, rgba(34,51,59,0) 100%); }
  .wrap { position: absolute; inset: 0; padding: 88px 88px 128px; display: flex; flex-direction: column; }
  .eyebrow { font-size: 34px; letter-spacing: .22em; text-shadow: 0 2px 14px rgba(0,0,0,.55); }
  .small { margin-top: 28px; font-size: 52px; font-weight: 500; color: rgba(244,238,228,.92); line-height: 1.18; max-width: 900px; text-shadow: 0 2px 18px rgba(0,0,0,.6); }
  .rule { margin-top: 40px; width: 132px; }
  h1 { margin-top: auto; font-weight: 800; font-size: 112px; line-height: .98; letter-spacing: -.03em; text-wrap: balance; text-shadow: 0 6px 40px rgba(0,0,0,.6); }
  .sub { margin-top: 34px; font-size: 38px; font-weight: 500; line-height: 1.26; max-width: 880px; color: rgba(244,238,228,.95); text-shadow: 0 2px 18px rgba(0,0,0,.6); }
`, `<div class="photo"></div><div class="veil"></div><div class="wrap">
  <div class="eyebrow">${p.eyebrow}</div>
  <div class="small${p.strike ? ' strike' : ''}">${p.small}</div>
  <div class="rule"></div>
  <h1>${p.h1}</h1>
  <div class="sub">${p.sub}</div>
</div>${foot(p.footLeft || 'jccapital.ca')}`);

const slideCss = `
  .bg { position: absolute; inset: 0; background:
      radial-gradient(120% 70% at 100% 0%, rgba(198,172,143,.16) 0%, rgba(198,172,143,0) 55%),
      linear-gradient(180deg, #13212A 0%, #0C1417 100%); }
  .wrap { position: absolute; inset: 0; padding: 96px 88px 150px; display: flex; flex-direction: column; }
  .rule { margin: 36px 0 52px; }
  h2 { font-weight: 800; font-size: 96px; line-height: 1; letter-spacing: -.03em; text-wrap: balance; }
  p.lead { margin-top: 40px; font-size: 44px; line-height: 1.28; font-weight: 500; color: rgba(244,238,228,.92); max-width: 900px; }
  p.lead + p.lead { margin-top: 28px; }
  ul { list-style: none; margin-top: 56px; display: flex; flex-direction: column; gap: 34px; }
  li { display: grid; grid-template-columns: 70px 1fr; gap: 18px; align-items: baseline; font-size: 46px; line-height: 1.22; font-weight: 500; }
  li b { font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 34px; color: #C6AC8F; }
  li small { display: block; margin-top: 8px; font-size: 34px; color: rgba(244,238,228,.7); font-weight: 400; }
  .ex { margin-top: 48px; padding: 34px 40px; border-left: 4px solid #C6AC8F; background: rgba(198,172,143,.08); font-size: 40px; line-height: 1.3; font-weight: 500; }
  .ex b { color: #C6AC8F; font-weight: 700; }
  .cta { margin-top: auto; border-top: 2px solid rgba(198,172,143,.45); padding-top: 40px; font-size: 46px; line-height: 1.3; font-weight: 500; }
  .cta strong { color: #C6AC8F; font-weight: 700; }
  .note { margin-top: auto; font-size: 27px; line-height: 1.38; color: rgba(244,238,228,.58); }
  .cta + .note { margin-top: 28px; }
`;
const slide = (s, i, n) => doc(slideCss, `<div class="bg"></div><div class="wrap">
${s.eyebrow ? `<div class="eyebrow">${s.eyebrow}</div><div class="rule"></div>` : ''}
${s.h2 ? `<h2>${s.h2}</h2>` : ''}
${(s.lead ? [].concat(s.lead) : []).map(l => `<p class="lead">${l}</p>`).join('')}
${s.items ? `<ul>${s.items.map((it, k) => `<li><b>${String(k + 1).padStart(2, '0')}</b><span>${it}</span></li>`).join('')}</ul>` : ''}
${s.ex ? `<div class="ex">${s.ex}</div>` : ''}
${s.cta ? `<div class="cta">${s.cta}</div>` : ''}
${s.note ? `<div class="note">${s.note}</div>` : ''}
</div>${foot(`${i + 1} / ${n}${i + 1 < n ? ' <span class="swipe">→</span>' : ''}`)}`);

const id = '2026-11-11-mythe-employeur';
const slides = [
  { eyebrow: 'Souvent vrai', h2: 'Vous êtes assuré au travail. <em>Mais ce n\'est pas à vous.</em>',
    lead: ['L\'assurance vie et l\'assurance salaire du groupe appartiennent au contrat de votre employeur.', 'Vous en profitez tant que vous y travaillez. Pas un jour de plus.'] },
  { eyebrow: 'Le jour où vous partez', h2: 'Trois situations, <em>un même résultat.</em>',
    items: ['Vous changez d\'emploi', 'Vous êtes mis à pied', 'Vous vous lancez à votre compte'],
    ex: 'Dans les trois cas, la couverture du groupe <b>prend fin</b>. Certains contrats permettent de convertir une partie de l\'assurance vie, dans un court délai et à certaines conditions.' },
  { eyebrow: 'Le vrai piège', h2: 'Au travail, on vous a assuré <em>sans questions.</em>',
    lead: ['Pour vous assurer seul, votre santé du moment compte.', 'Un diagnostic reçu entre-temps peut tout compliquer, ou fermer la porte.'],
    ex: '<b>Exemple :</b> un diagnostic reçu à 42 ans. Au travail, vous étiez assuré sans question. Seul, la prime peut grimper, ou la demande être refusée.' },
  { eyebrow: 'Ce qui vous appartient', h2: 'Une assurance à vous <em>vous suit partout.</em>',
    items: ['Elle ne dépend pas de votre emploi<small>Vous la gardez en changeant de poste ou en partant à votre compte</small>', 'Elle se prend pendant que tout va bien<small>Votre santé d\'aujourd\'hui fixe vos conditions pour longtemps</small>', 'Elle complète la collective<small>Tant que vous l\'avez, les deux travaillent ensemble</small>'] },
  { eyebrow: 'Et vous ?', h2: 'Que resterait‑il de votre assurance <em>si vous quittiez demain ?</em>',
    lead: 'Un questionnaire simple pour voir ce qui vous appartient vraiment, et ce qui part avec l\'emploi.',
    cta: 'Faites le diagnostic assurance :<br><strong>jccapital.ca</strong> › Assurance<br>ou écrivez <strong>PLAN</strong> en message.',
    note: 'Joël Camiré, conseiller en sécurité financière (JC Capital).' },
];
const n = slides.length + 1;
const write = (name, html) => fs.writeFileSync(path.join(out, `${name}.html`), html);
write(`${id}-01`, photo({ photo: 8487720, pos: '50% 40%', bright: .78, veilTop: .6, strike: true,
  eyebrow: 'Mythe · Vérité', small: '« L\'assurance de mon employeur me suffit. »',
  h1: 'Elle part <em>quand vous partez.</em>',
  sub: 'Changement d\'emploi, mise à pied, lancement d\'entreprise : la collective disparaît, souvent au pire moment.',
  footLeft: `1 / ${n} <span class="swipe">→</span>` }));
slides.forEach((s, k) => write(`${id}-0${k + 2}`, slide(s, k + 1, n)));
console.log(`${id} : ${n} diapositives générées dans ${out}`);
