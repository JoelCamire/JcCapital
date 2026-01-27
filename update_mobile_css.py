import re

# Read the mobile CSS file
with open(r'c:\Users\Phili\OneDrive\Desktop\JC_Capital\style-mobile.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the booking section and update it
old_booking = r'/\* --- BOOKING & FORMS --- \*/\r?\n\.booking-panel \{[^}]+\}'

new_booking_mobile = '''/* --- BOOKING & FORMS --- */
/* Mobile: Stack form and calendar vertically */
.booking-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.booking-form-wrapper {
    padding: 1.5rem;
    background: var(--c-dark-blue);
    border: 1px solid var(--c-brown);
    border-radius: 15px;
}

/* Calendar Wrapper - Mobile */
.calendar-wrapper {
    padding: 1.5rem;
    background: var(--c-dark-blue);
    border: 1px solid var(--c-brown);
    border-radius: 15px;
}

.calendar-title {
    color: var(--c-gold);
    margin-bottom: 1rem;
    font-size: 1.3rem;
    text-align: center;
}

.calendar-iframe {
    width: 100%;
    min-height: 450px;
    border: none;
    border-radius: 8px;
}

.calendar-note {
    margin-top: 1rem;
    color: var(--c-light-beige);
    text-align: center;
    font-size: 0.85rem;
    opacity: 0.8;
}

/* Appointment Checkbox - Mobile */
.appointment-option {
    margin: 1.5rem 0;
    padding: 1rem;
    background: var(--c-black);
    border-radius: 8px;
    border: 1px solid var(--c-brown);
}

.appointment-checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 0.8rem;
    cursor: pointer;
    color: var(--c-light-beige);
    font-size: 0.95rem;
}

.appointment-checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    margin-top: 2px;
    flex-shrink: 0;
    accent-color: var(--c-gold);
}

.appointment-checkbox-label span {
    line-height: 1.5;
}'''

content = re.sub(old_booking, new_booking_mobile, content, flags=re.DOTALL)

# Write back
with open(r'c:\Users\Phili\OneDrive\Desktop\JC_Capital\style-mobile.css', 'w', encoding='utf-8') as f:
    f.write(content)

print("Mobile CSS updated successfully!")
