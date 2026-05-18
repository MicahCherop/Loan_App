import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase.js';
import { Shield, Trash2, User as UserIcon, RefreshCw, UserPlus, X, AlertCircle, CheckCircle } from 'lucide-react';

const DEV_EMAIL = 'mic1dev.me@gmail.com';

function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${isError ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
      {isError ? <AlertCircle size={16} className="shrink-0 mt-0.5" /> : <CheckCircle size={16} className="shrink-0 mt-0.5" />}
      {toast.message}
    </div>
  );
}

export default function Admin() {
  const [profiles,       setProfiles]       = useState([]);
  const [pageLoading,    setPageLoading]    = useState(true);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [toast,          setToast]          = useState(null);
  const [showAddUser,    setShowAddUser]    = useState(false);
  const [newUser,        setNewUser]        = useState({ email: '', role: 'officer', full_name: '' });
  const [addingUser,     setAddingUser]     = useState(false);

  const timerRef = useRef(null);

  const showNotification = useCallback((message, type = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type });
    timerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const fetchData = useCallback(async () => {
    setPageLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = session?.user;
      if (!user) { setPageLoading(false); return; }

      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      if (profileError) throw profileError;

      setCurrentProfile(profile);

      const isDev   = user.email === DEV_EMAIL || profile?.role === 'developer';
      const isAdmin = profile?.role === 'admin';

      if (isDev || isAdmin) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles').select('*').order('created_at', { ascending: false });

        if (profilesError) showNotification('Failed to load user profiles.', 'error');
        setProfiles(profilesData || []);
      }
    } catch (err) {
      console.error('Admin fetch error:', err);
      showNotification('An error occurred while loading admin data.', 'error');
    } finally {
      setPageLoading(false);
    }
  }, [showNotification]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateRole = async (userId, newRole) => {
    const { error } = await supabase.rpc('set_user_role', { target_user_id: userId, target_role: newRole });
    if (error) showNotification(error.message, 'error');
    else { showNotification('Role updated successfully.'); fetchData(); }
  };

  const deleteProfile = async (id) => {
    const profile = profiles.find(item => item.id === id);
    if (!window.confirm(`Revoke access for ${profile?.email || 'this user'}? They will be logged out and unable to access the system.`)) return;
    const { error } = await supabase.rpc('revoke_user_access', { target_user_id: id });
    if (error) showNotification(error.message, 'error');
    else { showNotification(`${profile?.email || 'User'} access has been revoked.`); fetchData(); }
  };

  // ── Add User ──────────────────────────────────────────────────────────────
  // Creates a profile row for an email that may not have signed in yet.
  // When they sign in with Google, DashboardLayout's syncProfile will see the
  // existing row and preserve the pre-assigned role and name.
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.email.trim()) { showNotification('Email is required.', 'error'); return; }
    setAddingUser(true);
    try {
      // Check if profile already exists
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('email', newUser.email.toLowerCase().trim()).maybeSingle();

      if (existing) {
        showNotification('A user with this email already exists.', 'error');
        setAddingUser(false);
        return;
      }

      // We can't create a Supabase auth user without their password / OAuth.
      // Instead we create an invite-style profile row: a placeholder with no auth id.
      // When they sign in via Google OAuth, syncProfile will match on email and
      // link the profile to their auth id.
      // NOTE: Your profiles table must allow null `id` or use email as primary key
      // for this approach — alternatively, use Supabase Admin API (service role key)
      // via an Edge Function to send a real invite.
      const { error } = await supabase.from('profiles').insert([{
        email:     newUser.email.toLowerCase().trim(),
        role:      newUser.role,
        full_name: newUser.full_name.trim() || null,
        // id will be null until they sign in — sync happens in DashboardLayout
      }]);

      if (error) {
        // If schema requires id, fall back to invite via Edge Function
        if (error.message?.includes('null value') || error.message?.includes('not-null')) {
          showNotification('Your profiles table requires an auth ID. Deploy the invite-user Edge Function or ask the user to sign in first.', 'error');
        } else {
          throw error;
        }
        return;
      }

      showNotification(`Invitation profile created for ${newUser.email}. They can now sign in with Google.`);
      setShowAddUser(false);
      setNewUser({ email: '', role: 'officer', full_name: '' });
      fetchData();
    } catch (err) {
      console.error('Add user error:', err);
      showNotification(err.message || 'Failed to add user.', 'error');
    } finally {
      setAddingUser(false);
    }
  };

  const getDisplayName = (profile) => {
    if (profile?.full_name) return profile.full_name;
    if (profile?.email) {
      const prefix = profile.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return 'Unknown';
  };

  const isDeveloper = currentProfile?.email === DEV_EMAIL || currentProfile?.role === 'developer';
  const isAdmin     = currentProfile?.role === 'admin';

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

  const roleOptions = isDeveloper ? ['developer', 'admin', 'officer'] : ['admin', 'officer'];

  const roleMeta = {
    developer: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    admin:     'bg-emerald-50 text-emerald-700 border-emerald-100',
    officer:   'bg-blue-50 text-blue-700 border-blue-100',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
          <p className="text-sm text-slate-400 mt-1">Manage platform users. New users auto-create profiles on first Google sign-in.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
          {/* ✅ ADD USER BUTTON */}
          <button onClick={() => setShowAddUser(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-all shadow-sm active:scale-95">
            <UserPlus size={16} /> Add User
          </button>
        </div>
      </div>

      <Toast toast={toast} />

      {/* User Table */}
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
                <th className="px-8 py-4">Name</th>
                <th className="px-8 py-4">Email</th>
                <th className="px-8 py-4">Role</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {profiles.length === 0 ? (
                <tr><td colSpan={4} className="px-8 py-10 text-center text-slate-300 text-sm italic">No users yet</td></tr>
              ) : profiles.map(item => {
                const isSelf  = item.id === currentProfile?.id;
                const canEdit = !isSelf && (isDeveloper || (isAdmin && item.role !== 'developer'));
                const badge   = roleMeta[item.role] ?? 'bg-slate-50 text-slate-500 border-slate-100';

                return (
                  <tr key={item.id || item.email} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">
                          {getDisplayName(item).charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800 text-sm">
                          {getDisplayName(item)}
                          {isSelf && <span className="ml-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">(you)</span>}
                          {!item.id && <span className="ml-1.5 text-[9px] font-bold uppercase tracking-widest text-amber-500">pending</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-sm text-slate-500">{item.email}</td>
                    <td className="px-8 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${badge}`}>
                        {item.role?.toUpperCase() ?? 'OFFICER'}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      {canEdit ? (
                        <div className="flex items-center justify-end gap-2">
                          <select value={item.role} onChange={e => updateRole(item.id, e.target.value)}
                            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer">
                            {roleOptions.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                          </select>
                          <button onClick={() => deleteProfile(item.id)} title="Revoke Access"
                            className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">{isSelf ? 'Your account' : 'Protected'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Add New User</h3>
              <button onClick={() => setShowAddUser(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={22} />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Full Name (optional)</label>
                <input type="text" value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="Jane Wanjiku"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Google Email Address</label>
                <input required type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@gmail.com"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 transition-all" />
                <p className="text-[10px] text-slate-400 mt-1">Must be their Google account email — they sign in via Google OAuth.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Assign Role</label>
                <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 transition-all bg-white">
                  {roleOptions.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                The user will get access immediately when they sign in with this Google account. No email invitation is sent.
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddUser(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-all text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={addingUser}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                  {addingUser && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {addingUser ? 'Adding…' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}