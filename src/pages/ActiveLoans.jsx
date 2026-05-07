import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { 
  Search, 
  ExternalLink, 
  Phone, 
  Calendar,
  User
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ActiveCustomers() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  async function fetchActiveLoans() {
    setLoading(true);
    setErrorMessage(null);
    const { data: loansData, error } = await supabase
      .from('loans')
      .select(`
        *,
        customer:customer_id (
          *,
          loans:loans(count)
        )
      `)
      .in('status', ['active', 'disbursed'])
      .order('disbursement_date', { ascending: false });

    if (error) {
      setErrorMessage(error.message);
    }
    if (loansData) {
      setLoans(loansData);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchActiveLoans();
  }, []);

  const filteredLoans = loans.filter((loan) => {
    const text = `${loan.customer?.name || ''} ${loan.customer?.phone || ''} ${loan.status || ''}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search active loans..."
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 text-xs font-medium text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5">Customer</th>
                <th className="px-8 py-5">Loan Amount</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Dates</th>
                <th className="px-8 py-5">History</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center text-slate-400 text-sm">Loading loans...</td>
                </tr>
              ) : filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center text-slate-400 text-sm italic">No active loans found.</td>
                </tr>
              ) : filteredLoans.map((loan) => (
                <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors group/row">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border-2 border-white shadow-md transition-transform">
                        {loan.customer?.photo_url ? (
                          <img src={loan.customer.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400"><User size={20} /></div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{loan.customer?.name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                          <Phone size={10} className="text-blue-500" />
                          {loan.customer?.phone}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1 font-bold text-slate-800 text-lg">
                        <span className="text-slate-300 text-xs font-medium">KES</span>
                        {loan.amount.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400">
                        Interest: {loan.interest_rate}% / KES {loan.repayment_amount.toLocaleString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-medium border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {loan.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Calendar size={12} className="text-slate-300" />
                        Issued: {new Date(loan.disbursement_date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-rose-500">
                        <Calendar size={12} className="text-rose-400" />
                        Due: {new Date(loan.due_date).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 inline-block text-center min-w-[80px]">
                      <div className="text-lg font-bold text-slate-800 leading-none">{loan.customer?.loans?.[0]?.count || 0}</div>
                      <div className="text-[9px] text-slate-400 font-medium mt-1 uppercase">Loans</div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <Link
                      to={`/customers/${loan.customer_id}`}
                      className="inline-flex items-center justify-center p-3 text-slate-300 hover:text-blue-600 rounded-xl hover:bg-white hover:shadow-md transition-all active:scale-90 border border-transparent"
                    >
                      <ExternalLink size={20} />
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
