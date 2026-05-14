/**
 * JC Chat - UI Controller (Bubble-Based)
 * Renders option bubbles, toggles input visibility, handles clicks + free-text
 */
(function () {
    'use strict';

    var session = null;
    var chatOpen = false;
    var panelCreated = false;

    // ==========================================
    // DOM CREATION
    // ==========================================
    function createChatDOM() {
        var root = document.getElementById('jc-chat-root');
        if (!root) return;

        var lang = document.documentElement.lang || 'fr';

        var titles = { fr: 'JC - Assistant Virtuel', en: 'JC - Virtual Assistant' };
        var disclaimers = {
            fr: "Je suis un assistant virtuel. Pour des conseils personnalisés, prenez rendez-vous avec notre équipe.",
            en: "I am a virtual assistant. For personalized advice, please book an appointment with our team."
        };
        var typingTexts = { fr: 'JC écrit...', en: 'JC is typing...' };
        var poweredTexts = { fr: 'Propulsé par JC Capital', en: 'Powered by JC Capital' };

        var title = titles[lang] || titles['fr'];
        var disclaimer = disclaimers[lang] || disclaimers['fr'];
        var typingText = typingTexts[lang] || typingTexts['fr'];
        var powered = poweredTexts[lang] || poweredTexts['fr'];

        root.innerHTML =
            '<div id="jc-chat-panel" class="jc-chat-panel">' +
            '<div class="jc-chat-header">' +
            '<div class="jc-chat-header-left">' +
            '<div class="jc-chat-avatar">JC</div>' +
            '<div class="jc-chat-header-info">' +
            '<span class="jc-chat-header-title">' + title + '</span>' +
            '<span class="jc-chat-header-status">' +
            '<span class="jc-chat-status-dot"></span>' +
            'Online' +
            '</span>' +
            '</div>' +
            '</div>' +
            '<button id="jc-chat-close" class="jc-chat-close" aria-label="Close">' +
            '<i class="fas fa-times"></i>' +
            '</button>' +
            '</div>' +
            '<div class="jc-chat-disclaimer">' + disclaimer + '</div>' +
            '<div id="jc-chat-messages" class="jc-chat-messages" role="log" aria-live="polite"></div>' +
            '<div id="jc-chat-typing" class="jc-chat-typing" style="display:none;">' +
            '<div class="jc-chat-typing-dots">' +
            '<span></span><span></span><span></span>' +
            '</div>' +
            '<span class="jc-chat-typing-text">' + typingText + '</span>' +
            '</div>' +
            '<form id="jc-chat-form" class="jc-chat-input-area jc-chat-input-area--hidden">' +
            '<input type="text" id="jc-chat-input" class="jc-chat-input" placeholder="" autocomplete="off" />' +
            '<button type="submit" class="jc-chat-send" aria-label="Send">' +
            '<i class="fas fa-paper-plane"></i>' +
            '</button>' +
            '</form>' +
            '<div class="jc-chat-footer">' + powered + '</div>' +
            '</div>';

        document.getElementById('jc-chat-close').addEventListener('click', closeChat);
        document.getElementById('jc-chat-form').addEventListener('submit', handleSubmit);

        panelCreated = true;
    }

    // ==========================================
    // OPEN / CLOSE
    // ==========================================
    function openChat() {
        if (!panelCreated) createChatDOM();
        if (!document.getElementById('jc-chat-panel')) return;

        var panel = document.getElementById('jc-chat-panel');
        panel.classList.add('jc-chat-panel--open');
        chatOpen = true;

        if (!session) {
            session = window.JCChatEngine.createSession();
            var loadingDiv = document.createElement('div');
            loadingDiv.className = 'jc-chat-loading';
            loadingDiv.textContent = '...';
            var msgContainer = document.getElementById('jc-chat-messages');
            if (msgContainer) msgContainer.appendChild(loadingDiv);
            setTimeout(function () {
                if (loadingDiv.parentNode) loadingDiv.parentNode.removeChild(loadingDiv);
                var response = window.JCChatEngine.buildLangSelectResponse();
                addBotMessage(response.text);
                if (response.options) renderOptions(response.options);
            }, 400);
        }
    }

    function closeChat() {
        var panel = document.getElementById('jc-chat-panel');
        if (panel) panel.classList.remove('jc-chat-panel--open');
        chatOpen = false;
    }

    function toggleChat() {
        chatOpen ? closeChat() : openChat();
    }

    // ==========================================
    // MESSAGE RENDERING
    // ==========================================
    function addUserMessage(text) {
        var container = document.getElementById('jc-chat-messages');
        if (!container) return;

        var msgDiv = document.createElement('div');
        msgDiv.className = 'jc-chat-msg jc-chat-msg--user';

        var bubble = document.createElement('div');
        bubble.className = 'jc-chat-bubble jc-chat-bubble--user';
        bubble.textContent = text;

        msgDiv.appendChild(bubble);
        container.appendChild(msgDiv);
        scrollToBottom();
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function addBotMessage(text) {
        var container = document.getElementById('jc-chat-messages');
        if (!container) return;

        var msgDiv = document.createElement('div');
        msgDiv.className = 'jc-chat-msg jc-chat-msg--bot';

        var avatar = document.createElement('div');
        avatar.className = 'jc-chat-msg-avatar';
        avatar.textContent = 'JC';

        var bubble = document.createElement('div');
        bubble.className = 'jc-chat-bubble jc-chat-bubble--bot';
        var html = escapeHtml(text)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        bubble.innerHTML = html;

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(bubble);
        container.appendChild(msgDiv);
        scrollToBottom();
    }

    // ==========================================
    // OPTION BUBBLES
    // ==========================================
    function renderOptions(options) {
        var container = document.getElementById('jc-chat-messages');
        if (!container || !options || options.length === 0) return;

        var wrapper = document.createElement('div');
        wrapper.className = 'jc-chat-options';

        for (var i = 0; i < options.length; i++) {
            (function (opt) {
                var btn = document.createElement('button');
                btn.className = 'jc-chat-option-btn';
                btn.textContent = opt.label;
                btn.setAttribute('data-choice', opt.id);
                btn.addEventListener('click', function () {
                    if (this.disabled) return;
                    this.disabled = true;
                    handleOptionClick(opt);
                });
                wrapper.appendChild(btn);
            })(options[i]);
        }

        container.appendChild(wrapper);
        scrollToBottom();
    }

    function disableCurrentOptions() {
        var container = document.getElementById('jc-chat-messages');
        if (!container) return;
        var allOptionGroups = container.querySelectorAll('.jc-chat-options:not(.jc-chat-options--disabled)');
        for (var i = 0; i < allOptionGroups.length; i++) {
            allOptionGroups[i].classList.add('jc-chat-options--disabled');
            var buttons = allOptionGroups[i].querySelectorAll('.jc-chat-option-btn');
            for (var j = 0; j < buttons.length; j++) {
                buttons[j].disabled = true;
            }
        }
    }

    // ==========================================
    // OPTION CLICK HANDLER
    // ==========================================
    function handleOptionClick(opt) {
        disableCurrentOptions();
        addUserMessage(opt.label);
        hideInput();

        showTyping();

        var delay = 300 + Math.random() * 400;
        setTimeout(function () {
            hideTyping();
            var result = window.JCChatEngine.handleChoice(opt.id, session);
            processEngineResult(result);
        }, delay);
    }

    // ==========================================
    // FREE-TEXT SUBMIT (name / phone only)
    // ==========================================
    function handleSubmit(e) {
        e.preventDefault();
        var input = document.getElementById('jc-chat-input');
        var text = input.value.trim();
        if (!text) return;

        disableCurrentOptions();
        addUserMessage(text);
        input.value = '';

        showTyping();

        var delay = 300 + Math.random() * 300;
        setTimeout(function () {
            hideTyping();
            var result = window.JCChatEngine.handleInput(text, session);
            processEngineResult(result);
        }, delay);
    }

    // ==========================================
    // PROCESS ENGINE RESULT
    // ==========================================
    function processEngineResult(result) {
        if (!result) return;

        // Send email action
        if (result.action === 'send_email') {
            addBotMessage(result.text);
            showTyping();
            window.JCChatEngine.sendClientInfo(session)
                .then(function () {
                    hideTyping();
                    var doneResult = window.JCChatEngine.buildDoneResponse(session, true);
                    addBotMessage(doneResult.text);
                    if (doneResult.options) renderOptions(doneResult.options);
                    hideInput();
                })
                .catch(function (err) {
                    hideTyping();
                    console.error('JC Chat EmailJS Error:', err);
                    var doneResult = window.JCChatEngine.buildDoneResponse(session, false);
                    addBotMessage(doneResult.text);
                    if (doneResult.options) renderOptions(doneResult.options);
                    hideInput();
                });
            return;
        }

        // Normal response
        addBotMessage(result.text);

        // Show options if present
        if (result.options && result.options.length > 0) {
            renderOptions(result.options);
        }

        // Toggle input area
        if (result.inputMode) {
            showInput(result.inputPlaceholder || '');
        } else {
            hideInput();
        }
    }

    // ==========================================
    // INPUT VISIBILITY
    // ==========================================
    function showInput(placeholder) {
        var form = document.getElementById('jc-chat-form');
        var input = document.getElementById('jc-chat-input');
        if (form) form.classList.remove('jc-chat-input-area--hidden');
        if (input) {
            input.placeholder = placeholder;
            setTimeout(function () { input.focus(); }, 100);
        }
    }

    function hideInput() {
        var form = document.getElementById('jc-chat-form');
        if (form) form.classList.add('jc-chat-input-area--hidden');
    }

    // ==========================================
    // UTILITY
    // ==========================================
    function scrollToBottom() {
        var container = document.getElementById('jc-chat-messages');
        if (container) {
            setTimeout(function () {
                container.scrollTop = container.scrollHeight;
            }, 50);
        }
    }

    function showTyping() {
        var el = document.getElementById('jc-chat-typing');
        if (el) el.style.display = 'flex';
        scrollToBottom();
    }

    function hideTyping() {
        var el = document.getElementById('jc-chat-typing');
        if (el) el.style.display = 'none';
    }

    // ==========================================
    // LANGUAGE REACTIVITY
    // ==========================================
    document.addEventListener('languageChanged', function () {
        if (!panelCreated) return;
        var lang = document.documentElement.lang || 'fr';

        var titles = { fr: 'JC - Assistant Virtuel', en: 'JC - Virtual Assistant' };
        var disclaimers = {
            fr: "Je suis un assistant virtuel. Pour des conseils personnalisés, prenez rendez-vous avec notre équipe.",
            en: "I am a virtual assistant. For personalized advice, please book an appointment with our team."
        };
        var typingTexts = { fr: 'JC écrit...', en: 'JC is typing...' };
        var poweredTexts = { fr: 'Propulsé par JC Capital', en: 'Powered by JC Capital' };

        var titleEl = document.querySelector('.jc-chat-header-title');
        if (titleEl) titleEl.textContent = titles[lang] || titles['fr'];

        var disclaimerEl = document.querySelector('.jc-chat-disclaimer');
        if (disclaimerEl) disclaimerEl.textContent = disclaimers[lang] || disclaimers['fr'];

        var typingEl = document.querySelector('.jc-chat-typing-text');
        if (typingEl) typingEl.textContent = typingTexts[lang] || typingTexts['fr'];

        var footerEl = document.querySelector('.jc-chat-footer');
        if (footerEl) footerEl.textContent = poweredTexts[lang] || poweredTexts['fr'];
    });

    // ==========================================
    // INIT
    // ==========================================
    function init() {
        if (document.getElementById('jc-chat-root')) return;
        var observer = new MutationObserver(function (mutations, obs) {
            if (document.getElementById('jc-chat-root')) {
                obs.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ==========================================
    // PUBLIC API
    // ==========================================
    window.JCChat = {
        open: openChat,
        close: closeChat,
        toggle: toggleChat
    };

})();
