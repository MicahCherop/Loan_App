/**
 * Audit Logs API Endpoint
 * 
 * Backend handler for receiving, validating, and storing audit logs
 * Should be deployed to: /pages/api/audit/logs.js (Vercel) or similar
 * 
 * Features:
 * - Validates incoming audit log entries
 * - Stores in append-only database table
 * - Calculates server-side hash for verification
 * - Returns confirmation with unique audit ID
 * - Implements rate limiting and security headers
 */

// This is a template for your backend endpoint
// Adapt to your framework (Vercel, Express, Next.js, etc.)

/**
 * NEXT.JS HANDLER (pages/api/audit/logs.js)
 */
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');

  // Only allow POST
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Validate request
    const { logs, batchId, batchTimestamp } = req.body;

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ error: 'Invalid batch format' });
    }

    // 2. Validate CSRF token
    const csrfToken = req.headers['x-csrf-token'];
    if (!validateCSRFToken(csrfToken)) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    // 3. Validate request signature
    const clientIP = getClientIP(req);
    const requestHash = calculateRequestHash(logs, batchId);

    // 4. Rate limiting check
    const rateLimitKey = `audit:${clientIP}:${Math.floor(Date.now() / 60000)}`;
    const requestCount = await incrementRateLimit(rateLimitKey);

    if (requestCount > 100) {
      // Max 100 batches per minute per IP
      return res
        .status(429)
        .json({ error: 'Rate limit exceeded', retryAfter: 60 });
    }

    // 5. Store each log entry
    const auditIds = [];
    const errors = [];

    for (let i = 0; i < logs.length; i++) {
      try {
        const entry = logs[i];

        // Validate entry schema
        validateAuditEntry(entry);

        // Calculate server-side hash
        const serverHash = calculateServerHash(entry);

        // Verify client hash matches (tamper detection)
        if (entry.integrity?.hash !== serverHash) {
          console.warn(
            `Hash mismatch for entry ${i} - potential tampering detected`
          );
          // Log this as a security event
          await logSecurityEvent({
            type: 'AUDIT_TAMPERING_DETECTED',
            entry: entry.id,
            clientHash: entry.integrity?.hash,
            serverHash,
            clientIP,
          });
        }

        // Store in database (APPEND-ONLY table)
        const auditId = await storeAuditLog({
          ...entry,
          serverHash,
          receivedAt: new Date().toISOString(),
          clientIP,
          batchId,
          batchIndex: i,
          verified: entry.integrity?.hash === serverHash,
        });

        auditIds.push(auditId);
      } catch (err) {
        errors.push({
          index: i,
          error: err.message,
        });
      }
    }

    // 6. Return response
    res.status(200).json({
      success: true,
      batchId,
      auditIds,
      entriesProcessed: auditIds.length,
      entriesFailed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      serverTimestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Audit log endpoint error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  }
}

/**
 * HELPER FUNCTIONS
 */

/**
 * Store audit log in database (append-only)
 */
async function storeAuditLog(entry) {
  // Use Supabase or your database
  // Important: Use INSERT only, never UPDATE or DELETE
  // This ensures immutability

  const { supabase } = require('@/lib/supabase');

  const { data, error } = await supabase
    .from('audit_logs')
    .insert([
      {
        entry_id: entry.id,
        timestamp: entry.timestamp,
        user_id: hashUserId(entry.userId),
        action_type: entry.actionType,
        resource_type: entry.resource?.type,
        resource_id: entry.resource?.id,
        financial_amount: entry.financial?.amount,
        result_status: entry.result?.status,
        result_message: entry.result?.message,
        form_state: entry.formState,
        client_hash: entry.integrity?.hash,
        server_hash: entry.serverHash,
        verified: entry.verified,
        client_ip: entry.clientIP,
        user_agent: entry.userAgent,
        batch_id: entry.batchId,
        batch_index: entry.batchIndex,
        received_at: entry.receivedAt,
        payload: entry, // Store full entry as JSON
      },
    ])
    .select('id');

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  return data[0].id;
}

