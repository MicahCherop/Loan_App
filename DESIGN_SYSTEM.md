# RFG Capital UI/UX Refactor Guide

## Professional Fintech Design System

This guide documents the comprehensive UI refactor for RFG Capital's loan application. The design system prioritizes **trust**, **clarity**, and **mobile-first responsiveness**.

---

## 🎨 Design Principles

### 1. **Visual Hierarchy Through Depth**
- **Background**: Gradient slate-50 to white
- **Cards**: White with subtle borders (`border-slate-200/60`)
- **Interactions**: Emerald highlights for positive actions

### 2. **Color Palette**
```
Neutrals (Trust & Professionalism):
  - slate-900 (Deep navy for headings)
  - slate-600 (Body text)
  - slate-50 (Light backgrounds)
  - slate-200/60 (Subtle borders with transparency)

Financial Actions (Positive):
  - emerald-600 (Primary CTAs - Approve, Submit, Confirm)
  - emerald-500 (Hover states)
  - emerald-50 (Background highlights)

Warnings (Caution):
  - amber-600 (Payment reminders)
  - amber-50 (Background for alerts)

Errors/Risks (Critical):
  - red-600 (Overdue, rejections)
  - red-50 (Error backgrounds)
```

### 3. **Typography Hierarchy**
```
Page Titles:     text-3xl lg:text-4xl font-bold text-slate-900
Section Titles:  text-lg sm:text-xl font-bold text-slate-900
Card Labels:     text-xs uppercase tracking-wider font-semibold
Body Text:       text-sm sm:text-base text-slate-600
Captions:        text-xs text-slate-500
```

---

## 📱 Mobile-First Responsive Strategy

### Breakpoints Used
```
Default (mobile):     < 640px
sm (tablets):         ≥ 640px
md (laptops):         ≥ 768px
lg (desktops):        ≥ 1024px
xl (large screens):   ≥ 1280px
```

### Layout Breakpoints

#### Mobile (< md)
- **Sidebar**: Hidden
- **Navigation**: Fixed bottom navigation bar (20px height)
- **Content**: Full width - 16px side padding
- **Bottom Padding**: pb-24 (to avoid nav overlap)
- **Grid**: Single column `grid-cols-1`

#### Desktop (≥ md)
- **Sidebar**: Fixed left sidebar (w-72 = 288px)
- **Navigation**: Full-height vertical nav
- **Main Content**: Offset by sidebar `md:ml-72`
- **Grid**: Multi-column `sm:grid-cols-2 lg:grid-cols-3 lg:grid-cols-4`

---

## 🎯 Component Architecture

### 1. **DataCard** - Metric Display
```jsx
<DataCard
  label="Outstanding Balance"
  value="KSh 450,000"
  subtext="Total amount due"
  icon={AlertCircle}
  variant="critical"  // neutral | success | warning | critical
  onClick={() => navigate('/balance')}
/>
```

**Features:**
- Subtle borders with transparency (`border-slate-200/60`)
- Icon support with contextual colors
- Variant-based styling (neutral → success → warning → critical)
- Click handlers for navigation
- Loading states with skeleton animation
- Trend indicators with icons

---

### 2. **CurrencyInput** - Financial Data Entry
```jsx
<CurrencyInput
  label="Loan Amount"
  currency="KES"  // KES | USD | EUR
  value="50000"
  onChange={(val) => setAmount(val)}
  error={errors.amount}
  hint="Minimum KSh 10,000"
  required
/>
```

**Micro-Interactions:**
- Currency symbol pinned inside input (`absolute left-4`)
- Focus state: `border-emerald-500 ring-2 ring-emerald-500/20`
- Error state: `border-red-300 ring-2 ring-red-500/20`
- Number auto-formatting with toLocaleString()
- Mobile-optimized keyboard (`inputMode="numeric"`)

---

