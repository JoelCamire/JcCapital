# jccapital.ca — site de JC Capital

Site public de **JC Capital**, nom commercial de **Joël Camiré**, conseiller en sécurité
financière et représentant de courtier en épargne collective, rattaché à
[SFL Gestion de patrimoine](https://www.sfl.ca/fr/a-propos/reseau.html).

Site statique (HTML/CSS/JS, sans build) déployé sur **GitHub Pages** à partir de `main`
(`CNAME` → `jccapital.ca`, `.nojekyll`).

## Structure

```
├── index.html               # Accueil (hero vidéo, services, carte des régions, prise de RDV)
├── 404.html
├── components/
│   ├── header.html          # Nav, injectée dynamiquement
│   └── footer.html          # Pied de page + bandeau d'inscription AMF, injecté dynamiquement
├── css/
│   ├── _tokens.css
│   └── style.css            # Feuille unique, en couches successives (v2 → v11)
├── js/
│   ├── components.js        # Chargeur header/footer + animations (reveal, parallaxe, nav)
│   ├── translations.js      # Bilingue FR/EN via attributs data-fr / data-en
│   └── main.js
├── pages/                   # about, team, faq, events, confidentialite
│   ├── compound.html        # Calculateur d'intérêts composés
│   ├── tax.html             # Calculateur d'économies fiscales
│   ├── mortgage.html        # Payer l'hypothèque ou investir ?
│   └── assurance.html       # Bilan de protection
├── blog/                    # 23 articles + index + _template.html
├── profil/                  # Questionnaire de profil d'investisseur (outil client, noindex)
├── marketing/               # Contenu mensuel (posts, vidéos, rapports) — hors site
├── img/ · video/ · animation/
└── sitemap.xml · robots.txt · llms.txt · BingSiteAuth.xml
```

## Fonctionnement

- **Bilingue** : chaque texte porte `data-fr` / `data-en` ; `updatePageLanguage()`
  (`js/translations.js`) remplace l'`innerHTML` au changement de langue. La préférence est
  conservée dans `localStorage` (`jc_pref_lang`) et acceptée en `?lang=en`.
- **Header / footer partagés** : injectés par `fetch` dans `#header-placeholder` et
  `#footer-placeholder`. Les pages de `/blog/` utilisent leur propre `loadBlogComponent`
  (réécriture des chemins relatifs). **Une modification du pied de page se répercute partout.**
- **Hero vidéo** : trois clips en boucle courte. Le montage complet pèse ~16 Mo : il est
  désactivé en mode « économiseur de données », en `prefers-reduced-motion` et en 2G, et
  réduit au premier clip en 3G (plus de 80 % du trafic est mobile).
- **SEO / IA** : JSON-LD multi-entités sur chaque page, `llms.txt`, hreflang FR/EN,
  `sitemap.xml`. `/profil/` est en `noindex` et exclu de `robots.txt`.

## Développement local

Aucune dépendance à installer. Avec Node :

```bash
npx serve .          # ou n'importe quel serveur statique
```

Le site doit être servi en HTTP : ouvrir les fichiers en `file://` empêche le `fetch`
du header et du pied de page.

## ⚖️ Conformité — à lire avant toute modification du texte public

- Les titres affichés doivent correspondre **exactement** au registre de l'AMF :
  **conseiller en sécurité financière** (assurance de personnes) et **représentant de
  courtier en épargne collective** (Gestion de patrimoine Worldsource inc.),
  certificat n° 277067.
- **JC Capital n'est ni un cabinet inscrit ni une société incorporée** : c'est le nom
  commercial de Joël Camiré (NEQ 2281795627). Le cabinet inscrit est SFL Gestion de patrimoine.
- La divulgation **Worldsource** est obligatoire dès qu'il est question d'épargne collective
  ou de fonds communs de placement.
- Les calculateurs et le contenu du blogue portent un avertissement : information générale,
  aucun conseil personnalisé, chiffres présentés en exemples hypothétiques.
- Toute publicité ou page publique passe par l'approbation de la conformité
  (**10 jours ouvrables**; toute modification ultérieure = nouvelle soumission).

## Contact

- Téléphone : +1 (581) 398-6747
- Courriel : admin@jccapital.ca
- 825, boul. Lebourgneuf, bureau 500, Québec (Québec) G2J 0B9

---

© 2026 JC Capital. Tous droits réservés.
