# 12 — Automatisations de vente et mise en place du CRM

**Client** : Joël Camiré, JC Capital (cabinet rattaché SFL Gestion de patrimoine)
**Objectif** : Doter Joël d'un système opérationnel d'automatisations commerciales qui réduit le travail répétitif, sécurise le suivi des prospects et clients, et respecte intégralement la Loi 25, l'AMF, la CSF et l'OCRI.
**Horizon** : Implémentation complète en 30 jours, ROI mesurable à 90 jours.
**Stack cible** : Equisoft (CRM SFL) + Google Workspace + Calendly + outil d'email marketing + Zapier/Make.

---

## Sommaire

1. Cartographie du stack actuel
2. CRM Equisoft — Setup et workflow
3. Automatisations — Outil par outil
4. Workflows complets par scénario (10 workflows)
5. Dashboard commercial
6. Stack technique recommandée (et alternative low-budget)
7. Plan d'implémentation 30 jours
8. Erreurs à éviter
9. Conformité Loi 25 / AMF sur les automations
10. KPIs de l'automation

---

## 1. Cartographie du stack actuel

### 1.1 Outils confirmés en place

| Outil | Version / Plan | Statut | Usage actuel |
|-------|----------------|--------|--------------|
| Gmail (Google Workspace) | Business Starter | Actif | Email pro admin@jccapital.ca + joelcamire@jccapital.ca |
| Google Calendar | Inclus Workspace | Actif | Calendrier perso et RDV |
| Google Drive | Inclus Workspace | Actif | Documents clients (à structurer) |
| Calendly | Plan à vérifier | Actif | Prise de RDV en ligne |
| Equisoft (probable) | Inclus SFL | À confirmer | CRM imposé par SFL |
| Site web | jccapital.ca | En construction | Pas encore de capture de leads |
| LinkedIn | Compte personnel | Présent | Pas utilisé pour la prospection automatisée |
| WhatsApp Business | Non | Absent | À évaluer pour clientèle référée |

### 1.2 Outils manquants ou à activer

