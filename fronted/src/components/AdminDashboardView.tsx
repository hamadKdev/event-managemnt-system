import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardStats, EventItem, normalizeStatus } from '../types';
import { api, ApiError } from '../services/api';
import {
  Calendar,
  CheckCircle,
  FileEdit,
  Clock,
  XCircle,
  Users,
  Sparkles,
  RefreshCw,
  AlertCircle,
  PlusCircle,
  ArrowRight,
  MapPin,
  Ticket,
} from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashData, eventsData] = await Promise.all([
        api.getAdminDashboard(),
        api.getAdminEvents(),
      ]);
      setStats(dashData);
      setRecentEvents(eventsData || []);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load admin dashboard statistics.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Compute status metrics directly from real events data or /admin/dashboard response
  const totalEventsCount = stats?.total_events ?? recentEvents.length;
  const publishedEventsCount =
    stats?.published_events ??
    recentEvents.filter((e) => normalizeStatus(e.status) === 'published').length;
  const draftEventsCount =
    stats?.draft_events ??
    recentEvents.filter((e) => normalizeStatus(e.status) === 'draft').length;
  const completedEventsCount =
    stats?.completed_events ??
    recentEvents.filter((e) => normalizeStatus(e.status) === 'completed').length;
  const cancelledEventsCount =
    stats?.cancelled_events ??
    recentEvents.filter((e) => normalizeStatus(e.status) === 'cancelled').length;

  const totalRegistrationsCount =
    stats?.total_registrations ??
    recentEvents.reduce((sum, e) => sum + (Number(e.registered_count) || 0), 0);

  const activeRegistrationsCount =
    stats?.active_registrations ??
    recentEvents
      .filter((e) => normalizeStatus(e.status) === 'published')
      .reduce((sum, e) => sum + (Number(e.registered_count) || 0), 0);

  const totalCapacityCount =
    stats?.total_capacity ??
    recentEvents.reduce((sum, e) => sum + (Number(e.capacity) || 0), 0);

  const availableSpotsCount =
    stats?.total_available ??
    recentEvents.reduce(
      (sum, e) =>
        sum +
        (e.available_spots !== undefined
          ? Number(e.available_spots)
          : Math.max(0, (Number(e.capacity) || 0) - (Number(e.registered_count) || 0))),
      0
    );

  return (
    <div id="admin-dashboard-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Admin Executive Overview</span>
          </div>
          <h1 id="admin-dashboard-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            System Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time event counts, registrations, and lifecycle statuses across the organization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="refresh-dashboard-btn"
            type="button"
            onClick={fetchDashboard}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            id="dashboard-create-event-btn"
            to="/admin/events/create"
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Event</span>
          </Link>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div id="dashboard-loading-skeleton" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 animate-pulse shadow-xs"
              >
                <div className="h-4 bg-slate-200 rounded-md w-1/3" />
                <div className="h-8 bg-slate-300 rounded-lg w-1/2" />
                <div className="h-3 bg-slate-100 rounded-md w-2/3" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div
          id="dashboard-error-state"
          className="p-8 sm:p-12 bg-rose-50/70 border border-rose-200 rounded-3xl text-center max-w-xl mx-auto space-y-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-rose-900">
              Unable to load dashboard metrics
            </h3>
            <p className="text-xs text-rose-700 mt-1 leading-relaxed">{error}</p>
          </div>
          <button
            type="button"
            onClick={fetchDashboard}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Loading</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* The 6 Required Summary Metric Cards */}
          <div id="dashboard-stats-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. Total Events */}
            <div id="stat-total-events" className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:border-indigo-200 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Events
                </span>
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-black tracking-tight text-slate-900">
                  {totalEventsCount}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  All system events created
                </div>
              </div>
            </div>

            {/* 2. Published Events */}
            <div id="stat-published-events" className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:border-emerald-200 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Published Events
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-black tracking-tight text-emerald-600">
                  {publishedEventsCount}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Active in attendee public catalog
                </div>
              </div>
            </div>

            {/* 3. Total Registrations */}
            <div id="stat-total-registrations" className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:border-purple-200 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Registrations
                </span>
                <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-black tracking-tight text-purple-600">
                  {totalRegistrationsCount}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  All-time sign-ups recorded
                </div>
              </div>
            </div>

            {/* 4. Active Registrations */}
            <div id="stat-active-registrations" className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:border-blue-200 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active Registrations
                </span>
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Ticket className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-black tracking-tight text-blue-600">
                  {activeRegistrationsCount}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Attendees registered for active events
                </div>
              </div>
            </div>

            {/* 5. Total Capacity */}
            <div id="stat-total-capacity" className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:border-amber-200 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Capacity
                </span>
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-black tracking-tight text-amber-600">
                  {totalCapacityCount}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Total seats allocated across all events
                </div>
              </div>
            </div>

            {/* 6. Available Spots */}
            <div id="stat-available-spots" className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:border-teal-200 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Available Spots
                </span>
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-black tracking-tight text-teal-600">
                  {availableSpotsCount}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Open registrations remaining
                </div>
              </div>
            </div>
          </div>

          {/* Event Status Breakdown Quick Strip */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Event Lifecycle Breakdown:
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100/70 text-emerald-800 font-semibold border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Published: <strong>{publishedEventsCount}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100/70 text-amber-800 font-semibold border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Drafts: <strong>{draftEventsCount}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-100/70 text-blue-800 font-semibold border border-blue-200">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Completed: <strong>{completedEventsCount}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-100/70 text-rose-800 font-semibold border border-rose-200">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Cancelled: <strong>{cancelledEventsCount}</strong>
              </span>
            </div>
          </div>

          {/* Requirement 2: List/Table of Recent Events */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Events</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Latest event records from your FastAPI backend
                </p>
              </div>

              <Link
                to="/admin/events"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                <span>View All Events ({recentEvents.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentEvents.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-3">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                <p>No events found in the system yet.</p>
                <Link
                  to="/admin/events/create"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Create First Event</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table id="recent-events-table" className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                      <th className="py-3.5 px-6">Event Title</th>
                      <th className="py-3.5 px-6">Date & Time</th>
                      <th className="py-3.5 px-6">Location</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6">Capacity / Registered</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentEvents.slice(0, 6).map((event) => {
                      const st = normalizeStatus(event.status);
                      return (
                        <tr key={event.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-6 font-semibold text-slate-900">
                            {event.title}
                          </td>
                          <td className="py-3.5 px-6 text-slate-600">
                            <span>{event.date}</span>
                            <span className="text-slate-400 block text-[11px]">{event.time}</span>
                          </td>
                          <td className="py-3.5 px-6 text-slate-600">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[150px]">{event.location}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-6">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                st === 'published'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : st === 'completed'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : st === 'cancelled'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {st}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-slate-700">
                            <span className="font-bold text-indigo-600">
                              {event.registered_count || 0}
                            </span>
                            <span className="text-slate-400"> / {event.capacity}</span>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/admin/events/${event.id}/attendees`}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                Attendees
                              </Link>
                              <Link
                                to="/admin/events"
                                className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                Manage
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
