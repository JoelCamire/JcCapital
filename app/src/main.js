// ============================================================
// JC Planner — application bootstrap, shell & router
// ============================================================
import { store } from './state/store.js';
import { getJurisdiction, JURISDICTIONS, COUNTRY_LIST } from './jurisdictions/index.js';
import { h, icon, clear, modal, toast, money, t, fmtDate } from './ui/dom.js';
import { setLang, getLang, onLangChange } from './i18n.js';
import { sync } from './sync.js';
import { cloudEnabled } from './state/cloud-config.js';

import * as dashboard from './ui/views/dashboard.js';
import * as clients from './ui/views/clients.js';
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
import * as decumulation from './ui/views/decumulation.js';
import * as healthcheck from './ui/views/healthcheck.js';
import * as empbenefits from './ui/views/empbenefits.js';
import * as succession from './ui/views/succession.js';
import * as budget from './ui/views/budget.js';
import * as rentbuy from './ui/views/rentbuy.js';
import * as ltc from './ui/views/ltc.js';
import * as toolbox from './ui/views/toolbox.js';
import * as insurancecompare from './ui/views/insurancecompare.js';
import * as nwtracker from './ui/views/nwtracker.js';
import * as multitax from './ui/views/multitax.js';
import * as feecompare from './ui/views/feecompare.js';
import * as incorporation from './ui/views/incorporation.js';
import * as selfemployed from './ui/views/selfemployed.js';
import * as farm from './ui/views/farm.js';
import * as sred from './ui/views/sred.js';
import * as treasury from './ui/views/treasury.js';
import * as borrowing from './ui/views/borrowing.js';
import * as crmdash from './ui/views/crmdash.js';
import * as pipeline from './ui/views/pipeline.js';
import * as tasks from './ui/views/tasks.js';
import * as activities from './ui/views/activities.js';
import * as relation from './ui/views/relation.js';
import * as revenue from './ui/views/revenue.js';
import * as referrals from './ui/views/referrals.js';
import * as segments from './ui/views/segments.js';
import * as clienttimeline from './ui/views/clienttimeline.js';
import * as kyc from './ui/views/kyc.js';
import * as calendar from './ui/views/calendar.js';
import * as crmsheet from './ui/views/crmsheet.js';

