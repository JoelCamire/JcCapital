# Rapport mensuel — Octobre 2026
**JC Capital | Joël Camiré, conseiller en sécurité financière et représentant de courtier en épargne collective, en partenariat avec SFL Gestion de patrimoine**

*Généré le 1er octobre 2026*

---

## ÉTAT DES LIEUX (étape 0)

- Aucun article d'octobre 2026 n'existait sur `main` → 3 nouveaux articles produits.
- Aucune branche `claude/contenu-*` non fusionnée en attente.
- Audit du site : aucun lien interne brisé, lien Calendly cohérent partout, sitemap à jour. **7 articles d'assurance (mai 2026) étaient absents de la grille `blog/index.html`** malgré leur présence dans le sitemap et sur le site en ligne — corrigé dans cette branche.
- Point technique à vérifier dans un navigateur (non bloquant) : `js/components.js` détecte le sous-dossier via `path.includes('/pages/')`, ce qui est faux pour `/blog/`. Les pages de blog chargent déjà header/footer correctement via leur propre loader inline, mais `components.js` pourrait tenter un second fetch inutile. À confirmer avec les DevTools avant d'y toucher.

## ANALYSE METRICOOL (étape 1)

- **Brand ID 6848062 (JC Capital)** : Facebook, Instagram, **LinkedIn (connecté, urn:li:organization:111603898)**, TikTok, YouTube.
- Un second profil Metricool existe : **7075885 (joel.camire)**, avec Instagram et LinkedIn personnels connectés — à explorer dans un futur mois pour savoir si Metricool peut réellement publier sur ton LinkedIn personnel (ce qui simplifierait la trousse ci-dessous).
- Le compte a rejoint Metricool le 4 septembre 2026 : **l'historique de données est très mince (moins de 4 semaines)**, donc les statistiques ci-dessous sont indicatives, pas définitives.
- Facebook : abonnés passés de 37 à 45 en septembre, avec une petite accélération en fin de mois (24, 28, 29, 30 sept.) coïncidant avec des publications plus fréquentes.
- Instagram : abonnés stables à 21 tout le mois — aucune traction encore visible, à surveiller.
- **Interprétation prudente** : pas assez de données pour identifier un gabarit visuel « gagnant ». J'ai donc fait tourner les 6 gabarits sur les 7 nouvelles publications plutôt que de sur-pondérer un format, comme demandé. Le bilan de novembre pourra être plus tranchant.
- `getBestTimeToPostByNetwork` : les données LinkedIn étaient vides (compte trop récent), Facebook et Instagram confirment que **mercredi 12h00** est un bon créneau (pic Facebook de la semaine) — aucun ajustement d'heure nécessaire par rapport au calendrier standard.
- `getScheduledPosts` (35 jours) : **10 publications déjà planifiées en octobre** (mardis 7h45 et vendredis 12h00 déjà complets tout le mois) + 1 le 3 novembre. Les créneaux **mercredi 12h00** et **jeudi 18h00** étaient vides pour le reste d'octobre → exactement ce qui restait à combler.

## VEILLE FISCALE/FINANCIÈRE (étape 1)

Sujets retenus pour le contenu d'octobre (parmi 8 identifiés) : exonération cumulative des gains en capital (1,25 M$, tests 50 %/90 %), fractionnement du revenu à la retraite, dons de bienfaisance en titres cotés en bourse, stabilité du taux directeur (2,25 %, prochaine mise à jour BdC le 28 octobre), 4e acompte provisionnel (15 décembre), et la fin du programme « Appui financier à la relève agricole » (à noter pour un client agricole, pas utilisé directement ce mois-ci).

## 3 ARTICLES DE BLOGUE (étape 2)

1. **Exonération des gains en capital 2026 : votre entreprise ou votre ferme est-elle admissible ?** (Fiscalité, 9 min)
2. **Fractionner son revenu à la retraite : REER de conjoint, pension et dividendes** (Retraite, 8 min)
3. **Don de bienfaisance avant le 31 décembre : guide fiscal pour entrepreneurs québécois** (Fiscalité, 8 min)

Mis à jour : `blog/index.html` (3 nouveaux articles + 7 articles manquants) et `sitemap.xml`.

**Note sur la mention légale finale** : conformément à ta directive, aucun des 3 nouveaux articles ne porte le paragraphe « Avis important… » en bloc final. La prudence est dans la formulation (exemples hypothétiques amenés dans la phrase, aucune promesse de rendement, renvoi systématique à ton comptable CPA pour les stratégies fiscales).

## VISUELS (étape 3)

7 visuels 1080×1350 dans `img/social/2026-10/`, 6 gabarits rotatifs (jamais deux fois de suite le même), police Outfit variable, dégradés de la palette JC Capital. Chaque image a été ouverte et vérifiée visuellement ; un dépassement de texte a été corrigé sur l'image 1 (le chiffre « 1 250 000 $ » débordait du cadre) et un chevauchement d'étiquette sur l'image 4. Les 7 URLs GitHub ont été testées — toutes répondent 200.

## CALENDRIER (étape 4)

