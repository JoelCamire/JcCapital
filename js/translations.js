/**
 * JC Capital - Site Translations
 * Handles dynamic strings for JS alerts, charts, and messages.
 */

const SITE_TRANSLATIONS = {
    fr: {
        // Generic
        loading: "Chargement...",
        error: "Erreur",
        success: "Succès",
        btn_confirm: "Confirmer",
        btn_cancel: "Annuler",

        // Calculator - Reset
        calc_reset_title: "Êtes-vous sûr ?",
        calc_reset_text: "Tout réinitialiser aux valeurs par défaut ?",
        calc_reset_btn_yes: "Oui, réinitialiser",
        calc_reset_success_title: "Réinitialisé !",
        calc_reset_success_text: "Le calculateur est remis à zéro.",

        // Calculator - Lead Form
        lead_missing_title: "Champs manquants",
        lead_missing_text: "Veuillez remplir votre nom et courriel.",
        lead_sending_title: "Envoi en cours...",
        lead_sending_text: "Transmission sécurisée de votre dossier",
        lead_success_title: "Dossier Reçu !",
        lead_success_text: "Un analyste JCCAPITAL validera vos chiffres sous 24h.",
        lead_error_title: "Erreur technique",
        lead_error_text: "Impossible d'envoyer le dossier. Contactez-nous directement.",

        // Calculator - AI Chat
        ai_thinking: "Analyse en cours...",
        ai_default_response: "Je peux analyser la rentabilité, suggérer des rénovations ou expliquer les ratios bancaires. Sur quoi voulez-vous que je me concentre ?",
        ai_cashflow_response: "Votre cashflow actuel est de {0}. Pour l'améliorer, considérez augmenter les revenus de 5% ou réduire les dépenses d'opération.",
        ai_kitchen_response: "Pour la cuisine, un style Japandi augmenterait la valeur perçue de ~15k$. Coût estimé: 12,000$. ROI positif.",

        // Assurance - Lead Form
        quiz_missing_title: "Oups!",
        quiz_missing_text: "Veuillez sélectionner au moins une option.",
        assurance_analyzing_title: "Analyse en cours...",
        assurance_analyzing_html: "Calcul des ratios de couverture PQAP.<br>Comparaison avec les normes officielles.",
        assurance_success_title: "Diagnostic Déverrouillé",
        assurance_success_text: "Votre stratégie est prête.",

        // Calculator - Dynamic JS
        month_suffix: " /mois",
        msg_min_down: "⚠️ Mise de fonds minimum: {0}% pour ce type de propriété",
        msg_min_down_owner: " (occupant)",

        lbl_revenue: "Revenus",
        lbl_eff_gross: "Revenu Brut Effectif",
        lbl_exp_oper: "Dépenses Opér.",
        lbl_total_exp: "Total Dépenses",
        lbl_noi: "NOI (Revenu Net d'Opération)",
        lbl_debt: "Dettes",
        lbl_debt_serv: "Service Dette (An)",
        lbl_net_cashflow: "CASHFLOW NET",

        lbl_sens_cf: "*Cashflow Mensuel estimé",
        lbl_year_short: "An",

        ai_analyzing_wait: "Analyse du dossier en cours... <strong>Veuillez patienter</strong>.",
        ai_verdict_good: "Excellente opportunité.",
        ai_verdict_avg: "Potentiel modéré, requiert optimisation.",
        ai_report: "<strong>Analyse Complétée:</strong><br/>Verdict: {0}<br/><ul><li>Cash-on-Cash: {1}%</li><li>Ratios: Vérifiez le GDS.</li></ul>",

        msg_generating: "Génération en cours...",

        // Persistence
        msg_saved: "Sauvegardé !",
        msg_saved_text: "Projet sauvegardé dans le Slot {0}",
        msg_loaded: "Chargé !",
        msg_loaded_text: "Projet chargé depuis le Slot {0}",
        msg_slot_empty: "Slot vide",
        msg_slot_empty_text: "Aucun projet sauvegardé dans le Slot {0}",

        // JC AI Chatbot
        jc_chat_title: "JC - Assistant Virtuel",
        jc_chat_placeholder: "Tapez votre message...",
        jc_chat_send: "Envoyer",
        jc_chat_powered: "Propulsé par JC Capital",
        jc_chat_typing: "JC écrit...",
        jc_chat_disclaimer: "Je suis un assistant virtuel. Pour des conseils personnalisés, prenez rendez-vous avec notre équipe.",
        jc_chat_email_sent: "Merci ! Vos informations ont été transmises. Un membre de notre équipe vous contactera sous peu.",
        jc_chat_email_error: "Désolé, une erreur est survenue lors de l'envoi. Veuillez nous contacter directement.",

    },
    en: {
        // Generic
        loading: "Loading...",
        error: "Error",
        success: "Success",
        btn_confirm: "Confirm",
        btn_cancel: "Cancel",

        // Calculator - Reset
        calc_reset_title: "Are you sure?",
        calc_reset_text: "Reset everything to default values?",
        calc_reset_btn_yes: "Yes, reset",
        calc_reset_success_title: "Reset!",
        calc_reset_success_text: "The calculator has been reset.",

        // Calculator - Lead Form
        lead_missing_title: "Missing Fields",
        lead_missing_text: "Please fill in your name and email.",
        lead_sending_title: "Sending...",
        lead_sending_text: "Secure transmission of your file",
        lead_success_title: "File Received!",
        lead_success_text: "A JCCAPITAL analyst will validate your figures within 24h.",
        lead_error_title: "Technical Error",
        lead_error_text: "Could not send the file. Please contact us directly.",

        // Calculator - AI Chat
        ai_thinking: "Analyzing...",
        ai_default_response: "I can analyze profitability, suggest renovations, or explain bank ratios. What should I focus on?",
        ai_cashflow_response: "Your current cashflow is {0}. To improve it, consider raising revenue by 5% or reducing operating expenses.",
        ai_kitchen_response: "For the kitchen, a Japandi style would increase perceived value by ~$15k. Est cost: $12,000. Positive ROI.",

        // Assurance - Lead Form
        quiz_missing_title: "Oops!",
        quiz_missing_text: "Please select at least one option.",
        assurance_analyzing_title: "Analyzing...",
        assurance_analyzing_html: "Calculating PQAP coverage ratios.<br>Comparing with official standards.",
        assurance_success_title: "Diagnosis Unlocked",
        assurance_success_text: "Your strategy is ready.",

        // Calculator - Dynamic JS
        month_suffix: " /mo",
        msg_min_down: "⚠️ Minimum down payment: {0}% for this property type",
        msg_min_down_owner: " (occupant)",

        lbl_revenue: "Revenue",
        lbl_eff_gross: "Effective Gross Income",
        lbl_exp_oper: "Operating Expenses",
        lbl_total_exp: "Total Expenses",
        lbl_noi: "NOI (Net Operating Income)",
        lbl_debt: "Debt",
        lbl_debt_serv: "Debt Service (Yr)",
        lbl_net_cashflow: "NET CASHFLOW",

        lbl_sens_cf: "*Estimated Monthly Cashflow",
        lbl_year_short: "Yr",

        ai_analyzing_wait: "Analyzing file... <strong>Please wait</strong>.",
        ai_verdict_good: "Excellent opportunity.",
        ai_verdict_avg: "Moderate potential, requires optimization.",
        ai_report: "<strong>Analysis Complete:</strong><br/>Verdict: {0}<br/><ul><li>Cash-on-Cash: {1}%</li><li>Ratios: Check GDS.</li></ul>",

        msg_generating: "Generating...",

        // Persistence
        msg_saved: "Saved!",
        msg_saved_text: "Project saved in Slot {0}",
        msg_loaded: "Loaded!",
        msg_loaded_text: "Project loaded from Slot {0}",
        msg_slot_empty: "Empty Slot",
        msg_slot_empty_text: "No project saved in Slot {0}",

        // JC AI Chatbot
        jc_chat_title: "JC - Virtual Assistant",
        jc_chat_placeholder: "Type your message...",
        jc_chat_send: "Send",
        jc_chat_powered: "Powered by JC Capital",
        jc_chat_typing: "JC is typing...",
        jc_chat_disclaimer: "I am a virtual assistant. For personalized advice, please book an appointment with our team.",
        jc_chat_email_sent: "Thank you! Your information has been sent. A team member will reach out shortly.",
        jc_chat_email_error: "Sorry, an error occurred while sending. Please contact us directly.",
    }
};

