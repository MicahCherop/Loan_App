import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase.js';
import { Shield, Trash2, User as UserIcon, RefreshCw } from 'lucide-react';

const DEV_EMAIL = 'mic1dev.me@gmail.com';

export default function Admin() {
  const [profiles, setProfiles] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [message, setMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // ✅ FIX 1: Keep timer ref so we can clear it on unmount — prevents
  // "setState on unmounted component" warnings and potential memory leaks.
  const notifTimerRef = useRef(null);

  const showNotification = useCallback((msg, isError = false) => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);

    if (isError) {
      setErrorMessage(msg);
      setMessage(null);
    } else {
      setMessage(msg);
      setErrorMessage(null);
    }

    notifTimerRef.current = setTimeout(() => {
      setMessage(null);
      setErrorMessage(null);
    }, 5000);
  }, []);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    };
  }, []);

  const fetchData = useCallback(async () => {
    setPageLoading(true);
    setErrorMessage(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = session?.user;
      if (!user) {
        setPageLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      setCurrentProfile(profile);

      const isDev =
        user.email === DEV_EMAIL ||
        profile?.role === 'developer';
      const isAdmin = profile?.role === 'admin';

      if (isDev || isAdmin) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (profilesError) {
          console.error('Profiles fetch error:', profilesError);
          setErrorMessage('Failed to load user profiles.');
        }

        setProfiles(profilesData || []);
      }
    } catch (err) {
      console.error('Fetch data error:', err);
      setErrorMessage('An error occurred while loading admin data.');
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateRole = async (userId, newRole) => {
    const { error } = await supabase.rpc('set_user_role', {
      target_user_id: userId,
      target_role: newRole,
    });

    if (error) {
      showNotification(error.message, true);
    } else {
      showNotification('Role updated successfully.');
      fetchData();
    }
  };

  const deleteProfile = async (id) => {
    const profile = profiles.find((item) => item.id === id);
    if (
      !window.confirm(
        `Revoke access for ${profile?.email || 'this user'}? They will be logged out and unable to access the system.`
      )
    ) return;

    const { error } = await supabase.rpc('revoke_user_access', {
      target_user_id: id,
    });

    if (error) {
      showNotification(error.message, true);
    } else {
      showNotification(`${profile?.email || 'User'} access has been revoked.`);
      fetchData();
    }
  };

  // ✅ FIX 2: Helper to derive a readable display name from a profile row.
  // Falls back gracefully from full_name → email prefix → 'Unknown'.
  const getDisplayName = (profile) => {
    if (profile?.full_name) return profile.full_name;
    if (profile?.email) {
      const prefix = profile.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return 'Unknown';
  };

  const isDeveloper =
    currentProfile?.email === DEV_EMAIL ||
    currentProfile?.role === 'developer';
  const isAdmin = currentProfile?.role === 'admin';

  // ✅ FIX 3: Show a neutral loading skeleton instead of flashing the
  // access-denied screen while currentProfile is still being fetched.
  if (pageLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 gap-3">
        <div className="w-8 h-8 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-sm">Loading admin panel…</span>
      </div>
    );
  }

  if (!isDeveloper && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <Shield size={64} className="mb-4 opacity-20" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p>You do not have administrative privileges.</p>
      </div>
    );
  }

  // ✅ FIX 4: Role options scoped by current user's permission level.
  // Developers can assign any role (including developer). Admins cannot
  // assign the developer role to prevent privilege escalation.
  const roleOptions = isDeveloper
    ? ['developer', 'admin', 'officer']
    : ['admin', 'officer'];

  const roleMeta = {
    developer: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
    admin:     { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    officer:   { bg: 'bg-blue-50 text-blue-700 border-blue-100' },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage platform users. New users auto-create profiles on first Google sign-in.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Notifications */}
      {message && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {errorMessage}
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <UserIcon className="text-blue-600" size={20} />
          <h3 className="font-bold text-slate-800">Platform Users</h3>
          <span className="ml-auto text-xs text-slate-400 font-medium">{profiles.length} user{profiles.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
              <tr>
                {/* ✅ FIX 5: Added Name column for better user identification */}
                <th className="px-8 py-4">Name</th>
                <th className="px-8 py-4">Email</th>
                <th className="px-8 py-4">Role</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-10 text-center text-slate-300 text-sm italic">
                    No users yet
                  </td>
                </tr>
              ) : (
                profiles.map((item) => {
                  const isSelf = item.id === currentProfile?.id;
                  const canEdit =
                    !isSelf &&
                    (isDeveloper || (isAdmin && item.role !== 'developer'));
                  const badge = roleMeta[item.role] ?? roleMeta.officer;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">
                            {getDisplayName(item).charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800 text-sm">
                            {getDisplayName(item)}
                            {isSelf && (
                              <span className="ml-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">(you)</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-sm text-slate-500">{item.email}</td>
                      <td className="px-8 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${badge.bg}`}>
                          {item.role?.toUpperCase() ?? 'OFFICER'}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        {canEdit ? (
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={item.role}
                              onChange={(e) => updateRole(item.id, e.target.value)}
                              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                            >
                              {roleOptions.map((r) => (
                                <option key={r} value={r}>
                                  {r.charAt(0).toUpperCase() + r.slice(1)}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => deleteProfile(item.id)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                              title="Revoke Access"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic">
                            {isSelf ? 'Your account' : 'Protected'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}