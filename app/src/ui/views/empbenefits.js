import { h, money, pct, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { donutChart, barChart, PALETTE } from '../charts.js';
import { caPayroll } from '../../engine/tax.js';
import { corporateTaxCA } from '../../engine/corporate.js';
import { clientFacts, whatIf, saveWhatIf } from '../../engine/facts.js';
import { store as appStore } from '../../state/store.js';

// ============================================================
// Employee Benefits & Compensation (Group Plans)
// Every rate defaults from the client file / jurisdiction:
//   salary        → primary member's employment income
//   match %       → employer match on file ÷ employment income
//   payroll %     → employer statutory cost from the payroll table
//   corp rate     → the business's small-business rate
//   marginal/avg  → primary member's derived rates
//   medical credit→ jurisdiction credit rates
// ============================================================

/** Employer statutory cost as a share of salary, from the jurisdiction's payroll table. */
function employerPayrollRate(jur, salary) {
  if (!(salary > 0)) return 0;
  if (jur.country === 'CA') return caPayroll(jur, { employmentIncome: salary }).employer / salary;
  if (jur.country === 'US') { const P = jur.payroll || {}; return (Math.min(salary, P.socialSecurity?.wageBase ?? salary) * (P.socialSecurity?.rate ?? 0) + salary * (P.medicare?.rate ?? 0)) / salary; }
  return jur.corporate?.employerNI ?? 0;
}
/** Corporate rate on a deductible expense, from the jurisdiction. */
function corpRateFor(jur, F) {
  if (jur.country === 'CA') return F.business?.sbRate ?? corporateTaxCA(jur, 0).sbRate;
  if (jur.country === 'US') return (jur.corporate?.fedCorp ?? 0) + ((jur.corporate?.stateCorp && jur.corporate.stateCorp[jur.region]) ?? 0);
  return jur.corporate?.smallRate ?? 0;
}
/** Combined credit rate applied to medical expenses (federal net of abatement + provincial). */
function medicalCreditRate(jur) {
  if (jur.country !== 'CA') return 0;
  const fed = (jur.fed.creditRate ?? jur.fed.bpaRate ?? 0) * (1 - (jur.regionData?.federalAbatement || 0));
  return fed + (jur.regionData?.creditRate ?? jur.regionData?.bpaRate ?? 0);
}

export function render({ store, client, jur }) {
  store = store || appStore;
  const cur = jur.currency;
  const isCA = jur.country === 'CA';
  const isQC = isCA && jur.region === 'QC';
  const F = clientFacts(client, jur);
  const isIncorp = !!(F.business && F.business.incorporated);
  const prim = F.primary || { employmentIncome: 0, netIncome: 0, averageRate: 0, marginal: { ordinary: 0 } };

  const salaryDefault = Math.round(prim.employmentIncome) || 75000;
  const matchDefault = F.household.employmentIncome > 0 && F.household.employerMatch > 0
    ? Math.round(F.household.employerMatch / F.household.employmentIncome * 1000) / 1000 : 0.04;
  const P = whatIf(client, 'empbenefits', {
    salary: salaryDefault,
    benefitsLoad: 0.18,
    matchPct: matchDefault,
    payrollTax: Math.round(employerPayrollRate(jur, salaryDefault) * 1000) / 1000,
    empTaxEst: Math.round(prim.averageRate * 100) / 100,
    years: 20,
    retReturn: F.assumptions.preReturn,
    medAmount: 5000,
    corpTaxRate: Math.round(corpRateFor(jur, F) * 1000) / 1000,
    margRate: Math.round(prim.marginal.ordinary * 100) / 100,
  });
  const setP = (k, v) => { P[k] = v; saveWhatIf(store, 'empbenefits', { [k]: v }); };
  // Sections share `salary` and `matchPct`; each registers its redraw so a shared
  // slider refreshes every section instead of leaving the others stale.
  const redraws = [];
  const ctx = { cur, jur, F, P, setP, isCA, isQC, isIncorp, prim, redraws, redrawAll: () => redraws.forEach(fn => fn()) };

  // ── Section 1: Total cost of an employee ──────────────────
  const empCostSection = buildEmpCostSection(ctx);

  // ── Section 2: Group retirement (RRSP/DPSP vs DC pension) ─
  const groupRetSection = buildGroupRetSection(ctx);

  // ── Section 3: Health Spending Account (CGS/HSA) ──────────
  const hsaSection = buildHSASection(ctx);

  // ── Section 4: Benefit categories info card ───────────────
  const categoriesCard = buildCategoriesCard(isCA, isQC);

  return h('div', { class: 'grid' },
    empCostSection,
    groupRetSection,
    hsaSection,
    categoriesCard,
  );
}

// ──────────────────────────────────────────────────────────────
// SECTION 1 — Total cost of an employee
// ──────────────────────────────────────────────────────────────
function buildEmpCostSection({ cur, jur, P, setP, prim, redraws, redrawAll }) {
  const box = h('div', {});

  function draw() {
    const salary = P.salary;
    const totalCost = salary * (1 + P.benefitsLoad + P.matchPct + P.payrollTax);
    const benefitsDollars  = salary * P.benefitsLoad;
    const matchDollars     = salary * P.matchPct;
    const payrollDollars   = salary * P.payrollTax;
    const takeHome         = salary * (1 - P.empTaxEst);
    const gap              = totalCost - takeHome;
    const statutory        = employerPayrollRate(jur, salary);

    const segments = [
      { label: t('Salaire de base', 'Base salary'),       value: salary,          color: PALETTE[0] },
      { label: t('Avantages sociaux', 'Benefits load'),   value: benefitsDollars, color: PALETTE[2] },
      { label: t('Cotisation retraite', 'Ret. match'),    value: matchDollars,    color: PALETTE[1] },
      { label: t('Charges patronales', 'Payroll taxes'),  value: payrollDollars,  color: PALETTE[4] },
    ];

    box.replaceChildren(
      h('div', { class: 'flex center', style: { justifyContent: 'center', marginBottom: '12px' } },
        h('div', { html: donutChart({
          segments,
          centerLabel: money(totalCost, { currency: cur, compact: true }),
          centerSub: t('coût total', 'total cost'),
        }) }),
      ),
      legend(segments.map(s => ({ color: s.color, label: s.label }))),
      h('div', { class: 'sep' }),
      statList([
        [t('Salaire de base', 'Base salary'),            money(salary, { currency: cur }),          ''],
        [t('Avantages sociaux (' + pct(P.benefitsLoad) + ')', 'Benefits load (' + pct(P.benefitsLoad) + ')'), money(benefitsDollars, { currency: cur }), 'neg'],
        [t('Cotisation retraite (' + pct(P.matchPct) + ')',   'Retirement match (' + pct(P.matchPct) + ')'),   money(matchDollars,    { currency: cur }), 'neg'],
        [t('Charges patronales (' + pct(P.payrollTax) + ')',  'Payroll taxes (' + pct(P.payrollTax) + ')'),    money(payrollDollars,  { currency: cur }), 'neg'],
        [t(`Dont charges légales à ce salaire (${jur.taxYear})`, `Of which statutory at this salary (${jur.taxYear})`), money(salary * statutory, { currency: cur }) + ' (' + pct(statutory) + ')'],
        [t('Coût total pour l’employeur', 'Total employer cost'), money(totalCost, { currency: cur }), 'neg'],
        [t('Salaire net estimé (salaire − ~' + pct(P.empTaxEst, 0) + ' impôt)', 'Est. take-home (salary − ~' + pct(P.empTaxEst, 0) + ' tax)'), money(takeHome, { currency: cur }), 'pos'],
        [t('Écart coût-employeur / revenu-net', 'Gap: employer cost vs take-home'), money(gap, { currency: cur }), ''],
      ]),
    );
  }

  redraws.push(draw);
  draw();

  return card(
    t('Coût total d’un employé', 'Total cost of an employee'),
    {
      class: 'span-full',
      sub: t(`Rémunération, avantages sociaux et charges patronales — salaire et taux moyen tirés du dossier (${money(prim.employmentIncome, { currency: cur, compact: true })}, ${pct(prim.averageRate, 0)})`, `Compensation, benefits load and payroll taxes — salary and average rate from the file (${money(prim.employmentIncome, { currency: cur, compact: true })}, ${pct(prim.averageRate, 0)})`),
    },
    h('div', { class: 'grid cols-2' },
      slider({
        label: t('Salaire de base (partagé avec le régime collectif)', 'Base salary (shared with the group plan)'),
        value: P.salary, min: 30000, max: 300000, step: 5000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('salary', v); redrawAll(); },
      }),
      slider({
        label: t('Charge avantages sociaux %', 'Benefits load %'),
        value: P.benefitsLoad, min: 0, max: 0.40, step: 0.01,
        format: v => pct(v),
        onInput: v => { setP('benefitsLoad', v); draw(); },
      }),
      slider({
        label: t('Cotisation retraite employeur %', 'Employer retirement match %'),
        value: P.matchPct, min: 0, max: 0.12, step: 0.005,
        format: v => pct(v),
        onInput: v => { setP('matchPct', v); redrawAll(); },
      }),
      slider({
        label: t('Charges patronales % (RPC/AE/RQAP + FSS/CNESST)', 'Payroll taxes % (CPP/EI/QPIP + health-tax/WCB)'),
        value: P.payrollTax, min: 0, max: 0.25, step: 0.005,
        format: v => pct(v),
        onInput: v => { setP('payrollTax', v); draw(); },
      }),
      slider({
        label: t('Taux d’impôt moyen de l’employé %', 'Employee average tax rate %'),
        value: P.empTaxEst, min: 0, max: 0.55, step: 0.01,
        format: v => pct(v),
        onInput: v => { setP('empTaxEst', v); draw(); },
      }),
    ),
    box,
  );
}

