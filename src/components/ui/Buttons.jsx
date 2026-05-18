import React from 'react';

/**
 * Button - Primary action button with disabled states and loading micro-interactions
 */
export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary', // 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  size = 'md', // 'sm' | 'md' | 'lg'
  disabled = false,
  loading = false,
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
}) {
  const variantStyles = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg',
    secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-900 shadow-sm hover:shadow-md',
    success: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md hover:shadow-lg',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-lg',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg',
  };

  const sizeStyles = {
    sm: 'px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-lg',
    md: 'px-5 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold rounded-xl',
    lg: 'px-6 sm:px-8 py-4 sm:py-4.5 text-base sm:text-lg font-bold rounded-xl',
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center gap-2 transition-all duration-200
        active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
          <span>Processing…</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon size={18} />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon size={18} />}
        </>
      )}
    </button>
  );
}

/**
 * ButtonGroup - Horizontal group of buttons
 */
export function ButtonGroup({ children, orientation = 'horizontal', className = '' }) {
  return (
    <div
      className={`
        flex gap-2 sm:gap-3
        ${orientation === 'vertical' ? 'flex-col' : 'flex-row'}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/**
 * IconButton - Compact button for icons, often used in headers
 */
export function IconButton({
  onClick,
  icon: Icon,
  label = '',
  disabled = false,
  variant = 'neutral', // 'neutral' | 'primary' | 'danger'
  size = 'md', // 'sm' | 'md' | 'lg'
  className = '',
}) {
  const variantStyles = {
    neutral: 'text-slate-600 hover:bg-slate-100',
    primary: 'text-emerald-600 hover:bg-emerald-50',
    danger: 'text-red-600 hover:bg-red-50',
  };

  const sizeStyles = {
    sm: 'p-1.5 sm:p-2',
    md: 'p-2 sm:p-2.5',
    lg: 'p-3 sm:p-4',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`
        rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <Icon size={iconSizes[size]} />
    </button>
  );
}
