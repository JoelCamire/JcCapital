import { h, money, pct, icon, toast, modal, fmtDate, t } from '../dom.js';
import { card } from '../widgets.js';
import { store } from '../../state/store.js';
import { sync } from '../../sync.js';
import { getJurisdiction, JURISDICTIONS, COUNTRY_LIST } from '../../jurisdictions/index.js';
import { netWorthBreakdown } from '../../engine/analysis.js';
import { lifecycleOf, LIFECYCLE_META, contactName } from '../../engine/crm.js';

function syncErr(e) {
  const m = (e && e.message) || '';
  if (m === 'bad-token') return t('Jeton invalide ou sans la portée « gist ».', 'Invalid token or missing “gist” scope.');
  if (m === 'no-token') return t('Aucun jeton configuré.', 'No token configured.');
  return t('Échec de connexion au nuage (réseau ?).', 'Cloud connection failed (network?).');
}

function buildSyncCard() {
  const box = h('div', {});
  const status = h('div', { class: 'tiny muted', style: { marginTop: '8px' } });
  function setStatus(msg) { status.textContent = msg; }

  function paint() {
    if (!sync.configured) {
      const tokenInput = h('input', { type: 'password', placeholder: t('Collez votre jeton GitHub (portée « gist »)', 'Paste your GitHub token (scope “gist”)'), style: { width: '320px' } });
      box.replaceChildren(
        h('p', { class: 'tiny muted', style: { marginTop: 0 } },
          t('Synchronisez vos dossiers entre tous vos appareils, gratuitement, via un gist privé GitHub. Étapes : 1) créez un jeton (un seul clic ci-dessous, cochez uniquement « gist »), 2) collez-le ici, 3) Connecter.',
            'Sync your files across all your devices, free, via a private GitHub gist. Steps: 1) create a token (one click below, check only “gist”), 2) paste it here, 3) Connect.')),
        h('div', { class: 'inline' },
          h('a', { class: 'btn sm', href: 'https://github.com/settings/tokens/new?scopes=gist&description=JC%20Planner', target: '_blank', rel: 'noopener', html: icon('globe', 14) + ' ' + t('Créer un jeton', 'Create a token') }),
          tokenInput,
          h('button', { class: 'btn primary sm', html: icon('check', 14) + ' ' + t('Connecter', 'Connect'), onClick: async () => {
            sync.setToken(tokenInput.value);
            setStatus(t('Vérification…', 'Verifying…'));
            try {
              await sync.test();
              const remote = await sync.pull();
              if (remote) {
                const r = store.mergeJSON(remote);
                toast(t('Connecté ✓ Dossiers fusionnés', 'Connected ✓ Files merged'));
              } else {
                await sync.push(store.exportJSON());
                toast(t('Connecté ✓ Dossiers envoyés au nuage', 'Connected ✓ Files pushed to cloud'));
              }
              sync.setAuto(true);
              paint();
            } catch (e) { sync.setToken(''); setStatus(syncErr(e)); }
          } }),
        ),
        status,
      );
    } else {
      const autoChk = h('input', { type: 'checkbox', checked: sync.auto, style: { width: 'auto' }, onChange: e => { sync.setAuto(e.target.checked); toast(sync.auto ? t('Synchro auto activée', 'Auto-sync on') : t('Synchro auto désactivée', 'Auto-sync off')); } });
      box.replaceChildren(
        h('div', { class: 'flex between center', style: { flexWrap: 'wrap', gap: '10px' } },
          h('div', { class: 'flex center gap-8' }, h('span', { class: 'chip pos' }, t('Connecté', 'Connected')),
            h('span', { class: 'tiny muted' }, sync.gistId ? t('Gist privé : ', 'Private gist: ') + sync.gistId.slice(0, 8) + '…' : t('Prêt', 'Ready'))),
          h('div', { class: 'inline' },
            h('label', { class: 'inline', style: { gap: '6px' } }, autoChk, h('span', { class: 'tiny' }, t('Synchro automatique', 'Auto-sync'))),
            h('button', { class: 'btn sm', html: icon('up', 14) + ' ' + t('Envoyer', 'Push'), onClick: async () => { setStatus(t('Envoi…', 'Pushing…')); try { await sync.push(store.exportJSON()); setStatus(t('Envoyé ✓ ' + new Date().toLocaleTimeString(), 'Pushed ✓ ' + new Date().toLocaleTimeString())); toast(t('Envoyé au nuage ✓', 'Pushed to cloud ✓')); } catch (e) { setStatus(syncErr(e)); } } }),
            h('button', { class: 'btn sm', html: icon('down', 14) + ' ' + t('Recevoir', 'Pull'), onClick: async () => { setStatus(t('Réception…', 'Pulling…')); try { const r = await sync.pull(); if (r) { const m = store.mergeJSON(r); setStatus(t(`Reçu ✓ ${m.total} dossier(s)`, `Pulled ✓ ${m.total} file(s)`)); toast(t('Dossiers synchronisés ✓', 'Files synced ✓')); } else setStatus(t('Aucun dossier dans le nuage.', 'No files in the cloud.')); } catch (e) { setStatus(syncErr(e)); } } }),
            h('button', { class: 'btn sm ghost danger', html: t('Déconnecter', 'Disconnect'), onClick: () => { sync.setToken(''); sync.setGistId(''); sync.setAuto(false); toast(t('Déconnecté', 'Disconnected')); paint(); } }),
          )),
        h('p', { class: 'tiny muted', style: { marginTop: '8px' } },
          t('« Envoyer » téléverse vos dossiers; « Recevoir » fusionne ceux du nuage (la version la plus récente de chaque client gagne). Avec la synchro auto, l’envoi se fait à chaque modification et la réception au chargement.',
            '“Push” uploads your files; “Pull” merges the cloud’s (newest version of each client wins). With auto-sync, push happens on every change and pull on load.')),
        status,
      );
    }
  }
  paint();
  return card(t('Synchronisation entre appareils', 'Sync across devices'), { sub: t('Gratuit, via un gist privé GitHub', 'Free, via a private GitHub gist'), class: 'span-full', right: h('span', { class: 'chip', html: icon('globe', 13) + ' GitHub' }) }, box);
}

