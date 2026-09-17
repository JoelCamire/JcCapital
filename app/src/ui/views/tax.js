import { h, money, pct, num, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, donutChart, PALETTE } from '../charts.js';
import { computeTax } from '../../engine/tax.js';
import { getJurisdiction } from '../../jurisdictions/index.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';

export function render({ store, client, jur }) {
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const fs = client.filingStatus;

  // What-if inputs persisted per client; the member and their ordinary income come from the file (entered once).
  const W = whatIf(client, 'tax', { memberId: F.primary ? F.primary.id : '', capGains: 0, eligibleDiv: 0, nonEligibleDiv: 0, ordinaryOverride: -1 });
  const save = (patch) => { Object.assign(W, patch); saveWhatIf(store, 'tax', patch); };
  let member = F.byMember[W.memberId] || F.primary || null;
  const baseOrdinary = () => (member ? member.ordinary : 0);
  let income = W.ordinaryOverride >= 0 ? W.ordinaryOverride : baseOrdinary();

  const out = h('div', { class: 'grid', style: { gridColumn: '1 / -1' } });

  function taxInputs(j) {
    return {
      ordinary: income, capGains: W.capGains, eligibleDiv: W.eligibleDiv, nonEligibleDiv: W.nonEligibleDiv, filingStatus: fs,
      age: member ? member.age : 45,
      employmentIncome: member ? Math.min(income, member.employmentIncome) : income,
      employment: member ? member.employmentIncome > 0 : true,
      selfEmployed: member ? member.selfEmployed : false,
      pensionIncome: member ? member.pensionIncome : 0,
      oasIncome: member ? member.oasIncome : 0,
      withPayroll: true,
    };
  }

  function redraw() {
    const tx = computeTax(jur, taxInputs(jur));
    const segs = [
      { label: t('Fédéral', 'Federal'), value: tx.federal, color: PALETTE[0] },
      { label: jur.regionLabel, value: tx.regional, color: PALETTE[2] },
      { label: t('Cotisations sociales', 'Payroll / social'), value: tx.payroll, color: PALETTE[4] },
      { label: t('Récupération PSV', 'OAS clawback'), value: tx.clawback, color: PALETTE[3] },
      { label: t('Revenu net', 'Net income'), value: tx.afterTax, color: PALETTE[6] },
    ].filter(s => s.value > 0.5);

    const D = tx.detail || {};
    const creditRows = [];
    if (D.fedCredits) {
      const cr = jur.fed?.creditRate ?? jur.fed?.bpaRate ?? 0;
      const names = { bpa: t('Montant personnel de base', 'Basic personal amount'), employment: t('Montant canadien pour emploi', 'Canada employment amount'), contributions: t('Cotisations RRQ/RPC, AE, RQAP', 'CPP/QPP, EI, QPIP contributions'), pension: t('Montant pour revenu de pension', 'Pension income amount'), age: t('Montant en raison de l’âge', 'Age amount') };
      for (const [k, v] of Object.entries(D.fedCredits)) if (v > 0) creditRows.push([t(`Fédéral — ${names[k] || k}`, `Federal — ${names[k] || k}`), money(v * cr, { currency: cur }), 'pos']);
    }
    if (D.provCredits) {
      const pcr = jur.regionData?.creditRate ?? jur.regionData?.bpaRate ?? 0;
      const names = { bpa: t('Montant personnel de base', 'Basic personal amount'), contributions: t('Cotisations', 'Contributions'), senior: t('Crédit aîné / retraite', 'Senior / retirement credit') };
      for (const [k, v] of Object.entries(D.provCredits)) if (v > 0) creditRows.push([`${jur.regionLabel} — ${names[k] || k}`, money(v * pcr, { currency: cur }), 'pos']);
    }
    if (D.workerDeduction > 0) creditRows.push([t('Déduction pour travailleur (QC)', 'Worker deduction (QC)'), money(D.workerDeduction, { currency: cur }), 'pos']);
    if (D.healthPremium > 0) creditRows.push([t('Contribution santé (ON)', 'Health premium (ON)'), money(D.healthPremium, { currency: cur }), 'neg']);

    const P = D.payroll || {};
    const payrollRows = [];
    if (P.cppBase > 0) payrollRows.push([t('RRQ/RPC — base', 'CPP/QPP — base'), money(P.cppBase, { currency: cur }), 'neg']);
    if (P.cppEnh > 0) payrollRows.push([t('RRQ/RPC — bonification (déductible)', 'CPP/QPP — enhancement (deductible)'), money(P.cppEnh, { currency: cur }), 'neg']);
    if (P.cpp2 > 0) payrollRows.push([t('RPC2 / RRQ2', 'CPP2 / QPP2'), money(P.cpp2, { currency: cur }), 'neg']);
    if (P.ei > 0) payrollRows.push([t('Assurance-emploi', 'Employment insurance'), money(P.ei, { currency: cur }), 'neg']);
    if (P.qpip > 0) payrollRows.push([t('RQAP', 'QPIP'), money(P.qpip, { currency: cur }), 'neg']);
    if (!payrollRows.length && tx.payroll > 0) payrollRows.push([t('Cotisations sociales', 'Payroll / social'), money(tx.payroll, { currency: cur }), 'neg']);

    out.replaceChildren(
      h('div', { class: 'grid cols-4 span-full' },
        kpi({ label: t('Impôt total', 'Total tax'), value: money(tx.total, { currency: cur }), iconName: 'tax', accent: 'var(--neg)', sub: tx.clawback > 0 ? t(`dont ${money(tx.clawback, { currency: cur })} de récupération PSV`, `incl. ${money(tx.clawback, { currency: cur })} OAS clawback`) : '' }),
        kpi({ label: t('Revenu net', 'Net income'), value: money(tx.afterTax, { currency: cur }), accent: 'var(--pos)' }),
        kpi({ label: t('Taux marginal', 'Marginal rate'), value: pct(tx.marginalRate, 1), sub: t('sur le prochain dollar (cotisations incluses)', 'on the next dollar (incl. contributions)') }),
        kpi({ label: t('Taux moyen', 'Average rate'), value: pct(tx.averageRate, 1), sub: t('effectif global', 'overall effective') }),
      ),
      card(t('Décomposition de la charge fiscale', 'Tax burden breakdown'), { sub: `${jur.flag} ${jur.name} — ${jur.regionName} · ${jur.taxYear} · ${member ? member.name : ''} · ${t('revenu', 'income')} ${money(income, { currency: cur })}` },
        h('div', { class: 'flex center', style: { justifyContent: 'center' } },
          h('div', { html: donutChart({ segments: segs, centerLabel: pct(tx.averageRate, 0), centerSub: t('taux moyen', 'avg rate') }) })),
        h('div', { class: 'sep' }),
        legend(segs.map(s => ({ color: s.color, label: `${s.label} · ${money(s.value, { currency: cur })}` }))),
      ),
      card(t('Détail', 'Detail'), {},
        statList([
          [t('Revenu ordinaire', 'Ordinary income'), money(income, { currency: cur })],
          ...(W.capGains > 0 ? [[t(`Gain en capital (inclus à ${pct(jur.capGainsInclusion ?? 1, 0)})`, `Capital gain (${pct(jur.capGainsInclusion ?? 1, 0)} included)`), money(W.capGains, { currency: cur })]] : []),
          ...(W.eligibleDiv > 0 ? [[t('Dividendes déterminés (majorés)', 'Eligible dividends (grossed-up)'), money(W.eligibleDiv, { currency: cur })]] : []),
          ...(W.nonEligibleDiv > 0 ? [[t('Dividendes non déterminés (majorés)', 'Non-eligible dividends (grossed-up)'), money(W.nonEligibleDiv, { currency: cur })]] : []),
          [t('Revenu imposable', 'Taxable income'), money(tx.taxable, { currency: cur })],
          [t('Impôt fédéral', 'Federal tax'), money(tx.federal, { currency: cur }), 'neg'],
          [t(`Impôt ${jur.regionLabel.toLowerCase()}`, `${jur.regionLabel} tax`), money(tx.regional, { currency: cur }), 'neg'],
          [t('Cotisations sociales', 'Payroll / social'), money(tx.payroll, { currency: cur }), 'neg'],
          ...(tx.clawback > 0 ? [[t('Récupération de la PSV', 'OAS recovery tax'), money(tx.clawback, { currency: cur }), 'neg']] : []),
          [t('— Impôt total', '— Total tax'), money(tx.total, { currency: cur }), 'neg'],
          [t('Revenu après impôt', 'After-tax income'), money(tx.afterTax, { currency: cur }), 'pos'],
          [t('Revenu net mensuel', 'Net monthly income'), money(tx.afterTax / 12, { currency: cur }), 'pos'],
        ])),
      (creditRows.length || payrollRows.length) ? card(t('Crédits et cotisations', 'Credits and contributions'), { class: 'span-full', sub: t(`Valeur des crédits non remboursables et détail des cotisations statutaires (${jur.taxYear})`, `Value of non-refundable credits and statutory contribution detail (${jur.taxYear})`) },
        h('div', { class: 'grid cols-2' },
          h('div', {}, h('div', { class: 'tiny muted', style: { fontWeight: 600, marginBottom: '4px' } }, t('Crédits (valeur en impôt)', 'Credits (tax value)')), creditRows.length ? statList(creditRows) : h('div', { class: 'tiny muted' }, '—')),
          h('div', {}, h('div', { class: 'tiny muted', style: { fontWeight: 600, marginBottom: '4px' } }, t('Cotisations', 'Contributions')), payrollRows.length ? statList(payrollRows) : h('div', { class: 'tiny muted' }, '—')),
        )) : null,
      regionComparison(),
    );
  }

  function regionComparison() {
    const regions = Object.keys(jur.regions);
    const data = regions.map(r => {
      const jr = getJurisdiction(jur.country, r);
      const tx = computeTax(jr, taxInputs(jr));
      return { region: r, name: jur.regions[r], total: tx.total, net: tx.afterTax, avg: tx.averageRate, marginal: tx.marginalRate };
    }).sort((a, b) => a.total - b.total);

    return card(t(`Comparaison — ${jur.regionLabel}s du ${jur.name}`, `Comparison — ${jur.name} ${jur.regionLabel.toLowerCase()}s`), { class: 'span-full',
      sub: t(`Impôt total sur un revenu de ${money(income, { currency: cur })} (${jur.taxYear})`, `Total tax on income of ${money(income, { currency: cur })} (${jur.taxYear})`),
      right: legend([{ color: PALETTE[5], label: t('Impôt total', 'Total tax') }, { color: PALETTE[6], label: t('Revenu net', 'Net income') }]) },
      h('div', { html: barChart({
        xLabels: data.map(d => d.name.length > 14 ? d.region : d.name),
        series: [
          { color: PALETTE[5], values: data.map(d => Math.round(d.total)) },
          { color: PALETTE[6], values: data.map(d => Math.round(d.net)) },
        ], stacked: true,
      }) }),
      h('div', { class: 'tbl-wrap', style: { marginTop: '12px', maxHeight: '300px' } },
        h('table', { class: 'tbl' },
          h('thead', {}, h('tr', {}, h('th', {}, jur.regionLabel), h('th', { class: 'num' }, t('Impôt total', 'Total tax')),
            h('th', { class: 'num' }, t('Taux moyen', 'Avg rate')), h('th', { class: 'num' }, t('Taux marginal', 'Marginal')), h('th', { class: 'num' }, t('Revenu net', 'Net income')))),
          h('tbody', {}, ...data.map((d, i) => h('tr', {},
            h('td', {}, h('b', {}, d.name), i === 0 ? h('span', { class: 'chip pos', style: { marginLeft: '8px' } }, t('plus avantageux', 'most favorable')) : null),
            h('td', { class: 'num mono' }, money(d.total, { currency: cur })),
            h('td', { class: 'num mono' }, pct(d.avg, 1)),
            h('td', { class: 'num mono' }, pct(d.marginal, 1)),
            h('td', { class: 'num mono' }, money(d.net, { currency: cur })),
          ))))));
  }

  // ---- controls ----
  const incomeSliderWrap = h('div', {});
  function buildIncomeSlider() {
    incomeSliderWrap.replaceChildren(slider({ label: t(`Revenu ordinaire — ${member ? member.name : ''}`, `Ordinary income — ${member ? member.name : ''}`), value: income, min: 0, max: 500000, step: 1000,
      format: v => money(v, { currency: cur, compact: true }), onInput: v => { income = v; save({ ordinaryOverride: v === baseOrdinary() ? -1 : v }); redraw(); } }));
  }
  buildIncomeSlider();
  const memberSel = h('select', { onChange: e => { save({ memberId: e.target.value, ordinaryOverride: -1 }); member = F.byMember[e.target.value] || F.primary; income = baseOrdinary(); buildIncomeSlider(); redraw(); } },
    ...F.members.map(m => h('option', { value: m.id, selected: member && m.id === member.id }, `${m.name} · ${money(m.ordinary, { currency: cur, compact: true })}`)));
  const resetBtn = h('button', { class: 'btn sm ghost', onClick: () => { save({ ordinaryOverride: -1, capGains: 0, eligibleDiv: 0, nonEligibleDiv: 0 }); income = baseOrdinary(); buildIncomeSlider(); extrasWrap.replaceChildren(...buildExtras()); redraw(); } }, t('Valeurs du dossier', 'File values'));

  const extrasWrap = h('div', { class: 'grid cols-3' });
  function buildExtras() {
    return [
      slider({ label: jur.country === 'CA' ? t('Gain en capital réalisé', 'Realized capital gain') : t('Gain en capital LT', 'Long-term capital gains'), value: W.capGains, min: 0, max: 300000, step: 1000,
        format: v => money(v, { currency: cur, compact: true }), onInput: v => { save({ capGains: v }); redraw(); } }),
      jur.country === 'CA'
        ? slider({ label: t('Dividendes déterminés', 'Eligible dividends'), value: W.eligibleDiv, min: 0, max: 150000, step: 1000,
          format: v => money(v, { currency: cur, compact: true }), onInput: v => { save({ eligibleDiv: v }); redraw(); } })
        : h('div', { class: 'field' }, h('label', {}, t('Statut', 'Status')), h('input', { value: fs === 'married' ? t('Marié (MFJ)', 'Married (MFJ)') : t('Célibataire', 'Single'), disabled: true })),
      jur.country === 'CA'
        ? slider({ label: t('Dividendes non déterminés', 'Non-eligible dividends'), value: W.nonEligibleDiv, min: 0, max: 150000, step: 1000,
          format: v => money(v, { currency: cur, compact: true }), onInput: v => { save({ nonEligibleDiv: v }); redraw(); } })
        : h('div', {}),
    ];
  }
  extrasWrap.replaceChildren(...buildExtras());

  const ctrl = card(t(`Paramètres de revenu — année d'imposition ${jur.taxYear}`, `Income parameters — ${jur.taxYear} tax year`), { sub: t('Revenu, âge, pensions et PSV du membre tirés du dossier · vos ajustements sont conservés', 'Member income, age, pensions and OAS from the file · your adjustments are kept'),
    right: h('div', { class: 'inline', style: { gap: '8px' } }, F.members.length > 1 ? memberSel : null, resetBtn) },
    h('div', { class: 'grid cols-3' }, incomeSliderWrap,
      h('div', { class: 'field' }, h('label', {}, t('Âge · pension · PSV (dossier)', 'Age · pension · OAS (file)')),
        h('input', { value: member ? `${member.age} ${t('ans', 'yrs')} · ${money(member.pensionIncome, { currency: cur, compact: true })} · ${money(member.oasIncome, { currency: cur, compact: true })}` : '—', disabled: true })),
      h('div', { class: 'field' }, h('label', {}, t('Revenu d’emploi (cotisations)', 'Employment income (contributions)')),
        h('input', { value: member ? `${money(member.employmentIncome, { currency: cur, compact: true })}${member.selfEmployed ? t(' · autonome', ' · self-employed') : ''}` : '—', disabled: true })),
    ),
    extrasWrap);

  redraw();
  return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, ctrl), out);
}
