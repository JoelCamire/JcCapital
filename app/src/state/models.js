// ============================================================
// Data models, factories & seed data
// ============================================================
export const uid = () => Math.random().toString(36).slice(2, 10);
export const CURRENT_YEAR = new Date().getFullYear();

export function defaultAssumptions() {
  return {
    inflation: 0.021,
    preReturn: 0.058,        // accumulation real-ish nominal return
    postReturn: 0.042,       // de-risked in retirement
    returnStdev: 0.11,       // volatility for Monte Carlo
    salaryGrowth: 0.025,
    realEstateGrowth: 0.03,
    rriffConvertAge: 71,
  };
}

export function newMember(over = {}) {
  return {
    id: uid(), name: 'Nouveau membre', role: 'spouse',
    currentAge: 40, retirementAge: 65, lifeExpectancy: 95,
    // Personal / KYC
    dob: '', gender: '', sin: '', email: '', phone: '',
    employer: '', occupation: '', employmentStatus: 'employed',
    citizenship: '', residency: '', smoker: false, riskTolerance: 'balanced',
    ...over,
  };
}
export function newDependent(over = {}) {
  return { id: uid(), name: 'Enfant', relationship: 'child', dob: '', age: 5, financiallyDependent: true, educationGoalAge: 18, ...over };
}
export function newBeneficiary(over = {}) {
  return { id: uid(), name: 'Bénéficiaire', relationship: 'spouse', allocation: 100, scope: 'estate', notes: '', ...over };
}
export function newDocument(over = {}) {
  return { id: uid(), name: 'Document', type: 'will', date: '', status: 'todo', notes: '', ...over };
}
export function newContact(over = {}) {
  return { id: uid(), name: 'Conseiller', role: 'accountant', firm: '', phone: '', email: '', ...over };
}
export function newBusiness(over = {}) {
  return {
    name: '', structure: 'incorporated', ownerId: null, fiscalYearEnd: '12-31',
    activeIncome: 250000, passiveIncome: 30000, retainedEarnings: 200000, corpInvestments: 150000,
    otherPersonalIncome: 0,
    valuation: { ebitda: 0, ebitdaMultiple: 5, revenue: 0, revenueMultiple: 1 },
    sale: { proceeds: 0, acb: 0, owners: 1 },
    ...over,
  };
}
export function newIncome(over = {}) {
  return { id: uid(), memberId: null, label: 'Revenu', type: 'employment', amount: 60000, growth: 0.025, startAge: null, endAge: null, taxable: true, ...over };
}
export function newExpense(over = {}) {
  return { id: uid(), label: 'Dépense', amount: 12000, growth: 0.021, category: 'living', retirementFactor: 1, ...over };
}
export function newAsset(over = {}) {
  return { id: uid(), ownerId: null, label: 'Compte', type: 'nonreg', value: 10000, costBasis: 10000, growth: 0.058, annualContribution: 0, employerMatch: 0, ...over };
}
export function newLiability(over = {}) {
  return { id: uid(), label: 'Dette', type: 'mortgage', balance: 200000, rate: 0.049, payment: 1400, ...over };
}
export function newGoal(over = {}) {
  return { id: uid(), type: 'purchase', name: 'Objectif', targetAge: 55, amount: 50000, priority: 'medium', ...over };
}
export function newInsurance(over = {}) {
  return { id: uid(), type: 'life', insuredId: null, coverage: 250000, premium: 600, ...over };
}

// ===================== CRM =====================
export const todayISO = () => new Date().toISOString().slice(0, 10);

// Pipeline stages for sales opportunities (ordered).
export const PIPELINE_STAGES = ['new', 'contacted', 'meeting', 'proposal', 'won', 'lost'];
// Person lifecycle (where the relationship sits).
export const LIFECYCLES = ['lead', 'prospect', 'client', 'inactive'];

