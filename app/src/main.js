// ============================================================
// JC Planner — application bootstrap, shell & router
// ============================================================
import { store } from './state/store.js';
import { getJurisdiction, JURISDICTIONS, COUNTRY_LIST } from './jurisdictions/index.js';
import { h, icon, clear, modal, toast, money, t, fmtDate } from './ui/dom.js';
import { setLang, getLang, onLangChange } from './i18n.js';

import * as dashboard from './ui/views/dashboard.js';
import * as profile from './ui/views/profile.js';
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
import * as debt from './ui/views/debt.js';
import * as portfolio from './ui/views/portfolio.js';
import * as scenarios from './ui/views/scenarios.js';
import * as optimize from './ui/views/optimize.js';
import * as education from './ui/views/education.js';
import * as timeline from './ui/views/timeline.js';
import * as reports from './ui/views/reports.js';
import * as benefits from './ui/views/benefits.js';
import * as business from './ui/views/business.js';
import * as flowthrough from './ui/views/flowthrough.js';
import * as insurancestrat from './ui/views/insurancestrat.js';
import * as advstructures from './ui/views/advstructures.js';
import * as realestate from './ui/views/realestate.js';
import * as equity from './ui/views/equity.js';
import * as emigration from './ui/views/emigration.js';
import * as compliance from './ui/views/compliance.js';
import * as crossborder from './ui/views/crossborder.js';
import * as philanthropy from './ui/views/philanthropy.js';
import * as rdsp from './ui/views/rdsp.js';
import * as crypto from './ui/views/crypto.js';
import * as strategycompare from './ui/views/strategycompare.js';

