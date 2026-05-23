import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Clock, ShieldOff } from 'lucide-react';
import { useAuth } from './context/AuthContext.jsx';

import DashboardLayout from './components/layout/DashboardLayout.jsx';
import Login           from './pages/Login.jsx';
import AuthCallback    from './pages/auth/callback.jsx';
import Dashboard       from './pages/Dashboard.jsx';
import Leads           from './pages/Leads.jsx';
import Customers       from './pages/Customers.jsx';
import CustomerDetail  from './pages/CustomerDetail.jsx';
import ActiveLoans     from './pages/ActiveLoans.jsx';
import LoanRequests    from './pages/LoanRequests.jsx';
import Repayments      from './pages/Repayments.jsx';
import LoanProducts    from './pages/LoanProducts.jsx';
import Reports         from './pages/Reports.jsx';
import NewLoan         from './pages/NewLoan.jsx';
import Admin           from './pages/Admin.jsx';

// ─── Zero-trust walls ─────────────────────────────────────────────────────────
// These are shown instead of /login so the user understands WHY they can't enter.

function PendingApprovalWall() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
          <Clock size={28} className="text-amber-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Awaiting Approval</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Your account has been registered successfully. An administrator must
          approve it before you can access the platform.
        </p>
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 font-medium">
          Contact <strong>mic1dev.me@gmail.com</strong> if you need urgent access.
        </div>
        <button
          onClick={logout}
          className="px-6 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function BlockedWall() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-10 max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto">
          <ShieldOff size={28} className="text-rose-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Access Suspended</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Your account has been suspended. Please contact the administrator
          if you believe this is an error.
        </p>
        <button
          onClick={logout}
          className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
// Reads auth state from context — NO extra Supabase calls here.
// All child routes share a single DashboardLayout instance (no re-mounts on nav).
function ProtectedRoute() {
  const { status, isAuthed, approvalState } = useAuth();

  // While AuthContext is bootstrapping show a neutral spinner
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (approvalState === 'pending') return <PendingApprovalWall />;
  if (approvalState === 'blocked') return <BlockedWall />;
  if (!isAuthed)                   return <Navigate to="/login" replace />;

  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Router>
      <Routes>
        {/* ── Public ─────────────────────────────────────────────────────── */}
        <Route path="/login"         element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* ── Protected — all share ONE DashboardLayout instance ──────────── */}
        <Route element={<ProtectedRoute />}>
          <Route path="/"               element={<Dashboard />} />
          <Route path="/leads"          element={<Leads />} />
          <Route path="/customers"      element={<Customers />} />
          <Route path="/customers/:id"  element={<CustomerDetail />} />
          <Route path="/active-loans"   element={<ActiveLoans />} />
          <Route path="/requests"       element={<LoanRequests />} />
          <Route path="/repayments"     element={<Repayments />} />
          <Route path="/loan-products"  element={<LoanProducts />} />
          <Route path="/new-loan"       element={<NewLoan />} />
          <Route path="/reports"        element={<Reports />} />
          <Route path="/admin"          element={<Admin />} />
        </Route>

        {/* ── Fallback ────────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}