// ============================================================
// JC Planner — application bootstrap, shell & router
// ============================================================
import { store } from './state/store.js';
import { getJurisdiction, JURISDICTIONS, COUNTRY_LIST } from './jurisdictions/index.js';
import { h, icon, clear, modal, toast, money } from './ui/dom.js';

import * as dashboard from './ui/views/dashboard.js';
import * as client from './ui/views/client.js';
import * as networth from './ui/views/networth.js';
import * as cashflow from './ui/views/cashflow.js';
import * as retirement from './ui/views/retirement.js';
import * as montecarlo from './ui/views/montecarlo.js';
import * as tax from './ui/views/tax.js';
import * as goals from './ui/views/goals.js';
import * as insurance from './ui/views/insurance.js';
import * as estate from './ui/views/estate.js';
import * as settings from './ui/views/settings.js';

const ROUTES = {
  dashboard: { title: 'Tableau de bord', sub: 'Vue d\'ensemble du plan financier', icon: 'dashboard', view: dashboard },
  client: { title: 'Ménage', sub: 'Membres, revenus et dépenses', icon: 'client', view: client },
  networth: { title: 'Bilan & valeur nette', sub: 'Actifs et passifs', icon: 'networth', view: networth },
  cashflow: { title: 'Flux de trésorerie', sub: 'Projection annuelle détaillée', icon: 'cashflow', view: cashflow },
  retirement: { title: 'Retraite', sub: 'Scénarios et projection de décaissement', icon: 'retire', view: retirement },
  montecarlo: { title: 'Monte Carlo', sub: 'Analyse de probabilité de succès', icon: 'monte', view: montecarlo },
  tax: { title: 'Fiscalité', sub: 'Calculateur et optimisation d\'impôt', icon: 'tax', view: tax },
  goals: { title: 'Objectifs', sub: 'Suivi du financement des projets', icon: 'goals', view: goals },
  insurance: { title: 'Assurance', sub: 'Analyse des besoins et polices', icon: 'insurance', view: insurance },
  estate: { title: 'Succession', sub: 'Transmission et fiscalité au décès', icon: 'estate', view: estate },
  settings: { title: 'Paramètres', sub: 'Juridiction, hypothèses et données', icon: 'settings', view: settings },
};

const NAV = [
  { group: 'Planification', items: ['dashboard', 'client', 'networth', 'cashflow'] },
  { group: 'Projections', items: ['retirement', 'montecarlo', 'goals'] },
  { group: 'Optimisation', items: ['tax', 'insurance', 'estate'] },
  { group: 'Système', items: ['settings'] },
];

function currentRoute() {
  const r = (location.hash || '#dashboard').slice(1);
  return ROUTES[r] ? r : 'dashboard';
}

// ---------- Shell construction ----------
let contentEl, titleEl, subEl, sidebarClientEl, navEls = {};

function buildShell() {
  const app = document.getElementById('app');
  clear(app);

  // Sidebar
  sidebarClientEl = h('div', { class: 'sb-client', onClick: openClientSwitcher });
  const nav = h('nav', { class: 'sb-nav' });
  NAV.forEach(g => {
    nav.appendChild(h('div', { class: 'nav-group' }, g.group));
    g.items.forEach(key => {
      const r = ROUTES[key];
      const item = h('a', { class: 'nav-item', href: '#' + key },
        h('span', { class: 'ic', html: icon(r.icon, 18) }), h('span', {}, r.title));
      navEls[key] = item;
      nav.appendChild(item);
    });
  });

  const sidebar = h('aside', { class: 'sidebar' },
    h('div', { class: 'sb-brand' },
      h('div', { class: 'mark' }, 'JC'),
      h('div', { class: 'name' }, 'JC', h('span', {}, 'Planner'))),
    sidebarClientEl,
    nav,
    h('div', { class: 'sb-foot' },
      h('div', { class: 'who' }, h('b', {}, 'Joel Camire'), h('span', {}, 'JC Capital — privé')),
      h('button', { class: 'btn icon ghost', title: 'Thème', onClick: () => store.toggleTheme(),
        html: icon(store.state.theme === 'light' ? 'moon' : 'sun', 16) }),
    ),
  );

  // Topbar
  titleEl = h('h1', {});
  subEl = h('div', { class: 'sub muted' });
  const jurPill = buildJurisdictionPill();
  const topbar = h('div', { class: 'topbar' },
    h('button', { class: 'btn icon ghost menu-toggle', html: icon('menu', 18), onClick: () => document.body.classList.toggle('nav-open') }),
    h('div', {}, titleEl, subEl),
    h('div', { class: 'topbar-actions' }, jurPill,
      h('button', { class: 'btn sm', html: icon('download', 14) + ' Exporter', onClick: exportPdf })),
  );

  contentEl = h('main', { class: 'content' });
  const main = h('div', { class: 'main' }, topbar, contentEl);
  app.appendChild(h('div', { class: 'shell' }, sidebar, main));
}