// title/sub are functions so they re-translate on language switch
const ROUTES = {
  crmdash: { title: () => t('Tableau CRM', 'CRM dashboard'), sub: () => t('Pipeline, tâches, rappels et revenus', 'Pipeline, tasks, reminders & revenue'), icon: 'dashboard', view: crmdash },
  clients: { title: () => t('Contacts', 'Contacts'), sub: () => t('Tous vos contacts — prospects et clients', 'All your contacts — prospects and clients'), icon: 'users', view: clients },
  pipeline: { title: () => t('Pipeline', 'Pipeline'), sub: () => t('Opportunités de vente par étape', 'Sales opportunities by stage'), icon: 'funnel', view: pipeline },
  tasks: { title: () => t('Tâches & rappels', 'Tasks & reminders'), sub: () => t('Suivis, échéances et rappels', 'Follow-ups, due dates & reminders'), icon: 'check', view: tasks },
  activities: { title: () => t('Activités', 'Activities'), sub: () => t('Journal des contacts', 'Contact log'), icon: 'message', view: activities },
  relation: { title: () => t('Relation client', 'Client relationship'), sub: () => t('Contact, opportunités, produits, historique', 'Contact, opportunities, products, history'), icon: 'users', view: relation },
  clienttimeline: { title: () => t('Ligne du temps client', 'Client timeline'), sub: () => t('Activités, tâches, opportunités et produits', 'Activities, tasks, opportunities & products'), icon: 'timeline', view: clienttimeline },
  revenue: { title: () => t('Rapports de revenus', 'Revenue reports'), sub: () => t('Commissions par produit, assureur et mois', 'Commissions by product, carrier & month'), icon: 'dollar', view: revenue },
  referrals: { title: () => t('Réseau de références', 'Referral network'), sub: () => t('Référents, valeur générée et sources', 'Referrers, value generated & sources'), icon: 'users', view: referrals },
  segments: { title: () => t('Segments & campagnes', 'Segments & campaigns'), sub: () => t('Listes dynamiques et envois groupés', 'Dynamic lists & bulk outreach'), icon: 'funnel', view: segments },
  kyc: { title: () => t('Conformité & KYC', 'Compliance & KYC'), sub: () => t('Complétude documentaire du book', 'Documentation completeness across the book'), icon: 'report', view: kyc },
  calendar: { title: () => t('Calendrier', 'Calendar'), sub: () => t('Tâches, rappels, renouvellements et anniversaires', 'Tasks, reminders, renewals & birthdays'), icon: 'calendar', view: calendar },
  crmsheet: { title: () => t('Fiche client imprimable', 'Printable client sheet'), sub: () => t('Résumé complet — Imprimer / PDF', 'Full summary — Print / PDF'), icon: 'report', view: crmsheet },
  dashboard: { title: () => t('Tableau de bord', 'Dashboard'), sub: () => t('Vue d\'ensemble du plan financier', 'Financial plan overview'), icon: 'dashboard', view: dashboard },
  healthcheck: { title: () => t('Bilan de santé financière', 'Financial health check'), sub: () => t('Pointage global et plan d\'action priorisé', 'Overall score & prioritized action plan'), icon: 'check', view: healthcheck },
  profile: { title: () => t('Profil client', 'Client profile'), sub: () => t('Informations personnelles, à charge, documents', 'Personal info, dependents, documents'), icon: 'client', view: profile },
  client: { title: () => t('Revenus & dépenses', 'Income & expenses'), sub: () => t('Flux du ménage', 'Household cash flows'), icon: 'cashflow', view: client },
  networth: { title: () => t('Bilan & valeur nette', 'Balance sheet & net worth'), sub: () => t('Actifs et passifs', 'Assets and liabilities'), icon: 'networth', view: networth },
  nwtracker: { title: () => t('Suivi du patrimoine', 'Net worth tracker'), sub: () => t('Évolution de la valeur nette dans le temps', 'Net worth over time'), icon: 'timeline', view: nwtracker },
  cashflow: { title: () => t('Flux de trésorerie', 'Cash flow'), sub: () => t('Projection annuelle détaillée', 'Detailed annual projection'), icon: 'cashflow', view: cashflow },
  budget: { title: () => t('Budget mensuel', 'Monthly budget'), sub: () => t('Règle 50/30/20 et gestion de trésorerie', '50/30/20 rule & cash management'), icon: 'cashflow', view: budget },
  debt: { title: () => t('Dettes & hypothèque', 'Debt & mortgage'), sub: () => t('Amortissement et stratégies de remboursement', 'Amortization & payoff strategies'), icon: 'card', view: debt },
  business: { title: () => t('Entreprise & société', 'Business & corporation'), sub: () => t('Salaire vs dividende, impôt corporatif, vente', 'Salary vs dividend, corporate tax, sale'), icon: 'briefcase', view: business },
  succession: { title: () => t('Relève d’entreprise', 'Business succession'), sub: () => t('Voies de sortie, transfert familial, préparation', 'Exit routes, family transfer, readiness'), icon: 'briefcase', view: succession },
  empbenefits: { title: () => t('Avantages sociaux', 'Employee benefits'), sub: () => t('Régimes collectifs et rémunération des employés', 'Group plans & employee compensation'), icon: 'client', view: empbenefits },
  flowthrough: { title: () => t('Actions accréditives & PearTree', 'Flow-through shares & PearTree'), sub: () => t('Actions minières d’exploration et don caritatif', 'Mining exploration shares & charitable gift'), icon: 'scale', view: flowthrough },
  insurancestrat: { title: () => t('Stratégies d’assurance', 'Insurance strategies'), sub: () => t('CDC, RRA, AFI, rachat, personne clé', 'CDA, IRP, IFA, buy-sell, key person'), icon: 'insurance', view: insurancestrat },
  advstructures: { title: () => t('Structures avancées', 'Advanced structures'), sub: () => t('Holdco, fiducie familiale, RCA, prêt au taux prescrit', 'Holdco, family trust, RCA, prescribed-rate loan'), icon: 'estate', view: advstructures },
  incorporation: { title: () => t('Décision d’incorporation', 'Incorporation decision'), sub: () => t('Entreprise individuelle vs société', 'Sole proprietor vs corporation'), icon: 'scale', view: incorporation },
  selfemployed: { title: () => t('Travailleur autonome', 'Self-employed'), sub: () => t('RRQ, TPS/TVQ, acomptes, déductions', 'CPP, sales tax, installments, deductions'), icon: 'cashflow', view: selfemployed },
  farm: { title: () => t('Planification agricole', 'Farm planning'), sub: () => t('EGC agricole, roulement, AgriInvest, quotas', 'Farm LCGE, rollover, AgriInvest, quota'), icon: 'estate', view: farm },
  sred: { title: () => t('Crédit RS&DE', 'SR&ED credit'), sub: () => t('Crédit d’impôt pour la R&D', 'R&D tax credit'), icon: 'tax', view: sred },
  treasury: { title: () => t('Trésorerie d’entreprise', 'Business treasury'), sub: () => t('Fonds de roulement et runway de liquidités', 'Working capital & cash runway'), icon: 'bank', view: treasury },
  borrowing: { title: () => t('Capacité d’emprunt', 'Borrowing capacity'), sub: () => t('Couverture du service de la dette (DSCR)', 'Debt service coverage (DSCR)'), icon: 'card', view: borrowing },
  portfolio: { title: () => t('Portefeuille', 'Portfolio'), sub: () => t('Répartition d\'actifs, frais et rééquilibrage', 'Asset allocation, fees & rebalancing'), icon: 'pie', view: portfolio },
  feecompare: { title: () => t('Comparateur de frais', 'Fee comparator'), sub: () => t('FNB vs fonds communs — impact des frais', 'ETF vs mutual funds — fee impact'), icon: 'pie', view: feecompare },
  realestate: { title: () => t('Immobilier locatif', 'Rental real estate'), sub: () => t('Rendement, levier et flux d\'un immeuble', 'Yield, leverage & cash flow of a property'), icon: 'estate', view: realestate },
  rentbuy: { title: () => t('Achat vs location', 'Rent vs buy'), sub: () => t('Comparer acheter une propriété ou louer et investir', 'Compare buying a home vs renting and investing'), icon: 'estate', view: rentbuy },
  crypto: { title: () => t('Crypto & actifs alternatifs', 'Crypto & alternative assets'), sub: () => t('Suivi, fiscalité et répartition', 'Tracking, taxation & allocation'), icon: 'pie', view: crypto },
  strategycompare: { title: () => t('Comparateur de stratégies', 'Strategy comparison'), sub: () => t('Valeur du conseil — avant / après', 'Value of advice — before / after'), icon: 'compare', view: strategycompare },
  equity: { title: () => t('Rémunération en actions', 'Equity compensation'), sub: () => t('Options, UAR, SPCC, ISO/NSO', 'Options, RSUs, CCPC, ISO/NSO'), icon: 'networth', view: equity },
  emigration: { title: () => t('Départ du Canada', 'Leaving Canada'), sub: () => t('Impôt de départ et disposition réputée', 'Departure tax & deemed disposition'), icon: 'globe', view: emigration },
  crossborder: { title: () => t('Transfrontalier', 'Cross-border'), sub: () => t('Snowbirds, présence aux É.-U., succession US', 'Snowbirds, US presence, US estate'), icon: 'globe', view: crossborder },
  compliance: { title: () => t('Conformité & échéances', 'Compliance & deadlines'), sub: () => t('Calendrier fiscal et dates limites', 'Tax calendar & filing deadlines'), icon: 'report', view: compliance },
  retirement: { title: () => t('Retraite', 'Retirement'), sub: () => t('Scénarios et décaissement', 'Scenarios & decumulation'), icon: 'retire', view: retirement },
  decumulation: { title: () => t('Décaissement optimal', 'Optimal decumulation'), sub: () => t('Ordre de retrait, fonte du REER, PSV', 'Withdrawal order, RRSP meltdown, OAS'), icon: 'scale', view: decumulation },
  montecarlo: { title: () => t('Monte Carlo', 'Monte Carlo'), sub: () => t('Analyse de probabilité de succès', 'Probability of success analysis'), icon: 'monte', view: montecarlo },
  scenarios: { title: () => t('Scénarios & stress', 'Scenarios & stress'), sub: () => t('Tests de résistance et comparateur', 'Stress tests & comparator'), icon: 'flame', view: scenarios },
  tax: { title: () => t('Fiscalité', 'Taxation'), sub: () => t('Calculateur et optimisation d\'impôt', 'Tax calculator & optimization'), icon: 'tax', view: tax },
  optimize: { title: () => t('Optimisation fiscale', 'Tax optimization'), sub: () => t('Fractionnement, emplacement d\'actifs, décaissement', 'Splitting, asset location, decumulation'), icon: 'scale', view: optimize },
  multitax: { title: () => t('Lissage fiscal pluriannuel', 'Multi-year tax smoothing'), sub: () => t('Fenêtres pour réaliser ou reporter le revenu', 'Windows to realize or defer income'), icon: 'tax', view: multitax },
  benefits: { title: () => t('Prestations publiques', 'Government benefits'), sub: () => t('Âge de demande RRQ/PSV/Social Security', 'CPP/OAS/Social Security claiming age'), icon: 'gov', view: benefits },
  goals: { title: () => t('Objectifs', 'Goals'), sub: () => t('Suivi et suggestions', 'Tracking & suggestions'), icon: 'goals', view: goals },
  education: { title: () => t('Études', 'Education'), sub: () => t('Financement des études des enfants', 'Children education funding'), icon: 'cap', view: education },
  timeline: { title: () => t('Échéancier de vie', 'Life timeline'), sub: () => t('Étapes et milestones financiers', 'Financial milestones'), icon: 'timeline', view: timeline },
  insurance: { title: () => t('Assurance', 'Insurance'), sub: () => t('Analyse des besoins et polices', 'Needs analysis & policies'), icon: 'insurance', view: insurance },
  insurancecompare: { title: () => t('Comparateur d’assurance', 'Insurance comparator'), sub: () => t('Temporaire vs permanente, BTID', 'Term vs permanent, BTID'), icon: 'insurance', view: insurancecompare },
  estate: { title: () => t('Succession', 'Estate'), sub: () => t('Transmission et fiscalité au décès', 'Transfer & tax at death'), icon: 'estate', view: estate },
  philanthropy: { title: () => t('Philanthropie', 'Philanthropy'), sub: () => t('Dons de titres, DAF, fondation', 'Gifts of securities, DAF, foundation'), icon: 'goals', view: philanthropy },
  rdsp: { title: () => t('REEI & invalidité', 'RDSP & disability'), sub: () => t('Subventions, bons et programmes pour proches', 'Grants, bonds & caregiver programs'), icon: 'client', view: rdsp },
  ltc: { title: () => t('Soins de longue durée', 'Long-term care'), sub: () => t('Coût des soins, longévité et assurance SLD', 'Care costs, longevity & LTC insurance'), icon: 'insurance', view: ltc },
  toolbox: { title: () => t('Boîte à outils', 'Toolbox'), sub: () => t('Calculatrices financières rapides', 'Quick financial calculators'), icon: 'scale', view: toolbox },
  reports: { title: () => t('Rapports', 'Reports'), sub: () => t('Rapport de plan financier imprimable', 'Printable financial plan report'), icon: 'report', view: reports },
  settings: { title: () => t('Paramètres', 'Settings'), sub: () => t('Juridiction, hypothèses et données', 'Jurisdiction, assumptions & data'), icon: 'settings', view: settings },
};

