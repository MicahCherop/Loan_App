# Security & Compliance Implementation Guide

## Overview

This guide integrates three critical security components for fintech compliance:
1. **Legal Disclosures** - Modal for APR, fees, data protection, licensing
2. **Form Submission Locking** - Prevents double-submit and accidental resubmission
3. **Audit Logging** - Records all financial actions for compliance

---

## 1. Legal Disclosures Component

### Files
- `src/components/legal/LegalDisclosures.jsx` - LegalModal & LegalFooter components

### Features
- ✅ 18pt+ APR display (TILA §226.16 compliance)
- ✅ Late payment terms & consequences
- ✅ GDPR/CCPA data protection info
- ✅ Regulatory licensing details
- ✅ Mandatory scroll-to-bottom requirement
- ✅ Acceptance checkbox
- ✅ Audit trail timestamp

### Basic Usage

```jsx
import { LegalModal, LegalFooter } from '@/components/legal/LegalDisclosures';

function LoanPage() {
  const [showLegalModal, setShowLegalModal] = useState(false);

  const handleAcceptDisclosure = (disclosureData) => {
    console.log('User accepted terms:', disclosureData);
    // Log to audit system
    auditLogger.log(
      AuditEvents.disclosureAccepted({
        userId: currentUser.id,
        userEmail: currentUser.email,
        disclosureId: disclosureData.disclosureId,
        apr: loanDetails.apr,
        amount: loanDetails.amount,
        acceptedFrom: disclosureData.acceptedFrom,
      })
    );
    // Proceed with loan application
  };

  return (
    <>
      <LegalModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        onAccept={handleAcceptDisclosure}
        loanDetails={{
          amount: 50000,
          apr: 12.5,
          term: 6,
          monthlyPayment: 8720,
          totalInterest: 2320,
        }}
      />

      <LegalFooter
        onOpenModal={(type) => {
          // Handle opening different disclosure types
          setShowLegalModal(true);
        }}
      />
    </>
  );
}
```

### Compliance Frameworks
- **TILA (Truth in Lending Act)** - 16 CFR §226.16 APR display requirements
- **ECOA (Equal Credit Opportunity Act)** - Fair lending practices
- **GDPR** - Data protection and user rights
- **CCPA** - California consumer privacy

---

## 2. Form Submission Locking

### Files
- `src/hooks/useFormLock.js` - Hook and components

### Components

#### `useFormLock()` Hook
```jsx
const {
  isLocked,        // Boolean: form is currently locked
  isSubmitting,    // Boolean: currently processing
  error,           // String: error message if any
  lock,            // Function: manually lock form
  unlock,          // Function: unlock form
  submit,          // Function: async wrapper with auto-locking
} = useFormLock({
  timeout: 30000,   // Auto-unlock after 30 seconds
  debounce: 300,    // Debounce rapid submissions (300ms)
});
```

#### `LockedInput` Component
Automatically disables when form is locked:
```jsx
<LockedInput
  type="number"
  name="amount"
  placeholder="Loan amount"
  disabled={formLocked}
  required
/>
```

#### `LockedButton` Component
Automatically shows loading spinner when locked:
```jsx
<LockedButton
  type="submit"
  disabled={formLocked}
  loading={isSubmitting}
>
  Submit Application
</LockedButton>
```

#### `FormWithLocking` Component
Complete form with automatic locking:
```jsx
<FormWithLocking
  onSubmit={async (data) => {
    const response = await submitLoan(data);
    return response;
  }}
  onSuccess={(result) => {
    alert('Loan submitted!');
  }}
  onError={(err) => {
    alert('Error: ' + err.message);
  }}
  lockTimeout={30000}
  debounceTime={300}
>
  <input name="amount" type="number" />
  <select name="duration">
    <option>6 months</option>
  </select>
  <button type="submit">Submit</button>
</FormWithLocking>
```

### Complete Example: Loan Application Form

