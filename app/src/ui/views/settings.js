import { h, money, pct, num, icon, toast, modal, t } from '../dom.js';
import { card, slider, statList, dataTable } from '../widgets.js';
import { store as appStore } from '../../state/store.js';
import { setLang, getLang } from '../../i18n.js';
import { JURISDICTIONS, getJurisdiction, COUNTRY_LIST } from '../../jurisdictions/index.js';
import { computeTax } from '../../engine/tax.js';
import { assumptionsOf } from '../../state/models.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';

export function render({ store, client, jur }) {
  store = store || appStore;
  const cur = jur.currency;
  const A = assumptionsOf(client);
  const F = clientFacts(client, jur);
  const country = client.jurisdiction.country;
  const region = client.jurisdiction.region;
  const setA = (k, v) => store.quietUpdate(c => { c.assumptions = c.assumptions || {}; c.assumptions[k] = v; });

  const countrySel = h('select', { onChange: e => { const c = e.target.value; store.setJurisdiction(c, JURISDICTIONS[c].defaultRegion); toast(`${t('Juridiction', 'Jurisdiction')} : ${JURISDICTIONS[c].name}`); } },
    ...COUNTRY_LIST.map(c => h('option', { value: c.code, selected: c.code === country }, `${c.flag}  ${c.name}`)));
  const regionSel = h('select', { onChange: e => { store.setJurisdiction(country, e.target.value); toast(`${jur.regionLabel} : ${jur.regions[e.target.value]}`); } },
    ...Object.entries(jur.regions).map(([k, v]) => h('option', { value: k, selected: k === region }, v)));

  const jurCard = card(t('Juridiction de planification', 'Planning jurisdiction'), {
    sub: t('Les lois fiscales, comptes enregistrés et prestations s\'ajustent automatiquement', 'Tax laws, registered accounts and benefits adjust automatically'),
    right: h('span', { class: 'flag-em' }, jur.flag) },
    h('div', { class: 'grid cols-2' },
      h('div', { class: 'field' }, h('label', {}, t('Pays', 'Country')), countrySel),
      h('div', { class: 'field' }, h('label', {}, jur.regionLabel), regionSel)),
    h('div', { class: 'sep' }),
    h('div', { class: 'flex between center', style: { gap: '12px', flexWrap: 'wrap', padding: '10px 12px', margin: '4px 0 10px', background: 'var(--surface-2)', borderRadius: '10px', borderLeft: '3px solid var(--accent)' } },
      h('div', {},
        h('div', { style: { fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800 } }, t(`Paramètres fiscaux ${jur.taxYear}`, `Tax parameters ${jur.taxYear}`)),
        h('div', { class: 'tiny muted' }, t(`Barèmes, cotisations, plafonds de comptes, prestations publiques et taux corporatifs de ${jur.name} (${jur.regionName}) pour l’année d’imposition ${jur.taxYear}. À vérifier chaque année (indexation, budgets).`, `${jur.name} (${jur.regionName}) brackets, contributions, account limits, public benefits and corporate rates for tax year ${jur.taxYear}. Verify every year (indexation, budgets).`))),
      h('span', { class: 'chip warn', html: icon('warning', 13) + ' ' + t('Vérifier annuellement', 'Verify yearly') })),
    h('div', { class: 'grid cols-3' },
      infoBlock(t('Devise', 'Currency'), cur),
      infoBlock(t('Abri fiscal principal', 'Main tax shelter'), jur.labels.taxAdvantaged),
      infoBlock(t('Compte libre d\'impôt', 'Tax-free account'), jur.labels.taxFree),
      infoBlock(t('Prestation publique', 'Public benefit'), jur.pensions.cpp.name),
      infoBlock(t('Inclusion gain en capital', 'Capital gains inclusion'), pct(jur.capGainsInclusion, 0)),
      infoBlock(t('Comptes disponibles', 'Available accounts'), String(jur.accounts.length)),
    ),
    h('p', { class: 'tiny muted', style: { marginTop: '14px' } },
      t('En changeant de pays, les types de comptes (REER/CELI ↔ 401(k)/Roth ↔ Pension/ISA), les barèmes d\'imposition, les cotisations sociales et les règles successorales sont remplacés par ceux de la juridiction sélectionnée. Vos données (montants, âges, objectifs) sont conservées.',
        'Changing country replaces the account types (RRSP/TFSA ↔ 401(k)/Roth ↔ Pension/ISA), tax brackets, payroll contributions and estate rules with those of the selected jurisdiction. Your data (amounts, ages, goals) is preserved.')),
  );

  // ---- Comparative tax preview on the primary member's ordinary income (persisted override) ----
  const P = whatIf(client, 'settings', { previewIncome: Math.round(F.primary ? F.primary.ordinary : 0) || 100000 });
  const tbody = h('tbody', {});
  const previewSub = h('div', { class: 'sub' });
  function drawPreview() {
    previewSub.textContent = t(`Impôt sur ${money(P.previewIncome, { currency: cur })} de revenu d’emploi (revenu ordinaire du titulaire) selon la juridiction par défaut de chaque pays`, `Tax on ${money(P.previewIncome, { currency: cur })} of employment income (primary member's ordinary income) by each country's default jurisdiction`);
    tbody.replaceChildren(...Object.values(JURISDICTIONS).map(j => {
      const jj = getJurisdiction(j.country, j.defaultRegion);
      const tx = computeTax(jj, { ordinary: P.previewIncome });
      return h('tr', {},
        h('td', {}, `${j.flag} ${j.name} (${jj.regionName}) · ${jj.taxYear}`),
        h('td', { class: 'num mono' }, money(tx.total, { currency: j.currency })),
        h('td', { class: 'num mono' }, pct(tx.averageRate, 1)),
        h('td', { class: 'num mono' }, pct(tx.marginalRate, 1)),
        h('td', { class: 'num mono' }, money(tx.afterTax, { currency: j.currency })));
    }));
  }
  drawPreview();
  const taxPreview = h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, t('Aperçu fiscal comparé', 'Comparative tax preview')), previewSub)),
    slider({ label: t('Revenu de référence (revenu ordinaire du titulaire)', 'Reference income (primary member ordinary income)'), value: P.previewIncome, min: 0, max: 500000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { P.previewIncome = v; saveWhatIf(store, 'settings', { previewIncome: v }); drawPreview(); } }),
    h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, t('Juridiction', 'Jurisdiction')), h('th', { class: 'num' }, t('Impôt total', 'Total tax')), h('th', { class: 'num' }, t('Taux moyen', 'Avg rate')), h('th', { class: 'num' }, t('Taux marginal', 'Marginal')), h('th', { class: 'num' }, t('Net', 'Net')))),
      tbody)));

  const langCard = card(t('Langue de l\'application', 'Application language'), { sub: t('Bascule instantanée FR / EN', 'Instant FR / EN toggle') },
    h('div', { class: 'seg' },
      h('button', { class: getLang() === 'fr' ? 'on' : '', onClick: () => setLang('fr') }, '🇫🇷  Français'),
      h('button', { class: getLang() === 'en' ? 'on' : '', onClick: () => setLang('en') }, '🇬🇧  English')));

  // ---- Economic assumptions (all keys of defaultAssumptions, saved without re-render) ----
  const econBox = h('div', { class: 'grid cols-2' },
    slider({ label: 'Inflation', value: A.inflation, min: 0, max: 0.06, step: 0.001, format: v => pct(v), onInput: v => setA('inflation', v) }),
    slider({ label: t('Rendement accumulation', 'Accumulation return'), value: A.preReturn, min: 0.01, max: 0.1, step: 0.001, format: v => pct(v), onInput: v => setA('preReturn', v) }),
    slider({ label: t('Rendement retraite', 'Retirement return'), value: A.postReturn, min: 0.01, max: 0.08, step: 0.001, format: v => pct(v), onInput: v => setA('postReturn', v) }),
    slider({ label: t('Volatilité (Monte Carlo)', 'Volatility (Monte Carlo)'), value: A.returnStdev, min: 0.03, max: 0.2, step: 0.005, format: v => pct(v), onInput: v => setA('returnStdev', v) }),
    slider({ label: t('Facteur de volatilité à la retraite', 'Retired volatility factor'), value: A.retiredVolFactor, min: 0.3, max: 1, step: 0.05, format: v => `× ${num(v, 2)}`, onInput: v => setA('retiredVolFactor', v) }),
    slider({ label: t('Croissance salariale', 'Salary growth'), value: A.salaryGrowth, min: 0, max: 0.06, step: 0.001, format: v => pct(v), onInput: v => setA('salaryGrowth', v) }),
    slider({ label: t('Croissance immobilière', 'Real estate growth'), value: A.realEstateGrowth, min: 0, max: 0.08, step: 0.001, format: v => pct(v), onInput: v => setA('realEstateGrowth', v) }),
    slider({ label: t('Inflation des frais d’études', 'Education inflation'), value: A.educationInflation, min: 0, max: 0.08, step: 0.001, format: v => pct(v), onInput: v => setA('educationInflation', v) }),
    slider({ label: t('Rendement distribué (comptes imposables)', 'Distributed yield (taxable accounts)'), value: A.distributionYield, min: 0, max: 1, step: 0.05, format: v => pct(v, 0), onInput: v => setA('distributionYield', v) }),
    slider({ label: t('Essais Monte Carlo', 'Monte Carlo trials'), value: A.mcTrials, min: 200, max: 5000, step: 100, format: v => num(v), onInput: v => setA('mcTrials', v) }),
  );
  const econCard = card(t('Hypothèses économiques', 'Economic assumptions'), { sub: t('Appliquées à toutes les projections (enregistrées sans rechargement)', 'Applied to all projections (saved without reload)') }, econBox);

  // ---- Planning policy assumptions ----
  const policyBox = h('div', { class: 'grid cols-2' },
    slider({ label: t('Niveau de dépenses (multiplicateur what-if)', 'Spending level (what-if multiplier)'), value: A.spendingLevel, min: 0.5, max: 1.5, step: 0.05, format: v => `× ${num(v, 2)}`, onInput: v => setA('spendingLevel', v) }),
    slider({ label: t('Taux d’épargne cible (% du revenu brut)', 'Savings target (% of gross income)'), value: A.savingsTarget, min: 0, max: 0.4, step: 0.01, format: v => pct(v, 0), onInput: v => setA('savingsTarget', v) }),
    slider({ label: t('Fonds d’urgence (mois de dépenses)', 'Emergency fund (months of expenses)'), value: A.emergencyMonths, min: 0, max: 12, step: 1, format: v => `${v} ${t('mois', 'mo')}`, onInput: v => setA('emergencyMonths', v) }),
    slider({ label: t('Âge de conversion FERR', 'RRIF conversion age'), value: A.rrifConvertAge, min: 55, max: 71, step: 1, format: v => `${v}`, onInput: v => setA('rrifConvertAge', v) }),
    slider({ label: t('Assurance vie — remplacement du revenu', 'Life insurance — income replacement'), value: A.lifeReplaceRate, min: 0.3, max: 1, step: 0.05, format: v => pct(v, 0), onInput: v => setA('lifeReplaceRate', v) }),
    slider({ label: t('Assurance vie — taux d’actualisation réel', 'Life insurance — real discount rate'), value: A.lifeDiscount, min: 0, max: 0.06, step: 0.0025, format: v => pct(v, 2), onInput: v => setA('lifeDiscount', v) }),
    slider({ label: t('Dernières dépenses (frais funéraires, etc.)', 'Final expenses (funeral, etc.)'), value: A.finalExpenses, min: 0, max: 100000, step: 1000, format: v => money(v, { currency: cur, compact: true }), onInput: v => setA('finalExpenses', v) }),
    slider({ label: t('Invalidité — remplacement du revenu', 'Disability — income replacement'), value: A.diReplaceRate, min: 0.3, max: 0.9, step: 0.05, format: v => pct(v, 0), onInput: v => setA('diReplaceRate', v) }),
  );
  const policyCard = card(t('Hypothèses de planification', 'Planning assumptions'), { sub: t('Niveau de dépenses, épargne, urgence, FERR, assurance — une seule valeur pour toute l’application', 'Spending, savings, emergency fund, RRIF, insurance — one value for the whole app') }, policyBox);

  const clientsCard = card(t('Dossiers', 'Files'), { sub: t('Gérer les ménages', 'Manage households'),
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' ' + t('Dossier', 'File'), onClick: addClient }) },
    dataTable({
      rows: store.state.clients,
      cols: [
        { key: 'name', label: t('Nom', 'Name') },
        { key: 'jurisdiction', label: t('Juridiction', 'Jurisdiction'), fmt: v => `${JURISDICTIONS[v.country]?.flag || ''} ${JURISDICTIONS[v.country]?.name || v.country}` },
        { key: 'members', label: t('Membres', 'Members'), num: true, fmt: v => v.length },
      ],
      onEdit: (r) => { store.setActive(r.id); toast(t('Dossier activé', 'File activated')); },
      onDelete: store.state.clients.length > 1 ? (r) => { store.deleteClient(r.id); toast(t('Dossier supprimé', 'File deleted')); } : null,
    }));

  const dataCard = card(t('Données & confidentialité', 'Data & privacy'), { sub: t('Vos données restent dans ce navigateur (localStorage)', 'Your data stays in this browser (localStorage)') },
    h('div', { class: 'inline' },
      h('button', { class: 'btn', html: icon('download', 15) + ' ' + t('Exporter (JSON)', 'Export (JSON)'), onClick: exportData }),
      h('button', { class: 'btn', html: icon('doc', 15) + ' ' + t('Importer (JSON)', 'Import (JSON)'), onClick: importData }),
      h('button', { class: 'btn ghost', onClick: () => store.toggleTheme(), html: icon(store.state.theme === 'light' ? 'moon' : 'sun', 15) + ' ' + t('Thème', 'Theme') }),
      h('button', { class: 'btn danger', html: icon('trash', 15) + ' ' + t('Réinitialiser', 'Reset'), onClick: resetAll }),
    ),
    h('p', { class: 'tiny muted', style: { marginTop: '12px' } },
      t('Outil privé à usage personnel — aucune donnée n\'est transmise à un serveur. Cet outil n\'est pas relié au site public jccapital.ca.',
        'Private tool for personal use — no data is sent to any server. This tool is not linked to the public site jccapital.ca.')));

  return h('div', { class: 'grid' },
    h('div', { class: 'span-full' }, jurCard),
    h('div', { class: 'grid cols-2 span-full' }, langCard, taxPreview),
    h('div', { class: 'span-full' }, econCard),
    h('div', { class: 'span-full' }, policyCard),
    h('div', { class: 'grid cols-2 span-full' }, clientsCard, dataCard),
  );

  function addClient() {
    const item = { name: t('Nouveau ménage', 'New household'), country: 'CA', region: 'QC' };
    const c = h('div', { class: 'grid cols-2' },
      h('div', { class: 'field' }, h('label', {}, t('Nom', 'Name')), h('input', { value: item.name, onInput: e => item.name = e.target.value })),
      h('div', { class: 'field' }, h('label', {}, t('Pays', 'Country')), h('select', { onChange: e => { item.country = e.target.value; item.region = JURISDICTIONS[e.target.value].defaultRegion; } },
        ...COUNTRY_LIST.map(x => h('option', { value: x.code }, `${x.flag} ${x.name}`)))));
    const m = modal({ title: t('Nouveau dossier', 'New file'), body: c, footer: [
      h('button', { class: 'btn ghost', onClick: () => m.close() }, t('Annuler', 'Cancel')),
      h('button', { class: 'btn primary', onClick: () => { store.addClient(item.name, item.country, item.region); m.close(); toast(t('Dossier créé', 'File created')); } }, t('Créer', 'Create')),
    ] });
  }
  function exportData() {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: `jc-planner-${Date.now()}.json` }); a.click();
    URL.revokeObjectURL(url); toast(t('Export téléchargé', 'Export downloaded'));
  }
  function importData() {
    const inp = h('input', { type: 'file', accept: '.json', style: { display: 'none' } });
    inp.addEventListener('change', () => {
      const f = inp.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { try { store.importJSON(r.result) ? toast(t('Importé ✓', 'Imported ✓')) : toast(t('Format invalide', 'Invalid format'), 'neg'); } catch (e) { toast(t('Erreur d\'import', 'Import error'), 'neg'); } };
      r.readAsText(f);
    });
    inp.click();
  }
  function resetAll() {
    const m = modal({ title: t('Réinitialiser toutes les données ?', 'Reset all data?'), body: h('p', {}, t('Cette action supprime tous les dossiers et restaure l\'exemple par défaut. Irréversible.', 'This deletes all files and restores the default sample. Irreversible.')),
      footer: [h('button', { class: 'btn ghost', onClick: () => m.close() }, t('Annuler', 'Cancel')),
        h('button', { class: 'btn danger', onClick: () => { localStorage.removeItem('jc_planner_v1'); location.reload(); } }, t('Réinitialiser', 'Reset'))] });
  }
}

function infoBlock(label, value) {
  return h('div', {}, h('div', { class: 'tiny muted' }, label), h('b', { style: { fontSize: '15px' } }, value));
}
