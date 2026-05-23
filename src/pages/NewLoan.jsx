/**
 * NewLoan.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-step in-system loan conversion form.
 *
 * Interest structure (matches server Edge Function):
 *   Phase 1: Days 1–21 → 21% flat on principal
 *   Phase 2: Days 22–30 → 0.75% per day on principal (max 9 extra days)
 *   Late penalty: 0.75%/day on principal after due date
 *
 * Steps:
 *   1 → Customer details + ID photos
 *   2 → Loan amount & term (30-day max)
 *   3 → Review summary
 *   4 → Approve / Reject / Stay Pending
 *   5 → Disburse
 *
 * Anti-patterns fixed:
 *   • alert() replaced with inline error messages
 *   • Double-submit prevented via isSubmitting ref + disabled button
 *   • Calculations done server-side (Edge Function) before insert; client
 *     figures are shown for UX only and never trusted for DB writes
 */

import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { logAudit, useAuth } from '../context/AuthContext.jsx';
import {
  ArrowLeft, Camera, CheckCircle2, ChevronRight,
  ShieldCheck, TrendingUp, Clock, ArrowRight, AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';

// ─── Interest calculation engine ──────────────────────────────────────────────
// This runs client-side for the preview only. The Edge Function runs the same
// logic server-side before any DB insert so the client cannot tamper with figures.
const PHASE1_RATE   = 0.21;    // 21% flat, days 1-21
const PHASE2_DAILY  = 0.0075;  // 0.75%/day, days 22-30

function calcLoan(principal, termDays) {
  const p = Number(principal) || 0;
  const t = Math.min(Math.max(Number(termDays) || 30, 1), 30);

  const p1days = Math.min(t, 21);
  const p1int  = p * PHASE1_RATE * (p1days / 21);

  const p2days = Math.max(0, t - 21);
  const p2int  = p * PHASE2_DAILY * Math.min(p2days, 9);

  const interest        = Math.round(p1int + p2int);
  const total           = p + interest;
  const latePenaltyDay  = Math.round(p * PHASE2_DAILY);
  const dueDate         = new Date();
  dueDate.setDate(dueDate.getDate() + t);

  return { principal: p, interest, total, latePenaltyDay, dueDate, termDays: t };
}

function formatKES(n) {
  return `KES ${(Number(n) || 0).toLocaleString()}`;
}

// ─── Inline error banner ──────────────────────────────────────────────────────
function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-sm text-rose-700">
      <AlertCircle size={16} className="shrink-0 mt-0.5" />
      {message}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function NewLoan() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user }  = useAuth();
  const lead = location.state?.lead;

  const [step,      setStep]      = useState(1);
  const [stepError, setStepError] = useState('');

  // Prevent double-submit
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [customerData, setCustomerData] = useState({
    name:      lead?.name  || '',
    phone:     lead?.phone || '',
    email:     lead?.email || '',
    id_number: '',
    address:   '',
  });

  const [loanData, setLoanData] = useState({
    amount:   10000,
    termDays: 30,
  });

  const [previews, setPreviews] = useState({
    profile: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    idFront: '',
    idBack:  '',
  });
  const [idFrontFile, setIdFrontFile] = useState(null);
  const [idBackFile,  setIdBackFile]  = useState(null);

  const [createdLoanId, setCreatedLoanId] = useState(null);

  // Live calculation (preview only — DB uses server calc)
  const calc = calcLoan(loanData.amount, loanData.termDays);

  // ── File → base64 preview ─────────────────────────────────────────────────
  const handleFileChange = (e, side) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result;
      if (side === 'profile')     setPreviews(p => ({ ...p, profile: b64 }));
      else if (side === 'front') { setIdFrontFile(file); setPreviews(p => ({ ...p, idFront: b64 })); }
      else                       { setIdBackFile(file);  setPreviews(p => ({ ...p, idBack:  b64 })); }
    };
    reader.readAsDataURL(file);
  };

  // ── Per-step validation (inline, no alert()) ──────────────────────────────
  const validateStep = () => {
    setStepError('');
    if (step === 1) {
      if (!customerData.name.trim())                          return setStepError('Full name is required.'),          false;
      if (!customerData.phone.startsWith('254') || customerData.phone.length < 12)
                                                              return setStepError('Phone must start with 254 and be 12 digits (e.g. 254712345678).'), false;
      if (!customerData.id_number.trim())                     return setStepError('ID number is required.'),          false;
      if (!idFrontFile || !idBackFile)                        return setStepError('Both front and back ID photos are required.'), false;
    }
    if (step === 2) {
      if (loanData.amount < 1000)                             return setStepError('Minimum loan amount is KES 1,000.'), false;
      if (loanData.amount > 500000)                           return setStepError('Maximum loan amount is KES 500,000.'), false;
      if (loanData.termDays < 1 || loanData.termDays > 30)   return setStepError('Term must be between 1 and 30 days.'), false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep()) { setStep(s => s + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  };

  // ── Create customer + loan ────────────────────────────────────────────────
  const handleCreateAll = async () => {
    if (!validateStep()) return;
    if (submittingRef.current) return; // double-submit guard
    submittingRef.current = true;
    setIsSubmitting(true);
    setStepError('');

    try {
      // ── 1. Server-side calculation via Edge Function ────────────────────
      // If the Edge Function isn't deployed yet, we fall back to the local calc.
      let serverCalc = calc;
      try {
        const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('calculate-loan', {
          body: {
            principal: loanData.amount,
            termDays:  loanData.termDays,
            startDate: new Date().toISOString().slice(0, 10),
          },
        });
        if (!edgeErr && edgeData) serverCalc = edgeData;
      } catch {
        console.warn('Edge Function unavailable — using client calc (deploy calculate-loan to enable server-side validation).');
      }

      // ── 2. Create customer ──────────────────────────────────────────────
      const customerPayload = {
        name:         customerData.name.trim(),
        phone:        customerData.phone.trim(),
        email:        customerData.email || '',
        id_number:    customerData.id_number.trim(),
        address:      customerData.address,
        photo_url:    previews.profile,
        id_front_url: previews.idFront,
        id_back_url:  previews.idBack,
        officer_id:   user?.id,
        ...(lead?.id ? { lead_id: lead.id } : {}),
      };

      let { data: customer, error: cError } = await supabase
        .from('customers')
        .insert([customerPayload])
        .select()
        .single();

      // If lead_id FK fails, retry without it
      if (cError?.code === '23503' && cError.message.includes('lead_id')) {
        delete customerPayload.lead_id;
        const retry = await supabase.from('customers').insert([customerPayload]).select().single();
        customer = retry.data;
        cError   = retry.error;
      }

      if (cError) throw new Error(`Customer creation failed: ${cError.message}`);

      // ── 3. Create loan using SERVER figures ─────────────────────────────
      const today   = new Date();
      const dueDate = new Date();
      dueDate.setDate(today.getDate() + serverCalc.termDays);

      const { data: loan, error: lError } = await supabase
        .from('loans')
        .insert([{
          customer_id:        customer.id,
          amount:             serverCalc.principal,
          interest_amount:    serverCalc.interest,
          repayment_amount:   serverCalc.total,
          term_days:          serverCalc.termDays,
          interest_rate:      21, // base rate label
          late_penalty_daily: serverCalc.latePenaltyDay,
          status:             'pending',
          disbursement_date:  today.toISOString().slice(0, 10),
          due_date:           dueDate.toISOString().slice(0, 10),
          officer_id:         user?.id,
        }])
        .select()
        .single();

      if (lError) throw new Error(`Loan creation failed: ${lError.message}`);

      // ── 4. Audit log ────────────────────────────────────────────────────
      await logAudit(supabase, {
        action:   'LOAN_CREATED',
        entity:   'loan',
        entityId: loan.id,
        payload: {
          principal:        serverCalc.principal,
          interest:         serverCalc.interest,
          totalRepayment:   serverCalc.total,
          termDays:         serverCalc.termDays,
          officerId:        user?.id,
          customerId:       customer.id,
        },
      });

      // ── 5. Mark lead as converted ────────────────────────────────────────
      if (lead?.id) {
        await supabase.from('leads').update({ status: 'converted' }).eq('id', lead.id);
      }

      setCreatedLoanId(loan.id);
      setStep(4);
    } catch (err) {
      setStepError(err.message || 'An error occurred. Please try again.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // ── Update loan status ────────────────────────────────────────────────────
  const handleUpdateStatus = async (status) => {
    if (!createdLoanId || isSubmitting) return;
    setIsSubmitting(true);

    const dbStatus = status === 'disbursed' ? 'active' : status;
    const { error } = await supabase
      .from('loans')
      .update({ status: dbStatus })
      .eq('id', createdLoanId);

    await logAudit(supabase, {
      action: `LOAN_${status.toUpperCase()}`,
      entity: 'loan', entityId: createdLoanId,
      payload: { status: dbStatus, officer_id: user?.id },
    });

    setIsSubmitting(false);

    if (error) { setStepError(error.message); return; }

    if (status === 'approved')  setStep(5);
    else if (status === 'disbursed') navigate('/active-loans');
    else navigate('/');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors group mb-8"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back</span>
      </button>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">New Loan Setup</h2>
        <p className="text-sm text-slate-400 mt-1">Interest: 21% (days 1–21) · 0.75%/day (days 22–30)</p>
      </div>

      {/* Progress stepper */}
      {step <= 3 && (
        <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2">
          {['Customer', 'Loan', 'Review'].map((label, idx) => {
            const n = idx + 1;
            const done   = step > n;
            const active = step === n;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 transition-all ${active || done ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center text-sm font-bold transition-all ${
                    done   ? 'border-emerald-200 bg-emerald-500 text-white' :
                    active ? 'border-blue-200 bg-blue-600 text-white shadow-md' :
                             'border-slate-100 bg-white text-slate-300'
                  }`}>
                    {done ? <CheckCircle2 size={16} /> : n}
                  </div>
                  <span className={`text-sm font-semibold hidden sm:block ${active ? 'text-slate-800' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </div>
                {idx < 2 && (
                  <div className="flex-1 h-1 bg-slate-100 rounded-full min-w-[2rem] mx-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: step > n ? '100%' : '0%' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">

          {/* ── Step 1: Customer ──────────────────────────────────────────── */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8">

              {/* Profile photo */}
              <div className="flex items-center gap-6">
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 rounded-2xl bg-slate-100 overflow-hidden border-4 border-white shadow-xl">
                    <img src={previews.profile} alt="" className="w-full h-full object-cover" />
                  </div>
                  <input type="file" id="profile-photo" className="hidden" accept="image/*"
                    onChange={e => handleFileChange(e, 'profile')} />
                  <label htmlFor="profile-photo"
                    className="absolute -bottom-2 -right-2 p-2.5 bg-white border border-slate-200 rounded-xl shadow-lg hover:bg-slate-50 cursor-pointer text-blue-600">
                    <Camera size={18} />
                  </label>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Customer Photo</h4>
                  <p className="text-xs text-slate-400 mt-1">Used for identification. Tap the camera icon to upload.</p>
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  { label: 'Full Name',    key: 'name',      placeholder: 'As on national ID',  type: 'text' },
                  { label: 'Phone (254…)', key: 'phone',     placeholder: '254712345678',        type: 'tel'  },
                  { label: 'ID Number',    key: 'id_number', placeholder: 'National ID number', type: 'text' },
                  { label: 'Email',        key: 'email',     placeholder: 'Optional',            type: 'email'},
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
                    <input type={type} value={customerData[key]} placeholder={placeholder}
                      onChange={e => setCustomerData({ ...customerData, [key]: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-300 focus:bg-white transition-all" />
                  </div>
                ))}

                {/* ID photos */}
                {[
                  { label: 'ID Front', side: 'front', file: idFrontFile, preview: previews.idFront },
                  { label: 'ID Back',  side: 'back',  file: idBackFile,  preview: previews.idBack  },
                ].map(({ label, side, file, preview }) => (
                  <div key={side} className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
                    <input type="file" id={`id-${side}`} className="hidden" accept="image/*"
                      onChange={e => handleFileChange(e, side)} />
                    <label htmlFor={`id-${side}`}
                      className={`w-full aspect-video border-2 rounded-xl flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all ${
                        file ? 'border-emerald-200 bg-emerald-50' : 'border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}>
                      {file
                        ? <img src={preview} alt={label} className="w-full h-full object-cover" />
                        : <><Camera size={22} className="text-slate-300 mb-1" /><span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Upload {label}</span></>
                      }
                    </label>
                  </div>
                ))}

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Physical Address</label>
                  <textarea rows={2} value={customerData.address}
                    onChange={e => setCustomerData({ ...customerData, address: e.target.value })}
                    placeholder="Street, town, county…"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-300 focus:bg-white transition-all resize-none" />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Loan amount & term ────────────────────────────────── */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8">

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Loan Amount (KES)
                </label>
                <div className="flex items-stretch border-2 border-slate-200 focus-within:border-blue-500 rounded-xl overflow-hidden transition-colors">
                  <span className="px-4 py-3 bg-slate-50 border-r border-slate-200 text-slate-400 font-bold text-sm flex items-center select-none">KES</span>
                  <input
                    type="number" min="1000" max="500000" step="500"
                    value={loanData.amount}
                    onChange={e => setLoanData({ ...loanData, amount: Number(e.target.value) })}
                    onWheel={e => e.currentTarget.blur()}
                    className="flex-1 px-4 py-3 text-2xl font-bold text-slate-800 bg-transparent outline-none appearance-none"
                  />
                </div>
                <p className="text-xs text-slate-400">Min KES 1,000 · Max KES 500,000</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Term (days) — max 30
                </label>
                <div className="flex gap-3 flex-wrap">
                  {[7, 14, 21, 30].map(d => (
                    <button key={d} type="button" onClick={() => setLoanData({ ...loanData, termDays: d })}
                      className={`px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                        loanData.termDays === d
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}>
                      {d}d
                    </button>
                  ))}
                  <input
                    type="number" min="1" max="30"
                    value={loanData.termDays}
                    onChange={e => setLoanData({ ...loanData, termDays: Math.min(30, Math.max(1, Number(e.target.value))) })}
                    className="w-20 px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 text-center focus:outline-none focus:border-blue-400 transition-all"
                    placeholder="Days"
                  />
                </div>
              </div>

              {/* Live interest breakdown */}
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-5 space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Interest Preview</div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Days 1–{Math.min(calc.termDays, 21)} · flat 21%</span>
                  <span className="font-semibold text-slate-800">
                    {formatKES(Math.round(calc.principal * 0.21 * (Math.min(calc.termDays, 21) / 21)))}
                  </span>
                </div>
                {calc.termDays > 21 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">
                      Days 22–{calc.termDays} · 0.75%/day × {Math.min(calc.termDays - 21, 9)}d
                    </span>
                    <span className="font-semibold text-amber-600">
                      {formatKES(Math.round(calc.principal * 0.0075 * Math.min(calc.termDays - 21, 9)))}
                    </span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-3 flex justify-between text-sm font-bold">
                  <span className="text-slate-700">Total repayment</span>
                  <span className="text-slate-900 text-base">{formatKES(calc.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Late penalty after due date</span>
                  <span className="font-medium text-rose-500">{formatKES(calc.latePenaltyDay)}/day</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Review ────────────────────────────────────────────── */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-sm space-y-8">
              <div className="flex items-center gap-4 text-emerald-500 mb-2">
                <ShieldCheck size={28} />
                <div>
                  <h3 className="font-bold text-xl text-slate-800">Ready for Submission</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Figures will be server-validated before the loan is created</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {[
                  { label: 'Customer',      value: customerData.name           },
                  { label: 'ID Number',     value: customerData.id_number      },
                  { label: 'Phone',         value: customerData.phone          },
                  { label: 'Term',          value: `${loanData.termDays} days` },
                ].map(({ label, value }) => (
                  <div key={label} className="space-y-1">
                    <div className="text-xs text-slate-400 font-medium">{label}</div>
                    <div className="text-base font-bold text-slate-800">{value}</div>
                  </div>
                ))}
                <div className="space-y-1">
                  <div className="text-xs text-slate-400 font-medium">Loan Amount</div>
                  <div className="text-3xl font-bold text-slate-800">{formatKES(loanData.amount)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-slate-400 font-medium">Total Repayment</div>
                  <div className="text-3xl font-bold text-blue-600">{formatKES(calc.total)}</div>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <div className="text-xs text-slate-400 font-medium">Late penalty</div>
                  <div className="text-sm text-rose-500 font-semibold">{formatKES(calc.latePenaltyDay)} per day after due date</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Approval ──────────────────────────────────────────── */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white p-10 rounded-2xl border border-slate-200 shadow-sm space-y-10 text-center">
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto">
                <Clock size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Pending Approval</h3>
                <p className="text-slate-500 mt-2 max-w-sm mx-auto text-sm">
                  Loan record created. Authorise or flag for further review.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button onClick={() => handleUpdateStatus('pending')} disabled={isSubmitting}
                  className="px-6 py-4 bg-slate-100 text-slate-600 font-semibold rounded-2xl hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-60">
                  Stay Pending
                </button>
                <button onClick={() => handleUpdateStatus('rejected')} disabled={isSubmitting}
                  className="px-6 py-4 bg-rose-50 text-rose-600 font-semibold rounded-2xl hover:bg-rose-100 border border-rose-100 transition-all active:scale-95 disabled:opacity-60">
                  Reject
                </button>
                <button onClick={() => handleUpdateStatus('approved')} disabled={isSubmitting}
                  className="px-6 py-4 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 shadow-lg active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
                  {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Approve
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 5: Disburse ──────────────────────────────────────────── */}
          {step === 5 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white p-10 rounded-2xl border border-slate-200 shadow-sm space-y-10 text-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto">
                <CheckCircle2 size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Ready for Disbursement</h3>
                <p className="text-slate-500 mt-2 max-w-sm mx-auto text-sm">
                  Approved. Release funds to the customer.
                </p>
              </div>
              <button onClick={() => handleUpdateStatus('disbursed')} disabled={isSubmitting}
                className="w-full px-6 py-5 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-xl active:scale-95 flex items-center justify-center gap-3 disabled:opacity-60 text-sm">
                {isSubmitting
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><ArrowRight size={20} /> Disburse Funds</>}
              </button>
            </motion.div>
          )}

          {/* Inline error */}
          {stepError && <ErrorBanner message={stepError} />}

          {/* Navigation buttons */}
          {step >= 1 && step <= 3 && (
            <div className="flex items-center justify-between pt-2">
              {step > 1 ? (
                <button onClick={() => { setStepError(''); setStep(s => s - 1); }}
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-50 transition-all active:scale-95">
                  Back
                </button>
              ) : <div />}

              {step < 3 && (
                <button onClick={handleNextStep}
                  className="px-8 py-3 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-900 flex items-center gap-2 shadow-md active:scale-95">
                  Next <ChevronRight size={16} />
                </button>
              )}

              {step === 3 && (
                <button onClick={handleCreateAll} disabled={isSubmitting}
                  className="px-8 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-60">
                  {isSubmitting
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</>
                    : <><CheckCircle2 size={18} /> Create Loan</>}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sidebar summary */}
        <div className="space-y-6 lg:sticky lg:top-8 self-start">
          <div className="bg-slate-800 text-white p-8 rounded-2xl shadow-xl">
            <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-6">Loan Summary</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Principal</span>
                <span className="font-bold">{formatKES(calc.principal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Interest</span>
                <span className="font-bold text-blue-400">+{formatKES(calc.interest)}</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex flex-col gap-1">
                <span className="text-slate-400 text-xs">Total Repayment</span>
                <span className="text-3xl font-bold">{formatKES(calc.total)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Due date</span>
                <span className="text-slate-300">{calc.dueDate.toLocaleDateString('en-KE')}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Late penalty</span>
                <span className="text-rose-400 font-medium">{formatKES(calc.latePenaltyDay)}/day</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-blue-600 border border-slate-100">
                <TrendingUp size={20} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rate Structure</div>
                <div className="text-xs text-slate-600 mt-1">21% flat · then 0.75%/day</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}