# Component Quick Reference Guide

## 🚀 Quick Start

Copy and use these component snippets to build professional fintech UIs.

---

## DataCard - Display Metrics

### Basic Usage
```jsx
import { DataCard } from '@/components/ui/DataCard';
import { DollarSign } from 'lucide-react';

<DataCard
  label="Outstanding Balance"
  value="KSh 450,000"
  subtext="Total amount due"
  icon={DollarSign}
  variant="critical"
  onClick={() => navigate('/balance')}
/>
```

### Variants
- `neutral` - Gray (default)
- `success` - Green (positive)
- `warning` - Amber (caution)
- `critical` - Red (urgent)

### With Trending
```jsx
<DataCard
  label="Monthly Revenue"
  value="KSh 2.3M"
  subtext="Last 30 days"
  trend="+12.5%"
  trendIcon={TrendingUp}
  icon={TrendingUp}
  variant="success"
/>
```

### Loading State
```jsx
<DataCard
  loading={isLoading}
  label="Loading..."
  value="—"
/>
```

---

## CurrencyInput - Financial Data Entry

### Basic
```jsx
import { CurrencyInput } from '@/components/ui/FormInputs';

<CurrencyInput
  label="Loan Amount"
  currency="KES"
  value={amount}
  onChange={setAmount}
  required
/>
```

### With Error
```jsx
<CurrencyInput
  label="Loan Amount"
  currency="KES"
  value={amount}
  onChange={setAmount}
  error="Amount must be at least KSh 10,000"
  hint="Maximum: KSh 1,000,000"
  required
/>
```

### Currencies
- `KES` → KSh
- `USD` → $
- `EUR` → €

---

## TextInput - Standard Text Fields

```jsx
import { TextInput } from '@/components/ui/FormInputs';

<TextInput
  label="Full Name"
  type="text"
  value={name}
  onChange={setName}
  placeholder="Enter your name"
  hint="Please provide your legal name"
  required
/>
```

### With Error
```jsx
<TextInput
  label="Email Address"
  type="email"
  value={email}
  onChange={setEmail}
  error="Please enter a valid email"
  required
/>
```

---

## SelectInput - Dropdowns

```jsx
import { SelectInput } from '@/components/ui/FormInputs';

<SelectInput
  label="Loan Duration"
  value={duration}
  onChange={setDuration}
  options={[
    { value: '3', label: '3 months' },
    { value: '6', label: '6 months' },
    { value: '12', label: '12 months' },
  ]}
  placeholder="Select duration"
  required
/>
```

---

## Button - Action Triggers

### Variants
```jsx
import { Button } from '@/components/ui/Buttons';

// Primary (emerald)
<Button variant="primary">Submit</Button>

// Secondary (gray)
<Button variant="secondary">Cancel</Button>

// Success (bright green)
<Button variant="success">Approve</Button>

// Warning (amber)
<Button variant="warning">Review</Button>

// Danger (red)
<Button variant="danger">Reject</Button>
```

### Sizes
```jsx
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

### States
```jsx
// Loading
<Button loading={isSubmitting}>
  Submit
</Button>

// Disabled
<Button disabled>Disabled</Button>

// Full Width
<Button fullWidth>Wide Button</Button>
```

### With Icons
```jsx
<Button icon={Plus} iconPosition="left">
  Add New
</Button>

<Button icon={Send} iconPosition="right">
  Send
</Button>
```

### Group
```jsx
import { ButtonGroup } from '@/components/ui/Buttons';

<ButtonGroup orientation="horizontal">
  <Button variant="secondary">Cancel</Button>
  <Button variant="primary">Save</Button>
</ButtonGroup>
```

---

## PageHeader - Page Titles

```jsx
import { PageHeader } from '@/components/ui/Layout';
import { Home } from 'lucide-react';

<PageHeader
  title="Dashboard"
  description="Overview of your loan portfolio"
  icon={Home}
  action={<Button>Add Loan</Button>}
/>
```

---

## PageSection - Content Groups

```jsx
import { PageSection } from '@/components/ui/Layout';

<PageSection
  title="Active Loans"
  description="Your current loans"
  actions={<Button size="sm">View All</Button>}
>
  {/* Content here */}
</PageSection>
```

---

## DashboardMetricsGrid - Full Metrics Display

```jsx
import { DashboardMetricsGrid } from '@/components/ui/Layout';

<DashboardMetricsGrid
  activeLoanCount={3}
  nextPayoutDate="2024-06-15"
  totalOutstandingBalance={450000}
  monthlyPayment={45000}
  lastPaymentDate="2024-05-10"
  loading={isLoading}
  onCardClick={(section) => {
    console.log(`User clicked: ${section}`);
  }}
/>
```

---

## MainLayout - Responsive Navigation

```jsx
import { MainLayout } from '@/components/layout/ResponsiveLayout';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/loans', label: 'My Loans', icon: FileText },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/repayments', label: 'Repayments', icon: TrendingUp },
];

<MainLayout
  navItems={navItems}
  onLogout={handleLogout}
  userInitial="JD"
>
  <YourPageContent />
</MainLayout>
```

### Handles Automatically:
- ✅ Desktop sidebar (≥ md)
- ✅ Mobile bottom navigation (< md)
- ✅ Responsive spacing
- ✅ Content offset for navigation

---

## Grid - Responsive Layout

```jsx
import { Grid } from '@/components/ui/Layout';

<Grid columns={3} gap="gap-6">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>
```

### Column Options
- `1` - Always 1 column
- `2` - 1 column (mobile), 2 columns (tablet+)
- `3` - 1, 2, 3 columns (progressive)
- `4` - 1, 2, 4 columns (progressive)
- `auto` - Intelligent distribution

---

## Card - Container

```jsx
import { Card } from '@/components/ui/Layout';

