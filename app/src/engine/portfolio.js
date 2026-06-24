// ============================================================
// Portfolio engine — asset allocation, capital market
// assumptions, rebalancing, fee drag, risk questionnaire.
// ============================================================
import { t } from '../i18n.js';

// ---- Asset classes --------------------------------------------------------

export const ASSET_CLASSES = [
  {
    key: 'equity',
    color: '#C6AC8F',
    label: () => t('Actions', 'Equity'),
    ret: 0.072,
    vol: 0.16,
  },
  {
    key: 'fixed',
    color: '#6E8CA0',
    label: () => t('Obligations', 'Fixed income'),
    ret: 0.038,
    vol: 0.06,
  },
  {
    key: 'cash',
    color: '#C2922F',
    label: () => t('Encaisse', 'Cash'),
    ret: 0.027,
    vol: 0.01,
  },
  {
    key: 'alt',
    color: '#8A6E4C',
    label: () => t('Alternatifs', 'Alternatives'),
    ret: 0.06,
    vol: 0.12,
  },
  {
    key: 'realestate',
    color: '#B0573F',
    label: () => t('Immobilier', 'Real estate'),
    ret: 0.045,
    vol: 0.10,
  },
];

export function assetClassOf(key) {
  return ASSET_CLASSES.find(ac => ac.key === key) || ASSET_CLASSES[0];
}

// ---- Target models by risk profile ----------------------------------------

export const TARGET_MODELS = {
  conservative: { equity: 0.30, fixed: 0.55, cash: 0.10, alt: 0.05, realestate: 0 },
  balanced:     { equity: 0.55, fixed: 0.30, cash: 0.05, alt: 0.10, realestate: 0 },
  growth:       { equity: 0.75, fixed: 0.15, cash: 0.03, alt: 0.07, realestate: 0 },
  aggressive:   { equity: 0.90, fixed: 0.03, cash: 0.02, alt: 0.05, realestate: 0 },
};

export function targetModelFor(riskProfile) {
  return TARGET_MODELS[riskProfile] || TARGET_MODELS.balanced;
}

// ---- Infer holdings from client.assets when none saved --------------------

export function defaultHoldingsFromAssets(client) {
  const rp = client.riskProfile || 'balanced';
  const model = targetModelFor(rp);
  const holdings = [];
  let counter = 0;

  for (const asset of (client.assets || [])) {
    const type = asset.type || '';
    const value = asset.value || 0;
    const label = asset.label || t('Placement', 'Investment');

    // Determine asset class from account type
    if (type === 'cash') {
      holdings.push({
        id: asset.id || ('h' + (counter++)),
        name: label,
        assetClass: 'cash',
        value,
        mer: 0,
      });
    } else if (type === 'realestate') {
      holdings.push({
        id: asset.id || ('h' + (counter++)),
        name: label,
        assetClass: 'realestate',
        value,
        mer: 0,
      });
    } else {
      // Investment accounts: deferred (rrsp, rrif, 401k, ira, fhsa),
      // taxfree (tfsa, roth, isa), taxable (nonreg, gia), etc.
      // Split across equity / fixed based on model ratio, but produce
      // a single blended holding per account to keep the list readable.
      const equityW = model.equity || 0.55;
      const fixedW  = model.fixed  || 0.30;
      const altW    = model.alt    || 0;
      const cashW   = model.cash   || 0;

      // Equity slice
      if (equityW > 0) {
        holdings.push({
          id: (asset.id || ('h' + counter)) + '_eq',
          name: label + ' — ' + t('Actions', 'Equity'),
          assetClass: 'equity',
          value: Math.round(value * equityW),
          mer: 0.012,
        });
      }
      // Fixed slice
      if (fixedW > 0) {
        holdings.push({
          id: (asset.id || ('h' + counter)) + '_fi',
          name: label + ' — ' + t('Obligations', 'Fixed income'),
          assetClass: 'fixed',
          value: Math.round(value * fixedW),
          mer: 0.012,
        });
      }
      // Alt slice
      if (altW > 0) {
        holdings.push({
          id: (asset.id || ('h' + counter)) + '_al',
          name: label + ' — ' + t('Alternatifs', 'Alternatives'),
          assetClass: 'alt',
          value: Math.round(value * altW),
          mer: 0.012,
        });
      }
      // Cash slice
      if (cashW > 0) {
        holdings.push({
          id: (asset.id || ('h' + counter)) + '_ca',
          name: label + ' — ' + t('Encaisse', 'Cash'),
          assetClass: 'cash',
          value: Math.round(value * cashW),
          mer: 0.0,
        });
      }
      counter++;
    }
  }

  // If no assets at all, return a single placeholder holding
  if (!holdings.length) {
    holdings.push({
      id: 'placeholder',
      name: t('Portefeuille équilibré', 'Balanced portfolio'),
      assetClass: 'equity',
      value: 0,
      mer: 0.012,
    });
  }

  return holdings;
}

