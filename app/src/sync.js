// ============================================================
// Cloud sync via a PRIVATE GitHub Gist (free, no server).
// The user pastes a classic Personal Access Token with ONLY the
// "gist" scope; it is stored locally on each device. We keep a
// single private gist holding the clients JSON and push/pull it.
// ============================================================
const TOKEN_KEY = 'jc_gist_token';
const GIST_KEY = 'jc_gist_id';
const AUTO_KEY = 'jc_gist_auto';
const FILENAME = 'jc-planner-clients.json';
const API = 'https://api.github.com';

export const sync = {
  get token() { return localStorage.getItem(TOKEN_KEY) || ''; },
  setToken(v) { v ? localStorage.setItem(TOKEN_KEY, v.trim()) : localStorage.removeItem(TOKEN_KEY); },
  get gistId() { return localStorage.getItem(GIST_KEY) || ''; },
  setGistId(v) { v ? localStorage.setItem(GIST_KEY, v) : localStorage.removeItem(GIST_KEY); },
  get auto() { return localStorage.getItem(AUTO_KEY) === '1'; },
  setAuto(v) { localStorage.setItem(AUTO_KEY, v ? '1' : '0'); },
  get configured() { return !!this.token; },

  _headers() {
    return { 'Authorization': 'Bearer ' + this.token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' };
  },

  /** Verify the token works (and has gist scope). */
  async test() {
    if (!this.token) throw new Error('no-token');
    const r = await fetch(API + '/gists?per_page=1', { headers: this._headers() });
    if (r.status === 401) throw new Error('bad-token');
    if (!r.ok) throw new Error('http-' + r.status);
    return true;
  },

  /** Push the dataset string to the gist (create it the first time). */
  async push(jsonString) {
    if (!this.token) throw new Error('no-token');
    const body = JSON.stringify({ description: 'JC Planner — dossiers clients (privé)', public: false, files: { [FILENAME]: { content: jsonString } } });
    let r, id = this.gistId;
    if (id) {
      r = await fetch(`${API}/gists/${id}`, { method: 'PATCH', headers: this._headers(), body });
      if (r.status === 404) { id = ''; } // gist gone -> recreate
    }
    if (!id) {
      r = await fetch(`${API}/gists`, { method: 'POST', headers: this._headers(), body });
    }
    if (r.status === 401) throw new Error('bad-token');
    if (!r.ok) throw new Error('http-' + r.status);
    const data = await r.json();
    this.setGistId(data.id);
    return { id: data.id, at: Date.now() };
  },

  /** Pull the dataset string from the gist. Returns null if none. */
  async pull() {
    if (!this.token) throw new Error('no-token');
    if (!this.gistId) {
      // find an existing JC Planner gist on the account
      const r0 = await fetch(API + '/gists?per_page=100', { headers: this._headers() });
      if (r0.status === 401) throw new Error('bad-token');
      if (r0.ok) {
        const list = await r0.json();
        const found = list.find(g => g.files && g.files[FILENAME]);
        if (found) this.setGistId(found.id);
      }
      if (!this.gistId) return null;
    }
    const r = await fetch(`${API}/gists/${this.gistId}`, { headers: this._headers() });
    if (r.status === 401) throw new Error('bad-token');
    if (r.status === 404) { this.setGistId(''); return null; }
    if (!r.ok) throw new Error('http-' + r.status);
    const data = await r.json();
    const file = data.files && data.files[FILENAME];
    if (!file) return null;
    // Large gists are truncated; fetch raw_url if so.
    let content = file.content;
    if (file.truncated && file.raw_url) content = await (await fetch(file.raw_url)).text();
    return content;
  },
};