/**
 * Helper to get translation
 * @param {string} key - The key to translate
 * @param {Array} args - Optional arguments to replace {0}, {1}...
 */
function t(key, args = []) {
    const lang = document.documentElement.lang || 'fr';
    let text = SITE_TRANSLATIONS[lang][key] || key;

    // Replace placeholders {0}, {1}, etc.
    args.forEach((arg, index) => {
        text = text.replace(`{${index}}`, arg);
    });

    return text;
}

/**
 * Global function to update page content based on data-fr / data-en attributes
 */
function updatePageLanguage() {
    const lang = document.documentElement.lang || 'fr';
    const isEn = lang === 'en';

    // 1. Text Content Update
    const translatableElements = document.querySelectorAll('[data-fr][data-en]');
    translatableElements.forEach(el => {
        // If it has innerHTML structure (e.g. spans), use innerHTML
        // However, data attributes are plain text usually. 
        // If content has HTML, it should be in the attribute carefully or handled specifically.
        // For robustness, we check if the element has children.
        // If it has children (like spans), simplistic replacement might break structure unless the structure is IN the string.

        const newText = isEn ? el.getAttribute('data-en') : el.getAttribute('data-fr');
        if (newText) {
            el.innerHTML = newText; // Using innerHTML allows simple tags like <span> or <br>
        }
    });

    // 2. Placeholder Update
    const translatableInputs = document.querySelectorAll('[data-ph-fr][data-ph-en]');
    translatableInputs.forEach(el => {
        const newPh = isEn ? el.getAttribute('data-ph-en') : el.getAttribute('data-ph-fr');
        if (newPh) {
            el.placeholder = newPh;
        }
    });
}

// Listen for global language change event (dispatched by header.html)
document.addEventListener('languageChanged', () => {
    updatePageLanguage();
});

// Run once on load to ensure sync
window.addEventListener('scroll', () => { /* no-op, just ensuring window listener logic exists if needed later */ });
// Actually, run on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    updatePageLanguage();
});
