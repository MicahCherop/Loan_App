import { useRef, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { 
  UserPlus, 
  Search, 
  MoreVertical, 
  Phone, 
  Filter,
  XCircle,
  ArrowRight,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', phone: '254' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const statusFilterRef = useRef(null);
  const navigate = useNavigate();

  async function fetchLeads() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .neq('status', 'converted')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching leads:', error);
        setErrorMessage(error.message);
      }
      if (data) setLeads(data);
    } catch (err) {
      console.error('Unexpected error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleAddLead = async (e) => {
    e.preventDefault();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      alert(userError?.message || 'You must be logged in to add a lead.');
      return;
    }

    let formattedPhone = newLead.phone.trim();
    if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.slice(1);
    } else if (formattedPhone.startsWith('0')) {
      formattedPhone = `254${formattedPhone.slice(1)}`;
    }

    if (!formattedPhone.startsWith('254') || formattedPhone.length < 12) {
      alert('Phone number must start with 254 and include the full number.');
      return;
    }
    
    const { error } = await supabase.from('leads').insert([
      { name: newLead.name, phone: formattedPhone, officer_id: user?.id, status: 'new', email: '' }
    ]);

    if (error) {
      alert('Error creating lead: ' + error.message);
    } else {
      setShowAddModal(false);
      setNewLead({ name: '', phone: '254' });
      fetchLeads();
    }
  };

  const convertToCustomer = (lead) => {
    // Navigate to customer creation with lead details
    navigate('/new-loan', { state: { lead } });
  };

  const handleFilterClick = () => {
    statusFilterRef.current?.focus();
  };

  const copyPhoneNumber = async (phone) => {
    try {
      await navigator.clipboard.writeText(phone);
      alert('Phone number copied.');
    } catch {
      window.prompt('Copy phone number:', phone);
    }
    setActiveMenuId(null);
  };

  const filteredLeads = leads.filter((lead) => {
    const text = `${lead.name || ''} ${lead.phone || ''} ${lead.email || ''}`.toLowerCase();
    const matchesSearch = text.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search leads..."
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
            <option value="rejected">Rejected</option>
          </select>
          <button
            type="button"
            onClick={handleFilterClick}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Filter size={18} />
            Filter
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-sm active:scale-95"
          >
            <UserPlus size={18} />
            Add Lead
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

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
                  <td colSpan={4} className="px-8 py-20 text-center text-slate-400 text-sm">Loading leads...</td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <UserPlus size={48} className="mb-4 opacity-20" />
                      <p className="text-sm">No leads found.</p>
                      <button onClick={() => setShowAddModal(true)} className="text-blue-600 text-sm mt-2 hover:underline">Add your first lead</button>
                    </div>
                  </td>
                </tr>
              ) : filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/80 group transition-colors">
                  <td className="px-6 sm:px-8 py-4">
                    <div className="font-semibold text-slate-800 text-sm sm:text-base">{lead.name}</div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                       <Clock size={12} />
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
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-medium border ${
                      lead.status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      lead.status === 'converted' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 sm:px-8 py-4 text-right">
                    <div className="flex items-center justify-end gap-3 transition-all duration-300">
                      {lead.status === 'new' && (
                        <button
                          onClick={() => convertToCustomer(lead)}
                          className="flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] sm:text-xs font-medium shadow-sm transition-all hover:bg-blue-700 active:scale-95 whitespace-nowrap"
                        >
                          Process Loan
                          <ArrowRight size={14} className="hidden sm:inline" />
                        </button>
                      )}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(activeMenuId === lead.id ? null : lead.id)}
                          className="p-2 text-slate-300 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-all border border-transparent"
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
                                onClick={() => convertToCustomer(lead)}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[#E5E7EB]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Add New Lead</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
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
                <label className="block text-sm font-medium text-slate-500 mb-1.5">Phone Number (Start with 254)</label>
                <input
                  required
                  type="tel"
                  value={newLead.phone}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const digits = raw.replace(/\D/g, '');
                    setNewLead({ ...newLead, phone: digits });
                  }}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-300 transition-all text-sm"
                  placeholder="254..."
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all"
                >
                  Create Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
