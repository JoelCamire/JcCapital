// Gabarit multiformat 1080x1350 (2026-10-29) : photo plein cadre (v2), carrousel, « le chiffre »,
// « la liste », comparaison sur deux colonnes, sondage. Aux couleurs JC Capital.
// Usage : node gabarit-a-venir.js <dossier-de-construction>
// Les photos Pexels doivent être déposées dans le dossier de construction sous le nom pexels-<id>.jpg.
// Rendu : Chrome headless --virtual-time-budget=8000 --window-size=1080,1350 --screenshot
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
// Typographie française : espaces insécables avant ? ! : ; » % $, après «, et dans les nombres (109 000).
const fr = (t) => t.replace(/« /g, '«&nbsp;').replace(/ ([»?!:;%$])/g, '&nbsp;$1').replace(/(\d) (\d{3})/g, '$1&nbsp;$2');
const doc = (css, body) => `<!doctype html><html lang="fr"><head><meta charset="utf-8">${FONTS}<style>${base}${css}</style></head><body>${fr(body)}</body></html>`;

// ---------- 1. Photo plein cadre (reprend le gabarit v2) ----------
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

// ---------- 2. Diapositive de carrousel ----------
const slideCss = `
  .bg { position: absolute; inset: 0; background:
      radial-gradient(120% 70% at 100% 0%, rgba(198,172,143,.16) 0%, rgba(198,172,143,0) 55%),
      linear-gradient(180deg, #13212A 0%, #0C1417 100%); }
  .wrap { position: absolute; inset: 0; padding: 96px 88px 150px; display: flex; flex-direction: column; }
  .rule { margin: 36px 0 52px; }
  .quote { font-size: 54px; font-weight: 500; line-height: 1.2; color: rgba(244,238,228,.78); margin-bottom: 56px; }
  h2 { font-weight: 800; font-size: 96px; line-height: 1; letter-spacing: -.03em; text-wrap: balance; }
  .big { font-weight: 800; font-size: 200px; line-height: .9; letter-spacing: -.04em; color: #C6AC8F; margin: 8px 0 18px; white-space: nowrap; }
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
${s.quote ? `<div class="quote strike">${s.quote}</div>` : ''}
${s.big ? `<div class="big">${s.big}</div>` : ''}
${s.h2 ? `<h2>${s.h2}</h2>` : ''}
${(s.lead ? [].concat(s.lead) : []).map(l => `<p class="lead">${l}</p>`).join('')}
${s.items ? `<ul>${s.items.map((it, k) => `<li><b>${String(k + 1).padStart(2, '0')}</b><span>${it}</span></li>`).join('')}</ul>` : ''}
${s.ex ? `<div class="ex">${s.ex}</div>` : ''}
${s.cta ? `<div class="cta">${s.cta}</div>` : ''}
${s.note ? `<div class="note">${s.note}</div>` : ''}
</div>${foot(`${i + 1} / ${n}${i + 1 < n ? ' <span class="swipe">→</span>' : ''}`)}`);

