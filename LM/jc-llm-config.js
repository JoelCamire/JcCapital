/**
 * JC Capital — Configuration de l'assistant IA
 * ---------------------------------------------
 * endpoint : l'adresse de ton relais Cloudflare Worker.
 *
 *   - Vide ('')  => le chat fonctionne en mode "bulles cliquables" (actuel).
 *   - Renseigné  => le chat offre en plus la conversation libre avec l'IA.
 *
 * Pour l'activer, suis le guide : worker/DEPLOIEMENT.md
 * Exemple : endpoint: 'https://jc-ai.moncompte.workers.dev'
 */
window.JC_AI_CONFIG = {
    endpoint: ''
};
