# Procédure de mise à jour des paramètres fiscaux

L'outil privé vit sur la branche `outil-prive` (JAMAIS fusionnée dans `main` —
le site public ne doit pas contenir la calculatrice).

## Calendrier des changements fiscaux (Canada/Québec)
- **Novembre** : indexation ARC (tranches fédérales, BPA, plafond REER),
  RRQ (MGA/MSGA, taux), assurance-emploi
- **Novembre–décembre** : paramètres du régime d'imposition du Québec (MFQ),
  RQAP, FSS
- **Mars–avril** : budgets fédéral et Québec (changements ponctuels possibles :
  taux corporatifs, DPE, taux d'inclusion des gains, etc.)

## Étapes
1. `git fetch origin outil-prive && git checkout outil-prive`
2. Vérifier chaque valeur de l'objet `TAX2026` dans `js/rentabilite-engine.js`
   contre les sources officielles (ARC, Revenu Québec, MFQ, Retraite Québec).
   Si l'année change : renommer les mentions de l'année dans la page aussi.
3. Mettre à jour `TAX2026.meta` : `paramsYear` et `verifiedOn`.
4. Adapter les valeurs de référence du groupe 1 de `tools/harness.js`
   (recalculées à la main par tranches) puis exécuter :
   `node tools/harness.js` — tout doit être vert.
5. `npm install chart.js` puis `python3 tools/build-standalone.py`
6. Livrer le fichier `JC-Capital-Rentabilite-PRIVE.html` à Joël
   (SendUserFile) avec le résumé des paramètres modifiés.
7. Commit + push sur `outil-prive` seulement.
