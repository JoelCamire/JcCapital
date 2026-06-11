/**
 * JC Chat — Module IA (client)
 * Parle au relais Cloudflare (worker/jc-ai-worker.js), qui parle à Claude.
 * La clé API ne vit JAMAIS ici — uniquement dans le relais.
 *
 * Désactivé tant que JC_AI_CONFIG.endpoint est vide : le chat garde alors
 * son mode "bulles cliquables" sans aucun changement de comportement.
 */
(function () {
    'use strict';

    // Historique de la conversation IA (format API: {role, content})
    var history = [];

    function endpoint() {
        return (window.JC_AI_CONFIG && window.JC_AI_CONFIG.endpoint) || '';
    }

    function enabled() {
        return endpoint().length > 0;
    }

    /**
     * Envoie un message à l'IA et streame la réponse.
     * callbacks: { onDelta(fullTextSoFar), onDone(fullText), onError(message) }
     */
    function send(userText, callbacks) {
        history.push({ role: 'user', content: userText });

        var lang = document.documentElement.lang || 'fr';
        var errorMessages = {
            fr: "Désolé, je n'arrive pas à joindre l'assistant pour le moment. Vous pouvez réessayer dans un instant, ou prendre rendez-vous directement via la section Rendez-vous.",
            en: "Sorry, I can't reach the assistant right now. Please try again in a moment, or book an appointment directly through the Booking section."
        };

        fetch(endpoint(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: history })
        }).then(function (response) {
            if (!response.ok || !response.body) {
                throw new Error('HTTP ' + response.status);
            }
            var reader = response.body.getReader();
            var decoder = new TextDecoder();
            var buffer = '';
            var fullText = '';

            function pump() {
                return reader.read().then(function (chunk) {
                    if (chunk.done) {
                        finish();
                        return;
                    }
                    buffer += decoder.decode(chunk.value, { stream: true });

                    // Le flux est en Server-Sent Events : lignes "data: {...}"
                    var lines = buffer.split('\n');
                    buffer = lines.pop(); // garde la ligne incomplète pour le prochain chunk

                    for (var i = 0; i < lines.length; i++) {
                        var line = lines[i];
                        if (line.indexOf('data: ') !== 0) continue;
                        var payload = line.slice(6);
                        try {
                            var event = JSON.parse(payload);
                            if (event.type === 'content_block_delta' &&
                                event.delta && event.delta.type === 'text_delta') {
                                fullText += event.delta.text;
                                if (callbacks.onDelta) callbacks.onDelta(fullText);
                            } else if (event.type === 'error') {
                                throw new Error(event.error && event.error.message);
                            }
                        } catch (e) {
                            // Ligne non-JSON (ping, etc.) — ignorer sauf erreur explicite
                            if (e.message && e.message.indexOf('JSON') === -1) throw e;
                        }
                    }
                    return pump();
                });
            }

            function finish() {
                if (fullText) {
                    history.push({ role: 'assistant', content: fullText });
                }
                if (callbacks.onDone) callbacks.onDone(fullText);
            }

            return pump();
        }).catch(function (err) {
            console.error('JC AI error:', err);
            // Retirer le message utilisateur non traité pour permettre un nouvel essai
            if (history.length && history[history.length - 1].role === 'user') {
                history.pop();
            }
            if (callbacks.onError) {
                callbacks.onError(errorMessages[lang] || errorMessages.fr);
            }
        });
    }

    function reset() {
        history = [];
    }

    window.JCLLM = {
        enabled: enabled,
        send: send,
        reset: reset
    };
})();
