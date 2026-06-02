// ============================================================
// Cross-Border / Snowbird Planning — View
// Canada–US focus: SPT, estate tax, key issues, disclaimer
// render({ store, client, jur, navigate }) → HTMLElement
// ============================================================
import { h, money, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, PALETTE } from '../charts.js';

// ---------------------------------------------------------------------------
// Section 1 — Substantial Presence Test (SPT)
// ---------------------------------------------------------------------------

function sptSection() {
  let daysThis = 120;
  let daysLast = 90;
  let days2Ago = 60;

  const result = h('div', {});

  function sptRedraw() {
    const spt = daysThis + daysLast / 3 + days2Ago / 6;
    const deemed = daysThis >= 31 && spt >= 183;
    const closerConn = !deemed && daysThis < 183;
    const healthRisk = daysThis > 182;

    const sptRounded = Math.round(spt * 10) / 10;

    const statusClass = deemed ? 'neg' : 'pos';
    const statusText = deemed
      ? t('Résident américain présumé', 'Deemed US Resident')
      : t('Test non déclenché', 'Test Not Triggered');
    const statusIcon = deemed ? 'warning' : 'check';

    const pairs = [
      [
        t('Jours cette année (poids 1)', 'Days this year (weight 1)'),
        num(daysThis) + ' ' + t('jours', 'days'),
      ],
      [
        t('Jours an passé (poids 1/3)', 'Days last year (weight 1/3)'),
        num(daysLast) + ' ' + t('jours', 'days') + ' → ' + num(Math.round(daysLast / 3 * 10) / 10),
      ],
      [
        t('Jours il y a 2 ans (poids 1/6)', 'Days 2 yrs ago (weight 1/6)'),
        num(days2Ago) + ' ' + t('jours', 'days') + ' → ' + num(Math.round(days2Ago / 6 * 10) / 10),
      ],
      [
        t('Total SPT pondéré', 'Weighted SPT total'),
        num(sptRounded) + ' / 183',
        spt >= 183 ? 'neg' : 'pos',
      ],
      [
        t('Jours cette année >= 31', 'Days this year >= 31'),
        daysThis >= 31 ? t('Oui', 'Yes') : t('Non', 'No'),
        daysThis >= 31 ? 'neg' : 'pos',
      ],
    ];

    const chips = [
      h('span', {
        class: 'chip ' + statusClass,
        html: icon(statusIcon, 13) + ' ' + statusText,
        style: { display: 'inline-flex', alignItems: 'center', gap: '5px', marginRight: '8px' },
      }),
    ];

    if (closerConn) {
      chips.push(
        h('span', {
          class: 'chip warn',
          html: icon('doc', 13) + ' ' + t('Exception: Formulaire 8840 disponible', 'Exception: Form 8840 available'),
          style: { display: 'inline-flex', alignItems: 'center', gap: '5px', marginRight: '8px' },
        }),
      );
    }

    if (healthRisk) {
      chips.push(
        h('span', {
          class: 'chip neg',
          html: icon('warning', 13) + ' ' + t('Risque couverture santé provinciale', 'Provincial health coverage at risk'),
          style: { display: 'inline-flex', alignItems: 'center', gap: '5px' },
        }),
      );
    }

    result.replaceChildren(
      h('div', { class: 'flex', style: { flexWrap: 'wrap', gap: '6px', marginBottom: '12px' } }, ...chips),
      statList(pairs),
      deemed
        ? h('p', { class: 'tiny muted', style: { marginTop: '10px', lineHeight: '1.6' } },
            t(
              'Vous êtes présumé résident fiscal américain. Vous devez produire une déclaration US (Form 1040) sur votre revenu mondial, sauf exception applicable (ex. : Convention fiscale Canada-États-Unis, Form 8840 si < 183 jours cette année).',
              'You are deemed a US tax resident. You must file a US return (Form 1040) on worldwide income unless an exception applies (e.g., Canada-US Tax Treaty, Form 8840 if < 183 days this year).',
            ),
          )
        : h('p', { class: 'tiny muted', style: { marginTop: '10px', lineHeight: '1.6' } },
            closerConn
              ? t(
                  "Le test SPT n’est pas déclenché. Si vous avez passé >= 31 jours cette année et que le total atteint 183, mais que vous avez moins de 183 jours cette année, vous pouvez déposer le formulaire 8840 (Closer Connection Exception) pour ne pas être considéré résident fiscal américain.",
                  'The SPT is not triggered. If you had >= 31 days this year and the weighted total reaches 183, but you spent fewer than 183 days this year, you may file Form 8840 (Closer Connection Exception) to avoid US tax residency.',
                )
              : t(
                  "Le test de présence substantielle n’est pas déclenché pour cette année. Continuez à surveiller vos jours chaque année.",
                  'The Substantial Presence Test is not triggered this year. Continue tracking your days annually.',
                ),
          ),
    );
  }

  sptRedraw();

  return card(
    t('Test de présence substantielle (SPT)', 'Substantial Presence Test (SPT)'),
    {
      sub: t(
        'SPT = jours cette année + jours an passé / 3 + jours il y a 2 ans / 6 — seuil : 183',
        'SPT = days this year + days last year / 3 + days 2 yrs ago / 6 — threshold: 183',
      ),
    },
    h('div', { class: 'grid cols-3' },
      slider({
        label: t('Jours aux États-Unis cette année', 'Days in US this year'),
        value: daysThis,
        min: 0,
        max: 365,
        step: 1,
        format: (v) => num(v) + ' ' + t('j', 'd'),
        onInput: (v) => { daysThis = v; sptRedraw(); },
      }),
      slider({
        label: t('Jours aux États-Unis an passé', 'Days in US last year'),
        value: daysLast,
        min: 0,
        max: 365,
        step: 1,
        format: (v) => num(v) + ' ' + t('j', 'd'),
        onInput: (v) => { daysLast = v; sptRedraw(); },
      }),
      slider({
        label: t('Jours aux États-Unis il y a 2 ans', 'Days in US two years ago'),
        value: days2Ago,
        min: 0,
        max: 365,
        step: 1,
        format: (v) => num(v) + ' ' + t('j', 'd'),
        onInput: (v) => { days2Ago = v; sptRedraw(); },
      }),
    ),
    h('div', { class: 'sep' }),
    result,
  );
}

