// ============================================================
// Life Timeline / Milestones view
// Renders a horizontal financial roadmap from the primary
// member's current age to the max life expectancy.
// ============================================================
import { h, icon, t } from '../dom.js';
import { kpi, card, legend } from '../widgets.js';
import { PALETTE } from '../charts.js';
import { runProjection } from '../../engine/projection.js';
import { CURRENT_YEAR } from '../../state/models.js';

// ---- Category colour map ----
const CAT_COLORS = {
  retirement: 'var(--brand-500)',
  pension:    'var(--accent)',
  education:  PALETTE[3],   // purple #8e6fd6
  goal:       PALETTE[2],   // amber  #f5a623
  debt:       PALETTE[6],   // green  #6bbf59
  risk:       'var(--neg)',
  life:       'var(--text-3)',
};

const CAT_LABEL = {
  retirement: () => t('Retraite',       'Retirement'),
  pension:    () => t('Pension publique','Public pension'),
  education:  () => t('Études',         'Education'),
  goal:       () => t('Objectif',       'Goal'),
  debt:       () => t('Dette',          'Debt'),
  risk:       () => t('Risque capital', 'Capital risk'),
  life:       () => t('Espérance de vie','Life expectancy'),
};

// ---- Mortgage payoff estimate ----
// Quick per-liability amortization loop; returns payoff age for the primary member.
function mortgagePayoffAge(client) {
  const primary = client.members[0];
  if (!primary) return null;

  // Consider only mortgage/credit liabilities with a balance
  const mortgages = (client.liabilities || []).filter(
    l => l.balance > 0 && l.rate > 0 && l.payment > 0 &&
         ['mortgage', 'heloc', 'credit', 'loan', 'other'].includes(l.type || 'mortgage'),
  );
  if (!mortgages.length) return null;

  // Use the largest liability as the primary one to report
  const m = mortgages.reduce((best, l) => (l.balance > best.balance ? l : best), mortgages[0]);

  let bal = m.balance;
  const annualPay = m.payment * 12;
  const maxYears = 40;
  for (let y = 1; y <= maxYears; y++) {
    bal = bal * (1 + m.rate) - annualPay;
    if (bal <= 0) {
      return primary.currentAge + y;
    }
  }
  return null; // not paid off in window
}

// ---- Build sorted event list ----
function buildEvents(client, proj) {
  const primary = client.members[0];
  if (!primary) return [];

  const nowAge  = primary.currentAge;
  const nowYear = CURRENT_YEAR;
  const events  = [];

  const push = (age, label, category) => {
    if (age == null || isNaN(age)) return;
    const year = nowYear + (age - nowAge);
    events.push({ age, year, label, category, color: CAT_COLORS[category] || CAT_COLORS.goal });
  };

  // 1. Each member's retirement
  for (const m of (client.members || [])) {
    // Convert partner age at primary's retirement time to primary-age space
    const retPrimaryAge = m === primary
      ? m.retirementAge
      : nowAge + (m.retirementAge - m.currentAge);
    const label = primary.name !== m.name
      ? t(`Retraite ${m.name}`, `${m.name} retires`)
      : t(`Retraite ${m.name}`, `${m.name} retires`);
    push(retPrimaryAge, label, 'retirement');
  }

  // 2. Public pensions (CPP / OAS / similar) — startAge is member's own age
  for (const inc of (client.incomes || [])) {
    if (!['cpp', 'oas'].includes(inc.type)) continue;
    const member = (client.members || []).find(m => m.id === inc.memberId) || primary;
    // Convert from member's age to primary's age at the same calendar year
    const ageDiff = member.currentAge - primary.currentAge;
    const primaryAgeAtEvent = inc.startAge - ageDiff;
    const label = inc.label || (inc.type === 'cpp'
      ? t('RPC / CPP', 'CPP starts')
      : t('PSV / OAS', 'OAS starts'));
    push(primaryAgeAtEvent, label, 'pension');
  }

  // 3. Dependent education starts (post-secondary)
  for (const dep of (client.dependents || [])) {
    const eduAge = dep.educationGoalAge ?? 18;
    const primaryAgeAtEvent = nowAge + (eduAge - dep.age);
    const label = t(`Études ${dep.name}`, `${dep.name} education`);
    push(primaryAgeAtEvent, label, 'education');
  }

  // 4. Explicit goals with targetAge
  for (const g of (client.goals || [])) {
    if (g.targetAge == null) continue;
    push(g.targetAge, g.name, 'goal');
  }

  // 5. Mortgage payoff
  const payoffAge = mortgagePayoffAge(client);
  if (payoffAge != null) {
    push(payoffAge, t('Hypothèque remboursée', 'Mortgage paid off'), 'debt');
  }

  // 6. Capital depletion
  if (proj.summary.depletionAge != null) {
    push(proj.summary.depletionAge, t('Épuisement du capital', 'Capital depletion'), 'risk');
  }

  // 7. Life expectancy end markers for each member
  for (const m of (client.members || [])) {
    const lePrimaryAge = m === primary
      ? m.lifeExpectancy
      : nowAge + (m.lifeExpectancy - m.currentAge);
    const label = t(`Décès ${m.name}`, `${m.name} life expectancy`);
    push(lePrimaryAge, label, 'life');
  }

  // Sort by age
  events.sort((a, b) => a.age - b.age);
  return events;
}

