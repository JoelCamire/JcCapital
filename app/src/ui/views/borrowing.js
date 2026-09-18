// ============================================================
// Capacité d'emprunt d'entreprise / Business borrowing capacity
// EBITDA from the business valuation block (or active income),
// existing debt service and rate from the liabilities on file;
// loan sizing through the shared amortizer.
// ============================================================
import { h, money, pct, num, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, PALETTE } from '../charts.js';
import { monthlyPayment } from '../../engine/amortization.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';
import { store as appStore } from '../../state/store.js';

export function render({ store, client, jur }) {
  store = store || appStore;
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const FB = F.business;

  // EBITDA: valuation EBITDA on file, else active income, else household gross income
  const ebitdaDef = Math.round((FB && (FB.valuation.ebitda > 0 ? FB.valuation.ebitda : FB.activeIncome)) || F.household.grossIncome) || 300000;
  const ebitdaSource = FB && FB.valuation.ebitda > 0 ? t('BAIIA de l’évaluation', 'valuation EBITDA')
    : FB ? t('revenu actif de l’entreprise', 'business active income') : t('revenu brut du ménage', 'household gross income');
  const rateDef = F.weightedRate > 0 ? F.weightedRate : (F.mortgage ? F.mortgage.rate : 0.065);

  const P = whatIf(client, 'borrowing', {
    ebitda:        ebitdaDef,
    existingDebt:  Math.round(F.annualDebtService),
    targetDSCR:    1.25,
    rate:          Math.round(rateDef * 10000) / 10000,
    amortYears:    10,
  });
  const setP = (k, v) => { P[k] = v; saveWhatIf(store, 'borrowing', { [k]: v }); };

  const out = h('div', {});

  function compute() {
    const maxTotalService  = P.ebitda / (P.targetDSCR > 0 ? P.targetDSCR : 1.25);
    const maxAddlService   = Math.max(0, maxTotalService - P.existingDebt);
    // loan such that its level monthly payment equals the affordable monthly service (shared amortizer, monthly compounding)
    const perDollar        = monthlyPayment(1, P.rate, P.amortYears, 'monthly');
    const maxLoan          = perDollar > 0 ? (maxAddlService / 12) / perDollar : 0;
    const currentDSCR      = P.existingDebt > 0 ? P.ebitda / P.existingDebt : Infinity;
    const dscrOk           = currentDSCR >= P.targetDSCR;
    const cushion          = P.ebitda - P.existingDebt * P.targetDSCR;
    const newPayment       = monthlyPayment(maxLoan, P.rate, P.amortYears, 'monthly');

    return { maxTotalService, maxAddlService, maxLoan, currentDSCR, dscrOk, cushion, newPayment };
  }

  function draw() {
    const r = compute();

    const dscrDisplay = isFinite(r.currentDSCR)
      ? num(r.currentDSCR, 2) + 'x'
      : t('N/A', 'N/A');

    const dscrChip = r.dscrOk
      ? h('span', { class: 'chip pos' }, t('DSCR ✓', 'DSCR ✓'))
      : h('span', { class: 'chip neg' }, t('DSCR trop bas', 'DSCR too low'));

    out.replaceChildren(
      h('div', { class: 'grid cols-3', style: { marginBottom: '12px' } },
        kpi({
          label:    t('Prêt additionnel max', 'Max additional loan'),
          value:    money(r.maxLoan, { currency: cur, compact: true }),
          sub:      t(`${money(r.newPayment, { currency: cur })}/mois sur ${P.amortYears} ans`, `${money(r.newPayment, { currency: cur })}/mo over ${P.amortYears} yrs`),
          accent:   'var(--pos)',
          iconName: 'bank',
        }),
        kpi({
          label:    t('Service de dette annuel max (total)', 'Max total annual debt service'),
          value:    money(r.maxTotalService, { currency: cur, compact: true }),
          sub:      t('EBITDA / DSCR cible', 'EBITDA / target DSCR'),
          iconName: 'cashflow',
        }),
        kpi({
          label:    t('DSCR actuel', 'Current DSCR'),
          value:    dscrDisplay,
          sub:      t('cible : ', 'target: ') + num(P.targetDSCR, 2) + 'x',
          accent:   r.dscrOk ? 'var(--pos)' : 'var(--neg)',
          iconName: 'scale',
        }),
      ),
      h('div', { class: 'flex', style: { marginBottom: '12px' } }, dscrChip),
      h('div', { html: barChart({
        series: [
          { color: PALETTE[1], values: [P.ebitda,          0,              0] },
          { color: PALETTE[4], values: [0, P.existingDebt, 0] },
          { color: PALETTE[2], values: [0,              0, Math.max(0, r.cushion)] },
        ],
        xLabels: [
          t('EBITDA', 'EBITDA'),
          t('Service actuel', 'Current service'),
          t('Coussin', 'Cushion'),
        ],
        stacked: false,
        height:  240,
      }) }),
      legend([
        { color: PALETTE[1], label: t('EBITDA', 'EBITDA') },
        { color: PALETTE[4], label: t('Service de dette existant', 'Existing debt service') },
        { color: PALETTE[2], label: t('Coussin disponible', 'Available cushion') },
      ]),
      h('div', { class: 'sep' }),
      statList([
        [t('EBITDA annuel', 'Annual EBITDA'),                                money(P.ebitda,              { currency: cur })],
        [t('Service de dette existant (annuel)', 'Existing annual debt service'), money(P.existingDebt,    { currency: cur })],
        [t('DSCR cible', 'Target DSCR'),                                    num(P.targetDSCR, 2) + 'x'],
        [t('Service de dette additionnel max', 'Max additional debt service'), money(r.maxAddlService,   { currency: cur }), r.maxAddlService > 0 ? 'pos' : 'neg'],
        [t('Prêt additionnel max (VA)', 'Max additional loan (PV)'),          money(r.maxLoan,            { currency: cur, compact: true }), r.maxLoan > 0 ? 'pos' : 'neg'],
        [t('Taux d\'intérêt du nouveau prêt', 'New loan interest rate'),     pct(P.rate, 2)],
        [t('Période d\'amortissement', 'Amortization period'),               `${P.amortYears} ${t('ans', 'yrs')}`],
        [t('DSCR actuel', 'Current DSCR'),                                   dscrDisplay, r.dscrOk ? 'pos' : 'neg'],
      ]),
      h('div', { class: 'sep' }),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } },
        t(
          'Les prêteurs exigent généralement un DSCR minimum de 1,20 à 1,35. Les covenants peuvent inclure un DSCR plancher, un ratio dette/EBITDA maximum et des exigences de fonds propres. Ce simulateur est illustratif — les critères varient selon le prêteur et le secteur.',
          'Lenders typically require a minimum DSCR of 1.20 to 1.35. Covenants may include a floor DSCR, maximum debt/EBITDA ratio, and equity requirements. This simulator is illustrative — criteria vary by lender and industry.'
        )),
    );
  }

  draw();

  const ctrl = card(
    t('Capacité d\'emprunt d\'entreprise', 'Business borrowing capacity'),
    { sub: t(`Ratio de couverture du service de la dette (DSCR) — EBITDA = ${ebitdaSource}; service existant ${money(F.annualDebtService, { currency: cur, compact: true })}/an et taux moyen pondéré ${pct(F.weightedRate, 2)} des dettes au dossier`, `Debt service coverage ratio (DSCR) — EBITDA = ${ebitdaSource}; existing service ${money(F.annualDebtService, { currency: cur, compact: true })}/yr and weighted rate ${pct(F.weightedRate, 2)} of the liabilities on file`) },
    h('div', { class: 'grid cols-3' },
      slider({
        label: t('EBITDA annuel', 'Annual EBITDA'),
        value: P.ebitda, min: 0, max: 5000000, step: 10000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('ebitda', v); draw(); },
      }),
      slider({
        label: t('Service de dette existant (annuel)', 'Existing annual debt service'),
        value: P.existingDebt, min: 0, max: 1000000, step: 5000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('existingDebt', v); draw(); },
      }),
      slider({
        label: t('DSCR cible', 'Target DSCR'),
        value: P.targetDSCR, min: 1.0, max: 3.0, step: 0.05,
        format: v => num(v, 2) + 'x',
        onInput: v => { setP('targetDSCR', v); draw(); },
      }),
      slider({
        label: t('Taux d\'intérêt du nouveau prêt', 'New loan interest rate'),
        value: P.rate, min: 0.02, max: 0.15, step: 0.0025,
        format: v => pct(v, 2),
        onInput: v => { setP('rate', v); draw(); },
      }),
      slider({
        label: t('Amortissement (années)', 'Amortization (years)'),
        value: P.amortYears, min: 1, max: 25, step: 1,
        format: v => `${v} ${t('ans', 'yrs')}`,
        onInput: v => { setP('amortYears', v); draw(); },
      }),
    ),
  );

  return h('div', { class: 'grid' },
    h('div', { class: 'span-full' }, ctrl),
    h('div', { class: 'span-full' }, out),
  );
}
