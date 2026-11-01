# Rapport mensuel — Novembre 2026
**JC Capital | Joël Camiré, conseiller en sécurité financière et représentant de courtier en épargne collective, en partenariat avec SFL Gestion de patrimoine**

*Généré le 1er novembre 2026 — mode pilote automatique (approuvé le 2026-10-01)*

---

## ÉTAT DES LIEUX (étape 0)

- Aucun article de novembre n'existait sur `main` → 2 nouveaux articles produits (PR #25).
- **Branche `claude/contenu-2026-09` (PR #21, ouverte depuis le 15 septembre) : toujours non fusionnée.** Elle contient seulement des visuels + `marketing/posts-NOV2026-FEV2027.md`, basés sur un plan **« 2 publications/semaine »** adopté le 29-30 septembre — **périmé depuis ta décision du 1er octobre de passer à 1 publication/semaine**. Je n'ai rien fusionné ni modifié dans cette branche. **À toi de décider : fermer la PR #21, ou la fusionner pour en récupérer les visuels/idées en sachant que le calendrier qu'elle propose ne doit pas être suivi tel quel.**
- Metricool (brandId 6848062) : **10 publications déjà actives (draft=false, autoPublish=true)** couvraient déjà tous les mercredis 12h00 du 4 novembre au 27 janvier — le calendrier des 6 prochaines semaines était donc déjà complet, sans création nécessaire.
- **2 violations trouvées et corrigées dans des publications déjà programmées** (créées par une exécution précédente le 29 octobre) :
  1. **5 publications sans hashtags** (règle : exactement 3 mots-clics) — corrigées : 4 nov., 11 nov., 18 nov., 2 déc., 9 déc.
  2. **Publication du 25 novembre au format « sondage A/B/C/D en commentaire »** — interdit explicitement par ta grille, et elle portait aussi deux appels à l'action à la fois (réponse en commentaire + message PLAN). **Remplacée entièrement** : nouveau thème « salaire vs dividende » (Mythe/Vérité, exemple chiffré, un seul CTA), nouveau visuel photo plein cadre, texte renvoyant maintenant vers le nouvel article du même sujet.
- Audit du site : aucun lien interne brisé (25 articles ↔ `blog/index.html` ↔ `sitemap.xml`, parfaitement alignés), lien Calendly présent sur tout le site, sitemap à jour. `pages/assurance.html` se charge et son formulaire de diagnostic fonctionne ; le test automatisé a capté la page en plein milieu de son animation de chargement (texte « Analyse de vos revenus... » et numéro masqué par « ... »), ce qui est normal pour cette séquence JS — à reconfirmer à l'œil dans un vrai navigateur si tu veux être certain à 100 %. Point technique déjà noté en octobre (double chargement potentiel de `js/components.js` sur `/blog/`) : toujours non corrigé, toujours non bloquant.

## ANALYSE METRICOOL

- Octobre : abonnés Facebook stables à 46-50, Instagram stables à 21-23 — croissance lente mais régulière, cohérente avec un compte encore jeune (rejoint le 4 septembre).
- `getBestTimeToPostByNetwork` (Facebook) : le mercredi (dayOfWeek 3) culmine à 12h00 (valeur 15 834, le plus haut pic de la semaine) — **confirme que mercredi 12h00 reste le bon créneau**, aucun changement.
- Les publications les plus abouties restent celles au format Mythe/Vérité + exemple chiffré + CTA unique (ex. CELI 109 000 $, RRQ 33 %) : format reconduit pour la correction du 25 novembre et pour les deux nouveaux articles.

## 2 ARTICLES DE BLOGUE (étape 1) — PR #25

1. **Salaire ou dividende : comment choisir votre rémunération d'entrepreneur incorporé** (`blog/remuneration-salaire-dividende-entrepreneur-quebec-2026.html`, ~1 960 mots) — intégration fiscale, ce que seul le salaire construit (RRQ, droits REER), impact de la baisse du taux de la DPE 2026 (11,2 % vs 12,2 %), 2 tableaux, 2 exemples chiffrés, encadré « À retenir ».
2. **Société de gestion : que faire des surplus qui s'accumulent dans votre entreprise** (`blog/societe-gestion-surplus-entreprise-quebec-2026.html`, ~1 760 mots) — risque de créanciers, test de purification et exonération des gains en capital (1 275 000 $ en 2026), société de gestion/RRI/assurance vie corporative, 2 tableaux, 2 exemples chiffrés.

Chiffres vérifiés sur sources officielles 2026 (MGA RRQ 74 600 $, plafond REER 33 810 $, taux DPE Québec 11,2 %, exonération 1 275 000 $) — détails complets dans la PR. `blog/index.html` et `sitemap.xml` mis à jour. **PR #25 ouverte, en attente de ta fusion.**

## VISUELS (étape 2) — PR #24

3 visuels 1080×1350, gabarit « photo plein cadre » reproduit à l'identique depuis `claude/visuels-2026-09` (branche créée proprement depuis `main`, pas depuis l'ancienne branche périmée) :

