/**
 * lib/supabase.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Supabase client singleton.
 *
 * CRITICAL FIX — PKCE code verifier lost on OAuth redirect:
 *   Supabase JS v2.x defaults to sessionStorage for the PKCE code verifier in
 *   some environments. sessionStorage is cleared when the browser navigates away
 *   to Google and back, so by the time AuthCallback tries to exchange the code
 *   the verifier is gone → 400 "both auth code and code verifier should be
 *   non-empty".
 *
 *   Forcing `storage: window.localStorage` keeps the verifier alive across the
 *   full redirect round-trip.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Keep the PKCE code verifier in localStorage so it survives the
    // Google OAuth redirect (sessionStorage is wiped on navigation).
    storage: window.localStorage,
    storageKey: 'rfg-auth',          // namespaced key — avoids collisions
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,        // lets Supabase pick up #access_token or ?code=
    flowType: 'pkce',                // explicit — matches Supabase dashboard setting
  },
});