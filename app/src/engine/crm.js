// ============================================================
// CRM engine — pure aggregation across the whole client book.
// No DOM. Feeds the CRM dashboard, pipeline, tasks & reminders.
//
// Conventions (kept consistent everywhere in this file):
//   • products[] is the single ledger; AUM is read via aumOf() so the
//     CRM's AUM equals the net-worth balances by construction.
//   • "active" product = isActiveProduct(p) (pending | inforce | paid);
//     lapsed / cancelled products never count toward totals.
//   • Premium and AUM are NEVER summed into one number: every summary
//     returns them side by side (…Premium / …Aum).
//   • Unknown / legacy opportunity stages map to 'new' (normalizeStage).
//   • All ISO dates built from local Date objects go through localISO()
//     (never toISOString(), which shifts the day near midnight in UTC±).
// ============================================================
import { t } from '../i18n.js';
import { fin } from './util.js';
import { annualPremium, isActiveProduct, INVESTMENT_KINDS } from '../state/models.js';
import { aumOf } from './policies.js';

// ---------- Meta (labels resolve to current language at call time) ----------
export const STAGE_META = {
  new:       { label: () => t('Nouveau', 'New'),         color: '#6E8CA0' },
  contacted: { label: () => t('Contacté', 'Contacted'),  color: '#C2922F' },
  meeting:   { label: () => t('Rencontre', 'Meeting'),   color: '#8A6E4C' },
  proposal:  { label: () => t('Proposition', 'Proposal'),color: '#C6AC8F' },
  won:       { label: () => t('Gagné', 'Won'),           color: '#6F9461', won: true },
  lost:      { label: () => t('Perdu', 'Lost'),          color: '#B0573F', lost: true },
};
export const STAGE_ORDER = ['new', 'contacted', 'meeting', 'proposal', 'won', 'lost'];
export const OPEN_STAGES = ['new', 'contacted', 'meeting', 'proposal'];
/** Default close probability per stage — applied whenever an opportunity changes stage. */
export const STAGE_PROBABILITY = { new: 20, contacted: 35, meeting: 50, proposal: 70, won: 100, lost: 0 };

export const LIFECYCLE_META = {
  lead:     { label: () => t('Piste', 'Lead'),         color: '#8E8475' },
  prospect: { label: () => t('Prospect', 'Prospect'),  color: '#C2922F' },
  client:   { label: () => t('Client', 'Client'),      color: '#6F9461' },
  inactive: { label: () => t('Inactif', 'Inactive'),   color: '#B0573F' },
};

export const ACTIVITY_META = {
  call:    { label: () => t('Appel', 'Call'),         icon: 'phone' },
  email:   { label: () => t('Courriel', 'Email'),     icon: 'mail' },
  meeting: { label: () => t('Rencontre', 'Meeting'),  icon: 'users' },
  note:    { label: () => t('Note', 'Note'),          icon: 'file' },
  text:    { label: () => t('Texto', 'Text'),         icon: 'message' },
  task:    { label: () => t('Tâche', 'Task'),         icon: 'check' },
};

export const TASK_CAT_META = {
  followup:    { label: () => t('Suivi', 'Follow-up') },
  review:      { label: () => t('Revue', 'Review') },
  admin:       { label: () => t('Administratif', 'Admin') },
  compliance:  { label: () => t('Conformité', 'Compliance') },
  call:        { label: () => t('Appel', 'Call') },
  meeting:     { label: () => t('Rencontre', 'Meeting') },
  prospecting: { label: () => t('Prospection', 'Prospecting') },
};

/** measure: what the product's "amount" column means — face (coverage), aum (assets) or premium only. */
export const PRODUCT_KIND_META = {
  life:       { label: () => t('Assurance vie', 'Life'),                measure: 'face' },
  disability: { label: () => t('Invalidité', 'Disability'),             measure: 'face' },
  ci:         { label: () => t('Maladies graves', 'Critical illness'),  measure: 'face' },
  ltc:        { label: () => t('Soins de longue durée', 'Long-term care'), measure: 'face' },
  health:     { label: () => t('Santé', 'Health'),                      measure: 'premium' },
  investment: { label: () => t('Placement', 'Investment'),              measure: 'aum' },
  segfund:    { label: () => t('Fonds distinct', 'Seg fund'),           measure: 'aum' },
  annuity:    { label: () => t('Rente', 'Annuity'),                     measure: 'aum' },
  mortgage:   { label: () => t('Hypothèque', 'Mortgage'),               measure: 'face' },
  group:      { label: () => t('Régime collectif', 'Group'),            measure: 'premium' },
};
export const PRODUCT_STATUS_META = {
  pending:   { label: () => t('En attente', 'Pending') },
  inforce:   { label: () => t('En vigueur', 'In force') },
  paid:      { label: () => t('Libérée', 'Paid-up') },
  lapsed:    { label: () => t('Déchue', 'Lapsed') },
  cancelled: { label: () => t('Annulée', 'Cancelled') },
};

