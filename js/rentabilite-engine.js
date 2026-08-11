/**
 * ================================================================
 *  JC CAPITAL — MOTEUR DE RENTABILITÉ & FISCALITÉ D'ENTREPRISE
 *  Année d'imposition 2026 — Canada (fédéral) + Québec
 * ================================================================
 *  Fonctions PURES (aucun DOM). Exposées via window.JCProfitEngine
 *  pour servir d'API locale : la page rentabilite.html les consomme,
 *  et elles pourront être déplacées telles quelles vers un backend
 *  (Cloudflare Worker / Node) si une vraie API est ajoutée plus tard.
 *
 *  Options communes des scénarios (opts) :
 *   - qcSbdEligible   : DPE Québec (critère 5 500 heures rémunérées)
 *   - afterApril2026  : année d'imposition débutant après le 29 avril 2026
 *   - fssEmployerRate : taux FSS employeur (0.0125 / 0.0165 / 0.0426)
 *   - otherPayrollPct : autres charges patronales (CNESST, normes…)
 *   - owners          : nb de propriétaires actifs se partageant le bénéfice
 *                       (parts égales, même situation personnelle chacun)
 *   - baseIncome      : autres revenus personnels de CHAQUE propriétaire
 *                       (salaire d'emploi T4 — coordonne RRQ/RQAP et tranches)
 *   - passiveIncome   : revenus de placement passifs de la société (année préc.)
 *                       → réduction du plafond DPE (5 $ par 1 $ > 50 000 $)
 *
 *  Sources des paramètres 2026 :
 *   - ARC : tranches fédérales 2026 (indexation 2,0 %), taux minimal 14 %
 *   - MFQ : paramètres du régime d'imposition 2026 (indexation 2,05 %)
 *   - Retraite Québec / Revenu Québec : RRQ 2026 (MGA 74 600 $, MSGA 85 000 $)
 *   - RQAP 2026 : revenu maximal assurable 103 000 $, TA 0,764 %
 *   - Revenu Québec : DPE 3,2 % → 2,2 % (années d'imposition débutant
 *     après le 29 avril 2026)
 * ================================================================
 */

