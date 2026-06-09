// ============================================================
// JC Planner — cloud-sync end-to-end test
// Mocks the GitHub Gist API in memory and simulates TWO devices
// (separate localStorage, shared "cloud") to prove push / pull /
// merge / newest-wins / gist-recreate / bad-token all work.
//
// Run from app/:  printf '{"type":"module"}' > package.json \
//   && node test/synctest.mjs ; rm -f package.json
// ============================================================
let CLOUD = {};            // shared gist store: id -> { content }
let gistCounter = 0;
const FILENAME = 'jc-planner-clients.json';

// ---- in-memory localStorage factory (one per simulated device) ----
function makeLS(seed = {}) {
  const s = { ...seed };
  return { getItem: k => (k in s ? s[k] : null), setItem: (k, v) => { s[k] = String(v); }, removeItem: k => { delete s[k]; }, _dump: () => ({ ...s }) };
}

// ---- GitHub Gist API mock ----
function installFetch() {
  globalThis.fetch = async (url, opts = {}) => {
    const method = (opts.method || 'GET').toUpperCase();
    const auth = (opts.headers && (opts.headers.Authorization || opts.headers.authorization)) || '';
    const ok = (status, obj, text) => ({ ok: status < 400, status, json: async () => obj, text: async () => (text ?? JSON.stringify(obj)) });
    if (url.startsWith('https://raw/')) { const id = url.split('/').pop(); return ok(200, null, CLOUD[id]?.content || ''); }
    if (auth !== 'Bearer GOOD') return ok(401, { message: 'Bad credentials' });
    // list
    if (/\/gists\?/.test(url)) return ok(200, Object.keys(CLOUD).map(id => ({ id, files: { [FILENAME]: {} } })));
    // create
    if (method === 'POST' && /\/gists$/.test(url)) { const id = 'gist' + (++gistCounter); const body = JSON.parse(opts.body); CLOUD[id] = { content: body.files[FILENAME].content }; return ok(201, { id }); }
    const m = url.match(/\/gists\/([^/?]+)/);
    if (m) {
      const id = m[1];
      if (method === 'PATCH') { if (!CLOUD[id]) return ok(404, { message: 'Not Found' }); CLOUD[id] = { content: JSON.parse(opts.body).files[FILENAME].content }; return ok(200, { id }); }
      if (method === 'GET') { if (!CLOUD[id]) return ok(404, { message: 'Not Found' }); return ok(200, { id, files: { [FILENAME]: { content: CLOUD[id].content, truncated: false } } }); }
    }
    return ok(404, { message: 'unmatched ' + method + ' ' + url });
  };
}

const results = []; let pass = 0, fail = 0;
function check(name, cond) { results.push((cond ? '  ✓ ' : '  ✗ ') + name); cond ? pass++ : fail++; }

// fresh module instances per device via cache-busting query
let q = 0;
async function loadDevice(ls) {
  globalThis.localStorage = ls;
  const tag = '?dev=' + (++q);
  const store = (await import('../src/state/store.js' + tag)).store;
  const sync = (await import('../src/sync.js' + tag)).sync;
  return { store, sync };
}

const flush = () => new Promise(r => setTimeout(r, 320)); // let store.persist() debounce fire

installFetch();
globalThis.document = { documentElement: {}, body: { dataset: {} } };

// ---------- Device A: create clients, connect, push ----------
const lsA = makeLS();
let A = await loadDevice(lsA);
A.store.state.clients = []; // start clean
A.store.addClient('Client Alpha', 'CA', 'QC');
A.store.addClient('Client Bravo', 'CA', 'ON');
A.sync.setToken('GOOD');
check('A: token configured', A.sync.configured);
await A.sync.test();
await flush(); await A.sync.push(A.store.exportJSON());
check('A: gist created (id stored)', !!A.sync.gistId);
check('A: cloud has 1 gist', Object.keys(CLOUD).length === 1);

