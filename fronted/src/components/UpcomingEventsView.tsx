import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EventItem, Registration } from '../types';
import { api, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EventDetailsModal } from './EventDetailsModal';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  Ticket,
  CheckCircle2,
  Filter,
  ArrowUpDown,
  Server,
  ArrowRight,
} from 'lucide-react';

interface UpcomingEventsViewProps {
  onRequestLogin?: () => void;
  onOpenBackendModal?: () => void;
}

export const UpcomingEventsView: React.FC<UpcomingEventsViewProps> = ({
  onRequestLogin,
  onOpenBackendModal,
}) => {
  const { user, isAdmin, apiBaseUrl, updateApiBaseUrl } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [userRegistrations, setUserRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'spots'>('date-asc');

  // Selected event for modal
  const [selectedEventId, setSelectedEventId] = useState<number | string | null>(null);

  const fetchEventsAndRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const eventList = await api.getEvents();
      setEvents(eventList || []);

      // If user is logged in as attendee, fetch their registrations to correlate
      if (user && !isAdmin) {
        try {
          const regs = await api.getMyRegistrations();
          setUserRegistrations(regs || []);
        } catch {
          // Non-blocking
        }
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch events from backend. Please verify the server is running.');
      }
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchEventsAndRegistrations();
  }, [fetchEventsAndRegistrations, apiBaseUrl]);

  // Check if current user is registered for an event
  const isUserRegisteredFor = (eventId: number | string): boolean => {
    return userRegistrations.some(
      (r) =>
        (r.event_id === eventId || r.event?.id === eventId) &&
        r.status?.toLowerCase() === 'active'
    );
  };

  // Unique locations for filter
  const locations = Array.from(
    new Set(events.map((e) => e.location).filter(Boolean))
  );

  // Filtered & sorted events
  const filteredEvents = events
    .filter((event) => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLoc =
        selectedLocation === 'all' || event.location === selectedLocation;
      return matchesSearch && matchesLoc;
    })
    .sort((a, b) => {
      if (sortBy === 'date-asc') {
        return (a.date + a.time).localeCompare(b.date + b.time);
      } else if (sortBy === 'date-desc') {
        return (b.date + b.time).localeCompare(a.date + a.time);
      } else if (sortBy === 'spots') {
        return b.available_spots - a.available_spots;
      }
      return 0;
    });

  const handleRegistrationSuccess = (updatedEvent: EventItem) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
    );
    // Refresh user's registrations
    if (user) {
      api.getMyRegistrations().then(setUserRegistrations).catch(() => {});
    }
  };

  return (
    <div id="upcoming-events-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Hero Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Public Catalog</span>
          </div>
          <h1 id="upcoming-events-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Upcoming Events
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Explore and register for upcoming workshops, conferences, and meetups. Spot availability updates in real time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="refresh-events-btn"
            type="button"
            onClick={fetchEventsAndRegistrations}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="search-events-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, description, or venue..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-800"
          />
        </div>

        {/* Location Filter */}
        {locations.length > 0 && (
          <div className="flex items-center gap-2 min-w-[180px]">
            <div className="text-xs text-slate-500 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span>Location:</span>
            </div>
            <select
              id="filter-location-select"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sort */}
        <div className="flex items-center gap-2 min-w-[170px]">
          <div className="text-xs text-slate-500 flex items-center gap-1 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort:</span>
          </div>
          <select
            id="sort-events-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="date-asc">Date (Earliest)</option>
            <option value="date-desc">Date (Latest)</option>
            <option value="spots">Available Spots</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div id="events-loading-skeletons" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 animate-pulse shadow-xs"
            >
              <div className="flex justify-between items-start">
                <div className="h-5 bg-slate-200 rounded-full w-24" />
                <div className="h-5 bg-slate-200 rounded-full w-28" />
              </div>
              <div className="h-6 bg-slate-200 rounded-md w-3/4" />
              <div className="h-12 bg-slate-100 rounded-md w-full" />
              <div className="space-y-2 pt-2">
                <div className="h-4 bg-slate-100 rounded-md w-1/2" />
                <div className="h-4 bg-slate-100 rounded-md w-2/3" />
              </div>
              <div className="h-10 bg-slate-200 rounded-xl w-full pt-4" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div
          id="events-error-state"
          className="p-8 sm:p-12 bg-rose-50/80 border border-rose-200 rounded-3xl text-center max-w-xl mx-auto space-y-5"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-rose-900">
              Unable to load events
            </h3>
            <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto leading-relaxed">
              {error}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              id="retry-fetch-events-btn"
              type="button"
              onClick={fetchEventsAndRegistrations}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>

            {onOpenBackendModal && (
              <button
                id="open-backend-settings-from-error-btn"
                type="button"
                onClick={onOpenBackendModal}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Server className="w-3.5 h-3.5 text-slate-500" />
                <span>Backend Settings</span>
              </button>
            )}
          </div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div
          id="events-empty-state"
          className="p-12 sm:p-16 bg-white border border-slate-200 rounded-3xl text-center max-w-lg mx-auto space-y-4 shadow-xs"
        >
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mx-auto">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              No upcoming events found
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {searchQuery || selectedLocation !== 'all'
                ? 'Try adjusting your search or filters to see more events.'
                : 'There are currently no published future events available for registration.'}
            </p>
          </div>
          {(searchQuery || selectedLocation !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedLocation('all');
              }}
              className="px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div id="events-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const registered = isUserRegisteredFor(event.id);
            const isFull = event.available_spots <= 0;

            return (
              <div
                key={event.id}
                id={`event-card-${event.id}`}
                className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-lg hover:border-slate-300 transition-all group"
              >
                <div className="space-y-4">
                  {/* Status and Spot Badge Bar */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Remaining Spots Pill */}
                    <span
                      className={`px-3 py-1 text-xs font-extrabold rounded-full border shadow-xs ${
                        isFull
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : event.available_spots <= 5
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {isFull ? (
                        'Event Full'
                      ) : (
                        <span>
                          <strong className="font-black">{event.available_spots}</strong> spots left
                        </span>
                      )}
                    </span>

                    {/* Status / Registered Badge */}
                    {registered ? (
                      <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Registered</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {event.status}
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <Link
                      to={`/events/${event.id}`}
                      className="text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-2 block"
                    >
                      {event.title}
                    </Link>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>
                  </div>

                  {/* Event Details snippet */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">{event.date}</span>
                      <span className="text-slate-300">•</span>
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{event.time}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        Capacity: {event.registered_count} / {event.capacity}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-5 mt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <Link
                    id={`view-event-${event.id}-page-btn`}
                    to={`/events/${event.id}`}
                    className="py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    id={`view-event-${event.id}-btn`}
                    type="button"
                    onClick={() => setSelectedEventId(event.id)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      registered
                        ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                        : isFull
                        ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                    }`}
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span className="truncate">
                      {registered
                        ? 'Registered'
                        : isFull
                        ? 'Sold Out'
                        : 'Register'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEventId && (
        <EventDetailsModal
          eventId={selectedEventId}
          isUserRegistered={isUserRegisteredFor(selectedEventId)}
          onClose={() => setSelectedEventId(null)}
          onRequestLogin={onRequestLogin}
          onRegisteredSuccess={handleRegistrationSuccess}
        />
      )}
    </div>
  );
};
