import { h, money, pct, icon, toast, t } from '../dom.js';
import { kpi, card, dataTable, legend, statList } from '../widgets.js';
import { donutChart, barChart, PALETTE } from '../charts.js';
import { formModal } from '../editor.js';
import { store } from '../../state/store.js';
import { newAsset, newLiability } from '../../state/models.js';
import { accountTypesFor, accountMeta } from '../../jurisdictions/index.js';
import { clientFacts } from '../../engine/facts.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const nw = F.netWorth;
  const fmtYears = (y) => !Number.isFinite(y) ? t('Impayable', 'Unpayable') : y <= 0 ? '—' : t(`${y.toFixed(1)} ans`, `${y.toFixed(1)} yrs`);
  const accTypes = accountTypesFor(client.jurisdiction.country);
  const accOpts = [...accTypes.map(a => ({ value: a.id, label: `${a.name}` })),
    { value: 'realestate', label: t('Immobilier', 'Real estate') }, { value: 'cash', label: t('Encaisse', 'Cash') }, { value: 'other', label: t('Autre actif', 'Other asset') }];
  const liabOpts = [
    { value: 'mortgage', label: t('Hypothèque', 'Mortgage') }, { value: 'loan', label: t('Prêt personnel / auto', 'Personal / auto loan') },
    { value: 'credit', label: t('Crédit / marge', 'Credit / line') }, { value: 'student', label: t('Prêt étudiant', 'Student loan') }, { value: 'other', label: t('Autre', 'Other') },
  ];
  const memberOpts = client.members.map(m => ({ value: m.id, label: m.name }));
  const nameOf = (id) => client.members.find(m => m.id === id)?.name || '—';
  const liabLbl = v => (liabOpts.find(o => o.value === v) || {}).label || v;
  const donutSegs = nw.byTreat.map((b, i) => ({ label: b.label, value: b.value, color: PALETTE[i % PALETTE.length] }));

  const kpis = h('div', { class: 'grid cols-4 span-full' },
    kpi({ label: t('Actifs totaux', 'Total assets'), value: money(nw.assets, { currency: cur, compact: true }), iconName: 'bank' }),
    kpi({ label: t('Passifs totaux', 'Total liabilities'), value: money(nw.liabilities, { currency: cur, compact: true }), iconName: 'doc', accent: 'var(--neg)' }),
    kpi({ label: t('Valeur nette', 'Net worth'), value: money(nw.netWorth, { currency: cur, compact: true }), iconName: 'networth', accent: 'var(--pos)' }),
    kpi({ label: t('Actifs liquides', 'Liquid assets'), value: money(nw.liquid, { currency: cur, compact: true }), sub: t(`Ratio dettes/actifs ${pct(nw.debtToAsset, 0)}`, `Debt-to-asset ${pct(nw.debtToAsset, 0)}`) }),
  );

  const assetsCard = card(t('Actifs', 'Assets'), {
    sub: t('Comptes, placements et biens', 'Accounts, investments and property'),
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' ' + t('Actif', 'Asset'), onClick: () => editAsset(newAsset({ ownerId: client.members[0].id }), true) }),
  },
    dataTable({
      rows: client.assets,
      cols: [
        { key: 'label', label: t('Description', 'Description') },
        { key: 'type', label: 'Type', fmt: v => accountMeta(client.jurisdiction.country, v).name || v },
        { key: 'ownerId', label: t('Titulaire', 'Owner'), fmt: nameOf },
        { key: 'value', label: t('Valeur', 'Value'), num: true, fmt: v => money(v, { currency: cur }) },
        { key: 'growth', label: t('Rendement', 'Return'), num: true, fmt: v => pct(v) },
        { key: 'annualContribution', label: t('Cotisation/an', 'Contribution/yr'), num: true, fmt: v => v ? money(v, { currency: cur }) : '—' },
      ],
      onEdit: (r) => editAsset(r, false),
      onDelete: (r) => { store.update(c => c.assets = c.assets.filter(a => a.id !== r.id)); toast(t('Actif supprimé', 'Asset removed')); },
    }));

  const liabCard = card(t('Passifs', 'Liabilities'), {
    sub: t('Dettes et engagements', 'Debts and obligations'),
    right: h('button', { class: 'btn primary sm', html: icon('plus', 14) + ' ' + t('Passif', 'Liability'), onClick: () => editLiab(newLiability(), true) }),
  },
    dataTable({
      rows: F.liabilities,                       // facts rows carry payoff / compounding derived by the shared amortization engine
      cols: [
        { key: 'label', label: t('Description', 'Description') },
        { key: 'type', label: 'Type', fmt: liabLbl },
        { key: 'balance', label: t('Solde', 'Balance'), num: true, fmt: v => money(v, { currency: cur }) },
        { key: 'rate', label: t('Taux', 'Rate'), num: true, fmt: (v, r) => `${pct(v, 2)} ${r.compounding === 'semi-annual' ? t('(semestriel)', '(semi-annual)') : ''}` },
        { key: 'payment', label: t('Paiement/mois', 'Payment/mo'), num: true, fmt: (v, r) => r.extraPayment > 0 ? `${money(v, { currency: cur })} + ${money(r.extraPayment, { currency: cur })}` : money(v, { currency: cur }) },
        { key: 'payoffYears', label: t('Remboursée dans', 'Paid off in'), num: true, fmt: fmtYears },
      ],
      onEdit: (r) => editLiab(r, false),
      onDelete: (r) => { store.update(c => c.liabilities = c.liabilities.filter(l => l.id !== r.id)); toast(t('Passif supprimé', 'Liability removed')); },
    }));

  const breakdownCard = card(t('Répartition fiscale des actifs', 'Asset tax breakdown'), { sub: t('Optimisation de l\'emplacement des actifs', 'Asset location optimization') },
    h('div', { class: 'flex center', style: { justifyContent: 'center' } },
      h('div', { html: donutChart({ segments: donutSegs, centerLabel: money(nw.assets, { currency: cur, compact: true }), centerSub: t('actifs', 'assets') }) })),
    h('div', { class: 'sep' }),
    legend(donutSegs.map(s => ({ color: s.color, label: `${s.label} · ${pct(nw.assets ? s.value / nw.assets : 0, 0)}` }))),
  );

  const infoCard = card(t('Notes sur les régimes', 'Plan notes') + ' — ' + jur.name, { sub: t('Règles fiscales applicables', 'Applicable tax rules') },
    h('div', {}, ...accTypes.map(a => h('div', { style: { padding: '9px 0', borderBottom: '1px solid var(--border)' } },
      h('div', { class: 'flex between' }, h('b', {}, `${a.name}`), a.limit ? h('span', { class: 'chip info' }, t(`Max ${money(a.limit, { currency: cur })}/an`, `Max ${money(a.limit, { currency: cur })}/yr`)) : null),
      h('div', { class: 'tiny muted' }, a.note),
    ))));

  return h('div', { class: 'grid' },
    kpis,
    h('div', { class: 'span-full' }, assetsCard),
    h('div', { class: 'span-full' }, liabCard),
    h('div', { class: 'grid cols-2 span-full' }, breakdownCard, infoCard),
  );

  function editAsset(item, isNew) {
    const meta = accountMeta(client.jurisdiction.country, item.type);
    formModal({ title: isNew ? t('Nouvel actif', 'New asset') : t('Modifier l\'actif', 'Edit asset'), item,
      intro: meta.note,
      fields: [
        { key: 'label', label: t('Description', 'Description') },
        { key: 'type', label: t('Type de compte', 'Account type'), type: 'select', opts: accOpts },
        { key: 'ownerId', label: t('Titulaire', 'Owner'), type: 'select', opts: memberOpts },
        { key: 'value', label: t(`Valeur actuelle (${cur})`, `Current value (${cur})`), type: 'number' },
        { key: 'costBasis', label: t(`Coût / base (${cur})`, `Cost basis (${cur})`), type: 'number', hint: t('Pour le calcul des gains en capital', 'For capital gains calculation') },
        { key: 'growth', label: t('Rendement annuel', 'Annual return'), type: 'pct' },
        { key: 'annualContribution', label: t(`Cotisation annuelle (${cur})`, `Annual contribution (${cur})`), type: 'number' },
        { key: 'employerMatch', label: t(`Contribution employeur (${cur})`, `Employer match (${cur})`), type: 'number' },
      ],
      onSave: (d) => store.update(c => { if (isNew) c.assets.push(d); else Object.assign(c.assets.find(a => a.id === d.id), d); }),
    });
  }
  function editLiab(item, isNew) {
    // edit the raw client record (not the facts row) so derived fields never get persisted
    const raw = client.liabilities.find(l => l.id === item.id) || item;
    const compOpts = [
      { value: '', label: t(`Auto (hypothèque ${jur.country === 'CA' ? 'semestriel' : 'mensuel'}, autres mensuel)`, `Auto (mortgage ${jur.country === 'CA' ? 'semi-annual' : 'monthly'}, others monthly)`) },
      { value: 'monthly', label: t('Mensuel', 'Monthly') },
      { value: 'semi-annual', label: t('Semestriel (hypothèque canadienne)', 'Semi-annual (Canadian mortgage)') },
    ];
    formModal({ title: isNew ? t('Nouveau passif', 'New liability') : t('Modifier le passif', 'Edit liability'), item: { ...raw, compounding: raw.compounding || '' },
      fields: [
        { key: 'label', label: t('Description', 'Description') },
        { key: 'type', label: 'Type', type: 'select', opts: liabOpts },
        { key: 'balance', label: t(`Solde (${cur})`, `Balance (${cur})`), type: 'number' },
        { key: 'rate', label: t('Taux d\'intérêt', 'Interest rate'), type: 'pct', step: 0.01 },
        { key: 'payment', label: t(`Paiement mensuel (${cur})`, `Monthly payment (${cur})`), type: 'number' },
        { key: 'extraPayment', label: t(`Paiement additionnel / mois (${cur})`, `Extra payment / mo (${cur})`), type: 'number', hint: t('Utilisé par la projection et l’onglet Dettes', 'Used by the projection and the Debt tab') },
        { key: 'compounding', label: t('Capitalisation', 'Compounding'), type: 'select', opts: compOpts },
      ],
      onSave: (d) => store.update(c => {
        d.compounding = d.compounding || null; d.extraPayment = Math.max(0, +d.extraPayment || 0);
        if (isNew) c.liabilities.push(d); else Object.assign(c.liabilities.find(l => l.id === d.id), d);
      }),
    });
  }
}
