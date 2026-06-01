import { h, money, pct, num, icon, toast, t } from '../dom.js';
import { kpi, card, slider, statList, legend, badgeScore } from '../widgets.js';
import { barChart, donutChart, lineChart, PALETTE } from '../charts.js';
import { formModal } from '../editor.js';
import { store } from '../../state/store.js';
import { newBusiness } from '../../state/models.js';
import { corporateTaxCA, salaryVsDividend, retainVsDistribute, businessValuation, lcgeSale } from '../../engine/corporate.js';

export function render({ client, jur, navigate }) {
  const cur = jur.currency;
  const B = client.business || newBusiness({ ownerId: client.members[0]?.id });
  const ownerName = client.members.find(m => m.id === B.ownerId)?.name || client.members[0]?.name || t('Propriétaire', 'Owner');
  const isCA = jur.country === 'CA';

  const structOpts = [
    { value: 'incorporated', label: t('Société par actions (incorporée)', 'Incorporated') },
    { value: 'sole', label: t('Entreprise individuelle', 'Sole proprietor') },
    { value: 'partnership', label: t('Société de personnes', 'Partnership') },
    { value: 'holdco', label: t('Société de portefeuille (Holdco)', 'Holding company') },
  ];
  const structLabel = v => (structOpts.find(o => o.value === v) || {}).label || v;

  // ---------- KPIs ----------
  const corp = isCA ? corporateTaxCA(jur, B.activeIncome, B.passiveIncome) : null;
  const corpEff = corp ? corp.effectiveActiveRate : (jur.country === 'US' ? 0.21 : 0.20);
  const kpis = h('div', { class: 'grid cols-4 span-full' },
    kpi({ label: t('Revenu d’entreprise actif', 'Active business income'), value: money(B.activeIncome, { currency: cur, compact: true }), iconName: 'bank' }),
    kpi({ label: t('Revenu passif (placements)', 'Passive (investment) income'), value: money(B.passiveIncome, { currency: cur, compact: true }),
      accent: B.passiveIncome > 50000 ? 'var(--warn)' : '', sub: B.passiveIncome > 50000 ? t('Érosion de la DPE', 'SBD grind') : '' }),
    kpi({ label: t('Taux d’impôt corporatif effectif', 'Effective corporate tax rate'), value: pct(corpEff, 1), iconName: 'tax' }),
    kpi({ label: t('Bénéfices non répartis', 'Retained earnings'), value: money(B.retainedEarnings, { currency: cur, compact: true }), sub: t(`${money(B.corpInvestments, { currency: cur, compact: true })} en placements`, `${money(B.corpInvestments, { currency: cur, compact: true })} invested`) }),
  );

  // ---------- Profile ----------
  const profileCard = card(t('Profil de l’entreprise', 'Business profile'), {
    sub: B.name || t('Aucun nom', 'Unnamed'),
    right: h('button', { class: 'btn sm', html: icon('edit', 14) + ' ' + t('Modifier', 'Edit'), onClick: editProfile }),
  },
    h('div', { class: 'grid cols-2' },
      statList([
        [t('Dénomination', 'Name'), B.name || '—'],
        [t('Structure', 'Structure'), structLabel(B.structure)],
        [t('Propriétaire', 'Owner'), ownerName],
        [t('Fin d’exercice', 'Fiscal year-end'), B.fiscalYearEnd || '—'],
      ]),
      statList([
        [t('Revenu actif', 'Active income'), money(B.activeIncome, { currency: cur })],
        [t('Revenu passif', 'Passive income'), money(B.passiveIncome, { currency: cur })],
        [t('Bénéfices non répartis', 'Retained earnings'), money(B.retainedEarnings, { currency: cur })],
        [t('Placements corporatifs', 'Corporate investments'), money(B.corpInvestments, { currency: cur })],
      ]),
    ));

  // ---------- Corporate tax breakdown ----------
  let corpCard;
  if (isCA && corp) {
    const grindWarn = B.passiveIncome > jur.corporate.passiveGrindStart;
    corpCard = card(t('Imposition de la société (CCPC)', 'Corporate tax (CCPC)'), {
      sub: t(`Taux DPE ${pct(corp.sbRate, 1)} · Taux général ${pct(corp.genRate, 1)}`, `SBD rate ${pct(corp.sbRate, 1)} · General ${pct(corp.genRate, 1)}`),
      right: grindWarn ? h('span', { class: 'chip warn', html: icon('warning', 13) + ' ' + t('Érosion DPE', 'SBD grind') }) : null,
    },
      h('div', { html: barChart({
        xLabels: [t('Au taux DPE', 'At SBD rate'), t('Au taux général', 'At general rate'), t('Impôt passif', 'Passive tax')],
        series: [{ color: PALETTE[0], values: [Math.round(corp.atSB), Math.round(corp.atGen), Math.round(corp.passiveTax)] },
          { color: PALETTE[4], values: [Math.round(corp.sbTax), Math.round(corp.genTax), 0] }],
      }) }),
      h('div', { class: 'sep' }),
      statList([
        [t('Plafond des affaires (500 k$ – érosion)', 'Business limit (500k – grind)'), money(corp.sbdLimit, { currency: cur }), grindWarn ? 'neg' : ''],
        [t('Revenu au taux des PME', 'Income at small-business rate'), money(corp.atSB, { currency: cur })],
        [t('Revenu au taux général', 'Income at general rate'), money(corp.atGen, { currency: cur })],
        [t('Impôt corporatif (actif)', 'Corporate tax (active)'), money(corp.activeTax, { currency: cur }), 'neg'],
        [t('Impôt sur le revenu passif', 'Tax on passive income'), money(corp.passiveTax, { currency: cur }), 'neg'],
        [t('Dont remboursable (IMRTD)', 'Refundable portion (RDTOH)'), money(corp.refundable, { currency: cur }), 'pos'],
        [t('Bénéfice après impôt', 'After-tax profit'), money(corp.afterTaxActive, { currency: cur }), 'pos'],
      ]),
      grindWarn ? h('p', { class: 'tiny muted', style: { marginTop: '10px' } },
        t('⚠ Le revenu passif dépasse 50 000 $ : le plafond de la déduction pour petite entreprise est réduit de 5 $ par dollar excédentaire (éliminé à 150 000 $), poussant le revenu actif vers le taux général.',
          '⚠ Passive income exceeds $50,000: the small-business deduction limit is reduced by $5 per excess dollar (eliminated at $150,000), pushing active income to the general rate.')) : null,
    );
  } else {
    const fed = jur.country === 'US' ? B.activeIncome * 0.21 : B.activeIncome * 0.20;
    corpCard = card(t('Imposition de la société', 'Corporate tax'), { sub: jur.name },
      statList([
        [t('Revenu actif', 'Active income'), money(B.activeIncome, { currency: cur })],
        [t('Impôt corporatif estimé', 'Estimated corporate tax'), money(fed, { currency: cur }), 'neg'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '10px' } }, jur.country === 'US'
        ? t('Société C : 21 % fédéral. En transparence (S-corp/LLC), le revenu est imposé personnellement avec la déduction QBI de 20 %.', 'C-Corp: 21 % federal. As pass-through (S-corp/LLC), income is taxed personally with the 20 % QBI deduction.')
        : t('Impôt sur les sociétés : 19 % (petits bénéfices) à 25 % (allègement marginal entre 50 k£ et 250 k£).', 'Corporation tax: 19 % (small profits) to 25 % (marginal relief between £50k and £250k).')));
  }

  // ---------- Salary vs Dividend (flagship, interactive) ----------
  let svdProfit = Math.min(B.activeIncome, 200000), svdOther = B.otherPersonalIncome || 0;
  const svdBox = h('div', {});
  function drawSVD() {
    const r = salaryVsDividend(jur, svdProfit, svdOther);
    if (!r.applicable) { svdBox.replaceChildren(h('div', { class: 'empty' }, t('Non disponible', 'Not available'))); return; }
    const aLabel = r.salary.label || t('Salaire', 'Salary');
    const bLabel = r.dividend.label || t('Dividende', 'Dividend');
    const rec = r.recommended === 'salary' ? aLabel : bLabel;
    svdBox.replaceChildren(
      h('div', { class: 'flex between center', style: { marginBottom: '12px' } },
        h('div', { class: 'inline' }, h('span', { class: 'chip pos' }, t('Recommandé', 'Recommended') + ' : ' + rec),
          h('span', { class: 'chip' }, t('Écart net', 'Net difference') + ' ' + money(r.advantage, { currency: cur }))),
        h('span', { class: 'tiny muted' }, t(`Profit ${money(svdProfit, { currency: cur, compact: true })} · autre revenu ${money(svdOther, { currency: cur, compact: true })}`, `Profit ${money(svdProfit, { currency: cur, compact: true })} · other income ${money(svdOther, { currency: cur, compact: true })}`))),
      h('div', { html: barChart({
        xLabels: [t('Net au propriétaire', 'Net to owner'), t('Impôt total', 'Total tax')],
        series: [
          { color: PALETTE[0], values: [Math.round(r.salary.net), Math.round(r.salary.totalTax)] },
          { color: PALETTE[2], values: [Math.round(r.dividend.net), Math.round(r.dividend.totalTax)] },
        ],
      }) }),
      legend([{ color: PALETTE[0], label: aLabel }, { color: PALETTE[2], label: bLabel }]),
      h('div', { class: 'grid cols-2', style: { marginTop: '12px' } },
        statList([
          [aLabel + ' — ' + t('net', 'net'), money(r.salary.net, { currency: cur }), 'pos'],
          [t('Impôt corp.', 'Corp tax'), money(r.salary.corpTax, { currency: cur }), 'neg'],
          [t('Impôt personnel', 'Personal tax'), money(r.salary.personalTax, { currency: cur }), 'neg'],
          [t('Droits REER créés', 'RRSP room created'), money(r.salary.rrspRoom, { currency: cur })],
        ]),
        statList([
          [bLabel + ' — ' + t('net', 'net'), money(r.dividend.net, { currency: cur }), 'pos'],
          [t('Impôt corp.', 'Corp tax'), money(r.dividend.corpTax, { currency: cur }), 'neg'],
          [t('Impôt personnel', 'Personal tax'), money(r.dividend.personalTax, { currency: cur }), 'neg'],
          [t('Droits REER créés', 'RRSP room created'), money(r.dividend.rrspRoom, { currency: cur })],
        ]),
      ),
      h('p', { class: 'tiny muted', style: { marginTop: '10px' } }, r.note),
    );
  }
  drawSVD();
  const svdCard = card(t('Salaire vs dividende', 'Salary vs dividend'), { class: 'span-full',
    sub: t('Optimisation de la rémunération du propriétaire (intégration)', 'Owner remuneration optimization (integration)') },
    h('div', { class: 'grid cols-2' },
      slider({ label: t('Bénéfice à verser', 'Profit to extract'), value: svdProfit, min: 0, max: 500000, step: 5000,
        format: v => money(v, { currency: cur, compact: true }), onInput: v => { svdProfit = v; drawSVD(); } }),
      slider({ label: t('Autre revenu personnel du propriétaire', 'Owner other personal income'), value: svdOther, min: 0, max: 250000, step: 5000,
        format: v => money(v, { currency: cur, compact: true }), onInput: v => { svdOther = v; drawSVD(); } }),
    ),
    svdBox);

  // ---------- Retain vs Distribute ----------
  let rvAmount = 100000, rvYears = 15, rvReturn = 0.06, rvMarg = 0.50;
  const rvBox = h('div', {});
  function drawRV() {
    const r = retainVsDistribute(jur, rvAmount, rvYears, rvReturn, rvMarg);
    const corpSeries = [], persSeries = [], xLabels = [];
    for (let y = 0; y <= rvYears; y++) {
      const rr = retainVsDistribute(jur, rvAmount, y, rvReturn, rvMarg);
      corpSeries.push(Math.round(rr.corpFinal)); persSeries.push(Math.round(rr.persFinal)); xLabels.push(y);
    }
    rvBox.replaceChildren(
      h('div', { html: lineChart({ series: [
        { color: PALETTE[1], values: corpSeries }, { color: PALETTE[4], values: persSeries },
      ], xLabels, area: false }) }),
      legend([{ color: PALETTE[1], label: t('Conserver dans la société', 'Retain in corporation') }, { color: PALETTE[4], label: t('Sortir et investir personnellement', 'Distribute & invest personally') }]),
      h('div', { class: 'sep' }),
      statList([
        [t('Capital reporté aujourd’hui (déferral)', 'Tax deferred today'), money(r.deferralToday, { currency: cur }), 'pos'],
        [t('Valeur finale — société', 'Final value — corporation'), money(r.corpFinal, { currency: cur })],
        [t('Valeur finale — personnel', 'Final value — personal'), money(r.persFinal, { currency: cur })],
        [t('Avantage net de la société', 'Net corporate advantage'), money(r.advantage, { currency: cur }), r.advantage >= 0 ? 'pos' : 'neg'],
      ]),
    );
  }
  drawRV();
  const rvCard = card(t('Conserver vs distribuer', 'Retain vs distribute'), { class: 'span-full',
    sub: t('Report d’impôt : investir dans la société vs se verser le montant et investir personnellement', 'Tax deferral: invest in the corp vs take the money and invest personally') },
    h('div', { class: 'grid cols-4' },
      slider({ label: t('Montant avant impôt', 'Pre-tax amount'), value: rvAmount, min: 10000, max: 500000, step: 10000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { rvAmount = v; drawRV(); } }),
      slider({ label: t('Horizon (ans)', 'Horizon (yrs)'), value: rvYears, min: 1, max: 35, step: 1, format: v => `${v}`, onInput: v => { rvYears = v; drawRV(); } }),
      slider({ label: t('Rendement', 'Return'), value: rvReturn, min: 0.02, max: 0.1, step: 0.005, format: v => pct(v), onInput: v => { rvReturn = v; drawRV(); } }),
      slider({ label: t('Taux marginal personnel', 'Personal marginal rate'), value: rvMarg, min: 0.2, max: 0.55, step: 0.01, format: v => pct(v, 0), onInput: v => { rvMarg = v; drawRV(); } }),
    ),
    rvBox);

  // ---------- Valuation ----------
  const val = businessValuation(B.valuation);
  const valCard = card(t('Évaluation de l’entreprise', 'Business valuation'), {
    sub: t('Estimation par multiples', 'Multiple-based estimate'),
    right: h('button', { class: 'btn sm', html: icon('edit', 14), onClick: editValuation }) },
    h('div', { class: 'flex center', style: { justifyContent: 'center', flexDirection: 'column' } },
      h('div', { class: 'value', style: { fontFamily: 'var(--font-display)', fontSize: '30px', fontWeight: 800 } }, money(val.estimate, { currency: cur, compact: true })),
      h('div', { class: 'tiny muted' }, t('Valeur estimée', 'Estimated value'))),
    h('div', { class: 'sep' }),
    statList([
      [t(`BAIIA × ${B.valuation.ebitdaMultiple}`, `EBITDA × ${B.valuation.ebitdaMultiple}`), val.byEbitda ? money(val.byEbitda, { currency: cur }) : '—'],
      [t(`Revenus × ${B.valuation.revenueMultiple}`, `Revenue × ${B.valuation.revenueMultiple}`), val.byRevenue ? money(val.byRevenue, { currency: cur }) : '—'],
    ]));

  // ---------- Sale & LCGE ----------
  let saleProceeds = B.sale.proceeds || val.estimate || 1000000, saleAcb = B.sale.acb || 0, saleOwners = B.sale.owners || 1;
  const saleBox = h('div', {});
  function drawSale() {
    const l = lcgeSale(jur, saleProceeds, saleAcb, saleOwners);
    const lcgeApplies = isCA && (jur.corporate.lcge > 0);
    saleBox.replaceChildren(
      h('div', { class: 'grid cols-3', style: { marginBottom: '10px' } },
        kpi({ label: t('Gain en capital', 'Capital gain'), value: money(l.gain, { currency: cur, compact: true }) }),
        kpi({ label: t('Impôt avec exonération', 'Tax with exemption'), value: money(l.taxWithLcge, { currency: cur, compact: true }), accent: 'var(--neg)' }),
        kpi({ label: t('Économie d’impôt (EGC)', 'Tax saved (LCGE)'), value: money(l.taxSaved, { currency: cur, compact: true }), accent: 'var(--pos)' }),
      ),
      statList([
        [t('Produit de la vente', 'Sale proceeds'), money(saleProceeds, { currency: cur })],
        [t('Exonération cumulative (EGC)', 'Lifetime exemption (LCGE)'), lcgeApplies ? money(l.exemptionTotal, { currency: cur }) : t('s. o.', 'n/a')],
        [t('Portion exonérée', 'Exempt portion'), money(l.exempt, { currency: cur }), 'pos'],
        [t('Gain imposable', 'Taxable gain'), money(l.taxableGain, { currency: cur })],
        [t('Impôt sans exonération', 'Tax without exemption'), money(l.taxNoLcge, { currency: cur }), 'neg'],
        [t('Produit net après impôt', 'Net after-tax proceeds'), money(l.netProceeds, { currency: cur }), 'pos'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '10px' } }, lcgeApplies
        ? t('L’exonération cumulative des gains en capital (≈ 1,25 M$ / personne en 2025) s’applique aux actions admissibles de petite entreprise (AAPE). La multiplier entre conjoints/enfants démultiplie l’économie.', 'The lifetime capital gains exemption (≈ $1.25M/person in 2025) applies to Qualified Small Business Corporation shares. Multiplying it across spouse/children multiplies the saving.')
        : jur.country === 'US' ? t('Aux États-Unis, l’exclusion §1202 (QSBS) peut exonérer jusqu’à 10 M$ de gain sur des actions admissibles détenues 5 ans.', 'In the US, the §1202 (QSBS) exclusion can exempt up to $10M of gain on qualifying shares held 5 years.')
          : t('Au Royaume-Uni, le Business Asset Disposal Relief réduit le taux de CGT à 10 % sur un plafond à vie de 1 M£.', 'In the UK, Business Asset Disposal Relief cuts CGT to 10 % on a £1M lifetime cap.')),
    );
  }
  drawSale();
  const saleCard = card(t('Vente d’entreprise & exonération', 'Business sale & exemption'), { class: 'span-full',
    sub: t('Impact fiscal d’une cession des actions', 'Tax impact of a share sale') },
    h('div', { class: 'grid cols-3' },
      slider({ label: t('Produit de la vente', 'Sale proceeds'), value: saleProceeds, min: 0, max: 10000000, step: 50000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { saleProceeds = v; drawSale(); } }),
      slider({ label: t('Prix de base rajusté', 'Adjusted cost base'), value: saleAcb, min: 0, max: 2000000, step: 25000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { saleAcb = v; drawSale(); } }),
      slider({ label: t('Nombre de détenteurs (multiplication EGC)', 'Number of owners (LCGE multiplication)'), value: saleOwners, min: 1, max: 4, step: 1, format: v => `${v}`, onInput: v => { saleOwners = v; drawSale(); } }),
    ),
    saleBox);

  // ---------- Strategies ----------
  const strategies = strategyTips(jur);
  const stratCard = card(t('Stratégies pour propriétaires d’entreprise', 'Business owner strategies'), { class: 'span-full' },
    h('div', { class: 'grid cols-2' }, ...strategies.map(s =>
      h('div', { class: 'flex', style: { gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' } },
        h('span', { class: 'chip info', style: { flex: 'none' }, html: icon('check', 13) }),
        h('div', {}, h('b', {}, s.title), h('div', { class: 'tiny muted' }, s.text))))));

  return h('div', { class: 'grid' },
    kpis,
    h('div', { class: 'grid cols-2 span-full' }, profileCard, corpCard),
    svdCard, rvCard,
    h('div', { class: 'grid cols-2 span-full' }, valCard, h('div', { class: 'card', style: { display: 'flex', flexDirection: 'column', justifyContent: 'center' } },
      h('h3', { style: { margin: '0 0 6px', fontFamily: 'var(--font-display)' } }, t('Bilan corporatif', 'Corporate balance sheet')),
      statList([
        [t('Placements corporatifs', 'Corporate investments'), money(B.corpInvestments, { currency: cur })],
        [t('Bénéfices non répartis', 'Retained earnings'), money(B.retainedEarnings, { currency: cur })],
        [t('Valeur de l’entreprise (est.)', 'Business value (est.)'), money(val.estimate, { currency: cur })],
        [t('Valeur nette corporative totale', 'Total corporate net worth'), money((B.corpInvestments || 0) + (val.estimate || 0), { currency: cur }), 'pos'],
      ]))),
    saleCard,
    stratCard,
  );

  // ---------- Editors ----------
  function editProfile() {
    const memberOpts = client.members.map(m => ({ value: m.id, label: m.name }));
    formModal({ title: t('Profil de l’entreprise', 'Business profile'), item: B, wide: true,
      fields: [
        { key: 'name', label: t('Dénomination', 'Name') },
        { key: 'structure', label: t('Structure', 'Structure'), type: 'select', opts: structOpts },
        { key: 'ownerId', label: t('Propriétaire', 'Owner'), type: 'select', opts: memberOpts },
        { key: 'fiscalYearEnd', label: t('Fin d’exercice (MM-JJ)', 'Fiscal year-end (MM-DD)') },
        { key: 'activeIncome', label: t(`Revenu actif (${cur})`, `Active income (${cur})`), type: 'number' },
        { key: 'passiveIncome', label: t(`Revenu passif (${cur})`, `Passive income (${cur})`), type: 'number' },
        { key: 'retainedEarnings', label: t(`Bénéfices non répartis (${cur})`, `Retained earnings (${cur})`), type: 'number' },
        { key: 'corpInvestments', label: t(`Placements corporatifs (${cur})`, `Corporate investments (${cur})`), type: 'number' },
        { key: 'otherPersonalIncome', label: t(`Autre revenu personnel (${cur})`, `Other personal income (${cur})`), type: 'number' },
      ],
      onSave: (d) => store.update(c => { c.business = { ...(c.business || newBusiness()), ...d }; }),
    });
  }
  function editValuation() {
    formModal({ title: t('Évaluation', 'Valuation'), item: { ...B.valuation },
      fields: [
        { key: 'ebitda', label: t(`BAIIA (${cur})`, `EBITDA (${cur})`), type: 'number' },
        { key: 'ebitdaMultiple', label: t('Multiple BAIIA', 'EBITDA multiple'), type: 'number', step: 0.5 },
        { key: 'revenue', label: t(`Revenus (${cur})`, `Revenue (${cur})`), type: 'number' },
        { key: 'revenueMultiple', label: t('Multiple de revenus', 'Revenue multiple'), type: 'number', step: 0.1 },
      ],
      onSave: (d) => store.update(c => { c.business = { ...(c.business || newBusiness()), valuation: d }; }),
    });
  }
}

function strategyTips(jur) {
  if (jur.country === 'CA') return [
    { title: t('Mix salaire/dividende', 'Salary/dividend mix'), text: t('Un salaire suffisant pour maximiser les droits REER et le RRQ, le reste en dividendes, équilibre souvent le mieux liquidité et report.', 'Enough salary to maximize RRSP room and CPP, the rest in dividends, often best balances liquidity and deferral.') },
    { title: t('Attention aux règles IRF/TOSI', 'Watch TOSI rules'), text: t('Le fractionnement de dividendes avec la famille est restreint par l’impôt sur le revenu fractionné, sauf exceptions (âge, participation active, actions exclues).', 'Sprinkling dividends to family is restricted by the tax on split income, with exceptions (age, active engagement, excluded shares).') },
    { title: t('Compte de dividendes en capital (CDC)', 'Capital dividend account (CDA)'), text: t('La portion non imposable des gains en capital et le produit d’assurance vie peuvent être versés en franchise d’impôt via le CDC.', 'The non-taxable half of capital gains and life insurance proceeds can be paid out tax-free via the CDA.') },
    { title: t('Régime de retraite individuel (RRI)', 'Individual Pension Plan (IPP)'), text: t('Pour un propriétaire de 45 ans et plus, un RRI permet souvent des cotisations déductibles supérieures au REER.', 'For an owner 45+, an IPP often allows larger deductible contributions than an RRSP.') },
    { title: t('Assurance vie détenue par la société', 'Corporate-owned life insurance'), text: t('Payée avec des dollars corporatifs (moins chers) et le capital-décès crédite le CDC pour une sortie libre d’impôt.', 'Paid with cheaper corporate dollars; the death benefit credits the CDA for a tax-free payout.') },
    { title: t('Gel successoral & Holdco', 'Estate freeze & Holdco'), text: t('Cristallise la valeur actuelle, multiplie l’EGC, protège les actifs et facilite la relève.', 'Crystallizes current value, multiplies the LCGE, protects assets and eases succession.') },
  ];
  if (jur.country === 'US') return [
    { title: t('Élection société S', 'S-Corp election'), text: t('Réduit l’impôt sur le travail indépendant via un salaire raisonnable + distributions.', 'Reduces self-employment tax via a reasonable salary + distributions.') },
    { title: t('Déduction QBI (199A)', 'QBI deduction (199A)'), text: t('Jusqu’à 20 % du revenu d’entreprise admissible, sous réserve de seuils et de limites.', 'Up to 20 % of qualified business income, subject to thresholds and limits.') },
    { title: t('Solo 401(k) / SEP-IRA', 'Solo 401(k) / SEP-IRA'), text: t('Régimes de retraite à cotisations élevées pour propriétaires.', 'High-contribution retirement plans for owners.') },
    { title: t('Exclusion QSBS §1202', '§1202 QSBS exclusion'), text: t('Jusqu’à 10 M$ de gain exonéré sur actions de C-corp admissibles détenues 5 ans.', 'Up to $10M gain exempt on qualifying C-corp shares held 5 years.') },
  ];
  return [
    { title: t('Petit salaire + dividendes', 'Small salary + dividends'), text: t('Salaire jusqu’au seuil de NI puis dividendes : généralement le plus efficace.', 'Salary up to the NI threshold then dividends: usually most efficient.') },
    { title: t('Pension par la société', 'Employer pension contributions'), text: t('Cotisations de pension déductibles versées par la société, sans NI.', 'Deductible employer pension contributions, free of NI.') },
    { title: t('Business Asset Disposal Relief', 'Business Asset Disposal Relief'), text: t('Taux de CGT réduit à 10 % sur un plafond à vie de 1 M£ à la vente.', '10 % CGT rate on a £1M lifetime cap at sale.') },
  ];
}
