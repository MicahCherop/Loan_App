/**
 * Leads.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Leads management page.
 *
 * FIXES applied:
 *  [F1] handleAddLead verifies auth session before insert — surfaces a clear
 *       error instead of a silent RLS 403 when the session has expired.
 *  [F2] fetchLeads uses a stable useCallback ref so it never causes infinite loops.
 *  [F3] Toast replaces all alert() calls.
 *  [F4] Separate `submitting` state so the table stays interactive during modal save.
 *  [F5] Outside-click handler on the action menu dropdown.
 *  [F6] Inline phone validation — no alert().
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import {
  UserPlus,
  Search,
  MoreVertical,
  Phone,
  Filter,
  XCircle,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Inline toast notification ────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
        isError
          ? 'bg-rose-50 border-rose-100 text-rose-700'
          : 'bg-emerald-50 border-emerald-100 text-emerald-700'
      }`}
    >
      {isError
        ? <AlertCircle size={16} className="shrink-0 mt-0.5" />
        : <CheckCircle size={16} className="shrink-0 mt-0.5" />}
      {toast.message}
    </div>
  );
}

// ─── Phone normaliser ─────────────────────────────────────────────────────────
// Accepts: +2547XXXXXXXX | 07XXXXXXXX | 2547XXXXXXXX
// Returns: { ok: true, value: '2547XXXXXXXX' } | { ok: false, error: string }
function normalisePhone(raw) {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('254')) {
    // already international
  } else if (digits.startsWith('0')) {
    digits = `254${digits.slice(1)}`;
  } else if (digits.startsWith('7') || digits.startsWith('1')) {
    digits = `254${digits}`;
  }
  // Kenyan numbers: 254 + 9 digits = 12 digits total
  if (!digits.startsWith('254') || digits.length !== 12) {
    return { ok: false, error: 'Enter a valid Kenyan number (e.g. 0712 345 678 or 254712345678).' };
  }
  return { ok: true, value: digits };
}

// ─── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  new:        'bg-blue-50 text-blue-700 border-blue-100',
  contacted:  'bg-violet-50 text-violet-700 border-violet-100',
  interested: 'bg-amber-50 text-amber-700 border-amber-100',
  rejected:   'bg-rose-50 text-rose-700 border-rose-100',
  converted:  'bg-emerald-50 text-emerald-700 border-emerald-100',
};

function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-medium border capitalize ${STATUS_STYLES[status] ?? 'bg-slate-50 text-slate-500 border-slate-100'}`}>
      {status}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Leads() {
  const [leads,        setLeads]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false); // [F4] modal-only spinner
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead,      setNewLead]      = useState({ name: '', phone: '' });
  const [phoneError,   setPhoneError]   = useState('');   // [F6] inline validation
  const [searchTerm,   setSearchTerm]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast,        setToast]        = useState(null); // [F3] replaces alert()
  const [activeMenuId, setActiveMenuId] = useState(null);

  const statusFilterRef = useRef(null);
  const menuRef         = useRef(null);  // [F5] outside-click detection
  const toastTimerRef   = useRef(null);
  const navigate        = useNavigate();

  // ── Toast helper ─────────────────────────────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  // ── Fetch leads ──────────────────────────────────────────────────────────
  // [F2] Stable useCallback ref — safe as a useEffect dependency
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .neq('status', 'converted')
        .order('created_at', { ascending: false });

      if (error) {
        const msg = error.code === 'PGRST001'
          ? 'Access denied. Ensure your account is pre-authorized.'
          : `Error fetching leads: ${error.message}`;
        showToast(msg, 'error');
        console.error('Leads fetch error:', error);
      }
      if (data) setLeads(data);
    } catch (err) {
      console.error('Unexpected leads fetch error:', err);
      showToast(`Unexpected error: ${err.message || err}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // ── Close dropdown on outside click ──────────────────────────────────────
  // [F5] Attaches a document listener only while a menu is open
  useEffect(() => {
    if (!activeMenuId) return;
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeMenuId]);

  // ── Add lead ──────────────────────────────────────────────────────────────
  const handleAddLead = async (e) => {
    e.preventDefault();
    setPhoneError('');

    // [F6] Inline phone validation — no alert()
    const phoneResult = normalisePhone(newLead.phone);
    if (!phoneResult.ok) {
      setPhoneError(phoneResult.error);
      return;
    }

    setSubmitting(true);

    try {
      // [F1] Verify the session is still alive before attempting the insert.
      // An expired or missing session would cause a silent RLS 403 without this check.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        showToast(
          sessionError?.message || 'Your session has expired. Please sign in again.',
          'error'
        );
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.from('leads').insert([{
        name:       newLead.name.trim(),
        phone:      phoneResult.value,
        officer_id: session.user.id,
        status:     'new',
        email:      '',
      }]);

      if (error) {
        const msg =
          error.code === 'PGRST001'  ? 'Access denied: not authorized to add leads.' :
          error.code === 'PGRST116'  ? 'Your profile was not created properly. Please log out and back in.' :
          error.code === '42501'     ? 'Permission denied. Check your account role with an administrator.' :
          `Error creating lead: ${error.message}`;
        showToast(msg, 'error');
        console.error('Add lead error:', error);
      } else {
        setShowAddModal(false);
        setNewLead({ name: '', phone: '' });
        showToast('Lead added successfully!');
        fetchLeads();
      }
    } catch (err) {
      showToast(`Error creating lead: ${err.message || err}`, 'error');
      console.error('Unexpected add lead error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const convertToCustomer = (lead) => navigate('/new-loan', { state: { lead } });

  const copyPhoneNumber = async (phone) => {
    try {
      await navigator.clipboard.writeText(phone);
      showToast('Phone number copied.');
    } catch {
      window.prompt('Copy phone number:', phone);
    }
    setActiveMenuId(null);
  };

  const filteredLeads = leads.filter((lead) => {
    const text = `${lead.name || ''} ${lead.phone || ''} ${lead.email || ''}`.toLowerCase();
    return (
      text.includes(searchTerm.toLowerCase()) &&
      (statusFilter === 'all' || lead.status === statusFilter)
    );
  });

  return (
    <div className="space-y-6">
      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search leads…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            ref={statusFilterRef}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="interested">Interested</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            type="button"
            onClick={() => statusFilterRef.current?.focus()}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Filter size={18} />
            Filter
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-sm active:scale-95"
          >
            <UserPlus size={18} />
            Add Lead
          </button>
        </div>
      </div>

      <Toast toast={toast} />

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px] lg:min-w-0">
            <thead className="bg-slate-50/50 text-xs font-medium text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 sm:px-8 py-5">Lead Details</th>
                <th className="px-6 sm:px-8 py-5">Phone Number</th>
                <th className="px-6 sm:px-8 py-5">Status</th>
                <th className="px-6 sm:px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-slate-400 text-sm">
                    Loading leads…
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <UserPlus size={48} className="mb-4 opacity-20" />
                      <p className="text-sm">No leads found.</p>
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="text-blue-600 text-sm mt-2 hover:underline"
                      >
                        Add your first lead
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 group transition-colors">
                    <td className="px-6 sm:px-8 py-4">
                      <div className="font-semibold text-slate-800 text-sm sm:text-base">{lead.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                        <Clock size={11} />
                        Added {new Date(lead.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 sm:px-8 py-4">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
                        <Phone size={14} className="text-slate-300" />
                        {lead.phone}
                      </div>
                    </td>
                    <td className="px-6 sm:px-8 py-4">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-6 sm:px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {lead.status === 'new' && (
                          <button
                            onClick={() => convertToCustomer(lead)}
                            className="flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] sm:text-xs font-medium shadow-sm hover:bg-blue-700 active:scale-95 whitespace-nowrap"
                          >
                            Process Loan
                            <ArrowRight size={14} className="hidden sm:inline" />
                          </button>
                        )}
                        {/* [F5] ref on the active dropdown wrapper only */}
                        <div className="relative" ref={activeMenuId === lead.id ? menuRef : null}>
                          <button
                            type="button"
                            onClick={() => setActiveMenuId(activeMenuId === lead.id ? null : lead.id)}
                            className="p-2 text-slate-300 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-all"
                            aria-label={`More actions for ${lead.name}`}
                          >
                            <MoreVertical size={18} />
                          </button>
                          {activeMenuId === lead.id && (
                            <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-100 rounded-xl shadow-xl z-20 overflow-hidden text-left">
                              <a
                                href={`tel:+${lead.phone}`}
                                onClick={() => setActiveMenuId(null)}
                                className="block px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                              >
                                Call lead
                              </a>
                              <button
                                type="button"
                                onClick={() => copyPhoneNumber(lead.phone)}
                                className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                              >
                                Copy phone
                              </button>
                              {lead.status === 'new' && (
                                <button
                                  type="button"
                                  onClick={() => { convertToCustomer(lead); setActiveMenuId(null); }}
                                  className="w-full text-left px-4 py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                                >
                                  Process loan
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Lead Modal ────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Add New Lead</h3>
              <button
                onClick={() => { setShowAddModal(false); setPhoneError(''); }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleAddLead} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1.5">Full Name</label>
                <input
                  required
                  type="text"
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-300 transition-all text-sm"
                  placeholder="Kennedy Mwachiro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1.5">
                  Phone Number
                </label>
                <input
                  required
                  type="tel"
                  value={newLead.phone}
                  onChange={(e) => {
                    setPhoneError('');
                    setNewLead({ ...newLead, phone: e.target.value.replace(/\D/g, '') });
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none transition-all text-sm ${
                    phoneError ? 'border-rose-300 focus:border-rose-400' : 'border-slate-200 focus:border-blue-300'
                  }`}
                  placeholder="0712 345 678 or 254712345678"
                />
                {phoneError && (
                  <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {phoneError}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  Accepts: 07XX, 254XX, or +254XX format
                </p>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setPhoneError(''); }}
                  className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {submitting ? 'Saving…' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}