// ---- Allocation computation -----------------------------------------------

/**
 * Returns { byClass: { equity:{value,weight}, ... }, total }
 */
export function computeAllocation(holdings) {
  const byClass = {};
  for (const ac of ASSET_CLASSES) byClass[ac.key] = { value: 0, weight: 0 };

  let total = 0;
  for (const h of holdings) {
    const cls = h.assetClass || 'equity';
    if (byClass[cls] == null) byClass[cls] = { value: 0, weight: 0 };
    byClass[cls].value += h.value || 0;
    total += h.value || 0;
  }

  for (const key of Object.keys(byClass)) {
    byClass[key].weight = total > 0 ? byClass[key].value / total : 0;
  }

  return { byClass, total };
}

// ---- Portfolio expected return & volatility (simplified) ------------------

/**
 * weights: { equity: 0.55, fixed: 0.30, ... } (fractions summing to 1)
 * Returns { expectedReturn, volatility }
 */
export function expectedReturnVol(weights) {
  let expectedReturn = 0;
  let variance = 0;

  for (const ac of ASSET_CLASSES) {
    const w = weights[ac.key] || 0;
    expectedReturn += w * ac.ret;
    // Simplified: ignore cross-correlations, apply a 0.85 diversification factor
    variance += (w * ac.vol) ** 2;
  }

  // Diversification factor: sqrt(variance) * 0.85 to account for partial correlations
  const volatility = Math.sqrt(variance) * 0.85;

  return { expectedReturn, volatility };
}

// ---- Fee calculations -----------------------------------------------------

export function weightedMER(holdings) {
  const total = holdings.reduce((s, h) => s + (h.value || 0), 0);
  if (total === 0) return 0;
  return holdings.reduce((s, h) => s + (h.value || 0) * (h.mer || 0), 0) / total;
}

/**
 * Future value of fee drag over `years` at `grossReturn`.
 * FV_gross - FV_net = V * ((1+grossReturn)^years - (1+grossReturn-mer)^years)
 */
export function feeDrag(totalValue, mer, years, grossReturn) {
  if (!totalValue || !mer || !years || grossReturn == null) return 0;
  const fvGross = totalValue * Math.pow(1 + grossReturn, years);
  const fvNet   = totalValue * Math.pow(1 + grossReturn - mer, years);
  return Math.max(0, fvGross - fvNet);
}

// ---- Rebalancing actions --------------------------------------------------

/**
 * Returns array of { assetClass, label, currentValue, targetValue, action, amount }
 * action: 'buy' | 'sell' | 'hold'
 */
export function rebalanceActions(holdings, targetModel, total) {
  const alloc = computeAllocation(holdings);
  const result = [];

  for (const ac of ASSET_CLASSES) {
    const targetWeight = targetModel[ac.key] || 0;
    const currentValue = alloc.byClass[ac.key]?.value || 0;
    const targetValue  = total * targetWeight;
    const diff = targetValue - currentValue;
    const action = Math.abs(diff) < 1 ? 'hold' : diff > 0 ? 'buy' : 'sell';

    result.push({
      assetClass: ac.key,
      label: ac.label(),
      color: ac.color,
      currentValue,
      targetValue,
      amount: Math.abs(diff),
      action,
    });
  }

  return result;
}

// ---- Risk questionnaire ---------------------------------------------------

