/**
 * JC Capital - Component Loader
 * Dynamically loads header and footer components
 */

// Detect if we're in a subdirectory (pages folder)
function getBasePath() {
    const path = window.location.pathname;
    if (path.includes('/pages/')) {
        return '../';
    }
    return '';
}

// Load HTML component into target element
async function loadComponent(componentPath, targetId) {
    const basePath = getBasePath();
    const fullPath = basePath + componentPath;

    try {
        const response = await fetch(fullPath);
        if (!response.ok) throw new Error(`Failed to load ${fullPath}`);

        let html = await response.text();

        // Fix relative paths if we're in a subdirectory
        if (basePath) {
            html = html.replace(/href="index\.html/g, 'href="../index.html');
            html = html.replace(/href="pages\//g, 'href="');
            html = html.replace(/src="img\//g, 'src="../img/');
        }

        document.getElementById(targetId).innerHTML = html;
    } catch (error) {
        console.error('Component loading error:', error);
        const target = document.getElementById(targetId);
        if (target) target.innerHTML = '<div style="padding:1rem;text-align:center;color:#999;">Content unavailable</div>';
    }
}

// Load all components when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Load header and footer
    await loadComponent('components/header.html', 'header-placeholder');
    await loadComponent('components/footer.html', 'footer-placeholder');

    // Initialize Logic that depends on footer elements
    initBackToTop();
});

// Initialize Back to Top Button Logic
function initBackToTop() {
    const backToTopBtn = document.getElementById('backToTop');
    if (!backToTopBtn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Close dropdown when clicking outside
document.addEventListener('click', function (event) {
    if (!event.target.closest('.dropdown') && !event.target.closest('.hamburger-menu')) {
        document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
    }
});

// Language toggle function (global)
window.toggleLanguage = function () {
    const btn = document.querySelector('.lang-toggle');
    const html = document.documentElement;
    const currentLang = html.lang === 'fr' ? 'en' : 'fr'; // Toggle target

    // 1. Update HTML Tag
    html.lang = currentLang;

    // 2. Persist
    localStorage.setItem('jc_pref_lang', currentLang);

    // 3. Update Button Text (Shows what to switch TO)
    btn.textContent = currentLang === 'fr' ? 'EN' : 'FR';

    // 4. Update Static Content (Text)
    document.querySelectorAll(`[data-${currentLang}]`).forEach(element => {
        const translation = element.getAttribute(`data-${currentLang}`);
        if (translation) {
            // Check if it's an input with placeholder
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else {
                element.innerHTML = translation; // Use innerHTML to allow <strong> etc.
            }
        }
    });

    // 5. Dispatch Event for Dynamic Content (Charts, Quizzes)
    document.dispatchEvent(new Event('languageChanged'));
};

// Init Language on Load
document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('jc_pref_lang');
    if (savedLang && savedLang !== 'fr') {
        const btn = document.querySelector('.lang-toggle');
        // If saved is EN, we want to simulate a swap to EN. 
        // Default is FR. If saved is EN, toggle once.
        if (btn && document.documentElement.lang === 'fr') {
            window.toggleLanguage();
        }
    }
});

// Support FAB Logic (Delegated)
document.addEventListener('click', function (e) {
    const btn = e.target.closest('#supportBtn');
    if (btn) {
        const menu = document.getElementById('supportMenu');
        menu.classList.toggle('active');
        const icon = btn.querySelector('i');
        if (menu.classList.contains('active')) {
            icon.classList.remove('fa-headset');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-headset');
        }
    } else {
        // Close if clicking outside
        if (!e.target.closest('.support-fab-container')) {
            const menu = document.getElementById('supportMenu');
            // Check if menu exists (footer loaded)
            if (menu) {
                menu.classList.remove('active');
                const icon = document.querySelector('#supportBtn i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-headset');
                }
            }
        }
    }

    // AI Agent Button Logic -> Open JC Chat
    const aiBtn = e.target.closest('#aiAgentBtn');
    if (aiBtn) {
        e.preventDefault();
        // Close support menu
        const menu = document.getElementById('supportMenu');
        if (menu) menu.classList.remove('active');
        const icon = document.querySelector('#supportBtn i');
        if (icon) {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-headset');
        }
        // Open chat
        if (window.JCChat) {
            window.JCChat.open();
        }
    }
});
