// ============================================================
// Jurisdiction registry — the engine reads everything from here,
// so adding a country = dropping in a module and registering it.
// ============================================================
import CA from './ca.js';
import US from './us.js';
import UK from './uk.js';

export const JURISDICTIONS = { CA, US, UK };

export const COUNTRY_LIST = Object.values(JURISDICTIONS).map(j => ({
  code: j.country, name: j.name, flag: j.flag, currency: j.currency,
}));

/**
 * Resolve a full, flattened jurisdiction context for a country/region pair.
 * Returns the country config plus the resolved region (province/state) block.
 */
export function getJurisdiction(country = 'CA', region) {
  const j = JURISDICTIONS[country] || CA;
  const reg = region && j.regions[region] ? region : j.defaultRegion;
  const regionData = (j.prov && j.prov[reg]) || (j.states && j.states[reg]) || (j.regionsData && j.regionsData[reg]) || null;
  return {
    ...j,
    region: reg,
    regionName: j.regions[reg],
    regionData,
    flagRegion: regionData?.flag || j.flag,
  };
}

/** Account types available for a jurisdiction (drives the asset editor). */
export function accountTypesFor(country) {
  return (JURISDICTIONS[country] || CA).accounts;
}

/** Look up an account-type descriptor by id within a country. */
export function accountMeta(country, id) {
  return accountTypesFor(country).find(a => a.id === id) || { id, name: id, treatment: 'taxable' };
}
