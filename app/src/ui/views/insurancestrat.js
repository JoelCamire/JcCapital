import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, lineChart, PALETTE } from '../charts.js';
import { cdaCredit, corporateInsuranceEstate, insuredRetirementPlan, immediateFinancingArrangement, buySellNeed, keyPersonNeed, estateEqualization } from '../../engine/insurancestrat.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';
import { store as appStore } from '../../state/store.js';

export function render({ store, client, jur }) {
  store = store || appStore;
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const FB = F.business;
  const owner = (FB && FB.owner) || F.primary || { id: null, age: 45, retirementAge: 65, marginal: { ordinary: 0.5, noneligible: 0.45 } };
  const ownerCoverage = (owner.id && F.coverage[owner.id]) || { life: 0 };
  const bizVal = FB ? (FB.value || 0) : 0;
  const activeIncome = FB ? (FB.activeIncome || 0) : 0;
  const shareholders = FB ? Math.max(1, FB.owners) : 1;

  // Defaults from the file: coverage on record, owner's marginal rates, business value, return assumption
  const dbDefault = ownerCoverage.life > 0 ? Math.round(ownerCoverage.life) : 1000000;
  const P = whatIf(client, 'insurancestrat', {
    db: dbDefault, acb: Math.round(dbDefault * 0.15), needDeath: Math.round(bizVal || dbDefault),
    divTax: Math.round((owner.marginal.noneligible ?? owner.marginal.ordinary) * 100) / 100,
    irpPrem: 25000, irpYears: 20, irpRetire: Math.max(owner.age + 10, owner.retirementAge || 65), irpFace: Math.max(250000, Math.round(dbDefault * 0.75)),
    ifaPrem: 50000, ifaYears: 15, ifaLoan: 0.06, ifaRet: F.assumptions.preReturn, ifaMarg: Math.round(owner.marginal.ordinary * 100) / 100,
    kpFactor: 0.4, kpMultiple: 5,
  });
  const setP = (k, v) => { P[k] = v; saveWhatIf(store, 'insurancestrat', { [k]: v }); };

  // ---------- Corporate-owned insurance / CDA ----------
  const cdaBox = h('div', {});
  function drawCDA() {
    const c = cdaCredit(P.db, P.acb);
    const e = corporateInsuranceEstate(P.needDeath, P.db, P.acb, P.divTax);
    cdaBox.replaceChildren(
      h('div', { class: 'grid cols-3', style: { marginBottom: '10px' } },
        kpi({ label: t('Impôt sans assurance (dividende imposable)', 'Tax without insurance (taxable dividend)'), value: money(e.taxWithout, { currency: cur, compact: true }), accent: 'var(--neg)' }),
        kpi({ label: t('Impôt avec assurance (CDC)', 'Tax with insurance (CDA)'), value: money(e.taxWith, { currency: cur, compact: true }), accent: e.taxWith > 0 ? 'var(--warn)' : 'var(--pos)' }),
        kpi({ label: t('Avantage de l’assurance', 'Insurance advantage'), value: money(e.advantage, { currency: cur, compact: true }), accent: 'var(--pos)' }),
      ),
      h('div', { html: barChart({
        xLabels: [t('Sans assurance (dividende)', 'No insurance (dividend)'), t('Avec assurance (CDC)', 'With insurance (CDA)')],
        series: [{ color: PALETTE[4], values: [Math.round(e.taxWithout), Math.round(e.taxWith)] }],
      }) }),
      legend([{ color: PALETTE[4], label: t('Impôt pour financer le besoin au décès', 'Tax to fund the need at death') }]),
      h('div', { class: 'sep' }),
      statList([
        [t('Liquidité requise au décès', 'Liquidity needed at death'), money(e.needAtDeath, { currency: cur })],
        [t('Dividende brut à verser sans assurance', 'Gross dividend to pay without insurance'), money(e.grossToExtract, { currency: cur })],
        [t('Prestation de décès', 'Death benefit'), money(P.db, { currency: cur })],
        [t('Crédit au CDC (libre d’impôt)', 'CDA credit (tax-free)'), money(e.cda, { currency: cur }), 'pos'],
        [t('Portion imposable (PBR police)', 'Taxable portion (policy ACB)'), money(e.taxablePortion, { currency: cur })],
        [t('Net à la succession — avec assurance', 'Net to estate — with insurance'), money(e.insuredNet, { currency: cur }), 'pos'],
        [t('Manque à combler (dividende imposable)', 'Shortfall (taxable dividend)'), money(e.shortfall, { currency: cur }), e.shortfall > 0 ? 'neg' : 'pos'],
        [t('Impôt — sans assurance', 'Tax — no insurance'), money(e.taxWithout, { currency: cur }), 'neg'],
        [t('Impôt — avec assurance', 'Tax — with insurance'), money(e.taxWith, { currency: cur }), e.taxWith > 0 ? 'neg' : 'pos'],
        [t('Avantage de l’assurance', 'Insurance advantage'), money(e.advantage, { currency: cur }), 'pos'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } },
        t('Le capital-décès d’une police détenue par la société crédite le compte de dividendes en capital (CDC), permettant un versement libre d’impôt aux actionnaires/à la succession. Sans assurance, la société doit verser un dividende imposable assez grand pour laisser le besoin net.',
          'The death benefit of a corporate-owned policy credits the Capital Dividend Account (CDA), enabling a tax-free payout to shareholders/the estate. Without insurance, the corporation must pay a taxable dividend large enough to net the need.')),
    );
  }
  drawCDA();
  const cdaCard = card(t('Assurance corporative & CDC', 'Corporate-owned insurance & CDA'), { class: 'span-full',
    sub: t(`Sortie libre d’impôt du capital-décès via le CDC — couverture vie au dossier : ${money(ownerCoverage.life, { currency: cur, compact: true })} · taux sur dividende non déterminé ${pct(owner.marginal.noneligible ?? 0, 1)}`, `Tax-free death benefit payout via the CDA — life coverage on file: ${money(ownerCoverage.life, { currency: cur, compact: true })} · non-eligible dividend rate ${pct(owner.marginal.noneligible ?? 0, 1)}`) },
    h('div', { class: 'grid cols-4' },
      slider({ label: t('Prestation de décès', 'Death benefit'), value: P.db, min: 100000, max: 5000000, step: 50000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('db', v); drawCDA(); } }),
      slider({ label: t('PBR de la police', 'Policy ACB'), value: P.acb, min: 0, max: 1000000, step: 10000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('acb', v); drawCDA(); } }),
      slider({ label: t('Liquidité requise au décès', 'Liquidity needed at death'), value: P.needDeath, min: 0, max: 5000000, step: 50000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('needDeath', v); drawCDA(); } }),
      slider({ label: t('Taux d’impôt sur dividende (dérivé)', 'Dividend tax rate (derived)'), value: P.divTax, min: 0.2, max: 0.55, step: 0.01, format: v => pct(v, 0), onInput: v => { setP('divTax', v); drawCDA(); } }),
    ),
    cdaBox);

  // ---------- Insured Retirement Plan ----------
  const irpBox = h('div', {});
  function drawIRP() {
    const r = insuredRetirementPlan({ annualPremium: P.irpPrem, fundingYears: P.irpYears, currentAge: owner.age, retireAge: P.irpRetire, endAge: Math.max(P.irpRetire + 1, owner.lifeExpectancy || 90), faceAmount: P.irpFace });
    irpBox.replaceChildren(
      h('div', { html: lineChart({
        series: [
          { color: PALETTE[1], values: r.series.map(s => Math.round(s.cv)) },
          { color: PALETTE[4], values: r.series.map(s => Math.round(s.loan)) },
        ], xLabels: r.series.map(s => s.age), area: false,
      }) }),
      legend([{ color: PALETTE[1], label: t('Valeur de rachat', 'Cash value') }, { color: PALETTE[4], label: t('Solde du prêt', 'Loan balance') }]),
      h('div', { class: 'sep' }),
      h('div', { class: 'grid cols-2' },
        statList([
          [t('Valeur de rachat à la retraite', 'Cash value at retirement'), money(r.cvAtRetire, { currency: cur }), 'pos'],
          [t('Revenu annuel libre d’impôt', 'Annual tax-free income'), money(r.annualIncome, { currency: cur }), 'pos'],
        ]),
        statList([
          [t('Primes totales versées', 'Total premiums paid'), money(r.totalPremiums, { currency: cur })],
          [t('Net à la succession (capital-décès − prêt)', 'Net to estate (death benefit − loan)'), money(r.netToEstate, { currency: cur }), 'pos'],
        ]),
      ),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } },
        t('On surcapitalise une police permanente : la valeur de rachat croît à l’abri de l’impôt, puis on emprunte contre la police (revenu libre d’impôt). Le prêt est remboursé au décès par le capital-décès.',
          'You over-fund a permanent policy: the cash value grows tax-sheltered, then you borrow against it (tax-free income). The loan is repaid at death from the death benefit.')),
    );
  }
  drawIRP();
  const irpCard = card(t('Régime de retraite assuré (RRA / IRP)', 'Insured Retirement Plan (IRP)'), { class: 'span-full',
    sub: t(`Revenu de retraite libre d’impôt par emprunt sur police — âge actuel ${owner.age} (dossier)`, `Tax-free retirement income via policy loans — current age ${owner.age} (file)`) },
    h('div', { class: 'grid cols-4' },
      slider({ label: t('Prime annuelle', 'Annual premium'), value: P.irpPrem, min: 5000, max: 100000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('irpPrem', v); drawIRP(); } }),
      slider({ label: t('Années de capitalisation', 'Funding years'), value: P.irpYears, min: 5, max: 30, step: 1, format: v => `${v}`, onInput: v => { setP('irpYears', v); drawIRP(); } }),
      slider({ label: t('Âge de retraite', 'Retirement age'), value: P.irpRetire, min: 55, max: 75, step: 1, format: v => `${v}`, onInput: v => { setP('irpRetire', v); drawIRP(); } }),
      slider({ label: t('Capital-décès (face)', 'Death benefit (face)'), value: P.irpFace, min: 250000, max: 5000000, step: 50000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('irpFace', v); drawIRP(); } }),
    ),
    irpBox);

  // ---------- Immediate Financing Arrangement ----------
  const ifaBox = h('div', {});
  function drawIFA() {
    const r = immediateFinancingArrangement({ annualPremium: P.ifaPrem, years: P.ifaYears, loanRate: P.ifaLoan, reinvestReturn: P.ifaRet, marginalRate: P.ifaMarg });
    ifaBox.replaceChildren(statList([
      [t('Primes totales', 'Total premiums'), money(r.grossPremiums, { currency: cur })],
      [t('Valeur réinvestie (capital remis au travail)', 'Reinvested value (capital put back to work)'), money(r.reinvestValue, { currency: cur }), 'pos'],
      [t(`Économie d’impôt sur intérêts (${pct(P.ifaMarg, 0)})`, `Interest tax saving (${pct(P.ifaMarg, 0)})`), money(r.cumInterestSaving, { currency: cur }), 'pos'],
      [t('Déduction assurance collatérale (NCPI)', 'Collateral insurance deduction (NCPI)'), money(r.cumCollateralDed, { currency: cur }), 'pos'],
      [t('Coût net de l’assurance', 'Net cost of insurance'), money(r.netCostOfInsurance, { currency: cur }), r.netCostOfInsurance <= r.grossPremiums ? 'pos' : 'neg'],
    ]),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } },
        t('La société achète la police puis emprunte aussitôt la prime pour la réinvestir dans l’entreprise. Les intérêts et une partie de la prime (NCPI) sont déductibles, réduisant fortement le coût net de la protection.',
          'The corporation buys the policy then immediately borrows the premium to reinvest in the business. Interest and part of the premium (NCPI) are deductible, sharply lowering the net cost of coverage.')));
  }
  drawIFA();
  const ifaCard = card(t('Arrangement de financement immédiat (AFI / IFA)', 'Immediate Financing Arrangement (IFA)'), { class: 'span-full',
    sub: t('Conserver le capital au travail tout en s’assurant', 'Keep capital working while staying insured') },
    h('div', { class: 'grid cols-4' },
      slider({ label: t('Prime annuelle', 'Annual premium'), value: P.ifaPrem, min: 10000, max: 250000, step: 10000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { setP('ifaPrem', v); drawIFA(); } }),
      slider({ label: t('Années', 'Years'), value: P.ifaYears, min: 5, max: 30, step: 1, format: v => `${v}`, onInput: v => { setP('ifaYears', v); drawIFA(); } }),
      slider({ label: t('Taux du prêt', 'Loan rate'), value: P.ifaLoan, min: 0.03, max: 0.1, step: 0.005, format: v => pct(v), onInput: v => { setP('ifaLoan', v); drawIFA(); } }),
      slider({ label: t('Rendement réinvesti (hypothèse du dossier)', 'Reinvestment return (file assumption)'), value: P.ifaRet, min: 0.03, max: 0.12, step: 0.005, format: v => pct(v), onInput: v => { setP('ifaRet', v); drawIFA(); } }),
      slider({ label: t('Taux marginal (dérivé)', 'Marginal rate (derived)'), value: P.ifaMarg, min: 0.2, max: 0.55, step: 0.01, format: v => pct(v, 0), onInput: v => { setP('ifaMarg', v); drawIFA(); } }),
    ),
    ifaBox);

  // ---------- Buy-sell / key person / estate equalization ----------
  const protectBox = h('div', { class: 'grid cols-3' });
  function drawProtect() {
    const bs = buySellNeed(bizVal, Math.max(1, shareholders));
    const kp = keyPersonNeed(activeIncome * P.kpFactor, 0, P.kpMultiple);
    const eq = estateEqualization(bizVal, Math.max(2, (client.dependents || []).length + 1), 1);
    protectBox.replaceChildren(
      h('div', { class: 'card', style: { background: 'var(--surface-2)' } },
        h('b', {}, t('Convention de rachat', 'Buy-sell agreement')),
        h('div', { class: 'value', style: { fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, margin: '6px 0' } }, money(bs.perOwner, { currency: cur, compact: true })),
        h('div', { class: 'tiny muted' }, t(`assurance par actionnaire (${shareholders} détenteur(s) au dossier) pour financer le rachat des parts au décès`, `insurance per shareholder (${shareholders} owner(s) on file) to fund the buyout of shares at death`))),
      h('div', { class: 'card', style: { background: 'var(--surface-2)' } },
        h('b', {}, t('Personne clé', 'Key person')),
        h('div', { class: 'value', style: { fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, margin: '6px 0' } }, money(kp.coverage, { currency: cur, compact: true })),
        h('div', { class: 'tiny muted' }, t(`${pct(P.kpFactor, 0)} du revenu actif (${money(activeIncome, { currency: cur, compact: true })}) × ${P.kpMultiple} ans pour remplacer la contribution aux profits et le recrutement`, `${pct(P.kpFactor, 0)} of active income (${money(activeIncome, { currency: cur, compact: true })}) × ${P.kpMultiple} yrs to replace profit contribution and recruiting`))),
      h('div', { class: 'card', style: { background: 'var(--surface-2)' } },
        h('b', {}, t('Égalisation successorale', 'Estate equalization')),
        h('div', { class: 'value', style: { fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, margin: '6px 0' } }, money(eq.insuranceNeeded, { currency: cur, compact: true })),
        h('div', { class: 'tiny muted' }, t('assurance pour équilibrer le legs entre héritiers actifs et inactifs', 'insurance to balance the legacy between active and inactive heirs'))),
    );
  }
  drawProtect();
  const protectCard = card(t('Protection de l’entreprise', 'Business protection'), { class: 'span-full',
    sub: FB ? t(`Basé sur une valeur d’entreprise de ${money(bizVal, { currency: cur, compact: true })} (dossier)`, `Based on a business value of ${money(bizVal, { currency: cur, compact: true })} (file)`) : t('Aucune entreprise au dossier — ajoutez-en une dans l’onglet Entreprise', 'No business on file — add one in the Business tab') },
    h('div', { class: 'grid cols-2', style: { marginBottom: '10px' } },
      slider({ label: t('Personne clé — part du revenu actif attribuable', 'Key person — share of active income attributable'), value: P.kpFactor, min: 0, max: 1, step: 0.05, format: v => pct(v, 0), onInput: v => { setP('kpFactor', v); drawProtect(); } }),
      slider({ label: t('Personne clé — multiple (années)', 'Key person — multiple (years)'), value: P.kpMultiple, min: 1, max: 10, step: 1, format: v => `${v}`, onInput: v => { setP('kpMultiple', v); drawProtect(); } }),
    ),
    protectBox);

  return h('div', { class: 'grid' }, cdaCard, irpCard, ifaCard, protectCard);
}