```jsx
import { useFormLock, LockedInput, LockedButton } from '@/hooks/useFormLock';
import { useAuditLog, AuditEvents } from '@/services/AuditLogger';

function LoanApplicationForm() {
  const formLock = useFormLock({ timeout: 30000, debounce: 300 });
  const { log } = useAuditLog();
  const [loanData, setLoanData] = useState({
    amount: '',
    duration: '6',
    purpose: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Form is already locked by the hook
    formLock.lock();

    try {
      // 1. Validate form
      if (!loanData.amount || !loanData.purpose) {
        throw new Error('Please fill in all fields');
      }

      // 2. Calculate APR
      const apr = calculateAPR(loanData.amount, loanData.duration);
      const monthlyPayment = calculateMonthly(
        loanData.amount,
        apr,
        loanData.duration
      );
      const totalInterest = calculateInterest(
        monthlyPayment,
        loanData.duration,
        loanData.amount
      );

      // 3. Log calculation to audit system
      await log(
        AuditEvents.loanCalculated({
          userId: currentUser.id,
          loanId: generateId(),
          amount: parseFloat(loanData.amount),
          apr,
          interestRate: apr / 100,
          totalInterest,
          monthlyPayment,
          duration: parseInt(loanData.duration),
        })
      );

      // 4. Submit to backend
      const response = await fetch('/api/loans/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...loanData,
          amount: parseFloat(loanData.amount),
          apr,
          monthlyPayment,
          totalInterest,
        }),
      });

      if (!response.ok) throw new Error('Application failed');

      const result = await response.json();

      // 5. Log successful submission
      await log(
        AuditEvents.loanApplicationSubmitted({
          userId: currentUser.id,
          userEmail: currentUser.email,
          loanId: result.loanId,
          amount: parseFloat(loanData.amount),
          apr,
          totalInterest,
          fees: result.fees,
          monthlyPayment,
          duration: parseInt(loanData.duration),
          purpose: loanData.purpose,
          verified: true,
          sessionId: sessionStorage.getItem('sessionId'),
        })
      );

      formLock.unlock();
      alert('Loan application submitted successfully!');
      setLoanData({ amount: '', duration: '6', purpose: '' });
    } catch (err) {
      formLock.unlock(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md p-6">
      <h2 className="text-2xl font-bold">Apply for a Loan</h2>

      {/* Error Display */}
      {formLock.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          ⚠️ {formLock.error}
        </div>
      )}

      {/* Amount Input */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          Loan Amount (KES)
        </label>
        <LockedInput
          type="number"
          value={loanData.amount}
          onChange={(e) => setLoanData({ ...loanData, amount: e.target.value })}
          placeholder="50,000"
          formLocked={formLock.isLocked}
          required
        />
      </div>

      {/* Duration Select */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          Loan Duration
        </label>
        <select
          value={loanData.duration}
          onChange={(e) =>
            setLoanData({ ...loanData, duration: e.target.value })
          }
          disabled={formLock.isLocked}
          className={`w-full px-4 py-3 rounded-xl border-2 ${
            formLock.isLocked
              ? 'bg-slate-50 border-slate-100 cursor-not-allowed'
              : 'bg-white border-slate-200 focus:border-emerald-500'
          }`}
          required
        >
          <option value="3">3 months</option>
          <option value="6">6 months</option>
          <option value="12">12 months</option>
        </select>
      </div>

      {/* Purpose Input */}
      <div>
        <label className="block text-sm font-semibold mb-2">
          Loan Purpose
        </label>
        <LockedInput
          type="text"
          value={loanData.purpose}
          onChange={(e) => setLoanData({ ...loanData, purpose: e.target.value })}
          placeholder="What will you use this for?"
          formLocked={formLock.isLocked}
          required
        />
      </div>

      {/* Status Display */}
      {formLock.isSubmitting && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-600 rounded-full animate-spin" />
          Processing your application…
        </div>
      )}

      {/* Submit Button */}
      <LockedButton type="submit" formLocked={formLock.isLocked}>
        {formLock.isSubmitting ? 'Submitting…' : 'Submit Application'}
      </LockedButton>
    </form>
  );
}
```

### Key Features
- ✅ Prevents accidental double-submit
- ✅ Disables all inputs during processing
- ✅ Shows loading spinner
- ✅ Auto-unlock timeout (prevents stuck forms)
- ✅ Debounce for rapid clicks
- ✅ Error handling & display

