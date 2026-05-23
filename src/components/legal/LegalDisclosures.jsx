import React, { useState } from 'react';
import { X, ChevronDown, AlertCircle } from 'lucide-react';

/**
 * LegalModal - Professional legal disclosure modal
 * Displays APR, fees, terms, data protection, licensing info
 * 
 * Features:
 * - Expandable sections for each disclosure
 * - Mandatory scrolling to bottom before acceptance
 * - Timestamp of acceptance
 * - Checkbox for explicit consent
 */
export function LegalModal({
  isOpen,
  onClose,
  onAccept,
  loanDetails = {},
  disclosureId = null, // For audit tracking
}) {
  const [expanded, setExpanded] = useState({
    apr: true,
    fees: false,
    prepayment: false,
    dataProtection: false,
    licensing: false,
  });
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [acceptedAt, setAcceptedAt] = useState(null);
  const [isAccepted, setIsAccepted] = useState(false);

  const toggleSection = (section) => {
    setExpanded((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleScroll = (e) => {
    const element = e.target;
    // Check if scrolled to bottom (within 10px)
    if (
      element.scrollHeight - element.scrollTop <= element.clientHeight + 10
    ) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    if (!isAccepted || !hasScrolledToBottom) {
      alert('Please read all terms and check the acceptance checkbox.');
      return;
    }

    const timestamp = new Date().toISOString();
    setAcceptedAt(timestamp);

    // Call parent handler with audit data
    onAccept?.({
      disclosureId,
      acceptedAt: timestamp,
      loanAmount: loanDetails.amount,
      apr: loanDetails.apr,
      acceptedFrom: 'LegalModal',
      userAgent: navigator.userAgent,
      timestamp: new Date().getTime(),
    });

    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-slate-900">
            Legal Disclosures & Terms
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
        >
          {/* APR Disclosure */}
          <DisclosureSection
            title="Annual Percentage Rate (APR)"
            expanded={expanded.apr}
            onToggle={() => toggleSection('apr')}
          >
            <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded mb-4">
              <p className="font-bold text-emerald-900 text-2xl">
                {loanDetails.apr || '12.5'}%
              </p>
              <p className="text-sm text-emerald-700 mt-1">
                Annual Percentage Rate
              </p>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              The Annual Percentage Rate (APR) represents the annual cost of a
              loan including all fees and charges. The APR is calculated in
              accordance with the{' '}
              <strong>Truth in Lending Act (Regulation Z)</strong>.
            </p>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded mb-4">
              <div className="flex gap-3">
                <AlertCircle size={20} className="text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900 text-sm">
                    Important Disclosure
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    The APR shown is an example based on your credit profile.
                    Your actual APR may vary based on verification and
                    underwriting review.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span>Loan Amount:</span>
                <span className="font-semibold text-slate-900">
                  KSh {loanDetails.amount?.toLocaleString() || '—'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span>Loan Term:</span>
                <span className="font-semibold text-slate-900">
                  {loanDetails.term || '—'} months
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span>Monthly Payment (estimated):</span>
                <span className="font-semibold text-slate-900">
                  KSh {loanDetails.monthlyPayment?.toLocaleString() || '—'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span>Total Interest:</span>
                <span className="font-semibold text-slate-900">
                  KSh {loanDetails.totalInterest?.toLocaleString() || '—'}
                </span>
              </div>
            </div>
          </DisclosureSection>

          {/* Fees & Charges */}
          <DisclosureSection
            title="Fees & Charges"
            expanded={expanded.fees}
            onToggle={() => toggleSection('fees')}
          >
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-3 border-b border-slate-200">
                <span className="text-slate-600">Origination Fee</span>
                <span className="font-semibold text-slate-900">2.5%</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-200">
                <span className="text-slate-600">Late Payment Fee</span>
                <span className="font-semibold text-slate-900">
                  KSh 500 or 5% of payment
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-200">
                <span className="text-slate-600">Processing Fee</span>
                <span className="font-semibold text-slate-900">KSh 1,500</span>
              </div>
              <div className="flex justify-between py-3 border-b border-slate-200">
                <span className="text-slate-600">Default Fee</span>
                <span className="font-semibold text-slate-900">KSh 2,500</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-4">
              Fees are charged in accordance with our standard lending practices
              and are disclosed before loan disbursement.
            </p>
          </DisclosureSection>

          {/* Prepayment & Early Payoff */}
          <DisclosureSection
            title="Prepayment & Early Payoff"
            expanded={expanded.prepayment}
            onToggle={() => toggleSection('prepayment')}
          >
            <p className="text-sm text-slate-600 mb-3">
              <strong>Good news:</strong> You can pay off your loan early
              without any prepayment penalty. Early repayment will reduce your
              total interest costs.
            </p>

            <p className="text-sm text-slate-600">
              To make an early payment, contact our customer service team at{' '}
                <strong>support@rfgcapital.com</strong> or call{' '}
              <strong>+254 700 123 456</strong>.
            </p>
          </DisclosureSection>

          {/* Data Protection & Privacy */}
          <DisclosureSection
            title="Data Protection & Privacy"
            expanded={expanded.dataProtection}
            onToggle={() => toggleSection('dataProtection')}
          >
            <div className="space-y-4 text-sm text-slate-600">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">
                  Your Data is Protected
                </h4>
                <p>
                  We use industry-leading encryption (AES-256) and secure
                  servers to protect your personal information. Your data is
                  never sold to third parties.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-2">
                  Compliance Standards
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>GDPR (General Data Protection Regulation)</li>
                  <li>CCPA (California Consumer Privacy Act)</li>
                  <li>Data Protection Act 2019 (Kenya)</li>
                  <li>ISO 27001 (Information Security Management)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-2">
                  Your Rights
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Right to access your data</li>
                  <li>Right to correct inaccurate information</li>
                  <li>Right to erasure ("right to be forgotten")</li>
                  <li>Right to data portability</li>
                </ul>
              </div>

              <p className="text-xs text-slate-500">
                Full privacy policy available at:{' '}
                <strong>rfgcapital.com/privacy</strong>
              </p>
            </div>
          </DisclosureSection>

          {/* Licensing & Regulatory */}
          <DisclosureSection
            title="Licensing & Regulatory Information"
            expanded={expanded.licensing}
            onToggle={() => toggleSection('licensing')}
          >
            <div className="space-y-4 text-sm">
              <div className="bg-slate-50 p-4 rounded">
                <p className="font-semibold text-slate-900 mb-2">
                  Company Credentials
                </p>
                <div className="space-y-2 text-slate-600">
                  <div>
                    <p className="text-xs text-slate-500">Company Name</p>
                    <p className="font-medium">RFG Capital Limited</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Registration Number</p>
                    <p className="font-medium">BN-2024-001234</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">License Number</p>
                    <p className="font-medium">FL-2024-5678 (CBK)</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Registered Address</p>
                    <p className="font-medium">
                      Nairobi, Kenya 00100
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-900 mb-2">Regulatory Bodies</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-1">✓</span>
                    <span>
                      <strong>Central Bank of Kenya (CBK)</strong> - Regulated
                      and supervised
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-1">✓</span>
                    <span>
                      <strong>Communications Authority (CA)</strong> - Compliant
                      with data privacy
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-1">✓</span>
                    <span>
                      <strong>Kenya Revenue Authority (KRA)</strong> - Tax
                      compliant
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                <p className="text-xs text-blue-700">
                  <strong>Investor Protection:</strong> Our lending practices
                  comply with all CBK guidelines and international best
                  practices for consumer protection.
                </p>
              </div>
            </div>
          </DisclosureSection>

          {/* Late Payment Terms */}
          <div className="bg-red-50 border border-red-200 p-4 rounded">
            <p className="font-semibold text-red-900 mb-2">
              ⚠️ Late Payment Consequences
            </p>
            <ul className="text-sm text-red-800 space-y-2">
              <li>• Late payment fee of KSh 500 (charged after 5 days)</li>
              <li>• Additional interest accrual on outstanding balance</li>
              <li>• Negative impact on your credit score</li>
              <li>• Possible legal action after 90 days of default</li>
            </ul>
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className="border-t border-slate-200 px-6 py-4 space-y-4 bg-slate-50">
          {/* Scroll indicator */}
          {!hasScrolledToBottom && (
            <div className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded flex items-center gap-2">
              <AlertCircle size={14} />
              Please scroll down to read all terms before accepting
            </div>
          )}

          {/* Acceptance Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isAccepted}
              onChange={(e) => setIsAccepted(e.target.checked)}
              disabled={!hasScrolledToBottom}
              className="mt-1 w-5 h-5 accent-emerald-600"
            />
            <span className="text-sm text-slate-600">
              I have read and agree to all terms and conditions, legal
              disclosures, and privacy policies as presented above.
            </span>
          </label>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 rounded-lg font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              disabled={!isAccepted || !hasScrolledToBottom}
              className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              Accept & Continue
            </button>
          </div>

          {acceptedAt && (
            <p className="text-xs text-slate-500 text-center">
              Accepted at {new Date(acceptedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * DisclosureSection - Expandable disclosure section
 */
function DisclosureSection({ title, expanded, onToggle, children }) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <h3 className="font-semibold text-slate-900 text-left">{title}</h3>
        <ChevronDown
          size={20}
          className={`text-slate-600 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && <div className="px-4 py-4 bg-white">{children}</div>}
    </div>
  );
}

/**
 * LegalFooter - Professional footer with links to legal documents
 */
export function LegalFooter({ onOpenModal }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 py-12 mt-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <h3 className="font-bold text-white mb-4">RFG Capital</h3>
            <p className="text-sm text-slate-400 mb-4">
              Safe, reliable lending for Kenya's financial future.
            </p>
            <p className="text-xs text-slate-500">
              Licensed by Central Bank of Kenya (CBK)
              <br />
              License #: FL-2024-5678
            </p>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => onOpenModal?.('terms')}
                  className="text-slate-300 hover:text-emerald-400 transition-colors"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenModal?.('privacy')}
                  className="text-slate-300 hover:text-emerald-400 transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenModal?.('disclosures')}
                  className="text-slate-300 hover:text-emerald-400 transition-colors"
                >
                  Legal Disclosures
                </button>
              </li>
              <li>
                <a
                  href="/compliance"
                  className="text-slate-300 hover:text-emerald-400 transition-colors"
                >
                  Compliance
                </a>
              </li>
            </ul>
          </div>

          {/* Financial Info */}
          <div>
            <h4 className="font-semibold text-white mb-4">Financial Info</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => onOpenModal?.('apr')}
                  className="text-slate-300 hover:text-emerald-400 transition-colors"
                >
                  APR Disclosure
                </button>
              </li>
              <li>
                <a
                  href="/rates"
                  className="text-slate-300 hover:text-emerald-400 transition-colors"
                >
                  Current Rates
                </a>
              </li>
              <li>
                <a
                  href="/fees"
                  className="text-slate-300 hover:text-emerald-400 transition-colors"
                >
                  Fee Schedule
                </a>
              </li>
              <li>
                <a
                  href="/faq"
                  className="text-slate-300 hover:text-emerald-400 transition-colors"
                >
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="tel:+254700123456"
                  className="text-slate-300 hover:text-emerald-400 transition-colors"
                >
                  +254 700 123 456
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@rfgcapital.com"
                  className="text-slate-300 hover:text-emerald-400 transition-colors"
                >
                  support@rfgcapital.com
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  className="text-slate-300 hover:text-emerald-400 transition-colors"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800 py-6 flex flex-col sm:flex-row items-center justify-between">
          {/* Copyright */}
          <p className="text-xs text-slate-500">
            © {currentYear} RFG Capital Limited. All rights reserved.
          </p>

          {/* Security Badges */}
          <div className="flex gap-4 mt-4 sm:mt-0">
            <div className="text-xs text-slate-500">
              🔒 SSL Secured
            </div>
            <div className="text-xs text-slate-500">
              ✓ PCI Compliant
            </div>
            <div className="text-xs text-slate-500">
              📊 ISO 27001
            </div>
          </div>
        </div>

        {/* Compliance Notice */}
        <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-slate-400">
          <p>
            <strong className="text-slate-200">Regulatory Disclosure:</strong>{' '}
            RFG Capital Limited is licensed and regulated by the Central Bank
            of Kenya. All lending products comply with the Central Bank Lending
            Code and national financial regulations. This website does not
            constitute an offer to lend and is for informational purposes only.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default LegalModal;