export function riskQuestionnaire() {
  return [
    {
      q: t(
        'Quel est votre horizon de placement principal ?',
        'What is your primary investment time horizon?'
      ),
      options: [
        { label: t('Moins de 3 ans', 'Less than 3 years'),  score: 1 },
        { label: t('3 à 5 ans',      '3 to 5 years'),       score: 2 },
        { label: t('5 à 10 ans',     '5 to 10 years'),      score: 3 },
        { label: t('10 à 20 ans',    '10 to 20 years'),     score: 4 },
        { label: t('Plus de 20 ans', 'More than 20 years'), score: 5 },
      ],
    },
    {
      q: t(
        'Si votre portefeuille perdait 20 % en un an, quelle serait votre réaction ?',
        'If your portfolio lost 20% in one year, what would you do?'
      ),
      options: [
        { label: t('Vendre tout immédiatement',            'Sell everything immediately'),  score: 1 },
        { label: t('Vendre une partie',                    'Sell a portion'),               score: 2 },
        { label: t('Ne rien faire',                        'Do nothing'),                   score: 3 },
        { label: t('Acheter un peu plus',                  'Buy a little more'),            score: 4 },
        { label: t('Investir davantage pour profiter de la baisse', 'Invest more to take advantage of the dip'), score: 5 },
      ],
    },
    {
      q: t(
        'Quelle proportion de votre portefeuille êtes-vous prêt(e) à risquer pour obtenir un rendement potentiellement plus élevé ?',
        'What proportion of your portfolio are you willing to put at risk for potentially higher returns?'
      ),
      options: [
        { label: t('0 % — je préfère la sécurité totale', '0% — I prefer full safety'),         score: 1 },
        { label: t('Jusqu’à 25 %',                        'Up to 25%'),                          score: 2 },
        { label: t('Jusqu’à 50 %',                        'Up to 50%'),                          score: 3 },
        { label: t('Jusqu’à 75 %',                        'Up to 75%'),                          score: 4 },
        { label: t('100 % — je vise la croissance maximale', '100% — I aim for maximum growth'), score: 5 },
      ],
    },
    {
      q: t(
        'Quel niveau de fluctuation annuelle pouvez-vous tolérer ?',
        'What level of annual fluctuation can you tolerate?'
      ),
      options: [
        { label: t('Quasi nulle (CPG, fonds monétaire)', 'Near zero (GIC, money market)'),       score: 1 },
        { label: t('Faible (±5 %)',                      'Low (±5%)'),                           score: 2 },
        { label: t('Modérée (±10-15 %)',                 'Moderate (±10–15%)'),                  score: 3 },
        { label: t('Élevée (±20-25 %)',                  'High (±20–25%)'),                      score: 4 },
        { label: t('Très élevée (>25 %)',                'Very high (>25%)'),                    score: 5 },
      ],
    },
    {
      q: t(
        'Quelle est votre principale source de revenus pendant la phase d\'investissement ?',
        'What is your main income source during the investment phase?'
      ),
      options: [
        { label: t('Retraité(e) — dépend du portefeuille', 'Retired — depend on portfolio'),     score: 1 },
        { label: t('Revenu variable ou instable',           'Variable or unstable income'),       score: 2 },
        { label: t('Revenu stable (emploi salarié)',        'Stable income (salaried)'),          score: 3 },
        { label: t('Revenu stable élevé',                  'High stable income'),                score: 4 },
        { label: t('Revenus multiples solides',            'Multiple solid income streams'),     score: 5 },
      ],
    },
    {
      q: t(
        'Quel est votre objectif principal de placement ?',
        'What is your primary investment objective?'
      ),
      options: [
        { label: t('Préserver le capital à tout prix',       'Preserve capital at all costs'),     score: 1 },
        { label: t('Générer un revenu régulier',             'Generate regular income'),           score: 2 },
        { label: t('Équilibre entre revenu et croissance',   'Balance between income and growth'), score: 3 },
        { label: t('Croissance à long terme',               'Long-term growth'),                  score: 4 },
        { label: t('Maximiser la croissance (accepte la volatilité)', 'Maximize growth (accepts volatility)'), score: 5 },
      ],
    },
  ];
}

/**
 * Maps total score (6–30) to a riskProfile string.
 *   6–9   → conservative
 *   10–15 → balanced
 *   16–22 → growth
 *   23–30 → aggressive
 */
export function scoreToProfile(totalScore) {
  if (totalScore <= 9)  return 'conservative';
  if (totalScore <= 15) return 'balanced';
  if (totalScore <= 22) return 'growth';
  return 'aggressive';
}
