/**
 * Banc d'essai — 100+ scénarios sur le moteur JCProfitEngine
 * Chaque scénario vérifie des invariants comptables et fiscaux.
 */
require(__dirname + '/../js/rentabilite-engine.js');
const E = globalThis.JCProfitEngine;

const results = [];
let idCounter = 0;

function check(group, name, fn) {
    idCounter++;
    try {
        const issues = [];
        fn(issues);
        results.push({ id: idCounter, group, name, pass: issues.length === 0, issues });
    } catch (e) {
        results.push({ id: idCounter, group, name, pass: false, issues: ['EXCEPTION: ' + e.message] });
    }
}

const near = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 1 : tol);
const finite = (x) => typeof x === 'number' && isFinite(x);

// Invariants communs pour chaque scénario fiscal
function fiscalInvariants(issues, label, s, profit) {
    const total = s.netCash + (s.retainedInCorp || 0) + s.totalLevies;
    if (!near(total, profit, 2)) issues.push(`${label}: net+rétention+ponctions=${Math.round(total)} ≠ profit=${profit}`);
    for (const k of ['netCash', 'totalLevies', 'incomeTax', 'effRate']) {
        if (!finite(s[k])) issues.push(`${label}: ${k} non fini (${s[k]})`);
    }
    if (profit > 0 && s.netCash < -1) issues.push(`${label}: netCash négatif (${Math.round(s.netCash)})`);
    if (s.totalLevies < -1) issues.push(`${label}: ponctions négatives`);
    if (profit > 0 && (s.effRate < 0 || s.effRate > 0.65)) issues.push(`${label}: taux effectif hors bornes (${(s.effRate * 100).toFixed(1)} %)`);
}

const OPTS = { qcSbdEligible: true, afterApril2026: true, otherPayrollPct: 0.02, fssEmployerRate: 0.0165 };
const OPTS_NOSBD = { qcSbdEligible: false, afterApril2026: true, otherPayrollPct: 0.02, fssEmployerRate: 0.0165 };

// ============================================================
// GROUPE 1 — Impôt des particuliers : valeurs de référence 2026
// ============================================================
const refPersonal = [
    // [revenu ordinaire, impôt attendu (féd+QC), tolérance]
    // Vérifiés à la main par tranches 2026 (MPB bonifié/réduit + abattement 16,5 %)
    [20000, 550, 300],       // presque couvert par les BPA
    [50000, 8268, 50],       // féd 3 921,80 + QC 4 346,70
    [100000, 25647, 50],     // féd 12 018 + QC 13 629 (recoupe les tables publiées)
    [150000, 47596, 50],     // féd 22 090 + QC 25 506
    [200000, 71837, 50],     // féd 33 456 (MPB partiellement réduit) + QC 38 381
    [300000, 123333, 50],    // féd 59 201 (MPB min) + QC 64 131
    [1000000, 496468, 100]   // marginal supérieur 53,31 %
];
for (const [inc, exp, tol] of refPersonal) {
    check('1. Impôt perso', `Revenu ordinaire ${inc.toLocaleString()} $`, (issues) => {
        const t = E.personalTax({ ordinaryIncome: inc });
        if (!near(t.total, exp, tol)) issues.push(`total=${Math.round(t.total)}, attendu ~${exp}±${tol}`);
        if (t.fed < 0 || t.qc < 0) issues.push('impôt négatif');
    });
}
check('1. Impôt perso', 'Revenu 0 $ → impôt 0', (i) => {
    const t = E.personalTax({ ordinaryIncome: 0 });
    if (t.total !== 0) i.push('impôt non nul à revenu nul');
});
check('1. Impôt perso', 'Monotonicité 10k→1M (pas de baisse)', (i) => {
    let prev = -1;
    for (let inc = 10000; inc <= 1000000; inc += 10000) {
        const t = E.personalTax({ ordinaryIncome: inc }).total;
        if (t < prev - 0.01) { i.push(`baisse d'impôt à ${inc}`); break; }
        prev = t;
    }
});
check('1. Impôt perso', 'Taux marginal borné ≤ 53.31 %', (i) => {
    for (let inc = 20000; inc <= 2000000; inc += 20000) {
        const t1 = E.personalTax({ ordinaryIncome: inc }).total;
        const t2 = E.personalTax({ ordinaryIncome: inc + 1000 }).total;
        const marg = (t2 - t1) / 1000;
        if (marg > 0.5340) { i.push(`marginal ${(marg * 100).toFixed(2)} % à ${inc}`); break; }
    }
});
check('1. Impôt perso', 'Dividende non déterminé 50k seul', (i) => {
    const t = E.personalTax({ nonEligDividend: 50000 });
    if (!finite(t.total) || t.total < 0) i.push('résultat invalide');
    if (t.total > 50000 * 0.30) i.push(`impôt trop élevé: ${Math.round(t.total)}`);
});
check('1. Impôt perso', 'Dividende déterminé 50k seul (quasi nul à ce niveau)', (i) => {
    const t = E.personalTax({ eligDividend: 50000 });
    if (!finite(t.total) || t.total < 0) i.push('résultat invalide');
    if (t.total > 5000) i.push(`impôt inattendu: ${Math.round(t.total)}`);
});

