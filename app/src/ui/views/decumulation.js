import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend, badgeScore } from '../widgets.js';
import { lineChart, barChart, PALETTE } from '../charts.js';
import { compareDecumulation, strategyLabel, strategyDesc, defaultBracketTarget } from '../../engine/decumulation.js';
import { clientFacts, retirementFacts, whatIf, saveWhatIf } from '../../engine/facts.js';

export function render({ store, client, jur }) {
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const R = retirementFacts(client, jur);
  const primary = F.primary || { id: null, age: 40, retirementAge: 65, lifeExpectancy: 92 };
  const retRow = R.projection.summary.retirementRow;

  // Balances in the FIRST retirement year (projected) when the client is not yet retired, else today's buckets.
  // 0 is 0 — no phantom fallbacks.
  const bal = R.balances || F.buckets;
  const pensionPart = retRow ? Object.values(retRow.byMember).reduce((s, m) => s + (m.buckets?.pension || 0), 0) : F.household.pensionIncome - F.members.reduce((s, m) => s + m.cppIncome, 0);
  const cppInRow = retRow ? Object.values(retRow.byMember).reduce((s, m) => s + (m.buckets?.cpp || 0), 0) : 0;
  const pens = (primary.id && F.pensions[primary.id]) || { oas: { annual: 0, startAge: 65 }, cpp: { annual: 0, startAge: 65 } };
  const cppHousehold = F.members.reduce((s, m) => s + ((F.pensions[m.id]?.cpp?.annual) || 0), 0);
  const hasRrif = (client.assets || []).some(a => a.type === 'rrif' || a.type === 'lif');

  const defaults = {
    startAge: primary.retirementAge, endAge: primary.lifeExpectancy,
    deferred: Math.round(bal.deferred || 0),
    tfsa: Math.round(bal.taxfree || 0),
    nonreg: Math.round(bal.taxable || 0),
    nonregBasis: Math.round(R.balances ? R.basisTaxable : F.buckets.basisTaxable),
    otherIncomeNow: Math.round(Math.max(0, (R.pensionIncome || 0) - cppInRow)),   // retirement-year pensions (excl. CPP/QPP, handled with its own start age)
    pensionIncomeNow: Math.round(pensionPart || 0),          // eligible pension part (pension credit / splitting)
    cppAnnual: Math.round(cppHousehold || 0), cppStartAge: (pens.cpp && pens.cpp.startAge) || 65,
    oasAnnual: Math.round(pens.oas.annual || 0), oasStartAge: pens.oas.startAge,
    spending: Math.round(R.spending || 0),
    inflation: F.assumptions.inflation, returnRate: F.assumptions.postReturn, distributionYield: F.assumptions.distributionYield,
    bracketTarget: defaultBracketTarget(jur),
  };
  const p = { ...whatIf(client, 'decumulation', defaults), deferredType: hasRrif ? 'rrif' : 'rrsp' };
  const save = (patch) => { Object.assign(p, patch); saveWhatIf(store, 'decumulation', patch); };

  const out = h('div', {});
  function draw() {
    const cmp = compareDecumulation(jur, p);
    const byKey = Object.fromEntries(cmp.results.map(r => [r.strategy, r]));
    const best = byKey[cmp.best];
    const baseline = byKey.nonregFirst;
    const taxSaved = baseline.totalTax - best.totalTax;
    const estateGain = best.finalEstate - baseline.finalEstate;
    const labels = cmp.results.map(r => strategyLabel(r.strategy));
    const short = (l) => l.length > 14 ? l.slice(0, 12) + '…' : l;

    const yearRows = best.rows.filter((r, i) => i % 5 === 0 || i === best.rows.length - 1);
    const detailTable = h('div', { class: 'tbl-wrap', style: { maxHeight: '360px' } },
      h('table', { class: 'tbl' },
        h('thead', {}, h('tr', {},
          h('th', {}, t('Âge', 'Age')), h('th', { class: 'num' }, t('REER/FERR', 'RRSP/RRIF')), h('th', { class: 'num' }, 'CELI / TFSA'),
          h('th', { class: 'num' }, t('Non enr.', 'Non-reg')), h('th', { class: 'num' }, t('Revenu imposable', 'Taxable income')),
          h('th', { class: 'num' }, t('PSV', 'OAS')), h('th', { class: 'num' }, t('Récup. PSV', 'OAS clawback')),
          h('th', { class: 'num' }, t('Impôt', 'Tax')), h('th', { class: 'num' }, t('Succession nette', 'Net estate')), h('th', {}, ''))),
        h('tbody', {}, ...yearRows.map(r => h('tr', {},
          h('td', {}, r.age),
          h('td', { class: 'num mono' }, money(r.deferred, { currency: cur, compact: true })),
          h('td', { class: 'num mono' }, money(r.tfsa, { currency: cur, compact: true })),
          h('td', { class: 'num mono' }, money(r.nonreg, { currency: cur, compact: true })),
          h('td', { class: 'num mono' }, money(r.taxable, { currency: cur, compact: true })),
          h('td', { class: 'num mono' }, r.oas ? money(r.oas, { currency: cur, compact: true }) : '—'),
          h('td', { class: 'num mono', style: r.clawback > 0 ? { color: 'var(--neg)' } : {} }, r.clawback > 0 ? money(r.clawback, { currency: cur, compact: true }) : '—'),
          h('td', { class: 'num mono' }, money(r.incomeTax, { currency: cur, compact: true })),
          h('td', { class: 'num mono' }, money(r.estate, { currency: cur, compact: true })),
          h('td', {}, r.shortfall > 0 ? h('span', { class: 'chip neg' }, t('Manque', 'Shortfall')) : null),
        )))));

    out.replaceChildren(
      h('div', { class: 'grid cols-3', style: { marginBottom: '12px' } },
        kpi({ label: t('Stratégie optimale', 'Optimal strategy'), value: strategyLabel(cmp.best), accent: 'var(--pos)' }),
        kpi({ label: t('Impôt à vie économisé', 'Lifetime tax saved'), value: money(taxSaved, { currency: cur, compact: true }), accent: taxSaved >= 0 ? 'var(--pos)' : 'var(--neg)', sub: t('vs non enregistré en premier', 'vs non-registered first') }),
        kpi({ label: t('Succession nette de plus', 'Extra net estate'), value: money(estateGain, { currency: cur, compact: true }), accent: estateGain >= 0 ? 'var(--pos)' : 'var(--neg)' }),
      ),
      h('div', { class: 'grid cols-2' },
        card(t('Impôt à vie + récupération PSV', 'Lifetime tax + OAS clawback'), {},
          h('div', { html: barChart({ xLabels: labels.map(short),
            series: [{ color: PALETTE[5], values: cmp.results.map(r => Math.round(r.totalTax)) }, { color: PALETTE[3], values: cmp.results.map(r => Math.round(r.totalClawback)) }] }) }),
          legend([{ color: PALETTE[5], label: t('Impôt à vie', 'Lifetime tax') }, { color: PALETTE[3], label: t('Récupération PSV', 'OAS clawback') }])),
        card(t('Succession nette projetée', 'Projected net estate'), {},
          h('div', { html: barChart({ xLabels: labels.map(short), series: [{ color: PALETTE[1], values: cmp.results.map(r => Math.round(r.finalEstate)) }] }) })),
      ),
      card(t('Évolution de la succession (stratégie optimale)', 'Estate over time (optimal strategy)'), { class: 'span-full',
        right: legend([{ color: PALETTE[0], label: strategyLabel(cmp.best) }, { color: PALETTE[4], label: strategyLabel('nonregFirst') }]) },
        h('div', { html: lineChart({ series: [
          { color: PALETTE[0], values: best.rows.map(r => Math.round(r.estate)) },
          { color: PALETTE[4], values: baseline.rows.map(r => Math.round(r.estate)) },
        ], xLabels: best.rows.map(r => r.age), area: true }) })),
      card(t('Détail des stratégies', 'Strategy detail'), { class: 'span-full' },
        h('div', { class: 'grid cols-3' }, ...cmp.results.map(r => h('div', { class: 'card', style: { background: r.strategy === cmp.best ? 'var(--pos-soft)' : 'var(--surface-2)' } },
          h('div', { class: 'flex between center' }, h('b', {}, strategyLabel(r.strategy)), r.strategy === cmp.best ? h('span', { class: 'chip pos' }, t('Optimal', 'Optimal')) : null),
          h('div', { class: 'tiny muted', style: { margin: '6px 0' } }, strategyDesc(r.strategy)),
          statList([
            [t('Impôt à vie', 'Lifetime tax'), money(r.totalTax, { currency: cur, compact: true })],
            [t('Récupération PSV', 'OAS clawback'), money(r.totalClawback, { currency: cur, compact: true })],
            [t('Succession nette', 'Net estate'), money(r.finalEstate, { currency: cur, compact: true })],
            [t('Années en manque', 'Shortfall years'), String(r.rows.filter(x => x.shortfall > 0).length)],
          ]))))),
      card(t(`Année par année — ${strategyLabel(cmp.best)}`, `Year by year — ${strategyLabel(cmp.best)}`), { class: 'span-full',
        sub: t('Soldes de fin d’année, PSV reçue et récupération (impôt de récupération), tous les 5 ans', 'Year-end balances, OAS received and clawback (recovery tax), every 5 years') },
        detailTable),
    );
  }
  draw();

  const ctrl = card(t('Hypothèses de décaissement', 'Decumulation assumptions'), {
    sub: t(`Valeurs tirées du dossier (soldes projetés à ${p.startAge} ans, besoin de revenu, pensions, PSV) — vos ajustements sont conservés`,
      `Values from the file (balances projected at ${p.startAge}, income need, pensions, OAS) — your adjustments are kept`),
    right: h('button', { class: 'btn sm ghost', html: icon('refresh', 13) + ' ' + t('Valeurs du dossier', 'File values'),
      onClick: () => { store.quietUpdate(c => { if (c.calc) delete c.calc.decumulation; }); if (client.calc) delete client.calc.decumulation; Object.assign(p, defaults); draw(); ctrlSliders.replaceChildren(...buildSliders()); } }) },
    );
  const ctrlSliders = h('div', { class: 'grid cols-3' });
  function buildSliders() {
    return [
      slider({ label: t('REER / FERR', 'RRSP/RRIF'), value: p.deferred, min: 0, max: 5000000, step: 25000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { save({ deferred: v }); draw(); } }),
      slider({ label: 'CELI / TFSA', value: p.tfsa, min: 0, max: 1000000, step: 10000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { save({ tfsa: v }); draw(); } }),
      slider({ label: t('Non enregistré', 'Non-registered'), value: p.nonreg, min: 0, max: 3000000, step: 25000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { save({ nonreg: v, nonregBasis: Math.min(p.nonregBasis, v) }); draw(); } }),
      slider({ label: t('Dépenses annuelles (retraite)', 'Annual spending (retirement)'), value: p.spending, min: 0, max: 250000, step: 2500, format: v => money(v, { currency: cur, compact: true }), onInput: v => { save({ spending: v }); draw(); } }),
      slider({ label: t('Autre revenu imposable (rentes, FERR existant)', 'Other taxable income (pensions, existing RRIF)'), value: p.otherIncomeNow, min: 0, max: 150000, step: 1000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { save({ otherIncomeNow: v, pensionIncomeNow: Math.min(p.pensionIncomeNow, v) }); draw(); } }),
      slider({ label: t(`${jur.pensions?.cpp?.name || 'RRQ'} annuel (ménage)`, `Annual ${jur.pensions?.cpp?.name || 'CPP'} (household)`), value: p.cppAnnual, min: 0, max: 40000, step: 100, format: v => money(v, { currency: cur, compact: true }), onInput: v => { save({ cppAnnual: v }); draw(); } }),
      slider({ label: t(`Âge de début du ${jur.pensions?.cpp?.name || 'RRQ'}`, `${jur.pensions?.cpp?.name || 'CPP'} start age`), value: p.cppStartAge, min: jur.pensions?.cpp?.minAge ?? 60, max: jur.pensions?.cpp?.maxAge ?? 70, step: 1, format: v => `${v} ${t('ans', 'yrs')}`, onInput: v => { save({ cppStartAge: v }); draw(); } }),
      slider({ label: t(`${jur.pensions?.oas?.name || 'PSV'} annuelle`, `Annual ${jur.pensions?.oas?.name || 'OAS'}`), value: p.oasAnnual, min: 0, max: 20000, step: 100, format: v => money(v, { currency: cur, compact: true }), onInput: v => { save({ oasAnnual: v }); draw(); } }),
      slider({ label: t('Âge de début de la PSV', 'OAS start age'), value: p.oasStartAge, min: jur.pensions?.oas?.minAge ?? 65, max: jur.pensions?.oas?.maxAge ?? 70, step: 1, format: v => `${v} ${t('ans', 'yrs')}`, onInput: v => { save({ oasStartAge: v }); draw(); } }),
      slider({ label: t('Cible de tranche (fonte)', 'Bracket target (meltdown)'), value: p.bracketTarget, min: 20000, max: 150000, step: 2500, format: v => money(v, { currency: cur, compact: true }), onInput: v => { save({ bracketTarget: v }); draw(); } }),
      slider({ label: t('Rendement à la retraite', 'Return in retirement'), value: p.returnRate, min: 0.01, max: 0.08, step: 0.0025, format: v => pct(v), onInput: v => { save({ returnRate: v }); draw(); } }),
    ];
  }
  ctrlSliders.replaceChildren(...buildSliders());
  ctrl.appendChild(ctrlSliders);
  ctrl.appendChild(h('p', { class: 'tiny muted', style: { marginTop: '8px' } },
    t(`Compare trois ordres de décaissement avec l’impôt exact (${jur.taxYear}), les retraits minimaux du FERR et la récupération de la PSV. La « fonte du REER » lisse l’impôt et réduit souvent la récupération de la PSV pour les portefeuilles enregistrés importants.`,
      `Compares three withdrawal orders with exact ${jur.taxYear} tax, forced RRIF minimums and OAS clawback. The “RRSP meltdown” smooths tax and often reduces OAS clawback for large registered portfolios.`)));

  return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, ctrl), h('div', { class: 'span-full' }, out));
}
