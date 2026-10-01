// Gabarit photo plein cadre v2 (2026-10-01) : eyebrow 34 px et petite ligne 52 px, à la demande de Joël
const fs = require('fs');
const posts = [
  { file: '2026-10-05-fin-annee-fiscale', photo: 7224866, pos: '50% 50%', bright: 1.1, veilTop: .5,
    eyebrow: "Avant le 31 décembre", small: "Sept décisions fiscales ont une date limite.",
    h1: "En décembre, <em>les portes se ferment.</em>", sub: "Les 7 stratégies à évaluer dès maintenant. Article complet dans la publication." },
  { file: '2026-10-07-mythe-celi', photo: 5277393, pos: '50% 60%', bright: 1.15, veilTop: .5, strike: true,
    eyebrow: "Mythe · Vérité", small: "« Le CELI, c'est pour les petits épargnants. »",
    h1: "Jusqu'à 100&nbsp;000&nbsp;$ <em>de droits inutilisés.</em>", sub: "Plafond 2026 : 7 000 $. Les droits s'accumulent depuis 2009. La croissance est libre d'impôt." },
  { file: '2026-10-13-pire-decision', photo: 1102908, pos: '50% 50%', bright: 1.0, veilTop: .55,
    eyebrow: "La leçon de la semaine", small: "Octobre, ou le 28 décembre ?",
    h1: "La pire décision, <em>c'est de ne pas en prendre.</em>", sub: "Les uns ont des mois pour agir. Les autres, 72 heures." },
  { file: '2026-10-14-mythe-rrq', photo: 7788241, pos: '50% 30%', bright: .85, veilTop: .55, strike: true,
    eyebrow: "Mythe · Vérité", small: "« Le RRQ va suffire pour ma retraite. »",
    h1: "25 à 33&nbsp;% <em>de votre revenu. Pas plus.</em>", sub: "Sans régime d'employeur, le reste se bâtit ailleurs : REER, CELI, société de gestion." },
  { file: '2026-10-19-guide-reer-celi-celiapp', photo: 14436272, pos: '50% 40%', bright: .8, veilTop: .65,
    eyebrow: "Guide complet 2026", small: "Trois comptes, trois logiques.",
    h1: "REER, CELI, CELIAPP&nbsp;: <em>dans quel ordre&nbsp;?</em>", sub: "Quand privilégier l'un, qui devrait ouvrir l'autre, comment ils se complètent. Lien dans la publication." },
  { file: '2026-10-21-mythe-testament', photo: 15199053, pos: '50% 50%', bright: 1.1, veilTop: .45, strike: true,
    eyebrow: "Mythe · Vérité", small: "« Mon testament règle tout. »",
    h1: "Un testament partage. <em>Il ne paie pas.</em>", sub: "L'assurance vie crée les liquidités le mois suivant. Vos dettes ne partent pas avec vous." },
  { file: '2026-10-26-mois-pme', photo: 32357250, pos: '60% 45%', bright: .85, veilTop: .6,
    eyebrow: "Octobre · Mois de la PME", small: "Trois vérifications avant la fin de l'année.",
    h1: "Votre PME vaut plus <em>qu'à la signature.</em>", sub: "Convention d'actionnaires, assurance croisée entre associés, rémunération 2026." },
  { file: '2026-10-28-mythe-exoneration', photo: 18995860, pos: '45% 50%', bright: .85, veilTop: .55, strike: true,
    eyebrow: "Mythe · Vérité", small: "« L'exonération, c'est automatique. »",
    h1: "Elle se perd <em>sans que vous le sachiez.</em>", sub: "Trop de liquidités ou de placements dans la société, et le test de 90 % peut échouer le jour de la vente." },
  { file: '2026-11-02-convention-actionnaires', photo: 5716053, pos: '40% 50%', bright: .62, veilTop: .6,
    eyebrow: "Associés en affaires", small: "Décès, invalidité, divorce, désaccord.",
    h1: "Un désaccord peut <em>tout arrêter.</em>", sub: "Ce que votre PME risque sans convention entre actionnaires. Article complet dans la publication." },
  { file: '2026-11-04-mythe-jeune-retraite', photo: 28371013, pos: '50% 50%', bright: 1.0, veilTop: .55, strike: true,
    eyebrow: "Mythe · Vérité", small: "« Je suis jeune, la retraite attendra. »",
    h1: "Le temps ne se <em>rattrape pas.</em>", sub: "200 $ par mois dès 25 ans peut valoir près du double du même montant investi à 35 ans, à rendement égal." },
  { file: '2026-11-09-invalidite-autonome', photo: 6520110, pos: '55% 50%', bright: .8, veilTop: .6,
    eyebrow: "Travailleurs autonomes", small: "Pas d'employeur. Pas d'assurance collective.",
    h1: "Votre revenu <em>s'arrête avec vous.</em>", sub: "Six mois sans travailler à 90&nbsp;000&nbsp;$ par année : 45&nbsp;000&nbsp;$ qui ne rentrent pas. Les factures, elles, continuent." },
  { file: '2026-11-11-transmettre-la-ferme', photo: 24703323, pos: '50% 50%', bright: .95, veilTop: .55,
    eyebrow: "Patrimoine agricole", small: "Ça se planifie des années d'avance.",
    h1: "Transmettre la ferme <em>sans diviser la famille.</em>", sub: "Qui reprend, à quelles conditions, et comment traiter équitablement les enfants qui ne reprennent pas." },
  { file: '2026-11-18-mythe-assurance-collective', photo: 8487720, pos: '50% 40%', bright: .78, veilTop: .6, strike: true,
    eyebrow: "Mythe · Vérité", small: "« L'assurance de mon employeur me suffit. »",
    h1: "Elle part <em>quand vous partez.</em>", sub: "Changement d'emploi, mise à pied, lancement d'entreprise : la collective disparaît, souvent au pire moment." },
  { file: '2026-11-23-fractionner-retraite', photo: 6975185, pos: '50% 35%', bright: .7, veilTop: .6,
    eyebrow: "Retraite à deux", small: "Même revenu familial. Impôt différent.",
    h1: "Deux retraites, <em>un seul impôt à réduire.</em>", sub: "REER de conjoint, fractionnement de pension, dividendes : trois outils à préparer tôt. Article complet dans la publication." },
  { file: '2026-11-25-jaurais-du', photo: 4384147, pos: '50% 60%', bright: 1.35, veilTop: .45,
    eyebrow: "Ce que j'entends en novembre", small: "Jamais en février.",
    h1: "« J'aurais dû <em>m'y prendre avant.</em> »", sub: "Il reste cinq semaines. Assez pour l'essentiel, si on commence maintenant." },
];
if (process.argv[2] === 'extra') posts.length = 0;
const extra = JSON.parse(process.env.EXTRA || '[]');
posts.push(...extra);