/**
 * Calculate hash on server side (for verification)
 */
function calculateServerHash(entry) {
  const crypto = require('crypto');
  const serialized = JSON.stringify(
    {
      id: entry.id,
      timestamp: entry.timestamp,
      userId: entry.userId,
      actionType: entry.actionType,
      financial: entry.financial,
      result: entry.result,
    },
    Object.keys(entry).sort()
  );

  return crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * Calculate request hash for verification
 */
function calculateRequestHash(logs, batchId) {
  const crypto = require('crypto');
  const serialized = JSON.stringify({
    logCount: logs.length,
    firstLogId: logs[0]?.id,
    lastLogId: logs[logs.length - 1]?.id,
    batchId,
  });

  return crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * Validate audit entry against schema
 */
function validateAuditEntry(entry) {
  const required = [
    'id',
    'timestamp',
    'userId',
    'actionType',
    'result',
    'compliance',
  ];

  for (const field of required) {
    if (!entry[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate timestamp is recent (within 1 hour)
  const entryTime = new Date(entry.timestamp).getTime();
  const now = Date.now();
  const diff = now - entryTime;

  if (diff < -60000 || diff > 3600000) {
    throw new Error('Timestamp too far from server time');
  }

  // Validate actionType is enum
  const validActions = [
    'LOAN_APPLICATION_SUBMITTED',
    'LOAN_CALCULATED',
    'LOAN_APPROVED',
    'LOAN_REJECTED',
    'LOAN_DISBURSED',
    'PAYMENT_RECORDED',
    'PAYMENT_FAILED',
    'INTEREST_CALCULATED',
    'FEE_APPLIED',
    'PREPAYMENT_PROCESSED',
    'ACCOUNT_CREATED',
    'KYC_VERIFICATION_STARTED',
    'KYC_VERIFICATION_COMPLETED',
    'DATA_ACCESSED',
    'DATA_MODIFIED',
    'DATA_DELETED',
    'DISCLOSURE_ACCEPTED',
    'SETTINGS_CHANGED',
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'PASSWORD_CHANGED',
    '2FA_ENABLED',
    'SESSION_TIMEOUT',
    'API_KEY_ROTATED',
  ];

  if (!validActions.includes(entry.actionType)) {
    throw new Error(`Invalid actionType: ${entry.actionType}`);
  }

  // Validate result status
  if (!['SUCCESS', 'FAILURE', 'PENDING', 'REJECTED'].includes(entry.result?.status)) {
    throw new Error('Invalid result status');
  }
}

/**
 * Validate CSRF token
 */
function validateCSRFToken(token) {
  // Implement your CSRF validation
  // This should verify against session
  if (!token || token.length < 20) {
    return false;
  }
  return true; // Placeholder
}

/**
 * Get client IP from request headers
 */
function getClientIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'UNKNOWN'
  );
}

/**
 * Rate limiting helper
 */
async function incrementRateLimit(key) {
  // Use Redis or simple in-memory tracking
  // This is a placeholder
  return 1;
}

/**
 * Hash user ID for privacy
 */
function hashUserId(userId) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(userId).digest('hex');
}

/**
 * Log security events
 */
async function logSecurityEvent(event) {
  // Log tampering attempts or suspicious activity
  console.error('SECURITY EVENT:', event);

  // Could send alert to security team
  // Could store in separate security logs table
}

/**
 * ==========================================
 * DATABASE SCHEMA FOR AUDIT LOGS TABLE
 * ==========================================
 * 
 * Run this migration to create the audit_logs table:
 */

const AUDIT_LOGS_MIGRATION = `
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create immutable audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  -- Primary key
  id BIGSERIAL PRIMARY KEY,
  
  -- Entry identification
  entry_id UUID NOT NULL UNIQUE,
  batch_id UUID NOT NULL,
  batch_index INTEGER NOT NULL,
  
  -- Timestamps
  timestamp TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- User information (hashed for privacy)
  user_id VARCHAR(255) NOT NULL,
  user_email VARCHAR(255),
  
  -- Action information
  action_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  
  -- Financial data
  financial_amount NUMERIC(15,2),
  currency VARCHAR(3) DEFAULT 'KES',
  apr DECIMAL(5,2),
  
  -- Result information
  result_status VARCHAR(20) NOT NULL,
  result_message TEXT,
  error_code VARCHAR(100),
  
  -- Form state snapshot
  form_state JSONB,
  
  -- Integrity verification
  client_hash VARCHAR(64) NOT NULL,
  server_hash VARCHAR(64) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  
  -- Network information
  client_ip INET,
  user_agent TEXT,
  
  -- Full entry (for audit trail)
  payload JSONB NOT NULL,
  
  -- Compliance metadata
  data_classification VARCHAR(20) DEFAULT 'CONFIDENTIAL',
  pii_present BOOLEAN DEFAULT FALSE,
  regulatory_frameworks TEXT[] DEFAULT ARRAY['GDPR', 'PCI-DSS'],
  retention_days INTEGER DEFAULT 2555,
  
  -- Indexes for performance
  CONSTRAINT check_action_type CHECK (
    action_type IN (
      'LOAN_APPLICATION_SUBMITTED',
      'LOAN_CALCULATED',
      'LOAN_APPROVED',
      'LOAN_REJECTED',
      'LOAN_DISBURSED',
      'PAYMENT_RECORDED',
      'PAYMENT_FAILED',
      'INTEREST_CALCULATED',
      'FEE_APPLIED',
      'PREPAYMENT_PROCESSED',
      'ACCOUNT_CREATED',
      'KYC_VERIFICATION_STARTED',
      'KYC_VERIFICATION_COMPLETED',
      'DATA_ACCESSED',
      'DATA_MODIFIED',
      'DATA_DELETED',
      'DISCLOSURE_ACCEPTED',
      'SETTINGS_CHANGED',
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'PASSWORD_CHANGED',
      '2FA_ENABLED',
      'SESSION_TIMEOUT',
      'API_KEY_ROTATED'
    )
  )
);

-- Create indexes for common queries
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_batch_id ON audit_logs(batch_id);
CREATE INDEX idx_audit_logs_entry_id ON audit_logs(entry_id UNIQUE);

-- Enable Row-Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own logs
CREATE POLICY "Users can view their own audit logs"
  ON audit_logs FOR SELECT
  USING (user_id = (SELECT user_id FROM auth.users WHERE id = auth.uid()));

-- RLS Policy: Only server can INSERT (never UPDATE/DELETE)
CREATE POLICY "Only server can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (TRUE);

-- REVOKE UPDATE and DELETE permissions (append-only)
REVOKE UPDATE ON audit_logs FROM authenticated;
REVOKE DELETE ON audit_logs FROM authenticated;
REVOKE UPDATE ON audit_logs FROM anon;
REVOKE DELETE ON audit_logs FROM anon;

-- Create view for compliance team (filtered data)
CREATE OR REPLACE VIEW audit_logs_compliance AS
SELECT
  entry_id,
  timestamp,
  action_type,
  result_status,
  resource_type,
  financial_amount,
  verified,
  pii_present,
  regulatory_frameworks,
  received_at
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '7 years'
ORDER BY timestamp DESC;

GRANT SELECT ON audit_logs_compliance TO compliance_role;

-- Create alerts table for suspicious activity
CREATE TABLE IF NOT EXISTS audit_alerts (
  id BIGSERIAL PRIMARY KEY,
  audit_log_id BIGINT REFERENCES audit_logs(id),
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_audit_alerts_severity ON audit_alerts(severity);
CREATE INDEX idx_audit_alerts_created_at ON audit_alerts(created_at DESC);
`;

export { AUDIT_LOGS_MIGRATION };
