/**
 * AuditLogger - Secure audit logging system for financial transactions
 * 
 * Logs all financial calculations, state changes, and user actions
 * with immutable records for compliance (GDPR, SOX, PCI-DSS)
 * 
 * Features:
 * - Structured JSON logging schema
 * - Cryptographic hashing for tamper-detection
 * - Automatic metadata capture (IP, User Agent, Timestamp)
 * - Send to secure backend for persistence
 * - Support for different log levels
 */

import crypto from 'crypto';

/**
 * AUDIT LOG JSON SCHEMA
 * 
 * Every audit log entry follows this strict schema
 */
export const AUDIT_LOG_SCHEMA = {
  version: '1.0',
  properties: {
    // Unique identifier
    id: {
      type: 'string',
      description: 'UUID v4 - unique log entry ID',
      example: '550e8400-e29b-41d4-a716-446655440000',
    },

    // Timestamp (server-side, in UTC)
    timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'Server-side timestamp in ISO 8601 format (UTC)',
      example: '2024-05-18T14:30:45.123Z',
    },

    // User identification
    userId: {
      type: 'string',
      description: 'Internal user ID (hashed for privacy)',
      example: 'user_5f3a2b1c9d8e7f6g5h4i3j',
    },

    userEmail: {
      type: 'string',
      format: 'email',
      description: 'User email (for audit trail)',
      example: 'customer@example.com',
    },

    // Action information
    actionType: {
      type: 'string',
      enum: [
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
      ],
      description: 'Type of action performed',
      example: 'LOAN_APPLICATION_SUBMITTED',
    },

    // Resource being acted upon
    resource: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['LOAN', 'PAYMENT', 'CUSTOMER', 'ACCOUNT', 'DISCLOSURE'],
          example: 'LOAN',
        },
        id: {
          type: 'string',
          description: 'Resource ID',
          example: 'loan_12345abc',
        },
        name: {
          type: 'string',
          description: 'Human-readable resource name',
          example: 'Personal Loan #12345',
        },
      },
    },

    // Network information
    network: {
      type: 'object',
      properties: {
        ipAddress: {
          type: 'string',
          format: 'ipv4',
          description: 'Client IP address (from X-Forwarded-For header)',
          example: '192.168.1.100',
        },
        userAgent: {
          type: 'string',
          description: 'User-Agent header',
          example: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
        },
        sessionId: {
          type: 'string',
          description: 'Session ID (hashed)',
          example: 'sess_7f8g9h0i1j2k3l4m',
        },
      },
    },

    // Financial data
    financial: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Transaction amount in KES',
          example: 50000.00,
        },
        currency: {
          type: 'string',
          enum: ['KES', 'USD', 'EUR'],
          description: 'Currency code',
          example: 'KES',
        },
        apr: {
          type: 'number',
          description: 'Annual Percentage Rate (%)',
          example: 12.5,
        },
        calculationDetails: {
          type: 'object',
          description: 'Breakdown of calculations',
          properties: {
            principal: { type: 'number' },
            interestRate: { type: 'number' },
            totalInterest: { type: 'number' },
            fees: { type: 'number' },
            monthlyPayment: { type: 'number' },
          },
        },
      },
    },

    // Form state at time of action
    formState: {
      type: 'object',
      description: 'State of form when action was taken',
      properties: {
        loanAmount: { type: 'number' },
        loanDuration: { type: 'number' },
        purpose: { type: 'string' },
        incomeLevel: { type: 'string' },
        employmentStatus: { type: 'string' },
        verified: { type: 'boolean' },
      },
    },

    // Result/Outcome
    result: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['SUCCESS', 'FAILURE', 'PENDING', 'REJECTED'],
          example: 'SUCCESS',
        },
        message: {
          type: 'string',
          description: 'Result message or error description',
          example: 'Loan approved for KES 50,000',
        },
        errorCode: {
          type: 'string',
          description: 'Error code if failed',
          example: 'INVALID_INCOME_VERIFICATION',
        },
      },
    },

    // Compliance & Metadata
    compliance: {
      type: 'object',
      properties: {
        dataClassification: {
          type: 'string',
          enum: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'],
          description: 'Data sensitivity level',
          example: 'CONFIDENTIAL',
        },
        piiPresent: {
          type: 'boolean',
          description: 'Whether personal identifying info is included',
          example: false,
        },
        regulatoryFramework: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['GDPR', 'CCPA', 'TILA', 'ECOA', 'PCI-DSS', 'SOX'],
          },
          description: 'Applicable regulatory frameworks',
          example: ['GDPR', 'TILA', 'PCI-DSS'],
        },
        retentionDays: {
          type: 'number',
          description: 'How long this log should be retained',
          example: 2555, // 7 years
        },
      },
    },

    // Cryptographic integrity
    integrity: {
      type: 'object',
      properties: {
        hash: {
          type: 'string',
          description: 'SHA-256 hash of log entry for tamper detection',
          example:
            'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f',
        },
        previousHash: {
          type: 'string',
          description: 'Hash of previous log entry (chain)',
          example:
            'z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4z3y2x1w0v',
        },
      },
    },
  },

  required: [
    'id',
    'timestamp',
    'userId',
    'actionType',
    'network',
    'result',
    'compliance',
  ],
};

