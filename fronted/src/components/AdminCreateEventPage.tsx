import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../services/api';
import { useToast } from '../context/ToastContext';
import { EventFormData } from '../types';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  ArrowLeft,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const AdminCreateEventPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    date: defaultDate,
    time: '10:00',
    location: '',
    capacity: 50,
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) {
      showToast('Please fix the validation errors before submitting.', 'error');
      return;
    }

    setLoading(true);

    try {
      const created = await api.createAdminEvent({
        ...formData,
        capacity: Number(formData.capacity),
      });

      showToast(`Event "${created.title}" successfully created!`, 'success');
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
        setErrorMessage('Failed to create event. Please verify backend connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="admin-create-event-page" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header with back navigation */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Events</span>
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Event Listing</span>
          </div>
          <h1 id="create-event-heading" className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Create Event
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Fill in the event parameters below. All fields are required.
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="m-6 sm:m-8 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800">
              <span className="font-bold">Creation Error:</span> {errorMessage}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="event-title-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Event Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="event-title-input"
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. AI & Cloud Developer Summit 2026"
              className={`w-full px-4 py-2.5 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                fieldErrors.title ? 'border-rose-400' : 'border-slate-200 focus:border-indigo-600'
              }`}
            />
            {fieldErrors.title && (
              <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="event-description-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="event-description-input"
              rows={4}
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide a comprehensive summary of the event schedule, speakers, and topics..."
              className={`w-full px-4 py-2.5 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                fieldErrors.description ? 'border-rose-400' : 'border-slate-200 focus:border-indigo-600'
              }`}
            />
            {fieldErrors.description && (
              <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.description}</p>
            )}
          </div>

          {/* Date & Time Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-date-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Date (YYYY-MM-DD) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="event-date-input"
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={`w-full px-4 py-2.5 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                    fieldErrors.date ? 'border-rose-400' : 'border-slate-200 focus:border-indigo-600'
                  }`}
                />
              </div>
              {fieldErrors.date && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.date}</p>
              )}
            </div>

            <div>
              <label htmlFor="event-time-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Time (HH:MM) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="event-time-input"
                  type="time"
                  required
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className={`w-full px-4 py-2.5 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                    fieldErrors.time ? 'border-rose-400' : 'border-slate-200 focus:border-indigo-600'
                  }`}
                />
              </div>
              {fieldErrors.time && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.time}</p>
              )}
            </div>
          </div>

          {/* Location & Capacity Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="event-location-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Location / Venue <span className="text-rose-500">*</span>
              </label>
              <input
                id="event-location-input"
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Hall A, San Francisco Convention Center"
                className={`w-full px-4 py-2.5 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                  fieldErrors.location ? 'border-rose-400' : 'border-slate-200 focus:border-indigo-600'
                }`}
              />
              {fieldErrors.location && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.location}</p>
              )}
            </div>

            <div>
              <label htmlFor="event-capacity-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Capacity (Seats) <span className="text-rose-500">*</span>
              </label>
              <input
                id="event-capacity-input"
                type="number"
                min="1"
                step="1"
                required
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className={`w-full px-4 py-2.5 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                  fieldErrors.capacity ? 'border-rose-400' : 'border-slate-200 focus:border-indigo-600'
                }`}
              />
              {fieldErrors.capacity && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.capacity}</p>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              to="/admin/events"
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </Link>

            <button
              id="submit-create-event-btn"
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Event</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
