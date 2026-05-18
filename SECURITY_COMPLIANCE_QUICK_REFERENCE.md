# Security & Compliance Quick Reference

## 3 Components for Fintech Compliance

### 1️⃣ Legal Disclosures Modal
**File:** `src/components/legal/LegalDisclosures.jsx`

Show mandatory APR, fees, data protection, licensing before loan approval.

**Usage:**
```jsx
import { LegalModal } from '@/components/legal/LegalDisclosures';

<LegalModal
  isOpen={true}
  onClose={() => { }}
  onAccept={(data) => { console.log('Accepted:', data) }}
  loanDetails={{ amount: 50000, apr: 12.5 }}
/>
```

**Compliance:** TILA, ECOA, GDPR, CCPA

---

### 2️⃣ Form Submission Locking
**File:** `src/hooks/useFormLock.js`

Prevent accidental double-submit and lock all inputs during API calls.

**Usage:**
```jsx
import { useFormLock, LockedInput, LockedButton } from '@/hooks/useFormLock';

const formLock = useFormLock();

<form>
  <LockedInput disabled={formLock.isLocked} />
  <LockedButton disabled={formLock.isLocked}>Submit</LockedButton>
</form>
```

**Features:**
- ✅ Auto-disables all inputs
- ✅ Shows loading spinner
- ✅ Prevents double-click
- ✅ 30s timeout protection
- ✅ Debounces rapid submissions

---

### 3️⃣ Audit Logging System
**File:** `src/services/AuditLogger.js`
**Backend:** `src/pages/api/audit/logs.js`

Log all financial actions for compliance audit trails (GDPR, SOX, PCI-DSS).

**Usage:**
```jsx
import { useAuditLog, AuditEvents } from '@/services/AuditLogger';

const { log } = useAuditLog();

// Log a loan application
await log(AuditEvents.loanApplicationSubmitted({
  userId: 'user_123',
  loanId: 'loan_456',
  amount: 50000,
  apr: 12.5,
  // ... other fields
}));
```

**Features:**
- ✅ Immutable records (append-only)
- ✅ Hash chain for tamper detection
- ✅ Server-side verification
- ✅ 7-year retention
- ✅ User privacy (hashed IDs)
- ✅ Regulatory frameworks tracked

---

## Setup Steps

### Step 1: Create Audit Logs Database
```sql
-- Copy migration from src/pages/api/audit/logs.js
-- Run in Supabase SQL Editor
```

### Step 2: Initialize Logger
```jsx
// app.jsx
import { AuditLogger } from '@/services/AuditLogger';

export const auditLogger = new AuditLogger({
  apiEndpoint: '/api/audit/logs',
  batchSize: 50,
  flushInterval: 60000,
});
```

### Step 3: Use Components in Your Form
```jsx
import { LegalModal } from '@/components/legal/LegalDisclosures';
import { useFormLock, LockedButton } from '@/hooks/useFormLock';
import { useAuditLog, AuditEvents } from '@/services/AuditLogger';

export function ApplyLoan() {
  const [showLegalModal, setShowLegalModal] = useState(false);
  const formLock = useFormLock();
  const { log } = useAuditLog();

  const handleSubmit = async (e) => {
    e.preventDefault();
    formLock.lock();

    try {
      // 1. Do something
      const result = await submitLoan(data);

      // 2. Log it
      await log(AuditEvents.loanApplicationSubmitted({
        userId: user.id,
        loanId: result.id,
        amount: data.amount,
        apr: result.apr,
      }));

      formLock.unlock();
    } catch (err) {
      formLock.unlock(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Inputs locked during submission */}
      <input disabled={formLock.isLocked} />
      <LockedButton loading={formLock.isSubmitting}>Submit</LockedButton>

      {/* Legal modal */}
      <LegalModal
        isOpen={showLegalModal}
        onAccept={() => setShowLegalModal(false)}
        loanDetails={loanData}
      />
    </form>
  );
}
```

