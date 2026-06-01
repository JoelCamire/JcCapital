// ============================================================
// UNITED KINGDOM — 2025/26 tax year (GBP)
// ============================================================
const UK_MAIN = {
  brackets: [
    { upTo: 50270, rate: 0.20 },
    { upTo: 125140, rate: 0.40 },
    { upTo: null, rate: 0.45 },
  ],
  personalAllowance: 12570, paTaperFrom: 100000, paTaperRate: 0.5,
  capGains: { allowance: 3000, basic: 0.18, higher: 0.24 },
  ni: { lower: 12570, upper: 50270, rate: 0.08, upperRate: 0.02 },
};
const REGIONS = {
  EW: { name: 'Angleterre / Pays de Galles', flag: '🏴', ...UK_MAIN },
  SC: {
    name: 'Écosse', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    brackets: [
      { upTo: 15397, rate: 0.19 }, { upTo: 27491, rate: 0.20 }, { upTo: 43662, rate: 0.21 },
      { upTo: 75000, rate: 0.42 }, { upTo: 125140, rate: 0.45 }, { upTo: null, rate: 0.48 },
    ],
    personalAllowance: 12570, paTaperFrom: 100000, paTaperRate: 0.5,
    capGains: UK_MAIN.capGains, ni: UK_MAIN.ni,
  },
};
const ACCOUNTS = [
  { id: 'pension', name: 'Pension (SIPP)', long: 'Personal/Workplace Pension', treatment: 'deferred',
    limit: 60000, note: 'Tax relief on contributions. 25 % tax-free lump sum.' },
  { id: 'isa', name: 'ISA', long: 'Individual Savings Account', treatment: 'taxfree',
    limit: 20000, note: 'Tax-free growth and withdrawals.' },
  { id: 'lisa', name: 'Lifetime ISA', long: 'Lifetime ISA', treatment: 'taxfree',
    limit: 4000, grant: 0.25, note: '25 % government bonus (first home / retirement).' },
  { id: 'jisa', name: 'Junior ISA', long: 'Junior ISA', treatment: 'education', limit: 9000, note: 'Tax-free for children.' },
  { id: 'nonreg', name: 'General (GIA)', long: 'General Investment Account', treatment: 'taxable',
    note: 'CGT allowance £3,000, dividend allowance £500.' },
];
const UK = {
  country: 'UK', name: 'Royaume-Uni', flag: '🇬🇧', currency: 'GBP', locale: 'en-GB',
  regionLabel: 'Nation', regions: Object.fromEntries(Object.entries(REGIONS).map(([k, v]) => [k, v.name])),
  defaultRegion: 'EW', capGainsInclusion: 1.0,
  labels: { retirement1: 'State Pension', retirement2: 'Workplace Pension', taxAdvantaged: 'Pension', taxFree: 'ISA', education: 'Junior ISA' },
  pensions: {
    cpp: { name: 'State Pension', maxAnnual: 11973, avgAnnual: 9000, startAge: 67 },
    oas: { name: 'Pension Credit', maxAnnual: 0, startAge: 66 },
  },
  fed: UK_MAIN, prov: REGIONS, regionsData: REGIONS, accounts: ACCOUNTS, rrifMin: {},
};
export default UK;
