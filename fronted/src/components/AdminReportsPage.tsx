import React, { useState, useEffect, useCallback } from 'react';
import { DashboardStats, EventItem, normalizeStatus } from '../types';
import { api, ApiError } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  BarChart3,
  Download,
  RefreshCw,
  AlertCircle,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';

export const AdminReportsPage: React.FC = () => {
  const { showToast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashData, eventsData] = await Promise.all([
        api.getAdminDashboard(),
        api.getAdminEvents(),
      ]);
      setStats(dashData);
      setEvents(eventsData || []);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch administrative report data.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Derive status counts accurately from real event data
  const publishedCount =
    stats?.published_events ??
    events.filter((e) => normalizeStatus(e.status) === 'published').length;
  const draftCount =
    stats?.draft_events ??
    events.filter((e) => normalizeStatus(e.status) === 'draft').length;
  const completedCount =
    stats?.completed_events ??
    events.filter((e) => normalizeStatus(e.status) === 'completed').length;
  const cancelledCount =
    stats?.cancelled_events ??
    events.filter((e) => normalizeStatus(e.status) === 'cancelled').length;

  const totalCap =
    stats?.total_capacity ??
    events.reduce((sum, e) => sum + (Number(e.capacity) || 0), 0);
  const totalRegs =
    stats?.total_registrations ??
    events.reduce((sum, e) => sum + (Number(e.registered_count) || 0), 0);

  const occupancyRate =
    totalCap > 0 ? Math.min(100, Math.round((totalRegs / totalCap) * 100)) : 0;

  // Export report to CSV
  const handleExportCSV = () => {
    if (events.length === 0) {
      showToast('No event data to export.', 'info');
      return;
    }

    const headers = [
      'Event ID',
      'Title',
      'Date',
      'Time',
      'Location',
      'Status',
      'Capacity',
      'Registered',
      'Available Spots',
      'Occupancy Rate (%)',
    ];

    const rows = events.map((e) => {
      const cap = Number(e.capacity) || 0;
      const reg = Number(e.registered_count) || 0;
      const rate = cap > 0 ? Math.round((reg / cap) * 100) : 0;
      return [
        String(e.id),
        `"${(e.title || '').replace(/"/g, '""')}"`,
        e.date,
        e.time,
        `"${(e.location || '').replace(/"/g, '""')}"`,
        (e.status || 'draft').toUpperCase(),
        cap,
        reg,
        e.available_spots ?? Math.max(0, cap - reg),
        `${rate}%`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `event_management_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Executive report downloaded as CSV.', 'success');
  };

  return (
    <div id="admin-reports-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Administrative Analytics</span>
          </div>
          <h1 id="reports-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            System Reports & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time event performance, capacity utilization, and registration metrics from your FastAPI backend.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="refresh-reports-btn"
            type="button"
            onClick={fetchReportData}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            id="export-reports-csv-btn"
            type="button"
            onClick={handleExportCSV}
            disabled={events.length === 0}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Generating report from backend records...</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center max-w-lg mx-auto space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-sm font-bold text-rose-900">Failed to Load Reports</h3>
          <p className="text-xs text-rose-700">{error}</p>
          <button
            type="button"
            onClick={fetchReportData}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Key Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Events
              </span>
              <div className="text-3xl font-black text-slate-900 mt-2">
                {events.length}
              </div>
              <div className="text-xs text-slate-500 mt-1">Across all lifecycle statuses</div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Registrations
              </span>
              <div className="text-3xl font-black text-indigo-600 mt-2">
                {totalRegs}
              </div>
              <div className="text-xs text-slate-500 mt-1">Cumulative bookings recorded</div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Capacity
              </span>
              <div className="text-3xl font-black text-slate-900 mt-2">
                {totalCap}
              </div>
              <div className="text-xs text-slate-500 mt-1">Total seats configured</div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Overall Occupancy
              </span>
              <div className="text-3xl font-black text-emerald-600 mt-2">
                {occupancyRate}%
              </div>
              <div className="text-xs text-slate-500 mt-1">Capacity utilization rate</div>
            </div>
          </div>

          {/* Event Lifecycle Breakdown */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Event Status Distribution</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Published</span>
                <div className="text-2xl font-black text-emerald-900 mt-1">{publishedCount}</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Active for attendees</div>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Draft</span>
                <div className="text-2xl font-black text-amber-900 mt-1">{draftCount}</div>
                <div className="text-[11px] text-amber-700 mt-0.5">Pending publication</div>
              </div>

              <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Completed</span>
                <div className="text-2xl font-black text-blue-900 mt-1">{completedCount}</div>
                <div className="text-[11px] text-blue-700 mt-0.5">Past events</div>
              </div>

              <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Cancelled</span>
                <div className="text-2xl font-black text-rose-900 mt-1">{cancelledCount}</div>
                <div className="text-[11px] text-rose-700 mt-0.5">Discontinued events</div>
              </div>
            </div>
          </div>

          {/* Detailed Event Table Breakdown */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Event Performance Table</h3>
                <p className="text-xs text-slate-500 mt-0.5">Breakdown per event</p>
              </div>
              <span className="text-xs text-slate-500">{events.length} event(s)</span>
            </div>

            <div className="overflow-x-auto">
              <table id="reports-breakdown-table" className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-3.5 px-6">Event Title</th>
                    <th className="py-3.5 px-6">Date</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Capacity</th>
                    <th className="py-3.5 px-6">Registered</th>
                    <th className="py-3.5 px-6">Available</th>
                    <th className="py-3.5 px-6">Occupancy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((e) => {
                    const cap = Number(e.capacity) || 0;
                    const reg = Number(e.registered_count) || 0;
                    const pct = cap > 0 ? Math.min(100, Math.round((reg / cap) * 100)) : 0;
                    const st = normalizeStatus(e.status);

                    return (
                      <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-6 font-semibold text-slate-900">
                          {e.title}
                          <span className="block text-[10px] text-slate-400 font-normal">{e.location}</span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-600">{e.date}</td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              st === 'published'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : st === 'completed'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : st === 'cancelled'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {st}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-700 font-medium">{cap}</td>
                        <td className="py-3.5 px-6 text-indigo-600 font-bold">{reg}</td>
                        <td className="py-3.5 px-6 text-slate-600">
                          {e.available_spots ?? Math.max(0, cap - reg)}
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-semibold text-slate-700 text-[11px]">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
