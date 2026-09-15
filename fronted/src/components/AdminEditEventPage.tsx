import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../services/api';
import { useToast } from '../context/ToastContext';
import { EventItem, EventFormData, EventStatus } from '../types';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  FileEdit,
  Tag,
} from 'lucide-react';

export const AdminEditEventPage: React.FC = () => {
  const { id, eventId } = useParams<{ id?: string; eventId?: string }>();
  const activeEventId = id || eventId;
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    capacity: 50,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fetchEvent = useCallback(async () => {
    if (!activeEventId) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      // First try direct event details endpoint, or fallback to admin events list
      let eventData: EventItem | undefined;
      try {
        eventData = await api.getEventById(activeEventId);
      } catch {
        const all = await api.getAdminEvents();
        eventData = all.find((e) => String(e.id) === String(activeEventId));
      }

      if (eventData) {
        setEvent(eventData);
        setFormData({
          title: eventData.title,
          description: eventData.description,
          date: eventData.date,
          time: eventData.time,
          location: eventData.location,
          capacity: eventData.capacity,
        });
      } else {
        setErrorMessage(`Event with ID #${activeEventId} was not found.`);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to load event details.');
      }
    } finally {
      setLoading(false);
    }
  }, [activeEventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = 'Event title is required.';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required.';
    }

    if (!formData.date) {
      errors.date = 'Event date is required (YYYY-MM-DD).';
    }

    if (!formData.time) {
      errors.time = 'Event time is required (HH:MM).';
    }

    if (!formData.location.trim()) {
      errors.location = 'Location is required.';
    }

    const capNum = Number(formData.capacity);
    if (isNaN(capNum) || capNum <= 0 || !Number.isInteger(capNum)) {
      errors.capacity = 'Capacity must be an integer greater than 0.';
    } else if (event && capNum < (event.registered_count || 0)) {
      errors.capacity = `Capacity cannot be lower than existing registrations (${event.registered_count}).`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEventId) return;
    setErrorMessage(null);

    if (!validate()) {
      showToast('Please correct validation errors before saving.', 'error');
      return;
    }

    setSaving(true);
    try {
      const updated = await api.updateAdminEvent(activeEventId, {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        capacity: Number(formData.capacity),
      });

      setEvent(updated);
      showToast(`Event "${updated.title}" updated successfully!`, 'success');
      navigate('/admin/events');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail);
        if (err.fieldErrors) {
          setFieldErrors((prev) => ({ ...prev, ...err.fieldErrors }));
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to update event. Please check your network connection.');
      }
      showToast('Failed to update event.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: EventStatus) => {
    if (!activeEventId || !event) return;
    setUpdatingStatus(true);
    try {
      const updated = await api.updateEventStatus(activeEventId, newStatus);
      setEvent(updated);
      showToast(`Event status updated to "${newStatus}".`, 'success');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        showToast(err.detail, 'error');
      } else {
        showToast('Failed to update status.', 'error');
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-600">
          Loading event #{activeEventId} for editing...
        </p>
      </div>
    );
  }

  if (errorMessage && !event) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
          <h2 className="text-lg font-bold text-rose-900">Event Not Found</h2>
          <p className="text-xs text-rose-700">{errorMessage}</p>
          <div className="pt-2">
            <Link
              to="/admin/events"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Events List</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="admin-edit-event-page" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back Link & Header */}
      <div>
        <Link
          id="back-to-admin-events-link"
          to="/admin/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Event Roster</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                ID #{activeEventId}
              </span>
              <span
                className={`text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  event?.status === 'published'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : event?.status === 'draft'
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : event?.status === 'completed'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                {event?.status || 'draft'}
              </span>
            </div>
            <h1 id="edit-event-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Edit Event: {event?.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Modify event parameters, date/time, venue, capacity, or lifecycle status.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              id="view-attendees-link-btn"
              to={`/admin/events/${activeEventId}/attendees`}
              className="px-3.5 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Attendees ({event?.registered_count || 0})</span>
            </Link>

            <Link
              to={`/events/${activeEventId}`}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Public Preview</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Lifecycle Status Quick Action Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-600" />
              <span>Lifecycle Status Actions</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Change the event visibility and registration availability instantly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="status-btn-draft"
              type="button"
              disabled={updatingStatus || event?.status === 'draft'}
              onClick={() => handleStatusChange('draft')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                event?.status === 'draft'
                  ? 'bg-slate-100 text-slate-800 border-slate-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Draft</span>
            </button>

            <button
              id="status-btn-publish"
              type="button"
              disabled={updatingStatus || event?.status === 'published'}
              onClick={() => handleStatusChange('published')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                event?.status === 'published'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Publish</span>
            </button>

            <button
              id="status-btn-complete"
              type="button"
              disabled={updatingStatus || event?.status === 'completed'}
              onClick={() => handleStatusChange('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                event?.status === 'completed'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Complete</span>
            </button>

            <button
              id="status-btn-cancel"
              type="button"
              disabled={updatingStatus || event?.status === 'cancelled'}
              onClick={() => handleStatusChange('cancelled')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                event?.status === 'cancelled'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          </div>
        </div>

        {/* Capacity & Registration Mini Stats */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Registered</span>
            <span className="font-extrabold text-slate-900 text-base">{event?.registered_count ?? 0}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Capacity</span>
            <span className="font-extrabold text-slate-900 text-base">{event?.capacity ?? 0}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Available Spots</span>
            <span className="font-extrabold text-emerald-600 text-base">{event?.available_spots ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Main Edit Form */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        {errorMessage && (
          <div className="p-4 mb-6 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        <form id="admin-edit-event-form" onSubmit={handleSave} className="space-y-6">
          {/* Title */}
          <div>
            <label
              htmlFor="edit-event-title"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
            >
              Event Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="edit-event-title"
              type="text"
              required
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (fieldErrors.title) setFieldErrors({ ...fieldErrors, title: '' });
              }}
              placeholder="e.g., Annual Tech Summit 2026"
              className={`w-full px-4 py-3 text-sm bg-slate-50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 transition-colors ${
                fieldErrors.title
                  ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                  : 'border-slate-200 focus:border-indigo-600'
              }`}
            />
            {fieldErrors.title && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="edit-event-description"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
            >
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="edit-event-description"
              required
              rows={4}
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                if (fieldErrors.description) setFieldErrors({ ...fieldErrors, description: '' });
              }}
              placeholder="Detailed schedule, prerequisites, and workshop topics..."
              className={`w-full px-4 py-3 text-sm bg-slate-50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 transition-colors ${
                fieldErrors.description
                  ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                  : 'border-slate-200 focus:border-indigo-600'
              }`}
            />
            {fieldErrors.description && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.description}</p>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="edit-event-date"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
              >
                Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  id="edit-event-date"
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => {
                    setFormData({ ...formData, date: e.target.value });
                    if (fieldErrors.date) setFieldErrors({ ...fieldErrors, date: '' });
                  }}
                  className={`w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 transition-colors ${
                    fieldErrors.date
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                      : 'border-slate-200 focus:border-indigo-600'
                  }`}
                />
              </div>
              {fieldErrors.date && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.date}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="edit-event-time"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
              >
                Time <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Clock className="w-4 h-4" />
                </div>
                <input
                  id="edit-event-time"
                  type="time"
                  required
                  value={formData.time}
                  onChange={(e) => {
                    setFormData({ ...formData, time: e.target.value });
                    if (fieldErrors.time) setFieldErrors({ ...fieldErrors, time: '' });
                  }}
                  className={`w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 transition-colors ${
                    fieldErrors.time
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                      : 'border-slate-200 focus:border-indigo-600'
                  }`}
                />
              </div>
              {fieldErrors.time && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.time}</p>
              )}
            </div>
          </div>

          {/* Location & Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="edit-event-location"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
              >
                Location / Venue <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  id="edit-event-location"
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => {
                    setFormData({ ...formData, location: e.target.value });
                    if (fieldErrors.location) setFieldErrors({ ...fieldErrors, location: '' });
                  }}
                  placeholder="Grand Hall or Zoom Meeting Link"
                  className={`w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 transition-colors ${
                    fieldErrors.location
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                      : 'border-slate-200 focus:border-indigo-600'
                  }`}
                />
              </div>
              {fieldErrors.location && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.location}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="edit-event-capacity"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
              >
                Max Capacity <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Users className="w-4 h-4" />
                </div>
                <input
                  id="edit-event-capacity"
                  type="number"
                  required
                  min={event?.registered_count || 1}
                  value={formData.capacity}
                  onChange={(e) => {
                    setFormData({ ...formData, capacity: e.target.value });
                    if (fieldErrors.capacity) setFieldErrors({ ...fieldErrors, capacity: '' });
                  }}
                  className={`w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 transition-colors ${
                    fieldErrors.capacity
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                      : 'border-slate-200 focus:border-indigo-600'
                  }`}
                />
              </div>
              {fieldErrors.capacity ? (
                <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.capacity}</p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-1">
                  Must be at least {event?.registered_count || 0} (current attendees count).
                </p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
            <Link
              to="/admin/events"
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center"
            >
              Cancel
            </Link>

            <button
              id="save-event-changes-btn"
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes (PUT /admin/events)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