---

## Pre-built Audit Events

```javascript
// Loan application
AuditEvents.loanApplicationSubmitted(data)

// APR calculation
AuditEvents.aprCalculated(data)

// Payment received
AuditEvents.paymentRecorded(data)

// Legal disclosure accepted
AuditEvents.disclosureAccepted(data)

// Data access
AuditEvents.dataAccessed(data)

// Failed login
AuditEvents.loginFailed(data)
```

---

## Each Log Entry Contains

```json
{
  "id": "uuid",
  "timestamp": "ISO 8601",
  "userId": "user_id_hash",
  "actionType": "LOAN_APPLICATION_SUBMITTED",
  "resource": { "type": "LOAN", "id": "loan_123" },
  "financial": {
    "amount": 50000,
    "apr": 12.5,
    "calculationDetails": { ... }
  },
  "formState": { ... },
  "result": { "status": "SUCCESS" },
  "integrity": {
    "hash": "sha256_hash",
    "previousHash": "sha256_hash"
  },
  "compliance": {
    "dataClassification": "CONFIDENTIAL",
    "regulatoryFramework": ["GDPR", "TILA"],
    "retentionDays": 2555
  }
}
```

---

## Compliance Frameworks

| Framework | Purpose | Relevant Component |
|-----------|---------|------------------|
| **TILA** | Truth in Lending | Legal Disclosures (APR display) |
| **ECOA** | Equal Credit Opportunity | Legal Disclosures |
| **GDPR** | Data Privacy (EU) | Audit Logs, Legal Footer |
| **CCPA** | Privacy (California) | Audit Logs, Legal Footer |
| **PCI-DSS** | Payment Card Security | Audit Logging |
| **SOX** | Financial Compliance | Audit Logging (immutable) |

---

## Common Tasks

### Log a payment
```jsx
await log(AuditEvents.paymentRecorded({
  userId: user.id,
  paymentId: payment.id,
  amount: 8720
}));
```

### Show legal terms before submission
```jsx
if (!termsAccepted) {
  setShowLegalModal(true);
  return;
}
```

### Check if form is locked
```jsx
if (formLock.isLocked) {
  return <LoadingSpinner />;
}
```

### Flush audit logs immediately
```jsx
await auditLogger.flush();
```

---

## Testing

```bash
# Check audit logs in Supabase
SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10;

# Verify hash chain
SELECT id, entry_id, client_hash, server_hash, verified
FROM audit_logs;

# Check compliance metadata
SELECT action_type, regulatory_frameworks, data_classification
FROM audit_logs;
```

---

## Files Created

| File | Purpose |
|------|---------|
| `src/components/legal/LegalDisclosures.jsx` | Legal modal & footer |
| `src/hooks/useFormLock.js` | Form locking hook & components |
| `src/services/AuditLogger.js` | Audit logging system |
| `src/pages/api/audit/logs.js` | Backend endpoint & schema |
| `SECURITY_COMPLIANCE_INTEGRATION.md` | Full integration guide |
| `SECURITY_COMPLIANCE_QUICK_REFERENCE.md` | This file |

---

## Next Steps

1. ✅ Read `SECURITY_COMPLIANCE_INTEGRATION.md` for full guide
2. ✅ Run Supabase migration to create audit_logs table
3. ✅ Initialize AuditLogger in your app
4. ✅ Integrate components into loan form
5. ✅ Test audit logging
6. ✅ Deploy to production

---

## Support & Questions

- **Audit logging not working?** Check browser console → Network tab → POST to /api/audit/logs
- **Form not locking?** Verify useFormLock is being used. Check error state.
- **Legal modal buttons disabled?** Scroll to bottom of all sections first.
- **Hash verification failing?** Ensure backend endpoint is running and accessible.

---

**Last Updated:** May 2024
**Version:** 1.0
**Status:** Production Ready ✅
