# JC Capital — Improvement List

## Critical (Fix First)

1. **Duplicate `toggleLanguage()` function**
   - Defined in both `js/components.js:79` and `js/main.js:184`
   - Second definition silently overwrites the first, causing unpredictable behavior

2. ~~**Hero image `wall.png` is 5.4 MB**~~ ✅ **Fixed** — converted to `wall.webp` (34 KB)
   - ~~Massively hurts load time, especially on mobile~~
   - ~~Compress or convert to WebP, target under 500 KB~~
   - ~~Consider responsive variants for different screen sizes~~

3. ~~**Missing ARIA labels**~~ ✅ **Fixed** — added `aria-label`, `role`, `tabindex`, `aria-expanded`, and `aria-haspopup` where needed
   - ~~Carousel buttons, hamburger menu, language toggle, and service bubbles have no accessible labels~~
   - ~~Keyboard and screen reader users cannot navigate properly~~
   - ~~Add descriptive `aria-label` attributes to all interactive elements~~

4. ~~**Form labels missing**~~ ✅ **Already fixed** — all inputs have semantic `<label>` tags with `for` attributes
   - ~~Placeholders used instead of semantic `<label>` tags (`index.html:331-341`)~~
   - ~~Screen readers cannot properly associate labels with inputs~~

---

## Important

5. **Booking flow order is reversed**
   - "Étape 1" (Google Calendar) appears visually *after* "Étape 2" (the form)
   - Reorder or relabel to match the intended user flow

6. **Lazy loading gaps**
   - Only `joel.jpg` has `loading="lazy"`
   - Add `loading="lazy"` to all remaining images

7. **Weak form validation**
   - No user-facing feedback before submission
   - Word count truncation is silent (`js/main.js:94`)
   - Add visible validation messages and warn users before truncation

8. **Inconsistent language system**
   - `components.js` reads `localStorage` for language preference, `main.js` does not
   - Can cause desyncs between components; unify the approach

---

## Nice to Have

9. **Orphaned `js/translations.js`**
   - File exists but is not referenced in `index.html`
   - Either integrate it or remove it to avoid confusion

10. **Monolithic `style.css`**
    - 1,130+ lines with no modular structure
    - Split into logical modules (layout, components, animations, mobile) for maintainability

11. **Missing SEO files and tags**
    - No `robots.txt` or `sitemap.xml`
    - Subpages missing canonical tags and Open Graph meta tags

12. **Google Fonts missing `display=swap`**
    - Causes flash of invisible text (FOIT) on slow connections
    - Append `&display=swap` to the Google Fonts URL