### 3. **TextInput & SelectInput** - Standard Forms
```jsx
<TextInput
  label="Loan Purpose"
  value={purpose}
  onChange={(val) => setPurpose(val)}
  error={errors.purpose}
  hint="Tell us what you'll use the loan for"
  required
/>

<SelectInput
  label="Duration"
  options={[
    { value: '3', label: '3 months' },
    { value: '6', label: '6 months' },
  ]}
  value={duration}
  onChange={(val) => setDuration(val)}
/>
```

---

### 4. **Button** - Action Triggers
```jsx
<Button
  variant="primary"     // primary | secondary | success | warning | danger
  size="md"            // sm | md | lg
  loading={isSubmitting}
  disabled={isSubmitting}
  fullWidth
  icon={Plus}
  iconPosition="left"
>
  Submit Application
</Button>
```

**Micro-Interactions:**
- Disabled state: `opacity-60 cursor-not-allowed`
- Loading state: Animated spinner + "Processing…" text
- Active state: `active:scale-95` (physical feedback)
- Focus ring: `focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500`

---

### 5. **ResponsiveLayout** - Navigation Structure
```jsx
<MainLayout
  navItems={[
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/loans', label: 'My Loans', icon: FileText },
  ]}
  onLogout={handleLogout}
  userInitial="W"
>
  {children}
</MainLayout>
```

**Desktop (≥ md):**
- Left sidebar with dark blue background (`bg-slate-900`)
- Full-height vertical navigation
- Logo and user section at top
- Logout button at bottom

**Mobile (< md):**
- Bottom navigation bar (fixed)
- Max 4 main items visible
- "More" dropdown for additional items
- Collapsible menu on tap

---

## 📐 Spacing System

### Vertical Spacing (Padding/Margin)
```
Component Internal:  p-6 (24px desktop) or p-4 (16px mobile)
Section Gaps:        gap-6 sm:gap-8 (24-32px responsive)
Page Padding:        py-6 sm:py-8 (24-32px)
Section Margins:     mb-8 sm:mb-10 (32-40px)
```

### Border & Shadow Strategy
```
Cards:        border border-slate-200/60 shadow-sm hover:shadow-md
Hover:        Subtle shadow increase + border color intensify
Focus:        ring-2 ring-emerald-500/20 (non-intrusive)
Disabled:     opacity-60 (all elements)
```

---

## 🎭 Micro-Interactions

### 1. **Focus States**
```css
input:focus {
  border-color: emerald-500;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  outline: none;
}
```

### 2. **Hover States**
- Buttons: Background color darken
- Cards: Shadow increase + border brighten
- Links: Text color change + underline

### 3. **Active States**
```css
button:active {
  transform: scale(0.95);
}
```

### 4. **Loading States**
```jsx
{loading ? (
  <div className="animate-spin w-4 h-4 border-2 border-current/30 border-t-current rounded-full" />
) : (
  'Submit'
)}
```

### 5. **Error States**
- Red border: `border-red-300`
- Red ring: `ring-2 ring-red-500/20`
- Error message: `text-red-600` with icon

---

## 📊 Dashboard Layout Pattern

### Recommended Structure
```jsx
<PageHeader title="Dashboard" description="..." />

<PageSection title="Financial Overview">
  <DashboardMetricsGrid
    activeLoanCount={3}
    totalOutstandingBalance={450000}
    nextPayoutDate={date}
    monthlyPayment={45000}
  />
</PageSection>

<Grid columns={2}>
  <PageSection title="Active Loans">
    {/* Loan cards */}
  </PageSection>
  
  <PageSection title="Apply for Loan">
    {/* Form */}
  </PageSection>
</Grid>
```

### Responsive Grid
```
Mobile (< 640px):     1 column
Tablet (640-1024px):  2 columns
Desktop (1024px+):    3-4 columns
```

---

## 🔒 Accessibility & Best Practices

### 1. **Semantic HTML**
- Use `<label>` for all form fields
- Use `<button>` for interactive elements
- Use `aria-label` for icon buttons
- Use `aria-describedby` for error messages

### 2. **Color Contrast**
- Text on white: WCAG AA (4.5:1 minimum)
- Don't rely on color alone (use icons + text)
- Error messages: Red + icon + text

