// ============================================================
// Portfolio & Asset Allocation view
// ============================================================
import { h, money, pct, icon, toast, modal, t } from '../dom.js';
import { kpi, card, dataTable, legend, statList } from '../widgets.js';
import { donutChart, barChart, PALETTE } from '../charts.js';
import { formModal } from '../editor.js';
import { store } from '../../state/store.js';
import {
  ASSET_CLASSES,
  TARGET_MODELS,
  targetModelFor,
  defaultHoldingsFromAssets,
  computeAllocation,
  expectedReturnVol,
  weightedMER,
  feeDrag,
  rebalanceActions,
  riskQuestionnaire,
  scoreToProfile,
} from '../../engine/portfolio.js';

// ---- helpers ----------------------------------------------------------------

function riskLabel(v) {
  const map = {
    conservative: t('Conservateur', 'Conservative'),
    balanced:     t('Équilibré', 'Balanced'),
    growth:       t('Croissance', 'Growth'),
    aggressive:   t('Dynamique', 'Aggressive'),
  };
  return map[v] || v || '—';
}

function riskChipClass(v) {
  return { conservative: 'info', balanced: 'info', growth: 'warn', aggressive: 'neg' }[v] || 'info';
}

function assetClassOpts() {
  return ASSET_CLASSES.map(ac => ({ value: ac.key, label: ac.label() }));
}

function assetClassLabel(key) {
  const ac = ASSET_CLASSES.find(a => a.key === key);
  return ac ? ac.label() : key;
}

function assetClassColor(key) {
  const ac = ASSET_CLASSES.find(a => a.key === key);
  return ac ? ac.color : PALETTE[0];
}

// ---- main render ------------------------------------------------------------