// ---------------------------------------------------------------------------
// Section 2 — Snowbird day tracker guidance
// ---------------------------------------------------------------------------

function snowbirdGuidanceCard() {
  const rules = [
    {
      icon: 'globe',
      color: PALETTE[0],
      title: t('Résidence canadienne — 183 jours', 'Canadian Residency — 183 Days'),
      text: t(
        'La plupart des provinces exigent que vous soyez présent au Canada au moins 183 jours par année civile pour conserver votre résidence fiscale canadienne et éviter la règle de départ.',
        'Most provinces require you to be present in Canada at least 183 days per calendar year to maintain Canadian tax residency and avoid the departure tax rules.',
      ),
    },
    {
      icon: 'warning',
      color: PALETTE[2],
      title: t('SPT américain — seuil 183 jours pondérés', 'US SPT — 183 Weighted-Day Threshold'),
      text: t(
        'Le test de présence substantielle américain utilise une formule pondérée sur 3 ans. Avec >= 31 jours cette année et un total pondéré >= 183, vous devenez résident fiscal américain présumé.',
        'The US Substantial Presence Test uses a weighted 3-year formula. With >= 31 days this year and a weighted total >= 183, you become a deemed US tax resident.',
      ),
    },
    {
      icon: 'doc',
      color: PALETTE[4],
      title: t('ESTA / Dispense de visa — limite 6 mois', 'ESTA / Visa Waiver — 6-Month Limit'),
      text: t(
        'Les Canadiens entrant aux États-Unis sans visa dans le cadre de l\'ESTA ou sous statut B-2 ne peuvent généralement pas dépasser 6 mois (environ 182 jours) par séjour ou par an sans obtenir un visa approprié.',
        'Canadians entering the US under ESTA or B-2 visitor status are generally limited to 6 months (approx. 182 days) per entry or per year without obtaining an appropriate visa.',
      ),
    },
    {
      icon: 'gov',
      color: PALETTE[3],
      title: t('Santé provinciale — seuil variable', 'Provincial Health — Variable Threshold'),
      text: t(
        'Chaque province fixe ses propres règles. Par exemple, la Colombie-Britannique et l\'Ontario exigent typiquement 153 à 182 jours de présence par année civile pour maintenir la couverture RAMQ/OHIP/MSP. Vérifiez les règles de votre province avant de prolonger votre séjour.',
        'Each province sets its own rules. BC and Ontario typically require 153 to 182 days of presence per calendar year to maintain RAMQ/OHIP/MSP coverage. Verify your province rules before extending your stay.',
      ),
    },
    {
      icon: 'check',
      color: PALETTE[6],
      title: t('Règle du 182e jour — zone de confort recommandée', 'The 182-Day Rule — Recommended Comfort Zone'),
      text: t(
        'La plupart des planificateurs recommandent de ne pas dépasser 182 jours aux États-Unis par année civile pour rester bien en dessous des seuils américains et provinciaux en même temps.',
        'Most planners recommend staying under 182 days in the US per calendar year to comfortably stay below both the US and provincial thresholds simultaneously.',
      ),
    },
  ];

  const items = rules.map((r) =>
    h('div', {
      class: 'flex',
      style: { gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' },
    },
      h('span', { html: icon(r.icon, 20), style: { color: r.color, flex: 'none', marginTop: '2px' } }),
      h('div', {},
        h('b', {}, r.title),
        h('div', { class: 'tiny muted', style: { marginTop: '4px', lineHeight: '1.6' } }, r.text),
      ),
    ),
  );

  return card(
    t('Guide de suivi des jours — Oiseau de neige', 'Day Tracker Guide — Snowbird'),
    { sub: t('Règles clés à connaître avant de planifier votre séjour', 'Key rules to know before planning your stay') },
    ...items,
  );
}

// ---------------------------------------------------------------------------
// Section 3 — US Estate Tax Exposure for Canadians
// ---------------------------------------------------------------------------

function estateSection() {
  const UNIFIED_CREDIT = 13990000; // 2024 US unified credit (USD)
  let usSitus = 500000;
  let worldwide = 2000000;

  const result = h('div', {});

  function estateRedraw() {
    const safeWorldwide = worldwide > 0 ? worldwide : 1;
    const ratio = Math.min(1, usSitus / safeWorldwide);
    const proratedExemption = UNIFIED_CREDIT * ratio;
    const taxableUS = Math.max(0, usSitus - proratedExemption);
    const estimatedTax = taxableUS * 0.40;
    const exposed = taxableUS > 0;

    const pairs = [
      [t('Actifs de source américaine (US situs)', 'US-Situs Assets'), money(usSitus, { currency: 'USD' })],
      [t('Succession mondiale totale', 'Total Worldwide Estate'), money(worldwide, { currency: 'USD' })],
      [t('Ratio US situs / mondial', 'US-Situs / Worldwide Ratio'), (ratio * 100).toFixed(1) + ' %'],
      [
        t('Exemption unifiée proratisée (traité CA-US)', 'Prorated Unified Credit (CA-US Treaty)'),
        money(Math.round(proratedExemption), { currency: 'USD' }),
      ],
      [
        t('Actifs US imposables estimés', 'Estimated Taxable US Assets'),
        money(Math.round(taxableUS), { currency: 'USD' }),
        exposed ? 'neg' : 'pos',
      ],
      [
        t('Impôt successoral américain estimé (taux 40 %)', 'Estimated US Estate Tax (40% rate)'),
        exposed ? money(Math.round(estimatedTax), { currency: 'USD' }) : t('Aucun', 'None'),
        exposed ? 'neg' : 'pos',
      ],
    ];

    const barSvg = barChart({
      xLabels: [
        t('Actifs US', 'US Assets'),
        t('Exempt. proratisée', 'Prorated Exempt.'),
        t('Impôt estimé', 'Est. Tax'),
      ],
      series: [
        { color: PALETTE[0], values: [usSitus, Math.round(proratedExemption), 0] },
        { color: PALETTE[4], values: [0, 0, Math.round(estimatedTax)] },
      ],
      stacked: false,
      height: 220,
    });

    result.replaceChildren(
      h('div', { class: 'flex', style: { flexWrap: 'wrap', gap: '6px', marginBottom: '12px' } },
        h('span', {
          class: 'chip ' + (exposed ? 'neg' : 'pos'),
          html: icon(exposed ? 'warning' : 'check', 13) + ' ' + (exposed
            ? t('Exposition potentielle à l\'impôt successoral US', 'Potential US Estate Tax Exposure')
            : t('Aucune exposition estimée', 'No Estimated Exposure')),
          style: { display: 'inline-flex', alignItems: 'center', gap: '5px' },
        }),
      ),
      statList(pairs),
      h('div', { class: 'sep' }),
      h('div', { html: barSvg }),
      legend([
        { color: PALETTE[0], label: t('Actifs / Exemption', 'Assets / Exemption') },
        { color: PALETTE[4], label: t('Impôt estimé', 'Est. Tax') },
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '10px', lineHeight: '1.6' } },
        t(
          'La Convention fiscale Canada-États-Unis permet aux Canadiens de bénéficier du crédit unifié américain au prorata (actifs US / succession mondiale). Un crédit pour impôt étranger peut réduire davantage l\'impôt. Estimation simplifiée — consultez un spécialiste.',
          'The Canada-US Tax Treaty allows Canadians to claim a prorated US unified credit (US assets / worldwide estate). A foreign tax credit may further reduce the tax. This is a simplified estimate — consult a cross-border specialist.',
        ),
      ),
    );
  }

  estateRedraw();

  return card(
    t('Exposition à l\'impôt successoral américain', 'US Estate Tax Exposure for Canadians'),
    {
      sub: t(
        'Biens de source américaine (immobilier US, actions US) détenus par des Canadiens',
        'US-Situs assets (US real estate, US stocks) held by Canadians',
      ),
    },
    h('div', { class: 'grid cols-2' },
      slider({
        label: t('Actifs de source américaine (USD)', 'US-Situs Assets (USD)'),
        value: usSitus,
        min: 0,
        max: 5000000,
        step: 25000,
        format: (v) => money(v, { currency: 'USD', compact: true }),
        onInput: (v) => { usSitus = v; estateRedraw(); },
      }),
      slider({
        label: t('Succession mondiale totale (USD)', 'Total Worldwide Estate (USD)'),
        value: worldwide,
        min: 100000,
        max: 20000000,
        step: 100000,
        format: (v) => money(v, { currency: 'USD', compact: true }),
        onInput: (v) => { worldwide = v; estateRedraw(); },
      }),
    ),
    h('div', { class: 'sep' }),
    result,
  );
}

