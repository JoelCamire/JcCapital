// ============================================================
// JC Planner — integration / interaction test
// Boots the app via jsdom, navigates every view, fuzzes inputs,
// tests store ops and empty-client stress. Reports all failures.
// ============================================================

// ---------- jsdom global shim (copied from harness.mjs) ----------
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><body data-theme="light"><div id="app"></div></body>', { url: 'http://localhost/app/' });
for (const k of ['document', 'DOMParser', 'Node', 'HTMLElement', 'localStorage', 'FileReader', 'Blob', 'URL', 'getComputedStyle', 'location']) {
  try { globalThis[k] = dom.window[k]; } catch (e) {}
}
globalThis.window = dom.window;
globalThis.addEventListener = dom.window.addEventListener.bind(dom.window);

// Guard window.print and download-related APIs as no-ops
dom.window.print = () => {};
if (!dom.window.URL.createObjectURL) dom.window.URL.createObjectURL = () => 'blob:mock';
if (!dom.window.URL.revokeObjectURL) dom.window.URL.revokeObjectURL = () => {};

// ---------- imports ----------
const { setLang } = await import('../src/i18n.js');
const { store } = await import('../src/state/store.js');
const { getJurisdiction, COUNTRY_LIST, JURISDICTIONS } = await import('../src/jurisdictions/index.js');
const M = await import('../src/state/models.js');

// VIEWS list (from harness.mjs)
const VIEWS = ['crmdash', 'clients', 'pipeline', 'tasks', 'activities', 'relation', 'clienttimeline', 'crmsheet', 'calendar', 'revenue', 'referrals', 'segments', 'kyc',
  'dashboard', 'healthcheck', 'profile', 'client', 'networth', 'nwtracker', 'cashflow', 'budget', 'debt',
  'business', 'succession', 'empbenefits', 'flowthrough', 'insurancestrat', 'advstructures', 'equity', 'realestate',
  'rentbuy', 'crypto', 'portfolio', 'feecompare', 'retirement', 'decumulation', 'montecarlo', 'scenarios',
  'strategycompare', 'tax', 'multitax', 'optimize', 'benefits', 'insurance', 'insurancecompare', 'philanthropy',
  'crossborder', 'emigration', 'goals', 'education', 'rdsp', 'ltc', 'timeline', 'estate', 'compliance', 'toolbox',
  'incorporation', 'selfemployed', 'farm', 'sred', 'treasury', 'borrowing', 'reports', 'settings'];

// Pre-load all view modules
const viewMods = {};
for (const v of VIEWS) viewMods[v] = await import(`../src/ui/views/${v}.js`);

// ---------- counters & failure log ----------
let boots = 0, navigations = 0, interactions = 0, storeOps = 0;
const failures = [];
function fail(ctx, err) {
  const stack = (err && err.stack) ? err.stack.split('\n').slice(0, 3).join(' | ') : String(err);
  failures.push({ ctx, msg: err && err.message ? err.message : String(err), stack });
}

// ---------- helpers ----------
function dispatchHashChange() {
  const ev = new dom.window.Event('hashchange');
  dom.window.dispatchEvent(ev);
}

function navTo(hash) {
  try { dom.window.location.hash = '#' + hash; } catch(e) {}
  dispatchHashChange();
}

function renderView(viewName, clientOverride) {
  const client = clientOverride || store.activeClient();
  const jur = getJurisdiction(client.jurisdiction.country, client.jurisdiction.region);
  return viewMods[viewName].render({ store, client, jur, navigate: () => {} });
}

// ---------- TEST 1: Boot ----------
console.log('=== TEST 1: Boot ===');
try {
  // Set initial hash before importing main
  try { dom.window.location.hash = '#dashboard'; } catch(e) {}
  await import('../src/main.js');
  dispatchHashChange();

  const shell = document.querySelector('.shell');
  const navItems = document.querySelectorAll('.nav-item');
  const content = document.querySelector('.content');

  if (!shell) {
    fail('boot:.shell-missing', new Error('.shell element not found after main.js import'));
  } else {
    boots++;
  }

  if (navItems.length !== VIEWS.length) {
    fail('boot:nav-item-count', new Error(`Expected ${VIEWS.length} .nav-item (one per view), found ${navItems.length}`));
  } else {
    boots++;
  }

  if (!content || content.children.length < 1) {
    fail('boot:content-empty', new Error(`.content has ${content ? content.children.length : 'null'} children, expected >= 1`));
  } else {
    boots++;
  }

  console.log(`  shell: ${!!shell}, nav-items: ${navItems.length}, content-children: ${content ? content.children.length : 0}`);
} catch (e) {
  fail('boot:import-main', e);
}

