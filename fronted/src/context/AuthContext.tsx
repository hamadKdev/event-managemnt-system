import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthResponse } from '../types';
import {
  api,
  getStoredToken,
  setStoredToken,
  getStoredApiBaseUrl,
  setStoredApiBaseUrl,
  setOnUnauthorizedCallback,
  ApiError,
} from '../services/api';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  isAttendee: boolean;
  apiBaseUrl: string;
  updateApiBaseUrl: (url: string) => void;
  login: (email: string, password: string) => Promise<User>;
  register: (
    name: string,
    email: string,
    password: string,
    adminCode?: string
  ) => Promise<User>;
  logout: (showNotice?: boolean) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  onRequireAuth,
}: {
  children: React.ReactNode;
  onRequireAuth?: () => void;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiBaseUrl, setApiBaseUrlState] = useState<string>(getStoredApiBaseUrl());
  const { showToast } = useToast();

  const updateApiBaseUrl = useCallback((url: string) => {
    setStoredApiBaseUrl(url);
    setApiBaseUrlState(getStoredApiBaseUrl());
    showToast(`Backend base URL updated to: ${getStoredApiBaseUrl()}`, 'info');
  }, [showToast]);

  const logout = useCallback(
    (showNotice = true) => {
      setStoredToken(null);
      setToken(null);
      setUser(null);
      if (showNotice) {
        showToast('You have been signed out.', 'info');
      }
    },
    [showToast]
  );

  // Hook up global 401 handler
  useEffect(() => {
    setOnUnauthorizedCallback(() => {
      logout(false);
      showToast('Session expired. Please sign in again.', 'warning');
      if (onRequireAuth) {
        onRequireAuth();
      }
    });
  }, [logout, showToast, onRequireAuth]);

  // Initial user fetch if token present
  const refreshUser = useCallback(async () => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        setStoredToken(null);
        setToken(null);
        setUser(null);
      } else {
        // Could be network error; keep token for offline retry or clear
        console.warn('Failed to load user profile on startup', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<User> => {
    const res: AuthResponse = await api.login({ email, password });
    setToken(res.access_token);
    setUser(res.user);
    showToast(`Welcome back, ${res.user.name}!`, 'success');
    return res.user;
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    adminCode?: string
  ): Promise<User> => {
    const res: AuthResponse = await api.register({
      name,
      email,
      password,
      admin_code: adminCode,
    });
    setToken(res.access_token);
    setUser(res.user);
    showToast(
      `Account created! Welcome, ${res.user.name} (${res.user.role}).`,
      'success'
    );
    return res.user;
  };

  const isAdmin = Boolean(
    user && typeof user.role === 'string' && user.role.toLowerCase() === 'admin'
  );
  const isAttendee = Boolean(
    user && typeof user.role === 'string' && user.role.toLowerCase() === 'attendee'
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        isAttendee,
        apiBaseUrl,
        updateApiBaseUrl,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
