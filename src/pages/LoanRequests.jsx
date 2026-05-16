import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function LoanRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  async function fetchRequests() {
    setLoading(true);
    setErrorMessage(null);
    const { data, error } = await supabase
      .from('loan_requests')
      .select('*, customer:customer_id(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) setErrorMessage(error.message);
    if (data) setRequests(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (requestId, action, requestData) => {
    setProcessingId(requestId);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      alert('Unable to determine logged in user: ' + userError.message);
      setProcessingId(null);
      return;
    }

    if (!user) {
      alert('You must be logged in to process loan requests.');
      setProcessingId(null);
      return;
    }

    // 1. Update Request
    const { error: rError } = await supabase
      .from('loan_requests')
      .update({ status: action, officer_id: user?.id })
      .eq('id', requestId);

    if (rError) {
      alert('Error updating request: ' + rError.message);
      setProcessingId(null);
      return;
    }

    // 2. If approved, create a new active loan
    if (action === 'approved') {
      const disbursementDate = new Date();
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + requestData.tenure_months);
      
      const interestRate = 12; // Standard for repeat customers
      
      const { error: loanError } = await supabase
        .from('loans')
        .insert([{
          customer_id: requestData.customer_id,
          amount: requestData.amount,
          tenure_months: requestData.tenure_months,
          interest_rate: interestRate,
          status: 'active',
          disbursement_date: disbursementDate.toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          repayment_amount: requestData.amount * (1 + (interestRate / 100)),
          officer_id: user?.id,
        }]);

      if (loanError) {
        alert('Request updated, but loan creation failed: ' + loanError.message);
      }
    }

    await fetchRequests();
    setProcessingId(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Loan Requests</h2>
          <p className="text-sm font-medium text-slate-400 mt-1">Pending approvals for repeat customers</p>
        </div>
        <div className="bg-slate-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-3 shadow-md">
          <Clock size={18} className="text-blue-400" />
          <span className="font-semibold text-sm">{requests.length} Pending</span>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <AnimatePresence>
          {loading ? (
            <div className="col-span-2 text-center py-32 text-slate-400 text-sm">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="col-span-2 bg-white rounded-3xl border-2 border-dashed border-slate-100 py-32 flex flex-col items-center justify-center text-slate-400 group relative">
              <CheckCircle2 size={48} className="mb-4 text-slate-200" />
              <p className="font-semibold text-lg text-slate-700">No pending requests</p>
              <p className="text-sm mt-1">All requests have been processed.</p>
            </div>
          ) : requests.map((req) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={req.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col h-full group"
            >
              <div className="p-8 border-b border-slate-50">
                <div className="flex items-center gap-5 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden border-2 border-white shadow-sm">
                    <img src={req.customer.photo_url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-slate-800 truncate">{req.customer.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <User size={12} className="text-slate-300" />
                      Customer since {new Date(req.customer.created_at).getFullYear()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-medium border border-blue-100">
                       Tier A
                     </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-medium">Amount</label>
                    <div className="flex items-center gap-1 text-xl font-bold text-slate-800 tracking-tight">
                      <span className="text-slate-300 text-xs font-medium">KES</span>
                      {req.amount.toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-medium">Tenure</label>
                    <div className="flex items-center gap-1 text-xl font-bold text-slate-800 tracking-tight">
                      {req.tenure_months} <span className="text-sm text-slate-300">Months</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/50 p-4 flex items-center gap-4 border-b border-slate-100">
                <AlertTriangle size={16} className="text-emerald-500 shrink-0" />
                <p className="text-[11px] text-slate-500">
                   Prior history: <span className="text-slate-700 font-semibold">4 loans successfully repaid</span>.
                </p>
              </div>

              <div className="p-6 grid grid-cols-2 gap-4 mt-auto">
                <button
                  onClick={() => handleAction(req.id, 'rejected', req)}
                  disabled={processingId === req.id}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-500 text-xs font-semibold rounded-2xl hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all active:scale-95 disabled:opacity-60"
                >
                  <XCircle size={16} />
                  Reject
                </button>
                <button
                  onClick={() => handleAction(req.id, 'approved', req)}
                  disabled={processingId === req.id}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-xs font-semibold rounded-2xl hover:bg-blue-700 transition-all shadow-sm active:scale-95 disabled:opacity-60"
                >
                  <CheckCircle2 size={16} />
                   Approve
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
