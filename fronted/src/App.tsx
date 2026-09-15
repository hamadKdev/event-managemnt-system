import React, { useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
} from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from './components/ToastContainer';
import { Navbar } from './components/Navbar';
import { BackendStatusModal } from './components/BackendStatusModal';
import { UpcomingEventsView } from './components/UpcomingEventsView';
import { EventDetailsPage } from './components/EventDetailsPage';
import { MyRegistrationsView } from './components/MyRegistrationsView';
import { AttendeeDashboardPage } from './components/AttendeeDashboardPage';
import { AdminLayout } from './components/AdminLayout';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AdminEventsView } from './components/AdminEventsView';
import { AdminCreateEventPage } from './components/AdminCreateEventPage';
import { AdminEditEventPage } from './components/AdminEditEventPage';
import { AdminAttendeesPage } from './components/AdminAttendeesPage';
import { AdminReportsPage } from './components/AdminReportsPage';
import { AuthView } from './components/AuthView';
import { Server } from 'lucide-react';

/**
 * Public & Attendee Layout with Main Navbar & Footer
 */
const MainLayout: React.FC = () => {
  const { apiBaseUrl } = useAuth();
  const [isBackendModalOpen, setIsBackendModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      {/* Top Navbar */}
      <Navbar onOpenBackendModal={() => setIsBackendModalOpen(true)} />

      {/* View Outlet */}
      <main id="main-content" className="flex-1 pb-16">
        <Outlet />
      </main>

      {/* Backend API Configuration Modal */}
      <BackendStatusModal
        isOpen={isBackendModalOpen}
        onClose={() => setIsBackendModalOpen(false)}
      />

      {/* Footer */}
      <footer id="app-footer" className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">EventFlow</span>
            <span>•</span>
            <span>FastAPI REST Connected Frontend</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="footer-backend-btn"
              type="button"
              onClick={() => setIsBackendModalOpen(true)}
              className="text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Target Backend:</span>
              <code className="font-mono text-slate-800 bg-slate-100 px-1 py-0.5 rounded">
                {apiBaseUrl}
              </code>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

/**
 * Route Guard for ADMIN role
 * If unauthenticated -> redirect to /login
 * If attendee -> redirect to /dashboard
 */
const AdminRouteGuard: React.FC = () => {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AdminLayout />;
};

/**
 * Route Guard for ATTENDEE role
 * If unauthenticated -> redirect to /login
 * If admin -> redirect to /admin/dashboard
 */
const AttendeeRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};

/**
 * Smart Root Redirect
 */
const RootRedirect: React.FC = () => {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    if (isAdmin) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/events" replace />;
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Root smart redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Public & Attendee Layout */}
            <Route element={<MainLayout />}>
              <Route path="/events" element={<UpcomingEventsView />} />
              <Route path="/events/:id" element={<EventDetailsPage />} />
              <Route path="/events/:eventId" element={<EventDetailsPage />} />

              {/* Protected Attendee Routes */}
              <Route
                path="/dashboard"
                element={
                  <AttendeeRouteGuard>
                    <AttendeeDashboardPage />
                  </AttendeeRouteGuard>
                }
              />
              <Route
                path="/my-registrations"
                element={
                  <AttendeeRouteGuard>
                    <MyRegistrationsView />
                  </AttendeeRouteGuard>
                }
              />

              {/* Auth Routes */}
              <Route path="/login" element={<AuthView defaultMode="login" />} />
              <Route path="/register" element={<AuthView defaultMode="register" />} />
            </Route>

            {/* Protected Admin Routes */}
            <Route path="/admin" element={<AdminRouteGuard />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardView />} />
              <Route path="events" element={<AdminEventsView />} />
              <Route path="events/create" element={<AdminCreateEventPage />} />
              <Route path="events/:id/edit" element={<AdminEditEventPage />} />
              <Route path="events/:eventId/edit" element={<AdminEditEventPage />} />
              <Route path="events/attendees" element={<AdminAttendeesPage />} />
              <Route path="events/:id/attendees" element={<AdminAttendeesPage />} />
              <Route path="events/:eventId/attendees" element={<AdminAttendeesPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <ToastContainer />
      </AuthProvider>
    </ToastProvider>
  );
}