// ---------- Device B: fresh, connect, pull ----------
const lsB = makeLS();
let B = await loadDevice(lsB);
B.store.state.clients = []; // brand-new device, empty
B.sync.setToken('GOOD');
const remoteB = await B.sync.pull();
check('B: found existing gist by search (no id yet)', !!remoteB);
const mB = B.store.mergeJSON(remoteB);
check('B: pulled both clients from cloud', mB.total === 2);
check('B: has "Client Alpha"', B.store.state.clients.some(c => c.name === 'Client Alpha'));
check('B: has "Client Bravo"', B.store.state.clients.some(c => c.name === 'Client Bravo'));

// ---------- Device B: edit Alpha (newer), add Charlie, push ----------
const alphaB = B.store.state.clients.find(c => c.name === 'Client Alpha');
B.store.setActive(alphaB.id);
B.store.update(c => { c.name = 'Client Alpha (modifié par B)'; });   // bumps updatedAt
B.store.addClient('Client Charlie', 'US', 'NY');
await B.sync.push(B.store.exportJSON());
check('B: cloud still single gist (updated in place)', Object.keys(CLOUD).length === 1);

// ---------- Device A: come back, pull, merge ----------
await flush();
A = await loadDevice(lsA);   // reload A from its persisted localStorage
check('A: reloaded 2 local clients', A.store.state.clients.length === 2);
const remoteA = await A.sync.pull();
const mA = A.store.mergeJSON(remoteA);
check('A: now has 3 clients after merge (no loss)', A.store.state.clients.length === 3);
check('A: Charlie synced from B', A.store.state.clients.some(c => c.name === 'Client Charlie'));
check('A: Alpha shows B’s newer edit (newest-wins)', A.store.state.clients.some(c => c.name === 'Client Alpha (modifié par B)'));
check('A: Bravo still present', A.store.state.clients.some(c => c.name === 'Client Bravo'));

// ---------- newest-wins both directions ----------
const bravoA = A.store.state.clients.find(c => c.name === 'Client Bravo');
A.store.setActive(bravoA.id);
A.store.update(c => { c.name = 'Bravo (édité par A en dernier)'; });
await A.sync.push(A.store.exportJSON());
await flush();
B = await loadDevice(lsB);
const r2 = await B.sync.pull(); B.store.mergeJSON(r2);
check('B: receives A’s latest Bravo edit', B.store.state.clients.some(c => c.name === 'Bravo (édité par A en dernier)'));

// ---------- bad token ----------
const lsC = makeLS(); const C = await loadDevice(lsC); C.sync.setToken('WRONG');
let badThrew = false; try { await C.sync.test(); } catch (e) { badThrew = e.message === 'bad-token'; }
check('Bad token rejected with bad-token', badThrew);

// ---------- gist deleted -> recreate on push ----------
await flush();
A = await loadDevice(lsA);
delete CLOUD[A.sync.gistId];                 // simulate the gist being deleted
await A.sync.push(A.store.exportJSON());      // should recreate
check('Push recreates gist if deleted (404)', !!A.sync.gistId && !!CLOUD[A.sync.gistId]);

// ---------- truncated content -> raw_url fallback ----------
globalThis.fetch = (orig => async (url, opts) => {
  const m = url.match(/\/gists\/([^/?]+)$/);
  if (m && (opts?.method || 'GET') === 'GET') { const id = m[1]; if (CLOUD[id]) return { ok: true, status: 200, json: async () => ({ id, files: { [FILENAME]: { content: '', truncated: true, raw_url: 'https://raw/' + id } } }) }; }
  return orig(url, opts);
})(globalThis.fetch);
const rt = await A.sync.pull();
check('Truncated gist falls back to raw_url', !!rt && JSON.parse(rt).clients.length >= 1);

console.log('\n===== Cloud-sync end-to-end test =====');
results.forEach(r => console.log(r));
console.log(`\n${fail === 0 ? '✓ ALL SYNC TESTS PASSED' : '✗ ' + fail + ' FAILED'}  (${pass}/${pass + fail})`);
process.exit(fail ? 1 : 0);