/** Opportunity types; when one is won, a type that is also a product kind seeds the new product's kind. */
export const OPP_TYPE_OPTIONS = [
  ['investment', () => t('Placement', 'Investment')], ['life', () => t('Assurance vie', 'Life')],
  ['disability', () => t('Invalidité', 'Disability')], ['ci', () => t('Maladies graves', 'Critical illness')],
  ['ltc', () => t('Soins de longue durée', 'Long-term care')], ['segfund', () => t('Fonds distinct', 'Seg fund')],
  ['mortgage', () => t('Hypothèque', 'Mortgage')], ['group', () => t('Collectif', 'Group')],
  ['planning', () => t('Planification', 'Planning')], ['other', () => t('Autre', 'Other')],
];
/** Product kind to seed from a won opportunity (type when it is a kind, else by the value's nature). */
export function kindForOpportunity(o) {
  if (o && PRODUCT_KIND_META[o.type]) return o.type;
  return o && o.valueKind === 'premium' ? 'life' : 'investment';
}

export const SOURCE_OPTIONS = [
  ['referral', () => t('Référence', 'Referral')],
  ['coi',      () => t("Centre d'influence", 'Center of influence')],
  ['web',      () => t('Site web', 'Website')],
  ['social',   () => t('Réseaux sociaux', 'Social media')],
  ['event',    () => t('Événement', 'Event')],
  ['walkin',   () => t('Spontané', 'Walk-in')],
  ['other',    () => t('Autre', 'Other')],
];

/** Past-due window (days) for reviews / next actions in reminders and the calendar. */
export const PAST_DUE_DAYS = 90;

