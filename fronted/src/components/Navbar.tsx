import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Calendar,
  Ticket,
  LayoutDashboard,
  LogOut,
  LogIn,
  Menu,
  X,
  Server,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';

interface NavbarProps {
  onOpenBackendModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenBackendModal }) => {
  const { user, isAdmin, logout, apiBaseUrl } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const ok = await api.checkHealth();
      if (mounted) setIsOnline(ok);
    };
    check();
    const interval = setInterval(check, 20000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [apiBaseUrl]);

  const handleLogout = () => {
    logout(true);
    navigate('/login');
  };

  return (
    <header id="main-header" className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-8">
            <Link
              id="brand-logo-btn"
              to={isAdmin ? '/admin/dashboard' : '/events'}
              className="flex items-center gap-2.5 text-left group focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-1"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-sm shadow-indigo-200 group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-slate-900 block leading-tight">
                  EventFlow
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 block">
                  Event Registration
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links (Attendee / Public) */}
            <nav id="desktop-nav" aria-label="Main Navigation" className="hidden md:flex items-center gap-1">
              {isAdmin ? (
                /* Admin quick toggle to Admin Console */
                <Link
                  id="nav-go-to-admin"
                  to="/admin/dashboard"
                  className="px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-2 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Go to Admin Console</span>
                </Link>
              ) : (
                /* Attendee / Public Links */
                <>
                  <NavLink
                    id="nav-link-events"
                    to="/events"
                    className={({ isActive }) =>
                      `px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`
                    }
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Upcoming Events</span>
                  </NavLink>

                  {user && (
                    <>
                      <NavLink
                        id="nav-link-registrations"
                        to="/my-registrations"
                        className={({ isActive }) =>
                          `px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors ${
                            isActive
                              ? 'bg-indigo-50 text-indigo-700 font-bold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                          }`
                        }
                      >
                        <Ticket className="w-4 h-4" />
                        <span>My Registrations</span>
                      </NavLink>

                      <NavLink
                        id="nav-link-dashboard"
                        to="/dashboard"
                        className={({ isActive }) =>
                          `px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors ${
                            isActive
                              ? 'bg-indigo-50 text-indigo-700 font-bold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                          }`
                        }
                      >
                        <UserIcon className="w-4 h-4" />
                        <span>Profile & Dashboard</span>
                      </NavLink>
                    </>
                  )}
                </>
              )}
            </nav>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Backend URL Status Pill */}
            <button
              id="backend-status-pill-btn"
              type="button"
              onClick={onOpenBackendModal}
              title={`Connected to: ${apiBaseUrl}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-[11px] font-medium text-slate-600 transition-colors"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline === null
                    ? 'bg-slate-400'
                    : isOnline
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-amber-500'
                }`}
              />
              <Server className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono text-slate-700 max-w-[140px] truncate">
                {apiBaseUrl.replace(/^https?:\/\//, '')}
              </span>
            </button>

            {user ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 justify-end">
                    <span>{user.name}</span>
                    {isAdmin ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-0.5">
                        <ShieldCheck className="w-3 h-3" />
                        Admin
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Attendee
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">{user.email}</div>
                </div>

                <button
                  id="signout-btn"
                  type="button"
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  id="nav-signin-btn"
                  to="/login"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In / Register</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden gap-2">
            <button
              id="mobile-backend-pill-btn"
              type="button"
              onClick={onOpenBackendModal}
              className="p-2 text-slate-600 rounded-lg hover:bg-slate-100"
              aria-label="Configure backend"
            >
              <Server className="w-4 h-4" />
            </button>

            <button
              id="mobile-menu-toggle-btn"
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div id="mobile-nav-drawer" className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
          {user && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-2">
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm text-slate-900">{user.name}</div>
                {isAdmin ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-purple-100 text-purple-800 border border-purple-200">
                    Admin
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Attendee
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{user.email}</div>
            </div>
          )}

          <div className="space-y-1">
            {isAdmin ? (
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-left px-3.5 py-2.5 text-sm font-semibold rounded-lg flex items-center gap-2.5 bg-purple-50 text-purple-700"
              >
                <LayoutDashboard className="w-4 h-4 text-purple-600" />
                <span>Go to Admin Console</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/events"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-left px-3.5 py-2.5 text-sm font-semibold rounded-lg flex items-center gap-2.5 text-slate-700 hover:bg-slate-50"
                >
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Upcoming Events</span>
                </Link>

                {user && (
                  <>
                    <Link
                      to="/my-registrations"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full text-left px-3.5 py-2.5 text-sm font-semibold rounded-lg flex items-center gap-2.5 text-slate-700 hover:bg-slate-50"
                    >
                      <Ticket className="w-4 h-4 text-indigo-600" />
                      <span>My Registrations</span>
                    </Link>

                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full text-left px-3.5 py-2.5 text-sm font-semibold rounded-lg flex items-center gap-2.5 text-slate-700 hover:bg-slate-50"
                    >
                      <UserIcon className="w-4 h-4 text-indigo-600" />
                      <span>Profile & Dashboard</span>
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200">
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out ({user.email})</span>
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 rounded-xl shadow-xs"
              >
                Sign In / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
