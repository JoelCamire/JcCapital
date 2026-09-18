// ============================================================
// Portfolio & Asset Allocation view
// Expected return/vol computed once; fee model shared with the
// Fee-compare view (same LOW_MER, same contributions model); the
// allocation's expected return can be pushed to the file assumptions.
// ============================================================
import { h, money, pct, icon, toast, modal, t } from '../dom.js';
import { kpi, card, dataTable, legend, statList } from '../widgets.js';
import { donutChart, barChart, PALETTE } from '../charts.js';
import { formModal } from '../editor.js';
import { store as appStore } from '../../state/store.js';
import { clientFacts } from '../../engine/facts.js';
import { LOW_MER, growWithFees } from './feecompare.js';
import {
  ASSET_CLASSES,
  TARGET_MODELS,
  targetModelFor,
  defaultHoldingsFromAssets,
  computeAllocation,
  expectedReturnVol,
  weightedMER,
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

// ---- main render ------------------------------------------------------------

export function render({ store, client, jur }) {
  store = store || appStore;
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const HORIZON = 25;

  // Local portfolio state — do NOT persist here
  const pf = (client.portfolio && client.portfolio.holdings && client.portfolio.holdings.length)
    ? client.portfolio
    : { holdings: defaultHoldingsFromAssets(client) };

  const holdings = pf.holdings;

  // Derived computations (once)
  const alloc   = computeAllocation(holdings);
  const total    = alloc.total;
  const mer      = weightedMER(holdings);
  const annualFee = total * mer;
  const weights = Object.fromEntries(ASSET_CLASSES.map(ac => [ac.key, alloc.byClass[ac.key]?.weight || 0]));
  const { expectedReturn: portRet, volatility: portVol } = expectedReturnVol(weights);
  const grossReturn = portRet > 0 ? portRet : F.assumptions.preReturn;
  const contrib = F.household.contributions;

  const riskProfile = client.riskProfile || 'balanced';
  const targetModel = targetModelFor(riskProfile);
  const rebalActions = rebalanceActions(holdings, targetModel, total);

  // Fee model shared with the Fee-compare view (with the file's actual contributions)
  const fee = (m) => growWithFees({ start: total, contrib, years: HORIZON, grossReturn, mer: m });
  const feeGross = fee(0), feeCurrent = fee(mer), feeLow = fee(LOW_MER);
  const drag25 = feeGross.final - feeCurrent.final;
  const dragLow = feeGross.final - feeLow.final;
  const dragSaved = drag25 - dragLow;

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
      label: t(`Coût des frais sur ${HORIZON} ans`, `${HORIZON}-yr fee drag`),
      value: money(drag25, { currency: cur, compact: true }),
      iconName: 'warning',
      accent: 'var(--neg)',
      sub: t(`avec ${money(contrib, { currency: cur, compact: true })}/an de cotisations`, `with ${money(contrib, { currency: cur, compact: true })}/yr contributions`),
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
  const gap = portRet - F.assumptions.preReturn;
  const cmaCard = card(
    t('Hypothèses de marché', 'Capital market assumptions'),
    { sub: t('Rendements et volatilités attendus par classe — comparés au rendement des hypothèses du dossier', 'Expected returns and volatility by class — compared with the file’s return assumption'),
      right: h('button', {
        class: 'btn sm',
        html: icon('refresh', 14) + ' ' + t('Utiliser comme rendement des hypothèses', 'Use as the assumptions return'),
        onClick: () => {
          if (!(portRet > 0)) { toast(t('Aucune répartition à appliquer', 'No allocation to apply'), 'warn'); return; }
          const v = Math.round(portRet * 10000) / 10000;
          store.update(c => { c.assumptions = c.assumptions || {}; c.assumptions.preReturn = v; });
          toast(t(`Rendement d’accumulation réglé à ${pct(v)} ✓`, `Accumulation return set to ${pct(v)} ✓`));
        },
      }) },
    h('div', { class: 'grid cols-4 span-full', style: { gap: '16px' } },
      kpi({
        label: t('Rendement espéré de la répartition', 'Allocation expected return'),
        value: pct(portRet, 1),
        iconName: 'up',
        accent: 'var(--pos)',
      }),
      kpi({
        label: t('Rendement pondéré des comptes (dossier)', 'Asset-weighted return (file)'),
        value: pct(F.expectedReturn, 1),
        iconName: 'networth',
        sub: t('croissance saisie sur chaque compte', 'growth entered on each account'),
      }),
      kpi({
        label: t('Hypothèse du dossier (accumulation)', 'File assumption (accumulation)'),
        value: pct(F.assumptions.preReturn, 1),
        iconName: 'settings',
        sub: t(`écart ${gap >= 0 ? '+' : ''}${pct(gap, 1)} vs répartition`, `gap ${gap >= 0 ? '+' : ''}${pct(gap, 1)} vs allocation`),
        accent: Math.abs(gap) > 0.01 ? 'var(--warn)' : undefined,
      }),
      kpi({
        label: t('Volatilité estimée', 'Estimated volatility'),
        value: pct(portVol, 1),
        iconName: 'monte',
        sub: t(`Monte Carlo du dossier : ${pct(F.assumptions.returnStdev, 1)}`, `File Monte Carlo: ${pct(F.assumptions.returnStdev, 1)}`),
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
            const newHoldings = JSON.parse(JSON.stringify(holdings));
            // Scale each holding within its class to match target value
            for (const act of rebalActions) {
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

  // ---- Fees card (shared model with Fee compare) ------------------------------
  const feesCard = card(
    t('Frais de gestion (RFG)', 'Management fees (MER)'),
    { sub: t(`Impact sur ${HORIZON} ans au rendement espéré de la répartition (${pct(grossReturn, 1)}), avec les cotisations du dossier — même modèle que « Comparer les frais »`, `Impact over ${HORIZON} years at the allocation's expected return (${pct(grossReturn, 1)}), with the file's contributions — same model as “Compare fees”`) },
    h('div', { class: 'grid cols-2 span-full', style: { gap: '16px' } },
      kpi({
        label: t(`Coût à faible RFG (${pct(LOW_MER, 2)})`, `Low-MER cost (${pct(LOW_MER, 2)})`),
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
            `En passant à des FNB à faible coût (RFG ${pct(LOW_MER, 2)}), vous pourriez économiser ${money(dragSaved, { currency: cur, compact: true })} en frais cumulés sur ${HORIZON} ans.`,
            `By switching to low-cost ETFs (MER ${pct(LOW_MER, 2)}), you could save ${money(dragSaved, { currency: cur, compact: true })} in cumulative fees over ${HORIZON} years.`,
          ),
        )
      : null,
    h('div', { class: 'sep' }),
    h('div', { html: barChart({
      xLabels: [t(`Faible RFG (${pct(LOW_MER, 2)})`, `Low MER (${pct(LOW_MER, 2)})`), t('RFG actuel', 'Current MER')],
      series: [
        {
          color: PALETTE[1],
          values: [Math.round(feeLow.final), Math.round(feeCurrent.final)],
        },
      ],
      height: 220,
    }) }),
    h('div', { class: 'sep' }),
    statList([
      [t('Valeur future (faible RFG)', 'Future value (low MER)'),  money(feeLow.final,     { currency: cur, compact: true }), 'pos'],
      [t('Valeur future (RFG actuel)', 'Future value (current MER)'), money(feeCurrent.final, { currency: cur, compact: true })],
      [t('Frais payés (RFG actuel)', 'Fees paid (current MER)'), money(feeCurrent.feesPaid, { currency: cur, compact: true }), 'neg'],
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