/**
 * AuditLogger class - Main audit logging implementation
 */
export class AuditLogger {
  constructor(options = {}) {
    this.apiEndpoint = options.apiEndpoint || '/api/audit/logs';
    this.encryptionKey = options.encryptionKey || null;
    this.batchSize = options.batchSize || 50;
    this.flushInterval = options.flushInterval || 60000; // 1 minute
    this.logQueue = [];
    this.previousHash = null;

    // Start batch flush interval
    this.startBatchFlush();
  }

  /**
   * Log an action
   */
  async log(entry) {
    try {
      // Validate against schema
      const validatedEntry = this.validateEntry(entry);

      // Add system metadata
      const enrichedEntry = this.enrichEntry(validatedEntry);

      // Calculate hash
      const hash = this.calculateHash(enrichedEntry);
      enrichedEntry.integrity = {
        hash,
        previousHash: this.previousHash,
      };
      this.previousHash = hash;

      // Add to queue
      this.logQueue.push(enrichedEntry);

      // Flush if batch is full
      if (this.logQueue.length >= this.batchSize) {
        await this.flush();
      }

      return enrichedEntry;
    } catch (err) {
      console.error('Error logging audit entry:', err);
      // Don't throw - audit logging should never break app functionality
    }
  }

  /**
   * Validate entry against schema
   */
  validateEntry(entry) {
    const required = [
      'actionType',
      'userId',
      'result',
      'compliance',
    ];

    for (const field of required) {
      if (!entry[field]) {
        throw new Error(`Missing required audit field: ${field}`);
      }
    }

    return entry;
  }

