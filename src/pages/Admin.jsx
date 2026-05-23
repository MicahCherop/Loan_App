/**
 * Admin.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * User management panel. Only accessible to developers and admins.
 *
 * Features:
 *  • Lists all platform users with name, email, role, and approval status.
 *  • Pending users highlighted with an amber row + Approve button.
 *  • Approve / Block / Revoke actions with audit logging.
 *  • Role dropdown (developer-only can assign developer role).
 *  • "Add User" modal — pre-registers an email so the person gets the right
 *    role the moment they sign in with Google OAuth.
 *  • Pending count badge in the header for at-a-glance urgency.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase.js';
import { logAudit, useAuth } from '../context/AuthContext.jsx';
import {
  Shield, Trash2, User as UserIcon, RefreshCw,
  UserPlus, X, AlertCircle, CheckCircle,
  UserCheck, UserX,
} from 'lucide-react';

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
      isError
        ? 'bg-rose-50 border-rose-100 text-rose-700'
        : 'bg-emerald-50 border-emerald-100 text-emerald-700'
    }`}>
      {isError
        ? <AlertCircle size={16} className="shrink-0 mt-0.5" />
        : <CheckCircle size={16} className="shrink-0 mt-0.5" />}
      {toast.message}
    </div>
  );
}

// ─── Badge style maps ─────────────────────────────────────────────────────────
const ROLE_META = {
  developer: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  admin:     'bg-emerald-50 text-emerald-700 border-emerald-100',
  officer:   'bg-blue-50 text-blue-700 border-blue-100',
  manager:   'bg-violet-50 text-violet-700 border-violet-100',
};

const STATUS_META = {
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  pending:  'bg-amber-50  text-amber-700  border-amber-100',
  blocked:  'bg-rose-50   text-rose-700   border-rose-100',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDisplayName(p) {
  if (p?.full_name) return p.full_name;
  if (p?.email) {
    const prefix = p.email.split('@')[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
  return 'Unknown';
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Admin() {
  const { profile: currentProfile, isDeveloper, isAdmin } = useAuth();

  const [profiles,    setProfiles]    = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [toast,       setToast]       = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser,     setNewUser]     = useState({ email: '', role: 'officer', full_name: '' });
  const [addingUser,  setAddingUser]  = useState(false);

  const timerRef = useRef(null);

  // ── Toast helper ─────────────────────────────────────────────────────────
  const showNotification = useCallback((message, type = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type });
    timerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // ── Fetch all profiles ────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setPageLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Admin fetchData error:', err);
      showNotification('Failed to load users.', 'error');
    } finally {
      setPageLoading(false);
    }
  }, [showNotification]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Update role ───────────────────────────────────────────────────────────
  const updateRole = async (userId, newRole) => {
    const { error } = await supabase.rpc('set_user_role', {
      target_user_id: userId,
      target_role:    newRole,
    });
    if (error) { showNotification(error.message, 'error'); return; }
    await logAudit(supabase, {
      action: 'ROLE_CHANGED', entity: 'profile', entityId: userId,
      payload: { new_role: newRole, changed_by: currentProfile?.id },
    });
    showNotification('Role updated successfully.');
    fetchData();
  };

  // ── Approve user ──────────────────────────────────────────────────────────
  const approveUser = async (userId, userEmail) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'verified' })
      .eq('id', userId);
    if (error) { showNotification(error.message, 'error'); return; }
    await logAudit(supabase, {
      action: 'USER_APPROVED', entity: 'profile', entityId: userId,
      payload: { email: userEmail, approved_by: currentProfile?.id },
    });
    showNotification(`${userEmail} has been approved.`);
    fetchData();
  };

  // ── Block user ────────────────────────────────────────────────────────────
  const blockUser = async (userId, userEmail) => {
    if (!window.confirm(`Block ${userEmail}? They will be signed out immediately.`)) return;
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'blocked' })
      .eq('id', userId);
    if (error) { showNotification(error.message, 'error'); return; }
    await logAudit(supabase, {
      action: 'USER_BLOCKED', entity: 'profile', entityId: userId,
      payload: { email: userEmail, blocked_by: currentProfile?.id },
    });
    showNotification(`${userEmail} has been blocked.`);
    fetchData();
  };

  // ── Revoke / delete profile ───────────────────────────────────────────────
  const deleteProfile = async (id) => {
    const p = profiles.find(item => item.id === id);
    if (!window.confirm(`Permanently revoke access for ${p?.email || 'this user'}?`)) return;
    const { error } = await supabase.rpc('revoke_user_access', { target_user_id: id });
    if (error) { showNotification(error.message, 'error'); return; }
    await logAudit(supabase, {
      action: 'USER_REVOKED', entity: 'profile', entityId: id,
      payload: { email: p?.email, revoked_by: currentProfile?.id },
    });
    showNotification(`${p?.email || 'User'} access revoked.`);
    fetchData();
  };

  // ── Add user (pre-register by email before first sign-in) ────────────────
  const handleAddUser = async (e) => {
    e.preventDefault();
    const email = newUser.email.toLowerCase().trim();
    if (!email) { showNotification('Email is required.', 'error'); return; }

    setAddingUser(true);
    try {
      // Check for duplicates
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (existing) {
        showNotification('A user with this email already exists.', 'error');
        return;
      }

      // Insert placeholder profile (no auth id yet — matched by email on first sign-in)
      const { error } = await supabase.from('profiles').insert([{
        email,
        role:      newUser.role,
        status:    'pending', // admin must approve after first sign-in
        full_name: newUser.full_name.trim() || null,
      }]);
      if (error) throw error;

      await logAudit(supabase, {
        action: 'USER_PRE_REGISTERED', entity: 'profile',
        payload: { email, role: newUser.role, added_by: currentProfile?.id },
      });

      showNotification(`Profile created for ${email}. Approve after their first sign-in.`);
      setShowAddUser(false);
      setNewUser({ email: '', role: 'officer', full_name: '' });
      fetchData();
    } catch (err) {
      showNotification(err.message || 'Failed to add user.', 'error');
    } finally {
      setAddingUser(false);
    }
  };

  // ── Loading / access guard ────────────────────────────────────────────────
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
        <p className="text-sm mt-1">You do not have administrative privileges.</p>
      </div>
    );
  }

  const roleOptions    = isDeveloper ? ['developer', 'admin', 'officer'] : ['admin', 'officer'];
  const pendingCount   = profiles.filter(p => p.status === 'pending').length;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
          <p className="text-sm text-slate-400 mt-1">
            New sign-ins are <strong>pending</strong> until approved here.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {pendingCount} pending approval{pendingCount > 1 ? 's' : ''}
            </div>
          )}
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          {/* ── ADD USER BUTTON ───────────────────────────────────────────── */}
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-all shadow-sm active:scale-95"
          >
            <UserPlus size={16} /> Add User
          </button>
        </div>
      </div>

      <Toast toast={toast} />

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <UserIcon className="text-blue-600" size={20} />
          <h3 className="font-bold text-slate-800">Platform Users</h3>
          <span className="ml-auto text-xs text-slate-400 font-medium">
            {profiles.length} user{profiles.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-4">Name</th>
                <th className="px-8 py-4">Email</th>
                <th className="px-8 py-4">Role</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-10 text-center text-slate-300 text-sm italic">
                    No users yet
                  </td>
                </tr>
              ) : profiles.map(item => {
                const isSelf      = item.id === currentProfile?.id;
                const canEdit     = !isSelf && (isDeveloper || (isAdmin && item.role !== 'developer'));
                const isPending   = item.status === 'pending';
                const isVerified  = item.status === 'verified';
                const roleBadge   = ROLE_META[item.role]    ?? 'bg-slate-50 text-slate-500 border-slate-100';
                const statusBadge = STATUS_META[item.status] ?? 'bg-slate-50 text-slate-500 border-slate-100';

                return (
                  <tr
                    key={item.id || item.email}
                    className={`transition-colors ${
                      isPending
                        ? 'bg-amber-50/30 hover:bg-amber-50/50'
                        : 'hover:bg-slate-50/50'
                    }`}
                  >
                    {/* Name */}
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {getDisplayName(item).charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800 text-sm">
                          {getDisplayName(item)}
                          {isSelf && (
                            <span className="ml-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                              (you)
                            </span>
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-8 py-4 text-sm text-slate-500">{item.email}</td>

                    {/* Role */}
                    <td className="px-8 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${roleBadge}`}>
                        {item.role?.toUpperCase() ?? 'OFFICER'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-8 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border capitalize ${statusBadge}`}>
                        {item.status ?? 'pending'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-8 py-4 text-right">
                      {canEdit ? (
                        <div className="flex items-center justify-end gap-2">
                          {/* Approve — only for pending */}
                          {isPending && (
                            <button
                              onClick={() => approveUser(item.id, item.email)}
                              title="Approve user"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
                            >
                              <UserCheck size={14} /> Approve
                            </button>
                          )}
                          {/* Block — only for verified */}
                          {isVerified && (
                            <button
                              onClick={() => blockUser(item.id, item.email)}
                              title="Block user"
                              className="p-1.5 text-slate-300 hover:text-amber-500 transition-colors"
                            >
                              <UserX size={16} />
                            </button>
                          )}
                          {/* Role selector */}
                          <select
                            value={item.role}
                            onChange={e => updateRole(item.id, e.target.value)}
                            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                          >
                            {roleOptions.map(r => (
                              <option key={r} value={r}>
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                              </option>
                            ))}
                          </select>
                          {/* Revoke */}
                          <button
                            onClick={() => deleteProfile(item.id)}
                            title="Revoke access"
                            className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
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
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add User Modal ─────────────────────────────────────────────────── */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Add New User</h3>
              <button
                onClick={() => setShowAddUser(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Full Name <span className="normal-case font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="Jane Wanjiku"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Google Email Address
                </label>
                <input
                  required
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@gmail.com"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Must match their Google account email — they sign in via Google OAuth.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Assign Role
                </label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 transition-all bg-white"
                >
                  {roleOptions.map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 leading-relaxed">
                A <strong>pending</strong> profile will be created. After the user signs in with
                their Google account you must click <strong>Approve</strong> to grant them access.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingUser}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {addingUser && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
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