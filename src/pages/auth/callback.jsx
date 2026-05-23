/**
 * AuthCallback.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles the OAuth redirect from Google / Supabase.
 *
 * FIXES applied:
 *  [F1] exchangeCodeForSession called ONCE — never duplicated across steps.
 *  [F2] URL is cleared after code extraction to prevent re-exchange on back nav.
 *  [F3] Fallback listener timeout reduced and cleaned up properly.
 *  [F4] StrictMode double-invocation guarded with handledRef.
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';

export default function AuthCallback() {
  const navigate = useNavigate();
  // [F4] Guard against double-invocation in React StrictMode
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const redirectWithError = (msg) => {
      navigate('/login', { replace: true, state: { authError: msg } });
    };

    const handleCallback = async () => {
      // ── Step 1: Surface any OAuth error params Supabase forwards ───────────
      const params = new URLSearchParams(window.location.search);
      const hash   = window.location.hash.startsWith('#')
        ? new URLSearchParams(window.location.hash.slice(1))
        : new URLSearchParams();

      const urlError          = params.get('error')             || hash.get('error');
      const errorCode         = params.get('error_code')        || hash.get('error_code');
      const errorDescription  = params.get('error_description') || hash.get('error_description');

      if (urlError || errorDescription) {
        const message = decodeURIComponent(errorDescription || urlError || 'Google sign-in failed.');
        redirectWithError(`${message}${errorCode ? ` (${errorCode})` : ''}`);
        return;
      }

      // ── Step 2: Exchange the OAuth code for a session (PKCE flow) ──────────
      // [F1] We extract the code ONCE here and immediately clean the URL so that
      // a back-navigation to this route cannot trigger a second exchange attempt
      // (which would fail with "code already used").
      const code = params.get('code');
      const hasImplicitToken = hash.get('access_token') || hash.get('refresh_token');

      if (code || hasImplicitToken) {
        // [F2] Clear the URL before doing async work to prevent re-exchange
        window.history.replaceState({}, document.title, window.location.pathname);

        let response;
        try {
          if (code) {
            // PKCE flow — exchange auth code for session
            response = await supabase.auth.exchangeCodeForSession(
              `${window.location.origin}${window.location.pathname}?code=${code}`
            );
          } else {
            // Implicit flow — Supabase reads from the hash automatically
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

        if (response.data?.session) {
          navigate('/', { replace: true });
          return;
        }
      }

      // ── Step 3: No code in URL — check for an already-established session ──
      // Covers browser back/forward navigation to this route after login.
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession) {
        navigate('/', { replace: true });
        return;
      }

      // ── Step 4: Wait for SIGNED_IN event with a hard timeout ───────────────
      // [F3] Covers edge cases where Supabase fires the event asynchronously.
      const timeout = setTimeout(() => {
        console.warn('AuthCallback: SIGNED_IN event timed out — checking session manually.');
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            navigate('/', { replace: true });
          } else {
            redirectWithError('Sign-in timed out. Please try again.');
          }
        });
      }, 8000);

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          clearTimeout(timeout);
          subscription.unsubscribe();
          navigate('/', { replace: true });
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          clearTimeout(timeout);
          subscription.unsubscribe();
          redirectWithError('Sign-in was cancelled or the account was removed.');
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