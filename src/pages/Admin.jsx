import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { UserPlus, Shield, Trash2, Mail, User as UserIcon, X } from 'lucide-react';
import { motion } from 'motion/react';

export default function Admin() {
  const [profiles, setProfiles] = useState([]);
  const [preAuths, setPreAuths] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteRole, setNewInviteRole] = useState('officer');
  const [currentProfile, setCurrentProfile] = useState(null);
  const [message, setMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  async function fetchData() {
    setPageLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const user = session?.user;
      if (sessionError) {
        throw sessionError;
      }
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        
        setCurrentProfile(profile);

        const isDev = user.email === 'mic1dev.me@gmail.com';
        if (isDev || profile?.role === 'developer' || profile?.role === 'admin') {
          const [profilesRes, preAuthRes] = await Promise.all([
            supabase.from('profiles').select('*').order('created_at', { ascending: false }),
            supabase.from('pre_authorized_emails').select('*').order('created_at', { ascending: false }),
          ]);

          if (profilesRes.error) console.error('Profiles fetch error:', profilesRes.error);
          if (preAuthRes.error) console.error('Pre-auth fetch error:', preAuthRes.error);

          setProfiles(profilesRes.data || []);
          setPreAuths(preAuthRes.data || []);
        }
      }
    } catch (err) {
      console.error('Fetch data error:', err);
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const updateRole = async (userId, newRole) => {
    setErrorMessage(null);
    const profile = profiles.find((item) => item.id === userId);
    const { error } = await supabase.rpc('set_authorized_user_role', {
      target_email: profile.email,
      target_role: newRole,
    });
    
    if (error) {
      alert(error.message);
    } else {
      fetchData();
    }
  };

  const addUser = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setMessage(null);
    setErrorMessage(null);
    
    try {
      const email = newInviteEmail.toLowerCase().trim();
      if (!email.includes('@')) {
        throw new Error('Enter a valid email address.');
      }
      
      const { error } = await supabase.rpc('set_authorized_user_role', {
        target_email: email,
        target_role: newInviteRole,
      });
      
      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      setNewInviteEmail('');
      setShowAddModal(false);
      setMessage(`✓ ${email} has been added as ${newInviteRole}. They can now sign in with Google or email/password.`);
      await new Promise(r => setTimeout(r, 1000));
      await fetchData();
    } catch (err) {
      console.error('Add user error:', err);
      setErrorMessage(`Error adding user: ${err.message || err}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const deleteProfile = async (id) => {
    const profile = profiles.find((item) => item.id === id);
    if (!window.confirm(`Revoke access for ${profile?.email || 'this user'}? They will be signed out the next time the app checks authorization.`)) return;
    
    const { error } = await supabase.rpc('revoke_user_email', {
      target_email: profile?.email?.toLowerCase(),
    });
    
    if (error) {
      alert(error.message);
    } else {
      setMessage(`${profile?.email || 'User'} access has been revoked.`);
      fetchData();
    }
  };

  const removePreAuth = async (email) => {
    const { error } = await supabase.rpc('revoke_user_email', {
      target_email: email,
    });

    if (error) {
      alert(error.message);
    } else {
      setMessage(`${email} authorization has been removed.`);
      fetchData();
    }
  };

  const isDeveloper = currentProfile?.email === 'mic1dev.me@gmail.com';
  if (!pageLoading && !isDeveloper && currentProfile?.role !== 'developer' && currentProfile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <Shield size={64} className="mb-4 opacity-20" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p>You do not have administrative privileges.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
          <p className="text-sm text-slate-400 mt-1">Add users directly to the platform so they can sign in with Google immediately.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-md active:scale-95"
        >
          <UserPlus size={18} />
          Add New User
        </button>
      </div>

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

      <div className="grid grid-cols-1 gap-8">
        {/* Active Users */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <UserIcon className="text-blue-600" size={20} />
            <h3 className="font-bold text-slate-800">Platform Users</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-8 py-4">User Email</th>
                  <th className="px-8 py-4">Assigned Role</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pageLoading ? (
                  <tr><td colSpan={4} className="px-8 py-10 text-center text-slate-400 text-sm">Loading...</td></tr>
                ) : profiles.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4">
                      <div className="font-medium text-slate-800 text-sm">{item.email}</div>
                    </td>
                    <td className="px-8 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                        item.role === 'developer' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                        item.role === 'admin' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        {item.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(currentProfile?.role === 'developer' || (currentProfile?.role === 'admin' && item.role !== 'developer')) && item.id !== currentProfile?.id && (
                          <>
                            <select
                              value={item.role}
                              onChange={(e) => updateRole(item.id, e.target.value)}
                              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            >
                              <option value="admin">Admin</option>
                              <option value="officer">Officer</option>
                            </select>
                            <button
                              onClick={() => deleteProfile(item.id)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                              title="Remove Profile"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Pending Users */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <Mail className="text-orange-500" size={20} />
            <h3 className="font-bold text-slate-800">Pending Users</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-8 py-4">Email</th>
                  <th className="px-8 py-4">Expected Role</th>
                  <th className="px-8 py-4">Invited</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pageLoading ? (
                  <tr><td colSpan={4} className="px-8 py-10 text-center text-slate-400 text-sm">Loading...</td></tr>
                ) : preAuths.length === 0 ? (
                  <tr><td colSpan={4} className="px-8 py-10 text-center text-slate-300 text-sm italic">No pending users</td></tr>
                ) : preAuths.map((item) => (
                  <tr key={item.email} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4 text-sm text-slate-600">{item.email}</td>
                    <td className="px-8 py-4">
                      <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 text-[10px] font-bold border border-orange-100">
                        {item.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="px-8 py-4 text-right">
                      <button
                        onClick={() => removePreAuth(item.email)}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>      </div>

      {showAddModal && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Add New User</h3>
                <p className="text-xs text-slate-400 mt-1">Add the exact Google email to add the user directly to the platform.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            <form className="p-8 space-y-6" onSubmit={addUser}>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Gmail Address</label>
                <p className="text-xs text-slate-400 pl-1">The user must choose this same account on the Google screen.</p>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    required
                    type="email"
                    placeholder="user@gmail.com"
                    value={newInviteEmail}
                    onChange={(e) => setNewInviteEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Assign Initial Role</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setNewInviteRole('admin')}
                    className={`p-4 rounded-2xl border transition-all text-left ${newInviteRole === 'admin' ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-100' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
                  >
                    <Shield size={20} className={newInviteRole === 'admin' ? 'text-blue-600' : ''} />
                    <div className="mt-3 font-bold text-sm">Administrator</div>
                    <div className="text-[10px] opacity-70">Full system access</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewInviteRole('officer')}
                    className={`p-4 rounded-2xl border transition-all text-left ${newInviteRole === 'officer' ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-100' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
                  >
                    <UserPlus size={20} className={newInviteRole === 'officer' ? 'text-blue-600' : ''} />
                    <div className="mt-3 font-bold text-sm">Credit Officer</div>
                    <div className="text-[10px] opacity-70">Manage customers</div>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                New users are authorized immediately, but their profile row is created only after they sign in for the first time.
              </div>

              <button
                type="submit"
                disabled={submitLoading}
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg active:scale-[0.98] mt-4 disabled:opacity-60"
              >
                {submitLoading ? 'Saving...' : 'Save User'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
