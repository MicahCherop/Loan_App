/**
 * AuthContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for authentication.
 *
 * ROOT CAUSES OF THE INFINITE LOADING BUG (all fixed here):
 *
 * BUG 1 — syncingRef boolean deadlock
 *   callback.jsx navigates to "/" after code exchange. React mounts the app
 *   and fires BOTH getSession() AND onAuthStateChange(SIGNED_IN) within the
 *   same tick. The first call sets syncingRef=true; the second sees the guard
 *   and returns null. applySession then clears the user and sets status='ready'
 *   with NO authenticated user, causing a redirect back to /login.
 *   FIX: Replace the boolean with a Promise-based mutex. Concurrent callers
 *   await the same promise instead of getting null.
 *
 * BUG 2 — applySession in useEffect deps causes infinite re-subscription
 *   applySession was a useCallback that depended on [syncProfile, status].
 *   Every time status changed, applySession got a new reference, causing the
 *   useEffect to unsubscribe and re-subscribe to onAuthStateChange, which
 *   fired SIGNED_IN again, looping indefinitely.
 *   FIX: Remove status from applySession deps. Use a ref to track the last
 *   synced user ID instead of reading state inside the callback.
 *
 * BUG 3 — getSession() races with onAuthStateChange(SIGNED_IN)
 *   Both fire nearly simultaneously after an OAuth redirect, resulting in two
 *   concurrent applySession calls.
 *   FIX: Debounce applySession calls with a 50ms timer so rapid duplicates
 *   collapse into a single execution.
 *
 * BUG 4 — Timeout cleared user state
 *   The safety-net timeout was setting status to 'error' or clearing the user
 *   even when the session resolved successfully but slowly (e.g. cold DB wake).
 *   FIX: Timeout only fires setStatus('ready') if still in 'loading' — it
 *   never clears the user or sets an error on its own.
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
  const [status,        setStatus]        = useState('loading');
  const [approvalState, setApprovalState] = useState(null);
  const [authError,     setAuthError]     = useState(null);

  // ── FIX 1: Promise-based mutex ────────────────────────────────────────────
  // If a syncProfile is already in flight, concurrent callers await the
  // same promise instead of getting null and clobbering state.
  const syncPromiseRef  = useRef(null);

  // ── FIX 3: Debounce ref ───────────────────────────────────────────────────
  // Collapses getSession() + SIGNED_IN firing in the same tick into one call.
  const applyTimerRef   = useRef(null);

  // ── FIX 2: Track last synced user to avoid redundant work ─────────────────
  // Using a ref (not state) so it doesn't trigger re-renders or callback deps.
  const lastSyncedIdRef = useRef(null);

  // ── syncProfile ─────────────────────────────────────────────────────────────
  const syncProfile = useCallback(async (authUser) => {
    if (!authUser) return null;

    // FIX 1: If a sync is already running, wait for it rather than bailing out
    if (syncPromiseRef.current) {
      try { return await syncPromiseRef.current; } catch { return null; }
    }

    const run = async () => {
      try {
        const email    = normalizeEmail(resolveEmail(authUser));
        const isDev    = email === DEV_EMAIL;
        const authName = authUser.user_metadata?.full_name
                      || authUser.user_metadata?.name
                      || null;

        // 1. Fetch existing profile row
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
            return { ...existing, ...patches }; // optimistic merge
          }
          return patched;
        }

        // 2. No row — insert a new one
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
          // Race: DB trigger or another tab beat us — retry read
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
        console.error('syncProfile error:', err.message);
        throw err;
      } finally {
        syncPromiseRef.current = null; // always release the mutex
      }
    };

    syncPromiseRef.current = run();
    return syncPromiseRef.current;
  }, []); // stable — no deps that change

  // ── applySession ──────────────────────────────────────────────────────────
  // FIX 2: Does NOT include `status` in its closure — uses lastSyncedIdRef
  // instead. This keeps the reference stable so the useEffect below never
  // re-subscribes due to a changed callback reference.
  const applySession = useCallback(async (session) => {
    if (!session) {
      setUser(null); setProfile(null); setApprovalState(null); setStatus('ready');
      lastSyncedIdRef.current = null;
      return;
    }

    // Skip redundant sync for the same verified user (e.g. TOKEN_REFRESHED
    // firing after we're already fully authenticated)
    if (lastSyncedIdRef.current === session.user.id) {
      setStatus('ready'); // ensure we're not stuck in loading
      return;
    }

    try {
      const profileData = await syncProfile(session.user);

      if (!profileData) {
        // Transient DB hiccup — don't clear the user, just unblock the UI.
        // The next TOKEN_REFRESHED event will retry.
        console.warn('syncProfile returned null — transient failure, not clearing user');
        setStatus('ready');
        return;
      }

      // ── Zero-trust gate ───────────────────────────────────────────────────
      if (profileData.status === 'pending') {
        await supabase.auth.signOut();
        lastSyncedIdRef.current = null;
        setApprovalState('pending');
        setUser(null); setProfile(null); setStatus('ready');
        return;
      }

      if (profileData.status === 'blocked') {
        await supabase.auth.signOut();
        lastSyncedIdRef.current = null;
        setApprovalState('blocked');
        setUser(null); setProfile(null); setStatus('ready');
        return;
      }
      // ─────────────────────────────────────────────────────────────────────

      // 'verified' — grant full access
      lastSyncedIdRef.current = session.user.id;
      setUser(session.user);
      setProfile(profileData);
      setApprovalState(null);
      setStatus('ready');
    } catch (err) {
      console.error('applySession error:', err.message);
      setAuthError(err.message || 'Failed to load your profile.');
      // Don't clear the user on network errors — let them retry
      setStatus('error');
    }
  }, [syncProfile]); // syncProfile is stable so this ref is also stable

  // ── Bootstrap — runs exactly once on mount ────────────────────────────────
  useEffect(() => {
    let mounted = true;

    // FIX 3: Debounced apply — collapses getSession() + SIGNED_IN race
    const scheduleApply = (session) => {
      if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
      applyTimerRef.current = setTimeout(() => {
        if (mounted) applySession(session);
      }, 50); // 50 ms window — enough to deduplicate same-tick events
    };

    // Register onAuthStateChange FIRST so no SIGNED_IN event is ever missed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
        lastSyncedIdRef.current = null;
        syncPromiseRef.current  = null;
        setUser(null); setProfile(null); setApprovalState(null); setStatus('ready');
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        scheduleApply(session);
      }
    });

    // THEN check for an existing session (page refresh / direct URL visit)
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;
        if (error) {
          setAuthError(error.message);
          setStatus('error');
          return;
        }
        if (!session) {
          setStatus('ready'); // unauthenticated — unblock UI immediately
          return;
        }
        scheduleApply(session);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('Auth bootstrap error:', err);
        setAuthError(err?.message || 'Failed to initialise authentication.');
        setStatus('error');
      });

    // FIX 4: Safety-net timeout — only unblocks the loading spinner.
    // Never clears the user or sets an error on its own.
    const timeoutId = window.setTimeout(() => {
      if (!mounted) return;
      setStatus(prev => {
        if (prev === 'loading') {
          console.warn('Auth bootstrap timed out — forcing ready state.');
          return 'ready'; // unblock the UI; session may still resolve via listener
        }
        return prev;
      });
    }, 12_000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
      window.clearTimeout(timeoutId);
    };
  }, []); // ← intentionally empty: runs ONCE on mount, never re-subscribes

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    lastSyncedIdRef.current = null;
    syncPromiseRef.current  = null;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Supabase signOut error:', err);
    } finally {
      try {
        Object.keys(localStorage).forEach(k => {
          if (
            k.startsWith('sb:auth') ||
            k.startsWith('supabase.auth') ||
            k.includes('-auth-token')
          ) {
            localStorage.removeItem(k);
          }
        });
      } catch { /* ignore storage errors */ }
      setUser(null); setProfile(null); setApprovalState(null);
      window.location.assign('/login');
    }
  }, []);

  // ── refreshProfile ────────────────────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    lastSyncedIdRef.current = null; // force re-sync
    syncPromiseRef.current  = null;
    const p = await syncProfile(session.user);
    if (p) setProfile(p);
  }, [syncProfile]);

  // ── Derived values ────────────────────────────────────────────────────────
  const displayName = resolveDisplayName(user, profile);
  const roleLabel   = profile?.role ? (ROLE_LABELS[profile.role] ?? profile.role) : '…';
  const isDeveloper = profile?.role === 'developer'
                   || normalizeEmail(resolveEmail(user)) === DEV_EMAIL;
  const isAdmin     = profile?.role === 'admin';
  const isAuthed    = status === 'ready'
                   && !!user
                   && !!profile
                   && profile.status === 'verified';

  const value = {
    user, profile, status, approvalState, isAuthed, authError,
    displayName, roleLabel, isDeveloper, isAdmin,
    logout, refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}