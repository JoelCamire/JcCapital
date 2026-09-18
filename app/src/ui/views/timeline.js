// ============================================================
// Life Timeline / Milestones view
// Renders a horizontal financial roadmap from the primary
// member's current age to the max life expectancy. Every milestone
// comes from the facts layer (pensions, mortgage payoff, dependents).
// ============================================================
import { h, icon, t } from '../dom.js';
import { kpi, card, legend } from '../widgets.js';
import { PALETTE } from '../charts.js';
import { CURRENT_YEAR } from '../../state/models.js';
import { clientFacts, retirementFacts } from '../../engine/facts.js';

// ---- Category colour map ----
const CAT_COLORS = {
  retirement: 'var(--brand-500)',
  pension:    'var(--accent)',
  education:  PALETTE[3],
  goal:       PALETTE[2],
  debt:       PALETTE[6],
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

// ---- Build sorted event list (ages in the primary's age space) ----
function buildEvents(client, jur, F, R) {
  const primary = F.primary;
  if (!primary) return [];
  const nowAge  = primary.age;
  const nowYear = CURRENT_YEAR;
  const events  = [];
  const toPrimaryAge = (member, ageOfMember) => nowAge + (ageOfMember - member.age);

  const push = (age, label, category) => {
    if (age == null || isNaN(age)) return;
    const year = nowYear + Math.round(age - nowAge);
    events.push({ age: Math.round(age * 10) / 10, year, label, category, color: CAT_COLORS[category] || CAT_COLORS.goal });
  };

  // 1. Each member's retirement
  for (const m of F.members) push(toPrimaryAge(m, m.retirementAge), t(`Retraite ${m.name}`, `${m.name} retires`), 'retirement');

  // 2. Public pensions — start ages from the facts (client-specific when on file, else jurisdiction normal age)
  const cppName = jur.pensions?.cpp?.name || 'CPP', oasName = jur.pensions?.oas?.name || 'OAS';
  for (const m of F.members) {
    const P = F.pensions[m.id];
    if (P.cpp.annual > 0) push(toPrimaryAge(m, P.cpp.startAge), F.members.length > 1 ? `${cppName} — ${m.name}` : cppName, 'pension');
    if (P.oas.annual > 0) push(toPrimaryAge(m, P.oas.startAge), F.members.length > 1 ? `${oasName} — ${m.name}` : oasName, 'pension');
  }

  // 3. Dependent education starts (ages kept current by the store)
  for (const dep of F.education.dependents) {
    if (dep.yearsToGoal <= 0) continue;
    push(nowAge + dep.yearsToGoal, t(`Études ${dep.name}`, `${dep.name} education`), 'education');
  }

  // 4. Explicit goals with targetAge (retirement goals are already shown as the retirement milestone)
  for (const g of (client.goals || [])) {
    if (g.targetAge == null || g.type === 'retirement') continue;
    if (g.type === 'education') continue;                      // covered by the dependents' milestones
    push(+g.targetAge, g.name, 'goal');
  }

  // 5. Mortgage payoff — shared amortization engine (incl. persisted extra payments)
  if (F.mortgage && Number.isFinite(F.mortgage.payoffYears) && F.mortgage.payoffYears > 0) {
    push(nowAge + F.mortgage.payoffYears, t('Hypothèque remboursée', 'Mortgage paid off'), 'debt');
  }
  // other debts paid off after the mortgage horizon are not shown individually; the last debt-free date is
  const lastPayoff = F.liabilities.filter(l => l.balance > 0 && Number.isFinite(l.payoffYears)).reduce((mx, l) => Math.max(mx, l.payoffYears), 0);
  if (lastPayoff > 0 && (!F.mortgage || Math.abs(lastPayoff - F.mortgage.payoffYears) > 0.5)) push(nowAge + lastPayoff, t('Sans dette', 'Debt-free'), 'debt');

  // 6. Capital depletion
  if (R.depletionAge != null) push(R.depletionAge, t('Épuisement du capital', 'Capital depletion'), 'risk');

  // 7. Life expectancy markers
  for (const m of F.members) push(toPrimaryAge(m, m.lifeExpectancy), t(`Décès ${m.name}`, `${m.name} life expectancy`), 'life');

  events.sort((a, b) => a.age - b.age);
  return events;
}

// ---- SVG timeline builder ----
function buildTimelineSVG(events, minAge, maxAge, nowAge, nowYear) {
  const VW = 1000, VH = 260;
  const PAD_L = 30, PAD_R = 30, PAD_T = 20, PAD_B = 30;
  const axisY = VH - PAD_B - 30;
  const ageRange = maxAge - minAge || 1;
  const xOf = (age) => PAD_L + ((age - minAge) / ageRange) * (VW - PAD_L - PAD_R);

  let svg = '';
  svg += `<line x1="${PAD_L}" y1="${axisY}" x2="${VW - PAD_R}" y2="${axisY}" stroke="var(--border)" stroke-width="1.5"/>`;
  const tickStart = Math.ceil(minAge / 5) * 5;
  for (let age = tickStart; age <= maxAge; age += 5) {
    const x = xOf(age);
    const yr = nowYear + (age - nowAge);
    svg += `<line x1="${x.toFixed(1)}" y1="${(axisY - 4).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(axisY + 4).toFixed(1)}" stroke="var(--text-3)" stroke-width="1"/>`;
    svg += `<text x="${x.toFixed(1)}" y="${(axisY + 15).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="var(--text-3)">${age}</text>`;
    svg += `<text x="${x.toFixed(1)}" y="${(axisY + 25).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="var(--text-3)" opacity="0.65">${yr}</text>`;
  }
  const nowX = xOf(nowAge);
  svg += `<line x1="${nowX.toFixed(1)}" y1="${PAD_T}" x2="${nowX.toFixed(1)}" y2="${axisY}" stroke="var(--accent-2)" stroke-width="1.5" stroke-dasharray="4 3"/>`;
  svg += `<text x="${nowX.toFixed(1)}" y="${PAD_T - 4}" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--accent-2)">${t("Aujourd'hui", 'Today')}</text>`;

  const RADIUS = 5, CONN_H = 18, SLOT_W = 42;
  const slotMap = {};
  events.forEach((ev) => {
    const x = xOf(ev.age);
    const slotIdx = Math.round(x / SLOT_W);
    const sameSlot = slotMap[slotIdx] || slotMap[slotIdx - 1] || slotMap[slotIdx + 1] || 0;
    const isAbove = sameSlot % 2 === 0;
    slotMap[slotIdx] = sameSlot + 1;
    const dotY = axisY;
    const connLen = CONN_H + Math.floor(sameSlot / 2) * 14;
    const connY = isAbove ? dotY - RADIUS - connLen : dotY + RADIUS + connLen;
    svg += `<line x1="${x.toFixed(1)}" y1="${(dotY - RADIUS).toFixed(1)}" x2="${x.toFixed(1)}" y2="${connY.toFixed(1)}" stroke="${ev.color}" stroke-width="1" opacity="0.6"/>`;
    svg += `<circle cx="${x.toFixed(1)}" cy="${dotY}" r="${RADIUS}" fill="${ev.color}"/>`;
    const rotateY = isAbove ? connY - 2 : connY + 2;
    svg += `<text x="${x.toFixed(1)}" y="${rotateY}" font-size="9.5" fill="${ev.color}" font-weight="600" transform="rotate(-28, ${x.toFixed(1)}, ${rotateY})" text-anchor="start" dominant-baseline="auto">${escSvg(ev.label)}</text>`;
  });

  return `<svg viewBox="0 0 ${VW} ${VH}" width="100%" preserveAspectRatio="xMidYMid meet" font-family="var(--font)">${svg}</svg>`;
}

function escSvg(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---- Main render ----
export function render({ client, jur }) {
  const F = clientFacts(client, jur);
  const primary = F.primary;
  if (!primary) {
    return h('div', { class: 'grid' }, h('div', { class: 'empty' }, t('Aucun membre principal trouvé.', 'No primary member found.')));
  }
  const R = retirementFacts(client, jur);
  const nowAge = primary.age;
  const nowYear = CURRENT_YEAR;

  const maxLE = Math.max(...F.members.map(m => nowAge + (m.lifeExpectancy - m.age)), nowAge + 1);
  const minAge = nowAge;
  const maxAge = Math.ceil(maxLE);
  const events = buildEvents(client, jur, F, R);

  const retAge = primary.retirementAge;
  const yearsToRetire = Math.max(0, retAge - nowAge);
  const planHorizon = maxAge - nowAge;
  const upcoming = events.filter(ev => ev.age > nowAge).length;

  const kpiRow = h('div', { class: 'grid cols-3 span-full' },
    kpi({ label: t('Années avant la retraite', 'Years to retirement'), value: `${yearsToRetire}`, sub: t(`Retraite à ${retAge} ans`, `Retirement at ${retAge}`), iconName: 'retire', accent: yearsToRetire <= 5 ? 'var(--warn)' : undefined }),
    kpi({ label: t('Jalons à venir', 'Upcoming milestones'), value: `${upcoming}`, sub: t('Événements dans le plan', 'Events in the plan'), iconName: 'timeline' }),
    kpi({ label: t('Horizon de planification', 'Planning horizon'), value: `${planHorizon} ${t('ans', 'yrs')}`,
      sub: t(`De ${nowAge} à ${maxAge} ans · ${nowYear}–${nowYear + planHorizon}`, `From ${nowAge} to ${maxAge} · ${nowYear}–${nowYear + planHorizon}`), iconName: 'cap' }),
  );

  const timelineSvg = buildTimelineSVG(events, minAge, maxAge, nowAge, nowYear);
  const legendItems = Object.entries(CAT_COLORS).map(([cat, color]) => ({ color, label: CAT_LABEL[cat]() }));

  const timelineCard = card(t('Échéancier de vie', 'Life timeline'), { class: 'span-full',
    sub: t(`Jalons financiers de ${nowAge} à ${maxAge} ans (âge de ${primary.name})`, `Financial milestones from age ${nowAge} to ${maxAge} (${primary.name}'s age)`),
    right: h('span', { html: icon('timeline', 16) }) },
    h('div', { html: timelineSvg }), h('div', { class: 'sep' }), legend(legendItems));

  const futureEvents = events.filter(ev => ev.age >= nowAge);
  const agendaItems = futureEvents.length
    ? futureEvents.map(ev =>
        h('div', { class: 'flex', style: { gap: '12px', padding: '9px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' } },
          h('span', { style: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: ev.color, flex: 'none' } }),
          h('span', { class: 'chip info mono', style: { flex: 'none', fontSize: '11px' } }, `${Math.round(ev.age)} ${t('ans', 'yrs')} · ${ev.year}`),
          h('span', { style: { flex: '1', fontSize: '13px' } }, ev.label),
          h('span', { class: 'chip', style: { flex: 'none', fontSize: '10px', background: ev.color, color: '#fff', opacity: '0.9' } }, CAT_LABEL[ev.category]()),
        ))
    : [h('div', { class: 'empty' }, h('div', { class: 'big' }, '—'), t('Aucun jalon défini.', 'No milestones defined.'))];

  const agendaCard = card(t('Prochaines étapes', 'Upcoming milestones'), { class: 'span-full', sub: t(`${futureEvents.length} événements planifiés`, `${futureEvents.length} planned events`) },
    h('div', {}, ...agendaItems));

  return h('div', { class: 'grid' }, kpiRow, timelineCard, agendaCard);
}
