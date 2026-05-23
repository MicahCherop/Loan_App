import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DEV_EMAIL = 'mic1dev.me@gmail.com';

const ROLE_LABELS = {
  developer: 'Developer',
  admin:     'Admin',
  officer:   'Officer',
  manager:   'Manager',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeEmail(email) {
  if (!email) return '';
  const lower = email.toLowerCase();
  const [local, domain] = lower.split('@');
  if (!local || !domain) return lower;
  return `${local.split('+')[0]}@${domain}`;
}

function resolveEmail(user) {
  return user?.email || user?.user_metadata?.email || '';
}

// Priority: DB full_name → Google full_name → Google name → email prefix
function resolveDisplayName(user, profile) {
  if (profile?.full_name)             return profile.full_name;
  if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
  if (user?.user_metadata?.name)      return user.user_metadata.name;
  const email = resolveEmail(user) || profile?.email || '';
  if (!email) return 'User';
  const prefix = email.split('@')[0];
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

// ─── Audit helper ─────────────────────────────────────────────────────────────
export async function logAudit(supabase, { action, entity, entityId, payload }) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('audit_log').insert([{
      actor_id:  session?.user?.id ?? null,
      action,
      entity,
      entity_id: entityId ?? null,
      payload:   { ...payload, _ts: new Date().toISOString() },
    }]);
  } catch (err) {
    console.warn('Audit log error (non-fatal):', err);
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user,          setUser]          = useState(null);
  const [profile,       setProfile]       = useState(null);
  const [status,        setStatus]        = useState('loading');
  const [approvalState, setApprovalState] = useState(null);
  const [authError,     setAuthError]     = useState(null);

  const syncingRef = useRef(false);

  const syncProfile = useCallback(async (authUser) => {
    if (!authUser) return null;
    if (syncingRef.current) return null;
    syncingRef.current = true;

    try {
      const email = normalizeEmail(resolveEmail(authUser));
      const isDev = email === DEV_EMAIL;

      const { data: existing, error: fetchErr } = await supabase
        .from('profiles')
        .select('id, email, role, created_at')
        .eq('id', authUser.id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      if (existing) {
        const patches = {};
        if (existing.email !== email)               patches.email = email;
        if (isDev && existing.role !== 'developer') patches.role  = 'developer';

        if (Object.keys(patches).length > 0) {
          const { data: patched, error: patchErr } = await supabase
            .from('profiles')
            .update(patches)
            .eq('id', authUser.id)
            .select('id, email, role, created_at')
            .single();

          if (patchErr) {
            console.warn('Profile patch warning:', patchErr);
            return { ...existing, ...patches };
          }
          return patched;
        }
        return existing;
      }

      // The Supabase auth trigger should create the profile automatically.
      const { data: retried, error: retryErr } = await supabase
        .from('profiles')
        .select('id, email, role, created_at')
        .eq('id', authUser.id)
        .maybeSingle();

      if (retryErr) throw retryErr;
      if (retried) return retried;

      if (email) {
        const { data: emailMatch, error: emailErr } = await supabase
          .from('profiles')
          .select('id, email, role, created_at')
          .eq('email', email)
          .maybeSingle();

        if (emailErr) throw emailErr;
        if (emailMatch) {
          console.warn('syncProfile fallback: matched profile by email for user', authUser.id, 'profile id', emailMatch.id);

          if (emailMatch.id !== authUser.id) {
            const { data: updated, error: updateErr } = await supabase
              .from('profiles')
              .update({ id: authUser.id })
              .eq('email', email)
              .select('id, email, role, created_at')
              .single();

            if (updateErr) {
              console.warn('Failed to re-link profile by email to current auth UID:', updateErr.message);
              return emailMatch;
            }
            return updated;
          }

          return emailMatch;
        }
      }

      return null;
    } catch (err) {
      console.error('syncProfile error:', err);
      throw err;
    } finally {
      syncingRef.current = false;
    }
  }, []);

  const applySession = useCallback(async (session) => {
    if (!session) {
      setUser(null); setProfile(null); setApprovalState(null); setStatus('ready');
      return;
    }
    try {
      const profileData = await syncProfile(session.user);

      if (!profileData) {
        console.warn('No profile found for user:', session.user?.id);
        await supabase.auth.signOut();
        setAuthError('Your account is not authorized. Please contact an administrator.');
        setUser(null); setProfile(null); setApprovalState(null); setStatus('ready');
        return;
      }

      if (!['developer', 'admin', 'officer'].includes(profileData.role)) {
        console.warn('User profile has invalid role:', profileData.role);
        await supabase.auth.signOut();
        setAuthError('Your account role is not authorized. Please contact an administrator.');
        setUser(null); setProfile(null); setApprovalState(null); setStatus('ready');
        return;
      }

      setUser(session.user);
      setProfile(profileData);
      setApprovalState(null);
      setStatus('ready');
    } catch (err) {
      console.error('applySession error:', err);
      setAuthError(err.message || 'Failed to load profile.');
      setUser(null); setProfile(null); setStatus('error');
    }
  }, [syncProfile]);

  useEffect(() => {
    let mounted = true;
    const timeoutMs = 7000;
    const timeoutId = window.setTimeout(() => {
      if (!mounted) return;
      console.warn('Auth session bootstrap timed out. Falling back to ready state.');
      setAuthError('Authentication initialization timed out.');
      setStatus('ready');
    }, timeoutMs);

    const clearBootstrapTimeout = () => { window.clearTimeout(timeoutId); };

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        clearBootstrapTimeout();
        if (!mounted) return;
        if (error) {
          setAuthError(error.message);
          setStatus('error');
          return;
        }
        applySession(session);
      })
      .catch((err) => {
        clearBootstrapTimeout();
        if (!mounted) return;
        console.error('Auth session bootstrap error:', err);
        setAuthError(err?.message || 'Failed to initialize authentication.');
        setStatus('error');
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setUser(null); setProfile(null); setApprovalState(null); setStatus('ready');
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        await applySession(session);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [applySession]);

  const logout = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch (err) { console.error('Logout error:', err); }
    finally {
      try {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('sb:auth') || k.startsWith('supabase.auth')) localStorage.removeItem(k);
        });
      } catch {}
      setUser(null); setProfile(null); setApprovalState(null);
      window.location.assign('/login');
    }
  }, []);

  const displayName = resolveDisplayName(user, profile);
  const roleLabel   = profile?.role ? (ROLE_LABELS[profile.role] ?? profile.role) : '…';
  const isDeveloper = profile?.role === 'developer' || normalizeEmail(resolveEmail(user)) === DEV_EMAIL;
  const isAdmin     = profile?.role === 'admin';
  const isAuthed    = status === 'ready' && !!user && !!profile && ['developer', 'admin', 'officer'].includes(profile.role);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    syncingRef.current = false;
    const p = await syncProfile(session.user);
    if (p) setProfile(p);
  }, [syncProfile]);

  const value = {
    user, profile, status, approvalState, isAuthed, authError,
    displayName, roleLabel, isDeveloper, isAdmin,
    logout, refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
