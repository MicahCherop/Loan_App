import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Leads from './pages/Leads.jsx';
import Customers from './pages/Customers.jsx';
import ActiveLoans from './pages/ActiveLoans.jsx';
import LoanRequests from './pages/LoanRequests.jsx';
import Reports from './pages/Reports.jsx';
import NewLoan from './pages/NewLoan.jsx';
import CustomerDetail from './pages/CustomerDetail.jsx';
import Admin from './pages/Admin.jsx';
import AuthCallback from './pages/auth/callback.jsx';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/"
          element={
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          }
        />
        <Route
          path="/admin"
          element={
            <DashboardLayout>
              <Admin />
            </DashboardLayout>
          }
        />
        <Route
          path="/leads"
          element={
            <DashboardLayout>
              <Leads />
            </DashboardLayout>
          }
        />
        <Route
          path="/customers"
          element={
            <DashboardLayout>
              <Customers />
            </DashboardLayout>
          }
        />
        <Route
          path="/customers/:id"
          element={
            <DashboardLayout>
              <CustomerDetail />
            </DashboardLayout>
          }
        />
        <Route
          path="/active-loans"
          element={
            <DashboardLayout>
              <ActiveLoans />
            </DashboardLayout>
          }
        />
        <Route
          path="/requests"
          element={
            <DashboardLayout>
              <LoanRequests />
            </DashboardLayout>
          }
        />
        <Route
          path="/reports"
          element={
            <DashboardLayout>
              <Reports />
            </DashboardLayout>
          }
        />
        <Route
          path="/new-loan"
          element={
            <DashboardLayout>
              <NewLoan />
            </DashboardLayout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
