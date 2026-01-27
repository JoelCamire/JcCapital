// JC Capital - Core Logic

document.addEventListener('DOMContentLoaded', () => {
    // 1. HAMBURGER MENU LOGIC
    const hamburger = document.querySelector('.hamburger-menu');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }

    // Close mobile menu when a navigation link is clicked
    window.closeMenu = function () {
        if (hamburger && navLinks) {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        }
    };

    // 2. SERVICE BUBBLE EXPANSION
    window.toggleService = function (element) {
        // Close other service bubbles
        document.querySelectorAll('.service-bubble').forEach(el => {
            if (el !== element) el.classList.remove('active');
        });
        // Toggle the selected bubble
        element.classList.toggle('active');
    };

    // 3. TEAM CAROUSEL LOGIC
    let currentTeamIndex = 0;
    const teamTrack = document.getElementById('team-track');
    const teamCards = document.querySelectorAll('.team-card');

    window.moveTeamCarousel = function (direction) {
        const cardWidth = teamCards[0].offsetWidth;
        const maxIndex = teamCards.length - 1;
        currentTeamIndex += direction;
        if (currentTeamIndex < 0) currentTeamIndex = maxIndex;
        if (currentTeamIndex > maxIndex) currentTeamIndex = 0;
        teamTrack.style.transform = `translateX(-${currentTeamIndex * cardWidth}px)`;
    };

    // 4. BOOKING FORM LOGIC
    const descriptionInput = document.getElementById('clientNeed');
    const wordCountDisplay = document.getElementById('wordCount');
    const suggestionBox = document.getElementById('suggestionBox');
    const suggestedServiceText = document.getElementById('suggestedService');
    const confirmServiceBtn = document.getElementById('confirmServiceBtn');


    // Word count and keyword suggestions
    descriptionInput.addEventListener('input', function () {
        const text = this.value.trim();
        const words = text.split(/\s+/).filter(word => word.length > 0);
        const count = words.length;
        wordCountDisplay.textContent = count;
        if (count > 50) {
            wordCountDisplay.style.color = 'red';
            this.value = words.slice(0, 50).join(' ');
        } else {
            wordCountDisplay.style.color = 'inherit';
        }
        // Simple keyword based suggestions
        const lower = text.toLowerCase();
        if (lower.includes('assurance') || lower.includes('protection') || lower.includes('vie')) {
            showSuggestion('Protection (Assurance)', 'assurance');
        } else if (lower.includes('impot') || lower.includes('fisc')) {
            showSuggestion('Optimisation fiscale', 'fiscalite');
        } else {
            suggestionBox.classList.add('hidden');
        }
    });

    function showSuggestion(name, value) {
        suggestedServiceText.textContent = name;
        suggestionBox.classList.remove('hidden');
        confirmServiceBtn.onclick = () => {
            const checkbox = document.querySelector(`input[name="service"][value="${value}"]`);
            if (checkbox) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change'));
                checkbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            suggestionBox.classList.add('hidden');
        };
    }

    // Form submission with optional appointment
    document.getElementById('bookingForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const selectedServices = Array.from(document.querySelectorAll('input[name="service"]:checked'))
            .map(cb => cb.nextElementSibling.textContent.trim());

        const wantsAppointment = document.getElementById('appointmentCheckbox').checked;

        // Collect all form data
        const formData = {
            name: document.getElementById('clientName').value,
            phone: document.getElementById('clientPhone').value,
            email: document.getElementById('clientEmail').value,
            services: selectedServices,
            message: document.getElementById('clientNeed').value,
            wantsAppointment: wantsAppointment,
            timestamp: new Date().toLocaleString('fr-FR')
        };

        // Log data for debugging (will be replaced with email backend)
        console.log('Form Data Ready for Email:', formData);

        // Show success message
        let message = 'Demande envoyée avec succès!\n\n';
        message += `Nom: ${formData.name}\n`;
        message += `Email: ${formData.email}\n`;
        message += `Téléphone: ${formData.phone}\n`;
        if (selectedServices.length > 0) {
            message += `Services: ${selectedServices.join(', ')}\n`;
        }
        if (wantsAppointment) {
            message += '\n✅ Rendez-vous demandé - Veuillez sélectionner un créneau dans notre calendrier Google.\n';
        } else {
            message += '\nℹ️ Simple demande d\'information (pas de rendez-vous).\n';
        }
        message += '\n(Note: L\'intégration email sera ajoutée prochainement)';

        alert(message);
        this.reset();
        wordCountDisplay.textContent = '0';
        suggestionBox.classList.add('hidden');
    });

    // 5. LANGUAGE TOGGLE - COMPLETE TRANSLATION SYSTEM
    let currentLang = 'fr';
    window.toggleLanguage = function () {
        const btn = document.querySelector('.lang-toggle');
        const html = document.documentElement;

        // Toggle language
        if (currentLang === 'fr') {
            currentLang = 'en';
            btn.textContent = 'EN';
            html.lang = 'en';
        } else {
            currentLang = 'fr';
            btn.textContent = 'FR';
            html.lang = 'fr';
        }

        // Update ALL elements with data-fr and data-en attributes
        const elementsToTranslate = document.querySelectorAll('[data-fr][data-en]');
        elementsToTranslate.forEach(element => {
            const translation = currentLang === 'fr' ? element.getAttribute('data-fr') : element.getAttribute('data-en');
            if (translation) {
                element.textContent = translation;
            }
        });

        // Update option elements separately (they need specific handling)
        const optionElements = document.querySelectorAll('option[data-fr][data-en]');
        optionElements.forEach(option => {
            const translation = currentLang === 'fr' ? option.getAttribute('data-fr') : option.getAttribute('data-en');
            if (translation) {
                option.textContent = translation;
            }
        });
    };

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
