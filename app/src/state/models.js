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
    assumptions: defaultAssumptions(),
  };
  return [joel];
}