// ---------- Date helpers (local, day-grained) ----------
const pad2 = (n) => (n < 10 ? '0' + n : '' + n);
/** y-m-d from a LOCAL date (never toISOString, which shifts the day in UTC± zones). */
export function localISO(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
export function todayLocalISO() { return localISO(new Date()); }
function parseDate(iso) { if (!iso) return null; const d = new Date(iso + 'T00:00:00'); return isNaN(d.getTime()) ? null : d; }
/** Timestamp (ms) or ISO string → local y-m-d, '' when unusable. */
function tsToISO(v) { if (!v) return ''; if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v; const d = new Date(v); return isNaN(d.getTime()) ? '' : localISO(d); }
function tsOf(v) { if (!v) return null; const n = typeof v === 'number' ? v : new Date(v).getTime(); return Number.isFinite(n) ? n : null; }
function startOfToday() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
export function daysUntil(iso) { const d = parseDate(iso); if (!d) return null; return Math.round((d - startOfToday()) / 86400000); }
function daysToDate(date) { return Math.round((date - startOfToday()) / 86400000); }
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
/** The anniversary of `d` in `year`; Feb-29 clamps to Feb-28 in non-leap years. */
function anniversaryIn(year, d) {
  let day = d.getDate(); const m = d.getMonth();
  if (m === 1 && day === 29 && !isLeap(year)) day = 28;
  return new Date(year, m, day);
}
function nextAnniversary(iso) {
  const d = parseDate(iso); if (!d) return null;
  const today = startOfToday();
  let a = anniversaryIn(today.getFullYear(), d);
  if (a < today) a = anniversaryIn(today.getFullYear() + 1, d);
  return a;
}

// ---------- Identity helpers ----------
export function primaryMember(c) { return (c.members || []).find(m => m.role === 'primary') || (c.members || [])[0] || {}; }
export function contactName(c) { const m = primaryMember(c); return m.name || c.name || '—'; }
export function lifecycleOf(c) { return (c.crm && c.crm.lifecycle) || 'client'; }

// ---------- Lifecycle ----------
export function lifecycleCounts(clients) {
  const out = { lead: 0, prospect: 0, client: 0, inactive: 0, total: 0 };
  for (const c of clients || []) { out[lifecycleOf(c)] = (out[lifecycleOf(c)] || 0) + 1; out.total++; }
  return out;
}

// ---------- Products: per-client, status-filtered helpers ----------
export const annualizePremium = annualPremium; // legacy alias — the single implementation lives in models.js
export function activeProducts(c) { return (c?.products || []).filter(isActiveProduct); }
/** AUM of active investment products, read through the linked asset (= net-worth balances). */
export function clientAum(c) { return activeProducts(c).filter(p => INVESTMENT_KINDS.includes(p.kind)).reduce((s, p) => s + aumOf(c, p), 0); }
/** Annualised premium of active products (single-pay = 0, not recurring). */
export function clientAnnualPremium(c) { return activeProducts(c).reduce((s, p) => s + annualPremium(p), 0); }
/** Recurring (renewal / trailer) commission of active products, per year. */
export function clientRecurring(c) { return activeProducts(c).reduce((s, p) => s + fin(p.renewalCommission, 0), 0); }
/** First-year commission of active products issued in `year`. */
export function clientFirstYearYTD(c, year = new Date().getFullYear()) {
  return activeProducts(c).reduce((s, p) => { const d = parseDate(p.issueDate); return s + (d && d.getFullYear() === year ? fin(p.firstYearCommission, 0) : 0); }, 0);
}
/** Coverage (face amount) of active products, all kinds. */
export function clientFaceAmount(c) { return activeProducts(c).reduce((s, p) => s + fin(p.faceAmount, 0), 0); }
/**
 * ONE definition of "what a client is worth to the practice", per year:
 * recurring commissions, plus (optionally) an imputed trailer on investment AUM
 * that has NO recorded renewal commission (trailerBps = 100 → 1 % of AUM).
 * Used by the revenue ranking and the referral network alike.
 */
export function clientValue(c, { trailerBps = 0 } = {}) {
  let v = clientRecurring(c);
  if (trailerBps > 0) for (const p of activeProducts(c)) if (INVESTMENT_KINDS.includes(p.kind) && !(fin(p.renewalCommission, 0) > 0)) v += aumOf(c, p) * trailerBps / 10000;
  return v;
}

// ---------- Pipeline ----------
export function normalizeStage(s) { return STAGE_META[s] ? s : 'new'; }
/** Move an opportunity to a stage: sets closedAt and the stage's default probability. Mutates + returns it. */
export function applyStage(o, stage) {
  const s = normalizeStage(stage);
  o.stage = s;
  o.closedAt = (s === 'won' || s === 'lost') ? Date.now() : null;
  o.probability = STAGE_PROBABILITY[s];
  return o;
}
/**
 * Book-wide pipeline totals. Premium and AUM opportunities are kept apart at every level;
 * `conversion` is won / (won + lost) over the trailing 12 months (by closedAt),
 * `conversionAllTime` over every decided opportunity.
 */
export function pipelineSummary(clients, now = Date.now()) {
  const stages = {}; STAGE_ORDER.forEach(s => stages[s] = { key: s, count: 0, premium: 0, aum: 0, weightedPremium: 0, weightedAum: 0 });
  let openCount = 0, wonCount = 0, lostCount = 0, openPremium = 0, openAum = 0, weightedPremium = 0, weightedAum = 0, wonPremium = 0, wonAum = 0;
  let won12m = 0, lost12m = 0;
  const cutoff = now - 365 * 86400000;
  for (const c of clients || []) {
    for (const o of (c.opportunities || [])) {
      const s = normalizeStage(o.stage);
      const st = stages[s];
      const val = fin(o.value, 0);
      const prob = Math.max(0, Math.min(100, fin(o.probability, 0))) / 100;
      const isPrem = o.valueKind === 'premium';
      st.count++;
      if (isPrem) { st.premium += val; st.weightedPremium += val * prob; } else { st.aum += val; st.weightedAum += val * prob; }
      if (OPEN_STAGES.includes(s)) {
        openCount++;
        if (isPrem) { openPremium += val; weightedPremium += val * prob; } else { openAum += val; weightedAum += val * prob; }
      } else {
        const closed = tsOf(o.closedAt);
        const recent = closed != null && closed >= cutoff && closed <= now;
        if (s === 'won') { wonCount++; if (recent) won12m++; if (isPrem) wonPremium += val; else wonAum += val; }
        else { lostCount++; if (recent) lost12m++; }
      }
    }
  }
  const decidedAllTime = wonCount + lostCount, decided12m = won12m + lost12m;
  return {
    stages: STAGE_ORDER.map(s => ({ ...stages[s], label: STAGE_META[s].label(), color: STAGE_META[s].color })),
    openCount, wonCount, lostCount, openPremium, openAum, weightedPremium, weightedAum, wonPremium, wonAum,
    conversion: decided12m > 0 ? won12m / decided12m : 0, won12m, lost12m, decided12m,
    conversionAllTime: decidedAllTime > 0 ? wonCount / decidedAllTime : 0, decidedAllTime,
  };
}

/** Flat list of every opportunity with its client attached (for the Kanban board). */
export function allOpportunities(clients) {
  const out = [];
  for (const c of clients || [])
    for (const o of (c.opportunities || []))
      out.push({ ...o, stage: normalizeStage(o.stage), clientId: c.id, clientName: c.name, contact: contactName(c) });
  return out;
}

// ---------- Tasks ----------
export function allTasks(clients) {
  const out = [];
  for (const c of clients || [])
    for (const tk of (c.tasks || []))
      out.push({ ...tk, clientId: c.id, clientName: c.name, contact: contactName(c), days: daysUntil(tk.due) });
  return out;
}
export function taskBuckets(clients) {
  const all = allTasks(clients);
  const open = all.filter(x => !x.done);
  const byDue = (a, b) => {
    if (a.days == null && b.days == null) return 0;
    if (a.days == null) return 1; if (b.days == null) return -1; return a.days - b.days;
  };
  return {
    overdue:  open.filter(x => x.days != null && x.days < 0).sort(byDue),
    today:    open.filter(x => x.days === 0).sort(byDue),
    soon:     open.filter(x => x.days != null && x.days >= 1 && x.days <= 7).sort(byDue),
    upcoming: open.filter(x => x.days != null && x.days > 7).sort(byDue),
    someday:  open.filter(x => x.days == null).sort(byDue),
    done:     all.filter(x => x.done),
    openCount: open.length,
  };
}

// ---------- Reminders (birthdays, reviews, renewals, next actions) ----------
/**
 * Upcoming items within `horizon` days. Reviews and next actions also surface when past due
 * (down to −PAST_DUE_DAYS) and carry `overdue: true`; birthdays are always ahead (next anniversary);
 * renewals are only listed while still ahead.
 */
export function reminders(clients, horizon = 45, pastDue = PAST_DUE_DAYS) {
  const out = [];
  for (const c of clients || []) {
    for (const m of (c.members || [])) {
      const b = nextAnniversary(m.dob);
      if (b) { const d = daysToDate(b); if (d <= horizon) out.push({ type: 'birthday', clientId: c.id, clientName: c.name, who: m.name, date: localISO(b), days: d, overdue: false }); }
    }
    const rv = daysUntil(c.household && c.household.reviewDate);
    if (rv != null && rv >= -pastDue && rv <= horizon) out.push({ type: 'review', clientId: c.id, clientName: c.name, who: contactName(c), date: c.household.reviewDate, days: rv, overdue: rv < 0 });
    const na = daysUntil(c.crm && c.crm.nextActionDate);
    if (na != null && na >= -pastDue && na <= horizon) out.push({ type: 'nextaction', clientId: c.id, clientName: c.name, who: contactName(c), date: c.crm.nextActionDate, days: na, overdue: na < 0 });
    for (const p of activeProducts(c)) {
      const rn = daysUntil(p.renewalDate);
      if (rn != null && rn >= 0 && rn <= horizon) out.push({ type: 'renewal', clientId: c.id, clientName: c.name, who: p.carrier || p.policyNumber || '', date: p.renewalDate, days: rn, overdue: false });
    }
  }
  return out.sort((a, b) => a.days - b.days);
}

// ---------- Revenue / book of business ----------
export function revenueSummary(clients) {
  let aum = 0, premiumTotal = 0, recurringCommission = 0, firstYearPotential = 0, policies = 0, insuranceFace = 0;
  for (const c of clients || []) {
    aum += clientAum(c);
    premiumTotal += clientAnnualPremium(c);
    recurringCommission += clientRecurring(c);
    insuranceFace += clientFaceAmount(c);
    policies += activeProducts(c).length;                    // every active product counts, premium-only kinds included
    for (const o of (c.opportunities || [])) {
      if (o.valueKind === 'premium' && OPEN_STAGES.includes(normalizeStage(o.stage))) {
        const prob = Math.max(0, Math.min(100, fin(o.probability, 0))) / 100;
        firstYearPotential += fin(o.value, 0) * prob;
      }
    }
  }
  return { aum, annualPremium: premiumTotal, recurringCommission, firstYearPotential, policies, insuranceFace };
}

// ---------- Activity feed ----------
export function activityFeed(clients, limit = 25) {
  const out = [];
  for (const c of clients || [])
    for (const a of (c.activities || []))
      out.push({ ...a, clientId: c.id, clientName: c.name, contact: contactName(c) });
  out.sort((a, b) => {
    const da = a.date || '', db = b.date || '';
    if (da !== db) return db.localeCompare(da);
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
  return limit ? out.slice(0, limit) : out;
}

/** Most recent activity date for a client (derived — crm.lastContactAt is not stored). */
export function lastTouch(c) {
  let best = null;
  for (const a of (c.activities || [])) if (!best || (a.date || '') > best) best = a.date || '';
  return best;
}

// ---------- Revenue report ----------
/**
 * Book economics for `year` (default: current). `recurring`, `aum`, `annualPremium` describe the
 * book as it stands; `firstYearYTD` / `won*YTD` are keyed to `year`.
 * byMonth: renewal commissions on products whose renewal falls IN `year` sit on that month; every other
 * active product's commission (no renewal date, or a renewal in another year — trailers, anniversaries
 * not yet rolled) is spread evenly over the 12 months, so Σ byMonth === recurring (`reconciles`).
 */
export function revenueReport(clients, year = new Date().getFullYear()) {
  const byKind = {}, byCarrier = {};
  const byMonth = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, recurring: 0, dated: 0, spread: 0 }));
  let recurring = 0, premiumTotal = 0, aum = 0, faceTotal = 0, firstYearYTD = 0, spreadRec = 0;
  let wonPremiumYTD = 0, wonAumYTD = 0, wonCountYTD = 0;
  const perClient = [];
  const upcomingRenewals = [];
  for (const c of clients || []) {
    for (const p of activeProducts(c)) {
      const k = p.kind || 'other';
      const pAum = INVESTMENT_KINDS.includes(k) ? aumOf(c, p) : 0;
      const prem = annualPremium(p), rec = fin(p.renewalCommission, 0), face = fin(p.faceAmount, 0);
      byKind[k] = byKind[k] || { kind: k, label: (PRODUCT_KIND_META[k] || { label: () => k }).label(), aum: 0, annualPremium: 0, recurring: 0, faceTotal: 0, count: 0 };
      byKind[k].aum += pAum; byKind[k].annualPremium += prem; byKind[k].recurring += rec; byKind[k].faceTotal += face; byKind[k].count++;
      const carr = p.carrier || t('Autre', 'Other');
      byCarrier[carr] = byCarrier[carr] || { carrier: carr, recurring: 0, annualPremium: 0, aum: 0, count: 0 };
      byCarrier[carr].recurring += rec; byCarrier[carr].annualPremium += prem; byCarrier[carr].aum += pAum; byCarrier[carr].count++;
      recurring += rec; premiumTotal += prem; aum += pAum; faceTotal += face;
      const rd = parseDate(p.renewalDate);
      if (rd && rd.getFullYear() === year) { byMonth[rd.getMonth()].dated += rec; byMonth[rd.getMonth()].recurring += rec; } else spreadRec += rec;
      const rdays = daysUntil(p.renewalDate);
      if (rdays != null && rdays >= 0 && rdays <= 90) upcomingRenewals.push({ clientId: c.id, clientName: c.name, carrier: carr, kind: k, date: p.renewalDate, days: rdays, recurring: rec });
    }
    firstYearYTD += clientFirstYearYTD(c, year);
    const row = { id: c.id, name: c.name, contact: contactName(c), recurring: clientRecurring(c), aum: clientAum(c), annualPremium: clientAnnualPremium(c), firstYear: clientFirstYearYTD(c, year), value: clientValue(c) };
    if (row.recurring > 0 || row.aum > 0 || row.annualPremium > 0) perClient.push(row);
    for (const o of (c.opportunities || [])) {
      if (normalizeStage(o.stage) !== 'won') continue;
      const closed = tsOf(o.closedAt); if (closed == null) continue;
      if (new Date(closed).getFullYear() === year) { wonCountYTD++; if (o.valueKind === 'premium') wonPremiumYTD += fin(o.value, 0); else wonAumYTD += fin(o.value, 0); }
    }
  }
  for (const m of byMonth) { m.spread = spreadRec / 12; m.recurring += m.spread; }
  const monthSum = byMonth.reduce((s, m) => s + m.recurring, 0);
  const reconciles = Math.abs(monthSum - recurring) <= 0.005 + 1e-9 * Math.abs(recurring);
  return {
    year,
    byKind: Object.values(byKind).sort((a, b) => b.recurring - a.recurring),
    byCarrier: Object.values(byCarrier).sort((a, b) => b.recurring - a.recurring),
    byMonth, monthSum, reconciles, recurring, annualPremium: premiumTotal, aum, faceTotal, firstYearYTD, wonPremiumYTD, wonAumYTD, wonCountYTD,
    perClient: perClient.sort((a, b) => (b.value - a.value) || (b.aum - a.aum) || (b.annualPremium - a.annualPremium)),
    upcomingRenewals: upcomingRenewals.sort((a, b) => a.days - b.days),
  };
}

