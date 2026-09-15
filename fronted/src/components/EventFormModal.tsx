import React, { useState, useEffect } from 'react';
import { EventItem, EventFormData } from '../types';
import { api, ApiError } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: EventItem | null;
  onSuccess: (event: EventItem, isEdit: boolean) => void;
}

export const EventFormModal: React.FC<EventFormModalProps> = ({
  isOpen,
  onClose,
  eventToEdit,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const isEdit = Boolean(eventToEdit);

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    capacity: 50,
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (eventToEdit) {
      setFormData({
        title: eventToEdit.title || '',
        description: eventToEdit.description || '',
        date: eventToEdit.date || '',
        time: eventToEdit.time || '',
        location: eventToEdit.location || '',
        capacity: eventToEdit.capacity || 50,
      });
    } else {
      // Defaults for new event
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 7);
      const defaultDate = tomorrow.toISOString().split('T')[0];

      setFormData({
        title: '',
        description: '',
        date: defaultDate,
        time: '10:00',
        location: '',
        capacity: 50,
      });
    }
    setErrorMessage(null);
    setFieldErrors({});
  }, [eventToEdit, isOpen]);

  if (!isOpen) return null;

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
      errors.location = 'Location or venue is required.';
    }

    const capNum = Number(formData.capacity);
    if (isNaN(capNum) || capNum <= 0 || !Number.isInteger(capNum)) {
      errors.capacity = 'Capacity must be a positive whole number (e.g. 50).';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      if (isEdit && eventToEdit) {
        const updated = await api.updateAdminEvent(eventToEdit.id, formData);
        showToast(`Event "${updated.title}" updated successfully.`, 'success');
        onSuccess(updated, true);
      } else {
        const created = await api.createAdminEvent(formData);
        showToast(
          `Event "${created.title}" created as Draft.`,
          'success'
        );
        onSuccess(created, false);
      }
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail);
        if (err.fieldErrors) {
          setFieldErrors((prev) => ({ ...prev, ...err.fieldErrors }));
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to save event. Please check inputs.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="event-form-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 id="event-form-title" className="text-base font-bold text-slate-900">
              {isEdit ? 'Edit Event Details' : 'Create New Event'}
            </h2>
            <p className="text-xs text-slate-500">
              {isEdit
                ? 'Update information for this event'
                : 'Fill in the event parameters. New events are created with Draft status.'}
            </p>
          </div>
          <button
            id="close-event-form-btn"
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form id="admin-event-form" onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Global Error Banner */}
            {errorMessage && (
              <div
                id="event-form-error"
                role="alert"
                className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 break-words">{errorMessage}</div>
              </div>
            )}

            {/* Title */}
            <div>
              <label
                htmlFor="form-event-title"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Event Title *
              </label>
              <input
                id="form-event-title"
                type="text"
                required
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (fieldErrors.title) setFieldErrors({ ...fieldErrors, title: '' });
                }}
                placeholder="e.g. Annual Tech Leadership Summit 2026"
                className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 ${
                  fieldErrors.title
                    ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                    : 'border-slate-200 focus:border-indigo-600'
                }`}
              />
              {fieldErrors.title && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">
                  {fieldErrors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="form-event-description"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Description *
              </label>
              <textarea
                id="form-event-description"
                rows={3}
                required
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (fieldErrors.description)
                    setFieldErrors({ ...fieldErrors, description: '' });
                }}
                placeholder="Detailed event agenda, schedule, target audience, and highlights..."
                className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 ${
                  fieldErrors.description
                    ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                    : 'border-slate-200 focus:border-indigo-600'
                }`}
              />
              {fieldErrors.description && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">
                  {fieldErrors.description}
                </p>
              )}
            </div>

            {/* Date and Time Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="form-event-date"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Date (YYYY-MM-DD) *
                </label>
                <div className="relative">
                  <input
                    id="form-event-date"
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => {
                      setFormData({ ...formData, date: e.target.value });
                      if (fieldErrors.date) setFieldErrors({ ...fieldErrors, date: '' });
                    }}
                    className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 ${
                      fieldErrors.date
                        ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                        : 'border-slate-200 focus:border-indigo-600'
                    }`}
                  />
                </div>
                {fieldErrors.date && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">
                    {fieldErrors.date}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="form-event-time"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Time (HH:MM 24h) *
                </label>
                <input
                  id="form-event-time"
                  type="time"
                  required
                  value={formData.time}
                  onChange={(e) => {
                    setFormData({ ...formData, time: e.target.value });
                    if (fieldErrors.time) setFieldErrors({ ...fieldErrors, time: '' });
                  }}
                  className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 ${
                    fieldErrors.time
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                      : 'border-slate-200 focus:border-indigo-600'
                  }`}
                />
                {fieldErrors.time && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">
                    {fieldErrors.time}
                  </p>
                )}
              </div>
            </div>

            {/* Location and Capacity Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="form-event-location"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Location / Venue *
                </label>
                <input
                  id="form-event-location"
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => {
                    setFormData({ ...formData, location: e.target.value });
                    if (fieldErrors.location)
                      setFieldErrors({ ...fieldErrors, location: '' });
                  }}
                  placeholder="Grand Ballroom / Zoom Link"
                  className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 ${
                    fieldErrors.location
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                      : 'border-slate-200 focus:border-indigo-600'
                  }`}
                />
                {fieldErrors.location && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">
                    {fieldErrors.location}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="form-event-capacity"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
                >
                  Capacity (Spots) *
                </label>
                <input
                  id="form-event-capacity"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={formData.capacity}
                  onChange={(e) => {
                    setFormData({ ...formData, capacity: e.target.value });
                    if (fieldErrors.capacity)
                      setFieldErrors({ ...fieldErrors, capacity: '' });
                  }}
                  placeholder="50"
                  className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 ${
                    fieldErrors.capacity
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                      : 'border-slate-200 focus:border-indigo-600'
                  }`}
                />
                {fieldErrors.capacity ? (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">
                    {fieldErrors.capacity}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Must be a positive integer.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
            <button
              id="cancel-form-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              id="submit-event-btn"
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEdit ? 'Save Changes' : 'Create Event'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