  /**
   * Enrich entry with automatic metadata
   */
  enrichEntry(entry) {
    return {
      id: this.generateUUID(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ipAddress: this.getClientIP(),
      sessionId: this.getSessionId(),
      ...entry,
      compliance: {
        dataClassification: 'CONFIDENTIAL',
        piiPresent: false,
        regulatoryFramework: ['GDPR', 'PCI-DSS'],
        retentionDays: 2555, // 7 years
        ...entry.compliance,
      },
    };
  }

  /**
   * Calculate SHA-256 hash for tamper detection
   */
  calculateHash(entry) {
    const serialized = JSON.stringify(entry, Object.keys(entry).sort());
    return crypto
      .createHash('sha256')
      .update(serialized)
      .digest('hex');
  }

  /**
   * Flush queued logs to backend
   */
  async flush() {
    if (this.logQueue.length === 0) return;

    try {
      const payload = {
        logs: this.logQueue,
        batchId: this.generateUUID(),
        batchTimestamp: new Date().toISOString(),
      };

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCSRFToken(),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Audit log submission failed: ${response.statusText}`);
      }

      console.log(`Flushed ${this.logQueue.length} audit logs`);
      this.logQueue = [];
    } catch (err) {
      console.error('Error flushing audit logs:', err);
      // Keep logs in queue for retry
    }
  }

  /**
   * Start periodic batch flush
   */
  startBatchFlush() {
    setInterval(() => this.flush(), this.flushInterval);
  }

  // Utility methods
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  getClientIP() {
    // In real app, this would come from server headers
    // Frontend can't directly get client IP securely
    return 'CLIENT_IP_FROM_HEADER';
  }

  getSessionId() {
    return sessionStorage.getItem('sessionId') || 'unknown';
  }

  getCSRFToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content || '';
  }
}

/**
 * AUDIT LOG EVENT FACTORY FUNCTIONS
 * 
 * Pre-built audit log entries for common financial actions
 */
export const AuditEvents = {
  /**
   * Loan application submitted
   */
  loanApplicationSubmitted(data) {
    return {
      actionType: 'LOAN_APPLICATION_SUBMITTED',
      userId: data.userId,
      userEmail: data.userEmail,
      resource: {
        type: 'LOAN',
        id: data.loanId,
        name: `Loan Application ${data.loanId}`,
      },
      network: {
        sessionId: data.sessionId,
      },
      financial: {
        amount: data.amount,
        currency: 'KES',
        calculationDetails: {
          principal: data.amount,
          interestRate: data.apr,
          totalInterest: data.totalInterest,
          fees: data.fees,
          monthlyPayment: data.monthlyPayment,
        },
      },
      formState: {
        loanAmount: data.amount,
        loanDuration: data.duration,
        purpose: data.purpose,
        verified: data.verified,
      },
      result: {
        status: 'SUCCESS',
        message: `Loan application submitted for KES ${data.amount.toLocaleString()}`,
      },
      compliance: {
        dataClassification: 'CONFIDENTIAL',
        piiPresent: false,
        regulatoryFramework: ['GDPR', 'TILA', 'ECOA'],
        retentionDays: 2555,
      },
    };
  },

  /**
   * APR calculated
   */
  aprCalculated(data) {
    return {
      actionType: 'LOAN_CALCULATED',
      userId: data.userId,
      resource: {
        type: 'LOAN',
        id: data.loanId,
      },
      financial: {
        amount: data.amount,
        apr: data.apr,
        calculationDetails: {
          principal: data.amount,
          interestRate: data.interestRate,
          totalInterest: data.totalInterest,
          monthlyPayment: data.monthlyPayment,
        },
      },
      result: {
        status: 'SUCCESS',
        message: `APR calculated: ${data.apr}%`,
      },
      compliance: {
        regulatoryFramework: ['TILA'],
      },
    };
  },

  /**
   * Payment received
   */
  paymentRecorded(data) {
    return {
      actionType: 'PAYMENT_RECORDED',
      userId: data.userId,
      resource: {
        type: 'PAYMENT',
        id: data.paymentId,
      },
      financial: {
        amount: data.amount,
        currency: 'KES',
      },
      result: {
        status: 'SUCCESS',
        message: `Payment of KES ${data.amount.toLocaleString()} recorded`,
      },
      compliance: {
        regulatoryFramework: ['PCI-DSS', 'SOX'],
      },
    };
  },

  /**
   * Legal disclosure accepted
   */
  disclosureAccepted(data) {
    return {
      actionType: 'DISCLOSURE_ACCEPTED',
      userId: data.userId,
      resource: {
        type: 'DISCLOSURE',
        id: data.disclosureId,
        name: 'Legal Disclosure & Terms',
      },
      financial: {
        apr: data.apr,
        amount: data.amount,
      },
      result: {
        status: 'SUCCESS',
        message: 'User accepted legal disclosures',
      },
      compliance: {
        dataClassification: 'CONFIDENTIAL',
        regulatoryFramework: ['GDPR', 'TILA'],
      },
    };
  },

  /**
   * Data access
   */
  dataAccessed(data) {
    return {
      actionType: 'DATA_ACCESSED',
      userId: data.userId,
      resource: {
        type: 'CUSTOMER',
        id: data.customerId,
      },
      result: {
        status: 'SUCCESS',
        message: `Customer data accessed: ${data.dataType}`,
      },
      compliance: {
        dataClassification: 'RESTRICTED',
        piiPresent: true,
        regulatoryFramework: ['GDPR', 'CCPA'],
      },
    };
  },

  /**
   * Failed login attempt
   */
  loginFailed(data) {
    return {
      actionType: 'LOGIN_FAILED',
      userId: data.userId || 'UNKNOWN',
      result: {
        status: 'FAILURE',
        message: 'Login failed - invalid credentials',
        errorCode: 'INVALID_CREDENTIALS',
      },
      compliance: {
        regulatoryFramework: ['GDPR'],
      },
    };
  },
};

/**
 * Example usage hook for React components
 */
export function useAuditLog() {
  const loggerRef = React.useRef(null);

  React.useEffect(() => {
    if (!loggerRef.current) {
      loggerRef.current = new AuditLogger({
        apiEndpoint: '/api/audit/logs',
        batchSize: 50,
        flushInterval: 60000,
      });
    }
  }, []);

  return {
    log: (entry) => loggerRef.current?.log(entry),
    flush: () => loggerRef.current?.flush(),
    AuditEvents,
  };
}

export default AuditLogger;
