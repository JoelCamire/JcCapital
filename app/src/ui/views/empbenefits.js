import { h, money, pct, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { donutChart, barChart, PALETTE } from '../charts.js';

// ============================================================
// Employee Benefits & Compensation (Group Plans)
// ============================================================

export function render({ client, jur }) {
  const cur = jur.currency;
  const isCA = jur.country === 'CA';
  const isQC = isCA && (client.jurisdiction && client.jurisdiction.province === 'QC');
  const isIncorp = client.business && client.business.structure === 'incorporated';

  // ── Section 1: Total cost of an employee ──────────────────
  const empCostSection = buildEmpCostSection(cur);

  // ── Section 2: Group retirement (RRSP/DPSP vs DC pension) ─
  const groupRetSection = buildGroupRetSection(cur, isCA);

  // ── Section 3: Health Spending Account (CGS/HSA) ──────────
  const hsaSection = buildHSASection(cur, isCA, isQC, isIncorp);

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
function buildEmpCostSection(cur) {
  let salary       = 75000;
  let benefitsLoad = 0.18;
  let matchPct     = 0.04;
  let payrollTax   = 0.12;
  let empTaxEst    = 0.28;

  const box = h('div', {});

  function draw() {
    const totalCost = salary * (1 + benefitsLoad + matchPct + payrollTax);
    const benefitsDollars  = salary * benefitsLoad;
    const matchDollars     = salary * matchPct;
    const payrollDollars   = salary * payrollTax;
    const takeHome         = salary * (1 - empTaxEst);
    const gap              = totalCost - takeHome;

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
        [t('Avantages sociaux (' + pct(benefitsLoad) + ')', 'Benefits load (' + pct(benefitsLoad) + ')'), money(benefitsDollars, { currency: cur }), 'neg'],
        [t('Cotisation retraite (' + pct(matchPct) + ')',   'Retirement match (' + pct(matchPct) + ')'),   money(matchDollars,    { currency: cur }), 'neg'],
        [t('Charges patronales (' + pct(payrollTax) + ')',  'Payroll taxes (' + pct(payrollTax) + ')'),    money(payrollDollars,  { currency: cur }), 'neg'],
        [t('Coût total pour l’employeur', 'Total employer cost'), money(totalCost, { currency: cur }), 'neg'],
        [t('Salaire net estimé (salaire − ~' + pct(empTaxEst, 0) + ' impôt)', 'Est. take-home (salary − ~' + pct(empTaxEst, 0) + ' tax)'), money(takeHome, { currency: cur }), 'pos'],
        [t('Écart coût-employeur / revenu-net', 'Gap: employer cost vs take-home'), money(gap, { currency: cur }), ''],
      ]),
    );
  }

  draw();

  return card(
    t('Coût total d’un employé', 'Total cost of an employee'),
    {
      class: 'span-full',
      sub: t('Rémunération, avantages sociaux et charges patronales', 'Compensation, benefits load and payroll taxes'),
    },
    h('div', { class: 'grid cols-2' },
      slider({
        label: t('Salaire de base', 'Base salary'),
        value: salary, min: 30000, max: 300000, step: 5000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { salary = v; draw(); },
      }),
      slider({
        label: t('Charge avantages sociaux %', 'Benefits load %'),
        value: benefitsLoad, min: 0, max: 0.40, step: 0.01,
        format: v => pct(v),
        onInput: v => { benefitsLoad = v; draw(); },
      }),
      slider({
        label: t('Cotisation retraite employeur %', 'Employer retirement match %'),
        value: matchPct, min: 0, max: 0.12, step: 0.005,
        format: v => pct(v),
        onInput: v => { matchPct = v; draw(); },
      }),
      slider({
        label: t('Charges patronales % (RPC/AE/FSS)', 'Payroll taxes % (CPP/EI/health-tax)'),
        value: payrollTax, min: 0, max: 0.25, step: 0.005,
        format: v => pct(v),
        onInput: v => { payrollTax = v; draw(); },
      }),
      slider({
        label: t('Taux d’impôt estimé de l’employé %', 'Estimated employee tax rate %'),
        value: empTaxEst, min: 0.15, max: 0.55, step: 0.01,
        format: v => pct(v),
        onInput: v => { empTaxEst = v; draw(); },
      }),
    ),
    box,
  );
}

