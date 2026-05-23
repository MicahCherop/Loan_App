/**
 * AuthContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for authentication across the entire app.
 *
 * Flow:
 *  1. On mount, getSession() fires → syncProfile() upserts the profiles row.
 *  2. applySession() reads profile.status:
 *       'pending'  → sign out immediately, show approval wall (no page access)
 *       'blocked'  → sign out immediately, show blocked wall
 *       'verified' → grant access, expose user/profile/displayName/roleLabel
 *  3. onAuthStateChange() reacts to future sign-in / sign-out / token refresh.
 *  4. logout() signs out, clears localStorage (PKCE-safe), hard-navigates to /login.
 *
 * Exported:
 *   AuthProvider   – wrap your app tree
 *   useAuth()      – hook for any component
 *   logAudit()     – fire-and-forget audit helper
 *
 * FIXES applied vs previous versions:
 *  [F1] logout() no longer wipes PKCE code-verifier keys — only post-session keys.
 *  [F2] syncProfile() inserts a new profile row when none exists (was missing in v1).
 *  [F3] applySession() no longer signs the user out when profile is null (race guard).
 *  [F4] Bootstrap timeout added so the app never hangs on network failure.
 *  [F5] isAuthed gates on profile.status === 'verified', not just role membership.
 */

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

// ─── Pure helpers ─────────────────────────────────────────────────────────────
function normalizeEmail(email) {
  if (!email) return '';
  const lower = email.toLowerCase();
  const [local, domain] = lower.split('@');
  if (!local || !domain) return lower;
  // Strip Gmail + aliases: john+work@gmail.com → john@gmail.com
  return `${local.split('+')[0]}@${domain}`;
}

function resolveEmail(user) {
  return user?.email || user?.user_metadata?.email || '';
}

/**
 * resolveDisplayName
 * Priority: profiles.full_name → Google full_name → Google name → email prefix
 */
