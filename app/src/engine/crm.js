// ============================================================
// CRM engine — pure aggregation across the whole client book.
// No DOM. Feeds the CRM dashboard, pipeline, tasks & reminders.
// ============================================================
import { t } from '../i18n.js';
import { fin } from './util.js';

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

export const PRODUCT_KIND_META = {
  life:       { label: () => t('Assurance vie', 'Life'),            measure: 'face' },
  disability: { label: () => t('Invalidité', 'Disability'),         measure: 'face' },
  ci:         { label: () => t('Maladies graves', 'Critical illness'), measure: 'face' },
  health:     { label: () => t('Santé', 'Health'),                  measure: 'premium' },
  investment: { label: () => t('Placement', 'Investment'),          measure: 'aum' },
  segfund:    { label: () => t('Fonds distinct', 'Seg fund'),       measure: 'aum' },
  annuity:    { label: () => t('Rente', 'Annuity'),                 measure: 'aum' },
  mortgage:   { label: () => t('Hypothèque', 'Mortgage'),           measure: 'face' },
  group:      { label: () => t('Régime collectif', 'Group'),        measure: 'premium' },
};

export const SOURCE_OPTIONS = [
  ['referral', () => t('Référence', 'Referral')],
  ['coi',      () => t("Centre d'influence", 'Center of influence')],
  ['web',      () => t('Site web', 'Website')],
  ['social',   () => t('Réseaux sociaux', 'Social media')],
  ['event',    () => t('Événement', 'Event')],
  ['walkin',   () => t('Spontané', 'Walk-in')],
  ['other',    () => t('Autre', 'Other')],
];

