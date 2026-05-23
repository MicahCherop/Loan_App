import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";

export default function AuthCallback() {
  const navigate = useNavigate();
  // ✅ Guard against double-invocation in React StrictMode
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const redirectWithError = (msg) => {
      navigate("/login", { replace: true, state: { authError: msg } });
    };

    const handleCallback = async () => {
      // ─── Step 1: Surface any OAuth error params Supabase forwards ───────
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.startsWith("#")
        ? new URLSearchParams(window.location.hash.slice(1))
        : new URLSearchParams();

      const urlError = params.get("error") || hash.get("error");
      const errorCode = params.get("error_code") || hash.get("error_code");
      const errorDescription =
        params.get("error_description") || hash.get("error_description");

      if (urlError || errorDescription) {
        const message = decodeURIComponent(
          errorDescription || urlError || "Google sign-in failed."
        );
        redirectWithError(`${message}${errorCode ? ` (${errorCode})` : ""}`);
        return;
      }

      // ─── Step 2: Handle OAuth provider redirect URL ────────────────────────
      // Supabase v2 supports getSessionFromUrl for both code and hash flows.
      const hasProviderCallback =
        params.get("code") ||
        hash.get("access_token") ||
        hash.get("refresh_token");

      if (hasProviderCallback) {
        let response;
        if (typeof supabase.auth.getSessionFromUrl === 'function') {
          response = await supabase.auth.getSessionFromUrl({ storeSession: true });
        } else {
          response = await supabase.auth.exchangeCodeForSession(window.location.href);
        }

        if (response.error) {
          console.error("OAuth callback error:", response.error);
          redirectWithError(response.error.message || "Sign-in failed. Please try again.");
          return;
        }

        if (response.data?.session) {
          navigate("/", { replace: true });
          return;
        }
      }

      // ─── Step 3: Listen for the SIGNED_IN event (covers both PKCE and
      // implicit-token flows). Set a timeout so we never hang forever. ──────
      const timeout = setTimeout(() => {
        console.warn("AuthCallback: SIGNED_IN event timed out. Checking session manually.");
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            navigate("/", { replace: true });
          } else {
            redirectWithError("Sign-in timed out. Please try again.");
          }
        });
      }, 8000);

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (event === "SIGNED_IN" && session) {
            clearTimeout(timeout);
            subscription.unsubscribe();
            navigate("/", { replace: true });
          } else if (event === "SIGNED_OUT" || event === "USER_DELETED") {
            clearTimeout(timeout);
            subscription.unsubscribe();
            redirectWithError("Sign-in was cancelled or the account was removed.");
          }
        }
      );

      // ─── Step 4: Also check for an already-established session (handles
      // browser back/forward navigation to this route after login) ──────────
      const { data: { session: existingSession } } =
        await supabase.auth.getSession();

      if (existingSession) {
        clearTimeout(timeout);
        subscription.unsubscribe();
        navigate("/", { replace: true });
      }
    };

    handleCallback().catch((err) => {
      console.error("Unhandled AuthCallback error:", err);
      navigate("/login", { replace: true });
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