// ============================================================
// GROUPE 2 — Cotisations sociales : bornes exactes
// ============================================================
check('2. Cotisations', 'RRQ TA sous exemption (3 000 $) = 0', (i) => {
    if (E.qppSelfEmployed(3000).total !== 0) i.push('cotisation non nulle');
});
check('2. Cotisations', 'RRQ TA au MGA (74 600 $) = 8 958,60 $', (i) => {
    const q = E.qppSelfEmployed(74600).total;
    if (!near(q, (74600 - 3500) * 0.126, 1)) i.push(`RRQ=${q.toFixed(2)}`);
});
check('2. Cotisations', 'RRQ TA plafonné au MSGA (85 000 $ = 200 000 $)', (i) => {
    if (!near(E.qppSelfEmployed(85000).total, E.qppSelfEmployed(200000).total, 0.01)) i.push('pas plafonné');
});
check('2. Cotisations', 'RQAP TA plafonné à 103 000 $', (i) => {
    if (!near(E.qpipSelfEmployed(103000).total, E.qpipSelfEmployed(500000).total, 0.01)) i.push('pas plafonné');
    if (!near(E.qpipSelfEmployed(103000).total, 103000 * 0.00764, 0.5)) i.push('taux incorrect');
});
check('2. Cotisations', 'FSS : 0 sous 18 500 $, max 1 000 $', (i) => {
    if (E.fssIndividual(18000) !== 0) i.push('FSS non nul sous le seuil');
    if (E.fssIndividual(10000000) !== 1000) i.push('FSS max ≠ 1000');
    if (E.fssIndividual(30000) > 150) i.push('palier 1 dépassé');
});
check('2. Cotisations', 'Coût employeur : salaire 0 → 0', (i) => {
    const c = E.employerCostOfSalary(0, 0.0165, 0.02);
    if (c.total !== 0 || c.totalCost !== 0) i.push('coût non nul');
});
check('2. Cotisations', 'Coût employeur croissant et coef borné [1, 1.2]', (i) => {
    let prev = -1;
    for (const s of [10000, 30000, 50000, 74600, 85000, 150000, 500000]) {
        const c = E.employerCostOfSalary(s, 0.0165, 0.02);
        if (c.totalCost < prev) i.push(`coût décroissant à ${s}`);
        if (c.coefficient < 1 || c.coefficient > 1.2) i.push(`coef ${c.coefficient.toFixed(3)} à ${s}`);
        prev = c.totalCost;
    }
});

// ============================================================
// GROUPE 3 — Impôt corporatif
// ============================================================
check('3. Corpo', '100 k$ DPE (après avril) = 11.2 %', (i) => {
    const c = E.corporateTax(100000, OPTS);
    if (!near(c.total, 11200, 1)) i.push(`corp=${c.total}`);
});
check('3. Corpo', '100 k$ DPE (avant avril) = 12.2 %', (i) => {
    const c = E.corporateTax(100000, { qcSbdEligible: true, afterApril2026: false });
    if (!near(c.total, 12200, 1)) i.push(`corp=${c.total}`);
});
check('3. Corpo', '100 k$ sans DPE QC = 20.5 %', (i) => {
    const c = E.corporateTax(100000, OPTS_NOSBD);
    if (!near(c.total, 20500, 1)) i.push(`corp=${c.total}`);
});
check('3. Corpo', '600 k$ : 500 k à 11.2 % + 100 k à 26.5 %', (i) => {
    const c = E.corporateTax(600000, OPTS);
    if (!near(c.total, 500000 * 0.112 + 100000 * 0.265, 1)) i.push(`corp=${c.total}`);
    if (!near(c.afterTaxSbd + c.afterTaxGeneral, c.afterTax, 1)) i.push('pools incohérents');
});
check('3. Corpo', '10 M$ : taux effectif → ~25.8 %', (i) => {
    const c = E.corporateTax(10000000, OPTS);
    if (c.effRate < 0.25 || c.effRate > 0.265) i.push(`eff=${(c.effRate * 100).toFixed(2)}`);
});
check('3. Corpo', 'Profit 0 et négatif → 0', (i) => {
    if (E.corporateTax(0, OPTS).total !== 0) i.push('impôt sur profit nul');
    if (E.corporateTax(-50000, OPTS).total !== 0) i.push('impôt sur perte');
});