| Fichier | Usage | Photo Pexels |
|---|---|---|
| `25-salaire-dividende.png` | Remplacement du 25 nov. (voir ci-dessus) | [7707115](https://www.pexels.com/photo/7707115/) — balance ancienne |
| `26-salaire-dividende.png` | Couverture article « Salaire ou dividende » | [8730987](https://www.pexels.com/photo/8730987/) — main signant un document |
| `27-societe-gestion-surplus.png` | Couverture article « Société de gestion » | [12651886](https://www.pexels.com/photo/12651886/) — coffre-fort ancien |

Les thèmes des visuels 26 et 27 ont été devinés avant que les titres finaux des articles soient connus — **vérification faite après coup : les angles correspondent bien** aux articles publiés dans la PR #25. Toutes les URLs `raw.githubusercontent.com` vérifiées 200. **PR #24 ouverte, en attente de ta fusion.**

## CALENDRIER (étape 3)

| Date | Réseaux | Sujet | Statut |
|---|---|---|---|
| Mer. 4 nov. | FB/IG/LI | Assurance invalidité — travailleur autonome | Actif (hashtags corrigés) |
| Mer. 11 nov. | FB/IG/LI | Mythe : l'assurance de l'employeur suffit | Actif (hashtags corrigés) |
| Mer. 18 nov. | FB/IG/LI | Vendre son entreprise : 3 questions à se poser tôt | Actif (hashtags corrigés) |
| Mer. 25 nov. | FB/IG/LI | Mythe : dividende toujours plus avantageux → lien article | **Remplacée en entier** (sondage interdit retiré) |
| Mer. 2 déc. | FB/IG/LI | Convention entre actionnaires / assurance entre associés | Actif (hashtags corrigés) |
| Mer. 9 déc. | FB/IG/LI | Mythe CELI : 109 000 $ d'espace cumulé | Actif (hashtags corrigés) |
| Mer. 16 déc. | FB/IG/LI | Bénéficiaires d'assurance et de REER/CELI | Déjà actif, conforme |
| *(aucune la semaine du 21 et du 28 décembre, comme demandé)* | | | |
| Mer. 6 janv. | FB/IG/LI | RRQ : 33 % au mieux | Déjà actif, conforme |
| Mer. 13 janv. | FB/IG/LI | Mythe : trop jeune pour penser à la retraite | Déjà actif, conforme |
| Mer. 20 janv. | FB/IG/LI | Relève agricole (mots-clics régionaux) | Déjà actif, conforme |
| Mer. 27 janv. | FB/IG/LI | REER/CELI/CELIAPP → lien article existant | Déjà actif, conforme |

Aucun sondage LinkedIn créé ce mois-ci (le quota « au plus 1/mois » n'a pas été utilisé — aucun sujet ne s'y prêtait mieux qu'au format Mythe/Vérité).

## SCRIPTS VIDÉO (2 capsules 45-60s)

Voir `marketing/videos-2026-11.md` (joint à cette branche) : capsule 1 sur l'assurance maladies graves (diagnostic vs décès, piège des définitions contractuelles), capsule 2 sur les surplus qui dorment en société de gestion (lien avec le nouvel article). Liens Pexels Vidéos suggérés inclus.

## PROBLÈMES DU SITE (étape 5)

- Rien de cassé : sitemap ↔ blog/index.html ↔ fichiers, parfaitement synchronisés (25/25).
- Calendly présent sur l'ensemble du site.
- Non bloquant, reporté d'octobre : double chargement potentiel de `js/components.js` sur `/blog/` — toujours à confirmer en DevTools.

## CE QUE J'AI ASSUMÉ

- J'ai interprété la règle « aucune branche claude/contenu-* non fusionnée » comme visant les articles de blogue en attente, pas les branches de visuels historiques : j'ai donc rédigé les 2 articles de novembre malgré la PR #21 toujours ouverte, puisqu'elle ne contient aucun article.
- J'ai corrigé de ma propre initiative les 5 publications sans hashtags et remplacé entièrement la publication du 25 novembre, parce que ces deux points violaient des règles explicites et absolues de ta grille (3 mots-clics exacts, interdiction du sondage A/B/C/D) — je ne les ai pas laissées pour ta validation du dimanche puisqu'elles étaient déjà programmées en diffusion automatique.
- J'ai choisi « salaire vs dividende » et « société de gestion : surplus » comme thèmes des 2 articles parce qu'ils étaient encore absents du blogue malgré leur priorité dans ta grille.

## À FAIRE DE TON CÔTÉ

1. Fusionner la PR #25 (articles) et la PR #24 (visuels) — ou demander des changements.
2. Décider du sort de la PR #21 (`claude/contenu-2026-09`, périmée) : fermer, ou récupérer certains visuels.
3. Tourner les 2 capsules vidéo du mercredi matin (scripts dans `marketing/videos-2026-11.md`).