// ---------------------------------------------------------------------------
// Section 4 — Key cross-border issues
// ---------------------------------------------------------------------------

function crossBorderIssuesCard() {
  const items = [
    {
      kind: 'pos',
      title: t('REER reconnu par le traité (report d\'impôt US)', 'RRSP Recognized by Treaty (US Tax Deferral)'),
      text: t(
        'La Convention Canada-États-Unis reconnaît le REER comme un régime de retraite. Les résidents américains (citoyens ou titulaires de carte verte) peuvent généralement différer l\'imposition américaine sur la croissance du REER jusqu\'aux retraits, sous réserve d\'un choix de traité (Treaty Election).',
        'The Canada-US Tax Treaty recognizes the RRSP as a retirement plan. US residents (citizens or green card holders) can generally defer US tax on RRSP growth until withdrawal, subject to a Treaty Election filed with Form 8891 or on the tax return.',
      ),
    },
    {
      kind: 'neg',
      title: t('CELI NON reconnu par l\'IRS — revenus imposables et déclaration trust', 'TFSA NOT Recognized by IRS — Taxable Income + Trust Reporting'),
      text: t(
        'L\'IRS ne reconnaît pas le CELI comme un régime de retraite exonéré. Les résidents américains doivent déclarer les revenus de placement du CELI annuellement. De plus, le CELI peut être considéré comme un trust étranger (Form 3520/3520-A), engendrant des obligations de déclaration onéreuses.',
        'The IRS does not recognize the TFSA as a tax-exempt retirement plan. US residents must report TFSA investment income annually. Additionally, the TFSA may be treated as a foreign trust (Form 3520/3520-A), creating burdensome reporting requirements.',
      ),
    },
    {
      kind: 'neg',
      title: t('REEE et REEI — problèmes de déclaration pour les personnes américaines', 'RESP and RDSP — Reporting Issues for US Persons'),
      text: t(
        'Les REEE et REEI peuvent être traités comme des trusts étrangers par l\'IRS et nécessiter des déclarations complexes (Form 3520). Les subventions gouvernementales peuvent être imposables aux États-Unis. Obtenez des conseils spécialisés avant d\'ouvrir ou de maintenir ces régimes.',
        'RESPs and RDSPs may be treated as foreign trusts by the IRS and require complex filings (Form 3520). Government grants may be taxable in the US. Seek specialized advice before opening or maintaining these plans.',
      ),
    },
    {
      kind: 'neg',
      title: t('Règles PFIC — Fonds communs et FNB canadiens pour personnes américaines', 'PFIC Rules — Canadian Mutual Funds and ETFs for US Persons'),
      text: t(
        'Les fonds communs de placement et les FNB canadiens sont généralement considérés comme des sociétés d\'investissement étrangères passives (PFIC) par l\'IRS. Les gains et distributions sont soumis à une imposition pénalisante et à des déclarations complexes (Form 8621). Les personnes américaines au Canada devraient éviter ces produits.',
        'Canadian mutual funds and ETFs are generally treated as Passive Foreign Investment Companies (PFICs) by the IRS. Gains and distributions are subject to punitive taxation and complex filing (Form 8621). US persons in Canada should generally avoid these products.',
      ),
    },
    {
      kind: 'neg',
      title: t('FBAR et FATCA — Déclaration de comptes étrangers', 'FBAR and FATCA — Foreign Account Reporting'),
      text: t(
        'Les personnes américaines ayant des comptes bancaires canadiens dépassant 10 000 USD au total doivent produire le rapport FBAR (FinCEN 114). La FATCA (Form 8938) exige la déclaration d\'actifs financiers étrangers dépassant les seuils applicables. Les pénalités pour non-conformité sont sévères.',
        'US persons with Canadian bank accounts exceeding USD 10,000 in aggregate must file FBAR (FinCEN 114). FATCA (Form 8938) requires reporting foreign financial assets above applicable thresholds. Non-compliance penalties are severe.',
      ),
    },
    {
      kind: 'warn',
      title: t('Impôt de départ canadien — résidents quittant le Canada', 'Canadian Departure Tax — Residents Leaving Canada'),
      text: t(
        'Lorsqu\'un résident canadien cesse d\'être résident, il est réputé avoir disposé de la plupart de ses actifs à la juste valeur marchande (règle de disposition présumée). Cela peut déclencher des gains en capital imposables. Une planification préalable est essentielle.',
        'When a Canadian resident ceases to be a resident, they are deemed to have disposed of most assets at fair market value (deemed disposition rule). This can trigger taxable capital gains. Pre-departure planning is essential.',
      ),
    },
    {
      kind: 'neg',
      title: t('Citoyens américains — imposition sur le revenu mondial', 'US Citizens — Worldwide Income Taxation'),
      text: t(
        'Les citoyens américains résidant au Canada sont imposés par les États-Unis sur leur revenu mondial, quelle que soit leur résidence. Le crédit pour impôt étranger et la Convention Canada-États-Unis peuvent réduire la double imposition, mais la planification est complexe et coûteuse.',
        'US citizens residing in Canada are taxed by the US on their worldwide income regardless of residence. The foreign tax credit and Canada-US Treaty can mitigate double taxation, but planning is complex and costly.',
      ),
    },
  ];

  const chipIcons = { pos: 'check', neg: 'warning', warn: 'warning' };

  const rows = items.map((item) =>
    h('div', {
      class: 'flex',
      style: { gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' },
    },
      h('span', {
        class: 'chip ' + item.kind,
        html: icon(chipIcons[item.kind], 13),
        style: { flex: 'none', marginTop: '1px', display: 'inline-flex', alignItems: 'center' },
      }),
      h('div', {},
        h('b', {}, item.title),
        h('div', { class: 'tiny muted', style: { marginTop: '3px', lineHeight: '1.6' } }, item.text),
      ),
    ),
  );

  return card(
    t('Enjeux fiscaux transfrontaliers clés', 'Key Cross-Border Tax Issues'),
    {
      sub: t(
        'Canada–États-Unis : régimes enregistrés, déclarations, impôts',
        'Canada–US: registered plans, reporting obligations, taxes',
      ),
      right: h('span', { html: icon('globe', 20), style: { color: PALETTE[0] } }),
    },
    ...rows,
  );
}

// ---------------------------------------------------------------------------
// Section 5 — Disclaimer
// ---------------------------------------------------------------------------

function disclaimerCard() {
  return card(
    t('Avertissement important', 'Important Disclaimer'),
    { class: '' },
    h('div', {
      class: 'flex',
      style: { gap: '12px', alignItems: 'flex-start' },
    },
      h('span', { html: icon('warning', 24), style: { color: 'var(--neg)', flex: 'none' } }),
      h('div', { class: 'muted tiny', style: { lineHeight: '1.7' } },
        h('b', { style: { display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text)' } },
          t(
            'La fiscalité transfrontalière est extrêmement complexe.',
            'Cross-border taxation is extremely complex.',
          ),
        ),
        t(
          'Les informations présentées dans cet outil sont fournies à titre éducatif et informatif uniquement. Elles ne constituent pas un avis fiscal, juridique ou financier. Les règles fiscales transfrontalières Canada-États-Unis évoluent fréquemment et varient selon la situation individuelle, le statut de résidence, la citoyenneté et d\'autres facteurs. Les estimations présentées sont simplifiées et peuvent ne pas refléter votre situation exacte.',
          'The information presented in this tool is provided for educational and informational purposes only. It does not constitute tax, legal, or financial advice. Canada-US cross-border tax rules change frequently and vary based on individual circumstances, residency status, citizenship, and other factors. Estimates shown are simplified and may not reflect your exact situation.',
        ),
        h('br', {}),
        h('b', {},
          t(
            'Consultez impérativement un spécialiste en fiscalité transfrontalière avant de prendre toute décision.',
            'Always consult a qualified cross-border tax specialist before making any decisions.',
          ),
        ),
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------

export function render({ client, jur }) {
  const cur = jur.currency;

  // KPI row — summary indicators
  const kpiRow = h('div', { class: 'grid cols-4 span-full' },
    kpi({
      iconName: 'globe',
      label: t('Test de présence substantielle', 'Substantial Presence Test'),
      value: '183 ' + t('jours', 'days'),
      sub: t('Seuil pondéré US (jours cette année + L-1/3 + L-2/6)', 'Weighted US threshold (this yr + L-1/3 + L-2/6)'),
    }),
    kpi({
      iconName: 'gov',
      label: t('Exemption successorale US', 'US Estate Exemption'),
      value: money(13990000, { currency: 'USD', compact: true }),
      sub: t('Crédit unifié 2024 — proratisé par traité CA-US', '2024 Unified credit — prorated by CA-US Treaty'),
    }),
    kpi({
      iconName: 'warning',
      label: t('ESTA / B-2 — séjour max', 'ESTA / B-2 — Max Stay'),
      value: '182 ' + t('jours', 'days'),
      sub: t('Limite approximative par entrée ou par an', 'Approximate limit per entry or per year'),
      accent: 'var(--warn)',
    }),
    kpi({
      iconName: 'check',
      label: t('Santé provinciale — seuil typique', 'Provincial Health — Typical Threshold'),
      value: '153–182 ' + t('j', 'd'),
      sub: t('Présence minimale requise au Canada (varie par province)', 'Min. presence required in Canada (varies by province)'),
    }),
  );

  return h('div', { class: 'grid' },
    kpiRow,
    h('div', { class: 'span-full' }, sptSection()),
    h('div', { class: 'span-full' }, snowbirdGuidanceCard()),
    h('div', { class: 'span-full' }, estateSection()),
    h('div', { class: 'span-full' }, crossBorderIssuesCard()),
    h('div', { class: 'span-full' }, disclaimerCard()),
  );
}
