// ============================================================
// CANADA — Federal + provincial tax law, 2026 taxation year.
// All figures CAD. Brackets are marginal: { upTo, rate };
// upTo: null means "and above".
//
// SINGLE SOURCE OF TRUTH: every engine and view must read tax,
// payroll, account-limit, pension and corporate parameters from
// here (via getJurisdiction). Nothing is hard-coded elsewhere.
//
// Indexation used for 2026:
//   Federal  : 2.0 %  (CRA indexation factor for 2026)
//   Québec   : 2.05 % (Revenu Québec, 2026)
//   ON/BC/AB : 2.0 %  (provincial CPI factors — estimates, verify)
// Amounts marked [idx] are 2025 official amounts × the factor,
// rounded per each government's convention. Amounts marked [fixed]
// are not indexed. Amounts marked [est] are planning estimates
// (e.g. pension maxima that depend on quarterly CPI).
// Review this file every January.
// ============================================================

export const TAX_YEAR = 2026;
export const INDEXATION = { federal: 1.020, QC: 1.0205, ON: 1.020, BC: 1.020, AB: 1.020 };

const CA_FED = {
  brackets: [                                   // [idx] 2025: 57,375 / 114,750 / 177,882 / 253,414
    { upTo: 58523, rate: 0.14 },                // lowest rate 14 % (was 15 % before July 2025)
    { upTo: 117045, rate: 0.205 },
    { upTo: 181440, rate: 0.26 },
    { upTo: 258482, rate: 0.29 },
    { upTo: null, rate: 0.33 },
  ],
  creditRate: 0.14,                             // rate applied to most non-refundable credits (= lowest bracket)
  // Basic personal amount: enhanced BPA tapers to the base BPA between the
  // 4th-bracket floor and ceiling. [idx] 2025: 16,129 → 14,538
  bpa: 16452, bpaMin: 14835, bpaTaperFrom: 181440, bpaTaperTo: 258482,
  bpaRate: 0.14,
  employmentAmount: 1500,                       // Canada employment amount [idx] 2025: 1,471
  ageAmount: { amount: 9209, threshold: 46432, rate: 0.15 }, // age 65+ [idx] 2025: 9,028 / 45,522
  pensionAmount: 2000,                          // pension income amount [fixed]
  medicalThreshold: { rate: 0.03, cap: 2891 },  // medical expenses above the lesser of 3 % of net income or the cap [idx] 2025: 2,834
  donation: { first: 200, lowRate: 0.14, highRate: 0.29, topRate: 0.33 },
  capGainsInclusion: 0.50,                      // 2/3 increase cancelled March 2025
  eligibleDivGrossUp: 1.38,
  eligibleDivCredit: 0.150198,                  // federal credit on grossed-up eligible dividend
  nonEligDivGrossUp: 1.15,
  nonEligDivCredit: 0.090301,                   // federal credit on grossed-up non-eligible dividend
};

// Corporate (CCPC) parameters, 2026. Combined rate = federal + provincial.
const CORPORATE = {
  sbdLimit: 500000,                 // small business deduction limit [fixed]
  passiveGrindStart: 50000,         // AAII threshold where SBD starts to grind ($5 per $1)
  passiveGrindEnd: 150000,          // SBD fully eliminated
  fedSB: 0.09, fedGeneral: 0.15,
  passiveRate: 0.5017,              // investment income in a CCPC (fed 38.67 % + QC 11.5 %)
  refundableRate: 0.3067,           // RDTOH refunded on taxable dividend paid
  cdaFraction: 0.50,                // non-taxable half of capital gains -> CDA (tax-free)
  lcge: 1275000,                    // lifetime capital gains exemption (QSBC/QFFP) [idx from 1.25 M, indexation resumed 2026]
  employerCppMultiplier: 1,         // employer matches employee CPP/QPP
  ownerEiExempt: true,              // >40 % voting-share owners are EI-exempt
};