const NAV = () => [
  { group: t('CRM', 'CRM'), items: ['crmdash', 'clients', 'pipeline', 'tasks', 'calendar', 'activities', 'relation', 'clienttimeline', 'crmsheet', 'revenue', 'referrals', 'segments', 'kyc'] },
  { group: t('Planification', 'Planning'), items: ['dashboard', 'healthcheck', 'profile', 'client', 'networth', 'nwtracker', 'cashflow', 'budget', 'debt'] },
  { group: t('Entreprise', 'Business'), items: ['business', 'succession', 'empbenefits', 'flowthrough', 'insurancestrat', 'advstructures'] },
  { group: t('Entrepreneur & autonome', 'Entrepreneur & self-employed'), items: ['incorporation', 'selfemployed', 'farm', 'sred', 'treasury', 'borrowing'] },
  { group: t('Placements & retraite', 'Investments & retirement'), items: ['portfolio', 'feecompare', 'realestate', 'rentbuy', 'crypto', 'retirement', 'decumulation', 'montecarlo', 'scenarios', 'strategycompare'] },
  { group: t('Optimisation', 'Optimization'), items: ['tax', 'multitax', 'optimize', 'equity', 'benefits', 'insurance', 'insurancecompare', 'estate', 'philanthropy'] },
  { group: t('International', 'International'), items: ['crossborder', 'emigration'] },
  { group: t('Objectifs & vie', 'Goals & life'), items: ['goals', 'education', 'rdsp', 'ltc', 'timeline'] },
  { group: t('Documents', 'Documents'), items: ['compliance', 'toolbox', 'reports', 'settings'] },
];

