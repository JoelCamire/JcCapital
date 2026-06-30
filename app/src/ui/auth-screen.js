// ============================================================
// Login / sign-up screen — shown before the app when cloud mode
// is enabled and no user is signed in. Calls onAuthed() on success.
// ============================================================
import { h, icon, clear, t } from './dom.js';
import { getLang, setLang } from '../i18n.js';
import * as cloud from '../state/cloud.js';

export function showAuthScreen(onAuthed) {
  const app = document.getElementById('app');
  let mode = 'signin'; // 'signin' | 'signup' | 'reset'

  function paint() {
    clear(app);
    const lang = getLang();
    const email = h('input', { type: 'email', autocomplete: 'username', placeholder: 'vous@exemple.com', style: inp });
    const pass = h('input', { type: 'password', autocomplete: mode === 'signup' ? 'new-password' : 'current-password', placeholder: '••••••••', style: inp });
    const msg = h('div', { style: { minHeight: '18px', fontSize: '12.5px', marginTop: '2px' } });
    const btn = h('button', { class: 'btn primary', style: { width: '100%', justifyContent: 'center', marginTop: '6px' } },
      mode === 'signin' ? t('Se connecter', 'Sign in') : mode === 'signup' ? t('Créer le compte', 'Create account') : t('Envoyer le lien', 'Send link'));

    const setMsg = (text, kind) => { msg.textContent = text; msg.style.color = kind === 'ok' ? 'var(--pos)' : 'var(--neg)'; };
    let busy = false;
    async function submit() {
      if (busy) return;
      const e = email.value.trim(), p = pass.value;
      if (!e) return setMsg(t('Entrez votre courriel.', 'Enter your email.'));
      if (mode !== 'reset' && !p) return setMsg(t('Entrez votre mot de passe.', 'Enter your password.'));
      busy = true; btn.disabled = true; setMsg(t('Un instant…', 'One moment…'), 'ok');
      try {
        if (mode === 'reset') {
          await cloud.resetPassword(e);
          setMsg(t('Courriel de réinitialisation envoyé ✓', 'Reset email sent ✓'), 'ok');
        } else if (mode === 'signup') {
          const r = await cloud.signUp(e, p);
          if (r && r.session) { onAuthed(); return; }
          setMsg(t('Compte créé. Vérifiez votre courriel pour confirmer, puis connectez-vous.', 'Account created. Check your email to confirm, then sign in.'), 'ok');
          mode = 'signin';
        } else {
          await cloud.signIn(e, p);
          onAuthed(); return;
        }
      } catch (err) {
        setMsg(cloud.authErrorMessage(err, lang));
      } finally { busy = false; btn.disabled = false; }
    }
    btn.onclick = submit;
    pass.onkeydown = (ev) => { if (ev.key === 'Enter') submit(); };
    email.onkeydown = (ev) => { if (ev.key === 'Enter') (mode === 'reset' ? submit() : pass.focus()); };

    const link = (label, to) => h('a', { href: '#', style: { color: 'var(--c-gold)', fontSize: '12.5px', textDecoration: 'none' }, onClick: (ev) => { ev.preventDefault(); mode = to; paint(); } }, label);

    const footer = mode === 'signin'
      ? h('div', { class: 'flex between', style: { marginTop: '14px' } }, link(t('Créer un compte', 'Create account'), 'signup'), link(t('Mot de passe oublié ?', 'Forgot password?'), 'reset'))
      : h('div', { style: { marginTop: '14px', textAlign: 'center' } }, link(t('← Retour à la connexion', '← Back to sign in'), 'signin'));

    const card = h('div', { style: cardStyle },
      h('div', { style: { textAlign: 'center', marginBottom: '18px' } },
        h('div', { style: brand }, 'JC'),
        h('div', { style: { fontFamily: 'var(--font-display, serif)', fontSize: '20px', fontWeight: '700', marginTop: '10px' } }, 'JC Planner'),
        h('div', { style: { color: 'var(--text-2,#888)', fontSize: '13px', marginTop: '2px' } },
          mode === 'signup' ? t('Créer votre accès sécurisé', 'Create your secure access')
            : mode === 'reset' ? t('Réinitialiser le mot de passe', 'Reset your password')
            : t('Accès privé — connexion requise', 'Private access — sign in required'))),
      h('label', { style: lbl }, t('Courriel', 'Email')), email,
      mode !== 'reset' ? h('label', { style: lbl }, t('Mot de passe', 'Password')) : null,
      mode !== 'reset' ? pass : null,
      msg, btn, footer,
      h('div', { style: { marginTop: '18px', textAlign: 'center' } },
        h('button', { style: langBtn, onClick: () => { setLang(getLang() === 'fr' ? 'en' : 'fr'); paint(); } }, getLang() === 'fr' ? 'English' : 'Français')),
    );

    app.appendChild(h('div', { style: wrap }, card,
      h('div', { style: { marginTop: '14px', fontSize: '11px', color: 'var(--text-2,#999)', textAlign: 'center', maxWidth: '360px' } },
        t('Données chiffrées en transit et isolées par utilisateur.', 'Data encrypted in transit and isolated per user.'))));
    setTimeout(() => email.focus(), 50);
  }
  paint();
}

const wrap = { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg, #0e1116)' };
const cardStyle = { width: '100%', maxWidth: '360px', background: 'var(--surface, #fff)', border: '1px solid var(--border, #2a2f3a)', borderRadius: '16px', padding: '28px', boxShadow: '0 12px 40px rgba(0,0,0,.25)' };
const inp = { width: '100%', padding: '11px 12px', borderRadius: '10px', border: '1px solid var(--border, #2a2f3a)', background: 'var(--surface-2, #f6f6f6)', color: 'var(--text, #111)', fontSize: '14px', marginBottom: '4px', boxSizing: 'border-box' };
const lbl = { display: 'block', fontSize: '12px', fontWeight: '600', margin: '8px 0 4px', color: 'var(--text-2, #666)' };
const brand = { width: '46px', height: '46px', margin: '0 auto', borderRadius: '12px', background: 'var(--c-gold, #c2922f)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '18px', letterSpacing: '.02em' };
const langBtn = { border: 'none', background: 'transparent', color: 'var(--text-2, #888)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' };