<Card>
  <h3 className="font-bold text-slate-900 mb-3">Loan Details</h3>
  <p className="text-sm text-slate-600">Information here</p>
</Card>
```

### With Styling
```jsx
<Card
  border={true}
  padding="p-6"
  shadow={true}
  onClick={() => navigate('/loan/123')}
  className="hover:border-emerald-300/40"
>
  Clickable Card
</Card>
```

---

## IconButton - Icon-Only Actions

```jsx
import { IconButton } from '@/components/ui/Buttons';
import { Trash2, Edit, Eye } from 'lucide-react';

<IconButton
  icon={Edit}
  label="Edit"
  variant="primary"
  size="md"
  onClick={handleEdit}
/>

<IconButton
  icon={Trash2}
  label="Delete"
  variant="danger"
  onClick={handleDelete}
/>
```

---

## Form Example - Complete Application

```jsx
import { useState } from 'react';
import { CurrencyInput, TextInput, SelectInput } from '@/components/ui/FormInputs';
import { Button, ButtonGroup } from '@/components/ui/Buttons';
import { PageSection, Card } from '@/components/ui/Layout';

export function LoanApplicationForm() {
  const [form, setForm] = useState({
    amount: '',
    duration: '',
    purpose: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!form.amount || !form.duration || !form.purpose) {
      setErrors({ submit: 'Please fill all fields' });
      return;
    }

    setLoading(true);
    try {
      // Submit logic
      const response = await submitLoan(form);
      console.log('Success:', response);
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageSection title="Apply for a Loan">
      <Card className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-5">
          
          <CurrencyInput
            label="Loan Amount"
            currency="KES"
            value={form.amount}
            onChange={(val) => setForm({ ...form, amount: val })}
            error={errors.amount}
            hint="Minimum: KSh 10,000 | Maximum: KSh 1,000,000"
            required
          />

          <SelectInput
            label="Loan Duration"
            value={form.duration}
            onChange={(val) => setForm({ ...form, duration: val })}
            options={[
              { value: '3', label: '3 months' },
              { value: '6', label: '6 months' },
              { value: '12', label: '12 months' },
            ]}
            error={errors.duration}
            required
          />

          <TextInput
            label="Loan Purpose"
            value={form.purpose}
            onChange={(val) => setForm({ ...form, purpose: val })}
            error={errors.purpose}
            hint="What will you use this loan for?"
            required
          />

          {errors.submit && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200/60 text-red-700 text-sm">
              {errors.submit}
            </div>
          )}

          <ButtonGroup>
            <Button variant="secondary" fullWidth>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              fullWidth
              loading={loading}
              disabled={loading}
            >
              Submit Application
            </Button>
          </ButtonGroup>
        </form>
      </Card>
    </PageSection>
  );
}
```

---

## Styling Patterns

### Common Classes

```jsx
// Text Sizes
className="text-xs"           // 12px - Captions
className="text-sm"           // 14px - Body
className="text-base"         // 16px - Normal
className="text-lg"           // 18px - Titles
className="text-2xl"          // 24px - Values
className="text-3xl"          // 30px - Headers

// Font Weights
className="font-medium"       // 500 - Standard
className="font-semibold"     // 600 - Emphasis
className="font-bold"         // 700 - Strong

// Colors
className="text-slate-900"    // Headings
className="text-slate-600"    // Body text
className="text-slate-500"    // Secondary
className="text-emerald-600"  // Success/Primary
className="text-amber-600"    // Warning
className="text-red-600"      // Error

// Spacing
className="p-4 sm:p-6"        // Padding
className="m-4"               // Margin
className="gap-4 sm:gap-6"    // Grid gap
className="space-y-4"         // Vertical space

// Responsive
className="hidden md:flex"    // Hide mobile, show desktop
className="flex md:hidden"    // Show mobile, hide desktop
className="w-full md:w-1/2"   // Responsive width
className="col-span-1 sm:col-span-2" // Grid span

// Borders & Shadows
className="border border-slate-200/60"     // Subtle border
className="rounded-xl"                     // Rounded corners
className="shadow-sm hover:shadow-md"      // Elevation
className="focus:ring-2 focus:ring-emerald-500/20" // Focus

// Interactions
className="hover:bg-slate-50"              // Hover
className="active:scale-95"                // Press
className="transition-all duration-200"    // Animation
className="disabled:opacity-60"            // Disabled
```

---

## Tips & Tricks

### ✨ Best Practices
1. **Always use `required` prop** on mandatory form fields
2. **Provide `hint` or `error`** messages for all inputs
3. **Use loading states** for async operations
4. **Group related buttons** with `ButtonGroup`
5. **Use descriptive icons** from lucide-react
6. **Test on mobile** before deployment
7. **Maintain aspect ratios** for responsive images
8. **Use semantic HTML** (button, form, section, etc.)

### 🎨 Color Usage
- **Primary Actions**: emerald-600
- **Warnings**: amber-600
- **Errors**: red-600
- **Success**: emerald-500
- **Disabled**: opacity-60

### 📱 Mobile Considerations
- Bottom nav on mobile (< md)
- Touch targets 44x44px minimum
- Test on actual devices
- Use `inputMode="numeric"` for numbers
- Avoid horizontal scrolling

---

## 📞 Support

For component updates, issues, or feature requests:
1. Check existing components in `src/components/ui/`
2. Review `DESIGN_SYSTEM.md` for guidelines
3. Reference examples in `src/pages/DashboardRefactoredExample.jsx`
