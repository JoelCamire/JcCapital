import re

# Read the HTML file
with open(r'c:\Users\Phili\OneDrive\Desktop\JC_Capital\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the submit button line to add appointment checkbox before it
old_button = r'(\s+)</div>\r?\n(\s+)<button type="submit" class="btn-submit" data-fr="Prendre" data-en="Submit">Envoyer</button>'
new_content = r'\1</div>\n\n\1<!-- OPTIONAL APPOINTMENT CHECKBOX -->\n\1<div class="appointment-option">\n\1  <label class="appointment-checkbox-label">\n\1    <input type="checkbox" id="appointmentCheckbox" name="wantsAppointment">\n\1    <span data-fr="Je souhaite prendre rendez-vous (optionnel - utilisez le calendrier ci-contre)" \n\1          data-en="I want to schedule an appointment (optional - use calendar on the right)">\n\1      Je souhaite prendre rendez-vous (optionnel - utilisez le calendrier ci-contre)\n\1    </span>\n\1  </label>\n\1</div>\n\n\2<button type="submit" class="btn-submit" data-fr="Envoyer" data-en="Submit">Envoyer</button>'

content = re.sub(old_button, new_content, content)

# Add calendar after closing form and div
old_close = r'(\s+)</form>\r?\n(\s+)</div>\r?\n(\s+)</section>'
new_close = r'\1</form>\n\2</div>\n\n\2<!-- RIGHT SIDE: GOOGLE CALENDAR -->\n\2<div class="calendar-wrapper glass-panel">\n\2  <h3 class="calendar-title" data-fr="Calendrier des disponibilités" data-en="Availability Calendar">Calendrier des disponibilités</h3>\n\2  <iframe src="https://calendar.app.google/DguEHRNLy6FEBDN67" \n\2          frameborder="0" \n\2          scrolling="yes"\n\2          class="calendar-iframe">\n\2  </iframe>\n\2  <p class="calendar-note" data-fr="📅 Sélectionnez un créneau dans le calendrier puis complétez le formulaire" \n\2                             data-en="📅 Select a time slot in the calendar then complete the form">\n\2    📅 Sélectionnez un créneau dans le calendrier puis complétez le formulaire\n\2  </p>\n\2</div>\n    </div>\n\3</section>'

content = re.sub(old_close, new_close, content)

# Write back
with open(r'c:\Users\Phili\OneDrive\Desktop\JC_Capital\index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("HTML updated successfully!")