// ---------- Referral network ----------
const nameKey = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
/** Resolve a free-text "referred by" against file names AND member names ("Marc Tremblay" → Famille Tremblay). */
export function resolveReferrer(clients, ref, excludeId = null) {
  const k = nameKey(ref); if (!k) return null;
  for (const c of clients || []) if (c.id !== excludeId && nameKey(c.name) === k) return { client: c, via: 'file' };
  for (const c of clients || []) if (c.id !== excludeId) for (const m of (c.members || [])) if (nameKey(m.name) === k) return { client: c, via: 'member', member: m };
  return null;
}
export function referralNetwork(clients) {
  const byRef = {}, bySource = {};
  for (const c of clients || []) {
    const ref = ((c.crm && c.crm.referredBy) || '').trim();
    const val = clientValue(c);
    if (ref) {
      const res = resolveReferrer(clients, ref, c.id);
      const key = res ? 'id:' + res.client.id : 'name:' + nameKey(ref);
      byRef[key] = byRef[key] || { key, name: res ? res.client.name : ref, contact: res ? contactName(res.client) : '', clientId: res ? res.client.id : null, aliases: [], referred: [], count: 0, value: 0 };
      if (!byRef[key].aliases.includes(ref)) byRef[key].aliases.push(ref);
      byRef[key].referred.push({ id: c.id, name: c.name, value: val });
      byRef[key].count++; byRef[key].value += val;
    }
    const src = (c.crm && c.crm.source) || '';
    if (src) {
      const lbl = (SOURCE_OPTIONS.find(s => s[0] === src) || [src, () => src])[1]();
      bySource[src] = bySource[src] || { source: src, label: lbl, count: 0, value: 0 };
      bySource[src].count++; bySource[src].value += val;
    }
  }
  return {
    referrers: Object.values(byRef).sort((a, b) => b.value - a.value || b.count - a.count),
    bySource: Object.values(bySource).sort((a, b) => b.count - a.count),
  };
}