// ──────────────────────────────────────────────────────────────
// SECTION 2 — Group retirement: RRSP+DPSP vs DC pension
// ──────────────────────────────────────────────────────────────
function buildGroupRetSection({ cur, P, setP, isCA, redraws, redrawAll }) {
  const retBox = h('div', {});

  function drawRet() {
    const annualMatch    = P.salary * P.matchPct;
    const futureValue    = fv(P.retReturn, P.years, annualMatch);
    const vestingNote    = isCA
      ? t('Droits acquis typiques : immédiat pour le REER collectif; 2 ans pour le RPDB (règle fiscale).', 'Typical vesting: immediate for group RRSP; 2 years for DPSP (tax rule).')
      : t('Les droits d’acquisition varient selon le régime. Vérifiez le calendrier d’acquisition.', 'Vesting schedules vary by plan. Confirm the vesting schedule.');

    const xLabels = [];
    const rrspVals = [];
    const dcVals   = [];
    for (let y = 1; y <= Math.min(P.years, 30); y++) {
      xLabels.push(y);
      rrspVals.push(Math.round(fv(P.retReturn, y, annualMatch)));
      dcVals.push(Math.round(fv(P.retReturn * 0.97, y, annualMatch)));
    }

    retBox.replaceChildren(
      h('div', { html: barChart({
        xLabels,
        series: [
          { color: PALETTE[0], values: rrspVals },
          { color: PALETTE[1], values: dcVals },
        ],
      }) }),
      legend([
        { color: PALETTE[0], label: t('REER collectif + RPDB', 'Group RRSP + DPSP') },
        { color: PALETTE[1], label: t('RPA à cotisations déterminées (RPA/CD)', 'DC Pension Plan (RPP/DC)') },
      ]),
      h('div', { class: 'sep' }),
      statList([
        [t('Salaire de référence', 'Reference salary'),                   money(P.salary, { currency: cur })],
        [t('Cotisation annuelle de l’employeur', 'Annual employer contribution'), money(annualMatch, { currency: cur })],
        [t('Valeur projetée (' + P.years + ' ans, ' + pct(P.retReturn) + ')', 'Projected value (' + P.years + ' yrs, ' + pct(P.retReturn) + ')'), money(futureValue, { currency: cur, compact: true }), 'pos'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '10px' } }, vestingNote),
    );
  }

  redraws.push(drawRet);
  drawRet();

  const prosConsCA = h('div', { class: 'grid cols-2', style: { marginTop: '12px' } },
    h('div', {},
      h('b', {}, t('REER collectif + RPDB', 'Group RRSP + DPSP')),
      h('ul', { class: 'tiny muted', style: { margin: '6px 0 0 16px', lineHeight: '1.6' } },
        h('li', {}, t('Souplesse de placement pour les participants', 'Investment flexibility for participants')),
        h('li', {}, t('Droits REER immédiats; portabilité facile', 'Immediate RRSP room; easy portability')),
        h('li', {}, t('RPDB : cotisations patronales déductibles, imposées à la sortie', 'DPSP: deductible employer contributions, taxed on withdrawal')),
        h('li', {}, t('Administration plus légère qu’un RPA', 'Lighter administration than an RPP')),
      ),
    ),
    h('div', {},
      h('b', {}, t('RPA à cotisations déterminées', 'DC Pension Plan (RPP)')),
      h('ul', { class: 'tiny muted', style: { margin: '6px 0 0 16px', lineHeight: '1.6' } },
        h('li', {}, t('Encadrement réglementaire (lois sur les pensions)', 'Regulatory framework (pension legislation)')),
        h('li', {}, t('Plafond de cotisation pouvant dépasser le REER collectif', 'Contribution limit may exceed group RRSP')),
        h('li', {}, t('Droits d’acquisition possibles (protection accrue)', 'Vesting may apply (greater protection)')),
        h('li', {}, t('Gestion plus complexe, surveillance requise', 'More complex to administer, oversight required')),
      ),
    ),
  );

  return card(
    t('Régime de retraite collectif', 'Group Retirement Plan'),
    {
      class: 'span-full',
      sub: isCA
        ? t('REER collectif + RPDB vs RPA à cotisations déterminées', 'Group RRSP + DPSP vs DC Pension Plan (RPP)')
        : t('Régimes collectifs d’épargne-retraite', 'Group retirement savings plans'),
    },
    h('div', { class: 'grid cols-2' },
      slider({
        label: t('Salaire de référence (partagé)', 'Reference salary (shared)'),
        value: P.salary, min: 30000, max: 300000, step: 5000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('salary', v); redrawAll(); },
      }),
      slider({
        label: t('Cotisation employeur %', 'Employer match %'),
        value: P.matchPct, min: 0, max: 0.12, step: 0.005,
        format: v => pct(v),
        onInput: v => { setP('matchPct', v); redrawAll(); },
      }),
      slider({
        label: t('Horizon (ans)', 'Horizon (yrs)'),
        value: P.years, min: 1, max: 35, step: 1,
        format: v => String(v),
        onInput: v => { setP('years', v); drawRet(); },
      }),
      slider({
        label: t('Rendement annuel (hypothèse du dossier)', 'Annual return (file assumption)'),
        value: P.retReturn, min: 0.02, max: 0.10, step: 0.005,
        format: v => pct(v),
        onInput: v => { setP('retReturn', v); drawRet(); },
      }),
    ),
    retBox,
    prosConsCA,
  );
}

