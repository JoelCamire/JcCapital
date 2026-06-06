# JC Planner — Logiciel de planification financière

> Outil **privé** à usage interne. Non relié au site public `jccapital.ca`
> (exclu via `robots.txt` + balise `noindex`). Aucune donnée n'est transmise
> à un serveur : tout est calculé dans le navigateur et stocké en `localStorage`.
> Synchronisation multi-appareils optionnelle et gratuite via un **gist privé GitHub**.

Une application de planification financière complète, multi-juridiction et
ultra-visuelle, dans l'esprit d'Equisoft mais conçue pour combler ses lacunes :
moteur fiscal réel, projections déterministes **et** Monte Carlo cohérentes,
et bascule instantanée du pays/région où s'effectue la planification.

## Lancer

Aucune étape de compilation. C'est une application web statique en modules ES.

- En ligne : `https://jccapital.ca/app/` (non indexé)
- En local : servir le dossier racine, ex. `python3 -m http.server` puis ouvrir `/app/`

## Fonctionnalités

> 🌐 **Bilingue FR / EN** — bascule instantanée via le sélecteur de langue
> (barre latérale ou Paramètres). Toute l'interface, les recommandations et
> les formats de nombres/dates s'adaptent.

| Module | Description |
|--------|-------------|
| **Mes clients** | Page d’accueil : galerie de tous les dossiers — créer/ouvrir/renommer/dupliquer/supprimer un client, recherche, sauvegarde et restauration (JSON) |
| **Tableau de bord** | KPIs, projection de valeur nette, jauge de préparation, recommandations automatiques |
| **Bilan de santé financière** | Revue automatisée de tout le dossier : pointage par domaine (retraite, fiscalité, protection, succession, dettes, entreprise), cote globale A–E et **plan d'action priorisé** |
| **Décaissement optimal** | Comparateur d'ordres de retrait à la retraite (non-enr. d'abord, **fonte du REER**, préserver le CELI) modélisant les minimums FERR et la **récupération de la PSV** → impôt à vie et succession nette |
| **Relève d'entreprise** | Voies de sortie (tiers, transfert familial avec EGC multipliée, MBO), mécanismes de transaction, liste de préparation |
| **Avantages sociaux** | Coût total d'un employé, régimes collectifs (REER coll./RPDB vs RPA), compte de gestion santé, catégories d'avantages et traitement fiscal |
| **Profil client (KYC)** | Infos personnelles complètes, personnes à charge, bénéficiaires, documents juridiques, professionnels, indice de complétude |
| **Ménage** | Membres, revenus (emploi, rentes, prestations), dépenses avec facteur retraite |
| **Bilan** | Actifs (selon les comptes de la juridiction), passifs, répartition fiscale |
| **Flux de trésorerie** | Projection annuelle détaillée, composition des entrées/sorties |
| **Retraite** | Scénario interactif (curseurs en direct), décaissement fiscalement optimisé |
| **Monte Carlo** | 200–3000 trajectoires, bandes de percentiles, probabilité de succès |
| **Fiscalité** | Calculateur d'impôt en temps réel, taux marginal/moyen, comparaison régionale |
| **Objectifs** | Suivi du financement + **suggestions personnalisées** générées à partir du profil complet (fonds d'urgence, REEE par enfant, max CELI/REER, dettes, testament, assurance…), ajout en 1 clic |
| **Assurance** | Analyse des besoins vie + invalidité, écart de couverture |
| **Succession** | Impôts au décès estimés par juridiction, stratégies |
| **Entreprise & société** | **Cœur du métier** : salaire vs dividende (intégration CCPC), impôt corporatif (DPE, érosion par revenu passif, IMRTD), report d'impôt corp vs personnel, évaluation par multiples, **vente d'entreprise & exonération cumulative des gains en capital (EGC)**, stratégies (CDC, RRI, TOSI, gel successoral). Adapté US (société S / QBI / §1202) et UK (corp tax / dividendes / BADR) |
| **Actions accréditives & PearTree** | Actions minières d'exploration : déduction FEC/CEE 100 %, CIEM/METC fédéral + provincial, et **méthode PearTree** (don d'actions accréditives : crédit de don + exonération du gain → coût net pouvant approcher zéro). Équivalents US (QOZ/§1202) et UK (EIS/SEIS) |
| **Stratégies d'assurance** | **Assurance corporative & CDC** (sortie libre d'impôt), **Régime de retraite assuré (RRA/IRP)**, **Arrangement de financement immédiat (AFI/IFA)**, dimensionnement convention de rachat / personne clé / égalisation successorale |
| **Structures avancées** | **Prêt au taux prescrit** (fractionnement), **gel successoral + fiducie familiale** (multiplication de l'EGC entre bénéficiaires), **Holdco à deux paliers** (purification AAPE, protection des créanciers), **RCA / convention de retraite**, + IPP, fiducie en faveur de soi-même, etc. |
| **Rémunération en actions** | Options & UAR : SPCC (report + déduction 50 %), société publique, ISO (AMT)/NSO, EMI — impôt et net après impôt |
| **Immobilier locatif** | Analyse d'immeuble : taux de capitalisation, rendement cash-on-cash, DSCR, levier, projection valeur/solde/avoir, récupération d'amortissement |
| **Transfrontalier** | Snowbirds : test de présence importante (SPT) aux É.-U., jours de résidence, exposition à l'impôt successoral américain, CELI/PFIC/FBAR |
| **Départ du Canada** | Impôt de départ (disposition réputée à la JVM), biens exclus, report par garantie, majoration à l'arrivée |
| **Conformité & échéances** | Calendrier fiscal par juridiction (REER, T1/T2, acomptes, TFSA/ISA, RMD…) avec jours restants |
| **Comparateur de stratégies** | « Valeur du conseil » : impact combiné avant/après de stratégies activables (max CELI, fractionnement, report RRQ, réduction des dépenses…) sur valeur nette, impôt à vie et probabilité de succès |
| **Crypto & actifs alternatifs** | Suivi des avoirs, répartition, fiscalité (gain en capital vs revenu d'entreprise CA, court/long terme US, pooling UK), impôt à la disposition |
| **Philanthropie** | Don de titres cotés vs argent (élimination du gain en capital), regroupement (bunching), DAF vs fondation privée, don d'assurance/CDC |
| **REEI & invalidité** | Subventions (SCEI jusqu'à 300 %) et bons (BCEI), projection, effet de levier gouvernemental, CIPH, fiducie Henson, comptes ABLE (US) |
| **Budget mensuel** | Règle 50/30/20, répartition des dépenses, simulateur d'équilibre, gestion de trésorerie |
| **Achat vs location** | Comparaison avoir net acheter vs louer-et-investir, point mort, sensibilité appréciation/rendement |
| **Soins de longue durée** | Projection du coût des soins (domicile/résidence/CHSLD), longévité, auto-financement vs assurance SLD |
| **Suivi du patrimoine** | Instantanés datés de la valeur nette, courbe d'évolution dans le temps |
| **Lissage fiscal pluriannuel** | Lit la projection réelle pour repérer les fenêtres à faible/haut taux marginal (réaliser ou reporter le revenu) |
| **Comparateur de frais** | FNB à faible coût vs fonds communs — impact composé des frais sur des décennies (puise dans le portefeuille) |
| **Comparateur d'assurance** | Temporaire vs vie entière vs T100, et « acheter temporaire et investir la différence » (BTID) |
| **Boîte à outils** | Calculatrices rapides : intérêt composé, règle de 72, capacité hypothécaire, REER vs CELI, valeur actuelle/future, coût d'opportunité |
| **Décision d'incorporation** | Entreprise individuelle vs SPCC : report d'impôt, seuil de rentabilité, protection d'actifs |
| **Travailleur autonome** | RRQ double cotisation, TPS/TVQ (méthode rapide), acomptes provisionnels, déductions véhicule/bureau |
| **Planification agricole** | EGC biens agricoles (~1,25 M$), roulement intergénérationnel, AgriInvest, quotas, caisse vs exercice |
| **Crédit RS&DE** | Crédit d'impôt R&D fédéral (35 % remboursable SPCC) + provincial |
| **Trésorerie d'entreprise** | Fonds de roulement, runway de liquidités, réserve d'exploitation |
| **Capacité d'emprunt** | Ratio de couverture du service de la dette (DSCR), prêt maximal |
| **Dettes & hypothèque** | Tableaux d'amortissement, stratégies avalanche/boule de neige, accélération hypothécaire |
| **Portefeuille** | Répartition d'actifs vs cible, frais (MER) et drague sur 25 ans, rééquilibrage, questionnaire de tolérance au risque |
| **Scénarios & stress** | Tests de résistance (krach, faibles rendements, inflation, longevité, décès, invalidité) + comparateur |
| **Optimisation fiscale** | Fractionnement du revenu, REER vs CELI, emplacement d'actifs, ordre de décaissement, Roth/meltdown |
| **Prestations publiques** | Analyse de l'âge de demande RRQ/PSV/Social Security (point mort), récupération de la PSV |
| **Études** | Financement par enfant (coût futur, cotisation requise, subventions, progression) |
| **Échéancier de vie** | Frise chronologique des étapes financières + agenda |
| **Rapports** | Rapport de plan financier imprimable / PDF, bilingue |
| **Paramètres** | Bascule juridiction, hypothèses économiques, import/export, dossiers |

## Multi-juridiction (le cœur du projet)

Changer de pays/région dans la barre supérieure recharge automatiquement :
les **barèmes d'imposition** (fédéral + régional), les **cotisations sociales**,
les **comptes enregistrés** (REER/CELI/CELIAPP/REEE ↔ 401(k)/IRA/Roth/HSA/529 ↔
Pension/ISA/LISA), les **prestations publiques** et les **règles successorales**.

Juridictions livrées :
- 🇨🇦 **Canada** — Féd. + QC, ON, BC, AB (abattement Québec, surtaxe Ontario, RRQ/RPC, PSV, FERR…)
- 🇺🇸 **États-Unis** — Féd. + CA, NY, TX, FL, WA (LTCG, NIIT, FICA, RMD…)
- 🇬🇧 **Royaume-Uni** — Angleterre/Pays-de-Galles + Écosse (taper d'allocation perso., NI, IHT…)

### Ajouter une juridiction

1. Créer `src/jurisdictions/<pays>.js` exportant un objet au même schéma que `ca.js`.
2. L'enregistrer dans `src/jurisdictions/index.js` (`JURISDICTIONS`).

Tout le reste (UI, comparateurs, projections) s'adapte automatiquement.

## Architecture

```
app/
├── index.html               Coquille + chargement du module racine
├── styles/                   tokens.css (thème clair/sombre) + app.css
└── src/
    ├── main.js               Shell, navigation, routeur par hash
    ├── state/                store.js (persistance), models.js (données + exemple)
    ├── jurisdictions/        Registre + modules de lois fiscales par pays
    ├── engine/               tax · projection · montecarlo · analysis
    └── ui/                   dom · charts (SVG sans dépendance) · widgets · vues
```

Les calculs (`engine/` + `jurisdictions/` + `state/models.js`) sont purs et
testables hors navigateur.

## Avertissement

Outil d'aide à la planification à des fins de modélisation. Les barèmes,
plafonds et règles sont des paramètres approximatifs (année 2025) et doivent
être validés contre les sources officielles avant toute recommandation.
