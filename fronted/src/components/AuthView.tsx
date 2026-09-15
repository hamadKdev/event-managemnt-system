import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../services/api';
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Users,
  ShieldCheck,
} from 'lucide-react';

interface AuthViewProps {
  onSuccess?: (user?: import('../types').User) => void;
  defaultMode?: 'login' | 'register';
}

export const AuthView: React.FC<AuthViewProps> = ({
  onSuccess,
  defaultMode = 'login',
}) => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<'attendee' | 'admin'>('attendee');
  const [adminCode, setAdminCode] = useState('');

  const resetForm = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setErrorMessage(null);
    setFieldErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    // Basic client validation
    const errors: Record<string, string> = {};
    if (mode === 'register' && !name.trim()) {
      errors.name = 'Full name is required';
    }
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 4) {
      errors.password = 'Password must be at least 4 characters';
    }

    if (mode === 'register' && accountType === 'admin' && !adminCode.trim()) {
      errors.admin_code = 'Admin signup code is required for Admin account registration';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      let loggedUser;
      if (mode === 'login') {
        loggedUser = await login(email, password);
      } else {
        const codeToSend = accountType === 'admin' ? adminCode.trim() : undefined;
        loggedUser = await register(name, email, password, codeToSend);
      }
      if (onSuccess) {
        onSuccess(loggedUser);
      }

      // Explicit role-based redirect (Requirement 1 & 14)
      const userRole = (loggedUser?.role || '').toUpperCase();
      if (userRole === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail);
        if (err.fieldErrors) {
          setFieldErrors(err.fieldErrors);
        }
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('An unexpected error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-page-container" className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/50">
      <div className="max-w-md w-full">
        {/* Auth Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header & Tabs */}
          <div className="p-8 pb-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-4">
              {mode === 'login' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
            </div>
            <h1 id="auth-heading" className="text-2xl font-bold tracking-tight text-slate-900">
              {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {mode === 'login'
                ? 'Sign in to access your registrations and events'
                : 'Register as an attendee or test admin'}
            </p>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mt-6">
              <button
                id="tab-mode-login"
                type="button"
                onClick={() => resetForm('login')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                id="tab-mode-register"
                type="button"
                onClick={() => resetForm('register')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Form */}
          <form id="auth-form" onSubmit={handleSubmit} className="p-8 pt-2 space-y-4">
            {/* Top Error Alert */}
            {errorMessage && (
              <div
                id="auth-error-banner"
                role="alert"
                className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in duration-200"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 break-words">{errorMessage}</div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label
                  htmlFor="input-name"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="input-name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
                    }}
                    placeholder="Jane Doe"
                    className={`w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 transition-colors ${
                      fieldErrors.name
                        ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                        : 'border-slate-200 focus:border-indigo-600'
                    }`}
                  />
                </div>
                {fieldErrors.name && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">
                    {fieldErrors.name}
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="input-email"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="input-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                  }}
                  placeholder="jane@example.com"
                  className={`w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 transition-colors ${
                    fieldErrors.email
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                      : 'border-slate-200 focus:border-indigo-600'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="input-password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="input-password"
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                  }}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 transition-colors ${
                    fieldErrors.password
                      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                      : 'border-slate-200 focus:border-indigo-600'
                  }`}
                />
              </div>
              {fieldErrors.password && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Account Type Selection (Requirement 15) */}
            {mode === 'register' && (
              <div className="pt-1 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Account Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="account-type-attendee-btn"
                      type="button"
                      onClick={() => {
                        setAccountType('attendee');
                        setAdminCode('');
                      }}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        accountType === 'attendee'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Attendee</span>
                    </button>
                    <button
                      id="account-type-admin-btn"
                      type="button"
                      onClick={() => setAccountType('admin')}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        accountType === 'admin'
                          ? 'border-purple-600 bg-purple-50 text-purple-700 ring-2 ring-purple-600/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Admin</span>
                    </button>
                  </div>
                </div>

                {/* If Admin is selected, show Admin Signup Code */}
                {accountType === 'admin' && (
                  <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2">
                    <label
                      htmlFor="input-admin-code"
                      className="block text-xs font-semibold text-purple-900 flex items-center gap-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-purple-700" />
                      <span>Admin Signup Code</span>
                    </label>
                    <input
                      id="input-admin-code"
                      type="text"
                      value={adminCode}
                      onChange={(e) => setAdminCode(e.target.value)}
                      placeholder="Enter admin signup code"
                      className={`w-full px-3 py-2 text-xs bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-purple-950 font-mono ${
                        fieldErrors.admin_code
                          ? 'border-rose-400 focus:border-rose-500'
                          : 'border-purple-300 focus:border-purple-600'
                      }`}
                    />
                    {fieldErrors.admin_code ? (
                      <p className="text-[11px] text-rose-600 font-medium">
                        {fieldErrors.admin_code}
                      </p>
                    ) : (
                      <p className="text-[10px] text-purple-700 leading-tight">
                        Required to create an administrator account.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Helper info */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-500">
            {mode === 'login' ? (
              <p>
                Don't have an account yet?{' '}
                <button
                  id="switch-to-register-link"
                  type="button"
                  onClick={() => resetForm('register')}
                  className="text-indigo-600 font-semibold hover:underline"
                >
                  Register here
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  id="switch-to-login-link"
                  type="button"
                  onClick={() => resetForm('login')}
                  className="text-indigo-600 font-semibold hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
