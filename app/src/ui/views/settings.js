import { h, money, pct, icon, toast, modal } from '../dom.js';
import { card, slider, statList, dataTable } from '../widgets.js';
import { store } from '../../state/store.js';
import { JURISDICTIONS, getJurisdiction, COUNTRY_LIST } from '../../jurisdictions/index.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const A = client.assumptions;

  // ---- Jurisdiction ----
  const country = client.jurisdiction.country;
  const region = client.jurisdiction.region;
  const countrySel = h('select', { onChange: e => {
    const c = e.target.value; const def = JURISDICTIONS[c].defaultRegion;
    store.setJurisdiction(c, def); toast(`Juridiction : ${JURISDICTIONS[c].name}`);
  } }, ...COUNTRY_LIST.map(c => h('option', { value: c.code, selected: c.code === country }, `${c.flag}  ${c.name}`)));

  const regionSel = h('select', { onChange: e => { store.setJurisdiction(country, e.target.value); toast(`${jur.regionLabel} : ${jur.regions[e.target.value]}`); } },
    ...Object.entries(jur.regions).map(([k, v]) => h('option', { value: k, selected: k === region }, v)));

  const jurCard = card('Juridiction de planification', {
    sub: 'Les lois fiscales, comptes enregistrés et prestations s\'ajustent automatiquement',
    right: h('span', { class: 'flag-em' }, jur.flag) },
    h('div', { class: 'grid cols-2' },
      h('div', { class: 'field' }, h('label', {}, 'Pays'), countrySel),
      h('div', { class: 'field' }, h('label', {}, jur.regionLabel), regionSel)),
    h('div', { class: 'sep' }),
    h('div', { class: 'grid cols-3' },
      infoBlock('Devise', cur),
      infoBlock('Abri fiscal principal', jur.labels.taxAdvantaged),
      infoBlock('Compte libre d\'impôt', jur.labels.taxFree),
      infoBlock('Prestation publique', jur.pensions.cpp.name),
      infoBlock('Inclusion gain en capital', pct(jur.capGainsInclusion, 0)),
      infoBlock('Comptes disponibles', String(jur.accounts.length)),
    ),
    h('p', { class: 'tiny muted', style: { marginTop: '14px' } },
      'En changeant de pays, les types de comptes (REER/CELI ↔ 401(k)/Roth ↔ Pension/ISA), les barèmes d\'imposition, les cotisations sociales et les règles successorales sont remplacés par ceux de la juridiction sélectionnée. Vos données (montants, âges, objectifs) sont conservées.'),
  );

  // tax preview across countries
  const taxPreview = card('Aperçu fiscal comparé', { sub: `Impôt sur ${money(100000, { currency: cur })} (revenu d\'emploi) selon la juridiction par défaut` },
    h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Juridiction'), h('th', { class: 'num' }, 'Impôt total'), h('th', { class: 'num' }, 'Taux moyen'), h('th', { class: 'num' }, 'Net'))),
      h('tbody', {}))));

  // Build tax preview rows synchronously via dynamic import-free compute
  buildTaxPreview(taxPreview);

  // ---- Assumptions ----
  const assumeBox = h('div', { class: 'grid cols-2' });
  function rebuildAssumptions() {
    assumeBox.replaceChildren(
      slider({ label: 'Inflation', value: A.inflation, min: 0, max: 0.06, step: 0.001, format: v => pct(v), onInput: v => store.quietUpdate(c => c.assumptions.inflation = v) }),
      slider({ label: 'Rendement accumulation', value: A.preReturn, min: 0.01, max: 0.1, step: 0.001, format: v => pct(v), onInput: v => store.quietUpdate(c => c.assumptions.preReturn = v) }),
      slider({ label: 'Rendement retraite', value: A.postReturn, min: 0.01, max: 0.08, step: 0.001, format: v => pct(v), onInput: v => store.quietUpdate(c => c.assumptions.postReturn = v) }),
      slider({ label: 'Volatilité (Monte Carlo)', value: A.returnStdev, min: 0.03, max: 0.2, step: 0.005, format: v => pct(v), onInput: v => store.quietUpdate(c => c.assumptions.returnStdev = v) }),
      slider({ label: 'Croissance salariale', value: A.salaryGrowth, min: 0, max: 0.06, step: 0.001, format: v => pct(v), onInput: v => store.quietUpdate(c => c.assumptions.salaryGrowth = v) }),
      slider({ label: 'Croissance immobilière', value: A.realEstateGrowth, min: 0, max: 0.08, step: 0.001, format: v => pct(v), onInput: v => store.quietUpdate(c => c.assumptions.realEstateGrowth = v) }),
    );
  }
  rebuildAssumptions();
  const assumeCard = card('Hypothèses économiques', { sub: 'Appliquées à toutes les projections' }, assumeBox);

  // ---- Clients ----
  const clientsCard = card('Dossiers', { sub: 'Gérer les ménages',
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' Dossier', onClick: addClient }) },
    dataTable({
      rows: store.state.clients,
      cols: [
        { key: 'name', label: 'Nom' },
        { key: 'jurisdiction', label: 'Juridiction', fmt: v => `${JURISDICTIONS[v.country]?.flag || ''} ${JURISDICTIONS[v.country]?.name || v.country}` },
        { key: 'members', label: 'Membres', num: true, fmt: v => v.length },
      ],
      onEdit: (r) => { store.setActive(r.id); toast('Dossier activé'); },
      onDelete: store.state.clients.length > 1 ? (r) => { store.deleteClient(r.id); toast('Dossier supprimé'); } : null,
    }));

  // ---- Data ----
  const dataCard = card('Données & confidentialité', { sub: 'Vos données restent dans ce navigateur (localStorage)' },
    h('div', { class: 'inline' },
      h('button', { class: 'btn', html: icon('download', 15) + ' Exporter (JSON)', onClick: exportData }),
      h('button', { class: 'btn', html: icon('doc', 15) + ' Importer (JSON)', onClick: importData }),
      h('button', { class: 'btn ghost', onClick: () => store.toggleTheme(), html: icon(store.state.theme === 'light' ? 'moon' : 'sun', 15) + ' Thème' }),
      h('button', { class: 'btn danger', html: icon('trash', 15) + ' Réinitialiser', onClick: resetAll }),
    ),
    h('p', { class: 'tiny muted', style: { marginTop: '12px' } },
      'Outil privé à usage personnel — aucune donnée n\'est transmise à un serveur. Cet outil n\'est pas relié au site public jccapital.ca.'));

  return h('div', { class: 'grid' },
    h('div', { class: 'span-full' }, jurCard),
    h('div', { class: 'grid cols-2 span-full' }, assumeCard, taxPreview),
    h('div', { class: 'grid cols-2 span-full' }, clientsCard, dataCard),
  );

  function addClient() {
    const item = { name: 'Nouveau ménage', country: 'CA', region: 'QC' };
    const c = h('div', { class: 'grid cols-2' },
      h('div', { class: 'field' }, h('label', {}, 'Nom'), h('input', { value: item.name, onInput: e => item.name = e.target.value })),
      h('div', { class: 'field' }, h('label', {}, 'Pays'), h('select', { onChange: e => { item.country = e.target.value; item.region = JURISDICTIONS[e.target.value].defaultRegion; } },
        ...COUNTRY_LIST.map(x => h('option', { value: x.code }, `${x.flag} ${x.name}`)))));
    const m = modal({ title: 'Nouveau dossier', body: c, footer: [
      h('button', { class: 'btn ghost', onClick: () => m.close() }, 'Annuler'),
      h('button', { class: 'btn primary', onClick: () => { store.addClient(item.name, item.country, item.region); m.close(); toast('Dossier créé'); } }, 'Créer'),
    ] });
  }
  function exportData() {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: `jc-planner-${Date.now()}.json` }); a.click();
    URL.revokeObjectURL(url); toast('Export téléchargé');
  }
  function importData() {
    const inp = h('input', { type: 'file', accept: '.json', style: { display: 'none' } });
    inp.addEventListener('change', () => {
      const f = inp.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { try { store.importJSON(r.result) ? toast('Importé ✓') : toast('Format invalide', 'neg'); } catch (e) { toast('Erreur d\'import', 'neg'); } };
      r.readAsText(f);
    });
    inp.click();
  }
  function resetAll() {
    const m = modal({ title: 'Réinitialiser toutes les données ?', body: h('p', {}, 'Cette action supprime tous les dossiers et restaure l\'exemple par défaut. Irréversible.'),
      footer: [h('button', { class: 'btn ghost', onClick: () => m.close() }, 'Annuler'),
        h('button', { class: 'btn danger', onClick: () => { localStorage.removeItem('jc_planner_v1'); location.reload(); } }, 'Réinitialiser')] });
  }
}

function infoBlock(label, value) {
  return h('div', {}, h('div', { class: 'tiny muted' }, label), h('b', { style: { fontSize: '15px' } }, value));
}

async function buildTaxPreview(cardEl) {
  const { computeTax } = await import('../../engine/tax.js');
  const tbody = cardEl.querySelector('tbody');
  if (!tbody) return;
  tbody.replaceChildren(...Object.values(JURISDICTIONS).map(j => {
    const jj = getJurisdiction(j.country, j.defaultRegion);
    const t = computeTax(jj, { ordinary: 100000 });
    return h('tr', {},
      h('td', {}, `${j.flag} ${j.name} (${jj.regionName})`),
      h('td', { class: 'num mono' }, money(t.total, { currency: j.currency })),
      h('td', { class: 'num mono' }, pct(t.averageRate, 1)),
      h('td', { class: 'num mono' }, money(t.afterTax, { currency: j.currency })));
  }));
}