export function defaultCRM(over = {}) {
  return {
    lifecycle: 'client',        // lead | prospect | client | inactive
    source: '',                 // referral | web | event | coi | social | walkin | other
    referredBy: '',             // name of referrer (or client id)
    tags: [],                   // free-form labels
    rating: '',                 // A | B | C — relationship value
    nextActionDate: '',         // next planned touch
    lastContactAt: null,        // stamp of most recent activity
    ...over,
  };
}
export function newOpportunity(over = {}) {
  return {
    id: uid(), title: 'Nouvelle opportunité', type: 'investment', // investment | life | disability | ci | mortgage | group | planning | other
    stage: 'new', value: 0, valueKind: 'aum',  // aum (assets) | premium (annual)
    probability: 20, expectedClose: '', notes: '',
    openedAt: Date.now(), closedAt: null, ...over,
  };
}
export function newActivity(over = {}) {
  return {
    id: uid(), type: 'note',    // call | email | meeting | note | text | task
    subject: '', body: '', date: todayISO(), outcome: '',
    createdAt: Date.now(), ...over,
  };
}
export function newTask(over = {}) {
  return {
    id: uid(), title: 'Tâche', due: '', done: false,
    priority: 'medium',         // low | medium | high
    category: 'followup',       // followup | review | admin | compliance | call | meeting | prospecting
    notes: '', createdAt: Date.now(), completedAt: null, ...over,
  };
}
export function newProduct(over = {}) {
  return {
    id: uid(), kind: 'life',    // life | disability | ci | health | investment | segfund | mortgage | group | annuity
    carrier: '', policyNumber: '', status: 'inforce', // pending | inforce | lapsed | cancelled | paid
    faceAmount: 0, aum: 0, premium: 0, frequency: 'monthly', // monthly | annual | single
    insuredId: null, issueDate: '', renewalDate: '',
    firstYearCommission: 0, renewalCommission: 0, notes: '', ...over,
  };
}

export function newClient(name = 'Nouveau ménage', country = 'CA', region = 'QC') {
  const m = newMember({ name: 'Titulaire', role: 'primary', currentAge: 40 });
  return {
    id: uid(), name, createdAt: Date.now(), updatedAt: Date.now(),
    jurisdiction: { country, region }, filingStatus: 'single', riskProfile: 'balanced',
    household: { address: '', city: '', region: '', postal: '', country, maritalStatus: 'single', reviewDate: '', advisorNotes: '' },
    members: [m],
    dependents: [],
    incomes: [newIncome({ memberId: m.id, label: 'Emploi', amount: 85000 })],
    expenses: [newExpense({ label: "Coût de vie", amount: 48000, retirementFactor: 0.8 })],
    assets: [],
    liabilities: [],
    goals: [],
    insurance: [],
    beneficiaries: [],
    documents: [],
    contacts: [],
    business: null,
    // ----- CRM layer -----
    crm: defaultCRM({ lifecycle: 'prospect' }),
    opportunities: [],
    activities: [],
    tasks: [],
    products: [],
    compliance: {},        // KYC checklist: { itemKey: { status, date, notes } }
    assumptions: defaultAssumptions(),
  };
}

