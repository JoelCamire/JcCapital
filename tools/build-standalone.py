#!/usr/bin/env python3
"""
Assemble l'outil privé autonome JC-Capital-Rentabilite-PRIVE.html
à partir de pages/rentabilite.html + js/rentabilite-engine.js + Chart.js.
Usage : python3 tools/build-standalone.py [dossier_sortie]
Prérequis : `npm install chart.js` exécuté (node_modules/chart.js présent
dans le répertoire courant ou dans tools/).
"""
import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = sys.argv[1] if len(sys.argv) > 1 else ROOT

page = open(os.path.join(ROOT, 'pages/rentabilite.html'), encoding='utf-8').read()
engine = open(os.path.join(ROOT, 'js/rentabilite-engine.js'), encoding='utf-8').read()

chart_path = None
for cand in ['node_modules/chart.js/dist/chart.umd.js', 'tools/node_modules/chart.js/dist/chart.umd.js']:
    p = os.path.join(ROOT, cand)
    if os.path.exists(p):
        chart_path = p
        break
if not chart_path:
    sys.exit("Chart.js introuvable : exécutez `npm install chart.js` à la racine du dépôt.")
chartjs = open(chart_path, encoding='utf-8').read()

style = page.split('<style>', 1)[1].split('</style>', 1)[0].replace('padding-top: 120px;', 'padding-top: 24px;')
main = '<main' + page.split('<main', 1)[1].split('</main>', 1)[0] + '</main>'
disc = page.split('<!-- Avertissement de conformité -->', 1)[1].split('<div id="footer-placeholder">', 1)[0]
ui = page.rsplit('<script>', 1)[1].rsplit('</script>', 1)[0]
assert 'DOSSIERS CLIENTS' in ui, 'extraction du script UI échouée'

base_css = '''
:root {
    --c-black: #0A0908; --c-dark-blue: #22333B; --c-light-beige: #EAE0D5;
    --c-gold: #C6AC8F; --c-brown: #5E503F;
    --font-main: 'Outfit', 'Segoe UI', system-ui, sans-serif;
    color-scheme: dark;
}
* { box-sizing: border-box; }
body {
    font-family: var(--font-main);
    background-color: var(--c-black) !important;
    background-image: repeating-linear-gradient(135deg, transparent 0px, transparent 2px, rgba(34,51,59,0.1) 3px, transparent 6px);
    color: var(--c-light-beige); margin: 0;
}
h1, h2, h3, h4 { font-family: var(--font-main); text-wrap: balance; }
.app-banner {
    position: sticky; top: 0; z-index: 50;
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    padding: 0.7rem 1.4rem;
    background: rgba(34, 51, 59, 0.92); backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--c-gold);
    font-size: 0.85rem; letter-spacing: 0.08em; text-transform: uppercase;
}
.app-banner strong { color: var(--c-gold); font-weight: 600; }
.lang-toggle {
    background: transparent; color: var(--c-gold);
    border: 1px solid var(--c-gold); border-radius: 6px;
    padding: 0.35rem 0.9rem; font-family: inherit; font-size: 0.85rem;
    font-weight: 600; cursor: pointer; letter-spacing: 0.05em;
}
.lang-toggle:hover, .lang-toggle:focus-visible { background: var(--c-gold); color: var(--c-dark-blue); outline: none; }
.section-container { padding: 1rem 1.4rem 2.5rem; }
@media print { .app-banner { display: none !important; } }
'''

toggle_js = '''
document.documentElement.lang = 'fr';
function toggleLanguage() {
    const html = document.documentElement;
    const next = html.lang === 'fr' ? 'en' : 'fr';
    html.lang = next;
    document.querySelector('.lang-toggle').textContent = next === 'fr' ? 'EN' : 'FR';
    document.querySelectorAll('[data-fr][data-en]').forEach(function (el) {
        const txt = el.getAttribute(next === 'en' ? 'data-en' : 'data-fr');
        if (txt) el.innerHTML = txt;
    });
    document.dispatchEvent(new Event('languageChanged'));
}
'''

banner = '''
<div class="app-banner no-print">
    <strong data-fr="JC CAPITAL — Calculatrice de rentabilité (outil privé)" data-en="JC CAPITAL — Profitability calculator (private tool)">JC CAPITAL — Calculatrice de rentabilité (outil privé)</strong>
    <button class="lang-toggle" onclick="toggleLanguage()">EN</button>
</div>
'''

out = ('<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
       '<meta name="robots" content="noindex, nofollow">\n'
       "<title>JC Capital — Calculatrice de Rentabilité (privé)</title>\n"
       '<style>' + base_css + style + '</style>\n</head>\n<body>\n'
       + banner + '\n' + main
       + '\n\n<!-- Avertissement de conformité -->' + disc
       + '\n<script>\n' + chartjs + '\n</script>\n'
       + '<script>\n' + engine + '\n</script>\n'
       + '<script>' + toggle_js + '</script>\n'
       + '<script>\n' + ui + '\n</script>\n</body>\n</html>\n')

dest = os.path.join(OUT_DIR, 'JC-Capital-Rentabilite-PRIVE.html')
open(dest, 'w', encoding='utf-8').write(out)
print('OK ->', dest, '(', len(out), 'caractères )')
