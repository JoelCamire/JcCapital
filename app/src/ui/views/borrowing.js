// ============================================================
// Capacité d'emprunt d'entreprise / Business borrowing capacity
// ============================================================
import { h, money, pct, num, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, PALETTE } from '../charts.js';

// PV of an annuity: PMT * [1 - (1+r)^-n] / r
function pvAnnuity(pmt, r, n) {
  if (n <= 0 || pmt <= 0) return 0;
  if (r === 0) return pmt * n;
  return pmt * (1 - Math.pow(1 + r, -n)) / r;
}

export function render({ store, client, jur }) {
  const cur = jur.currency;

  // Default EBITDA from client business data
  const defaultEbitda = (() => {
    const biz = client.business || {};
    const val = biz.ebitda || biz.activeIncome || 0;
    if (val > 0) return Math.round(val);
    // Fall back to income
    const inc = (client.incomes || []).reduce((s, i) => s + (i.amount || 0), 0);
    return Math.round(inc) || 300000;
  })();

  const p = {
    ebitda:        defaultEbitda,
    existingDebt:  40000,
    targetDSCR:    1.25,
    rate:          0.065,
    amortYears:    10,
  };

  const out = h('div', {});

  function compute() {
    const maxTotalService  = p.ebitda / (p.targetDSCR > 0 ? p.targetDSCR : 1.25);
    const maxAddlService   = Math.max(0, maxTotalService - p.existingDebt);
    const maxLoan          = pvAnnuity(maxAddlService, p.rate, p.amortYears);
    const currentDSCR      = p.existingDebt > 0 ? p.ebitda / p.existingDebt : Infinity;
    const dscrOk           = currentDSCR >= p.targetDSCR;
    const cushion          = p.ebitda - p.existingDebt * p.targetDSCR;

    return { maxTotalService, maxAddlService, maxLoan, currentDSCR, dscrOk, cushion };
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
          sub:      t('cible : ', 'target: ') + num(p.targetDSCR, 2) + 'x',
          accent:   r.dscrOk ? 'var(--pos)' : 'var(--neg)',
          iconName: 'scale',
        }),
      ),
      h('div', { class: 'flex', style: { marginBottom: '12px' } }, dscrChip),
      h('div', { html: barChart({
        series: [
          { color: PALETTE[1], values: [p.ebitda,          0,              0] },
          { color: PALETTE[4], values: [0, p.existingDebt, 0] },
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
        [t('EBITDA annuel', 'Annual EBITDA'),                                money(p.ebitda,              { currency: cur })],
        [t('Service de dette existant (annuel)', 'Existing annual debt service'), money(p.existingDebt,    { currency: cur })],
        [t('DSCR cible', 'Target DSCR'),                                    num(p.targetDSCR, 2) + 'x'],
        [t('Service de dette additionnel max', 'Max additional debt service'), money(r.maxAddlService,   { currency: cur }), r.maxAddlService > 0 ? 'pos' : 'neg'],
        [t('Prêt additionnel max (VA)', 'Max additional loan (PV)'),          money(r.maxLoan,            { currency: cur, compact: true }), r.maxLoan > 0 ? 'pos' : 'neg'],
        [t('Taux d\'amortissement', 'Amortization rate'),                    pct(p.rate, 2)],
        [t('Période d\'amortissement', 'Amortization period'),               `${p.amortYears} ${t('ans', 'yrs')}`],
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
    { sub: t('Ratio de couverture du service de la dette (DSCR)', 'Debt service coverage ratio (DSCR)') },
    h('div', { class: 'grid cols-3' },
      slider({
        label: t('EBITDA annuel', 'Annual EBITDA'),
        value: p.ebitda, min: 0, max: 5000000, step: 10000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { p.ebitda = v; draw(); },
      }),
      slider({
        label: t('Service de dette existant (annuel)', 'Existing annual debt service'),
        value: p.existingDebt, min: 0, max: 1000000, step: 5000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { p.existingDebt = v; draw(); },
      }),
      slider({
        label: t('DSCR cible', 'Target DSCR'),
        value: p.targetDSCR, min: 1.0, max: 3.0, step: 0.05,
        format: v => num(v, 2) + 'x',
        onInput: v => { p.targetDSCR = v; draw(); },
      }),
      slider({
        label: t('Taux d\'intérêt', 'Interest rate'),
        value: p.rate, min: 0.02, max: 0.15, step: 0.0025,
        format: v => pct(v, 2),
        onInput: v => { p.rate = v; draw(); },
      }),
      slider({
        label: t('Amortissement (années)', 'Amortization (years)'),
        value: p.amortYears, min: 1, max: 25, step: 1,
        format: v => `${v} ${t('ans', 'yrs')}`,
        onInput: v => { p.amortYears = v; draw(); },
      }),
    ),
  );

  return h('div', { class: 'grid' },
    h('div', { class: 'span-full' }, ctrl),
    h('div', { class: 'span-full' }, out),
  );
}