---

## 3. Audit Logging System

### Files
- `src/services/AuditLogger.js` - Logger class and event factory
- `src/pages/api/audit/logs.js` - Backend endpoint

### Setup

#### 1. Create Supabase Table
Run the migration included in `src/pages/api/audit/logs.js`:
```sql
-- From AUDIT_LOGS_MIGRATION in the file
```

#### 2. Initialize Logger in Your App

```jsx
// app.jsx or main.jsx
import { AuditLogger } from '@/services/AuditLogger';

// Create global instance
export const auditLogger = new AuditLogger({
  apiEndpoint: '/api/audit/logs',
  batchSize: 50,
  flushInterval: 60000, // 1 minute
});

// Hook for React components
export function useAuditLog() {
  return {
    log: (entry) => auditLogger.log(entry),
    flush: () => auditLogger.flush(),
    AuditEvents,
  };
}
```

#### 3. Log Events in Components

```jsx
import { useAuditLog, AuditEvents } from '@/services/AuditLogger';

function Dashboard() {
  const { log } = useAuditLog();

  // Log when user views sensitive data
  useEffect(() => {
    log(
      AuditEvents.dataAccessed({
        userId: user.id,
        customerId: customer.id,
        dataType: 'FULL_CUSTOMER_PROFILE',
      })
    );
  }, [customer.id]);

  return (
    // ... component
  );
}
```

### Pre-built Event Types

```javascript
// Loan application submitted
AuditEvents.loanApplicationSubmitted({
  userId, userEmail, loanId, amount, duration,
  apr, totalInterest, fees, monthlyPayment,
  purpose, verified, sessionId
})

// APR calculated
AuditEvents.aprCalculated({
  userId, loanId, amount, apr, interestRate,
  totalInterest, monthlyPayment
})

// Payment recorded
AuditEvents.paymentRecorded({
  userId, paymentId, amount
})

// Legal disclosure accepted
AuditEvents.disclosureAccepted({
  userId, disclosureId, apr, amount
})

// Data accessed
AuditEvents.dataAccessed({
  userId, customerId, dataType
})

// Login failed
AuditEvents.loginFailed({
  userId
})
```

### Audit Log Schema

Every log entry includes:

```json
{
  "id": "uuid",
  "timestamp": "2024-05-18T14:30:45.123Z",
  "userId": "user_id_hash",
  "actionType": "LOAN_APPLICATION_SUBMITTED",
  "resource": {
    "type": "LOAN",
    "id": "loan_123",
    "name": "Loan Application #123"
  },
  "network": {
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "sessionId": "sess_123"
  },
  "financial": {
    "amount": 50000,
    "currency": "KES",
    "apr": 12.5,
    "calculationDetails": {
      "principal": 50000,
      "interestRate": 0.125,
      "totalInterest": 2320,
      "monthlyPayment": 8720
    }
  },
  "formState": {
    "loanAmount": 50000,
    "loanDuration": 6,
    "purpose": "Business expansion"
  },
  "result": {
    "status": "SUCCESS",
    "message": "Loan application submitted for KES 50,000"
  },
  "integrity": {
    "hash": "a1b2c3d4...",
    "previousHash": "z9y8x7w6..."
  },
  "compliance": {
    "dataClassification": "CONFIDENTIAL",
    "piiPresent": false,
    "regulatoryFramework": ["GDPR", "TILA"],
    "retentionDays": 2555
  }
}
```

### Compliance & Security Features

✅ **Immutable Records** - Append-only database (no UPDATE/DELETE)
✅ **Hash Chain** - Each entry links to previous (tamper detection)
✅ **Server-Side Hash Verification** - Detects client-side tampering
✅ **Rate Limiting** - Prevents log flooding
✅ **CSRF Protection** - Validates request tokens
✅ **IP Tracking** - Records source IP
✅ **User Privacy** - Hashes user IDs
✅ **Data Classification** - Tags sensitive data
✅ **Retention Policy** - 7-year default retention
✅ **Regulatory Compliance** - GDPR, PCI-DSS, SOX ready

---

## 4. Complete Integration Example

