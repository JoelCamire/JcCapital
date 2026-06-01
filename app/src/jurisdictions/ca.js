// ============================================================
// CANADA — Federal + provincial tax law (2025 parameters)
// All figures are CAD. Brackets are marginal: { upTo, rate }.
// upTo: null means "and above".
// ============================================================

const CA_FED = {
  brackets: [
    { upTo: 57375, rate: 0.15 },
    { upTo: 114750, rate: 0.205 },
    { upTo: 177882, rate: 0.26 },
    { upTo: 253414, rate: 0.29 },
    { upTo: null, rate: 0.33 },
  ],
  bpa: 16129,            // basic personal amount (credit @ lowest rate)
  bpaRate: 0.15,
  capGainsInclusion: 0.50,
  eligibleDivGrossUp: 1.38,
  eligibleDivCredit: 0.150198, // federal credit on grossed-up
  nonEligDivGrossUp: 1.15,
  nonEligDivCredit: 0.090301, // federal credit on grossed-up non-eligible
};

// Corporate (CCPC) parameters, 2025. Combined rate = federal + provincial.
const CORPORATE = {
  sbdLimit: 500000,                 // small business deduction limit
  passiveGrindStart: 50000,         // AAII threshold where SBD starts to grind
  passiveGrindEnd: 150000,          // SBD fully eliminated
  fedSB: 0.09, fedGeneral: 0.15,
  passiveRate: 0.5017,              // investment income in a CCPC
  refundableRate: 0.3067,           // RDTOH refunded on taxable dividend paid
  cdaFraction: 0.50,                // non-taxable half of capital gains -> CDA (tax-free)
  lcge: 1250000,                    // lifetime capital gains exemption (QSBC), 2025
  // provincial corporate rates pulled from PROV (provSB / provGen)
};

// Province table: brackets, basic personal amount, credit rate, and notes.
const PROV = {
  QC: {
    name: 'Québec', flag: '⚜️',
    brackets: [
      { upTo: 53255, rate: 0.14 },
      { upTo: 106495, rate: 0.19 },
      { upTo: 129590, rate: 0.24 },
      { upTo: null, rate: 0.2575 },
    ],
    bpa: 18571, bpaRate: 0.14,
    federalAbatement: 0.165, // Quebec abatement reduces federal tax
    divCredit: 0.117, divCreditNonElig: 0.0342,
    provSB: 0.032, provGen: 0.115,
    payroll: 'QC',
  },
  ON: {
    name: 'Ontario', flag: '🏙️',
    brackets: [
      { upTo: 52886, rate: 0.0505 },
      { upTo: 105775, rate: 0.0915 },
      { upTo: 150000, rate: 0.1116 },
      { upTo: 220000, rate: 0.1216 },
      { upTo: null, rate: 0.1316 },
    ],
    bpa: 12747, bpaRate: 0.0505,
    surtax: [{ over: 5710, rate: 0.20 }, { over: 7307, rate: 0.36 }],
    divCredit: 0.10, divCreditNonElig: 0.029863,
    provSB: 0.032, provGen: 0.115,
    payroll: 'ROC',
  },
  BC: {
    name: 'Colombie-Britannique', flag: '🏔️',
    brackets: [
      { upTo: 49279, rate: 0.0506 },
      { upTo: 98560, rate: 0.077 },
      { upTo: 113158, rate: 0.105 },
      { upTo: 137407, rate: 0.1229 },
      { upTo: 186306, rate: 0.147 },
      { upTo: 259829, rate: 0.168 },
      { upTo: null, rate: 0.205 },
    ],
    bpa: 12932, bpaRate: 0.0506,
    divCredit: 0.12, divCreditNonElig: 0.0196,
    provSB: 0.020, provGen: 0.120,
    payroll: 'ROC',
  },
  AB: {
    name: 'Alberta', flag: '🛢️',
    brackets: [
      { upTo: 60000, rate: 0.08 },
      { upTo: 151234, rate: 0.10 },
      { upTo: 181481, rate: 0.12 },
      { upTo: 241974, rate: 0.13 },
      { upTo: 362961, rate: 0.14 },
      { upTo: null, rate: 0.15 },
    ],
    bpa: 22323, bpaRate: 0.08,
    divCredit: 0.0812, divCreditNonElig: 0.0218,
    provSB: 0.020, provGen: 0.080,
    payroll: 'ROC',
  },
};

