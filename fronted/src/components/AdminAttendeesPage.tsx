import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { EventItem, Attendee } from '../types';
import { api, ApiError } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  Download,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Mail,
  ChevronDown,
} from 'lucide-react';

export const AdminAttendeesPage: React.FC = () => {
  const { eventId, id } = useParams<{ eventId?: string; id?: string }>();
  const activeParamId = id || eventId;
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [allEvents, setAllEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | number>(activeParamId || '');
  const [currentEvent, setCurrentEvent] = useState<EventItem | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch events list for selector if needed
  useEffect(() => {
    let mounted = true;
    api.getAdminEvents()
      .then((data) => {
        if (mounted) {
          setAllEvents(data || []);
          if (!activeParamId && data && data.length > 0) {
            setSelectedEventId(String(data[0].id));
          }
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [activeParamId]);

  // Keep selectedEventId synced with URL param if it changes
  useEffect(() => {
    if (activeParamId) {
      setSelectedEventId(activeParamId);
    }
  }, [activeParamId]);

  // 2. Fetch event & attendees when selectedEventId changes
  const fetchAttendees = useCallback(async () => {
    if (!selectedEventId) return;

    setLoading(true);
    setError(null);
    try {
      // Find event details in list or fetch
      let ev = allEvents.find((e) => String(e.id) === String(selectedEventId));
      if (!ev) {
        try {
          ev = await api.getEventById(selectedEventId);
        } catch {
          // ignore
        }
      }
      setCurrentEvent(ev || null);

      const data = await api.getAdminEventAttendees(selectedEventId);
      setAttendees(data || []);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch attendee roster.');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedEventId, allEvents]);

  useEffect(() => {
    fetchAttendees();
  }, [fetchAttendees]);

  const handleSelectEvent = (newId: string) => {
    setSelectedEventId(newId);
    navigate(`/admin/events/${newId}/attendees`, { replace: true });
  };

  const filteredAttendees = attendees.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCSV = () => {
    if (attendees.length === 0) {
      showToast('No attendees to export.', 'info');
      return;
    }

    const headers = ['Registration ID', 'Name', 'Email', 'Status', 'Registered At'];
    const rows = attendees.map((a) => [
      String(a.registration_id || ''),
      `"${a.name.replace(/"/g, '""')}"`,
      `"${a.email.replace(/"/g, '""')}"`,
      a.status || 'active',
      `"${a.registered_at || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = (currentEvent?.title || 'event')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
    link.download = `attendees_${safeTitle}_${selectedEventId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Attendee roster CSV downloaded.', 'success');
  };

  return (
    <div id="admin-attendees-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2">
            <Link to="/admin/events" className="hover:text-indigo-600 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Events</span>
            </Link>
          </div>
          <h1 id="attendees-page-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Event Attendee Roster</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Confirmed registrations and verified attendee lists.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="refresh-attendees-btn"
            type="button"
            onClick={fetchAttendees}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            id="export-attendees-csv-btn"
            type="button"
            onClick={handleExportCSV}
            disabled={attendees.length === 0}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Event Selector Dropdown Bar */}
      {allEvents.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Selected Event:</span>
            <div className="relative flex-1 min-w-[280px]">
              <select
                id="event-picker-select"
                value={String(selectedEventId)}
                onChange={(e) => handleSelectEvent(e.target.value)}
                className="w-full pl-3.5 pr-8 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
              >
                {allEvents.map((ev) => (
                  <option key={ev.id} value={String(ev.id)}>
                    {ev.title} ({ev.date} — {ev.registered_count || 0}/{ev.capacity} registered)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {currentEvent && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{currentEvent.date}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{currentEvent.location}</span>
              </span>
              <span className="font-semibold text-slate-700">
                {attendees.length} / {currentEvent.capacity} spots filled
              </span>
            </div>
          )}
        </div>
      )}

      {/* Search Input */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-attendees-input"
            type="text"
            placeholder="Search by name or email address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <span className="text-xs text-slate-500">
          Showing {filteredAttendees.length} of {attendees.length} attendee(s)
        </span>
      </div>

      {/* Attendee Table */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Loading attendee roster from backend...</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center max-w-lg mx-auto space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-sm font-bold text-rose-900">Failed to Load Attendees</h3>
          <p className="text-xs text-rose-700">{error}</p>
          <button
            type="button"
            onClick={fetchAttendees}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl"
          >
            Retry
          </button>
        </div>
      ) : attendees.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Registrations Yet</h3>
          <p className="text-xs text-slate-500">
            No attendees have registered for this event yet.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table id="attendees-table" className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 px-6">Attendee Name</th>
                  <th className="py-3.5 px-6">Email Address</th>
                  <th className="py-3.5 px-6">Registration Status</th>
                  <th className="py-3.5 px-6">Registration Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendees.map((attendee, index) => {
                  const isActive = (attendee.status || 'active').toLowerCase() === 'active';
                  const formattedDate = attendee.registered_at
                    ? new Date(attendee.registered_at).toLocaleString()
                    : '—';

                  return (
                    <tr key={attendee.registration_id || index} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6 font-semibold text-slate-900">
                        {attendee.name}
                      </td>
                      <td className="py-3.5 px-6 text-slate-600 font-mono text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{attendee.email}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <XCircle className="w-3 h-3" />
                            <span>Cancelled</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-slate-500">
                        {formattedDate}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
