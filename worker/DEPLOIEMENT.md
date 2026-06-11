# Activer l'IA du chat — Guide de déploiement (≈ 10 minutes)

Ton site est hébergé sur GitHub Pages (un site « statique », sans serveur).
Une clé API d'intelligence artificielle ne peut **jamais** être mise directement
dans le code d'un site statique : elle serait visible par n'importe qui et
utilisée à tes frais.

La solution : un petit « relais » gratuit chez Cloudflare qui garde ta clé
secrète. Le site parle au relais, le relais parle à l'IA (Claude d'Anthropic).

```
Visiteur → jccapital.ca → Relais Cloudflare (clé secrète ici) → Claude (Anthropic)
```

Tant que le relais n'est pas activé, le chat du site continue de fonctionner
avec les bulles cliquables comme avant. **Rien ne casse.**

---

## Étape 1 — Obtenir une clé API Anthropic (~5 min)

1. Va sur **https://platform.claude.com** et crée un compte.
2. Ajoute un mode de paiement (section *Billing*). Mets un **budget mensuel
   maximum** (ex. 25 $ US) pour ne jamais avoir de surprise.
3. Section *API Keys* → **Create Key** → copie la clé (elle commence par
   `sk-ant-...`). Garde-la précieusement, elle ne s'affiche qu'une fois.

> 💰 **Coût réaliste** : avec le modèle par défaut (claude-opus-4-8), une
> conversation typique coûte quelques cents. Pour un site avec un trafic
> modéré, compte quelques dollars par mois. Le fichier `jc-ai-worker.js`
> indique comment passer au modèle `claude-haiku-4-5` (≈ 5× moins cher) si
> tu veux minimiser les coûts.

## Étape 2 — Créer le relais Cloudflare (~5 min)

1. Va sur **https://dash.cloudflare.com** et crée un compte gratuit.
2. Menu de gauche : **Workers & Pages** → **Create** → **Create Worker**.
3. Donne-lui un nom, par exemple `jc-ai` → **Deploy**.
4. Clique **Edit code**, efface tout le contenu, et colle le contenu complet
   du fichier **`worker/jc-ai-worker.js`** de ce dépôt → **Deploy**.
5. Reviens à la page du worker → onglet **Settings** → **Variables and
   Secrets** → **Add** :
   - Type : **Secret**
   - Nom : `ANTHROPIC_API_KEY`
   - Valeur : ta clé `sk-ant-...` de l'étape 1
   - **Save and deploy**
6. Note l'adresse de ton worker, affichée en haut de la page. Elle ressemble à :
   `https://jc-ai.TONCOMPTE.workers.dev`

## Étape 3 — Brancher le site (~1 min)

1. Dans ce dépôt, ouvre le fichier **`LM/jc-llm-config.js`**.
2. Mets l'adresse de ton worker dans la valeur `endpoint` :

```js
window.JC_AI_CONFIG = {
    endpoint: 'https://jc-ai.TONCOMPTE.workers.dev'
};
```

3. Sauvegarde, commit, push (ou demande à Claude de le faire). Le site se
   redéploie automatiquement.

## Étape 4 — Tester

1. Ouvre **jccapital.ca** sur ton téléphone ou ordinateur.
2. Ouvre le chat (bouton d'aide en bas à droite → Assistant IA).
3. Une zone de texte « Posez votre question… » apparaît maintenant en bas du
   chat. Écris par exemple : *« C'est quoi la différence entre un REER et un
   CELI? »* — l'IA répond en temps réel.

---

## Sécurité intégrée dans le relais

- ✅ La clé API n'apparaît jamais dans le navigateur.
- ✅ Seuls **jccapital.ca** et **www.jccapital.ca** peuvent appeler le relais
  (liste `ALLOWED_ORIGINS` dans le worker).
- ✅ Maximum 10 requêtes par minute par visiteur (anti-abus).
- ✅ Taille des messages et longueur des conversations plafonnées.
- ✅ Les consignes de l'assistant (ne jamais donner de conseil financier
  personnalisé, rediriger vers la prise de rendez-vous, etc.) vivent dans le
  relais — personne ne peut les modifier depuis le site.
- ✅ Budget mensuel plafonné côté Anthropic (étape 1.2).

## Questions fréquentes

**Le chat marche-t-il sans cette étape?** Oui — il garde son mode « bulles
cliquables » actuel. L'IA est un ajout, pas un remplacement.

**Combien ça coûte, Cloudflare?** Rien. Le palier gratuit couvre 100 000
requêtes par jour — largement assez.

**Comment changer le ton ou les consignes de l'IA?** Modifie la constante
`SYSTEM_PROMPT` dans `worker/jc-ai-worker.js`, puis recolle le fichier dans
l'éditeur Cloudflare et redéploie.

**Comment couper l'IA?** Remets `endpoint: ''` dans `LM/jc-llm-config.js`
(le chat retombe sur les bulles), ou supprime le worker chez Cloudflare.
