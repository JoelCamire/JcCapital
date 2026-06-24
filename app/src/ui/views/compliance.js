// ============================================================
// Tax & Compliance Calendar Dashboard
// Jurisdiction-aware annual filing/deadline tracker.
// ============================================================
import { h, icon, fmtDate, t } from '../dom.js';
import { kpi, card, legend } from '../widgets.js';

// ---- Colour palette per category ----
const CAT_COLOR = {
  personal:     'var(--brand-500)',
  corporate:    'var(--accent)',
  registered:   '#8A6E4C',
  installment:  '#C2922F',
};

const CAT_LABEL = {
  personal:    () => t('Personnel', 'Personal'),
  corporate:   () => t('Entreprise', 'Corporate'),
  registered:  () => t('Comptes enregistrés', 'Registered accounts'),
  installment: () => t('Acomptes provisionnels', 'Tax instalments'),
};

// ---- Date helpers ----
/** Return the next occurrence of MM-DD at or after today. */
function nextOccurrence(month, day) {
  const today = new Date();
  const thisYear = today.getFullYear();
  const candidate = new Date(thisYear, month - 1, day);
  if (candidate >= today) return candidate;
  return new Date(thisYear + 1, month - 1, day);
}

/** Days from today to a date (negative = past). */
function daysUntil(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

// ---- Deadline definitions per country ----
function buildDeadlines(country) {
  if (country === 'CA') {
    return [
      {
        key: 'ca_tfsa_room',
        title: t('Nouveau plafond CELI', 'New TFSA room'),
        date: nextOccurrence(1, 1),
        category: 'registered',
      },
      {
        key: 'ca_cpp_installment_mar',
        title: t('Acompte provisionnel — mars', 'Tax instalment — March'),
        date: nextOccurrence(3, 15),
        category: 'installment',
      },
      {
        key: 'ca_rrsp',
        title: t('Date limite cotisation REER', 'RRSP contribution deadline'),
        date: nextOccurrence(3, 1),
        category: 'registered',
      },
      {
        key: 'ca_corp_tax_balance',
        title: t('Solde impôt société (SPCC)', 'Corporate tax balance due (CCPC)'),
        date: nextOccurrence(3, 31),
        category: 'corporate',
        forBusinessOnly: true,
      },
      {
        key: 'ca_t1',
        title: t('Production déclaration T1', 'T1 personal tax filing'),
        date: nextOccurrence(4, 30),
        category: 'personal',
      },
      {
        key: 'ca_gst_hst',
        title: t('Déclaration TPS/TVH annuelle', 'GST/HST annual filing'),
        date: nextOccurrence(4, 30),
        category: 'corporate',
        forBusinessOnly: true,
      },
      {
        key: 'ca_self_employed',
        title: t('Production déclaration (travailleur autonome)', 'Self-employed T1 filing'),
        date: nextOccurrence(6, 15),
        category: 'personal',
      },
      {
        key: 'ca_installment_jun',
        title: t('Acompte provisionnel — juin', 'Tax instalment — June'),
        date: nextOccurrence(6, 15),
        category: 'installment',
      },
      {
        key: 'ca_t2',
        title: t('Production T2 société (fin juin)', 'Corporate T2 filing (June YE)'),
        date: nextOccurrence(6, 30),
        category: 'corporate',
        forBusinessOnly: true,
      },
      {
        key: 'ca_installment_sep',
        title: t('Acompte provisionnel — septembre', 'Tax instalment — September'),
        date: nextOccurrence(9, 15),
        category: 'installment',
      },
      {
        key: 'ca_installment_dec',
        title: t('Acompte provisionnel — décembre', 'Tax instalment — December'),
        date: nextOccurrence(12, 15),
        category: 'installment',
      },
      {
        key: 'ca_rrif_min',
        title: t('Retrait minimum FERR', 'RRIF minimum withdrawal'),
        date: nextOccurrence(12, 31),
        category: 'registered',
      },
      {
        key: 'ca_charitable',
        title: t('Dons de bienfaisance (déduction)', 'Charitable donations deadline'),
        date: nextOccurrence(12, 31),
        category: 'personal',
      },
      {
        key: 'ca_fhsa',
        title: t('Cotisation CELIAPP', 'FHSA contribution deadline'),
        date: nextOccurrence(12, 31),
        category: 'registered',
      },
    ];
  }

  if (country === 'US') {
    return [
      {
        key: 'us_estimated_jan',
        title: t('Acompte estimé — janvier (Q4)', 'Estimated tax — January (Q4)'),
        date: nextOccurrence(1, 15),
        category: 'installment',
      },
      {
        key: 'us_s_corp',
        title: t('Déclaration S-Corp / société de personnes', 'S-Corp / Partnership return'),
        date: nextOccurrence(3, 15),
        category: 'corporate',
        forBusinessOnly: true,
      },
      {
        key: 'us_1040',
        title: t('Déclaration Form 1040', 'Form 1040 filing'),
        date: nextOccurrence(4, 15),
        category: 'personal',
      },
      {
        key: 'us_ira',
        title: t('Cotisation IRA', 'IRA contribution deadline'),
        date: nextOccurrence(4, 15),
        category: 'registered',
      },
      {
        key: 'us_c_corp',
        title: t('Déclaration C-Corp', 'C-Corp tax return'),
        date: nextOccurrence(4, 15),
        category: 'corporate',
        forBusinessOnly: true,
      },
      {
        key: 'us_estimated_apr',
        title: t('Acompte estimé — avril (Q1)', 'Estimated tax — April (Q1)'),
        date: nextOccurrence(4, 15),
        category: 'installment',
      },
      {
        key: 'us_estimated_jun',
        title: t('Acompte estimé — juin (Q2)', 'Estimated tax — June (Q2)'),
        date: nextOccurrence(6, 15),
        category: 'installment',
      },
      {
        key: 'us_estimated_sep',
        title: t('Acompte estimé — septembre (Q3)', 'Estimated tax — September (Q3)'),
        date: nextOccurrence(9, 15),
        category: 'installment',
      },
      {
        key: 'us_401k',
        title: t('Cotisation 401(k)', '401(k) contribution deadline'),
        date: nextOccurrence(12, 31),
        category: 'registered',
      },
      {
        key: 'us_rmd',
        title: t('Distribution minimale requise (RMD)', 'Required minimum distribution (RMD)'),
        date: nextOccurrence(12, 31),
        category: 'registered',
      },
    ];
  }

  if (country === 'UK') {
    return [
      {
        key: 'uk_self_assess',
        title: t('Déclaration Self Assessment (en ligne)', 'Self Assessment online filing'),
        date: nextOccurrence(1, 31),
        category: 'personal',
      },
      {
        key: 'uk_poa1',
        title: t('Paiement sur compte — 1er versement', 'Payment on account — 1st instalment'),
        date: nextOccurrence(1, 31),
        category: 'installment',
      },
      {
        key: 'uk_isa',
        title: t('Date limite ISA', 'ISA annual deadline'),
        date: nextOccurrence(4, 5),
        category: 'registered',
      },
      {
        key: 'uk_tax_year_end',
        title: t('Fin de l’année fiscale', 'End of tax year'),
        date: nextOccurrence(4, 5),
        category: 'personal',
      },
      {
        key: 'uk_pension_allowance',
        title: t('Plafond annuel de retraite', 'Pension annual allowance'),
        date: nextOccurrence(4, 5),
        category: 'registered',
      },
      {
        key: 'uk_poa2',
        title: t('Paiement sur compte — 2e versement', 'Payment on account — 2nd instalment'),
        date: nextOccurrence(7, 31),
        category: 'installment',
      },
      {
        key: 'uk_corp_tax',
        title: t('Paiement impôt société (9 mois après EF)', 'Corporation tax payment (9 months after YE)'),
        date: nextOccurrence(1, 1),
        category: 'corporate',
        forBusinessOnly: true,
      },
      {
        key: 'uk_ct600',
        title: t('Production CT600 (12 mois après EF)', 'CT600 filing (12 months after YE)'),
        date: nextOccurrence(12, 31),
        category: 'corporate',
        forBusinessOnly: true,
      },
    ];
  }

  return [];
}

// ---- Badge colour based on days remaining ----
function urgencyClass(days) {
  if (days < 14) return 'neg';
  if (days < 45) return 'warn';
  return 'info';
}

// ---- Main render ----
export function render({ client, jur }) {
  const country  = jur.country || 'CA';
  const hasBiz   = !!(client.business);
  const allDeadlines = buildDeadlines(country);

  // Sort chronologically
  allDeadlines.sort((a, b) => a.date - b.date);

  const today = new Date();

  // KPI counts
  const next30 = allDeadlines.filter(d => {
    const days = daysUntil(d.date);
    return days >= 0 && days <= 30;
  }).length;

  const next90 = allDeadlines.filter(d => {
    const days = daysUntil(d.date);
    return days >= 0 && days <= 90;
  }).length;

  const nextDeadline = allDeadlines.find(d => daysUntil(d.date) >= 0);
  const nextDays     = nextDeadline ? daysUntil(nextDeadline.date) : null;

  // ---- KPI row ----
  const kpiRow = h('div', { class: 'grid cols-4 span-full' },
    kpi({
      label:    t('Prochaine échéance', 'Next deadline'),
      value:    nextDeadline ? nextDeadline.title : '—',
      sub:      nextDays != null
        ? (nextDays === 0
            ? t("Aujourd'hui", 'Today')
            : `${nextDays} ${t('jours', 'days')}`)
        : '—',
      iconName: 'tax',
      accent:   nextDays != null && nextDays < 14 ? 'var(--neg)' : nextDays != null && nextDays < 45 ? 'var(--warn)' : undefined,
    }),
    kpi({
      label:    t('Échéances dans 30 jours', 'Deadlines in 30 days'),
      value:    String(next30),
      sub:      t('Attention requise', 'Attention required'),
      iconName: 'warning',
      accent:   next30 > 0 ? 'var(--warn)' : undefined,
    }),
    kpi({
      label:    t('Échéances dans 90 jours', 'Deadlines in 90 days'),
      value:    String(next90),
      sub:      t('Planification conseillée', 'Planning recommended'),
      iconName: 'timeline',
    }),
    kpi({
      label:    t('Conformité fiscale', 'Tax compliance'),
      value:    next30 === 0 ? t('Aucune urgence', 'No urgency') : next30 === 1 ? t('1 urgence', '1 urgent') : `${next30} ${t('urgences', 'urgent')}`,
      sub:      `${jur.flag || ''} ${jur.name || country}`,
      iconName: 'check',
      accent:   next30 === 0 ? 'var(--pos)' : 'var(--warn)',
    }),
  );

  // ---- Agenda rows ----
  const agendaRows = allDeadlines.map(dl => {
    const days = daysUntil(dl.date);
    const urgency = urgencyClass(days);
    const catColor = CAT_COLOR[dl.category] || 'var(--text-3)';
    const isBiz = !!dl.forBusinessOnly;

    return h('div', {
      class: 'flex',
      style: {
        gap: '12px',
        padding: '10px 0',
        borderBottom: '1px solid var(--border)',
        alignItems: 'center',
        opacity: isBiz && !hasBiz ? '0.45' : '1',
      },
    },
      // Category dot
      h('span', { style: {
        display: 'inline-block',
        width: '10px', height: '10px',
        borderRadius: '50%',
        background: catColor,
        flex: 'none',
      }}),

      // Date badge
      h('span', { class: 'chip info mono', style: { flex: 'none', fontSize: '11px', minWidth: '108px' } },
        fmtDate(dl.date.toISOString()),
      ),

      // Title
      h('span', { style: { flex: '1', fontSize: '13px' } }, dl.title),

      // Business-only chip
      isBiz
        ? h('span', { class: 'chip', style: { flex: 'none', fontSize: '10px', background: 'var(--accent)', color: 'var(--c-black)', opacity: '0.85' } },
            h('span', { html: icon('briefcase', 11) }),
            ' ', t('Entreprise', 'Business'),
          )
        : null,

      // Category chip
      h('span', { class: 'chip', style: { flex: 'none', fontSize: '10px', background: catColor, color: '#fff', opacity: '0.9' } },
        CAT_LABEL[dl.category](),
      ),

      // Days remaining badge
      h('span', { class: 'chip ' + urgency, style: { flex: 'none', fontVariantNumeric: 'tabular-nums', minWidth: '72px', textAlign: 'right' } },
        days === 0
          ? t("Aujourd'hui", 'Today')
          : `${days} ${t('j', 'd')}`,
      ),
    );
  });

  const agendaCard = card(
    t('Calendrier des échéances', 'Compliance calendar'),
    {
      class: 'span-full',
      sub: t(
        `${allDeadlines.length} échéances — prochain cycle`,
        `${allDeadlines.length} deadlines — next cycle`,
      ),
      right: h('span', { html: icon('report', 16) }),
    },
    h('div', {}, ...agendaRows),
  );

  // ---- Legend ----
  const legendItems = Object.entries(CAT_COLOR).map(([cat, color]) => ({
    color,
    label: CAT_LABEL[cat](),
  }));

  const legendCard = card(
    t('Légende des catégories', 'Category legend'),
    { class: 'span-full' },
    legend(legendItems),
    h('div', { class: 'sep' }),
    h('div', { class: 'tiny muted', style: { marginTop: '10px', lineHeight: '1.6' } },
      icon('warning', 13),
      ' ',
      t(
        'Les dates indiquées sont à titre indicatif et peuvent varier selon la situation personnelle, la date de clôture de l’exercice fiscal ou les règles locales. Consultez un conseiller fiscal qualifié.',
        'Dates shown are general guidance and may vary based on personal circumstances, fiscal year-end, or local rules. Consult a qualified tax adviser.',
      ),
    ),
  );

  // ---- Business info banner (when no business on file) ----
  const bizBanner = !hasBiz
    ? h('div', { class: 'card span-full', style: { background: 'var(--surface-2)', borderLeft: '3px solid var(--accent)' } },
        h('div', { class: 'flex center', style: { gap: '10px', padding: '4px 0' } },
          h('span', { html: icon('briefcase', 15) }),
          h('span', { class: 'tiny' },
            t(
              'Les échéances marquées « Entreprise » sont affichées en grisé car aucune société n’est associée à ce dossier.',
              'Deadlines marked “Business” are dimmed because no incorporated business is linked to this file.',
            ),
          ),
        ),
      )
    : null;

  return h('div', { class: 'grid' },
    kpiRow,
    bizBanner,
    agendaCard,
    legendCard,
  );
}