// Province table: brackets, basic personal amount, credit rate, and notes.
const PROV = {
  QC: {
    name: 'Québec', flag: '⚜️',
    brackets: [                                 // [idx 2.05 %] 2025: 53,255 / 106,495 / 129,590
      { upTo: 54345, rate: 0.14 },
      { upTo: 108680, rate: 0.19 },
      { upTo: 132245, rate: 0.24 },
      { upTo: null, rate: 0.2575 },
    ],
    bpa: 18952, bpaRate: 0.14, creditRate: 0.14,  // [idx] 2025: 18,571
    federalAbatement: 0.165,                    // Québec abatement reduces basic federal tax
    // Déduction pour travailleur: 6 % of work income, capped [idx] 2025: 1,420
    workerDeduction: { rate: 0.06, max: 1449 },
    // Montant en raison de l'âge / pour revenus de retraite / personne vivant seule —
    // one combined credit reduced by 18.75 % of family income above the threshold.
    ageAmount: 3986, retirementAmount: 3638, livingAloneAmount: 2172,   // [idx] 2025: 3,906 / 3,565 / 2,128
    seniorReduction: { threshold: 42953, rate: 0.1875 },                // [idx] 2025: 42,090
    contributionsCredit: true,                  // QPP (base) + QPIP + EI premiums give a 14 % credit
    divCredit: 0.117, divCreditNonElig: 0.0342,
    donation: { first: 200, lowRate: 0.20, highRate: 0.24, topRate: 0.2575 },
    provSB: 0.032, provGen: 0.115,
    payroll: 'QC',
    // QESI (Incitatif québécois à l'épargne-études): 10 % of RESP contributions, max 250/yr, 3,600 lifetime
    resp: { grant: 0.10, grantMax: 250, grantLifetime: 3600 },
  },
  ON: {
    name: 'Ontario', flag: '🏙️',
    brackets: [                                 // [idx 2.0 % est] 2025: 52,886 / 105,775 / 150,000 / 220,000
      { upTo: 53944, rate: 0.0505 },
      { upTo: 107891, rate: 0.0915 },
      { upTo: 150000, rate: 0.1116 },
      { upTo: 220000, rate: 0.1216 },
      { upTo: null, rate: 0.1316 },
    ],
    bpa: 13002, bpaRate: 0.0505, creditRate: 0.0505,   // [idx est] 2025: 12,747
    surtax: [{ over: 5824, rate: 0.20 }, { over: 7453, rate: 0.36 }], // [idx est] 2025: 5,710 / 7,307
    // Ontario Health Premium (payable with the return): [{ upTo, base, rate, over, cap }]
    healthPremium: [
      { upTo: 20000, base: 0, rate: 0, over: 0, cap: 0 },
      { upTo: 36000, base: 0, rate: 0.06, over: 20000, cap: 300 },
      { upTo: 48000, base: 300, rate: 0.06, over: 36000, cap: 450 },
      { upTo: 72000, base: 450, rate: 0.25, over: 48000, cap: 600 },
      { upTo: 200000, base: 600, rate: 0.25, over: 72000, cap: 750 },
      { upTo: null, base: 750, rate: 0.25, over: 200000, cap: 900 },
    ],
    contributionsCredit: true,
    divCredit: 0.10, divCreditNonElig: 0.029863,
    donation: { first: 200, lowRate: 0.0505, highRate: 0.1116, topRate: 0.1116 },
    provSB: 0.032, provGen: 0.115,
    payroll: 'ROC',
  },
  BC: {
    name: 'Colombie-Britannique', flag: '🏔️',
    brackets: [                                 // [idx 2.0 % est] 2025: 49,279 / 98,560 / 113,158 / 137,407 / 186,306 / 259,829
      { upTo: 50265, rate: 0.0506 },
      { upTo: 100531, rate: 0.077 },
      { upTo: 115421, rate: 0.105 },
      { upTo: 140155, rate: 0.1229 },
      { upTo: 190032, rate: 0.147 },
      { upTo: 265026, rate: 0.168 },
      { upTo: null, rate: 0.205 },
    ],
    bpa: 13191, bpaRate: 0.0506, creditRate: 0.0506,   // [idx est] 2025: 12,932
    contributionsCredit: true,
    divCredit: 0.12, divCreditNonElig: 0.0196,
    donation: { first: 200, lowRate: 0.0506, highRate: 0.168, topRate: 0.205 },
    provSB: 0.020, provGen: 0.120,
    payroll: 'ROC',
  },
  AB: {
    name: 'Alberta', flag: '🛢️',
    brackets: [                                 // [idx 2.0 % est] 2025: 60,000 / 151,234 / 181,481 / 241,974 / 362,961
      { upTo: 61200, rate: 0.08 },
      { upTo: 154259, rate: 0.10 },
      { upTo: 185111, rate: 0.12 },
      { upTo: 246813, rate: 0.13 },
      { upTo: 370220, rate: 0.14 },
      { upTo: null, rate: 0.15 },
    ],
    bpa: 22769, bpaRate: 0.08, creditRate: 0.08,   // [idx est] 2025: 22,323
    contributionsCredit: true,
    divCredit: 0.0812, divCreditNonElig: 0.0218,
    donation: { first: 200, lowRate: 0.08, highRate: 0.21, topRate: 0.21 },
    provSB: 0.020, provGen: 0.080,
    payroll: 'ROC',
  },
};