// ---- SVG timeline builder ----
function buildTimelineSVG(events, minAge, maxAge, nowAge, nowYear) {
  const VW = 1000, VH = 260;
  const PAD_L = 30, PAD_R = 30, PAD_T = 20, PAD_B = 30;
  const axisY = VH - PAD_B - 30;   // y position of the horizontal axis
  const textBandH = axisY - PAD_T; // height available for labels above axis

  const ageRange = maxAge - minAge || 1;
  const xOf = (age) => PAD_L + ((age - minAge) / ageRange) * (VW - PAD_L - PAD_R);

  // --- Axis & ticks ---
  let svg = '';

  // Axis line
  svg += `<line x1="${PAD_L}" y1="${axisY}" x2="${VW - PAD_R}" y2="${axisY}" stroke="var(--border)" stroke-width="1.5"/>`;

  // Ticks every 5 years
  const tickStart = Math.ceil(minAge / 5) * 5;
  for (let age = tickStart; age <= maxAge; age += 5) {
    const x = xOf(age);
    const yr  = nowYear + (age - nowAge);
    svg += `<line x1="${x.toFixed(1)}" y1="${(axisY - 4).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(axisY + 4).toFixed(1)}" stroke="var(--text-3)" stroke-width="1"/>`;
    svg += `<text x="${x.toFixed(1)}" y="${(axisY + 15).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="var(--text-3)">${age}</text>`;
    svg += `<text x="${x.toFixed(1)}" y="${(axisY + 25).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="var(--text-3)" opacity="0.65">${yr}</text>`;
  }

  // --- Today marker ---
  const nowX = xOf(nowAge);
  svg += `<line x1="${nowX.toFixed(1)}" y1="${PAD_T}" x2="${nowX.toFixed(1)}" y2="${axisY}" stroke="var(--accent-2)" stroke-width="1.5" stroke-dasharray="4 3"/>`;
  svg += `<text x="${nowX.toFixed(1)}" y="${PAD_T - 4}" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--accent-2)">${t("Aujourd'hui", 'Today')}</text>`;

  // --- Events: stagger labels above/below axis to reduce overlap ---
  // Group events by x proximity (within 40 px) and alternate above/below
  // "above" = label placed above axis connector; "below" = below
  const RADIUS  = 5;
  const CONN_H  = 18;   // connector line length
  const SLOT_W  = 42;   // px slot width for collision detection
  const slotMap  = {};  // slotIndex -> last used row

  events.forEach((ev, idx) => {
    const x = xOf(ev.age);
    const slotIdx = Math.round(x / SLOT_W);
    const sameSlot = slotMap[slotIdx] || slotMap[slotIdx - 1] || slotMap[slotIdx + 1] || 0;
    const isAbove  = sameSlot % 2 === 0;
    slotMap[slotIdx] = sameSlot + 1;

    const dotY    = axisY;
    const connLen = CONN_H + Math.floor(sameSlot / 2) * 14; // push further up/down for crowded slots
    const connY   = isAbove ? dotY - RADIUS - connLen : dotY + RADIUS + connLen;
    const labelY  = isAbove ? connY - 3 : connY + 11;

    // Connector
    svg += `<line x1="${x.toFixed(1)}" y1="${(dotY - RADIUS).toFixed(1)}" x2="${x.toFixed(1)}" y2="${connY.toFixed(1)}" stroke="${ev.color}" stroke-width="1" opacity="0.6"/>`;

    // Dot on axis
    svg += `<circle cx="${x.toFixed(1)}" cy="${dotY}" r="${RADIUS}" fill="${ev.color}"/>`;

    // Label (rotated -30° to save horizontal space)
    const anchor = isAbove ? 'start' : 'start';
    const rotateY = isAbove ? connY - 2 : connY + 2;
    svg += `<text x="${x.toFixed(1)}" y="${rotateY}" font-size="9.5" fill="${ev.color}" font-weight="600"
      transform="rotate(-28, ${x.toFixed(1)}, ${rotateY})"
      text-anchor="start" dominant-baseline="auto">${escSvg(ev.label)}</text>`;
  });

  return `<svg viewBox="0 0 ${VW} ${VH}" width="100%" preserveAspectRatio="xMidYMid meet" font-family="var(--font)">${svg}</svg>`;
}