function resolveDisplayName(user, profile) {
  if (profile?.full_name)             return profile.full_name;
  if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
  if (user?.user_metadata?.name)      return user.user_metadata.name;
  const email = resolveEmail(user) || profile?.email || '';
  if (!email) return 'User';
  const prefix = email.split('@')[0];
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

// ─── Audit helper (fire-and-forget, non-fatal) ────────────────────────────────
export async function logAudit(supabaseClient, { action, entity, entityId, payload }) {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    await supabaseClient.from('audit_log').insert([{
      actor_id:  session?.user?.id ?? null,
      action,
      entity,
      entity_id: entityId ?? null,
      payload:   { ...payload, _ts: new Date().toISOString() },
    }]);
  } catch (err) {
    console.warn('Audit log error (non-fatal):', err.message);
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user,          setUser]          = useState(null);
  const [profile,       setProfile]       = useState(null);
  const [status,        setStatus]        = useState('loading'); // 'loading'|'ready'|'error'
  const [approvalState, setApprovalState] = useState(null);      // null|'pending'|'blocked'
  const [authError,     setAuthError]     = useState(null);

  // Guard: prevent concurrent syncProfile calls (StrictMode double-mount, etc.)
  const syncingRef = useRef(false);

  // ── syncProfile ─────────────────────────────────────────────────────────────
  // Fetches or creates the profile row for the given auth user.
  // Returns the final profile object, or null on unrecoverable failure.
  const syncProfile = useCallback(async (authUser) => {
    if (!authUser)          return null;
    if (syncingRef.current) return null;
    syncingRef.current = true;

    try {
      const email   = normalizeEmail(resolveEmail(authUser));
      const isDev   = email === DEV_EMAIL;
      const authName = authUser.user_metadata?.full_name
                    || authUser.user_metadata?.name
                    || null;

      // ── 1. Try to load existing row ────────────────────────────────────────
      const { data: existing, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      if (existing) {
        // ── 1a. Patch any stale fields ─────────────────────────────────────
        const patches = {};
        if (existing.email !== email)                patches.email     = email;
        if (authName && !existing.full_name)         patches.full_name = authName;
        if (isDev && existing.role !== 'developer')  patches.role      = 'developer';
        if (isDev && existing.status !== 'verified') patches.status    = 'verified';

        if (Object.keys(patches).length === 0) return existing;

        const { data: patched, error: patchErr } = await supabase
          .from('profiles')
          .update(patches)
          .eq('id', authUser.id)
          .select()
          .single();

        if (patchErr) {
          // Non-fatal: return optimistic merge so the user isn't locked out
          console.warn('Profile patch warning:', patchErr.message);
          return { ...existing, ...patches };
        }
        return patched;
      }

      // ── 2. No row found — insert a new one ────────────────────────────────
      // [F2] This block was completely absent in v1, causing "No profile found" errors.
      // New users land as 'pending' officers; the dev account is always 'verified'.
      const insertPayload = {
        id:     authUser.id,
        email,
        role:   isDev ? 'developer' : 'officer',
        status: isDev ? 'verified'  : 'pending',
        ...(authName ? { full_name: authName } : {}),
      };

      const { data: created, error: insertErr } = await supabase
        .from('profiles')
        .insert([insertPayload])
        .select()
        .single();

      if (insertErr) {
        // Race condition: another tab / DB trigger beat us — retry the read
        console.warn('Profile insert conflict, retrying read:', insertErr.message);
        const { data: retried } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
        return retried ?? null;
      }

      return created;
    } catch (err) {
      console.error('syncProfile hard error:', err);
      throw err;
    } finally {
      syncingRef.current = false;
    }
  }, []);

  // ── applySession ──────────────────────────────────────────────────────────
  // Core gate: called after every session event.
  const applySession = useCallback(async (session) => {
    if (!session) {
      setUser(null); setProfile(null); setApprovalState(null); setStatus('ready');
      return;
    }

    try {
      const profileData = await syncProfile(session.user);

      // [F3] v1 signed the user out here; v2 treats null as a transient race
      // condition and lets the user retry rather than killing their session.
      if (!profileData) {
        console.warn('syncProfile returned null for user:', session.user?.id);
        setUser(null); setProfile(null); setApprovalState(null); setStatus('ready');
        return;
      }

      // ── ZERO-TRUST GATE ───────────────────────────────────────────────────
      if (profileData.status === 'pending') {
        await supabase.auth.signOut();
        setApprovalState('pending');
        setUser(null); setProfile(null); setStatus('ready');
        return;
      }

      if (profileData.status === 'blocked') {
        await supabase.auth.signOut();
        setApprovalState('blocked');
        setUser(null); setProfile(null); setStatus('ready');
        return;
      }
      // ─────────────────────────────────────────────────────────────────────

      // 'verified' — full access granted
      setUser(session.user);
      setProfile(profileData);
      setApprovalState(null);
      setStatus('ready');
    } catch (err) {
      console.error('applySession error:', err);
      setAuthError(err.message || 'Failed to load your profile.');
      setUser(null); setProfile(null); setStatus('error');
    }
  }, [syncProfile]);

  // ── Bootstrap + auth event subscription ──────────────────────────────────
  useEffect(() => {
    let mounted = true;

    // [F4] Timeout guard — never hang forever if Supabase is unreachable
    const timeoutMs = 8000;
    const timeoutId = window.setTimeout(() => {
      if (!mounted) return;
      console.warn('Auth session bootstrap timed out.');
      setAuthError('Authentication timed out. Please refresh.');
      setStatus('ready');
    }, timeoutMs);

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        window.clearTimeout(timeoutId);
        if (!mounted) return;
        if (error) { setAuthError(error.message); setStatus('error'); return; }
        applySession(session);
      })
      .catch((err) => {
        window.clearTimeout(timeoutId);
        if (!mounted) return;
        console.error('Auth bootstrap error:', err);
        setAuthError(err?.message || 'Failed to initialise authentication.');
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

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Supabase signOut error:', err);
    } finally {
      // [F1] PKCE FIX: never wipe code-verifier or pkce keys — those are needed
      // during the OAuth redirect flow. Only clear post-session residue.
      try {
        Object.keys(localStorage).forEach(k => {
          const isAuthKey = k.startsWith('sb:auth') || k.startsWith('supabase.auth');
          const isPkceKey = k.includes('code-verifier') || k.includes('pkce');
          if (isAuthKey && !isPkceKey) {
            localStorage.removeItem(k);
          }
        });
      } catch { /* ignore storage access errors in sandboxed contexts */ }

      setUser(null); setProfile(null); setApprovalState(null);
      window.location.assign('/login');
    }
  }, []);

  // ── refreshProfile ────────────────────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    syncingRef.current = false; // allow re-run
    const p = await syncProfile(session.user);
    if (p) setProfile(p);
  }, [syncProfile]);

  // ── Derived values ────────────────────────────────────────────────────────
  const displayName = resolveDisplayName(user, profile);
  const roleLabel   = profile?.role ? (ROLE_LABELS[profile.role] ?? profile.role) : '…';
  const isDeveloper = profile?.role === 'developer'
                   || normalizeEmail(resolveEmail(user)) === DEV_EMAIL;
  const isAdmin     = profile?.role === 'admin';

  // [F5] isAuthed requires profile.status === 'verified' — role alone is not enough
  const isAuthed = status === 'ready'
                && !!user
                && !!profile
                && profile.status === 'verified';

  const value = {
    user,
    profile,
    status,
    approvalState,
    isAuthed,
    authError,
    displayName,
    roleLabel,
    isDeveloper,
    isAdmin,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}