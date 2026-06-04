// ============================================================
// Succession planning view — exit route comparator, deal
// mechanics, readiness checklist, and disclaimer.
// ============================================================
import { h, money, pct, icon, t } from '../dom.js';
import { kpi, card, slider, statList, legend } from '../widgets.js';
import { barChart, PALETTE } from '../charts.js';
import { businessValuation, lcgeSale } from '../../engine/corporate.js';

export function render({ client, jur }) {
  const cur = jur.currency;
  const B = client.business;

  // ---------- Guard: no business data ----------
  if (!B) {
    return h('div', { class: 'grid' },
      h('div', { class: 'card span-full' },
        h('div', { class: 'empty' },
          h('div', { class: 'big', html: icon('briefcase', 40) }),
          h('div', {}, t(
            'Aucune entreprise associée à ce dossier. Ajoutez une entreprise dans l’onglet Entreprise.',
            'No business associated with this file. Add a business in the Business tab.'
          ))
        )
      )
    );
  }

  // ---------- Section 1: Exit route comparator ----------
  const val = businessValuation(B.valuation || {});
  const defaultValue = val.estimate > 0 ? Math.round(val.estimate) : 2000000;
  const defaultAcb = (B.sale && B.sale.acb) ? B.sale.acb : 0;

  let exitValue = defaultValue;
  let exitAcb = defaultAcb;
  let exitSuccessors = 1;

  const exitBox = h('div', {});

  function drawExit() {
    const thirdParty = lcgeSale(jur, exitValue, exitAcb, 1);
    const familyTransfer = lcgeSale(jur, exitValue, exitAcb, exitSuccessors);
    // MBO: assume 30% vendor take-back financed portion has deferred proceeds
    const mboFinanced = exitValue * 0.30;
    const mboImmediate = exitValue * 0.70;
    const mboLcge = lcgeSale(jur, exitValue, exitAcb, 1);
    // Net proceeds for MBO: full tax on full gain but partial upfront receipt
    // Show net assuming all proceeds eventually received (same tax as third-party)
    const mboNet = mboLcge.netProceeds;

    const nets = [thirdParty.netProceeds, familyTransfer.netProceeds, mboNet];
    const bestIdx = nets.indexOf(Math.max(...nets));
    const routeLabels = [
      t('Vente tiers', 'Third-party'),
      t('Transfert familial', 'Family transfer'),
      t('Rachat direction (MBO)', 'MBO'),
    ];
    const chips = routeLabels.map((lbl, i) =>
      i === bestIdx
        ? h('span', { class: 'chip pos', html: icon('check', 12) + ' ' + t('Recommandé', 'Recommended') + ': ' + lbl })
        : null
    );

    exitBox.replaceChildren(
      h('div', { class: 'flex between center', style: { marginBottom: '12px', flexWrap: 'wrap', gap: '8px' } },
        ...chips.filter(Boolean)
      ),
      h('div', { html: barChart({
        xLabels: routeLabels,
        series: [
          { color: PALETTE[0], values: [Math.round(thirdParty.netProceeds), Math.round(familyTransfer.netProceeds), Math.round(mboNet)] },
        ],
      }) }),
      legend([
        { color: PALETTE[0], label: t('Produit net après impôt', 'Net after-tax proceeds') },
      ]),
      h('div', { class: 'sep' }),
      h('div', { class: 'grid cols-3', style: { marginTop: '12px' } },
        // Column 1 — Third-party sale
        h('div', {},
          h('div', { class: 'chip info', style: { marginBottom: '8px' } }, t('Vente à un tiers', 'Third-party sale')),
          statList([
            [t('Gain en capital', 'Capital gain'), money(thirdParty.gain, { currency: cur })],
            [t('Portion exonérée (EGC)', 'Exempt portion (LCGE)'), money(thirdParty.exempt, { currency: cur }), 'pos'],
            [t('Gain imposable', 'Taxable gain'), money(thirdParty.taxableGain, { currency: cur })],
            [t('Impôt estimé', 'Estimated tax'), money(thirdParty.taxWithLcge, { currency: cur }), 'neg'],
            [t('Produit net', 'Net proceeds'), money(thirdParty.netProceeds, { currency: cur }), 'pos'],
          ]),
        ),
        // Column 2 — Family transfer
        h('div', {},
          h('div', { class: 'chip info', style: { marginBottom: '8px' } }, t('Transfert familial', 'Family transfer')),
          statList([
            [t('Gain en capital', 'Capital gain'), money(familyTransfer.gain, { currency: cur })],
            [t('Exonération totale (' + exitSuccessors + ' pers.)', 'Total exemption (' + exitSuccessors + ' pers.)'), money(familyTransfer.exemptionTotal, { currency: cur }), 'pos'],
            [t('Portion exonérée', 'Exempt portion'), money(familyTransfer.exempt, { currency: cur }), 'pos'],
            [t('Impôt estimé', 'Estimated tax'), money(familyTransfer.taxWithLcge, { currency: cur }), 'neg'],
            [t('Produit net', 'Net proceeds'), money(familyTransfer.netProceeds, { currency: cur }), 'pos'],
          ]),
          h('p', { class: 'tiny muted', style: { marginTop: '8px' } },
            t('Loi C-208/C-59 : transfert réel du contrôle requis. Conditions strictes d’admissibilité à valider.',
              'Bill C-208/C-59: genuine transfer of control required. Strict eligibility conditions to validate.')
          ),
        ),
        // Column 3 — MBO
        h('div', {},
          h('div', { class: 'chip info', style: { marginBottom: '8px' } }, t('Rachat par la direction (MBO)', 'Management buyout (MBO)')),
          statList([
            [t('Valeur de l’entreprise', 'Business value'), money(exitValue, { currency: cur })],
            [t('Portion immédiate (70 %)', 'Immediate portion (70%)'), money(mboImmediate, { currency: cur })],
            [t('Balance vendeur (30 %)', 'Vendor take-back (30%)'), money(mboFinanced, { currency: cur })],
            [t('Impôt estimé (gain total)', 'Estimated tax (full gain)'), money(mboLcge.taxWithLcge, { currency: cur }), 'neg'],
            [t('Produit net total', 'Total net proceeds'), money(mboNet, { currency: cur }), 'pos'],
          ]),
          h('p', { class: 'tiny muted', style: { marginTop: '8px' } },
            t('Le financement vendeur (balance de prix de vente) diffère l’encaissement mais peut faciliter la transaction.',
              'Vendor financing (take-back) defers cash receipt but can facilitate the deal.')
          ),
        ),
      ),
    );
  }

  drawExit();

  const exitCard = card(
    t('Comparateur de voies de sortie', 'Exit route comparison'),
    { class: 'span-full', sub: t('Produit net après impôt selon la voie choisie', 'Net after-tax proceeds by exit route') },
    h('div', { class: 'grid cols-3' },
      slider({
        label: t('Valeur de l’entreprise', 'Business value'),
        value: exitValue, min: 0, max: 20000000, step: 50000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { exitValue = v; drawExit(); },
      }),
      slider({
        label: t('Prix de base rajusté (PBR)', 'Adjusted cost base (ACB)'),
        value: exitAcb, min: 0, max: 5000000, step: 25000,
        format: v => money(v, { currency: cur, compact: true }),
        onInput: v => { exitAcb = v; drawExit(); },
      }),
      slider({
        label: t('Successeurs familiaux (multiplication EGC)', 'Family successors (LCGE multiplication)'),
        value: exitSuccessors, min: 1, max: 4, step: 1,
        format: v => `${v}`,
        onInput: v => { exitSuccessors = v; drawExit(); },
      }),
    ),
    exitBox,
  );

  // ---------- Section 2: Deal mechanics ----------
  const mechanics = [
    {
      title: t('Vente d’actions vs vente d’actifs', 'Share sale vs asset sale'),
      text: t(
        'La vente d’actions permet à l’acquéreur de reprendre l’entité légale; le vendeur bénéficie de l’EGC. La vente d’actifs procure à l’acquéreur une base fiscale rajustée mais prive le vendeur de l’EGC.',
        'A share sale lets the buyer take over the legal entity; the seller benefits from the LCGE. An asset sale gives the buyer a stepped-up tax base but the seller loses the LCGE.'
      ),
    },
    {
      title: t('Balance de prix de vente (BPV)', 'Vendor take-back (VTB)'),
      text: t(
        'Le vendeur finance une partie du prix sous forme de billet à ordre. Facilite la transaction, crée un flux de revenus post-vente, mais expose le vendeur à un risque de crédit sur l’acquéreur.',
        'The seller finances part of the price as a promissory note. Eases the deal, creates a post-sale income stream, but exposes the seller to buyer credit risk.'
      ),
    },
    {
      title: t('Clause d’ajustement (earn-out)', 'Earn-out clause'),
      text: t(
        'Une partie du prix est conditionnée aux résultats futurs (BAIIA, chiffre d’affaires). Réduit le risque acquéreur, mais complexifie l’évaluation fiscale pour le vendeur.',
        'Part of the price is contingent on future results (EBITDA, revenue). Reduces buyer risk but complicates tax treatment for the seller.'
      ),
    },
    {
      title: t('Gel successoral préalable', 'Preliminary estate freeze'),
      text: t(
        'Cristallise la valeur actuelle des actions du cédant en actions privilégiées à valeur fixe; les actions ordinaires (croissance future) sont émises aux successeurs ou à une fiducie familiale.',
        'Crystallizes the transferor’s share value as fixed-value preferred shares; new common shares (future growth) are issued to successors or a family trust.'
      ),
    },
    {
      title: t('Convention entre actionnaires', 'Shareholders’ agreement'),
      text: t(
        'Encadre les droits de préemption, les clauses de rachat obligé (buy-sell), la valorisation et les restrictions de transfert. Essentielle avant toute négociation.',
        'Governs rights of first refusal, mandatory buy-sell clauses, valuation mechanisms and transfer restrictions. Essential before any negotiation.'
      ),
    },
    {
      title: t('Garanties et déclarations (reps & warranties)', 'Representations and warranties'),
      text: t(
        'Le vendeur déclare l’état de l’entreprise (passifs cachés, litiges, conformité fiscale). Une assurance reps & warranties peut couvrir le risque résiduel.',
        'The seller declares the state of the business (hidden liabilities, litigation, tax compliance). Reps & warranties insurance can cover residual risk.'
      ),
    },
  ];

  const mechanicsCard = card(
    t('Mécanismes de transaction', 'Deal mechanics'),
    { class: 'span-full', sub: t('Structures et clauses clés d’une convention de vente', 'Key structures and clauses in a purchase agreement') },
    h('div', { class: 'grid cols-2' },
      ...mechanics.map(m =>
        h('div', { class: 'flex', style: { gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' } },
          h('span', { class: 'chip info', style: { flex: 'none' }, html: icon('briefcase', 13) }),
          h('div', {},
            h('b', {}, m.title),
            h('div', { class: 'tiny muted' }, m.text),
          )
        )
      )
    ),
  );

  // ---------- Section 3: Succession readiness checklist ----------
  const checklist = [
    {
      title: t('Testament et mandats à jour', 'Up-to-date will and mandates'),
      text: t(
        'Testament, mandat de protection (incapacité) et procu-rations révisés par un notaire à jour avec la structure actuelle.',
        'Will, protective mandate (incapacity) and powers of attorney reviewed by a notary and aligned with the current structure.'
      ),
    },
    {
      title: t('Convention entre actionnaires à jour', 'Current shareholders’ agreement'),
      text: t(
        'Vérifier les clauses de rachat, la méthode d’évaluation et les dispositions en cas de décès ou d’invalidité.',
        'Review buy-sell clauses, valuation method, and provisions on death or disability.'
      ),
    },
    {
      title: t('Assurance personne clé et rachat', 'Key-person and buy-sell insurance'),
      text: t(
        'Assurance vie et invalidité sur les associés clés pour financer un rachat forcé et protéger la continuité.',
        'Life and disability insurance on key partners to fund a forced buyout and protect business continuity.'
      ),
    },
    {
      title: t('Évaluation indépendante de l’entreprise', 'Independent business valuation'),
      text: t(
        'Rapport d’évaluation par un EEA/CBV agréé. Nécessaire pour la planification fiscale, les négociations et les tribunaux.',
        'Valuation report by a certified CBV/BV. Required for tax planning, negotiations and court proceedings.'
      ),
    },
    {
      title: t('Identification et préparation du successeur', 'Successor identification and preparation'),
      text: t(
        'Successeur identifié (familial, direction, acquéreur extérieur), formation et plan de développement des compétences encadrés.',
        'Successor identified (family, management, external buyer), with training and skill-development plan in place.'
      ),
    },
    {
      title: t('Plan de transition et mentorat', 'Transition plan and mentoring'),
      text: t(
        'Calendrier de transfert progressif des responsabilités, période de chevauchement et protocole de communication interne et externe.',
        'Timeline for gradual handover of responsibilities, overlap period, and internal/external communication protocol.'
      ),
    },
    {
      title: t('Purification pour l’EGC (AAPE)', 'Purification for LCGE (QSBC shares)'),
      text: t(
        'Vérifier le test des actifs (90 % utilisés activement), détenir les actions 24 mois avant la vente et éliminer les actifs non admissibles.',
        'Verify the asset test (90% actively used), hold shares 24 months before sale, and purge non-qualifying assets.'
      ),
    },
    {
      title: t('Structure Holdco et fiducie familiale', 'Holdco and family trust structure'),
      text: t(
        'Une société de portefeuille et une fiducie familiale permettent de multiplier l’EGC, de protéger les actifs et de fractionner le revenu.',
        'A holding company and family trust allow multiplying the LCGE, protecting assets and splitting income.'
      ),
    },
    {
      title: t('Optimisation du moment et étalement', 'Timing optimization and spreading'),
      text: t(
        'Planifier la vente sur plusieurs années d’imposition (gel, earn-out, BPV) pour réduire l’imposition marginale et lisser les revenus.',
        'Plan the sale across multiple tax years (freeze, earn-out, VTB) to reduce marginal rates and smooth income.'
      ),
    },
  ];

  const checklistCard = card(
    t('Liste de préparation à la relève', 'Succession readiness checklist'),
    { class: 'span-full', sub: t('Points à vérifier avec le conseiller avant toute négociation', 'Items to verify with the advisor before any negotiation') },
    h('div', { class: 'grid cols-2' },
      ...checklist.map((item, idx) =>
        h('div', { class: 'flex', style: { gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' } },
          h('span', { class: 'chip pos', style: { flex: 'none' }, html: icon('check', 13) }),
          h('div', {},
            h('b', {}, item.title),
            h('div', { class: 'tiny muted' }, item.text),
          )
        )
      )
    ),
  );

  // ---------- Section 4: Disclaimer ----------
  const disclaimerCard = card(
    t('Avis important', 'Important notice'),
    { class: 'span-full' },
    h('div', { class: 'flex', style: { gap: '12px', alignItems: 'flex-start' } },
      h('span', { class: 'chip warn', style: { flex: 'none' }, html: icon('warning', 16) }),
      h('p', { class: 'tiny muted', style: { margin: 0 } },
        t(
          'La vente ou le transfert d’une entreprise est une opération complexe qui nécessite l’accompagnement de conseillers spécialisés : comptable agréé (fiscalité corporative et personnelle), avocat (convention de vente, contrats, conformité) et évaluateur indépendant agréé (EEA/CBV). Les montants présentés ici sont des estimations à titre indicatif et ne constituent pas un avis juridique, fiscal ou financier. Une évaluation indépendante de l’entreprise est indispensable avant toute négociation ou transaction.',
          'The sale or transfer of a business is a complex transaction requiring specialized advisors: a chartered professional accountant (corporate and personal tax), a lawyer (purchase agreement, contracts, compliance) and a certified independent valuator (CBV). The amounts shown here are indicative estimates only and do not constitute legal, tax or financial advice. An independent business valuation is essential before any negotiation or transaction.'
        )
      ),
    ),
  );

  // ---------- KPIs ----------
  const thirdPartyKpi = lcgeSale(jur, exitValue, exitAcb, 1);
  const kpis = h('div', { class: 'grid cols-3 span-full' },
    kpi({
      label: t('Valeur estimée de l’entreprise', 'Estimated business value'),
      value: money(exitValue, { currency: cur, compact: true }),
      iconName: 'briefcase',
      sub: val.estimate > 0 ? t('Selon les multiples', 'Based on multiples') : t('Valeur par défaut', 'Default value'),
    }),
    kpi({
      label: t('Gain en capital (vente tiers)', 'Capital gain (third-party sale)'),
      value: money(thirdPartyKpi.gain, { currency: cur, compact: true }),
      sub: t('PBR : ' + money(exitAcb, { currency: cur, compact: true }), 'ACB: ' + money(exitAcb, { currency: cur, compact: true })),
    }),
    kpi({
      label: t('Économie EGC maximale', 'Maximum LCGE saving'),
      value: money(thirdPartyKpi.taxSaved, { currency: cur, compact: true }),
      accent: 'var(--pos)',
      sub: t('Pour 1 détenteur', 'For 1 owner'),
    }),
  );

  return h('div', { class: 'grid' },
    kpis,
    exitCard,
    mechanicsCard,
    checklistCard,
    disclaimerCard,
  );
}