// Payroll (employee portion), 2025
const PAYROLL = {
  ROC: {
    cpp: { rate: 0.0595, exempt: 3500, ympe: 71300 },
    cpp2: { rate: 0.04, from: 71300, to: 81200 },
    ei: { rate: 0.0164, max: 65700 },
  },
  QC: {
    cpp: { rate: 0.064, exempt: 3500, ympe: 71300 }, // QPP
    cpp2: { rate: 0.04, from: 71300, to: 81200 },
    ei: { rate: 0.0131, max: 65700 },
    qpip: { rate: 0.00494, max: 98000 },
  },
};

const ACCOUNTS = [
  { id: 'rrsp', name: 'REER', long: "Régime enregistré d'épargne-retraite", treatment: 'deferred',
    limit: 32490, limitPctIncome: 0.18, note: 'Déductible. Imposable au retrait. Conversion FERR à 71 ans.' },
  { id: 'tfsa', name: 'CELI', long: "Compte d'épargne libre d'impôt", treatment: 'taxfree',
    limit: 7000, note: 'Croissance et retraits non imposables. Droits cumulatifs.' },
  { id: 'fhsa', name: 'CELIAPP', long: "Compte d'épargne libre d'impôt pour l'achat d'une première propriété", treatment: 'deferred',
    limit: 8000, lifetime: 40000, note: 'Déductible à la cotisation ET non imposable au retrait (1re propriété).' },
  { id: 'resp', name: 'REEE', long: "Régime enregistré d'épargne-études", treatment: 'education',
    lifetime: 50000, grant: 0.20, grantMax: 500, grantLifetime: 7200, note: 'SCEE 20 % (max 500 $/an, 7 200 $ à vie).' },
  { id: 'nonreg', name: 'Non enregistré', long: 'Compte de placement imposable', treatment: 'taxable',
    note: 'Gains en capital (50 % inclus), dividendes majorés/crédités, intérêts pleinement imposables.' },
  { id: 'rrif', name: 'FERR', long: "Fonds enregistré de revenu de retraite", treatment: 'deferred',
    note: 'Décaissement minimum obligatoire selon l\'âge.' },
  { id: 'corp', name: 'Société (CDC)', long: 'Société par actions / compte de dividendes en capital', treatment: 'corporate',
    note: 'Imposition des sociétés, intégration, CDC.' },
];

// RRIF minimum withdrawal factors by age
const RRIF_MIN = { 71:0.0528,72:0.0540,73:0.0553,74:0.0567,75:0.0582,76:0.0598,77:0.0617,78:0.0636,79:0.0658,80:0.0682,81:0.0708,82:0.0738,83:0.0771,84:0.0808,85:0.0851,86:0.0899,87:0.0955,88:0.1021,89:0.1099,90:0.1192,91:0.1306,92:0.1449,93:0.1634,94:0.1879,95:0.20 };

const CA = {
  country: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', locale: 'fr-CA',
  regionLabel: 'Province', regions: Object.fromEntries(Object.entries(PROV).map(([k, v]) => [k, v.name])),
  defaultRegion: 'QC',
  capGainsInclusion: CA_FED.capGainsInclusion,
  labels: {
    retirement1: 'RRQ / RPC', retirement2: 'PSV (Sécurité de la vieillesse)',
    taxAdvantaged: 'REER', taxFree: 'CELI', education: 'REEE',
  },
  // Public retirement benefits (2025 maxima at 65)
  pensions: {
    cpp: { name: 'RRQ / RPC', maxAnnual: 17196, avgAnnual: 9600, startAge: 65, defer: 0.084, early: -0.072 },
    oas: { name: 'PSV', maxAnnual: 8732, startAge: 65, clawbackStart: 93454, clawbackFull: 151668, clawbackRate: 0.15, defer: 0.072 },
  },
  fed: CA_FED, prov: PROV, payroll: PAYROLL, accounts: ACCOUNTS, rrifMin: RRIF_MIN,
  corporate: CORPORATE,
};

export default CA;
export { PROV as CA_PROVINCES };