function currentRoute() {
  const r = (location.hash || '#crmdash').slice(1);
  return ROUTES[r] ? r : 'crmdash';
}

let contentEl, titleEl, subEl, sidebarClientEl, navEls = {};
let _cloudAuthed = false;

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
      _cloudAuthed ? h('button', { class: 'btn icon ghost', title: t('Se déconnecter', 'Sign out'), onClick: cloudLogout,
        html: icon('logout', 16) }) : null,
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

// ---- Boot ----
function startApp() {
  buildShell();
  render();
  store.subscribe(() => render());
  onLangChange(() => { buildShell(); render(); });
  window.addEventListener('hashchange', render);
}

// ---- Legacy single-user sync (private GitHub gist) — only when cloud auth is OFF ----
function startGistSync() {
  let _pushTimer = null;
  function scheduleAutoPush() {
    if (!(sync.auto && sync.configured)) return;
    clearTimeout(_pushTimer);
    _pushTimer = setTimeout(() => { sync.push(store.exportJSON()).catch(() => {}); }, 4000);
  }
  store.subscribe(scheduleAutoPush);
  if (sync.auto && sync.configured) {
    sync.pull().then(r => { if (r) { try { store.mergeJSON(r); toast(t('Dossiers synchronisés ✓', 'Files synced ✓')); } catch (e) {} } }).catch(() => {});
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && sync.auto && sync.configured) { sync.push(store.exportJSON()).catch(() => {}); } });
}

