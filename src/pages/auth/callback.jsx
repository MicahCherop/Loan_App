import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogin = async () => {
      const { data, error } = await supabase.auth.getSessionFromUrl();

      if (error) {
        console.error('OAuth callback error:', error);
        navigate('/login', { state: { authError: error.message } });
        return;
      }

      if (data?.session) {
        navigate('/');
      } else {
        navigate('/login');
      }
    };

    handleLogin();
  }, [navigate]);

  return <div>Completing sign in...</div>;
}