// ---------- 3. Le chiffre (fond uni beige) ----------
const chiffre = (c) => doc(`
  body { background: #EAE0D5; color: #0A0908; }
  .wrap { position: absolute; inset: 0; padding: 96px 88px 150px; display: flex; flex-direction: column; }
  .eyebrow { color: #5E503F; }
  .quote { margin-top: 30px; font-size: 50px; font-weight: 500; line-height: 1.2; color: rgba(10,9,8,.62); text-decoration-color: #5E503F; }
  .num { margin-top: auto; font-weight: 800; font-size: ${c.numSize || 250}px; line-height: .86; letter-spacing: -.05em; color: #22333B; white-space: nowrap; }
  .num small { font-size: .5em; letter-spacing: -.02em; }
  .bar { margin: 46px 0 40px; display: flex; gap: 10px; align-items: flex-end; height: 70px; }
  .bar span { width: 36px; display: block; }
  .what { font-size: 54px; font-weight: 700; line-height: 1.12; letter-spacing: -.015em; max-width: 900px; text-wrap: balance; }
  .what em { color: #5E503F; }
  .detail { margin-top: 30px; font-size: 38px; line-height: 1.3; font-weight: 500; color: rgba(10,9,8,.75); max-width: 900px; }
  .src { margin-top: 44px; font-family: 'IBM Plex Mono', monospace; font-size: 23px; line-height: 1.4; color: rgba(10,9,8,.55); }
  .foot { color: rgba(10,9,8,.55); }
  .foot .brand { color: #0A0908; }
  .foot .brand i { color: #5E503F; }
`, `<div class="wrap">
  <div class="eyebrow">${c.eyebrow}</div>
  ${c.quote ? `<div class="quote strike">${c.quote}</div>` : ''}
  <div class="num">${c.num}</div>
  <div class="bar"><span style="height:38%;background:#22333B"></span><span style="height:68%;background:#C6AC8F"></span><span style="height:100%;background:#5E503F"></span></div>
  <div class="what">${c.what}</div>
  <div class="detail">${c.detail}</div>
  <div class="src">${c.src}</div>
</div>${foot('jccapital.ca')}`);

// ---------- 4. La liste (fond bleu nuit uni) ----------
const liste = (l) => doc(`
  body { background: #22333B; }
  .glow { position: absolute; inset: 0; background: radial-gradient(90% 60% at 0% 100%, rgba(12,20,23,.75) 0%, rgba(12,20,23,0) 70%); }
  .wrap { position: absolute; inset: 0; padding: 96px 88px 150px; display: flex; flex-direction: column; }
  .rule { margin: 34px 0 44px; }
  h2 { font-weight: 800; font-size: 78px; line-height: 1; letter-spacing: -.03em; text-wrap: balance; }
  .items { margin-top: 50px; display: flex; flex-direction: column; gap: 30px; }
  .it { display: grid; grid-template-columns: 76px 1fr; gap: 30px; align-items: start; }
  .box { width: 66px; height: 66px; border: 4px solid #C6AC8F; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-top: 2px;
         font-family: 'IBM Plex Mono', monospace; font-size: 30px; color: #C6AC8F; }
  .it h3 { font-size: 52px; font-weight: 700; line-height: 1.1; letter-spacing: -.01em; }
  .it p { margin-top: 10px; font-size: 34px; line-height: 1.3; font-weight: 400; color: rgba(244,238,228,.8); }
  .close { margin-top: auto; padding-top: 36px; border-top: 2px solid rgba(198,172,143,.4); font-size: 40px; line-height: 1.3; font-weight: 500; }
`, `<div class="glow"></div><div class="wrap">
  <div class="eyebrow">${l.eyebrow}</div><div class="rule"></div>
  <h2>${l.h2}</h2>
  <div class="items">${l.items.map((it, k) => `<div class="it"><div class="box">${k + 1}</div><div><h3>${it[0]}</h3><p>${it[1]}</p></div></div>`).join('')}</div>
  <div class="close">${l.close}</div>
</div>${foot('jccapital.ca')}`);