// ============================================================
// GROUPE 4 — Scénarios fiscaux : invariants sur grille de profits
// ============================================================
const profitGrid = [0, 1000, 3500, 20000, 58523, 74600, 85000, 103000, 117045,
    150000, 181440, 258482, 300000, 500000, 600000, 1000000, 5000000];
for (const p of profitGrid) {
    check('4. Scénarios', `Invariants TA/salaire/div/mix à ${p.toLocaleString()} $`, (issues) => {
        fiscalInvariants(issues, 'TA', E.scenarioSelfEmployed(p), p);
        fiscalInvariants(issues, 'SAL', E.scenarioSalary(p, 1, OPTS), p);
        fiscalInvariants(issues, 'DIV', E.scenarioDividends(p, 1, OPTS), p);
        fiscalInvariants(issues, 'MIX', E.optimizeMix(p, 1, OPTS), p);
    });
}
// Retraits partiels
for (const w of [0, 0.25, 0.5, 0.75]) {
    check('4. Scénarios', `Retrait ${w * 100} % à 200 k$ : identités et rétention`, (issues) => {
        const sal = E.scenarioSalary(200000, w, OPTS);
        const div = E.scenarioDividends(200000, w, OPTS);
        fiscalInvariants(issues, 'SAL', sal, 200000);
        fiscalInvariants(issues, 'DIV', div, 200000);
        if (w === 0 && (sal.netCash !== 0 || div.netCash > 1)) issues.push('retrait 0 → net perso devrait être 0');
        if (div.retainedInCorp < -1) issues.push('rétention négative');
    });
}
check('4. Scénarios', 'Cohérence mix : f=1 ≡ salaire, f=0 ≡ dividendes', (i) => {
    for (const p of [80000, 250000, 900000]) {
        const s1 = E.scenarioSalary(p, 1, OPTS), m1 = E.scenarioMix(p, 1, 1, OPTS);
        const d0 = E.scenarioDividends(p, 1, OPTS), m0 = E.scenarioMix(p, 0, 1, OPTS);
        if (!near(s1.netCash, m1.netCash, 2)) i.push(`f=1 net diffère à ${p}`);
        if (!near(d0.netCash, m0.netCash, 2)) i.push(`f=0 net diffère à ${p}`);
    }
});
check('4. Scénarios', 'optimizeMix ≥ max(salaire, dividendes)', (i) => {
    for (const p of [60000, 150000, 400000, 2000000]) {
        const best = E.optimizeMix(p, 1, OPTS).totalAfterTax;
        const s = E.scenarioSalary(p, 1, OPTS).totalAfterTax;
        const d = E.scenarioDividends(p, 1, OPTS).totalAfterTax;
        if (best < Math.max(s, d) - 2) i.push(`mix sous-optimal à ${p}`);
    }
});
check('4. Scénarios', 'TA : ponctions monotones croissantes', (i) => {
    let prev = -1;
    for (let p = 10000; p <= 2000000; p += 25000) {
        const l = E.scenarioSelfEmployed(p).totalLevies;
        if (l < prev - 0.01) { i.push(`baisse à ${p}`); break; }
        prev = l;
    }
});
check('4. Scénarios', 'Sans DPE QC : dividendes restent cohérents', (i) => {
    const d = E.scenarioDividends(300000, 1, OPTS_NOSBD);
    fiscalInvariants(i, 'DIV', d, 300000);
    // Sans DPE QC (impôt QC au général mais fédéral encore DPE ≤500k) → dividendes non déterminés
    if (d.eligDiv > 1) i.push('dividende déterminé inattendu sous 500 k$');
});
check('4. Scénarios', 'Profit 800 k$ : ordre des pools (non dét. d\'abord)', (i) => {
    const d = E.scenarioDividends(800000, 0.5, OPTS);
    if (d.eligDiv > 0 && d.nonEligDiv < E.corporateTax(800000, OPTS).afterTaxSbd - 1) {
        i.push('pool déterminé entamé avant d\'épuiser le non déterminé');
    }
});

