import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Customers from './pages/Customers';
import ActiveLoans from './pages/ActiveLoans';
import LoanRequests from './pages/LoanRequests';
import Reports from './pages/Reports';
import NewLoan from './pages/NewLoan';
import CustomerDetail from './pages/CustomerDetail';
import { supabase } from './lib/supabase';

import Admin from './pages/Admin';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        } />

        <Route path="/admin" element={
          <DashboardLayout>
            <Admin />
          </DashboardLayout>
        } />

        <Route path="/leads" element={
          <DashboardLayout>
            <Leads />
          </DashboardLayout>
        } />

        <Route path="/customers" element={
          <DashboardLayout>
            <Customers />
          </DashboardLayout>
        } />

        <Route path="/customers/:id" element={
          <DashboardLayout>
            <CustomerDetail />
          </DashboardLayout>
        } />

        <Route path="/active-loans" element={
          <DashboardLayout>
            <ActiveLoans />
          </DashboardLayout>
        } />

        <Route path="/requests" element={
          <DashboardLayout>
            <LoanRequests />
          </DashboardLayout>
        } />

        <Route path="/reports" element={
          <DashboardLayout>
            <Reports />
          </DashboardLayout>
        } />

        <Route path="/new-loan" element={
          <DashboardLayout>
            <NewLoan />
          </DashboardLayout>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
