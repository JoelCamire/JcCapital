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
  return { id: uid(), name: 'Nouveau membre', role: 'spouse', currentAge: 40, retirementAge: 65, lifeExpectancy: 95, ...over };
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
    id: uid(), name, createdAt: Date.now(),
    jurisdiction: { country, region }, filingStatus: 'single', riskProfile: 'balanced',
    members: [m],
    incomes: [newIncome({ memberId: m.id, label: 'Emploi', amount: 85000 })],
    expenses: [newExpense({ label: "Coût de vie", amount: 48000, retirementFactor: 0.8 })],
    assets: [],
    liabilities: [],
    goals: [],
    insurance: [],
    assumptions: defaultAssumptions(),
  };
}

// ------- Seed: a realistic Québec household -------
export function seedClients() {
  const a = uid(), b = uid();
  const joel = {
    id: uid(), name: 'Famille Tremblay', createdAt: Date.now(),
    jurisdiction: { country: 'CA', region: 'QC' }, filingStatus: 'married', riskProfile: 'balanced',
    members: [
      { id: a, name: 'Marc Tremblay', role: 'primary', currentAge: 42, retirementAge: 62, lifeExpectancy: 94 },
      { id: b, name: 'Julie Bélanger', role: 'spouse', currentAge: 40, retirementAge: 60, lifeExpectancy: 96 },
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
    assumptions: defaultAssumptions(),
  };
  return [joel];
}