// ---------- Dynamic segments ----------
/** Every member's e-mail (primary + spouse …), de-duplicated by the caller. */
export function emailsOf(c) { return (c.members || []).map(m => (m.email || '').trim()).filter(Boolean); }
export function buildSegments(clients) {
  const month = new Date().getMonth();
  const hasWill = (c) => (c.documents || []).some(d => d.type === 'will' && d.status === 'done');
  const defs = [
    { key: 'reviewdue', label: () => t('Revue à planifier', 'Review due'), desc: () => t('Revue dans 90 j ou en retard', 'Review within 90d or overdue'),
      pred: c => { const d = daysUntil(c.household && c.household.reviewDate); return d != null && d <= 90; } },
    { key: 'prospects', label: () => t('Prospects à convertir', 'Prospects to convert'), desc: () => t('Cycle de vie prospect ou piste', 'Lifecycle prospect or lead'),
      pred: c => ['prospect', 'lead'].includes(lifecycleOf(c)) },
    { key: 'proposal', label: () => t('Proposition en cours', 'Open proposal'), desc: () => t('Opportunité à l’étape proposition', 'Opportunity at proposal stage'),
      pred: c => (c.opportunities || []).some(o => normalizeStage(o.stage) === 'proposal') },
    { key: 'birthday', label: () => t('Anniversaire ce mois', 'Birthday this month'), desc: () => t('Un membre fête son anniversaire', 'A member has a birthday'),
      pred: c => (c.members || []).some(m => { const d = parseDate(m.dob); return d && d.getMonth() === month; }) },
    { key: 'nowill', label: () => t('Sans testament', 'No will'), desc: () => t('Aucun testament signé au dossier', 'No signed will on file'),
      pred: c => !hasWill(c) },
    { key: 'stale', label: () => t('Clients sans contact (1 an)', 'Clients out of touch (1y)'), desc: () => t('Aucun contact depuis 12 mois', 'No touch in 12 months'),
      pred: c => { if (lifecycleOf(c) !== 'client') return false; const lt = lastTouch(c); if (!lt) return true; const d = daysUntil(lt); return d != null && d <= -365; } },
    { key: 'lapsed', label: () => t('Polices déchues', 'Lapsed policies'), desc: () => t('Produit déchu ou annulé', 'Lapsed or cancelled product'),
      pred: c => (c.products || []).some(p => p.status === 'lapsed' || p.status === 'cancelled') },
  ];
  return defs.map(d => { const list = (clients || []).filter(d.pred); return { key: d.key, label: d.label(), desc: d.desc(), clients: list, emails: [...new Set(list.flatMap(emailsOf))] }; });
}