// ============================================================
// GROUPE 5 — Rentabilité / seuil / valorisation / acquisition / vente
// ============================================================
check('5. Rentabilité', 'Break-even standard (fixes 180 k, var 40 %)', (i) => {
    const b = E.breakEven(500000, 200000, 180000);
    if (!near(b.breakEvenRevenue, 300000, 1)) i.push(`seuil=${b.breakEvenRevenue}`);
});
check('5. Rentabilité', 'Break-even : coûts variables ≥ revenus (marge nulle)', (i) => {
    const b = E.breakEven(100000, 100000, 50000);
    if (!finite(b.breakEvenRevenue) && b.breakEvenRevenue !== Infinity) i.push('NaN');
    if (finite(b.breakEvenRevenue) && b.breakEvenRevenue < 100000) i.push('seuil incohérent');
});
check('5. Rentabilité', 'Break-even : revenus 0', (i) => {
    const b = E.breakEven(0, 0, 50000);
    if (!near(b.breakEvenRevenue, 50000, 1)) i.push(`seuil=${b.breakEvenRevenue}`);
});
check('5. Valorisation', 'BAIIA négatif → valeurs 0', (i) => {
    const v = E.businessValuation(-50000, 0, 2, 4);
    if (v.low !== 0 || v.high !== 0) i.push('valeur non nulle sur BAIIA négatif');
});
check('5. Valorisation', 'Redressements ramènent au positif', (i) => {
    const v = E.businessValuation(-20000, 60000, 2, 4);
    if (!near(v.mid, 40000 * 3, 1)) i.push(`mid=${v.mid}`);
});
check('5. Valorisation', 'Multiples 0 → valeur 0', (i) => {
    const v = E.businessValuation(100000, 0, 0, 0);
    if (v.mid !== 0) i.push('non nul');
});
check('5. Acquisition', 'Prêt standard : paiement annuel exact', (i) => {
    // 750 k$ à 7 % sur 7 ans
    const pay = E.annualPayment(750000, 0.07, 7);
    if (!near(pay, 139164, 200)) i.push(`paiement=${Math.round(pay)}`);
});
check('5. Acquisition', 'Taux 0 % → remboursement linéaire', (i) => {
    if (!near(E.annualPayment(700000, 0, 7), 100000, 0.01)) i.push('linéaire incorrect');
});
check('5. Acquisition', 'Mise de fonds 100 % → dette nulle, DSCR infini', (i) => {
    const a = E.acquisitionAnalysis({ price: 500000, downPct: 1, rate: 0.07, years: 7, normalizedEbitda: 100000 });
    if (a.annualDebtService !== 0) i.push('dette non nulle');
    if (a.dscr !== Infinity) i.push('DSCR devrait être infini');
});
check('5. Acquisition', 'Prix 0 → tout à zéro sans NaN', (i) => {
    const a = E.acquisitionAnalysis({ price: 0, downPct: 0.25, rate: 0.07, years: 7, normalizedEbitda: 100000 });
    if (!finite(a.downPayment) || !finite(a.annualDebtService)) i.push('NaN');
});
check('5. Acquisition', 'DSCR < 1 détecté (prix excessif)', (i) => {
    const a = E.acquisitionAnalysis({ price: 3000000, downPct: 0.1, rate: 0.08, years: 5, normalizedEbitda: 150000 });
    if (a.dscr >= 1) i.push(`DSCR=${a.dscr.toFixed(2)}`);
});
check('5. Vente', 'Prix < PBR → gain 0, impôt 0, net = prix', (i) => {
    const s = E.saleNetProceeds({ price: 100000, acb: 200000, lcgeRemaining: 1250000 });
    if (s.gain !== 0 || s.tax !== 0 || !near(s.net, 100000, 0.01)) i.push('vente à perte mal gérée');
});
check('5. Vente', 'Gain 1,25 M$ pile → tout exonéré', (i) => {
    const s = E.saleNetProceeds({ price: 1250000, acb: 0, lcgeRemaining: 1250000 });
    if (s.tax !== 0) i.push(`impôt=${Math.round(s.tax)}`);
});
check('5. Vente', 'Gain 5 M$, ECGC 0 → impôt ≈ 50 % × marginal', (i) => {
    const s = E.saleNetProceeds({ price: 5000000, acb: 0, lcgeRemaining: 0 });
    if (s.effRateOnGain < 0.20 || s.effRateOnGain > 0.27) i.push(`taux=${(s.effRateOnGain * 100).toFixed(1)} %`);
});
check('5. Vente', 'ECGC partielle déjà utilisée', (i) => {
    const s = E.saleNetProceeds({ price: 1000000, acb: 0, lcgeRemaining: 400000 });
    if (!near(s.exempt, 400000, 1)) i.push('exonération incorrecte');
    if (!near(s.taxableGain, 300000, 1)) i.push('gain imposable incorrect');
});

