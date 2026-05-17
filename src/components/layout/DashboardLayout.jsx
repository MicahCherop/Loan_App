import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  UserPlus, 
  Bell, 
  LogOut, 
  LayoutDashboard,
  ClipboardList,
  ShieldCheck,
  Menu,
  X,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { motion, AnimatePresence } from 'motion/react';
import { useIdleTimeout } from '../../hooks/useIdleTimeout.js';

export default function DashboardLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState(null);

  // Global idle timeout (10 mins)
  useIdleTimeout();

  const syncProfile = useCallback(async (userData) => {
    try {
      setSyncError(null);
      const email = userData.email?.toLowerCase();
      const isDeveloper = email === 'mic1dev.me@gmail.com';
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.id)
        .single();

      if (data) {
        setProfile(data);
        return data;
      } else if (error && error.code === 'PGRST116') {
        // Profile doesn't exist; check authorization
        const { data: preAuth, error: preAuthError } = await supabase
          .from('pre_authorized_emails')
          .select('role')
          .eq('email', email)
          .maybeSingle();

        if (preAuthError && preAuthError.code !== 'PGRST116') {
          throw preAuthError;
        }

        const role = isDeveloper ? 'developer' : preAuth?.role;

        if (!role) {
          console.warn(`User ${email} is not pre-authorized.`);
          await supabase.auth.signOut();
          navigate('/login', { replace: true });
          throw new Error(`${email} is not authorized for Wekulo Credit. Contact your administrator.`);
        }

        // Create profile with proper role
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([{ id: userData.id, email, role }])
          .select()
          .single();

        if (insertError) {
          console.error('Profile insert error:', insertError);
          
          // Check if it's an authorization/RLS error
          if (insertError.code === 'PGRST001') {
            // RLS policy denied insert - user not properly authorized
            await supabase.auth.signOut();
            navigate('/login', { replace: true });
            throw new Error(`User not allowed. ${email} is not authorized to access Wekulo Credit. Please contact your administrator.`);
          }
          
          // Retry reading in case it was race condition
          const { data: retryData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userData.id)
            .single();
          if (retryData) {
            setProfile(retryData);
            return retryData;
          } else {
            throw new Error(`Failed to create user profile: ${insertError.message}`);
          }
        } else if (newProfile) {
          setProfile(newProfile);
          return newProfile;
        }
      } else if (error) {
        throw error;
      }
    } catch (err) {
      console.error('Profile sync error:', err);
      setSyncError(err.message || 'Failed to sync user profile. Data may not be visible.');
      setUser(null);
      setProfile(null);
      // Don't sign out here; let the auth listener handle it
      return null;
    }
  }, [navigate]);

  useEffect(() => {
    let mounted = true;
    let timeoutId;

    timeoutId = window.setTimeout(() => {
      if (mounted) {
        console.warn('DashboardLayout: Auth check timed out. Forcing UI render.');
        setIsLoading(false);
      }
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      try {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          // Only navigate if not already on login page
          if (mounted && location.pathname !== '/login') {
            navigate('/login', { replace: true });
          }
        } else if (session) {
          setUser(session.user);
          try {
            const activeProfile = await syncProfile(session.user);
            if (!activeProfile) {
              setUser(null);
              setIsLoading(false);
              if (syncError) {
                navigate('/login', { 
                  replace: true,
                  state: { authError: syncError }
                });
              }
              return;
            }
            setIsLoading(false);
          } catch (profileErr) {
            console.error('Profile sync failed:', profileErr);
            setUser(null);
            setIsLoading(false);
            navigate('/login', { 
              replace: true,
              state: { authError: profileErr.message || 'Failed to verify user authorization.' }
            });
            return;
          }
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname, syncProfile]);

  const clearAuthStorage = () => {
    try {
      Object.keys(window.localStorage).forEach((key) => {
        if (key.startsWith('sb:auth') || key.startsWith('supabase.auth')) {
          window.localStorage.removeItem(key);
        }
      });
    } catch (err) {
      console.error('Failed to clear auth storage:', err);
    }
  };

  const handleLogout = async () => {
    try {
      setUser(null);
      setProfile(null);
      setIsMobileMenuOpen(false);
      clearAuthStorage();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Navigate after clearing state
      navigate('/login', { replace: true });
    }
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Leads', path: '/leads', icon: UserPlus },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Active Loans', path: '/active-loans', icon: ClipboardList },
    { name: 'Loan Requests', path: '/requests', icon: Bell },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
  ];

  // Add Admin if developer/admin
  const isDeveloper = user?.email === 'mic1dev.me@gmail.com';
  if (isDeveloper || profile?.role === 'developer' || profile?.role === 'admin') {
    menuItems.push({ name: 'Admin', path: '/admin', icon: ShieldCheck });
  }

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200">
        <div className="p-6 border-b border-slate-100">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-semibold">
              W
            </div>
            <span className="font-semibold text-lg text-slate-800">Wekulo Credit</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <div className="px-4 py-2 text-xs font-medium text-slate-400 mb-1">Navigation</div>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                location.pathname === item.path
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <item.icon size={18} className={location.pathname === item.path ? 'text-blue-500' : 'text-slate-300'} />
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3 px-2 py-1 mb-4">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-sm">
              <Users size={18} className="text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{user?.email?.split('@')[0] || 'Officer'}</p>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{profile?.role || 'Officer'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors group"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed top-0 left-0 bottom-0 w-64 bg-white z-50 lg:hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-semibold">W</div>
                  <span className="font-semibold text-lg text-slate-800">Wekulo</span>
                </Link>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      location.pathname === item.path ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon size={18} />
                    {item.name}
                  </Link>
                ))}
              </nav>
              <div className="p-4 border-t border-slate-100">
                 <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 text-rose-600 font-semibold text-sm"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 lg:hidden text-slate-500 hover:bg-slate-50 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-slate-700 truncate">
              {menuItems.find(item => item.path === location.pathname)?.name || 'Credit Portal'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end text-right text-slate-600">
              <span className="font-medium text-slate-800">{user?.email?.split('@')[0] || 'Officer'}</span>
              <span className="text-[11px] uppercase tracking-[0.3em] text-slate-400">{profile?.role || 'Officer'}</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/requests')}
              className="relative p-2 text-slate-300 hover:text-slate-500 rounded-lg hover:bg-slate-50 transition-colors"
              aria-label="Open loan requests"
            >
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-400 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            {syncError && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 text-sm animate-in slide-in-from-top duration-300">
                <AlertCircle size={20} className="text-amber-500 shrink-0" />
                <p className="flex-1">
                  <strong>Sync Warning:</strong> {syncError} This may affect data visibility. Try refreshing the page.
                </p>
                <button onClick={() => window.location.reload()} className="px-3 py-1 bg-amber-100 hover:bg-amber-200 rounded-lg font-bold transition-colors">
                  Retry
                </button>
              </div>
            )}
            
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              {children}
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}
