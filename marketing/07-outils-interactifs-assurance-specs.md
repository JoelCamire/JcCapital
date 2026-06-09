# Outils interactifs en ligne — Specs détaillées pour la génération de leads assurance

**Version** : 1.0 — document de travail
**Date** : mai 2026
**Auteur** : assistant Claude (à valider par Joël Camiré)
**Cabinet** : JC Capital (Joël Camiré, conseiller en sécurité financière, AMF + CSI, partenariat SFL Gestion de patrimoine)
**Repo cible** : `JoelCamire/JcCapital` (jccapital.ca)
**Stack site existante** : HTML5/CSS3/JS pur, Chart.js, EmailJS, SweetAlert2, GitHub Pages + Cloudflare

---

## Introduction

### Pourquoi des outils interactifs

Les formulaires statiques de génération de leads (« Laissez-nous votre courriel et nous vous contacterons ») convertissent généralement à 1-3 % du trafic qualifié. Les outils interactifs — calculateurs, quiz, simulateurs, audits — convertissent à 8-15 % dans le secteur des services financiers selon plusieurs études sectorielles (HubSpot, Outgrow, ConvertFlow). Le multiple de conversion observé en assurance se situe entre 3× et 5× au-dessus d'un formulaire passif équivalent, pour trois raisons :

1. **Engagement actif** — Le visiteur investit du temps et de l'attention. À la fin du parcours, donner son courriel paraît un échange équitable contre un résultat personnalisé.
2. **Personnalisation perçue** — Un résultat chiffré sur sa propre situation crée un attachement émotionnel beaucoup plus fort qu'un téléchargement générique.
3. **Qualification automatique** — Les réponses fournies pré-segmentent le prospect. Un utilisateur ayant déclaré un revenu de 120 000 $, trois enfants et une hypothèque de 500 000 $ est un lead chaud immédiatement actionnable.

### Funnel typique en assurance de personnes

```
Source de trafic (organique, payant, social)
    ↓
Page de destination de l'outil
    ↓
Engagement avec l'outil (questions / sliders / inputs)
    ↓
Résultat affiché (gratification immédiate)
    ↓
Capture courriel (rapport PDF, comparaison enrichie, etc.)
    ↓
Confirmation + envoi automatisé EmailJS
    ↓
CTA Calendly (consultation 30 min gratuite)
    ↓
Rendez-vous Calendly réservé
    ↓
Rencontre + ABF complète
    ↓
Souscription
```

Les taux observés sur des sites comparables au Québec et en Amérique du Nord :

| Étape | Taux de conversion typique |
|---|---|
| Visiteur → engagement outil | 30-50 % |
| Engagement → complétion | 40-65 % |
| Complétion → courriel donné | 50-75 % |
| Courriel → RDV Calendly | 8-20 % |
| RDV → contrat signé | 25-50 % |

Avec 1000 visiteurs/mois sur un outil bien optimisé, on peut viser 8-25 RDV qualifiés mensuels.

### Conformité AMF/CSF — règles cardinales

Tous les outils décrits dans ce document doivent respecter les obligations suivantes, sans exception :

1. **Disclaimer obligatoire** sur le résultat : « Les estimations fournies ne constituent pas un conseil personnalisé en assurance de personnes ni une recommandation formelle. Une Analyse des Besoins Financiers (ABF) complète, conforme aux normes de l'AMF et de la CSF, est requise pour toute recommandation. »
2. **Inviter à consulter un conseiller inscrit** explicitement dans le résultat.
3. **Aucun prix précis** de prime annoncé. On peut mentionner des fourchettes générales (« généralement entre X et Y »), mais jamais un montant définitif.
4. **Aucune garantie de rendement** ni promesse explicite ou implicite.
5. **Pas d'affirmation comparative** sur la concurrence (CSF article 16).
6. **Mention des titres exacts** : « Joël Camiré, conseiller en sécurité financière inscrit auprès de l'AMF ». Jamais « planificateur financier » tant que IQPF non obtenue.
7. **Respect Loi 25** (loi modernisant les dispositions législatives applicables à la protection des renseignements personnels au Québec) :
   - Avis de collecte explicite avant chaque capture de données personnelles
   - Indication de la finalité (prise de contact + analyse)
   - Droit d'accès, rectification, retrait du consentement
   - Conservation maximale de 3 ans après dernier contact si pas de relation contractuelle, sinon selon les obligations de l'AMF (5-7 ans selon le dossier)
   - Désignation du responsable de la protection des renseignements personnels (Joël Camiré)
   - Lien vers la politique de confidentialité du site
8. **Mention du partenariat SFL** quand pertinent (épargne collective).
9. **Pas d'utilisation du titre Pl.Fin.** Jamais.
10. **Disclaimer juridique additionnel** dans le footer de tous les outils : *« Joël Camiré est conseiller en sécurité financière inscrit auprès de l'AMF. Les services d'épargne collective sont offerts par SFL Placements, cabinet de services financiers. »*

Un bloc de texte standard à insérer en bas de chaque rapport généré sera proposé à l'Outil 1 et réutilisé partout.

---

## Outil 1 — Calculateur du besoin réel d'assurance vie

### Vision

Le calculateur le plus complet du marché québécois francophone, qui dépasse le simple « 10× ton revenu » par une approche triple méthode et un rapport PDF professionnel. C'est l'outil phare. Objectif : devenir la référence Google pour « calculateur assurance vie Québec ».

### Spec UX — parcours utilisateur en 6 étapes

#### Étape 1 — Données personnelles (3 questions)

- **Âge** (slider 18-75)
- **Sexe biologique** (homme / femme) — utilisé seulement pour ajustement statistique d'espérance de vie, message explicatif court
- **Statut familial** (célibataire / conjoint de fait / marié / divorcé / veuf)
- **Présence d'enfants à charge** (oui/non + nombre + âges)

Animation : barre de progression dorée (var(--c-gold)) qui se remplit à chaque question, comme l'outil assurance.html actuel.

#### Étape 2 — Données financières (5 inputs)

- **Revenu annuel brut** (input numérique avec format $ en direct)
- **Revenu annuel net du conjoint** (si applicable, input optionnel)
- **Hypothèque restante** ($ + années restantes)
- **Autres dettes** (auto, marge, cartes — bloc unique en $)
- **Épargne et placements liquides totaux** (REER, CELI, non-enregistré, hors résidence)

#### Étape 3 — Objectifs (4 questions)

- **Combien d'années de revenu souhaitez-vous remplacer pour vos proches ?** (slider 5-30 ans, défaut 15)
- **Souhaitez-vous financer les études postsecondaires de vos enfants ?** (oui à 100 % / oui partiellement / non)
  - Si oui : montant cible par enfant (60 000 $ / 80 000 $ / 100 000 $ — basé sur les coûts moyens université Québec 2026)
- **Souhaitez-vous laisser un legs ou une donation ?** (montant slider 0 à 500 000 $)
- **Voulez-vous couvrir les frais funéraires et impôt au décès estimé ?** (oui/non, défaut oui — calcul automatique)

#### Étape 4 — Résultat avec graphique

Page de résultat affichée en trois zones :

1. **Bloc « Votre besoin estimé »** — chiffre en gros, fourchette basse à haute :
   *« Selon nos trois méthodes de calcul, vous auriez besoin de **375 000 $ à 625 000 $** d'assurance vie. »*

2. **Graphique Chart.js** — barres horizontales empilées montrant la décomposition :
   - Remplacement de revenu : X $
   - Hypothèque : X $
   - Autres dettes : X $
   - Études enfants : X $
   - Frais finaux et impôt : X $
   - Legs souhaité : X $
   - **Moins : épargne actuelle** : – X $
   - **= Besoin net d'assurance** : Y $

3. **Tableau comparatif des trois méthodes** :

| Méthode | Estimation | Force | Limite |
|---|---|---|---|
| DIME | 425 000 $ | Simple, axée dettes | Ignore inflation |
| 10× revenu | 850 000 $ | Universellement reconnu | Trop générique |
| Capitalisation besoins | 525 000 $ | La plus précise | Sensible aux hypothèses |
| **Recommandation pondérée** | **500 000 $ – 650 000 $** | — | — |

#### Étape 5 — Capture courriel pour rapport PDF détaillé