// Payroll (employee portion), 2026.
//   CPP/QPP "rate" = base + enhancement. The BASE portion gives a non-refundable
//   credit; the ENHANCEMENT (first additional 1 % + CPP2/QPP2) is a DEDUCTION
//   from income. Self-employed pay both halves (employer half deductible).
const PAYROLL = {
  ROC: {
    cpp: { rate: 0.0595, baseRate: 0.0495, enhRate: 0.01, exempt: 3500, ympe: 74600 },  // YMPE 2026: 74,600
    cpp2: { rate: 0.04, from: 74600, to: 85000 },                                        // YAMPE 2026: 85,000
    ei: { rate: 0.0163, max: 68900, employerMultiplier: 1.4 },                           // MIE 2026: 68,900
    selfEmployedMultiplier: 2,
  },
  QC: {
    cpp: { rate: 0.064, baseRate: 0.054, enhRate: 0.01, exempt: 3500, ympe: 74600 },     // QPP
    cpp2: { rate: 0.04, from: 74600, to: 85000 },
    ei: { rate: 0.0130, max: 68900, employerMultiplier: 1.4 },                           // reduced rate (QPIP province)
    qpip: { rate: 0.00494, selfRate: 0.00878, employerRate: 0.00692, max: 101000 },     // MIE 2026: 101,000
    selfEmployedMultiplier: 2,
  },
};

const ACCOUNTS = [
  { id: 'rrsp', name: 'REER', long: "Régime enregistré d'épargne-retraite", treatment: 'deferred',
    limit: 33810, limitPctIncome: 0.18, note: 'Déductible. Imposable au retrait. Conversion FERR à 71 ans.' },   // 2026 dollar limit
  { id: 'tfsa', name: 'CELI', long: "Compte d'épargne libre d'impôt", treatment: 'taxfree',
    limit: 7000, note: 'Croissance et retraits non imposables. Droits cumulatifs.' },
  { id: 'fhsa', name: 'CELIAPP', long: "Compte d'épargne libre d'impôt pour l'achat d'une première propriété", treatment: 'deferred',
    limit: 8000, lifetime: 40000, note: 'Déductible à la cotisation ET non imposable au retrait (1re propriété).' },
  { id: 'resp', name: 'REEE', long: "Régime enregistré d'épargne-études", treatment: 'education',
    lifetime: 50000, grant: 0.20, grantMax: 500, grantLifetime: 7200, note: 'SCEE 20 % (max 500 $/an, 7 200 $ à vie) + IQEE 10 % au Québec.' },
  { id: 'nonreg', name: 'Non enregistré', long: 'Compte de placement imposable', treatment: 'taxable',
    note: 'Gains en capital (50 % inclus), dividendes majorés/crédités, intérêts pleinement imposables.' },
  { id: 'rrif', name: 'FERR', long: "Fonds enregistré de revenu de retraite", treatment: 'deferred',
    note: 'Décaissement minimum obligatoire selon l\'âge.' },
  { id: 'corp', name: 'Société (CDC)', long: 'Société par actions / compte de dividendes en capital', treatment: 'corporate',
    note: 'Imposition des sociétés, intégration, CDC.' },
];

