import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { 
  Search, 
  Phone, 
  Mail,
  Plus,
  ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  async function fetchCustomers() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*, loans(count)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customers:', error);
        setErrorMessage(error.message);
      }
      if (data) setCustomers(data);
    } catch (err) {
      console.error('Unexpected error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter((customer) => {
    const text = `${customer.name || ''} ${customer.phone || ''} ${customer.email || ''} ${customer.id_number || ''}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-200 transition-all shadow-sm"
          />
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px] lg:min-w-0">
            <thead className="bg-slate-50/50 text-xs font-medium text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-5">Customer</th>
                <th className="px-6 py-5">Contact Details</th>
                <th className="px-6 py-5">ID Number</th>
                <th className="px-6 py-5">Loans</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400 text-sm">Loading customers...</td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400 text-sm italic">No customers found.</td>
                </tr>
              ) : filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50/80 group transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden border-2 border-white shadow-sm shrink-0">
                        <img src={customer.photo_url || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop'} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 text-sm truncate">{customer.name}</div>
                        <div className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                          <Plus size={10} /> Verified
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Phone size={12} className="text-slate-300" />
                        {customer.phone}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Mail size={12} className="text-slate-300" />
                        {customer.email || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600 font-medium font-mono">
                    {customer.id_number || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                      {customer.loans?.[0]?.count || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/customers/${customer.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-sm"
                    >
                      View Profile
                      <ArrowUpRight size={14} />
                    </Link>
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
