// ============================================================
// Crypto & alternative assets engine
// ============================================================
import { t } from '../i18n.js';

/**
 * portfolioSummary(holdings)
 * holdings: [{id,name,symbol,quantity,priceNow,costBasis,
 *             type:'crypto'|'private'|'collectible'|'commodity'|'other'}]
 * Returns { total, totalCost, unrealizedGain,
 *           allocation:[{type,label,value,pct}] }
 */
export function portfolioSummary(holdings) {
  if (!Array.isArray(holdings) || !holdings.length) {
    return { total: 0, totalCost: 0, unrealizedGain: 0, allocation: [] };
  }

  let total = 0;
  let totalCost = 0;
  const byType = {};

  for (const h of holdings) {
    const value = (h.quantity || 0) * (h.priceNow || 0);
    total += value;
    totalCost += h.costBasis || 0;
    const key = h.type || 'other';
    byType[key] = (byType[key] || 0) + value;
  }

  const unrealizedGain = total - totalCost;
  const allocation = Object.entries(byType).map(([type, value]) => ({
    type,
    label: typeLabel(type),
    value,
    pct: total > 0 ? value / total : 0,
  }));

  return { total, totalCost, unrealizedGain, allocation };
}

/** Human-readable bilingual label for an asset type. */
export function typeLabel(type) {
  const map = {
    crypto:      t('Cryptomonnaie', 'Cryptocurrency'),
    private:     t('Placement privé', 'Private investment'),
    collectible: t('Collection', 'Collectible'),
    commodity:   t('Matière première', 'Commodity'),
    other:       t('Autre', 'Other'),
  };
  return map[type] || type;
}

/**
 * dispositionTax(jur, { proceeds, costBasis, marginalRate, asBusinessIncome })
 * If asBusinessIncome (CA active trading): 100% of gain is taxable.
 * Otherwise capital gain at jur.capGainsInclusion.
 * Returns { gain, taxableGain, tax, net, treatment }
 */
export function dispositionTax(jur, { proceeds = 0, costBasis = 0, marginalRate = 0.40, asBusinessIncome = false } = {}) {
  const gain = proceeds - costBasis;
  const inclusion = (jur && jur.capGainsInclusion != null) ? jur.capGainsInclusion : 0.5;
  let taxableGain, treatment;

  if (asBusinessIncome) {
    taxableGain = gain;
    treatment = t(
      'Revenu d’entreprise — 100 % imposable',
      'Business income — 100 % taxable'
    );
  } else {
    taxableGain = gain * inclusion;
    const pctStr = Math.round(inclusion * 100) + ' %';
    treatment = t(
      'Gain en capital — ' + pctStr + ' imposable',
      'Capital gain — ' + pctStr + ' taxable'
    );
  }

  const tax = taxableGain > 0 ? taxableGain * marginalRate : 0;
  const net = proceeds - costBasis - tax;

  return { gain, taxableGain, tax, net, treatment };
}

/**
 * acbPool(transactions)
 * transactions: [{ quantity, price }] -- buy records (CA ACB pooling rule)
 * Returns { totalQuantity, totalCost, acbPerUnit }
 */
export function acbPool(transactions) {
  if (!Array.isArray(transactions) || !transactions.length) {
    return { totalQuantity: 0, totalCost: 0, acbPerUnit: 0 };
  }
  let totalQuantity = 0;
  let totalCost = 0;
  for (const tx of transactions) {
    const qty = tx.quantity || 0;
    const price = tx.price || 0;
    totalQuantity += qty;
    totalCost += qty * price;
  }
  const acbPerUnit = totalQuantity > 0 ? totalCost / totalQuantity : 0;
  return { totalQuantity, totalCost, acbPerUnit };
}