// title/sub are functions so they re-translate on language switch
const ROUTES = {
  dashboard: { title: () => t('Tableau de bord', 'Dashboard'), sub: () => t('Vue d\'ensemble du plan financier', 'Financial plan overview'), icon: 'dashboard', view: dashboard },
  profile: { title: () => t('Profil client', 'Client profile'), sub: () => t('Informations personnelles, à charge, documents', 'Personal info, dependents, documents'), icon: 'client', view: profile },
  client: { title: () => t('Revenus & dépenses', 'Income & expenses'), sub: () => t('Flux du ménage', 'Household cash flows'), icon: 'cashflow', view: client },
  networth: { title: () => t('Bilan & valeur nette', 'Balance sheet & net worth'), sub: () => t('Actifs et passifs', 'Assets and liabilities'), icon: 'networth', view: networth },
  cashflow: { title: () => t('Flux de trésorerie', 'Cash flow'), sub: () => t('Projection annuelle détaillée', 'Detailed annual projection'), icon: 'cashflow', view: cashflow },
  debt: { title: () => t('Dettes & hypothèque', 'Debt & mortgage'), sub: () => t('Amortissement et stratégies de remboursement', 'Amortization & payoff strategies'), icon: 'card', view: debt },
  business: { title: () => t('Entreprise & société', 'Business & corporation'), sub: () => t('Salaire vs dividende, impôt corporatif, vente', 'Salary vs dividend, corporate tax, sale'), icon: 'briefcase', view: business },
  flowthrough: { title: () => t('Actions accréditives & PearTree', 'Flow-through shares & PearTree'), sub: () => t('Actions minières d’exploration et don caritatif', 'Mining exploration shares & charitable gift'), icon: 'scale', view: flowthrough },
  insurancestrat: { title: () => t('Stratégies d’assurance', 'Insurance strategies'), sub: () => t('CDC, RRA, AFI, rachat, personne clé', 'CDA, IRP, IFA, buy-sell, key person'), icon: 'insurance', view: insurancestrat },
  advstructures: { title: () => t('Structures avancées', 'Advanced structures'), sub: () => t('Holdco, fiducie familiale, RCA, prêt au taux prescrit', 'Holdco, family trust, RCA, prescribed-rate loan'), icon: 'estate', view: advstructures },
  portfolio: { title: () => t('Portefeuille', 'Portfolio'), sub: () => t('Répartition d\'actifs, frais et rééquilibrage', 'Asset allocation, fees & rebalancing'), icon: 'pie', view: portfolio },
  realestate: { title: () => t('Immobilier locatif', 'Rental real estate'), sub: () => t('Rendement, levier et flux d\'un immeuble', 'Yield, leverage & cash flow of a property'), icon: 'estate', view: realestate },
  crypto: { title: () => t('Crypto & actifs alternatifs', 'Crypto & alternative assets'), sub: () => t('Suivi, fiscalité et répartition', 'Tracking, taxation & allocation'), icon: 'pie', view: crypto },
  strategycompare: { title: () => t('Comparateur de stratégies', 'Strategy comparison'), sub: () => t('Valeur du conseil — avant / après', 'Value of advice — before / after'), icon: 'compare', view: strategycompare },
  equity: { title: () => t('Rémunération en actions', 'Equity compensation'), sub: () => t('Options, UAR, SPCC, ISO/NSO', 'Options, RSUs, CCPC, ISO/NSO'), icon: 'networth', view: equity },
  emigration: { title: () => t('Départ du Canada', 'Leaving Canada'), sub: () => t('Impôt de départ et disposition réputée', 'Departure tax & deemed disposition'), icon: 'globe', view: emigration },
  crossborder: { title: () => t('Transfrontalier', 'Cross-border'), sub: () => t('Snowbirds, présence aux É.-U., succession US', 'Snowbirds, US presence, US estate'), icon: 'globe', view: crossborder },
  compliance: { title: () => t('Conformité & échéances', 'Compliance & deadlines'), sub: () => t('Calendrier fiscal et dates limites', 'Tax calendar & filing deadlines'), icon: 'report', view: compliance },
  retirement: { title: () => t('Retraite', 'Retirement'), sub: () => t('Scénarios et décaissement', 'Scenarios & decumulation'), icon: 'retire', view: retirement },
  montecarlo: { title: () => t('Monte Carlo', 'Monte Carlo'), sub: () => t('Analyse de probabilité de succès', 'Probability of success analysis'), icon: 'monte', view: montecarlo },
  scenarios: { title: () => t('Scénarios & stress', 'Scenarios & stress'), sub: () => t('Tests de résistance et comparateur', 'Stress tests & comparator'), icon: 'flame', view: scenarios },
  tax: { title: () => t('Fiscalité', 'Taxation'), sub: () => t('Calculateur et optimisation d\'impôt', 'Tax calculator & optimization'), icon: 'tax', view: tax },
  optimize: { title: () => t('Optimisation fiscale', 'Tax optimization'), sub: () => t('Fractionnement, emplacement d\'actifs, décaissement', 'Splitting, asset location, decumulation'), icon: 'scale', view: optimize },
  benefits: { title: () => t('Prestations publiques', 'Government benefits'), sub: () => t('Âge de demande RRQ/PSV/Social Security', 'CPP/OAS/Social Security claiming age'), icon: 'gov', view: benefits },
  goals: { title: () => t('Objectifs', 'Goals'), sub: () => t('Suivi et suggestions', 'Tracking & suggestions'), icon: 'goals', view: goals },
  education: { title: () => t('Études', 'Education'), sub: () => t('Financement des études des enfants', 'Children education funding'), icon: 'cap', view: education },
  timeline: { title: () => t('Échéancier de vie', 'Life timeline'), sub: () => t('Étapes et milestones financiers', 'Financial milestones'), icon: 'timeline', view: timeline },
  insurance: { title: () => t('Assurance', 'Insurance'), sub: () => t('Analyse des besoins et polices', 'Needs analysis & policies'), icon: 'insurance', view: insurance },
  estate: { title: () => t('Succession', 'Estate'), sub: () => t('Transmission et fiscalité au décès', 'Transfer & tax at death'), icon: 'estate', view: estate },
  philanthropy: { title: () => t('Philanthropie', 'Philanthropy'), sub: () => t('Dons de titres, DAF, fondation', 'Gifts of securities, DAF, foundation'), icon: 'goals', view: philanthropy },
  rdsp: { title: () => t('REEI & invalidité', 'RDSP & disability'), sub: () => t('Subventions, bons et programmes pour proches', 'Grants, bonds & caregiver programs'), icon: 'client', view: rdsp },
  reports: { title: () => t('Rapports', 'Reports'), sub: () => t('Rapport de plan financier imprimable', 'Printable financial plan report'), icon: 'report', view: reports },
  settings: { title: () => t('Paramètres', 'Settings'), sub: () => t('Juridiction, hypothèses et données', 'Jurisdiction, assumptions & data'), icon: 'settings', view: settings },
};

