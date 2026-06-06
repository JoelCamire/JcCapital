// ============================================================
// RS&DE / SR&ED Tax Credit Calculator
// ============================================================
import { h, money, pct, num, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, PALETTE } from '../charts.js';

// Provincial credit rates (illustrative)
const PROV_RATES = {
  QC: { label: 'QC', rate: 0.14, onSalaries: true },
  ON: { label: 'ON', rate: 0.08, onSalaries: false },
  BC: { label: 'BC', rate: 0.10, onSalaries: false },
  AB: { label: 'AB', rate: 0.08, onSalaries: false },
  SK: { label: 'SK', rate: 0, onSalaries: false },
  MB: { label: 'MB', rate: 0, onSalaries: false },
  NS: { label: 'NS', rate: 0, onSalaries: false },
  NB: { label: 'NB', rate: 0, onSalaries: false },
  PE: { label: 'PE', rate: 0, onSalaries: false },
  NL: { label: 'NL', rate: 0, onSalaries: false },
};

export function render({ client, jur }) {
  const cur = jur.currency;

  const p = {
    salaries: 150000,
    contractors: 80000,
    materials: 40000,
    isCCPC: true,
    useProxy: false,
    province: 'QC',
  };

  const out = h('div', {});

  function compute() {
    const salaries = p.salaries;
    const contractors = p.contractors;
    const materials = p.materials;

    const eligibleContractors = contractors * 0.8;
    const proxyOverhead = p.useProxy ? salaries * 0.55 : 0;
    const pool = salaries + eligibleContractors + materials + proxyOverhead;

    // Federal ITC
    const fedRate = p.isCCPC ? 0.35 : 0.15;
    const fedBase = p.isCCPC ? Math.min(pool, 3000000) : pool;
    const fedCredit = fedBase * fedRate;

    // Provincial credit
    const prov = PROV_RATES[p.province] || { rate: 0, onSalaries: false };
    const provBase = prov.onSalaries ? salaries : pool;
    const provCredit = provBase * prov.rate;

    const totalCredit = fedCredit + provCredit;
    const grossCost = pool;
    const netCost = Math.max(0, grossCost - totalCredit);
    const subsidyRate = grossCost > 0 ? totalCredit / grossCost : 0;

    return { fedCredit, provCredit, totalCredit, grossCost, netCost, subsidyRate, pool };
  }

  function draw() {
    const r = compute();

    out.replaceChildren(
      h('div', { class: 'grid cols-4', style: { marginBottom: '12px' } },
        kpi({
          label: t('Crédit fédéral (CIRT)', 'Federal ITC'),
          value: money(r.fedCredit, { currency: cur, compact: true }),
          sub: p.isCCPC ? t('35 % remboursable (SPCC)', '35 % refundable (CCPC)') : t('15 % non remboursable', '15 % non-refundable'),
          accent: 'var(--pos)',
          iconName: 'tax',
        }),
        kpi({
          label: t('Crédit provincial', 'Provincial credit'),
          value: money(r.provCredit, { currency: cur, compact: true }),
          sub: `${p.province} ${pct(PROV_RATES[p.province]?.rate ?? 0)}`,
          accent: 'var(--pos)',
          iconName: 'gov',
        }),
        kpi({
          label: t('Crédit total', 'Total credit'),
          value: money(r.totalCredit, { currency: cur, compact: true }),
          accent: 'var(--pos)',
          iconName: 'briefcase',
        }),
        kpi({
          label: t('Coût net de la R&D', 'Net R&D cost'),
          value: money(r.netCost, { currency: cur, compact: true }),
          sub: t('après crédits', 'after credits'),
          accent: 'var(--neg)',
          iconName: 'scale',
        }),
      ),
      h('div', { html: barChart({
        series: [
          { color: PALETTE[4], values: [r.grossCost, 0] },
          { color: PALETTE[0], values: [0, r.netCost] },
        ],
        xLabels: [t('Coût brut', 'Gross cost'), t('Coût net', 'Net cost')],
        stacked: false,
        height: 220,
      }) }),
      legend([
        { color: PALETTE[4], label: t('Coût brut R&D', 'Gross R&D cost') },
        { color: PALETTE[0], label: t('Coût net après crédits', 'Net cost after credits') },
      ]),
      h('div', { class: 'sep' }),
      statList([
        [t('Salaires admissibles R&D', 'Eligible R&D salaries'), money(p.salaries, { currency: cur })],
        [t('Sous-traitants (× 80 %)', 'Contractors (× 80 %)'), money(p.contractors * 0.8, { currency: cur })],
        [t('Matériaux R&D', 'R&D materials'), money(p.materials, { currency: cur })],
        [t('Frais généraux proxy (55 % salaires)', 'Proxy overhead (55 % of salaries)'), p.useProxy ? money(p.salaries * 0.55, { currency: cur }) : '—'],
        [t('Bassin de dépenses admissibles', 'Qualified SR&ED expenditure pool'), money(r.pool, { currency: cur })],
        [t('Taux de subvention effectif', 'Effective subsidy rate'), pct(r.subsidyRate), 'pos'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } },
        t(
          'Illustratif seulement. Le crédit fédéral de 35 % est remboursable pour les SPCC sur les premiers 3 M$ de dépenses admissibles; le crédit de 15 % pour les autres sociétés est non remboursable. Les taux provinciaux sont approximatifs. Consultez un fiscaliste pour votre situation.',
          'Illustrative only. The 35 % federal rate is refundable for CCPCs on the first $3 M of qualified expenditures; the 15 % rate for other corporations is non-refundable. Provincial rates are approximate. Consult a tax professional for your situation.'
        )),
    );
  }

  draw();

  // Province selector buttons (compact)
  const provKeys = Object.keys(PROV_RATES);
  const provBtns = provKeys.map(k => {
    const btn = h('button', {
      class: 'btn sm ' + (p.province === k ? 'primary' : 'ghost'),
      onClick: () => {
        p.province = k;
        provBtns.forEach((b, i) => { b.className = 'btn sm ' + (provKeys[i] === k ? 'primary' : 'ghost'); });
        draw();
      },
    }, k);
    return btn;
  });

  // CCPC toggle
  const ccpcBtn = h('button', {
    class: 'btn sm ' + (p.isCCPC ? 'primary' : 'ghost'),
    onClick: () => {
      p.isCCPC = !p.isCCPC;
      ccpcBtn.className = 'btn sm ' + (p.isCCPC ? 'primary' : 'ghost');
      draw();
    },
  }, t('SPCC / CCPC', 'CCPC'));

  // Proxy overhead toggle
  const proxyBtn = h('button', {
    class: 'btn sm ' + (p.useProxy ? 'primary' : 'ghost'),
    onClick: () => {
      p.useProxy = !p.useProxy;
      proxyBtn.className = 'btn sm ' + (p.useProxy ? 'primary' : 'ghost');
      draw();
    },
  }, t('Proxy 55 %', 'Proxy 55 %'));

  const ctrl = card(
    t('Crédit RS&DE — Recherche scientifique et développement expérimental', 'SR&ED — Scientific Research & Experimental Development'),
    { sub: t('Simulateur de crédit d\'impôt à la R&D (Canada)', 'Canadian R&D tax credit simulator') },
    h('div', { class: 'grid cols-3' },
      slider({
        label: t('Salaires R&D admissibles', 'Eligible R&D salaries'),
        value: p.salaries, min: 0, max: 2000000, step: 5000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { p.salaries = v; draw(); },
      }),
      slider({
        label: t('Coûts de sous-traitance R&D', 'R&D contractor costs'),
        value: p.contractors, min: 0, max: 1000000, step: 5000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { p.contractors = v; draw(); },
      }),
      slider({
        label: t('Matériaux R&D', 'R&D materials'),
        value: p.materials, min: 0, max: 500000, step: 2500,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { p.materials = v; draw(); },
      }),
    ),
    h('div', { class: 'inline', style: { gap: '6px', marginTop: '10px', marginBottom: '8px', flexWrap: 'wrap' } },
      h('span', { class: 'muted tiny' }, t('Société :', 'Entity:')),
      ccpcBtn,
      h('span', { class: 'muted tiny', style: { marginLeft: '10px' } }, t('Frais généraux :', 'Overhead:')),
      proxyBtn,
      h('span', { class: 'muted tiny', style: { marginLeft: '10px' } }, t('Province :', 'Province:')),
      ...provBtns,
    ),
  );

  return h('div', { class: 'grid' },
    h('div', { class: 'span-full' }, ctrl),
    h('div', { class: 'span-full' }, out),
  );
}