// ──────────────────────────────────────────────────────────────
// SECTION 2 — Group retirement: RRSP+DPSP vs DC pension
// ──────────────────────────────────────────────────────────────
function buildGroupRetSection(cur, isCA) {
  let salary    = 80000;
  let matchPct  = 0.04;
  let years     = 20;
  let retReturn = 0.06;

  const retBox = h('div', {});

  function drawRet() {
    const annualMatch    = salary * matchPct;
    const futureValue    = fv(retReturn, years, annualMatch);
    const vestingNote    = isCA
      ? t('Droits acquis typiques : immédiat pour le REER collectif; 2 ans pour le RPDB (règle fiscale).', 'Typical vesting: immediate for group RRSP; 2 years for DPSP (tax rule).')
      : t('Les droits d’acquisition varient selon le régime. Vérifiez le calendrier d’acquisition.', 'Vesting schedules vary by plan. Confirm the vesting schedule.');

    const xLabels = [];
    const rrspVals = [];
    const dcVals   = [];
    for (let y = 1; y <= Math.min(years, 30); y++) {
      xLabels.push(y);
      rrspVals.push(Math.round(fv(retReturn, y, annualMatch)));
      dcVals.push(Math.round(fv(retReturn * 0.97, y, annualMatch)));
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
        [t('Salaire de référence', 'Reference salary'),                   money(salary, { currency: cur })],
        [t('Cotisation annuelle de l’employeur', 'Annual employer contribution'), money(annualMatch, { currency: cur })],
        [t('Valeur projetée (' + years + ' ans, ' + pct(retReturn) + ')', 'Projected value (' + years + ' yrs, ' + pct(retReturn) + ')'), money(futureValue, { currency: cur, compact: true }), 'pos'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '10px' } }, vestingNote),
    );
  }

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
        label: t('Salaire de référence', 'Reference salary'),
        value: salary, min: 30000, max: 300000, step: 5000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { salary = v; drawRet(); },
      }),
      slider({
        label: t('Cotisation employeur %', 'Employer match %'),
        value: matchPct, min: 0, max: 0.15, step: 0.005,
        format: v => pct(v),
        onInput: v => { matchPct = v; drawRet(); },
      }),
      slider({
        label: t('Horizon (ans)', 'Horizon (yrs)'),
        value: years, min: 1, max: 35, step: 1,
        format: v => String(v),
        onInput: v => { years = v; drawRet(); },
      }),
      slider({
        label: t('Rendement annuel', 'Annual return'),
        value: retReturn, min: 0.02, max: 0.10, step: 0.005,
        format: v => pct(v),
        onInput: v => { retReturn = v; drawRet(); },
      }),
    ),
    retBox,
    prosConsCA,
  );
}

// ──────────────────────────────────────────────────────────────
// SECTION 3 — CGS / HSA (Health Spending Account)
// ──────────────────────────────────────────────────────────────
function buildHSASection(cur, isCA, isQC, isIncorp) {
  let medAmount   = 5000;
  let corpTaxRate = 0.127;
  let margRate    = 0.48;

  const hsaBox = h('div', {});

  function drawHSA() {
    const corpDeduction   = medAmount * corpTaxRate;
    const personalCredit  = medAmount * 0.25 * 0.15;
    const saving          = isIncorp ? corpDeduction : personalCredit;
    const altLabel        = isIncorp
      ? t('Déduction corporative (CGS)', 'Corporate deduction (HSA)')
      : t('Crédit médical personnel estimé', 'Estimated personal medical credit');
    const qcNote = isQC
      ? t('Au Québec, la CGS constitue un avantage imposable au provincial pour l’employé. L’économie nette est réduite en conséquence.', 'In Quebec, the HSA is a taxable benefit provincially for the employee. The net saving is reduced accordingly.')
      : '';

    hsaBox.replaceChildren(
      statList([
        [t('Dépenses médicales', 'Medical expenses'),      money(medAmount,    { currency: cur })],
        [altLabel,                                          money(saving,       { currency: cur }), 'pos'],
        [t('Taux d’impôt corporatif utilisé', 'Corporate tax rate used'),  pct(corpTaxRate)],
        [t('Taux marginal personnel', 'Personal marginal rate'),       pct(margRate)],
        [
          t('Économie nette vs crédit personnel (env.)', 'Net saving vs personal credit (approx.)'),
          money(isIncorp ? (corpDeduction - personalCredit) : 0, { currency: cur }),
          isIncorp ? 'pos' : '',
        ],
      ]),
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
        ? t('Déduction corporative 100 % — exonéré pour l’employé (hors Québec)', '100 % corporate deduction — tax-free to employee (outside QC)')
        : t('Remboursement des dépenses médicales par l’employeur', 'Employer reimbursement of medical expenses'),
    },
    h('div', { class: 'grid cols-3' },
      slider({
        label: t('Dépenses médicales annuelles', 'Annual medical expenses'),
        value: medAmount, min: 500, max: 50000, step: 500,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { medAmount = v; drawHSA(); },
      }),
      slider({
        label: t('Taux d’impôt corporatif', 'Corporate tax rate'),
        value: corpTaxRate, min: 0.09, max: 0.30, step: 0.005,
        format: v => pct(v),
        onInput: v => { corpTaxRate = v; drawHSA(); },
      }),
      slider({
        label: t('Taux marginal personnel', 'Personal marginal rate'),
        value: margRate, min: 0.20, max: 0.55, step: 0.01,
        format: v => pct(v),
        onInput: v => { margRate = v; drawHSA(); },
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