Carte de capture avec :
- Prénom + nom
- Téléphone (validation format québécois 514-XXX-XXXX)
- Courriel (validation regex + autocomplétion domaines populaires QC : videotron.ca, bell.net, gmail.com, hotmail.com, outlook.com, yahoo.ca)
- Case à cocher consentement Loi 25 (obligatoire)
- Case à cocher optionnelle « Je souhaite recevoir l'infolettre mensuelle de JC Capital »

Bouton « Recevoir mon rapport personnalisé » (or sur navy).

#### Étape 6 — Confirmation + CTA Calendly

Page de confirmation avec :
- Message merci personnalisé (« Merci [Prénom], votre rapport est envoyé à [courriel] »)
- Aperçu du rapport (premières sections visibles directement)
- Bouton primaire : **« Réserver une consultation gratuite de 30 minutes »** → ouvre Calendly en iframe ou redirige
- Bouton secondaire : **« Voir mon rapport complet »** → ouvre le PDF généré côté client en téléchargement
- Lien tertiaire : « Partager cet outil avec un proche » (boutons Facebook, LinkedIn, courriel)

### Méthodes de calcul — triple méthode

#### Méthode 1 — DIME (Debt, Income, Mortgage, Education)

Formule :
```
DIME = Dettes + (Revenu × Années à remplacer) + Hypothèque + Études enfants
```

Exemple : Dettes 25 000 $ + (75 000 $ × 10 ans) + Hypothèque 350 000 $ + Études 160 000 $ = 1 285 000 $

**Force** : simple, populaire en Amérique du Nord, facile à expliquer.
**Limite** : ne tient pas compte de l'inflation, du conjoint qui travaille, ni de l'épargne déjà accumulée.

#### Méthode 2 — Multiple de revenu

Formule de base :
```
Besoin = Revenu annuel brut × Multiplicateur
```

Multiplicateur ajusté selon l'âge :
- 18-30 ans : 15× (longue durée à protéger)
- 31-40 ans : 12×
- 41-50 ans : 10×
- 51-60 ans : 7×
- 60+ ans : 5×

**Force** : standard de l'industrie, repris partout.
**Limite** : générique, ne reflète pas la situation familiale.

#### Méthode 3 — Capitalisation des besoins futurs (méthode actuarielle)

Approche en deux temps : calculer la valeur actuelle nette (VAN) des besoins futurs, puis soustraire les ressources existantes.

```
Besoins = Σ [Revenu annuel × (1 + i)^t] / (1 + d)^t pour t = 1 à N
+ Hypothèque restante
+ Études actualisées
+ Frais finaux (10 000 $ – 25 000 $ selon enquête)
+ Impôt au décès estimé (calcul successoral simplifié)
+ Legs souhaité

Moins :
- Épargne et placements liquides actuels
- Capital décès des assurances existantes
- Régimes publics estimés (RRQ décès ~2 500 $ + rente conjoint si applicable)

= Besoin net d'assurance vie
```

Avec :
- i = taux d'inflation (par défaut 2,2 %, ajustable)
- d = taux d'actualisation (par défaut 4,5 %, ajustable)
- N = nombre d'années à remplacer

**Force** : la plus précise, méthode utilisée par les actuaires.
**Limite** : sensible aux hypothèses ; à expliquer pédagogiquement.

#### Combinaison des trois méthodes

Le calculateur affiche une **fourchette recommandée** = moyenne pondérée :
```
Fourchette basse = min(DIME, Capitalisation) × 0,9
Fourchette haute = max(DIME, Multiple) × 1,1
Cible recommandée = moyenne pondérée : 40 % capitalisation + 30 % DIME + 30 % multiple
```

Ceci donne une plage réaliste plutôt qu'un chiffre unique trompeur.

### Spec technique

**Stack**
- HTML5 sémantique + CSS modulaire (tokens.css déjà en place pour les couleurs)
- JavaScript ES6+ vanilla, aucune dépendance framework
- Chart.js (CDN, déjà chargé sur le site)
- EmailJS pour envoi du rapport (service `service_b4f4ooy`, template à créer `template_calc_vie`)
- jsPDF + jsPDF-AutoTable pour génération PDF côté client
- SweetAlert2 pour les notifications utilisateur (déjà en place)

**Structure de fichiers**
```
/pages/calculateur-besoin-assurance-vie.html
/css/calculateur-vie.css (optionnel, sinon inline dans la page)
/js/calculateur-vie.js
/img/calc-vie-og.jpg (visuel Open Graph 1200×630)
```

**Stockage des données**
- Aucune persistance serveur
- Aucun cookie de tracking au-delà du minimum nécessaire
- Données stockées temporairement en mémoire JS pendant la session
- Une fois le courriel envoyé via EmailJS, les données sont purgées du DOM
- Conformité Loi 25 native

**Validation**
- Inputs numériques : regex stricte, fourchettes plausibles (revenu max 5M$, hypothèque max 3M$)
- Téléphone : format québécois XXX-XXX-XXXX
- Courriel : regex RFC + datalist domaines populaires
- Bouton soumission désactivé tant que validation incomplète + consentement

**SEO**
- Title : « Calculateur d'assurance vie 2026 — Combien ai-je besoin ? | JC Capital »
- Meta description : « Calculez gratuitement votre besoin réel d'assurance vie selon 3 méthodes reconnues. Rapport PDF personnalisé en 5 minutes. »
- Schema.org : `WebApplication` + `FinancialProduct` + `Service`
- URL : `/pages/calculateur-besoin-assurance-vie.html` (slug optimisé)
- Hreflang fr/en

**Disclaimer obligatoire** (bas de chaque page, in-app + dans le PDF)

