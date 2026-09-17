import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, PALETTE } from '../charts.js';
import { incorporationAnalysis, incorporationBreakeven } from '../../engine/selfbiz.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';
import { store as appStore } from '../../state/store.js';

export function render({ store, client, jur }) {
  store = store || appStore;
  const cur = jur.currency;
  const isCA = jur.country === 'CA';
  const F = clientFacts(client, jur);
  const owner = (F.business && F.business.owner) || F.primary || { age: 45, employmentIncome: 0 };

  // Defaults from the file: business income on record (or self-employment income),
  // what the household actually needs after tax (expenses + debt service), owner's age.
  const incomeGuess = (F.business && F.business.activeIncome) || owner.employmentIncome || 150000;
  const needGuess = Math.round(F.household.expenses + F.household.debtService) || 70000;
  const P = whatIf(client, 'incorporation', { businessIncome: Math.round(incomeGuess), personalNeed: needGuess, adminCost: 2500 });
  const setP = (k, v) => { P[k] = v; saveWhatIf(store, 'incorporation', { [k]: v }); };
  const params = () => ({ ...P, age: owner.age });

  const out = h('div', {});
  function draw() {
    const r = incorporationAnalysis(jur, params());
    const be = incorporationBreakeven(jur, P.personalNeed, P.adminCost);
    out.replaceChildren(
      h('div', { class: 'grid cols-4', style: { marginBottom: '12px' } },
        kpi({ label: t('Recommandation', 'Recommendation'), value: r.worthwhile ? t('Incorporer', 'Incorporate') : t('Rester individuel', 'Stay sole prop'), accent: r.worthwhile ? 'var(--pos)' : 'var(--warn)' }),
        kpi({ label: t('Avantage net annuel', 'Net annual advantage'), value: money(r.netAdvantage, { currency: cur, compact: true }), accent: r.netAdvantage >= 0 ? 'var(--pos)' : 'var(--neg)' }),
        kpi({ label: t('Impôt reporté (cette année)', 'Tax deferred (this year)'), value: money(r.taxDeferred, { currency: cur, compact: true }) }),
        kpi({ label: t('Seuil de rentabilité', 'Break-even income'), value: be ? money(be, { currency: cur, compact: true }) : '—', sub: t('revenu d’entreprise', 'business income') }),
      ),
      h('div', { html: barChart({ xLabels: [t('Impôt — individuel', 'Tax — sole prop'), t('Impôt — incorporé', 'Tax — incorporated')],
        series: [{ color: PALETTE[5], values: [Math.round(r.soleTax), Math.round(r.incorpTaxThisYear)] }] }) }),
      legend([{ color: PALETTE[5], label: t('Impôt total cette année', 'Total tax this year') }]),
      h('div', { class: 'sep' }),
      statList([
        [t('Revenu d’entreprise', 'Business income'), money(r.businessIncome, { currency: cur })],
        [t('Besoin personnel (après impôt)', 'Personal need (after-tax)'), money(r.personalNeed, { currency: cur })],
        [t('Salaire requis (avant impôt)', 'Salary required (pre-tax)'), money(r.salary, { currency: cur })],
        [t('Coût employeur (RRQ/RPC, RQAP)', 'Employer cost (CPP/QPP, QPIP)'), money(r.employerCost, { currency: cur }), 'neg'],
        [t('Surplus retenu dans la société', 'Surplus retained in corp'), money(r.surplus, { currency: cur }), 'pos'],
        [t(`Taux d’impôt corporatif (PME, ${jur.taxYear})`, `Corporate (small-business) rate (${jur.taxYear})`), pct(r.sbRate, 1)],
        [t('Bénéfice du report d’impôt', 'Tax-deferral benefit'), money(r.deferralBenefit, { currency: cur }), 'pos'],
        [t('Coût d’administration annuel', 'Annual admin cost'), money(-r.adminCost, { currency: cur }), 'neg'],
        [t('= Avantage net', '= Net advantage'), money(r.netAdvantage, { currency: cur }), r.netAdvantage >= 0 ? 'pos' : 'neg'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '10px' } }, r.note),
    );
  }
  draw();

  const ctrl = card(t('Devrais-je m’incorporer ?', 'Should I incorporate?'), {
    sub: t(`Entreprise individuelle vs société (SPCC) — besoin = dépenses + service de la dette du dossier (${money(needGuess, { currency: cur, compact: true })}), âge ${owner.age}`, `Sole proprietor vs corporation (CCPC) — need = file expenses + debt service (${money(needGuess, { currency: cur, compact: true })}), age ${owner.age}`) },
    h('div', { class: 'grid cols-3' },
      slider({ label: t('Revenu d’entreprise', 'Business income'), value: P.businessIncome, min: 30000, max: 1000000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('businessIncome', v); draw(); } }),
      slider({ label: t('Besoin personnel après impôt', 'Personal need after-tax'), value: P.personalNeed, min: 20000, max: 300000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('personalNeed', v); draw(); } }),
      slider({ label: t('Coût d’administration annuel', 'Annual admin cost'), value: P.adminCost, min: 0, max: 10000, step: 250, format: v => money(v, { currency: cur }), onInput: v => { setP('adminCost', v); draw(); } }),
    ),
    !isCA ? h('p', { class: 'tiny muted', style: { marginTop: '8px' } }, t('Modèle calibré pour le Canada (taux des PME et intégration).', 'Model calibrated for Canada (small-business rate and integration).')) : null);

  const more = card(t('Au-delà de l’impôt', 'Beyond the tax'), { class: 'span-full' },
    h('div', { class: 'grid cols-2' }, ...[
      [t('Protection des actifs', 'Asset protection'), t('La société limite la responsabilité personnelle et protège les actifs accumulés du risque d’exploitation.', 'A corporation limits personal liability and shields accumulated assets from operating risk.')],
      [t('Accès à l’EGC', 'Access to the LCGE'), t(`Les actions d’une SPCC admissible donnent droit à l’exonération de ${money(jur.corporate?.lcge || 0, { currency: cur, compact: true })} à la vente — pas une entreprise individuelle.`, `Shares of a qualifying CCPC give access to the ${money(jur.corporate?.lcge || 0, { currency: cur, compact: true })} exemption on sale — a sole prop does not.`)],
      [t('Fractionnement & RRI/RCA', 'Splitting & IPP/RCA'), t('La société ouvre la porte au fractionnement (sous TOSI), au RRI et à la convention de retraite.', 'A corporation enables income splitting (subject to TOSI), an IPP and an RCA.')],
      [t('Coûts & complexité', 'Costs & complexity'), t('Frais juridiques et comptables, déclarations T2/CO-17, paie — à soupeser contre les bénéfices.', 'Legal/accounting fees, T2/CO-17 filings, payroll — weigh against the benefits.')],
    ].map(([ti, tx]) => h('div', { class: 'flex', style: { gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' } },
      h('span', { class: 'chip info', style: { flex: 'none' }, html: icon('check', 13) }),
      h('div', {}, h('b', {}, ti), h('div', { class: 'tiny muted' }, tx))))));

  return h('div', { class: 'grid' }, h('div', { class: 'span-full' }, ctrl), h('div', { class: 'span-full' }, card(t('Résultat', 'Result'), {}, out)), more);
}
