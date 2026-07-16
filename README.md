# JC Capital - Website

Professional financial planning and tax optimization website for JC Capital.

## 🌐 Overview

A modern, responsive website built for JC Capital, offering financial and tax planning services for entrepreneurs and self-employed professionals in Quebec, Canada.

Recent additions include the **Sentinelle Investment Dashboard** and advanced financial calculators.

## 📁 Project Structure

```
JC_Capital/
├── index.html              # Main landing page
├── 404.html                # Error page
├── css/                    # Stylesheets
│   ├── style.css           # Desktop styles
│   └── style-mobile.css    # Mobile styles
├── js/                     # JavaScript logic
│   ├── main.js             # Core functionality
│   ├── translations.js     # Bilingual support (FR/EN)
│   └── components.js       # Dynamic component loader
├── components/             # Reusable UI parts
│   ├── header.html
│   └── footer.html
├── pages/                  # Site pages
│   ├── compound.html       # Compound Interest Calculator
│   ├── assurance.html      # Insurance services
│   ├── tax.html            # Tax planning
│   └── ... (other service pages)
├── Sentinelle/             # Project Sentinelle (Investment Dashboard)
│   ├── sentinelle-ui.jsx   # React/JSX UI components
│   └── Sentinelle_UI_Preview.html
└── img/                    # Images & Assets
```

## ✨ Features

- **Bilingual Support**: French (default) and English via `translations.js`.
- **Modular Architecture**: Header and Footer loaded dynamically.
- **Responsive Design**: Mobile-first approach with dedicated CSS.
- **Financial Tools**:
    - **Compound Interest Calculator**: Visual growth projections (`pages/compound.html`).
- **Project Sentinelle**: Specialized investment tracking dashboard (`Sentinelle/`).
- **Interactive Elements**:
    - EmailJS contact forms.
    - Google Calendar scheduling.
    - Team carousel.

## 🛠️ Technologies

- **Frontend**: HTML5, CSS3 (Glassmorphism), Vanilla JS
- **React**: Used in Sentinelle dashboard components.
- **Deployment**: Local serving via Python & Cloudflare Tunnel.

## 🚀 Running Locally

### 1. Start Local Server
Open a terminal in the project folder and run:
```bash
python3 -m http.server 8080
```
Access the site at: `http://localhost:8080`

### 2. Expose via Cloudflare Tunnel
To share the local version publicly:
```bash
cloudflared tunnel --url http://localhost:8080
```
*Note: This generates a temporary `.trycloudflare.com` URL.*

## 📞 Contact Information

- **Phone**: +1 (581) 398-6747
- **Email**: admin@jccapital.ca
- **Address**: 825 Blvd. Lebourgneuf, Suite 500, QC, CA

## 📜 Credentials

- AMF (Autorité des marchés financiers)

---

© 2026 JC Capital. All rights reserved.
