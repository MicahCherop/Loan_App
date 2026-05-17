import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { Shield, Trash2, User as UserIcon } from 'lucide-react';

export default function Admin() {
  const [profiles, setProfiles] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
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
          const profilesRes = await supabase.from('profiles').select('*').order('created_at', { ascending: false });

          if (profilesRes.error) console.error('Profiles fetch error:', profilesRes.error);

          setProfiles(profilesRes.data || []);
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
    const { error } = await supabase.rpc('set_user_role', {
      target_user_id: userId,
      target_role: newRole,
    });
    
    if (error) {
      alert(error.message);
    } else {
      setMessage(`Role updated successfully.`);
      fetchData();
    }
  };

  const deleteProfile = async (id) => {
    const profile = profiles.find((item) => item.id === id);
    if (!window.confirm(`Revoke access for ${profile?.email || 'this user'}? They will be logged out and unable to access the system.`)) return;
    
    const { error } = await supabase.rpc('revoke_user_access', {
      target_user_id: id,
    });
    
    if (error) {
      alert(error.message);
    } else {
      setMessage(`${profile?.email || 'User'} access has been revoked.`);
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
          <p className="text-sm text-slate-400 mt-1">View and manage platform users. New users auto-create profiles when they sign in with Google.</p>
        </div>
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
              ) : profiles.length === 0 ? (
                <tr><td colSpan={4} className="px-8 py-10 text-center text-slate-300 text-sm italic">No users yet</td></tr>
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
    </div>
  );
}
