import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { Button } from '../components/ui/Buttons.jsx';
import { CurrencyInput, TextInput, SelectInput } from '../components/ui/FormInputs.jsx';
import { DashboardMetricsGrid, PageHeader, PageSection, Card, Grid } from '../components/ui/Layout.jsx';
import { MainLayout } from '../components/layout/ResponsiveLayout.jsx';
import { Plus, Send, Eye, Trash2, TrendingUp, Home, Users, FileText, Settings, LogOut } from 'lucide-react';

/**
 * PROFESSIONAL FINTECH DASHBOARD EXAMPLE
 * 
 * This page demonstrates best practices for:
 * ✓ Mobile-first responsive design
 * ✓ Professional data visualization
 * ✓ Micro-interactions (focus states, loading states)
 * ✓ Accessibility and semantic HTML
 * ✓ Consistent spacing and typography hierarchy
 * ✓ Currency formatting and input handling
 * ✓ Error states and validation
 */

const DashboardExample = () => {
  // State Management
  const [stats, setStats] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form State
  const [newLoanForm, setNewLoanForm] = useState({
    amount: '',
    duration: '',
    purpose: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock Navigation Items
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/loans', label: 'My Loans', icon: FileText },
    { path: '/customers', label: 'Customers', icon: Users },
    { path: '/repayments', label: 'Repayments', icon: TrendingUp },
    { path: '/reports', label: 'Reports', icon: FileText },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  // Fetch Dashboard Data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Simulated data - replace with actual Supabase queries
        setStats({
          activeLoanCount: 3,
          totalOutstandingBalance: 450000,
          nextPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          monthlyPayment: 45000,
          lastPaymentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        });

        setLoans([
          {
            id: '1',
            customerName: 'John Doe',
            amount: 150000,
            outstanding: 125000,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'active',
          },
          {
            id: '2',
            customerName: 'Jane Smith',
            amount: 200000,
            outstanding: 175000,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'active',
          },
          {
            id: '3',
            customerName: 'Bob Johnson',
            amount: 100000,
            outstanding: 75000,
            dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'overdue',
          },
        ]);

        setError(null);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Form Validation
  const validateForm = () => {
    const errors = {};

    if (!newLoanForm.amount || Number(newLoanForm.amount) <= 0) {
      errors.amount = 'Please enter a valid loan amount';
    }
    if (!newLoanForm.duration) {
      errors.duration = 'Please select a loan duration';
    }
    if (!newLoanForm.purpose || newLoanForm.purpose.trim().length < 5) {
      errors.purpose = 'Please provide a loan purpose (minimum 5 characters)';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Form Submission
  const handleSubmitNewLoan = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log('New loan submitted:', newLoanForm);

      // Reset form
      setNewLoanForm({ amount: '', duration: '', purpose: '' });
      setFormErrors({});

      // Show success notification (integrate with toast system)
      alert('Loan application submitted successfully!');
    } catch (err) {
      console.error('Submission error:', err);
      setFormErrors({ submit: 'Failed to submit loan. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    // Implement logout logic
    console.log('User logged out');
  };

  const formatKES = (amount) => {
    const n = Number(amount) || 0;
    if (n >= 1_000_000) return `KSh ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `KSh ${(n / 1_000).toFixed(1)}K`;
    return `KSh ${n.toLocaleString()}`;
  };

  return (
    <MainLayout
      navItems={navItems}
      onLogout={handleLogout}
      userInitial="W"
    >
      {/* Main Content Container */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
        
        {/* Page Header */}
        <PageHeader
          title="Dashboard"
          description="Overview of your loan portfolio and key metrics"
          icon={Home}
        />

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 sm:p-5 rounded-xl bg-red-50/80 border border-red-200/60 text-red-700 text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Metrics Grid - Responsive and Professional */}
        <PageSection title="Your Financial Overview" description="Key metrics at a glance">
          <DashboardMetricsGrid
            activeLoanCount={stats?.activeLoanCount || 0}
            nextPayoutDate={stats?.nextPayoutDate}
            totalOutstandingBalance={stats?.totalOutstandingBalance || 0}
            monthlyPayment={stats?.monthlyPayment || 0}
            lastPaymentDate={stats?.lastPaymentDate}
            loading={loading}
            onCardClick={(section) => console.log(`Clicked ${section}`)}
          />
        </PageSection>

        {/* Two-Column Layout: Active Loans + New Loan Form */}
        <Grid columns={2} gap="gap-6 sm:gap-8">
          
          {/* Active Loans Section */}
          <PageSection
            title="Active Loans"
            description={`${loans.length} loan${loans.length !== 1 ? 's' : ''}`}
          >
            <div className="space-y-3">
              {loading ? (
                <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />
              ) : loans.length === 0 ? (
                <Card>
                  <div className="text-center py-12">
                    <p className="text-slate-500 text-sm">No active loans yet</p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-4"
                      onClick={() => setNewLoanForm({ amount: '', duration: '', purpose: '' })}
                    >
                      Apply for a Loan
                    </Button>
                  </div>
                </Card>
              ) : (
                loans.map((loan) => {
                  const isOverdue = new Date(loan.dueDate) < new Date();
                  return (
                    <Card
                      key={loan.id}
                      className="hover:border-emerald-300/40"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
                            {loan.customerName}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Loan Amount: {formatKES(loan.amount)}
                          </p>
                        </div>
                        <span
                          className={`
                            px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold whitespace-nowrap
                            ${isOverdue
                              ? 'bg-red-100 text-red-700'
                              : loan.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-700'
                            }
                          `}
                        >
                          {isOverdue ? 'OVERDUE' : loan.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-slate-100">
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                            Outstanding
                          </p>
                          <p className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                            {formatKES(loan.outstanding)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                            Due Date
                          </p>
                          <p className={`text-lg sm:text-xl font-bold mt-1 ${isOverdue ? 'text-red-600' : 'text-slate-900'}`}>
                            {new Date(loan.dueDate).toLocaleDateString('en-KE', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="primary" size="sm" fullWidth icon={Eye} iconPosition="left">
                          View Details
                        </Button>
                        <Button variant="secondary" size="sm" icon={Send} />
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </PageSection>

          {/* New Loan Application Form */}
          <PageSection
            title="Apply for a Loan"
            description="Quick and easy application"
          >
            <Card className="border-emerald-200/40 bg-emerald-50/20">
              <form onSubmit={handleSubmitNewLoan} className="space-y-5">
                
                {/* Currency Input with Micro-Interactions */}
                <CurrencyInput
                  label="Loan Amount"
                  currency="KES"
                  value={newLoanForm.amount}
                  onChange={(val) => {
                    setNewLoanForm({ ...newLoanForm, amount: val });
                    if (formErrors.amount) setFormErrors({ ...formErrors, amount: null });
                  }}
                  error={formErrors.amount}
                  placeholder="50,000"
                  hint="Minimum KSh 10,000 | Maximum KSh 1,000,000"
                  required
                />

                {/* Duration Select */}
                <SelectInput
                  label="Loan Duration"
                  value={newLoanForm.duration}
                  onChange={(val) => {
                    setNewLoanForm({ ...newLoanForm, duration: val });
                    if (formErrors.duration) setFormErrors({ ...formErrors, duration: null });
                  }}
                  error={formErrors.duration}
                  options={[
                    { value: '3', label: '3 months' },
                    { value: '6', label: '6 months' },
                    { value: '12', label: '12 months' },
                    { value: '24', label: '24 months' },
                  ]}
                  placeholder="Select duration"
                  required
                />

                {/* Purpose Text Input */}
                <TextInput
                  label="Loan Purpose"
                  type="text"
                  value={newLoanForm.purpose}
                  onChange={(val) => {
                    setNewLoanForm({ ...newLoanForm, purpose: val });
                    if (formErrors.purpose) setFormErrors({ ...formErrors, purpose: null });
                  }}
                  error={formErrors.purpose}
                  placeholder="e.g., Business expansion, working capital"
                  hint="Tell us what you'll use the loan for"
                  required
                />

                {/* Submit Error */}
                {formErrors.submit && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200/60 text-red-700 text-sm font-medium">
                    {formErrors.submit}
                  </div>
                )}

                {/* Submit Button with Loading State */}
                <Button
                  type="submit"
                  variant="success"
                  size="lg"
                  fullWidth
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  icon={Plus}
                >
                  {isSubmitting ? 'Submitting' : 'Submit Application'}
                </Button>

                <p className="text-xs text-slate-500 text-center">
                  We'll review your application within 24 hours
                </p>
              </form>
            </Card>
          </PageSection>

        </Grid>

      </div>
    </MainLayout>
  );
};

export default DashboardExample;
