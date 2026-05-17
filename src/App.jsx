import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase.js';

import DashboardLayout from './components/layout/DashboardLayout.jsx';
import Login from './pages/Login.jsx';
import AuthCallback from './pages/auth/callback.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Leads from './pages/Leads.jsx';
import Customers from './pages/Customers.jsx';
import CustomerDetail from './pages/CustomerDetail.jsx';
import ActiveLoans from './pages/ActiveLoans.jsx';
import LoanRequests from './pages/LoanRequests.jsx';
import Reports from './pages/Reports.jsx';
import NewLoan from './pages/NewLoan.jsx';
import Admin from './pages/Admin.jsx';

// ✅ FIX 1: ProtectedRoute checks for a live Supabase session before rendering
// children. If there's no session it redirects to /login immediately, without
// relying on DashboardLayout's internal navigate() as the only safety net.
// Shows a neutral spinner while the async session check is in flight so the
// protected page never flashes to unauthenticated users.
function ProtectedRoute() {
  const [status, setStatus] = useState('checking'); // 'checking' | 'authed' | 'unauthed'

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setStatus(session ? 'authed' : 'unauthed');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setStatus(session ? 'authed' : 'unauthed');
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (status === 'checking') {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'unauthed') {
    return <Navigate to="/login" replace />;
  }

  // ✅ FIX 2: <Outlet /> renders the matched child route inside DashboardLayout.
  // DashboardLayout is declared here once — not repeated on every route —
  // so it never re-mounts when navigating between pages.
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected routes — all share ONE DashboardLayout instance */}
        <Route element={<ProtectedRoute />}>
          <Route path="/"               element={<Dashboard />} />
          <Route path="/leads"          element={<Leads />} />
          <Route path="/customers"      element={<Customers />} />
          <Route path="/customers/:id"  element={<CustomerDetail />} />
          <Route path="/active-loans"   element={<ActiveLoans />} />
          <Route path="/requests"       element={<LoanRequests />} />
          <Route path="/reports"        element={<Reports />} />
          <Route path="/new-loan"       element={<NewLoan />} />
          <Route path="/admin"          element={<Admin />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}