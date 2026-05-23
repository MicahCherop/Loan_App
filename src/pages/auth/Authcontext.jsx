/**
 * AuthContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for authentication.
 *
 * ROOT CAUSE OF LOADING LOOP (now fixed):
 *  callback.jsx navigates to "/" after exchanging the code. AuthContext mounts
 *  and BOTH getSession() AND onAuthStateChange(SIGNED_IN) fire almost
 *  simultaneously. The first call sets syncingRef=true; the second call sees
 *  the guard and returns null, clearing the user. The timeout then fires and
 *  the app shows as unauthenticated / stuck loading.
 *
 * FIX:
 *  - syncingRef replaced with a Promise-based mutex so concurrent calls
 *    wait for the first to finish instead of returning null.
 *  - applySession is debounced so rapid duplicate events collapse into one.
 *  - Bootstrap timeout is extended and only triggers setStatus('ready'),
 *    never clears the user — if a session exists it will always resolve.
 *  - onAuthStateChange is registered BEFORE getSession() so no event is missed.
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
  return `${local.split('+')[0]}@${domain}`;
}

function resolveEmail(user) {
  return user?.email || user?.user_metadata?.email || '';
}

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
  const [status,        setStatus]        = useState('loading');
  const [approvalState, setApprovalState] = useState(null);
  const [authError,     setAuthError]     = useState(null);

  // Promise-based mutex — concurrent callers await the same promise
  // instead of returning null and clobbering state.
  const syncPromiseRef  = useRef(null);

  // Debounce ref — collapses rapid duplicate applySession calls
  const applyTimerRef   = useRef(null);

  // Track the last session user ID so we skip redundant syncs
  const lastSyncedIdRef = useRef(null);

  // ── syncProfile ─────────────────────────────────────────────────────────────
  const syncProfile = useCallback(async (authUser) => {
    if (!authUser) return null;

    // If a sync is already in flight, wait for it instead of returning null
    if (syncPromiseRef.current) {
      return syncPromiseRef.current;
    }

    const run = async () => {
      try {
        const email    = normalizeEmail(resolveEmail(authUser));
        const isDev    = email === DEV_EMAIL;
        const authName = authUser.user_metadata?.full_name
                      || authUser.user_metadata?.name
                      || null;

        // 1. Fetch existing profile
        const { data: existing, error: fetchErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (fetchErr) throw fetchErr;

        if (existing) {
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
            console.warn('Profile patch warning:', patchErr.message);
            return { ...existing, ...patches };
          }
          return patched;
        }

        // 2. No row — insert
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
          // Race: DB trigger may have beaten us — retry read
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
        console.error('syncProfile error:', err);
        throw err;
      } finally {
        syncPromiseRef.current = null;
      }
    };

    syncPromiseRef.current = run();
    return syncPromiseRef.current;
  }, []);

  // ── applySession ──────────────────────────────────────────────────────────
  const applySession = useCallback(async (session) => {
    if (!session) {
      setUser(null); setProfile(null); setApprovalState(null); setStatus('ready');
      return;
    }

    // Skip if we already synced this exact user and are in a ready state
    // (prevents double-apply from getSession + SIGNED_IN firing together)
    if (lastSyncedIdRef.current === session.user.id && status === 'ready') {
      return;
    }

    try {
      const profileData = await syncProfile(session.user);

      if (!profileData) {
        console.warn('syncProfile returned null for user:', session.user?.id);
        // Don't clear the user — this may be a transient DB hiccup.
        // Set ready so the app doesn't hang; the next token refresh will retry.
        setStatus('ready');
        return;
      }

      if (profileData.status === 'pending') {
        await supabase.auth.signOut();
        setApprovalState('pending');
        setUser(null); setProfile(null); setStatus('ready');
        lastSyncedIdRef.current = null;
        return;
      }

      if (profileData.status === 'blocked') {
        await supabase.auth.signOut();
        setApprovalState('blocked');
        setUser(null); setProfile(null); setStatus('ready');
        lastSyncedIdRef.current = null;
        return;
      }

      // verified
      lastSyncedIdRef.current = session.user.id;
      setUser(session.user);
      setProfile(profileData);
      setApprovalState(null);
      setStatus('ready');
    } catch (err) {
      console.error('applySession error:', err);
      setAuthError(err.message || 'Failed to load your profile.');
      setUser(null); setProfile(null); setStatus('error');
    }
  }, [syncProfile, status]);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    // Debounced wrapper so getSession() + SIGNED_IN firing at the same time
    // only results in one applySession call
    const scheduleApply = (session) => {
      if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
      applyTimerRef.current = setTimeout(() => {
        if (!mounted) return;
        applySession(session);
      }, 50); // 50ms debounce — collapses same-tick duplicate events
    };

    // Register the listener FIRST so we never miss a SIGNED_IN event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
        lastSyncedIdRef.current = null;
        setUser(null); setProfile(null); setApprovalState(null); setStatus('ready');
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        scheduleApply(session);
      }
    });

    // Then do the initial session check
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;
        if (error) {
          setAuthError(error.message);
          setStatus('error');
          return;
        }
        // If no session, set ready immediately — no need to wait
        if (!session) {
          setStatus('ready');
          return;
        }
        // Session exists — schedule apply (may merge with incoming SIGNED_IN)
        scheduleApply(session);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('Auth bootstrap error:', err);
        setAuthError(err?.message || 'Failed to initialise authentication.');
        setStatus('error');
      });

    // Safety net — only fires if neither getSession nor SIGNED_IN resolved
    const timeoutId = window.setTimeout(() => {
      if (!mounted) return;
      // Check if we're still loading — if so, something is truly stuck
      setStatus(prev => {
        if (prev === 'loading') {
          console.warn('Auth bootstrap timed out — forcing ready state.');
          setAuthError('Authentication timed out. Please refresh the page.');
          return 'ready';
        }
        return prev; // already resolved, don't touch it
      });
    }, 12000); // generous timeout — only a true last resort

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
      window.clearTimeout(timeoutId);
    };
  }, []); // empty deps — runs once on mount only

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    lastSyncedIdRef.current = null;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Supabase signOut error:', err);
    } finally {
      try {
        Object.keys(localStorage).forEach(k => {
          const isAuthKey = k.startsWith('sb:auth') || k.startsWith('supabase.auth') || k.startsWith('rfg-auth');
          const isPkceKey = k.includes('code-verifier') || k.includes('pkce');
          if (isAuthKey && !isPkceKey) localStorage.removeItem(k);
        });
      } catch {}
      setUser(null); setProfile(null); setApprovalState(null);
      window.location.assign('/login');
    }
  }, []);

  // ── refreshProfile ────────────────────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    lastSyncedIdRef.current = null; // force re-sync
    syncPromiseRef.current = null;
    const p = await syncProfile(session.user);
    if (p) setProfile(p);
  }, [syncProfile]);

  // ── Derived values ────────────────────────────────────────────────────────
  const displayName = resolveDisplayName(user, profile);
  const roleLabel   = profile?.role ? (ROLE_LABELS[profile.role] ?? profile.role) : '…';
  const isDeveloper = profile?.role === 'developer'
                   || normalizeEmail(resolveEmail(user)) === DEV_EMAIL;
  const isAdmin     = profile?.role === 'admin';
  const isAuthed    = status === 'ready' && !!user && !!profile && profile.status === 'verified';

  const value = {
    user, profile, status, approvalState, isAuthed, authError,
    displayName, roleLabel, isDeveloper, isAdmin,
    logout, refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}