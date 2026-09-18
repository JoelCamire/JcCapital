// ============================================================
// RS&DE / SR&ED Tax Credit Calculator
// Province = the file's jurisdiction (read-only); CCPC status from
// the business on file; inputs persisted as what-ifs.
// ============================================================
import { h, money, pct, num, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, PALETTE } from '../charts.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';
import { store as appStore } from '../../state/store.js';

// SR&ED PROGRAM RATES (federal ITC + provincial R&D credits). These are
// program parameters of the SR&ED regime, NOT income-tax parameters, and are
// therefore kept here rather than in src/jurisdictions. Verify yearly.
const SRED_FEDERAL = { ccpcRate: 0.35, ccpcCap: 3000000, generalRate: 0.15, contractorEligible: 0.80, proxyOverhead: 0.55 };
const SRED_PROV_RATES = {
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

export function render({ store, client, jur }) {
  store = store || appStore;
  const cur = jur.currency;
  const isCA = jur.country === 'CA';
  const F = clientFacts(client, jur);
  const province = isCA ? jur.region : null;
  const prov = (province && SRED_PROV_RATES[province]) || { label: province || '—', rate: 0, onSalaries: false };

  const P = whatIf(client, 'sred', {
    salaries: 150000, contractors: 80000, materials: 40000,
    isCCPC: F.business ? !!F.business.incorporated : true,
    useProxy: false,
  });
  const setP = (k, v) => { P[k] = v; saveWhatIf(store, 'sred', { [k]: v }); };

  const out = h('div', {});

  function compute() {
    const salaries = P.salaries;
    const contractors = P.contractors;
    const materials = P.materials;

    const eligibleContractors = contractors * SRED_FEDERAL.contractorEligible;
    const proxyOverhead = P.useProxy ? salaries * SRED_FEDERAL.proxyOverhead : 0;
    const pool = salaries + eligibleContractors + materials + proxyOverhead;

    // Federal ITC
    const fedRate = P.isCCPC ? SRED_FEDERAL.ccpcRate : SRED_FEDERAL.generalRate;
    const fedBase = P.isCCPC ? Math.min(pool, SRED_FEDERAL.ccpcCap) : pool;
    const fedCredit = fedBase * fedRate;

    // Provincial credit
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
          sub: P.isCCPC ? t(`${pct(SRED_FEDERAL.ccpcRate, 0)} remboursable (SPCC)`, `${pct(SRED_FEDERAL.ccpcRate, 0)} refundable (CCPC)`) : t(`${pct(SRED_FEDERAL.generalRate, 0)} non remboursable`, `${pct(SRED_FEDERAL.generalRate, 0)} non-refundable`),
          accent: 'var(--pos)',
          iconName: 'tax',
        }),
        kpi({
          label: t('Crédit provincial', 'Provincial credit'),
          value: money(r.provCredit, { currency: cur, compact: true }),
          sub: `${prov.label} ${pct(prov.rate)}`,
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
        [t('Salaires admissibles R&D', 'Eligible R&D salaries'), money(P.salaries, { currency: cur })],
        [t(`Sous-traitants (× ${pct(SRED_FEDERAL.contractorEligible, 0)})`, `Contractors (× ${pct(SRED_FEDERAL.contractorEligible, 0)})`), money(P.contractors * SRED_FEDERAL.contractorEligible, { currency: cur })],
        [t('Matériaux R&D', 'R&D materials'), money(P.materials, { currency: cur })],
        [t(`Frais généraux proxy (${pct(SRED_FEDERAL.proxyOverhead, 0)} salaires)`, `Proxy overhead (${pct(SRED_FEDERAL.proxyOverhead, 0)} of salaries)`), P.useProxy ? money(P.salaries * SRED_FEDERAL.proxyOverhead, { currency: cur }) : '—'],
        [t('Bassin de dépenses admissibles', 'Qualified SR&ED expenditure pool'), money(r.pool, { currency: cur })],
        [t('Taux de subvention effectif', 'Effective subsidy rate'), pct(r.subsidyRate), 'pos'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } },
        t(
          `Illustratif seulement. Taux du programme RS&DE (et non des barèmes d’impôt) : le crédit fédéral de ${pct(SRED_FEDERAL.ccpcRate, 0)} est remboursable pour les SPCC sur les premiers ${money(SRED_FEDERAL.ccpcCap, { currency: cur, compact: true })} de dépenses admissibles; le crédit de ${pct(SRED_FEDERAL.generalRate, 0)} pour les autres sociétés est non remboursable. Les taux provinciaux sont approximatifs. Consultez un fiscaliste pour votre situation.`,
          `Illustrative only. SR&ED program rates (not income-tax tables): the ${pct(SRED_FEDERAL.ccpcRate, 0)} federal rate is refundable for CCPCs on the first ${money(SRED_FEDERAL.ccpcCap, { currency: cur, compact: true })} of qualified expenditures; the ${pct(SRED_FEDERAL.generalRate, 0)} rate for other corporations is non-refundable. Provincial rates are approximate. Consult a tax professional for your situation.`
        )),
    );
  }

  draw();

  // CCPC toggle (default from the business on file)
  const ccpcBtn = h('button', {
    class: 'btn sm ' + (P.isCCPC ? 'primary' : 'ghost'),
    onClick: () => {
      setP('isCCPC', !P.isCCPC);
      ccpcBtn.className = 'btn sm ' + (P.isCCPC ? 'primary' : 'ghost');
      draw();
    },
  }, t('SPCC / CCPC', 'CCPC'));

  // Proxy overhead toggle
  const proxyBtn = h('button', {
    class: 'btn sm ' + (P.useProxy ? 'primary' : 'ghost'),
    onClick: () => {
      setP('useProxy', !P.useProxy);
      proxyBtn.className = 'btn sm ' + (P.useProxy ? 'primary' : 'ghost');
      draw();
    },
  }, t(`Proxy ${pct(SRED_FEDERAL.proxyOverhead, 0)}`, `Proxy ${pct(SRED_FEDERAL.proxyOverhead, 0)}`));

  const ctrl = card(
    t('Crédit RS&DE — Recherche scientifique et développement expérimental', 'SR&ED — Scientific Research & Experimental Development'),
    { sub: t('Simulateur de crédit d\'impôt à la R&D (Canada) — taux du programme RS&DE', 'Canadian R&D tax credit simulator — SR&ED program rates'),
      right: isCA ? null : h('span', { class: 'chip warn' }, t('Programme canadien', 'Canadian program')) },
    h('div', { class: 'grid cols-3' },
      slider({
        label: t('Salaires R&D admissibles', 'Eligible R&D salaries'),
        value: P.salaries, min: 0, max: 2000000, step: 5000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('salaries', v); draw(); },
      }),
      slider({
        label: t('Coûts de sous-traitance R&D', 'R&D contractor costs'),
        value: P.contractors, min: 0, max: 1000000, step: 5000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('contractors', v); draw(); },
      }),
      slider({
        label: t('Matériaux R&D', 'R&D materials'),
        value: P.materials, min: 0, max: 500000, step: 2500,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('materials', v); draw(); },
      }),
    ),
    h('div', { class: 'inline', style: { gap: '6px', marginTop: '10px', marginBottom: '8px', flexWrap: 'wrap' } },
      h('span', { class: 'muted tiny' }, t('Société :', 'Entity:')),
      ccpcBtn,
      F.business ? h('span', { class: 'muted tiny' }, t(`(${F.business.incorporated ? 'incorporée' : 'non incorporée'} au dossier)`, `(${F.business.incorporated ? 'incorporated' : 'unincorporated'} on file)`)) : null,
      h('span', { class: 'muted tiny', style: { marginLeft: '10px' } }, t('Frais généraux :', 'Overhead:')),
      proxyBtn,
      h('span', { class: 'muted tiny', style: { marginLeft: '10px' } }, t('Province (juridiction du dossier) :', 'Province (file jurisdiction):')),
      h('span', { class: 'chip info' }, `${jur.flagRegion || ''} ${prov.label} · ${pct(prov.rate)}${prov.onSalaries ? t(' sur salaires', ' on salaries') : ''}`),
    ),
  );

  return h('div', { class: 'grid' },
    h('div', { class: 'span-full' }, ctrl),
    h('div', { class: 'span-full' }, out),
  );
}
