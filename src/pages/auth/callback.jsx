import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // Check for OAuth error parameters in the URL
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.startsWith('#')
        ? new URLSearchParams(window.location.hash.slice(1))
        : new URLSearchParams();

      const error = params.get('error') || hash.get('error');
      const errorCode = params.get('error_code') || hash.get('error_code');
      const errorDescription = params.get('error_description') || hash.get('error_description');

      if (error || errorDescription) {
        const message = decodeURIComponent(errorDescription || error || 'Google sign-in failed.');
        const fullMessage = `${message}${errorCode ? ` (${errorCode})` : ''}`;
        console.error('OAuth error:', fullMessage);
        navigate('/login', { 
          replace: true,
          state: { authError: fullMessage } 
        });
        return;
      }

      // Supabase with detectSessionInUrl: true automatically extracts session from URL
      // Just wait a moment for session to be detected, then navigate
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session check error:', sessionError);
        navigate('/login', { 
          replace: true,
          state: { authError: sessionError.message } 
        });
        return;
      }

      // If session exists, go to dashboard; otherwise go to login
      if (session) {
        navigate('/', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Completing sign in...</p>
      </div>
    </div>
  );
}
