import React, { useState, useEffect, useCallback } from 'react';
import { Registration, EventItem } from '../types';
import { api, ApiError } from '../services/api';
import { useToast } from '../context/ToastContext';
import { EventDetailsModal } from './EventDetailsModal';
import {
  Ticket,
  Calendar,
  Clock,
  MapPin,
  XCircle,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface MyRegistrationsViewProps {
  onBrowseEvents: () => void;
}

export const MyRegistrationsView: React.FC<MyRegistrationsViewProps> = ({
  onBrowseEvents,
}) => {
  const { showToast } = useToast();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation confirm dialog state
  const [cancellingId, setCancellingId] = useState<number | string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Selected event modal
  const [selectedEventId, setSelectedEventId] = useState<number | string | null>(null);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMyRegistrations();
      setRegistrations(data || []);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to load your registrations. Please check your backend connection.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleCancelRegistration = async (registrationId: number | string) => {
    setIsCancelling(true);
    try {
      await api.cancelRegistration(registrationId);
      showToast('Registration cancelled successfully.', 'success');
      // Update local state: mark registration as cancelled or remove based on backend convention
      setRegistrations((prev) =>
        prev.map((r) => {
          const id = r.registration_id || r.id;
          if (id === registrationId) {
            return {
              ...r,
              status: 'cancelled',
            };
          }
          return r;
        })
      );
      setCancellingId(null);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        showToast(err.detail, 'error');
      } else {
        showToast('Failed to cancel registration. Please try again.', 'error');
      }
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div id="my-registrations-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-2">
            <Ticket className="w-3.5 h-3.5" />
            <span>Attendee Portal</span>
          </div>
          <h1 id="my-registrations-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Event Registrations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            View all events you've registered for and manage your bookings.
          </p>
        </div>

        <button
          id="refresh-registrations-btn"
          type="button"
          onClick={fetchRegistrations}
          disabled={loading}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div id="registrations-loading-skeletons" className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse shadow-xs"
            >
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-slate-200 rounded-md w-1/3" />
                <div className="h-4 bg-slate-100 rounded-md w-1/2" />
                <div className="h-4 bg-slate-100 rounded-md w-1/4" />
              </div>
              <div className="h-9 bg-slate-200 rounded-xl w-32 shrink-0" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div
          id="registrations-error-state"
          className="p-8 bg-rose-50/70 border border-rose-200 rounded-3xl text-center max-w-lg mx-auto space-y-4"
        >
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-rose-900">
              Failed to load registrations
            </h3>
            <p className="text-xs text-rose-700 mt-1 leading-relaxed">
              {error}
            </p>
          </div>
          <button
            type="button"
            onClick={fetchRegistrations}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : registrations.length === 0 ? (
        <div
          id="registrations-empty-state"
          className="p-12 sm:p-16 bg-white border border-slate-200 rounded-3xl text-center max-w-lg mx-auto space-y-5 shadow-xs"
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
            <Ticket className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              No registrations yet
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-sm mx-auto">
              You haven't signed up for any events yet. Check out the upcoming schedule to reserve your spot!
            </p>
          </div>
          <button
            id="browse-events-from-empty-btn"
            type="button"
            onClick={onBrowseEvents}
            className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Browse Upcoming Events</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div id="registrations-list" className="space-y-4">
          {registrations.map((reg) => {
            const regId = reg.registration_id || reg.id || '';
            const isCancelled = reg.status?.toLowerCase() === 'cancelled';
            const eventInfo: EventItem = reg.event || ({} as EventItem);

            return (
              <div
                key={regId}
                id={`registration-item-${regId}`}
                className={`rounded-3xl border transition-all p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${
                  isCancelled
                    ? 'bg-slate-50/70 border-slate-200/80 opacity-75'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Left side: Event and Registration Info */}
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Badge */}
                    {isCancelled ? (
                      <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-slate-500" />
                        <span>Cancelled</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Confirmed & Active</span>
                      </span>
                    )}

                    {reg.registered_at && (
                      <span className="text-[11px] text-slate-500">
                        Booked on {new Date(reg.registered_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div>
                    <h2 className={`text-xl font-bold ${isCancelled ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
                      {eventInfo.title || 'Untitled Event'}
                    </h2>
                    {eventInfo.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {eventInfo.description}
                      </p>
                    )}
                  </div>

                  {/* Date, Time, Location pills */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-700">{eventInfo.date || 'TBD'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{eventInfo.time || 'TBD'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate max-w-xs">{eventInfo.location || 'Online'}</span>
                    </div>
                  </div>
                </div>

                {/* Right side: Actions */}
                <div className="flex items-center gap-3 shrink-0 self-end lg:self-center border-t lg:border-t-0 pt-4 lg:pt-0 w-full lg:w-auto justify-end">
                  {eventInfo.id && (
                    <button
                      id={`view-registered-event-${eventInfo.id}-btn`}
                      type="button"
                      onClick={() => setSelectedEventId(eventInfo.id)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                      View Event
                    </button>
                  )}

                  {!isCancelled && (
                    <button
                      id={`cancel-reg-${regId}-btn`}
                      type="button"
                      onClick={() => setCancellingId(regId)}
                      className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel Registration</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Cancellation */}
      {cancellingId && (
        <div
          id="confirm-cancellation-modal"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Cancel this registration?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to cancel your registration? Your reserved spot will be released back to other attendees.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                id="cancel-dialog-dismiss-btn"
                type="button"
                disabled={isCancelling}
                onClick={() => setCancellingId(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Keep Registration
              </button>

              <button
                id="confirm-cancel-reg-btn"
                type="button"
                disabled={isCancelling}
                onClick={() => handleCancelRegistration(cancellingId)}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isCancelling ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Yes, Cancel</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEventId && (
        <EventDetailsModal
          eventId={selectedEventId}
          onClose={() => setSelectedEventId(null)}
          isUserRegistered={true}
        />
      )}
    </div>
  );
};