export function render({ client, jur, navigate }) {
  let query = '';
  let lifeFilter = 'all';

  const wrap = h('div', { class: 'grid' });
  const grid = h('div', { class: 'grid cols-3 span-full' });

  function openClient(id) { store.setActive(id); navigate('relation'); }

  function newClientModal() {
    const item = { name: '', country: 'CA', region: 'QC', lifecycle: 'prospect' };
    const regionSel = h('select', {}, ...Object.entries(JURISDICTIONS.CA.regions).map(([k, v]) => h('option', { value: k }, v)));
    const countrySel = h('select', { onChange: e => { item.country = e.target.value; const j = JURISDICTIONS[e.target.value]; item.region = j.defaultRegion; regionSel.replaceChildren(...Object.entries(j.regions).map(([k, v]) => h('option', { value: k, selected: k === j.defaultRegion }, v))); } },
      ...COUNTRY_LIST.map(x => h('option', { value: x.code }, `${x.flag} ${x.name}`)));
    regionSel.addEventListener('change', e => item.region = e.target.value);
    const lifeSel = h('select', { onChange: e => item.lifecycle = e.target.value },
      ...['prospect', 'lead', 'client'].map(k => h('option', { value: k, selected: k === item.lifecycle }, LIFECYCLE_META[k].label())));
    const nameInput = h('input', { placeholder: t('Ex. Famille Tremblay / Boulangerie Inc.', 'e.g. Tremblay Family / Bakery Inc.'), onInput: e => item.name = e.target.value });
    const m = modal({
      title: t('Nouveau contact', 'New contact'),
      body: h('div', { class: 'grid', style: { gap: '14px' } },
        h('div', { class: 'field' }, h('label', {}, t('Nom du contact / dossier', 'Contact / file name')), nameInput),
        h('div', { class: 'grid cols-2' },
          h('div', { class: 'field' }, h('label', {}, t('Type', 'Type')), lifeSel),
          h('div', { class: 'field' }, h('label', {}, t('Pays', 'Country')), countrySel)),
        h('div', { class: 'field' }, h('label', {}, t('Province / État', 'Province / State')), regionSel),
        h('p', { class: 'tiny muted', style: { margin: 0 } }, t('Le dossier est sauvegardé automatiquement et reste disponible ici.', 'The file is saved automatically and stays available here.'))),
      footer: [
        h('button', { class: 'btn ghost', onClick: () => m.close() }, t('Annuler', 'Cancel')),
        h('button', { class: 'btn primary', onClick: () => { const c = store.addClient(item.name || t('Nouveau contact', 'New contact'), item.country, item.region); store.update(x => { x.crm.lifecycle = item.lifecycle; }); m.close(); toast(t('Contact créé ✓', 'Contact created ✓')); navigate('relation'); } }, t('Créer et ouvrir', 'Create & open')),
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
      .filter(c => !query || c.name.toLowerCase().includes(query.toLowerCase()) || contactName(c).toLowerCase().includes(query.toLowerCase()))
      .filter(c => lifeFilter === 'all' || lifecycleOf(c) === lifeFilter || (lifeFilter === 'prospect' && lifecycleOf(c) === 'lead'))
      .slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    const newCard = h('button', { class: 'card', style: { border: '2px dashed var(--border-strong)', background: 'var(--surface-2)', cursor: 'pointer', minHeight: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--brand-500)' }, onClick: newClientModal },
      h('div', { style: { width: '44px', height: '44px', borderRadius: '50%', background: 'var(--brand-500)', color: '#fff', display: 'grid', placeContent: 'center' }, html: icon('plus', 24) }),
      h('b', {}, t('Nouveau client', 'New client')));

    const cards = clients.map(c => {
      const cj = getJurisdiction(c.jurisdiction.country, c.jurisdiction.region);
      const nw = netWorthBreakdown(c);
      const isActive = c.id === store.state.activeId;
      const life = lifecycleOf(c);
      const lm = LIFECYCLE_META[life] || LIFECYCLE_META.client;
      const openOpps = (c.opportunities || []).filter(o => ['new', 'contacted', 'meeting', 'proposal'].includes(o.stage)).length;
      const tags = (c.crm && c.crm.tags) || [];
      return h('div', { class: 'card', style: { position: 'relative', cursor: 'pointer', borderColor: isActive ? 'var(--brand-400)' : 'var(--border)', boxShadow: isActive ? '0 0 0 2px var(--brand-400) inset' : 'var(--shadow-sm)' }, onClick: () => openClient(c.id) },
        h('span', { class: 'chip', style: { position: 'absolute', top: '12px', right: '12px', background: lm.color, color: 'var(--c-black)' } }, lm.label()),
        h('div', { class: 'flex center gap-8', style: { marginBottom: '6px', paddingRight: '70px' } },
          h('span', { class: 'flag-em' }, cj.flag),
          h('b', { style: { fontFamily: 'var(--font-display)', fontSize: '16px' } }, c.name)),
        h('div', { class: 'tiny muted' }, `${cj.name} · ${cj.regionName} · ${c.members?.length || 1} ${t('membre(s)', 'member(s)')}${c.business ? ' · ' + t('société', 'corp') : ''}`),
        tags.length ? h('div', { class: 'inline', style: { gap: '5px', marginTop: '7px' } }, ...tags.slice(0, 4).map(tg => h('span', { class: 'chip', style: { fontSize: '10.5px' } }, tg))) : null,
        openOpps ? h('div', { class: 'tiny', style: { marginTop: '7px', color: 'var(--c-gold)', display: 'flex', alignItems: 'center', gap: '5px' } }, h('span', { html: icon('funnel', 12) }), `${openOpps} ${t('opportunité(s) ouverte(s)', 'open opportunity(ies)')}`) : null,
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
  const counts = store.state.clients.reduce((a, c) => { const l = lifecycleOf(c); a[l] = (a[l] || 0) + 1; return a; }, {});
  const pills = h('div', { class: 'pill-tabs', style: { marginBottom: 0 } },
    ...[['all', t('Tous', 'All')], ['prospect', LIFECYCLE_META.prospect.label()], ['client', LIFECYCLE_META.client.label()], ['inactive', LIFECYCLE_META.inactive.label()]]
      .map(([k, label]) => h('a', { href: 'javascript:void 0', class: k === lifeFilter ? 'on' : '',
        onClick: e => { e.preventDefault(); lifeFilter = k; document.querySelectorAll('.cl-pills a').forEach(x => x.classList.remove('on')); e.target.classList.add('on'); buildGrid(); } }, label)));
  pills.classList.add('cl-pills');
  const header = card('', { class: 'span-full' },
    h('div', { class: 'flex between center', style: { flexWrap: 'wrap', gap: '12px' } },
      h('div', {},
        h('h2', { style: { margin: '0 0 2px', fontFamily: 'var(--font-display)' } }, t('Contacts', 'Contacts')),
        h('div', { class: 'muted tiny' }, t(`${counts.prospect || 0} prospect(s) · ${counts.client || 0} client(s) · sauvegarde automatique`, `${counts.prospect || 0} prospect(s) · ${counts.client || 0} client(s) · auto-saved`))),
      h('div', { class: 'inline' },
        h('input', { placeholder: t('Rechercher…', 'Search…'), style: { width: '200px' }, onInput: e => { query = e.target.value; buildGrid(); } }),
        h('button', { class: 'btn', html: icon('download', 14) + ' ' + t('Sauvegarde', 'Backup'), onClick: exportAll }),
        h('button', { class: 'btn', html: icon('doc', 14) + ' ' + t('Restaurer', 'Restore'), onClick: importAll }),
        h('button', { class: 'btn primary', html: icon('plus', 14) + ' ' + t('Nouveau contact', 'New contact'), onClick: newClientModal }),
      )),
    h('div', { style: { marginTop: '12px' } }, pills));

  const tip = card('', { class: 'span-full', style: {} },
    h('div', { class: 'flex center gap-8' },
      h('span', { class: 'chip info', html: icon('check', 13) }),
      h('div', { class: 'tiny muted' }, t('Chaque modification est enregistrée instantanément. Vos dossiers restent ici tant que vous utilisez le même navigateur. Faites une « Sauvegarde » (fichier JSON) régulièrement pour les conserver hors ligne ou les transférer sur un autre appareil.',
        'Every change is saved instantly. Your files stay here as long as you use the same browser. Make a “Backup” (JSON file) regularly to keep them offline or move them to another device.'))));

  wrap.appendChild(header);
  wrap.appendChild(grid);
  wrap.appendChild(buildSyncCard());
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
