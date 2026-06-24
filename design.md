# JcCapital — Système de design

> **Direction :** *jeune, passionné, lumineux, moderne.* On vend l'élan et l'authenticité d'un
> jeune conseiller, pas l'expérience d'un vétéran. Tout ce qui dit « corporate premium, sombre,
> lourd » est à proscrire.
>
> **Référence visuelle :** thème **Swirl** (Bold Themes / Nifty) —
> <https://nifty.bold-themes.com/swirl/about/team/>. Les valeurs ci-dessous sont dérivées du
> HTML/CSS réel de cette page, puis adaptées à JcCapital (ajout d'un accent vif).

---

## 1. Intention & ton

| On veut | On évite |
|---|---|
| Clair, aéré, beaucoup de blanc | Fonds sombres, glassmorphism |
| Teal énergique + accent corail chaleureux | Or/noir « banque privée » |
| Typo ronde et amicale, titres affirmés | Sérif austère, tout en gris |
| Séparateurs en vagues, formes douces | Bordures dures, ombres lourdes |
| Micro-interactions ludiques au survol | Statique et figé |
| Proximité, passion, accessibilité | Distance, prestige, jargon |

Mots-clés : **frais · humain · confiant · dynamique**.

---

## 2. Palette

### Couleurs de marque

| Token | Hex | Rôle | Usage |
|---|---|---|---|
| `--brand` | `#057485` | Teal / petrol — **couleur de marque** | Boutons primaires, liens, icônes, accents |
| `--brand-light` | `#4f9da6` | Teal clair | Survol, dégradés, états actifs, fonds doux |
| `--accent` | `#ff715b` | Corail vif — **énergie / jeunesse** | CTA secondaires, surlignages, badges, détails ludiques |
| `--accent-soft` | `#ffb703` | Jaune solaire (optionnel) | Touches de chaleur, picto, soulignés |

> L'accent corail est l'ajout par rapport à Swirl : c'est lui qui injecte la passion et la
> jeunesse. À utiliser avec parcimonie (5–10 % de la surface) pour qu'il claque.

### Neutres & fonds

| Token | Hex | Rôle |
|---|---|---|
| `--ink` | `#191919` | Texte courant (quasi-noir) |
| `--heading` | `#222e41` | Bleu nuit — titres |
| `--bg` | `#ffffff` | Fond principal |
| `--bg-alt` | `#f7f7f5` | Crème — sections alternées |
| `--ink-dark` | `#1a0841` | Indigo profond — rares sections sombres (footer, citation) |

### Couleurs d'état (sobres, pour formulaires/outils)

| Token | Hex | Rôle |
|---|---|---|
| `--ok` | `#1ca47a` | Succès |
| `--warn` | `#e8920c` | Avertissement |
| `--err` | `#e0556b` | Erreur |

**Contraste :** `--ink` (#191919) et `--heading` (#222e41) sur `--bg`/`--bg-alt` dépassent AA.
Le texte sur `--brand` doit être **blanc** ; ne jamais poser `--accent` corail sur teal pour du texte.

---

## 3. Typographie

| | Famille | Source | Usage |
|---|---|---|---|
| Titres | **League Spartan** | Google Fonts (gratuit) | Géométrique, gras, **souvent en MAJUSCULES**, `letter-spacing` léger |
| Corps | **Nunito Sans** | Google Fonts (gratuit) | Rond, amical, très lisible |

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@500;600;700;800;900&family=Nunito+Sans:wght@300;400;600;700;900&display=swap" rel="stylesheet">
```

### Échelle (fluide, on conserve `clamp()` déjà en place)

| Élément | Taille | Poids | Casse | Couleur |
|---|---|---|---|---|
| Hero / H1 | `clamp(2.2rem, 6vw, 4rem)` | 800–900 | MAJ | `--heading` |
| H2 | `clamp(1.7rem, 4.5vw, 2.6rem)` | 700–800 | MAJ | `--heading` |
| H3 | `clamp(1.2rem, 3vw, 1.6rem)` | 700 | Capitalize | `--heading` |
| Sur-titre / eyebrow | `0.8rem` | 700 | MAJ + `letter-spacing: .12em` | `--brand` |
| Corps | `clamp(1rem, 2.2vw, 1.125rem)` | 400 | — | `--ink` |
| Petit / légende | `0.85rem` | 400 | — | `#5b6470` |

- Hauteur de ligne : **1.7** pour le corps, **1.1–1.2** pour les titres.
- Les sur-titres teal en MAJUSCULES espacées au-dessus des H2 sont une signature de Swirl à reprendre.

---

## 4. Composants

### Boutons

| Variante | Fond | Texte | Rayon | Survol |
|---|---|---|---|---|
| Primaire | `--brand` | `#fff` | `8px` (ou pilule `999px`) | `--brand-light` + léger `translateY(-2px)` |
| Accent | `--accent` | `#fff` | `8px` | assombrir 8 % + `translateY(-2px)` |
| Contour | transparent, `2px solid --brand` | `--brand` | `8px` | fond `--brand`, texte blanc |
| Texte | aucun | `--brand` | — | souligné corail |

Transition standard : `all .25s ease`. Cible tactile min. **44–48px**.

### Cartes & sections

- Cartes : fond `#fff`, rayon **`16px`**, ombre **douce** `0 12px 30px rgba(34,46,65,.08)`,
  padding `1.5rem`–`2rem`. Au survol : élévation `translateY(-4px)` + ombre un peu plus marquée.
- Sections alternées `--bg` / `--bg-alt` pour rythmer la page.
- **Séparateurs en vagues (SVG)** entre sections — signature Swirl. Ex. minimal :

```html
<svg class="wave-divider" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0,40 C360,90 1080,-10 1440,40 L1440,80 L0,80 Z" fill="#f7f7f5"/>
</svg>
```

- Espacement : généreux. Padding vertical de section `clamp(3rem, 8vw, 6rem)`. Laisser respirer.
- Rayons globaux : petits `8px`, cartes `16px`, pilules `999px`. **Pas** d'angles durs partout.
- Ombres : toujours **diffuses et teintées de `--heading`**, jamais du noir pur lourd.

### Iconographie & illustration

- Pictos linéaires arrondis (stroke), pas de glyphes lourds remplis.
- Bienvenue : photos lumineuses et humaines, illustrations plates aux couleurs de la palette.

---

## 5. Mapping de migration (refonte CSS ultérieure)

`css/_tokens.css` centralise déjà toutes les variables, consommées par `style.css`, les animations
et `LM/jc-chat.css`. Le redesign = **réécrire les valeurs**, pas l'architecture. Correspondance :

| Token actuel (`_tokens.css`) | Valeur actuelle | → Nouvelle valeur | Note |
|---|---|---|---|
| `--c-black` | `#0A0908` | `#ffffff` (`--bg`) | inverser : on passe au clair |
| `--c-dark-blue` | `#22333B` | `#f7f7f5` (`--bg-alt`) | sections alternées |
| `--c-light-beige` | `#EAE0D5` | `#191919` (`--ink`) | le texte devient sombre sur clair |
| `--c-gold` | `#C6AC8F` | `#057485` (`--brand`) | or → teal |
| `--c-brown` | `#5E503F` | `#4f9da6` (`--brand-light`) | accent secondaire |
| `--primary` | `var(--c-gold)` | `var(--brand)` | — |
| `--secondary` | `var(--c-brown)` | `var(--brand-light)` | — |
| `--white` | `var(--c-light-beige)` | `#ffffff` | redevient vrai blanc |
| `--gray` | `var(--c-brown)` | `#5b6470` | gris neutre lisible |
| `--ac` / `--ic` | gold / beige | `var(--brand)` / `#ffffff` | — |
| `--glass-bg` / `--glass-border` | rgba sombre / brown | **à retirer** | supprimer le glassmorphism |
| `--font-main` | `'Outfit'` | `'Nunito Sans'` + ajouter `--font-head: 'League Spartan'` | nouvelles polices |
| `--sp` | `0.35s` | `0.25s` | transitions un peu plus vives |

Nouveaux tokens à ajouter : `--brand`, `--brand-light`, `--accent`, `--accent-soft`, `--ink`,
`--heading`, `--bg`, `--bg-alt`, `--ink-dark`, `--font-head`, `--ok`, `--warn`, `--err`.

> ⚠️ Le passage clair implique de vérifier tous les endroits qui supposent un fond sombre
> (hero, nav, ombres, dégradés radiaux, texture grain, chatbot `LM/jc-chat.css`). À traiter lors
> de la refonte, hors périmètre de ce document.

---

## 6. Hors périmètre de ce document

Ce fichier est le **document directeur**. La réécriture effective de `css/_tokens.css` /
`css/style.css`, le swap des polices, l'ajout des séparateurs en vagues et la refonte des pages
viendront ensuite, une fois la direction validée.