// ---------- Date helpers (local, day-grained) ----------
function parseDate(iso) { if (!iso) return null; const d = new Date(iso + 'T00:00:00'); return isNaN(d.getTime()) ? null : d; }
function startOfToday() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
export function daysUntil(iso) { const d = parseDate(iso); if (!d) return null; return Math.round((d - startOfToday()) / 86400000); }
function daysToDate(date) { return Math.round((date - startOfToday()) / 86400000); }
function nextAnniversary(iso) {
  const d = parseDate(iso); if (!d) return null;
  const today = startOfToday();
  let a = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (a < today) a = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
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

// ---------- Pipeline ----------
export function pipelineSummary(clients) {
  const stages = {}; STAGE_ORDER.forEach(s => stages[s] = { key: s, count: 0, premium: 0, aum: 0, weightedPremium: 0 });
  let openCount = 0, wonCount = 0, lostCount = 0, openPremium = 0, openAum = 0, weightedPremium = 0, wonPremium = 0, wonAum = 0;
  for (const c of clients || []) {
    for (const o of (c.opportunities || [])) {
      const st = stages[o.stage] || stages.new;
      const val = fin(o.value, 0);
      const prob = Math.max(0, Math.min(100, fin(o.probability, 0))) / 100;
      const isPrem = o.valueKind === 'premium';
      st.count++;
      if (isPrem) st.premium += val; else st.aum += val;
      if (isPrem) st.weightedPremium += val * prob;
      if (OPEN_STAGES.includes(o.stage)) {
        openCount++;
        if (isPrem) { openPremium += val; weightedPremium += val * prob; } else openAum += val;
      } else if (o.stage === 'won') { wonCount++; if (isPrem) wonPremium += val; else wonAum += val; }
      else if (o.stage === 'lost') lostCount++;
    }
  }
  const decided = wonCount + lostCount;
  const conversion = decided > 0 ? wonCount / decided : 0;
  return {
    stages: STAGE_ORDER.map(s => ({ ...stages[s], label: STAGE_META[s].label(), color: STAGE_META[s].color })),
    openCount, wonCount, lostCount, openPremium, openAum, weightedPremium, wonPremium, wonAum, conversion,
  };
}

/** Flat list of every opportunity with its client attached (for the Kanban board). */
export function allOpportunities(clients) {
  const out = [];
  for (const c of clients || [])
    for (const o of (c.opportunities || []))
      out.push({ ...o, clientId: c.id, clientName: c.name, contact: contactName(c) });
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
export function reminders(clients, horizon = 45) {
  const out = [];
  for (const c of clients || []) {
    for (const m of (c.members || [])) {
      const b = nextAnniversary(m.dob);
      if (b) { const d = daysToDate(b); if (d <= horizon) out.push({ type: 'birthday', clientId: c.id, clientName: c.name, who: m.name, date: b.toISOString().slice(0, 10), days: d }); }
    }
    const rv = daysUntil(c.household && c.household.reviewDate);
    if (rv != null && rv <= horizon) out.push({ type: 'review', clientId: c.id, clientName: c.name, who: contactName(c), date: c.household.reviewDate, days: rv });
    const na = daysUntil(c.crm && c.crm.nextActionDate);
    if (na != null && na <= horizon) out.push({ type: 'nextaction', clientId: c.id, clientName: c.name, who: contactName(c), date: c.crm.nextActionDate, days: na });
    for (const p of (c.products || [])) {
      const rn = daysUntil(p.renewalDate);
      if (rn != null && rn >= 0 && rn <= horizon) out.push({ type: 'renewal', clientId: c.id, clientName: c.name, who: p.carrier || p.policyNumber || '', date: p.renewalDate, days: rn });
    }
  }
  return out.sort((a, b) => a.days - b.days);
}

// ---------- Revenue / book of business ----------
export function revenueSummary(clients) {
  let aum = 0, annualPremium = 0, recurringCommission = 0, firstYearPotential = 0, policies = 0, insuranceFace = 0;
  for (const c of clients || []) {
    for (const p of (c.products || [])) {
      if (p.status === 'lapsed' || p.status === 'cancelled') continue;
      aum += fin(p.aum, 0);
      const prem = annualizePremium(p);
      annualPremium += prem;
      recurringCommission += fin(p.renewalCommission, 0);
      insuranceFace += fin(p.faceAmount, 0);
      if (p.aum > 0 || p.faceAmount > 0) policies++;
    }
    for (const o of (c.opportunities || [])) {
      if (o.valueKind === 'premium' && OPEN_STAGES.includes(o.stage)) {
        const prob = Math.max(0, Math.min(100, fin(o.probability, 0))) / 100;
        firstYearPotential += fin(o.value, 0) * prob;
      }
    }
  }
  return { aum, annualPremium, recurringCommission, firstYearPotential, policies, insuranceFace };
}
export function annualizePremium(p) {
  const v = fin(p.premium, 0);
  if (p.frequency === 'monthly') return v * 12;
  if (p.frequency === 'single') return 0; // single-pay: not recurring
  return v; // annual
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

/** Most recent activity date for a client (used to flag stale relationships). */
export function lastTouch(c) {
  let best = null;
  for (const a of (c.activities || [])) if (!best || (a.date || '') > best) best = a.date || '';
  return best;
}

// ---------- Revenue report ----------
export function revenueReport(clients) {
  const byKind = {}, byCarrier = {};
  const byMonth = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, recurring: 0 }));
  let recurring = 0, annualPremium = 0, aum = 0, faceTotal = 0;
  let wonPremiumYTD = 0, wonAumYTD = 0, wonCountYTD = 0;
  const yr = new Date().getFullYear();
  for (const c of clients || []) {
    for (const p of (c.products || [])) {
      if (p.status === 'lapsed' || p.status === 'cancelled') continue;
      const k = p.kind || 'other';
      byKind[k] = byKind[k] || { kind: k, label: (PRODUCT_KIND_META[k] || { label: () => k }).label(), aum: 0, annualPremium: 0, recurring: 0, faceTotal: 0, count: 0 };
      const prem = annualizePremium(p), rec = fin(p.renewalCommission, 0);
      byKind[k].aum += fin(p.aum, 0); byKind[k].annualPremium += prem; byKind[k].recurring += rec; byKind[k].faceTotal += fin(p.faceAmount, 0); byKind[k].count++;
      const carr = p.carrier || t('Autre', 'Other');
      byCarrier[carr] = byCarrier[carr] || { carrier: carr, recurring: 0, annualPremium: 0, aum: 0, count: 0 };
      byCarrier[carr].recurring += rec; byCarrier[carr].annualPremium += prem; byCarrier[carr].aum += fin(p.aum, 0); byCarrier[carr].count++;
      recurring += rec; annualPremium += prem; aum += fin(p.aum, 0); faceTotal += fin(p.faceAmount, 0);
      const rd = parseDate(p.renewalDate); if (rd) byMonth[rd.getMonth()].recurring += rec;
    }
    for (const o of (c.opportunities || [])) {
      if (o.stage === 'won' && o.closedAt) {
        const d = new Date(o.closedAt);
        if (d.getFullYear() === yr) { wonCountYTD++; if (o.valueKind === 'premium') wonPremiumYTD += fin(o.value, 0); else wonAumYTD += fin(o.value, 0); }
      }
    }
  }
  return {
    byKind: Object.values(byKind).sort((a, b) => b.recurring - a.recurring),
    byCarrier: Object.values(byCarrier).sort((a, b) => b.recurring - a.recurring),
    byMonth, recurring, annualPremium, aum, faceTotal, wonPremiumYTD, wonAumYTD, wonCountYTD,
  };
}

