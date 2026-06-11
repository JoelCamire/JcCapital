/**
 * JC Capital — Relais IA sécurisé (Cloudflare Worker)
 * =====================================================
 * Ce worker est le SEUL endroit où vit la clé API Anthropic.
 * Le site web (statique) appelle ce worker; le worker appelle Claude.
 * La clé n'est jamais exposée dans le navigateur.
 *
 * Déploiement : voir worker/DEPLOIEMENT.md (guide pas-à-pas en français).
 * Secret requis : ANTHROPIC_API_KEY (configuré dans le tableau de bord Cloudflare).
 *
 * Note technique : on utilise fetch() brut plutôt que le SDK Anthropic parce
 * que ce fichier se colle tel quel dans le tableau de bord Cloudflare, sans
 * étape de build ni npm.
 */

// Domaines autorisés à appeler ce relais (CORS)
const ALLOWED_ORIGINS = [
  'https://jccapital.ca',
  'https://www.jccapital.ca',
  'https://joelcamire.github.io',
];

// Modèle Claude. claude-opus-4-8 = le meilleur rapport qualité générale.
// Pour réduire les coûts : 'claude-haiku-4-5' (5x moins cher, réponses plus simples).
const MODEL = 'claude-opus-4-8';

// Limites anti-abus
const MAX_MESSAGES = 30;            // longueur max de l'historique par requête
const MAX_MESSAGE_CHARS = 2000;     // taille max d'un message utilisateur
const MAX_TOKENS = 1024;            // longueur max d'une réponse de l'IA
const RATE_LIMIT_PER_MINUTE = 10;   // requêtes max par IP par minute (best effort)

// Prompt système — vit côté serveur pour que personne ne puisse le modifier.
// Le bloc est stable => mis en cache par l'API (cache_control) pour réduire les coûts.
const SYSTEM_PROMPT = `Tu es « JC », l'assistant virtuel du site web de JC Capital, un cabinet de services financiers, fiscaux et d'assurance situé à Québec (825 Boulevard Lebourgneuf, Québec, QC, G2J 0B9, Canada).

# À propos de JC Capital
- Fondé par Joël Camiré, conseiller en sécurité financière inscrit auprès de l'Autorité des marchés financiers (AMF) et représentant en épargne collective.
- Partenaire de SFL Gestion de patrimoine.
- Téléphone : +1 (581) 398-6747 · Courriel : admin@jccapital.ca
- Heures : lundi-jeudi 7h à 19h, vendredi 7h à 12h.
- Prise de rendez-vous gratuite : https://calendly.com/joelcamire-jccapital/consultation (aussi via la section Rendez-vous du site).

# Services offerts
- Optimisation fiscale (entrepreneurs et particuliers)
- Planification financière et retraite (REER, CELI, CELIAPP, FERR, RRQ)
- Placement et investissement
- Assurance de personnes (vie, invalidité, maladies graves)
- Transfert, achat et vente d'entreprise; incorporation
- Gestion de patrimoine agricole (spécialité distinctive)
- Évaluation de rentabilité d'entreprise et financement

# Clientèle
Entrepreneurs, travailleurs autonomes, producteurs agricoles, familles et professionnels au Québec et partout au Canada (rencontres par téléphone ou visioconférence).

# Outils du site à recommander quand pertinent
- Calculateur d'intérêts composés : /pages/compound.html
- Calculateur d'économies fiscales : /pages/tax.html
- Acheter ou investir? : /pages/mortgage.html
- Bilan de protection financière : /pages/assurance.html
- FAQ : /pages/faq.html

# Règles de conduite (TRÈS IMPORTANT)
1. Tu réponds en français par défaut; en anglais si l'utilisateur écrit en anglais.
2. Tu donnes de l'information GÉNÉRALE sur les finances personnelles, la fiscalité canadienne/québécoise et les services de JC Capital. Tu ne donnes JAMAIS de conseil financier, fiscal, juridique ou d'assurance PERSONNALISÉ — pour cela, tu invites chaleureusement à prendre un rendez-vous gratuit avec Joël.
3. Tu ne recommandes jamais de produits financiers précis, de titres boursiers, ni de montants à investir.
4. Tu ne promets aucun rendement, prix, ou résultat.
5. Tu ne demandes jamais de renseignements sensibles (NAS, numéros de compte, mots de passe).
6. Si une question sort de ton domaine (santé, politique, etc.), tu ramènes poliment la conversation vers les finances ou tu suggères de contacter le cabinet.
7. Ton ton : chaleureux, professionnel, accessible — comme un bon conseiller québécois. Réponses courtes et claires (2-3 paragraphes max), avec des listes à puces quand utile.
8. Termine souvent par une invitation naturelle à l'action : prendre rendez-vous, essayer un calculateur, ou poser une autre question.`;

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// Limitation de débit best-effort (par isolat; suffisant pour décourager l'abus simple)
const rateBuckets = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || [];
  const recent = bucket.filter((t) => now - t < 60_000);
  if (recent.length >= RATE_LIMIT_PER_MINUTE) return true;
  recent.push(now);
  rateBuckets.set(ip, recent);
  if (rateBuckets.size > 5000) rateBuckets.clear(); // éviter une fuite mémoire
  return false;
}

function jsonError(status, message, origin) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') {
      return jsonError(405, 'Method not allowed', origin);
    }
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return jsonError(403, 'Origin not allowed', origin);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return jsonError(500, 'ANTHROPIC_API_KEY non configurée — voir DEPLOIEMENT.md', origin);
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (rateLimited(ip)) {
      return jsonError(429, 'Trop de requêtes — réessayez dans une minute.', origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, 'Invalid JSON', origin);
    }

    // Validation stricte de l'historique reçu du navigateur
    const incoming = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : null;
    if (!incoming || incoming.length === 0) {
      return jsonError(400, 'messages[] requis', origin);
    }
    const messages = [];
    for (const m of incoming) {
      if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
        return jsonError(400, 'Format de message invalide', origin);
      }
      messages.push({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) });
    }
    if (messages[0].role !== 'user') messages.unshift({ role: 'user', content: 'Bonjour' });

    // Appel de l'API Anthropic en streaming (SSE), relayé tel quel au navigateur
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        stream: true,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages,
      }),
    });

    if (!anthropicResponse.ok) {
      const detail = await anthropicResponse.text().catch(() => '');
      console.error('Anthropic API error', anthropicResponse.status, detail);
      return jsonError(502, "Le service IA est temporairement indisponible.", origin);
    }

    // Pass-through du flux SSE vers le navigateur
    return new Response(anthropicResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...corsHeaders(origin),
      },
    });
  },
};
