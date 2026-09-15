import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  PlusCircle,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Server,
  Sparkles,
} from 'lucide-react';
import { BackendStatusModal } from './BackendStatusModal';

export const AdminLayout: React.FC = () => {
  const { user, logout, apiBaseUrl } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isBackendModalOpen, setIsBackendModalOpen] = useState(false);

  const handleLogout = () => {
    logout(true);
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Events', to: '/admin/events', icon: Calendar },
    { label: 'Create Event', to: '/admin/events/create', icon: PlusCircle },
    { label: 'Attendees', to: '/admin/events/attendees', icon: Users },
    { label: 'Reports', to: '/admin/reports', icon: BarChart3 },
  ];

  return (
    <div id="admin-layout" className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm block leading-tight">Admin Console</span>
            <span className="text-[10px] text-indigo-300 block">Event Management</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-300 hover:text-white rounded-lg"
          aria-label="Toggle Navigation Menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Desktop Sidebar / Mobile Slideover */}
      <aside
        id="admin-sidebar"
        className={`${
          mobileOpen ? 'block' : 'hidden'
        } md:flex flex-col w-full md:w-64 bg-slate-900 text-slate-300 md:min-h-screen shrink-0 border-r border-slate-800 z-40`}
      >
        {/* Brand */}
        <div className="p-6 border-b border-slate-800 hidden md:flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm shadow-indigo-900">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base text-white tracking-tight block leading-tight">
              Admin Portal
            </span>
            <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider block">
              Event Management
            </span>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-4 my-4 bg-slate-800/80 rounded-2xl border border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300 font-bold text-xs">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="overflow-hidden">
              <span className="block text-xs font-bold text-white truncate">{user?.name || 'Administrator'}</span>
              <span className="block text-[10px] font-mono text-purple-300 uppercase tracking-wide">
                ROLE: {user?.role || 'ADMIN'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 space-y-1.5 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin/dashboard'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Section: Backend info & Logout */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <button
            type="button"
            onClick={() => setIsBackendModalOpen(true)}
            className="w-full text-left px-3 py-2 rounded-xl text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Server className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">Backend: {apiBaseUrl}</span>
          </button>

          <button
            id="admin-logout-sidebar-btn"
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="flex-1 pb-16">
          <Outlet />
        </main>
      </div>

      {/* Backend Settings Modal */}
      <BackendStatusModal
        isOpen={isBackendModalOpen}
        onClose={() => setIsBackendModalOpen(false)}
      />
    </div>
  );
};