function escSvg(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---- Main render ----
export function render({ client, jur }) {
  const primary  = (client.members || [])[0];
  if (!primary) {
    return h('div', { class: 'grid' },
      h('div', { class: 'empty' }, t('Aucun membre principal trouvé.', 'No primary member found.')));
  }

  const proj     = runProjection(client);
  const nowAge   = primary.currentAge;
  const nowYear  = CURRENT_YEAR;

  // Age range: from nowAge to the furthest life expectancy across all members
  const maxLE = Math.max(...(client.members || []).map(m => m.lifeExpectancy || 90), nowAge + 1);
  const minAge = nowAge;
  const maxAge = maxLE;

  const events   = buildEvents(client, proj);

  // ---- KPIs ----
  const retAge   = primary.retirementAge;
  const yearsToRetire = Math.max(0, retAge - nowAge);
  const planHorizon   = maxAge - nowAge;
  const upcoming      = events.filter(ev => ev.age > nowAge).length;

  const kpiRow = h('div', { class: 'grid cols-3 span-full' },
    kpi({
      label:    t('Années avant la retraite', 'Years to retirement'),
      value:    `${yearsToRetire}`,
      sub:      t(`Retraite à ${retAge} ans`, `Retirement at ${retAge}`),
      iconName: 'retire',
      accent:   yearsToRetire <= 5 ? 'var(--warn)' : undefined,
    }),
    kpi({
      label:    t('Jalons à venir', 'Upcoming milestones'),
      value:    `${upcoming}`,
      sub:      t('Événements dans le plan', 'Events in the plan'),
      iconName: 'timeline',
    }),
    kpi({
      label:    t('Horizon de planification', 'Planning horizon'),
      value:    `${planHorizon} ${t('ans', 'yrs')}`,
      sub:      t(`De ${nowAge} à ${maxAge} ans · ${nowYear}–${nowYear + planHorizon}`,
                  `From ${nowAge} to ${maxAge} · ${nowYear}–${nowYear + planHorizon}`),
      iconName: 'cap',
    }),
  );

  // ---- Timeline SVG card ----
  const timelineSvg = buildTimelineSVG(events, minAge, maxAge, nowAge, nowYear);

  const legendItems = Object.entries(CAT_COLORS).map(([cat, color]) => ({
    color,
    label: CAT_LABEL[cat](),
  }));

  const timelineCard = card(
    t('Échéancier de vie', 'Life timeline'),
    {
      class: 'span-full',
      sub: t(
        `Jalons financiers de ${nowAge} à ${maxAge} ans`,
        `Financial milestones from age ${nowAge} to ${maxAge}`,
      ),
      right: h('span', { html: icon('timeline', 16) }),
    },
    h('div', { html: timelineSvg }),
    h('div', { class: 'sep' }),
    legend(legendItems),
  );

  // ---- Upcoming milestones agenda card ----
  const futureEvents = events.filter(ev => ev.age >= nowAge);

  const agendaItems = futureEvents.length
    ? futureEvents.map(ev =>
        h('div', { class: 'flex', style: { gap: '12px', padding: '9px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' } },
          // Colored dot
          h('span', { style: {
            display: 'inline-block',
            width: '10px', height: '10px',
            borderRadius: '50%',
            background: ev.color,
            flex: 'none',
          }}),
          // Age / year badge
          h('span', { class: 'chip info mono', style: { flex: 'none', fontSize: '11px' } },
            `${ev.age} ${t('ans', 'yrs')} · ${ev.year}`,
          ),
          // Label
          h('span', { style: { flex: '1', fontSize: '13px' } }, ev.label),
          // Category pill
          h('span', { class: 'chip', style: { flex: 'none', fontSize: '10px', background: ev.color, color: '#fff', opacity: '0.9' } },
            CAT_LABEL[ev.category](),
          ),
        )
      )
    : [h('div', { class: 'empty' },
        h('div', { class: 'big' }, '—'),
        t('Aucun jalon défini.', 'No milestones defined.'),
      )];

  const agendaCard = card(
    t('Prochaines étapes', 'Upcoming milestones'),
    {
      class: 'span-full',
      sub: t(`${futureEvents.length} événements planifiés`, `${futureEvents.length} planned events`),
    },
    h('div', {}, ...agendaItems),
  );

  return h('div', { class: 'grid' }, kpiRow, timelineCard, agendaCard);
}
