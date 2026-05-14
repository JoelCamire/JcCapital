/**
 * JC Chat - Knowledge Base
 * Contains all company info, services, details, audience, and FAQ data
 */
window.JC_CHAT_DATA = {
    company: {
        name: "JC Capital",
        phone: "+1 (581) 398-6747",
        email: "admin@jccapital.ca",
        address: "825 Blvd. Lebourgneuf, Suite 500, QC, CA",
        bookingAnchor: "#booking",
        hours: { fr: "Sur rendez-vous", en: "By appointment" },
        credentials: { fr: "Inscrit auprès de l'AMF", en: "Registered with the AMF" }
    },

    services: [
        {
            id: "tax_optimization",
            name: { fr: "Optimisation fiscale", en: "Tax Optimization" },
            description: {
                fr: "Nous offrons des stratégies pour minimiser l'impact fiscal et maximiser vos revenus nets. Cela inclut l'analyse de votre structure corporative, l'optimisation du mix salaire vs dividendes, et le report d'impôt.",
                en: "We offer strategies to minimize tax impact and maximize your net income. This includes analysis of your corporate structure, optimizing salary vs dividend mix, and tax deferral."
            },
            details: {
                fr: "Notre approche en optimisation fiscale comprend :\n\n• **Analyse de structure corporative** — Société de gestion, fiducie familiale, société opérante\n• **Mix salaire vs dividendes** — Calcul du ratio optimal selon votre situation\n• **Report et fractionnement d'impôt** — Stratégies légales pour réduire l'impact fiscal\n• **Crédits et déductions** — Identification de toutes les opportunités fiscales\n• **Planification de fin d'année** — Optimisation pré-décembre pour maximiser les économies",
                en: "Our tax optimization approach includes:\n\n• **Corporate structure analysis** — Holding company, family trust, operating company\n• **Salary vs dividend mix** — Calculating the optimal ratio for your situation\n• **Tax deferral and income splitting** — Legal strategies to reduce tax impact\n• **Credits and deductions** — Identifying all tax opportunities\n• **Year-end planning** — Pre-December optimization to maximize savings"
            },
            audience: {
                fr: "Ce service est idéal pour :\n\n• Les **entrepreneurs et travailleurs autonomes** qui veulent payer moins d'impôt légalement\n• Les **propriétaires de PME** cherchant à optimiser leur structure\n• Les **professionnels incorporés** (médecins, avocats, ingénieurs)\n• Toute personne avec un **revenu de 80 000 $+** cherchant des stratégies fiscales",
                en: "This service is ideal for:\n\n• **Entrepreneurs and self-employed** who want to legally pay less tax\n• **SME owners** looking to optimize their structure\n• **Incorporated professionals** (doctors, lawyers, engineers)\n• Anyone with **$80,000+ income** seeking tax strategies"
            },
            faq: [
                {
                    q: { fr: "Devrais-je m'incorporer ?", en: "Should I incorporate?" },
                    a: {
                        fr: "L'incorporation devient avantageuse lorsque vos revenus dépassent vos besoins de coût de vie. Nos spécialistes peuvent analyser votre situation spécifique lors d'une consultation.",
                        en: "Incorporation becomes advantageous when your income exceeds your cost-of-living needs. Our specialists can analyze your specific situation during a consultation."
                    }
                },
                {
                    q: { fr: "Comment optimiser salaire vs dividendes ?", en: "How to optimize salary vs dividends?" },
                    a: {
                        fr: "Le salaire permet de cotiser au RRQ et de créer de l'espace REER, tandis que les dividendes évitent les charges sociales. L'équilibre optimal dépend de vos objectifs — une consultation permettrait de déterminer la meilleure stratégie pour vous.",
                        en: "Salary allows QPP contributions and creates RRSP room, while dividends avoid payroll taxes. The optimal balance depends on your goals — a consultation would help determine the best strategy for you."
                    }
                }
            ]
        },
        {
            id: "transfer",
            name: { fr: "Transfert, achat & vente", en: "Transfer, Purchase & Sale" },
            description: {
                fr: "Accompagnement complet pour les transactions d'entreprise : vente, achat, transfert intergénérationnel et relève d'entreprise.",
                en: "Full support for business transactions: sale, purchase, intergenerational transfer and business succession."
            },
            details: {
                fr: "Nos services de transfert incluent :\n\n• **Évaluation d'entreprise** — Déterminer la juste valeur marchande\n• **Transfert intergénérationnel** — Planification pour passer le flambeau à la relève\n• **Achat/vente d'entreprise** — Due diligence, négociation, structuration\n• **Gel successoral** — Figer la valeur actuelle pour la prochaine génération\n• **Convention entre actionnaires** — Protection et planification entre associés",
                en: "Our transfer services include:\n\n• **Business valuation** — Determining fair market value\n• **Intergenerational transfer** — Planning to pass the torch\n• **Business purchase/sale** — Due diligence, negotiation, structuring\n• **Estate freeze** — Freezing current value for the next generation\n• **Shareholder agreements** — Protection and planning between partners"
            },
            audience: {
                fr: "Ce service s'adresse à :\n\n• Les **propriétaires proches de la retraite** souhaitant transférer leur entreprise\n• Les **familles en affaires** planifiant la relève\n• Les **entrepreneurs** qui veulent acheter ou vendre une entreprise\n• Les **associés** souhaitant structurer leur partenariat",
                en: "This service is for:\n\n• **Owners nearing retirement** looking to transfer their business\n• **Family businesses** planning succession\n• **Entrepreneurs** wanting to buy or sell a business\n• **Partners** looking to structure their partnership"
            },
            faq: [
                {
                    q: { fr: "Comment planifier un transfert d'entreprise ?", en: "How to plan a business transfer?" },
                    a: {
                        fr: "Le transfert d'entreprise implique une planification fiscale, juridique et financière. Nous vous accompagnons à chaque étape pour maximiser la valeur et minimiser l'impact fiscal.",
                        en: "Business transfer involves tax, legal, and financial planning. We support you at every step to maximize value and minimize tax impact."
                    }
                }
            ]
        },
        {
            id: "financial_planning",
            name: { fr: "Planification financière", en: "Financial Planning" },
            description: {
                fr: "Préparation de votre avenir financier et de votre retraite. Nous bâtissons un plan personnalisé pour atteindre vos objectifs à long terme.",
                en: "Preparation for your financial future and retirement. We build a personalized plan to achieve your long-term goals."
            },
            details: {
                fr: "Notre planification financière couvre :\n\n• **Bilan financier personnel** — Portrait complet de votre situation actuelle\n• **Projections de retraite** — Combien aurez-vous besoin et quand?\n• **Stratégie REER / CELI / REEE** — Maximiser chaque véhicule d'épargne\n• **Budget et flux de trésorerie** — Optimiser vos dépenses et votre épargne\n• **Protection du patrimoine** — Assurer la pérennité de vos actifs",
                en: "Our financial planning covers:\n\n• **Personal financial assessment** — Complete picture of your current situation\n• **Retirement projections** — How much will you need and when?\n• **RRSP / TFSA / RESP strategy** — Maximizing each savings vehicle\n• **Budget and cash flow** — Optimizing your spending and savings\n• **Wealth protection** — Ensuring the longevity of your assets"
            },
            audience: {
                fr: "Ce service est pour :\n\n• Les **jeunes professionnels** qui veulent bien démarrer\n• Les **familles** planifiant l'éducation des enfants et la retraite\n• Les **travailleurs de 40-55 ans** voulant valider leur trajectoire\n• Toute personne cherchant un **plan financier structuré**",
                en: "This service is for:\n\n• **Young professionals** who want to start right\n• **Families** planning for children's education and retirement\n• **Workers aged 40-55** wanting to validate their trajectory\n• Anyone seeking a **structured financial plan**"
            },
            faq: [
                {
                    q: { fr: "Quand commencer à planifier ma retraite ?", en: "When to start planning for retirement?" },
                    a: {
                        fr: "Le plus tôt possible ! Mais il n'est jamais trop tard. Chaque situation est unique — nos conseillers peuvent évaluer où vous en êtes et créer un plan réaliste.",
                        en: "As early as possible! But it's never too late. Every situation is unique — our advisors can assess where you stand and create a realistic plan."
                    }
                }
            ]
        },
        {
            id: "investment",
            name: { fr: "Placement", en: "Investment" },
            description: {
                fr: "Stratégies de placement structurées pour accélérer la croissance de votre patrimoine, adaptées à votre profil de risque.",
                en: "Structured investment strategies to accelerate wealth growth, tailored to your risk profile."
            },
            details: {
                fr: "Nos services de placement comprennent :\n\n• **Analyse de profil d'investisseur** — Tolérance au risque et objectifs\n• **Portefeuilles diversifiés** — Actions, obligations, fonds communs\n• **Placements fiscalement avantageux** — REER, CELI, compte corporatif\n• **Suivi et rééquilibrage** — Ajustements réguliers selon le marché\n• **Rapports de performance** — Transparence totale sur vos rendements",
                en: "Our investment services include:\n\n• **Investor profile analysis** — Risk tolerance and objectives\n• **Diversified portfolios** — Stocks, bonds, mutual funds\n• **Tax-advantaged investments** — RRSP, TFSA, corporate account\n• **Monitoring and rebalancing** — Regular adjustments based on market\n• **Performance reports** — Full transparency on your returns"
            },
            audience: {
                fr: "Ce service est conçu pour :\n\n• Les **épargnants** cherchant de meilleurs rendements que leur banque\n• Les **entrepreneurs** avec des surplus corporatifs à investir\n• Les **investisseurs** voulant une gestion professionnelle\n• Les **retraités** cherchant des revenus stables",
                en: "This service is designed for:\n\n• **Savers** seeking better returns than their bank\n• **Entrepreneurs** with corporate surplus to invest\n• **Investors** wanting professional management\n• **Retirees** seeking stable income"
            },
            faq: [
                {
                    q: { fr: "Quel type de placements offrez-vous ?", en: "What types of investments do you offer?" },
                    a: {
                        fr: "Nous offrons une gamme de solutions adaptées à votre profil. Pour des recommandations précises, une consultation personnalisée serait idéale.",
                        en: "We offer a range of solutions tailored to your profile. For specific recommendations, a personalized consultation would be ideal."
                    }
                }
            ]
        },
        {
            id: "insurance",
            name: { fr: "Protection (Assurance)", en: "Protection (Insurance)" },
            description: {
                fr: "Assurance vie, invalidité, maladies graves et collective. Nous protégeons ce qui compte le plus pour vous et votre famille.",
                en: "Life, disability, critical illness and group insurance. We protect what matters most to you and your family."
            },
            details: {
                fr: "Nos solutions de protection incluent :\n\n• **Assurance vie** — Temporaire et permanente selon vos besoins\n• **Assurance invalidité** — Protection de votre revenu en cas d'incapacité\n• **Maladies graves** — Montant forfaitaire lors d'un diagnostic\n• **Assurance collective** — Solutions pour vos employés\n• **Assurance prêt** — Protection de vos obligations financières",
                en: "Our protection solutions include:\n\n• **Life insurance** — Term and permanent based on your needs\n• **Disability insurance** — Income protection in case of incapacity\n• **Critical illness** — Lump sum upon diagnosis\n• **Group insurance** — Solutions for your employees\n• **Loan insurance** — Protection of your financial obligations"
            },
            audience: {
                fr: "Ce service est essentiel pour :\n\n• Les **familles** voulant protéger leurs proches financièrement\n• Les **entrepreneurs** dont l'entreprise dépend d'eux\n• Les **employeurs** offrant des avantages sociaux\n• Toute personne avec une **hypothèque ou des dettes**",
                en: "This service is essential for:\n\n• **Families** wanting to protect their loved ones financially\n• **Entrepreneurs** whose business depends on them\n• **Employers** offering employee benefits\n• Anyone with a **mortgage or debts**"
            },
            faq: [
                {
                    q: { fr: "Temporaire ou permanente ?", en: "Term or permanent?" },
                    a: {
                        fr: "La temporaire couvre un besoin qui finira (ex: hypothèque). La permanente est un outil de succession et de stratégie fiscale. La meilleure option dépend de votre situation.",
                        en: "Term covers a need that will end (e.g., mortgage). Permanent is an estate and tax strategy tool. The best option depends on your situation."
                    }
                }
            ]
        },
        {
            id: "accounting",
            name: { fr: "Comptabilité", en: "Accounting" },
            description: {
                fr: "Services comptables rigoureux pour votre entreprise et/ou pour vous personnellement.",
                en: "Rigorous accounting services for your business and/or for yourself."
            },
            details: {
                fr: "Nos services comptables comprennent :\n\n• **Tenue de livres** — Suivi précis de vos revenus et dépenses\n• **États financiers** — Préparation professionnelle de vos bilans\n• **Déclarations d'impôt** — Particuliers et entreprises\n• **TPS/TVQ** — Gestion et production des remises gouvernementales\n• **Paie** — Administration complète de la paie de vos employés",
                en: "Our accounting services include:\n\n• **Bookkeeping** — Accurate tracking of your income and expenses\n• **Financial statements** — Professional preparation of your reports\n• **Tax returns** — Personal and corporate\n• **GST/QST** — Management and filing of government remittances\n• **Payroll** — Complete payroll administration for your employees"
            },
            audience: {
                fr: "Ce service est parfait pour :\n\n• Les **petites et moyennes entreprises** sans comptable interne\n• Les **travailleurs autonomes** qui veulent se concentrer sur leur métier\n• Les **nouveaux entrepreneurs** ayant besoin de structure comptable\n• Les **particuliers** avec des situations fiscales complexes",
                en: "This service is perfect for:\n\n• **Small and medium businesses** without an in-house accountant\n• **Self-employed workers** wanting to focus on their craft\n• **New entrepreneurs** needing accounting structure\n• **Individuals** with complex tax situations"
            },
            faq: []
        },
        {
            id: "productivity",
            name: { fr: "Productivité Interne", en: "Internal Productivity" },
            description: {
                fr: "Analyse et optimisation de vos processus d'affaires pour gagner en efficacité et réduire les coûts.",
                en: "Analysis and optimization of your business processes for greater efficiency and cost reduction."
            },
            details: {
                fr: "Notre approche en productivité comprend :\n\n• **Audit des processus** — Identification des goulots d'étranglement\n• **Automatisation** — Mise en place d'outils pour éliminer les tâches répétitives\n• **Tableaux de bord** — Indicateurs de performance en temps réel\n• **Formation des équipes** — Adoption des nouvelles méthodes\n• **Intégration technologique** — Connexion de vos systèmes existants",
                en: "Our productivity approach includes:\n\n• **Process audit** — Identifying bottlenecks\n• **Automation** — Implementing tools to eliminate repetitive tasks\n• **Dashboards** — Real-time performance indicators\n• **Team training** — Adopting new methods\n• **Technology integration** — Connecting your existing systems"
            },
            audience: {
                fr: "Ce service s'adresse à :\n\n• Les **dirigeants de PME** sentant que leur équipe pourrait être plus efficace\n• Les **entreprises en croissance** dont les processus n'ont pas suivi\n• Les **gestionnaires** cherchant à réduire les coûts opérationnels\n• Toute entreprise voulant **moderniser ses opérations**",
                en: "This service is for:\n\n• **SME leaders** feeling their team could be more efficient\n• **Growing businesses** whose processes haven't kept up\n• **Managers** looking to reduce operational costs\n• Any business wanting to **modernize operations**"
            },
            faq: []
        },
        {
            id: "business_evaluation",
            name: { fr: "Évaluation de rentabilité d'entreprise", en: "Business Profitability Evaluation" },
            description: {
                fr: "Évaluation détaillée de la performance et des indicateurs financiers pour orienter vos décisions stratégiques. Idéal pour l'achat d'entreprise, l'ajout d'une division ou la création d'un nouveau projet.",
                en: "Detailed evaluation of performance and financial indicators to guide your strategic decisions. Ideal for acquiring a business, adding a new division, or launching a new venture."
            },
            details: {
                fr: "Notre processus d'évaluation comprend :\n\n• **Analyse des états financiers** — Bilan, résultats, flux de trésorerie\n• **Indicateurs de rentabilité** — Marges, ROI, EBITDA, ratios clés\n• **Projections financières** — Scénarios optimiste, réaliste, pessimiste\n• **Évaluation de la valeur** — Méthodes multiples (DCF, comparables, actifs)\n• **Identification des risques** — Forces, faiblesses, opportunités, menaces",
                en: "Our evaluation process includes:\n\n• **Financial statement analysis** — Balance sheet, income, cash flow\n• **Profitability metrics** — Margins, ROI, EBITDA, key ratios\n• **Financial projections** — Optimistic, realistic, pessimistic scenarios\n• **Valuation** — Multiple methods (DCF, comparables, asset-based)\n• **Risk identification** — Strengths, weaknesses, opportunities, threats"
            },
            audience: {
                fr: "Ce service est idéal pour :\n\n• Les **acheteurs potentiels** d'une entreprise existante\n• Les **entrepreneurs** envisageant l'ajout d'une nouvelle division\n• Les **fondateurs** validant la viabilité d'un nouveau projet\n• Les **dirigeants** voulant comprendre la véritable valeur de leur entreprise",
                en: "This service is ideal for:\n\n• **Potential buyers** of an existing business\n• **Entrepreneurs** considering adding a new division\n• **Founders** validating the viability of a new venture\n• **Owners** wanting to understand the true value of their business"
            },
            faq: []
        },
        {
            id: "financing",
            name: { fr: "Financement", en: "Financing" },
            description: {
                fr: "Solutions de financement pour vos projets de croissance, que ce soit pour une acquisition, une expansion ou un fonds de roulement.",
                en: "Financing solutions for your growth projects, whether for an acquisition, expansion, or working capital."
            },
            details: {
                fr: "Nos solutions de financement incluent :\n\n• **Prêt commercial** — Financement pour l'achat de biens ou d'équipement\n• **Marge de crédit** — Flexibilité pour votre fonds de roulement\n• **Financement hypothécaire** — Résidentiel et commercial\n• **Subventions gouvernementales** — Identification et demande de programmes disponibles\n• **Montage financier** — Structuration optimale pour vos projets",
                en: "Our financing solutions include:\n\n• **Commercial loan** — Financing for asset or equipment purchases\n• **Line of credit** — Flexibility for your working capital\n• **Mortgage financing** — Residential and commercial\n• **Government grants** — Identifying and applying for available programs\n• **Financial structuring** — Optimal setup for your projects"
            },
            audience: {
                fr: "Ce service est conçu pour :\n\n• Les **entrepreneurs** ayant besoin de capital pour croître\n• Les **acheteurs d'entreprise** cherchant du financement\n• Les **propriétaires immobiliers** voulant refinancer ou acheter\n• Les **startups** en recherche de fonds de démarrage",
                en: "This service is designed for:\n\n• **Entrepreneurs** needing capital to grow\n• **Business buyers** seeking financing\n• **Property owners** looking to refinance or purchase\n• **Startups** looking for seed funding"
            },
            faq: []
        },
        {
            id: "agricultural",
            name: { fr: "Patrimoine agricole", en: "Agricultural Wealth" },
            description: {
                fr: "Accompagnement stratégique pour protéger, optimiser et faire croître la valeur de votre entreprise agricole.",
                en: "Strategic support to protect, optimize and grow the value of your agricultural business."
            },
            details: {
                fr: "Nos services agricoles comprennent :\n\n• **Évaluation du patrimoine agricole** — Terres, quotas, équipements, bâtiments\n• **Planification de la relève** — Transfert aux générations futures\n• **Optimisation fiscale agricole** — Déductions spécifiques au secteur\n• **Gestion des quotas** — Achat, vente et stratégie de quotas\n• **Financement agricole** — Accès aux programmes spécialisés",
                en: "Our agricultural services include:\n\n• **Agricultural wealth assessment** — Land, quotas, equipment, buildings\n• **Succession planning** — Transfer to future generations\n• **Agricultural tax optimization** — Sector-specific deductions\n• **Quota management** — Buying, selling, and quota strategy\n• **Agricultural financing** — Access to specialized programs"
            },
            audience: {
                fr: "Ce service est destiné à :\n\n• Les **producteurs agricoles** de toutes tailles\n• Les **familles agricoles** planifiant la relève\n• Les **jeunes agriculteurs** démarrant leur exploitation\n• Les **investisseurs** intéressés par le secteur agricole",
                en: "This service is for:\n\n• **Agricultural producers** of all sizes\n• **Farm families** planning succession\n• **Young farmers** starting their operation\n• **Investors** interested in the agricultural sector"
            },
            faq: [
                {
                    q: { fr: "Comment planifier la relève agricole ?", en: "How to plan farm succession?" },
                    a: {
                        fr: "La relève agricole nécessite une planification à long terme qui tient compte des aspects fiscaux, financiers et familiaux. Notre équipe spécialisée peut vous accompagner dans cette transition.",
                        en: "Farm succession requires long-term planning that considers tax, financial, and family aspects. Our specialized team can support you through this transition."
                    }
                }
            ]
        }
    ]
};