// ---------- TEST 2: Navigate every view (FR then EN) ----------
console.log('=== TEST 2: Navigate every view ===');

for (const lang of ['fr', 'en']) {
  setLang(lang);
  for (const v of VIEWS) {
    try {
      navTo(v);
      const content = document.querySelector('.content');
      if (!content) {
        fail(`navigate:${lang}:${v}`, new Error('.content not found'));
      } else if (content.children.length < 1) {
        fail(`navigate:${lang}:${v}`, new Error(`.content has 0 children after navigating to ${v}`));
      } else {
        navigations++;
      }
    } catch (e) {
      fail(`navigate:${lang}:${v}`, e);
    }
  }
}
console.log(`  navigations ok so far: ${navigations}`);

// ---------- TEST 3: Interaction fuzz per view ----------
console.log('=== TEST 3: Interaction fuzz ===');

// Build a rich client to exercise all inputs
function buildRichClient() {
  const c = M.newClient('Fuzz', 'CA', 'QC');
  const m0 = c.members[0]; m0.currentAge = 45; m0.retirementAge = 65; m0.lifeExpectancy = 92;
  c.filingStatus = 'married';
  const spouse = M.newMember({ name: 'Spouse', role: 'spouse', currentAge: 43, retirementAge: 65, lifeExpectancy: 94 });
  c.members.push(spouse);
  c.incomes = [M.newIncome({ memberId: m0.id, type: 'employment', amount: 95000 })];
  c.expenses = [M.newExpense({ amount: 60000, retirementFactor: 0.8 })];
  c.assets = [
    M.newAsset({ ownerId: m0.id, type: 'rrsp', value: 250000, costBasis: 250000, annualContribution: 10000 }),
    M.newAsset({ ownerId: m0.id, type: 'tfsa', value: 80000, costBasis: 80000, annualContribution: 5000 }),
    M.newAsset({ ownerId: m0.id, type: 'nonreg', value: 120000, costBasis: 84000 }),
    M.newAsset({ ownerId: m0.id, type: 'realestate', value: 600000, costBasis: 420000, growth: 0.03 }),
  ];
  // newLiability may not exist in models.js – create manually if needed
  const newLiab = M.newLiability || ((over) => ({
    id: M.uid(), type: 'mortgage', label: 'Hypothèque', balance: 300000, rate: 0.05, payment: 1800, amortization: 25, ...over
  }));
  c.liabilities = [newLiab({ type: 'mortgage', balance: 300000, rate: 0.05, payment: 1800 })];
  c.dependents = [M.newDependent({ name: 'Child', age: 10, educationGoalAge: 18 })];
  const newGoal = M.newGoal || ((over) => ({
    id: M.uid(), type: 'retirement', label: 'Retraite', amount: 60000, targetAge: 65, priority: 'high', ...over
  }));
  c.goals = [newGoal({ type: 'retirement', amount: 60000, targetAge: 65 })];
  c.business = M.newBusiness({ ownerId: m0.id, name: 'Test Inc', activeIncome: 250000, passiveIncome: 30000, retainedEarnings: 200000, corpInvestments: 150000 });
  return c;
}

const richClient = buildRichClient();

// Titles/text that indicate unsafe buttons (printing, downloading, modals)
const UNSAFE_PATTERNS = ['imprimer', 'print', 'download', 'télécharger', 'pdf', 'exporter en', 'export pdf'];

function isSafeButton(btn) {
  const text = (btn.textContent || '').toLowerCase().trim();
  const title = (btn.getAttribute('title') || '').toLowerCase();
  // Skip if button triggers print/download
  if (UNSAFE_PATTERNS.some(p => title.includes(p) || text.includes(p))) return false;
  return true;
}

