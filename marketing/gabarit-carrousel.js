// Gabarit carrousel 1080x1350 (2026-10-29) : diapositives typographiques aux couleurs JC Capital,
// à la suite d'une couverture photo du gabarit v2. Usage : node gabarit-carrousel.js <fichier.json> <dossier-sortie>
const fs = require('fs');
const path = require('path');
const [, , src, outDir] = process.argv;
const deck = JSON.parse(fs.readFileSync(src, 'utf8'));

const css = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1350px; overflow: hidden; }
  body { font-family: 'Outfit', sans-serif; color: #F4EEE4; background: #0C1417; position: relative; }
  .bg { position: absolute; inset: 0; background:
      radial-gradient(120% 70% at 100% 0%, rgba(198,172,143,.16) 0%, rgba(198,172,143,0) 55%),
      linear-gradient(180deg, #13212A 0%, #0C1417 100%); }
  .wrap { position: absolute; inset: 0; padding: 96px 88px 150px; display: flex; flex-direction: column; }
  .eyebrow { font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 30px; letter-spacing: .22em; text-transform: uppercase; color: #C6AC8F; }
  .rule { width: 120px; height: 3px; background: #C6AC8F; margin: 36px 0 52px; }
  h2 { font-weight: 800; font-size: 96px; line-height: 1; letter-spacing: -.03em; text-wrap: balance; }
  h2 em { font-style: normal; color: #C6AC8F; }
  .big { font-weight: 800; font-size: 210px; line-height: .9; letter-spacing: -.04em; color: #C6AC8F; margin: 8px 0 18px; }
  p.lead { margin-top: 40px; font-size: 44px; line-height: 1.28; font-weight: 500; color: rgba(244,238,228,.92); max-width: 900px; }
  ul { list-style: none; margin-top: 56px; display: flex; flex-direction: column; gap: 34px; }
  li { display: grid; grid-template-columns: 70px 1fr; gap: 18px; align-items: baseline; font-size: 46px; line-height: 1.22; font-weight: 500; }
  li b { font-family: 'IBM Plex Mono', monospace; font-weight: 500; font-size: 34px; color: #C6AC8F; }
  li span small { display: block; margin-top: 8px; font-size: 34px; color: rgba(244,238,228,.68); font-weight: 400; }
  .cta { margin-top: auto; border-top: 2px solid rgba(198,172,143,.45); padding-top: 40px; font-size: 44px; line-height: 1.3; font-weight: 500; }
  .cta strong { color: #C6AC8F; font-weight: 700; }
  .note { margin-top: auto; font-size: 28px; line-height: 1.35; color: rgba(244,238,228,.55); }
  .foot { position: absolute; left: 88px; right: 88px; bottom: 52px; display: flex; justify-content: space-between; align-items: baseline; font-family: 'IBM Plex Mono', monospace; font-size: 26px; color: rgba(244,238,228,.55); letter-spacing: .06em; }
  .foot .brand { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 30px; color: #F4EEE4; letter-spacing: .06em; }
  .foot .brand i { font-style: normal; color: #C6AC8F; }
  .swipe { font-family: 'IBM Plex Mono', monospace; color: #C6AC8F; }
`;

const page = (s, i, n) => `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;800&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<style>${css}</style></head><body><div class="bg"></div><div class="wrap">
${s.eyebrow ? `<div class="eyebrow">${s.eyebrow}</div><div class="rule"></div>` : ''}
${s.big ? `<div class="big">${s.big}</div>` : ''}
${s.h2 ? `<h2>${s.h2}</h2>` : ''}
${s.lead ? `<p class="lead">${s.lead}</p>` : ''}
${s.items ? `<ul>${s.items.map((it, k) => `<li><b>${String(k + 1).padStart(2, '0')}</b><span>${it}</span></li>`).join('')}</ul>` : ''}
${s.cta ? `<div class="cta">${s.cta}</div>` : ''}
${s.note ? `<div class="note">${s.note}</div>` : ''}
</div><div class="foot"><span>${i + 1} / ${n}${i + 1 < n ? ' <span class="swipe">→</span>' : ''}</span><span class="brand">JC CAPITAL <i>•</i></span></div></body></html>`;

fs.mkdirSync(outDir, { recursive: true });
const n = deck.slides.length + (deck.cover ? 1 : 0);
deck.slides.forEach((s, k) => {
  const i = k + (deck.cover ? 1 : 0);
  fs.writeFileSync(path.join(outDir, `${deck.id}-${String(i + 1).padStart(2, '0')}.html`), page(s, i, n));
});
console.log(`${deck.id} : ${deck.slides.length} diapositives générées`);