// ------- Seed: a realistic Québec household -------
export function seedClients() {
  const a = uid(), b = uid();
  const c1 = uid(), c2 = uid();
  const joel = {
    id: uid(), name: 'Famille Tremblay', createdAt: Date.now(), updatedAt: Date.now(),
    jurisdiction: { country: 'CA', region: 'QC' }, filingStatus: 'married', riskProfile: 'balanced',
    household: { address: '125 rue des Érables', city: 'Québec', region: 'QC', postal: 'G1R 2T4', country: 'CA',
      maritalStatus: 'married', reviewDate: '2026-09-15', advisorNotes: 'Couple avec 2 enfants. Objectif : retraite anticipée de Marc à 62 ans. Réviser la couverture invalidité de Julie.' },
    members: [
      newMember({ id: a, name: 'Marc Tremblay', role: 'primary', currentAge: 42, retirementAge: 62, lifeExpectancy: 94,
        dob: '1983-04-12', gender: 'M', email: 'marc.tremblay@example.com', phone: '418-555-0142',
        employer: 'Génie-Conseil QC inc.', occupation: 'Ingénieur civil', employmentStatus: 'employed',
        citizenship: 'CA', residency: 'CA', smoker: false, riskTolerance: 'balanced' }),
      newMember({ id: b, name: 'Julie Bélanger', role: 'spouse', currentAge: 40, retirementAge: 60, lifeExpectancy: 96,
        dob: '1985-11-03', gender: 'F', email: 'julie.belanger@example.com', phone: '418-555-0198',
        employer: 'CIUSSS de la Capitale', occupation: 'Gestionnaire de programme', employmentStatus: 'employed',
        citizenship: 'CA', residency: 'CA', smoker: false, riskTolerance: 'growth' }),
    ],
    dependents: [
      newDependent({ id: c1, name: 'Léa Tremblay', relationship: 'child', dob: '2015-06-20', age: 10, educationGoalAge: 18 }),
      newDependent({ id: c2, name: 'Noah Tremblay', relationship: 'child', dob: '2018-02-08', age: 7, educationGoalAge: 18 }),
    ],
    incomes: [
      newIncome({ memberId: a, label: 'Salaire — ingénieur', type: 'employment', amount: 118000, growth: 0.028 }),
      newIncome({ memberId: b, label: 'Salaire — gestionnaire', type: 'employment', amount: 92000, growth: 0.026 }),
      newIncome({ memberId: a, label: 'RRQ', type: 'cpp', amount: 15600, growth: 0.021, startAge: 65, taxable: true }),
      newIncome({ memberId: a, label: 'PSV', type: 'oas', amount: 8700, growth: 0.021, startAge: 65, taxable: true }),
      newIncome({ memberId: b, label: 'RRQ', type: 'cpp', amount: 12800, growth: 0.021, startAge: 65, taxable: true }),
      newIncome({ memberId: b, label: 'PSV', type: 'oas', amount: 8700, growth: 0.021, startAge: 65, taxable: true }),
    ],
    expenses: [
      newExpense({ label: 'Coût de vie courant', amount: 64000, category: 'living', retirementFactor: 0.82 }),
      newExpense({ label: 'Voyages & loisirs', amount: 14000, category: 'lifestyle', retirementFactor: 1.15 }),
      newExpense({ label: 'Auto & transport', amount: 11000, category: 'transport', retirementFactor: 0.7 }),
    ],
    assets: [
      newAsset({ ownerId: a, label: 'REER — Marc', type: 'rrsp', value: 285000, costBasis: 285000, growth: 0.058, annualContribution: 14000 }),
      newAsset({ ownerId: b, label: 'REER — Julie', type: 'rrsp', value: 198000, costBasis: 198000, growth: 0.058, annualContribution: 11000 }),
      newAsset({ ownerId: a, label: 'CELI — Marc', type: 'tfsa', value: 92000, costBasis: 92000, growth: 0.06, annualContribution: 7000 }),
      newAsset({ ownerId: b, label: 'CELI — Julie', type: 'tfsa', value: 81000, costBasis: 81000, growth: 0.06, annualContribution: 7000 }),
      newAsset({ ownerId: a, label: 'Placements non enregistrés', type: 'nonreg', value: 145000, costBasis: 110000, growth: 0.055, annualContribution: 6000 }),
      newAsset({ ownerId: a, label: 'Résidence principale', type: 'realestate', value: 720000, costBasis: 480000, growth: 0.03, annualContribution: 0 }),
      newAsset({ ownerId: a, label: 'Encaisse / urgence', type: 'cash', value: 38000, costBasis: 38000, growth: 0.025, annualContribution: 0 }),
    ],
    liabilities: [
      newLiability({ label: 'Hypothèque résidence', type: 'mortgage', balance: 312000, rate: 0.0479, payment: 2150 }),
      newLiability({ label: 'Prêt auto', type: 'loan', balance: 24000, rate: 0.069, payment: 520 }),
    ],
    goals: [
      newGoal({ type: 'retirement', name: 'Retraite confortable', targetAge: 62, amount: 78000, priority: 'high' }),
      newGoal({ type: 'education', name: 'Études — 2 enfants', targetAge: 18, amount: 100000, priority: 'high' }),
      newGoal({ type: 'purchase', name: 'Chalet', targetAge: 55, amount: 250000, priority: 'medium' }),
    ],
    insurance: [
      newInsurance({ type: 'life', insuredId: a, coverage: 500000, premium: 720 }),
      newInsurance({ type: 'life', insuredId: b, coverage: 350000, premium: 540 }),
      newInsurance({ type: 'di', insuredId: a, coverage: 72000, premium: 1850 }),
    ],
    beneficiaries: [
      newBeneficiary({ name: 'Julie Bélanger', relationship: 'spouse', allocation: 100, scope: 'rrsp', notes: 'Roulement au conjoint (REER de Marc)' }),
      newBeneficiary({ name: 'Léa & Noah', relationship: 'children', allocation: 100, scope: 'estate', notes: 'Reliquat de succession, en parts égales' }),
    ],
    documents: [
      newDocument({ name: 'Testament notarié', type: 'will', date: '2021-05-10', status: 'done', notes: 'À réviser après naissance de Noah' }),
      newDocument({ name: 'Mandat de protection', type: 'mandate', date: '2021-05-10', status: 'done' }),
      newDocument({ name: 'Procuration bancaire', type: 'poa', date: '', status: 'todo', notes: 'À mettre en place' }),
    ],
    contacts: [
      newContact({ name: 'Me Sophie Lavoie', role: 'notary', firm: 'Lavoie & Associés', phone: '418-555-0111', email: 'slavoie@notaire.qc.ca' }),
      newContact({ name: 'Pierre Gagnon, CPA', role: 'accountant', firm: 'Gagnon Comptables', phone: '418-555-0133', email: 'pgagnon@cpa.qc.ca' }),
    ],
    business: newBusiness({
      name: 'Tremblay Génie-Conseil inc.', structure: 'incorporated', ownerId: a, fiscalYearEnd: '12-31',
      activeIncome: 285000, passiveIncome: 45000, retainedEarnings: 320000, corpInvestments: 280000,
      otherPersonalIncome: 0,
      valuation: { ebitda: 240000, ebitdaMultiple: 5, revenue: 1100000, revenueMultiple: 1.2 },
      sale: { proceeds: 1300000, acb: 100000, owners: 2 },
    }),
    crm: defaultCRM({ lifecycle: 'client', source: 'referral', referredBy: 'Pierre Gagnon, CPA',
      tags: ['VIP', 'Entreprise'], rating: 'A', nextActionDate: '2026-07-08', lastContactAt: Date.now() }),
    opportunities: [
      newOpportunity({ title: "Assurance invalidité — Julie", type: 'disability', stage: 'proposal',
        value: 2100, valueKind: 'premium', probability: 70, expectedClose: '2026-07-20',
        notes: 'Couverture actuelle insuffisante; proposition envoyée.' }),
      newOpportunity({ title: 'Transfert REER non-géré — Marc', type: 'investment', stage: 'meeting',
        value: 145000, valueKind: 'aum', probability: 50, expectedClose: '2026-08-15',
        notes: 'Consolidation des placements non enregistrés.' }),
    ],
    activities: [
      newActivity({ type: 'meeting', subject: 'Revue annuelle', date: '2026-06-10',
        body: 'Revue complète du portefeuille et des objectifs de retraite.', outcome: 'positive' }),
      newActivity({ type: 'call', subject: 'Suivi assurance invalidité', date: '2026-06-18',
        body: 'Discuté du besoin de couverture pour Julie. Proposition à envoyer.' }),
      newActivity({ type: 'email', subject: 'Documents REER envoyés', date: '2026-06-20' }),
    ],
    tasks: [
      newTask({ title: 'Envoyer la proposition d’invalidité à Julie', due: '2026-06-30', priority: 'high', category: 'followup' }),
      newTask({ title: 'Préparer la revue de placements de Marc', due: '2026-07-15', priority: 'medium', category: 'review' }),
      newTask({ title: 'Réviser le testament (post-naissance Noah)', due: '2026-09-01', priority: 'low', category: 'admin' }),
    ],
    compliance: { kyc: { status: 'done', date: '2025-09-15' }, riskprofile: { status: 'done', date: '2025-09-15' }, idverify: { status: 'done', date: '2019-03-01' }, beneficiary: { status: 'done', date: '2025-09-15' }, fatca: { status: 'todo', date: '' }, disclosure: { status: 'done', date: '2019-03-01' }, agreement: { status: 'done', date: '2019-03-01' } },
    products: [
      newProduct({ kind: 'life', carrier: 'Canada Vie', policyNumber: 'CV-8841201', insuredId: a, status: 'inforce',
        faceAmount: 500000, premium: 720, frequency: 'annual', issueDate: '2019-03-01', renewalDate: '2027-03-01',
        firstYearCommission: 0, renewalCommission: 360 }),
      newProduct({ kind: 'life', carrier: 'Canada Vie', policyNumber: 'CV-8841202', insuredId: b, status: 'inforce',
        faceAmount: 350000, premium: 540, frequency: 'annual', issueDate: '2019-03-01', renewalDate: '2027-03-01',
        firstYearCommission: 0, renewalCommission: 270 }),
      newProduct({ kind: 'disability', carrier: 'RBC Assurances', policyNumber: 'RBC-DI-55092', insuredId: a, status: 'inforce',
        faceAmount: 72000, premium: 1850, frequency: 'annual', issueDate: '2020-07-15', renewalDate: '2026-11-01',
        firstYearCommission: 0, renewalCommission: 925 }),
      newProduct({ kind: 'investment', carrier: 'Mackenzie', policyNumber: 'MK-RRSP-Marc', insuredId: a, status: 'inforce',
        aum: 285000, premium: 0, issueDate: '2015-01-10', renewalDate: '',
        firstYearCommission: 0, renewalCommission: 2850 }),
    ],
    assumptions: defaultAssumptions(),
  };

  // ----- A prospect in the pipeline (entrepreneur referral) -----
  const p = uid();
  const prospect = {
    id: uid(), name: 'Geneviève Côté (Boulangerie Côté inc.)', createdAt: Date.now(), updatedAt: Date.now(),
    jurisdiction: { country: 'CA', region: 'QC' }, filingStatus: 'single', riskProfile: 'balanced',
    household: { address: '', city: 'Lévis', region: 'QC', postal: '', country: 'CA',
      maritalStatus: 'single', reviewDate: '', advisorNotes: 'Propriétaire d’une PME, référée par Marc Tremblay. Besoin : assurance personne clé + convention de rachat.' },
    members: [newMember({ id: p, name: 'Geneviève Côté', role: 'primary', currentAge: 47,
      dob: '1979-02-14', gender: 'F', email: 'gcote@boulangeriecote.ca', phone: '418-555-0220',
      employer: 'Boulangerie Côté inc.', occupation: 'Présidente', employmentStatus: 'business' })],
    dependents: [], incomes: [newIncome({ memberId: p, label: 'Revenu', amount: 160000 })],
    expenses: [], assets: [], liabilities: [], goals: [], insurance: [],
    beneficiaries: [], documents: [], contacts: [], business: null,
    crm: defaultCRM({ lifecycle: 'prospect', source: 'referral', referredBy: 'Marc Tremblay',
      tags: ['Entreprise', 'Personne clé'], rating: 'A', nextActionDate: '2026-06-27' }),
    opportunities: [
      newOpportunity({ title: 'Assurance personne clé', type: 'life', stage: 'contacted',
        value: 6500, valueKind: 'premium', probability: 40, expectedClose: '2026-09-30',
        notes: 'Première rencontre à planifier.' }),
    ],
    activities: [
      newActivity({ type: 'call', subject: 'Premier contact', date: '2026-06-22',
        body: 'Référée par Marc Tremblay. Intéressée par assurance personne clé et convention de rachat.' }),
    ],
    tasks: [
      newTask({ title: 'Planifier la rencontre de découverte', due: '2026-06-27', priority: 'high', category: 'meeting' }),
    ],
    products: [],
    assumptions: defaultAssumptions(),
  };
  return [joel, prospect];
}
