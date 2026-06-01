import { h, money, pct, num, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, lineChart, PALETTE } from '../charts.js';
import { holdcoAnalysis, estateFreezeLCGE, rcaAnalysis, prescribedRateLoan } from '../../engine/advstructures.js';
import { businessValuation } from '../../engine/corporate.js';

export function render({ client, jur, navigate }) {
  const cur = jur.currency;
  const isCA = jur.country === 'CA';
  const bizVal = client.business ? (businessValuation(client.business.valuation).estimate || 1500000) : 1500000;

  // ---------- Prescribed-rate loan (works conceptually everywhere) ----------
  let prLoan = 1000000, prRet = 0.06, prRate = 0.04, prHigh = 0.50, prLow = 0.25, prYears = 15;
  const prBox = h('div', {});
  function drawPR() {
    const r = prescribedRateLoan({ loan: prLoan, returnRate: prRet, prescribedRate: prRate, highMarg: prHigh, lowMarg: prLow, years: prYears });
    prBox.replaceChildren(
      h('div', { class: 'grid cols-3', style: { marginBottom: '10px' } },
        kpi({ label: t('Revenu déplacé / an', 'Income shifted / yr'), value: money(r.splitIncome, { currency: cur, compact: true }) }),
        kpi({ label: t('Économie d’impôt annuelle', 'Annual tax saving'), value: money(r.annualSaving, { currency: cur, compact: true }), accent: 'var(--pos)' }),
        kpi({ label: t(`Économie cumulée (${prYears} ans)`, `Cumulative saving (${prYears} yrs)`), value: money(r.cumulative, { currency: cur, compact: true }), accent: 'var(--pos)' }),
      ),
      h('div', { html: lineChart({ series: [{ color: PALETTE[1], values: r.series.map(s => Math.round(s.cumulative)) }], xLabels: r.series.map(s => s.year), area: true }) }),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } },
        t('Le conjoint à revenu élevé prête au conjoint (ou à une fiducie familiale) au taux prescrit de l’ARC. Seul l’intérêt au taux prescrit est attribué; le rendement excédentaire est imposé dans les mains à faible taux. Le prêt doit porter intérêt et l’intérêt être payé au 30 janvier.',
          'The higher-income spouse lends to the spouse (or a family trust) at the CRA prescribed rate. Only the prescribed-rate interest is attributed back; the excess return is taxed in the low-rate hands. The loan must bear interest, paid by January 30.')),
    );
  }
  drawPR();
  const prCard = card(t('Prêt au taux prescrit (fractionnement)', 'Prescribed-rate loan (income splitting)'), { class: 'span-full',
    sub: t('Déplacer le revenu de placement vers un conjoint/enfant à faible taux', 'Shift investment income to a lower-rate spouse/child') },
    h('div', { class: 'grid cols-3' },
      slider({ label: t('Montant du prêt', 'Loan amount'), value: prLoan, min: 100000, max: 5000000, step: 100000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { prLoan = v; drawPR(); } }),
      slider({ label: t('Rendement du portefeuille', 'Portfolio return'), value: prRet, min: 0.03, max: 0.12, step: 0.005, format: v => pct(v), onInput: v => { prRet = v; drawPR(); } }),
      slider({ label: t('Taux prescrit ARC', 'CRA prescribed rate'), value: prRate, min: 0.01, max: 0.07, step: 0.005, format: v => pct(v), onInput: v => { prRate = v; drawPR(); } }),
      slider({ label: t('Taux marginal — prêteur', 'Marginal rate — lender'), value: prHigh, min: 0.3, max: 0.55, step: 0.01, format: v => pct(v, 0), onInput: v => { prHigh = v; drawPR(); } }),
      slider({ label: t('Taux marginal — emprunteur', 'Marginal rate — borrower'), value: prLow, min: 0, max: 0.4, step: 0.01, format: v => pct(v, 0), onInput: v => { prLow = v; drawPR(); } }),
      slider({ label: t('Horizon (ans)', 'Horizon (yrs)'), value: prYears, min: 1, max: 30, step: 1, format: v => `${v}`, onInput: v => { prYears = v; drawPR(); } }),
    ),
    prBox);

  if (!isCA) {
    return h('div', { class: 'grid' }, prCard, analogCard(jur));
  }

  // ---------- Estate freeze + family trust (LCGE multiplication) ----------
  let fzCur = Math.round(bizVal), fzFut = Math.round(bizVal * 3), fzBen = 3, fzMarg = 0.26;
  const fzBox = h('div', {});
  function drawFreeze() {
    const r = estateFreezeLCGE({ currentValue: fzCur, futureValue: fzFut, beneficiaries: fzBen, marginalRate: fzMarg });
    fzBox.replaceChildren(
      h('div', { class: 'grid cols-3', style: { marginBottom: '10px' } },
        kpi({ label: t('Croissance future (gelée)', 'Future growth (frozen out)'), value: money(r.growth, { currency: cur, compact: true }) }),
        kpi({ label: t('Exonération totale (EGC × bénéf.)', 'Total exemption (LCGE × benef.)'), value: money(r.lcgeTotal, { currency: cur, compact: true }), accent: 'var(--pos)' }),
        kpi({ label: t('Impôt épargné (multiplication)', 'Tax saved (multiplication)'), value: money(r.taxSaved, { currency: cur, compact: true }), accent: 'var(--pos)' }),
      ),
      h('div', { html: barChart({
        xLabels: [t('1 seule EGC', 'Single LCGE'), t(`${fzBen} bénéficiaires`, `${fzBen} beneficiaries`)],
        series: [{ color: PALETTE[2], values: [Math.round(r.exemptSingle), Math.round(r.exemptWithFreeze)] }],
      }) }),
      statList([
        [t('Valeur gelée (actions privilégiées du fondateur)', 'Frozen value (founder preferred shares)'), money(fzCur, { currency: cur })],
        [t('Croissance attribuée à la fiducie', 'Growth attributed to the trust'), money(r.growth, { currency: cur })],
        [t('Exonération si 1 seul détenteur', 'Exemption with a single holder'), money(r.exemptSingle, { currency: cur })],
        [t('Exonération multipliée', 'Multiplied exemption'), money(r.exemptWithFreeze, { currency: cur }), 'pos'],
        [t('Gain imposable résiduel', 'Residual taxable gain'), money(r.taxableGrowth, { currency: cur })],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } },
        t('Le gel cristallise la valeur actuelle en actions privilégiées à valeur fixe; les nouvelles actions ordinaires (croissance) sont émises à une fiducie familiale dont chaque bénéficiaire peut réclamer sa propre EGC à la vente. Attention à la règle de disposition réputée des 21 ans et aux règles IRF/TOSI.',
          'The freeze crystallizes today’s value into fixed-value preferred shares; new common (growth) shares are issued to a family trust whose beneficiaries can each claim their own LCGE at sale. Mind the 21-year deemed disposition rule and TOSI.')),
    );
  }
  drawFreeze();
  const fzCard = card(t('Gel successoral + fiducie familiale', 'Estate freeze + family trust'), { class: 'span-full',
    sub: t('Multiplier l’exonération cumulative des gains en capital entre les bénéficiaires', 'Multiply the lifetime capital gains exemption across beneficiaries') },
    h('div', { class: 'grid cols-4' },
      slider({ label: t('Valeur actuelle (gel)', 'Current value (freeze)'), value: fzCur, min: 0, max: 10000000, step: 100000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { fzCur = v; drawFreeze(); } }),
      slider({ label: t('Valeur future (vente)', 'Future value (sale)'), value: fzFut, min: 0, max: 20000000, step: 100000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { fzFut = v; drawFreeze(); } }),
      slider({ label: t('Nombre de bénéficiaires', 'Number of beneficiaries'), value: fzBen, min: 1, max: 6, step: 1, format: v => `${v}`, onInput: v => { fzBen = v; drawFreeze(); } }),
      slider({ label: t('Taux marginal (gain)', 'Marginal rate (gain)'), value: fzMarg, min: 0.2, max: 0.27, step: 0.005, format: v => pct(v, 0), onInput: v => { fzMarg = v; drawFreeze(); } }),
    ),
    fzBox);

  // ---------- Holdco two-tier ----------
  let hcActive = Math.round(bizVal), hcPassive = client.business ? (client.business.corpInvestments || 500000) : 500000;
  const hcBox = h('div', {});
  function drawHC() {
    const r = holdcoAnalysis({ activeAssets: hcActive, passiveAssets: hcPassive });
    hcBox.replaceChildren(
      h('div', { class: 'grid cols-3', style: { marginBottom: '10px' } },
        kpi({ label: t('Actifs actifs (ratio)', 'Active assets (ratio)'), value: pct(r.activeRatio, 0), accent: r.qsbcEligible ? 'var(--pos)' : 'var(--warn)',
          sub: r.qsbcEligible ? t('Admissible AAPE/EGC', 'QSBC/LCGE eligible') : t('Non admissible — purifier', 'Not eligible — purify') }),
        kpi({ label: t('À remonter au Holdco', 'Move up to Holdco'), value: money(r.excessToMoveUp, { currency: cur, compact: true }) }),
        kpi({ label: t('Protégé des créanciers', 'Creditor-protected'), value: money(r.creditorProtected, { currency: cur, compact: true }), accent: 'var(--pos)' }),
      ),
      statList([
        [t('Dividende intersociétés (libre d’impôt)', 'Intercorporate dividend (tax-free)'), money(r.intercorpDividend, { currency: cur }), 'pos'],
        [t('Passif maximal pour rester AAPE', 'Max passive to stay QSBC'), money(r.maxPassiveForQSBC, { currency: cur })],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } },
        t('Une société de portefeuille (Holdco) reçoit les liquidités excédentaires de l’Opco en franchise d’impôt (sociétés rattachées), protège ces actifs du risque opérationnel et « purifie » l’Opco pour préserver le statut d’AAPE requis pour l’EGC.',
          'A holding company (Holdco) receives Opco’s excess cash tax-free (connected corporations), shields those assets from operating risk, and “purifies” Opco to preserve the QSBC status required for the LCGE.')),
    );
  }
  drawHC();
  const hcCard = card(t('Société de gestion (Holdco) — structure à deux paliers', 'Holding company (Holdco) — two-tier structure'), { class: 'span-full',
    sub: t('Protection d’actifs, report et purification pour l’EGC', 'Asset protection, deferral and purification for the LCGE') },
    h('div', { class: 'grid cols-2' },
      slider({ label: t('Actifs d’entreprise actifs', 'Active business assets'), value: hcActive, min: 0, max: 10000000, step: 100000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { hcActive = v; drawHC(); } }),
      slider({ label: t('Actifs passifs (placements/encaisse)', 'Passive assets (investments/cash)'), value: hcPassive, min: 0, max: 5000000, step: 50000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { hcPassive = v; drawHC(); } }),
    ),
    hcBox);

  // ---------- RCA ----------
  let rcaContrib = 100000, rcaYears = 10;
  const rcaBox = h('div', {});
  function drawRCA() {
    const r = rcaAnalysis({ contribution: rcaContrib, corpRate: 0.122, years: rcaYears, returnRate: 0.05 });
    rcaBox.replaceChildren(
      statList([
        [t('Cotisation annuelle', 'Annual contribution'), money(r.contribution, { currency: cur })],
        [t('Part investie (50 %)', 'Invested portion (50%)'), money(r.toInvest, { currency: cur })],
        [t('Part au compte d’impôt remboursable (50 %)', 'To refundable tax account (50%)'), money(r.toRTA, { currency: cur })],
        [t('Économie d’impôt corporatif / an', 'Corporate tax saving / yr'), money(r.corpDeductionSaving, { currency: cur }), 'pos'],
        [t(`Capital total après ${rcaYears} ans`, `Total fund after ${rcaYears} yrs`), money(r.fundAfterYears, { currency: cur }), 'pos'],
      ]),
      h('p', { class: 'tiny muted', style: { marginTop: '8px' } }, r.note),
    );
  }
  drawRCA();
  const rcaCard = card(t('Convention de retraite (RCA)', 'Retirement Compensation Arrangement (RCA)'), { class: 'span-full',
    sub: t('Épargne-retraite déductible au-delà des plafonds REER/RRI', 'Deductible retirement savings beyond RRSP/IPP limits') },
    h('div', { class: 'grid cols-2' },
      slider({ label: t('Cotisation annuelle', 'Annual contribution'), value: rcaContrib, min: 20000, max: 500000, step: 10000, format: v => money(v, { currency: cur, compact: true }), onInput: v => { rcaContrib = v; drawRCA(); } }),
      slider({ label: t('Années', 'Years'), value: rcaYears, min: 3, max: 25, step: 1, format: v => `${v}`, onInput: v => { rcaYears = v; drawRCA(); } }),
    ),
    rcaBox);

  // ---------- More structures ----------
  const more = card(t('Autres structures avancées', 'Other advanced structures'), { class: 'span-full' },
    h('div', { class: 'grid cols-2' }, ...[
      [t('Régime de retraite individuel (RRI/IPP)', 'Individual Pension Plan (IPP)'), t('Pour le propriétaire de 45 ans et plus : cotisations déductibles supérieures au REER, déficit actuariel déductible, protégé des créanciers.', 'For owners 45+: deductible contributions larger than RRSP, deductible actuarial top-ups, creditor-protected.')],
      [t('Fiducie en faveur de soi-même (65+)', 'Alter-ego trust (65+)'), t('Transfert sans impôt, évite l’homologation, confidentialité et protection — disposition réputée au décès.', 'Tax-free transfer, avoids probate, privacy and protection — deemed disposition at death.')],
      [t('Fonds de catégorie de société', 'Corporate class funds'), t('Reporte et convertit le revenu en gains en capital plus avantageux dans un compte non enregistré ou corporatif.', 'Defers and converts income into more favourable capital gains in a non-registered or corporate account.')],
      [t('Don de titres cotés', 'Gift of listed securities'), t('Aucune inclusion du gain en capital sur les titres cotés donnés + crédit de don — très efficace pour la philanthropie.', 'Zero capital-gains inclusion on gifted listed securities + donation credit — highly efficient for philanthropy.')],
      [t('Police d’assurance détenue par le Holdco', 'Holdco-owned insurance'), t('Combine protection des actifs, CDC et financement de l’impôt successoral à faible coût.', 'Combines asset protection, the CDA and low-cost estate-tax funding.')],
      [t('Convention entre actionnaires', 'Shareholders’ agreement'), t('Clause d’achat-vente financée par assurance, évaluation, droits de premier refus — essentielle à toute société à associés.', 'Insurance-funded buy-sell, valuation, rights of first refusal — essential for any multi-owner corporation.')],
    ].map(([ti, tx]) => h('div', { class: 'flex', style: { gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' } },
      h('span', { class: 'chip info', style: { flex: 'none' }, html: icon('check', 13) }),
      h('div', {}, h('b', {}, ti), h('div', { class: 'tiny muted' }, tx))))));

  return h('div', { class: 'grid' }, prCard, fzCard, hcCard, rcaCard, more);
}

function analogCard(jur) {
  const txt = jur.country === 'US'
    ? t('Gel successoral, fiducie familiale, Holdco et RCA sont des structures canadiennes. Équivalents américains : GRAT, fiducie intentionnellement viciée (IDGT), société en commandite familiale (FLP), et régimes de rémunération différée non qualifiés (NQDC). Les prêts intrafamiliaux utilisent le taux AFR.',
      'Estate freeze, family trust, Holdco and RCA are Canadian structures. US equivalents: GRAT, intentionally defective grantor trust (IDGT), family limited partnership (FLP), and non-qualified deferred compensation (NQDC). Intra-family loans use the AFR rate.')
    : t('Équivalents britanniques : Family Investment Company (FIC), fiducies discrétionnaires, et cotisations de pension par l’employeur. Le fractionnement par prêt est moins courant en raison des règles d’attribution.',
      'UK equivalents: Family Investment Company (FIC), discretionary trusts, and employer pension contributions. Loan-based splitting is less common due to settlements rules.');
  return card(t('Structures locales équivalentes', 'Local equivalent structures'), { class: 'span-full' }, h('p', {}, txt));
}
