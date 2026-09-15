import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { EventItem, EventStatus } from '../types';
import { api, ApiError } from '../services/api';
import { useToast } from '../context/ToastContext';
import { EventFormModal } from './EventFormModal';
import { AttendeeListModal } from './AttendeeListModal';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  PlusCircle,
  Edit,
  RefreshCw,
  AlertCircle,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  ArrowRight,
  MoreVertical,
  Layers,
} from 'lucide-react';

export const AdminEventsView: React.FC = () => {
  const { showToast } = useToast();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EventStatus>('all');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [attendeeEvent, setAttendeeEvent] = useState<EventItem | null>(null);

  // Status updating indicator per event
  const [updatingStatusId, setUpdatingStatusId] = useState<number | string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminEvents();
      setEvents(data || []);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch admin events. Check your backend status.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleStatusChange = async (event: EventItem, newStatus: EventStatus) => {
    if (event.status === newStatus) return;

    setUpdatingStatusId(event.id);
    try {
      const updated = await api.updateEventStatus(event.id, newStatus);
      showToast(
        `Event status changed to "${newStatus.toUpperCase()}"`,
        'success'
      );
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, status: newStatus } : e))
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        showToast(err.detail, 'error');
      } else {
        showToast('Failed to change event status.', 'error');
      }
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleFormSuccess = (savedEvent: EventItem, isEdit: boolean) => {
    if (isEdit) {
      setEvents((prev) =>
        prev.map((e) => (e.id === savedEvent.id ? { ...e, ...savedEvent } : e))
      );
    } else {
      setEvents((prev) => [savedEvent, ...prev]);
    }
    setEditingEvent(null);
  };

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || e.status?.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div id="admin-events-management-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Event Operations</span>
          </div>
          <h1 id="admin-events-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Event Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create, configure, publish, and monitor attendee rosters across all events.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="refresh-admin-events-btn"
            type="button"
            onClick={fetchEvents}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            id="create-event-top-btn"
            to="/admin/events/create"
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Event</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="search-admin-events"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by title or venue..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-800"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {(['all', 'draft', 'published', 'completed', 'cancelled'] as const).map(
            (status) => (
              <button
                key={status}
                id={`filter-status-${status}`}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                  statusFilter === status
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {status}
              </button>
            )
          )}
        </div>
      </div>

      {/* Main Content: Table on Desktop, Cards on Mobile */}
      {loading ? (
        <div id="admin-events-loading" className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse shadow-xs flex items-center justify-between"
            >
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-slate-200 rounded-md w-1/4" />
                <div className="h-4 bg-slate-100 rounded-md w-1/2" />
              </div>
              <div className="h-9 bg-slate-200 rounded-xl w-48" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div
          id="admin-events-error"
          className="p-8 sm:p-12 bg-rose-50/70 border border-rose-200 rounded-3xl text-center max-w-xl mx-auto space-y-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-rose-900">
              Unable to load events
            </h3>
            <p className="text-xs text-rose-700 mt-1">{error}</p>
          </div>
          <button
            type="button"
            onClick={fetchEvents}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div
          id="admin-events-empty"
          className="p-12 sm:p-16 bg-white border border-slate-200 rounded-3xl text-center max-w-lg mx-auto space-y-4 shadow-xs"
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mx-auto">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              No events found
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try changing your search keywords or status filter.'
                : 'Get started by creating your first event.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingEvent(null);
              setIsFormOpen(true);
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Event Now</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <table id="admin-events-table" className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Event</th>
                  <th scope="col" className="px-6 py-3.5">Date & Time</th>
                  <th scope="col" className="px-6 py-3.5">Venue</th>
                  <th scope="col" className="px-6 py-3.5">Capacity / Spots</th>
                  <th scope="col" className="px-6 py-3.5">Status</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredEvents.map((event) => {
                  const isUpdating = updatingStatusId === event.id;

                  return (
                    <tr
                      key={event.id}
                      id={`admin-event-row-${event.id}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Title & description */}
                      <td className="px-6 py-4 max-w-xs">
                        <div className="font-bold text-slate-900 text-sm">
                          {event.title}
                        </div>
                        <div className="text-slate-500 line-clamp-1 mt-0.5">
                          {event.description}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{event.date}</div>
                        <div className="text-slate-500">{event.time}</div>
                      </td>

                      {/* Venue */}
                      <td className="px-6 py-4 max-w-[180px] truncate">
                        {event.location}
                      </td>

                      {/* Capacity & remaining */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {event.registered_count} / {event.capacity}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {event.available_spots} remaining
                        </div>
                      </td>

                      {/* Status Selector */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          id={`select-status-${event.id}`}
                          aria-label={`Change status for event ${event.title}`}
                          value={event.status}
                          disabled={isUpdating}
                          onChange={(e) =>
                            handleStatusChange(event, e.target.value as EventStatus)
                          }
                          className={`px-3 py-1 text-xs font-bold rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all ${
                            event.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : event.status === 'draft'
                              ? 'bg-slate-100 text-slate-700 border-slate-300'
                              : event.status === 'completed'
                              ? 'bg-blue-50 text-blue-700 border-blue-300'
                              : 'bg-rose-50 text-rose-700 border-rose-300'
                          }`}
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <Link
                          id={`view-attendees-${event.id}-link`}
                          to={`/admin/events/${event.id}/attendees`}
                          title="View Attendee Roster"
                          className="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors inline-flex items-center gap-1"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Attendees ({event.registered_count || 0})</span>
                        </Link>

                        <Link
                          id={`edit-event-${event.id}-link`}
                          to={`/admin/events/${event.id}/edit`}
                          title="Edit Event Parameters"
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-1"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                id={`admin-event-card-${event.id}`}
                className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {event.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                      {event.description}
                    </p>
                  </div>

                  {/* Status Dropdown */}
                  <select
                    id={`mobile-select-status-${event.id}`}
                    aria-label={`Change status for event ${event.title}`}
                    value={event.status}
                    onChange={(e) =>
                      handleStatusChange(event, e.target.value as EventStatus)
                    }
                    className={`px-2.5 py-1 text-xs font-bold rounded-full border cursor-pointer ${
                      event.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : event.status === 'draft'
                        ? 'bg-slate-100 text-slate-700 border-slate-300'
                        : event.status === 'completed'
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'bg-rose-50 text-rose-700 border-rose-300'
                    }`}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Date & Time
                    </span>
                    <span className="font-semibold text-slate-800">
                      {event.date} {event.time}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Capacity / Left
                    </span>
                    <span className="font-semibold text-slate-800">
                      {event.registered_count}/{event.capacity} ({event.available_spots} left)
                    </span>
                  </div>
                  <div className="col-span-2 mt-1">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">
                      Location
                    </span>
                    <span className="text-slate-700 truncate block">
                      {event.location}
                    </span>
                  </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <Link
                    to={`/admin/events/${event.id}/attendees`}
                    className="flex-1 py-2.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Attendees ({event.registered_count})</span>
                  </Link>

                  <Link
                    to={`/admin/events/${event.id}/edit`}
                    className="flex-1 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit Form Modal */}
      {isFormOpen && (
        <EventFormModal
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingEvent(null);
          }}
          eventToEdit={editingEvent}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Attendees List Modal */}
      {attendeeEvent && (
        <AttendeeListModal
          event={attendeeEvent}
          onClose={() => setAttendeeEvent(null)}
        />
      )}
    </div>
  );
};