// ---- Supabase cloud auth + per-user sync (multi-user) ----
let _cloud = null;
function startCloudSync() {
  let pushTimer = null;
  store.subscribe(() => {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { _cloud.pushState(JSON.parse(store.exportJSON())).catch(() => {}); }, 2500);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') _cloud.pushState(JSON.parse(store.exportJSON())).catch(() => {});
  });
}
async function hydrateFromCloud() {
  try {
    const remote = await _cloud.pullState();
    if (remote && Array.isArray(remote.clients)) store.importJSON(JSON.stringify(remote));
  } catch (e) { console.error('cloud pull failed', e); }
}
async function bootCloud() {
  _cloud = await import('./state/cloud.js');
  const { showAuthScreen } = await import('./ui/auth-screen.js');
  const onAuthed = async () => {
    _cloudAuthed = true;
    await hydrateFromCloud();
    startApp();
    startCloudSync();
  };
  try {
    const session = await _cloud.currentSession();
    if (session) await onAuthed();
    else showAuthScreen(onAuthed);
  } catch (e) {
    console.error('cloud boot failed — falling back to local', e);
    startApp(); startGistSync();
  }
}
async function cloudLogout() {
  try { await _cloud.signOut(); } catch (e) {}
  localStorage.removeItem('jc_planner_v1');
  location.reload();
}

if (cloudEnabled()) {
  bootCloud();
} else {
  startApp();
  startGistSync();
}