// ---------- 5. Comparaison sur deux colonnes ----------
const compare = (c) => doc(`
  body { background: #0A0908; }
  .wrap { position: absolute; inset: 0; padding: 92px 88px 150px; display: flex; flex-direction: column; }
  .quote { margin-top: 26px; font-size: 44px; font-weight: 500; line-height: 1.18; color: rgba(244,238,228,.72); }
  h2 { margin-top: 40px; font-weight: 800; font-size: 76px; line-height: 1; letter-spacing: -.03em; text-wrap: balance; }
  .grid { margin-top: 46px; display: grid; grid-template-columns: 1fr 1fr; border-radius: 22px; overflow: hidden; }
  .col { padding: 30px 32px 32px; }
  .col.a { background: #22333B; }
  .col.b { background: #EAE0D5; color: #0A0908; }
  .head { font-family: 'IBM Plex Mono', monospace; font-size: 25px; letter-spacing: .12em; text-transform: uppercase; line-height: 1.35; min-height: 68px; }
  .a .head { color: #C6AC8F; } .b .head { color: #5E503F; }
  .row { margin-top: 20px; padding-top: 18px; border-top: 2px solid rgba(198,172,143,.35); }
  .b .row { border-top-color: rgba(94,80,63,.3); }
  .row .lab { font-size: 27px; font-weight: 500; opacity: .72; }
  .row .val { margin-top: 6px; font-size: 38px; font-weight: 700; line-height: 1.12; letter-spacing: -.01em; }
  .b .row .val { color: #5E503F; }
  .note { margin-top: auto; font-size: 30px; line-height: 1.35; color: rgba(244,238,228,.75); }
  .note small { display: block; margin-top: 12px; font-size: 24px; color: rgba(244,238,228,.55); }
`, `<div class="wrap">
  <div class="eyebrow">${c.eyebrow}</div>
  ${c.quote ? `<div class="quote strike">${c.quote}</div>` : ''}
  <h2>${c.h2}</h2>
  <div class="grid">
    <div class="col a"><div class="head">${c.left}</div>${c.rows.map(r => `<div class="row"><div class="lab">${r[0]}</div><div class="val">${r[1]}</div></div>`).join('')}</div>
    <div class="col b"><div class="head">${c.right}</div>${c.rows.map(r => `<div class="row"><div class="lab">${r[0]}</div><div class="val">${r[2]}</div></div>`).join('')}</div>
  </div>
  <div class="note">${c.note}</div>
</div>${foot('jccapital.ca')}`);

// ---------- 6. Sondage / question ----------
const sondage = (q) => doc(`
  body { background: #0A0908; }
  .bg { position: absolute; inset: 0; background: radial-gradient(80% 50% at 100% 0%, rgba(94,80,63,.55) 0%, rgba(94,80,63,0) 70%); }
  .wrap { position: absolute; inset: 0; padding: 92px 88px 150px; display: flex; flex-direction: column; }
  .rule { margin: 34px 0 40px; }
  .said { font-size: 46px; font-weight: 500; line-height: 1.22; color: rgba(244,238,228,.78); }
  h2 { margin-top: 24px; font-weight: 800; font-size: 86px; line-height: 1; letter-spacing: -.03em; text-wrap: balance; }
  .opts { margin-top: 48px; display: flex; flex-direction: column; gap: 18px; }
  .opt { display: grid; grid-template-columns: 74px 1fr; gap: 26px; align-items: center; padding: 18px 30px; border: 2px solid rgba(198,172,143,.4); border-radius: 18px; background: rgba(34,51,59,.45); }
  .opt b { width: 74px; height: 74px; border-radius: 50%; background: #C6AC8F; color: #0A0908; display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: 800; }
  .opt span { font-size: 38px; line-height: 1.2; font-weight: 500; }
  .ask { margin-top: auto; padding-top: 30px; font-size: 44px; line-height: 1.25; font-weight: 700; }
`, `<div class="bg"></div><div class="wrap">
  <div class="eyebrow">${q.eyebrow}</div><div class="rule"></div>
  <div class="said">${q.said}</div>
  <h2>${q.h2}</h2>
  <div class="opts">${q.opts.map((o, k) => `<div class="opt"><b>${'ABCD'[k]}</b><span>${o}</span></div>`).join('')}</div>
  <div class="ask">${q.ask}</div>
</div>${foot('jccapital.ca')}`);

// ======================= CONTENU =======================
const files = [];
const write = (name, html) => { fs.writeFileSync(path.join(out, `${name}.html`), html); files.push(name); };

// 11 nov. : comparaison
write('2026-11-11-mythe-assurance-employeur-01', compare({
  eyebrow: 'Mythe · Vérité',
  quote: '« L\'assurance de mon employeur me suffit. »',
  h2: 'Elle reste chez l\'employeur. <em>Pas avec vous.</em>',
  left: 'Tant que vous<br>y travaillez',
  right: 'Le jour où<br>vous partez',
  rows: [
    ['Assurance vie', 'Incluse', 'Prend fin*'],
    ['Assurance salaire', 'Incluse', 'Prend fin'],
    ['Pour vous assurer', 'Souvent sans questions sur votre santé', 'Selon votre santé à ce moment-là'],
  ],
  note: 'Nouvel emploi, mise à pied, lancement d\'entreprise : c\'est souvent là qu\'on s\'en rend compte.<small>* Certains contrats permettent de convertir une partie de l\'assurance vie, dans un court délai. Vérifiez le vôtre.</small>',
}));

