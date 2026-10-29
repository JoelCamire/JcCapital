// Bannières de profils (2026-10-29) : LinkedIn perso, page LinkedIn, YouTube. Logo à droite (la photo de profil couvre la gauche).
const fs = require('fs');
const logo = 'file:///' + process.argv[2];
const B = [
  { id: 'linkedin-perso', w: 1584, h: 396, logoH: 150, pad: '0 90px 0 0', tag: 'Protection et stratégie financière<br>pour entrepreneurs, autonomes et producteurs agricoles', tagSize: 30, sub: 'Chaudière-Appalaches · Québec', align: 'flex-end' },
  { id: 'linkedin-page', w: 1128, h: 191, logoH: 82, pad: '0 56px 0 0', tag: 'Protection et stratégie financière pour entrepreneurs', tagSize: 19, sub: 'Joël Camiré, conseiller en sécurité financière · SFL Gestion de patrimoine', align: 'flex-end' },
  { id: 'youtube', w: 2560, h: 1440, logoH: 230, pad: '0', tag: 'Protection et stratégie financière pour entrepreneurs, autonomes et producteurs agricoles', tagSize: 44, sub: 'Chaudière-Appalaches · Québec · jccapital.ca', align: 'center' },
];
for (const b of B) fs.writeFileSync(`${b.id}.html`, `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;700&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:${b.w}px;height:${b.h}px;overflow:hidden}
body{font-family:Outfit,sans-serif;color:#F4EEE4;background:radial-gradient(90% 140% at 100% 0%,rgba(198,172,143,.18) 0%,rgba(198,172,143,0) 60%),linear-gradient(115deg,#0C1417 0%,#16262E 55%,#22333B 100%);position:relative}
.lines{position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(198,172,143,.05) 0 2px,transparent 2px ${Math.round(b.h/6)}px)}
.wrap{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:${b.align};text-align:${b.align==='center'?'center':'right'};padding:${b.pad};gap:${Math.round(b.logoH*.16)}px}
img{height:${b.logoH}px}
.tag{font-size:${b.tagSize}px;font-weight:500;line-height:1.25;max-width:${Math.round(b.w*.62)}px}
.sub{font-family:'IBM Plex Mono',monospace;font-size:${Math.round(b.tagSize*.62)}px;letter-spacing:.14em;text-transform:uppercase;color:#C6AC8F}
</style></head><body><div class="lines"></div><div class="wrap"><img src="${logo}"><div class="tag">${b.tag}</div><div class="sub">${b.sub}</div></div></body></html>`);
console.log(B.map(b => `${b.id} ${b.w} ${b.h}`).join('\n'));
