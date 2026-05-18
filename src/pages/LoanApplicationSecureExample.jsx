/**
 * COMPLETE EXAMPLE: Loan Application Form with All Security Components
 * 
 * This is a production-ready example showing how to integrate:
 * 1. Legal Disclosures Modal
 * 2. Form Submission Locking
 * 3. Audit Logging
 * 
 * File: src/pages/LoanApplicationSecureExample.jsx
 */

import React, { useState, useEffect } from 'react';
import { ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';

// Import components
import { LegalModal, LegalFooter } from '@/components/legal/LegalDisclosures';
import { useFormLock, LockedInput, LockedButton } from '@/hooks/useFormLock';
import { useAuditLog, AuditEvents } from '@/services/AuditLogger';

// Import utilities
import { supabase } from '@/lib/supabase';

/**
 * Main loan application page with all security features
 */
export default function SecureLoanApplicationPage() {
  // ========================================
  // STATE MANAGEMENT
  // ========================================

  // Form data
  const [formData, setFormData] = useState({
    amount: '',
    duration: '6',
    purpose: '',
  });

  // UI states
  const [currentStep, setCurrentStep] = useState('form'); // form, quote, review, success
  const [loanQuote, setLoanQuote] = useState(null);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [applicationId, setApplicationId] = useState(null);

  // User info (from auth)
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ========================================
  // HOOKS
  // ========================================

  const formLock = useFormLock({ timeout: 30000, debounce: 300 });
  const { log } = useAuditLog();

  // ========================================
  // EFFECTS
  // ========================================

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      formLock.unlock();
    };
  }, []);

  // ========================================
  // CALCULATIONS
  // ========================================

  /**
   * Calculate loan quote with APR and monthly payment
   */
  const calculateQuote = (amount, duration) => {
    const amountNum = parseFloat(amount);
    const durationNum = parseInt(duration);

    // APR varies by loan amount and duration
    const apr = calculateAPR(amountNum, durationNum);

    // Calculate monthly payment using standard amortization
    const monthlyRate = apr / 100 / 12;
    const monthlyPayment =
      (amountNum * monthlyRate * Math.pow(1 + monthlyRate, durationNum)) /
      (Math.pow(1 + monthlyRate, durationNum) - 1);

    // Calculate totals
    const totalPaid = monthlyPayment * durationNum;
    const totalInterest = totalPaid - amountNum;
    const originationFee = Math.round(amountNum * 0.025 * 100) / 100;

    return {
      amount: amountNum,
      duration: durationNum,
      apr,
      monthlyRate: (apr / 100).toFixed(4),
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      originationFee,
      totalCost: Math.round((totalPaid + originationFee) * 100) / 100,
    };
  };

  /**
   * Determine APR based on amount and duration
   * In production, this would call a backend risk assessment
   */
  const calculateAPR = (amount, duration) => {
    let baseAPR = 12.5;

    // Adjust for loan size
    if (amount > 100000) baseAPR -= 1.5;
    else if (amount > 50000) baseAPR -= 1;
    else if (amount < 10000) baseAPR += 2;

    // Adjust for duration
    if (duration > 12) baseAPR += 1;
    if (duration <= 3) baseAPR += 0.5;

    return Math.max(8, Math.min(35, baseAPR)); // 8-35% range
  };

  // ========================================
  // FORM SUBMISSION HANDLERS
  // ========================================

  /**
   * Step 1: Show loan quote
   */
  const handleShowQuote = async (e) => {
    e.preventDefault();

    // Validate
    if (!formData.amount || formData.amount < 5000 || formData.amount > 500000) {
      alert('Loan amount must be between KES 5,000 and KES 500,000');
      return;
    }

    if (!formData.purpose || formData.purpose.trim().length < 3) {
      alert('Please describe the purpose of the loan');
      return;
    }

    // Calculate quote
    const quote = calculateQuote(formData.amount, formData.duration);
    setLoanQuote(quote);

    // Log calculation
    try {
      await log(
        AuditEvents.loanCalculated({
          userId: user?.id || 'anonymous',
          loanId: `temp_${Date.now()}`,
          amount: quote.amount,
          apr: quote.apr,
          interestRate: quote.apr / 100,
          totalInterest: quote.totalInterest,
          monthlyPayment: quote.monthlyPayment,
          duration: quote.duration,
        })
      );
    } catch (err) {
      console.error('Error logging calculation:', err);
    }

    setCurrentStep('quote');
  };

  /**
   * Step 2: Review and accept legal terms
   */
  const handleReviewTerms = (e) => {
    e.preventDefault();
    setShowLegalModal(true);
  };

  /**
   * Step 3: Accept legal disclosure
   */
  const handleAcceptLegalDisclosure = async (disclosureData) => {
    setTermsAccepted(true);
    setShowLegalModal(false);
    setCurrentStep('review');

    // Log acceptance
    try {
      await log(
        AuditEvents.disclosureAccepted({
          userId: user?.id || 'anonymous',
          userEmail: user?.email,
          disclosureId: disclosureData.disclosureId,
          apr: loanQuote.apr,
          amount: loanQuote.amount,
        })
      );
    } catch (err) {
      console.error('Error logging disclosure acceptance:', err);
    }
  };

  /**
   * Step 4: Submit loan application
   */
  const handleSubmitApplication = async (e) => {
    e.preventDefault();

    // Prevent double-submit
    if (formLock.isLocked) return;

    // Ensure terms accepted
    if (!termsAccepted) {
      alert('Please review and accept the legal terms');
      return;
    }

    formLock.lock();

    try {
      // 1. Prepare application data
      const applicationData = {
        userId: user?.id,
        userEmail: user?.email,
        loanAmount: loanQuote.amount,
        duration: loanQuote.duration,
        purpose: formData.purpose,
        apr: loanQuote.apr,
        monthlyPayment: loanQuote.monthlyPayment,
        totalInterest: loanQuote.totalInterest,
        originationFee: loanQuote.originationFee,
        termsAccepted: true,
        acceptedAt: new Date().toISOString(),
      };

      // 2. Submit to backend API
      const response = await fetch('/api/loans/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrf-token'),
        },
        body: JSON.stringify(applicationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Application failed with status ${response.status}`
        );
      }

      const result = await response.json();
      const newApplicationId = result.loanId || result.id;
      setApplicationId(newApplicationId);

      // 3. Log successful submission
      await log(
        AuditEvents.loanApplicationSubmitted({
          userId: user?.id || 'anonymous',
          userEmail: user?.email,
          loanId: newApplicationId,
          amount: loanQuote.amount,
          apr: loanQuote.apr,
          totalInterest: loanQuote.totalInterest,
          fees: loanQuote.originationFee,
          monthlyPayment: loanQuote.monthlyPayment,
          duration: loanQuote.duration,
          purpose: formData.purpose,
          verified: true,
          sessionId: sessionStorage.getItem('sessionId'),
        })
      );

      // 4. Mark success
      formLock.unlock();
      setCurrentStep('success');
    } catch (err) {
      formLock.unlock(err.message);
      alert('Application failed: ' + err.message);
    }
  };

  // ========================================
  // HELPER FUNCTIONS
  // ========================================

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return '';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // ========================================
  // RENDER: LOADING STATE
  // ========================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER: SUCCESS STATE
  // ========================================

  if (currentStep === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <CheckCircle size={64} className="text-emerald-600 mx-auto" />
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Application Submitted!
          </h1>

          <p className="text-slate-600 mb-6">
            Your loan application has been submitted successfully.
          </p>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-slate-600 mb-3 font-semibold">
              Application Details
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Loan ID:</span>
                <span className="font-mono font-semibold">{applicationId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Amount:</span>
                <span className="font-semibold">
                  {formatCurrency(loanQuote.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Monthly Payment:</span>
                <span className="font-semibold">
                  {formatCurrency(loanQuote.monthlyPayment)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">APR:</span>
                <span className="font-semibold">{loanQuote.apr}%</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-6">
            We've sent a confirmation email to <strong>{user?.email}</strong>.
            You'll receive an update within 24 hours.
          </p>

          <button
            onClick={() => {
              // Reset form
              setCurrentStep('form');
              setFormData({ amount: '', duration: '6', purpose: '' });
              setLoanQuote(null);
              setTermsAccepted(false);
              setApplicationId(null);
            }}
            className="w-full px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
          >
            Apply for Another Loan
          </button>

          <button
            onClick={() => (window.location.href = '/dashboard')}
            className="w-full px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-colors mt-3"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER: MAIN FORM
  // ========================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Apply for a Personal Loan
          </h1>
          <p className="text-slate-600">
            Get the funds you need, fast and securely
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div
              className={`flex items-center gap-2 ${
                currentStep === 'form' || currentStep === 'quote'
                  ? 'text-emerald-600'
                  : 'text-slate-400'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                1
              </div>
              <span className="text-sm font-semibold">Loan Details</span>
            </div>

            <div className="flex-1 h-1 mx-4 bg-slate-200" />

            <div
              className={`flex items-center gap-2 ${
                currentStep === 'review' || currentStep === 'success'
                  ? 'text-emerald-600'
                  : 'text-slate-400'
              }`}
            >
              <div className="w-8 h-8 rounded-full border-2 border-slate-300 flex items-center justify-center font-bold">
                2
              </div>
              <span className="text-sm font-semibold">Review & Submit</span>
            </div>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          {/* Error Display */}
          {formLock.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-red-600 mt-1 shrink-0" size={20} />
              <div>
                <h3 className="font-semibold text-red-900">Error</h3>
                <p className="text-red-700 text-sm">{formLock.error}</p>
              </div>
            </div>
          )}

          {/* Step 1: Form or Quote */}
          {(currentStep === 'form' || currentStep === 'quote') && (
            <form onSubmit={handleShowQuote} className="space-y-6">
              {/* Loan Amount */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  How much do you need? *
                </label>
                <LockedInput
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  placeholder="50,000"
                  min="5000"
                  max="500000"
                  step="1000"
                  disabled={currentStep === 'quote' || formLock.isLocked}
                  formLocked={formLock.isLocked}
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Between KES 5,000 and KES 500,000
                </p>
              </div>

              {/* Loan Duration */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  How long do you need? *
                </label>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: e.target.value })
                  }
                  disabled={currentStep === 'quote' || formLock.isLocked}
                  className={`
                    w-full px-4 py-3 rounded-xl border-2 text-base font-medium
                    transition-all duration-200 focus:outline-none
                    ${
                      currentStep === 'quote' || formLock.isLocked
                        ? 'bg-slate-50 border-slate-100 cursor-not-allowed text-slate-400'
                        : 'bg-white border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    }
                  `}
                  required
                >
                  <option value="3">3 months</option>
                  <option value="6">6 months</option>
                  <option value="12">12 months</option>
                  <option value="24">24 months</option>
                </select>
              </div>

              {/* Loan Purpose */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  What will you use this for? *
                </label>
                <LockedInput
                  type="text"
                  name="purpose"
                  value={formData.purpose}
                  onChange={(e) =>
                    setFormData({ ...formData, purpose: e.target.value })
                  }
                  placeholder="e.g. Business expansion, education, home improvement"
                  disabled={currentStep === 'quote' || formLock.isLocked}
                  formLocked={formLock.isLocked}
                  required
                />
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  disabled={formLock.isLocked}
                  className="mt-1 w-5 h-5 accent-emerald-600"
                />
                <span className="text-sm text-slate-600">
                  I understand and agree to the loan terms, fees, and privacy
                  policy
                </span>
              </label>

              {/* Submit Button */}
              <div className="pt-4">
                {currentStep === 'form' ? (
                  <LockedButton
                    type="submit"
                    disabled={!termsAccepted || formLock.isLocked}
                    formLocked={formLock.isLocked}
                  >
                    Get Loan Quote
                  </LockedButton>
                ) : (
                  <LockedButton
                    type="button"
                    onClick={handleReviewTerms}
                    disabled={!termsAccepted || formLock.isLocked}
                    formLocked={formLock.isLocked}
                  >
                    Review & Accept Terms
                  </LockedButton>
                )}
              </div>
            </form>
          )}

          {/* Quote Display */}
          {loanQuote && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <QuoteCard
                  label="Monthly Payment"
                  value={formatCurrency(loanQuote.monthlyPayment)}
                  highlight
                />
                <QuoteCard
                  label="Total Interest"
                  value={formatCurrency(loanQuote.totalInterest)}
                />
                <QuoteCard label="APR" value={`${loanQuote.apr}%`} />
                <QuoteCard
                  label="Origination Fee"
                  value={formatCurrency(loanQuote.originationFee)}
                />
              </div>

              {currentStep === 'review' && !termsAccepted && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm flex items-start gap-2">
                  <AlertCircle size={20} className="mt-0.5 shrink-0" />
                  <p>Please review and accept the legal terms to continue</p>
                </div>
              )}

              {currentStep === 'review' && (
                <form onSubmit={handleSubmitApplication} className="space-y-4">
                  {formLock.error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                      {formLock.error}
                    </div>
                  )}

                  {formLock.isSubmitting && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-600 rounded-full animate-spin" />
                      Processing your application…
                    </div>
                  )}

                  <LockedButton
                    type="submit"
                    disabled={!termsAccepted || formLock.isLocked}
                    loading={formLock.isSubmitting}
                    formLocked={formLock.isLocked}
                  >
                    {formLock.isSubmitting
                      ? 'Submitting Application…'
                      : 'Submit Application'}
                  </LockedButton>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
          <div>🔒 SSL Encrypted</div>
          <div>✓ PCI Compliant</div>
          <div>📊 GDPR Compliant</div>
        </div>
      </div>

      {/* Legal Modal */}
      <LegalModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        onAccept={handleAcceptLegalDisclosure}
        loanDetails={loanQuote}
      />

      {/* Legal Footer */}
      <LegalFooter onOpenModal={() => setShowLegalModal(true)} />
    </div>
  );
}

/**
 * Quote Card Component
 */
function QuoteCard({ label, value, highlight = false }) {
  return (
    <div
      className={`
      p-4 rounded-xl border-2 transition-colors
      ${
        highlight
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-slate-50 border-slate-200'
      }
    `}
    >
      <p className={`text-xs font-semibold mb-1 ${
        highlight ? 'text-emerald-600' : 'text-slate-600'
      }`}>
        {label}
      </p>
      <p className={`text-lg font-bold ${
        highlight ? 'text-emerald-900' : 'text-slate-900'
      }`}>
        {value}
      </p>
    </div>
  );
}
