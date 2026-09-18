// ============================================================
// Central reactive store with localStorage persistence.
// normalize() is the ONE migration/consistency pass: every client
// loaded, imported, merged or mutated goes through syncDerived() so
// derived fields can never drift from their source of truth:
//   • member/dependent ages ⇐ date of birth (always current)
//   • filingStatus ⇐ household.maritalStatus
//   • household.country/region ⇐ jurisdiction
//   • legacy insurance[] ⇒ products[] (policies) — products is the SoT,
//     insurance[] is rebuilt as a read-only mirror for legacy readers
//   • investment products ⇔ assets (AUM = linked asset value)
//   • assumptions filled with defaults
// ============================================================
import { seedClients, newClient, newProduct, newAsset, defaultAssumptions, INSURANCE_TO_KIND, KIND_TO_INSURANCE, INSURANCE_KINDS, INVESTMENT_KINDS, isActiveProduct, annualPremium } from './models.js';

const KEY = 'jc_planner_v1';
const THEME_KEY = 'jc_planner_theme';
const GOALS_KEY = 'jc_crm_goals';

function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob); if (isNaN(d)) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a >= 0 && a < 130 ? a : null;
}

/** Recompute every derived field from its source of truth (idempotent, cheap). */
export function syncDerived(c) {
  // ages from dates of birth
  for (const m of c.members || []) { const a = ageFromDob(m.dob); if (a != null) m.currentAge = a; }
  for (const d of c.dependents || []) { const a = ageFromDob(d.dob); if (a != null) d.age = a; }
  // marital status → filing status
  const ms = c.household?.maritalStatus;
  if (ms) c.filingStatus = (ms === 'married' || ms === 'common-law' || ms === 'commonlaw') ? 'married' : 'single';
  // jurisdiction is the geographic source of truth
  if (c.jurisdiction && c.household) { c.household.country = c.jurisdiction.country; c.household.region = c.jurisdiction.region; }
  // policies: products[] is the source of truth; migrate any legacy insurance[] rows not yet represented.
  // Each product may absorb AT MOST ONE legacy row, otherwise two identical policies on the
  // same life collapse into one (halving the coverage). Matching prefers the policy number.
  c.products = c.products || [];
  const claimed = new Set(c.products.filter(p => p.migratedFrom).map(p => p.migratedFrom));
  const usedProducts = new Set(c.products.filter(p => p.migratedFrom));
  for (const ins of (c.insurance || [])) {
    if (!ins || ins._mirror) continue;                       // rows we generated ourselves
    if (claimed.has(ins.id)) continue;                       // already migrated in a previous pass
    const kind = INSURANCE_TO_KIND[ins.type] || ins.type;
    const already = c.products.find(p => p.migratedFrom === ins.id);
    if (already) { claimed.add(ins.id); usedProducts.add(already); continue; }
    const byPolicy = ins.policyNumber
      ? c.products.find(p => !usedProducts.has(p) && p.kind === kind && p.policyNumber && p.policyNumber === ins.policyNumber)
      : null;
    const byFace = byPolicy || c.products.find(p => !usedProducts.has(p) && !p.migratedFrom && p.kind === kind && p.insuredId === ins.insuredId && Math.abs((+p.faceAmount || 0) - (+ins.coverage || 0)) < 1);
    if (byFace) { byFace.migratedFrom = ins.id; claimed.add(ins.id); usedProducts.add(byFace); continue; }
    const created = newProduct({ kind, insuredId: ins.insuredId ?? null, faceAmount: +ins.coverage || 0, premium: +ins.premium || 0, frequency: ins.frequency || 'annual', status: 'inforce', carrier: ins.carrier || '', policyNumber: ins.policyNumber || '', migratedFrom: ins.id, notes: ins.notes || '' });
    c.products.push(created); claimed.add(ins.id); usedProducts.add(created);
  }
  // rebuild the read-only mirror (same ids as the products so editors can round-trip)
  c.insurance = c.products.filter(p => INSURANCE_KINDS.includes(p.kind) && isActiveProduct(p) && KIND_TO_INSURANCE[p.kind])
    .map(p => ({ id: p.id, type: KIND_TO_INSURANCE[p.kind], insuredId: p.insuredId, coverage: +p.faceAmount || 0, premium: annualPremium(p), carrier: p.carrier, policyNumber: p.policyNumber, _mirror: true }));
  // Investment products ⇔ assets. The ASSET is the balance ledger; a product's `aum`
  // mirrors it. Rules, in order:
  //   • a dangling assetId (asset deleted by the advisor) clears the AUM too — otherwise
  //     the deleted account is recreated on the next save;
  //   • only ONE product may own an asset (duplicates would double-count the AUM);
  //   • an asset is created only for an ACTIVE product, and only when the owner has no
  //     unlinked investable account that could be the same money (importing an older
  //     file would otherwise create a second account and double net worth);
  //   • a manual edit of `aum` is written THROUGH to the asset instead of being discarded.
  c.assets = c.assets || [];
  const linkedAssets = new Set();
  for (const p of c.products) {
    if (!INVESTMENT_KINDS.includes(p.kind)) continue;
    if (p.assetId && !c.assets.find(a => a.id === p.assetId)) { p.assetId = null; p.aum = 0; }
    let dupLink = false;
    // Two products pointing at one account: the money is already counted once. Unlink the
    // duplicate and zero its AUM — never invent a second account for it.
    if (p.assetId && linkedAssets.has(p.assetId)) { p.assetId = null; p.aum = 0; dupLink = true; }
    if (!isActiveProduct(p)) { if (p.assetId) linkedAssets.add(p.assetId); continue; }
    if (!p.assetId && !dupLink) {
      const owner = p.insuredId ?? c.members?.[0]?.id ?? null;
      const free = (a) => !linkedAssets.has(a.id) && !c.products.some(q => q !== p && q.assetId === a.id);
      const sameOwner = (a) => (a.ownerId ?? c.members?.[0]?.id) === owner;
      const investable = (a) => a.type !== 'realestate';
      const exact = c.assets.find(a => free(a) && sameOwner(a) && investable(a) && (+p.aum || 0) > 0 && Math.abs((+a.value || 0) - (+p.aum || 0)) < 1);
      const loose = exact || c.assets.find(a => free(a) && sameOwner(a) && investable(a) && (+a.value || 0) > 0);
      if (loose) p.assetId = loose.id;
      else if ((+p.aum || 0) > 0) {
        const a = newAsset({ ownerId: owner, label: [p.carrier, p.policyNumber].filter(Boolean).join(' ') || 'Placement', type: 'nonreg', value: +p.aum, costBasis: +p.aum, annualContribution: 0 });
        c.assets.push(a); p.assetId = a.id;
      }
    }
    if (p.assetId) {
      linkedAssets.add(p.assetId);
      const a = c.assets.find(x => x.id === p.assetId);
      if (a) {
        const edited = Number.isFinite(+p.aum) && Math.abs((+p.aum) - (+a.value || 0)) > 0.5 && p._aumEdited;
        if (edited) { a.value = +p.aum; if (!(+a.costBasis > 0)) a.costBasis = +p.aum; }
        p.aum = +a.value || 0;
      }
      delete p._aumEdited;
    }
  }
  // assumptions: fill defaults, fix legacy key (the legacy value wins when the new key was never set)
  const raw = c.assumptions || {};
  const A = { ...defaultAssumptions(), ...raw };
  if (raw.rriffConvertAge != null && raw.rrifConvertAge == null) A.rrifConvertAge = raw.rriffConvertAge;
  delete A.rriffConvertAge;
  c.assumptions = A;
  c.calc = c.calc || {};
  return c;
}

