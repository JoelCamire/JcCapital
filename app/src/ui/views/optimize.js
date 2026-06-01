// ============================================================
// Tax & decumulation optimization view
// ============================================================
import { h, money, pct, icon, t } from '../dom.js';
import { kpi, card, statList, legend } from '../widgets.js';
import { barChart, PALETTE } from '../charts.js';
import {
  incomeSplitting,
  rrspVsTfsa,
  assetLocation,
  withdrawalOrder,
  rothOrMeltdown,
} from '../../engine/optimize.js';

export function render({ client, jur }) {
  const cur = jur.currency;

  // ---- Run engine functions (defensive) ----
  const splitting = incomeSplitting(client, jur);
  const rrsp = rrspVsTfsa(client, jur);
  const location = assetLocation(client, jur);
  const withdrawal = withdrawalOrder(client, jur);
  const advanced = rothOrMeltdown(client, jur);

  // ---- KPI: total annual optimization opportunity ----
  const totalOpportunity = (splitting.savings || 0) + (location.annualTaxDrag || 0);

  // ---- KPI row ----
  const kpiRow = h('div', { class: 'grid cols-4 span-full' },
    kpi({
      label: t('Économie fiscale annuelle estimée', 'Estimated annual tax savings'),
      value: money(totalOpportunity, { currency: cur }),
      iconName: 'scale',
      accent: totalOpportunity > 0 ? 'var(--pos)' : undefined,
      sub: t('Fractionnement + frottement fiscal (estimé)', 'Splitting + tax drag (estimated)'),
    }),
    kpi({
      label: t('Taux marginal actuel', 'Current marginal rate'),
      value: pct(rrsp.currentMarginal, 1),
      iconName: 'tax',
      sub: t('Sur le prochain dollar de revenu', 'On the next dollar of income'),
    }),
    kpi({
      label: t('Taux marginal à la retraite (estimé)', 'Estimated retirement marginal rate'),
      value: pct(rrsp.retireMarginal, 1),
      iconName: 'retire',
      sub: t('Revenu de retraite ≈ 60 % du revenu actuel', 'Retirement income ≈ 60 % of current'),
    }),
    kpi({
      label: t('Frottement fiscal non enregistré / an', 'Non-reg annual tax drag'),
      value: money(location.annualTaxDrag || 0, { currency: cur }),
      iconName: 'flame',
      accent: (location.annualTaxDrag || 0) > 500 ? 'var(--neg)' : undefined,
      sub: t('45 % de la croissance × taux marginal', '45 % of growth × marginal rate'),
    }),
  );

  // ---- Card 1: Income splitting ----
  const splittingCard = splitting.applicable
    ? card(
        t('Fractionnement du revenu', 'Income splitting'),
        {
          sub: t(
            `${splitting.member0 ? splitting.member0.name : ''} & ${splitting.member1 ? splitting.member1.name : ''} · ${t('Économie potentielle', 'Potential savings')}: ${money(splitting.savings, { currency: cur })}`,
            `${splitting.member0 ? splitting.member0.name : ''} & ${splitting.member1 ? splitting.member1.name : ''} · Potential savings: ${money(splitting.savings, { currency: cur })}`,
          ),
          right: h('span', { class: 'chip pos', html: icon('split', 13) + ' ' + money(splitting.savings, { currency: cur }) + '/an' }),
        },
        // Bar chart: current vs optimized combined tax
        h('div', { html: barChart({
          xLabels: [t('Actuel', 'Current'), t('Optimisé', 'Optimized')],
          series: [
            { color: PALETTE[4], values: [Math.round(splitting.current), Math.round(splitting.optimized)] },
          ],
          height: 200,
        }) }),
        h('div', { class: 'sep' }),
        statList([
          [t('Impôt combiné actuel', 'Current combined tax'), money(splitting.current, { currency: cur }), 'neg'],
          [t('Impôt combiné optimisé (50/50)', 'Optimized combined tax (50/50)'), money(splitting.optimized, { currency: cur }), 'pos'],
          [t('Économie annuelle estimée', 'Estimated annual savings'), money(splitting.savings, { currency: cur }), 'pos'],
        ]),
        h('div', { class: 'tiny muted', style: { marginTop: '10px' } },
          t(
            'Le fractionnement est estimé par une égalisation 50/50 du revenu ordinaire. Consultez un conseiller pour les règles spécifiques à votre juridiction (ex. : pension, FERR, prêts aux conjoints).',
            'Splitting is estimated by equalizing ordinary income 50/50. Consult an advisor for jurisdiction-specific rules (e.g. pension, RRIF, spousal loans).',
          ),
        ),
      )
    : card(
        t('Fractionnement du revenu', 'Income splitting'),
        { sub: t('Non applicable', 'Not applicable') },
        h('div', { class: 'empty' },
          h('span', { html: icon('split', 28) }),
          h('div', { class: 'big', style: { marginTop: '10px' } },
            t('Requiert un couple marié avec deux membres', 'Requires a married couple with two members'),
          ),
          h('div', { class: 'tiny muted', style: { marginTop: '6px' } },
            splitting.note || t(
              'Ajoutez un(e) conjoint(e) et définissez le statut fiscal « Marié » pour activer cette analyse.',
              'Add a spouse and set filing status to "Married" to enable this analysis.',
            ),
          ),
        ),
      );

  // ---- Card 2: RRSP vs TFSA ----
  const isDeferred = rrsp.recommend === 'deferred';
  const recommendLabel = isDeferred ? jur.labels.taxAdvantaged : jur.labels.taxFree;
  const chipClass = rrsp.spread > 0.05 ? 'pos' : rrsp.spread < -0.05 ? 'neg' : 'warn';

  const rrspCard = card(
    t(`${jur.labels.taxAdvantaged} vs ${jur.labels.taxFree}`, `${jur.labels.taxAdvantaged} vs ${jur.labels.taxFree}`),
    {
      sub: t('Recommandation selon les taux marginaux actuels et futurs', 'Recommendation based on current vs future marginal rates'),
      right: h('span', { class: 'chip ' + chipClass },
        icon(isDeferred ? 'bank' : 'check', 13) + ' ' + recommendLabel,
      ),
    },
    statList([
      [t('Taux marginal actuel', 'Current marginal rate'), pct(rrsp.currentMarginal, 1)],
      [t('Taux marginal estimé à la retraite', 'Estimated retirement marginal rate'), pct(rrsp.retireMarginal, 1)],
      [t('Écart de taux', 'Rate spread'), pct(Math.abs(rrsp.spread), 1), rrsp.spread > 0 ? 'pos' : 'neg'],
    ]),
    h('div', { class: 'sep' }),
    h('div', { style: { padding: '10px 0' } },
      h('b', {}, t('Recommandation : ', 'Recommendation: ')),
      isDeferred
        ? t(
            `Contribuez en priorité à votre ${jur.labels.taxAdvantaged}. Votre taux marginal actuel (${pct(rrsp.currentMarginal, 1)}) est plus élevé qu'à la retraite (${pct(rrsp.retireMarginal, 1)}) — vous économisez de l'impôt maintenant et payez moins au retrait.`,
            `Prioritize contributions to your ${jur.labels.taxAdvantaged}. Your current marginal rate (${pct(rrsp.currentMarginal, 1)}) is higher than at retirement (${pct(rrsp.retireMarginal, 1)}) — you save tax now and pay less on withdrawal.`,
          )
        : t(
            `Contribuez en priorité à votre ${jur.labels.taxFree}. Votre taux marginal à la retraite (${pct(rrsp.retireMarginal, 1)}) est similaire ou supérieur au taux actuel (${pct(rrsp.currentMarginal, 1)}) — la croissance libre d'impôt est plus avantageuse.`,
            `Prioritize contributions to your ${jur.labels.taxFree}. Your estimated retirement marginal rate (${pct(rrsp.retireMarginal, 1)}) is similar to or higher than today's (${pct(rrsp.currentMarginal, 1)}) — tax-free growth is more advantageous.`,
          ),
    ),
  );

  // ---- Card 3: Asset location ----
  const locationCard = card(
    t('Emplacement des actifs', 'Asset location'),
    {
      sub: t('Analyse heuristique par traitement fiscal', 'Heuristic analysis by tax treatment'),
      right: h('span', { class: 'chip ' + ((location.annualTaxDrag || 0) > 500 ? 'neg' : 'pos') },
        t('Frottement / an : ', 'Annual drag: ') + money(location.annualTaxDrag || 0, { currency: cur }),
      ),
    },
    h('div', {},
      ...(location.findings || []).map(f =>
        h('div', { class: 'flex', style: { gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' } },
          h('span', {
            class: 'chip ' + (f.severity === 'warn' ? 'neg' : 'pos'),
            style: { flex: 'none', marginTop: '1px' },
            html: icon(f.severity === 'warn' ? 'warning' : 'check', 13),
          }),
          h('div', {},
            h('b', {}, f.label),
            h('div', { class: 'tiny muted' }, f.detail),
          ),
        ),
      ),
    ),
  );

  // ---- Card 4: Withdrawal sequencing ----
  const withdrawalCard = card(
    t('Ordre de décaissement', 'Withdrawal sequencing'),
    { sub: t('Comparaison de trois stratégies à la retraite', 'Comparison of three retirement decumulation strategies') },
    h('div', {},
      ...withdrawal.map((strategy, i) =>
        h('div', {
          style: {
            padding: '12px',
            marginBottom: '10px',
            borderRadius: '8px',
            border: strategy.recommended ? '2px solid var(--pos)' : '1px solid var(--border)',
            background: strategy.recommended ? 'var(--surface-2)' : 'var(--surface)',
          },
        },
          h('div', { class: 'flex between', style: { alignItems: 'center', marginBottom: '6px' } },
            h('b', {}, strategy.name),
            strategy.recommended
              ? h('span', { class: 'chip pos', html: icon('check', 13) + ' ' + t('Recommandé', 'Recommended') })
              : null,
          ),
          h('div', { class: 'tiny', style: { marginBottom: '4px' } }, strategy.desc),
          h('div', { class: 'tiny muted' }, strategy.note),
        ),
      ),
    ),
  );

  // ---- Card 5: Advanced strategy ----
  const advancedCard = card(
    t('Stratégie avancée', 'Advanced strategy'),
    {
      sub: advanced.title,
      right: h('span', { class: 'chip info' }, jur.flag + ' ' + jur.name),
    },
    h('div', { style: { padding: '12px 0', lineHeight: '1.6' } }, advanced.text),
  );

  // ---- Assemble ----
  return h('div', { class: 'grid' },
    kpiRow,
    h('div', { class: 'span-full' }, splittingCard),
    h('div', { class: 'grid cols-2 span-full' }, rrspCard, locationCard),
    h('div', { class: 'span-full' }, withdrawalCard),
    h('div', { class: 'span-full' }, advancedCard),
  );
}