// ---------- Compliance / KYC ----------
export const KYC_ITEMS = [
  { key: 'kyc',         label: () => t('Formulaire KYC (connaissance du client)', 'KYC form (know-your-client)') },
  { key: 'riskprofile', label: () => t('Profil d’investisseur / tolérance au risque', 'Investor profile / risk tolerance') },
  { key: 'idverify',    label: () => t('Vérification d’identité', 'Identity verification') },
  { key: 'beneficiary', label: () => t('Désignation de bénéficiaires', 'Beneficiary designation') },
  { key: 'fatca',       label: () => t('Attestation de résidence fiscale (FATCA/CRS)', 'Tax residency certification (FATCA/CRS)') },
  { key: 'disclosure',  label: () => t('Information sur la relation (divulgation)', 'Relationship disclosure') },
  { key: 'agreement',   label: () => t('Convention de service signée', 'Signed service agreement') },
];
/** Items whose completion is derived from the file itself (shown as locked in the UI). */
const KYC_DERIVED = {
  beneficiary: (c) => (c.beneficiaries || []).length > 0,
  riskprofile: (c) => !!(c.riskProfile),
};
export function complianceStatus(c) {
  const store = c.compliance || {};
  const items = KYC_ITEMS.map(it => {
    const s = store[it.key] || {};
    const derived = !!(KYC_DERIVED[it.key] && KYC_DERIVED[it.key](c));
    return { key: it.key, label: it.label(), status: derived ? 'done' : (s.status || 'todo'), date: s.date || '', derived };
  });
  const applicable = items.filter(i => i.status !== 'na');
  const done = applicable.filter(i => i.status === 'done').length;
  const total = applicable.length;
  return { items, done, total, pct: total > 0 ? done / total : 1, missing: items.filter(i => i.status === 'todo') };
}
export function complianceOverview(clients) {
  const byItem = {}; KYC_ITEMS.forEach(it => byItem[it.key] = { key: it.key, label: it.label(), missing: 0 });
  const rows = [];
  for (const c of clients || []) {
    if (lifecycleOf(c) === 'prospect' || lifecycleOf(c) === 'lead') continue; // KYC applies to clients
    const st = complianceStatus(c);
    rows.push({ clientId: c.id, clientName: c.name, contact: contactName(c), pct: st.pct, done: st.done, total: st.total, missing: st.missing });
    st.missing.forEach(m => { if (byItem[m.key]) byItem[m.key].missing++; });
  }
  rows.sort((a, b) => a.pct - b.pct);
  const fullyCompliant = rows.filter(r => r.pct >= 1).length;
  return { rows, byItem: Object.values(byItem).sort((a, b) => b.missing - a.missing), fullyCompliant, total: rows.length };
}