/** Ensure clients loaded from an older schema have all current fields. */
export function normalize(c) {
  c.household = c.household || { address: '', city: '', region: c.jurisdiction?.region || '', postal: '', country: c.jurisdiction?.country || 'CA', maritalStatus: c.filingStatus || 'single', reviewDate: '', advisorNotes: '' };
  c.jurisdiction = c.jurisdiction || { country: 'CA', region: 'QC' };
  c.members = (c.members && c.members.length) ? c.members : [ { id: Math.random().toString(36).slice(2, 10), name: 'Titulaire', role: 'primary', currentAge: 40, retirementAge: 65, lifeExpectancy: 95 } ];
  c.incomes = c.incomes || []; c.expenses = c.expenses || []; c.assets = c.assets || []; c.liabilities = c.liabilities || []; c.goals = c.goals || []; c.insurance = c.insurance || [];
  c.dependents = c.dependents || [];
  c.beneficiaries = c.beneficiaries || [];
  c.documents = c.documents || [];
  c.contacts = c.contacts || [];
  c.snapshots = c.snapshots || [];
  // CRM layer (back-fill for clients created before the CRM existed)
  c.crm = c.crm || { lifecycle: 'client', source: '', referredBy: '', tags: [], rating: '', nextActionDate: '' };
  if (!Array.isArray(c.crm.tags)) c.crm.tags = [];
  delete c.crm.lastContactAt;                                  // derived (crm.lastTouch), never stored
  c.opportunities = c.opportunities || [];
  c.activities = c.activities || [];
  c.tasks = c.tasks || [];
  c.products = c.products || [];
  c.compliance = c.compliance || {};
  for (const l of c.liabilities) { if (l.extraPayment == null) l.extraPayment = 0; if (l.compounding === undefined) l.compounding = null; }
  c.updatedAt = c.updatedAt || c.createdAt || Date.now();
  c._rev = c._rev || 0;
  return syncDerived(c);
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw); (s.clients || []).forEach(normalize); return s; }
  } catch (e) { console.warn('Load failed', e); }
  const clients = seedClients().map(normalize);
  return { clients, activeId: clients[0].id };
}

