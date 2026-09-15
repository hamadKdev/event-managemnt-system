import React, { useState, useEffect } from 'react';
import { EventItem } from '../types';
import { api, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Ticket,
  LogIn,
  AlertTriangle,
} from 'lucide-react';

interface EventDetailsModalProps {
  eventId: number | string | null;
  onClose: () => void;
  onRegisteredSuccess?: (updatedEvent: EventItem) => void;
  onRequestLogin?: () => void;
  isUserRegistered?: boolean;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  eventId,
  onClose,
  onRegisteredSuccess,
  onRequestLogin,
  isUserRegistered: initialRegistered = false,
}) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(initialRegistered);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => {
    setIsRegistered(initialRegistered);
  }, [initialRegistered]);

  useEffect(() => {
    if (!eventId) return;

    let mounted = true;
    const fetchEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getEventById(eventId);
        if (mounted) {
          setEvent(data);
        }
      } catch (err: unknown) {
        if (mounted) {
          if (err instanceof ApiError) {
            setError(err.detail);
          } else {
            setError('Failed to load event details. Please try again.');
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchEvent();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  if (!eventId) return null;

  // Check if date has passed
  const isPastEvent = (eventDate: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      return eventDate < today;
    } catch {
      return false;
    }
  };

  const handleRegister = async () => {
    if (!user) {
      if (onRequestLogin) {
        onClose();
        onRequestLogin();
      }
      return;
    }

    if (!event) return;

    setRegistering(true);
    try {
      await api.registerForEvent(event.id);
      setIsRegistered(true);
      setRegistrationSuccess(true);
      showToast(`Successfully registered for "${event.title}"!`, 'success');

      // Update local event available spots and registered count
      const updated: EventItem = {
        ...event,
        registered_count: (event.registered_count || 0) + 1,
        available_spots: Math.max(0, (event.available_spots || 1) - 1),
      };
      setEvent(updated);
      if (onRegisteredSuccess) {
        onRegisteredSuccess(updated);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        showToast(err.detail, 'error');
        if (err.status === 400 && err.detail.toLowerCase().includes('already')) {
          setIsRegistered(true);
        }
      } else {
        showToast('Registration failed. Please try again.', 'error');
      }
    } finally {
      setRegistering(false);
    }
  };

  // Determine button state and friendly explanation
  const getRegistrationEligibility = () => {
    if (!event) return { canRegister: false, reason: '' };

    if (isRegistered) {
      return {
        canRegister: false,
        reason: "You're already registered for this event",
        badge: 'registered',
      };
    }

    if (event.status !== 'published') {
      return {
        canRegister: false,
        reason: `Registration closed (Status is ${event.status})`,
        badge: 'closed',
      };
    }

    if (isPastEvent(event.date)) {
      return {
        canRegister: false,
        reason: 'This event date has already passed',
        badge: 'past',
      };
    }

    if (event.available_spots <= 0) {
      return {
        canRegister: false,
        reason: 'Event full — all capacity has been filled',
        badge: 'full',
      };
    }

    return {
      canRegister: true,
      reason: '',
      badge: 'eligible',
    };
  };

  const eligibility = getRegistrationEligibility();

  return (
    <div
      id="event-details-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-details-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Event Details
            </span>
          </div>
          <button
            id="close-event-details-btn"
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium text-slate-500">
                Loading event information...
              </span>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <div className="text-sm font-semibold text-rose-900">{error}</div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          ) : event ? (
            <>
              {/* Status and Available Spots Pill Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${
                      event.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : event.status === 'draft'
                        ? 'bg-slate-100 text-slate-700 border-slate-300'
                        : event.status === 'completed'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {event.status}
                  </span>

                  {isRegistered && (
                    <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Registered</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      event.available_spots > 10
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : event.available_spots > 0
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {event.available_spots > 0
                      ? `${event.available_spots} spots remaining`
                      : 'Event Full'}
                  </span>
                </div>
              </div>

              {/* Title */}
              <div>
                <h2
                  id="event-details-title"
                  className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight"
                >
                  {event.title}
                </h2>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-xs">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Date
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {event.date}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-xs">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Time
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {event.time}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-xs">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Location
                    </div>
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {event.location}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-xs">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Capacity
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {event.registered_count} / {event.capacity} registered
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  About This Event
                </h3>
                <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-line bg-white p-4 rounded-xl border border-slate-100">
                  {event.description}
                </div>
              </div>

              {/* Registration Banner / Eligibility State */}
              {registrationSuccess && (
                <div
                  id="registration-success-banner"
                  className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3"
                >
                  <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-emerald-900">
                      Registration Confirmed!
                    </div>
                    <div className="text-xs text-emerald-700 mt-0.5">
                      Your spot has been reserved. You can review your event details in My Registrations anytime.
                    </div>
                  </div>
                </div>
              )}

              {!eligibility.canRegister && !registrationSuccess && (
                <div
                  id="registration-ineligible-banner"
                  className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-center gap-3 text-slate-700 text-xs"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-medium">{eligibility.reason}</span>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer / Actions */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-100">
          <button
            id="close-details-footer-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Close
          </button>

          {event && !isAdmin && (
            <div>
              {!user ? (
                <button
                  id="login-to-register-btn"
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onRequestLogin) onRequestLogin();
                  }}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Register</span>
                </button>
              ) : eligibility.canRegister ? (
                <button
                  id="confirm-register-btn"
                  type="button"
                  disabled={registering}
                  onClick={handleRegister}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {registering ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <>
                      <Ticket className="w-4 h-4" />
                      <span>Register for Event</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  id="disabled-register-btn"
                  type="button"
                  disabled
                  className="px-5 py-2.5 text-xs font-semibold text-slate-400 bg-slate-200 rounded-xl cursor-not-allowed"
                >
                  {isRegistered ? 'Already Registered' : 'Registration Closed'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
