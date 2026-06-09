# Rapport — Enrichissement Schema.org sur les sous-pages

Date : 2026-05-21
Auteur : Claude (Opus 4.7)

## Vue d'ensemble

Schema.org JSON-LD ajouté dans le `<head>` de chacune des 8 sous-pages du site JC Capital (`pages/*.html`) afin de maximiser le référencement Google et la visibilité dans les moteurs IA (ChatGPT, Claude, Perplexity, Gemini).

Tous les schémas :
- sont en français canadien (`inLanguage: "fr-CA"`) ;
- référencent les entités centralisées de `index.html` via leur `@id` (`#business`, `#joel`, `#website`, `#organization`) au lieu de dupliquer l'info ;
- sont validés JSON (parsing OK, 8/8) ;
- ont été insérés AVANT les feuilles de style/scripts pour priorité d'indexation.

## Détail page par page

### 1. `pages/team.html` — ProfilePage + Person enrichi
- `ProfilePage` pointant vers `#joel`.
- `Person @id=#joel` enrichi : description longue (4 phrases), `birthPlace: "Québec, Canada"`, `nationality: Canada`, `gender: Male`, `workLocation` → `#business`.
- `hasCredential` : 3 entrées (AMF assurance de personnes, AMF épargne collective Canada, CSI).
- `award` : 3 inscriptions/certifications professionnelles.
- `knowsAbout` : 15 expertises listées.
- `affiliation` : AMF, CSI, SFL Gestion de patrimoine.
- `alumniOf` : **omis** (université non précisée — rien d'inventé).

### 2. `pages/about.html` — AboutPage + Organization
- `AboutPage` avec `mainEntity` → `#business`.
- `Organization @id=#organization` rappelée avec `memberOf` SFL.
- `primaryImageOfPage` pointant vers le logo.

### 3. `pages/events.html` — CollectionPage + ItemList (wrapper)
- `CollectionPage` (page collection d'événements).
- `ItemList @id=#eventslist` avec `numberOfItems: 0` et `itemListElement: []`.
- **Aucun Event individuel n'a été créé** : les événements présents dans le JS sont marqués `// Fake Event Data` dans le code source — ne pas générer de Schema Event factice (risque de SEO négatif si Google détecte des données non vérifiables). Quand les vrais événements seront publiés, remplir `itemListElement` avec des objets `Event`.

### 4. `pages/compound.html` — WebApplication (Calculateur d'intérêts composés)
- `@type: WebApplication`, `applicationCategory: FinanceApplication`.
- `featureList` : 7 fonctionnalités (intérêts composés, REER/CELI/non-enregistré, Chart.js, etc.).
- `offers` : gratuit (`price: "0"`, `priceCurrency: CAD`).
- `audience` : épargnants, investisseurs, entrepreneurs.

### 5. `pages/tax.html` — WebApplication (Estimateur d'économies fiscales)
- `@type: WebApplication`, sous-catégorie « Calculateur fiscal ».
- `featureList` : 7 features (impôts personnels QC, SPCC, comparaison TA vs incorpo, fractionnement salaire/dividendes, etc.).
- `offers` : gratuit.
- `audience` : entrepreneurs, travailleurs autonomes, professionnels incorporés.

### 6. `pages/mortgage.html` — WebApplication (Simulateur payer/investir)
- `@type: WebApplication`, sous-catégorie « Calculateur hypothécaire et de placement ».
- `featureList` : 6 features (comparaison remboursement vs placement, paramètres ajustables, Chart.js, REER/CELI).
- `offers` : gratuit.
- `audience` : propriétaires, acheteurs résidentiels, épargnants.

### 7. `pages/assurance.html` — WebApplication (Bilan de protection financière)
- `@type: WebApplication`, sous-catégorie « Évaluation des besoins en assurance ».
- `featureList` : 6 features (questionnaire, identification vulnérabilités, recommandations, envoi par courriel).
- `about` : 4 sujets — assurance vie, invalidité, maladies graves, soins de longue durée.
- `offers` : gratuit.

### 8. `pages/faq.html` — FAQPage (60 questions)
- **Microdata existante VALIDÉE** : `itemscope itemtype="https://schema.org/FAQPage"` (ligne 759) + `accordion-item itemscope itemprop="mainEntity" itemtype="https://schema.org/Question"` (ligne 1203) + `acceptedAnswer` (ligne 1208) toujours en place dans le HTML rendu par `renderQuestions()`.
- **JSON-LD statique ajouté** dans le `<head>` en complément : un seul `FAQPage` regroupant les **60 questions/réponses** (français) extraites du tableau `faqData` (catégories : fiscalité personnelle, fiscalité d'entreprise, retraite, assurance, placement, transfert d'entreprise, patrimoine agricole, à propos JC Capital).
- Cohérence vérifiée : 60 questions dans le JS = 60 dans le JSON-LD.
- Le JSON-LD garantit l'indexation immédiate par Google et les crawlers IA, sans dépendre de l'exécution du JS.

## Spec respectée

- `inLanguage: "fr-CA"` : présent dans tous les schémas.
- `isPartOf: { @id: https://jccapital.ca/#website }` : présent dans toutes les nouvelles pages.
- `publisher: { @id: https://jccapital.ca/#business }` : présent dans toutes les nouvelles pages.
- Pas de duplication des entités `#business`/`#joel` (référencées par `@id`).
- Aucune information inventée : `alumniOf` Joël laissé vide, événements factices non sérialisés.

## Validation technique

Tous les blocs JSON-LD parsent correctement (validation Python `json.loads`) :

```
OK [team.html] block #1 parsed (5141 chars)
OK [about.html] block #1 parsed (1522 chars)
OK [events.html] block #1 parsed (1338 chars)
OK [compound.html] block #1 parsed (2027 chars)
OK [tax.html] block #1 parsed (2045 chars)
OK [mortgage.html] block #1 parsed (2089 chars)
OK [assurance.html] block #1 parsed (2388 chars)
OK [faq.html] block #1 parsed (52469 chars)
```

## Pour aller plus loin (non fait dans ce passage)

- Quand les vrais événements seront publiés sur `events.html`, remplir l'`ItemList` avec des objets `Event` (Schema Event : `name`, `startDate`, `endDate`, `location`, `eventStatus`, `eventAttendanceMode`, `organizer` → `#business`).
- Ajouter `alumniOf` au schéma Person de Joël quand l'université du bacc sera confirmée.
- Tester chaque page sur le [Google Rich Results Test](https://search.google.com/test/rich-results) avant déploiement.
- Ajouter aussi le BreadcrumbList par page (Accueil > Sous-page) pour le fil d'Ariane SEO.
