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
            canadaEmploymentAmount: 1471 // montant canadien pour emploi (salariés seulement)
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
        fssIndividual: {
            threshold1: 18500,
            max1: 150,
            threshold2: 64350,
            maxTotal: 1000,
            rate: 0.01
        },
        // FSS employeur (PME, masse salariale ≤ 1 M$)
        fssEmployer: {
            serviceRate: 0.0165,       // secteurs des services et de la construction
            primaryRate: 0.0125        // secteurs primaire et manufacturier
        },
        corporate: {
            fedSmallRate: 0.09,        // fédéral, DPE (≤ 500 000 $)
            fedGeneralRate: 0.15,      // fédéral, taux général (net de l'abattement)
            qcSmallRateBefore: 0.032,  // Québec, DPE — année débutant avant le 30 avril 2026
            qcSmallRateAfter: 0.022,   // Québec, DPE — année débutant après le 29 avril 2026
            qcGeneralRate: 0.115,
            businessLimit: 500000,
            minPaidHoursForQcSbd: 5500 // critère d'heures rémunérées pour la DPE Québec
        },
        dividends: {
            nonEligible: { grossUp: 0.15, fedDtc: 0.090301, qcDtc: 0.0342 },
            eligible: { grossUp: 0.38, fedDtc: 0.150198, qcDtc: 0.117 }
        },
        salesTax: { gst: 0.05, qst: 0.09975, registrationThreshold: 30000 }
    };

    // ---------------------------------------------------------------
    // OUTILS
    // ---------------------------------------------------------------
    function clamp0(x) { return x > 0 ? x : 0; }

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

    // ---------------------------------------------------------------
    // IMPÔT DES PARTICULIERS (fédéral + Québec, résident du Québec)
    // ---------------------------------------------------------------
    /**
     * @param {Object} p
     * @param {number} p.ordinaryIncome   revenu ordinaire imposable (salaire ou entreprise, après déductions)
     * @param {number} p.nonEligDividend  dividende non déterminé REÇU (avant majoration)
     * @param {number} p.eligDividend     dividende déterminé REÇU (avant majoration)
     * @param {number} p.extraCreditBase  base de crédits additionnels (ex. cotisations RRQ part « crédit »)
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

        // --- Québec ---
        let qc = bracketTax(taxable, q.brackets);
        let qcCredits = q.bpa * q.creditRate + extraCreditBase * q.creditRate;
        qc = clamp0(qc - qcCredits);
        const qcDtc = grossedNonElig * d.nonEligible.qcDtc + grossedElig * d.eligible.qcDtc;
        qc = clamp0(qc - qcDtc);

        return { fed: fed, qc: qc, total: fed + qc, taxable: taxable };
    }

    // ---------------------------------------------------------------
    // COTISATIONS SOCIALES
    // ---------------------------------------------------------------
    /** RRQ du travailleur autonome (2 parts). Retourne aussi les portions déductible / crédit. */
    function qppSelfEmployed(netBusinessIncome) {
        const c = TAX2026.qpp;
        const pensionable = clamp0(Math.min(netBusinessIncome, c.ympe) - c.exemption);
        const band2 = clamp0(Math.min(netBusinessIncome, c.yampe) - c.ympe);
        const part1 = pensionable * c.selfRate1;   // base + 1re suppl.
        const part2 = band2 * c.selfRate2;         // 2e suppl.
        // Déduction : moitié « employeur » de la base (5,3/12,6) + 1re suppl. (2/12,6) + 2e suppl. au complet
        const deductible = part1 * ((c.baseRate / 2 + c.addl1Rate) / c.selfRate1) + part2;
        // Crédit : moitié « employé » de la base (5,3/12,6)
        const creditBase = part1 * ((c.baseRate / 2) / c.selfRate1);
        return { total: part1 + part2, deductible: deductible, creditBase: creditBase };
    }

    /** RRQ part employé (salarié) */
    function qppEmployee(salary) {
        const c = TAX2026.qpp;
        const pensionable = clamp0(Math.min(salary, c.ympe) - c.exemption);
        const band2 = clamp0(Math.min(salary, c.yampe) - c.ympe);
        const part1 = pensionable * c.employeeRate1;
        const part2 = band2 * c.employeeRate2;
        // 1re suppl. (1 %/6,3 %) et 2e suppl. : déduction; base (5,3 %) : crédit
        const deductible = part1 * (0.01 / c.employeeRate1) + part2;
        const creditBase = part1 * ((c.baseRate / 2) / c.employeeRate1);
        return { total: part1 + part2, deductible: deductible, creditBase: creditBase };
    }

    /** RRQ part employeur (coût pour la société) */
    function qppEmployer(salary) {
        const c = TAX2026.qpp;
        const pensionable = clamp0(Math.min(salary, c.ympe) - c.exemption);
        const band2 = clamp0(Math.min(salary, c.yampe) - c.ympe);
        return pensionable * c.employerRate1 + band2 * c.employerRate2;
    }

    /** RQAP travailleur autonome */
    function qpipSelfEmployed(netBusinessIncome) {
        const c = TAX2026.qpip;
        const insurable = Math.min(clamp0(netBusinessIncome), c.maxInsurable);
        const total = insurable * c.selfRate;
        // Portion équivalente « employé » : crédit; excédent : déduction
        const creditBase = insurable * c.employeeRate;
        return { total: total, deductible: total - creditBase, creditBase: creditBase };
    }

    function qpipEmployee(salary) {
        const c = TAX2026.qpip;
        const insurable = Math.min(clamp0(salary), c.maxInsurable);
        const total = insurable * c.employeeRate;
        return { total: total, deductible: 0, creditBase: total };
    }

    function qpipEmployer(salary) {
        const c = TAX2026.qpip;
        return Math.min(clamp0(salary), c.maxInsurable) * c.employerRate;
    }

    /** FSS du particulier (annexe F) — revenu d'entreprise d'un TA */
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
    /**
     * @param {number} profit  bénéfice imposable de la société
     * @param {Object} opts { qcSbdEligible:boolean, afterApril2026:boolean }
     * @returns {{fed, qc, total, afterTax, sbdPortion, generalPortion, afterTaxSbd, afterTaxGeneral, effRate}}
     */
    function corporateTax(profit, opts) {
        const c = TAX2026.corporate;
        profit = clamp0(profit);
        const sbdPortion = Math.min(profit, c.businessLimit);
        const generalPortion = clamp0(profit - c.businessLimit);

        const qcSmallRate = opts.afterApril2026 ? c.qcSmallRateAfter : c.qcSmallRateBefore;
        // DPE Québec : exige ≥ 5 500 heures rémunérées (sinon taux général au QC même ≤ 500 k$)
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
            effRate: profit > 0 ? total / profit : 0
        };
    }

    // ---------------------------------------------------------------
    // SCÉNARIO 1 — TRAVAILLEUR AUTONOME (entreprise non incorporée)
    // ---------------------------------------------------------------
    function scenarioSelfEmployed(profit) {
        profit = clamp0(profit);
        const qpp = qppSelfEmployed(profit);
        const qpip = qpipSelfEmployed(profit);
        const fss = fssIndividual(profit);

        const taxableIncome = clamp0(profit - qpp.deductible - qpip.deductible);
        const tax = personalTax({
            ordinaryIncome: taxableIncome,
            extraCreditBase: qpp.creditBase + qpip.creditBase
        });

        const totalLevies = tax.total + qpp.total + qpip.total + fss;
        return {
            profit: profit,
            incomeTax: tax.total, fedTax: tax.fed, qcTax: tax.qc,
            qpp: qpp.total, qpip: qpip.total, fss: fss,
            totalLevies: totalLevies,
            netCash: profit - totalLevies,
            retainedInCorp: 0,
            totalAfterTax: profit - totalLevies,
            effRate: profit > 0 ? totalLevies / profit : 0
        };
    }

    // ---------------------------------------------------------------
    // SCÉNARIO 2 — SOCIÉTÉ : RÉMUNÉRATION EN SALAIRE
    // ---------------------------------------------------------------
    /**
     * @param {number} profit         bénéfice avant impôts et avant salaire du proprio
     * @param {number} withdrawalPct  fraction (0–1) du bénéfice convertie en salaire brut
     * @param {Object} opts { qcSbdEligible, afterApril2026, fssEmployerRate, otherPayrollPct }
     */
    function scenarioSalary(profit, withdrawalPct, opts) {
        profit = clamp0(profit);
        const fssRate = (opts.fssEmployerRate != null) ? opts.fssEmployerRate : TAX2026.fssEmployer.serviceRate;
        const otherPct = opts.otherPayrollPct || 0;

        // Salaire visé = % du bénéfice; on plafonne pour que salaire + charges ≤ bénéfice
        let salary = profit * withdrawalPct;
        let employerCosts = qppEmployer(salary) + qpipEmployer(salary) + salary * (fssRate + otherPct);
        if (salary + employerCosts > profit && salary > 0) {
            // Ajustement itératif simple (les charges dépendent du salaire)
            for (let i = 0; i < 25; i++) {
                salary = clamp0(profit - employerCosts);
                employerCosts = qppEmployer(salary) + qpipEmployer(salary) + salary * (fssRate + otherPct);
            }
        }

        const corpTaxable = clamp0(profit - salary - employerCosts);
        const corp = corporateTax(corpTaxable, opts);

        // Côté particulier (salarié)
        const qppEmp = qppEmployee(salary);
        const qpipEmp = qpipEmployee(salary);
        const tax = personalTax({
            ordinaryIncome: clamp0(salary - qppEmp.deductible),
            extraCreditBase: qppEmp.creditBase + qpipEmp.creditBase,
            isEmployee: true
        });

        const netSalary = salary - tax.total - qppEmp.total - qpipEmp.total;
        const totalLevies = corp.total + tax.total + qppEmp.total + qpipEmp.total +
            (employerCosts); // charges patronales = aussi une ponction sur le bénéfice
        return {
            profit: profit,
            salary: salary,
            employerCosts: employerCosts,
            corpTax: corp.total,
            incomeTax: tax.total,
            qpp: qppEmp.total, qpip: qpipEmp.total,
            netCash: netSalary,
            retainedInCorp: corp.afterTax,
            totalAfterTax: netSalary + corp.afterTax,
            totalLevies: totalLevies,
            effRate: profit > 0 ? totalLevies / profit : 0
        };
    }

    // ---------------------------------------------------------------
    // SCÉNARIO 3 — SOCIÉTÉ : RÉMUNÉRATION EN DIVIDENDES
    // ---------------------------------------------------------------
    /**
     * @param {number} profit         bénéfice imposable de la société
     * @param {number} withdrawalPct  fraction (0–1) du bénéfice APRÈS impôt corporatif versée en dividende
     * @param {Object} opts { qcSbdEligible, afterApril2026 }
     */
    function scenarioDividends(profit, withdrawalPct, opts) {
        profit = clamp0(profit);
        const corp = corporateTax(profit, opts);

        // On verse d'abord le solde non déterminé (DPE), puis le solde déterminé (CRTG)
        const target = corp.afterTax * withdrawalPct;
        const nonEligDiv = Math.min(target, corp.afterTaxSbd);
        const eligDiv = clamp0(Math.min(target - nonEligDiv, corp.afterTaxGeneral));

        const tax = personalTax({ nonEligDividend: nonEligDiv, eligDividend: eligDiv });

        const paid = nonEligDiv + eligDiv;
        const netCash = paid - tax.total;
        const retained = corp.afterTax - paid;
        return {
            profit: profit,
            corpTax: corp.total,
            dividendPaid: paid,
            nonEligDiv: nonEligDiv, eligDiv: eligDiv,
            incomeTax: tax.total,
            qpp: 0, qpip: 0,
            netCash: netCash,
            retainedInCorp: retained,
            totalAfterTax: netCash + retained,
            totalLevies: corp.total + tax.total,
            effRate: profit > 0 ? (corp.total + tax.total) / profit : 0
        };
    }

    // ---------------------------------------------------------------
    // RENTABILITÉ — Seuil de rentabilité (point mort)
    // ---------------------------------------------------------------
    /**
     * @param {number} revenue        revenus annuels
     * @param {number} variableCosts  coûts variables (COGS + autres variables)
     * @param {number} fixedCosts     coûts fixes annuels
     */
    function breakEven(revenue, variableCosts, fixedCosts) {
        const variableRate = revenue > 0 ? Math.min(variableCosts / revenue, 0.9999) : 0;
        const contributionMargin = 1 - variableRate;
        const beRevenue = contributionMargin > 0 ? fixedCosts / contributionMargin : Infinity;
        return {
            variableRate: variableRate,
            contributionMargin: contributionMargin,
            breakEvenRevenue: beRevenue,
            safetyMargin: revenue > 0 ? (revenue - beRevenue) / revenue : 0
        };
    }

    // ---------------------------------------------------------------
    // TPS / TVQ
    // ---------------------------------------------------------------
    function salesTaxInfo(revenue) {
        const s = TAX2026.salesTax;
        return {
            mustRegister: revenue > s.registrationThreshold,
            gstToCollect: revenue * s.gst,
            qstToCollect: revenue * s.qst
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
        qppSelfEmployed: qppSelfEmployed,
        qppEmployee: qppEmployee,
        qppEmployer: qppEmployer,
        qpipSelfEmployed: qpipSelfEmployed,
        qpipEmployer: qpipEmployer,
        fssIndividual: fssIndividual,
        scenarioSelfEmployed: scenarioSelfEmployed,
        scenarioSalary: scenarioSalary,
        scenarioDividends: scenarioDividends,
        breakEven: breakEven,
        salesTaxInfo: salesTaxInfo
    };

})(typeof window !== 'undefined' ? window : globalThis);
