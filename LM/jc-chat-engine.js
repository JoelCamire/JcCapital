/**
 * JC Chat Engine — Bubble-Based Guided Conversation
 * No NLP / no free-text parsing. Users click option bubbles.
 * Free-text input only for: name, phone number.
 */
(function () {
    'use strict';

    var DATA = null; // resolved on first use

    function getData() {
        if (!DATA) DATA = window.JC_CHAT_DATA;
        return DATA;
    }

    // ==========================================
    // STATES
    // ==========================================
    var STATE = {
        LANG_SELECT: 'lang_select',
        MENU: 'menu',
        SERVICE_INFO: 'service_info',
        SERVICE_DETAIL: 'service_detail',
        FAQ_ANSWER: 'faq_answer',
        QUIZ: 'quiz',
        ASK_NAME: 'ask_name',
        ASK_PHONE: 'ask_phone',
        ASK_EMAIL: 'ask_email',
        QUIZ_RESULT: 'quiz_result',
        CONFIRM: 'confirm',
        DONE: 'done'
    };

    // ==========================================
    // TEXTS
    // ==========================================
    var T = {
        greeting: {
            fr: "Bonjour ! 👋 Je suis l'assistant virtuel de **JC Capital**.\n\nComment puis-je vous aider aujourd'hui ?",
            en: "Hello! 👋 I'm the **JC Capital** virtual assistant.\n\nHow can I help you today?"
        },
        lang_prompt: {
            fr: "Bonjour ! 👋 Bienvenue chez **JC Capital**.\n\nChoisissez votre langue / Choose your language:",
            en: "Hello! 👋 Welcome to **JC Capital**.\n\nChoose your language / Choisissez votre langue:"
        },
        menu_prompt: {
            fr: "Quel service vous intéresse ? 👇",
            en: "Which service are you interested in? 👇"
        },
        dont_know: {
            fr: "Pas de souci ! Voici un aperçu de nos services :\n\n",
            en: "No worries! Here's an overview of our services:\n\n"
        },
        service_options_prompt: {
            fr: "\n\nQue souhaitez-vous savoir ?",
            en: "\n\nWhat would you like to know?"
        },
        ask_name: {
            fr: "Parfait ! 📅 Pour planifier votre rendez-vous, j'aurais besoin de quelques informations.\n\nQuel est votre **nom complet** ?",
            en: "Great! 📅 To schedule your appointment, I'll need a few details.\n\nWhat is your **full name**?"
        },
        ask_phone: {
            fr: "Merci **{name}** ! 📱\n\nQuel est votre **numéro de téléphone** ?",
            en: "Thank you **{name}**! 📱\n\nWhat is your **phone number**?"
        },
        confirm_prompt: {
            fr: "Parfait ! Voici un résumé :\n\n👤 **Nom :** {name}\n📱 **Téléphone :** {phone}\n📋 **Service :** {service}\n\nEst-ce que tout est correct ?",
            en: "Great! Here's a summary:\n\n👤 **Name:** {name}\n📱 **Phone:** {phone}\n📋 **Service:** {service}\n\nIs everything correct?"
        },
        sending: {
            fr: "Envoi en cours... ⏳",
            en: "Sending... ⏳"
        },
        done: {
            fr: "Merci **{name}** ! ✅\n\nVotre demande a été envoyée avec succès. Un membre de notre équipe vous contactera bientôt au **{phone}**.\n\nÀ bientôt ! 🙏",
            en: "Thank you **{name}**! ✅\n\nYour request has been sent successfully. A team member will contact you soon at **{phone}**.\n\nSee you soon! 🙏"
        },
        done_error: {
            fr: "Désolé, une erreur est survenue lors de l'envoi. 😔\n\nVous pouvez nous joindre directement au **{phone_company}** ou par courriel à **{email}**.",
            en: "Sorry, an error occurred while sending. 😔\n\nYou can reach us directly at **{phone_company}** or by email at **{email}**."
        },
        invalid_name: {
            fr: "Hmm, le nom ne semble pas valide. Pouvez-vous entrer votre **prénom et nom** ?",
            en: "Hmm, that doesn't look like a valid name. Could you enter your **first and last name**?"
        },
        invalid_phone: {
            fr: "Ce numéro ne semble pas valide. Entrez un numéro à **10 chiffres** (ex: 581 398-6747) :",
            en: "That number doesn't seem valid. Please enter a **10-digit** number (e.g., 581 398-6747):"
        },
        back_to_menu: {
            fr: "⬅ Retour au menu",
            en: "⬅ Back to menu"
        },
        back_to_service: {
            fr: "⬅ Retour aux options",
            en: "⬅ Back to options"
        },
        book_btn: {
            fr: "📅 Prendre rendez-vous",
            en: "📅 Book appointment"
        },
        more_details_btn: {
            fr: "📋 En savoir plus",
            en: "📋 Learn more"
        },
        audience_btn: {
            fr: "👤 C'est pour qui ?",
            en: "👤 Who is it for?"
        },
        questions_btn: {
            fr: "❓ Questions fréquentes",
            en: "❓ Frequently asked questions"
        },
        confirm_btn: {
            fr: "✅ Confirmer",
            en: "✅ Confirm"
        },
        modify_btn: {
            fr: "✏️ Modifier",
            en: "✏️ Modify"
        },
        restart_btn: {
            fr: "🔄 Recommencer",
            en: "🔄 Start over"
        },
        dont_know_btn: {
            fr: "🤔 Je ne sais pas",
            en: "🤔 I'm not sure"
        },
        placeholder_name: {
            fr: "Entrez votre nom...",
            en: "Enter your name..."
        },
        placeholder_phone: {
            fr: "Ex: 581 398-6747",
            en: "E.g.: 581 398-6747"
        },
        ask_email: {
            fr: "Parfait ! 📧\n\nQuelle est votre **adresse courriel** ?",
            en: "Great! 📧\n\nWhat is your **email address**?"
        },
        invalid_email: {
            fr: "Ce courriel ne semble pas valide. Entrez une adresse comme **nom@domaine.com** :",
            en: "That email doesn't seem valid. Please enter an address like **name@domain.com**:"
        },
        placeholder_email: {
            fr: "Ex: nom@domaine.com",
            en: "E.g.: name@domain.com"
        },
        quiz_btn: {
            fr: "📝 Faire le quiz",
            en: "📝 Take the quiz"
        },
        quiz_progress: {
            fr: "Question {n} / {total}",
            en: "Question {n} / {total}"
        },
        quiz_contact_intro: {
            fr: "Merci d'avoir complété le quiz ! 🎉\n\nPour recevoir vos résultats personnalisés, veuillez nous fournir vos coordonnées :",
            en: "Thank you for completing the quiz! 🎉\n\nTo receive your personalized results, please provide your contact information:"
        },
        confirm_prompt_quiz: {
            fr: "Parfait ! Voici un résumé :\n\n👤 **Nom :** {name}\n📱 **Téléphone :** {phone}\n📧 **Courriel :** {email}\n📋 **Service :** {service}\n\nEst-ce que tout est correct ?",
            en: "Perfect! Here's a summary:\n\n👤 **Name:** {name}\n📱 **Phone:** {phone}\n📧 **Email:** {email}\n📋 **Service:** {service}\n\nIs everything correct?"
        }
    };

    // ==========================================
    // SESSION
    // ==========================================
    function createSession() {
        return {
            state: STATE.LANG_SELECT,
            lang: document.documentElement.lang || 'fr',
            userName: null,
            userPhone: null,
            userEmail: null,
            selectedServiceId: null,
            conversationHistory: [],
            quizAnswers: [],
            quizIndex: 0,
            inQuiz: false
        };
    }

    // ==========================================
    // HELPERS
    // ==========================================
    function txt(key, session) {
        var template = T[key];
        if (!template) return '';
        var str = template[session.lang] || template['fr'];
        var data = getData();
        var svc = getServiceById(session.selectedServiceId);
        str = str.replace(/\{name\}/g, session.userName || '');
        str = str.replace(/\{phone\}/g, session.userPhone || '');
        str = str.replace(/\{email\}/g, session.userEmail || '');
        str = str.replace(/\{service\}/g, svc ? (svc.name[session.lang] || svc.name['fr']) : '');
        str = str.replace(/\{company\}/g, data.company.name);
        str = str.replace(/\{phone_company\}/g, data.company.phone);
        str = str.replace(/\{email_company\}/g, data.company.email);
        return str;
    }

    function getQuiz(serviceId) {
        if (!window.JC_CHAT_QUIZZES) return null;
        return window.JC_CHAT_QUIZZES[serviceId] || null;
    }

    function getServiceById(id) {
        if (!id) return null;
        var services = getData().services;
        for (var i = 0; i < services.length; i++) {
            if (services[i].id === id) return services[i];
        }
        return null;
    }

    function autoCapitalize(str) {
        return str.replace(/(?:^|[\s-])([a-zà-ÿ])/g, function (m) {
            return m.toUpperCase();
        });
    }

    function cleanPhone(str) {
        return str.replace(/[^0-9]/g, '');
    }

    function formatPhone(digits) {
        if (digits.length === 10) {
            return '(' + digits.substring(0, 3) + ') ' + digits.substring(3, 6) + '-' + digits.substring(6);
        }
        if (digits.length === 11 && digits[0] === '1') {
            return '(' + digits.substring(1, 4) + ') ' + digits.substring(4, 7) + '-' + digits.substring(7);
        }
        return digits;
    }

    // ==========================================
    // CORE: handleChoice  (bubble click)
    // handleInput   (free-text submit)
    // ==========================================

    /**
     * Called when user clicks an option bubble.
     * @param {string} choiceId  e.g. "lang_fr", "service_tax_optimization", "faq_0", "book", "details", "audience", "back_menu", "confirm", "modify", "restart"
     * @param {object} session
     * @returns {{ text: string, options?: Array<{id:string,label:string}>, inputMode?: string, inputPlaceholder?: string }}
     */
    function handleChoice(choiceId, session) {
        var lang = session.lang;

        // ─── Language select ───
        if (choiceId === 'lang_fr' || choiceId === 'lang_en') {
            session.lang = choiceId === 'lang_fr' ? 'fr' : 'en';
            lang = session.lang;
            session.state = STATE.MENU;
            return buildMenuResponse(session);
        }

        // ─── Service selected from menu ───
        if (choiceId.indexOf('service_') === 0) {
            var svcId = choiceId.substring(8); // remove "service_"
            session.selectedServiceId = svcId;
            session.state = STATE.SERVICE_INFO;
            return buildServiceInfoResponse(session);
        }

        // ─── "I don't know" ───
        if (choiceId === 'dont_know') {
            var data = getData();
            var overview = txt('dont_know', session);
            for (var i = 0; i < data.services.length; i++) {
                var svc = data.services[i];
                var name = svc.name[lang] || svc.name['fr'];
                var desc = svc.description[lang] || svc.description['fr'];
                overview += '**' + name + '** — ' + desc.split('.')[0] + '.\n\n';
            }
            overview += txt('menu_prompt', session);
            return {
                text: overview,
                options: buildServiceMenuOptions(session)
            };
        }

        // ─── Service sub-options ───
        if (choiceId === 'details') {
            session.state = STATE.SERVICE_DETAIL;
            var svc = getServiceById(session.selectedServiceId);
            var detailText = svc.details[lang] || svc.details['fr'];
            return {
                text: detailText,
                options: [
                    { id: 'back_service', label: txt('back_to_service', session) },
                    { id: 'book', label: txt('book_btn', session) },
                    { id: 'back_menu', label: txt('back_to_menu', session) }
                ]
            };
        }

        if (choiceId === 'audience') {
            session.state = STATE.SERVICE_DETAIL;
            var svc = getServiceById(session.selectedServiceId);
            var audienceText = svc.audience[lang] || svc.audience['fr'];
            return {
                text: audienceText,
                options: [
                    { id: 'back_service', label: txt('back_to_service', session) },
                    { id: 'book', label: txt('book_btn', session) },
                    { id: 'back_menu', label: txt('back_to_menu', session) }
                ]
            };
        }

        // ─── FAQ ───
        if (choiceId.indexOf('faq_') === 0) {
            var faqIdx = parseInt(choiceId.substring(4), 10);
            var svc = getServiceById(session.selectedServiceId);
            if (svc && svc.faq && svc.faq[faqIdx]) {
                session.state = STATE.FAQ_ANSWER;
                var faq = svc.faq[faqIdx];
                var answer = faq.a[lang] || faq.a['fr'];
                return {
                    text: answer,
                    options: [
                        { id: 'back_service', label: txt('back_to_service', session) },
                        { id: 'book', label: txt('book_btn', session) },
                        { id: 'back_menu', label: txt('back_to_menu', session) }
                    ]
                };
            }
        }

        // ─── Back to service info ───
        if (choiceId === 'back_service') {
            session.state = STATE.SERVICE_INFO;
            return buildServiceInfoResponse(session);
        }

        // ─── Back to menu ───
        if (choiceId === 'back_menu') {
            session.selectedServiceId = null;
            session.state = STATE.MENU;
            return buildMenuResponse(session);
        }

        // ─── Start quiz ───
        if (choiceId === 'quiz_start') {
            var quiz = getQuiz(session.selectedServiceId);
            if (quiz && quiz.questions && quiz.questions.length > 0) {
                session.inQuiz = true;
                session.quizAnswers = [];
                session.quizIndex = 0;
                session.state = STATE.QUIZ;
                return buildQuizQuestionResponse(session);
            }
            // fallback: no quiz, go to booking
            session.state = STATE.ASK_NAME;
            return {
                text: txt('ask_name', session),
                inputMode: 'name',
                inputPlaceholder: txt('placeholder_name', session)
            };
        }

        // ─── Quiz answer ───
        if (choiceId.indexOf('quiz_ans_') === 0 && session.state === STATE.QUIZ) {
            var ansIdx = parseInt(choiceId.substring(9), 10);
            var quiz = getQuiz(session.selectedServiceId);
            var currentQ = quiz.questions[session.quizIndex];
            var selectedOpt = currentQ.options[ansIdx];
            session.quizAnswers.push({ val: selectedOpt.val, tag: selectedOpt.tag });
            session.quizIndex++;

            if (session.quizIndex < quiz.questions.length) {
                return buildQuizQuestionResponse(session);
            }

            // Quiz complete → show results first, then collect contact info
            var quizResult = buildQuizResultResponse(session);
            session.state = STATE.ASK_NAME;
            return {
                text: quizResult.text + '\n\n---\n\n' + txt('quiz_contact_intro', session) + '\n\n' + txt('ask_name', session).split('\n\n').pop(),
                inputMode: 'name',
                inputPlaceholder: txt('placeholder_name', session)
            };
        }

        // ─── Book appointment ───
        if (choiceId === 'book') {
            session.state = STATE.ASK_NAME;
            return {
                text: txt('ask_name', session),
                inputMode: 'name',
                inputPlaceholder: txt('placeholder_name', session)
            };
        }

        // ─── Confirm ───
        if (choiceId === 'confirm') {
            session.state = STATE.DONE;
            return { text: txt('sending', session), action: 'send_email' };
        }

        // ─── Modify ───
        if (choiceId === 'modify') {
            session.userName = null;
            session.userPhone = null;
            session.userEmail = null;
            session.state = STATE.ASK_NAME;
            return {
                text: txt('ask_name', session),
                inputMode: 'name',
                inputPlaceholder: txt('placeholder_name', session)
            };
        }

        // ─── Restart ───
        if (choiceId === 'restart') {
            session.userName = null;
            session.userPhone = null;
            session.userEmail = null;
            session.selectedServiceId = null;
            session.inQuiz = false;
            session.quizAnswers = [];
            session.quizIndex = 0;
            session.state = STATE.MENU;
            return buildMenuResponse(session);
        }

        // ─── Fallback ───
        return buildMenuResponse(session);
    }

    /**
     * Called when user submits free-text (name or phone).
     * @param {string} text
     * @param {object} session
     * @returns {{ text: string, options?: Array, inputMode?: string, inputPlaceholder?: string, action?: string }}
     */
    function handleInput(text, session) {
        var trimmed = text.trim();

        // ─── Name input ───
        if (session.state === STATE.ASK_NAME) {
            if (!trimmed || trimmed.length < 2 || !/^[a-zA-ZÀ-Ÿà-ÿ\s\-'.]+$/.test(trimmed)) {
                return {
                    text: txt('invalid_name', session),
                    inputMode: 'name',
                    inputPlaceholder: txt('placeholder_name', session)
                };
            }
            session.userName = autoCapitalize(trimmed);
            session.state = STATE.ASK_PHONE;
            return {
                text: txt('ask_phone', session),
                inputMode: 'phone',
                inputPlaceholder: txt('placeholder_phone', session)
            };
        }

        // ─── Phone input ───
        if (session.state === STATE.ASK_PHONE) {
            var digits = cleanPhone(trimmed);
            if (digits.length < 10 || digits.length > 11) {
                return {
                    text: txt('invalid_phone', session),
                    inputMode: 'phone',
                    inputPlaceholder: txt('placeholder_phone', session)
                };
            }
            session.userPhone = formatPhone(digits);

            // If in quiz flow, also ask for email
            if (session.inQuiz) {
                session.state = STATE.ASK_EMAIL;
                return {
                    text: txt('ask_email', session),
                    inputMode: 'email',
                    inputPlaceholder: txt('placeholder_email', session)
                };
            }

            session.state = STATE.CONFIRM;
            return {
                text: txt('confirm_prompt', session),
                options: [
                    { id: 'confirm', label: txt('confirm_btn', session) },
                    { id: 'modify', label: txt('modify_btn', session) }
                ]
            };
        }

        // ─── Email input ───
        if (session.state === STATE.ASK_EMAIL) {
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(trimmed)) {
                return {
                    text: txt('invalid_email', session),
                    inputMode: 'email',
                    inputPlaceholder: txt('placeholder_email', session)
                };
            }
            session.userEmail = trimmed.toLowerCase();
            session.state = STATE.CONFIRM;
            return {
                text: txt('confirm_prompt_quiz', session),
                options: [
                    { id: 'confirm', label: txt('confirm_btn', session) },
                    { id: 'modify', label: txt('modify_btn', session) }
                ]
            };
        }

        // Shouldn't happen (input should be hidden) — fallback
        return buildMenuResponse(session);
    }

    // ==========================================
    // RESPONSE BUILDERS
    // ==========================================

    function buildMenuResponse(session) {
        return {
            text: txt('menu_prompt', session),
            options: buildServiceMenuOptions(session)
        };
    }

    function buildServiceMenuOptions(session) {
        var data = getData();
        var lang = session.lang;
        var opts = [];
        for (var i = 0; i < data.services.length; i++) {
            var svc = data.services[i];
            opts.push({
                id: 'service_' + svc.id,
                label: svc.name[lang] || svc.name['fr']
            });
        }
        opts.push({ id: 'dont_know', label: txt('dont_know_btn', session) });
        return opts;
    }

    function buildServiceInfoResponse(session) {
        var svc = getServiceById(session.selectedServiceId);
        var lang = session.lang;
        if (!svc) return buildMenuResponse(session);

        var desc = svc.description[lang] || svc.description['fr'];
        var msgText = '**' + (svc.name[lang] || svc.name['fr']) + '**\n\n' + desc + txt('service_options_prompt', session);

        var opts = [
            { id: 'details', label: txt('more_details_btn', session) },
            { id: 'audience', label: txt('audience_btn', session) }
        ];

        // Add Quiz button if quiz exists for this service
        var quiz = getQuiz(session.selectedServiceId);
        if (quiz) {
            opts.push({ id: 'quiz_start', label: txt('quiz_btn', session) });
        }

        // Add FAQ buttons
        if (svc.faq && svc.faq.length > 0) {
            for (var i = 0; i < svc.faq.length; i++) {
                var q = svc.faq[i].q[lang] || svc.faq[i].q['fr'];
                opts.push({ id: 'faq_' + i, label: '❓ ' + q });
            }
        }

        opts.push({ id: 'book', label: txt('book_btn', session) });
        opts.push({ id: 'back_menu', label: txt('back_to_menu', session) });

        return { text: msgText, options: opts };
    }

    // ==========================================
    // QUIZ QUESTION BUILDER
    // ==========================================
    function buildQuizQuestionResponse(session) {
        var quiz = getQuiz(session.selectedServiceId);
        var lang = session.lang;
        var q = quiz.questions[session.quizIndex];
        var total = quiz.questions.length;
        var num = session.quizIndex + 1;

        var progress = T.quiz_progress[lang] || T.quiz_progress['fr'];
        progress = progress.replace('{n}', num).replace('{total}', total);

        var questionText = q.q[lang] || q.q['fr'];
        var msgText = '**' + progress + '**\n\n' + questionText;

        // If first question, add intro
        if (session.quizIndex === 0) {
            var title = quiz.title[lang] || quiz.title['fr'];
            var intro = quiz.intro[lang] || quiz.intro['fr'];
            msgText = '**' + title + '**\n\n' + intro + '\n\n---\n\n' + msgText;
        }

        var opts = [];
        for (var i = 0; i < q.options.length; i++) {
            var optLabel = q.options[i].label[lang] || q.options[i].label['fr'];
            opts.push({ id: 'quiz_ans_' + i, label: optLabel });
        }

        return { text: msgText, options: opts };
    }

    // ==========================================
    // QUIZ RESULT BUILDER
    // ==========================================
    function buildQuizResultResponse(session) {
        var quiz = getQuiz(session.selectedServiceId);
        var lang = session.lang;

        var resultText = quiz.buildResult(session.quizAnswers, lang);
        return {
            text: resultText,
            options: [
                { id: 'book', label: txt('book_btn', session) },
                { id: 'restart', label: txt('restart_btn', session) }
            ]
        };
    }

    // ==========================================
    // LANGUAGE SELECT (initial)
    // ==========================================
    function buildLangSelectResponse() {
        return {
            text: T.lang_prompt['fr'],
            options: [
                { id: 'lang_fr', label: '🇫🇷 Français' },
                { id: 'lang_en', label: '🇬🇧 English' }
            ]
        };
    }

    // ==========================================
    // EMAIL SENDING
    // ==========================================
    function sendClientInfo(session) {
        var data = getData();
        var svc = getServiceById(session.selectedServiceId);
        var serviceName = svc ? (svc.name[session.lang] || svc.name['fr']) : (session.lang === 'en' ? 'Not specified' : 'Non spécifié');

        var msgParts = ['[Via JC AI Chat] Service: ' + serviceName];
        if (session.userEmail) msgParts.push('Email: ' + session.userEmail);
        if (session.inQuiz && session.quizAnswers.length > 0) {
            var answerSummary = session.quizAnswers.map(function (a) { return a.val; }).join(', ');
            msgParts.push('Quiz answers: ' + answerSummary);
        }

        var templateParams = {
            from_name: session.userName || 'Visiteur',
            phone: session.userPhone || '',
            message: msgParts.join(' | '),
            to_email: data.company.email
        };

        try { emailjs.init("f2XrwkA4ORdXaNpMK"); } catch (e) { /* already init */ }
        return emailjs.send('service_f5cxij2', 'template_v19dj0o', templateParams);
    }

    // ==========================================
    // DONE RESPONSE (after email result)
    // ==========================================
    function buildDoneResponse(session, success) {
        if (success) {
            // If quiz was completed, show results after successful email
            if (session.inQuiz && session.quizAnswers.length > 0) {
                var quizResult = buildQuizResultResponse(session);
                return {
                    text: txt('done', session) + '\n\n---\n\n' + quizResult.text,
                    options: [
                        { id: 'restart', label: txt('restart_btn', session) }
                    ]
                };
            }
            return {
                text: txt('done', session),
                options: [
                    { id: 'restart', label: txt('restart_btn', session) }
                ]
            };
        } else {
            return {
                text: txt('done_error', session),
                options: [
                    { id: 'restart', label: txt('restart_btn', session) }
                ]
            };
        }
    }

    // ==========================================
    // PUBLIC API
    // ==========================================
    window.JCChatEngine = {
        STATE: STATE,
        createSession: createSession,
        handleChoice: handleChoice,
        handleInput: handleInput,
        sendClientInfo: sendClientInfo,
        buildLangSelectResponse: buildLangSelectResponse,
        buildDoneResponse: buildDoneResponse,
        T: T
    };

})();