// ============================================================
// GROUPE 6 — Profils sectoriels : cohérence économique (12 × 3 revenus)
// ============================================================
const SECTOR_RATIOS = {
    resto: { cogs: 32, total: 96.0, benchNet: [2, 6] },
    commerce: { cogs: 55, total: 95.5, benchNet: [2, 7] },
    construction: { cogs: 50, total: 93.6, benchNet: [4, 10] },
    services: { cogs: 5, total: 77.5, benchNet: [15, 30] },
    techno: { cogs: 12, total: 87.9, benchNet: [5, 20] },
    ecommerce: { cogs: 45, total: 93.5, benchNet: [3, 10] },
    transport: { cogs: 38, total: 96.4, benchNet: [3, 8] },
    beaute: { cogs: 12, total: 90.5, benchNet: [5, 12] },
    sante: { cogs: 8, total: 82.5, benchNet: [10, 25] },
    agriculture: { cogs: 48, total: 94.1, benchNet: [4, 15] },
    manufacture: { cogs: 52, total: 95.2, benchNet: [4, 10] }
};
for (const [name, sec] of Object.entries(SECTOR_RATIOS)) {
    for (const rev of [120000, 500000, 2000000]) {
        check('6. Secteurs', `${name} @ ${(rev / 1000)}k : marge nette dans la fourchette, fiscalité OK`, (issues) => {
            const netPct = 100 - sec.total;
            if (netPct < sec.benchNet[0] - 0.6 || netPct > sec.benchNet[1] + 0.6) {
                issues.push(`net implicite ${netPct.toFixed(1)} % hors [${sec.benchNet}]`);
            }
            const profit = rev * netPct / 100;
            fiscalInvariants(issues, 'TA', E.scenarioSelfEmployed(profit), profit);
            fiscalInvariants(issues, 'DIV', E.scenarioDividends(profit, 1, OPTS), profit);
            const cogs = rev * sec.cogs / 100;
            const fixed = rev * (sec.total - sec.cogs) / 100;
            const be = E.breakEven(rev, cogs, fixed);
            if (finite(be.breakEvenRevenue) && (be.breakEvenRevenue < 0 || be.breakEvenRevenue > rev * 1.05)) {
                issues.push(`seuil ${Math.round(be.breakEvenRevenue)} > revenus (entreprise pourtant rentable)`);
            }
        });
    }
}

// ============================================================
// GROUPE 7 — Cas limites bruts
// ============================================================
check('7. Limites', 'Profit 100 M$ : pas d\'overflow, taux plausibles', (i) => {
    const d = E.scenarioDividends(100000000, 1, OPTS);
    fiscalInvariants(i, 'DIV', d, 100000000);
    if (d.effRate < 0.35) i.push('taux trop bas pour ce niveau');
});
check('7. Limites', 'Salaire : retrait 100 % d\'un profit de 30 k$ (charges plafonnées)', (i) => {
    const s = E.scenarioSalary(30000, 1, OPTS);
    if (s.salary + s.employerCosts > 30000 + 1) i.push('salaire+charges dépassent le profit');
    fiscalInvariants(i, 'SAL', s, 30000);
});
check('7. Limites', 'TPS/TVQ : seuils 29 999 / 30 001', (i) => {
    if (E.salesTaxInfo(29999).mustRegister) i.push('inscription exigée sous le seuil');
    if (!E.salesTaxInfo(30001).mustRegister) i.push('inscription non exigée au-dessus');
});
check('7. Limites', 'Options par défaut manquantes (opts vides)', (i) => {
    const s = E.scenarioSalary(100000, 1, { qcSbdEligible: true, afterApril2026: true });
    fiscalInvariants(i, 'SAL', s, 100000);
});

