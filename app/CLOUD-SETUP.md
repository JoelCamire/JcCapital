# Connexion par courriel + comptes employés (Supabase)

Ce guide active la **connexion par courriel/mot de passe** et donne à
**chaque employé sa propre version isolée** des données, accessible depuis
n'importe quel appareil. Le site reste sur GitHub Pages — Supabase ne sert
que l'authentification et le stockage des données. **Aucun serveur à gérer.**

> Tant que les clés ne sont pas collées (étape 3), l'app fonctionne en mode
> local exactement comme avant. L'activation est réversible : videz les deux
> valeurs et l'app redevient locale.

---

## 1. Créer le projet Supabase (≈ 3 min, une seule fois)

1. Allez sur **https://supabase.com** → **Start your project** (gratuit, connexion avec GitHub ou courriel).
2. **New project** → nommez-le `jc-planner` → choisissez un mot de passe de base de données (notez-le) → région **Canada (Central)** de préférence → **Create**.
3. Attendez ~1 minute que le projet démarre.

## 2. Récupérer vos deux clés

Dans le projet : **Settings (roue dentée)** → **API**. Copiez :

- **Project URL** → ex. `https://abcdefgh.supabase.co`
- **Project API keys → `anon` `public`** → une longue chaîne `eyJ...`

> Ces deux valeurs sont **publiques par conception** : pas de panique si elles
> sont dans le code. La sécurité réelle vient des règles RLS de l'étape 4.

## 3. Coller les clés dans l'app

Ouvrez **`app/src/state/cloud-config.js`** et remplissez :

```js
export const SUPABASE_URL = 'https://abcdefgh.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJ...votre clé anon...';
```

Commitez et poussez. Au prochain chargement de `/app/`, l'écran de connexion apparaît.

## 4. Créer la table + les règles d'isolation (SQL)

Dans Supabase : **SQL Editor** → **New query** → collez ceci → **Run** :

```sql
-- Une ligne de données par utilisateur (tout le dataset en JSON).
create table if not exists public.app_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Activer la sécurité au niveau des lignes.
alter table public.app_state enable row level security;

-- Chaque utilisateur ne peut voir/écrire QUE sa propre ligne.
create policy "own row - select" on public.app_state
  for select using (auth.uid() = user_id);
create policy "own row - insert" on public.app_state
  for insert with check (auth.uid() = user_id);
create policy "own row - update" on public.app_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

C'est ce bloc qui garantit qu'**un employé ne peut jamais voir les données d'un autre**, même s'il est techniquement habile : l'isolation est imposée par la base de données, pas par le navigateur.

## 5. Réglages d'authentification

**Authentication → Providers → Email** : laissez **Email** activé.

Deux modes possibles :

- **Confirmation par courriel activée (par défaut, recommandé)** : à l'inscription, l'utilisateur reçoit un courriel de confirmation avant de pouvoir se connecter. Le plus sûr.
- **Désactivée (plus simple pour démarrer)** : **Authentication → Providers → Email → décochez « Confirm email »**. L'inscription connecte immédiatement.

**Empêcher les inscriptions publiques** (pour que seuls vous et vos employés ayez un compte) : **Authentication → Sign In / Providers → désactivez « Allow new users to sign up »**. Vous créerez alors les comptes vous-même (étape 6).

## 6. Donner accès à vos employés

Chaque employé aura automatiquement **sa propre version vierge** des données dès sa première connexion. Deux façons de créer leur compte :

- **Vous les invitez** : **Authentication → Users → Add user → Invite via email**. Ils reçoivent un courriel pour définir leur mot de passe.
- **Ils s'inscrivent eux-mêmes** : si vous avez laissé les inscriptions ouvertes (étape 5), ils cliquent « Créer un compte » sur l'écran de connexion.

Pour **réinitialiser un mot de passe** : l'utilisateur clique « Mot de passe oublié ? », ou vous le faites depuis **Authentication → Users**.

---

## Migrer vos données actuelles vers votre compte cloud

Vos dossiers existants sont dans le navigateur (local). Pour les transférer :

1. **Avant d'activer le cloud** : ouvrez l'app → **Paramètres → Exporter (JSON)** et gardez le fichier.
2. Activez le cloud (étapes ci-dessus) et **connectez-vous**.
3. **Paramètres → Importer (JSON)** et choisissez le fichier. Vos dossiers sont maintenant dans votre compte cloud et se synchronisent sur tous vos appareils.

## Notes

- **Coût** : le palier gratuit de Supabase (500 Mo de base, 50 000 utilisateurs actifs/mois) dépasse largement les besoins d'un cabinet. Aucune carte requise.
- **Sauvegardes** : Supabase sauvegarde la base; gardez aussi un export JSON occasionnel par prudence (**Paramètres → Exporter**).
- **Sécurité** : les données transitent en HTTPS et sont isolées par utilisateur via RLS. Pour une exigence réglementaire stricte, on pourrait ajouter le chiffrement de bout en bout — demandez-le au besoin.
