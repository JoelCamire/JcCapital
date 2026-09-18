// ============================================================
// Tax & decumulation optimization view — renders optimize.js
// (which reads facts). Savings are opportunities; the tax drag is a
// COST shown separately, never added to the opportunity.
// ============================================================
import { h, money, pct, icon, t } from '../dom.js';
import { kpi, card, statList, legend } from '../widgets.js';
import { barChart, PALETTE } from '../charts.js';
import { incomeSplitting, rrspVsTfsa, assetLocation, withdrawalOrder, rothOrMeltdown } from '../../engine/optimize.js';
import { clientFacts, retirementFacts } from '../../engine/facts.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const F = clientFacts(client, jur);
  const R = retirementFacts(client, jur);

  const splitNow = incomeSplitting(client, jur);
  const splitRet = incomeSplitting(client, jur, { atRetirement: true });
  const rrsp = rrspVsTfsa(client, jur);
  const location = assetLocation(client, jur);
  const withdrawal = withdrawalOrder(client, jur);
  const advanced = rothOrMeltdown(client, jur);

  const totalOpportunity = splitNow.savings || 0;

  const kpiRow = h('div', { class: 'grid cols-4 span-full' },
    kpi({ label: t('Économie fiscale annuelle (fractionnement)', 'Annual tax saving (splitting)'), value: money(totalOpportunity, { currency: cur }), iconName: 'scale',
      accent: totalOpportunity > 0 ? 'var(--pos)' : undefined,
      sub: splitRet.applicable && splitRet.savings > 0 ? t(`À la retraite : ${money(splitRet.savings, { currency: cur })}/an`, `At retirement: ${money(splitRet.savings, { currency: cur })}/yr`) : t('Aujourd’hui', 'Today') }),
    kpi({ label: t('Taux marginal actuel', 'Current marginal rate'), value: pct(rrsp.currentMarginal, 1), iconName: 'tax', sub: t(`${F.primary ? F.primary.name : ''} · revenu ordinaire ${money(rrsp.currentIncome, { currency: cur, compact: true })}`, `${F.primary ? F.primary.name : ''} · ordinary income ${money(rrsp.currentIncome, { currency: cur, compact: true })}`) }),
    kpi({ label: t('Taux marginal à la retraite (projeté)', 'Projected retirement marginal rate'), value: pct(rrsp.retireMarginal, 1), iconName: 'retire',
      sub: rrsp.retirementTaxableIncome != null ? t(`Revenu imposable projeté à ${R.retirementAge} ans : ${money(rrsp.retirementTaxableIncome, { currency: cur, compact: true })}`, `Projected taxable income at ${R.retirementAge}: ${money(rrsp.retirementTaxableIncome, { currency: cur, compact: true })}`) : t('Projection', 'Projection') }),
    kpi({ label: t('Frottement fiscal non enregistré / an (coût)', 'Non-reg annual tax drag (cost)'), value: money(location.annualTaxDrag || 0, { currency: cur }), iconName: 'flame',
      accent: (location.annualTaxDrag || 0) > 500 ? 'var(--neg)' : undefined,
      sub: t(`${pct(F.assumptions.distributionYield, 0)} de la croissance × taux marginal du titulaire`, `${pct(F.assumptions.distributionYield, 0)} of growth × owner's marginal rate`) }),
  );

  const splittingCard = (s, title, subLabel) => s.applicable
    ? card(title, {
        sub: `${s.member0 ? s.member0.name : ''} & ${s.member1 ? s.member1.name : ''} · ${subLabel}`,
        right: h('span', { class: 'chip ' + (s.savings > 0 ? 'pos' : 'info'), html: icon('split', 13) + ' ' + money(s.savings, { currency: cur }) + t('/an', '/yr') }),
      },
        h('div', { html: barChart({ xLabels: [t('Actuel', 'Current'), t('Optimisé', 'Optimized')], series: [{ color: PALETTE[4], values: [Math.round(s.current), Math.round(s.optimized)] }], height: 200 }) }),
        h('div', { class: 'sep' }),
        statList([
          [t(`${s.member0.name} — revenu ordinaire`, `${s.member0.name} — ordinary income`), money(s.member0.income, { currency: cur })],
          [t(`${s.member1.name} — revenu ordinaire`, `${s.member1.name} — ordinary income`), money(s.member1.income, { currency: cur })],
          [t('Revenu de pension admissible', 'Eligible pension income'), money(s.eligiblePension, { currency: cur })],
          [t('Transfert optimal', 'Optimal transfer'), money(s.transfer, { currency: cur }), s.transfer > 0 ? 'pos' : ''],
          [t('Impôt combiné actuel', 'Current combined tax'), money(s.current, { currency: cur }), 'neg'],
          [t('Impôt combiné optimisé', 'Optimized combined tax'), money(s.optimized, { currency: cur }), 'pos'],
          [t('Économie annuelle estimée', 'Estimated annual savings'), money(s.savings, { currency: cur }), s.savings > 0 ? 'pos' : ''],
        ]),
        h('div', { class: 'tiny muted', style: { marginTop: '10px' } }, s.note),
      )
    : card(title, { sub: t('Non applicable', 'Not applicable') },
        h('div', { class: 'empty' },
          h('span', { html: icon('split', 28) }),
          h('div', { class: 'big', style: { marginTop: '10px' } }, t('Requiert un couple avec deux membres', 'Requires a couple with two members')),
          h('div', { class: 'tiny muted', style: { marginTop: '6px' } }, s.note || t('Ajoutez un(e) conjoint(e) et définissez l’état civil « Marié » ou « Conjoint de fait » dans le ménage.', 'Add a spouse and set the household marital status to "Married" or "Common-law".')),
        ));

  const isDeferred = rrsp.recommend === 'deferred';
  const recommendLabel = isDeferred ? jur.labels.taxAdvantaged : jur.labels.taxFree;
  const chipClass = rrsp.spread > 0.05 ? 'pos' : rrsp.spread < -0.05 ? 'neg' : 'warn';

  const rrspCard = card(
    `${jur.labels.taxAdvantaged} vs ${jur.labels.taxFree}`,
    {
      sub: t('Recommandation selon le taux marginal actuel et celui projeté la première année de retraite', 'Recommendation based on today\'s marginal rate vs the projected first-retirement-year rate'),
      right: h('span', { class: 'chip ' + chipClass }, icon(isDeferred ? 'bank' : 'check', 13) + ' ' + recommendLabel),
    },
    statList([
      [t('Taux marginal actuel', 'Current marginal rate'), pct(rrsp.currentMarginal, 1)],
      [t('Taux marginal projeté à la retraite', 'Projected retirement marginal rate'), pct(rrsp.retireMarginal, 1)],
      [t('Écart de taux', 'Rate spread'), pct(Math.abs(rrsp.spread), 1), rrsp.spread > 0 ? 'pos' : 'neg'],
      [t('Droits REER / différé (dossier)', 'RRSP / deferred room (file)'), money(F.members.reduce((s, m) => s + m.rrspRoom, 0), { currency: cur })],
    ]),
    h('div', { class: 'sep' }),
    h('div', { style: { padding: '10px 0' } },
      h('b', {}, t('Recommandation : ', 'Recommendation: ')),
      isDeferred
        ? t(`Contribuez en priorité à votre ${jur.labels.taxAdvantaged}. Votre taux marginal actuel (${pct(rrsp.currentMarginal, 1)}) est plus élevé qu'à la retraite (${pct(rrsp.retireMarginal, 1)}) — vous économisez de l'impôt maintenant et payez moins au retrait.`,
            `Prioritize contributions to your ${jur.labels.taxAdvantaged}. Your current marginal rate (${pct(rrsp.currentMarginal, 1)}) is higher than at retirement (${pct(rrsp.retireMarginal, 1)}) — you save tax now and pay less on withdrawal.`)
        : t(`Contribuez en priorité à votre ${jur.labels.taxFree}. Votre taux marginal à la retraite (${pct(rrsp.retireMarginal, 1)}) est similaire ou supérieur au taux actuel (${pct(rrsp.currentMarginal, 1)}) — la croissance libre d'impôt est plus avantageuse.`,
            `Prioritize contributions to your ${jur.labels.taxFree}. Your projected retirement marginal rate (${pct(rrsp.retireMarginal, 1)}) is similar to or higher than today's (${pct(rrsp.currentMarginal, 1)}) — tax-free growth is more advantageous.`),
    ),
  );

  const locationCard = card(
    t('Emplacement des actifs', 'Asset location'),
    {
      sub: t('Analyse heuristique par traitement fiscal — le frottement est un coût, pas une économie', 'Heuristic analysis by tax treatment — the drag is a cost, not a saving'),
      right: h('span', { class: 'chip ' + ((location.annualTaxDrag || 0) > 500 ? 'neg' : 'pos') }, t('Frottement / an : ', 'Annual drag: ') + money(location.annualTaxDrag || 0, { currency: cur })),
    },
    h('div', {},
      ...(location.findings || []).map(f =>
        h('div', { class: 'flex', style: { gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' } },
          h('span', { class: 'chip ' + (f.severity === 'warn' ? 'neg' : 'pos'), style: { flex: 'none', marginTop: '1px' }, html: icon(f.severity === 'warn' ? 'warning' : 'check', 13) }),
          h('div', {}, h('b', {}, f.label), h('div', { class: 'tiny muted' }, f.detail)),
        ),
      ),
    ),
  );

  const withdrawalCard = card(
    t('Ordre de décaissement', 'Withdrawal sequencing'),
    { sub: t('Comparaison de trois stratégies à la retraite', 'Comparison of three retirement decumulation strategies') },
    h('div', {},
      ...withdrawal.map((strategy) =>
        h('div', { style: { padding: '12px', marginBottom: '10px', borderRadius: '8px', border: strategy.recommended ? '2px solid var(--pos)' : '1px solid var(--border)', background: strategy.recommended ? 'var(--surface-2)' : 'var(--surface)' } },
          h('div', { class: 'flex between', style: { alignItems: 'center', marginBottom: '6px' } },
            h('b', {}, strategy.name),
            strategy.recommended ? h('span', { class: 'chip pos', html: icon('check', 13) + ' ' + t('Recommandé', 'Recommended') }) : null),
          h('div', { class: 'tiny', style: { marginBottom: '4px' } }, strategy.desc),
          h('div', { class: 'tiny muted' }, strategy.note),
        ),
      ),
    ),
  );

  const advancedCard = card(
    t('Stratégie avancée', 'Advanced strategy'),
    { sub: advanced.title, right: h('span', { class: 'chip info' }, jur.flag + ' ' + jur.name) },
    h('div', { style: { padding: '12px 0', lineHeight: '1.6' } }, advanced.text),
  );

  return h('div', { class: 'grid' },
    kpiRow,
    h('div', { class: 'grid cols-2 span-full' },
      splittingCard(splitNow, t('Fractionnement du revenu — aujourd’hui', 'Income splitting — today'), t('Revenus actuels du dossier', 'Current income on file')),
      splittingCard(splitRet, t(`Fractionnement du revenu — à la retraite (${R.retirementAge} ans)`, `Income splitting — at retirement (age ${R.retirementAge})`), t('Première année de retraite projetée', 'First projected retirement year')),
    ),
    h('div', { class: 'grid cols-2 span-full' }, rrspCard, locationCard),
    h('div', { class: 'span-full' }, withdrawalCard),
    h('div', { class: 'span-full' }, advancedCard),
  );
}
