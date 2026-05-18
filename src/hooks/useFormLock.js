import React, { useCallback, useRef } from 'react';

/**
 * useFormLock - Custom hook for preventing double-submit of forms
 * 
 * Features:
 * - Prevents form resubmission during API calls
 * - Disables all inputs and buttons during submission
 * - Timeout protection (auto-unlock after configurable time)
 * - Debounce for multiple rapid submissions
 * - Returns state for UI feedback
 */
export function useFormLock(options = {}) {
  const {
    timeout = 30000, // 30 seconds max lock time
    debounce = 300, // 300ms debounce
  } = options;

  const [isLocked, setIsLocked] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);
  const timeoutRef = useRef(null);
  const debounceRef = useRef(null);

  // Lock form with timeout protection
  const lock = useCallback(() => {
    if (isLocked) return; // Already locked

    setIsLocked(true);
    setIsSubmitting(true);
    setError(null);

    // Auto-unlock after timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      console.warn('Form lock timeout - auto-unlocking');
      setIsLocked(false);
      setIsSubmitting(false);
      setError('Request timed out. Please try again.');
    }, timeout);
  }, [isLocked, timeout]);

  // Unlock form
  const unlock = useCallback((err = null) => {
    setIsLocked(false);
    setIsSubmitting(false);
    if (err) setError(err);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  // Submit with automatic locking
  const submit = useCallback(
    async (asyncFn) => {
      // Debounce rapid submissions
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        if (isLocked) return;

        try {
          lock();
          const result = await asyncFn();
          unlock();
          return result;
        } catch (err) {
          unlock(err.message || 'An error occurred');
          throw err;
        }
      }, debounce);
    },
    [isLocked, lock, unlock, debounce]
  );

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    isLocked,
    isSubmitting,
    error,
    lock,
    unlock,
    submit,
  };
}

/**
 * FormLockProvider - Context provider for form lock state
 * Useful for disabling all form elements globally
 */
export const FormLockContext = React.createContext({
  isLocked: false,
  isSubmitting: false,
  lock: () => {},
  unlock: () => {},
});

export function FormLockProvider({ children }) {
  const formLock = useFormLock();

  return (
    <FormLockContext.Provider value={formLock}>
      {children}
    </FormLockContext.Provider>
  );
}

// Consumer hook
export function useFormLockContext() {
  return React.useContext(FormLockContext);
}

/**
 * LockedInput - Input that automatically disables when form is locked
 */
export function LockedInput({
  value,
  onChange,
  disabled = false,
  formLocked = false,
  ...props
}) {
  return (
    <input
      value={value}
      onChange={onChange}
      disabled={disabled || formLocked}
      className={`
        w-full px-4 py-3 rounded-xl border-2 text-base font-medium
        transition-all duration-200 focus:outline-none
        ${disabled || formLocked
          ? 'bg-slate-50 border-slate-100 cursor-not-allowed text-slate-400'
          : 'bg-white border-slate-200/60 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
        }
      `}
      {...props}
    />
  );
}

/**
 * LockedButton - Button that automatically shows loading state when form is locked
 */
export function LockedButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  formLocked = false,
  ...props
}) {
  const isDisabled = disabled || formLocked || loading;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        w-full px-6 py-3 rounded-xl font-semibold text-base
        transition-all duration-200 active:scale-95 focus:outline-none
        focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500
        ${isDisabled
          ? 'bg-emerald-400 text-white opacity-60 cursor-not-allowed'
          : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }
      `}
      {...props}
    >
      {loading || formLocked ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Processing…</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
}

/**
 * FormWithLocking - Complete form component with automatic locking
 * 
 * Usage:
 * <FormWithLocking onSubmit={handleSubmit}>
 *   <input name="amount" />
 *   <button type="submit">Submit</button>
 * </FormWithLocking>
 */
export function FormWithLocking({
  children,
  onSubmit,
  onError,
  onSuccess,
  lockTimeout = 30000,
  debounceTime = 300,
}) {
  const formLock = useFormLock({
    timeout: lockTimeout,
    debounce: debounceTime,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formLock.isLocked) return;

    formLock.lock();

    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);

      const result = await onSubmit?.(data);

      formLock.unlock();
      onSuccess?.(result);
    } catch (err) {
      formLock.unlock(err.message);
      onError?.(err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Error Display */}
      {formLock.error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
          ⚠️ {formLock.error}
        </div>
      )}

      {/* Form Content */}
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;

        // Pass locked state to children
        return React.cloneElement(child, {
          formLocked: formLock.isLocked,
          submitting: formLock.isSubmitting,
        });
      })}

      {/* Locked Overlay - Visual feedback */}
      {formLock.isLocked && (
        <div className="fixed inset-0 bg-black/10 pointer-events-none z-40" />
      )}
    </form>
  );
}

/**
 * LoanApplicationForm - Complete example with form locking
 */
export function LoanApplicationFormWithLocking() {
  const formLock = useFormLock({
    timeout: 30000,
    debounce: 300,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      formLock.lock();

      // Simulate API call
      console.log('Submitting loan application:', data);
      const response = await fetch('/api/loans/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Application failed');

      formLock.unlock();
      alert('Application submitted successfully!');
    } catch (err) {
      formLock.unlock(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold text-slate-900">Apply for a Loan</h2>

      {/* Error Alert */}
      {formLock.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          ⚠️ {formLock.error}
        </div>
      )}

      {/* Amount Input */}
      <div>
        <label className="block text-sm font-semibold text-slate-600 mb-2">
          Loan Amount (KES)
        </label>
        <LockedInput
          type="number"
          name="amount"
          placeholder="50,000"
          disabled={formLock.isLocked}
          required
        />
      </div>

      {/* Duration Select */}
      <div>
        <label className="block text-sm font-semibold text-slate-600 mb-2">
          Loan Duration
        </label>
        <select
          name="duration"
          disabled={formLock.isLocked}
          className={`
            w-full px-4 py-3 rounded-xl border-2 text-base font-medium
            transition-all duration-200 focus:outline-none
            ${formLock.isLocked
              ? 'bg-slate-50 border-slate-100 cursor-not-allowed text-slate-400'
              : 'bg-white border-slate-200/60 focus:border-emerald-500'
            }
          `}
          required
        >
          <option value="">Select duration</option>
          <option value="3">3 months</option>
          <option value="6">6 months</option>
          <option value="12">12 months</option>
        </select>
      </div>

      {/* Purpose Input */}
      <div>
        <label className="block text-sm font-semibold text-slate-600 mb-2">
          Loan Purpose
        </label>
        <LockedInput
          type="text"
          name="purpose"
          placeholder="What will you use this for?"
          disabled={formLock.isLocked}
          required
        />
      </div>

      {/* Status Indicator */}
      {formLock.isSubmitting && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-600 rounded-full animate-spin" />
          Processing your application…
        </div>
      )}

      {/* Submit Button - Shows loading state */}
      <LockedButton
        type="submit"
        disabled={formLock.isLocked}
        loading={formLock.isSubmitting}
      >
        {formLock.isSubmitting ? 'Submitting…' : 'Submit Application'}
      </LockedButton>

      {/* Form Lock Info - For debugging/demonstration */}
      <div className="text-xs text-slate-500 text-center">
        Form is {formLock.isLocked ? 'LOCKED' : 'ready for input'}
      </div>
    </form>
  );
}

export default useFormLock;