> **Note importante** : Les estimations fournies par ce calculateur sont indicatives et ne constituent pas un conseil personnalisé en assurance de personnes. Une Analyse des Besoins Financiers (ABF) complète, conforme aux normes de l'AMF et de la Chambre de la sécurité financière, est requise pour toute recommandation. Joël Camiré est conseiller en sécurité financière inscrit auprès de l'AMF (no d'inscription disponible sur demande). Aucune souscription d'assurance n'est garantie ; l'assurabilité dépend des conditions médicales, financières et de tarification de chaque assureur.

**Génération PDF**

Document de 4-6 pages incluant :
1. Page couverture (logo JC Capital, nom du client, date)
2. Tableau de synthèse (besoin estimé, fourchette, méthodes)
3. Graphique de décomposition
4. Tableau des trois méthodes détaillé
5. Recommandations narratives par profil (3-4 paragraphes)
6. Page contact + CTA Calendly + disclaimer complet

### Specs visuelles

- **Palette** : navy (`#0F1B2D`) en arrière-plan, gold (`#C6AC8F`) pour accents, beige clair pour texte
- **Typographie** : Outfit (déjà chargée), 300/400/600/700
- **Animations** : fadeIn 0.4s sur changement de question, slide-in horizontal sur résultat, spin doré sur loader
- **Iconographie** : Font Awesome 6 (déjà chargé) — icônes shield, dollar, chart, family, etc.
- **Glass panels** : utiliser la classe `.glass-panel` existante du site
- **Mobile-first** : breakpoint à 768 px, tout testé sur iPhone SE (375 px de large)

### Estimation effort développement

| Tâche | Heures |
|---|---|
| Wireframes + design final | 4 |
| Intégration HTML/CSS | 6 |
| Logique JS (questions, navigation, validation) | 8 |
| Calculs des 3 méthodes + tests unitaires | 6 |
| Graphique Chart.js + tableau | 3 |
| Génération PDF (jsPDF) | 6 |
| Capture courriel + EmailJS template | 2 |
| SEO, schema.org, méta-données | 1 |
| Tests cross-browser + mobile | 3 |
| Disclaimer + révision conformité | 1 |
| **Total** | **40 heures** |

Fourchette globale : **30-40 heures** selon polish désiré.

---

## Outil 2 — Quiz « Êtes-vous assez assuré ? »

### Vision

Quiz court, ludique, partageable, qui donne un score d'assurance personnel sur 100. Format inspiré des quiz BuzzFeed mais avec une rigueur professionnelle. Cible : 5-7 minutes max pour compléter.

### Spec UX

- 15 questions à choix multiples
- Barre de progression visible
- Score affiché à la fin avec catégorie (Sous-assuré / Adéquat / Bien protégé / Possiblement sur-assuré)
- Recommandations personnalisées par catégorie
- Capture courriel optionnelle pour PDF détaillé
- CTA Calendly

### Les 15 questions

**Q1. Quel est votre âge ?**
- Moins de 30 ans (2 pts)
- 30-45 ans (5 pts max protection nécessaire)
- 46-60 ans (4 pts)
- Plus de 60 ans (3 pts)

**Q2. Avez-vous des personnes financièrement dépendantes de vous ?**
- Aucune (0 pt)
- Conjoint(e) seulement (3 pts)
- Conjoint + enfants (5 pts)
- Enfants seulement (4 pts)
- Parents ou proches dépendants (3 pts)

**Q3. Possédez-vous une hypothèque ou d'autres dettes importantes ?**
- Aucune dette (0 pt nécessaire pour cette dimension)
- Moins de 100 000 $ (1 pt)
- 100 000 $ à 300 000 $ (3 pts)
- 300 000 $ à 600 000 $ (4 pts)
- Plus de 600 000 $ (5 pts)

**Q4. Avez-vous une assurance vie individuelle (hors employeur) ?**
- Oui, plus de 500 000 $ (+ 5 pts au score actuel)
- Oui, entre 100 000 $ et 500 000 $ (+ 3 pts)
- Oui, moins de 100 000 $ (+ 1 pt)
- Non (+ 0 pt)

**Q5. Votre assurance vie collective d'employeur représente combien de fois votre salaire ?**
- 1× ou moins (+ 1 pt)
- 2× à 3× (+ 2 pts)
- Plus de 3× (+ 3 pts)
- Je ne sais pas (+ 0 pt — signal de mauvaise connaissance)
- Aucune assurance collective (+ 0 pt)

**Q6. Avez-vous une assurance invalidité (hors employeur) ?**
- Oui, individuelle complète (+ 5 pts)
- Oui, mais seulement par l'employeur (+ 2 pts)
- Non (+ 0 pt — gros risque)
- Je ne sais pas (+ 0 pt)

**Q7. Si vous deveniez incapable de travailler 6 mois, combien de temps tiendriez-vous financièrement ?**
- Indéfiniment (épargne ou revenu passif suffisant) (+ 5 pts)
- Plus d'un an (+ 4 pts)
- 3 à 12 mois (+ 2 pts)
- Moins de 3 mois (+ 0 pt — vulnérabilité majeure)

**Q8. Avez-vous une assurance maladies graves ?**
- Oui (+ 3 pts)
- Non, mais je connais le produit (+ 1 pt)
- Non et je ne connais pas (+ 0 pt)

**Q9. Y a-t-il des antécédents de cancer, AVC ou infarctus dans votre famille proche avant 60 ans ?**
- Non (+ 1 pt)
- Oui, un cas (+ 0 pt — signal de risque)
- Oui, plusieurs cas (– 1 pt — sous-protection critique si pas d'AMG)
- Je ne sais pas (+ 0 pt)

**Q10. Quel est votre revenu annuel brut ?**
- Moins de 40 000 $ (+ 1 pt)
- 40 000 $ à 80 000 $ (+ 2 pts)
- 80 000 $ à 150 000 $ (+ 3 pts)
- Plus de 150 000 $ (+ 4 pts — besoin de protection élevée)

**Q11. Êtes-vous travailleur autonome ou propriétaire d'entreprise ?**
- Salarié seulement (+ 0 pt)
- Travailleur autonome (+ 0 pt mais flag de risque)
- Propriétaire incorporé sans associés (+ 0 pt + flag)
- Propriétaire avec associés (+ 0 pt + flag convention)

**Q12. Avez-vous fait une révision de vos protections dans les 3 dernières années ?**
- Oui, il y a moins d'un an (+ 4 pts)
- Oui, il y a 1 à 3 ans (+ 2 pts)
- Non, jamais ou plus de 3 ans (+ 0 pt)

**Q13. Connaissez-vous le montant exact d'assurance vie nécessaire selon une analyse formelle ?**
- Oui, j'ai eu une ABF récente (+ 3 pts)
- J'ai une estimation grossière (+ 1 pt)
- Non, je devine (+ 0 pt)

**Q14. Si vous décédiez demain, sauriez-vous où trouver tous vos contrats d'assurance ?**
- Oui, dossier organisé (+ 2 pts)
- À peu près (+ 1 pt)
- Non, ce serait compliqué (+ 0 pt — flag organisation successorale)

**Q15. Quelle est votre principale préoccupation aujourd'hui ?**
- Protéger ma famille en cas de décès
- Sécuriser mon revenu en cas d'invalidité
- Me protéger contre une maladie grave
- Optimiser fiscalement mes assurances corporatives
- Planifier ma succession et mon legs
- Je ne sais pas par où commencer

(Pas de points, mais utilisée pour personnaliser les recommandations finales.)

### Logique de scoring

- Score maximum théorique : ~60 points
- Conversion en /100 par règle de trois
- Catégorisation :

| Score /100 | Catégorie | Couleur | Message |
|---|---|---|---|
| 0-30 | Sous-assuré critique | Rouge | « Vous êtes dans une situation à risque. Plusieurs vulnérabilités majeures non couvertes. » |
| 31-55 | Protection partielle | Orange | « Vous avez un début de couverture, mais des trous importants subsistent. » |
| 56-75 | Protection adéquate | Or | « Votre couverture est bonne mais perfectible. Une révision permettrait des gains. » |
| 76-100 | Protection optimale | Vert | « Bravo. Votre couverture semble solide. Une vérification triennale reste recommandée. » |

### Recommandations personnalisées

Selon la catégorie + la réponse à Q15, afficher un texte personnalisé de 3-5 paragraphes avec :
- 2 à 4 actions concrètes prioritaires
- Estimation du « coût d'inaction » (sans chiffres précis, formulation prudente)
- CTA Calendly « Discutons-en gratuitement 30 minutes »

### Conformité

Disclaimer affiché AVANT le score :
> « Ce quiz n'est pas un conseil personnalisé en assurance. Il s'agit d'un outil de sensibilisation qui aide à identifier des zones de vulnérabilité. Pour une recommandation formelle, une Analyse des Besoins Financiers complète est requise. »

Et après le score, lien direct vers le calculateur Outil 1 pour analyse approfondie.

### Spec technique

- Stack identique à Outil 1
- Pas de PDF généré (gratification immédiate, capture courriel optionnelle pour recevoir un rapport résumé)
- Format mobile prioritaire — 70 % du trafic quiz vient du mobile
- Partage social one-click via Web Share API + fallback boutons FB/LinkedIn/Courriel

### Estimation effort

| Tâche | Heures |
|---|---|
| Wireframe + design | 2 |
| Intégration HTML/CSS | 4 |
| Logique JS (15 questions, scoring, branches) | 5 |
| Page de résultat + recommandations dynamiques | 4 |
| Capture courriel optionnelle + EmailJS | 1 |
| Boutons partage social | 1 |
| Tests mobile + conformité | 2 |
| Animation, polish | 1 |
| **Total** | **20 heures** |

Fourchette : **15-25 heures**.

---

## Outil 3 — Comparateur Temporaire vs Permanente

### Vision

Visualiser de façon claire et interactive la différence entre une police d'assurance vie temporaire (T-10, T-20, T-30) et une police permanente (Vie entière, T-100, universelle). Outil pédagogique qui aide le client à comprendre — et donc à valoriser le conseil. Idéal pour les clients qui ont déjà cherché en ligne et hésitent.

### Spec UX

Page unique avec :

**Section 1 — Inputs utilisateur (sliders et radios)**
- Âge actuel (slider 18-70)
- Sexe (homme/femme — impact tarification)
- Statut tabagique (non-fumeur / ancien fumeur / fumeur)
- Profil santé général (excellent / standard / risque accru)
- Montant souhaité de couverture (slider 100 000 $ – 2 000 000 $)
- Horizon de protection souhaité (slider 10-50 ans, défaut 25 ans)

**Section 2 — Sortie visuelle (Chart.js)**

Trois graphiques empilés :

1. **Coût annuel de la prime** (barres comparatives 4 produits)
   - T-10
   - T-20
   - T-30
   - Vie entière payable 20 ans

2. **Coût cumulé sur la durée d'horizon** (courbes empilées)
   - Permet de voir le « point de bascule » où le permanent devient comparable

3. **Valeur de rachat de la permanente** (courbe croissante)
   - Démontrer la valeur d'épargne intégrée

**Section 3 — Tableau récapitulatif**

| Critère | T-10 | T-20 | T-30 | Permanente |
|---|---|---|---|---|
| Prime annuelle estimée | $$ | $$ | $$ | $$$$ |
| Total payé sur horizon | $$ | $$$ | $$$$ | $$$$ |
| Valeur de rachat à 65 ans | – | – | – | $$$ |
| Couverture après horizon | Aucune | Aucune | Aucune | À vie |
| Reconvertible | Souvent oui | Souvent oui | Souvent oui | N/A |

**Section 4 — Scénarios « What if »**

3 boutons rapides qui ajustent les paramètres :
- « Et si je change d'avis dans 15 ans ? »
- « Et si ma santé se détériore ? »
- « Et si je veux laisser un héritage ? »

Chaque scénario charge un message contextuel + ajuste le graphique en surlignant la métrique pertinente.

**Section 5 — Recommandation pondérée**

Selon les inputs, un encadré or affiche :
*« Pour votre profil, une combinaison **T-20 (400 000 $) + Vie entière (100 000 $)** serait probablement optimale. Discutons-en. »*

**Section 6 — Capture + Calendly**

Bouton « Recevoir cette comparaison en PDF » → capture courriel → envoi automatique + ouverture Calendly.

### Spec technique

**Inputs**
- 6 sliders/radios principaux
- Calcul en temps réel à chaque modification (debounce 200 ms)

**Outputs**
- 3 charts Chart.js avec animation à la modification
- Tableau HTML formaté
- Bloc texte de recommandation

**Tarification estimative**

Important : utiliser des **fourchettes générales basées sur des moyennes publiques**, pas de prix précis d'un assureur. Disclaimer obligatoire :
> « Les primes affichées sont des estimations basées sur des moyennes du marché 2026 et ne constituent pas une offre. Les primes réelles dépendent de la tarification individuelle de chaque assureur après examen médical. »

Coefficients de tarification approximatifs (à valider avec une table actuarielle simplifiée) :
- T-10 : 0,05-0,15 % du capital par année selon âge
- T-20 : 0,08-0,25 %
- T-30 : 0,12-0,35 %
- Vie entière 20 ans : 1,2-3,5 % du capital
- Ajustements : fumeur ×1,8-2,5, sexe (femme ×0,75-0,90), santé risque ×1,3-2,5

### Spec visuelle

- Glassmorphism cohérent avec le reste du site
- Couleurs distinctives par produit (temporaire en cyan, permanente en or)
- Animations sur les graphiques (Chart.js animation : 800 ms ease-out)
- Mode mobile : graphiques en pile verticale, scroll horizontal sur tableau

### Estimation : 25-35 heures

| Tâche | Heures |
|---|---|
| Wireframe + UX | 3 |
| Intégration HTML/CSS | 5 |
| Logique JS (sliders, calculs temps réel) | 5 |
| Tarification estimative (tables) | 4 |
| Chart.js × 3 graphiques | 6 |
| Tableau récap + scénarios | 3 |
| Capture courriel + EmailJS | 1 |
| PDF de comparaison | 4 |
| Tests + conformité | 2 |
| **Total** | **33 heures** |

---

## Outil 4 — Bilan de protection financière express (existant — à enrichir)

### État actuel (constat de `pages/assurance.html`)

L'outil existant à `/pages/assurance.html` est déjà très complet :
- 20 questions avec logique conditionnelle
- Algorithme de scoring par axe (Vie, Invalidité, Maladie grave, Corporatif)
- Capture courriel + EmailJS opérationnel
- Rapport généré dynamiquement avec tableau de bord (capital décès, rente DI, montant MG, budget)
- Disclaimer AMF présent
- Validation des inputs solide

**Forces actuelles :**
- Architecture JS modulaire avec questions en tableau (`questions = [...]`)
- Logique conditionnelle (`condition: (a) => ...`)
- Calculs séparés par axe avec tableau de priorisation par score
- Section corporative pour entrepreneurs/incorporés
- Note de conformité présente
- Bonne intégration Calendly

**Limites identifiées :**
- Pas de génération PDF du rapport (impression navigateur seulement)
- Pas de bouton « Réserver une consultation » directement vers Calendly
- L'outil mélange un peu vie et invalidité ; pourrait être segmenté
- Pas de visuel graphique (Chart.js) sur le rapport — seulement du texte
- Antécédents médicaux limités à 1 question
- Pas de question sur soins de longue durée (SLD)
- Pas de re-relance ; un visiteur qui ferme sans donner courriel est perdu

### Améliorations suggérées

#### Amélioration 1 — Ajouter section invalidité enrichie
- Ajouter 2 questions : profession (cols blancs/cols bleus/spécialisée) et durée souhaitée de prestation (2 ans / 5 ans / âge 65)
- Impact direct sur recommandation du type de contrat (« profession habituelle » vs « toute occupation »)

#### Amélioration 2 — Ajouter section maladies graves enrichie
- Question sur antécédents personnels (cancer guéri ? hypertension ? diabète ?)
- Question sur tabagisme (déjà absente du Q actuel)
- Permet une recommandation MG vs T-10/T-20

#### Amélioration 3 — Ajouter section soins de longue durée (SLD)
- 3-4 questions ciblées sur l'âge et la situation
- Recommandation produit SLD selon profil

#### Amélioration 4 — Améliorer le rapport final
- Ajouter un graphique Chart.js (radar avec 4 axes : Vie / Invalidité / MG / SLD)
- Génération PDF côté client (jsPDF)
- Logo JC Capital sur le PDF
- Footer disclaimer complet et signature

#### Amélioration 5 — Optimiser le funnel
- Ajouter un bouton « Réserver Calendly maintenant » EN PREMIER sur la page rapport
- Mettre le téléchargement PDF en deuxième
- Ajouter un encart « Le saviez-vous ? » avec mini-statistique pertinente
- Réduire la friction de la capture courriel (téléphone optionnel et non obligatoire ?)
- Email de re-relance automatisé J+1, J+3, J+7 (via MailerLite ou ActiveCampaign — intégration future)

#### Amélioration 6 — Ajouter un mode « accélérée »
- Bouton « Version express (5 questions, 1 min) » qui réduit le questionnaire pour les gens pressés
- Mène à un rapport simplifié avec invitation à compléter la version longue

#### Amélioration 7 — Sauvegarder l'état
- LocalStorage (avec consentement) pour permettre de reprendre un questionnaire interrompu
- Lien magique par courriel pour revenir à son état (optionnel, plus complexe)

#### Amélioration 8 — Améliorer la conformité Loi 25
- Bouton « Politique de confidentialité » bien visible
- Avis de collecte structuré au-dessus du formulaire de capture
- Lien pour retrait de consentement après coup

### Estimation effort (améliorations)

| Amélioration | Heures |
|---|---|
| 1. Section invalidité enrichie | 1,5 |
| 2. Section maladies graves enrichie | 1,5 |
| 3. Section soins de longue durée | 2 |
| 4. Rapport amélioré (Chart.js + PDF) | 4 |
| 5. Funnel optimisé | 2 |
| 6. Mode express | 2 |
| 7. LocalStorage | 1 |
| 8. Conformité Loi 25 renforcée | 1 |
| **Total** | **15 heures** |

Fourchette : **10-15 heures** pour le bloc complet, scope ajustable.

---

## Outil 5 — Calculateur de la valeur économique d'une vie humaine

### Vision

Outil sérieux, intellectuel, qui calcule la valeur économique présente d'une vie humaine en termes financiers — une approche inspirée de la doctrine actuarielle et de l'économie du travail. Public cible : entrepreneurs, professionnels, cadres supérieurs, médecins, avocats. Différenciation forte sur le marché québécois ; positionnement « advisor's advisor » de JC Capital.

### Spec UX

Page unique mais en quatre temps successifs :

**Étape 1 — Inputs personnels**
- Âge actuel
- Revenu annuel brut (et net si différent significativement)
- Taux d'imposition marginal effectif (lookup automatique selon revenu + province)
- Statut conjoint (impact sur frais finaux et soutien)
- Nombre de personnes à charge + âges

**Étape 2 — Hypothèses économiques (ajustables)**
- Espérance de vie active (par défaut : âge actuel à 65 ans, modifiable jusqu'à 75)
- Taux de croissance annuel du revenu (défaut 2,5 % réel)
- Taux d'inflation (défaut 2,2 %)
- Taux d'actualisation (défaut 4,5 %, ajustable)
- Pourcentage du revenu alloué au ménage (défaut 70 %)

**Étape 3 — Composantes additionnelles**
- Valeur estimée du soutien familial non monétaire (garde, gestion, soins) en heures × taux horaire
- Frais d'éducation des enfants
- Frais funéraires et de succession (15 000 $ – 30 000 $)
- Impôt successoral estimé (calcul simplifié sur gains en capital REER/non-enr.)

**Étape 4 — Résultat avec graphique en cascade (waterfall)**

Graphique Chart.js de type cascade :

```
Valeur brute des revenus futurs actualisés      +  X $
Soutien familial actualisé                       +  X $
Éducation enfants                                +  X $
Frais finaux + impôt                             +  X $
                                                 =  Y $ valeur économique totale

Moins épargne actuelle                            – X $
Moins capital décès des assurances existantes     – X $
Moins prestations publiques (RRQ décès, etc.)     – X $
                                                 =  Z $ besoin d'assurance théorique
```

Texte explicatif :
*« Selon une approche actuarielle, votre valeur économique se situe à environ Y dollars. Une couverture d'assurance vie de Z dollars permettrait de remplacer cette valeur si votre situation l'exigeait. »*

**Étape 5 — Comparaison avec le marché**

Bloc qui montre :
*« Pour quelqu'un de votre profil démographique, le besoin d'assurance théorique se situe entre A et B dollars selon notre base de données. Vous êtes [au-dessus / dans / sous] cette plage. »*

(Sans données précises ni claims légalement risqués — formulation prudente.)

**Étape 6 — Capture + analyse approfondie**

Bouton « Recevoir le rapport actuariel détaillé (12 pages) » → capture courriel.
PDF généré inclut : explication méthodologique, tableaux de calcul, comparaisons, recommandations.

### Différenciation et positionnement

- **Audience ciblée** : professionnels (médecins, avocats, ingénieurs, dentistes), entrepreneurs, cadres supérieurs (revenu > 150 000 $)
- **Ton** : académique mais accessible, ton respectueux de l'intelligence du lecteur
- **Vocabulaire** : « valeur économique », « actualisation », « espérance de revenu actif », « capital humain »
- **Positionnement** : outil de réflexion (pas de pure conversion), démontre expertise approfondie de JC Capital
- **Effet secondaire** : crée du contenu SEO autour de mots-clés rares mais à forte valeur

### Spec technique

- Mêmes outils que les autres (HTML/CSS/JS, Chart.js, jsPDF, EmailJS)
- Sliders ajustables avec mémoire d'état (chaque slider met à jour le résultat en temps réel)
- Tooltips pédagogiques sur chaque concept (« Qu'est-ce qu'un taux d'actualisation ? »)
- PDF actuariel : 10-12 pages, mise en page « rapport d'analyse »

### Estimation : 30-40 heures

| Tâche | Heures |
|---|---|
| Recherche actuarielle + validation des formules | 4 |
| Wireframe + design (ton rapport) | 4 |
| Intégration HTML/CSS | 6 |
| Logique JS (calculs en cascade, tooltips) | 8 |
| Chart.js waterfall personnalisé | 4 |
| PDF actuariel mise en page | 8 |
| Capture courriel + EmailJS | 1 |
| Tests + conformité | 2 |
| **Total** | **37 heures** |

---

## Outil 6 — Match Maker assurance (interactif)

### Vision

Quiz lifestyle court (3-4 min), format inspiré des quiz BuzzFeed mais avec une vraie rigueur en arrière-plan. Résultat amusant qui révèle un « profil d'assuré » et la police idéale. Forte viralité sociale possible. Différenciation : sérieux vs ludique.

### Concept

8-10 questions lifestyle qui semblent légères mais qui révèlent en réalité des critères pertinents pour la recommandation d'assurance. À la fin, le visiteur reçoit un « profil » (avec un nom amusant mais respectueux) et une recommandation de produit.

### Les profils possibles (6-8)

1. **Le Bâtisseur** — Entrepreneur ambitieux, jeune famille, hypothèque, dettes à gérer. Recommandation : T-30 + AI individuelle.
2. **La Sentinelle** — Professionnelle cadre, sans enfant, focus carrière, voyages. Recommandation : AMG + AI complète.
3. **Le Capitaine** — Cadre supérieur ou entrepreneur établi, conjoint, enfants ados, succession à planifier. Recommandation : T-20 + Vie entière + SLD.
4. **L'Architecte** — Couple sans enfants, double revenu, retraite anticipée visée. Recommandation : AMG + Vie entière modeste.
5. **Le Patriarche / La Matriarche** — 55+ ans, patrimoine constitué, optimisation successorale. Recommandation : T-100 + assurance fiscale CDC.
6. **Le Voyageur** — Jeune adulte, célibataire, peu de dettes, futur incertain. Recommandation : T-10 économique convertible.
7. **Le Cultivateur** — Producteur agricole, terre + équipement, famille. Recommandation : convention agricole + personne clé.
8. **Le Pionnier** — Travailleur autonome débutant, revenu variable, peu d'épargne. Recommandation : AI prioritaire + T-10 abordable.

### Spec UX

**Questions style lifestyle (10 questions)**

**Q1. Le matin, vous êtes plutôt :**
- Café noir et liste de tâches structurée
- Smoothie vert et entraînement à 6h
- Réveil tardif et brainstorm créatif
- Direction le bureau / atelier dès l'aube

**Q2. Votre situation familiale ressemble à :**
- Couple sans enfants en mode optimisation
- Famille avec jeunes enfants en mode logistique
- Famille avec ados en mode négociation
- Vol solo épanoui

**Q3. Votre relation à l'argent :**
- Investisseur passionné, je suis les marchés
- Pragmatique, je veux que ça travaille pour moi
- Sécurité d'abord, croissance modeste
- Vivre maintenant, demain on verra

**Q4. Côté carrière, vous êtes :**
- Entrepreneur dans le tumulte
- Cadre dans une structure
- Travailleur autonome avec horaires libres
- Professionnel salarié bien établi
- Producteur agricole / artisan / manuel
- En transition ou réflexion

**Q5. Votre plus grande peur financière :**
- Devenir une charge pour mes proches
- Ne pas laisser assez à mes enfants
- Perdre ma capacité de produire un revenu
- Voir mes investissements s'écrouler
- Manquer de liberté à la retraite

**Q6. Si vous gagnez 100 000 $ demain :**
- Tout dans l'entreprise pour scaler
- REER / CELI maximisé
- Voyage de rêve + un peu d'épargne
- Hypothèque accélérée
- Cadeaux à mes proches puis épargne

**Q7. Votre style de vie :**
- Casanier, projets perso, lecture
- Aventureux, voyages, sports
- Social, réseautage, restaurants
- Familial, activités enfants

**Q8. Votre santé en général :**
- Athlète, je m'entraîne 4+ fois/sem
- Active, je bouge régulièrement
- Sédentaire mais en santé
- Quelques pépins à surveiller
- Plusieurs enjeux de santé

**Q9. Votre principal patrimoine actuel :**
- Mon entreprise / mes parts d'entreprise
- Ma maison + REER/CELI
- Mes placements diversifiés
- Pas grand-chose encore, je débute
- Une terre / un équipement professionnel

**Q10. Dans 20 ans, vous rêvez de :**
- Vendre mon entreprise et profiter
- Aider mes enfants à démarrer dans la vie
- Voyager le monde sans souci financier
- Avoir bâti un legs durable
- Maintenir ma qualité de vie actuelle

### Logique de matching

Chaque réponse rapporte des points à un ou plusieurs profils. À la fin, le profil avec le plus haut score est attribué. Algorithme simple de pondération (matrice 10 questions × 8 profils, où chaque cellule contient un score 0-3).

### Page de résultat

- **Visuel du profil** — illustration ou icône stylisée par Joël ou un illustrateur (option : utiliser Midjourney/DALL-E pour générer une bibliothèque)
- **Description du profil** — 3-4 paragraphes pédagogiques et un peu valorisants
- **Recommandation produit principale** — type de police, montant approximatif, raison
- **Recommandations secondaires** — 2 ou 3 produits complémentaires
- **Boutons partage social** — « Découvrez votre profil d'assuré » avec image OG personnalisée
- **CTA Calendly** — « Validez votre profil avec Joël »
- **Lien vers l'Outil 1** — pour calcul plus précis

### Spec technique

- Architecture HTML/CSS/JS classique
- Matrice de scoring en JSON
- Images des profils en `/img/profils/` (8 images, format PNG ou SVG)
- Open Graph dynamique (image générée selon le profil) — option avancée, sinon image générique
- Web Share API + fallback

### Conformité

Disclaimer obligatoire au-dessus du résultat :
> « Ce quiz est un outil ludique de découverte de profil. Il ne remplace pas une Analyse des Besoins Financiers personnalisée. »

### Estimation : 12-18 heures

| Tâche | Heures |
|---|---|
| Conception des profils + recommandations | 3 |
| Matrice de scoring | 1 |
| Wireframe + design | 2 |
| Intégration HTML/CSS | 3 |
| Logique JS | 3 |
| Images profils (illustrations ou prompts IA) | 2 |
| Page de résultat + partage social | 2 |
| Tests + conformité | 1 |
| **Total** | **17 heures** |

---

## Outil 7 — Audit de couverture employeur

### Vision

Outil ciblé sur les employés de grandes entreprises (gouvernement, Hydro, Desjardins, Cogeco, IBM Canada, Beenox, etc.) qui ont une assurance collective d'employeur mais qui ignorent ses trous. Différenciation forte : la majorité des conseillers négligent cette clientèle en pensant qu'elle est déjà couverte. JC Capital se positionne comme la firme qui révèle ce que l'employeur ne dit pas.

### Concept

L'utilisateur entre les paramètres de sa couverture employeur. L'outil :
1. Identifie les trous structurels (montants insuffisants, exclusions courantes)
2. Calcule la chute de protection en cas de départ ou mise à pied
3. Calcule l'impôt sur les prestations d'invalidité (si prime payée par employeur)
4. Recommande une couverture complémentaire privée

### Spec UX

**Étape 1 — Profil de l'employé**
- Âge
- Revenu annuel brut
- Statut familial
- Ancienneté chez l'employeur
- Industrie

**Étape 2 — Détails du régime collectif (avec aide visuelle)**

- **Assurance vie collective** : multiple du salaire (1×, 2×, 3×, autre, je ne sais pas)
- **Assurance vie sur conjoint** : montant fixe (10K, 25K, 50K, autre, aucune)
- **Assurance vie sur enfants** : montant fixe (5K, 10K, 25K, aucune)
- **Assurance invalidité courte durée (CD)** : pourcentage du salaire (60 %, 66,67 %, 70 %, 75 %, aucune)
- **Assurance invalidité longue durée (LD)** : pourcentage et limite mensuelle
- **Définition d'invalidité** : profession habituelle (combien de temps avant changement ?), toute occupation
- **Période de carence** : 0, 7, 14, 30, 90, 119 jours
- **Qui paie les primes ?** : 100 % employeur, partage, 100 % employé
- **Assurance maladies graves collective** : oui (montant) / non / je ne sais pas
- **Couverture continue à la retraite ?** : oui / non / partielle
- **Couverture continue si je quitte avant retraite ?** : généralement non, conversion possible ?

**Étape 3 — Rapport diagnostique**

Le rapport en plusieurs sections :

**Section A — Synthèse globale**
- « Sur les 4 piliers d'assurance, votre régime employeur couvre X piliers sur 4. »
- Note globale /100 du régime

**Section B — Trous identifiés**

Tableau avec chaque trou identifié :
| Trou | Impact financier estimé | Solution suggérée |
|---|---|---|
| Assurance vie collective limitée à 1× salaire | Manque ~ 500 000 $ vs. besoin réel | Assurance vie individuelle T-20 |
| Prestation d'invalidité imposable (employeur paie prime) | Perte de ~ 30-50 % en impôt | Convertir en prime employé OU complément privé non imposable |
| Limite mensuelle de la LD à 7 000 $ | Manque ~ 3 000 $/mois si salaire de 150 000 $ | AI individuelle complémentaire |
| Pas d'AMG | Risque non couvert | AMG individuelle |
| Couverture cesse si départ | Tout perdu en cas de transition | Assurance individuelle indépendante de l'emploi |
| Définition de l'invalidité change après 24 mois (toute occupation) | Risque de fin de prestations | Définition « profession habituelle » individuelle |

**Section C — Simulation « Et si je quittais demain ? »**

Calcul de la chute de couverture :
- Couverture vie actuelle (collective + individuelle s'il y en a)
- Couverture vie après départ
- Manque-à-gagner immédiat

**Section D — Simulation « Et à la retraite ? »**

Idem mais pour la transition vers la retraite.

**Section E — Recommandations chiffrées**

3 scénarios d'action :
1. **Minimal** — Combler le trou le plus critique (1 produit)
2. **Recommandé** — Combler les 2-3 trous principaux
3. **Optimal** — Stratégie complète indépendante de l'employeur

Pour chaque scénario, fourchette de prime mensuelle estimée.

### Pour qui (segmentation)

- Employés de grandes entreprises (Hydro-Québec, Desjardins, Beenox, IBM, Cogeco, gouvernement provincial/fédéral, CHU, etc.)
- Cadres moyens et supérieurs
- Professionnels syndiqués (enseignants, infirmières, etc.)
- Personnes en transition de carrière ou évaluant une offre d'emploi

### Différenciation marché

Très peu de conseillers QC ciblent activement les employés salariés couverts collectivement. La perception courante : « ils ont déjà tout par leur employeur ». La réalité : les régimes collectifs ont souvent 3-5 trous structurels majeurs. C'est une niche peu disputée et rentable.

### Spec technique

- Architecture HTML/CSS/JS standard
- Form multi-étapes avec validation
- Algorithme de scoring du régime
- Calculs de chute de couverture
- Génération PDF du rapport diagnostique (jsPDF)
- Capture courriel + Calendly

### Conformité

Disclaimer :
> « Cet outil utilise des données génériques sur les régimes collectifs canadiens. Une analyse de votre brochure d'assurance employeur est requise pour une recommandation formelle. Aucune mention de votre employeur ou de votre régime spécifique n'est faite dans cet outil. »

Et précaution importante :
> « Aucun renseignement nominatif sur votre employeur ni votre régime spécifique n'est requis ni conservé. Les calculs se basent sur des paramètres anonymes que vous saisissez. »

### Estimation : 25-35 heures

| Tâche | Heures |
|---|---|
| Recherche sur régimes collectifs typiques | 3 |
| Wireframe + UX 3 étapes | 3 |
| Intégration HTML/CSS | 5 |
| Logique JS (form multi-étapes, calculs trous) | 8 |
| Tableaux dynamiques + visualisations | 4 |
| PDF rapport diagnostique | 5 |
| Capture + Calendly | 1 |
| Tests + conformité | 2 |
| **Total** | **31 heures** |

---

## Lead Magnets PDF — non interactifs mais essentiels

Les outils interactifs ci-dessus capturent des leads. Les lead magnets PDF capturent une autre catégorie : ceux qui veulent du contenu à lire avant de s'engager. Ils complètent les outils.

### LM 1 — Guide ultime : Combien d'assurance vie ai-je besoin ? (2026)

**Format** : PDF design professionnel, 12-15 pages
**Audience** : trafic SEO ciblant « combien assurance vie » et variantes

**Structure** :
1. Page couverture (logo JC Capital, titre, sous-titre, photo de Joël)
2. Table des matières
3. Introduction (1 page) — Pourquoi cette question est mal posée
4. Les 3 méthodes de calcul (3-4 pages)
   - DIME, Multiple, Capitalisation
   - Exemple chiffré pour chacune
5. Les 7 erreurs courantes (2 pages)
   - Confondre besoin et capacité de payer
   - Oublier l'inflation
   - Compter sur l'assurance employeur
   - Ne pas réviser après changement de vie
   - Etc.
6. Études de cas (2-3 pages)
   - Cas 1 : jeune famille avec hypothèque
   - Cas 2 : entrepreneur 45 ans
   - Cas 3 : cadre 55 ans avec succession
7. Checklist : 10 questions à se poser (1 page)
8. CTA Joël Camiré (1 page)
   - Photo, présentation, lien Calendly, coordonnées
9. Disclaimer + politique de confidentialité (1 page)

**Design**
- Couleurs JC Capital
- Photos professionnelles
- Icônes Font Awesome / illustrations vectorielles
- Format Letter US 8.5×11 ou A4

**Effort** : ~10 heures rédaction + design (à scinder)
- Rédaction : 6 heures
- Design Canva ou InDesign : 4 heures

**CTA dans le PDF**
- Page 8 : grand bouton « Réservez 30 minutes avec Joël »
- Footers de chaque page : URL jccapital.ca + téléphone
- Liens cliquables vers Calendly, courriel, téléphone

### LM 2 — Checklist : 12 documents pour préparer votre rencontre avec un conseiller

**Format** : PDF 2 pages, design léger
**Audience** : leads déjà chauds qui ont réservé un appel et veulent se préparer

**Contenu** :
- Page 1 : 12 documents (relevés bancaires, polices d'assurance existantes, dernière déclaration de revenus, etc.)
- Page 2 : Mes objectifs (espace pour notes) + coordonnées Joël

**Effort** : 3 heures (rédaction + design Canva)

### LM 3 — Erreurs en assurance que je vois 9 fois sur 10

**Format** : ebook court 6-8 pages
**Audience** : trafic SEO + partage social, ton « confessions du métier »

**Structure** :
1. Couverture
2. Introduction — Pourquoi cet ebook
3. Erreur 1 : « Mon assurance d'employeur suffit »
4. Erreur 2 : « Je prends la moins chère »
5. Erreur 3 : « Je règle tout en ligne sans conseil »
6. Erreur 4 : « Je n'ai pas le temps maintenant »
7. Erreur 5 : « J'attendrai d'avoir besoin »
8. Erreur 6 : « Je n'ai pas assez de patrimoine pour ça »
9. Erreur 7 : « C'est trop compliqué »
10. CTA + disclaimer

**Effort** : 8 heures

### LM 4 — L'assurance pour entrepreneurs québécois : ce que personne ne vous dit

**Format** : ebook complet 18-22 pages
**Audience** : niche entrepreneurs Québec, valeur perçue élevée

**Structure proposée** :
1. Couverture + résumé
2. Chapitre 1 : Le casse-tête fiscal de l'entrepreneur incorporé (3-4 pages)
3. Chapitre 2 : Les 4 piliers de protection pour entrepreneurs (3-4 pages)
   - Personne clé
   - Convention d'actionnaires
   - Frais généraux
   - Protection personnelle indépendante
4. Chapitre 3 : Compte de dividendes en capital (CDC) — la stratégie méconnue (3 pages)
5. Chapitre 4 : Études de cas chiffrées (3-4 pages)
   - Entrepreneur tech 35 ans
   - Restaurateur familial 50 ans
   - Producteur agricole 45 ans
6. Chapitre 5 : Checklist de l'entrepreneur protégé (1-2 pages)
7. CTA + disclaimer complet

**Effort** : 20 heures (rédaction + design + révision)

### LM 5 — Calculateur Excel : Besoin d'assurance vie + invalidité

**Format** : fichier .xlsx avec protection des cellules
**Audience** : profil analytique qui aime jouer avec les chiffres

**Contenu** :
- Onglet 1 : Saisie des données (cellules de couleur identifiées)
- Onglet 2 : Calcul DIME automatique
- Onglet 3 : Calcul Multiple
- Onglet 4 : Calcul Capitalisation avec hypothèses ajustables
- Onglet 5 : Synthèse + graphique automatique
- Onglet 6 : Notes et disclaimer + contact JC Capital

**Effort** : 5 heures
- Conception : 2h
- Formules + protection : 2h
- Graphiques + mise en forme : 1h

---

## Stratégie de déploiement

### Priorité 1 — Mois 1 (déploiement rapide, ROI maximal)

**Objectif** : Lancer en 30 jours le premier outil-phare + son lead magnet associé.

**Livraisons** :
- Outil 1 — Calculateur du besoin réel d'assurance vie (40 h)
- Lead Magnet 1 — Guide ultime « Combien d'assurance vie » (10 h)

**Effort total** : ~50 heures
**Budget** : 2 500-4 000 $ si freelance québécois

**Justification** :
- C'est le mot-clé le plus recherché par les prospects en assurance vie
- ROI le plus rapide : un calculateur génère typiquement 3-8 leads/mois avec 500 visiteurs
- Le lead magnet renforce la conversion en l'absence d'engagement complet

### Priorité 2 — Mois 2

**Livraisons** :
- Outil 2 — Quiz « Êtes-vous assez assuré ? » (20 h)
- Lead Magnet 5 — Calculateur Excel téléchargeable (5 h)
- Améliorations Outil 4 — Bilan de protection enrichi (15 h)

**Effort total** : ~40 heures

**Justification** :
- Le quiz est viral et amplifie le trafic vers les calculateurs
- Le calculateur Excel cible un sous-segment analytique
- Améliorer l'outil existant maximise le ROI sur l'effort déjà investi

### Priorité 3 — Mois 3-4

**Livraisons** :
- Outil 3 — Comparateur Temporaire vs Permanente (33 h)
- Lead Magnet 3 — Ebook « Erreurs en assurance » (8 h)
- Outil 6 — Match Maker (17 h)

**Effort total** : ~58 heures

**Justification** :
- Élargir la couverture des intentions de recherche (comparaison)
- Le Match Maker apporte la dimension virale et sociale

### Priorité 4 — Mois 5-6

**Livraisons** :
- Outil 7 — Audit couverture employeur (31 h)
- Lead Magnet 4 — Ebook entrepreneurs (20 h)
- Lead Magnet 2 — Checklist (3 h)

**Effort total** : ~54 heures

**Justification** :
- Niche audit employeur = différenciation forte
- Ebook entrepreneur = niche très rentable (entrepreneurs souscrivent souvent en gros)

### Priorité 5 — Mois 7-8 (optionnel)

**Livraisons** :
- Outil 5 — Calculateur valeur économique vie humaine (37 h)

**Effort total** : ~37 heures

**Justification** :
- Outil sophistiqué pour clientèle haut de gamme
- Réservé après validation que le funnel fonctionne

### KPIs à suivre

**Top of funnel** :
- Visiteurs uniques par outil (Google Analytics 4)
- Taux de rebond
- Sources de trafic (organique, payant, social, direct)
- Temps moyen sur la page

**Engagement outil** :
- Taux de démarrage (premier clic dans l'outil) / visiteurs uniques
- Taux de complétion / démarrage
- Étape d'abandon (heatmap des décrochages)

**Conversion** :
- Leads captés (courriels) / complétions
- Taux de rendez-vous Calendly réservés / leads captés
- Taux de présence au RDV / RDV réservés
- Taux de souscription / RDV présents

**Lifecycle** :
- Coût d'acquisition par lead (CAC)
- Coût d'acquisition par client signé
- Valeur vie client (LTV) — primes nettes × durée moyenne
- Ratio LTV/CAC (cible 3:1 minimum)

**Outils de mesure** :
- Google Analytics 4 (gratuit)
- Microsoft Clarity (gratuit) pour heatmaps et session recordings
- Calendly Analytics (intégré)
- EmailJS Dashboard (par envoi)
- Tableau de bord centralisé Google Looker Studio (gratuit)

---

## Pile technique recommandée

### Front-end
- **HTML5 sémantique** — cohérent avec le site
- **CSS modulaire** — tokens.css déjà en place
- **JavaScript ES6+ vanilla** — pas de framework, performances optimales sur GitHub Pages
- **Chart.js** — graphiques (déjà chargé sur le site)
- **SweetAlert2** — modales et notifications (déjà en place)
- **Font Awesome 6** — icônes (déjà chargé)
- **Google Fonts Outfit** — typo (déjà chargée)

### Capture et envoi
- **EmailJS** — capture des leads et envoi par courriel (service `service_b4f4ooy` déjà configuré). Templates additionnels à créer.
- **Calendly embed** — rendez-vous (URL `calendly.com/joelcamire-jccapital/consultation`)

### Génération de documents
- **jsPDF** + **jsPDF-AutoTable** — génération PDF côté client
- **html2canvas** — captures d'écran pour intégrer graphiques dans PDF

### Analytics et tracking
- **Google Analytics 4** (gratuit)
- **Microsoft Clarity** (gratuit) — heatmaps et session recordings
- **Google Looker Studio** — dashboards consolidés

### Hébergement et CDN
- **GitHub Pages** — déjà en place, gratuit
- **Cloudflare** — DNS, CDN, sécurité, déjà en place

### Email marketing (futur — optionnel)
- **MailerLite** (gratuit jusqu'à 1000 abonnés) ou **ActiveCampaign** (payant, plus puissant)
- Pour automatiser les séquences de re-relance après capture d'un lead

### Stack à éviter
- ❌ React, Vue, Svelte (overhead inutile pour ce contexte)
- ❌ WordPress et plugins (incohérent avec stack actuelle)
- ❌ Backend serveur (Node, PHP, Python) — pas nécessaire, GitHub Pages suffit
- ❌ Base de données (Firebase, Supabase) — pas nécessaire, EmailJS suffit

---

## Estimation budget total

### Si Joël développe lui-même (en parallèle de son cabinet)

| Phase | Heures | Délai réaliste si 5h/sem |
|---|---|---|
| Priorité 1 | 50 | 10 semaines |
| Priorité 2 | 40 | 8 semaines |
| Priorité 3 | 58 | 12 semaines |
| Priorité 4 | 54 | 11 semaines |
| Priorité 5 | 37 | 7 semaines |
| **Total** | **239 h** | **~12 mois** |

Avantage : aucun coût direct, contrôle total. Désavantage : temps long, distraction du cœur de métier.

### Si freelance dev québécois

Tarif horaire moyen freelance senior Québec : 60-95 $/h

| Phase | Heures | Coût bas | Coût haut |
|---|---|---|---|
| Priorité 1 | 50 | 3 000 $ | 4 750 $ |
| Priorité 2 | 40 | 2 400 $ | 3 800 $ |
| Priorité 3 | 58 | 3 480 $ | 5 510 $ |
| Priorité 4 | 54 | 3 240 $ | 5 130 $ |
| Priorité 5 | 37 | 2 220 $ | 3 515 $ |
| **Total** | **239 h** | **14 340 $** | **22 705 $** |

### Si agence

Tarif horaire moyen agence numérique QC : 110-160 $/h (avec overhead)

| Phase | Heures | Coût bas | Coût haut |
|---|---|---|---|
| Priorité 1 | 50 | 5 500 $ | 8 000 $ |
| Priorité 2 | 40 | 4 400 $ | 6 400 $ |
| Priorité 3 | 58 | 6 380 $ | 9 280 $ |
| Priorité 4 | 54 | 5 940 $ | 8 640 $ |
| Priorité 5 | 37 | 4 070 $ | 5 920 $ |
| **Total** | **239 h** | **26 290 $** | **38 240 $** |

### Si Priorité 1 seulement (test rapide ROI)

- Effort : 50 heures
- Coût freelance : 3 000-4 750 $
- Coût agence : 5 500-8 000 $
- Coût Joël : 50 heures de son temps (~10 semaines en parallèle)

**Recommandation budget** : Priorité 1 confiée à un freelance québécois sérieux (3 500-4 500 $), tester pendant 2 mois, mesurer le ROI, puis décider de la suite.

### Retour sur investissement attendu

Hypothèses prudentes :
- 800 visiteurs/mois sur l'Outil 1 après 3 mois de SEO
- 8 % conversion → 64 leads/mois
- 15 % conversion lead → RDV → 10 RDV/mois
- 30 % RDV → contrat signé → 3 contrats/mois
- Commission moyenne par police vie : 1 200-3 500 $ (1re année)

Revenu mensuel généré : 3 600 $ – 10 500 $
Revenu annuel : 43 000 $ – 126 000 $

ROI sur Priorité 1 (3 500 $) : payé en 1-3 mois.

---

## Conformité AMF/CSF — récapitulatif global pour chaque outil

À inclure obligatoirement sur CHAQUE outil et CHAQUE lead magnet :

### 1. Disclaimer de résultat
> « Les estimations fournies ne constituent pas un conseil personnalisé en assurance de personnes ni une recommandation formelle. Une Analyse des Besoins Financiers (ABF) complète, conforme aux normes de l'AMF et de la Chambre de la sécurité financière, est requise pour toute recommandation. »

### 2. Invitation à consulter un conseiller inscrit
Texte standard à intégrer :
> « Joël Camiré est conseiller en sécurité financière inscrit auprès de l'AMF. Pour une analyse personnalisée, réservez une rencontre gratuite et sans engagement. »

### 3. Aucun prix précis ni garantie
- Utiliser uniquement des fourchettes (« généralement entre X et Y »)
- Toujours mentionner que les primes dépendent de la tarification individuelle
- Jamais de « garanti », « assuré », « certain », « promet »

### 4. Mention du partenariat SFL (quand pertinent)
> « Les services d'épargne collective sont offerts par SFL Placements, cabinet de services financiers. »

### 5. Respect Loi 25 — données personnelles
À afficher au-dessus de chaque formulaire de capture :
> « Les renseignements collectés (nom, courriel, téléphone) seront utilisés exclusivement par JC Capital pour vous transmettre votre rapport personnalisé et, avec votre consentement, vous contacter en lien avec votre analyse. Vous pouvez en tout temps demander l'accès, la rectification ou la suppression de ces renseignements en écrivant à admin@jccapital.ca. Conservation : 3 ans après dernier contact sans relation contractuelle. Responsable de la protection des renseignements personnels : Joël Camiré. »

### 6. Mention des titres exacts
- ✅ Conseiller en sécurité financière
- ✅ Représentant en épargne collective
- ✅ Conseiller financier (titre générique)
- ❌ Planificateur financier / Pl.Fin. (tant que IQPF non obtenue)

### 7. Pas d'affirmation comparative
- Ne pas dire « meilleur que », « moins cher que », « plus complet que la concurrence »
- Article 16 du Code de déontologie de la CSF

### 8. Bouton de retrait de consentement
Sur le site, page « politique de confidentialité » avec lien vers formulaire de retrait simple.

### 9. Footer obligatoire sur tous les rapports générés

```
Joël Camiré, conseiller en sécurité financière inscrit auprès de l'AMF
Représentant en épargne collective rattaché à SFL Placements
Cabinet : JC Capital
admin@jccapital.ca | (581) 398-6747 | jccapital.ca

Ce document est fourni à titre informatif uniquement. Il ne constitue pas
une recommandation formelle d'assurance ni un conseil personnalisé en
sécurité financière. Une Analyse des Besoins Financiers (ABF) complète,
conforme aux normes de l'AMF et de la Chambre de la sécurité financière,
est requise pour toute souscription.

© 2026 JC Capital. Tous droits réservés.
```

### 10. Revue de conformité

Avant chaque mise en ligne, validation par :
- Joël Camiré personnellement (responsable AMF/CSF)
- Idéalement un consultant en conformité externe (200-400 $ par outil)
- Documentation des choix dans un dossier conformité interne

---

## Annexe — Plan d'action immédiat (4 semaines)

### Semaine 1
- [ ] Décision Joël sur priorité 1 (calculateur + lead magnet)
- [ ] Sélection mode de réalisation (lui-même / freelance / agence)
- [ ] Si freelance : RFP rédigé, 3 devis demandés
- [ ] Approbation du budget

### Semaine 2
- [ ] Briefing détaillé du dev sélectionné (ce document + maquettes)
- [ ] Création des templates EmailJS supplémentaires
- [ ] Brief design pour les visuels du lead magnet PDF
- [ ] Rédaction de la 1re moitié du lead magnet par Joël

### Semaine 3
- [ ] Dev livre v1 du calculateur (à tester)
- [ ] Joël finalise la rédaction du lead magnet
- [ ] Design PDF mise en forme
- [ ] Tests utilisateurs (5 personnes proches : conjoint, ami entrepreneur, etc.)

### Semaine 4
- [ ] Itérations selon feedback
- [ ] Revue conformité finale
- [ ] Lancement officiel
- [ ] Configuration GA4 + Microsoft Clarity
- [ ] Premier post LinkedIn + Facebook annonçant l'outil

---

**Document préparé par** : assistant Claude
**Statut** : version 1.0, à valider par Joël Camiré
**Prochaine étape** : Joël choisit la priorité de déploiement et le mode de réalisation, puis brief le développeur retenu (ou démarre lui-même).
