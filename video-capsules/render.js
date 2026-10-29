// Orchestrateur : petit serveur HTTP local (127.0.0.1) + Chrome headless (profil temporaire).
// Usage :
//   node render.js record celi            -> enregistre 2026-capsule-celi.mp4 (ou .webm)
//   node render.js frames celi 2,20,end   -> PNG de la timeline source
//   node render.js verify 2026-capsule-celi.mp4 2,20,end -> durée + PNG extraits de la vidéo
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const OUT = __dirname;                       // video-capsules/
const ROOT = path.resolve(__dirname, '..');  // racine du dépôt (pour ../img/final_logo.png)
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const [mode, arg1, arg2] = process.argv.slice(2);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.css': 'text/css' };

let chrome = null, finished = false;
const results = [];
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  if (req.method === 'POST') {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      if (u.pathname === '/upload') {
        const name = path.basename(u.searchParams.get('name'));
        fs.writeFileSync(path.join(OUT, name), body);
        console.log(`[écrit] ${name} (${body.length} octets)`);
        results.push(name);
      } else if (u.pathname === '/log') {
        console.log('[page] ' + body.toString('utf8'));
      } else if (u.pathname === '/done') {
        console.log('[fin] ' + body.toString('utf8'));
        finish(0);
      }
      res.writeHead(200); res.end('ok');
    });
    return;
  }
  let p = decodeURIComponent(u.pathname);
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  const stat = fs.statSync(file);
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m[1] ? parseInt(m[1]) : 0, end = m[2] ? parseInt(m[2]) : stat.size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
    fs.createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  }
});

function finish(code) {
  if (finished) return; finished = true;
  setTimeout(() => {
    try { if (chrome) chrome.kill(); } catch (e) {}
    server.close();
    setTimeout(() => process.exit(code), 800);
  }, 300);
}

server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  let url;
  if (mode === 'record') url = `/video-capsules/capsule.html?v=${arg1}&record=1`;
  else if (mode === 'frames') url = `/video-capsules/capsule.html?v=${arg1}&frames=${arg2 || '2,20,end'}`;
  else if (mode === 'verify') url = `/video-capsules/verify.html?file=${encodeURIComponent(arg1)}&t=${arg2 || '2,20,end'}`;
  else if (mode === 'sheet') url = `/video-capsules/verify.html?file=${encodeURIComponent(arg1)}&sheet=1&t=${arg2}`;
  else if (mode === 'audio') url = '/video-capsules/musique.html';
  else if (mode === 'probe') url = `/video-capsules/verify.html?probe=1`;
  else { console.error('mode inconnu'); process.exit(2); }
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'jc-capsule-'));
  const args = ['--headless=new', '--autoplay-policy=no-user-gesture-required', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--mute-audio', '--disable-extensions',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--window-size=1080,1920', '--force-device-scale-factor=1', '--hide-scrollbars',
    `http://127.0.0.1:${port}${url}`];
  console.log('[chrome] ' + url);
  chrome = spawn(CHROME, args, { stdio: 'ignore' });
  chrome.on('exit', c => { if (!finished) { console.log('[chrome] quitté ' + c); finish(1); } });
  const limit = mode === 'record' ? 180000 : 60000;
  setTimeout(() => { console.log('[délai dépassé]'); finish(3); }, limit);
});
process.on('exit', () => { try { if (chrome) chrome.kill(); } catch (e) {} });