// 18 nov. : la liste
write('2026-11-18-vendre-entreprise-ferme-01', liste({
  eyebrow: 'Entreprise ou ferme',
  h2: 'Vendre un jour ? <em>Trois questions à vous poser 2 ou 3 ans avant.</em>',
  items: [
    ['Qui va acheter ?', 'Un enfant, un employé, un voisin, un concurrent ? Chaque option se prépare autrement.'],
    ['Quand voulez-vous partir ?', 'Une date réaliste donne le temps de tout mettre en ordre, sans vendre à la course.'],
    ['Êtes-vous prêt du côté de l\'impôt ?', 'Certaines conditions se vérifient des années avant la vente. Mieux vaut le savoir tôt.'],
  ],
  close: 'Un « je ne sais pas » à l\'une des trois ? C\'est le bon moment d\'en parler.',
}));

// 25 nov. : sondage
write('2026-11-25-jaurais-du-sondage-01', sondage({
  eyebrow: 'Il reste 5 semaines',
  said: 'Ce que j\'entends le plus en décembre :',
  h2: '« J\'aurais dû <em>m\'y prendre avant.</em> »',
  opts: [
    'Revoir mes assurances après un gros changement',
    'Mettre de l\'argent de côté chaque mois',
    'Faire mon testament ou mon mandat de protection',
    'Parler de notre retraite avec mon conjoint',
  ],
  ask: 'Et vous, ce serait lequel ?<br><em>Répondez A, B, C ou D en commentaire.</em>',
}));

// 2 déc. : carrousel 6 diapositives (couverture photo + 5)
const assoc = [
  { eyebrow: 'Le scénario', h2: 'Votre associé décède.<br><em>Sa part reste.</em>',
    lead: ['Elle passe à sa succession : souvent son conjoint ou ses enfants.', 'Du jour au lendemain, ils deviennent vos partenaires d\'affaires, qu\'ils connaissent l\'entreprise ou non.'] },
  { eyebrow: 'Ou encore', h2: 'Il devient invalide. <em>Il garde sa part.</em>',
    lead: ['Il ne peut plus travailler, mais il a encore besoin d\'un revenu.', 'Vous faites le travail de deux. Qui paie quoi, et jusqu\'à quand ?'] },
  { eyebrow: 'Outil n° 1', h2: 'Une convention <em>entre actionnaires.</em>',
    items: ['Qui rachète la part<small>Les associés, l\'entreprise, ou les deux</small>', 'À quel prix<small>Une méthode fixée d\'avance, à froid</small>', 'Dans quel délai<small>Pour que rien ne reste en suspens</small>'],
    note: 'Elle se rédige avec votre notaire ou votre avocat.' },
  { eyebrow: 'Outil n° 2', h2: 'Une assurance <em>entre associés.</em>',
    lead: 'La convention dit quoi faire. L\'assurance fournit l\'argent pour le faire, au moment où il le faut.',
    ex: '<b>Exemple :</b> une part évaluée à 400 000 $. Peu d\'associés ont cette somme sous la main du jour au lendemain.' },
  { eyebrow: 'Votre entreprise est-elle prête ?', h2: 'Votre convention <em>date de quand ?</em>',
    lead: 'Si elle a plus de cinq ans, ou s\'il n\'y en a pas, c\'est le bon moment d\'en parler.',
    cta: 'Faites le diagnostic assurance :<br><strong>jccapital.ca</strong> › Assurance' },
];
write('2026-12-02-associes-01', photo({ photo: 5833775, pos: '42% 50%', bright: .62, veilTop: .62,
  eyebrow: 'Associés en affaires', small: 'La question qu\'on évite.',
  h1: 'Et si votre associé <em>ne revenait pas lundi ?</em>',
  sub: 'Décès ou invalidité : ce qui arrive à l\'entreprise, et comment s\'y préparer.',
  footLeft: '1 / 6 <span class="swipe">→</span>' }));