### 3. **Touch Targets**
- Minimum 44x44px on mobile
- Buttons: `px-4 py-3` = 44-48px tall
- Icons: `size-16` or `size-20`

### 4. **Focus Management**
- All interactive elements keyboard accessible
- Focus visible: `focus:ring-2 focus:ring-emerald-500`
- Tab order logical and natural

---

## 💡 Implementation Checklist

- [x] Color palette tokens in Tailwind config
- [x] Typography scale defined
- [x] Spacing system consistent (4px base unit)
- [x] All form inputs with focus/error states
- [x] Buttons with loading/disabled states
- [x] Cards with hover effects
- [x] Mobile bottom nav < 640px
- [x] Desktop sidebar ≥ 768px
- [x] Touch-friendly sizing (44x44px minimum)
- [x] Keyboard navigation support
- [x] Error messages with icons
- [x] Loading skeletons
- [x] Responsive images (use max-w constraints)
- [x] Performance: Lazy load heavy components

---

## 🚀 Integration Steps

### 1. Import Components
```jsx
import { DataCard } from '@/components/ui/DataCard';
import { CurrencyInput } from '@/components/ui/FormInputs';
import { Button } from '@/components/ui/Buttons';
import { MainLayout } from '@/components/layout/ResponsiveLayout';
import { DashboardMetricsGrid, PageHeader, PageSection } from '@/components/ui/Layout';
```

### 2. Wrap App with Layout
```jsx
<MainLayout navItems={navItems} onLogout={handleLogout}>
  <YourPageContent />
</MainLayout>
```

### 3. Build Pages Using Components
```jsx
<PageHeader title="Dashboard" />
<PageSection title="Metrics">
  <DashboardMetricsGrid {...metrics} />
</PageSection>
```

### 4. Custom Tailwind Config
Add to `tailwind.config.js`:
```js
theme: {
  extend: {
    colors: {
      slate: {
        '50': '#f8fafc',
        '900': '#0f172a',
      },
    },
  },
}
```

---

## 📱 Mobile Testing Checklist

- [ ] Test on iPhone 12 (390x844)
- [ ] Test on Android (360x800)
- [ ] Test on tablet (768x1024)
- [ ] Bottom nav doesn't overlap content
- [ ] Forms are scrollable on small screens
- [ ] Touch targets are 44x44px minimum
- [ ] No horizontal scroll on any screen size
- [ ] Images scale correctly

---

## 🎓 Design Tokens Reference

| Token | Value | Usage |
|-------|-------|-------|
| `text-xs` | 12px | Captions, hints, labels |
| `text-sm` | 14px | Body text, form hints |
| `text-base` | 16px | Regular body, buttons |
| `text-lg` | 18px | Section titles |
| `text-2xl` | 24px | Card values |
| `text-3xl` | 30px | Page titles |
| `p-4` | 16px | Mobile padding |
| `p-6` | 24px | Desktop padding |
| `gap-4` | 16px | Mobile gaps |
| `gap-6` | 24px | Desktop gaps |
| `rounded-lg` | 8px | Small elements |
| `rounded-xl` | 12px | Cards |
| `rounded-2xl` | 16px | Large cards |
| `shadow-sm` | Subtle | Default |
| `shadow-md` | Medium | Hover state |
| `shadow-lg` | Heavy | Dropdowns |

---

## 🔗 Component Files

- `src/components/ui/DataCard.jsx` - Metric cards
- `src/components/ui/FormInputs.jsx` - Form controls
- `src/components/ui/Buttons.jsx` - Action buttons
- `src/components/ui/Layout.jsx` - Page structure
- `src/components/layout/ResponsiveLayout.jsx` - Navigation layout
- `src/pages/DashboardRefactoredExample.jsx` - Complete example

---

## 📚 Additional Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Fintech Design Principles](https://www.nngroup.com/articles/fintech-ux/)
- [Mobile-First Responsive Design](https://www.nngroup.com/articles/mobile-first-responsive-web-design/)
- [Accessible Components](https://www.nngroup.com/articles/accessibility-usability/)