- **Outil d'email marketing** : Gmail n'est pas conçu pour les envois groupés conformes (anti-spam, désabonnement, tracking). À choisir : Brevo (recommandation), Mailchimp ou ActiveCampaign.
- **Zapier ou Make** : aucun moteur d'intégration actuellement. Indispensable pour connecter le site web, Calendly, Equisoft et l'email marketing.
- **Outil SMS** : aucun. Calendly Pro inclut SMS, ou Twilio pour cas avancés.
- **LinkedIn Sales Navigator** : recommandé pour la prospection B2B (chefs d'entreprise, professionnels).
- **DocuSign / Adobe Sign** : pour les signatures électroniques de propositions (à valider — SFL fournit peut-être déjà un outil de signature électronique conforme).
- **Outil de dashboard** : Google Looker Studio (gratuit) ou Notion pour la vue d'ensemble.

### 1.3 Recommandations d'achat / gratuit

| Catégorie | Outil recommandé | Coût mensuel CAD | Gratuit possible ? |
|-----------|------------------|------------------|--------------------|
| CRM | Equisoft (inclus SFL) | 0 $ pour Joël | Oui (inclus) |
| Email marketing | Brevo (ex-Sendinblue) | 0-29 $ | Oui jusqu'à 300 envois/jour |
| SMS | Calendly Pro | 22 $ | Plan gratuit limité |
| Intégrations | Zapier Starter | 30 $ | Plan gratuit 100 tâches/mois |
| LinkedIn prospection | Sales Navigator Core | 110 $ | Non |
| Dashboard | Google Looker Studio | 0 $ | Oui |
| Signature électronique | À vérifier via SFL | 0 $ (probable) | Oui via SFL |
| Stockage docs | Google Drive (déjà payé) | 0 $ | Oui |

### 1.4 Budget mensuel cible

- **Stack idéale** : 191 $ CAD/mois (avec Sales Navigator)
- **Stack mid-range** : 81 $ CAD/mois (sans Sales Navigator)
- **Stack low-budget** : 0-30 $ CAD/mois (uniquement les plans gratuits)

---

## 2. CRM Equisoft — Setup et workflow

> **Note** : Les recommandations qui suivent supposent la version standard d'Equisoft Connect (CRM web) utilisée par les conseillers SFL. Certaines fonctionnalités peuvent varier selon la configuration imposée par SFL. **À vérifier dans Equisoft** au moment de l'implémentation.

### 2.1 Configuration initiale recommandée

#### Champs personnalisés (custom fields) à créer

**Sur la fiche contact :**

| Champ | Type | Valeurs / Format | Utilité |
|-------|------|------------------|---------|
| ICP (profil idéal) | Liste déroulante | Famille / Entrepreneur / Pré-retraité / Professionnel libéral / Investisseur actif | Segmentation |
| Source du lead | Liste déroulante | Référé / Site web / LinkedIn / Calendly direct / Événement / Partenaire | ROI canal |
| Statut conformité | Liste déroulante | À renouveler / À jour / Manque doc | Suivi obligations |
| Consentement marketing | Case à cocher + date | Oui / Non / Date | Loi 25 |
| Date dernier contact | Date (auto si possible) | YYYY-MM-DD | Détection clients à risque |
| Valeur estimée du dossier | Devise CAD | $ | Priorisation |
| Produits détenus | Multi-sélection | Vie / Invalidité / Maladies graves / FERR / REER / CELI / CELIAPP / REEE / Hypothèque | Cross-sell |
| Anniversaire | Date | YYYY-MM-DD | Workflow anniversaire |
| Anniversaire police | Date | YYYY-MM-DD | Revue annuelle |
| Référent (qui m'a référé) | Texte ou lookup | Nom contact | Programme de référence |
| Nb de personnes référées | Nombre | Entier | Identifier les ambassadeurs |
| Notes conformité | Texte long | Libre | Audit trail |

**Sur l'opportunité (deal) :**

| Champ | Type | Utilité |
|-------|------|---------|
| Type de produit | Multi-sélection | Distinguer assurance / placement / hypothèque |
| Compagnie pressentie | Liste déroulante | Manuvie / iA / Sun Life / Empire Vie / Beneva / autre |
| Prime estimée annuelle | Devise CAD | Forecast commissions |
| Montant placement initial | Devise CAD | Forecast volume |
| Probabilité de closure | Pourcentage | Forecast pondéré |

#### Pipelines (étapes de vente)

**Pipeline 1 — Assurance de personnes (vie, invalidité, maladies graves) :**

1. Lead / Nouveau contact
2. Pré-qualifié (besoins identifiés, capacité de payer validée)
3. RDV pris
4. RDV 1 effectué (collecte besoins + analyse)
5. Proposition en préparation (souscription, analyse médicale)
6. Proposition présentée
7. Décision en cours (attente client)
8. Closed-won (police émise) / Closed-lost (perdu)
9. Onboardé (livraison de police, premiers prélèvements OK)
10. Client actif (en suivi annuel)

**Pipeline 2 — Épargne collective (REER, CELI, FERR, CELIAPP, REEE) :**

1. Lead
2. Pré-qualifié (KYC initial fait)
3. RDV pris
4. RDV 1 effectué (profil investisseur, tolérance au risque)
5. Recommandation préparée (sélection de fonds, allocation)
6. Recommandation présentée
7. Décision / Signature en cours
8. Closed-won (comptes ouverts) / Closed-lost
9. Onboardé (premier transfert/cotisation effectué)
10. Client actif (revue annuelle programmée)

**Pipeline 3 — Hypothèque / référence partenaire :**

1. Lead
2. Pré-qualifié
3. Transféré au partenaire (courtier hypothécaire)
4. En cours chez partenaire
5. Closed-won (commission de référence reçue) / Closed-lost
6. Suivi long-terme (renouvellement à 5 ans)

#### Tags par profil ICP

- `ICP-Famille` (couples 30-45 ans avec enfants)
- `ICP-Entrepreneur` (propriétaires de PME)
- `ICP-PreRetraite` (55-65 ans, préparation retraite)
- `ICP-ProfLiberal` (médecins, notaires, dentistes, ingénieurs)
- `ICP-InvestisseurActif` (placement >250k$)

#### Tags par produit

- `Produit-Vie-Temporaire`
- `Produit-Vie-Permanente`
- `Produit-Invalidite`
- `Produit-MaladiesGraves`
- `Produit-FraisFuneraires`
- `Produit-REER`
- `Produit-CELI`
- `Produit-CELIAPP`
- `Produit-REEE`
- `Produit-FERR`
- `Produit-Hypotheque`

#### Tags par source

- `Source-Refere` (avec sous-tag : nom du référent en note)
- `Source-Web` (formulaire site jccapital.ca)
- `Source-Calendly-Direct` (lien Calendly partagé en privé)
- `Source-LinkedIn`
- `Source-Evenement` (atelier, webinaire)
- `Source-PartenaireComptable`
- `Source-PartenaireNotaire`
- `Source-PartenaireCourtierImmo`
- `Source-Cold-Outbound`

#### Workflows à activer dans Equisoft

> **À vérifier dans Equisoft** : la plupart des CRM modernes incluent un moteur de workflows. Si Equisoft Connect n'en dispose pas directement, on utilise Zapier comme contournement (section 3.6).

- Création automatique d'une tâche "Appeler dans 48 h" lors de l'ajout d'un lead.
- Rappel automatique pour la revue annuelle (J-30 avant l'anniversaire de police).
- Alerte si un contact n'a pas été touché depuis 180 jours.
- Notification quand un deal passe à "Proposition présentée" (mettre la décision-tracker en alerte).
- Email automatique d'accueil quand un contact passe à "Onboardé".

### 2.2 Pipeline de vente détaillé (étapes assurance)

| Étape | Définition | Critères de passage | Probabilité par défaut | Action attendue |
|-------|------------|---------------------|------------------------|-----------------|
| 1. Lead | Nouveau contact non qualifié | Coordonnées + au moins 1 point de besoin connu | 10 % | Premier contact dans 48 h |
| 2. Pré-qualifié | Besoin réel + capacité de payer validés | Budget approximatif connu | 20 % | Prendre RDV |
| 3. RDV pris | RDV confirmé dans Calendly | Date confirmée | 35 % | Préparation prospect |
| 4. RDV 1 effectué | Découverte complète faite | Analyse de besoins documentée | 50 % | Préparer proposition |
| 5. Proposition en préparation | Souscription / soumission en cours | Demande envoyée à la compagnie | 60 % | Suivi compagnie |
| 6. Proposition présentée | Document remis et expliqué | Client a vu les chiffres | 75 % | Closing call |
| 7. Décision en cours | Client réfléchit | Délai max 14 jours | 60 % | Relance J+3, J+7, J+14 |
| 8. Closed-won | Police émise et payée | Confirmation compagnie | 100 % | Démarrer onboarding |
| 8. Closed-lost | Refus client ou refus compagnie | Raison documentée | 0 % | Workflow nurturing |
| 9. Onboardé | 90 premiers jours OK | Premiers prélèvements + documents livrés | — | Passer en suivi |
| 10. Client actif | En suivi récurrent | Revue annuelle planifiée | — | Workflow anniversaire + revue |

### 2.3 Templates Equisoft (à créer)

> Tous les templates ci-dessous doivent être personnalisables avec les **variables de fusion** (nom, prénom, produit, etc.) disponibles dans Equisoft.

#### Template 1 — Email de bienvenue (post-formulaire web)

**Objet** : Bienvenue {{Prénom}} — vos prochaines étapes avec JC Capital

> Bonjour {{Prénom}},
>
> Merci d'avoir pris contact avec JC Capital. J'ai bien reçu votre demande concernant {{sujet}}.
>
> Voici ce qui s'en vient :
> 1. Je vais personnellement réviser votre situation dans les prochaines 48 h.
> 2. Je vous appellerai au {{Téléphone}} pour valider quelques éléments et confirmer si une rencontre est pertinente.
> 3. Si vous préférez choisir vous-même une plage horaire, voici mon agenda : [lien Calendly].
>
> Pendant ce temps, vous pouvez consulter notre guide gratuit : [lien lead magnet].
>
> Au plaisir d'échanger,
> Joël Camiré
> Conseiller en sécurité financière | Représentant en épargne collective
> JC Capital — partenaire SFL Gestion de patrimoine
> (581) 398-6747 | joelcamire@jccapital.ca

#### Template 2 — Email post-RDV 1

**Objet** : Suivi de notre rencontre — prochaines étapes

> Bonjour {{Prénom}},
>
> Merci pour le temps que vous m'avez accordé aujourd'hui. Voici un résumé des points discutés :
> - {{Point 1}}
> - {{Point 2}}
> - {{Point 3}}
>
> Comme convenu, je prépare une proposition adaptée à votre situation. Je vous reviens d'ici {{X jours ouvrables}} avec :
> - Une analyse comparative entre {{compagnie A}} et {{compagnie B}}
> - Des recommandations claires sur {{produit}}
> - Une estimation de coût détaillée
>
> En attendant, si vous avez besoin de discuter à nouveau, n'hésitez pas à m'écrire ou à m'appeler.
>
> Cordialement,
> Joël Camiré

#### Template 3 — Email post-RDV 2 (présentation de proposition)

**Objet** : Votre proposition est prête — résumons ensemble

> Bonjour {{Prénom}},
>
> Voici en pièce jointe la proposition que nous avons discutée aujourd'hui. Vous y trouverez :
> - Le détail des garanties recommandées
> - Le coût mensuel et annuel
> - Les options additionnelles à considérer
>
> Prenez le temps de la consulter avec {{Conjoint}}. Je vous suggère de m'envoyer vos questions par écrit avant notre prochain appel — ça nous fera gagner du temps.
>
> Je vous propose de se reparler le {{Date}} à {{Heure}}. Voici le lien si ça vous convient : [Calendly].
>
> Au plaisir,
> Joël Camiré

#### Template 4 — Email anniversaire client

**Objet** : Joyeux anniversaire {{Prénom}} !

> Bonjour {{Prénom}},
>
> Toute l'équipe de JC Capital se joint à moi pour vous souhaiter un joyeux anniversaire. Profitez bien de cette journée avec vos proches.
>
> Au plaisir de vous parler bientôt,
> Joël Camiré

> **Note conformité** : éviter d'inclure une offre commerciale dans un email purement personnel — séparer les communications commerciales (avec mention de désabonnement Loi 25) des messages relationnels.

#### Template 5 — Email revue annuelle

**Objet** : C'est le moment de votre revue annuelle — bloquons 30 minutes

> Bonjour {{Prénom}},
>
> Voilà déjà un an depuis notre dernière rencontre formelle. Comme convenu, c'est le moment de notre revue annuelle pour :
> - Vérifier que vos protections actuelles sont encore adaptées à votre situation
> - Discuter des changements survenus (famille, emploi, projets)
> - Réviser votre stratégie d'épargne et de placement
> - Identifier les opportunités fiscales pour {{Année}}
>
> Voici mon agenda : [lien Calendly — événement "Revue annuelle 30 min"].
>
> À très bientôt,
> Joël Camiré

#### Template 6 — Notes de rencontre

```
RENCONTRE — {{Date}} — {{Nom Client}}

Présents : {{Joël Camiré, conjoint, autre}}
Lieu / mode : {{Bureau / Visio / Téléphone}}
Durée : {{X minutes}}

1. CONTEXTE / CHANGEMENTS DEPUIS LA DERNIÈRE RENCONTRE
   -

2. OBJECTIFS CLIENT
   -

3. SITUATION FINANCIÈRE ACTUELLE
   - Revenus :
   - Dépenses :
   - Actifs :
   - Passifs :

4. PROTECTIONS ACTUELLES
   - Vie :
   - Invalidité :
   - Maladies graves :
   - Autres :

5. RECOMMANDATIONS DISCUTÉES
   -

6. DÉCISIONS PRISES
   -

7. PROCHAINES ÉTAPES
   - Action client :
   - Action conseiller :
   - Date prochain contact :

8. DOCUMENTS REMIS / À RECEVOIR
   -

CONFORMITÉ
- Consentement Loi 25 confirmé : Oui / Non
- Devoir de conseil documenté : Oui / Non
- Profil investisseur à jour : Oui / Non / N/A
```

#### Template 7 — Proposition (trame)

```
PROPOSITION FINANCIÈRE — {{Nom Client}}
Préparée par : Joël Camiré — JC Capital
Date : {{Date}}

1. RAPPEL DE VOTRE SITUATION
2. VOS OBJECTIFS
3. ANALYSE DE BESOINS
4. RECOMMANDATIONS
   4.1 Produit recommandé
   4.2 Compagnies comparées
   4.3 Coût mensuel / annuel
   4.4 Avantages / inconvénients
5. PROCHAINES ÉTAPES
6. CONDITIONS, DÉLAIS ET RÉSERVES
7. NOTES DE CONFORMITÉ (AMF / CSF / OCRI)
```

### 2.4 Reporting Equisoft à configurer

#### Dashboard pipeline (à afficher en page d'accueil)

- Nombre d'opportunités par étape
- Valeur totale du pipeline ($)
- Valeur pondérée du pipeline (selon probabilité par étape)
- Top 5 opportunités les plus chaudes

#### Taux de conversion par étape

| Étape | Métrique | Cible |
|-------|----------|-------|
| Lead → Pré-qualifié | % | 60 % |
| Pré-qualifié → RDV pris | % | 50 % |
| RDV pris → RDV 1 effectué | % (taux de no-show inversé) | 90 % |
| RDV 1 → Proposition présentée | % | 70 % |
| Proposition présentée → Closed-won | % | 50 % |

#### Revenus par produit

- Volume primes vendu par mois (par produit)
- Volume placement vendu par mois (par produit)
- Estimation commissions par mois

#### Source des leads (ROI par canal)

- Nombre de leads par source (mois)
- Taux de conversion par source
- Coût d'acquisition estimé par source
- Lifetime value moyenne par source

---

## 3. AUTOMATISATIONS — Outil par outil

### 3.1 Gmail (déjà disponible)

#### Réponses prédéfinies (templates)

Activer dans Gmail : Paramètres → Avancé → Modèles → Activer.

Templates à créer :

1. **Premier contact froid** — réponse standard à un email de prospection reçu.
2. **Confirmation RDV** — quand le RDV n'est pas via Calendly.
3. **Demande de pièces** — liste standard de documents à fournir (relevés, déclarations, polices existantes).
4. **Refus poli** — si le prospect n'est pas dans l'ICP.
5. **Relance proposition** — J+3 sans nouvelle.
6. **Demande de référence** — post-closing.
7. **Réponse "absent du bureau"** — délais de réponse + lien Calendly.

#### Filtres et libellés automatiques

| Filtre | Action |
|--------|--------|
| De : noreply@calendly.com | Libellé "Calendly" + marquer lu |
| Objet contient "Equisoft" ou "SFL" | Libellé "Conformité" |
| De : *@manulife.com OR *@ia.ca OR *@sunlife.com | Libellé "Compagnies" |
| Objet contient "Formulaire site web" | Libellé "Leads web" + star |
| De : adresses de clients (à enrichir) | Libellé "Clients" |
| Contient "désabonner" / "unsubscribe" | Libellé "Conformité — désabonnement" + alerte |

#### Signatures multiples

À configurer 2-3 signatures selon le contexte :

1. **Signature complète** (avec mentions AMF / CSF / OCRI / SFL) — pour premier contact et communications formelles.
2. **Signature courte** — pour échanges récurrents.
3. **Signature mobile** — depuis l'application mobile.

**Modèle signature complète :**

```
Joël Camiré
Conseiller en sécurité financière
Représentant en épargne collective
JC Capital — partenaire SFL Gestion de patrimoine
(581) 398-6747 | joelcamire@jccapital.ca
www.jccapital.ca | Calendly : [lien]

Mentions :
- Inscription AMF
- Membre CSF
- Membre OCRI (via SFL pour les activités en épargne collective)

Avis de confidentialité : Ce courriel et ses pièces jointes sont confidentiels.
Si vous l'avez reçu par erreur, supprimez-le et avisez l'expéditeur.
```

#### Programmation d'envoi

- Préparer les emails le soir / fin de semaine mais les programmer pour envoi entre 8 h et 17 h en semaine.
- Pour les emails de relance : programmer la prochaine relance immédiatement après l'envoi.

#### Rappels (snooze)

- Snoozer les emails clients en attente de réponse pour qu'ils reviennent dans la boîte de réception au moment opportun (J+3, J+7, J+14).
- Snoozer les emails de conformité pour la date de la prochaine action requise.

### 3.2 Calendly (déjà configuré)

#### Types d'événements à créer

1. **Découverte 30 min** (visio ou téléphone) — pour prospects.
2. **Rencontre client 60 min** (en personne ou visio) — pour clients existants ou prospects qualifiés.
3. **Revue annuelle 30 min** — réservé aux clients actifs (lien partagé en privé).
4. **Closing 20 min** — pour les propositions à finaliser.

#### Workflows Calendly à activer

| Workflow | Trigger | Action | Délai |
|----------|---------|--------|-------|
| Confirmation RDV | RDV booké | Email confirmation au prospect | Immédiat |
| Rappel J-1 | RDV booké | Email rappel + lien | 24 h avant |
| Rappel H-1 | RDV booké | SMS (Calendly Pro) ou email | 1 h avant |
| No-show follow-up | RDV manqué | Email "désolé de vous avoir manqué" + lien rebook | 2 h après |
| Post-RDV merci | RDV terminé | Email résumé + prochaines étapes | 2 h après |
| Demande de référence | RDV terminé | Email demande de témoignage / référence | J+30 |

#### Intégrations Calendly

- **Calendly → Google Calendar** : événements créés automatiquement dans le calendrier "RDV clients".
- **Calendly → Equisoft** : via Zapier (voir section 3.6) — création automatique d'une activité dans la fiche contact.
- **Calendly → email marketing** : ajout automatique du prospect à la liste "Prospects en cours".

### 3.3 Google Calendar

#### Calendriers par catégorie

Créer 4-5 calendriers distincts dans Google Calendar (couleurs différentes) :

1. **RDV clients** (couleur bleue) — synchro Calendly.
2. **Prospection** (couleur orange) — appels sortants, follow-ups.
3. **Administratif / conformité** (couleur grise) — formations OCRI, renouvellements AMF, rapports CSF.
4. **Perso** (couleur verte) — bloqué pour la famille, sport, etc.
5. **Focus time** (couleur rouge) — créneaux protégés pour la préparation des propositions, la rédaction de contenu.

#### Blocs Focus Time

Activer la fonction **Focus Time** de Google Calendar :

- Bloquer minimum 2 h en avant-midi (9 h - 11 h) chaque jour pour les tâches à forte valeur (préparation de RDV, propositions).
- Désactiver les notifications pendant ces blocs.
- Refuser automatiquement les invitations conflictuelles.

#### Notifications

- Notification 24 h avant pour chaque RDV client.
- Notification 30 min avant pour préparation immédiate.
- Pas de notification pour les blocs perso et Focus Time (sauf début).

### 3.4 Outil d'email marketing (à choisir)

#### Comparaison détaillée

| Critère | Mailchimp | Brevo (ex-Sendinblue) | ActiveCampaign |
|---------|-----------|-----------------------|----------------|
| Plan gratuit | 500 contacts, 1000 envois/mois | Illimité contacts, 300 envois/jour | Aucun |
| Plan payant entrée | 17 $ CAD/mois (Essentials) | 12 $ CAD/mois (Starter) | 19 $ CAD/mois (Lite) |
| Plan payant 5000 contacts | ~95 $ CAD/mois | ~35 $ CAD/mois | ~90 $ CAD/mois |
| Automations / séquences | Oui (limité gratuit) | Oui (illimité, même gratuit) | Oui (le plus puissant) |
| Segmentation avancée | Oui | Oui | Oui (CRM intégré) |
| SMS marketing | Add-on payant | Inclus (crédit à acheter) | Add-on |
| Conformité Loi 25 (CAN-SPAM, anti-spam) | Oui | Oui | Oui |
| Hébergement données | États-Unis | France / Europe (préférable Loi 25) | États-Unis |
| Support en français | Limité | Excellent | Limité |
| Intégration Zapier | Oui | Oui | Oui |
| Intégration Equisoft directe | Non | Non | Non (toujours via Zapier) |

#### Recommandation pour JC Capital

**Brevo (ex-Sendinblue)** — pour 3 raisons :

1. **Hébergement européen** : meilleur alignement avec la Loi 25 du Québec (transfert de données hors juridiction plus simple à justifier).
2. **Coût** : largement le moins cher à l'échelle (5000 contacts à 35 $ vs 90-95 $ pour les concurrents).
3. **Plan gratuit généreux** : permet de démarrer sans coût pendant les premiers mois.

**Alternative si Joël préfère un outil mainstream** : Mailchimp (mais coût grimpe rapidement).

#### Configuration à faire dans Brevo

**Listes par profil ICP :**

- Liste 1 : Familles
- Liste 2 : Entrepreneurs
- Liste 3 : Pré-retraités
- Liste 4 : Professionnels libéraux
- Liste 5 : Investisseurs actifs
- Liste 6 : Clients actifs (toutes catégories)
- Liste 7 : Partenaires d'affaires (comptables, notaires, courtiers)
- Liste 8 : Anciens clients / Closed-lost (nurturing long-terme)

**Séquences (campagnes automatisées) :**

Les séquences détaillées par produit / ICP sont déjà documentées dans `05-marketing-assurance.md`. À configurer dans Brevo :

- Séquence "Bilan protection famille" (5-7 emails sur 21 jours)
- Séquence "Optimisation fiscale entrepreneur" (5 emails sur 14 jours)
- Séquence "Pré-retraite : sécuriser son patrimoine" (7 emails sur 30 jours)
- Séquence "Onboarding nouveau client" (5 emails sur 90 jours)
- Séquence "Revue annuelle" (3 emails J-30, J-14, J-3)
- Séquence "Réactivation client inactif" (4 emails sur 21 jours)

**Tags Brevo (en plus des listes) :**

- `Source-Web`, `Source-Refere`, `Source-LinkedIn`, etc.
- `Stade-Lead`, `Stade-Prospect`, `Stade-Client`
- `Engagement-Eleve` (ouvre ≥ 60 % des emails), `Engagement-Faible` (< 20 %)
- `Consent-Marketing-OK` (consentement Loi 25 horodaté)

**Reporting Brevo :**

- Taux d'ouverture par campagne (cible : > 30 % pour le secteur services financiers)
- Taux de clic (cible : > 3 %)
- Taux de désabonnement (alerte si > 0,5 %)
- Score d'engagement par contact
- Conversions (RDV bookés post-email)

### 3.5 Outil SMS (optionnel)

#### Options

| Outil | Coût | Cas d'usage |
|-------|------|-------------|
| Calendly Pro | 22 $ CAD/mois | Rappels RDV uniquement |
| Twilio | ~0,01 $/SMS + 1 $/mois numéro | Cas custom (workflows Zapier, SMS marketing) |
| Brevo SMS | 0,06 $/SMS Canada | SMS marketing intégré à Brevo |

#### Recommandation budget

- **Phase 1 (M1-M3)** : Calendly Pro suffisant pour les rappels RDV.
- **Phase 2 (M4+)** : ajouter Brevo SMS pour des rappels d'événements (webinaires) ou des messages de revue annuelle.
- **Éviter** : SMS marketing massif — risque de plaintes à la LCAP (Loi canadienne anti-pourriel) et perception intrusive en services financiers.

### 3.6 Zapier / Make pour intégrations

#### Pourquoi Zapier (vs Make / n8n)

- **Zapier** : le plus mature, plus d'intégrations natives (5000+ apps), interface très accessible. Coût plus élevé.
- **Make (ex-Integromat)** : plus puissant, visuel par scénarios, ~50 % moins cher pour des volumes similaires. Courbe d'apprentissage plus raide.
- **n8n** : open-source, auto-hébergé possible. Pour utilisateur technique.

**Recommandation** : démarrer avec **Zapier Starter (30 $ CAD/mois)** pour 5-10 zaps essentiels, migrer vers Make si le volume explose.

#### 10 workflows Zapier détaillés

**Zap 1 — Formulaire site web → Equisoft + Brevo + tâche Equisoft**

- Trigger : nouvelle soumission de formulaire sur jccapital.ca (via Formspark, Webflow, ou Google Forms)
- Étape 1 : créer un contact dans Equisoft avec source = "Web"
- Étape 2 : ajouter le contact à la liste Brevo correspondant à l'ICP indiqué dans le formulaire
- Étape 3 : déclencher la séquence email de bienvenue dans Brevo
- Étape 4 : créer une tâche dans Equisoft "Appeler {{Prénom}} dans les 48 h"
- Étape 5 : notification Slack ou email à Joël avec résumé du lead

**Zap 2 — RDV Calendly booké → Equisoft + SMS + préparation**

- Trigger : nouveau RDV booké dans Calendly
- Étape 1 : créer/mettre à jour le contact dans Equisoft
- Étape 2 : créer une opportunité au stade "RDV pris"
- Étape 3 : créer une tâche "Préparer rencontre {{Prénom}}" 1 jour avant
- Étape 4 : envoyer un SMS via Twilio au prospect avec le lien Google Meet et un rappel
- Étape 5 : ajouter une note à Joël avec le lien LinkedIn du prospect (recherche automatique via Clearbit ou Apollo si dispo)

**Zap 3 — RDV Calendly annulé → relance auto**

- Trigger : annulation Calendly
- Étape 1 : mettre à jour le statut dans Equisoft → "RDV annulé"
- Étape 2 : déclencher une séquence Brevo "Relance après annulation" (3 emails sur 14 jours)
- Étape 3 : notifier Joël pour un appel personnel

**Zap 4 — Email reçu d'un client connu → tâche Equisoft**

- Trigger : nouvel email Gmail reçu, libellé "Clients"
- Étape 1 : rechercher le contact dans Equisoft par adresse email
- Étape 2 : si trouvé, créer une note dans Equisoft avec le contenu de l'email
- Étape 3 : créer une tâche "Répondre à {{Prénom}}" avec deadline J+1
- Étape 4 : mettre à jour le champ "Date dernier contact" sur la fiche

**Zap 5 — Anniversaire client → email + tâche d'appel**

- Trigger : Zapier Schedule + filtre sur les contacts Equisoft avec anniversaire = aujourd'hui
- Étape 1 : envoyer un email personnalisé via Gmail (template "Joyeux anniversaire")
- Étape 2 : créer une tâche dans Equisoft "Appeler {{Prénom}} aujourd'hui"
- Étape 3 : (optionnel) commander une carte papier via Sendcard / Postable pour les clients VIP

**Zap 6 — Anniversaire de police → revue annuelle**

- Trigger : Schedule quotidien sur le champ "Anniversaire police" = J+30
- Étape 1 : envoyer l'email "Revue annuelle" (template 5)
- Étape 2 : créer une tâche dans Equisoft "Confirmer RDV revue annuelle"
- Étape 3 : ajouter le contact à la séquence Brevo "Revue annuelle"

**Zap 7 — Contact silencieux depuis 180 jours → alerte**

- Trigger : Schedule hebdomadaire qui filtre les contacts dont "Date dernier contact" > 180 jours
- Étape 1 : créer une tâche dans Equisoft "Réactivation {{Prénom}}"
- Étape 2 : ajouter à la séquence Brevo "Réactivation client inactif"
- Étape 3 : email récap hebdomadaire à Joël avec la liste

**Zap 8 — Référé reçu → workflow remerciement**

- Trigger : nouveau contact Equisoft avec source = "Référé"
- Étape 1 : envoyer un email automatique au référent (template "Merci pour la référence")
- Étape 2 : incrémenter le champ "Nb de personnes référées" sur la fiche du référent
- Étape 3 : si "Nb de personnes référées" ≥ 3, taguer le référent "Ambassadeur" + notifier Joël pour un cadeau de remerciement

**Zap 9 — Nouveau client signé (Closed-won) → onboarding**

- Trigger : statut opportunité Equisoft passe à "Closed-won"
- Étape 1 : ajouter le contact à la séquence Brevo "Onboarding 90 jours"
- Étape 2 : créer 5 tâches dans Equisoft : J+1 (appel bienvenue), J+7 (livraison documents), J+30 (vérif premier prélèvement), J+60 (check-in), J+90 (revue 90 jours)
- Étape 3 : envoyer un email avec les coordonnées de l'administration SFL
- Étape 4 : déclencher l'email "Demande de témoignage" à J+45

**Zap 10 — Désabonnement Brevo → mise à jour Equisoft + conformité**

- Trigger : désabonnement détecté dans Brevo
- Étape 1 : mettre à jour le champ "Consentement marketing" = Non dans Equisoft
- Étape 2 : ajouter une note datée "Désabonnement Loi 25 le {{Date}}"
- Étape 3 : retirer le contact de toutes les listes marketing
- Étape 4 : notification email à Joël pour archivage conformité

#### Coût total Zapier

- 30 $ CAD/mois (plan Starter) couvre les 10 zaps si chacun déclenche < 100 fois/mois en moyenne.
- Si volume > 750 tâches/mois, passer au plan Professional (~75 $ CAD/mois).

---

## 4. WORKFLOWS COMPLETS PAR SCÉNARIO

### Workflow 1 — Lead du site web entre dans le système

**Trigger** : Soumission du formulaire "Bilan protection 5 min" ou "Calculateur besoins assurance" sur jccapital.ca.

| Étape | Action | Outil | Délai | Manuel / Auto |
|-------|--------|-------|-------|---------------|
| 1 | Form soumis | Site web | T0 | — |
| 2 | Email de confirmation envoyé au prospect avec lead magnet | Brevo (séquence) | T0 + 1 min | Auto |
| 3 | Contact créé dans Equisoft avec tag "Lead-Web" + source | Zapier → Equisoft | T0 + 2 min | Auto |
| 4 | Démarrage séquence Brevo (7 emails sur 30 jours) | Brevo | T0 | Auto |
| 5 | Tâche créée dans Equisoft "Appeler {{Prénom}} dans 48 h" | Zapier | T0 + 5 min | Auto |
| 6 | Notification email à Joël avec résumé du lead | Zapier | T0 + 5 min | Auto |
| 7 | Premier appel sortant de Joël | Téléphone | T0 + 24-48 h | Manuel |
| 8 | Si pas de réponse → relance auto J+7 par email + tâche "Réappeler" | Brevo + Zapier | T+7 j | Auto |
| 9 | Si RDV booké via Calendly → Workflow 2 | Calendly | — | Auto |
| 10 | Si pas de réaction après 30 jours → tag "Cold lead" + sortie de séquence | Brevo | T+30 j | Auto |

**Templates utilisés** : Welcome (template 1) + séquence "Bilan protection famille".

**Validation manuelle** : étape 7 (appel sortant).

### Workflow 2 — RDV booké via Calendly

**Trigger** : Nouveau RDV dans Calendly.

| Étape | Action | Outil | Délai | Manuel / Auto |
|-------|--------|-------|-------|---------------|
| 1 | Email de confirmation Calendly envoyé | Calendly | T0 | Auto |
| 2 | Événement créé dans Google Calendar "RDV clients" | Calendly → Google Cal | T0 | Auto |
| 3 | Contact créé/mis à jour dans Equisoft + opportunité au stade "RDV pris" | Zapier | T0 + 2 min | Auto |
| 4 | Tâche "Préparer rencontre" créée pour Joël | Zapier → Equisoft | J-1 | Auto |
| 5 | LinkedIn du prospect recherché (manuel ou via Apollo) | Manuel | J-1 | Manuel |
| 6 | Rappel J-1 envoyé au prospect | Calendly | J-1 | Auto |
| 7 | Rappel H-1 envoyé au prospect (SMS si Calendly Pro) | Calendly | H-1 | Auto |
| 8 | RDV effectué | Visio / téléphone / bureau | J | Manuel |
| 9 | Note de rencontre saisie dans Equisoft (template 6) | Equisoft | J + 2 h | Manuel |
| 10 | Workflow 3 démarré | — | — | — |

**Templates utilisés** : Confirmation Calendly + template "Note de rencontre".

**Validation manuelle** : étapes 5, 8, 9.

### Workflow 3 — Post-RDV 1

**Trigger** : RDV terminé dans Calendly (ou statut Equisoft "RDV 1 effectué").

| Étape | Action | Outil | Délai | Manuel / Auto |
|-------|--------|-------|-------|---------------|
| 1 | Email "Suivi de notre rencontre" envoyé (template 2) | Equisoft ou Gmail | J + 2 h | Auto (avec validation) |
| 2 | Opportunité passe au stade "Proposition en préparation" | Equisoft | J + 1 j | Manuel |
| 3 | Joël prépare la proposition (souscription, analyse) | Manuel | J+1 à J+5 | Manuel |
| 4 | Si soumission à compagnie : tag "En attente compagnie" | Equisoft | — | Manuel |
| 5 | Tâche "Suivre compagnie" créée si pas de retour à J+10 | Equisoft | J+10 | Auto |
| 6 | Une fois proposition prête → RDV 2 proposé via Calendly | Manuel + Calendly | J+5 à J+10 | Manuel |
| 7 | Si pas de RDV 2 booké → relance J+3, J+7, J+14 (séquence Brevo) | Brevo | — | Auto |

### Workflow 4 — Proposition à envoyer

**Trigger** : Opportunité Equisoft passe à "Proposition présentée".

| Étape | Action | Outil | Délai | Manuel / Auto |
|-------|--------|-------|-------|---------------|
| 1 | RDV 2 effectué (présentation de la proposition) | Visio / bureau | J | Manuel |
| 2 | Document de proposition envoyé par email avec signature électronique si applicable | Gmail + DocuSign | J + 2 h | Manuel |
| 3 | Email récapitulatif envoyé (template 3) | Equisoft ou Gmail | J + 2 h | Manuel ou Auto |
| 4 | Opportunité passe au stade "Décision en cours" | Equisoft | J | Manuel |
| 5 | Relance J+3 : email court "Avez-vous des questions ?" | Brevo (séquence) | J+3 | Auto |
| 6 | Relance J+7 : appel téléphonique | Téléphone | J+7 | Manuel |
| 7 | Relance J+14 : dernier email "Souhaitez-vous toujours avancer ?" | Brevo ou Gmail | J+14 | Auto |
| 8 | Si décision positive → Workflow 5 | — | — | — |
| 9 | Si décision négative → Workflow "Closed-lost" (nurturing 6 mois) | — | — | — |

### Workflow 5 — Closing positif (nouveau client)

**Trigger** : Opportunité passe à "Closed-won".

| Étape | Action | Outil | Délai | Manuel / Auto |
|-------|--------|-------|-------|---------------|
| 1 | Statut Equisoft → "Closed-won" + montant final + commission estimée | Equisoft | J | Manuel |
| 2 | Email de remerciement + bienvenue envoyé | Gmail (template à créer) | J + 1 h | Manuel |
| 3 | Démarrage Workflow 6 (Onboarding 90 jours) | — | J | Auto |
| 4 | Tâche "Demander une référence" créée pour J+45 | Equisoft | J+45 | Auto |
| 5 | Mise à jour pipeline (passage à étape 9 "Onboardé" après confirmation compagnie) | Equisoft | J+7 à J+30 | Manuel |

### Workflow 6 — Onboarding 90 jours

**Trigger** : Statut Equisoft "Closed-won" (déclenché par Workflow 5).

| Jour | Action | Outil | Manuel / Auto |
|------|--------|-------|---------------|
| J+1 | Email + appel "Bienvenue, voici les prochaines étapes" | Gmail + téléphone | Manuel |
| J+7 | Email "Voici vos documents officiels" + envoi PDF police / contrat | Gmail | Auto |
| J+14 | Email "Comment configurer votre accès au portail SFL / compagnie" | Gmail (template) | Auto |
| J+30 | Vérification : premier prélèvement OK ? Si non → escalade | Equisoft + manuel | Manuel |
| J+45 | Email "Comment ça se passe ? + demande de témoignage" | Gmail (template) | Auto |
| J+60 | Check-in téléphonique court (10 min) | Téléphone | Manuel |
| J+90 | Revue à 90 jours : RDV programmé via Calendly | Calendly | Manuel |
| J+90 | Passage du contact au statut "Client actif" dans Equisoft | Equisoft | Manuel |
| J+90 | Ajout aux listes Brevo "Clients actifs" + retrait des listes "Prospects" | Brevo | Auto via Zapier |

### Workflow 7 — Anniversaire client

**Trigger** : Date du jour = anniversaire client dans Equisoft.

| Étape | Action | Outil | Délai | Manuel / Auto |
|-------|--------|-------|-------|---------------|
| 1 | Email automatique "Joyeux anniversaire" (template 4) | Brevo ou Gmail | T0 | Auto |
| 2 | Tâche dans Equisoft "Appeler {{Prénom}} pour anniversaire" | Equisoft | T0 | Auto |
| 3 | Pour clients VIP (top 20 %) : commande carte papier | Sendcard / Postable | T0 | Auto |
| 4 | Pour clients VIP : envoi cadeau (vin, panier, etc.) selon budget | Manuel | T0 | Manuel |
| 5 | Mise à jour "Date dernier contact" | Equisoft | T0 | Auto |

### Workflow 8 — Revue annuelle

**Trigger** : Champ "Anniversaire police" - 30 jours = aujourd'hui.

| Jour | Action | Outil | Manuel / Auto |
|------|--------|-------|---------------|
| J-30 | Email "C'est le moment de votre revue annuelle" + lien Calendly | Brevo (template 5) | Auto |
| J-14 | Relance automatique si pas de RDV booké | Brevo | Auto |
| J-3 | Dernière relance + tâche "Appeler pour booker RDV" | Brevo + Equisoft | Auto |
| J0 | Si RDV non booké → tâche urgente Joël + appel direct | Equisoft | Manuel |
| RDV | Revue annuelle effectuée + mise à jour conformité (KYC, profil investisseur) | Manuel | Manuel |
| Post-RDV | Note de rencontre + nouvelle date d'anniversaire mise à jour | Equisoft | Manuel |

### Workflow 9 — Référé reçu

**Trigger** : Nouveau contact Equisoft avec source = "Référé" + nom du référent renseigné.

| Étape | Action | Outil | Délai | Manuel / Auto |
|-------|--------|-------|-------|---------------|
| 1 | Email automatique au référent : "Merci pour la référence, je m'occupe de {{nouveau contact}}" | Gmail (template) | T0 + 5 min | Auto |
| 2 | Champ "Nb personnes référées" du référent incrémenté | Equisoft via Zapier | T0 | Auto |
| 3 | Si "Nb référés" ≥ 3 → tag "Ambassadeur" + tâche "Envoyer cadeau" à Joël | Equisoft | T0 | Auto |
| 4 | Démarrage Workflow 1 pour le nouveau contact (avec tag "Référé" prioritaire) | — | T0 | Auto |
| 5 | Email automatique au référent après le premier RDV avec le nouveau contact : "RDV effectué, merci encore" | Brevo | J + RDV1 | Auto |
| 6 | Si nouveau contact devient client : email + cadeau / commission au référent (selon programme) | Manuel + Equisoft | J + Closed-won | Manuel |

### Workflow 10 — Client à risque (silencieux depuis 6 mois)

**Trigger** : Hebdomadaire, filtre Equisoft "Date dernier contact > 180 jours" + statut = "Client actif".

| Étape | Action | Outil | Délai | Manuel / Auto |
|-------|--------|-------|-------|---------------|
| 1 | Liste des clients à risque envoyée à Joël (email hebdo) | Zapier | Lundi matin | Auto |
| 2 | Tâche "Réactivation {{Prénom}}" créée dans Equisoft | Zapier | T0 | Auto |
| 3 | Démarrage séquence Brevo "Réactivation client inactif" (4 emails sur 21 jours) | Brevo | T0 | Auto |
| 4 | Si ouverture email + clic → tâche urgente "Appeler {{Prénom}}" | Brevo → Zapier | — | Auto |
| 5 | Appel téléphonique de Joël | Téléphone | T+7 à T+14 j | Manuel |
| 6 | Si pas de réaction après 21 jours → escalade : courrier postal personnel + offre revue gratuite | Manuel | T+21 j | Manuel |
| 7 | Si toujours rien : tag "Client dormant" + sortie active de la liste principale | Equisoft | T+45 j | Manuel |

---

## 5. DASHBOARD COMMERCIAL

### 5.1 Métriques quotidiennes (à consulter chaque matin)

| Métrique | Source | Objectif |
|----------|--------|----------|
| RDV du jour | Google Calendar / Calendly | Préparation immédiate |
| Tâches Equisoft dues aujourd'hui | Equisoft | Tout fermer |
| Emails non lus prioritaires | Gmail (libellés "Clients", "Prospects") | Répondre < 24 h |
| Nouveaux leads dans Equisoft (J-1) | Equisoft | Appeler tous dans 48 h |
| Valeur du pipeline (toutes étapes) | Equisoft | Garder en tête objectif annuel |

### 5.2 Métriques hebdomadaires (revue chaque vendredi 16 h)

| Métrique | Source | Cible |
|----------|--------|-------|
| Nouveaux leads (semaine) | Equisoft / Brevo | ≥ 5 |
| RDV effectués | Calendly / Equisoft | ≥ 8 |
| Propositions envoyées | Equisoft | ≥ 3 |
| Closings (Closed-won) | Equisoft | ≥ 1 |
| Closed-lost (avec raison documentée) | Equisoft | À analyser |
| Taux de no-show Calendly | Calendly | < 10 % |
| Taux d'ouverture des séquences Brevo | Brevo | > 30 % |
| Tâches en retard | Equisoft | 0 |

### 5.3 Métriques mensuelles (revue dernier vendredi du mois)

| Métrique | Source | Cible |
|----------|--------|-------|
| Volume primes vendu ($/mois) | Equisoft | Selon objectif annuel |
| Volume placement vendu ($/mois) | Equisoft | Selon objectif annuel |
| Commissions estimées ($/mois) | Equisoft + Sheets | À tracker |
| ROI par canal d'acquisition | Equisoft + Sheets | Identifier top 2 canaux |
| Nb de référés reçus | Equisoft (tag) | ≥ 3/mois |
| Nb de référés convertis | Equisoft | Taux conversion |
| NPS (Net Promoter Score) — sondage trimestriel | Outil sondage (Typeform / Google Forms) | > 50 |
| Taux de désabonnement Brevo | Brevo | < 0,5 %/mois |
| Pipeline vs forecast | Equisoft | Variance < 15 % |

### 5.4 Outil suggéré pour dashboard

#### Google Looker Studio (gratuit) — recommandation

- Connexion native à Google Sheets, Google Calendar, Google Analytics.
- Connexion à Equisoft via export CSV régulier (manuel ou via Zapier) puis import Sheets.
- Connexion Calendly via API ou Zapier.
- Connexion Brevo via API ou export CSV.

**Limites** : pas de connexion native à Equisoft → nécessite Sheets en intermédiaire.

#### Tableau (si budget)

- ~80 $ CAD/mois.
- Plus puissant mais surdimensionné pour un cabinet solo.

#### Notion (si simple suffit)

- Plan personnel gratuit.
- Tableaux et dashboards simples mais visuels.
- Bonne option pour un dashboard hebdomadaire manuel.

### 5.5 Template Google Sheets dashboard à reproduire

#### Structure des onglets

1. **Données brutes — Pipeline** (export Equisoft hebdomadaire)
2. **Données brutes — Calendly** (export ou API)
3. **Données brutes — Brevo** (export ou API)
4. **Calculs** (formules cachées)
5. **Dashboard quotidien** (vue de jour)
6. **Dashboard hebdomadaire** (vue de semaine)
7. **Dashboard mensuel** (vue de mois)
8. **Forecast annuel** (projection commissions / volume)
9. **ROI canaux** (analyse par source de lead)
10. **Conformité** (audit trail consentements + désabonnements)

#### Colonnes clés de l'onglet "Données brutes — Pipeline"

| Colonne | Type | Source |
|---------|------|--------|
| ID contact | Texte | Equisoft |
| Nom complet | Texte | Equisoft |
| ICP | Liste | Equisoft |
| Source | Liste | Equisoft |
| Stade | Liste | Equisoft |
| Date création | Date | Equisoft |
| Date dernier contact | Date | Equisoft |
| Valeur estimée | Devise | Equisoft |
| Probabilité (%) | % | Equisoft |
| Valeur pondérée | Formule = Valeur × Probabilité | Calcul |
| Date prochaine action | Date | Equisoft |
| Référent | Texte | Equisoft |

#### Formules clés

```
// Valeur pipeline totale
=SUMIF(Stade; "<>Closed-lost"; Valeur)

// Valeur pondérée
=SUMPRODUCT(Valeur; Probabilité)

// Taux conversion étape A → B
=COUNTIF(Stade; "B") / COUNTIF(Stade; "A OU PLUS AVANCÉ")

// Leads inactifs > 180 jours
=COUNTIFS(Stade; "Client actif"; "Date dernier contact"; "<"&TODAY()-180)

// Forecast commissions mois en cours
=SUMIFS(Commission_estimée; "Date_closing_prévue"; ">="&DATE(YEAR(TODAY());MONTH(TODAY());1); "Date_closing_prévue"; "<"&DATE(YEAR(TODAY());MONTH(TODAY())+1;1))
```

#### Graphiques recommandés

1. **Pipeline en entonnoir** : barres horizontales par étape, largeur = nombre d'opportunités.
2. **Évolution du pipeline (4 semaines)** : ligne avec valeur totale et valeur pondérée.
3. **Répartition des leads par source** : camembert.
4. **Taux de conversion par étape** : barres verticales.
5. **Forecast vs réalisé (commissions mensuelles)** : barres comparatives.
6. **Top 10 opportunités chaudes** : tableau trié par valeur pondérée décroissante.
7. **Clients à risque** : tableau filtré par "Date dernier contact > 180j".

---

## 6. STACK TECHNIQUE RECOMMANDÉE

### 6.1 Stack idéale (~191 $ CAD/mois)

| Outil | Plan | Coût mensuel CAD | Justification |
|-------|------|-------------------|---------------|
| Equisoft CRM | Inclus SFL | 0 $ | Obligatoire (réseau SFL) |
| Google Workspace Business Starter | Déjà payé | 0 $ (déjà payé) | Email pro + Drive + Calendar + Meet |
| Calendly Pro | 22 $ | 22 $ | SMS rappels + workflows avancés |
| Brevo Business | 29 $ | 29 $ | Email marketing illimité + automations |
| Zapier Starter | 30 $ | 30 $ | 5-10 zaps essentiels |
| LinkedIn Sales Navigator Core | 110 $ | 110 $ | Prospection B2B ciblée |
| Total | | **191 $/mois** | |

### 6.2 Stack mid-range (~81 $ CAD/mois) — sans Sales Navigator

| Outil | Plan | Coût mensuel CAD |
|-------|------|-------------------|
| Equisoft + Google Workspace | 0 $ | 0 $ |
| Calendly Pro | 22 $ | 22 $ |
| Brevo Business | 29 $ | 29 $ |
| Zapier Starter | 30 $ | 30 $ |
| Total | | **81 $/mois** |

### 6.3 Stack low-budget (~0-30 $ CAD/mois) — phase de démarrage

| Outil | Plan | Coût mensuel CAD |
|-------|------|-------------------|
| Equisoft CRM | 0 $ | 0 $ |
| Google Workspace | déjà payé | 0 $ |
| Google Sheets (CRM additionnel ou backup) | 0 $ | 0 $ |
| Calendly gratuit | 0 $ | 0 $ |
| Brevo gratuit (300 envois/jour) | 0 $ | 0 $ |
| Pas de Zapier (intégrations manuelles) | 0 $ | 0 $ |
| Total | | **0-30 $/mois** |

**Limites stack low-budget :**

- Pas de SMS automatique Calendly (rappels seulement par email).
- Pas d'intégration automatique → tout doit être saisi à la main dans Equisoft.
- Risque élevé de doublons et d'oublis.
- À éviter dès que le volume dépasse 5 nouveaux leads / semaine.

---

## 7. PLAN D'IMPLÉMENTATION 30 JOURS

### Semaine 1 (1 - 7 juin 2026)

**Objectif** : Audit et structuration de base.

- Lundi : audit complet Equisoft actuel (champs existants, contacts en place, opportunités ouvertes). Sauvegarde CSV de tous les contacts.
- Mardi : création des champs personnalisés (section 2.1). Validation auprès du support SFL si besoin de l'admin Equisoft.
- Mercredi : configuration des 3 pipelines de vente.
- Jeudi : création de tous les tags (ICP, produit, source).
- Vendredi : nettoyage des contacts existants — assignation des tags ICP, source, statut conformité. Comptage Loi 25 : qui a consenti, qui n'a pas, qui est sans réponse.
- Samedi : segmentation Google Calendar en 5 calendriers (RDV, prospection, admin, perso, focus). Migration des événements existants.

**Livrable** : Equisoft propre + Google Calendar structuré.

### Semaine 2 (8 - 14 juin 2026)

**Objectif** : Email marketing opérationnel.

- Lundi : ouverture compte Brevo + configuration domaine d'envoi (DKIM, SPF, DMARC pour jccapital.ca).
- Mardi : importation des contacts dans Brevo avec assignation aux listes (par ICP). Validation des consentements Loi 25.
- Mercredi : création des templates emails (réutiliser ceux du document 05-marketing-assurance.md).
- Jeudi : configuration de la première séquence (welcome / bilan protection famille).
- Vendredi : création des templates Equisoft (7 templates section 2.3).
- Samedi : test grandeur nature — Joël envoie une séquence à un compte test pour vérifier le rendu.

**Livrable** : Brevo opérationnel + 6 templates Equisoft prêts.

### Semaine 3 (15 - 21 juin 2026)

**Objectif** : Intégrations et automatisations.

- Lundi : ouverture compte Zapier + connexion des comptes (Equisoft via Zapier ou Make, Calendly, Brevo, Gmail).
- Mardi : configuration Zap 1 (formulaire web → Equisoft + Brevo). Test.
- Mercredi : configuration Zap 2 (RDV Calendly → Equisoft) + Zap 5 (anniversaire client). Tests.
- Jeudi : activation des workflows Calendly (rappels J-1, H-1, post-RDV merci, demande de référence J+30).
- Vendredi : configuration des 3 derniers zaps prioritaires (Zap 8 — référé, Zap 9 — Closed-won onboarding, Zap 10 — désabonnement Loi 25).
- Samedi : création du dashboard Google Sheets (structure des 10 onglets + premières formules). Connexion Looker Studio.

**Livrable** : 6-7 zaps actifs + dashboard v1.

### Semaine 4 (22 - 30 juin 2026)

**Objectif** : Tests end-to-end et formation.

- Lundi : test scénario complet "Lead web → Closed-won" avec un faux prospect.
- Mardi : ajustements suite aux tests. Documentation des cas particuliers.
- Mercredi : configuration des dashboards quotidien, hebdo, mensuel dans Looker Studio.
- Jeudi : formation Joël (3 h) : revue de toutes les automatisations + utilisation quotidienne + tableau de bord.
- Vendredi : checklist conformité Loi 25 / AMF / OCRI : vérifier que toutes les automatisations respectent les obligations (sections 9 ci-dessous).
- Samedi : bilan mensuel. Premier rapport d'utilisation. Identification des correctifs pour le mois 2.

**Livrable** : Stack pleinement opérationnel + Joël autonome.

---

## 8. ERREURS À ÉVITER

### 8.1 Over-automation (déshumanisation)

- Ne **jamais** automatiser une réponse à une question technique d'un client — risque de mauvaise réponse + bris du devoir de conseil AMF.
- Garder les appels téléphoniques 100 % manuels.
- Les messages d'anniversaire / vœux peuvent être automatisés mais doivent rester sobres et personnels.
- Limiter les séquences emails à 7-8 envois max sur 30-60 jours pour éviter l'effet "spam".

### 8.2 Tester avant d'activer

- Toujours déclencher un Zap en mode test avec un faux contact avant de l'activer pour de vrai.
- Vérifier l'envoi des emails Brevo sur Gmail, Outlook, et mobile pour s'assurer du rendu.
- Tester chaque workflow Calendly avec un RDV bidon pour valider chaque rappel.

### 8.3 Maintenance du CRM

- Bloquer 1 h par semaine (vendredi 15 h - 16 h) pour la maintenance Equisoft : nettoyer les doublons, mettre à jour les notes, fermer les tâches obsolètes.
- Toujours saisir les notes de rencontre dans les 24 h.
- Ne jamais laisser un contact sans tag ICP / source — c'est ce qui rend le reporting fiable.

### 8.4 Trop d'outils → confusion

- Ne **pas** ajouter un nouvel outil tant qu'un outil existant n'est pas pleinement utilisé.
- Une règle : chaque donnée doit avoir **une seule source de vérité**.
  - Contacts : Equisoft (Brevo synchronise depuis Equisoft).
  - RDV : Calendly + Google Calendar (Equisoft enregistre l'historique).
  - Communications : Gmail (Equisoft enregistre les emails clés via copie BCC ou intégration).

### 8.5 Pas de backup des données

- Export CSV mensuel de tous les contacts Equisoft → stocké dans Google Drive (dossier "Backups CRM").
- Export mensuel des listes et séquences Brevo.
- Export trimestriel du dashboard Sheets en PDF (archive).

### 8.6 Conformité Loi 25 sur les automations

- Ne **jamais** ajouter un contact à une liste marketing sans son consentement horodaté et documenté.
- Désabonnement automatique : tester que le lien fonctionne et que Brevo retire bien le contact des listes ET met à jour Equisoft via Zap 10.
- Ne pas envoyer d'email automatique à un Closed-lost dont la raison est "Refus de communications" — toujours filtrer.

---

## 9. CONFORMITÉ LOI 25 / AMF / OCRI SUR LES AUTOMATIONS

### 9.1 Loi 25 (Loi sur la protection des renseignements personnels — Québec)

- **Consentement marketing obligatoire** : tout contact qui reçoit des communications commerciales doit avoir donné un consentement clair, libre, éclairé et horodaté. Documenter dans le champ "Consentement marketing" d'Equisoft.
- **Double opt-in recommandé** pour les leads web : email de confirmation après inscription au formulaire.
- **Désabonnement facile** : lien obligatoire en bas de chaque email Brevo. Le désabonnement doit propager automatiquement à Equisoft (Zap 10).
- **Conservation limitée** : politique de rétention des données. Recommandation : 7 ans après la fin de la relation client (correspond aux exigences AMF / OCRI), puis suppression.
- **Audit trail** : Equisoft doit conserver toutes les notes, dates de consentement, dates de communication. À documenter dans le champ "Notes conformité".
- **Responsable de la protection des renseignements personnels** : Joël lui-même pour un cabinet solo. À déclarer dans la politique de confidentialité du site web.
- **Politique de confidentialité** : publiée sur jccapital.ca avant toute capture de lead.
- **Évaluation des facteurs relatifs à la vie privée (EFVP)** : à faire pour tout transfert hors-Québec (donc pour tous les outils US comme Zapier, Mailchimp, Equisoft si serveurs hors Québec). Documenter dans un dossier interne.

### 9.2 AMF (Autorité des marchés financiers — Québec)

- **Conservation des dossiers clients** : 7 ans après la fin du dossier. Equisoft doit être configuré pour préserver les données.
- **Pas d'automation pour le conseil personnalisé** : le devoir de conseil reste un acte humain et personnel. Les emails automatiques peuvent éduquer, informer, rappeler — mais pas recommander un produit spécifique sans intervention humaine.
- **Mention des inscriptions** : tous les emails commerciaux doivent inclure les inscriptions de Joël (AMF, CSF, OCRI via SFL).
- **Identification claire de l'émetteur** : nom complet + adresse + téléphone + courriel dans la signature.

### 9.3 CSF (Chambre de la sécurité financière)

- **Code de déontologie** : respecter l'obligation d'honnêteté, d'intégrité, de compétence. Les automatisations ne doivent jamais induire en erreur (pas de fausses urgences, pas de fausses promesses).
- **Formation continue** : intégrer les rappels de formation dans le calendrier "Administratif / conformité".

### 9.4 OCRI (Organisme canadien de réglementation des investissements)

> S'applique uniquement aux activités d'épargne collective.

- **Devoir d'information** : toute recommandation de placement doit être documentée. Pas d'automation pour des recommandations.
- **Profil de l'investisseur** : à mettre à jour minimum tous les 12 mois. Workflow 8 (revue annuelle) couvre cette obligation.
- **Communications avec les clients** : conservation 7 ans minimum.
- **Conflits d'intérêts** : déclarer toute relation susceptible de créer un conflit. À documenter dans Equisoft.

### 9.5 LCAP (Loi canadienne anti-pourriel)

- **Consentement** : exprès ou tacite selon la relation. Pour un nouveau prospect web : consentement exprès obligatoire (case à cocher non pré-cochée).
- **Identification** : nom, adresse postale, téléphone, courriel dans chaque message commercial.
- **Mécanisme de désabonnement** : fonctionnel pendant 60 jours après l'envoi minimum.
- **Sanctions** : jusqu'à 10 M$ par infraction pour une entreprise. À prendre très au sérieux.

### 9.6 Checklist conformité (à valider avant d'activer les automatisations)

- [ ] Politique de confidentialité publiée sur jccapital.ca
- [ ] Formulaires web avec case "consentement marketing" non pré-cochée
- [ ] Double opt-in activé sur Brevo
- [ ] Lien de désabonnement présent et testé sur chaque template Brevo
- [ ] Zap 10 (désabonnement → Equisoft) testé et fonctionnel
- [ ] Champ "Consentement marketing" rempli pour 100 % des contacts dans Equisoft
- [ ] Signature email avec inscriptions AMF / CSF / OCRI complète
- [ ] Politique de rétention des données documentée (7 ans)
- [ ] EFVP réalisée pour Brevo, Zapier, Calendly (transferts hors Québec)
- [ ] Responsable RPP désigné (Joël)
- [ ] Procédure de réponse à une demande d'accès aux renseignements personnels documentée (délai 30 jours)
- [ ] Procédure de notification en cas d'incident de confidentialité documentée

---

## 10. KPIs DE L'AUTOMATION

### 10.1 Indicateurs de productivité

| KPI | Mesure | Cible 90 jours |
|-----|--------|----------------|
| Temps gagné par semaine | Estimation auto-évaluée | 5-10 h |
| Tâches Equisoft fermées / créées | Ratio | > 90 % |
| Délai moyen de premier contact (lead web) | Heures | < 48 h |
| Délai moyen de réponse email client | Heures | < 24 h |
| Tâches en retard | Nombre | < 3 |

### 10.2 Indicateurs d'efficacité commerciale

| KPI | Mesure | Cible 90 jours |
|-----|--------|----------------|
| Leads non perdus (taux de relance auto) | % de leads avec ≥ 1 contact dans les 7 jours | > 95 % |
| Taux d'ouverture séquences email | % | > 30 % |
| Taux de clic séquences email | % | > 3 % |
| Conversion lead → RDV | % | > 25 % |
| Conversion RDV → client | % | > 40 % |
| Conversion globale lead → client | % | > 10 % |
| Taux de no-show Calendly | % | < 10 % |

### 10.3 Indicateurs financiers

| KPI | Mesure | Cible 90 jours |
|-----|--------|----------------|
| Valeur pipeline pondérée | $ CAD | À définir selon objectif annuel |
| Coût d'acquisition client (CAC) | Coût total stack / nouveaux clients | À benchmarker |
| Revenu par lead | Revenus / nb leads | À benchmarker |
| ROI de l'automation | (Revenu - coût stack) / coût stack | > 10x à 12 mois |

### 10.4 Indicateurs de satisfaction et de rétention

| KPI | Mesure | Cible 90 jours |
|-----|--------|----------------|
| NPS (Net Promoter Score) | Sondage trimestriel | > 50 |
| Taux de rétention clients (12 mois) | % | > 90 % |
| Nb de référés / mois | Comptage Equisoft | ≥ 3 |
| Taux de désabonnement Brevo | % par mois | < 0,5 % |
| Taux de plaintes | Comptage | 0 |

### 10.5 Indicateurs de conformité

| KPI | Mesure | Cible |
|-----|--------|-------|
| % contacts avec consentement marketing renseigné | % | 100 % |
| Délai moyen de traitement d'une demande de désabonnement | Heures | < 1 h (auto) |
| Audits internes annuels conformité Loi 25 | Comptage | 1 / an |
| Formations continues CSF / OCRI complétées | Heures | Selon obligations |

---

## Annexes

### A. Glossaire

- **CRM** : Customer Relationship Management — système de gestion de la relation client.
- **ICP** : Ideal Customer Profile — profil de client idéal.
- **KYC** : Know Your Customer — obligation de connaître son client (AMF / OCRI).
- **NPS** : Net Promoter Score — indicateur de recommandation client.
- **Closed-won / Closed-lost** : opportunité gagnée / perdue.
- **Pipeline** : ensemble des opportunités en cours, classées par étape.
- **Zap** : automatisation Zapier reliant 2 ou plusieurs outils.
- **EFVP** : Évaluation des facteurs relatifs à la vie privée (Loi 25).
- **RPP** : Responsable de la protection des renseignements personnels.

### B. Liens utiles (à valider et conserver)

- Equisoft Connect — support utilisateur SFL : à demander à SFL
- Brevo (Sendinblue) : https://www.brevo.com
- Zapier : https://zapier.com
- Calendly : https://calendly.com
- Looker Studio : https://lookerstudio.google.com
- Loi 25 — guide CAI : https://www.cai.gouv.qc.ca
- AMF — registre des inscrits : https://lautorite.qc.ca
- CSF — formation continue : https://www.chambresf.com
- OCRI : https://www.ciro.ca

### C. Checklist d'implémentation (résumé)

#### Mois 1 — Setup

- [ ] Audit Equisoft + sauvegarde
- [ ] Champs personnalisés créés
- [ ] Pipelines configurés (assurance, placement, hypothèque)
- [ ] Tags créés (ICP, produit, source)
- [ ] Calendriers Google segmentés
- [ ] Compte Brevo ouvert + domaine vérifié (DKIM, SPF, DMARC)
- [ ] Contacts importés dans Brevo avec consentements Loi 25
- [ ] 6 templates Equisoft créés
- [ ] 6 templates emails Brevo créés
- [ ] Première séquence Brevo configurée
- [ ] Zapier configuré : 6-7 zaps essentiels actifs
- [ ] Workflows Calendly activés
- [ ] Dashboard Google Sheets / Looker Studio v1
- [ ] Tests end-to-end réussis
- [ ] Formation Joël (3 h) complétée
- [ ] Checklist conformité Loi 25 validée

#### Mois 2 — Optimisation

- [ ] Activation des 3 zaps secondaires (anniversaire, revue annuelle, client à risque)
- [ ] Configuration des 5 autres séquences Brevo (par ICP)
- [ ] LinkedIn Sales Navigator activé (si décision OK)
- [ ] Premier export et analyse du dashboard
- [ ] Ajustement des templates selon feedback réel

#### Mois 3 — Mesure et amélioration

- [ ] Premier sondage NPS
- [ ] Analyse ROI par canal
- [ ] Identification du top canal d'acquisition
- [ ] Optimisation des séquences sous-performantes (< 25 % d'ouverture)
- [ ] Premier rapport KPIs trimestriel
- [ ] Décision : maintenir / faire évoluer le stack

---

**Document préparé pour Joël Camiré (JC Capital) — Mai 2026**
**À réviser** : annuellement, ou à chaque changement majeur du stack ou de la réglementation.
