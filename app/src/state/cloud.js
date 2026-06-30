// ============================================================
// Supabase cloud layer — email/password auth + per-user state.
// Loaded lazily, ONLY when cloud-config.js has credentials, so
// the offline/local build never touches the network.
//
// Each user's whole dataset is stored as one JSON blob in the
// `app_state` table, isolated by Row-Level Security (a user can
// only read/write their own row). That gives every employee a
// completely separate copy with their own login.
// ============================================================
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './cloud-config.js';

const TABLE = 'app_state';
let _client = null;

async function getClient() {
  if (_client) return _client;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'jc_supabase_auth' },
  });
  return _client;
}

// ---- Auth ----
export async function currentSession() {
  const c = await getClient();
  const { data } = await c.auth.getSession();
  return data.session || null;
}
export async function currentUser() {
  const s = await currentSession();
  return s ? s.user : null;
}
export async function signIn(email, password) {
  const c = await getClient();
  const { data, error } = await c.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data;
}
export async function signUp(email, password) {
  const c = await getClient();
  const { data, error } = await c.auth.signUp({ email: email.trim(), password });
  if (error) throw error;
  return data;
}
export async function resetPassword(email) {
  const c = await getClient();
  const { error } = await c.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.href });
  if (error) throw error;
}
export async function signOut() {
  const c = await getClient();
  await c.auth.signOut();
}
export async function onAuthChange(cb) {
  const c = await getClient();
  return c.auth.onAuthStateChange((_event, session) => cb(session));
}

// ---- Per-user state blob ----
/** Returns the stored dataset object for the signed-in user, or null. */
export async function pullState() {
  const c = await getClient();
  const { data, error } = await c.from(TABLE).select('data').maybeSingle();
  if (error) throw error;
  return data ? data.data : null;
}
/** Upsert the dataset object for the signed-in user. */
export async function pushState(obj) {
  const c = await getClient();
  const u = await currentUser();
  if (!u) throw new Error('not-authenticated');
  const { error } = await c.from(TABLE).upsert(
    { user_id: u.id, data: obj, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}

/** Human-readable message for a Supabase auth error. */
export function authErrorMessage(err, lang) {
  const m = (err && err.message || '').toLowerCase();
  const fr = lang !== 'en';
  if (m.includes('invalid login')) return fr ? 'Courriel ou mot de passe invalide.' : 'Invalid email or password.';
  if (m.includes('already registered') || m.includes('already been registered')) return fr ? 'Ce courriel a déjà un compte. Connectez-vous.' : 'This email already has an account. Sign in.';
  if (m.includes('password should be at least')) return fr ? 'Le mot de passe doit comporter au moins 6 caractères.' : 'Password must be at least 6 characters.';
  if (m.includes('email not confirmed')) return fr ? 'Confirmez d’abord votre courriel (vérifiez votre boîte de réception).' : 'Confirm your email first (check your inbox).';
  if (m.includes('rate limit') || m.includes('too many')) return fr ? 'Trop de tentatives. Réessayez dans quelques minutes.' : 'Too many attempts. Try again in a few minutes.';
  return (err && err.message) || (fr ? 'Une erreur est survenue.' : 'Something went wrong.');
}
