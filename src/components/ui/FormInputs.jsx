import React, { useRef } from 'react';

/**
 * CurrencyInput - Input field with currency symbol display
 * Supports KES and USD with proper formatting and focus states
 */
export function CurrencyInput({
  value,
  onChange,
  currency = 'KES',
  placeholder = '0',
  disabled = false,
  error = null,
  hint = null,
  label = null,
  name = null,
  required = false,
  min = 0,
  className = '',
}) {
  const inputRef = useRef(null);

  const currencySymbols = {
    KES: 'KSh',
    USD: '$',
    EUR: '€',
  };

  const handleFocus = () => {
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  const handleChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    onChange?.(rawValue);
  };

  const displayValue = value ? Number(value).toLocaleString() : '';

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wider mb-2.5">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}

      <div
        className={`
          relative flex items-center rounded-xl border-2 transition-all duration-200
          ${disabled ? 'bg-slate-50 border-slate-100 cursor-not-allowed' : 'bg-white'}
          ${error ? 'border-red-300 focus-within:ring-2 focus-within:ring-red-500/20' : 'border-slate-200/60 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20'}
        `}
      >
        {/* Currency Symbol - Pinned Left */}
        <span className="absolute left-4 text-sm sm:text-base font-semibold text-slate-400 pointer-events-none">
          {currencySymbols[currency]}
        </span>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          inputMode="numeric"
          className={`
            w-full bg-transparent px-4 sm:px-5 py-3 sm:py-3.5 pl-12 sm:pl-14
            text-base sm:text-lg font-semibold text-slate-900 placeholder-slate-300
            focus:outline-none
            ${disabled ? 'text-slate-400' : ''}
          `}
        />
      </div>

      {/* Error State */}
      {error && (
        <p className="mt-2 text-xs sm:text-sm font-medium text-red-600 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}

      {/* Hint Text */}
      {!error && hint && (
        <p className="mt-2 text-xs sm:text-sm text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * TextInput - Standard text input with focus states
 */
export function TextInput({
  value,
  onChange,
  type = 'text',
  placeholder = '',
  disabled = false,
  error = null,
  label = null,
  hint = null,
  name = null,
  required = false,
  className = '',
  autoComplete = 'off',
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wider mb-2.5">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}

      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        className={`
          w-full rounded-xl border-2 px-4 sm:px-5 py-3 sm:py-3.5
          text-base sm:text-lg font-medium text-slate-900 placeholder-slate-300
          transition-all duration-200
          focus:outline-none
          ${disabled ? 'bg-slate-50 border-slate-100 cursor-not-allowed text-slate-400' : 'bg-white border-slate-200/60 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'}
          ${error ? 'border-red-300 focus:ring-2 focus:ring-red-500/20' : ''}
        `}
      />

      {error && (
        <p className="mt-2 text-xs sm:text-sm font-medium text-red-600 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}

      {!error && hint && (
        <p className="mt-2 text-xs sm:text-sm text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * SelectInput - Accessible dropdown with fintech styling
 */
export function SelectInput({
  value,
  onChange,
  options = [],
  placeholder = 'Select option',
  disabled = false,
  error = null,
  label = null,
  name = null,
  required = false,
  className = '',
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wider mb-2.5">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}

      <select
        name={name}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={`
          w-full rounded-xl border-2 px-4 sm:px-5 py-3 sm:py-3.5
          text-base sm:text-lg font-medium text-slate-900
          transition-all duration-200 appearance-none bg-white
          focus:outline-none
          ${disabled ? 'bg-slate-50 border-slate-100 cursor-not-allowed text-slate-400' : 'bg-white border-slate-200/60 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'}
          ${error ? 'border-red-300 focus:ring-2 focus:ring-red-500/20' : ''}
        `}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%238B94A5' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 1rem center',
          backgroundSize: '1.5em 1.5em',
          paddingRight: '2.5rem',
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {error && (
        <p className="mt-2 text-xs sm:text-sm font-medium text-red-600 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}