export function render({ client, jur }) {
  const cur = jur.currency;

  // Local portfolio state — do NOT persist here
  const pf = (client.portfolio && client.portfolio.holdings && client.portfolio.holdings.length)
    ? client.portfolio
    : { holdings: defaultHoldingsFromAssets(client) };

  const holdings = pf.holdings;

  // Derived computations
  const alloc   = computeAllocation(holdings);
  const total    = alloc.total;
  const mer      = weightedMER(holdings);
  const annualFee = total * mer;
  const { expectedReturn } = expectedReturnVol(alloc.byClass
    ? Object.fromEntries(ASSET_CLASSES.map(ac => [ac.key, alloc.byClass[ac.key]?.weight || 0]))
    : {});
  const drag25   = feeDrag(total, mer, 25, expectedReturn || 0.06);

  const riskProfile = client.riskProfile || 'balanced';
  const targetModel = targetModelFor(riskProfile);
  const rebalActions = rebalanceActions(holdings, targetModel, total);

  // ---- KPI row ---------------------------------------------------------------
  const kpiRow = h('div', { class: 'grid cols-4 span-full' },
    kpi({
      label: t('Total investi', 'Total invested'),
      value: money(total, { currency: cur, compact: true }),
      iconName: 'pie',
    }),
    kpi({
      label: t('RFG pondéré', 'Weighted MER'),
      value: pct(mer, 2),
      iconName: 'doc',
      accent: mer > 0.015 ? 'var(--neg)' : 'var(--pos)',
    }),
    kpi({
      label: t('Frais annuels ($)', 'Annual fees ($)'),
      value: money(annualFee, { currency: cur }),
      iconName: 'bank',
      accent: 'var(--neg)',
    }),
    kpi({
      label: t('Coût des frais sur 25 ans', '25-yr fee drag'),
      value: money(drag25, { currency: cur, compact: true }),
      iconName: 'warning',
      accent: 'var(--neg)',
    }),
  );

  // ---- Allocation donuts card ------------------------------------------------
  const currentSegs = ASSET_CLASSES
    .map(ac => ({
      label: ac.label(),
      value: alloc.byClass[ac.key]?.value || 0,
      color: ac.color,
    }))
    .filter(s => s.value > 0);

  const targetSegs = ASSET_CLASSES
    .map(ac => ({
      label: ac.label(),
      value: targetModel[ac.key] || 0,
      color: ac.color,
    }))
    .filter(s => s.value > 0);

  const centerLabelCurrent = money(total, { currency: cur, compact: true });
  const centerLabelTarget  = riskLabel(riskProfile);

  const allocationCard = card(
    t('Répartition actuelle vs cible', 'Current vs target allocation'),
    { sub: t('Profil : ' + riskLabel(riskProfile), 'Profile: ' + riskLabel(riskProfile)) },
    h('div', { class: 'grid cols-2', style: { gap: '16px', alignItems: 'start' } },
      h('div', {},
        h('div', { class: 'tiny muted', style: { textAlign: 'center', marginBottom: '6px' } },
          t('Répartition actuelle', 'Current allocation')),
        h('div', { style: { textAlign: 'center' } },
          h('div', { html: donutChart({
            segments: currentSegs.length ? currentSegs : [{ label: '—', value: 1, color: '#ccc' }],
            size: 200,
            centerLabel: centerLabelCurrent,
            centerSub: t('investi', 'invested'),
          }) }),
        ),
        h('div', { class: 'sep' }),
        legend(currentSegs.map(s => ({
          color: s.color,
          label: `${s.label} · ${pct(total > 0 ? s.value / total : 0, 0)}`,
        }))),
      ),
      h('div', {},
        h('div', { class: 'tiny muted', style: { textAlign: 'center', marginBottom: '6px' } },
          t('Répartition cible', 'Target allocation')),
        h('div', { style: { textAlign: 'center' } },
          h('div', { html: donutChart({
            segments: targetSegs,
            size: 200,
            centerLabel: centerLabelTarget,
            centerSub: t('modèle', 'model'),
          }) }),
        ),
        h('div', { class: 'sep' }),
        legend(targetSegs.map(s => ({
          color: s.color,
          label: `${s.label} · ${pct(s.value, 0)}`,
        }))),
      ),
    ),
  );

  // ---- Capital market assumptions card --------------------------------------
  const weights = Object.fromEntries(
    ASSET_CLASSES.map(ac => [ac.key, alloc.byClass[ac.key]?.weight || 0])
  );
  const { expectedReturn: portRet, volatility: portVol } = expectedReturnVol(weights);

  const cmaCard = card(
    t('Hypothèses de marché', 'Capital market assumptions'),
    { sub: t('Rendements et volatilités attendus par classe', 'Expected returns and volatility by class') },
    h('div', { class: 'grid cols-2 span-full', style: { gap: '16px' } },
      kpi({
        label: t('Rendement espéré du portefeuille', 'Portfolio expected return'),
        value: pct(portRet, 1),
        iconName: 'up',
        accent: 'var(--pos)',
      }),
      kpi({
        label: t('Volatilité estimée', 'Estimated volatility'),
        value: pct(portVol, 1),
        iconName: 'monte',
      }),
    ),
    h('div', { class: 'sep' }),
    h('div', { class: 'tbl-wrap' },
      h('table', { class: 'tbl' },
        h('thead', {},
          h('tr', {},
            h('th', {}, t('Classe', 'Class')),
            h('th', { class: 'num' }, t('Rendement espéré', 'Expected return')),
            h('th', { class: 'num' }, t('Volatilité', 'Volatility')),
            h('th', { class: 'num' }, t('Poids actuel', 'Current weight')),
          ),
        ),
        h('tbody', {},
          ...ASSET_CLASSES.map(ac => {
            const w = alloc.byClass[ac.key]?.weight || 0;
            return h('tr', {},
              h('td', {},
                h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } },
                  h('i', { style: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: ac.color, flexShrink: '0' } }),
                  ac.label(),
                ),
              ),
              h('td', { class: 'num mono' }, pct(ac.ret, 1)),
              h('td', { class: 'num mono' }, pct(ac.vol, 1)),
              h('td', { class: 'num mono' }, pct(w, 1)),
            );
          }),
        ),
      ),
    ),
  );

  // ---- Rebalancing card -----------------------------------------------------
  const needsRebal = rebalActions.some(a => a.action !== 'hold');

  const rebalCard = card(
    t('Rééquilibrage', 'Rebalancing'),
    {
      sub: t('Achats / ventes pour atteindre le modèle cible', 'Buys / sells to reach target model'),
      right: h('button', {
        class: 'btn sm primary',
        html: icon('refresh', 14) + ' ' + t('Appliquer le modèle cible', 'Apply target model'),
        onClick: () => {
          if (!needsRebal) {
            toast(t('Le portefeuille est déjà rééquilibré ✓', 'Portfolio is already balanced ✓'));
            return;
          }
          // Safe: rebalance by proportionally adjusting per-class totals, keeping names
          store.update(c => {
            c.portfolio = c.portfolio || {};
            const actions = rebalanceActions(holdings, targetModel, total);
            const newHoldings = JSON.parse(JSON.stringify(holdings));
            // Scale each holding within its class to match target value
            for (const act of actions) {
              const classHoldings = newHoldings.filter(h => h.assetClass === act.assetClass);
              if (!classHoldings.length) continue;
              const classCurrent = classHoldings.reduce((s, h) => s + (h.value || 0), 0);
              if (classCurrent <= 0) {
                // New class — add a generic holding
                newHoldings.push({
                  id: act.assetClass + '_rebal_' + Date.now(),
                  name: act.label,
                  assetClass: act.assetClass,
                  value: Math.round(act.targetValue),
                  mer: 0.012,
                });
              } else {
                const scale = act.targetValue / classCurrent;
                for (const hld of newHoldings) {
                  if (hld.assetClass === act.assetClass) hld.value = Math.round(hld.value * scale);
                }
              }
            }
            c.portfolio.holdings = newHoldings;
          });
          toast(t('Modèle cible appliqué ✓', 'Target model applied ✓'));
        },
      }),
    },
    h('div', { class: 'tbl-wrap' },
      h('table', { class: 'tbl' },
        h('thead', {},
          h('tr', {},
            h('th', {}, t('Classe', 'Class')),
            h('th', { class: 'num' }, t('Valeur actuelle', 'Current value')),
            h('th', { class: 'num' }, t('Valeur cible', 'Target value')),
            h('th', { class: 'num' }, t('Action', 'Action')),
            h('th', { class: 'num' }, t('Montant', 'Amount')),
          ),
        ),
        h('tbody', {},
          ...rebalActions.map(act => {
            const actionChip = act.action === 'hold'
              ? h('span', { class: 'chip info' }, t('Conserver', 'Hold'))
              : act.action === 'buy'
                ? h('span', { class: 'chip pos' }, t('Acheter', 'Buy'))
                : h('span', { class: 'chip neg' }, t('Vendre', 'Sell'));
            return h('tr', {},
              h('td', {},
                h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } },
                  h('i', { style: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: act.color, flexShrink: '0' } }),
                  act.label,
                ),
              ),
              h('td', { class: 'num mono' }, money(act.currentValue, { currency: cur })),
              h('td', { class: 'num mono' }, money(act.targetValue, { currency: cur })),
              h('td', { class: 'num' }, actionChip),
              h('td', { class: 'num mono' },
                act.action === 'hold' ? '—' : money(act.amount, { currency: cur }),
              ),
            );
          }),
        ),
      ),
    ),
  );

  // ---- Fees card ------------------------------------------------------------
  const LOW_MER   = 0.0025;
  const fvLow     = total * Math.pow(1 + (expectedReturn || 0.06) - LOW_MER, 25);
  const fvCurrent = total * Math.pow(1 + (expectedReturn || 0.06) - mer, 25);
  const dragLow    = feeDrag(total, LOW_MER, 25, expectedReturn || 0.06);
  const dragSaved  = drag25 - dragLow;

  const feesCard = card(
    t('Frais de gestion (RFG)', 'Management fees (MER)'),
    { sub: t('Impact sur 25 ans au taux de rendement actuel', 'Impact over 25 years at current expected return') },
    h('div', { class: 'grid cols-2 span-full', style: { gap: '16px' } },
      kpi({
        label: t('Coût à faible RFG (0,25 %)', 'Low-MER cost (0.25%)'),
        value: money(dragLow, { currency: cur, compact: true }),
        iconName: 'check',
        accent: 'var(--pos)',
      }),
      kpi({
        label: t('Coût au RFG actuel', 'Cost at current MER'),
        value: money(drag25, { currency: cur, compact: true }),
        iconName: 'warning',
        accent: mer > 0.015 ? 'var(--neg)' : 'var(--text)',
      }),
    ),
    dragSaved > 0
      ? h('div', { class: 'tiny muted', style: { margin: '8px 0 4px' } },
          t(
            `En passant à des FNB à faible coût (RFG 0,25 %), vous pourriez économiser ${money(dragSaved, { currency: cur, compact: true })} en frais cumulés sur 25 ans.`,
            `By switching to low-cost ETFs (MER 0.25%), you could save ${money(dragSaved, { currency: cur, compact: true })} in cumulative fees over 25 years.`,
          ),
        )
      : null,
    h('div', { class: 'sep' }),
    h('div', { html: barChart({
      xLabels: [t('Faible RFG (0,25 %)', 'Low MER (0.25%)'), t('RFG actuel', 'Current MER')],
      series: [
        {
          color: PALETTE[1],
          values: [Math.round(fvLow), Math.round(fvCurrent)],
        },
      ],
      height: 220,
    }) }),
    h('div', { class: 'sep' }),
    statList([
      [t('Valeur future (faible RFG)', 'Future value (low MER)'),  money(fvLow,     { currency: cur, compact: true }), 'pos'],
      [t('Valeur future (RFG actuel)', 'Future value (current MER)'), money(fvCurrent, { currency: cur, compact: true })],
      [t('Coût cumulatif des frais (actuel)', 'Cumulative fee cost (current)'), money(drag25,    { currency: cur, compact: true }), 'neg'],
      [t('RFG pondéré actuel', 'Current weighted MER'), pct(mer, 2)],
    ]),
  );

  // ---- Risk profile card ----------------------------------------------------
  const riskCard = card(
    t('Profil de risque', 'Risk profile'),
    { sub: t('Questionnaire KYC et tolérance au risque', 'KYC questionnaire and risk tolerance') },
    h('div', { class: 'flex', style: { alignItems: 'center', gap: '12px', marginBottom: '12px' } },
      h('span', { class: 'tiny muted' }, t('Profil actuel :', 'Current profile:')),
      h('span', { class: 'chip ' + riskChipClass(riskProfile) }, riskLabel(riskProfile)),
    ),
    statList(
      Object.entries(targetModel).map(([key, weight]) => {
        const ac = ASSET_CLASSES.find(a => a.key === key);
        return [ac ? ac.label() : key, pct(weight, 0)];
      }),
    ),
    h('div', { class: 'sep' }),
    h('button', {
      class: 'btn',
      html: icon('check', 14) + ' ' + t('Questionnaire de tolérance au risque', 'Risk tolerance questionnaire'),
      onClick: () => openRiskQuestionnaire(riskProfile),
    }),
  );

  // ---- Holdings table card --------------------------------------------------
  const holdingsCard = card(
    t('Placements / Avoirs', 'Holdings'),
    {
      class: 'span-full',
      sub: t('Détail des positions par classe d\'actifs', 'Position detail by asset class'),
      right: h('button', {
        class: 'btn primary sm',
        html: icon('plus', 14) + ' ' + t('Ajouter', 'Add'),
        onClick: () => editHolding({ id: '', name: '', assetClass: 'equity', value: 0, mer: 0.012 }, true),
      }),
    },
    dataTable({
      rows: holdings,
      cols: [
        { key: 'name',       label: t('Placement', 'Holding') },
        {
          key: 'assetClass',
          label: t('Classe', 'Class'),
          fmt: (v) => {
            const ac = ASSET_CLASSES.find(a => a.key === v);
            if (!ac) return v;
            const el = document.createElement('span');
            el.style.cssText = 'display:inline-flex;align-items:center;gap:5px;';
            const dot = document.createElement('i');
            dot.style.cssText = `display:inline-block;width:8px;height:8px;border-radius:50%;background:${ac.color};flex-shrink:0;`;
            el.appendChild(dot);
            el.appendChild(document.createTextNode(ac.label()));
            return el;
          },
        },
        { key: 'value', label: t('Valeur', 'Value'), num: true, fmt: v => money(v, { currency: cur }) },
        {
          key: 'mer',
          label: 'MER / RFG',
          num: true,
          fmt: v => pct(v, 2),
        },
        {
          key: '_weight',
          label: t('Poids', 'Weight'),
          num: true,
          fmt: (_, row) => pct(total > 0 ? (row.value || 0) / total : 0, 1),
        },
      ],
      onEdit:   (row) => editHolding(row, false),
      onDelete: (row) => {
        store.update(c => {
          c.portfolio = c.portfolio || {};
          c.portfolio.holdings = (c.portfolio.holdings || holdings).filter(h => h.id !== row.id);
        });
        toast(t('Position supprimée', 'Position removed'));
      },
      empty: t('Aucune position', 'No positions'),
    }),
  );

  // ---- assemble layout ------------------------------------------------------
  return h('div', { class: 'grid' },
    kpiRow,
    h('div', { class: 'grid cols-2 span-full' }, allocationCard, riskCard),
    h('div', { class: 'span-full' }, cmaCard),
    h('div', { class: 'span-full' }, rebalCard),
    h('div', { class: 'span-full' }, feesCard),
    holdingsCard,
  );

  // ---- helpers inside render (share closure) --------------------------------

  function editHolding(item, isNew) {
    const draft = isNew
      ? { id: Math.random().toString(36).slice(2, 10), name: '', assetClass: 'equity', value: 0, mer: 0.012 }
      : { ...item };
    formModal({
      title: isNew ? t('Nouveau placement', 'New holding') : t('Modifier le placement', 'Edit holding'),
      item: draft,
      fields: [
        { key: 'name',       label: t('Nom du placement', 'Holding name'), type: 'text', span: 2 },
        { key: 'assetClass', label: t('Classe d\'actifs', 'Asset class'),  type: 'select', opts: assetClassOpts() },
        { key: 'value',      label: t(`Valeur (${cur})`, `Value (${cur})`), type: 'number' },
        { key: 'mer',        label: t('RFG / MER', 'MER / MER'), type: 'pct', step: 0.01,
          hint: t('Ex. : 0,12 % = FNB; 1,8 % = fonds commun', 'E.g. 0.12% = ETF; 1.8% = mutual fund') },
      ],
      onSave: (d) => {
        store.update(c => {
          c.portfolio = c.portfolio || {};
          const base = c.portfolio.holdings ? c.portfolio.holdings : JSON.parse(JSON.stringify(holdings));
          if (isNew) {
            c.portfolio.holdings = [...base, d];
          } else {
            c.portfolio.holdings = base.map(h => h.id === d.id ? d : h);
          }
        });
        toast(isNew ? t('Position ajoutée ✓', 'Position added ✓') : t('Position mise à jour ✓', 'Position updated ✓'));
      },
    });
  }

  function openRiskQuestionnaire(currentProfile) {
    const questions = riskQuestionnaire();
    const answers   = new Array(questions.length).fill(null);
    let totalScore  = 0;

    // Build questionnaire form inside a modal
    const formEl = h('div', {});

    const resultEl = h('div', {
      class: 'tiny muted',
      style: { marginTop: '12px', minHeight: '24px' },
    });

    function updateResult() {
      const answered = answers.filter(a => a !== null);
      if (answered.length < questions.length) {
        resultEl.textContent = t(
          `${answered.length} / ${questions.length} questions répondues`,
          `${answered.length} / ${questions.length} questions answered`,
        );
        return;
      }
      totalScore = answers.reduce((s, a) => s + a, 0);
      const profile = scoreToProfile(totalScore);
      resultEl.textContent = t(
        `Score : ${totalScore} → Profil : ${riskLabel(profile)}`,
        `Score: ${totalScore} → Profile: ${riskLabel(profile)}`,
      );
    }

    questions.forEach((q, qi) => {
      const qEl = h('div', { style: { marginBottom: '14px' } },
        h('div', { class: 'tiny', style: { fontWeight: 600, marginBottom: '6px' } },
          `${qi + 1}. ${q.q}`),
        h('div', {},
          ...q.options.map(opt => {
            const radio = h('input', {
              type: 'radio',
              name: `rq_${qi}`,
              style: { width: 'auto', marginRight: '6px' },
            });
            radio.value = String(opt.score);
            radio.addEventListener('change', () => {
              answers[qi] = opt.score;
              updateResult();
            });
            return h('label', {
              style: { display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', cursor: 'pointer' },
            }, radio, opt.label);
          }),
        ),
      );
      formEl.appendChild(qEl);
    });

    formEl.appendChild(resultEl);

    const m = modal({
      title: t('Questionnaire de tolérance au risque', 'Risk tolerance questionnaire'),
      wide: true,
      body: formEl,
      footer: [
        h('button', { class: 'btn ghost', onClick: () => m.close() }, t('Annuler', 'Cancel')),
        h('button', {
          class: 'btn primary',
          onClick: () => {
            const answered = answers.filter(a => a !== null);
            if (answered.length < questions.length) {
              toast(t('Veuillez répondre à toutes les questions.', 'Please answer all questions.'), 'warn');
              return;
            }
            totalScore  = answers.reduce((s, a) => s + a, 0);
            const newProfile = scoreToProfile(totalScore);
            store.update(c => { c.riskProfile = newProfile; });
            toast(t(
              `Profil mis à jour : ${riskLabel(newProfile)} (score ${totalScore})`,
              `Profile updated: ${riskLabel(newProfile)} (score ${totalScore})`,
            ));
            m.close();
          },
        }, t('Enregistrer le profil', 'Save profile')),
      ],
    });
  }
}
