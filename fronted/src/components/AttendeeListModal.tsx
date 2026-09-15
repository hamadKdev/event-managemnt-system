import React, { useState, useEffect } from 'react';
import { EventItem, Attendee } from '../types';
import { api, ApiError } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  X,
  Users,
  Copy,
  Download,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  Check,
} from 'lucide-react';

interface AttendeeListModalProps {
  event: EventItem | null;
  onClose: () => void;
}

export const AttendeeListModal: React.FC<AttendeeListModalProps> = ({
  event,
  onClose,
}) => {
  const { showToast } = useToast();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!event) return;

    let mounted = true;
    const fetchAttendees = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getAdminEventAttendees(event.id);
        if (mounted) {
          setAttendees(data || []);
        }
      } catch (err: unknown) {
        if (mounted) {
          if (err instanceof ApiError) {
            setError(err.detail);
          } else if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('Failed to fetch attendees list.');
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchAttendees();
    return () => {
      mounted = false;
    };
  }, [event]);

  if (!event) return null;

  const filteredAttendees = attendees.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Copy plain text list to clipboard
  const handleCopyText = async () => {
    if (attendees.length === 0) {
      showToast('No attendees to copy.', 'info');
      return;
    }

    const lines = [
      `EVENT ROSTER: ${event.title}`,
      `Date: ${event.date} | Time: ${event.time}`,
      `Location: ${event.location}`,
      `Total Registered: ${attendees.length}`,
      '--------------------------------------------------',
      'NAME | EMAIL | STATUS | REGISTERED AT',
      ...attendees.map(
        (a, i) =>
          `${i + 1}. ${a.name} | ${a.email} | ${a.status?.toUpperCase()} | ${new Date(
            a.registered_at
          ).toLocaleString()}`
      ),
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      showToast('Attendee roster copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      showToast('Failed to copy to clipboard.', 'error');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (attendees.length === 0) {
      showToast('No attendees to export.', 'info');
      return;
    }

    const headers = ['Registration ID', 'User ID', 'Name', 'Email', 'Status', 'Registered At'];
    const rows = attendees.map((a) => [
      `"${a.registration_id}"`,
      `"${a.user_id}"`,
      `"${a.name.replace(/"/g, '""')}"`,
      `"${a.email.replace(/"/g, '""')}"`,
      `"${a.status}"`,
      `"${a.registered_at}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `attendees_event_${event.id}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('CSV downloaded successfully for check-in use.', 'success');
  };

  return (
    <div
      id="attendee-list-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attendee-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                Check-in Roster
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Event #{event.id}
              </span>
            </div>
            <h2 id="attendee-modal-title" className="text-lg font-bold text-slate-900 mt-1">
              Attendees for: {event.title}
            </h2>
            <p className="text-xs text-slate-500">
              {event.date} at {event.time} • {event.location}
            </p>
          </div>
          <button
            id="close-attendees-modal-btn"
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search & Export buttons */}
        <div className="p-4 sm:px-6 bg-white border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              id="search-attendees-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="copy-roster-btn"
              type="button"
              disabled={loading || attendees.length === 0}
              onClick={handleCopyText}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            <button
              id="export-csv-btn"
              type="button"
              disabled={loading || attendees.length === 0}
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Content Table / States */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium text-slate-500">
                Loading attendee roster...
              </span>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <div className="text-sm font-semibold text-rose-900">{error}</div>
            </div>
          ) : attendees.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                No attendees registered yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When attendees sign up for this event, their details and registration timestamps will appear here.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <table id="attendees-table" className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">Attendee</th>
                    <th scope="col" className="px-4 py-3">Email</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Registered At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-xs text-slate-700">
                  {filteredAttendees.map((att) => {
                    const isCancelled = att.status?.toLowerCase() === 'cancelled';
                    return (
                      <tr
                        key={att.registration_id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isCancelled ? 'opacity-60 bg-slate-50/40' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {att.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                          {att.email}
                        </td>
                        <td className="px-4 py-3">
                          {isCancelled ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-slate-400" />
                              Cancelled
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(att.registered_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Showing {filteredAttendees.length} of {attendees.length} attendee(s)
          </span>
          <button
            id="close-attendee-list-footer-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
