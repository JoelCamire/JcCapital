const fs = require('fs');

const posts = [
  { file: '2026-09-29-revision-assurances', photo: 'pexels-8572125.jpg', pos: '62% 40%', bright: 1.05, veilTop: .5,
    n: '02/18', eyebrow: "Révision d'automne", small: "Un immeuble. Un revenu qui grimpe. Une entreprise qui vaut le double.", strike: false,
    h1: "Vos assurances datent de <em>quand&nbsp;?</em>", sub: "Les 6 points que je vérifie chaque automne. Lien dans la publication." },
  { file: '2026-09-30-fin-annee-fiscale', photo: 'pexels-7224866.jpg', pos: '50% 50%', bright: 1.1, veilTop: .45,
    n: '04/18', eyebrow: "Avant le 31 décembre", small: "Sept décisions fiscales ont une date limite.", strike: false,
    h1: "En décembre, <em>les portes se ferment.</em>", sub: "Les 7 stratégies à évaluer dès maintenant. Article complet dans la publication." },
  { file: '2026-10-01-mythe-celi', photo: 'pexels-5277393.jpg', pos: '50% 60%', bright: 1.15, veilTop: .45,
    n: '05/18', eyebrow: "Mythe · Vérité", small: "« Le CELI, c'est pour les petits épargnants. »", strike: true,
    h1: "Jusqu'à 100&nbsp;000&nbsp;$ <em>de droits inutilisés.</em>", sub: "Plafond 2026 : 7 000 $. Les droits s'accumulent depuis 2009. La croissance est libre d'impôt." },
  { file: '2026-10-02-pire-decision', photo: 'pexels-1102908.jpg', pos: '50% 50%', bright: 1.0, veilTop: .5,
    n: '06/18', eyebrow: "La leçon de la semaine", small: "Septembre, ou le 28 décembre ?", strike: false,
    h1: "La pire décision, <em>c'est de ne pas en prendre.</em>", sub: "Les uns ont trois mois pour agir. Les autres, 72 heures." },
  { file: '2026-10-07-guide-reer-celi-celiapp', photo: 'pexels-14436272.jpg', pos: '50% 40%', bright: .8, veilTop: .65,
    n: '07/18', eyebrow: "Guide complet 2026", small: "Trois comptes, trois logiques.", strike: false,
    h1: "REER, CELI, CELIAPP&nbsp;: <em>dans quel ordre&nbsp;?</em>", sub: "Quand privilégier l'un, qui devrait ouvrir l'autre, comment ils se complètent. Lien dans la publication." },
  { file: '2026-10-08-mythe-testament', photo: 'pexels-15199053.jpg', pos: '50% 50%', bright: 1.1, veilTop: .4,
    n: '08/18', eyebrow: "Mythe · Vérité", small: "« Mon testament règle tout. »", strike: true,
    h1: "Un testament partage. <em>Il ne paie pas.</em>", sub: "L'assurance vie crée les liquidités le mois suivant. Vos dettes ne partent pas avec vous." },
  { file: '2026-10-13-mois-pme', photo: 'pexels-32357250.jpg', pos: '60% 45%', bright: .85, veilTop: .6,
    n: '09/18', eyebrow: "Octobre · Mois de la PME", small: "Trois vérifications avant la fin de l'année.", strike: false,
    h1: "Votre PME vaut plus <em>qu'à la signature.</em>", sub: "Convention d'actionnaires, assurance croisée entre associés, rémunération 2026." },
  { file: '2026-10-15-mythe-jeune-retraite', photo: 'pexels-28371013.jpg', pos: '50% 50%', bright: 1.0, veilTop: .5,
    n: '10/18', eyebrow: "Mythe · Vérité", small: "« Je suis jeune, la retraite attendra. »", strike: true,
    h1: "Le temps ne se <em>rattrape pas.</em>", sub: "200 $ par mois dès 25 ans peut valoir près du double du même montant investi à 35 ans, à rendement hypothétique égal." },
  { file: '2026-10-20-transmettre-la-ferme', photo: 'pexels-24703323.jpg', pos: '50% 50%', bright: .95, veilTop: .5,
    n: '11/18', eyebrow: "Patrimoine agricole", small: "Ça se planifie des années d'avance.", strike: false,
    h1: "Transmettre la ferme <em>sans diviser la famille.</em>", sub: "Qui reprend, à quelles conditions, et comment traiter équitablement les enfants qui ne reprennent pas." },
];

const tpl = (p) => `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;700;800&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1350px; overflow: hidden; }
  body { font-family: 'Outfit', sans-serif; color: #F4EEE4; background: #0C1417; position: relative; }
  .photo { position: absolute; inset: 0; background: url('${p.photo}') ${p.pos} / cover no-repeat; filter: saturate(1.05) contrast(1.05) brightness(${p.bright}); }
  .veil { position: absolute; inset: 0; background:
      linear-gradient(180deg, rgba(12,20,23,${p.veilTop}) 0%, rgba(12,20,23,.18) 35%, rgba(12,20,23,.40) 60%, rgba(12,20,23,.93) 100%),
      linear-gradient(90deg, rgba(34,51,59,.5) 0%, rgba(34,51,59,.12) 60%, rgba(34,51,59,0) 100%); }
  .wrap { position: absolute; inset: 0; padding: 92px 88px 128px; display: flex; flex-direction: column; }
  .eyebrow { font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 26px; letter-spacing: .28em; text-transform: uppercase; color: #C6AC8F; }
  .small { margin-top: 30px; font-size: 42px; font-weight: 500; color: rgba(244,238,228,.8); line-height: 1.2; max-width: 860px; text-shadow: 0 2px 18px rgba(0,0,0,.5); }
  .small.strike { text-decoration: line-through; text-decoration-color: #C6AC8F; text-decoration-thickness: 3px; color: rgba(244,238,228,.72); }
  .rule { width: 132px; height: 2px; background: #C6AC8F; margin: 40px 0 0; }
  h1 { margin-top: auto; font-weight: 800; font-size: 112px; line-height: .98; letter-spacing: -.03em; text-wrap: balance; text-shadow: 0 6px 40px rgba(0,0,0,.6); }
  h1 em { font-style: normal; color: #C6AC8F; }
  .sub { margin-top: 34px; font-size: 36px; font-weight: 500; line-height: 1.28; max-width: 860px; color: rgba(244,238,228,.92); text-shadow: 0 2px 18px rgba(0,0,0,.6); }
  .foot { position: absolute; left: 88px; right: 88px; bottom: 44px; display: flex; justify-content: space-between; align-items: baseline; font-family: 'IBM Plex Mono', monospace; font-size: 24px; color: rgba(244,238,228,.55); letter-spacing: .08em; }
  .foot .brand { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 30px; color: #F4EEE4; letter-spacing: .06em; }
  .foot .brand i { font-style: normal; color: #C6AC8F; }
</style></head>
<body>
  <div class="photo"></div><div class="veil"></div>
  <div class="wrap">
    <div class="eyebrow">${p.eyebrow}</div>
    <div class="small${p.strike ? ' strike' : ''}">${p.small}</div>
    <div class="rule"></div>
    <h1>${p.h1}</h1>
    <div class="sub">${p.sub}</div>
  </div>
  <div class="foot"><span>${p.n}</span><span class="brand">JC CAPITAL <i>•</i></span></div>
</body></html>`;

for (const p of posts) fs.writeFileSync(`${p.file}.html`, tpl(p));
fs.writeFileSync('posts.json', JSON.stringify(posts.map(p => p.file)));
console.log(posts.map(p => p.file).join('\n'));
