import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { EventItem, Registration } from '../types';
import { api, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Ticket,
  LogIn,
  ShieldAlert,
  Share2,
} from 'lucide-react';

export const EventDetailsPage: React.FC = () => {
  const { eventId, id } = useParams<{ eventId?: string; id?: string }>();
  const activeEventId = id || eventId;
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => {
    if (!activeEventId) return;

    let mounted = true;
    const fetchEventData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getEventById(activeEventId);
        if (mounted) {
          setEvent(data);
        }

        // If user is logged in as attendee, check if they are already registered
        if (user && !isAdmin) {
          try {
            const regs = await api.getMyRegistrations();
            const found = regs.some(
              (r) =>
                (r.event && String(r.event.id) === String(activeEventId)) ||
                (r.event_id && String(r.event_id) === String(activeEventId))
            );
            if (mounted) {
              setIsRegistered(found);
            }
          } catch {
            // Ignore error checking registrations
          }
        }
      } catch (err: unknown) {
        if (mounted) {
          if (err instanceof ApiError) {
            setError(err.detail);
          } else if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('Failed to load event details.');
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchEventData();
    return () => {
      mounted = false;
    };
  }, [activeEventId, user, isAdmin]);

  const handleRegister = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!event || isRegistered || registering) return;

    setRegistering(true);
    try {
      await api.registerForEvent(event.id);
      setIsRegistered(true);
      setRegistrationSuccess(true);
      showToast(`Successfully registered for "${event.title}"!`, 'success');

      // Update local event available spots and registered count
      setEvent((prev) =>
        prev
          ? {
              ...prev,
              registered_count: (prev.registered_count || 0) + 1,
              available_spots: Math.max(0, (prev.available_spots || 1) - 1),
            }
          : null
      );
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        showToast(err.detail, 'error');
      } else if (err instanceof Error) {
        showToast(err.message, 'error');
      } else {
        showToast('Registration failed. Please try again.', 'error');
      }
    } finally {
      setRegistering(false);
    }
  };

  const isSoldOut = Boolean(
    event &&
      ((event.available_spots !== undefined && event.available_spots <= 0) ||
        (event.registered_count !== undefined &&
          event.capacity !== undefined &&
          event.registered_count >= event.capacity))
  );

  const isPastEvent = (dateStr: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      return dateStr < today;
    } catch {
      return false;
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-32 bg-slate-200 rounded" />
          <div className="h-10 w-3/4 bg-slate-200 rounded-lg" />
          <div className="h-64 bg-slate-100 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Event Not Found</h2>
          <p className="text-sm text-slate-500">{error || 'Unable to retrieve event details.'}</p>
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Events Catalog</span>
          </button>
        </div>
      </div>
    );
  }

  const past = isPastEvent(event.date);

  return (
    <div id="event-details-page" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <button
          id="back-to-events-btn"
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Main Event Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Banner Area */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 p-8 sm:p-12 text-white relative">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-xs border border-white/20">
              {event.status?.toUpperCase() || 'PUBLISHED'}
            </span>
            {past ? (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/80 text-white">
                Event Concluded
              </span>
            ) : isSoldOut ? (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/90 text-white">
                Sold Out
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/90 text-white">
                Registration Open
              </span>
            )}
          </div>

          <h1 id="event-details-title" className="text-2xl sm:text-4xl font-black tracking-tight leading-tight max-w-3xl">
            {event.title}
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10 text-white/90 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-indigo-300 shrink-0" />
              <div>
                <span className="text-[11px] text-indigo-200 block uppercase tracking-wider font-semibold">Date</span>
                <span className="font-medium text-white">{event.date}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-indigo-300 shrink-0" />
              <div>
                <span className="text-[11px] text-indigo-200 block uppercase tracking-wider font-semibold">Time</span>
                <span className="font-medium text-white">{event.time}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <MapPin className="w-5 h-5 text-indigo-300 shrink-0" />
              <div>
                <span className="text-[11px] text-indigo-200 block uppercase tracking-wider font-semibold">Location</span>
                <span className="font-medium text-white">{event.location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left / Main Description */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3">About This Event</h2>
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                {event.description}
              </div>
            </div>

            {registrationSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">You are officially registered!</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Your seat is confirmed. You can review or manage this anytime in{' '}
                    <Link to="/my-registrations" className="underline font-semibold">
                      My Registrations
                    </Link>.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right / Registration Action Card */}
          <div className="space-y-6">
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-indigo-600" />
                <span>Registration Status</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Total Capacity</span>
                  <span className="font-semibold text-slate-800">{event.capacity} seats</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Confirmed Attendees</span>
                  <span className="font-semibold text-slate-800">{event.registered_count}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Available Spots</span>
                  <span
                    className={`font-bold ${
                      (event.available_spots ?? 0) <= 5 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {event.available_spots} remaining
                  </span>
                </div>
              </div>

              {/* Action Button depending on status */}
              {isAdmin ? (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center">
                  <p className="text-xs font-semibold text-purple-900">Administrator View</p>
                  <p className="text-[11px] text-purple-700 mt-0.5">
                    To manage attendees, visit the Admin Console.
                  </p>
                  <Link
                    to={`/admin/events/${event.id}/attendees`}
                    className="mt-3 block px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    View Attendee Roster
                  </Link>
                </div>
              ) : isRegistered ? (
                <div className="space-y-2">
                  <div
                    id="already-registered-badge"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Already Registered</span>
                  </div>
                  <Link
                    to="/my-registrations"
                    className="block text-center text-xs text-indigo-600 hover:text-indigo-800 font-medium py-1"
                  >
                    View in My Registrations →
                  </Link>
                </div>
              ) : past ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3 px-4 rounded-xl bg-slate-200 text-slate-500 font-semibold text-xs cursor-not-allowed"
                >
                  Event Concluded
                </button>
              ) : isSoldOut ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-3 px-4 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 font-bold text-xs cursor-not-allowed"
                >
                  Sold Out
                </button>
              ) : !user ? (
                <button
                  id="login-to-register-btn"
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Register</span>
                </button>
              ) : (
                <button
                  id="register-for-event-btn"
                  type="button"
                  onClick={handleRegister}
                  disabled={registering}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {registering ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Ticket className="w-4 h-4" />
                      <span>Register for Event</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
