/**
 * FINTECH SECURITY & COMPLIANCE CHECKLIST
 * 
 * This document provides a comprehensive checklist for building secure,
 * legally compliant financial web applications. Use this as your
 * security & compliance implementation guide.
 */

export const FINTECH_SECURITY_CHECKLIST = {
  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 1: AUTHENTICATION & SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════
  authentication: {
    title: 'Authentication & Session Management',
    items: [
      {
        id: 'auth-1',
        task: 'Implement Multi-Factor Authentication (MFA)',
        description: 'Require 2FA for all user accounts (SMS, TOTP, email)',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['PCI-DSS', 'NIST', 'ISO27001'],
      },
      {
        id: 'auth-2',
        task: 'Use OAuth 2.0 + JWT for Authentication',
        description: 'Implement industry-standard auth with secure token management',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        link: 'https://tools.ietf.org/html/rfc6749',
      },
      {
        id: 'auth-3',
        task: 'Implement Session Timeouts',
        description: 'Auto-logout after 15-30 min inactivity + idle detection',
        status: 'NOT_STARTED',
        priority: 'HIGH',
        compliance: ['PCI-DSS', 'GDPR'],
      },
      {
        id: 'auth-4',
        task: 'Hash Passwords with Bcrypt/Argon2',
        description: 'Never store plain text passwords. Use strong hashing',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        code: 'bcrypt.hash(password, 12)',
      },
      {
        id: 'auth-5',
        task: 'Implement Account Lockout',
        description: 'Lock account after 5 failed login attempts (15 min)',
        status: 'NOT_STARTED',
        priority: 'HIGH',
      },
      {
        id: 'auth-6',
        task: 'Audit Login Attempts',
        description: 'Log all login attempts (success/failure) with IP',
        status: 'NOT_STARTED',
        priority: 'HIGH',
        compliance: ['GDPR', 'CCPA'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 2: ENCRYPTION & DATA PROTECTION
  // ═══════════════════════════════════════════════════════════════════════
  encryption: {
    title: 'Encryption & Data Protection',
    items: [
      {
        id: 'enc-1',
        task: 'Enforce HTTPS/TLS 1.2+',
        description: 'All traffic encrypted. Enable HSTS headers',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['PCI-DSS', 'GDPR', 'CCPA'],
        header: 'Strict-Transport-Security: max-age=31536000',
      },
      {
        id: 'enc-2',
        task: 'Encrypt Sensitive Data at Rest',
        description: 'Use AES-256 for SSNs, bank accounts, IDs',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['PCI-DSS'],
        code: 'crypto.createCipher("aes-256-cbc", secretKey)',
      },
      {
        id: 'enc-3',
        task: 'Implement Database Encryption',
        description: 'Encrypted database columns for PII fields',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['GDPR', 'CCPA'],
      },
      {
        id: 'enc-4',
        task: 'Use Secure Key Management',
        description: 'Store keys in HSM/Vault, rotate quarterly',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        tools: ['AWS KMS', 'HashiCorp Vault', 'Azure Key Vault'],
      },
      {
        id: 'enc-5',
        task: 'Implement SSL Certificate Pinning',
        description: 'Mobile apps pin certificates to prevent MITM',
        status: 'NOT_STARTED',
        priority: 'HIGH',
      },
      {
        id: 'enc-6',
        task: 'Encrypt API Responses',
        description: 'End-to-end encryption for sensitive endpoints',
        status: 'NOT_STARTED',
        priority: 'HIGH',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 3: FRONTEND SECURITY
  // ═══════════════════════════════════════════════════════════════════════
  frontend: {
    title: 'Frontend Security',
    items: [
      {
        id: 'fe-1',
        task: 'Prevent XSS (Cross-Site Scripting)',
        description: 'Sanitize all user inputs, use CSP headers',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        header: "Content-Security-Policy: default-src 'self'",
      },
      {
        id: 'fe-2',
        task: 'Prevent CSRF (Cross-Site Request Forgery)',
        description: 'Use CSRF tokens on all state-changing requests',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        code: 'X-CSRF-Token header + token validation',
      },
      {
        id: 'fe-3',
        task: 'Implement Form Double-Submit Protection',
        description: 'Disable submit button during request, lock inputs',
        status: 'NOT_STARTED',
        priority: 'HIGH',
      },
      {
        id: 'fe-4',
        task: 'Validate All Inputs Client-Side & Server-Side',
        description: 'Never trust client validation alone',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
      },
      {
        id: 'fe-5',
        task: 'Never Store Sensitive Data in LocalStorage',
        description: 'Use secure HttpOnly cookies for tokens',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
      },
      {
        id: 'fe-6',
        task: 'Implement Content Security Policy',
        description: 'Restrict inline scripts, require nonce',
        status: 'NOT_STARTED',
        priority: 'HIGH',
      },
      {
        id: 'fe-7',
        task: 'Disable Debug Mode in Production',
        description: 'Never expose stack traces or sensitive info',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 4: API SECURITY
  // ═══════════════════════════════════════════════════════════════════════
  api: {
    title: 'API Security',
    items: [
      {
        id: 'api-1',
        task: 'Implement Rate Limiting',
        description: '100 req/min per user, 1000 req/min per IP',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
      },
      {
        id: 'api-2',
        task: 'Use API Versioning',
        description: 'Version all endpoints (/v1/, /v2/) for safety',
        status: 'NOT_STARTED',
        priority: 'HIGH',
      },
      {
        id: 'api-3',
        task: 'Implement API Authentication (API Keys)',
        description: 'Require valid API key for all requests',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
      },
      {
        id: 'api-4',
        task: 'Validate Content-Type Headers',
        description: 'Reject requests with unexpected content types',
        status: 'NOT_STARTED',
        priority: 'HIGH',
      },
      {
        id: 'api-5',
        task: 'Implement Request Signing',
        description: 'Sign requests with HMAC-SHA256 signature',
        status: 'NOT_STARTED',
        priority: 'HIGH',
      },
      {
        id: 'api-6',
        task: 'Log All API Requests',
        description: 'Timestamp, user, endpoint, status, response time',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
      },
      {
        id: 'api-7',
        task: 'Implement Pagination Limits',
        description: 'Max 100 items per page to prevent DoS',
        status: 'NOT_STARTED',
        priority: 'HIGH',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 5: AUDIT & LOGGING
  // ═══════════════════════════════════════════════════════════════════════
  audit: {
    title: 'Audit & Logging',
    items: [
      {
        id: 'audit-1',
        task: 'Implement Immutable Audit Logs',
        description: 'Tamper-proof logs with cryptographic hashing',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['GDPR', 'PCI-DSS', 'SOX'],
      },
      {
        id: 'audit-2',
        task: 'Log All Financial Transactions',
        description: 'Every loan, payment, adjustment with user/IP/timestamp',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['PCI-DSS', 'SOX'],
      },
      {
        id: 'audit-3',
        task: 'Log Data Access & Modification',
        description: 'Who accessed/modified what PII and when',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['GDPR', 'CCPA'],
      },
      {
        id: 'audit-4',
        task: 'Implement Event Timestamps',
        description: 'Use server time (not client), store UTC',
        status: 'NOT_STARTED',
        priority: 'HIGH',
      },
      {
        id: 'audit-5',
        task: 'Store Logs for 7+ Years',
        description: 'Archive logs securely and separately',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['GDPR', 'SOX', 'SEC'],
      },
      {
        id: 'audit-6',
        task: 'Encrypt Audit Logs',
        description: 'Logs are as sensitive as the data they track',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 6: DATA PRIVACY (GDPR/CCPA)
  // ═══════════════════════════════════════════════════════════════════════
  privacy: {
    title: 'Data Privacy & Regulations',
    items: [
      {
        id: 'priv-1',
        task: 'Implement Right to Erasure',
        description: 'Allow users to delete all personal data (GDPR)',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['GDPR', 'CCPA'],
      },
      {
        id: 'priv-2',
        task: 'Implement Data Portability',
        description: 'Export user data in machine-readable format (JSON/CSV)',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['GDPR', 'CCPA'],
      },
      {
        id: 'priv-3',
        task: 'Create Privacy Policy',
        description: 'Clear, transparent policy on data collection/usage',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['GDPR', 'CCPA'],
      },
      {
        id: 'priv-4',
        task: 'Implement Consent Management',
        description: 'Explicit opt-in for marketing, clear consent tracking',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['GDPR', 'CCPA'],
      },
      {
        id: 'priv-5',
        task: 'Data Processing Agreements (DPA)',
        description: 'DPA with third-party vendors (payment, email, etc)',
        status: 'NOT_STARTED',
        priority: 'HIGH',
        compliance: ['GDPR'],
      },
      {
        id: 'priv-6',
        task: 'Perform Data Protection Impact Assessment (DPIA)',
        description: 'Assess privacy risks of new features',
        status: 'NOT_STARTED',
        priority: 'HIGH',
        compliance: ['GDPR'],
      },
      {
        id: 'priv-7',
        task: 'Implement Breach Notification',
        description: 'Notify users of data breaches within 72 hours',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['GDPR', 'CCPA'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 7: FINANCIAL COMPLIANCE (KYC/AML)
  // ═══════════════════════════════════════════════════════════════════════
  financial: {
    title: 'Financial Compliance (KYC/AML)',
    items: [
      {
        id: 'fin-1',
        task: 'Implement KYC (Know Your Customer)',
        description: 'Verify identity, collect SSN/ID, perform background check',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['FinCEN', 'SEC', 'Banking Regulations'],
      },
      {
        id: 'fin-2',
        task: 'Implement AML (Anti-Money Laundering)',
        description: 'Sanctions list checking, transaction monitoring',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['FinCEN', 'Bank Secrecy Act'],
        tools: ['ComplyAdvantage', 'Accuity', 'Refinitiv'],
      },
      {
        id: 'fin-3',
        task: 'Verify Income & Employment',
        description: 'Use third-party verification (Veriff, Truework)',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
      },
      {
        id: 'fin-4',
        task: 'Implement Transaction Limits',
        description: 'Set daily/monthly limits based on verification level',
        status: 'NOT_STARTED',
        priority: 'HIGH',
      },
      {
        id: 'fin-5',
        task: 'Monitor Suspicious Activity',
        description: 'Flag unusual patterns, report to FinCEN if needed',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['FinCEN', 'SAR Filing'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 8: APR & DISCLOSURE COMPLIANCE (TILA/ECOA)
  // ═══════════════════════════════════════════════════════════════════════
  disclosures: {
    title: 'APR & Loan Disclosure Compliance',
    items: [
      {
        id: 'disc-1',
        task: 'Implement TILA Compliance (Truth in Lending)',
        description: 'Disclose APR, Finance Charge, Payment Schedule',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['TILA (15 USC 1601)'],
      },
      {
        id: 'disc-2',
        task: 'Display APR in Legal Window',
        description: 'APR shown prominently (16 CFR §226.16)',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        requirement: '18pt font minimum, contrasting background',
      },
      {
        id: 'disc-3',
        task: 'Disclose Late Payment Penalties',
        description: 'Amount, conditions, timing of late fees',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['TILA'],
      },
      {
        id: 'disc-4',
        task: 'Disclose Prepayment Terms',
        description: 'Any prepayment penalties, payoff options',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['TILA'],
      },
      {
        id: 'disc-5',
        task: 'Provide TILA Disclosures 3+ Days Before Loan',
        description: 'Loan estimate form with itemized costs',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['TILA', 'Dodd-Frank'],
      },
      {
        id: 'disc-6',
        task: 'Comply with ECOA (Equal Credit Opportunity)',
        description: 'No discrimination based on race, color, religion, sex, etc',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['ECOA (15 USC 1691)'],
      },
      {
        id: 'disc-7',
        task: 'Provide Adverse Action Notice',
        description: 'Explain reason if loan application denied',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        compliance: ['ECOA'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 9: INFRASTRUCTURE & MONITORING
  // ═══════════════════════════════════════════════════════════════════════
  infrastructure: {
    title: 'Infrastructure & Monitoring',
    items: [
      {
        id: 'infra-1',
        task: 'Implement WAF (Web Application Firewall)',
        description: 'Protect against OWASP Top 10 attacks',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        tools: ['AWS WAF', 'Cloudflare', 'Imperva'],
      },
      {
        id: 'infra-2',
        task: 'Use Security Headers',
        description: 'X-Frame-Options, X-Content-Type-Options, etc',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
      },
      {
        id: 'infra-3',
        task: 'Implement DDoS Protection',
        description: 'Rate limiting, IP blocking, traffic analysis',
        status: 'NOT_STARTED',
        priority: 'HIGH',
        tools: ['AWS Shield', 'Cloudflare', 'Akamai'],
      },
      {
        id: 'infra-4',
        task: 'Set Up Intrusion Detection (IDS)',
        description: 'Monitor network for suspicious activity',
        status: 'NOT_STARTED',
        priority: 'HIGH',
        tools: ['Suricata', 'Snort', 'AWS GuardDuty'],
      },
      {
        id: 'infra-5',
        task: 'Implement SIEM (Security Info & Event Mgmt)',
        description: 'Centralized log analysis and alerting',
        status: 'NOT_STARTED',
        priority: 'HIGH',
        tools: ['Splunk', 'ELK Stack', 'Sumologic'],
      },
      {
        id: 'infra-6',
        task: 'Set Up Vulnerability Scanning',
        description: 'Regular automated security scans (weekly)',
        status: 'NOT_STARTED',
        priority: 'HIGH',
        tools: ['Nessus', 'OpenVAS', 'Qualys'],
      },
      {
        id: 'infra-7',
        task: 'Implement Backup & Disaster Recovery',
        description: 'Daily encrypted backups, tested recovery plan',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 10: TESTING & VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════
  testing: {
    title: 'Security Testing & Verification',
    items: [
      {
        id: 'test-1',
        task: 'Perform Penetration Testing',
        description: 'Annual third-party pen test (approved list)',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
        frequency: 'Annually',
      },
      {
        id: 'test-2',
        task: 'Run SAST (Static Application Security Testing)',
        description: 'Code review for vulnerabilities (pre-commit)',
        status: 'NOT_STARTED',
        priority: 'HIGH',
        tools: ['SonarQube', 'Checkmarx', 'Fortify'],
      },
      {
        id: 'test-3',
        task: 'Run DAST (Dynamic Application Security Testing)',
        description: 'Runtime vulnerability scanning',
        status: 'NOT_STARTED',
        priority: 'HIGH',
        tools: ['Burp Suite', 'OWASP ZAP', 'Veracode'],
      },
      {
        id: 'test-4',
        task: 'Perform Dependency Scanning',
        description: 'Check for vulnerable npm/pip packages',
        status: 'NOT_STARTED',
        priority: 'HIGH',
        tools: ['npm audit', 'Snyk', 'WhiteSource'],
      },
      {
        id: 'test-5',
        task: 'Run Load/Stress Testing',
        description: 'Test system under peak load, find breaking points',
        status: 'NOT_STARTED',
        priority: 'HIGH',
      },
      {
        id: 'test-6',
        task: 'Test for SQL Injection',
        description: 'Verify all inputs are properly parameterized',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
      },
      {
        id: 'test-7',
        task: 'Test Authentication & Authorization',
        description: 'Verify role-based access control works correctly',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 11: DOCUMENTATION & GOVERNANCE
  // ═══════════════════════════════════════════════════════════════════════
  governance: {
    title: 'Documentation & Governance',
    items: [
      {
        id: 'gov-1',
        task: 'Create Security Policy Document',
        description: 'Incident response, access control, vendor management',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
      },
      {
        id: 'gov-2',
        task: 'Create Incident Response Plan',
        description: 'Step-by-step procedures for security incidents',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
      },
      {
        id: 'gov-3',
        task: 'Implement Change Management',
        description: 'Document all code changes, deployments, approvals',
        status: 'NOT_STARTED',
        priority: 'HIGH',
      },
      {
        id: 'gov-4',
        task: 'Create Disaster Recovery Plan',
        description: 'RTO/RPO targets, backup strategy, failover procedures',
        status: 'NOT_STARTED',
        priority: 'CRITICAL',
      },
      {
        id: 'gov-5',
        task: 'Create Data Retention Policy',
        description: 'How long data is kept, secure deletion procedures',
        status: 'NOT_STARTED',
        priority: 'HIGH',
        compliance: ['GDPR', 'CCPA'],
      },
      {
        id: 'gov-6',
        task: 'Conduct Employee Security Training',
        description: 'Phishing awareness, password management, etc',
        status: 'NOT_STARTED',
        priority: 'HIGH',
        frequency: 'Annually',
      },
    ],
  },
};

/**
 * COMPLIANCE FRAMEWORKS REFERENCE
 */
export const COMPLIANCE_FRAMEWORKS = {
  PCI_DSS: {
    name: 'Payment Card Industry Data Security Standard',
    scope: 'If you process credit cards',
    level: 'Level 1-4 depending on transaction volume',
    requirements: 13,
    website: 'https://www.pcisecuritystandards.org/',
  },
  GDPR: {
    name: 'General Data Protection Regulation (EU)',
    scope: 'Any personal data of EU residents',
    fines: '€20M or 4% of annual revenue (whichever is higher)',
    website: 'https://gdpr-info.eu/',
  },
  CCPA: {
    name: 'California Consumer Privacy Act',
    scope: 'California residents\' personal data',
    fines: '$2,500 per violation, $7,500 per intentional violation',
    website: 'https://oag.ca.gov/privacy/ccpa',
  },
  TILA: {
    name: 'Truth in Lending Act',
    scope: 'All consumer credit transactions',
    enforcer: 'CFPB (Consumer Financial Protection Bureau)',
    website: 'https://www.consumerfinance.gov/rules/tila/',
  },
  ECOA: {
    name: 'Equal Credit Opportunity Act',
    scope: 'Credit discrimination prevention',
    enforcer: 'CFPB, Federal Reserve',
    website: 'https://www.consumerfinance.gov/rules/ecoa/',
  },
  FCRA: {
    name: 'Fair Credit Reporting Act',
    scope: 'When using credit reports for decisions',
    enforcer: 'FTC',
    website: 'https://www.ftc.gov/business-guidance/privacy-security/fcra',
  },
  GLBA: {
    name: 'Gramm-Leach-Bliley Act',
    scope: 'Financial institutions\' customer data',
    enforcer: 'OCC, Federal Reserve',
    website: 'https://www.occ.gov/news-issuances/bulletins/2013/bulletin-2013-29.html',
  },
  FinCEN: {
    name: 'Financial Crimes Enforcement Network',
    scope: 'Anti-money laundering (AML), Know Your Customer (KYC)',
    enforcer: 'U.S. Treasury Department',
    website: 'https://www.fincen.gov/',
  },
  ISO27001: {
    name: 'Information Security Management System',
    scope: 'International info security standard',
    enforcer: 'Third-party certification',
    website: 'https://www.iso.org/isoiec-27001-information-security-management.html',
  },
  SOX: {
    name: 'Sarbanes-Oxley Act',
    scope: 'Public companies\' financial reporting',
    enforcer: 'SEC',
    website: 'https://www.sec.gov/about/laws/sox.pdf',
  },
};

/**
 * REGULATORY CONTACTS & ENFORCEMENT
 */
export const REGULATORY_CONTACTS = {
  CFPB: {
    name: 'Consumer Financial Protection Bureau',
    email: 'hello@consumerfinance.gov',
    phone: '+1-855-500-2357',
    website: 'https://www.consumerfinance.gov/',
    responsibility: 'Consumer lending, TILA, ECOA, FCRA',
  },
  FTC: {
    name: 'Federal Trade Commission',
    website: 'https://www.ftc.gov/',
    email: 'contact@ftc.gov',
    responsibility: 'Data privacy, FCRA, deceptive practices',
  },
  FinCEN: {
    name: 'Financial Crimes Enforcement Network',
    website: 'https://www.fincen.gov/',
    phone: '+1-703-905-3591',
    responsibility: 'AML, KYC, sanctions',
  },
  OCC: {
    name: 'Office of the Comptroller of the Currency',
    website: 'https://www.occ.treas.gov/',
    responsibility: 'National banks, banking regulations',
  },
};

export default FINTECH_SECURITY_CHECKLIST;
