import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { 
  ArrowLeft, 
  Camera,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Clock,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';

export default function NewLoan() {
  const location = useLocation();
  const navigate = useNavigate();
  const lead = location.state?.lead;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [customerData, setCustomerData] = useState({
    name: lead?.name || '',
    phone: lead?.phone || '',
    email: lead?.email || '',
    id_number: '',
    address: '',
    photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    id_front_url: '',
    id_back_url: '',
  });

  const [loanData, setLoanData] = useState({
    amount: 2500,
    tenure: 6,
    interestRate: 15,
  });

  const [createdLoanId, setCreatedLoanId] = useState(null);
  const [idFrontFile, setIdFrontFile] = useState(null);
  const [idBackFile, setIdBackFile] = useState(null);

  const [previews, setPreviews] = useState({
    profile: lead?.photo_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    idFront: '',
    idBack: '',
  });

  const validateStep = () => {
    if (step === 1) {
      if (!customerData.name.trim()) {
        alert("Name is required");
        return false;
      }
      if (!customerData.phone.startsWith('254') || customerData.phone.length < 12) {
        alert("Valid phone number starting with 254 is required (e.g. 254712345678)");
        return false;
      }
      if (!customerData.id_number.trim()) {
        alert("ID Number is required");
        return false;
      }
      if (!idFrontFile || !idBackFile) {
        alert("Front and Back ID photos are required");
        return false;
      }
    }
    if (step === 2) {
      if (loanData.amount < 2500) {
        alert("Minimum loan amount is KES 2,500");
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handleFileChange = (e, side) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        if (side === 'profile') {
          setPreviews(prev => ({ ...prev, profile: base64String }));
        } else if (side === 'front') {
          setIdFrontFile(file);
          setPreviews(prev => ({ ...prev, idFront: base64String }));
        } else {
          setIdBackFile(file);
          setPreviews(prev => ({ ...prev, idBack: base64String }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateAll = async () => {
    if (!validateStep()) return;
    
    setLoading(true);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;

    if (sessionError || !user) {
      alert(sessionError?.message || 'You must be logged in to create a loan.');
      setLoading(false);
      return;
    }

    // 1. Create Customer
    const formattedPhone = customerData.phone.trim();
    const customerPayload = {
      name: customerData.name,
      phone: formattedPhone,
      email: customerData.email || '',
      id_number: customerData.id_number,
      address: customerData.address,
      photo_url: previews.profile,
      id_front_url: previews.idFront || 'https://images.unsplash.com/photo-1621252179027-94459d278660?w=400&h=250&fit=crop',
      id_back_url: previews.idBack || 'https://images.unsplash.com/photo-1621252179027-94459d278660?w=400&h=250&fit=crop',
      officer_id: user?.id,
    };

    if (lead?.id) {
      customerPayload.lead_id = lead.id;
    }

    let { data: customer, error: cError } = await supabase
      .from('customers')
      .insert([customerPayload])
      .select()
      .single();

    if (cError) {
      // If it's a foreign key violation on lead_id, try inserting without it
      if (cError.code === '23503' && cError.message.includes('lead_id')) {
        console.warn('Lead ID was invalid or deleted, retrying without lead link...');
        delete customerPayload.lead_id;
        const { data: retryData, error: retryError } = await supabase
          .from('customers')
          .insert([customerPayload])
          .select()
          .single();
        
        customer = retryData;
        cError = retryError;
      }
    }

    if (cError) {
      alert('Error creating customer: ' + cError.message);
      setLoading(false);
      return;
    }

    if (!customer) {
      alert('Error: Customer creation returned no data');
      setLoading(false);
      return;
    }

    // 2. Create Loan (Initial status is pending)
    const disbursementDate = new Date();
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + loanData.tenure);

    const { data: loan, error: lError } = await supabase
      .from('loans')
      .insert([{
        customer_id: customer.id,
        amount: loanData.amount,
        tenure_months: loanData.tenure,
        interest_rate: loanData.interestRate,
        status: 'pending',
        disbursement_date: disbursementDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        repayment_amount: loanData.amount * (1 + (loanData.interestRate / 100)),
        officer_id: user?.id,
      }])
      .select()
      .single();

    if (lError) {
      alert('Error creating loan: ' + lError.message);
      setLoading(false);
      return;
    }

    setCreatedLoanId(loan.id);

    // 3. Mark Lead as Converted
    if (lead?.id) {
      await supabase
        .from('leads')
        .update({ status: 'converted' })
        .eq('id', lead.id);
    }

    setStep(4); // Move to Approval step
    setLoading(false);
  };

  const handleUpdateStatus = async (status) => {
    if (!createdLoanId || loading) return;
    setLoading(true);
    const nextStatus = status === 'disbursed' ? 'active' : status;
    const { error } = await supabase
      .from('loans')
      .update({ status: nextStatus })
      .eq('id', createdLoanId);
    
    if (error) {
      alert(error.message);
    } else {
      if (status === 'approved') {
        setStep(5); // Move to Disbursement step
      } else if (status === 'disbursed') {
        navigate('/active-loans');
      } else {
        navigate('/');
      }
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-12">
      <div className="flex items-center gap-4 sm:gap-6 mb-8 sm:mb-12">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 sm:p-3 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 rounded-2xl transition-all shadow-sm active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">New Loan Setup</h2>
          <p className="text-[10px] sm:text-sm font-medium text-slate-400 mt-1">Add customer and loan details</p>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="flex items-center gap-2 sm:gap-4 mb-10 sm:mb-16 overflow-x-auto no-scrollbar pb-2">
        <div className={`flex items-center gap-3 transition-all ${step >= 1 ? 'opacity-100' : 'opacity-30'}`}>
          <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center font-semibold transition-all ${step >= 1 ? 'border-blue-100 bg-blue-600 text-white shadow-md' : 'border-slate-100 bg-white text-slate-300'}`}>1</div>
          <div className="hidden sm:block">
            <p className="text-[10px] font-medium text-slate-400 mb-0.5">Step 1</p>
            <p className="text-sm font-semibold text-slate-800">Customer</p>
          </div>
        </div>
        <div className="flex-1 h-1 bg-slate-100 rounded-full relative overflow-hidden">
          <div className={`absolute inset-0 bg-blue-600 transition-all duration-500`} style={{ width: step > 1 ? '100%' : '0%' }}></div>
        </div>
        <div className={`flex items-center gap-3 transition-all ${step >= 2 ? 'opacity-100' : 'opacity-30'}`}>
          <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center font-semibold transition-all ${step >= 2 ? 'border-blue-100 bg-blue-600 text-white shadow-md' : 'border-slate-100 bg-white text-slate-300'}`}>2</div>
          <div className="hidden sm:block">
            <p className="text-[10px] font-medium text-slate-400 mb-0.5">Step 2</p>
            <p className="text-sm font-semibold text-slate-800">Loan</p>
          </div>
        </div>
        <div className="flex-1 h-1 bg-slate-100 rounded-full relative overflow-hidden">
          <div className={`absolute inset-0 bg-blue-600 transition-all duration-500`} style={{ width: step > 2 ? '100%' : '0%' }}></div>
        </div>
        <div className={`flex items-center gap-3 transition-all ${step >= 3 ? 'opacity-100' : 'opacity-30'}`}>
          <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center font-semibold transition-all ${step >= 3 ? 'border-blue-100 bg-blue-600 text-white shadow-md' : 'border-slate-100 bg-white text-slate-300'}`}>3</div>
          <div className="hidden sm:block">
            <p className="text-[10px] font-medium text-slate-400 mb-0.5">Step 3</p>
            <p className="text-sm font-semibold text-slate-800">Final</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 sm:p-10 rounded-[2rem] sm:border border-slate-200 sm:shadow-sm space-y-8 sm:space-y-10">
              <div className="flex items-center gap-4 sm:gap-8">
                <div className="relative group">
                  <div className="w-28 h-28 rounded-3xl bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-2xl group-hover:rotate-3 transition-all duration-500">
                    <img src={previews.profile} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <input 
                    type="file" 
                    id="profile-photo" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => handleFileChange(e, 'profile')} 
                  />
                  <label 
                    htmlFor="profile-photo"
                    className="absolute -bottom-3 -right-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-xl hover:bg-slate-50 transition-all active:scale-90 text-blue-600 cursor-pointer"
                  >
                    <Camera size={20} />
                  </label>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg text-slate-800 mb-1">Customer Photo</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">Upload a photo for identification.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 text-left">
                  <label className="text-xs font-medium text-slate-400 ml-1">Full Name</label>
                  <input
                    type="text"
                    value={customerData.name}
                    onChange={e => setCustomerData({ ...customerData, name: e.target.value })}
                    placeholder="Full Identification Name"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-blue-200 focus:bg-white transition-all text-sm font-medium text-slate-800 placeholder:text-slate-300"
                  />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-xs font-medium text-slate-400 ml-1">Phone Number</label>
                  <input
                    type="text"
                    value={customerData.phone}
                    onChange={e => setCustomerData({ ...customerData, phone: e.target.value })}
                    placeholder="254712345678"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-blue-200 focus:bg-white transition-all text-sm font-medium text-slate-800 placeholder:text-slate-300"
                  />
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-xs font-medium text-slate-400 ml-1">ID Number</label>
                  <input
                    type="text"
                    required
                    value={customerData.id_number}
                    onChange={e => setCustomerData({ ...customerData, id_number: e.target.value })}
                    placeholder="National ID Number"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-blue-200 focus:bg-white transition-all text-sm font-medium text-slate-800 placeholder:text-slate-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                   <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-400 ml-1">ID Front Photo</label>
                      <input 
                        type="file" 
                        id="id-front" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleFileChange(e, 'front')} 
                      />
                      <label 
                        htmlFor="id-front"
                        className={`w-full aspect-video border rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${
                          idFrontFile ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-dashed border-slate-200 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        {idFrontFile ? (
                          <img src={previews.idFront} alt="Front ID" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Camera size={24} className="mb-2" />
                            <span className="text-[10px] font-medium uppercase tracking-widest">Upload Front</span>
                          </>
                        )}
                      </label>
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-400 ml-1">ID Back Photo</label>
                      <input 
                        type="file" 
                        id="id-back" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleFileChange(e, 'back')} 
                      />
                      <label 
                        htmlFor="id-back"
                        className={`w-full aspect-video border rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${
                          idBackFile ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-dashed border-slate-200 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        {idBackFile ? (
                          <img src={previews.idBack} alt="Back ID" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Camera size={24} className="mb-2" />
                            <span className="text-[10px] font-medium uppercase tracking-widest">Upload Back</span>
                          </>
                        )}
                      </label>
                   </div>
                </div>
                <div className="space-y-2 text-left md:col-span-2">
                  <label className="text-xs font-medium text-slate-400 ml-1">Physical Address</label>
                  <textarea
                    rows={3}
                    value={customerData.address}
                    onChange={e => setCustomerData({ ...customerData, address: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-blue-200 focus:bg-white transition-all text-sm font-medium text-slate-800 placeholder:text-slate-300 resize-none"
                    placeholder="Enter full address..."
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8 sm:space-y-10">
              <div className="grid grid-cols-1 gap-6 sm:gap-8">
                <div className="space-y-3 text-left">
                  <label className="text-xs font-medium text-slate-400 ml-1">Loan Amount (KES)</label>
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-lg">KES</div>
                    <input
                      type="number"
                      min="2500"
                      value={loanData.amount}
                      onChange={e => setLoanData({ ...loanData, amount: Number(e.target.value) })}
                      className="w-full pl-16 pr-6 py-4 sm:py-5 bg-slate-50 border border-slate-100 rounded-3xl focus:outline-none focus:border-blue-300 focus:bg-white transition-all text-2xl sm:text-3xl font-bold text-slate-800"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3 text-left">
                    <label className="text-xs font-medium text-slate-400 ml-1">Loan Term</label>
                    <div className="relative">
                      <select
                        value={loanData.tenure}
                        onChange={e => setLoanData({ ...loanData, tenure: Number(e.target.value) })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-blue-200 focus:bg-white transition-all text-sm font-medium text-slate-800 appearance-none cursor-pointer"
                      >
                        <option value={1}>1 Month</option>
                        <option value={3}>3 Months</option>
                        <option value={6}>6 Months</option>
                        <option value={12}>12 Months</option>
                        <option value={24}>24 Months</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronRight size={20} className="rotate-90" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 text-left">
                    <label className="text-xs font-medium text-slate-400 ml-1">Interest Rate (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={loanData.interestRate}
                        onChange={e => setLoanData({ ...loanData, interestRate: Number(e.target.value) })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-blue-200 focus:bg-white transition-all text-sm font-medium text-slate-800"
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 font-bold">%</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-0"></div>
                <div className="flex items-center gap-4 text-emerald-500 mb-10 relative z-10">
                   <ShieldCheck size={32} />
                   <div>
                     <h3 className="font-bold text-xl text-slate-800 leading-none">Ready for Submission</h3>
                     <p className="text-xs font-medium text-slate-400 mt-1">Review details before creating loan</p>
                   </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10 relative z-10">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Customer</label>
                    <p className="text-lg font-bold text-slate-800 leading-tight">{customerData.name}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">ID Number</label>
                    <p className="text-lg font-bold text-slate-800 leading-tight">{customerData.id_number}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Loan Amount</label>
                    <p className="text-3xl font-bold text-slate-800 tracking-tight">KES {loanData.amount.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Total Repayment</label>
                    <p className="text-3xl font-bold text-blue-600 tracking-tight">KES {(loanData.amount * (1 + (loanData.interestRate / 100))).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-10">
              <div className="text-center space-y-4">
                 <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                   <Clock size={40} />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-800">Pending Approval</h3>
                 <p className="text-slate-500 max-w-sm mx-auto">Loan record created. Please authorize this request or mark for further review.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <button 
                   onClick={() => handleUpdateStatus('pending')}
                   disabled={loading}
                   className="px-6 py-4 bg-slate-100 text-slate-600 font-semibold rounded-2xl hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-60"
                 >
                   Stay Pending
                 </button>
                 <button 
                   onClick={() => handleUpdateStatus('rejected')}
                   disabled={loading}
                   className="px-6 py-4 bg-rose-50 text-rose-600 font-semibold rounded-2xl hover:bg-rose-100 transition-all active:scale-95 border border-rose-100 disabled:opacity-60"
                 >
                   Reject
                 </button>
                 <button 
                   onClick={() => handleUpdateStatus('approved')}
                   disabled={loading}
                   className="px-6 py-4 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-60"
                 >
                   Approve
                 </button>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-10">
               <div className="text-center space-y-4">
                 <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                   <CheckCircle2 size={40} />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-800">Ready for Disbursement</h3>
                 <p className="text-slate-500 max-w-sm mx-auto">Approval granted. Funds can now be released to the customer.</p>
              </div>

              <button 
                onClick={() => handleUpdateStatus('disbursed')}
                disabled={loading}
                className="w-full px-6 py-5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-60"
              >
                Disburse Funds
                <ArrowRight size={20} />
              </button>
            </motion.div>
          )}

          <div className="flex items-center justify-between pt-8">
            {step > 1 && step < 4 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-white border border-slate-200 text-slate-400 text-sm font-medium rounded-2xl hover:text-slate-600 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
              >
                Back
              </button>
            ) : (
              <div></div>
            )}
            
            {step < 3 ? (
              <button
                onClick={handleNextStep}
                className="px-6 sm:px-10 py-3 sm:py-4 bg-slate-800 text-white text-sm font-medium rounded-2xl hover:bg-slate-900 transition-all flex items-center gap-3 shadow-md active:scale-95"
              >
                Next Step
                <ChevronRight size={18} />
              </button>
            ) : step === 3 ? (
              <button
                onClick={handleCreateAll}
                disabled={loading}
                className="px-8 sm:px-12 py-3 sm:py-5 bg-blue-600 text-white text-sm font-medium rounded-2xl hover:bg-blue-700 transition-all flex items-center gap-3 shadow-lg active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Create Loan'}
                <CheckCircle2 size={20} />
              </button>
            ) : null}
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-8">
          <div className="bg-slate-800 text-white p-10 rounded-3xl shadow-xl border border-white/5 relative overflow-hidden group">
            
            <h4 className="text-slate-400 text-xs font-medium mb-8">Loan Summary</h4>
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Principal</span>
                <span className="font-bold text-xl">KES {loanData.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Interest ({loanData.interestRate}%)</span>
                <span className="font-bold text-xl text-blue-400">+KES {(loanData.amount * (loanData.interestRate / 100)).toLocaleString()}</span>
              </div>
              <div className="h-px bg-white/10 my-4"></div>
              <div className="flex flex-col gap-1">
                <span className="text-slate-400 text-xs font-medium">Total Repayment</span>
                <span className="text-4xl font-bold text-white tracking-tight">KES {(loanData.amount * (1 + (loanData.interestRate / 100))).toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-10 pt-10 border-t border-white/10">
               <p className="text-xs text-slate-400 leading-relaxed">
                  Monthly Payment: <span className="text-white font-medium">
                    KES {((loanData.amount * (1 + (loanData.interestRate / 100))) / loanData.tenure).toFixed(2)}
                  </span> for {loanData.tenure} months.
               </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative group overflow-hidden">
             <div className="absolute inset-0 bg-blue-50/30 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
             <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-6 relative z-10">Operational Bonus</h4>
             <div className="flex items-center gap-4 relative z-10">
               <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-blue-600 border border-slate-100 shadow-sm">
                 <TrendingUp size={24} />
               </div>
               <p className="text-xs font-black text-slate-900 leading-tight uppercase tracking-tight">
                 Converts lead to verified node<br />
                 <span className="text-blue-600">+25 Dynamic Points</span>
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
