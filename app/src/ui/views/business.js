import { h, money, pct, num, icon, toast, t } from '../dom.js';
import { kpi, card, slider, statList, legend, badgeScore } from '../widgets.js';
import { barChart, donutChart, lineChart, PALETTE } from '../charts.js';
import { formModal } from '../editor.js';
import { store as appStore } from '../../state/store.js';
import { newBusiness } from '../../state/models.js';
import { corporateTaxCA, salaryVsDividend, retainVsDistribute, businessValuation, lcgeSale } from '../../engine/corporate.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';

/** Corporate rate outside Canada, read from the jurisdiction (never hard-coded). */
function foreignCorpRate(jur, profit) {
  const C = jur.corporate || {};
  if (jur.country === 'US') return (C.fedCorp ?? 0) + ((C.stateCorp && C.stateCorp[jur.region]) ?? 0);
  if (jur.country === 'UK') {
    if (profit > C.upperLimit) return C.mainRate;
    if (profit > C.lowerLimit) return C.smallRate + (C.mainRate - C.smallRate) * (profit - C.lowerLimit) / (C.upperLimit - C.lowerLimit);
    return C.smallRate ?? 0;
  }
  return 0;
}

export function render({ store, client, jur, navigate }) {
  store = store || appStore;
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const FB = F.business;                                   // derived business facts (null when no business on file)
  const B = client.business || newBusiness({ ownerId: client.members[0]?.id });
  const owner = (FB && FB.owner) || F.primary || { age: 45, ordinary: 0, marginal: { ordinary: 0.45, noneligible: 0.4, eligible: 0.3, capgains: 0.25 } };
  const ownerName = client.members.find(m => m.id === B.ownerId)?.name || client.members[0]?.name || t('Propriétaire', 'Owner');
  const ownerOther = FB ? FB.ownerOtherIncome : (B.otherPersonalIncome || owner.ordinary || 0);
  const isCA = jur.country === 'CA';
  const val = FB ? FB.valuation : businessValuation(B.valuation || {});
  const bizValue = FB ? FB.value : (val.estimate || B.retainedEarnings || 0);

  // Persisted what-if parameters (engine-derived defaults, user overrides kept)
  const P = whatIf(client, 'business', {
    svdProfit: Math.min(B.activeIncome || 0, 200000) || 100000,
    svdOther: Math.round(ownerOther),
    rvAmount: 100000, rvYears: 15,
    rvReturn: F.assumptions.preReturn,
    rvMarg: owner.marginal.ordinary,
  });
  const setP = (k, v) => { P[k] = v; saveWhatIf(store, 'business', { [k]: v }); };

  const structOpts = [
    { value: 'incorporated', label: t('Société par actions (incorporée)', 'Incorporated') },
    { value: 'sole', label: t('Entreprise individuelle', 'Sole proprietor') },
    { value: 'partnership', label: t('Société de personnes', 'Partnership') },
    { value: 'holdco', label: t('Société de portefeuille (Holdco)', 'Holding company') },
  ];
  const structLabel = v => (structOpts.find(o => o.value === v) || {}).label || v;

  // ---------- KPIs ----------
  const corp = isCA ? (FB ? FB.corp : corporateTaxCA(jur, B.activeIncome, B.passiveIncome)) : null;
  const corpEff = corp ? corp.effectiveActiveRate : foreignCorpRate(jur, B.activeIncome || 0);
  const grindStart = jur.corporate?.passiveGrindStart ?? Infinity;
  const kpis = h('div', { class: 'grid cols-4 span-full' },
    kpi({ label: t('Revenu d’entreprise actif', 'Active business income'), value: money(B.activeIncome, { currency: cur, compact: true }), iconName: 'bank' }),
    kpi({ label: t('Revenu passif (placements)', 'Passive (investment) income'), value: money(B.passiveIncome, { currency: cur, compact: true }),
      accent: B.passiveIncome > grindStart ? 'var(--warn)' : '', sub: B.passiveIncome > grindStart ? t('Érosion de la DPE', 'SBD grind') : '' }),
    kpi({ label: t('Taux d’impôt corporatif effectif', 'Effective corporate tax rate'), value: pct(corpEff, 1), iconName: 'tax', sub: t(`Année d’imposition ${jur.taxYear}`, `Tax year ${jur.taxYear}`) }),
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
        [t('Autre revenu personnel du propriétaire', 'Owner other personal income'), money(ownerOther, { currency: cur })],
      ]),
    ));

  // ---------- Corporate tax breakdown ----------
  let corpCard;
  if (isCA && corp) {
    const grindWarn = B.passiveIncome > grindStart;
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
        [t(`Plafond des affaires (${money(jur.corporate.sbdLimit, { currency: cur, compact: true })} – érosion)`, `Business limit (${money(jur.corporate.sbdLimit, { currency: cur, compact: true })} – grind)`), money(corp.sbdLimit, { currency: cur }), grindWarn ? 'neg' : ''],
        [t('Revenu au taux des PME', 'Income at small-business rate'), money(corp.atSB, { currency: cur })],
        [t('Revenu au taux général', 'Income at general rate'), money(corp.atGen, { currency: cur })],
        [t('Impôt corporatif (actif)', 'Corporate tax (active)'), money(corp.activeTax, { currency: cur }), 'neg'],
        [t('Impôt sur le revenu passif', 'Tax on passive income'), money(corp.passiveTax, { currency: cur }), 'neg'],
        [t('Dont remboursable (IMRTD)', 'Refundable portion (RDTOH)'), money(corp.refundable, { currency: cur }), 'pos'],
        [t('Bénéfice après impôt', 'After-tax profit'), money(corp.afterTaxActive, { currency: cur }), 'pos'],
      ]),
      grindWarn ? h('p', { class: 'tiny muted', style: { marginTop: '10px' } },
        t(`⚠ Le revenu passif dépasse ${money(grindStart, { currency: cur, compact: true })} : le plafond de la déduction pour petite entreprise est réduit de 5 $ par dollar excédentaire (éliminé à ${money(jur.corporate.passiveGrindEnd, { currency: cur, compact: true })}), poussant le revenu actif vers le taux général.`,
          `⚠ Passive income exceeds ${money(grindStart, { currency: cur, compact: true })}: the small-business deduction limit is reduced by $5 per excess dollar (eliminated at ${money(jur.corporate.passiveGrindEnd, { currency: cur, compact: true })}), pushing active income to the general rate.`)) : null,
    );
  } else {
    const rate = foreignCorpRate(jur, B.activeIncome || 0);
    const fed = (B.activeIncome || 0) * rate;
    corpCard = card(t('Imposition de la société', 'Corporate tax'), { sub: `${jur.name} · ${pct(rate, 1)}` },
      statList([
        [t('Revenu actif', 'Active income'), money(B.activeIncome, { currency: cur })],
        [t('Taux corporatif (juridiction)', 'Corporate rate (jurisdiction)'), pct(rate, 2)],
        [t('Impôt corporatif estimé', 'Estimated corporate tax'), money(fed, { currency: cur }), 'neg'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '10px' } }, jur.country === 'US'
        ? t(`Société C : ${pct(jur.corporate?.fedCorp ?? 0, 0)} fédéral + impôt d’État. En transparence (S-corp/LLC), le revenu est imposé personnellement avec la déduction QBI de ${pct(jur.corporate?.qbiDeduction ?? 0, 0)}.`, `C-Corp: ${pct(jur.corporate?.fedCorp ?? 0, 0)} federal + state tax. As pass-through (S-corp/LLC), income is taxed personally with the ${pct(jur.corporate?.qbiDeduction ?? 0, 0)} QBI deduction.`)
        : t(`Impôt sur les sociétés : ${pct(jur.corporate?.smallRate ?? 0, 0)} (petits bénéfices) à ${pct(jur.corporate?.mainRate ?? 0, 0)} (allègement marginal entre ${money(jur.corporate?.lowerLimit, { currency: cur, compact: true })} et ${money(jur.corporate?.upperLimit, { currency: cur, compact: true })}).`, `Corporation tax: ${pct(jur.corporate?.smallRate ?? 0, 0)} (small profits) to ${pct(jur.corporate?.mainRate ?? 0, 0)} (marginal relief between ${money(jur.corporate?.lowerLimit, { currency: cur, compact: true })} and ${money(jur.corporate?.upperLimit, { currency: cur, compact: true })}).`)));
  }

  // ---------- Salary vs Dividend (flagship, interactive) ----------
  const svdBox = h('div', {});
  function drawSVD() {
    const r = salaryVsDividend(jur, P.svdProfit, P.svdOther, { otherActiveIncome: 0, passiveIncome: B.passiveIncome, age: owner.age });
    if (!r.applicable) { svdBox.replaceChildren(h('div', { class: 'empty' }, t('Non disponible', 'Not available'))); return; }
    const aLabel = r.salary.label || t('Salaire', 'Salary');
    const bLabel = r.dividend.label || t('Dividende', 'Dividend');
    const rec = r.recommended === 'salary' ? aLabel : bLabel;
    const salRows = [
      [aLabel + ' — ' + t('net', 'net'), money(r.salary.net, { currency: cur }), 'pos'],
      [t('Salaire brut', 'Gross salary'), money(r.salary.gross, { currency: cur })],
      r.salary.employerCost != null ? [t('Coût employeur (RRQ/RPC, AE, RQAP)', 'Employer cost (CPP/QPP, EI, QPIP)'), money(r.salary.employerCost, { currency: cur }), 'neg'] : null,
      r.salary.cppEmployee != null ? [t('Cotisations de l’employé', 'Employee contributions'), money(r.salary.cppEmployee, { currency: cur }), 'neg'] : null,
      [t('Impôt corp.', 'Corp tax'), money(r.salary.corpTax, { currency: cur }), 'neg'],
      [t('Impôt personnel', 'Personal tax'), money(r.salary.personalTax, { currency: cur }), 'neg'],
      [t('Droits REER créés', 'RRSP room created'), money(r.salary.rrspRoom, { currency: cur })],
    ].filter(Boolean);
    const divRows = [
      [bLabel + ' — ' + t('net', 'net'), money(r.dividend.net, { currency: cur }), 'pos'],
      [t('Dividende brut', 'Gross dividend'), money(r.dividend.gross, { currency: cur })],
      r.dividend.nonEligibleDiv != null ? [t('Dont non déterminé (revenu DPE)', 'Of which non-eligible (SBD income)'), money(r.dividend.nonEligibleDiv, { currency: cur })] : null,
      r.dividend.eligibleDiv != null ? [t('Dont déterminé (taux général)', 'Of which eligible (general rate)'), money(r.dividend.eligibleDiv, { currency: cur })] : null,
      [t('Impôt corp.', 'Corp tax'), money(r.dividend.corpTax, { currency: cur }), 'neg'],
      [t('Impôt personnel', 'Personal tax'), money(r.dividend.personalTax, { currency: cur }), 'neg'],
      [t('Droits REER créés', 'RRSP room created'), money(r.dividend.rrspRoom, { currency: cur })],
    ].filter(Boolean);
    svdBox.replaceChildren(
      h('div', { class: 'flex between center', style: { marginBottom: '12px' } },
        h('div', { class: 'inline' }, h('span', { class: 'chip pos' }, t('Recommandé', 'Recommended') + ' : ' + rec),
          h('span', { class: 'chip' }, t('Écart net', 'Net difference') + ' ' + money(r.advantage, { currency: cur })),
          h('span', { class: 'chip info' }, t('Coût d’intégration', 'Integration cost') + ' ' + money(r.integrationCost, { currency: cur }))),
        h('span', { class: 'tiny muted' }, t(`Profit ${money(P.svdProfit, { currency: cur, compact: true })} · autre revenu ${money(P.svdOther, { currency: cur, compact: true })} · ${owner.age} ans`, `Profit ${money(P.svdProfit, { currency: cur, compact: true })} · other income ${money(P.svdOther, { currency: cur, compact: true })} · age ${owner.age}`))),
      h('div', { html: barChart({
        xLabels: [t('Net au propriétaire', 'Net to owner'), t('Impôt total', 'Total tax')],
        series: [
          { color: PALETTE[0], values: [Math.round(r.salary.net), Math.round(r.salary.totalTax)] },
          { color: PALETTE[2], values: [Math.round(r.dividend.net), Math.round(r.dividend.totalTax)] },
        ],
      }) }),
      legend([{ color: PALETTE[0], label: aLabel }, { color: PALETTE[2], label: bLabel }]),
      h('div', { class: 'grid cols-2', style: { marginTop: '12px' } }, statList(salRows), statList(divRows)),
      h('p', { class: 'tiny muted', style: { marginTop: '10px' } }, r.note),
    );
  }
  drawSVD();
  const svdCard = card(t('Salaire vs dividende', 'Salary vs dividend'), { class: 'span-full',
    sub: t('Optimisation de la rémunération du propriétaire (intégration) — revenu passif et âge du propriétaire tirés du dossier', 'Owner remuneration optimization (integration) — passive income and owner age from the file') },
    h('div', { class: 'grid cols-2' },
      slider({ label: t('Bénéfice à verser', 'Profit to extract'), value: P.svdProfit, min: 0, max: 500000, step: 5000,
        format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('svdProfit', v); drawSVD(); } }),
      slider({ label: t('Autre revenu personnel du propriétaire', 'Owner other personal income'), value: P.svdOther, min: 0, max: 250000, step: 5000,
        format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('svdOther', v); drawSVD(); } }),
    ),
    svdBox);

  // ---------- Retain vs Distribute ----------
  const rvBox = h('div', {});
  function drawRV() {
    const r = retainVsDistribute(jur, P.rvAmount, P.rvYears, P.rvReturn, P.rvMarg);
    const corpSeries = [], persSeries = [], xLabels = [];
    for (let y = 0; y <= P.rvYears; y++) {
      const rr = retainVsDistribute(jur, P.rvAmount, y, P.rvReturn, P.rvMarg);
      corpSeries.push(Math.round(rr.corpFinal)); persSeries.push(Math.round(rr.persFinal)); xLabels.push(y);
    }
    rvBox.replaceChildren(
      h('div', { html: lineChart({ series: [
        { color: PALETTE[1], values: corpSeries }, { color: PALETTE[4], values: persSeries },
      ], xLabels, area: false }) }),
      legend([{ color: PALETTE[1], label: t('Conserver dans la société', 'Retain in corporation') }, { color: PALETTE[4], label: t('Sortir et investir personnellement', 'Distribute & invest personally') }]),
      h('div', { class: 'sep' }),
      statList([
        [t('Taux corporatif utilisé', 'Corporate rate used'), pct(r.corpRate, 1)],
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
      slider({ label: t('Montant avant impôt', 'Pre-tax amount'), value: P.rvAmount, min: 10000, max: 500000, step: 10000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('rvAmount', v); drawRV(); } }),
      slider({ label: t('Horizon (ans)', 'Horizon (yrs)'), value: P.rvYears, min: 1, max: 35, step: 1, format: v => `${v}`, onInput: v => { setP('rvYears', v); drawRV(); } }),
      slider({ label: t('Rendement (hypothèse du dossier)', 'Return (file assumption)'), value: P.rvReturn, min: 0.02, max: 0.1, step: 0.005, format: v => pct(v), onInput: v => { setP('rvReturn', v); drawRV(); } }),
      slider({ label: t('Taux marginal personnel (dérivé)', 'Personal marginal rate (derived)'), value: P.rvMarg, min: 0.2, max: 0.55, step: 0.01, format: v => pct(v, 0), onInput: v => { setP('rvMarg', v); drawRV(); } }),
    ),
    rvBox);

  // ---------- Valuation ----------
  const valCard = card(t('Évaluation de l’entreprise', 'Business valuation'), {
    sub: t('Estimation par multiples', 'Multiple-based estimate'),
    right: h('button', { class: 'btn sm', html: icon('edit', 14), onClick: editValuation }) },
    h('div', { class: 'flex center', style: { justifyContent: 'center', flexDirection: 'column' } },
      h('div', { class: 'value', style: { fontFamily: 'var(--font-display)', fontSize: '30px', fontWeight: 800 } }, money(val.estimate, { currency: cur, compact: true })),
      h('div', { class: 'tiny muted' }, t('Valeur estimée', 'Estimated value'))),
    h('div', { class: 'sep' }),
    statList([
      [t(`BAIIA × ${B.valuation?.ebitdaMultiple ?? 5}`, `EBITDA × ${B.valuation?.ebitdaMultiple ?? 5}`), val.byEbitda ? money(val.byEbitda, { currency: cur }) : '—'],
      [t(`Revenus × ${B.valuation?.revenueMultiple ?? 1}`, `Revenue × ${B.valuation?.revenueMultiple ?? 1}`), val.byRevenue ? money(val.byRevenue, { currency: cur }) : '—'],
    ]));

  // ---------- Sale & LCGE (sliders write back to business.sale) ----------
  const sale = { proceeds: B.sale?.proceeds || bizValue || 1000000, acb: B.sale?.acb || 0, owners: Math.max(1, B.sale?.owners || 1) };
  function saveSale(patch) {
    Object.assign(sale, patch);
    store.quietUpdate(c => {
      if (c.business) c.business.sale = { ...(c.business.sale || {}), ...patch };
      else { c.calc = c.calc || {}; c.calc.business = { ...(c.calc.business || {}), sale: { ...((c.calc.business || {}).sale || {}), ...patch } }; }
    });
  }
  const saleBox = h('div', {});
  function drawSale() {
    const l = lcgeSale(jur, sale.proceeds, sale.acb, sale.owners, ownerOther, { age: owner.age });
    const lcgeApplies = isCA && (jur.corporate.lcge > 0);
    saleBox.replaceChildren(
      h('div', { class: 'grid cols-3', style: { marginBottom: '10px' } },
        kpi({ label: t('Gain en capital', 'Capital gain'), value: money(l.gain, { currency: cur, compact: true }) }),
        kpi({ label: t('Impôt avec exonération', 'Tax with exemption'), value: money(l.taxWithLcge, { currency: cur, compact: true }), accent: 'var(--neg)', sub: t(`empilé sur ${money(l.otherIncome, { currency: cur, compact: true })} d’autre revenu`, `stacked on ${money(l.otherIncome, { currency: cur, compact: true })} other income`) }),
        kpi({ label: t('Économie d’impôt (EGC)', 'Tax saved (LCGE)'), value: money(l.taxSaved, { currency: cur, compact: true }), accent: 'var(--pos)' }),
      ),
      statList([
        [t('Produit de la vente', 'Sale proceeds'), money(sale.proceeds, { currency: cur })],
        [t('Exonération cumulative (EGC)', 'Lifetime exemption (LCGE)'), lcgeApplies ? money(l.exemptionTotal, { currency: cur }) : t('s. o.', 'n/a')],
        [t('Portion exonérée', 'Exempt portion'), money(l.exempt, { currency: cur }), 'pos'],
        [t('Gain imposable', 'Taxable gain'), money(l.taxableGain, { currency: cur })],
        [t('Impôt sans exonération', 'Tax without exemption'), money(l.taxNoLcge, { currency: cur }), 'neg'],
        [t('Produit net après impôt', 'Net after-tax proceeds'), money(l.netProceeds, { currency: cur }), 'pos'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '10px' } }, lcgeApplies
        ? t(`L’exonération cumulative des gains en capital (${money(jur.corporate.lcge, { currency: cur, compact: true })} / personne en ${jur.taxYear}) s’applique aux actions admissibles de petite entreprise (AAPE). La multiplier entre conjoints/enfants démultiplie l’économie.`, `The lifetime capital gains exemption (${money(jur.corporate.lcge, { currency: cur, compact: true })}/person in ${jur.taxYear}) applies to Qualified Small Business Corporation shares. Multiplying it across spouse/children multiplies the saving.`)
        : jur.country === 'US' ? t('Aux États-Unis, l’exclusion §1202 (QSBS) peut exonérer jusqu’à 10 M$ de gain sur des actions admissibles détenues 5 ans.', 'In the US, the §1202 (QSBS) exclusion can exempt up to $10M of gain on qualifying shares held 5 years.')
          : t('Au Royaume-Uni, le Business Asset Disposal Relief réduit le taux de CGT à 10 % sur un plafond à vie de 1 M£.', 'In the UK, Business Asset Disposal Relief cuts CGT to 10 % on a £1M lifetime cap.')),
    );
  }
  drawSale();
  const saleCard = card(t('Vente d’entreprise & exonération', 'Business sale & exemption'), { class: 'span-full',
    sub: t('Impact fiscal d’une cession des actions — les curseurs sont enregistrés dans le profil (vente)', 'Tax impact of a share sale — sliders are saved to the business profile (sale)') },
    h('div', { class: 'grid cols-3' },
      slider({ label: t('Produit de la vente', 'Sale proceeds'), value: sale.proceeds, min: 0, max: 10000000, step: 50000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { saveSale({ proceeds: v }); drawSale(); } }),
      slider({ label: t('Prix de base rajusté', 'Adjusted cost base'), value: sale.acb, min: 0, max: 2000000, step: 25000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { saveSale({ acb: v }); drawSale(); } }),
      slider({ label: t('Nombre de détenteurs (multiplication EGC)', 'Number of owners (LCGE multiplication)'), value: sale.owners, min: 1, max: 4, step: 1, format: v => `${v}`, onInput: v => { saveSale({ owners: v }); drawSale(); } }),
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
        [t('Valeur de l’entreprise (est.)', 'Business value (est.)'), money(bizValue, { currency: cur })],
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
        { key: 'otherPersonalIncome', label: t(`Autre revenu personnel (${cur}) — 0 = revenu du dossier`, `Other personal income (${cur}) — 0 = income on file`), type: 'number' },
      ],
      onSave: (d) => store.update(c => { c.business = { ...(c.business || newBusiness()), ...d }; }),
    });
  }
  function editValuation() {
    formModal({ title: t('Évaluation', 'Valuation'), item: { ...(B.valuation || {}) },
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