// ============================================================
// GROUPE 8 — Nouvelles capacités (autres revenus, multi-proprios,
//            revenus passifs, redevances, ventes exonérées, FSS div.)
// ============================================================
check('8. Nouveautés', 'Autres revenus 80 k$ : impôt TA incrémental > TA seul', (i) => {
    const alone = E.scenarioSelfEmployed(50000, {});
    const withBase = E.scenarioSelfEmployed(50000, { baseIncome: 80000 });
    if (withBase.incomeTax <= alone.incomeTax + 1000) i.push('paliers non empilés');
    fiscalInvariants(i, 'TA+base', withBase, 50000);
});
check('8. Nouveautés', 'Coordination RRQ : salaire 80 k$ déjà cotisé → RRQ TA réduit', (i) => {
    const alone = E.qppSelfEmployed(50000, 0);
    const withBase = E.qppSelfEmployed(50000, 80000);
    // 80 k$ dépasse le MGA : il ne reste que la bande 2 (80k→85k) à 8 %
    if (!near(withBase.total, 5000 * 0.08, 1)) i.push(`RRQ coordonné=${withBase.total.toFixed(0)}`);
    if (withBase.total >= alone.total) i.push('aucune coordination');
});
check('8. Nouveautés', 'Coordination RQAP : plafond partagé', (i) => {
    const q = E.qpipSelfEmployed(50000, 90000);
    if (!near(q.total, 13000 * 0.00764, 0.5)) i.push(`RQAP=${q.total.toFixed(0)}`);
});
check('8. Nouveautés', '2 associés à 200 k$ < impôt d\'un seul à 200 k$', (i) => {
    const solo = E.scenarioSelfEmployed(200000, {});
    const duo = E.scenarioSelfEmployed(200000, { owners: 2 });
    if (duo.totalLevies >= solo.totalLevies) i.push('pas d\'avantage de fractionnement');
    const single100 = E.scenarioSelfEmployed(100000, {});
    if (!near(duo.totalLevies, single100.totalLevies * 2, 5)) i.push('2×100k ≠ duo 200k');
    fiscalInvariants(i, 'DUO', duo, 200000);
});
check('8. Nouveautés', '3 actionnaires, dividendes 400 k$ : invariants + net/proprio', (i) => {
    const d = E.scenarioDividends(400000, 1, Object.assign({}, OPTS, { owners: 3 }));
    fiscalInvariants(i, 'DIV3', d, 400000);
    if (!near(d.netCashPerOwner * 3, d.netCash, 2)) i.push('net/proprio incohérent');
});
check('8. Nouveautés', 'Revenus passifs 60 k$ → plafond DPE 450 k$', (i) => {
    if (!near(E.adjustedBusinessLimit(60000), 450000, 1)) i.push(`limite=${E.adjustedBusinessLimit(60000)}`);
    if (E.adjustedBusinessLimit(150000) !== 0) i.push('plafond non nul à 150 k$ passifs');
    if (E.adjustedBusinessLimit(0) !== 500000) i.push('plafond de base incorrect');
});
check('8. Nouveautés', 'Grind DPE : corpo 500 k$ avec 100 k$ passifs', (i) => {
    const c = E.corporateTax(500000, Object.assign({}, OPTS, { passiveIncome: 100000 }));
    // Plafond réduit à 250 k$ : 250 k à 11,2 % + 250 k à 26,5 %
    if (!near(c.total, 250000 * 0.112 + 250000 * 0.265, 1)) i.push(`corp=${c.total}`);
    if (c.afterTaxGeneral <= 0) i.push('aucun pool déterminé généré');
});
check('8. Nouveautés', 'FSS sur dividendes : présent et ≤ 1 000 $', (i) => {
    const d = E.scenarioDividends(300000, 1, OPTS);
    if (!(d.fss > 0)) i.push('FSS absent des dividendes');
    if (d.fss > 1000 * (d.owners || 1)) i.push('FSS > max');
});
check('8. Nouveautés', 'Vente : FSS inclus dans l\'impôt du gain non exonéré', (i) => {
    const s = E.saleNetProceeds({ price: 2000000, acb: 0, lcgeRemaining: 1250000 });
    const noFss = E.personalTax({ ordinaryIncome: 375000 }).total;
    if (!near(s.tax, noFss + 1000, 2)) i.push(`impôt=${Math.round(s.tax)} vs ${Math.round(noFss)}+FSS`);
});
check('8. Nouveautés', 'TPS/TVQ : clinique 100 % exonérée → pas d\'inscription', (i) => {
    const g = E.salesTaxInfo(400000, 0);
    if (g.mustRegister) i.push('inscription exigée sur ventes exonérées');
    if (g.gstToCollect !== 0) i.push('TPS non nulle');
    const g50 = E.salesTaxInfo(50000, 0.5);
    if (g50.mustRegister) i.push('25 k$ taxables → pas d\'inscription obligatoire');
});
check('8. Nouveautés', 'corporateTax sans opts ne plante plus', (i) => {
    const c = E.corporateTax(100000);
    if (!finite(c.total)) i.push('NaN');
});
check('8. Nouveautés', 'acquisitionAnalysis sans downPct → pas de NaN', (i) => {
    const a = E.acquisitionAnalysis({ price: 500000, rate: 0.07, years: 7, normalizedEbitda: 100000 });
    if (!finite(a.downPayment) || !finite(a.annualDebtService)) i.push('NaN');
});
check('8. Nouveautés', 'breakEven : marge nulle → Infinity (plus de faux point mort)', (i) => {
    const b = E.breakEven(100000, 100000, 50000);
    if (b.breakEvenRevenue !== Infinity) i.push(`seuil=${b.breakEvenRevenue}`);
});
check('8. Nouveautés', 'optimizeMix (liquidé) ≥ f=0 et f=1 liquidés', (i) => {
    for (const p of [100000, 400000]) {
        for (const w of [0.5, 1]) {
            const best = E.optimizeMix(p, w, OPTS);
            const m0 = E.scenarioMix(p, 0, w, OPTS);
            const m1 = E.scenarioMix(p, 1, w, OPTS);
            if (best.totalIfLiquidated < Math.max(m0.totalIfLiquidated, m1.totalIfLiquidated) - 2) {
                i.push(`sous-optimal à ${p}/${w}`);
            }
        }
    }
});
check('8. Nouveautés', 'Mix avec base 90 k$ et 2 proprios : invariants', (i) => {
    const m = E.optimizeMix(300000, 1, Object.assign({}, OPTS, { owners: 2, baseIncome: 90000 }));
    fiscalInvariants(i, 'MIX2B', m, 300000);
});

