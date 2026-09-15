import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, DEFAULT_API_BASE_URL } from '../services/api';
import { X, Server, CheckCircle2, AlertCircle, RefreshCw, Undo2, PlayCircle, ShieldCheck, Activity } from 'lucide-react';

interface BackendStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EndpointTestState {
  endpoint: string;
  method: string;
  status?: number | string;
  responseBody?: string;
  ok?: boolean;
  loading?: boolean;
  errorDetail?: string;
}

export const BackendStatusModal: React.FC<BackendStatusModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { apiBaseUrl, updateApiBaseUrl } = useAuth();
  const [urlInput, setUrlInput] = useState(apiBaseUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // 4 Endpoint Diagnostic Suite
  const [diagnosticTests, setDiagnosticTests] = useState<EndpointTestState[]>([
    { endpoint: '/', method: 'GET' },
    { endpoint: '/events', method: 'GET' },
    { endpoint: '/auth/register', method: 'POST' },
    { endpoint: '/auth/login', method: 'POST' },
  ]);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  useEffect(() => {
    setUrlInput(apiBaseUrl);
    setTestResult(null);
  }, [apiBaseUrl, isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async (targetUrl?: string) => {
    setIsTesting(true);
    setTestResult(null);
    const testTarget = (targetUrl || urlInput).trim().replace(/\/+$/, '');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${testTarget}/`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const json = await res.json().catch(() => null);
      const serverMsg = json?.message || res.statusText;

      if (res.ok) {
        setTestResult({
          ok: true,
          message: `Connection successful! Backend responded with HTTP status ${res.status}: "${serverMsg}".`,
        });
      } else {
        setTestResult({
          ok: false,
          message: `Backend responded with HTTP status ${res.status} (${res.statusText}).`,
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setTestResult({
        ok: false,
        message: `Failed to reach ${testTarget}: ${errMsg}. Make sure your FastAPI backend on Vercel is accessible.`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleRunAllDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    const updated: EndpointTestState[] = [
      { endpoint: '/', method: 'GET', loading: true },
      { endpoint: '/events', method: 'GET', loading: true },
      { endpoint: '/auth/register', method: 'POST', loading: true },
      { endpoint: '/auth/login', method: 'POST', loading: true },
    ];
    setDiagnosticTests([...updated]);

    const target = API_BASE_URL.replace(/\/+$/, '');

    // 1. Test GET /
    try {
      const res = await fetch(`${target}/`, { method: 'GET' });
      const text = await res.text();
      updated[0] = {
        endpoint: '/',
        method: 'GET',
        status: res.status,
        responseBody: text,
        ok: res.ok,
        loading: false,
      };
    } catch (err: any) {
      updated[0] = {
        endpoint: '/',
        method: 'GET',
        status: 'Network Error',
        responseBody: err?.message || 'Failed to fetch',
        ok: false,
        loading: false,
      };
    }
    setDiagnosticTests([...updated]);

    // 2. Test GET /events
    try {
      const res = await fetch(`${target}/events`, { method: 'GET' });
      const text = await res.text();
      updated[1] = {
        endpoint: '/events',
        method: 'GET',
        status: res.status,
        responseBody: text,
        ok: res.ok,
        loading: false,
      };
    } catch (err: any) {
      updated[1] = {
        endpoint: '/events',
        method: 'GET',
        status: '500 (Vercel Server Error)',
        responseBody: 'Internal Server Error (Vercel returned 500 without CORS headers)',
        errorDetail: 'The Vercel serverless function crashed. Check server logs on Vercel.',
        ok: false,
        loading: false,
      };
    }
    setDiagnosticTests([...updated]);

    // 3. Test POST /auth/register
    try {
      const res = await fetch(`${target}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Diagnostic User',
          email: 'diag_test@example.com',
          password: 'password123',
        }),
      });
      const text = await res.text();
      updated[2] = {
        endpoint: '/auth/register',
        method: 'POST',
        status: res.status,
        responseBody: text,
        ok: res.ok,
        loading: false,
      };
    } catch (err: any) {
      updated[2] = {
        endpoint: '/auth/register',
        method: 'POST',
        status: '500 (Vercel Server Error)',
        responseBody: 'Internal Server Error (Vercel returned 500 without CORS headers)',
        errorDetail: 'The Vercel serverless function crashed. Check database connection.',
        ok: false,
        loading: false,
      };
    }
    setDiagnosticTests([...updated]);

    // 4. Test POST /auth/login
    try {
      const res = await fetch(`${target}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'diag_test@example.com',
          password: 'password123',
        }),
      });
      const text = await res.text();
      updated[3] = {
        endpoint: '/auth/login',
        method: 'POST',
        status: res.status,
        responseBody: text,
        ok: res.ok,
        loading: false,
      };
    } catch (err: any) {
      updated[3] = {
        endpoint: '/auth/login',
        method: 'POST',
        status: '500 (Vercel Server Error)',
        responseBody: 'Internal Server Error (Vercel returned 500 without CORS headers)',
        errorDetail: 'The Vercel serverless function crashed. Check database connection.',
        ok: false,
        loading: false,
      };
    }
    setDiagnosticTests([...updated]);
    setIsRunningDiagnostics(false);
  };

  const handleSave = () => {
    const cleaned = urlInput.trim().replace(/\/+$/, '');
    if (cleaned) {
      updateApiBaseUrl(cleaned);
      onClose();
    }
  };

  const handleReset = () => {
    setUrlInput(DEFAULT_API_BASE_URL);
    updateApiBaseUrl(DEFAULT_API_BASE_URL);
    handleTestConnection(DEFAULT_API_BASE_URL);
  };

  return (
    <div
      id="backend-status-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backend-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 id="backend-modal-title" className="text-base font-bold text-slate-900">
                Backend API Configuration & Diagnostic Suite
              </h2>
              <p className="text-xs text-slate-500">
                Direct connection to deployed FastAPI backend
              </p>
            </div>
          </div>
          <button
            id="close-backend-modal-btn"
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div>
            <label
              htmlFor="backend-url-input"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Target Backend Base URL
            </label>

            <div className="flex gap-2">
              <input
                id="backend-url-input"
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://event-managemnt-system-ochre.vercel.app"
                className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono text-slate-800"
              />
              <button
                id="test-connection-btn"
                type="button"
                disabled={isTesting || !urlInput.trim()}
                onClick={() => handleTestConnection()}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Pinging...' : 'Ping Root'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              All requests are dispatched to <code className="font-semibold font-mono text-slate-700">{API_BASE_URL}</code> with Bearer tokens for authenticated calls.
            </p>
          </div>

          {testResult && (
            <div
              id="test-connection-result"
              className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                testResult.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 break-words">{testResult.message}</div>
            </div>
          )}

          {/* 4 Endpoints Live Diagnostic Suite */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900">4 Endpoint Live Diagnostic Test</span>
              </div>
              <button
                id="run-all-diagnostics-btn"
                type="button"
                disabled={isRunningDiagnostics}
                onClick={handleRunAllDiagnostics}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <PlayCircle className={`w-3.5 h-3.5 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
                <span>{isRunningDiagnostics ? 'Testing Endpoints...' : 'Test 4 Endpoints'}</span>
              </button>
            </div>

            <div className="space-y-2 pt-1">
              {diagnosticTests.map((t) => (
                <div
                  key={`${t.method}-${t.endpoint}`}
                  className="bg-white border border-slate-200/80 rounded-xl p-3 text-xs space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        t.method === 'GET' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {t.method}
                      </span>
                      <span className="font-semibold text-slate-800">{t.endpoint}</span>
                    </div>

                    <div>
                      {t.loading ? (
                        <span className="text-indigo-600 flex items-center gap-1 text-[11px]">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Testing...
                        </span>
                      ) : t.status !== undefined ? (
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          t.ok
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {typeof t.status === 'number' ? `HTTP ${t.status}` : t.status}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Pending run</span>
                      )}
                    </div>
                  </div>

                  {t.responseBody && (
                    <div className="mt-1 bg-slate-900 text-slate-200 font-mono text-[11px] p-2 rounded-lg break-all max-h-24 overflow-y-auto">
                      {t.responseBody}
                    </div>
                  )}

                  {t.errorDetail && (
                    <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 p-2 rounded-lg">
                      {t.errorDetail}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
          <button
            id="reset-backend-url-btn"
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>
          <div className="flex gap-2.5">
            <button
              id="cancel-backend-modal-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              id="save-backend-url-btn"
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