const tpl = (p) => `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;700;800&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1350px; overflow: hidden; }
  body { font-family: 'Outfit', sans-serif; color: #F4EEE4; background: #0C1417; position: relative; }
  .photo { position: absolute; inset: 0; background: url('pexels-${p.photo}.jpg') ${p.pos} / cover no-repeat; filter: saturate(1.05) contrast(1.05) brightness(${p.bright}); }
  .veil { position: absolute; inset: 0; background:
      linear-gradient(180deg, rgba(12,20,23,${p.veilTop}) 0%, rgba(12,20,23,.2) 35%, rgba(12,20,23,.42) 60%, rgba(12,20,23,.94) 100%),
      linear-gradient(90deg, rgba(34,51,59,.5) 0%, rgba(34,51,59,.12) 60%, rgba(34,51,59,0) 100%); }
  .wrap { position: absolute; inset: 0; padding: 88px 88px 128px; display: flex; flex-direction: column; }
  .eyebrow { font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 34px; letter-spacing: .22em; text-transform: uppercase; color: #C6AC8F; text-shadow: 0 2px 14px rgba(0,0,0,.55); }
  .small { margin-top: 28px; font-size: 52px; font-weight: 500; color: rgba(244,238,228,.9); line-height: 1.18; max-width: 900px; text-shadow: 0 2px 18px rgba(0,0,0,.6); }
  .small.strike { text-decoration: line-through; text-decoration-color: #C6AC8F; text-decoration-thickness: 4px; color: rgba(244,238,228,.8); }
  .rule { width: 132px; height: 3px; background: #C6AC8F; margin: 40px 0 0; }
  h1 { margin-top: auto; font-weight: 800; font-size: 112px; line-height: .98; letter-spacing: -.03em; text-wrap: balance; text-shadow: 0 6px 40px rgba(0,0,0,.6); }
  h1 em { font-style: normal; color: #C6AC8F; }
  .sub { margin-top: 34px; font-size: 38px; font-weight: 500; line-height: 1.26; max-width: 880px; color: rgba(244,238,228,.94); text-shadow: 0 2px 18px rgba(0,0,0,.6); }
  .foot { position: absolute; left: 88px; right: 88px; bottom: 44px; display: flex; justify-content: space-between; align-items: baseline; font-family: 'IBM Plex Mono', monospace; font-size: 26px; color: rgba(244,238,228,.6); letter-spacing: .06em; }
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
  <div class="foot"><span>jccapital.ca</span><span class="brand">JC CAPITAL <i>•</i></span></div>
</body></html>`;

for (const p of posts) fs.writeFileSync(`${p.file}.html`, tpl(p));
fs.writeFileSync('posts.json', JSON.stringify(posts.map(p => p.file)));
console.log(posts.map(p => p.file).join('\n'));
