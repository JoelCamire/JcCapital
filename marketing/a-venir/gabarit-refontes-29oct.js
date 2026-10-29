// Refontes du 29 oct. 2026 (1080x1350) :
//   - 16 déc. 2026 : « Le cadeau qu'on oublie sous le sapin » (bénéficiaires), remplace « Deux retraites… ».
//   - 6 janv. 2027 : « Mythe : le RRQ va suffire », carrousel v2 de 5 diapositives (couverture photo + chiffre géant,
//     jauge, exemple illustré à 80 000 $, à votre compte, appel à l'action).
// Images : celles du site (img/field-agricole.jpg, img/quarts.jpg), très assombries. Aucune photo à télécharger.
// Usage : node gabarit-refontes-29oct.js <dossier-de-construction>
// Rendu : Chrome headless --allow-file-access-from-files --virtual-time-budget=8000 --window-size=1080,1350 --screenshot
const fs = require('fs');
const path = require('path');
const out = process.argv[2] || '.';
fs.mkdirSync(out, { recursive: true });
const IMG = 'file:///' + path.resolve(__dirname, '../../img').replace(/\\/g, '/') + '/';

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">`;
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
const base = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1350px; overflow: hidden; }
  body { font-family: 'Outfit', sans-serif; color: #F4EEE4; background: #0C1417; position: relative; -webkit-font-smoothing: antialiased; }
  em { font-style: normal; color: #C6AC8F; }
  .abs { position: absolute; }
  .gold { background: linear-gradient(180deg, #DCC3A2 0%, #C6AC8F 45%, #AC9376 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .eyebrow { font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 30px; letter-spacing: .2em; text-transform: uppercase; color: #C6AC8F; }
  .rule { width: 120px; height: 3px; background: linear-gradient(90deg, #DCC3A2, #AC9376); }
  .grain { position: absolute; inset: 0; background-image: ${GRAIN}; mix-blend-mode: overlay; opacity: .16; pointer-events: none; z-index: 50; }
  .foot { position: absolute; left: 88px; right: 88px; bottom: 52px; display: flex; justify-content: space-between; align-items: baseline; font-family: 'IBM Plex Mono', monospace; font-size: 26px; color: rgba(244,238,228,.6); letter-spacing: .06em; z-index: 40; }
  .foot .brand { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 30px; color: #F4EEE4; letter-spacing: .06em; }
  .foot .brand i { font-style: normal; color: #C6AC8F; }
  .swipe { color: #C6AC8F; }
  .strike { text-decoration: line-through; text-decoration-color: #C6AC8F; text-decoration-thickness: 4px; }
  .wrap { position: absolute; inset: 0; padding: 92px 88px 150px; display: flex; flex-direction: column; z-index: 10; }
  .note { font-size: 25px; line-height: 1.4; color: rgba(244,238,228,.58); }
  .navy { position: absolute; inset: 0; background:
      radial-gradient(120% 70% at 100% 0%, rgba(198,172,143,.15) 0%, rgba(198,172,143,0) 55%),
      linear-gradient(180deg, #13212A 0%, #0C1417 100%); }
`;
const foot = (left) => `<div class="foot"><span>${left}</span><span class="brand">JC CAPITAL <i>•</i></span></div>`;
const pager = (i, n) => `${i} / ${n}${i < n ? ' <span class="swipe">→</span>' : ''}`;
// Typographie française : espaces insécables avant ? ! : ; » % $, après «, et dans les nombres.
// Appliqué seulement aux nœuds texte (jamais aux attributs : les tracés SVG contiennent des nombres séparés par des espaces).
const frText = (t) => t.replace(/« /g, '«&nbsp;').replace(/ ([»?!:;%$])/g, '&nbsp;$1').replace(/(\d) (\d{3})/g, '$1&nbsp;$2');
const fr = (t) => t.replace(/>([^<]+)</g, (m, s) => '>' + frText(s) + '<');
const doc = (css, body) => `<!doctype html><html lang="fr"><head><meta charset="utf-8">${FONTS}<style>${base}${css}</style></head><body>${fr(body)}<div class="grain"></div></body></html>`;

const files = [];
const write = (name, html) => { fs.writeFileSync(path.join(out, `${name}.html`), html); files.push(name); };

// =====================================================================
// 16 déc. 2026 : le cadeau qu'on oublie (étiquette-cadeau « Bénéficiaire : ? »)
// =====================================================================
write('2026-12-16-cadeau-beneficiaires-01', doc(`
  body { background: #0A0908; }
  .bg { position: absolute; inset: 0; background:
      radial-gradient(60% 40% at 50% 58%, rgba(34,51,59,.85) 0%, rgba(12,20,23,0) 100%),
      linear-gradient(180deg, #0C1417 0%, #0A0908 100%); }
  /* lumières de Fêtes floues (bokeh), très discrètes */
  .bokeh span { position: absolute; border-radius: 50%; filter: blur(14px); background: radial-gradient(circle, rgba(220,195,162,.55), rgba(220,195,162,0) 70%); }
  .wrap { padding-top: 96px; }
  h1 { margin-top: 30px; font-weight: 800; font-size: 104px; line-height: .98; letter-spacing: -.035em; }
  /* étiquette-cadeau */
  .tagzone { position: relative; height: 560px; margin-top: 8px; }
  .string { position: absolute; left: 640px; top: 40px; width: 3px; height: 150px; background: linear-gradient(180deg, rgba(198,172,143,0), #C6AC8F 40%, #DCC3A2); transform-origin: top; transform: rotate(14deg); }
  .tag { position: absolute; left: 150px; top: 150px; width: 640px; height: 330px; transform: rotate(-7deg);
         background: linear-gradient(160deg, #F1E8DD 0%, #EAE0D5 55%, #DCCFC0 100%);
         clip-path: polygon(15% 0, 100% 0, 100% 100%, 15% 100%, 0 50%);
         box-shadow: 0 30px 60px rgba(0,0,0,.5); }
  .tagshadow { position: absolute; left: 150px; top: 150px; width: 640px; height: 330px; transform: rotate(-7deg) translate(14px, 26px); background: rgba(0,0,0,.45); filter: blur(22px);
         clip-path: polygon(15% 0, 100% 0, 100% 100%, 15% 100%, 0 50%); }
  .hole { position: absolute; left: 52px; top: 145px; width: 40px; height: 40px; border-radius: 50%; background: #0F1A1F; box-shadow: inset 0 0 0 5px #C6AC8F; }
  .tag .in { position: absolute; left: 140px; right: 50px; top: 46px; color: #0A0908; }
  .tag .lab { font-family: 'IBM Plex Mono', monospace; font-size: 26px; letter-spacing: .2em; text-transform: uppercase; color: #5E503F; }
  .tag .line { margin-top: 26px; display: flex; align-items: flex-end; gap: 20px; }
  .tag .line b { font-size: 54px; font-weight: 700; color: #22333B; }
  .tag .line span { flex: 1; border-bottom: 4px dotted rgba(94,80,63,.55); height: 52px; }
  .tag .q { position: absolute; right: 48px; bottom: 26px; font-size: 150px; font-weight: 800; line-height: 1; color: #C6AC8F; }
  .tag .bars { position: absolute; left: 140px; bottom: 44px; display: flex; gap: 7px; align-items: flex-end; height: 40px; }
  .tag .bars i { display: block; width: 10px; }
  .sub { font-size: 44px; line-height: 1.24; font-weight: 500; color: rgba(244,238,228,.94); max-width: 900px; }
  .chips { margin-top: 34px; display: flex; gap: 16px; flex-wrap: wrap; }
  .chips span { font-family: 'IBM Plex Mono', monospace; font-size: 25px; letter-spacing: .08em; text-transform: uppercase; color: #EAE0D5; padding: 14px 22px; border: 2px solid rgba(198,172,143,.5); border-radius: 999px; background: rgba(34,51,59,.4); }
  .chips span b { color: #C6AC8F; font-weight: 500; margin-right: 10px; }
`, `<div class="bg"></div>
  <div class="bokeh">
    <span style="left:760px;top:60px;width:140px;height:140px;opacity:.55"></span>
    <span style="left:930px;top:220px;width:80px;height:80px;opacity:.45"></span>
    <span style="left:860px;top:380px;width:50px;height:50px;opacity:.5"></span>
    <span style="left:40px;top:640px;width:90px;height:90px;opacity:.3"></span>
    <span style="left:960px;top:760px;width:120px;height:120px;opacity:.35"></span>
    <span style="left:700px;top:20px;width:40px;height:40px;opacity:.6"></span>
  </div>
  <div class="wrap">
    <div class="eyebrow">Avant les Fêtes</div>
    <h1>Le cadeau qu'on oublie <em>sous le sapin.</em></h1>
    <div class="tagzone">
      <div class="string"></div>
      <div class="tagshadow"></div>
      <div class="tag">
        <div class="hole"></div>
        <div class="in"><div class="lab">Bénéficiaire</div><div class="line"><b>À :</b><span></span></div></div>
        <div class="bars"><i style="height:40%;background:#22333B"></i><i style="height:70%;background:#C6AC8F"></i><i style="height:100%;background:#5E503F"></i></div>
        <div class="q">?</div>
      </div>
    </div>
    <div class="sub">Qui recevrait l'argent de vos assurances et de vos placements ? <em>Le nom inscrit est-il encore le bon ?</em></div>
    <div class="chips"><span><b>01</b>Assurance vie</span><span><b>02</b>REER et CELI</span><span><b>03</b>Testament</span></div>
  </div>${foot('jccapital.ca')}`));

// =====================================================================
// 6 janv. 2027 : Mythe RRQ, carrousel v2
// =====================================================================
const N = 5;

// 1. Couverture : photo du site assombrie + chiffre géant
write('2027-01-06-mythe-rrq-v2-01', doc(`
  .photo { position: absolute; inset: 0; background: url('${IMG}field-agricole.jpg') 62% 38% / cover no-repeat; filter: saturate(.85) contrast(1.08) brightness(.5); }
  .veil { position: absolute; inset: 0; background:
      linear-gradient(180deg, rgba(12,20,23,.88) 0%, rgba(12,20,23,.55) 32%, rgba(12,20,23,.55) 52%, rgba(10,9,8,.96) 82%),
      linear-gradient(90deg, rgba(34,51,59,.55) 0%, rgba(34,51,59,0) 70%); }
  .quote { margin-top: 30px; font-size: 50px; font-weight: 500; line-height: 1.18; color: rgba(244,238,228,.82); max-width: 860px; }
  .big { margin-top: auto; font-weight: 800; font-size: 400px; line-height: .8; letter-spacing: -.06em; white-space: nowrap; margin-left: -12px; }
  .big small { font-size: .5em; letter-spacing: -.02em; margin-left: 6px; }
  .rule { margin: 44px 0 34px; }
  h1 { font-weight: 800; font-size: 72px; line-height: 1.02; letter-spacing: -.03em; max-width: 900px; }
  .sub { margin-top: 22px; font-size: 34px; line-height: 1.3; font-weight: 500; color: rgba(244,238,228,.82); }
`, `<div class="photo"></div><div class="veil"></div>
  <div class="wrap">
    <div class="eyebrow">Mythe · Vérité</div>
    <div class="quote strike">« Le RRQ va suffire pour ma retraite. »</div>
    <div class="big gold">33<small>%</small></div>
    <div class="rule"></div>
    <h1>Au mieux, le RRQ remplacera <em>le tiers</em> de votre revenu.</h1>
    <div class="sub">Pas plus. Voyez ce que ça donne en chiffres.</div>
  </div>${foot(pager(1, N))}`));

// 2. Jauge : ce que le RRQ couvre / l'écart
const R = 330, CX = 452, CY = 400, SW = 64;
const arc = (p0, p1) => { // portion de demi-cercle, de p0 à p1 (0 à 1), de gauche à droite
  const a0 = Math.PI * (1 - p0), a1 = Math.PI * (1 - p1);
  const x0 = CX + R * Math.cos(a0), y0 = CY - R * Math.sin(a0), x1 = CX + R * Math.cos(a1), y1 = CY - R * Math.sin(a1);
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};
const tick = (p, len, col, w) => { const a = Math.PI * (1 - p); const r0 = R - SW / 2 - 14, r1 = R + SW / 2 + len;
  return `<line x1="${(CX + r0 * Math.cos(a)).toFixed(1)}" y1="${(CY - r0 * Math.sin(a)).toFixed(1)}" x2="${(CX + r1 * Math.cos(a)).toFixed(1)}" y2="${(CY - r1 * Math.sin(a)).toFixed(1)}" stroke="${col}" stroke-width="${w}"/>`; };
write('2027-01-06-mythe-rrq-v2-02', doc(`
  h2 { margin-top: 34px; font-weight: 800; font-size: 80px; line-height: 1; letter-spacing: -.03em; }
  .gauge { position: relative; margin-top: 30px; height: 470px; }
  .gauge svg { position: absolute; left: 0; top: 0; }
  .center { position: absolute; left: 0; width: 904px; top: 245px; text-align: center; }
  .center .n { font-weight: 800; font-size: 140px; line-height: .9; letter-spacing: -.05em; }
  .center .n small { font-size: .5em; }
  .center .l { margin-top: 10px; font-family: 'IBM Plex Mono', monospace; font-size: 24px; letter-spacing: .14em; text-transform: uppercase; color: rgba(244,238,228,.7); }
  .legend { margin-top: 22px; display: flex; flex-direction: column; gap: 20px; }
  .lg { display: grid; grid-template-columns: 46px 1fr; gap: 22px; align-items: center; font-size: 36px; line-height: 1.22; font-weight: 500; }
  .lg i { display: block; width: 46px; height: 46px; border-radius: 10px; }
  .lg small { display: block; font-size: 27px; color: rgba(244,238,228,.65); font-weight: 400; }
  .note { margin-top: auto; }
`, `<div class="navy"></div>
  <div class="wrap">
    <div class="eyebrow">Ce que le RRQ couvre</div>
    <h2>Une base. <em>Pas tout.</em></h2>
    <div class="gauge">
      <svg width="904" height="470" viewBox="0 0 904 470">
        <defs>
          <linearGradient id="g1" x1="0" x2="1"><stop offset="0" stop-color="#DCC3A2"/><stop offset="1" stop-color="#AC9376"/></linearGradient>
          <pattern id="hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="16" height="16" fill="rgba(94,80,63,.22)"/><line x1="0" y1="0" x2="0" y2="16" stroke="rgba(198,172,143,.38)" stroke-width="5"/></pattern>
        </defs>
        <path d="${arc(0, 1)}" fill="none" stroke="url(#hatch)" stroke-width="${SW}"/>
        <path d="${arc(0, 0.25)}" fill="none" stroke="url(#g1)" stroke-width="${SW}"/>
        <path d="${arc(0.25, 1 / 3)}" fill="none" stroke="#5E503F" stroke-width="${SW}"/>
        <path d="${arc(0.25, 1 / 3)}" fill="none" stroke="rgba(220,195,162,.55)" stroke-width="${SW - 22}" stroke-dasharray="6 8"/>
        ${tick(0.25, 18, '#F4EEE4', 3)}${tick(1 / 3, 18, '#F4EEE4', 3)}
        <text x="${CX - R - SW / 2}" y="${CY + 50}" fill="rgba(244,238,228,.6)" font-family="IBM Plex Mono" font-size="24">0 %</text>
        <text x="${CX + R + SW / 2}" y="${CY + 50}" fill="rgba(244,238,228,.6)" font-family="IBM Plex Mono" font-size="24" text-anchor="end">100 %</text>
      </svg>
      <div class="center"><div class="n gold">33<small>%</small></div><div class="l">au maximum, d'ici 2064</div></div>
    </div>
    <div class="legend">
      <div class="lg"><i style="background:linear-gradient(90deg,#DCC3A2,#AC9376)"></i><span>25 % : le taux de base<small>La part de vos revenus de travail que le RRQ vise à remplacer</small></span></div>
      <div class="lg"><i style="background:#5E503F;box-shadow:inset 0 0 0 3px rgba(220,195,162,.55)"></i><span>Jusqu'à 33,33 % avec la bonification<small>Graduellement, depuis 2019 ; plein effet d'ici 2064</small></span></div>
      <div class="lg"><i style="background:repeating-linear-gradient(45deg,rgba(198,172,143,.45) 0 5px,rgba(94,80,63,.25) 5px 16px)"></i><span>L'écart à combler<small>Et au-delà du plafond (85 000 $ en 2026), rien n'est couvert</small></span></div>
    </div>
    <div class="note">Source : Retraite Québec, « Bonification du Régime de rentes du Québec », retraitequebec.gouv.qc.ca.</div>
  </div>${foot(pager(2, N))}`));

// 3. Exemple à 80 000 $ illustré : colonne empilée
const H = 660, TOT = 80000; // hauteur de la colonne = 80 000 $
const hp = (v) => Math.round(H * v / TOT);
write('2027-01-06-mythe-rrq-v2-03', doc(`
  h2 { margin-top: 34px; font-weight: 800; font-size: 76px; line-height: 1; letter-spacing: -.03em; }
  .viz { position: relative; margin-top: 110px; height: ${H}px; }
  .col { position: absolute; left: 0; bottom: 0; width: 300px; height: ${H}px; border-radius: 18px; overflow: hidden; }
  .gap { position: absolute; left: 0; right: 0; top: 0; height: ${hp(TOT - 20000)}px; background: repeating-linear-gradient(45deg, rgba(198,172,143,.32) 0 6px, rgba(94,80,63,.16) 6px 20px); }
  .bon { position: absolute; left: 0; right: 0; bottom: ${hp(20000)}px; height: ${hp(6700)}px; background: #5E503F; box-shadow: inset 0 0 0 3px rgba(220,195,162,.5); }
  .base { position: absolute; left: 0; right: 0; bottom: 0; height: ${hp(20000)}px; background: linear-gradient(180deg, #DCC3A2, #AC9376); }
  .top { position: absolute; left: 0; width: 300px; top: -46px; text-align: center; font-family: 'IBM Plex Mono', monospace; font-size: 24px; letter-spacing: .1em; color: rgba(244,238,228,.7); }
  .lab { position: absolute; left: 350px; right: 0; }
  .lab .k { font-family: 'IBM Plex Mono', monospace; font-size: 24px; letter-spacing: .14em; text-transform: uppercase; color: #C6AC8F; }
  .lab .v { margin-top: 8px; font-weight: 800; font-size: 64px; line-height: 1; letter-spacing: -.03em; white-space: nowrap; }
  .lab .d { margin-top: 10px; font-size: 30px; line-height: 1.28; color: rgba(244,238,228,.78); font-weight: 400; }
  .lab::before { content: ''; position: absolute; left: -40px; top: 18px; width: 26px; height: 2px; background: #C6AC8F; }
  .note { margin-top: auto; padding-top: 24px; }
`, `<div class="navy"></div>
  <div class="wrap">
    <div class="eyebrow">Un exemple concret</div>
    <h2>Exemple : un revenu de <em>80 000 $</em> par année.</h2>
    <div class="viz">
      <div class="top">80 000 $</div>
      <div class="col"><div class="gap"></div><div class="bon"></div><div class="base"></div></div>
      <div class="lab" style="top:${Math.round(hp(TOT - 20000) / 2) - 110}px">
        <div class="k">L'écart à combler</div>
        <div class="v">53 300 $ à 60 000 $</div>
        <div class="d">par année. <em>Pour garder votre train de vie, il doit venir d'ailleurs.</em></div>
      </div>
      <div class="lab" style="top:${H - hp(26700) - 4}px">
        <div class="k">Ce que le RRQ couvre</div>
        <div class="v gold">20 000 $ à 26 700 $</div>
        <div class="d">par année, soit de 25 % à 33 %.</div>
      </div>
    </div>
    <div class="note">Exemple simplifié : la rente réelle dépend de vos années de cotisation, de vos revenus et de l'âge où vous la demandez.</div>
  </div>${foot(pager(3, N))}`));

// 4. À votre compte
write('2027-01-06-mythe-rrq-v2-04', doc(`
  h2 { margin-top: 34px; font-weight: 800; font-size: 88px; line-height: 1; letter-spacing: -.03em; }
  .cards { margin-top: 60px; display: flex; flex-direction: column; gap: 22px; }
  .card { display: grid; grid-template-columns: 150px 1fr; gap: 34px; align-items: center; padding: 34px 38px; border-radius: 22px; background: rgba(34,51,59,.55); border: 1px solid rgba(198,172,143,.28); }
  .card .n { font-weight: 800; font-size: 92px; line-height: .9; letter-spacing: -.04em; text-align: center; }
  .card h3 { font-size: 44px; font-weight: 700; line-height: 1.12; letter-spacing: -.01em; }
  .card p { margin-top: 8px; font-size: 30px; line-height: 1.3; color: rgba(244,238,228,.75); }
  .close { margin-top: auto; font-size: 40px; line-height: 1.28; font-weight: 500; border-top: 2px solid rgba(198,172,143,.4); padding-top: 34px; }
`, `<div class="navy"></div>
  <div class="wrap">
    <div class="eyebrow">À votre compte ?</div>
    <h2>Personne ne comble <em>l'écart pour vous.</em></h2>
    <div class="cards">
      <div class="card"><div class="n gold">0</div><div><h3>Régime de retraite d'employeur</h3><p>Pas de patron pour cotiser avec vous.</p></div></div>
      <div class="card"><div class="n gold">0 $</div><div><h3>Cotisation au RRQ sur vos dividendes</h3><p>Payé en dividendes, vous ne cotisez pas au RRQ sur ces sommes.</p></div></div>
      <div class="card"><div class="n gold">3</div><div><h3>Outils pour bâtir le reste</h3><p>REER, CELI, épargne dans votre entreprise.</p></div></div>
    </div>
    <div class="close">Le RRQ reste une base solide. <em>Le reste, c'est à vous de le prévoir.</em></div>
  </div>${foot(pager(4, N))}`));

// 5. Appel à l'action sur le marbre du site
write('2027-01-06-mythe-rrq-v2-05', doc(`
  .marble { position: absolute; inset: 0; background: url('${IMG}quarts.jpg') 40% 50% / cover no-repeat; filter: brightness(.42) saturate(.8); }
  .veil { position: absolute; inset: 0; background: radial-gradient(80% 60% at 50% 45%, rgba(10,9,8,.25) 0%, rgba(10,9,8,.85) 100%); }
  h2 { margin-top: auto; font-weight: 800; font-size: 104px; line-height: .98; letter-spacing: -.035em; }
  .lead { margin-top: 34px; font-size: 42px; line-height: 1.28; font-weight: 500; color: rgba(244,238,228,.9); max-width: 880px; }
  .cta { margin-top: 64px; align-self: flex-start; padding: 30px 44px; border-radius: 18px; background: linear-gradient(180deg, #DCC3A2, #AC9376); color: #0A0908; font-size: 46px; font-weight: 500; }
  .cta b { font-weight: 800; letter-spacing: .06em; }
`, `<div class="marble"></div><div class="veil"></div>
  <div class="wrap">
    <div class="eyebrow">Votre écart</div>
    <h2>Combien vous <span style="white-space:nowrap">manquera-t-il</span> <em>à la retraite ?</em></h2>
    <div class="lead">On le calcule ensemble, à partir de vos chiffres à vous.</div>
    <div class="cta">Écrivez <b>PLAN</b> en message</div>
  </div>${foot(pager(5, N))}`));

fs.writeFileSync(path.join(out, 'liste.json'), JSON.stringify(files));
console.log(files.join('\n'));
