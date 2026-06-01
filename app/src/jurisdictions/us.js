// ============================================================
// UNITED STATES — Federal + state tax law (2025, single filer base)
// All figures USD. A filingStatus multiplier widens brackets for MFJ.
// ============================================================

const US_FED = {
  brackets: [
    { upTo: 11925, rate: 0.10 },
    { upTo: 48475, rate: 0.12 },
    { upTo: 103350, rate: 0.22 },
    { upTo: 197300, rate: 0.24 },
    { upTo: 250525, rate: 0.32 },
    { upTo: 626350, rate: 0.35 },
    { upTo: null, rate: 0.37 },
  ],
  standardDeduction: { single: 15000, married: 30000 },
  // Long-term capital gains brackets (single)
  ltcg: [
    { upTo: 48350, rate: 0.0 },
    { upTo: 533400, rate: 0.15 },
    { upTo: null, rate: 0.20 },
  ],
  niit: { rate: 0.038, threshold: 200000 }, // net investment income tax
  capGainsInclusion: 1.0, // short-term taxed as ordinary; LTCG via ltcg table
};

const STATES = {
  CA: {
    name: 'Californie', flag: '🌴',
    brackets: [
      { upTo: 10756, rate: 0.01 }, { upTo: 25499, rate: 0.02 }, { upTo: 40245, rate: 0.04 },
      { upTo: 55866, rate: 0.06 }, { upTo: 70606, rate: 0.08 }, { upTo: 360659, rate: 0.093 },
      { upTo: 432787, rate: 0.103 }, { upTo: 721314, rate: 0.113 }, { upTo: null, rate: 0.123 },
    ],
    standardDeduction: 5540, mentalHealth: { over: 1000000, rate: 0.01 },
  },
  NY: {
    name: 'New York', flag: '🗽',
    brackets: [
      { upTo: 8500, rate: 0.04 }, { upTo: 11700, rate: 0.045 }, { upTo: 13900, rate: 0.0525 },
      { upTo: 80650, rate: 0.055 }, { upTo: 215400, rate: 0.06 }, { upTo: 1077550, rate: 0.0685 },
      { upTo: 5000000, rate: 0.0965 }, { upTo: 25000000, rate: 0.103 }, { upTo: null, rate: 0.109 },
    ],
    standardDeduction: 8000,
  },
  TX: { name: 'Texas', flag: '🤠', brackets: [{ upTo: null, rate: 0 }], standardDeduction: 0, noIncomeTax: true },
  FL: { name: 'Floride', flag: '🌞', brackets: [{ upTo: null, rate: 0 }], standardDeduction: 0, noIncomeTax: true },
  WA: { name: 'Washington', flag: '🌲', brackets: [{ upTo: null, rate: 0 }], standardDeduction: 0, noIncomeTax: true, capGainsTax: { over: 270000, rate: 0.07 } },
};

const PAYROLL = {
  socialSecurity: { rate: 0.062, wageBase: 176100 },
  medicare: { rate: 0.0145, additional: { rate: 0.009, threshold: 200000 } },
};

const ACCOUNTS = [
  { id: '401k', name: '401(k)', long: 'Employer 401(k)', treatment: 'deferred',
    limit: 23500, catchup: 7500, catchupAge: 50, note: 'Pre-tax. Taxed on withdrawal. RMD at 73.' },
  { id: 'ira', name: 'Traditional IRA', long: 'Individual Retirement Account', treatment: 'deferred',
    limit: 7000, catchup: 1000, catchupAge: 50, note: 'Pre-tax (income limits). Taxed on withdrawal.' },
  { id: 'roth', name: 'Roth IRA', long: 'Roth IRA', treatment: 'taxfree',
    limit: 7000, catchup: 1000, catchupAge: 50, note: 'After-tax. Tax-free growth & qualified withdrawals.' },
  { id: 'hsa', name: 'HSA', long: 'Health Savings Account', treatment: 'taxfree',
    limit: 4300, family: 8550, note: 'Triple tax advantage for medical expenses.' },
  { id: '529', name: '529 Plan', long: '529 Education Savings', treatment: 'education',
    note: 'Tax-free growth for qualified education expenses.' },
  { id: 'nonreg', name: 'Brokerage', long: 'Taxable brokerage account', treatment: 'taxable',
    note: 'LTCG 0/15/20 %, qualified dividends, NIIT may apply.' },
  { id: 'rmd', name: 'Traditional (RMD)', long: 'Pre-tax in RMD phase', treatment: 'deferred',
    note: 'Required Minimum Distributions from age 73.' },
];

// IRS Uniform Lifetime Table RMD divisors (approx) -> convert to factor 1/divisor
const RMD_DIV = { 73:26.5,74:25.5,75:24.6,76:23.7,77:22.9,78:22.0,79:21.1,80:20.2,81:19.4,82:18.5,83:17.7,84:16.8,85:16.0,86:15.2,87:14.4,88:13.7,89:12.9,90:12.2,91:11.5,92:10.8,93:10.1,94:9.5,95:8.9 };
const RMD_MIN = Object.fromEntries(Object.entries(RMD_DIV).map(([a, d]) => [a, +(1 / d).toFixed(4)]));

const US = {
  country: 'US', name: 'États-Unis', flag: '🇺🇸', currency: 'USD', locale: 'en-US',
  regionLabel: 'État', regions: Object.fromEntries(Object.entries(STATES).map(([k, v]) => [k, v.name])),
  defaultRegion: 'CA',
  capGainsInclusion: 1.0,
  labels: {
    retirement1: 'Social Security', retirement2: 'Medicare',
    taxAdvantaged: '401(k)', taxFree: 'Roth IRA', education: '529 Plan',
  },
  pensions: {
    cpp: { name: 'Social Security', maxAnnual: 48216, avgAnnual: 22884, startAge: 67, defer: 0.08, early: -0.067 },
    oas: { name: 'Medicare (âge 65)', maxAnnual: 0, startAge: 65 },
  },
  fed: US_FED, states: STATES, prov: STATES, payroll: PAYROLL, accounts: ACCOUNTS, rrifMin: RMD_MIN,
  filingStatusWidth: { single: 1, married: 2 },
};

export default US;
export { STATES as US_STATES };
