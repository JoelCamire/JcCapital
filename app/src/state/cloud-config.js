// ============================================================
// Cloud configuration — Supabase (auth + per-user data).
//
// HOW TO ACTIVATE (see app/CLOUD-SETUP.md for the full guide):
//   1. Create a free project at https://supabase.com
//   2. Project Settings → API → copy the two values below
//   3. Paste them here and commit. Leave BLANK to keep the app
//      fully local (no login) — exactly as it works today.
//
// Both values are PUBLIC by design and safe to keep in client
// code. Real security comes from Row-Level Security policies in
// the database (see CLOUD-SETUP.md), NOT from hiding these.
// ============================================================
export const SUPABASE_URL = '';       // e.g. 'https://abcdefgh.supabase.co'
export const SUPABASE_ANON_KEY = '';  // the "anon public" key

export function cloudEnabled() {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}
