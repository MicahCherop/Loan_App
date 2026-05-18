import React from 'react';

/**
 * DataCard - Reusable component for displaying key metrics
 * Professional fintech card with subtle borders and spacing
 */
export function DataCard({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'neutral', // 'neutral' | 'success' | 'warning' | 'critical'
  trend,
  trendIcon: TrendIcon,
  onClick,
  loading = false,
}) {
  const variantStyles = {
    neutral: 'border-slate-200/60 bg-slate-50/40',
    success: 'border-emerald-200/60 bg-emerald-50/40',
    warning: 'border-amber-200/60 bg-amber-50/40',
    critical: 'border-red-200/60 bg-red-50/40',
  };

  const labelColors = {
    neutral: 'text-slate-600',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    critical: 'text-red-700',
  };

  const valueColors = {
    neutral: 'text-slate-900',
    success: 'text-emerald-900',
    warning: 'text-amber-900',
    critical: 'text-red-900',
  };

  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl border p-6 transition-all duration-200 backdrop-blur-sm
        ${variantStyles[variant]}
        ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300/80' : ''}
        ${loading ? 'opacity-60' : ''}
      `}
    >
      {/* Header: Label + Icon */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="p-2 rounded-lg bg-white/60">
              <Icon size={18} className={`${labelColors[variant]}`} />
            </div>
          )}
          <p className={`text-xs sm:text-sm font-semibold uppercase tracking-wider ${labelColors[variant]}`}>
            {label}
          </p>
        </div>
        {trend && TrendIcon && (
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
            <TrendIcon size={14} />
            {trend}
          </div>
        )}
      </div>

      {/* Value */}
      {loading ? (
        <div className="h-8 bg-slate-200/40 rounded animate-pulse" />
      ) : (
        <>
          <p className={`text-2xl sm:text-3xl font-bold ${valueColors[variant]}`}>
            {value}
          </p>
          {subtext && (
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              {subtext}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/**
 * DataCardSkeleton - Loading state for data cards
 */
export function DataCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/60 bg-slate-50/40 p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-slate-200/40 w-8 h-8" />
          <div className="h-3 w-20 bg-slate-200/40 rounded" />
        </div>
      </div>
      <div className="h-8 w-32 bg-slate-200/40 rounded mb-2" />
      <div className="h-3 w-24 bg-slate-200/40 rounded" />
    </div>
  );
}
