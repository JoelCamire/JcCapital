// ============================================================
// Internationalisation — bilingue FR / EN
// Approche co-localisée : t('texte fr', 'english text').
// La langue est conservée en localStorage et déclenche un re-rendu.
// ============================================================
const KEY = 'jc_planner_lang';
let LANG = localStorage.getItem(KEY) || 'fr';
const listeners = new Set();

export function getLang() { return LANG; }
export function setLang(l) {
  LANG = (l === 'en') ? 'en' : 'fr';
  localStorage.setItem(KEY, LANG);
  document.documentElement.lang = LANG;
  listeners.forEach(fn => fn(LANG));
}
export function onLangChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Translate: returns FR or EN string depending on current language. */
export function t(fr, en) { return LANG === 'en' ? (en ?? fr) : fr; }

/** Locale used by number/currency/date formatters. */
export function locale() { return LANG === 'en' ? 'en-CA' : 'fr-CA'; }

document.documentElement.lang = LANG;
