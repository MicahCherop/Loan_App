/**
 * Tailwind Configuration for Wekulo Finance
 * 
 * This configuration establishes the professional fintech design system
 * with consistent colors, spacing, typography, and animations
 */

export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Deep slate neutrals for trust and professionalism
        slate: {
          '50': '#f8fafc',   // Lightest - backgrounds
          '100': '#f1f5f9',
          '200': '#e2e8f0',
          '300': '#cbd5e1',
          '400': '#94a3b8',
          '500': '#64748b',
          '600': '#475569',  // Body text
          '700': '#334155',
          '800': '#1e293b',
          '900': '#0f172a',  // Darkest - headings, sidebar
        },
        // Emerald for positive financial actions
        emerald: {
          '50': '#f0fdf4',
          '100': '#dcfce7',
          '200': '#bbf7d0',
          '300': '#86efac',
          '400': '#4ade80',
          '500': '#22c55e',
          '600': '#16a34a',  // Primary CTA
          '700': '#15803d',
          '800': '#166534',
          '900': '#134e4a',
        },
        // Amber for warnings and caution
        amber: {
          '50': '#fffbeb',
          '100': '#fef3c7',
          '200': '#fde68a',
          '300': '#fcd34d',
          '400': '#fbbf24',
          '500': '#f59e0b',
          '600': '#d97706',  // Warning accent
          '700': '#b45309',
          '800': '#92400e',
          '900': '#78350f',
        },
        // Red for errors and overdue items
        red: {
          '50': '#fef2f2',
          '100': '#fee2e2',
          '200': '#fecaca',
          '300': '#fca5a5',
          '400': '#f87171',
          '500': '#ef4444',
          '600': '#dc2626',  // Error/Overdue
          '700': '#b91c1c',
          '800': '#991b1b',
          '900': '#7f1d1d',
        },
      },

      spacing: {
        // Refined spacing scale for mobile-first design
        // Based on 4px unit: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 56px, 64px, 72px, 80px, 96px
      },

      typography: {
        // Custom typography scale
        DEFAULT: {
          css: {
            color: '#475569',  // slate-600
            a: {
              color: '#16a34a',  // emerald-600
            },
            strong: {
              color: '#0f172a',  // slate-900
            },
            code: {
              color: '#dc2626',  // red-600
            },
          },
        },
      },

      // Custom animations for micro-interactions
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-light': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-sm': 'bounce 1s infinite',
      },

      // Box shadows optimized for fintech UI
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        'md': '0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -1px rgba(15, 23, 42, 0.06)',
        'lg': '0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -2px rgba(15, 23, 42, 0.05)',
        'xl': '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 10px 10px -5px rgba(15, 23, 42, 0.04)',
        'card': '0 4px 12px rgba(15, 23, 42, 0.08)',
        'card-hover': '0 12px 24px rgba(15, 23, 42, 0.12)',
      },

      // Border radius for consistent rounded corners
      borderRadius: {
        'none': '0',
        'sm': '0.5rem',    // 8px
        'md': '0.75rem',   // 12px
        'lg': '1rem',      // 16px
        'xl': '1.25rem',   // 20px
        '2xl': '1.5rem',   // 24px
        'full': '9999px',
      },

      // Transition timing for smooth micro-interactions
      transitionDuration: {
        '200': '200ms',  // Quick: hover, focus
        '300': '300ms',  // Medium: state changes
        '500': '500ms',  // Slow: page transitions
      },

      // Custom gradient backgrounds
      backgroundImage: {
        'gradient-light': 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
        'gradient-emerald': 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      },

      // Z-index scale for layering
      zIndex: {
        '0': '0',
        '10': '10',
        '20': '20',
        '30': '30',
        '40': '40',
        '50': '50',
        'nav-mobile': '40',      // Bottom nav
        'dropdown': '50',        // Dropdowns
        'modal': '50',           // Modals
        'tooltip': '60',         // Tooltips
      },
    },
  },

  plugins: [
    // Plugin: Custom focus ring styling
    function ({ addBase, matchUtilities, theme }) {
      matchUtilities(
        {
          focus: (value) => ({
            '&:focus': {
              outline: 'none',
              borderColor: '#16a34a', // emerald-600
              boxShadow: `0 0 0 3px rgba(22, 163, 74, 0.1)`,
            },
          }),
        },
        { values: theme('colors') }
      );

      // Add custom utility classes
      addBase({
        // Smooth transitions as base
        '*': {
          '@apply transition-colors duration-200': {},
        },
        // High-contrast focus for accessibility
        'button:focus, input:focus, select:focus, textarea:focus': {
          '@apply ring-2 ring-emerald-500/20': {},
        },
      });
    },

    // Plugin: Custom border utilities
    function ({ addUtilities }) {
      const newUtilities = {
        '.border-subtle': {
          borderColor: 'rgba(15, 23, 42, 0.1)',
        },
        '.border-light': {
          borderColor: 'rgba(15, 23, 42, 0.05)',
        },
        '.shadow-card': {
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
        },
        '.shadow-card-hover': {
          boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)',
        },
      };
      addUtilities(newUtilities);
    },
  ],
};

/**
 * USAGE EXAMPLES
 * 
 * Color Palette:
 * - text-slate-900: Deep heading text
 * - text-slate-600: Body copy
 * - text-slate-500: Secondary text
 * - text-emerald-600: Primary CTAs
 * - text-amber-600: Warnings
 * - text-red-600: Errors
 * 
 * Spacing:
 * - p-4 sm:p-6: Mobile/desktop padding
 * - gap-4 sm:gap-6: Grid gaps
 * - mb-6 sm:mb-8: Vertical spacing
 * 
 * Borders & Shadows:
 * - border border-slate-200/60: Subtle border with transparency
 * - shadow-sm hover:shadow-md: Card effect
 * - shadow-card: Card shadow utility
 * 
 * Interactions:
 * - focus:ring-2 focus:ring-emerald-500/20: Focus state
 * - active:scale-95: Press feedback
 * - hover:shadow-md: Hover enhancement
 * 
 * Typography:
 * - text-2xl font-bold: Card metric values
 * - text-xs uppercase tracking-wider font-semibold: Labels
 * - text-sm text-slate-500: Hints
 * 
 * Responsive:
 * - hidden md:flex: Show on desktop only
 * - px-4 sm:px-6 lg:px-8: Responsive padding
 * - grid-cols-1 sm:grid-cols-2 lg:grid-cols-3: Responsive grid
 */