(function (root) {
    'use strict';

    // ---------------------------------------------------------------
    // PARAMÈTRES FISCAUX 2026 (tous centralisés ici pour mise à jour)
    // ---------------------------------------------------------------
    const TAX2026 = {
        // Métadonnées de version — mises à jour à chaque révision des paramètres
        meta: { paramsYear: 2026, verifiedOn: '2026-07-16' },
        federal: {
            brackets: [
                { upTo: 58523, rate: 0.14 },
                { upTo: 117045, rate: 0.205 },
                { upTo: 181440, rate: 0.26 },
                { upTo: 258482, rate: 0.29 },
                { upTo: Infinity, rate: 0.33 }
            ],
            creditRate: 0.14,          // taux du crédit non remboursable = taux minimal
            bpaMax: 16452,             // montant personnel de base (bonifié)
            bpaMin: 14829,             // MPB réduit (revenus > 4e palier)
            bpaPhaseStart: 181440,
            bpaPhaseEnd: 258482,
            abatementQc: 0.165,        // abattement du Québec sur l'impôt fédéral de base
            canadaEmploymentAmount: 1500 // montant canadien pour emploi 2026 (salariés)
        },
        quebec: {
            brackets: [
                { upTo: 54345, rate: 0.14 },
                { upTo: 108680, rate: 0.19 },
                { upTo: 132245, rate: 0.24 },
                { upTo: Infinity, rate: 0.2575 }
            ],
            creditRate: 0.14,
            bpa: 18952
        },
        // Régime de rentes du Québec 2026 (taux réduits annoncés nov. 2025)
        qpp: {
            ympe: 74600,               // maximum des gains admissibles (MGA)
            yampe: 85000,              // maximum supplémentaire (MSGA)
            exemption: 3500,
            baseRate: 0.106,           // taux de base combiné (2 parts)
            addl1Rate: 0.02,           // 1re cotisation supplémentaire (2 parts)
            selfRate1: 0.126,          // TA : base + 1re suppl. (jusqu'au MGA)
            selfRate2: 0.08,           // TA : 2e suppl. (MGA → MSGA)
            employeeRate1: 0.063,      // part employé (jusqu'au MGA)
            employeeRate2: 0.04,       // part employé (MGA → MSGA)
            employerRate1: 0.063,
            employerRate2: 0.04
        },
        // Régime québécois d'assurance parentale 2026 (taux réduits de 13 %)
        qpip: {
            maxInsurable: 103000,
            selfRate: 0.00764,
            employeeRate: 0.0043,
            employerRate: 0.00602
        },
        // FSS particulier (annexe F) — seuils 2026 estimés (indexation ~2,05 %)
        // S'applique au revenu autre que d'emploi : entreprise (TA), dividendes
        // imposables (majorés), gains en capital imposables.
        fssIndividual: {
            threshold1: 18500,
            max1: 150,
            threshold2: 64350,
            maxTotal: 1000,
            rate: 0.01
        },
        // FSS employeur (taux réduits : PME, masse salariale ≤ 1 M$;
        // le taux grimpe progressivement jusqu'à 4,26 % au-delà)
        fssEmployer: {
            serviceRate: 0.0165,       // secteurs des services et de la construction
            primaryRate: 0.0125,       // secteurs primaire et manufacturier
            largeRate: 0.0426          // grandes entreprises et secteur public
        },
        corporate: {
            fedSmallRate: 0.09,        // fédéral, DPE (≤ plafond des affaires)
            fedGeneralRate: 0.15,      // fédéral, taux général (net de l'abattement)
            qcSmallRateBefore: 0.032,  // Québec, DPE — année débutant avant le 30 avril 2026
            qcSmallRateAfter: 0.022,   // Québec, DPE — année débutant après le 29 avril 2026
            qcGeneralRate: 0.115,
            businessLimit: 500000,
            passiveGrindThreshold: 50000, // revenus passifs : réduction 5:1 au-delà
            minPaidHoursForQcSbd: 5500 // critère d'heures rémunérées pour la DPE Québec
        },
        dividends: {
            nonEligible: { grossUp: 0.15, fedDtc: 0.090301, qcDtc: 0.0342 },
            eligible: { grossUp: 0.38, fedDtc: 0.150198, qcDtc: 0.117 }
        },
        salesTax: { gst: 0.05, qst: 0.09975, registrationThreshold: 30000 },
        rrsp: { rate: 0.18, dollarLimit: 33810 }, // plafond REER 2026
        lcge: 1250000, // ECGC — actions admissibles de petite entreprise (~2026)
        capitalGainsInclusion: 0.5,
        // Assurance-emploi 2026 (taux Québec réduit par le RQAP) — employés
        // réguliers seulement : un actionnaire à ≥ 40 % des votes est exempté
        ei: { maxInsurable: 68500, employeeRate: 0.0131, employerFactor: 1.4 },
        // Déduction pour travailleurs (Québec) : 6 % du revenu de travail
        workerDeductionQc: { rate: 0.06, max: 1450 },
        // Régime public d'assurance médicaments (RAMQ) — prime max estimée,
        // payable si AUCUNE assurance médicaments privée
        ramq: { maxPremium: 737 },
        // Impôt minimum de remplacement (règles 2024+) — estimation :
        // exonération fédérale = début du 4e palier; Québec ~harmonisé
        amt: { fedRate: 0.205, fedExemption: 181440, qcRate: 0.19, qcExemption: 182000, lcgeInclusion: 0.3 },
        // Rente RRQ — valeur d'une année de cotisation (approximation)
        qppPension: { maxAnnual: 17200, careerYears: 40, pvFactor: 15 },
        // Revenus de placement DANS une société (SPCC) — taux 2026
        passiveCorp: {
            interestRate: 0.5017,      // intérêts / revenu étranger (38,67 % féd + 11,5 % QC)
            interestRefundable: 0.3067, // portion remboursable (IMRTD) via dividendes versés
            part4Rate: 0.3833,         // impôt de la partie IV sur dividendes de portefeuille (100 % remboursable)
            rdtohRefundRate: 0.3833    // remboursement : 38,33 $ par 100 $ de dividende imposable versé
        }
    };

    // ---------------------------------------------------------------
    // OUTILS
    // ---------------------------------------------------------------
    function clamp0(x) { return x > 0 ? x : 0; }
    function num(x, dflt) { return (typeof x === 'number' && isFinite(x)) ? x : (dflt || 0); }

    /** Impôt progressif sur des tranches { upTo, rate } */
    function bracketTax(income, brackets) {
        let tax = 0, lower = 0;
        for (const b of brackets) {
            if (income <= lower) break;
            const slice = Math.min(income, b.upTo) - lower;
            tax += slice * b.rate;
            lower = b.upTo;
        }
        return clamp0(tax);
    }

    /** MPB fédéral bonifié avec réduction entre le 4e et le 5e palier */
    function federalBPA(taxableIncome) {
        const f = TAX2026.federal;
        if (taxableIncome <= f.bpaPhaseStart) return f.bpaMax;
        if (taxableIncome >= f.bpaPhaseEnd) return f.bpaMin;
        const ratio = (taxableIncome - f.bpaPhaseStart) / (f.bpaPhaseEnd - f.bpaPhaseStart);
        return f.bpaMax - ratio * (f.bpaMax - f.bpaMin);
    }

    /**
     * Parts des propriétaires : opts.shares = [0.6, 0.4] (fractions) a priorité;
     * sinon parts égales selon opts.owners. Retourne un tableau de fractions.
     */
    function normalizeShares(opts) {
        opts = opts || {};
        if (Array.isArray(opts.shares) && opts.shares.length) {
            const clean = opts.shares.map(function (x) { return clamp0(num(x)); });
            const sum = clean.reduce(function (a, b) { return a + b; }, 0);
            // Proportions invariantes d'échelle : accepte fractions (0,6/0,4),
            // pourcentages (60/40) ou n'importe quels poids positifs
            if (sum > 0 && clean.every(function (x) { return x >= 0; })) {
                return clean.map(function (x) { return x / sum; });
            }
        }
        const N = Math.max(1, Math.round(num(opts.owners, 1)));
        const eq = [];
        for (let k = 0; k < N; k++) eq.push(1 / N);
        return eq;
    }

    // ---------------------------------------------------------------
    // IMPÔT DES PARTICULIERS (fédéral + Québec, résident du Québec)
    // ---------------------------------------------------------------
    /**
     * @param {Object} p
     * @param {number} p.ordinaryIncome   revenu ordinaire imposable (salaire ou entreprise, après déductions)
     * @param {number} p.nonEligDividend  dividende non déterminé REÇU (avant majoration)
     * @param {number} p.eligDividend     dividende déterminé REÇU (avant majoration)
     * @param {number} p.extraCreditBase  base de crédits additionnels (ex. cotisations RRQ part « crédit »)
     * @param {number} p.qcWorkIncome     revenu de travail admissible (emploi + entreprise)
     *                                    → déduction pour travailleurs au Québec (6 %, max)
     * @param {boolean} p.isEmployee      ajoute le montant canadien pour emploi (fédéral)
     * @returns {{fed:number, qc:number, total:number, taxable:number}}
     */
    function personalTax(p) {
        const f = TAX2026.federal, q = TAX2026.quebec, d = TAX2026.dividends;
        const ordinary = clamp0(p.ordinaryIncome || 0);
        const nonElig = clamp0(p.nonEligDividend || 0);
        const elig = clamp0(p.eligDividend || 0);
        const extraCreditBase = clamp0(p.extraCreditBase || 0);

        const grossedNonElig = nonElig * (1 + d.nonEligible.grossUp);
        const grossedElig = elig * (1 + d.eligible.grossUp);
        const taxable = ordinary + grossedNonElig + grossedElig;

        // --- Fédéral ---
        let fed = bracketTax(taxable, f.brackets);
        let fedCredits = federalBPA(taxable) * f.creditRate + extraCreditBase * f.creditRate;
        if (p.isEmployee) fedCredits += f.canadaEmploymentAmount * f.creditRate;
        fed = clamp0(fed - fedCredits);
        const fedDtc = grossedNonElig * d.nonEligible.fedDtc + grossedElig * d.eligible.fedDtc;
        fed = clamp0(fed - fedDtc);
        fed *= (1 - f.abatementQc); // abattement du Québec 16,5 %

        // --- Québec --- (déduction pour travailleurs : 6 % du revenu de travail, plafonnée)
        const wd = TAX2026.workerDeductionQc;
        const workerDeduction = Math.min(clamp0(p.qcWorkIncome || 0) * wd.rate, wd.max);
        let qc = bracketTax(clamp0(taxable - workerDeduction), q.brackets);
        let qcCredits = q.bpa * q.creditRate + extraCreditBase * q.creditRate;
        qc = clamp0(qc - qcCredits);
        const qcDtc = grossedNonElig * d.nonEligible.qcDtc + grossedElig * d.eligible.qcDtc;
        qc = clamp0(qc - qcDtc);

        return { fed: fed, qc: qc, total: fed + qc, taxable: taxable };
    }

    /**
     * Impôt de référence sur les « autres revenus personnels » seuls
     * (salaire d'emploi T4). Sert au calcul INCRÉMENTAL des scénarios :
     * l'impôt attribuable à l'entreprise = impôt(total) − impôt(base).
     */
    function baseTaxProfile(baseIncome) {
        const base = clamp0(baseIncome || 0);
        if (base === 0) {
            return { tax: { fed: 0, qc: 0, total: 0 }, ordinaryNet: 0, creditBase: 0, workIncome: 0, isEmployee: false };
        }
        const qppB = qppEmployee(base);
        const qpipB = qpipEmployee(base);
        const creditBase = qppB.creditBase + qpipB.creditBase;
        const ordinaryNet = clamp0(base - qppB.deductible);
        const tax = personalTax({ ordinaryIncome: ordinaryNet, extraCreditBase: creditBase, qcWorkIncome: base, isEmployee: true });
        return { tax: tax, ordinaryNet: ordinaryNet, creditBase: creditBase, workIncome: base, isEmployee: true };
    }

    // ---------------------------------------------------------------
    // COTISATIONS SOCIALES
    // ---------------------------------------------------------------
    /**
     * RRQ du travailleur autonome, coordonné avec un salaire d'emploi déjà
     * cotisé (baseSalary) : l'assiette TA occupe l'espace restant sous les
     * plafonds. Retourne aussi les portions déductible / crédit.
     */
    function qppSelfEmployed(netBusinessIncome, baseSalary) {
        const c = TAX2026.qpp;
        const base = clamp0(baseSalary || 0);
        const total = base + clamp0(netBusinessIncome);
        const band1Base = clamp0(Math.min(base, c.ympe) - c.exemption);
        const band1All = clamp0(Math.min(total, c.ympe) - c.exemption);
        const band2Base = clamp0(Math.min(base, c.yampe) - c.ympe);
        const band2All = clamp0(Math.min(total, c.yampe) - c.ympe);
        const pensionable = clamp0(band1All - band1Base);
        const band2 = clamp0(band2All - band2Base);
        const part1 = pensionable * c.selfRate1;   // base + 1re suppl.
        const part2 = band2 * c.selfRate2;         // 2e suppl.
        // Déduction : moitié « employeur » de la base (5,3/12,6) + 1re suppl. (2/12,6) + 2e suppl. au complet
        const deductible = part1 * ((c.baseRate / 2 + c.addl1Rate) / c.selfRate1) + part2;
        // Crédit : moitié « employé » de la base (5,3/12,6)
        const creditBase = part1 * ((c.baseRate / 2) / c.selfRate1);
        return { total: part1 + part2, deductible: deductible, creditBase: creditBase };
    }

    /**
     * RRQ part employé (salarié), coordonné avec un autre salaire déjà
     * cotisé (baseSalary) — l'excédent est remboursé à la déclaration,
     * on calcule donc le coût annuel réel.
     */
    function qppEmployee(salary, baseSalary) {
        const c = TAX2026.qpp;
        const base = clamp0(baseSalary || 0);
        const total = base + clamp0(salary);
        const band1Base = clamp0(Math.min(base, c.ympe) - c.exemption);
        const band1All = clamp0(Math.min(total, c.ympe) - c.exemption);
        const band2Base = clamp0(Math.min(base, c.yampe) - c.ympe);
        const band2All = clamp0(Math.min(total, c.yampe) - c.ympe);
        const pensionable = clamp0(band1All - band1Base);
        const band2 = clamp0(band2All - band2Base);
        const part1 = pensionable * c.employeeRate1;
        const part2 = band2 * c.employeeRate2;
        // 1re suppl. (1 %/6,3 %) et 2e suppl. : déduction; base (5,3 %) : crédit
        const deductible = part1 * (0.01 / c.employeeRate1) + part2;
        const creditBase = part1 * ((c.baseRate / 2) / c.employeeRate1);
        return { total: part1 + part2, deductible: deductible, creditBase: creditBase };
    }

    /**
     * RRQ part employeur (coût pour la société). PAS de coordination avec
     * les autres employeurs du salarié : l'employeur n'est jamais remboursé.
     */
    function qppEmployer(salary) {
        const c = TAX2026.qpp;
        const pensionable = clamp0(Math.min(salary, c.ympe) - c.exemption);
        const band2 = clamp0(Math.min(salary, c.yampe) - c.ympe);
        return pensionable * c.employerRate1 + band2 * c.employerRate2;
    }

    /** RQAP travailleur autonome, coordonné avec un salaire d'emploi */
    function qpipSelfEmployed(netBusinessIncome, baseSalary) {
        const c = TAX2026.qpip;
        const base = Math.min(clamp0(baseSalary || 0), c.maxInsurable);
        const insurable = clamp0(Math.min(base + clamp0(netBusinessIncome), c.maxInsurable) - base);
        const total = insurable * c.selfRate;
        // Portion équivalente « employé » : crédit; excédent : déduction
        const creditBase = insurable * c.employeeRate;
        return { total: total, deductible: total - creditBase, creditBase: creditBase };
    }

    function qpipEmployee(salary, baseSalary) {
        const c = TAX2026.qpip;
        const base = Math.min(clamp0(baseSalary || 0), c.maxInsurable);
        const insurable = clamp0(Math.min(base + clamp0(salary), c.maxInsurable) - base);
        const total = insurable * c.employeeRate;
        return { total: total, deductible: 0, creditBase: total };
    }

    function qpipEmployer(salary) {
        const c = TAX2026.qpip;
        return Math.min(clamp0(salary), c.maxInsurable) * c.employerRate;
    }

    /**
     * FSS du particulier (annexe F) — s'applique au revenu autre que
     * d'emploi : revenu d'entreprise du TA, dividendes imposables
     * (montant MAJORÉ), gains en capital imposables.
     */
    function fssIndividual(income) {
        const c = TAX2026.fssIndividual;
        if (income <= c.threshold1) return 0;
        const tier1 = Math.min((income - c.threshold1) * c.rate, c.max1);
        if (income <= c.threshold2) return tier1;
        return Math.min(c.max1 + (income - c.threshold2) * c.rate, c.maxTotal);
    }

    // ---------------------------------------------------------------
    // IMPÔT DES SOCIÉTÉS (SPCC — revenu d'entreprise exploitée activement)
    // ---------------------------------------------------------------
    /** Plafond des affaires réduit par les revenus de placement passifs (5:1 > 50 k$) */
    function adjustedBusinessLimit(passiveIncome) {
        const c = TAX2026.corporate;
        const reduction = 5 * clamp0(num(passiveIncome) - c.passiveGrindThreshold);
        return clamp0(c.businessLimit - reduction);
    }

    /**
     * @param {number} profit  bénéfice imposable de la société
     * @param {Object} opts { qcSbdEligible, afterApril2026, passiveIncome, businessLimit }
     * @returns {{fed, qc, total, afterTax, sbdPortion, generalPortion, afterTaxSbd, afterTaxGeneral, effRate, businessLimit}}
     */
    function corporateTax(profit, opts) {
        opts = opts || {};
        const c = TAX2026.corporate;
        profit = clamp0(profit);
        const limit = (opts.businessLimit != null)
            ? clamp0(opts.businessLimit)
            : adjustedBusinessLimit(opts.passiveIncome);
        const sbdPortion = Math.min(profit, limit);
        const generalPortion = clamp0(profit - limit);

        const qcSmallRate = opts.afterApril2026 ? c.qcSmallRateAfter : c.qcSmallRateBefore;
        // DPE Québec : exige ≥ 5 500 heures rémunérées (sinon taux général au QC même sous le plafond)
        const qcRateOnSbd = opts.qcSbdEligible ? qcSmallRate : c.qcGeneralRate;

        const fed = sbdPortion * c.fedSmallRate + generalPortion * c.fedGeneralRate;
        const qc = sbdPortion * qcRateOnSbd + generalPortion * c.qcGeneralRate;
        const total = fed + qc;

        // Le revenu imposé au taux DPE fédéral génère des dividendes NON déterminés;
        // le revenu imposé au taux général fédéral génère des dividendes déterminés (CRTG).
        const afterTaxSbd = sbdPortion - sbdPortion * (c.fedSmallRate + qcRateOnSbd);
        const afterTaxGeneral = generalPortion - generalPortion * (c.fedGeneralRate + c.qcGeneralRate);

        return {
            fed: fed, qc: qc, total: total,
            afterTax: profit - total,
            sbdPortion: sbdPortion, generalPortion: generalPortion,
            afterTaxSbd: afterTaxSbd, afterTaxGeneral: afterTaxGeneral,
            effRate: profit > 0 ? total / profit : 0,
            businessLimit: limit
        };
    }

    // ---------------------------------------------------------------
    // SCÉNARIO 1 — TRAVAILLEUR AUTONOME / SOCIÉTÉ DE PERSONNES
    // ---------------------------------------------------------------
    /**
     * @param {number} profit  bénéfice avant impôts (total, tous propriétaires)
     * @param {Object} opts { owners, baseIncome }
     * Les montants retournés sont des TOTAUX pour l'ensemble des propriétaires.
     */
    function scenarioSelfEmployed(profit, opts) {
        opts = opts || {};
        profit = clamp0(profit);
        const shares = normalizeShares(opts);
        const N = shares.length;
        const base = clamp0(num(opts.baseIncome));
        const ramq = opts.noPrivateInsurance ? TAX2026.ramq.maxPremium : 0;
        const baseP = baseTaxProfile(base);

        let sumTax = 0, sumQpp = 0, sumQpip = 0, sumFss = 0, sumRamq = 0;
        const perOwner = [];
        shares.forEach(function (fr) {
            const share = profit * fr;
            const qpp = qppSelfEmployed(share, base);
            const qpip = qpipSelfEmployed(share, base);
            const fss = fssIndividual(share);
            const extraOrdinary = clamp0(share - qpp.deductible - qpip.deductible);
            const full = personalTax({
                ordinaryIncome: baseP.ordinaryNet + extraOrdinary,
                extraCreditBase: baseP.creditBase + qpp.creditBase + qpip.creditBase,
                qcWorkIncome: base + share,
                isEmployee: baseP.isEmployee
            });
            const incomeTax = clamp0(full.total - baseP.tax.total);
            const levies = incomeTax + qpp.total + qpip.total + fss + ramq;
            sumTax += incomeTax; sumQpp += qpp.total; sumQpip += qpip.total; sumFss += fss; sumRamq += ramq;
            perOwner.push({ share: fr, gross: share, net: share - levies });
        });

        const totalLevies = sumTax + sumQpp + sumQpip + sumFss + sumRamq;
        return {
            profit: profit,
            owners: N,
            incomeTax: sumTax,
            qpp: sumQpp, qpip: sumQpip, fss: sumFss, ramq: sumRamq,
            totalLevies: totalLevies,
            netCash: profit - totalLevies,
            netCashPerOwner: perOwner.length ? perOwner[0].net : 0,
            perOwner: perOwner,
            retainedInCorp: 0,
            totalAfterTax: profit - totalLevies,
            effRate: profit > 0 ? totalLevies / profit : 0
        };
    }

    // ---------------------------------------------------------------
    // COÛT TOTAL D'UN EMPLOYÉ (pour l'employeur, Québec 2026)
    // ---------------------------------------------------------------
    /**
     * @param {boolean} includeEI  AE : vrai pour un employé régulier;
     *                             faux pour un actionnaire à ≥ 40 % des votes (exempté)
     */
    function employerCostOfSalary(salary, fssRate, otherPct, includeEI) {
        salary = clamp0(salary);
        const qpp = qppEmployer(salary);
        const qpip = qpipEmployer(salary);
        const fss = salary * (num(fssRate) || TAX2026.fssEmployer.serviceRate);
        const e = TAX2026.ei;
        const ei = includeEI ? Math.min(salary, e.maxInsurable) * e.employeeRate * e.employerFactor : 0;
        const other = salary * num(otherPct);
        const total = qpp + qpip + fss + ei + other;
        return {
            qpp: qpp, qpip: qpip, fss: fss, ei: ei, other: other,
            total: total,
            totalCost: salary + total,
            coefficient: salary > 0 ? (salary + total) / salary : 1
        };
    }

    // ---------------------------------------------------------------
    // SCÉNARIO 2 — SOCIÉTÉ : RÉMUNÉRATION EN SALAIRE
    // ---------------------------------------------------------------
    /**
     * @param {number} profit         bénéfice avant impôts et avant salaires des proprios
     * @param {number} withdrawalPct  fraction (0–1) du bénéfice convertie en salaires bruts
     * @param {Object} opts { qcSbdEligible, afterApril2026, fssEmployerRate, otherPayrollPct, owners, baseIncome, passiveIncome }
     * Montants retournés : TOTAUX pour l'ensemble des propriétaires.
     */
    function scenarioSalary(profit, withdrawalPct, opts) {
        opts = opts || {};
        profit = clamp0(profit);
        const shares = normalizeShares(opts);
        const N = shares.length;
        const base = clamp0(num(opts.baseIncome));
        const ramq = opts.noPrivateInsurance ? TAX2026.ramq.maxPremium : 0;
        const fssRate = (opts.fssEmployerRate != null) ? opts.fssEmployerRate : TAX2026.fssEmployer.serviceRate;
        const otherPct = num(opts.otherPayrollPct);

        // Salaires totaux visés = % du bénéfice, répartis selon les parts;
        // plafonné : salaires + charges patronales ≤ bénéfice
        const employerForAll = function (totalSalary) {
            let sum = 0;
            shares.forEach(function (fr) {
                const sPer = totalSalary * fr;
                sum += qppEmployer(sPer) + qpipEmployer(sPer) + sPer * (fssRate + otherPct);
            });
            return sum;
        };
        let salaryTotal = profit * withdrawalPct;
        let employerTotal = employerForAll(salaryTotal);
        if (salaryTotal + employerTotal > profit && salaryTotal > 0) {
            for (let i = 0; i < 25; i++) {
                salaryTotal = clamp0(profit - employerTotal);
                employerTotal = employerForAll(salaryTotal);
            }
        }

        const corpTaxable = clamp0(profit - salaryTotal - employerTotal);
        const corp = corporateTax(corpTaxable, opts);
        const baseP = baseTaxProfile(base);

        let sumTax = 0, sumQpp = 0, sumQpip = 0, sumRamq = 0, sumNet = 0;
        const perOwner = [];
        shares.forEach(function (fr) {
            const sPer = salaryTotal * fr;
            const qppEmp = qppEmployee(sPer, base);
            const qpipEmp = qpipEmployee(sPer, base);
            const full = personalTax({
                ordinaryIncome: baseP.ordinaryNet + clamp0(sPer - qppEmp.deductible),
                extraCreditBase: baseP.creditBase + qppEmp.creditBase + qpipEmp.creditBase,
                qcWorkIncome: base + sPer,
                isEmployee: baseP.isEmployee || sPer > 0
            });
            const incomeTax = clamp0(full.total - baseP.tax.total);
            const net = sPer - incomeTax - qppEmp.total - qpipEmp.total - ramq;
            sumTax += incomeTax; sumQpp += qppEmp.total; sumQpip += qpipEmp.total; sumRamq += ramq; sumNet += net;
            perOwner.push({ share: fr, gross: sPer, net: net });
        });

        const totalLevies = corp.total + sumTax + sumQpp + sumQpip + sumRamq + employerTotal;
        return {
            profit: profit,
            owners: N,
            salary: salaryTotal,
            employerCosts: employerTotal,
            corpTax: corp.total,
            incomeTax: sumTax,
            qpp: sumQpp, qpip: sumQpip, ramq: sumRamq,
            netCash: sumNet,
            netCashPerOwner: perOwner.length ? perOwner[0].net : 0,
            perOwner: perOwner,
            retainedInCorp: corp.afterTax,
            totalAfterTax: sumNet + corp.afterTax,
            totalLevies: totalLevies,
            effRate: profit > 0 ? totalLevies / profit : 0
        };
    }

    // ---------------------------------------------------------------
    // SCÉNARIO 3 — SOCIÉTÉ : RÉMUNÉRATION EN DIVIDENDES
    // ---------------------------------------------------------------
    /**
     * @param {number} profit         bénéfice imposable de la société
     * @param {number} withdrawalPct  fraction (0–1) du bénéfice visée en retrait
     *                                (les dividendes sont plafonnés au surplus après impôt)
     * @param {Object} opts { qcSbdEligible, afterApril2026, owners, baseIncome, passiveIncome }
     */
    function scenarioDividends(profit, withdrawalPct, opts) {
        opts = opts || {};
        profit = clamp0(profit);
        const shares = normalizeShares(opts);
        const N = shares.length;
        const base = clamp0(num(opts.baseIncome));
        const ramq = opts.noPrivateInsurance ? TAX2026.ramq.maxPremium : 0;
        const corp = corporateTax(profit, opts);

        // Cible = part du bénéfice, versée d'abord en non déterminé (DPE), puis en déterminé (CRTG)
        const target = Math.min(profit * withdrawalPct, corp.afterTax);
        const nonEligDiv = Math.min(target, corp.afterTaxSbd);
        const eligDiv = clamp0(Math.min(target - nonEligDiv, corp.afterTaxGeneral));
        const paid = nonEligDiv + eligDiv;

        const baseP = baseTaxProfile(base);
        const gUpN = 1 + TAX2026.dividends.nonEligible.grossUp;
        const gUpE = 1 + TAX2026.dividends.eligible.grossUp;

        let sumTax = 0, sumFss = 0, sumRamq = 0, sumNet = 0;
        const perOwner = [];
        shares.forEach(function (fr) {
            const nonEligPer = nonEligDiv * fr, eligPer = eligDiv * fr;
            const full = personalTax({
                ordinaryIncome: baseP.ordinaryNet,
                nonEligDividend: nonEligPer,
                eligDividend: eligPer,
                extraCreditBase: baseP.creditBase,
                qcWorkIncome: base,
                isEmployee: baseP.isEmployee
            });
            const incomeTax = clamp0(full.total - baseP.tax.total);
            const fss = fssIndividual(nonEligPer * gUpN + eligPer * gUpE);
            const net = (paid * fr) - incomeTax - fss - ramq;
            sumTax += incomeTax; sumFss += fss; sumRamq += ramq; sumNet += net;
            perOwner.push({ share: fr, gross: paid * fr, net: net });
        });

        const retained = corp.afterTax - paid;
        const totalLevies = corp.total + sumTax + sumFss + sumRamq;
        return {
            profit: profit,
            owners: N,
            corpTax: corp.total,
            dividendPaid: paid,
            nonEligDiv: nonEligDiv, eligDiv: eligDiv,
            incomeTax: sumTax,
            fss: sumFss, ramq: sumRamq,
            qpp: 0, qpip: 0,
            netCash: sumNet,
            netCashPerOwner: perOwner.length ? perOwner[0].net : 0,
            perOwner: perOwner,
            retainedInCorp: retained,
            totalAfterTax: sumNet + retained,
            totalLevies: totalLevies,
            effRate: profit > 0 ? totalLevies / profit : 0,
            businessLimit: corp.businessLimit
        };
    }

    // ---------------------------------------------------------------
    // SCÉNARIO 4 — SOCIÉTÉ : MIX SALAIRE + DIVIDENDES
    // ---------------------------------------------------------------
    /**
     * @param {number} profit          bénéfice avant impôts et avant rémunération
     * @param {number} salaryFraction  part (0–1) du retrait visé versée en salaire
     * @param {number} withdrawalPct   part (0–1) du bénéfice visée en retrait
     * @param {Object} opts            mêmes options que scenarioSalary
     * Salaire visé et dividendes visés partagent la MÊME base (bénéfice avant
     * impôt corporatif), pour que les mix soient comparables entre eux.
     */
    function scenarioMix(profit, salaryFraction, withdrawalPct, opts) {
        opts = opts || {};
        profit = clamp0(profit);
        const f = Math.min(Math.max(num(salaryFraction), 0), 1);
        const shares = normalizeShares(opts);
        const N = shares.length;
        const base = clamp0(num(opts.baseIncome));
        const ramq = opts.noPrivateInsurance ? TAX2026.ramq.maxPremium : 0;
        const fssRate = (opts.fssEmployerRate != null) ? opts.fssEmployerRate : TAX2026.fssEmployer.serviceRate;
        const otherPct = num(opts.otherPayrollPct);

        // Salaires : fraction du retrait visé, répartis selon les parts (plafonné)
        const employerForAll = function (totalSalary) {
            let sum = 0;
            shares.forEach(function (fr) {
                const sPer = totalSalary * fr;
                sum += qppEmployer(sPer) + qpipEmployer(sPer) + sPer * (fssRate + otherPct);
            });
            return sum;
        };
        let salaryTotal = profit * withdrawalPct * f;
        let employerTotal = employerForAll(salaryTotal);
        if (salaryTotal + employerTotal > profit && salaryTotal > 0) {
            for (let i = 0; i < 25; i++) {
                salaryTotal = clamp0(profit - employerTotal);
                employerTotal = employerForAll(salaryTotal);
            }
        }

        const corpTaxable = clamp0(profit - salaryTotal - employerTotal);
        const corp = corporateTax(corpTaxable, opts);

        // Dividendes : solde du retrait visé, même base que le salaire (le bénéfice),
        // plafonné aux surplus après impôt de la société
        const targetDiv = Math.min(profit * withdrawalPct * (1 - f), corp.afterTax);
        const nonEligDiv = Math.min(targetDiv, corp.afterTaxSbd);
        const eligDiv = clamp0(Math.min(targetDiv - nonEligDiv, corp.afterTaxGeneral));
        const divPaid = nonEligDiv + eligDiv;
        const retained = corp.afterTax - divPaid;
        const retainedNonElig = clamp0(corp.afterTaxSbd - nonEligDiv);
        const retainedElig = clamp0(corp.afterTaxGeneral - eligDiv);

        const baseP = baseTaxProfile(base);
        const gUpN = 1 + TAX2026.dividends.nonEligible.grossUp;
        const gUpE = 1 + TAX2026.dividends.eligible.grossUp;

        let sumTax = 0, sumQpp = 0, sumQpip = 0, sumFss = 0, sumRamq = 0, sumNet = 0, sumLiqTax = 0, sumRrsp = 0;
        const perOwner = [];
        shares.forEach(function (fr) {
            const sPer = salaryTotal * fr;
            const qppEmp = qppEmployee(sPer, base);
            const qpipEmp = qpipEmployee(sPer, base);
            const scenarioP = {
                ordinaryIncome: baseP.ordinaryNet + clamp0(sPer - qppEmp.deductible),
                nonEligDividend: nonEligDiv * fr,
                eligDividend: eligDiv * fr,
                extraCreditBase: baseP.creditBase + qppEmp.creditBase + qpipEmp.creditBase,
                qcWorkIncome: base + sPer,
                isEmployee: baseP.isEmployee || sPer > 0
            };
            const full = personalTax(scenarioP);
            const incomeTax = clamp0(full.total - baseP.tax.total);
            const fss = fssIndividual((nonEligDiv * fr) * gUpN + (eligDiv * fr) * gUpE);
            const net = sPer + (divPaid * fr) - incomeTax - qppEmp.total - qpipEmp.total - fss - ramq;

            // Impôt latent si la rétention (au prorata) était distribuée aujourd'hui
            const fullLiq = personalTax({
                ordinaryIncome: scenarioP.ordinaryIncome,
                nonEligDividend: scenarioP.nonEligDividend + retainedNonElig * fr,
                eligDividend: scenarioP.eligDividend + retainedElig * fr,
                extraCreditBase: scenarioP.extraCreditBase,
                qcWorkIncome: scenarioP.qcWorkIncome,
                isEmployee: scenarioP.isEmployee
            });
            sumLiqTax += clamp0(fullLiq.total - full.total);
            sumTax += incomeTax; sumQpp += qppEmp.total; sumQpip += qpipEmp.total;
            sumFss += fss; sumRamq += ramq; sumNet += net;
            sumRrsp += Math.min(sPer * TAX2026.rrsp.rate, TAX2026.rrsp.dollarLimit);
            perOwner.push({ share: fr, gross: sPer + divPaid * fr, net: net });
        });

        const totalLevies = corp.total + sumTax + sumQpp + sumQpip + sumFss + sumRamq + employerTotal;
        return {
            profit: profit,
            owners: N,
            salaryFraction: f,
            salary: salaryTotal,
            employerCosts: employerTotal,
            dividendPaid: divPaid,
            corpTax: corp.total,
            incomeTax: sumTax,
            fss: sumFss, ramq: sumRamq,
            qpp: sumQpp, qpip: sumQpip,
            netCash: sumNet,
            netCashPerOwner: perOwner.length ? perOwner[0].net : 0,
            perOwner: perOwner,
            retainedInCorp: retained,
            totalAfterTax: sumNet + retained,
            totalIfLiquidated: sumNet + retained - sumLiqTax,
            totalLevies: totalLevies,
            effRate: profit > 0 ? totalLevies / profit : 0,
            rrspRoom: sumRrsp
        };
    }

    /**
     * Balaye les fractions de salaire (pas de 5 %) et retourne le mix qui
     * maximise le patrimoine LIQUIDÉ (net perso + rétention nette de l'impôt
     * latent si elle était distribuée aujourd'hui) — comparaison équitable
     * entre mix à rétention différente.
     */
    function optimizeMix(profit, withdrawalPct, opts) {
        let best = null;
        for (let f = 0; f <= 1.0001; f += 0.05) {
            const s = scenarioMix(profit, f, withdrawalPct, opts);
            if (!best || s.totalIfLiquidated > best.totalIfLiquidated + 0.01) best = s;
        }
        return best;
    }

    // ---------------------------------------------------------------
    // RENTABILITÉ — Seuil de rentabilité (point mort)
    // ---------------------------------------------------------------
    /**
     * @param {number} revenue        revenus annuels
     * @param {number} variableCosts  coûts variables (COGS, redevances, commissions…)
     * @param {number} fixedCosts     coûts fixes annuels
     */
    function breakEven(revenue, variableCosts, fixedCosts) {
        const variableRate = revenue > 0 ? variableCosts / revenue : 0;
        const contributionMargin = 1 - variableRate;
        // Marge sur coûts variables nulle ou négative : aucun volume ne couvre les fixes
        const beRevenue = contributionMargin > 0.0001 ? fixedCosts / contributionMargin : Infinity;
        return {
            variableRate: variableRate,
            contributionMargin: contributionMargin,
            breakEvenRevenue: beRevenue,
            safetyMargin: (revenue > 0 && isFinite(beRevenue)) ? (revenue - beRevenue) / revenue : -1
        };
    }

    // ---------------------------------------------------------------
    // VALORISATION — Acheter, vendre ou fusionner une entreprise
    // ---------------------------------------------------------------
    /**
     * Valeur marchande estimée par multiple de BAIIA normalisé.
     * @param {number} ebitda    BAIIA de l'état des résultats
     * @param {number} addbacks  redressements (rémunération excédentaire du proprio,
     *                           dépenses discrétionnaires, loyer hors marché, etc.)
     * @param {number} multLow   multiple bas du secteur
     * @param {number} multHigh  multiple haut du secteur
     */
    function businessValuation(ebitda, addbacks, multLow, multHigh) {
        const normalized = num(ebitda) + num(addbacks);
        const base = clamp0(normalized);
        const lo = clamp0(num(multLow)), hi = Math.max(clamp0(num(multHigh)), clamp0(num(multLow)));
        return {
            normalizedEbitda: normalized,
            low: base * lo,
            high: base * hi,
            mid: base * (lo + hi) / 2
        };
    }

    /** Paiement annuel d'un prêt amorti (annuités constantes) */
    function annualPayment(principal, rate, years) {
        principal = clamp0(num(principal)); rate = num(rate); years = num(years);
        if (principal <= 0 || years <= 0) return 0;
        if (rate <= 0) return principal / years;
        const f = Math.pow(1 + rate, years);
        return principal * rate * f / (f - 1);
    }

    /**
     * Analyse d'acquisition (achat ou fusion) financée par emprunt.
     * @param {Object} p { price, downPct (0–1), rate, years, normalizedEbitda }
     * @returns ratios clés que les prêteurs (banques, BDC) examinent
     */
    function acquisitionAnalysis(p) {
        p = p || {};
        const price = clamp0(num(p.price));
        const down = price * Math.min(Math.max(num(p.downPct), 0), 1);
        const loan = price - down;
        const debtService = annualPayment(loan, num(p.rate), num(p.years));
        const ebitda = num(p.normalizedEbitda);
        const cashAfterDebt = ebitda - debtService;
        return {
            downPayment: down,
            loan: loan,
            annualDebtService: debtService,
            // DSCR : BAIIA / service de la dette — les prêteurs exigent ≥ 1,25 en général
            dscr: debtService > 0 ? ebitda / debtService : Infinity,
            cashAfterDebt: cashAfterDebt,
            impliedMultiple: ebitda > 0 ? price / ebitda : Infinity,
            // Rendement sur mise de fonds (cash-on-cash) et récupération
            cashOnCash: down > 0 ? cashAfterDebt / down : Infinity,
            paybackYears: ebitda > 0 ? price / ebitda : Infinity
        };
    }

    // ---------------------------------------------------------------
    // PRODUIT NET D'UNE VENTE D'ACTIONS (vendeur, avec ECGC)
    // ---------------------------------------------------------------
    /**
     * Estime le net en poche d'une vente d'ACTIONS admissibles d'une SPCC.
     * Hypothèses simplifiées : gain traité comme seul revenu de l'année,
     * IMR (impôt minimum de remplacement) non modélisé — depuis 2024 l'IMR
     * touche fréquemment les ventes utilisant l'ECGC (souvent récupérable
     * sur 7 ans). Inclut le FSS (annexe F) sur le gain imposable.
     * @param {Object} p { price, acb, lcgeRemaining }
     */
    function saleNetProceeds(p) {
        p = p || {};
        const price = clamp0(num(p.price));
        const acb = clamp0(num(p.acb));
        const gain = clamp0(price - acb);
        const exempt = Math.min(gain, clamp0(p.lcgeRemaining != null ? num(p.lcgeRemaining) : TAX2026.lcge));
        const taxableGain = (gain - exempt) * TAX2026.capitalGainsInclusion;
        const reg = personalTax({ ordinaryIncome: taxableGain });
        const fss = fssIndividual(taxableGain);

        // IMR (règles 2024+) — estimation : assiette élargie = 100 % du gain
        // non exonéré + 30 % du gain exonéré par l'ECGC. L'excédent d'IMR sur
        // l'impôt régulier est payable l'année de la vente, RÉCUPÉRABLE sur
        // 7 ans contre l'impôt régulier futur.
        const a = TAX2026.amt;
        const amtBase = (gain - exempt) + exempt * a.lcgeInclusion;
        const tentFed = clamp0(amtBase - a.fedExemption) * a.fedRate * (1 - TAX2026.federal.abatementQc);
        const tentQc = clamp0(amtBase - a.qcExemption) * a.qcRate;
        const amtFed = clamp0(tentFed - reg.fed);
        const amtQc = clamp0(tentQc - reg.qc);
        const amt = amtFed + amtQc;

        return {
            gain: gain,
            exempt: exempt,
            taxableGain: taxableGain,
            regularTax: reg.total + fss,
            amt: amt,               // payable maintenant, récupérable sur 7 ans
            tax: reg.total + fss + amt,
            net: price - reg.total - fss - amt,
            netAfterAmtRecovery: price - reg.total - fss, // si l'IMR est pleinement récupéré
            effRateOnGain: gain > 0 ? (reg.total + fss + amt) / gain : 0
        };
    }

    // ---------------------------------------------------------------
    // SOCIÉTÉ DE GESTION — Revenus de placement DANS une SPCC
    // (IMRTD remboursable, compte de dividendes en capital, RPTA)
    // ---------------------------------------------------------------
    /**
     * @param {Object} p { interest, portfolioDividends, capitalGains }
     *  - interest            : intérêts, loyers nets, revenu étranger
     *  - portfolioDividends  : dividendes déterminés de sociétés canadiennes (portefeuille)
     *  - capitalGains        : gains en capital RÉALISÉS dans l'année
     */
    function passiveInvestmentTax(p) {
        p = p || {};
        const pc = TAX2026.passiveCorp;
        const interest = clamp0(num(p.interest));
        const divs = clamp0(num(p.portfolioDividends));
        const gains = clamp0(num(p.capitalGains));
        const taxableGains = gains * TAX2026.capitalGainsInclusion;

        const taxInterest = interest * pc.interestRate;
        const taxGains = taxableGains * pc.interestRate;
        const taxDivs = divs * pc.part4Rate; // partie IV, 100 % remboursable
        const totalTax = taxInterest + taxGains + taxDivs;

        // IMRTD : portion remboursable au rythme de 38,33 $ / 100 $ de dividendes imposables versés
        const rdtoh = interest * pc.interestRefundable + taxableGains * pc.interestRefundable + taxDivs;
        // CDC : moitié non imposable des gains — distribuable en dividende EN CAPITAL libre d'impôt
        const cda = gains - taxableGains;
        // RPTA (pour la réduction du plafond DPE) : intérêts + gains imposables + dividendes de portefeuille
        const aaii = interest + taxableGains + divs;
        // Dividendes imposables à verser pour récupérer tout l'IMRTD
        const dividendsToRecover = rdtoh / pc.rdtohRefundRate;

        return {
            totalTax: totalTax,
            refundable: rdtoh,
            netTaxIfDistributed: totalTax - rdtoh,
            cda: cda,
            aaii: aaii,
            dividendsToRecoverRdtoh: dividendsToRecover,
            afterTaxRetained: interest + divs + gains - totalTax
        };
    }

    // ---------------------------------------------------------------
    // DPA — Déduction pour amortissement (catégories courantes)
    // Règle de demi-année suspendue (incitatif à l'investissement
    // accéléré, en vigueur pour les biens acquis avant 2028)
    // ---------------------------------------------------------------
    function ccaDeduction(openingUcc, additions, rate) {
        openingUcc = clamp0(num(openingUcc));
        additions = clamp0(num(additions));
        rate = Math.min(Math.max(num(rate), 0), 1);
        const onExisting = openingUcc * rate;
        const onAdditions = additions * rate; // AIIP : pas de demi-année avant 2028
        return {
            onExisting: onExisting,
            onAdditions: onAdditions,
            total: onExisting + onAdditions,
            closingUcc: openingUcc + additions - onExisting - onAdditions
        };
    }

    // ---------------------------------------------------------------
    // RRQ — Valeur retraite d'une année de cotisation (approximation)
    // ---------------------------------------------------------------
    function qppPensionAccrual(salary) {
        const q = TAX2026.qppPension;
        const ratio = Math.min(clamp0(num(salary)) / TAX2026.qpp.ympe, 1);
        const annualPension = ratio * q.maxAnnual / q.careerYears;
        return {
            annualPension: annualPension,          // rente viagère annuelle gagnée cette année
            presentValue: annualPension * q.pvFactor // valeur actuarielle approximative
        };
    }

    // ---------------------------------------------------------------
    // TPS / TVQ
    // ---------------------------------------------------------------
    /**
     * @param {number} revenue     revenus annuels totaux
     * @param {number} taxablePct  part (0–1) des ventes taxables au Québec
     *                             (les fournitures exonérées — santé, formation,
     *                             loyers résidentiels — sont exclues du test du
     *                             petit fournisseur; les exportations sont
     *                             détaxées : comptées pour le seuil, 0 % perçu)
     */
    function salesTaxInfo(revenue, taxablePct) {
        const s = TAX2026.salesTax;
        const pct = (taxablePct == null) ? 1 : Math.min(Math.max(num(taxablePct), 0), 1);
        const taxableSales = clamp0(revenue) * pct;
        return {
            taxableSales: taxableSales,
            mustRegister: taxableSales > s.registrationThreshold,
            gstToCollect: taxableSales * s.gst,
            qstToCollect: taxableSales * s.qst
        };
    }

    // ---------------------------------------------------------------
    // EXPORT (API locale)
    // ---------------------------------------------------------------
    root.JCProfitEngine = {
        TAX2026: TAX2026,
        bracketTax: bracketTax,
        personalTax: personalTax,
        corporateTax: corporateTax,
        adjustedBusinessLimit: adjustedBusinessLimit,
        qppSelfEmployed: qppSelfEmployed,
        qppEmployee: qppEmployee,
        qppEmployer: qppEmployer,
        qpipSelfEmployed: qpipSelfEmployed,
        qpipEmployee: qpipEmployee,
        qpipEmployer: qpipEmployer,
        fssIndividual: fssIndividual,
        scenarioSelfEmployed: scenarioSelfEmployed,
        scenarioSalary: scenarioSalary,
        scenarioDividends: scenarioDividends,
        scenarioMix: scenarioMix,
        optimizeMix: optimizeMix,
        employerCostOfSalary: employerCostOfSalary,
        breakEven: breakEven,
        normalizeShares: normalizeShares,
        passiveInvestmentTax: passiveInvestmentTax,
        ccaDeduction: ccaDeduction,
        qppPensionAccrual: qppPensionAccrual,
        businessValuation: businessValuation,
        annualPayment: annualPayment,
        acquisitionAnalysis: acquisitionAnalysis,
        saleNetProceeds: saleNetProceeds,
        salesTaxInfo: salesTaxInfo
    };

})(typeof window !== 'undefined' ? window : globalThis);
