/**
 * callback.jsx  (pages/auth/callback.jsx)
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles the OAuth redirect from Google after the user approves sign-in.
 *
 * KEY DESIGN DECISIONS:
 *
 * 1. We exchange the PKCE code HERE and nowhere else.
 *    Login.jsx must never call exchangeCodeForSession — doing so on both pages
 *    causes a 400 "code already used" error that silently kills the session.
 *
 * 2. After exchange we navigate to "/" and let AuthContext's onAuthStateChange
 *    handler do the profile sync. We do NOT call syncProfile or setUser here.
 *    This avoids the race where AuthContext mounts at "/" before its own
 *    SIGNED_IN event has fired.
 *
 * 3. We clear the ?code= from the URL immediately before calling
 *    exchangeCodeForSession. This prevents a double-exchange if the user
 *    hits back/forward while the spinner is showing.
 *
 * 4. A 10-second timeout ensures the page never hangs forever — it falls
 *    back to checking getSession() directly.
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';

export default function AuthCallback() {
  const navigate    = useNavigate();
  // StrictMode guard — prevents double-execution in development
  const handledRef  = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const redirectWithError = (msg) => {
      navigate('/login', { replace: true, state: { authError: msg } });
    };

    const handleCallback = async () => {

      // ── Step 1: Check for OAuth error params in the URL ─────────────────
      const params = new URLSearchParams(window.location.search);
      const hash   = window.location.hash.startsWith('#')
        ? new URLSearchParams(window.location.hash.slice(1))
        : new URLSearchParams();

      const urlError    = params.get('error')             || hash.get('error');
      const errorCode   = params.get('error_code')        || hash.get('error_code');
      const errorDesc   = params.get('error_description') || hash.get('error_description');

      if (urlError || errorDesc) {
        const message = decodeURIComponent(errorDesc || urlError || 'Google sign-in failed.');
        redirectWithError(`${message}${errorCode ? ` (${errorCode})` : ''}`);
        return;
      }

      // ── Step 2: Already have a session? (back/forward nav, refresh) ─────
      const { data: { session: existing } } = await supabase.auth.getSession();
      if (existing) {
        navigate('/', { replace: true });
        return;
      }

      // ── Step 3: Exchange the PKCE code ───────────────────────────────────
      const code             = params.get('code');
      const hasImplicitToken = hash.get('access_token') || hash.get('refresh_token');

      if (code || hasImplicitToken) {
        // Clear the URL BEFORE exchange so a back-nav can't re-use the code
        const exchangeUrl = code
          ? `${window.location.origin}/auth/callback?code=${code}`
          : window.location.href;

        window.history.replaceState({}, document.title, window.location.pathname);

        let response;
        try {
          response = await supabase.auth.exchangeCodeForSession(exchangeUrl);
        } catch (err) {
          console.error('exchangeCodeForSession threw:', err);
          redirectWithError('Sign-in failed. Please try again.');
          return;
        }

        if (response.error) {
          console.error('OAuth callback error:', response.error);
          redirectWithError(response.error.message || 'Sign-in failed. Please try again.');
          return;
        }

        if (response.data?.session) {
          // Session written to storage. Navigate to "/" — AuthContext's
          // onAuthStateChange(SIGNED_IN) will handle profile sync.
          navigate('/', { replace: true });
          return;
        }

        // exchangeCodeForSession returned no error but also no session.
        // Fall through to the listener below.
      }

      // ── Step 4: No code in URL — wait for SIGNED_IN from Supabase ───────
      // This covers the implicit flow where Supabase sets the session via
      // the URL hash and fires SIGNED_IN before we can read getSession().
      const timeoutId = window.setTimeout(async () => {
        // Last resort: check manually
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate('/', { replace: true });
        } else {
          redirectWithError('Sign-in timed out. Please try again.');
        }
        subscription.unsubscribe();
      }, 10_000);

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          clearTimeout(timeoutId);
          subscription.unsubscribe();
          navigate('/', { replace: true });
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          clearTimeout(timeoutId);
          subscription.unsubscribe();
          redirectWithError('Sign-in was cancelled.');
        }
      });
    };

    handleCallback().catch((err) => {
      console.error('Unhandled AuthCallback error:', err);
      navigate('/login', { replace: true });
    });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Completing sign in…</p>
        <p className="text-slate-400 text-xs mt-1">This usually takes a moment</p>
      </div>
    </div>
  );
}