// JC Capital - Core Logic

document.addEventListener('DOMContentLoaded', () => {
    // 1. HAMBURGER MENU + DROPDOWNS — handled in components.js (single source
    //    of truth, loaded on EVERY page; main.js is homepage-only)

    // 2. SERVICE BUBBLE EXPANSION
    window.toggleService = function (element) {
        // Close other service bubbles
        document.querySelectorAll('.service-bubble').forEach(el => {
            if (el !== element) el.classList.remove('active');
        });
        // Toggle the selected bubble
        element.classList.toggle('active');
        element.setAttribute('aria-expanded', element.classList.contains('active'));
    };

    // 3. TEAM CAROUSEL LOGIC
    let currentTeamIndex = 0;
    const teamTrack = document.getElementById('team-track');
    const teamCards = document.querySelectorAll('.team-card');

    window.moveTeamCarousel = function (direction) {
        const cardWidth = teamCards[0].offsetWidth;
        const gap = parseFloat(getComputedStyle(teamTrack).gap) || 0;
        const maxIndex = teamCards.length - 1;
        currentTeamIndex += direction;
        if (currentTeamIndex < 0) currentTeamIndex = maxIndex;
        if (currentTeamIndex > maxIndex) currentTeamIndex = 0;
        teamTrack.style.transform = `translateX(-${currentTeamIndex * (cardWidth + gap)}px)`;
    };

    // 4. BOOKING — handled by Calendly inline widget (loaded via widget.js in <head>)

    // 5. LANGUAGE TOGGLE — handled in components.js (single source of truth)

    // 6. CHECKBOX VISUAL HANDLING
    const serviceCheckboxes = document.querySelectorAll('input[name="service"]');

    function updateCheckboxVisuals() {
        serviceCheckboxes.forEach(cb => {
            const label = cb.closest('.checkbox-label');
            if (cb.checked) {
                label.classList.add('selected');
            } else {
                label.classList.remove('selected');
            }
        });
    }

    serviceCheckboxes.forEach(cb => {
        cb.addEventListener('change', updateCheckboxVisuals);
    });

    // Initialize on load
    updateCheckboxVisuals();

    // 7. SMOOTH SCROLL TO SERVICES
    window.scrollToServices = function () {
        const servicesSection = document.getElementById('services');
        if (servicesSection) {
            servicesSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    };

    // 8. APPLE-STYLE SCROLL ANIMATIONS
    // Add fade-in animation class to sections
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all main sections
    const sections = document.querySelectorAll('.section-container, .service-bubble, .event-card, .carousel-card');
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
        observer.observe(section);
    });


});
