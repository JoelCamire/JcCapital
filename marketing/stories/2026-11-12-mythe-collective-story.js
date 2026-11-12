// Story Instagram 1080x1920 (12 nov. 2026, midi) : rappel du carrousel « Mon assurance collective me suffit ».
// Zones sûres : rien d'important dans les 250 px du haut ni du bas (interface Instagram).
// Usage : node 2026-11-12-mythe-collective-story.js <dossier-de-construction>   (pexels-8487720.jpg doit s'y trouver)
// Rendu : chrome --headless=new --virtual-time-budget=8000 --window-size=1080,1920 --screenshot=<png> <html>
const fs = require('fs');
const path = require('path');
const out = process.argv[2] || '.';
fs.mkdirSync(out, { recursive: true });
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;800&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">`;
const fr = (t) => t.replace(/« /g, '«&nbsp;').replace(/ ([»?!:;%$])/g, '&nbsp;$1');
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">${FONTS}<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1920px; overflow: hidden; }
  body { font-family: 'Outfit', sans-serif; color: #F4EEE4; background: #0C1417; position: relative; }
  em { font-style: normal; color: #C6AC8F; }
  .photo { position: absolute; inset: 0; background: url('pexels-8487720.jpg') 50% 35% / cover no-repeat; filter: saturate(1.05) contrast(1.05) brightness(.78); }
  .veil { position: absolute; inset: 0; background:
      linear-gradient(180deg, rgba(12,20,23,.75) 0%, rgba(12,20,23,.25) 30%, rgba(12,20,23,.55) 55%, rgba(12,20,23,.97) 100%),
      linear-gradient(90deg, rgba(34,51,59,.5) 0%, rgba(34,51,59,.12) 60%, rgba(34,51,59,0) 100%); }
  .wrap { position: absolute; inset: 0; padding: 300px 80px 400px; display: flex; flex-direction: column; }
  .eyebrow { font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 34px; letter-spacing: .22em; text-transform: uppercase; color: #C6AC8F; text-shadow: 0 2px 14px rgba(0,0,0,.55); }
  .strike { display: inline-block; align-self: flex-start; margin-top: 34px; padding: 18px 28px; border-radius: 14px; background: rgba(12,20,23,.72); border-left: 6px solid #C6AC8F;
            font-size: 56px; font-weight: 700; line-height: 1.18; text-decoration: line-through; text-decoration-color: #C6AC8F; text-decoration-thickness: 5px; }
  h1 { margin-top: auto; font-weight: 800; font-size: 120px; line-height: .98; letter-spacing: -.03em; text-wrap: balance; text-shadow: 0 6px 40px rgba(0,0,0,.65); }
  .sub { margin-top: 36px; font-size: 42px; font-weight: 500; line-height: 1.26; color: rgba(244,238,228,.95); text-shadow: 0 2px 18px rgba(0,0,0,.6); }
  .box { margin-top: 56px; padding: 36px 40px; border-radius: 18px; background: rgba(198,172,143,.14); border: 2px solid rgba(198,172,143,.55); }
  .box .t { font-family: 'IBM Plex Mono', monospace; font-size: 28px; letter-spacing: .18em; text-transform: uppercase; color: #C6AC8F; }
  .box .l { margin-top: 16px; font-size: 44px; font-weight: 700; line-height: 1.22; }
  .box .l strong { color: #C6AC8F; }
  .box .m { margin-top: 14px; font-size: 32px; line-height: 1.3; color: rgba(244,238,228,.8); }
  .foot { position: absolute; left: 80px; right: 80px; bottom: 310px; display: flex; justify-content: space-between; align-items: baseline; font-family: 'IBM Plex Mono', monospace; font-size: 26px; color: rgba(244,238,228,.6); letter-spacing: .06em; }
  .foot .brand { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 30px; color: #F4EEE4; letter-spacing: .06em; }
  .foot .brand i { font-style: normal; color: #C6AC8F; }
</style></head><body>
<div class="photo"></div><div class="veil"></div><div class="wrap">
  <div class="eyebrow">Mythe · Vérité</div>
  <div class="strike">« Mon assurance collective me suffit. »</div>
  <h1>Elle part <em>quand vous partez.</em></h1>
  <div class="sub">Et souvent, elle ne suffit même pas. Nouvelle publication en 4 diapositives sur notre profil.</div>
  <div class="box">
    <div class="t">Révision sans frais de votre collective</div>
    <div class="l">Écrivez <strong>COLLECTIVE</strong> en message</div>
    <div class="m">ou prenez rendez-vous par le lien dans notre profil.</div>
  </div>
</div>
<div class="foot"><span>jccapital.ca</span><span class="brand">JC CAPITAL <i>•</i></span></div>
</body></html>`;
fs.writeFileSync(path.join(out, '2026-11-12-mythe-collective-story.html'), fr(html));
console.log('story générée dans ' + out);