// ---------- Referral network ----------
function clientValue(c) {
  let v = 0;
  for (const p of (c.products || [])) if (p.status !== 'lapsed' && p.status !== 'cancelled') v += fin(p.renewalCommission, 0);
  return v;
}
export function referralNetwork(clients) {
  const byRef = {}, bySource = {};
  for (const c of clients || []) {
    const ref = ((c.crm && c.crm.referredBy) || '').trim();
    const val = clientValue(c);
    if (ref) {
      byRef[ref] = byRef[ref] || { name: ref, referred: [], count: 0, value: 0 };
      byRef[ref].referred.push({ id: c.id, name: c.name, value: val });
      byRef[ref].count++; byRef[ref].value += val;
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
export function buildSegments(clients) {
  const month = new Date().getMonth();
  const hasWill = (c) => (c.documents || []).some(d => d.type === 'will' && d.status === 'done');
  const emailOf = (c) => { const m = primaryMember(c); return m.email ? [m.email] : []; };
  const defs = [
    { key: 'reviewdue', label: () => t('Revue à planifier', 'Review due'), desc: () => t('Revue dans 90 j ou en retard', 'Review within 90d or overdue'),
      pred: c => { const d = daysUntil(c.household && c.household.reviewDate); return d != null && d <= 90; } },
    { key: 'prospects', label: () => t('Prospects à convertir', 'Prospects to convert'), desc: () => t('Cycle de vie prospect ou piste', 'Lifecycle prospect or lead'),
      pred: c => ['prospect', 'lead'].includes(lifecycleOf(c)) },
    { key: 'proposal', label: () => t('Proposition en cours', 'Open proposal'), desc: () => t('Opportunité à l’étape proposition', 'Opportunity at proposal stage'),
      pred: c => (c.opportunities || []).some(o => o.stage === 'proposal') },
    { key: 'birthday', label: () => t('Anniversaire ce mois', 'Birthday this month'), desc: () => t('Un membre fête son anniversaire', 'A member has a birthday'),
      pred: c => (c.members || []).some(m => { const d = parseDate(m.dob); return d && d.getMonth() === month; }) },
    { key: 'nowill', label: () => t('Sans testament', 'No will'), desc: () => t('Aucun testament signé au dossier', 'No signed will on file'),
      pred: c => !hasWill(c) },
    { key: 'stale', label: () => t('Clients sans contact (1 an)', 'Clients out of touch (1y)'), desc: () => t('Aucun contact depuis 12 mois', 'No touch in 12 months'),
      pred: c => { if (lifecycleOf(c) !== 'client') return false; const lt = lastTouch(c); if (!lt) return true; const d = daysUntil(lt); return d != null && d <= -365; } },
    { key: 'lapsed', label: () => t('Polices déchues', 'Lapsed policies'), desc: () => t('Produit déchu ou annulé', 'Lapsed or cancelled product'),
      pred: c => (c.products || []).some(p => p.status === 'lapsed' || p.status === 'cancelled') },
  ];
  return defs.map(d => { const list = (clients || []).filter(d.pred); return { key: d.key, label: d.label(), desc: d.desc(), clients: list, emails: [...new Set(list.flatMap(emailOf))] }; });
}

// ---------- Per-client merged timeline ----------
export function clientTimeline(c) {
  const ev = [];
  for (const a of (c.activities || [])) ev.push({ date: a.date, kind: 'activity', sub: a.type, title: a.subject || (ACTIVITY_META[a.type] || ACTIVITY_META.note).label(), detail: a.body || '' });
  for (const tk of (c.tasks || [])) ev.push({ date: tk.due || (tk.createdAt ? new Date(tk.createdAt).toISOString().slice(0, 10) : ''), kind: 'task', sub: tk.done ? 'done' : 'open', title: tk.title, detail: tk.done ? t('Terminée', 'Completed') : t('À faire', 'To do') });
  for (const o of (c.opportunities || [])) {
    const od = o.openedAt ? new Date(o.openedAt).toISOString().slice(0, 10) : (o.expectedClose || '');
    ev.push({ date: od, kind: 'opportunity', sub: o.stage, title: o.title, detail: (STAGE_META[o.stage] || {}).label?.() || o.stage });
  }
  for (const p of (c.products || [])) if (p.issueDate) ev.push({ date: p.issueDate, kind: 'product', sub: p.kind, title: `${(PRODUCT_KIND_META[p.kind] || { label: () => p.kind }).label()} — ${p.carrier || ''}`, detail: p.policyNumber || '' });
  return ev.filter(e => e.date).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