```jsx
// pages/NewLoan.jsx
import React, { useState } from 'react';
import { LegalModal, LegalFooter } from '@/components/legal/LegalDisclosures';
import { useFormLock, LockedInput, LockedButton } from '@/hooks/useFormLock';
import { useAuditLog, AuditEvents } from '@/services/AuditLogger';

export default function NewLoanPage() {
  // 1. State Management
  const [formData, setFormData] = useState({
    amount: '',
    duration: '6',
    purpose: '',
  });
  const [loanQuote, setLoanQuote] = useState(null);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [disclosureAccepted, setDisclosureAccepted] = useState(false);

  // 2. Hooks
  const formLock = useFormLock();
  const { log } = useAuditLog();

  // 3. Calculate APR & monthly payment
  const calculateQuote = () => {
    const amount = parseFloat(formData.amount);
    const duration = parseInt(formData.duration);
    const apr = 12.5; // Your APR calculation logic

    const monthlyRate = apr / 100 / 12;
    const monthlyPayment =
      (amount * monthlyRate * Math.pow(1 + monthlyRate, duration)) /
      (Math.pow(1 + monthlyRate, duration) - 1);
    const totalInterest = monthlyPayment * duration - amount;

    return {
      amount,
      duration,
      apr,
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      fees: Math.round(amount * 0.025), // 2.5% origination fee
    };
  };

  const handleShowQuote = (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.purpose) {
      alert('Please fill in all fields');
      return;
    }

    const quote = calculateQuote();
    setLoanQuote(quote);

    // Log calculation
    log(
      AuditEvents.loanCalculated({
        userId: 'current_user_id',
        loanId: 'temp_' + Date.now(),
        amount: quote.amount,
        apr: quote.apr,
        interestRate: quote.apr / 100,
        totalInterest: quote.totalInterest,
        monthlyPayment: quote.monthlyPayment,
        duration: quote.duration,
      })
    );
  };

  const handleAcceptLegalTerms = async (disclosureData) => {
    setDisclosureAccepted(true);
    setShowLegalModal(false);

    // Log acceptance
    await log(
      AuditEvents.disclosureAccepted({
        userId: 'current_user_id',
        userEmail: 'user@example.com',
        disclosureId: disclosureData.disclosureId,
        apr: loanQuote.apr,
        amount: loanQuote.amount,
      })
    );
  };

  const handleSubmitLoan = async (e) => {
    e.preventDefault();

    if (!disclosureAccepted) {
      setShowLegalModal(true);
      return;
    }

    formLock.lock();

    try {
      // Submit to backend
      const response = await fetch('/api/loans/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ...loanQuote,
          disclosureAccepted: true,
        }),
      });

      if (!response.ok) throw new Error('Application failed');
      const result = await response.json();

      // Log successful submission
      await log(
        AuditEvents.loanApplicationSubmitted({
          userId: 'current_user_id',
          userEmail: 'user@example.com',
          loanId: result.loanId,
          amount: loanQuote.amount,
          apr: loanQuote.apr,
          totalInterest: loanQuote.totalInterest,
          fees: loanQuote.fees,
          monthlyPayment: loanQuote.monthlyPayment,
          duration: parseInt(formData.duration),
          purpose: formData.purpose,
          verified: true,
          sessionId: sessionStorage.getItem('sessionId'),
        })
      );

      formLock.unlock();
      alert('Loan application submitted successfully!');

      // Reset form
      setFormData({ amount: '', duration: '6', purpose: '' });
      setLoanQuote(null);
      setDisclosureAccepted(false);
    } catch (err) {
      formLock.unlock(err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Apply for a Loan</h1>

      <form onSubmit={handleSubmitLoan} className="space-y-6">
        {/* Error Display */}
        {formLock.error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            ⚠️ {formLock.error}
          </div>
        )}

        {/* Form Inputs */}
        <div>
          <label className="block text-sm font-semibold mb-2">
            Loan Amount (KES)
          </label>
          <LockedInput
            type="number"
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
            placeholder="50,000"
            formLocked={formLock.isLocked}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">
            Duration
          </label>
          <select
            value={formData.duration}
            onChange={(e) =>
              setFormData({ ...formData, duration: e.target.value })
            }
            disabled={formLock.isLocked}
            required
          >
            <option value="3">3 months</option>
            <option value="6">6 months</option>
            <option value="12">12 months</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">
            Loan Purpose
          </label>
          <LockedInput
            type="text"
            value={formData.purpose}
            onChange={(e) =>
              setFormData({ ...formData, purpose: e.target.value })
            }
            placeholder="Business expansion, education, etc."
            formLocked={formLock.isLocked}
            required
          />
        </div>

        {/* Show Quote Button */}
        {!loanQuote && (
          <button
            type="button"
            onClick={handleShowQuote}
            className="w-full px-4 py-3 bg-slate-600 text-white rounded-xl font-semibold hover:bg-slate-700"
          >
            Get Loan Quote
          </button>
        )}

        {/* Loan Quote Display */}
        {loanQuote && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <h3 className="font-bold text-emerald-900 mb-3">Loan Quote</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600">Monthly Payment</p>
                <p className="font-bold">
                  KES {loanQuote.monthlyPayment.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-slate-600">Total Interest</p>
                <p className="font-bold">
                  KES {loanQuote.totalInterest.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-slate-600">APR</p>
                <p className="font-bold">{loanQuote.apr}%</p>
              </div>
              <div>
                <p className="text-slate-600">Processing Fee</p>
                <p className="font-bold">
                  KES {loanQuote.fees.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status */}
        {formLock.isSubmitting && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-600 rounded-full animate-spin" />
            Processing…
          </div>
        )}

        {/* Submit Button */}
        {loanQuote && (
          <LockedButton type="submit" formLocked={formLock.isLocked}>
            {!disclosureAccepted
              ? 'Review Terms & Apply'
              : formLock.isSubmitting
                ? 'Submitting…'
                : 'Submit Application'}
          </LockedButton>
        )}
      </form>

      {/* Legal Modal */}
      <LegalModal
        isOpen={showLegalModal}
        onClose={() => setShowLegalModal(false)}
        onAccept={handleAcceptLegalTerms}
        loanDetails={loanQuote}
      />

      {/* Footer */}
      <LegalFooter onOpenModal={() => setShowLegalModal(true)} />
    </div>
  );
}
```

