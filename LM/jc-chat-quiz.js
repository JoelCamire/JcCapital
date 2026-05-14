/**
 * JC Chat - Quiz Data for all 10 services
 * Each quiz: 3-4 bilingual questions, single-choice via bubbles
 * Results generated based on answer tags
 */
window.JC_CHAT_QUIZZES = {

    // ════════════════════════════════════════
    // 1. OPTIMISATION FISCALE
    // ════════════════════════════════════════
    tax_optimization: {
        title: { fr: "📊 Diagnostic Fiscal", en: "📊 Tax Diagnostic" },
        intro: {
            fr: "Répondez à ces questions pour identifier vos opportunités fiscales.",
            en: "Answer these questions to identify your tax opportunities."
        },
        questions: [
            {
                q: { fr: "Quelle est votre structure actuelle ?", en: "What is your current structure?" },
                options: [
                    { label: { fr: "Travailleur autonome (non incorporé)", en: "Self-employed (not incorporated)" }, val: "solo", tag: "needs_corp" },
                    { label: { fr: "Incorporé (société opérante)", en: "Incorporated (operating company)" }, val: "inc", tag: "has_corp" },
                    { label: { fr: "Incorporé + société de gestion", en: "Incorporated + holding company" }, val: "hold", tag: "advanced" },
                    { label: { fr: "Salarié uniquement", en: "Salaried only" }, val: "salary", tag: "basic" }
                ]
            },
            {
                q: { fr: "Quel est votre revenu annuel brut approximatif ?", en: "What is your approximate gross annual income?" },
                options: [
                    { label: { fr: "Moins de 60 000 $", en: "Less than $60,000" }, val: "low", tag: "low_income" },
                    { label: { fr: "60 000 $ – 120 000 $", en: "$60,000 – $120,000" }, val: "mid", tag: "mid_income" },
                    { label: { fr: "120 000 $ – 250 000 $", en: "$120,000 – $250,000" }, val: "high", tag: "high_income" },
                    { label: { fr: "250 000 $+", en: "$250,000+" }, val: "vhigh", tag: "very_high" }
                ]
            },
            {
                q: { fr: "Maximisez-vous vos REER et CELI ?", en: "Do you maximize your RRSP and TFSA?" },
                options: [
                    { label: { fr: "Oui, les deux", en: "Yes, both" }, val: "both", tag: "optimized" },
                    { label: { fr: "REER seulement", en: "RRSP only" }, val: "rrsp", tag: "partial" },
                    { label: { fr: "CELI seulement", en: "TFSA only" }, val: "tfsa", tag: "partial" },
                    { label: { fr: "Aucun des deux", en: "Neither" }, val: "none", tag: "urgent" }
                ]
            },
            {
                q: { fr: "Avez-vous un comptable ou planificateur fiscal ?", en: "Do you have an accountant or tax planner?" },
                options: [
                    { label: { fr: "Oui, mais je n'ai pas eu de révision récente", en: "Yes, but no recent review" }, val: "stale", tag: "review" },
                    { label: { fr: "Oui, satisfait", en: "Yes, satisfied" }, val: "good", tag: "check" },
                    { label: { fr: "Non, je fais tout moi-même", en: "No, I do everything myself" }, val: "diy", tag: "needs_help" }
                ]
            }
        ],
        buildResult: function (answers, lang) {
            var tags = answers.map(function (a) { return a.tag; });
            var fr = "", en = "";

            if (tags.indexOf("needs_corp") > -1 && (tags.indexOf("high_income") > -1 || tags.indexOf("very_high") > -1)) {
                fr = "🔴 **Priorité élevée** — Vous pourriez économiser significativement en vous incorporant. À votre niveau de revenu, la différence d'imposition entre le taux personnel et corporatif est considérable.";
                en = "🔴 **High priority** — You could save significantly by incorporating. At your income level, the tax rate difference between personal and corporate is substantial.";
            } else if (tags.indexOf("urgent") > -1) {
                fr = "⚠️ **Opportunité manquée** — Ne pas maximiser vos REER/CELI vous coûte probablement des milliers de dollars en impôt chaque année.";
                en = "⚠️ **Missed opportunity** — Not maximizing your RRSP/TFSA is likely costing you thousands in tax each year.";
            } else if (tags.indexOf("has_corp") > -1 && tags.indexOf("very_high") > -1) {
                fr = "📈 **Optimisation avancée recommandée** — Avec votre structure et votre revenu, des stratégies comme la société de gestion, le fractionnement et le report d'impôt peuvent générer des économies majeures.";
                en = "📈 **Advanced optimization recommended** — With your structure and income, strategies like holding companies, income splitting, and tax deferral can generate major savings.";
            } else {
                fr = "📋 **Révision recommandée** — Selon votre profil, il existe des opportunités d'optimisation. Une consultation permettrait d'identifier les stratégies les plus adaptées.";
                en = "📋 **Review recommended** — Based on your profile, optimization opportunities exist. A consultation would identify the most suitable strategies.";
            }

            fr += "\n\nUn spécialiste de JC Capital peut analyser votre situation en détail et créer un plan fiscal personnalisé.";
            en += "\n\nA JC Capital specialist can analyze your situation in detail and create a personalized tax plan.";
            return lang === 'en' ? en : fr;
        }
    },

    // ════════════════════════════════════════
    // 2. TRANSFERT, ACHAT & VENTE
    // ════════════════════════════════════════
    transfer: {
        title: { fr: "🔄 Diagnostic de Transfert", en: "🔄 Transfer Diagnostic" },
        intro: {
            fr: "Évaluons la maturité de votre planification de transfert ou transaction.",
            en: "Let's evaluate how ready your transfer or transaction planning is."
        },
        questions: [
            {
                q: { fr: "Quel est votre objectif principal ?", en: "What is your main objective?" },
                options: [
                    { label: { fr: "Vendre mon entreprise", en: "Sell my business" }, val: "sell", tag: "sell" },
                    { label: { fr: "Transférer à la relève familiale", en: "Transfer to family successor" }, val: "family", tag: "family" },
                    { label: { fr: "Acheter une entreprise", en: "Buy a business" }, val: "buy", tag: "buy" },
                    { label: { fr: "Structurer mon partenariat", en: "Structure my partnership" }, val: "partner", tag: "partner" }
                ]
            },
            {
                q: { fr: "Quel est votre horizon de temps ?", en: "What is your time horizon?" },
                options: [
                    { label: { fr: "Moins de 2 ans", en: "Less than 2 years" }, val: "short", tag: "urgent" },
                    { label: { fr: "2 à 5 ans", en: "2 to 5 years" }, val: "mid", tag: "planned" },
                    { label: { fr: "5 ans et plus", en: "5+ years" }, val: "long", tag: "early" }
                ]
            },
            {
                q: { fr: "Avez-vous une évaluation récente de votre entreprise ?", en: "Do you have a recent business valuation?" },
                options: [
                    { label: { fr: "Oui, moins de 2 ans", en: "Yes, less than 2 years old" }, val: "recent", tag: "valued" },
                    { label: { fr: "Non, jamais faite", en: "No, never done" }, val: "never", tag: "no_value" },
                    { label: { fr: "Oui, mais dépassée (3+ ans)", en: "Yes, but outdated (3+ years)" }, val: "old", tag: "stale_val" }
                ]
            },
            {
                q: { fr: "Avez-vous une convention entre actionnaires ?", en: "Do you have a shareholder agreement?" },
                options: [
                    { label: { fr: "Oui, à jour", en: "Yes, up to date" }, val: "yes", tag: "protected" },
                    { label: { fr: "Oui, mais pas révisée récemment", en: "Yes, but not recently reviewed" }, val: "stale", tag: "review_conv" },
                    { label: { fr: "Non", en: "No" }, val: "no", tag: "no_conv" },
                    { label: { fr: "Non applicable (seul propriétaire)", en: "Not applicable (sole owner)" }, val: "na", tag: "solo_owner" }
                ]
            }
        ],
        buildResult: function (answers, lang) {
            var tags = answers.map(function (a) { return a.tag; });
            var fr = "", en = "";

            if (tags.indexOf("urgent") > -1 && tags.indexOf("no_value") > -1) {
                fr = "🔴 **Action requise** — Avec un horizon court et sans évaluation, vous risquez de sous-évaluer ou sur-évaluer votre entreprise, ce qui peut compromettre la transaction.";
                en = "🔴 **Action required** — With a short timeline and no valuation, you risk under/over-valuing your business, which can compromise the transaction.";
            } else if (tags.indexOf("family") > -1) {
                fr = "👨‍👩‍👧‍👦 **Transfert familial** — La relève familiale nécessite une planification fiscale minutieuse pour profiter de l'exemption pour gains en capital et minimiser l'impôt au transfert.";
                en = "👨‍👩‍👧‍👦 **Family transfer** — Family succession requires careful tax planning to benefit from the capital gains exemption and minimize transfer taxes.";
            } else if (tags.indexOf("no_conv") > -1) {
                fr = "⚠️ **Risque identifié** — Sans convention entre actionnaires, un décès, invalidité ou désaccord peut paralyser votre entreprise. C'est une priorité à régler.";
                en = "⚠️ **Risk identified** — Without a shareholder agreement, death, disability or disagreement can paralyze your business. This is a priority to address.";
            } else {
                fr = "📋 **Planification recommandée** — Votre situation présente des aspects à optimiser. Un accompagnement professionnel peut maximiser la valeur de votre transaction.";
                en = "📋 **Planning recommended** — Your situation has areas to optimize. Professional guidance can maximize your transaction value.";
            }

            fr += "\n\nNos experts en transfert d'entreprise peuvent vous accompagner à chaque étape.";
            en += "\n\nOur business transfer experts can support you at every step.";
            return lang === 'en' ? en : fr;
        }
    },

    // ════════════════════════════════════════
    // 3. PLANIFICATION FINANCIÈRE
    // ════════════════════════════════════════
    financial_planning: {
        title: { fr: "💰 Bilan Financier Rapide", en: "💰 Quick Financial Check-up" },
        intro: {
            fr: "Évaluons votre santé financière en quelques questions.",
            en: "Let's assess your financial health in a few questions."
        },
        questions: [
            {
                q: { fr: "Quel est votre objectif financier principal ?", en: "What is your main financial goal?" },
                options: [
                    { label: { fr: "Planifier ma retraite", en: "Plan for retirement" }, val: "retire", tag: "retirement" },
                    { label: { fr: "Épargner pour un projet (maison, études)", en: "Save for a project (home, education)" }, val: "project", tag: "project" },
                    { label: { fr: "Réduire mes dettes", en: "Reduce my debts" }, val: "debt", tag: "debt" },
                    { label: { fr: "Faire croître mon patrimoine", en: "Grow my wealth" }, val: "grow", tag: "growth" }
                ]
            },
            {
                q: { fr: "Avez-vous un fonds d'urgence (3-6 mois de dépenses) ?", en: "Do you have an emergency fund (3-6 months of expenses)?" },
                options: [
                    { label: { fr: "Oui, 6 mois ou plus", en: "Yes, 6 months or more" }, val: "good", tag: "safe" },
                    { label: { fr: "Oui, 1 à 3 mois", en: "Yes, 1 to 3 months" }, val: "partial", tag: "at_risk" },
                    { label: { fr: "Non, aucun coussin", en: "No, no cushion" }, val: "none", tag: "critical" }
                ]
            },
            {
                q: { fr: "À quel âge souhaitez-vous prendre votre retraite ?", en: "At what age do you want to retire?" },
                options: [
                    { label: { fr: "Avant 55 ans", en: "Before 55" }, val: "early", tag: "early_retire" },
                    { label: { fr: "55 – 65 ans", en: "55 – 65" }, val: "normal", tag: "normal_retire" },
                    { label: { fr: "Après 65 ans ou jamais", en: "After 65 or never" }, val: "late", tag: "late_retire" }
                ]
            },
            {
                q: { fr: "Quel est votre niveau d'endettement ?", en: "What is your debt level?" },
                options: [
                    { label: { fr: "Aucune dette", en: "No debt" }, val: "clean", tag: "no_debt" },
                    { label: { fr: "Hypothèque seulement", en: "Mortgage only" }, val: "mortgage", tag: "moderate" },
                    { label: { fr: "Hypothèque + autres dettes", en: "Mortgage + other debts" }, val: "mixed", tag: "heavy" },
                    { label: { fr: "Dettes de consommation importantes", en: "Significant consumer debts" }, val: "consumer", tag: "alarm" }
                ]
            }
        ],
        buildResult: function (answers, lang) {
            var tags = answers.map(function (a) { return a.tag; });
            var fr = "", en = "";

            if (tags.indexOf("critical") > -1 && tags.indexOf("alarm") > -1) {
                fr = "🔴 **Situation urgente** — Sans fonds d'urgence et avec des dettes de consommation, vous êtes vulnérable à tout imprévu. Un plan de redressement structuré est nécessaire en priorité.";
                en = "🔴 **Urgent situation** — Without an emergency fund and with consumer debts, you're vulnerable to any unexpected event. A structured recovery plan is needed as a priority.";
            } else if (tags.indexOf("early_retire") > -1) {
                fr = "🎯 **Retraite anticipée** — Atteindre la liberté financière avant 55 ans demande une stratégie agressive d'épargne et d'investissement. Il est essentiel d'avoir un plan précis avec des projections réalistes.";
                en = "🎯 **Early retirement** — Achieving financial freedom before 55 requires an aggressive savings and investment strategy. A precise plan with realistic projections is essential.";
            } else if (tags.indexOf("critical") > -1) {
                fr = "⚠️ **Priorité : Fonds d'urgence** — Sans coussin financier, un arrêt de travail ou une dépense imprévue peut rapidement créer une spirale d'endettement.";
                en = "⚠️ **Priority: Emergency fund** — Without a financial cushion, a work stoppage or unexpected expense can quickly create a debt spiral.";
            } else {
                fr = "📋 **Bilan positif** — Votre situation présente de bonnes bases, mais un plan structuré peut optimiser votre trajectoire et identifier des opportunités d'amélioration.";
                en = "📋 **Positive assessment** — Your situation has good foundations, but a structured plan can optimize your trajectory and identify improvement opportunities.";
            }

            fr += "\n\nUn conseiller en sécurité financière de JC Capital peut créer votre plan personnalisé.";
            en += "\n\nA JC Capital financial security advisor can create your personalized plan.";
            return lang === 'en' ? en : fr;
        }
    },

    // ════════════════════════════════════════
    // 4. PLACEMENT
    // ════════════════════════════════════════
    investment: {
        title: { fr: "📈 Profil d'Investisseur", en: "📈 Investor Profile" },
        intro: {
            fr: "Découvrons votre profil d'investisseur pour mieux vous orienter.",
            en: "Let's discover your investor profile to better guide you."
        },
        questions: [
            {
                q: { fr: "Quel est votre horizon de placement ?", en: "What is your investment horizon?" },
                options: [
                    { label: { fr: "Court terme (moins de 3 ans)", en: "Short term (less than 3 years)" }, val: "short", tag: "short" },
                    { label: { fr: "Moyen terme (3-10 ans)", en: "Medium term (3-10 years)" }, val: "mid", tag: "medium" },
                    { label: { fr: "Long terme (10 ans+)", en: "Long term (10+ years)" }, val: "long", tag: "long" }
                ]
            },
            {
                q: { fr: "Si vos placements perdaient 20% en un mois, que feriez-vous ?", en: "If your investments lost 20% in one month, what would you do?" },
                options: [
                    { label: { fr: "Je vends tout immédiatement", en: "I sell everything immediately" }, val: "panic", tag: "conservative" },
                    { label: { fr: "J'attends sans rien faire", en: "I wait and do nothing" }, val: "wait", tag: "moderate" },
                    { label: { fr: "J'achète davantage (opportunité)", en: "I buy more (opportunity)" }, val: "buy", tag: "aggressive" }
                ]
            },
            {
                q: { fr: "Où sont principalement vos placements actuels ?", en: "Where are your current investments mostly?" },
                options: [
                    { label: { fr: "Compte épargne / CPG à la banque", en: "Savings account / GIC at bank" }, val: "bank", tag: "bank_only" },
                    { label: { fr: "Fonds communs de placement", en: "Mutual funds" }, val: "funds", tag: "diversified" },
                    { label: { fr: "Actions / FNB / Courtage en ligne", en: "Stocks / ETFs / Online brokerage" }, val: "direct", tag: "active" },
                    { label: { fr: "Aucun placement", en: "No investments" }, val: "none", tag: "beginner" }
                ]
            }
        ],
        buildResult: function (answers, lang) {
            var tags = answers.map(function (a) { return a.tag; });
            var fr = "", en = "";

            if (tags.indexOf("conservative") > -1 && tags.indexOf("short") > -1) {
                fr = "🛡️ **Profil Prudent** — Votre tolérance au risque est faible et votre horizon est court. Des placements sécuritaires comme les CPG et obligations à court terme seraient plus appropriés.";
                en = "🛡️ **Conservative Profile** — Your risk tolerance is low and your horizon is short. Safe investments like GICs and short-term bonds would be more appropriate.";
            } else if (tags.indexOf("aggressive") > -1 && tags.indexOf("long") > -1) {
                fr = "🚀 **Profil Audacieux** — Avec un horizon long et une bonne tolérance au risque, une stratégie de croissance agressive avec une forte exposition aux actions pourrait maximiser vos rendements.";
                en = "🚀 **Aggressive Profile** — With a long horizon and good risk tolerance, an aggressive growth strategy with high equity exposure could maximize your returns.";
            } else if (tags.indexOf("bank_only") > -1 || tags.indexOf("beginner") > -1) {
                fr = "💡 **Potentiel inexploité** — Vos épargnes à la banque rapportent probablement moins que l'inflation. Un portefeuille diversifié adapté à votre profil pourrait améliorer significativement vos rendements.";
                en = "💡 **Untapped potential** — Your bank savings are likely earning less than inflation. A diversified portfolio tailored to your profile could significantly improve your returns.";
            } else {
                fr = "⚖️ **Profil Équilibré** — Un portefeuille mixte (actions + obligations) adapté à votre horizon et tolérance serait optimal pour vous.";
                en = "⚖️ **Balanced Profile** — A mixed portfolio (stocks + bonds) suited to your horizon and tolerance would be optimal for you.";
            }

            fr += "\n\nNos conseillers en placement peuvent construire un portefeuille sur mesure.";
            en += "\n\nOur investment advisors can build a custom portfolio for you.";
            return lang === 'en' ? en : fr;
        }
    },

    // ════════════════════════════════════════
    // 5. PROTECTION (ASSURANCE) — based on existing quiz
    // ════════════════════════════════════════
    insurance: {
        title: { fr: "🛡️ Bilan de Protection", en: "🛡️ Protection Assessment" },
        intro: {
            fr: "Identifions vos vulnérabilités financières en quelques questions.",
            en: "Let's identify your financial vulnerabilities in a few questions."
        },
        questions: [
            {
                q: { fr: "Qui dépend financièrement de vous ?", en: "Who depends on you financially?" },
                options: [
                    { label: { fr: "Enfants mineurs (< 18 ans)", en: "Minor children (< 18)" }, val: "kids", tag: "kids" },
                    { label: { fr: "Conjoint(e) seulement", en: "Spouse only" }, val: "spouse", tag: "spouse" },
                    { label: { fr: "Parents à charge", en: "Dependent parents" }, val: "parents", tag: "parents" },
                    { label: { fr: "Personne (célibataire)", en: "No one (single)" }, val: "solo", tag: "solo" }
                ]
            },
            {
                q: { fr: "Comment votre hypothèque est-elle assurée ?", en: "How is your mortgage insured?" },
                options: [
                    { label: { fr: "Assurance de la banque", en: "Bank insurance" }, val: "bank", tag: "bank_ins" },
                    { label: { fr: "Assurance personnelle", en: "Personal insurance" }, val: "personal", tag: "pers_ins" },
                    { label: { fr: "Pas assurée", en: "Not insured" }, val: "none", tag: "no_ins" },
                    { label: { fr: "Aucune hypothèque", en: "No mortgage" }, val: "no_mort", tag: "no_debt" }
                ]
            },
            {
                q: { fr: "Combien de temps tenez-vous sans revenu ?", en: "How long can you last without income?" },
                options: [
                    { label: { fr: "Moins de 1 mois", en: "Less than 1 month" }, val: "critical", tag: "critical" },
                    { label: { fr: "1 à 3 mois", en: "1 to 3 months" }, val: "med", tag: "at_risk" },
                    { label: { fr: "Plus de 6 mois", en: "More than 6 months" }, val: "safe", tag: "safe" }
                ]
            },
            {
                q: { fr: "Avez-vous une assurance invalidité personnelle ?", en: "Do you have personal disability insurance?" },
                options: [
                    { label: { fr: "Non, aucune", en: "No, none" }, val: "none", tag: "no_disab" },
                    { label: { fr: "Oui, via l'employeur (collective)", en: "Yes, through employer (group)" }, val: "group", tag: "group_only" },
                    { label: { fr: "Oui, police personnelle", en: "Yes, personal policy" }, val: "personal", tag: "protected" }
                ]
            }
        ],
        buildResult: function (answers, lang) {
            var tags = answers.map(function (a) { return a.tag; });
            var fr = "", en = "";

            if (tags.indexOf("kids") > -1 && (tags.indexOf("no_ins") > -1 || tags.indexOf("critical") > -1)) {
                fr = "🔴 **Vulnérabilité critique** — Avec des enfants à charge et un coussin financier insuffisant, votre famille est exposée. En cas de décès ou d'invalidité, le niveau de vie de vos enfants serait directement compromis.";
                en = "🔴 **Critical vulnerability** — With dependent children and insufficient financial cushion, your family is exposed. In case of death or disability, your children's standard of living would be directly compromised.";
            } else if (tags.indexOf("bank_ins") > -1) {
                fr = "⚠️ **Risque identifié** — L'assurance hypothécaire de la banque protège la BANQUE, pas votre famille. Le montant diminue avec le solde, et vous perdez la couverture si vous changez de prêteur.";
                en = "⚠️ **Risk identified** — Bank mortgage insurance protects the BANK, not your family. The amount decreases with the balance, and you lose coverage if you switch lenders.";
            } else if (tags.indexOf("no_disab") > -1 && tags.indexOf("critical") > -1) {
                fr = "🔴 **Urgence** — Sans assurance invalidité et avec moins d'un mois de liquidités, un arrêt de travail mènerait rapidement à l'endettement ou à la faillite.";
                en = "🔴 **Emergency** — Without disability insurance and with less than a month of liquidity, a work stoppage would quickly lead to debt or bankruptcy.";
            } else {
                fr = "📋 **Révision recommandée** — Votre situation comporte des aspects à optimiser. Un audit complet avec un conseiller permettrait d'identifier les trous dans votre protection.";
                en = "📋 **Review recommended** — Your situation has areas to optimize. A full audit with an advisor would identify gaps in your protection.";
            }

            fr += "\n\nNos experts en assurance peuvent réaliser un bilan de protection complet et gratuit.";
            en += "\n\nOur insurance experts can perform a complete and free protection assessment.";
            return lang === 'en' ? en : fr;
        }
    },

    // ════════════════════════════════════════
    // 6. COMPTABILITÉ
    // ════════════════════════════════════════
    accounting: {
        title: { fr: "📒 Diagnostic Comptable", en: "📒 Accounting Diagnostic" },
        intro: {
            fr: "Évaluons la santé de votre gestion comptable.",
            en: "Let's evaluate the health of your accounting management."
        },
        questions: [
            {
                q: { fr: "Comment gérez-vous votre comptabilité actuellement ?", en: "How do you currently manage your accounting?" },
                options: [
                    { label: { fr: "Je fais tout moi-même (Excel / papier)", en: "I do everything myself (Excel / paper)" }, val: "diy", tag: "diy" },
                    { label: { fr: "Logiciel comptable (QuickBooks, Sage, etc.)", en: "Accounting software (QuickBooks, Sage, etc.)" }, val: "software", tag: "software" },
                    { label: { fr: "Comptable externe", en: "External accountant" }, val: "external", tag: "external" },
                    { label: { fr: "Comptable interne (employé)", en: "Internal accountant (employee)" }, val: "internal", tag: "internal" }
                ]
            },
            {
                q: { fr: "Vos déclarations fiscales sont-elles à jour ?", en: "Are your tax filings up to date?" },
                options: [
                    { label: { fr: "Oui, tout est à jour", en: "Yes, everything is current" }, val: "current", tag: "compliant" },
                    { label: { fr: "En retard d'une année", en: "One year behind" }, val: "late1", tag: "late" },
                    { label: { fr: "En retard de 2+ années", en: "2+ years behind" }, val: "late2", tag: "very_late" }
                ]
            },
            {
                q: { fr: "Quel type d'entité avez-vous ?", en: "What type of entity do you have?" },
                options: [
                    { label: { fr: "Travailleur autonome / Individu", en: "Self-employed / Individual" }, val: "solo", tag: "solo" },
                    { label: { fr: "Société incorporée", en: "Incorporated company" }, val: "inc", tag: "corp" },
                    { label: { fr: "Plusieurs entités (holding + opérante)", en: "Multiple entities (holding + operating)" }, val: "multi", tag: "complex" }
                ]
            }
        ],
        buildResult: function (answers, lang) {
            var tags = answers.map(function (a) { return a.tag; });
            var fr = "", en = "";

            if (tags.indexOf("very_late") > -1) {
                fr = "🔴 **Urgence fiscale** — Des retards de 2+ ans exposent votre entreprise à des pénalités importantes de Revenu Québec et de l'ARC. Une régularisation rapide est essentielle.";
                en = "🔴 **Tax emergency** — Delays of 2+ years expose your business to significant penalties from Revenue Quebec and CRA. Quick regularization is essential.";
            } else if (tags.indexOf("diy") > -1 && tags.indexOf("complex") > -1) {
                fr = "⚠️ **Risque élevé** — Gérer plusieurs entités soi-même augmente considérablement le risque d'erreurs fiscales et de non-conformité. Un accompagnement professionnel est fortement recommandé.";
                en = "⚠️ **High risk** — Managing multiple entities yourself significantly increases risk of tax errors and non-compliance. Professional support is strongly recommended.";
            } else if (tags.indexOf("diy") > -1) {
                fr = "💡 **Temps à récupérer** — En déléguant votre comptabilité, vous pourriez consacrer des dizaines d'heures par mois à développer votre entreprise au lieu de gérer des chiffres.";
                en = "💡 **Time to reclaim** — By delegating your accounting, you could spend dozens of hours per month growing your business instead of managing numbers.";
            } else {
                fr = "📋 **Santé comptable correcte** — Votre gestion semble en ordre. Une révision annuelle pourrait identifier des optimisations fiscales additionnelles.";
                en = "📋 **Accounting health OK** — Your management seems in order. An annual review could identify additional tax optimizations.";
            }

            fr += "\n\nNotre équipe comptable peut évaluer votre situation et proposer des solutions adaptées.";
            en += "\n\nOur accounting team can evaluate your situation and propose tailored solutions.";
            return lang === 'en' ? en : fr;
        }
    },

    // ════════════════════════════════════════
    // 7. PRODUCTIVITÉ INTERNE
    // ════════════════════════════════════════
    productivity: {
        title: { fr: "⚙️ Audit d'Efficacité", en: "⚙️ Efficiency Audit" },
        intro: {
            fr: "Identifions les opportunités d'amélioration dans vos processus.",
            en: "Let's identify improvement opportunities in your processes."
        },
        questions: [
            {
                q: { fr: "Combien d'heures par semaine sont perdues en tâches répétitives ?", en: "How many hours per week are lost on repetitive tasks?" },
                options: [
                    { label: { fr: "Moins de 5h", en: "Less than 5h" }, val: "low", tag: "efficient" },
                    { label: { fr: "5 à 15h", en: "5 to 15h" }, val: "mid", tag: "moderate_waste" },
                    { label: { fr: "Plus de 15h", en: "More than 15h" }, val: "high", tag: "major_waste" }
                ]
            },
            {
                q: { fr: "Utilisez-vous des outils d'automatisation ?", en: "Do you use automation tools?" },
                options: [
                    { label: { fr: "Non, tout est manuel", en: "No, everything is manual" }, val: "manual", tag: "no_auto" },
                    { label: { fr: "Quelques outils basiques", en: "A few basic tools" }, val: "basic", tag: "basic_auto" },
                    { label: { fr: "Oui, plusieurs processus sont automatisés", en: "Yes, several processes are automated" }, val: "auto", tag: "automated" }
                ]
            },
            {
                q: { fr: "Avez-vous des tableaux de bord pour suivre vos KPIs ?", en: "Do you have dashboards to track your KPIs?" },
                options: [
                    { label: { fr: "Non, on navigue à vue", en: "No, we navigate blindly" }, val: "none", tag: "no_kpi" },
                    { label: { fr: "Excel / Google Sheets", en: "Excel / Google Sheets" }, val: "sheets", tag: "basic_kpi" },
                    { label: { fr: "Oui, tableaux de bord automatisés", en: "Yes, automated dashboards" }, val: "auto", tag: "advanced_kpi" }
                ]
            }
        ],
        buildResult: function (answers, lang) {
            var tags = answers.map(function (a) { return a.tag; });
            var fr = "", en = "";

            if (tags.indexOf("major_waste") > -1 && tags.indexOf("no_auto") > -1) {
                fr = "🔴 **Potentiel énorme** — Plus de 15h/semaine perdues sans automatisation, c'est l'équivalent d'un employé à temps partiel gaspillé. L'impact financier est considérable.";
                en = "🔴 **Huge potential** — Over 15h/week wasted without automation is the equivalent of a wasted part-time employee. The financial impact is considerable.";
            } else if (tags.indexOf("no_kpi") > -1) {
                fr = "⚠️ **Angle mort** — Sans indicateurs de performance, vous ne pouvez pas mesurer vos progrès ni identifier rapidement les problèmes. Des tableaux de bord adaptés changeraient la donne.";
                en = "⚠️ **Blind spot** — Without performance indicators, you can't measure progress or quickly identify problems. Custom dashboards would be a game-changer.";
            } else {
                fr = "📋 **Opportunités d'optimisation** — Votre entreprise fonctionne, mais il y a toujours des gains d'efficacité à réaliser. Un audit approfondi peut révéler des économies cachées.";
                en = "📋 **Optimization opportunities** — Your business is running, but there are always efficiency gains to be made. A thorough audit can reveal hidden savings.";
            }

            fr += "\n\nNos consultants en productivité peuvent réaliser un audit complet de vos opérations.";
            en += "\n\nOur productivity consultants can perform a complete audit of your operations.";
            return lang === 'en' ? en : fr;
        }
    },

    // ════════════════════════════════════════
    // 8. ÉVALUATION DE RENTABILITÉ D'ENTREPRISE
    // ════════════════════════════════════════
    business_evaluation: {
        title: { fr: "📈 Diagnostic de Rentabilité", en: "📈 Profitability Diagnostic" },
        intro: {
            fr: "Quelques questions pour cadrer votre besoin d'évaluation.",
            en: "A few questions to frame your evaluation needs."
        },
        questions: [
            {
                q: { fr: "Quel est le contexte de votre évaluation ?", en: "What is the context of your evaluation?" },
                options: [
                    { label: { fr: "Achat d'une entreprise existante", en: "Acquisition of an existing business" }, val: "acquisition", tag: "acquisition" },
                    { label: { fr: "Ajout d'une nouvelle division", en: "Adding a new division" }, val: "division", tag: "new_division" },
                    { label: { fr: "Création d'un nouveau projet", en: "Launching a new venture" }, val: "creation", tag: "startup" },
                    { label: { fr: "Amélioration / vente de mon entreprise", en: "Improving / selling my business" }, val: "internal", tag: "internal_review" }
                ]
            },
            {
                q: { fr: "Quelle est la taille du projet ou de l'entreprise concernée ?", en: "What is the size of the project or business involved?" },
                options: [
                    { label: { fr: "Moins de 500 000 $ de chiffre d'affaires", en: "Under $500K revenue" }, val: "small", tag: "small_proj" },
                    { label: { fr: "Entre 500 000 $ et 5 M$", en: "Between $500K and $5M" }, val: "mid", tag: "mid_proj" },
                    { label: { fr: "Plus de 5 M$", en: "Over $5M" }, val: "large", tag: "large_proj" }
                ]
            },
            {
                q: { fr: "Avez-vous des données financières prêtes à analyser ?", en: "Do you have financial data ready to analyze?" },
                options: [
                    { label: { fr: "Oui, états financiers complets", en: "Yes, full financial statements" }, val: "full", tag: "data_ready" },
                    { label: { fr: "Partiellement (quelques chiffres)", en: "Partially (some figures)" }, val: "partial", tag: "partial_data" },
                    { label: { fr: "Non, à construire", en: "No, needs to be built" }, val: "none", tag: "no_data" }
                ]
            }
        ],
        buildResult: function (answers, lang) {
            var tags = answers.map(function (a) { return a.tag; });
            var fr = "", en = "";

            if (tags.indexOf("acquisition") > -1) {
                fr = "🔍 **Contexte d'acquisition** — Une évaluation rigoureuse est essentielle avant un achat. Nous analyserons la rentabilité réelle, la valeur juste, et les risques cachés du dossier.";
                en = "🔍 **Acquisition context** — Rigorous evaluation is essential before a purchase. We will analyze actual profitability, fair value, and hidden risks.";
            } else if (tags.indexOf("startup") > -1 || tags.indexOf("new_division") > -1) {
                fr = "🚀 **Validation de viabilité** — Pour un nouveau projet ou une nouvelle division, nous bâtirons des projections réalistes et identifierons les conditions de succès.";
                en = "🚀 **Viability validation** — For a new venture or new division, we will build realistic projections and identify success conditions.";
            } else if (tags.indexOf("internal_review") > -1) {
                fr = "💡 **Optimisation interne** — Comprendre la véritable rentabilité de votre entreprise permet de mieux la valoriser ou de cibler les leviers d'amélioration.";
                en = "💡 **Internal optimization** — Understanding your business's real profitability lets you better value it or target improvement levers.";
            } else {
                fr = "📊 **Évaluation sur mesure** — Chaque mandat est unique. Nous adapterons l'analyse à votre contexte spécifique et à vos objectifs.";
                en = "📊 **Tailored evaluation** — Every mandate is unique. We will adapt the analysis to your specific context and objectives.";
            }

            if (tags.indexOf("no_data") > -1) {
                fr += "\n\n⚠️ **Données à construire** — Sans états financiers prêts, la première étape sera de bâtir un dossier financier propre avant l'analyse.";
                en += "\n\n⚠️ **Data to build** — Without ready financials, the first step will be to construct a clean financial dossier before analysis.";
            }

            fr += "\n\nUn conseiller en sécurité financière de JC Capital peut vous accompagner dans cette évaluation.";
            en += "\n\nA JC Capital financial security advisor can support you through this evaluation.";
            return lang === 'en' ? en : fr;
        }
    },

    // ════════════════════════════════════════
    // 9. FINANCEMENT
    // ════════════════════════════════════════
    financing: {
        title: { fr: "🏦 Évaluation de Financement", en: "🏦 Financing Assessment" },
        intro: {
            fr: "Voyons quel type de financement correspond à vos besoins.",
            en: "Let's see what type of financing matches your needs."
        },
        questions: [
            {
                q: { fr: "Quel est l'objectif de votre financement ?", en: "What is the purpose of your financing?" },
                options: [
                    { label: { fr: "Achat/expansion d'entreprise", en: "Business purchase/expansion" }, val: "biz", tag: "business" },
                    { label: { fr: "Immobilier (résidentiel ou commercial)", en: "Real estate (residential or commercial)" }, val: "real", tag: "real_estate" },
                    { label: { fr: "Fonds de roulement", en: "Working capital" }, val: "wc", tag: "working_cap" },
                    { label: { fr: "Équipement / machinerie", en: "Equipment / machinery" }, val: "equip", tag: "equipment" }
                ]
            },
            {
                q: { fr: "Quel montant recherchez-vous approximativement ?", en: "What amount are you approximately looking for?" },
                options: [
                    { label: { fr: "Moins de 100 000 $", en: "Less than $100,000" }, val: "small", tag: "small" },
                    { label: { fr: "100 000 $ – 500 000 $", en: "$100,000 – $500,000" }, val: "mid", tag: "mid_amount" },
                    { label: { fr: "500 000 $ – 2 M$", en: "$500,000 – $2M" }, val: "large", tag: "large" },
                    { label: { fr: "Plus de 2 M$", en: "Over $2M" }, val: "vlarge", tag: "major" }
                ]
            },
            {
                q: { fr: "Avez-vous des garanties à offrir ?", en: "Do you have collateral to offer?" },
                options: [
                    { label: { fr: "Oui, immobilier", en: "Yes, real estate" }, val: "realestate", tag: "strong_collat" },
                    { label: { fr: "Oui, actifs d'entreprise", en: "Yes, business assets" }, val: "assets", tag: "biz_collat" },
                    { label: { fr: "Non, aucune garantie", en: "No, no collateral" }, val: "none", tag: "no_collat" }
                ]
            }
        ],
        buildResult: function (answers, lang) {
            var tags = answers.map(function (a) { return a.tag; });
            var fr = "", en = "";

            if (tags.indexOf("no_collat") > -1 && (tags.indexOf("large") > -1 || tags.indexOf("major") > -1)) {
                fr = "⚠️ **Défi de financement** — Un montant élevé sans garanties rend le financement traditionnel difficile. Des alternatives comme les subventions gouvernementales, le capital-risque ou le financement mezzanine pourraient être explorées.";
                en = "⚠️ **Financing challenge** — A large amount without collateral makes traditional financing difficult. Alternatives like government grants, venture capital, or mezzanine financing could be explored.";
            } else if (tags.indexOf("real_estate") > -1) {
                fr = "🏠 **Financement immobilier** — Nos courtiers hypothécaires peuvent vous obtenir les meilleurs taux et conditions, que ce soit pour du résidentiel ou du commercial.";
                en = "🏠 **Real estate financing** — Our mortgage brokers can get you the best rates and terms, whether for residential or commercial.";
            } else if (tags.indexOf("working_cap") > -1) {
                fr = "💰 **Fonds de roulement** — Une marge de crédit d'exploitation ou un prêt à court terme pourrait stabiliser vos flux de trésorerie. Nous pouvons négocier les meilleures conditions.";
                en = "💰 **Working capital** — An operating line of credit or short-term loan could stabilize your cash flow. We can negotiate the best terms.";
            } else {
                fr = "📋 **Solutions disponibles** — Selon votre profil, plusieurs options de financement s'offrent à vous. Un montage financier adapté peut optimiser vos coûts d'emprunt.";
                en = "📋 **Solutions available** — Based on your profile, several financing options are available. Tailored financial structuring can optimize your borrowing costs.";
            }

            fr += "\n\nNos spécialistes en financement peuvent monter votre dossier et négocier les meilleures conditions.";
            en += "\n\nOur financing specialists can prepare your file and negotiate the best terms.";
            return lang === 'en' ? en : fr;
        }
    },

    // ════════════════════════════════════════
    // 10. PATRIMOINE AGRICOLE
    // ════════════════════════════════════════
    agricultural: {
        title: { fr: "🌾 Bilan Agricole", en: "🌾 Agricultural Assessment" },
        intro: {
            fr: "Évaluons la santé de votre planification agricole.",
            en: "Let's assess the health of your agricultural planning."
        },
        questions: [
            {
                q: { fr: "Quel type d'exploitation avez-vous ?", en: "What type of operation do you have?" },
                options: [
                    { label: { fr: "Production laitière", en: "Dairy production" }, val: "dairy", tag: "dairy" },
                    { label: { fr: "Production végétale (grandes cultures)", en: "Crop production (field crops)" }, val: "crops", tag: "crops" },
                    { label: { fr: "Production animale (autre que laitier)", en: "Animal production (non-dairy)" }, val: "animal", tag: "animal" },
                    { label: { fr: "Mixte / Diversifié", en: "Mixed / Diversified" }, val: "mixed", tag: "mixed" }
                ]
            },
            {
                q: { fr: "Avez-vous un plan de relève ?", en: "Do you have a succession plan?" },
                options: [
                    { label: { fr: "Oui, en cours d'exécution", en: "Yes, in progress" }, val: "active", tag: "has_plan" },
                    { label: { fr: "Oui, mais pas encore commencé", en: "Yes, but not started yet" }, val: "planned", tag: "planned" },
                    { label: { fr: "Non, pas de relève identifiée", en: "No, no successor identified" }, val: "none", tag: "no_plan" },
                    { label: { fr: "Non applicable (début d'exploitation)", en: "N/A (starting operation)" }, val: "new", tag: "new_farmer" }
                ]
            },
            {
                q: { fr: "Vos actifs agricoles sont-ils évalués récemment ?", en: "Have your farm assets been recently valued?" },
                options: [
                    { label: { fr: "Oui, moins de 3 ans", en: "Yes, less than 3 years" }, val: "recent", tag: "valued" },
                    { label: { fr: "Non, jamais évalués formellement", en: "No, never formally valued" }, val: "never", tag: "not_valued" },
                    { label: { fr: "Évaluation périmée (5+ ans)", en: "Outdated valuation (5+ years)" }, val: "old", tag: "stale" }
                ]
            }
        ],
        buildResult: function (answers, lang) {
            var tags = answers.map(function (a) { return a.tag; });
            var fr = "", en = "";

            if (tags.indexOf("no_plan") > -1 && tags.indexOf("not_valued") > -1) {
                fr = "🔴 **Situation préoccupante** — Sans plan de relève ni évaluation, votre patrimoine agricole est vulnérable. Un décès ou accident pourrait forcer une vente en urgence à perte.";
                en = "🔴 **Concerning situation** — Without a succession plan or valuation, your agricultural assets are vulnerable. A death or accident could force an emergency sale at a loss.";
            } else if (tags.indexOf("dairy") > -1 && tags.indexOf("no_plan") > -1) {
                fr = "⚠️ **Quotas à risque** — La valeur de vos quotas laitiers représente un actif majeur. Sans planification, le transfert peut entraîner des conséquences fiscales considérables.";
                en = "⚠️ **Quotas at risk** — Your dairy quota value represents a major asset. Without planning, the transfer can trigger considerable tax consequences.";
            } else if (tags.indexOf("new_farmer") > -1) {
                fr = "🌱 **Démarrage** — Les programmes de subvention comme la FADQ et les crédits aux jeunes agriculteurs peuvent faciliter votre établissement. Une planification financière solide est essentielle dès le départ.";
                en = "🌱 **Getting started** — Grant programs like FADQ and young farmer credits can support your establishment. Solid financial planning is essential from the start.";
            } else {
                fr = "📋 **Révision recommandée** — Votre exploitation est établie mais une planification proactive protégera votre patrimoine et optimisera la fiscalité agricole.";
                en = "📋 **Review recommended** — Your operation is established but proactive planning will protect your assets and optimize agricultural taxation.";
            }

            fr += "\n\nNos spécialistes en patrimoine agricole connaissent les particularités de votre secteur.";
            en += "\n\nOur agricultural wealth specialists understand the particularities of your sector.";
            return lang === 'en' ? en : fr;
        }
    }
};
