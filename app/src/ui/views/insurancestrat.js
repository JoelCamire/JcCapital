import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, lineChart, PALETTE } from '../charts.js';
import { cdaCredit, corporateInsuranceEstate, insuredRetirementPlan, immediateFinancingArrangement, buySellNeed, keyPersonNeed, estateEqualization } from '../../engine/insurancestrat.js';
import { businessValuation } from '../../engine/corporate.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const primary = client.members[0] || { currentAge: 45 };
  const bizVal = client.business ? (businessValuation(client.business.valuation).estimate || client.business.retainedEarnings || 1000000) : 1000000;

  // ---------- Corporate-owned insurance / CDA ----------
  let db = 1000000, acb = 150000, needDeath = 1000000, divTax = 0.47;
  const cdaBox = h('div', {});
  function drawCDA() {
    const c = cdaCredit(db, acb);
    const e = corporateInsuranceEstate(needDeath, db, acb, divTax);
    cdaBox.replaceChildren(
      h('div', { html: barChart({
        xLabels: [t('Sans assurance (dividende)', 'No insurance (dividend)'), t('Avec assurance (CDC)', 'With insurance (CDA)')],
        series: [{ color: PALETTE[0], values: [Math.round(e.taxableRoute), Math.round(e.insuredNet)] }],
      }) }),
      h('div', { class: 'sep' }),
      statList([
        [t('Prestation de décès', 'Death benefit'), money(db, { currency: cur })],
        [t('Crédit au CDC (libre d’impôt)', 'CDA credit (tax-free)'), money(c.cda, { currency: cur }), 'pos'],
        [t('Portion imposable (PBR police)', 'Taxable portion (policy ACB)'), money(c.taxablePortion, { currency: cur })],
        [t('Net aux héritiers — sans assurance', 'Net to heirs — no insurance'), money(e.taxableRoute, { currency: cur }), 'neg'],
        [t('Net aux héritiers — avec assurance', 'Net to heirs — with insurance'), money(e.insuredNet, { currency: cur }), 'pos'],
        [t('Avantage de l’assurance', 'Insurance advantage'), money(e.advantage, { currency: cur }), 'pos'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } },
        t('Le capital-décès d’une police détenue par la société crédite le compte de dividendes en capital (CDC), permettant un versement libre d’impôt aux actionnaires/à la succession.',
          'The death benefit of a corporate-owned policy credits the Capital Dividend Account (CDA), enabling a tax-free payout to shareholders/the estate.')),
    );
  }
  drawCDA();
  const cdaCard = card(t('Assurance corporative & CDC', 'Corporate-owned insurance & CDA'), { class: 'span-full',
    sub: t('Sortie libre d’impôt du capital-décès via le compte de dividendes en capital', 'Tax-free death benefit payout via the Capital Dividend Account') },
    h('div', { class: 'grid cols-4' },
      slider({ label: t('Prestation de décès', 'Death benefit'), value: db, min: 100000, max: 5000000, step: 50000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { db = v; drawCDA(); } }),
      slider({ label: t('PBR de la police', 'Policy ACB'), value: acb, min: 0, max: 1000000, step: 10000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { acb = v; drawCDA(); } }),
      slider({ label: t('Liquidité requise au décès', 'Liquidity needed at death'), value: needDeath, min: 0, max: 5000000, step: 50000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { needDeath = v; drawCDA(); } }),
      slider({ label: t('Taux d’impôt sur dividende', 'Dividend tax rate'), value: divTax, min: 0.3, max: 0.5, step: 0.01, format: v => pct(v, 0), onInput: v => { divTax = v; drawCDA(); } }),
    ),
    cdaBox);

  // ---------- Insured Retirement Plan ----------
  let irpPrem = 25000, irpYears = 20, irpAge = primary.currentAge, irpRetire = Math.max(primary.currentAge + 10, 65), irpFace = 750000;
  const irpBox = h('div', {});
  function drawIRP() {
    const r = insuredRetirementPlan({ annualPremium: irpPrem, fundingYears: irpYears, currentAge: irpAge, retireAge: irpRetire, endAge: 90, faceAmount: irpFace });
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
    sub: t('Revenu de retraite libre d’impôt par emprunt sur police', 'Tax-free retirement income via policy loans') },
    h('div', { class: 'grid cols-4' },
      slider({ label: t('Prime annuelle', 'Annual premium'), value: irpPrem, min: 5000, max: 100000, step: 5000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { irpPrem = v; drawIRP(); } }),
      slider({ label: t('Années de capitalisation', 'Funding years'), value: irpYears, min: 5, max: 30, step: 1, format: v => `${v}`, onInput: v => { irpYears = v; drawIRP(); } }),
      slider({ label: t('Âge de retraite', 'Retirement age'), value: irpRetire, min: 55, max: 75, step: 1, format: v => `${v}`, onInput: v => { irpRetire = v; drawIRP(); } }),
      slider({ label: t('Capital-décès (face)', 'Death benefit (face)'), value: irpFace, min: 250000, max: 5000000, step: 50000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { irpFace = v; drawIRP(); } }),
    ),
    irpBox);

  // ---------- Immediate Financing Arrangement ----------
  let ifaPrem = 50000, ifaYears = 15, ifaLoan = 0.06, ifaRet = 0.07, ifaMarg = 0.50;
  const ifaBox = h('div', {});
  function drawIFA() {
    const r = immediateFinancingArrangement({ annualPremium: ifaPrem, years: ifaYears, loanRate: ifaLoan, reinvestReturn: ifaRet, marginalRate: ifaMarg });
    ifaBox.replaceChildren(statList([
      [t('Primes totales', 'Total premiums'), money(r.grossPremiums, { currency: cur })],
      [t('Valeur réinvestie (capital remis au travail)', 'Reinvested value (capital put back to work)'), money(r.reinvestValue, { currency: cur }), 'pos'],
      [t('Économie d’impôt sur intérêts', 'Interest tax saving'), money(r.cumInterestSaving, { currency: cur }), 'pos'],
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
      slider({ label: t('Prime annuelle', 'Annual premium'), value: ifaPrem, min: 10000, max: 250000, step: 10000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { ifaPrem = v; drawIFA(); } }),
      slider({ label: t('Années', 'Years'), value: ifaYears, min: 5, max: 30, step: 1, format: v => `${v}`, onInput: v => { ifaYears = v; drawIFA(); } }),
      slider({ label: t('Taux du prêt', 'Loan rate'), value: ifaLoan, min: 0.03, max: 0.1, step: 0.005, format: v => pct(v), onInput: v => { ifaLoan = v; drawIFA(); } }),
      slider({ label: t('Rendement réinvesti', 'Reinvestment return'), value: ifaRet, min: 0.03, max: 0.12, step: 0.005, format: v => pct(v), onInput: v => { ifaRet = v; drawIFA(); } }),
    ),
    ifaBox);

  // ---------- Buy-sell / key person / estate equalization ----------
  const bs = buySellNeed(bizVal, Math.max(2, client.members.length));
  const kp = keyPersonNeed(client.business ? (client.business.activeIncome * 0.4) : 150000);
  const eq = estateEqualization(bizVal, Math.max(2, (client.dependents || []).length + 1), 1);
  const protectCard = card(t('Protection de l’entreprise', 'Business protection'), { class: 'span-full',
    sub: t(`Basé sur une valeur d’entreprise de ${money(bizVal, { currency: cur, compact: true })}`, `Based on a business value of ${money(bizVal, { currency: cur, compact: true })}`) },
    h('div', { class: 'grid cols-3' },
      h('div', { class: 'card', style: { background: 'var(--surface-2)' } },
        h('b', {}, t('Convention de rachat', 'Buy-sell agreement')),
        h('div', { class: 'value', style: { fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, margin: '6px 0' } }, money(bs.perOwner, { currency: cur, compact: true })),
        h('div', { class: 'tiny muted' }, t('assurance par actionnaire pour financer le rachat des parts au décès', 'insurance per shareholder to fund the buyout of shares at death'))),
      h('div', { class: 'card', style: { background: 'var(--surface-2)' } },
        h('b', {}, t('Personne clé', 'Key person')),
        h('div', { class: 'value', style: { fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, margin: '6px 0' } }, money(kp.coverage, { currency: cur, compact: true })),
        h('div', { class: 'tiny muted' }, t('couverture pour remplacer la contribution aux profits et le recrutement', 'coverage to replace profit contribution and recruiting'))),
      h('div', { class: 'card', style: { background: 'var(--surface-2)' } },
        h('b', {}, t('Égalisation successorale', 'Estate equalization')),
        h('div', { class: 'value', style: { fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, margin: '6px 0' } }, money(eq.insuranceNeeded, { currency: cur, compact: true })),
        h('div', { class: 'tiny muted' }, t('assurance pour équilibrer le legs entre héritiers actifs et inactifs', 'insurance to balance the legacy between active and inactive heirs'))),
    ));

  return h('div', { class: 'grid' }, cdaCard, irpCard, ifaCard, protectCard);
}
