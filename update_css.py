import re

# Read the CSS file
with open(r'c:\Users\Phili\OneDrive\Desktop\JC_Capital\style.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace .booking-panel with new booking container styles
old_booking_panel = r'/\* --- BOOKING & FORMS --- \*/\r?\n\.booking-panel \{[^}]+\}'

new_booking_styles = '''/* --- BOOKING & FORMS --- */
/* Booking Container - Side by Side Layout */
.booking-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    max-width: 1400px;
    margin: 0 auto;
}

.booking-form-wrapper {
    padding: 3rem;
    background: var(--c-dark-blue);
    border: 1px solid var(--c-brown);
    border-radius: 15px;
}

/* Calendar Wrapper */
.calendar-wrapper {
    padding: 2rem;
    background: var(--c-dark-blue);
    border: 1px solid var(--c-brown);
    border-radius: 15px;
    display: flex;
    flex-direction: column;
}

.calendar-title {
    color: var(--c-gold);
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
    text-align: center;
}

.calendar-iframe {
    width: 100%;
    min-height: 600px;
    border: none;
    border-radius: 8px;
    flex-grow: 1;
}

.calendar-note {
    margin-top: 1rem;
    color: var(--c-light-beige);
    text-align: center;
    font-size: 0.95rem;
    opacity: 0.8;
}

/* Appointment Checkbox Option */
.appointment-option {
    margin: 2rem 0;
    padding: 1.5rem;
    background: var(--c-black);
    border-radius: 8px;
    border: 1px solid var(--c-brown);
}

.appointment-checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    cursor: pointer;
    color: var(--c-light-beige);
}

.appointment-checkbox-label input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    margin-top: 2px;
    flex-shrink: 0;
    accent-color: var(--c-gold);
}

.appointment-checkbox-label span {
    line-height: 1.5;
}

/* Responsive Layout - Stack on smaller screens */
@media (max-width: 1024px) {
    .booking-container {
        grid-template-columns: 1fr;
    }
    
    .calendar-iframe {
        min-height: 500px;
    }
}'''

content = re.sub(old_booking_panel, new_booking_styles, content, flags=re.DOTALL)

# Write back
with open(r'c:\Users\Phili\OneDrive\Desktop\JC_Capital\style.css', 'w', encoding='utf-8') as f:
    f.write(content)

print("CSS updated successfully!")