setLang('fr');
for (const v of VIEWS) {
  const container = document.createElement('div');
  try {
    const node = renderView(v, richClient);
    if (!node) { fail(`fuzz:${v}:render-null`, new Error('render returned null/undefined')); continue; }
    container.appendChild(node);

    // Fuzz range and number inputs
    const inputs = container.querySelectorAll('input[type=range], input[type=number]');
    for (const inp of inputs) {
      const rawMin = parseFloat(inp.min);
      const rawMax = parseFloat(inp.max);
      const minVal = isFinite(rawMin) ? rawMin : 0;
      const maxVal = isFinite(rawMax) ? rawMax : (inp.type === 'range' ? 100 : 1000000);
      const midVal = (minVal + maxVal) / 2;
      const testVals = inp.type === 'range'
        ? [String(minVal), String(maxVal), String(midVal)]
        : ['0', '-5', '1000000', '', 'abc', String(midVal)];

      for (const val of testVals) {
        try {
          inp.value = val;
          inp.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
          inp.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
          if (!container.childNodes.length) throw new Error('container lost childNodes after input event');
          interactions++;
        } catch (e) {
          fail(`fuzz:${v}:input[${inp.type}]:val=${val}`, e);
        }
      }
    }

    // Fuzz selects — pick each option
    const selects = container.querySelectorAll('select');
    for (const sel of selects) {
      const options = Array.from(sel.options);
      for (const opt of options) {
        try {
          sel.value = opt.value;
          sel.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
          sel.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
          if (!container.childNodes.length) throw new Error('container lost childNodes after select change');
          interactions++;
        } catch (e) {
          fail(`fuzz:${v}:select:opt=${opt.value}`, e);
        }
      }
    }

    // Click in-page safe buttons
    const buttons = container.querySelectorAll('button');
    for (const btn of buttons) {
      if (!isSafeButton(btn)) continue;
      try {
        btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
        if (!container.childNodes.length) throw new Error('container lost childNodes after button click');
        interactions++;
      } catch (e) {
        fail(`fuzz:${v}:button["${(btn.textContent||'').slice(0,25).trim()}"]`, e);
      }
    }

    if (!container.childNodes.length) {
      fail(`fuzz:${v}:container-empty-after-fuzz`, new Error('container has no childNodes after fuzzing'));
    }

  } catch (e) {
    fail(`fuzz:${v}`, e);
  }
}
console.log(`  interactions ok so far: ${interactions}`);

// ---------- TEST 4: Store interactions ----------
console.log('=== TEST 4: Store interactions ===');

// setJurisdiction for ALL country/region pairs, re-render key views
const KEY_VIEWS_JUR = ['dashboard', 'business', 'tax', 'healthcheck', 'networth'];
const ALL_JURIS = [];
for (const country of Object.keys(JURISDICTIONS)) {
  for (const region of Object.keys(JURISDICTIONS[country].regions)) {
    ALL_JURIS.push([country, region]);
  }
}

for (const [country, region] of ALL_JURIS) {
  try {
    store.setJurisdiction(country, region);
    storeOps++;
  } catch (e) {
    fail(`store:setJurisdiction:${country}/${region}`, e);
    continue;
  }
  for (const v of KEY_VIEWS_JUR) {
    try {
      const node = renderView(v);
      if (!node || !node.nodeType) throw new Error('no node returned');
      storeOps++;
    } catch (e) {
      fail(`store:setJurisdiction:${country}/${region}:render:${v}`, e);
    }
  }
}

// Reset to CA/QC
try { store.setJurisdiction('CA', 'QC'); } catch(e) {}

// toggleTheme twice
for (let i = 0; i < 2; i++) {
  try { store.toggleTheme(); storeOps++; } catch (e) { fail(`store:toggleTheme:${i}`, e); }
}

