# JC Planner — architecture « un chiffre, une source »

Ce document explique comment l'app garantit que **chaque nombre est saisi une
seule fois, calculé exactement, et identique sur tous les écrans**.

## 1. Sources de vérité (et rien d'autre)

| Donnée | Source unique | Dérivé de… |
|---|---|---|
| Paramètres fiscaux (tranches, crédits, RRQ/AE/RQAP, REER/CELI, PSV, EGC, REEI, homologation, ABD/ATD, TPS/TVQ, taux prescrit) | `src/jurisdictions/ca.js` (`TAX_YEAR`, méthode d'indexation documentée) | — |
| Membres, revenus, dépenses, actifs, dettes, objectifs, entreprise | `client.*` (modèle `src/state/models.js`) | — |
| **Âge** d'un membre / d'un enfant | `dob` | recalculé à chaque chargement et mutation (`store.syncDerived`) |
| **Statut fiscal** (`filingStatus`) | `household.maritalStatus` | dérivé |
| **Géographie** du ménage | `jurisdiction` | dérivé |
| **Polices d'assurance** (planification + CRM) | `client.products[]` | `client.insurance[]` = miroir en lecture seule |
| **Actif sous gestion** d'un produit de placement | l'actif lié (`product.assetId`) | `product.aum` = miroir |
| Hypothèses de planification (rendements, inflation, niveau de dépenses, cibles d'épargne, fonds d'urgence, remplacement de revenu, essais Monte Carlo…) | `client.assumptions` (`assumptionsOf()` complète les défauts) | — |
| Paramètres de simulation d'un écran (leviers « et si ») | `client.calc[vue]` via `whatIf()` / `saveWhatIf()` | défauts dérivés des faits |

## 2. Couche de faits dérivés — `src/engine/facts.js`

`clientFacts(client, jur)` calcule **une fois** (mémoïsé jusqu'à la prochaine
mutation) tout ce qu'une vue pourrait autrement demander à l'utilisateur :

- par membre : revenus actifs aujourd'hui par type, revenu imposable, impôt
  complet (`computeTax`), **taux marginaux** ordinaire / gains en capital /
  dividendes déterminés / non déterminés, droits REER;
- ménage : revenu brut/net, impôt, dépenses, service de la dette, cotisations,
  surplus, taux d'épargne (= cotisations ÷ brut) et cible;
- bilan par traitement fiscal (+ PBR non enregistré), investissable;
- dettes amorties (composition semestrielle pour les hypothèques canadiennes),
  date de libération, intérêts totaux;
- couverture d'assurance par membre et primes annualisées (depuis `products[]`);
- pensions publiques par membre (montant au dossier ou estimation de la juridiction);
- faits d'entreprise (valorisation, impôt corporatif, taux PME, autre revenu du propriétaire);
- études (années restantes par enfant, REEE, subventions SCEE + IQEE).

`retirementFacts(client, jur)` expose la première année de retraite de la
projection (revenu imposable, taux marginal, PSV, soldes).

**Règle** : une vue ne demande jamais un nombre qui existe dans les faits; elle
le **préremplit** et, si l'utilisateur le modifie, le **persiste** avec
`saveWhatIf(store, 'vue', {...})`.

## 3. Moteurs numériques (`src/engine/`)

- `tax.js` — impôt canadien 2026 complet (BPA avec réduction, crédits emploi /
  pension / âge / cotisations, bonification RRQ déductible, travailleur autonome,
  abattement et crédits Québec, surtaxe + prime santé Ontario, récupération PSV),
  US 2026, UK 2026/27. Solveur exact `grossUpForNet` (retrait brut ⇒ net voulu),
  `rrifMinFactor` (REER → premier minimum à 72 ans).
- `amortization.js` — **la** seule implémentation d'amortissement (paiement,
  solde restant, simulation mensuelle, TRI). Utilisée par la projection,
  `debt.js`, `realestate.js`, `rentbuy.js`, la ligne du temps, la boîte à outils.
- `projection.js` — année par année, impôt par membre exact, retraits imposables
  résolus exactement, FERR forcé, PSV et récupération, niveau de dépenses,
  rendement déterministe par année (`detReturn`) exposé au Monte Carlo.
- `montecarlo.js` — semé par client (même probabilité partout), centré sur la
  projection (correction σ²/2), une seule exécution mise en cache par dossier.
- `decumulation.js`, `benefits.js`, `corporate.js`, `optimize.js`,
  `analysis.js`, `selfbiz.js`, `realestate.js`, … — tous lisent la juridiction,
  jamais de constante fiscale locale.
- `integrity.js` — détecte les incohérences entre sources (cotisations au-delà
  des droits, âges de prestation hors fenêtre, dette impayable, déficit, etc.).

## 4. Tests (`app/test/`, `./test/run.sh`)

| Suite | Vérifie |
|---|---|
| `correctness.mjs` | **Valeurs exactes** calculées à la main (impôt QC 60 k$ au cent près, PSV, crédits, RRQ autonome), propriétés (impôt monotone, aucune falaise fiscale), solveur brut/net, amortissement forme fermée = simulation, TRI, identités de la projection, reproductibilité et centrage Monte Carlo, identités de la couche de faits, migration idempotente du modèle, décaissement, prestations (point mort RRQ à 82 ans), intégration salaire/dividende, études, immobilier, autonome, fractionnement. |
| `fuzz.mjs` | 160 dossiers aléatoires + entrées sales dans tous les moteurs : sorties finies et bornées. |
| `harness.mjs` | 68 scénarios × 64 vues rendues en FR et EN sans erreur. |
| `interaction.mjs` | démarrage, navigation, fuzz des contrôles, opérations du store, dossier vide. |
| `synctest.mjs` | synchronisation cloud à deux appareils. |

## 5. Mise à jour annuelle

Chaque janvier : mettre à jour `src/jurisdictions/ca.js` (et `TAX_YEAR`),
relancer `./test/run.sh`, ajuster les valeurs « golden » de `correctness.mjs`
qui dépendent des paramètres (elles sont annotées).
