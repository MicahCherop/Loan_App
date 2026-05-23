import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

/**
 * DesktopSidebar - Professional sidebar for desktop (md+ screens)
 */
export function DesktopSidebar({ navItems, logo, onLogout, userInitial }) {
  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-72 bg-slate-900 border-r border-slate-800 shadow-lg">
      {/* Logo Section */}
      <div className="px-6 py-8 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {logo ? (
            logo
          ) : (
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
              {userInitial || 'R'}
            </div>
          )}
          <h1 className="text-lg font-bold text-white">RFG</h1>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.path} {...item} variant="sidebar" />
        ))}
      </nav>

      {/* Logout Button */}
      <div className="px-4 py-6 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="w-full px-4 py-3 rounded-lg text-sm font-semibold text-slate-300 hover:text-red-400 hover:bg-red-900/20 transition-all duration-200"
        >
          Log Out
        </button>
      </div>
    </aside>
  );
}

/**
 * MobileBottomNav - Compact navigation for mobile (< md screens)
 */
export function MobileBottomNav({ navItems, onLogout }) {
  const [showMore, setShowMore] = useState(false);

  // Show only 4 main items + more button on mobile
  const visibleItems = navItems.slice(0, 4);
  const moreItems = navItems.slice(4);

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-slate-200/60 shadow-2xl z-40">
      <div className="flex items-center justify-around h-20">
        {visibleItems.map((item) => (
          <NavItem key={item.path} {...item} variant="mobile" />
        ))}

        {/* More Menu */}
        {moreItems.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowMore(!showMore)}
              className="flex flex-col items-center justify-center gap-0.5 px-4 py-3 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Menu size={20} />
              <span className="text-[10px] font-medium">More</span>
            </button>

            {showMore && (
              <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-xl border border-slate-200/60 min-w-48 overflow-hidden z-50">
                {moreItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setShowMore(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-emerald-50 border-b border-slate-100 last:border-b-0 transition-colors"
                  >
                    {item.icon && <item.icon size={18} />}
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={() => {
                    setShowMore(false);
                    onLogout?.();
                  }}
                  className="w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 border-t border-slate-100 transition-colors text-left"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

/**
 * NavItem - Individual navigation item for sidebar or mobile nav
 */
export function NavItem({ path, label, icon: Icon, variant = 'sidebar' }) {
  const location = useLocation();
  const isActive = location.pathname === path;

  if (variant === 'mobile') {
    return (
      <Link
        to={path}
        className={`
          flex flex-col items-center justify-center gap-0.5 px-3 py-2.5 text-xs font-medium rounded-lg transition-all duration-200
          ${isActive ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 hover:text-slate-900'}
        `}
      >
        {Icon && <Icon size={20} />}
        <span className="line-clamp-1">{label}</span>
      </Link>
    );
  }

  // Sidebar variant
  return (
    <Link
      to={path}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200
        ${isActive ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800/50'}
      `}
    >
      {Icon && <Icon size={20} />}
      <span>{label}</span>
    </Link>
  );
}

/**
 * MainLayout - Combined responsive layout wrapper
 */
export function MainLayout({ children, navItems, logo, onLogout, userInitial, showMobileBottomPadding = true }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Desktop Sidebar */}
      <DesktopSidebar navItems={navItems} logo={logo} onLogout={onLogout} userInitial={userInitial} />

      {/* Main Content */}
      <main className="md:ml-72 min-h-screen pb-24 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav navItems={navItems} onLogout={onLogout} />
    </div>
  );
}