const NAV = () => [
  { group: t('Planification', 'Planning'), items: ['dashboard', 'profile', 'client', 'networth', 'cashflow', 'debt'] },
  { group: t('Entreprise', 'Business'), items: ['business', 'flowthrough', 'insurancestrat', 'advstructures'] },
  { group: t('Placements & retraite', 'Investments & retirement'), items: ['portfolio', 'realestate', 'crypto', 'retirement', 'montecarlo', 'scenarios', 'strategycompare'] },
  { group: t('Optimisation', 'Optimization'), items: ['tax', 'optimize', 'equity', 'benefits', 'insurance', 'estate', 'philanthropy'] },
  { group: t('International', 'International'), items: ['crossborder', 'emigration'] },
  { group: t('Objectifs & vie', 'Goals & life'), items: ['goals', 'education', 'rdsp', 'timeline'] },
  { group: t('Documents', 'Documents'), items: ['compliance', 'reports', 'settings'] },
];

function currentRoute() {
  const r = (location.hash || '#dashboard').slice(1);
  return ROUTES[r] ? r : 'dashboard';
}

let contentEl, titleEl, subEl, sidebarClientEl, navEls = {};

function buildShell() {
  const app = document.getElementById('app');
  clear(app);
  navEls = {};

  sidebarClientEl = h('div', { class: 'sb-client', onClick: openClientSwitcher });
  const nav = h('nav', { class: 'sb-nav' });
  NAV().forEach(g => {
    nav.appendChild(h('div', { class: 'nav-group' }, g.group));
    g.items.forEach(key => {
      const r = ROUTES[key];
      const item = h('a', { class: 'nav-item', href: '#' + key },
        h('span', { class: 'ic', html: icon(r.icon, 18) }), h('span', {}, r.title()));
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
      h('div', { class: 'who' }, h('b', {}, 'Joel Camire'), h('span', {}, t('JC Capital — privé', 'JC Capital — private'))),
      buildLangToggle(),
      h('button', { class: 'btn icon ghost', title: t('Thème', 'Theme'), onClick: () => store.toggleTheme(),
        html: icon(store.state.theme === 'light' ? 'moon' : 'sun', 16) }),
    ),
  );

  titleEl = h('h1', {});
  subEl = h('div', { class: 'sub muted' });
  const topbar = h('div', { class: 'topbar' },
    h('button', { class: 'btn icon ghost menu-toggle', html: icon('menu', 18), onClick: () => document.body.classList.toggle('nav-open') }),
    h('div', {}, titleEl, subEl),
    h('div', { class: 'topbar-actions' }, buildJurisdictionPill(),
      h('button', { class: 'btn sm', html: icon('download', 14) + ' ' + t('Exporter', 'Export'), onClick: exportPdf })),
  );

  contentEl = h('main', { class: 'content' });
  app.appendChild(h('div', { class: 'shell' }, sidebar, h('div', { class: 'main' }, topbar, contentEl)));
}

function buildLangToggle() {
  return h('div', { class: 'seg', style: { padding: '2px' } },
    h('button', { onClick: () => setLang('fr'), style: langStyle(getLang() === 'fr') }, 'FR'),
    h('button', { onClick: () => setLang('en'), style: langStyle(getLang() === 'en') }, 'EN'),
  );
}
function langStyle(on) {
  return { border: 'none', background: on ? 'var(--surface)' : 'transparent', color: on ? 'var(--text)' : 'var(--sidebar-text)',
    padding: '4px 8px', borderRadius: '7px', fontWeight: 700, fontSize: '11px' };
}

function buildJurisdictionPill() {
  const c = store.activeClient();
  const jur = getJurisdiction(c.jurisdiction.country, c.jurisdiction.region);
  const countrySel = h('select', { onChange: e => { const cc = e.target.value; store.setJurisdiction(cc, JURISDICTIONS[cc].defaultRegion); } },
    ...COUNTRY_LIST.map(x => h('option', { value: x.code, selected: x.code === c.jurisdiction.country }, `${x.flag} ${x.name}`)));
  const regionSel = h('select', { onChange: e => store.setJurisdiction(c.jurisdiction.country, e.target.value) },
    ...Object.entries(jur.regions).map(([k, v]) => h('option', { value: k, selected: k === c.jurisdiction.region }, v)));
  return h('div', { class: 'juris-pill', title: t('Juridiction de planification', 'Planning jurisdiction') },
    h('span', { class: 'flag' }, jur.flag), countrySel, h('span', { class: 'muted' }, '·'), regionSel);
}

function render() {
  const key = currentRoute();
  const r = ROUTES[key];
  const c = store.activeClient();
  const jur = getJurisdiction(c.jurisdiction.country, c.jurisdiction.region);

  clear(sidebarClientEl).append(
    h('div', { class: 'lbl' }, t('Dossier actif', 'Active file')),
    h('div', { class: 'nm' }, c.name, h('span', { html: icon('chevron', 15) })),
    h('div', { class: 'meta' }, `${jur.flag} ${jur.name} · ${jur.regionName} · ${c.members.length} ${t('membre(s)', 'member(s)')}`),
  );

  Object.entries(navEls).forEach(([k, el]) => el.classList.toggle('active', k === key));

  titleEl.textContent = r.title();
  subEl.textContent = r.sub();
  const pill = document.querySelector('.juris-pill');
  if (pill) pill.replaceWith(buildJurisdictionPill());

  document.body.classList.remove('nav-open');
  clear(contentEl);
  if (!r.view || typeof r.view.render !== 'function') {
    contentEl.appendChild(h('div', { class: 'card empty' }, h('div', { class: 'big' }, '🔧'),
      t('Module en cours de finalisation…', 'Module being finalized…')));
    return;
  }
  try {
    contentEl.appendChild(r.view.render({ store, client: c, jur, navigate }));
  } catch (e) {
    console.error(e);
    contentEl.appendChild(h('div', { class: 'card' }, h('h3', {}, t('Erreur de rendu', 'Render error')), h('pre', { style: { whiteSpace: 'pre-wrap', color: 'var(--neg)' } }, String(e && e.stack || e))));
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
        h('button', { class: 'btn icon sm ghost', title: t('Dupliquer', 'Duplicate'), html: icon('doc', 15), onClick: ev => { ev.stopPropagation(); store.duplicateClient(c.id); m.close(); toast(t('Dossier dupliqué', 'File duplicated')); } }),
        store.state.clients.length > 1 ? h('button', { class: 'btn icon sm ghost', title: t('Supprimer', 'Delete'), html: icon('trash', 15), onClick: ev => { ev.stopPropagation(); store.deleteClient(c.id); m.close(); toast(t('Dossier supprimé', 'File deleted')); } }) : null,
      ));
  });
  const m = modal({ title: t('Changer de dossier', 'Switch file'), body: h('div', {}, ...list),
    footer: [h('button', { class: 'btn primary', html: icon('plus', 14) + ' ' + t('Nouveau dossier', 'New file'), onClick: () => { store.addClient(); m.close(); navigate('profile'); } })] });
}

function exportPdf() {
  toast(t('Astuce : utilisez Imprimer → PDF du navigateur', 'Tip: use the browser Print → PDF'), 'info');
  setTimeout(() => window.print(), 400);
}

// Boot
buildShell();
render();
store.subscribe(() => render());
onLangChange(() => { buildShell(); render(); });
window.addEventListener('hashchange', render);