// RRIF minimum withdrawal factors (age at January 1st). Below 71 the factor is
// 1 / (90 − age). Conversion is mandatory by Dec 31 of the year one turns 71;
// the first minimum is therefore due in the year one turns 72.
const RRIF_MIN = { 71:0.0528,72:0.0540,73:0.0553,74:0.0567,75:0.0582,76:0.0598,77:0.0617,78:0.0636,79:0.0658,80:0.0682,81:0.0708,82:0.0738,83:0.0771,84:0.0808,85:0.0851,86:0.0899,87:0.0955,88:0.1021,89:0.1099,90:0.1192,91:0.1306,92:0.1449,93:0.1634,94:0.1879,95:0.20 };
export const RRIF_CONVERT_AGE = 71;
export const RRIF_FIRST_MIN_AGE = 72;

const CA = {
  country: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', locale: 'fr-CA',
  taxYear: TAX_YEAR, indexation: INDEXATION,
  regionLabel: 'Province', regions: Object.fromEntries(Object.entries(PROV).map(([k, v]) => [k, v.name])),
  defaultRegion: 'QC',
  capGainsInclusion: CA_FED.capGainsInclusion,
  labels: {
    retirement1: 'RRQ / RPC', retirement2: 'PSV (Sécurité de la vieillesse)',
    taxAdvantaged: 'REER', taxFree: 'CELI', education: 'REEE',
  },
  // Public retirement benefits, 2026.
  //   cpp.maxAnnual  [est] max retirement pension at 65 (≈ 1,479 $/mo)
  //   oas.maxAnnual  [est] 65–74 (≈ 748 $/mo, indexed quarterly); 75+ get +10 %
  //   oas.clawbackStart [idx] 2025: 93,454 — recovery tax 15 % of net income above
  pensions: {
    cpp: { name: 'RRQ / RPC', maxAnnual: 17750, avgAnnual: 10000, startAge: 65, minAge: 60, maxAge: 70, defer: 0.084, early: -0.072 },
    oas: { name: 'PSV', maxAnnual: 8975, startAge: 65, minAge: 65, maxAge: 70, clawbackStart: 95323, clawbackRate: 0.15, defer: 0.072, bonus75: 0.10 },
  },
  fed: CA_FED, prov: PROV, payroll: PAYROLL, accounts: ACCOUNTS, rrifMin: RRIF_MIN,
  corporate: CORPORATE,
  salesTax: { gst: 0.05, qst: 0.09975, hstON: 0.13, registrationThreshold: 30000,
    quickMethod: { gstServices: 0.036, qstServices: 0.066, gstGoods: 0.018, qstGoods: 0.034 } },
  installments: { thresholdQC: 1800, thresholdROC: 3000 },
  // RDSP — Canada Disability Savings Grant / Bond, 2026 [idx 2.0 %] (2025: 114,750 / 37,487 / 59,822)
  rdsp: { grantIncomeThreshold: 117045, bondFullThreshold: 38237, bondPhaseout: 61018, grantLifetime: 70000, bondLifetime: 20000, bondAnnual: 1000, maxAge: 49,
    tiers: [{ upTo: 500, match: 3 }, { upTo: 1000, match: 2 }], lowMatch: 1, lowMatchUpTo: 1000 },
  // Probate / estate administration fees by province (estate value based)
  probate: {
    QC: { rate: 0, note: 'Testament notarié : aucune homologation (vérification judiciaire seulement pour un testament olographe/devant témoins).' },
    ON: { rate: 0.015, exempt: 50000, note: 'Impôt sur l’administration des successions : 1,5 % au-delà de 50 000 $.' },
    BC: { rate: 0.014, exempt: 50000, lowRate: 0.006, lowFrom: 25000, note: '0,6 % de 25 000 à 50 000 $, 1,4 % au-delà.' },
    AB: { flatMax: 525, note: 'Frais fixes plafonnés à 525 $.' },
  },
  // Mortgage qualification ratios (federally regulated lenders)
  lending: { gds: 0.39, tds: 0.44, stressTestBuffer: 0.02, stressTestFloor: 0.0525, minDownPct: 0.05, minDownAbove500k: 0.10, insuredCap: 1500000 },
  // Contribution/credit constants used by planning modules
  donation: { firstTier: 200 },
  prescribedRate: 0.03,   // CRA prescribed rate (Q3 2026) — verify quarterly
};
// Derived: OAS fully clawed back at this net income
CA.pensions.oas.clawbackFull = CA.pensions.oas.clawbackStart + CA.pensions.oas.maxAnnual / CA.pensions.oas.clawbackRate;

export default CA;
export { PROV as CA_PROVINCES };
