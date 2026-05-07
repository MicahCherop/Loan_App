import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.authError) {
      setError(location.state.authError);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    let authSubscription = null;
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          navigate('/', { replace: true });
        } else if (event === 'INITIAL_SESSION') {
          setLoading(false);
        }
      });
      authSubscription = subscription;
    } catch (err) {
      console.error('Auth change listener error:', err);
    }

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/', { replace: true });
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const redirectTo = `${window.location.origin}/login`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      }
    });

    if (error) {
      if (error.message.includes('provider is not enabled')) {
        setError('Google Auth is not enabled in your Supabase Dashboard. Please enable it in Authentication > Providers > Google.');
      } else {
        setError(error.message);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      {/* Abstract background elements */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-100/30 rounded-full blur-3xl -mr-96 -mt-96"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-slate-200/50 rounded-full blur-3xl -ml-72 -mb-72"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "circOut" }}
        className="w-full max-w-xl bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden relative z-10 p-12 sm:p-20 group"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[100%] transition-all group-hover:bg-blue-50/50"></div>
        
        <div className="relative z-10">
          <div className="flex justify-center mb-12">
            <div className="w-20 h-20 bg-slate-800 border-8 border-white shadow-2xl rounded-[2rem] flex items-center justify-center text-white text-4xl font-semibold rotate-6 group-hover:rotate-0 transition-all duration-500">
              W
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Wekulo Credit</h2>
          <p className="text-slate-400 text-center text-sm mb-12">Authorized Personnel Only</p>

          {error && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="mb-8 p-5 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-4"
            >
              <AlertCircle className="text-rose-500 shrink-0" size={20} />
              <p className="text-rose-700 text-sm font-medium leading-tight">{error}</p>
            </motion.div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-16 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center gap-4 hover:bg-slate-50 transition-all active:scale-[0.98] shadow-sm group/btn"
            >
              <svg className="w-6 h-6 transition-transform group-hover/btn:scale-110" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span className="font-bold text-slate-700">Continue with Google</span>
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                <span className="bg-white px-4 text-slate-300">Internal Access</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-1">
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-blue-200 focus:bg-white transition-all text-xs font-medium text-slate-800 placeholder:text-slate-300"
                    placeholder="Email Address"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-blue-200 focus:bg-white transition-all text-xs font-medium text-slate-800 placeholder:text-slate-300"
                    placeholder="Password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-800 text-white py-4 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg active:scale-95"
              >
                {loading ? (
                  <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <LogIn size={14} />
                    Sign In
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-12 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Forgot access? <span className="text-blue-500 cursor-pointer hover:underline">Contact Administrator</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
