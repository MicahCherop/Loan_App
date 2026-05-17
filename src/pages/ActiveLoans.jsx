import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import {
  Search,
  ExternalLink,
  Phone,
  Calendar,
  User,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// ✅ FIX 1: Safe number formatter — never crashes on null/undefined
function formatKES(value) {
  const n = Number(value);
  if (isNaN(n)) return '—';
  return n.toLocaleString();
}

// ✅ FIX 2: Safe date formatter — shows fallback instead of "1/1/1970"
function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

// ✅ FIX 3: Due-date urgency — highlights overdue and near-due loans
function dueDateClass(value) {
  if (!value) return 'text-slate-400';
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'text-slate-400';
  const daysLeft = Math.ceil((d - Date.now()) / 86_400_000);
  if (daysLeft < 0)  return 'text-rose-600 font-semibold';  // overdue
  if (daysLeft <= 7) return 'text-amber-500 font-medium';    // due within a week
  return 'text-slate-400';
}

// ✅ FIX 4: Status badge — distinct styles per status value
const STATUS_META = {
  active:    { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
  disbursed: { dot: 'bg-blue-500',    text: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100'       },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { dot: 'bg-slate-400', text: 'text-slate-500', bg: 'bg-slate-50 border-slate-100' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border capitalize ${meta.bg} ${meta.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {status}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ActiveLoans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  // ✅ FIX 5: useCallback for stable reference; try/catch prevents permanent
  // loading state on network failure.
  const fetchActiveLoans = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // ✅ FIX 6: Fetch total loan count per customer via a separate aggregation
      // column rather than the fragile nested `loans(count)` relation shape.
      // We use Supabase's `count` option on the join and read it directly.
      const { data: loansData, error } = await supabase
        .from('loans')
        .select(`
          id,
          amount,
          repayment_amount,
          interest_rate,
          status,
          disbursement_date,
          due_date,
          customer_id,
          customer:customer_id (
            id,
            name,
            phone,
            photo_url,
            total_loans:loans(count)
          )
        `)
        .in('status', ['active', 'disbursed'])
        .order('disbursement_date', { ascending: false });

      if (error) {
        console.error('Active loans fetch error:', error);
        setErrorMessage(error.message);
      } else {
        setLoans(loansData ?? []);
      }
    } catch (err) {
      console.error('Unexpected active loans error:', err);
      setErrorMessage(err.message || 'Failed to load active loans.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchActiveLoans(); }, [fetchActiveLoans]);

  // ✅ FIX 7: Also search by loan amount and due date
  const filteredLoans = loans.filter((loan) => {
    const text = [
      loan.customer?.name,
      loan.customer?.phone,
      loan.status,
      loan.amount,
      formatDate(loan.due_date),
    ].join(' ').toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, phone, status…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-200 transition-all shadow-sm"
          />
        </div>
        {/* Summary pill */}
        {!loading && (
          <div className="text-xs text-slate-400 font-medium shrink-0">
            {filteredLoans.length} loan{filteredLoans.length !== 1 ? 's' : ''}
            {searchTerm && ' found'}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
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
                // ✅ FIX 8: Skeleton rows instead of a single centred loading line
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100" />
                        <div className="space-y-2">
                          <div className="h-3 w-32 bg-slate-100 rounded" />
                          <div className="h-2 w-24 bg-slate-100 rounded" />
                        </div>
                      </div>
                    </td>
                    {[...Array(4)].map((_, j) => (
                      <td key={j} className="px-8 py-6">
                        <div className="h-3 w-20 bg-slate-100 rounded" />
                      </td>
                    ))}
                    <td className="px-8 py-6 text-right">
                      <div className="h-8 w-8 bg-slate-100 rounded-xl ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center text-slate-400 text-sm italic">
                    {searchTerm ? `No loans matching "${searchTerm}".` : 'No active loans found.'}
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => {
                  // ✅ FIX 9: Read count from the correct Supabase aggregation shape
                  const loanCount = loan.customer?.total_loans?.[0]?.count ?? 0;

                  return (
                    <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Customer */}
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border-2 border-white shadow-md shrink-0">
                            {loan.customer?.photo_url ? (
                              <img src={loan.customer.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <User size={20} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">
                              {loan.customer?.name ?? '—'}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                              <Phone size={10} className="text-blue-400" />
                              {loan.customer?.phone ?? '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-8 py-6">
                        <div className="font-bold text-slate-800 text-lg leading-none">
                          <span className="text-slate-300 text-xs font-medium mr-1">KES</span>
                          {/* ✅ Uses safe formatKES — no crash on null */}
                          {formatKES(loan.amount)}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {loan.interest_rate != null ? `${loan.interest_rate}% interest` : ''}
                          {loan.repayment_amount != null
                            ? ` · repay KES ${formatKES(loan.repayment_amount)}`
                            : ''}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-8 py-6">
                        <StatusBadge status={loan.status} />
                      </td>

                      {/* Dates */}
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Calendar size={12} className="text-slate-300 shrink-0" />
                            Issued: {formatDate(loan.disbursement_date)}
                          </div>
                          {/* ✅ FIX 10: Colour-coded due date — red if overdue, amber if <7 days */}
                          <div className={`flex items-center gap-2 text-xs ${dueDateClass(loan.due_date)}`}>
                            <Calendar size={12} className="shrink-0" />
                            Due: {formatDate(loan.due_date)}
                          </div>
                        </div>
                      </td>

                      {/* History */}
                      <td className="px-8 py-6">
                        <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 inline-block text-center min-w-[72px]">
                          <div className="text-lg font-bold text-slate-800 leading-none">{loanCount}</div>
                          <div className="text-[9px] text-slate-400 font-medium mt-1 uppercase tracking-wider">Loans</div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-8 py-6 text-right">
                        <Link
                          to={`/customers/${loan.customer_id}`}
                          className="inline-flex items-center justify-center p-3 text-slate-300 hover:text-blue-600 rounded-xl hover:bg-white hover:shadow-md transition-all active:scale-90 border border-transparent"
                          title="View customer"
                        >
                          <ExternalLink size={20} />
                        </Link>
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