---

## 5. Compliance Checklist

Before deploying, verify:

- [ ] Legal disclosures display APR in 18pt+ font
- [ ] Form locks during submission
- [ ] All financial actions logged to audit system
- [ ] Audit logs sent to secure backend
- [ ] Database table created with RLS policies
- [ ] Rate limiting enabled on audit endpoint
- [ ] CSRF tokens validated
- [ ] Hash verification implemented
- [ ] User IDs hashed in logs
- [ ] Logs retained for 7 years minimum

---

## 6. Testing Checklist

```javascript
// Test form locking
// 1. Click submit, form should lock
// 2. Try typing in inputs - should be disabled
// 3. Try clicking buttons - should show spinner
// 4. Wait for API response - form should unlock

// Test audit logging
// 1. Open browser console
// 2. Submit form
// 3. Check network tab - should see POST to /api/audit/logs
// 4. Check Supabase audit_logs table - new entries

// Test legal modal
// 1. Try to accept without scrolling - disabled
// 2. Scroll to bottom - button enables
// 3. Close and reopen - scroll state resets
```

---

## 7. Troubleshooting

**Form not unlocking after submission**
→ Check console for errors. Ensure backend returns successful response.

**Audit logs not appearing**
→ Check `/api/audit/logs` endpoint. Verify Supabase table exists. Check rate limiting.

**Legal modal buttons disabled**
→ Ensure you've scrolled to bottom of all sections. Check browser console.

**Double-submit still happening**
→ Verify useFormLock is actually being called. Check timeout value isn't too short.

---

## 8. Next Steps

1. **Deploy audit log endpoint** to your backend
2. **Create Supabase table** using migration SQL
3. **Initialize AuditLogger** in your main app
4. **Integrate components** into loan application flow
5. **Test thoroughly** with different scenarios
6. **Monitor audit logs** for suspicious patterns

