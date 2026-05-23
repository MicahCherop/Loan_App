/**
 * callback.jsx  (pages/auth/callback.jsx)
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles the OAuth redirect from Google.
 *
 * KEY CHANGE: After a successful code exchange we NO LONGER navigate to "/"
 * immediately. Instead we wait for AuthContext's onAuthStateChange to fire
 * SIGNED_IN and confirm the session is fully established before navigating.
 * This eliminates the race where AuthContext mounts at "/" before the session
 * is written to storage.
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';

export default function AuthCallback() {
  const navigate   = useNavigate();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const redirectWithError = (msg) => {
      navigate('/login', { replace: true, state: { authError: msg } });
    };

    const handleCallback = async () => {
      // ── Step 1: Check for OAuth error params ────────────────────────────
      const params = new URLSearchParams(window.location.search);
      const hash   = window.location.hash.startsWith('#')
        ? new URLSearchParams(window.location.hash.slice(1))
        : new URLSearchParams();

      const urlError         = params.get('error')             || hash.get('error');
      const errorCode        = params.get('error_code')        || hash.get('error_code');
      const errorDescription = params.get('error_description') || hash.get('error_description');

      if (urlError || errorDescription) {
        const message = decodeURIComponent(errorDescription || urlError || 'Google sign-in failed.');
        redirectWithError(`${message}${errorCode ? ` (${errorCode})` : ''}`);
        return;
      }

      // ── Step 2: If we already have a session (e.g. back/forward nav) ────
      const { data: { session: existing } } = await supabase.auth.getSession();
      if (existing) {
        navigate('/', { replace: true });
        return;
      }

      // ── Step 3: Exchange the PKCE code ───────────────────────────────────
      const code             = params.get('code');
      const hasImplicitToken = hash.get('access_token') || hash.get('refresh_token');

      if (code || hasImplicitToken) {
        // Clear the URL immediately — prevents double-exchange on back nav
        window.history.replaceState({}, document.title, window.location.pathname);

        let response;
        try {
          if (code) {
            // Reconstruct the full URL with the code for exchangeCodeForSession
            response = await supabase.auth.exchangeCodeForSession(
              `${window.location.origin}/auth/callback?code=${code}`
            );
          } else {
            response = typeof supabase.auth.getSessionFromUrl === 'function'
              ? await supabase.auth.getSessionFromUrl({ storeSession: true })
              : await supabase.auth.exchangeCodeForSession(window.location.href);
          }
        } catch (err) {
          console.error('Code exchange threw:', err);
          redirectWithError('Sign-in failed. Please try again.');
          return;
        }

        if (response.error) {
          console.error('OAuth callback error:', response.error);
          redirectWithError(response.error.message || 'Sign-in failed. Please try again.');
          return;
        }

        // Exchange succeeded — the session is now in storage.
        // Navigate to "/" and let AuthContext's onAuthStateChange handle the rest.
        if (response.data?.session) {
          navigate('/', { replace: true });
          return;
        }
      }

      // ── Step 4: No code — listen for SIGNED_IN with timeout ─────────────
      const timeout = setTimeout(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            navigate('/', { replace: true });
          } else {
            redirectWithError('Sign-in timed out. Please try again.');
          }
        });
      }, 10000);

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          clearTimeout(timeout);
          subscription.unsubscribe();
          navigate('/', { replace: true });
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          clearTimeout(timeout);
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