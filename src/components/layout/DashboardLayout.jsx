/**
 * DashboardLayout.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shell that wraps all protected pages.
 * All user identity data (displayName, roleLabel, isDeveloper, isAdmin, logout)
 * is consumed from AuthContext — NO local Supabase calls, NO duplicate auth logic.
 *
 * Fixes integrated:
 *  • Logout button works: calls AuthContext.logout() which signs out and hard-
 *    navigates to /login (state fully reset).
 *  • Display name reads DB profile.full_name first, then Google metadata, then
 *    email prefix — never shows a hardcoded "Officer".
 *  • Role label reads profile.role from DB via AuthContext.roleLabel.
 *  • isMobileMenuOpen is declared before any function that references it.
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3, Users, UserPlus, Bell, LogOut,
  LayoutDashboard, ClipboardList, ShieldCheck,
  Menu, X, AlertCircle, CreditCard, Package,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useIdleTimeout } from '../../hooks/useIdleTimeout.js';

export default function DashboardLayout({ children }) {
  const location = useLocation();
  const {
    displayName,   // Derived in AuthContext: DB full_name → Google name → email prefix
    roleLabel,     // Derived in AuthContext: maps profile.role to human label
    isDeveloper,
    isAdmin,
    logout,        // AuthContext.logout: signs out + clears storage + hard-nav
    authError,
  } = useAuth();

  // ✅ Declared FIRST — before any handler that references it (no temporal dead zone)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Idle timeout: calls AuthContext.logout() after 10 minutes of inactivity
  useIdleTimeout(logout);

  // ── Navigation items ───────────────────────────────────────────────────────
  const menuItems = [
    { name: 'Dashboard',     path: '/',              icon: LayoutDashboard },
    { name: 'Leads',         path: '/leads',         icon: UserPlus        },
    { name: 'Customers',     path: '/customers',     icon: Users           },
    { name: 'Active Loans',  path: '/active-loans',  icon: ClipboardList   },
    { name: 'Loan Requests', path: '/requests',      icon: Bell            },
    { name: 'Repayments',    path: '/repayments',    icon: CreditCard      },
    { name: 'Loan Products', path: '/loan-products', icon: Package         },
    { name: 'Reports',       path: '/reports',       icon: BarChart3       },
  ];

  // Admin link is only visible to developers and admins
  if (isDeveloper || isAdmin) {
    menuItems.push({ name: 'Admin', path: '/admin', icon: ShieldCheck });
  }

  const isActive = (path) => location.pathname === path;

  // ── Reusable nav link ──────────────────────────────────────────────────────
  const NavLink = ({ item, mobile = false }) => (
    <Link
      to={item.path}
      onClick={() => mobile && setIsMobileMenuOpen(false)}
      className={
        mobile
          ? `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              isActive(item.path)
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
            }`
          : `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
              isActive(item.path)
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`
      }
    >
      <item.icon
        size={18}
        className={mobile ? '' : isActive(item.path) ? 'text-blue-500' : 'text-slate-300'}
      />
      <span className="font-medium text-sm">{item.name}</span>
    </Link>
  );

  // ── Avatar initial (first char of resolved display name) ──────────────────
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans">

      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-slate-100">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              R
            </div>
            <span className="font-semibold text-lg text-slate-800">RFG Capital</span>
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-4 py-4 space-y-0.5 overflow-y-auto">
          <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Navigation
          </div>
          {menuItems.map(item => <NavLink key={item.path} item={item} />)}
        </nav>

        {/* User card + logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3 px-2 py-1 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {avatarLetter}
            </div>
            <div className="flex-1 min-w-0">
              {/* displayName comes from DB (full_name) or Google metadata */}
              <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
              {/* roleLabel comes from DB profile.role, never hardcodes "Officer" */}
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                {roleLabel}
              </p>
            </div>
          </div>
          {/* ✅ Logout button — calls AuthContext.logout(), always works */}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile menu overlay ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-64 bg-white z-50 lg:hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <Link to="/" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    R
                  </div>
                  <span className="font-semibold text-lg text-slate-800">RFG Capital</span>
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {menuItems.map(item => <NavLink key={item.path} item={item} mobile />)}
              </nav>

              <div className="p-4 border-t border-slate-100 shrink-0">
                <div className="flex items-center gap-3 px-2 py-1 mb-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {avatarLetter}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">{roleLabel}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-rose-600 font-semibold text-sm hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <LogOut size={18} /> Logout
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content area ────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top header bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 lg:hidden text-slate-500 hover:bg-slate-50 rounded-lg shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-slate-700 truncate">
              {menuItems.find(item => item.path === location.pathname)?.name || 'Credit Portal'}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* User identity — reads from AuthContext, never hardcoded */}
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="font-semibold text-slate-800 text-sm leading-none">{displayName}</span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-slate-400 mt-0.5">{roleLabel}</span>
            </div>
            {/* Bell shortcut */}
            <Link
              to="/requests"
              className="relative p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              aria-label="Loan requests"
            >
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-400 rounded-full border-2 border-white" />
            </Link>
          </div>
        </header>

        {/* Page content */}
        <section className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            {/* Non-fatal auth warning banner */}
            {authError && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 text-sm">
                <AlertCircle size={20} className="text-amber-500 shrink-0" />
                <p className="flex-1"><strong>Warning:</strong> {authError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1 bg-amber-100 hover:bg-amber-200 rounded-lg font-bold transition-colors text-xs"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Page transition wrapper */}
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            >
              {children}
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}