function buildJurisdictionPill() {
  const c = store.activeClient();
  const jur = getJurisdiction(c.jurisdiction.country, c.jurisdiction.region);
  const countrySel = h('select', { onChange: e => { const cc = e.target.value; store.setJurisdiction(cc, JURISDICTIONS[cc].defaultRegion); } },
    ...COUNTRY_LIST.map(x => h('option', { value: x.code, selected: x.code === c.jurisdiction.country }, `${x.flag} ${x.name}`)));
  const regionSel = h('select', { onChange: e => store.setJurisdiction(c.jurisdiction.country, e.target.value) },
    ...Object.entries(jur.regions).map(([k, v]) => h('option', { value: k, selected: k === c.jurisdiction.region }, v)));
  return h('div', { class: 'juris-pill', title: 'Juridiction de planification' },
    h('span', { class: 'flag' }, jur.flag), countrySel, h('span', { class: 'muted' }, '·'), regionSel);
}

// ---------- Render ----------
function render() {
  const key = currentRoute();
  const r = ROUTES[key];
  const c = store.activeClient();
  const jur = getJurisdiction(c.jurisdiction.country, c.jurisdiction.region);

  // sidebar client
  clear(sidebarClientEl).append(
    h('div', { class: 'lbl' }, 'Dossier actif'),
    h('div', { class: 'nm' }, c.name, h('span', { html: icon('chevron', 15) })),
    h('div', { class: 'meta' }, `${jur.flag} ${jur.name} · ${jur.regionName} · ${c.members.length} membre(s)`),
  );

  // nav active
  Object.entries(navEls).forEach(([k, el]) => el.classList.toggle('active', k === key));

  // topbar
  titleEl.textContent = r.title;
  subEl.textContent = r.sub;
  // rebuild jurisdiction pill (reflect current values)
  const pill = document.querySelector('.juris-pill');
  if (pill) pill.replaceWith(buildJurisdictionPill());

  // content
  document.body.classList.remove('nav-open');
  clear(contentEl);
  try {
    const node = r.view.render({ store, client: c, jur, navigate });
    contentEl.appendChild(node);
  } catch (e) {
    console.error(e);
    contentEl.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Erreur de rendu'), h('pre', { style: { whiteSpace: 'pre-wrap', color: 'var(--neg)' } }, String(e && e.stack || e))));
  }
  contentEl.scrollTop = 0;
}

function navigate(route) { location.hash = '#' + route; }

function openClientSwitcher() {
  const list = store.state.clients.map(c => {
    const jur = getJurisdiction(c.jurisdiction.country, c.jurisdiction.region);
    return h('div', { class: 'flex between center', style: { padding: '12px 14px', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '8px', cursor: 'pointer', background: c.id === store.state.activeId ? 'var(--info-soft)' : 'var(--surface)' },
      onClick: () => { store.setActive(c.id); m.close(); } },
      h('div', {}, h('b', {}, c.name), h('div', { class: 'tiny muted' }, `${jur.flag} ${jur.name} · ${jur.regionName}`)),
      h('div', { class: 'inline', style: { flexWrap: 'nowrap' } },
        h('button', { class: 'btn icon sm ghost', title: 'Dupliquer', html: icon('doc', 15), onClick: ev => { ev.stopPropagation(); store.duplicateClient(c.id); m.close(); toast('Dossier dupliqué'); } }),
        store.state.clients.length > 1 ? h('button', { class: 'btn icon sm ghost', title: 'Supprimer', html: icon('trash', 15), onClick: ev => { ev.stopPropagation(); store.deleteClient(c.id); m.close(); toast('Dossier supprimé'); } }) : null,
      ));
  });
  const m = modal({ title: 'Changer de dossier', body: h('div', {}, ...list),
    footer: [h('button', { class: 'btn primary', html: icon('plus', 14) + ' Nouveau dossier', onClick: () => { store.addClient(); m.close(); navigate('client'); } })] });
}

function exportPdf() {
  toast('Astuce : utilisez Imprimer → PDF du navigateur', 'info');
  setTimeout(() => window.print(), 400);
}

// ---------- Boot ----------
buildShell();
render();
store.subscribe(() => render());
window.addEventListener('hashchange', render);
