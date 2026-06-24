// ============================================================
// Central reactive store with localStorage persistence
// ============================================================
import { seedClients, newClient } from './models.js';

const KEY = 'jc_planner_v1';
const THEME_KEY = 'jc_planner_theme';

/** Ensure clients loaded from an older schema have all current fields. */
function normalize(c) {
  c.household = c.household || { address: '', city: '', region: c.jurisdiction?.region || '', postal: '', country: c.jurisdiction?.country || 'CA', maritalStatus: c.filingStatus || 'single', reviewDate: '', advisorNotes: '' };
  c.dependents = c.dependents || [];
  c.beneficiaries = c.beneficiaries || [];
  c.documents = c.documents || [];
  c.contacts = c.contacts || [];
  c.snapshots = c.snapshots || [];
  // CRM layer (back-fill for clients created before the CRM existed)
  c.crm = c.crm || { lifecycle: 'client', source: '', referredBy: '', tags: [], rating: '', nextActionDate: '', lastContactAt: null };
  if (!Array.isArray(c.crm.tags)) c.crm.tags = [];
  c.opportunities = c.opportunities || [];
  c.activities = c.activities || [];
  c.tasks = c.tasks || [];
  c.products = c.products || [];
  c.compliance = c.compliance || {};
  c.updatedAt = c.updatedAt || c.createdAt || Date.now();
  return c;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const s = JSON.parse(raw); (s.clients || []).forEach(normalize); return s; }
  } catch (e) { console.warn('Load failed', e); }
  const clients = seedClients();
  return { clients, activeId: clients[0].id };
}

const state = load();
state.theme = localStorage.getItem(THEME_KEY) || 'dark';
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

export const store = {
  get state() { return state; },
  subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },

  activeClient() { return state.clients.find(c => c.id === state.activeId) || state.clients[0]; },

  /** Mutate the active client via a function, then persist + notify. */
  update(mutator) {
    const c = this.activeClient();
    mutator(c); c.updatedAt = Date.now();
    persist(); notify();
  },
  /** Mutate the active client but DON'T re-render (live sliders / typing). */
  quietUpdate(mutator) { mutator(this.activeClient()); persist(); },

  /** Mutate a specific client by id (used by cross-client CRM views). */
  updateClient(id, mutator) {
    const c = state.clients.find(x => x.id === id); if (!c) return;
    mutator(c); c.updatedAt = Date.now();
    persist(); notify();
  },

  /** Mutate top-level store. */
  set(mutator) { mutator(state); persist(); notify(); },

  setActive(id) { state.activeId = id; persist(); notify(); },

  addClient(name, country, region) {
    const c = newClient(name, country, region);
    state.clients.push(c); state.activeId = c.id; persist(); notify();
    return c;
  },
  deleteClient(id) {
    state.clients = state.clients.filter(c => c.id !== id);
    if (!state.clients.length) { const c = newClient(); state.clients.push(c); }
    if (state.activeId === id) state.activeId = state.clients[0].id;
    persist(); notify();
  },
  duplicateClient(id) {
    const src = state.clients.find(c => c.id === id); if (!src) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = Math.random().toString(36).slice(2, 10);
    copy.name = src.name + ' (copie)';
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
    return JSON.stringify({ version: 1, exported: new Date().toISOString(), savedAt: this.latestUpdatedAt(), clients: state.clients }, null, 2);
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
