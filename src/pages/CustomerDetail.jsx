import { useCallback, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Percent, 
  Clock, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomerData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch customer
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Fetch loans
      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      if (loanError) throw loanError;
      setLoans(loanData || []);
    } catch (error) {
      console.error('Error fetching data:', error.message);
      alert('Error fetching customer details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchCustomerData();
    }
  }, [id, fetchCustomerData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400 animate-pulse flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
          <p className="text-sm font-medium">Loading details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
        <p className="text-slate-500">Customer not found</p>
        <button onClick={() => navigate('/customers')} className="mt-4 text-blue-600 font-medium">Back to Customers</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={() => navigate('/customers')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors group mb-2"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to Customers</span>
      </button>

      {/* Customer Header */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="relative">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2.5rem] bg-slate-100 overflow-hidden border-4 border-white shadow-xl">
              <img src={customer.photo_url || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop'} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-2xl shadow-lg border-2 border-white">
              <CheckCircle2 size={16} />
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">{customer.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                  Customer Profile
                </span>
                <span className="text-xs text-slate-400 font-medium font-mono">ID: {customer.id_number}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Phone</p>
                  <p className="text-sm font-semibold text-slate-700">{customer.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Email</p>
                  <p className="text-sm font-semibold text-slate-700">{customer.email || 'Not provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Address</p>
                  <p className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">{customer.address || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loan Details Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <CreditCard className="text-blue-600" size={20} />
          Loan History
        </h2>

        {loans.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 italic">
            No loans recorded for this customer
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {loans.map((loan) => (
              <div key={loan.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
                <div className="bg-slate-50/50 p-6 sm:p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-100 min-w-[240px]">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Principal Amount</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-slate-500">Ksh</span>
                    <span className="text-3xl font-black text-slate-900">{Number(loan.amount).toLocaleString()}</span>
                  </div>
                  <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider self-start ${
                    loan.status === 'disbursed' || loan.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    loan.status === 'pending' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                    'bg-slate-50 text-slate-600 border border-slate-200'
                  }`}>
                    <Clock size={12} />
                    {loan.status}
                  </div>
                </div>

                <div className="flex-1 p-6 sm:p-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Percent size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Interest Rate</span>
                    </div>
                    <p className="text-lg font-bold text-slate-800">{loan.interest_rate}%</p>
                    <p className="text-[10px] text-slate-400">Fixed rate</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Disbursement Date</span>
                    </div>
                    <p className="text-lg font-bold text-slate-800">
                      {loan.disbursement_date ? new Date(loan.disbursement_date).toLocaleDateString() : 'Pending'}
                    </p>
                    <p className="text-[10px] text-slate-400">Funds released</p>
                  </div>

                  <div className="space-y-1 text-rose-600">
                    <div className="flex items-center gap-2 opacity-70">
                      <Calendar size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Due Date</span>
                    </div>
                    <p className="text-lg font-bold">
                      {loan.due_date ? new Date(loan.due_date).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-[10px] opacity-70 italic font-medium">Repayment deadline</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <DollarSign size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Repayment</span>
                    </div>
                    <p className="text-lg font-bold text-emerald-600">
                      Ksh {Number(loan.repayment_amount).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400">Total payable</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ID Previews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">ID Front</h3>
          <div className="aspect-[1.6/1] rounded-3xl bg-slate-100 overflow-hidden border border-slate-200 shadow-inner group cursor-zoom-in">
            <img src={customer.id_front_url} alt="ID Front" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">ID Back</h3>
          <div className="aspect-[1.6/1] rounded-3xl bg-slate-100 overflow-hidden border border-slate-200 shadow-inner group cursor-zoom-in">
            <img src={customer.id_back_url} alt="ID Back" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
          </div>
        </div>
      </div>
    </div>
  );
}