assoc.forEach((s, k) => write(`2026-12-02-associes-0${k + 2}`, slide(s, k + 1, 6)));

// 9 déc. : le chiffre
write('2026-12-09-mythe-celi-01', chiffre({
  eyebrow: 'Mythe · Vérité',
  quote: '« Le CELI, c\'est pour les petits épargnants. »',
  num: '109&nbsp;000&nbsp;$', numSize: 212,
  what: 'C\'est l\'espace CELI accumulé de 2009 à 2026 <em>pour une personne qui n\'y a jamais cotisé.</em>',
  detail: 'Il faut avoir eu 18 ans et résidé au Canada depuis 2009. Les droits inutilisés se reportent d\'une année à l\'autre. Plafond 2026 : 7 000 $.',
  src: 'Source : Agence du revenu du Canada, plafonds annuels du CELI 2009 à 2026 (canada.ca). Total calculé par JC Capital.',
}));

// 16 déc. : photo plein cadre
write('2026-12-16-deux-retraites-01', photo({ photo: 6128914, pos: '50% 40%', bright: .8, veilTop: .55,
  eyebrow: 'Retraite à deux', small: 'Un couple, deux déclarations de revenus.',
  h1: 'Deux retraites, <em>un seul impôt à réduire.</em>',
  sub: 'Quand l\'un retire beaucoup et l\'autre peu, le couple paie souvent plus d\'impôt que nécessaire.' }));

// 6 janv. 2027 : carrousel 5 diapositives
const rrq = [
  { eyebrow: 'Mythe · Vérité', quote: '« Le RRQ va suffire pour ma retraite. »',
    h2: 'Il remplace <em>une partie</em> de votre revenu.', lead: 'Pas tout. Voici combien.' },
  { eyebrow: 'Le chiffre', big: '25 → 33 %',
    lead: ['La part de vos revenus de travail que le RRQ vise à remplacer. Le taux passe graduellement de 25 % à 33,33 % ; le plein effet sera atteint d\'ici 2064.', 'Au-delà d\'un plafond (85 000 $ en 2026), vos revenus ne comptent pas.'],
    note: 'Source : Retraite Québec, « Bonification du Régime de rentes du Québec », retraitequebec.gouv.qc.ca.' },
  { eyebrow: 'Un exemple concret', h2: 'Exemple : vous gagnez <em>80 000 $</em> par année.',
    lead: 'De 25 % à 33 % de ce revenu, c\'est de 20 000 $ à 26 700 $ par année.',
    ex: 'Pour garder votre train de vie, <b>le reste doit venir d\'ailleurs.</b>',
    note: 'Exemple simplifié : la rente réelle dépend de vos années de cotisation, de vos revenus et de l\'âge où vous la demandez.' },
  { eyebrow: 'À votre compte ?', h2: 'Personne ne comble <em>l\'écart pour vous.</em>',
    items: ['Pas de régime de retraite d\'employeur', 'Payé en dividendes ?<small>Vous ne cotisez pas au RRQ sur ces sommes.</small>', 'Le reste se bâtit<small>REER, CELI, épargne dans votre entreprise</small>'] },
  { eyebrow: 'Votre écart', h2: 'Combien vous <span style="white-space:nowrap">manquera-t-il</span> <em>à la retraite ?</em>',
    lead: 'On le calcule ensemble, à partir de vos chiffres à vous.',
    cta: 'Écrivez <strong>PLAN</strong> en message.' },
];
rrq.forEach((s, k) => write(`2027-01-06-mythe-rrq-0${k + 1}`, slide(s, k, 5)));

fs.writeFileSync(path.join(out, 'liste.json'), JSON.stringify(files));
console.log(files.join('\n'));
