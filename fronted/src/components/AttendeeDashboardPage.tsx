import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EventItem, Registration, normalizeStatus } from '../types';
import { api, ApiError } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Calendar,
  Ticket,
  User as UserIcon,
  LogOut,
  ArrowRight,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

export const AttendeeDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [eventsData, regsData] = await Promise.all([
          api.getEvents().catch(() => []),
          api.getMyRegistrations().catch(() => []),
        ]);
        if (mounted) {
          // Filter to only published/open upcoming events
          const published = (eventsData || []).filter(
            (e) => normalizeStatus(e.status) === 'published'
          );
          setUpcomingEvents(published.slice(0, 4));
          setRegistrations(regsData || []);
        }
      } catch (err) {
        console.error('Failed to load attendee dashboard data', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCancelRegistration = async (regId: number | string, eventTitle: string) => {
    if (!window.confirm(`Are you sure you want to cancel your registration for "${eventTitle}"?`)) {
      return;
    }

    setCancellingId(regId);
    try {
      await api.cancelRegistration(regId);
      setRegistrations((prev) =>
        prev.filter((r) => String(r.id || r.registration_id) !== String(regId))
      );
      showToast('Registration cancelled successfully.', 'success');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        showToast(err.detail, 'error');
      } else {
        showToast('Failed to cancel registration.', 'error');
      }
    } finally {
      setCancellingId(null);
    }
  };

  const handleLogout = () => {
    logout(true);
    navigate('/login');
  };

  return (
    <div id="attendee-dashboard-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 rounded-3xl p-8 sm:p-10 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-xs border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>Attendee Portal</span>
          </div>
          <h1 id="attendee-welcome-heading" className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome back, {user?.name || 'Attendee'}!
          </h1>
          <p className="text-indigo-200 text-xs sm:text-sm max-w-xl">
            Explore scheduled workshops, manage your reserved seats, and update your attendee profile.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/events"
            className="px-5 py-2.5 text-xs font-bold text-indigo-900 bg-white hover:bg-slate-100 rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Browse Events</span>
          </Link>

          <button
            id="attendee-logout-top-btn"
            type="button"
            onClick={handleLogout}
            className="px-4 py-2.5 text-xs font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              My Registrations
            </span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Ticket className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900">{registrations.length}</div>
            <div className="text-xs text-slate-500 mt-1">Confirmed event bookings</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Upcoming Events
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900">{upcomingEvents.length}</div>
            <div className="text-xs text-slate-500 mt-1">Events open for booking</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Account Role
            </span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <UserIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-slate-900 uppercase">
              {user?.role || 'ATTENDEE'}
            </div>
            <div className="text-xs text-slate-500 mt-1">{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Main Grid: My Registrations & Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: My Registrations & Upcoming */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section 1: My Registrations */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-indigo-600" />
                  <span>My Active Registrations</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Events you have signed up to attend</p>
              </div>
              <Link
                to="/my-registrations"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>View All ({registrations.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500">Loading registrations...</p>
                </div>
              ) : registrations.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-600 font-medium">You have not registered for any events yet.</p>
                  <Link
                    to="/events"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
                  >
                    <span>Browse Upcoming Events</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {registrations.slice(0, 3).map((reg) => {
                    const regId = reg.id || reg.registration_id;
                    const event = reg.event || {};
                    const isCancelling = cancellingId === regId;

                    return (
                      <div key={String(regId)} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <Link
                            to={`/events/${event.id}`}
                            className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                          >
                            {event.title || 'Event Registration'}
                          </Link>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            {event.date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{event.date}</span>
                              </span>
                            )}
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span>{event.location}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <Link
                            to={`/events/${event.id}`}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            Details
                          </Link>
                          {regId && (
                            <button
                              type="button"
                              onClick={() => handleCancelRegistration(regId, event.title || 'this event')}
                              disabled={isCancelling}
                              className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {isCancelling ? 'Cancelling...' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Upcoming Events */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Upcoming Events</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Explore open sessions available for booking</p>
              </div>
              <Link
                to="/events"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>View Catalog</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500">Loading catalog...</p>
                </div>
              ) : upcomingEvents.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No open events available right now.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {upcomingEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-colors flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
                          Open
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{ev.title}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{ev.description}</p>
                        <div className="text-[11px] text-slate-600 space-y-1 pt-1">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{ev.date} at {ev.time}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{ev.location}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-600">
                          {ev.available_spots ?? 0} spots left
                        </span>
                        <Link
                          to={`/events/${ev.id}`}
                          className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Profile & Actions */}
        <div className="space-y-6">
          {/* Section 3: Profile Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-indigo-600" />
              <span>Attendee Profile</span>
            </h3>

            <div className="p-4 bg-slate-50 rounded-2xl space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Full Name</span>
                <span className="font-semibold text-slate-900 text-sm">{user?.name || '—'}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                <span className="font-mono text-slate-800">{user?.email || '—'}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Role</span>
                <span className="inline-block px-2.5 py-0.5 mt-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {user?.role || 'ATTENDEE'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Account Status</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Active & Verified</span>
                </span>
              </div>
            </div>

            {/* Section 4: Logout */}
            <div className="pt-2 border-t border-slate-100">
              <button
                id="attendee-logout-card-btn"
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 px-4 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
