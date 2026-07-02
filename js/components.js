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

    // Initialize mobile hamburger menu (after header injected)
    initMobileMenu();

    // Reveal the fixed nav once the user scrolls past the hero
    initNavReveal();

    // Reveal sections/cards as they enter the viewport
    initScrollReveal();

    // Thin gold scroll-progress bar at the top
    initScrollProgress();

    // Parallax on image bands (image moves as you scroll — works on mobile too)
    initBandParallax();
});

function initBandParallax() {
    var bgs = Array.prototype.slice.call(document.querySelectorAll('.image-band-bg'));
    if (!bgs.length) return;
    var ticking = false;
    function apply() {
        var vh = window.innerHeight || document.documentElement.clientHeight;
        bgs.forEach(function (bg) {
            var band = bg.parentElement;
            if (!band) return;
            var rect = band.getBoundingClientRect();
            if (rect.bottom < -100 || rect.top > vh + 100) return; // offscreen, skip
            var progress = (rect.top + rect.height / 2 - vh / 2) / vh; // ~ -1..1
            var offset = -(progress * 70); // px of parallax travel
            bg.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
        });
        ticking = false;
    }
    function onScroll() {
        if (!ticking) { window.requestAnimationFrame(apply); ticking = true; }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    apply();
}

// Scroll progress bar (premium touch)
function initScrollProgress() {
    if (document.getElementById('scroll-progress')) return;
    var bar = document.createElement('div');
    bar.id = 'scroll-progress';
    document.body.appendChild(bar);
    function update() {
        var h = document.documentElement;
        var max = h.scrollHeight - h.clientHeight;
        var pct = max > 0 ? (h.scrollTop || document.body.scrollTop) / max : 0;
        bar.style.width = Math.max(0, Math.min(1, pct)) * 100 + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
}

// Scroll reveal — progressive enhancement: elements only get the hidden state
// once JS runs, so the page is fully visible if JS fails or is disabled.
function initScrollReveal() {
    var selector = [
        '.section-heading',
        '.service-bubble',
        '.team-card',
        '.member-card',
        '.event-card',
        '.events-empty',
        '.content-wrapper',
        '.process-step',
        '.social-bubble',
        '.booking-intro',
        '.calendly-inline-widget'
    ].join(',');

    var els = Array.prototype.slice.call(document.querySelectorAll(selector));
    if (!els.length) return;

    els.forEach(function (el, i) {
        el.classList.add('jc-reveal');
        // subtle stagger for grids
        el.style.transitionDelay = (Math.min(i % 6, 5) * 60) + 'ms';
    });

    if (!('IntersectionObserver' in window)) {
        // Fallback: just show everything
        els.forEach(function (el) { el.classList.add('jc-reveal--visible'); });
        return;
    }

    var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('jc-reveal--visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    els.forEach(function (el) { obs.observe(el); });
}

// --- Robust body scroll lock ---
// Plain `overflow:hidden` does NOT reliably lock scrolling on mobile Safari, so we
// pin the body with position:fixed and restore the scroll position on unlock.
let _savedScrollY = 0;
function lockBodyScroll() {
    _savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${_savedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
}
function unlockBodyScroll() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    // Restore scroll without the CSS smooth-scroll animating the jump
    const html = document.documentElement;
    const prevBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, _savedScrollY);
    html.style.scrollBehavior = prevBehavior;
}

// Close the mobile menu (shared by link clicks, outside clicks, Escape)
function closeMobileMenu() {
    const hamburger = document.querySelector('.hamburger-menu');
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks || !navLinks.classList.contains('active')) return;
    if (hamburger) hamburger.classList.remove('active');
    navLinks.classList.remove('active');
    // Collapse any expanded dropdown so the menu reopens in a clean state
    navLinks.querySelectorAll('.dropdown.active').forEach(d => {
        d.classList.remove('active');
        const toggle = d.querySelector('.dropdown-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
    unlockBodyScroll();
}

// Toggle a nav dropdown ("À propos" / "Outils").
// Global because header.html uses inline onclick, and defined HERE (not main.js)
// so it exists on every page — main.js is only loaded on the homepage.
window.toggleDropdown = function (e) {
    e.preventDefault();
    e.stopPropagation();
    const parent = e.currentTarget.closest('.dropdown');
    if (!parent) return;
    // Only one dropdown open at a time
    document.querySelectorAll('.dropdown').forEach(d => {
        if (d !== parent) {
            d.classList.remove('active');
            const t = d.querySelector('.dropdown-toggle');
            if (t) t.setAttribute('aria-expanded', 'false');
        }
    });
    const isOpen = parent.classList.toggle('active');
    e.currentTarget.setAttribute('aria-expanded', String(isOpen));
};

// Initialize Mobile Hamburger Menu
function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger-menu');
    const navLinks = document.querySelector('.nav-links');
    if (!hamburger || !navLinks) return;
    // Guard against double initialization (would make every toggle cancel itself)
    if (hamburger.dataset.menuInit) return;
    hamburger.dataset.menuInit = 'true';

    // Toggle menu on hamburger click
    hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = !navLinks.classList.contains('active');
        hamburger.classList.toggle('active', willOpen);
        navLinks.classList.toggle('active', willOpen);
        if (willOpen) {
            lockBodyScroll();
        } else {
            unlockBodyScroll();
        }
    });

    // Close menu when clicking a link (except dropdown toggles)
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (link.classList.contains('dropdown-toggle')) return;
            closeMobileMenu();
        });
    });

    // Close menu when clicking outside the panel / hamburger
    document.addEventListener('click', (e) => {
        if (!navLinks.classList.contains('active')) return;
        if (!e.target.closest('.nav-links') && !e.target.closest('.hamburger-menu')) {
            closeMobileMenu();
        }
    });

    // Close menu on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMobileMenu();
    });
}

// Reveal the fixed nav once the user has scrolled past the hero; hide it at the
// very top so the hero stays clean. Because the nav is position:fixed, it (and its
// hamburger) stays reachable at every scroll position — including the page bottom.
function initNavReveal() {
    const nav = document.querySelector('.sticky-nav');
    if (!nav) return;
    const hero = document.querySelector('.hero-section');

    // Pages without a hero (sub-pages, 404) have no "scroll past the hero"
    // moment — keep the nav (and its hamburger) visible at all times.
    if (!hero) {
        nav.classList.add('nav-revealed');
        return;
    }

    function update() {
        // Keep the bar visible while the mobile menu is open
        const navLinks = document.querySelector('.nav-links');
        if (navLinks && navLinks.classList.contains('active')) {
            nav.classList.add('nav-revealed');
            return;
        }
        const triggerPoint = (hero ? hero.offsetHeight : window.innerHeight) * 0.72;
        if ((window.scrollY || window.pageYOffset || 0) > triggerPoint) {
            nav.classList.add('nav-revealed');
        } else {
            nav.classList.remove('nav-revealed');
        }
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update(); // set initial state on load
}

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
        document.querySelectorAll('.dropdown.active').forEach(d => {
            d.classList.remove('active');
            const toggle = d.querySelector('.dropdown-toggle');
            if (toggle) toggle.setAttribute('aria-expanded', 'false');
        });
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