// ──────────────────────────────────────────────────────────────
// SECTION 3 — CGS / HSA (Health Spending Account)
// ──────────────────────────────────────────────────────────────
function buildHSASection({ cur, jur, F, P, setP, isCA, isQC, isIncorp, prim }) {
  const hsaBox = h('div', {});
  const creditRate = medicalCreditRate(jur);

  function drawHSA() {
    const corpDeduction   = P.medAmount * P.corpTaxRate;
    // Personal medical credit: expenses above 3 % of net income, at the combined credit rate
    const medT            = jur.fed && jur.fed.medicalThreshold;
    const threshold       = isCA ? Math.min((medT ? medT.rate : 0.03) * Math.max(0, prim.netIncome || 0), medT && medT.cap ? medT.cap : Infinity) : 0;
    const eligible        = Math.max(0, P.medAmount - threshold);
    const personalCredit  = eligible * creditRate;
    const saving          = isIncorp ? corpDeduction : personalCredit;
    const altLabel        = isIncorp
      ? t('Déduction corporative (CGS)', 'Corporate deduction (HSA)')
      : t('Crédit médical personnel estimé', 'Estimated personal medical credit');
    const qcNote = isQC
      ? t('Au Québec, la CGS constitue un avantage imposable au provincial pour l’employé. L’économie nette est réduite en conséquence.', 'In Quebec, the HSA is a taxable benefit provincially for the employee. The net saving is reduced accordingly.')
      : '';

    hsaBox.replaceChildren(
      statList([
        [t('Dépenses médicales', 'Medical expenses'),      money(P.medAmount,    { currency: cur })],
        [altLabel,                                          money(saving,       { currency: cur }), 'pos'],
        [t('Taux d’impôt corporatif utilisé', 'Corporate tax rate used'),  pct(P.corpTaxRate)],
        [t('Taux marginal personnel', 'Personal marginal rate'),       pct(P.margRate)],
        isCA ? [t(`Crédit médical personnel (seuil : le moindre de ${pct(medT ? medT.rate : 0.03, 0)} du revenu net et ${money(medT && medT.cap ? medT.cap : 0, { currency: cur })} → ${money(threshold, { currency: cur })}, taux ${pct(creditRate)})`, `Personal medical credit (threshold: lesser of ${pct(medT ? medT.rate : 0.03, 0)} of net income and ${money(medT && medT.cap ? medT.cap : 0, { currency: cur })} → ${money(threshold, { currency: cur })}, rate ${pct(creditRate)})`), money(personalCredit, { currency: cur })] : null,
        [
          t('Économie nette vs crédit personnel (env.)', 'Net saving vs personal credit (approx.)'),
          money(isIncorp ? (corpDeduction - personalCredit) : 0, { currency: cur }),
          isIncorp ? 'pos' : '',
        ],
      ].filter(Boolean)),
      qcNote ? h('p', { class: 'tiny muted', style: { marginTop: '10px', color: 'var(--warn)' } }, qcNote) : null,
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } },
        isCA
          ? t('La CGS (CRA IT-339R2) permet à la société incorporée de déduire 100 % des frais médicaux éligibles comme dépense d’entreprise. Le montant est exonéré d’impôt pour l’employé (sauf avantage provincial au Québec). Avantage clé pour les propriétaires-dirigeants incorporés.', 'The HSA (CRA IT-339R2) allows an incorporated company to deduct 100 % of eligible medical costs as a business expense. The amount is tax-free to the employee (except QC provincial taxable benefit). Key benefit for incorporated owner-managers.')
          : t('Un compte santé (FSA/HSA selon le pays) permet à l’employeur de déduire les dépenses médicales et à l’employé de les recevoir en franchise d’impôt, selon les règles locales.', 'A health spending account (FSA/HSA depending on jurisdiction) lets the employer deduct medical costs and the employee receive them tax-free, subject to local rules.'),
      ),
    );
  }

  drawHSA();

  const hsaTitle = isCA
    ? t('Compte de gestion santé (CGS) / Health Spending Account', 'Health Spending Account (HSA) / CGS')
    : t('Compte santé collectif (FSA/HSA)', 'Group Health Spending Account (FSA/HSA)');

  return card(
    hsaTitle,
    {
      class: 'span-full',
      sub: isCA
        ? t(`Déduction corporative 100 % — exonéré pour l’employé (hors Québec) · ${isIncorp ? 'société incorporée au dossier' : 'aucune société incorporée au dossier'}`, `100 % corporate deduction — tax-free to employee (outside QC) · ${isIncorp ? 'incorporated business on file' : 'no incorporated business on file'}`)
        : t('Remboursement des dépenses médicales par l’employeur', 'Employer reimbursement of medical expenses'),
    },
    h('div', { class: 'grid cols-3' },
      slider({
        label: t('Dépenses médicales annuelles', 'Annual medical expenses'),
        value: P.medAmount, min: 500, max: 50000, step: 500,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { setP('medAmount', v); drawHSA(); },
      }),
      slider({
        label: t('Taux d’impôt corporatif (PME du dossier)', 'Corporate tax rate (file small-business rate)'),
        value: P.corpTaxRate, min: 0.09, max: 0.30, step: 0.005,
        format: v => pct(v),
        onInput: v => { setP('corpTaxRate', v); drawHSA(); },
      }),
      slider({
        label: t('Taux marginal personnel (dérivé)', 'Personal marginal rate (derived)'),
        value: P.margRate, min: 0.20, max: 0.55, step: 0.01,
        format: v => pct(v),
        onInput: v => { setP('margRate', v); drawHSA(); },
      }),
    ),
    hsaBox,
  );
}