// setLang fr/en/fr, re-render dashboard each time
for (const lang of ['fr', 'en', 'fr']) {
  try {
    setLang(lang);
    const node = renderView('dashboard');
    if (!node || !node.nodeType) throw new Error('no node returned');
    storeOps++;
  } catch (e) {
    fail(`store:setLang:${lang}:render:dashboard`, e);
  }
}

// addClient('X','US','NY') then render 'profile'
try {
  store.addClient('X', 'US', 'NY');
  storeOps++;
  const node = renderView('profile');
  if (!node || !node.nodeType) throw new Error('no node returned');
  storeOps++;
} catch (e) {
  fail('store:addClient:US/NY:render:profile', e);
}

// store.update: push new income and new asset, re-render cashflow, networth, dashboard
try {
  store.update(c => {
    c.incomes.push(M.newIncome({ memberId: c.members[0].id, type: 'rental', amount: 24000 }));
    c.assets.push(M.newAsset({ ownerId: c.members[0].id, type: 'nonreg', value: 50000, costBasis: 40000 }));
  });
  storeOps++;
} catch (e) {
  fail('store:update:push-income-asset', e);
}

for (const v of ['cashflow', 'networth', 'dashboard']) {
  try {
    const node = renderView(v);
    if (!node || !node.nodeType) throw new Error('no node returned');
    storeOps++;
  } catch (e) {
    fail(`store:update-after:render:${v}`, e);
  }
}

// exportJSON -> importJSON round-trip -> re-render dashboard
try {
  const json = store.exportJSON();
  if (typeof json !== 'string' || !json.includes('"clients"')) throw new Error('exportJSON invalid');
  storeOps++;
  const ok = store.importJSON(json);
  if (!ok) throw new Error('importJSON returned false');
  storeOps++;
  const node = renderView('dashboard');
  if (!node || !node.nodeType) throw new Error('no node returned');
  storeOps++;
} catch (e) {
  fail('store:export->import->render:dashboard', e);
}

console.log(`  store-ops ok so far: ${storeOps}`);

// ---------- TEST 5: Empty-client stress ----------
console.log('=== TEST 5: Empty-client stress ===');

let emptyViewOk = 0;

try {
  store.addClient('Empty', 'CA', 'QC');
} catch (e) {
  fail('empty-stress:addClient', e);
}

// Force the active client to be completely empty
try {
  store.update(c => {
    c.incomes = [];
    c.expenses = [];
    c.assets = [];
    c.liabilities = [];
    c.goals = [];
    c.dependents = [];
    c.beneficiaries = [];
    c.documents = [];
    c.contacts = [];
    c.snapshots = [];
    c.business = null;
  });
} catch (e) {
  fail('empty-stress:clear-client', e);
}

const emptyClient = store.activeClient();
setLang('fr');

for (const v of VIEWS) {
  try {
    const node = renderView(v, emptyClient);
    if (!node || !node.nodeType) throw new Error('no node returned');
    emptyViewOk++;
  } catch (e) {
    fail(`empty-stress:${v}`, e);
  }
}
console.log(`  empty-client views ok: ${emptyViewOk}/${VIEWS.length}`);

// ---------- FINAL REPORT ----------
console.log('\n==============================');
console.log(`Boots:ok, navigations:${navigations}, interactions:${interactions}, store-ops:${storeOps}, failures:${failures.length}`);

if (failures.length === 0) {
  console.log('\n✓ ALL TESTS PASSED — zero failures');
} else {
  // Deduplicate: same ctx+msg = one entry
  const deduped = [];
  const seenKeys = new Set();
  for (const f of failures) {
    const key = `${f.ctx}|||${f.msg}`;
    if (!seenKeys.has(key)) { seenKeys.add(key); deduped.push(f); }
  }
  console.log(`\n--- FAILURES (${deduped.length} distinct) ---`);
  deduped.forEach((f, i) => {
    const topLine = (f.stack || '').split(' | ')[0].trim();
    console.log(`  [${i+1}] ${f.ctx}`);
    console.log(`       MSG: ${f.msg}`);
    if (topLine && !topLine.startsWith('Error:') && topLine !== f.msg) {
      console.log(`       AT:  ${topLine.slice(0, 120)}`);
    }
  });
}

process.exit(failures.length ? 1 : 0);
