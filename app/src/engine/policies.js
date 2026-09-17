// ============================================================
// Policies — ONE place that answers "what coverage does this
// member have?" and "what do the premiums cost?", reading the
// unified products[] ledger (planning + CRM share it). No deps.
// ============================================================
import { annualPremium, isActiveProduct, KIND_TO_INSURANCE, INSURANCE_KINDS, INVESTMENT_KINDS } from '../state/models.js';

const fin = (v) => (Number.isFinite(+v) ? +v : 0);

/** All insurance products (any status). */
export function policiesOf(client) {
  return (client?.products || []).filter(p => INSURANCE_KINDS.includes(p.kind));
}
/** Active insurance products only. */
export function activePolicies(client) { return policiesOf(client).filter(isActiveProduct); }

/** Total in-force coverage for a member and planning type ('life' | 'di' | 'ci' | 'ltc'). */
export function coverageOf(client, memberId, type = 'life') {
  return activePolicies(client)
    .filter(p => KIND_TO_INSURANCE[p.kind] === type && (memberId == null || p.insuredId === memberId || (p.insuredId == null && client?.members?.[0]?.id === memberId)))
    .reduce((s, p) => s + fin(p.faceAmount), 0);
}

/** Annual premium total (active policies), optionally per member. */
export function premiumsOf(client, memberId = null) {
  return activePolicies(client)
    .filter(p => memberId == null || p.insuredId === memberId)
    .reduce((s, p) => s + annualPremium(p), 0);
}

/** Investment products (active) — their AUM lives in the linked asset when one exists. */
export function investmentProducts(client) {
  return (client?.products || []).filter(p => INVESTMENT_KINDS.includes(p.kind) && isActiveProduct(p));
}
export function aumOf(client, p) {
  if (p?.assetId) { const a = (client?.assets || []).find(x => x.id === p.assetId); if (a) return fin(a.value); }
  return fin(p?.aum);
}
