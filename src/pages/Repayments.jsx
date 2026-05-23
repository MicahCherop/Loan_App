import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase.js';
import { Search, CheckCircle, AlertCircle, Clock, CreditCard, History, Phone, RefreshCw, ChevronRight } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatKES(n) {
  const v = Number(n) || 0;
  return `KES ${v.toLocaleString()}`;
}

function formatDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? '—' : d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

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

// ─── Tab: Record Repayment ────────────────────────────────────────────────────
function RecordRepaymentTab({ showToast }) {
  const [search,     setSearch]     = useState('');
  const [loans,      setLoans]      = useState([]);
  const [searching,  setSearching]  = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [amount,     setAmount]     = useState('');
  const [method,     setMethod]     = useState('cash');
  const [reference,  setReference]  = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [note,       setNote]       = useState('');

  const searchLoans = useCallback(async (q) => {
    if (!q.trim()) { setLoans([]); return; }
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('id, amount, repayment_amount, due_date, status, customer:customer_id(id, name, phone)')
        .in('status', ['active', 'disbursed'])
        .or(`customer_id.in.(${
          // sub-select customers matching name/phone
          'select id from customers where name ilike \'%' + q + '%\' or phone ilike \'%' + q + '%\''
        })`);

      // Simpler approach: fetch via customer name filter
      const { data: customers } = await supabase
        .from('customers')
        .select('id')
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%`);

      const ids = (customers || []).map(c => c.id);
      if (ids.length === 0) { setLoans([]); setSearching(false); return; }

      const { data: loanData, error: loanErr } = await supabase
        .from('loans')
        .select('id, amount, repayment_amount, due_date, status, customer:customer_id(id, name, phone)')
        .in('status', ['active', 'disbursed'])
        .in('customer_id', ids)
        .order('due_date', { ascending: true });

      if (loanErr) { showToast(loanErr.message, 'error'); }
      setLoans(loanData || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSearching(false);
    }
  }, [showToast]);

  // Debounce search
  const searchTimer = useRef(null);
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchLoans(search), 400);
    return () => clearTimeout(searchTimer.current);
  }, [search, searchLoans]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) { showToast('Enter a valid amount.', 'error'); return; }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.from('repayments').insert([{
        loan_id:     selected.id,
        customer_id: selected.customer?.id,
        amount:      amt,
        method,
        reference:   reference || null,
        note:        note      || null,
        officer_id:  session?.user?.id,
      }]);

      if (error) throw error;

      // If fully paid, mark loan as repaid
      if (amt >= Number(selected.repayment_amount || selected.amount)) {
        await supabase.from('loans').update({ status: 'repaid' }).eq('id', selected.id);
      }

      showToast(`Repayment of ${formatKES(amt)} recorded for ${selected.customer?.name}.`);
      setSelected(null); setAmount(''); setReference(''); setNote(''); setSearch(''); setLoans([]);
    } catch (err) {
      showToast(err.message || 'Failed to record repayment.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-semibold text-slate-700 mb-4">Find Active Loan</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by customer name or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 transition-all"
          />
        </div>

        {searching && <div className="mt-4 text-sm text-slate-400 text-center py-4">Searching…</div>}

        {!searching && loans.length > 0 && !selected && (
          <div className="mt-3 divide-y divide-slate-50 border border-slate-100 rounded-xl overflow-hidden">
            {loans.map(loan => {
              const overdue = loan.due_date && new Date(loan.due_date) < new Date();
              return (
                <button
                  key={loan.id}
                  onClick={() => { setSelected(loan); setAmount(String(loan.repayment_amount || loan.amount || '')); }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors text-left"
                >
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{loan.customer?.name}</div>
                    <div className="text-xs text-slate-400">{loan.customer?.phone} · Due {formatDate(loan.due_date)}</div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className={`font-bold text-sm ${overdue ? 'text-rose-600' : 'text-slate-800'}`}>{formatKES(loan.repayment_amount || loan.amount)}</div>
                    {overdue && <div className="text-[10px] text-rose-500 font-medium">OVERDUE</div>}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!searching && search && loans.length === 0 && (
          <div className="mt-4 text-sm text-slate-400 text-center py-4">No active loans found for "{search}".</div>
        )}
      </div>

      {/* Repayment Form */}
      {selected && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">{selected.customer?.name}</div>
              <div className="text-xs text-slate-400">{selected.customer?.phone} · Balance: {formatKES(selected.repayment_amount || selected.amount)}</div>
            </div>
            <button onClick={() => { setSelected(null); setLoans([]); setSearch(''); }} className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
              Change
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Amount (KES)</label>
                <input
                  required type="number" min="1" value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 transition-all"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Payment Method</label>
                <select value={method} onChange={e => setMethod(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 transition-all bg-white">
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>
            {method !== 'cash' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Transaction Reference</label>
                <input type="text" value={reference} onChange={e => setReference(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 transition-all"
                  placeholder={method === 'mpesa' ? 'e.g. QHZ7FG3K4' : 'Reference number'} />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Note (optional)</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 transition-all"
                placeholder="Any note about this payment…" />
            </div>
            <div className="pt-2 flex gap-3">
              <button type="button" onClick={() => { setSelected(null); setLoans([]); setSearch(''); }}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-all text-sm">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {submitting ? 'Recording…' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Repayment History ───────────────────────────────────────────────────
function HistoryTab() {
  const [repayments, setRepayments] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('repayments')
        .select('*, customer:customer_id(name, phone), loan:loan_id(amount, repayment_amount)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setRepayments(data || []);
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const filtered = repayments.filter(r => {
    const text = `${r.customer?.name || ''} ${r.customer?.phone || ''} ${r.reference || ''}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const METHOD_BADGE = {
    cash:   'bg-slate-50 text-slate-600 border-slate-100',
    mpesa:  'bg-emerald-50 text-emerald-700 border-emerald-100',
    bank:   'bg-blue-50 text-blue-700 border-blue-100',
    cheque: 'bg-violet-50 text-violet-700 border-violet-100',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search by name, phone, reference…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 transition-all" />
        </div>
        <button onClick={fetchHistory} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-300 text-sm italic">No repayments found.</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800 text-sm">{r.customer?.name ?? '—'}</div>
                    <div className="text-xs text-slate-400">{r.customer?.phone ?? ''}</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-600">{formatKES(r.amount)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border capitalize ${METHOD_BADGE[r.method] ?? METHOD_BADGE.cash}`}>{r.method ?? 'cash'}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-mono">{r.reference ?? '—'}</td>
                  <td className="px-6 py-4 text-xs text-slate-400">{formatDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Push Payment (Registration Fee) ────────────────────────────────────
function PushPaymentTab({ showToast }) {
  const [phone,      setPhone]      = useState('');
  const [amount,     setAmount]     = useState('500');
  const [customerName, setCustomerName] = useState('');
  const [pushing,    setPushing]    = useState(false);
  const [status,     setStatus]     = useState(null); // null | 'pending' | 'success' | 'failed'
  const [requestId,  setRequestId]  = useState(null);

  const normalisePhone = (raw) => {
    let d = raw.replace(/\D/g, '');
    if (d.startsWith('0'))   d = `254${d.slice(1)}`;
    if (d.startsWith('7') || d.startsWith('1')) d = `254${d}`;
    return d.startsWith('254') && d.length === 12 ? d : null;
  };

  const handlePush = async (e) => {
    e.preventDefault();
    const normalised = normalisePhone(phone);
    if (!normalised) { showToast('Enter a valid Kenyan phone number.', 'error'); return; }
    const amt = Number(amount);
    if (!amt || amt < 1) { showToast('Enter a valid amount.', 'error'); return; }

    setPushing(true);
    setStatus('pending');

    try {
      // Log the push request in Supabase for tracking
      const { data: { session } } = await supabase.auth.getSession();
      const { data: pushRecord, error: pushErr } = await supabase
        .from('push_payment_requests')
        .insert([{
          phone:         normalised,
          amount:        amt,
          customer_name: customerName || null,
          purpose:       'registration_fee',
          status:        'pending',
          initiated_by:  session?.user?.id,
        }])
        .select()
        .single();

      if (pushErr) throw pushErr;
      setRequestId(pushRecord?.id);

      // Call your STK push edge function (Supabase Edge Function or external API)
      const { data: stkData, error: stkErr } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phone:       normalised,
          amount:      amt,
          accountRef:  `REG-${normalised}`,
          description: 'Registration Fee – RFG Capital',
          recordId:    pushRecord?.id,
        },
      });

      if (stkErr) throw stkErr;

      setStatus('success');
      showToast(`STK push sent to ${normalised}. Customer will receive an M-Pesa prompt.`);
    } catch (err) {
      console.error('STK push error:', err);
      setStatus('failed');

      // Update record status
      if (requestId) {
        await supabase.from('push_payment_requests').update({ status: 'failed' }).eq('id', requestId);
      }

      // Graceful degradation: if edge function not set up yet, show manual instruction
      if (err.message?.includes('FunctionNotFound') || err.message?.includes('not found')) {
        showToast('M-Pesa STK push function not deployed yet. Ask customer to pay manually to the till/paybill.', 'error');
      } else {
        showToast(err.message || 'STK push failed.', 'error');
      }
      setStatus(null);
    } finally {
      setPushing(false);
    }
  };

  const reset = () => { setPhone(''); setAmount('500'); setCustomerName(''); setStatus(null); setRequestId(null); };

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Phone size={18} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">M-Pesa STK Push</h3>
            <p className="text-xs text-slate-400">Send a payment prompt to customer's phone</p>
          </div>
        </div>

        {status === 'success' ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-emerald-500" />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">Prompt Sent!</h3>
            <p className="text-sm text-slate-500 mb-6">The customer should receive an M-Pesa prompt on their phone within seconds.</p>
            <button onClick={reset} className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors">
              Send Another
            </button>
          </div>
        ) : (
          <form onSubmit={handlePush} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Customer Name (optional)</label>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                placeholder="For your records"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Phone Number</label>
              <input required type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="0712 345 678"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 transition-all" />
              <p className="text-[10px] text-slate-400 mt-1">Accepts: 07XX, 254XX formats</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Amount (KES)</label>
              <div className="flex gap-3">
                <input required type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-300 transition-all" />
                {/* Quick presets for common registration fees */}
                {[200, 500, 1000].map(preset => (
                  <button key={preset} type="button" onClick={() => setAmount(String(preset))}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${amount === String(preset) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 font-medium">
              ⚠️ This will send an M-Pesa prompt to <strong>{normalisePhone(phone) || 'the phone number above'}</strong>. Ensure the number is correct before sending.
            </div>

            <button type="submit" disabled={pushing}
              className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
              {pushing ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending Prompt…</>
              ) : (
                <><Phone size={16} /> Send M-Pesa Prompt</>
              )}
            </button>
          </form>
        )}
      </div>

      <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 text-xs text-slate-500 space-y-2">
        <div className="font-semibold text-slate-600 mb-3">Setup Required</div>
        <div className="flex items-start gap-2"><ChevronRight size={12} className="shrink-0 mt-0.5 text-slate-400" /><span>Deploy the <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">mpesa-stk-push</code> Supabase Edge Function.</span></div>
        <div className="flex items-start gap-2"><ChevronRight size={12} className="shrink-0 mt-0.5 text-slate-400" /><span>Add a <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">push_payment_requests</code> table to track push history.</span></div>
        <div className="flex items-start gap-2"><ChevronRight size={12} className="shrink-0 mt-0.5 text-slate-400" /><span>Configure your Safaricom Daraja API credentials as Supabase secrets.</span></div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'record',  label: 'Record Repayment', icon: CreditCard },
  { id: 'history', label: 'History',          icon: History    },
  { id: 'push',    label: 'Push Payment',     icon: Phone      },
];

export default function Repayments() {
  const [activeTab, setActiveTab] = useState('record');
  const [toast,     setToast]     = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type });
    timerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Repayments</h2>
        <p className="text-sm text-slate-400 mt-1">Record payments, view history, and push M-Pesa prompts for registration fees.</p>
      </div>

      <Toast toast={toast} />

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'record'  && <RecordRepaymentTab showToast={showToast} />}
      {activeTab === 'history' && <HistoryTab />}
      {activeTab === 'push'    && <PushPaymentTab showToast={showToast} />}
    </div>
  );
}