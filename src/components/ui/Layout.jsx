import React from 'react';
import { DataCard, DataCardSkeleton } from './DataCard.jsx';
import { TrendingUp, Clock, AlertCircle, DollarSign } from 'lucide-react';

/**
 * DashboardMetricsGrid - Professional metrics display for loan dashboard
 * Showcases Active Loans, Next Payout Date, Outstanding Balance, and key insights
 */
export function DashboardMetricsGrid({
  activeLoanCount = 0,
  nextPayoutDate = null,
  totalOutstandingBalance = 0,
  monthlyPayment = 0,
  lastPaymentDate = null,
  loading = false,
  onCardClick,
}) {
  const formatKES = (amount) => {
    const n = Number(amount) || 0;
    if (n >= 1_000_000) return `KSh ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `KSh ${(n / 1_000).toFixed(1)}K`;
    return `KSh ${n.toLocaleString()}`;
  };

  const formatDate = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('en-KE', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const daysUntilPayment = nextPayoutDate
    ? Math.ceil((new Date(nextPayoutDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const isPaymentSoon = daysUntilPayment && daysUntilPayment <= 7;
  const isPaymentOverdue = daysUntilPayment && daysUntilPayment < 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {/* Active Loans Card */}
      {loading ? (
        <DataCardSkeleton />
      ) : (
        <DataCard
          label="Active Loans"
          value={activeLoanCount}
          subtext={activeLoanCount === 1 ? '1 loan' : `${activeLoanCount} loans`}
          icon={DollarSign}
          variant="neutral"
          onClick={() => onCardClick?.('loans')}
        />
      )}

      {/* Total Outstanding Balance Card */}
      {loading ? (
        <DataCardSkeleton />
      ) : (
        <DataCard
          label="Outstanding Balance"
          value={formatKES(totalOutstandingBalance)}
          subtext="Total amount due"
          icon={AlertCircle}
          variant={totalOutstandingBalance > 0 ? 'critical' : 'success'}
          onClick={() => onCardClick?.('balance')}
        />
      )}

      {/* Next Payout Date Card */}
      {loading ? (
        <DataCardSkeleton />
      ) : (
        <DataCard
          label="Next Payment Due"
          value={formatDate(nextPayoutDate)}
          subtext={
            daysUntilPayment === null
              ? 'No upcoming payments'
              : isPaymentOverdue
              ? `${Math.abs(daysUntilPayment)} days overdue`
              : daysUntilPayment === 0
              ? 'Due today'
              : `In ${daysUntilPayment} days`
          }
          icon={Clock}
          variant={isPaymentOverdue ? 'critical' : isPaymentSoon ? 'warning' : 'neutral'}
          onClick={() => onCardClick?.('schedule')}
        />
      )}

      {/* Monthly Payment Card */}
      {loading ? (
        <DataCardSkeleton />
      ) : (
        <DataCard
          label="Monthly Payment"
          value={formatKES(monthlyPayment)}
          subtext={lastPaymentDate ? `Last: ${formatDate(lastPaymentDate)}` : 'No payments recorded'}
          icon={TrendingUp}
          variant="success"
          onClick={() => onCardClick?.('payments')}
        />
      )}
    </div>
  );
}

/**
 * PageHeader - Standard page header with title and description
 */
export function PageHeader({ title, description, action, icon: Icon }) {
  return (
    <div className="mb-8 sm:mb-10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className="p-3 rounded-xl bg-emerald-50 hidden sm:flex">
              <Icon size={24} className="text-emerald-600" />
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
              {title}
            </h1>
            {description && (
              <p className="text-sm sm:text-base text-slate-500 mt-2 max-w-2xl">
                {description}
              </p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}

/**
 * PageSection - Grouped content section with consistent spacing
 */
export function PageSection({ title, description, children, actions }) {
  return (
    <section className="mb-8 sm:mb-10">
      {(title || actions) && (
        <div className="flex items-center justify-between mb-6">
          <div>
            {title && (
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex gap-2 sm:gap-3">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Card - Generic container card for grouping content
 */
export function Card({
  children,
  className = '',
  border = true,
  padding = 'p-6',
  shadow = true,
  onClick,
  href,
}) {
  const baseClasses = `
    rounded-2xl transition-all duration-200 backdrop-blur-sm
    ${border ? 'border border-slate-200/60' : 'border border-slate-100'}
    ${shadow ? 'shadow-sm hover:shadow-md' : ''}
    ${onClick ? 'cursor-pointer' : ''}
    ${padding}
    bg-white/80
  `;

  if (href) {
    return (
      <a href={href} className={baseClasses}>
        {children}
      </a>
    );
  }

  return (
    <div onClick={onClick} className={`${baseClasses} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Grid - Responsive grid container
 */
export function Grid({ children, columns = 'auto', gap = 'gap-6' }) {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    auto: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <div className={`grid ${colClasses[columns]} ${gap}`}>
      {children}
    </div>
  );
}