// ---------- Follow-up cadences (sequences) ----------
function isoAddDays(iso, n) {
  const base = iso ? parseDate(iso) : startOfToday();
  if (!base) return '';
  base.setDate(base.getDate() + n);
  return localISO(base);
}
export const CADENCES = [
  { key: 'prospect', label: () => t('Relance prospect', 'Prospect nurture'), desc: () => t('3 touches sur 10 jours', '3 touches over 10 days'),
    steps: [ { offset: 1, category: 'followup', title: () => t('Premier suivi (courriel)', 'First follow-up (email)') },
      { offset: 4, category: 'call', title: () => t('Appel de suivi', 'Follow-up call') },
      { offset: 10, category: 'followup', title: () => t('Dernière relance', 'Final nudge') } ] },
  { key: 'onboarding', label: () => t('Intégration client', 'Client onboarding'), desc: () => t('Bienvenue → documents → satisfaction', 'Welcome → docs → check-in'),
    steps: [ { offset: 1, category: 'admin', title: () => t('Courriel de bienvenue', 'Welcome email') },
      { offset: 14, category: 'compliance', title: () => t('Vérifier la réception des documents', 'Confirm documents received') },
      { offset: 30, category: 'call', title: () => t('Appel de satisfaction', 'Satisfaction call') } ] },
  { key: 'annualreview', label: () => t('Revue annuelle', 'Annual review'), desc: () => t('Préparer puis planifier', 'Prepare then schedule'),
    steps: [ { offset: 0, category: 'review', title: () => t('Préparer la revue annuelle', 'Prepare the annual review') },
      { offset: 2, category: 'meeting', title: () => t('Planifier la rencontre de revue', 'Schedule the review meeting') } ] },
];
/** Build (but do not persist) the task objects for a cadence applied from a date. */
export function cadenceTasks(cadenceKey, fromISO) {
  const cad = CADENCES.find(c => c.key === cadenceKey); if (!cad) return [];
  return cad.steps.map(s => ({ title: s.title(), due: isoAddDays(fromISO, s.offset), category: s.category, priority: 'medium' }));
}

