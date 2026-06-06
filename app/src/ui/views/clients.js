import { h, money, pct, icon, toast, modal, fmtDate, t } from '../dom.js';
import { card } from '../widgets.js';
import { store } from '../../state/store.js';
import { getJurisdiction, JURISDICTIONS, COUNTRY_LIST } from '../../jurisdictions/index.js';
import { netWorthBreakdown } from '../../engine/analysis.js';

export function render({ client, jur, navigate }) {
  let query = '';

  const wrap = h('div', { class: 'grid' });
  const grid = h('div', { class: 'grid cols-3 span-full' });

  function openClient(id) { store.setActive(id); navigate('dashboard'); }

  function newClientModal() {
    const item = { name: '', country: 'CA', region: 'QC' };
    const regionSel = h('select', {}, ...Object.entries(JURISDICTIONS.CA.regions).map(([k, v]) => h('option', { value: k }, v)));
    const countrySel = h('select', { onChange: e => { item.country = e.target.value; const j = JURISDICTIONS[e.target.value]; item.region = j.defaultRegion; regionSel.replaceChildren(...Object.entries(j.regions).map(([k, v]) => h('option', { value: k, selected: k === j.defaultRegion }, v))); } },
      ...COUNTRY_LIST.map(x => h('option', { value: x.code }, `${x.flag} ${x.name}`)));
    regionSel.addEventListener('change', e => item.region = e.target.value);
    const nameInput = h('input', { placeholder: t('Ex. Famille Tremblay / Boulangerie Inc.', 'e.g. Tremblay Family / Bakery Inc.'), onInput: e => item.name = e.target.value });
    const m = modal({
      title: t('Nouveau client', 'New client'),
      body: h('div', { class: 'grid', style: { gap: '14px' } },
        h('div', { class: 'field' }, h('label', {}, t('Nom du client / dossier', 'Client / file name')), nameInput),
        h('div', { class: 'grid cols-2' },
          h('div', { class: 'field' }, h('label', {}, t('Pays', 'Country')), countrySel),
          h('div', { class: 'field' }, h('label', {}, t('Province / État', 'Province / State')), regionSel)),
        h('p', { class: 'tiny muted', style: { margin: 0 } }, t('Le dossier est sauvegardé automatiquement et reste disponible ici.', 'The file is saved automatically and stays available here.'))),
      footer: [
        h('button', { class: 'btn ghost', onClick: () => m.close() }, t('Annuler', 'Cancel')),
        h('button', { class: 'btn primary', onClick: () => { const c = store.addClient(item.name || t('Nouveau client', 'New client'), item.country, item.region); m.close(); toast(t('Client créé ✓', 'Client created ✓')); navigate('profile'); } }, t('Créer et ouvrir', 'Create & open')),
      ],
    });
    setTimeout(() => nameInput.focus(), 50);
  }

  function renameModal(c) {
    const item = { name: c.name };
    const inp = h('input', { value: c.name, onInput: e => item.name = e.target.value });
    const m = modal({ title: t('Renommer', 'Rename'), body: h('div', { class: 'field' }, h('label', {}, t('Nom', 'Name')), inp),
      footer: [h('button', { class: 'btn ghost', onClick: () => m.close() }, t('Annuler', 'Cancel')),
        h('button', { class: 'btn primary', onClick: () => { store.set(s => { const x = s.clients.find(y => y.id === c.id); if (x) { x.name = item.name; x.updatedAt = Date.now(); } }); m.close(); toast(t('Renommé', 'Renamed')); } }, t('Enregistrer', 'Save'))] });
    setTimeout(() => inp.focus(), 50);
  }

  function confirmDelete(c) {
    const m = modal({ title: t('Supprimer ce client ?', 'Delete this client?'),
      body: h('p', {}, t(`« ${c.name} » sera supprimé définitivement. Cette action est irréversible.`, `“${c.name}” will be permanently deleted. This cannot be undone.`)),
      footer: [h('button', { class: 'btn ghost', onClick: () => m.close() }, t('Annuler', 'Cancel')),
        h('button', { class: 'btn danger', onClick: () => { store.deleteClient(c.id); m.close(); toast(t('Client supprimé', 'Client deleted')); } }, t('Supprimer', 'Delete'))] });
  }

  function buildGrid() {
    const clients = store.state.clients
      .filter(c => !query || c.name.toLowerCase().includes(query.toLowerCase()))
      .slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    const newCard = h('button', { class: 'card', style: { border: '2px dashed var(--border-strong)', background: 'var(--surface-2)', cursor: 'pointer', minHeight: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--brand-500)' }, onClick: newClientModal },
      h('div', { style: { width: '44px', height: '44px', borderRadius: '50%', background: 'var(--brand-500)', color: '#fff', display: 'grid', placeContent: 'center' }, html: icon('plus', 24) }),
      h('b', {}, t('Nouveau client', 'New client')));

    const cards = clients.map(c => {
      const cj = getJurisdiction(c.jurisdiction.country, c.jurisdiction.region);
      const nw = netWorthBreakdown(c);
      const isActive = c.id === store.state.activeId;
      const primary = c.members?.[0];
      return h('div', { class: 'card', style: { position: 'relative', cursor: 'pointer', borderColor: isActive ? 'var(--brand-400)' : 'var(--border)', boxShadow: isActive ? '0 0 0 2px var(--brand-400) inset' : 'var(--shadow-sm)' }, onClick: () => openClient(c.id) },
        isActive ? h('span', { class: 'chip pos', style: { position: 'absolute', top: '12px', right: '12px' } }, t('Actif', 'Active')) : null,
        h('div', { class: 'flex center gap-8', style: { marginBottom: '6px' } },
          h('span', { class: 'flag-em' }, cj.flag),
          h('b', { style: { fontFamily: 'var(--font-display)', fontSize: '16px' } }, c.name)),
        h('div', { class: 'tiny muted' }, `${cj.name} · ${cj.regionName} · ${c.members?.length || 1} ${t('membre(s)', 'member(s)')}${c.business ? ' · ' + t('société', 'corp') : ''}`),
        h('div', { class: 'flex between', style: { marginTop: '12px' } },
          h('div', {}, h('div', { class: 'tiny muted' }, t('Valeur nette', 'Net worth')), h('b', { class: 'mono' }, money(nw.netWorth, { currency: cj.currency, compact: true }))),
          h('div', { style: { textAlign: 'right' } }, h('div', { class: 'tiny muted' }, t('Modifié', 'Updated')), h('div', { class: 'tiny' }, fmtDate(new Date(c.updatedAt || c.createdAt || Date.now()).toISOString())))),
        c.household?.reviewDate ? h('div', { class: 'tiny', style: { marginTop: '6px', color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: '5px' } }, h('span', { html: icon('warning', 12) }), t('Révision : ', 'Review: ') + fmtDate(c.household.reviewDate)) : null,
        h('div', { class: 'sep', style: { margin: '12px 0 8px' } }),
        h('div', { class: 'inline', style: { flexWrap: 'nowrap' }, onClick: e => e.stopPropagation() },
          h('button', { class: 'btn sm primary', onClick: () => openClient(c.id), html: t('Ouvrir', 'Open') }),
          h('button', { class: 'btn sm ghost icon', title: t('Renommer', 'Rename'), onClick: () => renameModal(c), html: icon('edit', 15) }),
          h('button', { class: 'btn sm ghost icon', title: t('Dupliquer', 'Duplicate'), onClick: () => { store.duplicateClient(c.id); toast(t('Dupliqué', 'Duplicated')); }, html: icon('doc', 15) }),
          store.state.clients.length > 1 ? h('button', { class: 'btn sm ghost icon danger', title: t('Supprimer', 'Delete'), onClick: () => confirmDelete(c), html: icon('trash', 15) }) : null,
        ));
    });

    grid.replaceChildren(newCard, ...cards);
  }
  buildGrid();

  // Header
  const header = card('', { class: 'span-full' },
    h('div', { class: 'flex between center', style: { flexWrap: 'wrap', gap: '12px' } },
      h('div', {},
        h('h2', { style: { margin: '0 0 2px', fontFamily: 'var(--font-display)' } }, t('Mes clients', 'My clients')),
        h('div', { class: 'muted tiny' }, t(`${store.state.clients.length} dossier(s) · sauvegarde automatique dans ce navigateur`, `${store.state.clients.length} file(s) · auto-saved in this browser`))),
      h('div', { class: 'inline' },
        h('input', { placeholder: t('Rechercher un client…', 'Search a client…'), style: { width: '220px' }, onInput: e => { query = e.target.value; buildGrid(); } }),
        h('button', { class: 'btn', html: icon('download', 14) + ' ' + t('Sauvegarde', 'Backup'), onClick: exportAll }),
        h('button', { class: 'btn', html: icon('doc', 14) + ' ' + t('Restaurer', 'Restore'), onClick: importAll }),
        h('button', { class: 'btn primary', html: icon('plus', 14) + ' ' + t('Nouveau client', 'New client'), onClick: newClientModal }),
      )));

  const tip = card('', { class: 'span-full', style: {} },
    h('div', { class: 'flex center gap-8' },
      h('span', { class: 'chip info', html: icon('check', 13) }),
      h('div', { class: 'tiny muted' }, t('Chaque modification est enregistrée instantanément. Vos dossiers restent ici tant que vous utilisez le même navigateur. Faites une « Sauvegarde » (fichier JSON) régulièrement pour les conserver hors ligne ou les transférer sur un autre appareil.',
        'Every change is saved instantly. Your files stay here as long as you use the same browser. Make a “Backup” (JSON file) regularly to keep them offline or move them to another device.'))));

  wrap.appendChild(header);
  wrap.appendChild(grid);
  wrap.appendChild(tip);
  return wrap;

  function exportAll() {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: `jc-clients-${new Date().toISOString().slice(0, 10)}.json` }); a.click();
    URL.revokeObjectURL(url); toast(t('Sauvegarde téléchargée ✓', 'Backup downloaded ✓'));
  }
  function importAll() {
    const inp = h('input', { type: 'file', accept: '.json', style: { display: 'none' } });
    inp.addEventListener('change', () => {
      const f = inp.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { try { store.importJSON(r.result) ? toast(t('Dossiers restaurés ✓', 'Files restored ✓')) : toast(t('Format invalide', 'Invalid format'), 'neg'); } catch (e) { toast(t('Erreur', 'Error'), 'neg'); } };
      r.readAsText(f);
    });
    inp.click();
  }
}