// ──────────────────────────────────────────────────────────────
// SECTION 4 — Benefit categories info card
// ──────────────────────────────────────────────────────────────
function buildCategoriesCard(isCA, isQC) {
  const benefits = [
    {
      name: t('Soins médicaux et paramédicaux', 'Medical & paramedical'),
      desc: t('Médicaments sur ordonnance, physiothérapie, psychologie, etc.', 'Prescription drugs, physiotherapy, psychology, etc.'),
      tax:  t('Non imposable pour l’employé (federal + prov. sauf QC)', 'Non-taxable to employee (federal + prov. except QC)'),
      taxCA: true,
    },
    {
      name: t('Soins dentaires', 'Dental'),
      desc: t('Soins préventifs, restauration, orthodontie (selon le régime).', 'Preventive, restorative, orthodontics (plan-dependent).'),
      tax:  t('Non imposable pour l’employé (federal + prov. sauf QC)', 'Non-taxable to employee (federal + prov. except QC)'),
      taxCA: true,
    },
    {
      name: t('Vision', 'Vision'),
      desc: t('Lunettes, lentilles, examen de la vue.', 'Eyeglasses, contact lenses, eye exam.'),
      tax:  t('Non imposable pour l’employé', 'Non-taxable to employee'),
      taxCA: true,
    },
    {
      name: t('Vie collective (assurance-vie)', 'Group life insurance'),
      desc: t('Capital-décès versé aux bénéficiaires. La prime payée par l’employeur est un avantage imposable.', 'Death benefit paid to beneficiaries. Employer-paid premium is a taxable benefit.'),
      tax:  t('Prime imposable pour l’employé; capital-décès libre d’impôt au bénéficiaire', 'Premium is a taxable benefit; death benefit is tax-free to beneficiary'),
      taxCA: false,
    },
    {
      name: t('Décès et mutilation accidentels (DMA)', 'Accidental death & dismemberment (AD&D)'),
      desc: t('Indemnité supplémentaire en cas d’accident. Prime souvent minime.', 'Additional benefit in case of accident. Premium usually minimal.'),
      tax:  t('Prime imposable; prestation libre d’impôt', 'Premium taxable; benefit tax-free'),
      taxCA: false,
    },
    {
      name: t('Invalidité courte durée (ICD)', 'Short-term disability (STD)'),
      desc: t('Remplacement de revenu pendant les 17 à 26 premières semaines.', 'Income replacement for the first 17 to 26 weeks.'),
      tax:  t('Prestations imposables si la prime est payée par l’employeur', 'Benefits taxable if employer pays the premium'),
      taxCA: false,
    },
    {
      name: t('Invalidité longue durée (ILD)', 'Long-term disability (LTD)'),
      desc: t('Remplacement de revenu au-delà des 26 premières semaines, souvent jusqu’à 65 ans.', 'Income replacement beyond 26 weeks, often to age 65.'),
      tax:  t('Prestations imposables si la prime est payée par l’employeur', 'Benefits taxable if employer pays the premium'),
      taxCA: false,
    },
    {
      name: t('Programme d’aide aux employés (PAE)', 'Employee Assistance Program (EAP)'),
      desc: t('Soutien confidentiel en santé mentale, juridique et financier.', 'Confidential mental health, legal, and financial support.'),
      tax:  t('Généralement non imposable', 'Generally non-taxable'),
      taxCA: true,
    },
    {
      name: t('Maladies graves (assurance collective)', 'Critical illness (group)'),
      desc: t('Somme forfaitaire au diagnostic d’une maladie grave admissible.', 'Lump sum on diagnosis of a covered critical illness.'),
      tax:  t('Prime imposable si payée par l’employeur; prestation libre d’impôt', 'Premium taxable if employer-paid; benefit tax-free'),
      taxCA: false,
    },
  ];

  const qcWarning = isQC
    ? h('p', { class: 'tiny muted', style: { marginTop: '10px', color: 'var(--warn)' } },
        t('Au Québec, la plupart des avantages payés par l’employeur (soins médicaux, dentaires, etc.) constituent un avantage imposable au provincial en vertu de la Loi sur les impôts du Québec. Planifiez en conséquence.', 'In Quebec, most employer-paid benefits (medical, dental, etc.) are a taxable benefit provincially under the Quebec Taxation Act. Plan accordingly.'),
      )
    : null;

  return card(
    t('Catégories d’avantages sociaux collectifs', 'Group Benefit Categories'),
    {
      class: 'span-full',
      sub: t('Traitement fiscal et description sommaire de chaque composante', 'Tax treatment and brief description of each component'),
    },
    h('div', { class: 'grid cols-2' },
      ...benefits.map(b =>
        h('div', {
          style: {
            padding: '10px 0',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
          },
        },
          h('span', { class: 'chip ' + (b.taxCA ? 'pos' : 'info'), style: { flexShrink: '0' }, html: icon('check', 13) }),
          h('div', {},
            h('b', {}, b.name),
            h('div', { class: 'tiny muted' }, b.desc),
            h('div', { class: 'tiny', style: { marginTop: '3px', color: 'var(--text-2)' } },
              h('span', { html: icon('tax', 12) }),
              ' ',
              b.tax,
            ),
          ),
        ),
      ),
    ),
    qcWarning,
  );
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

/** Future value of a regular end-of-year annuity. */
function fv(rate, nper, pmt) {
  if (rate === 0) return pmt * nper;
  return pmt * ((Math.pow(1 + rate, nper) - 1) / rate);
}