// ---------- Monthly calendar events ----------
/**
 * Events for one month, keyed 'YYYY-MM-DD'. Placement rules (one rule, applied the same way
 * in reminders()):
 *   • tasks and renewals sit on their own date (history stays where it happened);
 *   • birthdays recur every year (Feb-29 → Feb-28 in non-leap years);
 *   • reviews and next actions sit on their own date while ahead; once past due (up to
 *     PAST_DUE_DAYS) they are pinned to TODAY's cell with `overdue: true` so they keep
 *     surfacing in the current month instead of vanishing into a past one.
 */
export function monthEvents(clients, year, month) {
  const byDay = {};
  const today = startOfToday();
  const push = (y, m, d, ev) => { if (m !== month || y !== year) return; const key = `${y}-${pad2(m + 1)}-${pad2(d)}`; (byDay[key] = byDay[key] || []).push(ev); };
  const placeDated = (iso, ev) => {
    const d = parseDate(iso); if (!d) return;
    const days = daysToDate(d);
    if (days < 0 && days >= -PAST_DUE_DAYS) push(today.getFullYear(), today.getMonth(), today.getDate(), { ...ev, date: iso, overdue: true, days });
    else push(d.getFullYear(), d.getMonth(), d.getDate(), { ...ev, date: iso, overdue: false, days });
  };
  for (const c of clients || []) {
    for (const tk of (c.tasks || [])) {
      if (tk.done || !tk.due) continue; const d = parseDate(tk.due); if (!d) continue;
      push(d.getFullYear(), d.getMonth(), d.getDate(), { type: 'task', label: tk.title, clientId: c.id, clientName: c.name, date: tk.due, overdue: daysToDate(d) < 0 });
    }
    for (const m of (c.members || [])) {
      const d = parseDate(m.dob); if (!d) continue;
      const a = anniversaryIn(year, d);
      push(year, a.getMonth(), a.getDate(), { type: 'birthday', label: t(`Anniversaire — ${m.name}`, `Birthday — ${m.name}`), clientId: c.id, clientName: c.name, date: localISO(a), overdue: false });
    }
    placeDated(c.household && c.household.reviewDate, { type: 'review', label: t('Revue annuelle', 'Annual review'), clientId: c.id, clientName: c.name });
    placeDated(c.crm && c.crm.nextActionDate, { type: 'nextaction', label: t('Prochaine action', 'Next action'), clientId: c.id, clientName: c.name });
    for (const p of activeProducts(c)) {
      const rn = parseDate(p.renewalDate); if (!rn) continue;
      push(rn.getFullYear(), rn.getMonth(), rn.getDate(), { type: 'renewal', label: t(`Renouvellement — ${p.carrier || ''}`, `Renewal — ${p.carrier || ''}`), clientId: c.id, clientName: c.name, date: p.renewalDate, overdue: false });
    }
  }
  return byDay;
}
export const EVENT_COLOR = { task: '#C2922F', birthday: '#C6AC8F', review: '#6E8CA0', renewal: '#6F9461', nextaction: '#B0573F' };

// ---------- Per-client merged timeline ----------
export function clientTimeline(c) {
  const ev = [];
  for (const a of (c.activities || [])) ev.push({ date: a.date, kind: 'activity', sub: a.type, title: a.subject || (ACTIVITY_META[a.type] || ACTIVITY_META.note).label(), detail: a.body || '' });
  for (const tk of (c.tasks || [])) ev.push({ date: tk.due || tsToISO(tk.createdAt), kind: 'task', sub: tk.done ? 'done' : 'open', title: tk.title, detail: tk.done ? t('Terminée', 'Completed') : t('À faire', 'To do') });
  for (const o of (c.opportunities || [])) {
    const s = normalizeStage(o.stage);
    const od = o.expectedClose || tsToISO(o.closedAt) || tsToISO(o.openedAt);   // when it matters: expected close, else the decision, else the opening
    ev.push({ date: od, kind: 'opportunity', sub: s, title: o.title, detail: STAGE_META[s].label() });
  }
  for (const p of (c.products || [])) if (p.issueDate) ev.push({ date: p.issueDate, kind: 'product', sub: p.kind, title: `${(PRODUCT_KIND_META[p.kind] || { label: () => p.kind }).label()} — ${p.carrier || ''}`, detail: [p.policyNumber, (PRODUCT_STATUS_META[p.status] || {}).label?.()].filter(Boolean).join(' · ') });
  return ev.filter(e => e.date).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}