const state = load();
state.theme = localStorage.getItem(THEME_KEY) || 'dark';
function loadGoals() { try { const g = JSON.parse(localStorage.getItem(GOALS_KEY) || 'null'); if (g) return g; } catch (e) {} return { year: new Date().getFullYear(), aum: 5000000, recurring: 40000, firstYear: 60000 }; }
state.crmGoals = loadGoals();
const subs = new Set();
let saveTimer = null;

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ clients: state.clients, activeId: state.activeId })); }
    catch (e) { console.warn('Save failed', e); }
  }, 250);
}
function notify() { subs.forEach(fn => fn(state)); }
function touch(c, bumpTime = true) { c._rev = (c._rev || 0) + 1; if (bumpTime) c.updatedAt = Date.now(); syncDerived(c); }

export const store = {
  get state() { return state; },
  subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },

  activeClient() { return state.clients.find(c => c.id === state.activeId) || state.clients[0]; },

  /** Mutate the active client via a function, then persist + notify. */
  update(mutator) {
    const c = this.activeClient();
    mutator(c); touch(c);
    persist(); notify();
  },
  /** Mutate the active client but DON'T re-render (live sliders / typing). Still persists and re-derives. */
  quietUpdate(mutator) { const c = this.activeClient(); mutator(c); touch(c); persist(); },

  /** Mutate a specific client by id (used by cross-client CRM views). */
  updateClient(id, mutator) {
    const c = state.clients.find(x => x.id === id); if (!c) return;
    mutator(c); touch(c);
    persist(); notify();
  },

  /** Mutate top-level store. */
  set(mutator) { mutator(state); persist(); notify(); },

  setActive(id) { state.activeId = id; persist(); notify(); },

  /** CRM annual sales goals (stored separately from client data). */
  setCrmGoals(g) { state.crmGoals = { ...state.crmGoals, ...g }; try { localStorage.setItem(GOALS_KEY, JSON.stringify(state.crmGoals)); } catch (e) {} notify(); },

  addClient(name, country, region) {
    const c = normalize(newClient(name, country, region));
    state.clients.push(c); state.activeId = c.id; persist(); notify();
    return c;
  },
  deleteClient(id) {
    state.clients = state.clients.filter(c => c.id !== id);
    if (!state.clients.length) { const c = normalize(newClient()); state.clients.push(c); }
    if (state.activeId === id) state.activeId = state.clients[0].id;
    persist(); notify();
  },
  duplicateClient(id) {
    const src = state.clients.find(c => c.id === id); if (!src) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = Math.random().toString(36).slice(2, 10);
    copy.name = src.name + ' (copie)';
    normalize(copy);
    state.clients.push(copy); state.activeId = copy.id; persist(); notify();
  },

  setJurisdiction(country, region) {
    this.update(c => { c.jurisdiction = { country, region }; });
  },

  toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, state.theme);
    document.body.dataset.theme = state.theme;
    notify();
  },

  exportJSON() {
    return JSON.stringify({ version: 2, exported: new Date().toISOString(), savedAt: this.latestUpdatedAt(), clients: state.clients }, null, 2);
  },
  importJSON(text) {
    const data = JSON.parse(text);
    if (Array.isArray(data.clients)) {
      data.clients.forEach(normalize);
      state.clients = data.clients;
      if (!state.clients.find(c => c.id === state.activeId)) state.activeId = data.clients[0]?.id;
      persist(); notify();
      return true;
    }
    return false;
  },
  /** Most recent updatedAt across all clients (used as a dataset version stamp). */
  latestUpdatedAt() { return state.clients.reduce((m, c) => Math.max(m, c.updatedAt || c.createdAt || 0), 0); },
  /** Merge a remote dataset into local by client id, keeping the newest version of each. */
  mergeJSON(text) {
    const data = JSON.parse(text);
    if (!Array.isArray(data.clients)) return false;
    const byId = new Map(state.clients.map(c => [c.id, c]));
    let added = 0, updated = 0;
    for (const r of data.clients) {
      normalize(r);
      const local = byId.get(r.id);
      if (!local) { byId.set(r.id, r); added++; }
      else if ((r.updatedAt || 0) > (local.updatedAt || 0)) { byId.set(r.id, r); updated++; }
    }
    state.clients = [...byId.values()];
    if (!state.clients.find(c => c.id === state.activeId)) state.activeId = state.clients[0]?.id;
    persist(); notify();
    return { added, updated, total: state.clients.length };
  },
};

document.body.dataset.theme = state.theme;