7 nouvelles publications planifiées en **brouillon** sur Metricool (le forfait ne permet pas le flux d'approbation par courriel — `createScheduledPostForReview` a retourné une erreur 403 « pas d'abonnement avec gestion d'équipe », donc bascule sur `createScheduledPost` avec `draft=true`, comme prévu). Rien n'est publié automatiquement.

| Date | Heure | Réseaux | Gabarit visuel | Accroche | Statut |
|---|---|---|---|---|---|
| Mar. 7 oct. | 12h00 | FB/IG/LI | Chiffre géant | 1 250 000 $ de gain en capital libre d'impôt — admissible ? | Brouillon à valider |
| Jeu. 8 oct. | 18h00 | FB/IG/LI | Mythe barré | « L'exonération est automatique » — vérité : elle se vérifie chaque année | Brouillon à valider |
| Mer. 14 oct. | 12h00 | FB/IG/LI | Liste 1-2-3 | 3 outils pour fractionner son revenu à la retraite | Brouillon à valider |
| Jeu. 15 oct. | 18h00 | FB/IG/LI | Split diagonale | Mythe : le RRQ suffira — réalité : 25-40 % du revenu | Brouillon à valider |
| Jeu. 22 oct. | 18h00 | FB/IG/LI | Question plein cadre | Vendre avant de donner ? | Brouillon à valider |
| Mer. 28 oct. | 12h00 | FB/IG/LI | Typographique pur | Donnez le TITRE, pas l'argent | Brouillon à valider |
| Jeu. 29 oct. | 18h00 | FB/IG/LI | Chiffre géant | 2,25 % — taux stable, bon moment pour revoir votre financement | Brouillon à valider |

Les créneaux mardi 7h45 et vendredi 12h00 étaient déjà complets pour tout octobre (10 publications existantes, non touchées). Total du mois : 17 publications, sous la limite de 18, aucun doublon.

## SCRIPTS VIDÉO (2 Shorts 45-60s)

**Script 1 — « 1 250 000 $ libre d'impôt »**
- [0-3s] Face caméra : « 1 250 000 $ de gain en capital, complètement libre d'impôt. Mais seulement si vous cochez deux cases. »
- [3-15s] « Première case : au moment de vendre, au moins 90 % de la valeur de votre entreprise doit être utilisée activement dans l'exploitation. Deuxième case : dans les 24 mois avant, ce seuil est de 50 %. »
- [15-35s] « Le piège : plus votre société accumule des surplus, des placements, de l'immobilier qui ne sert pas à l'exploitation, plus vous risquez de glisser sous ces seuils sans vous en rendre compte. Et le jour où vous voulez vendre, il est trop tard pour corriger ça. »
- [35-50s] « La bonne nouvelle : ça se vérifie à l'avance, et ça se corrige — parfois même sans vendre, avec une technique qu'on appelle la cristallisation. »
- [50-60s] CTA : « Si vous avez une entreprise ou une ferme, c'est une vérification à faire avant d'être pressé par une vente. Lien dans ma bio pour l'article complet. »

**Script 2 — « Donnez le titre, pas l'argent »**
- [0-3s] « Si vous voulez donner à un organisme de charité cette année, ne vendez pas vos actions avant. »
- [3-20s] « Voici pourquoi : si vous vendez des actions qui ont pris de la valeur pour donner l'argent, vous payez de l'impôt sur le gain avant même d'avoir fait votre don. »
- [20-40s] « Mais si vous donnez le titre directement à un organisme enregistré, ce gain n'est pas imposé du tout — et vous recevez quand même un reçu de don à pleine valeur marchande. »
- [40-55s] « Exemple : des actions achetées 20 000 $, qui valent 50 000 $ aujourd'hui. Vendues puis données, une partie du gain s'ajoute à votre revenu imposable. Données directement : zéro impôt sur ce gain, même reçu de 50 000 $. »
- [55-60s] CTA : « Même don. Facture fiscale complètement différente. Un détail qui change tout avant le 31 décembre. »

## PROBLÈMES DU SITE (étape 5)

- Aucun lien interne cassé, Calendly cohérent, sitemap à jour, site en ligne synchronisé avec le dépôt.
- Corrigé dans cette branche : 7 articles d'assurance manquants dans `blog/index.html`.
- À surveiller (non corrigé, nécessite un test navigateur) : double chargement potentiel des composants header/footer sur les pages `/blog/` via `js/components.js`.

## TROUSSE PERSO

Google Doc **« Trousse publications perso — Octobre 2026 »** créé avec, pour chacune des 7 publications : date/heure, lien direct de l'image, version LinkedIn (personnelle, 1200-1500 caractères) et version Facebook (ton d'ami). Les 3 priorités sont en tête du document. Lien : https://docs.google.com/document/d/1qQj2jmi2mY9LGj4o8uMJ47TCd673hGhDekjrrm0T_Yk/edit

## COMMENT APPROUVER

1. Fusionne la PR #22 (claude/contenu-2026-10).
2. Dans Metricool > Planificateur, approuve ou modifie chaque brouillon (7 publications, 7-29 octobre).
3. Copie-colle la trousse perso sur ton LinkedIn et ton Facebook personnels.