// ============================================================
// GROUPE 9 — Cas complexes : grosses entreprises, fiscalité lourde
// ============================================================
check('9. Cas complexes', 'Manufacture 3 M$, passifs 300 k$, 2 actionnaires salariés 150 k$ ailleurs', (i) => {
    // Plafond DPE anéanti par les revenus passifs -> tout au taux général -> dividendes DÉTERMINÉS
    if (E.adjustedBusinessLimit(300000) !== 0) i.push('plafond non nul');
    const opts = { qcSbdEligible: true, afterApril2026: true, passiveIncome: 300000,
                   owners: 2, baseIncome: 150000, fssEmployerRate: 0.0426, otherPayrollPct: 0.03 };
    const d = E.scenarioDividends(3000000, 0.4, opts);
    fiscalInvariants(i, 'MFG', d, 3000000);
    if (d.nonEligDiv > 1) i.push('dividende non déterminé alors que plafond = 0');
    if (!(d.eligDiv > 0)) i.push('aucun dividende déterminé');
    const c = E.corporateTax(3000000, opts);
    if (!near(c.effRate, 0.265, 0.001)) i.push('taux corpo ' + (c.effRate * 100).toFixed(2) + ' % ≠ 26,5 %');
});
check('9. Cas complexes', 'Médecin incorporé 400 k$, sans DPE QC, salaire hospitalier 120 k$', (i) => {
    const opts = { qcSbdEligible: false, afterApril2026: true, baseIncome: 120000 };
    const d = E.scenarioDividends(400000, 1, opts);
    fiscalInvariants(i, 'MD', d, 400000);
    if (d.eligDiv > 1) i.push('dividende déterminé inattendu (DPE fédérale s\'applique encore ≤ 500 k$)');
    // L'empilement sur 120 k$ de salaire doit coûter plus cher que sans autre revenu
    const dSolo = E.scenarioDividends(400000, 1, { qcSbdEligible: false, afterApril2026: true });
    if (d.incomeTax <= dSolo.incomeTax) i.push('empilement sur le salaire hospitalier sans effet');
});
check('9. Cas complexes', 'Franchise : point mort numériquement exact avec redevances 8 %', (i) => {
    const rev = 2000000, cogs = 700000, royaltyRate = 0.08, fixed = 900000;
    const royalties = rev * royaltyRate;
    const be = E.breakEven(rev, cogs + royalties, fixed);
    // Au point mort, le profit recalculé (variables proportionnelles) doit être ~0
    const varRate = (cogs + royalties) / rev;
    const profitAtBE = be.breakEvenRevenue - be.breakEvenRevenue * varRate - fixed;
    if (Math.abs(profitAtBE) > 1) i.push('profit au point mort = ' + profitAtBE.toFixed(2));
});
check('9. Cas complexes', 'Société de personnes de 4 associés, 950 k$ : RRQ plafonné chacun', (i) => {
    const se = E.scenarioSelfEmployed(950000, { owners: 4 });
    fiscalInvariants(i, 'SP4', se, 950000);
    const maxQpp = (74600 - 3500) * 0.126 + (85000 - 74600) * 0.08; // 9 790,60 $
    if (!near(se.qpp, maxQpp * 4, 2)) i.push('RRQ total = ' + Math.round(se.qpp) + ' ≠ 4 × max');
});
check('9. Cas complexes', 'Salaire de 300 k$ au proprio : cotisations employé plafonnées', (i) => {
    const sal = E.scenarioSalary(400000, 0.75, { qcSbdEligible: true, afterApril2026: true });
    const maxQppEmp = (74600 - 3500) * 0.063 + (85000 - 74600) * 0.04; // 4 895,30 $
    if (!near(sal.qpp, maxQppEmp, 2)) i.push('RRQ employé = ' + Math.round(sal.qpp));
    if (!near(sal.qpip, 103000 * 0.0043, 1)) i.push('RQAP employé non plafonné');
    fiscalInvariants(i, 'SAL300', sal, 400000);
});
check('9. Cas complexes', 'Holding : opco 600 k$, passifs 80 k$ → plafond 350 k$, pools exacts', (i) => {
    const opts = { qcSbdEligible: true, afterApril2026: true, passiveIncome: 80000 };
    const c = E.corporateTax(600000, opts);
    if (c.businessLimit !== 350000) i.push('plafond = ' + c.businessLimit);
    if (!near(c.fed, 350000 * 0.09 + 250000 * 0.15, 1)) i.push('fédéral incorrect');
    if (!near(c.afterTaxSbd, 350000 * (1 - 0.112), 1)) i.push('pool non déterminé incorrect');
    if (!near(c.afterTaxGeneral, 250000 * (1 - 0.265), 1)) i.push('pool déterminé incorrect');
});
check('9. Cas complexes', 'Très gros TA seul à 5 M$ : taux effectif 50-54 %', (i) => {
    const se = E.scenarioSelfEmployed(5000000, {});
    fiscalInvariants(i, 'TA5M', se, 5000000);
    if (se.effRate < 0.50 || se.effRate > 0.54) i.push('taux ' + (se.effRate * 100).toFixed(1) + ' %');
});
check('9. Cas complexes', '50 M$, 5 actionnaires, retrait 10 %, base 200 k$ chacun', (i) => {
    const opts = { qcSbdEligible: false, afterApril2026: true, owners: 5, baseIncome: 200000 };
    const d = E.scenarioDividends(50000000, 0.1, opts);
    fiscalInvariants(i, 'BIG', d, 50000000);
    if (!near(d.dividendPaid, 5000000, 2)) i.push('versement = ' + Math.round(d.dividendPaid));
    if (d.retainedInCorp < 30000000) i.push('rétention incohérente');
    // Chaque actionnaire empile ~1 M$ de dividendes sur 200 k$ de salaire : marginal haut
    if (d.incomeTax / d.dividendPaid < 0.35) i.push('impôt perso trop bas sur gros dividendes empilés');
});
check('9. Cas complexes', 'Mix optimal : grind 100 k$ + base 90 k$ + 2 proprios + retrait 60 %', (i) => {
    const opts = { qcSbdEligible: true, afterApril2026: true, passiveIncome: 100000,
                   owners: 2, baseIncome: 90000, fssEmployerRate: 0.0165, otherPayrollPct: 0.02 };
    const best = E.optimizeMix(800000, 0.6, opts);
    fiscalInvariants(i, 'MIXG', best, 800000);
    const m0 = E.scenarioMix(800000, 0, 0.6, opts);
    const m1 = E.scenarioMix(800000, 1, 0.6, opts);
    if (best.totalIfLiquidated < Math.max(m0.totalIfLiquidated, m1.totalIfLiquidated) - 2) i.push('sous-optimal');
});
check('9. Cas complexes', 'Impôt corporatif monotone avec grind (0 → 10 M$)', (i) => {
    let prev = -1;
    for (let pr = 0; pr <= 10000000; pr += 250000) {
        const c = E.corporateTax(pr, { qcSbdEligible: true, afterApril2026: true, passiveIncome: 100000 });
        if (c.total < prev - 0.01) { i.push('baisse à ' + pr); break; }
        prev = c.total;
    }
});
check('9. Cas complexes', 'Vente 8 M$ avec ECGC épuisée à moitié + gros PBR', (i) => {
    const sale = E.saleNetProceeds({ price: 8000000, acb: 1500000, lcgeRemaining: 625000 });
    if (!near(sale.gain, 6500000, 1)) i.push('gain incorrect');
    if (!near(sale.exempt, 625000, 1)) i.push('exonération incorrecte');
    if (!near(sale.taxableGain, (6500000 - 625000) * 0.5, 1)) i.push('gain imposable incorrect');
    if (sale.net < sale.gain * 0.6) i.push('net incohérent');
});
check('9. Cas complexes', 'Agri 12 M$ revenus, 92 % de charges, 3 associés, FSS primaire', (i) => {
    const profit = 12000000 * 0.08;
    const opts = { qcSbdEligible: true, afterApril2026: true, owners: 3, fssEmployerRate: 0.0125, otherPayrollPct: 0.02 };
    const se = E.scenarioSelfEmployed(profit, { owners: 3 });
    const sal = E.scenarioSalary(profit, 0.5, opts);
    const mix = E.optimizeMix(profit, 0.5, opts);
    fiscalInvariants(i, 'AGRI-TA', se, profit);
    fiscalInvariants(i, 'AGRI-SAL', sal, profit);
    fiscalInvariants(i, 'AGRI-MIX', mix, profit);
});

// ============================================================
// RAPPORT
// ============================================================
const groups = {};
for (const r of results) {
    groups[r.group] = groups[r.group] || { pass: 0, fail: 0, fails: [] };
    if (r.pass) groups[r.group].pass++;
    else { groups[r.group].fail++; groups[r.group].fails.push(r); }
}
console.log('SCÉNARIOS TESTÉS :', results.length);
console.log('RÉUSSIS :', results.filter(r => r.pass).length, '| ÉCHECS :', results.filter(r => !r.pass).length);
console.log('');
for (const [g, v] of Object.entries(groups)) {
    console.log(`${g} — ${v.pass}/${v.pass + v.fail}`);
    for (const f of v.fails) {
        console.log(`   ✗ [#${f.id}] ${f.name}`);
        f.issues.slice(0, 3).forEach(x => console.log(`       → ${x}`));
    }
}
require('fs').writeFileSync(__dirname + '/harness-results.json', JSON.stringify(results, null, 1));
