import {
  AuthResponse,
  User,
  EventItem,
  EventStatus,
  Attendee,
  DashboardStats,
  Registration,
  EventFormData,
} from '../types';

export const API_BASE_URL = "https://event-managemnt-system-ochre.vercel.app";
export const DEFAULT_API_BASE_URL = API_BASE_URL;

const STORAGE_KEY_TOKEN = 'access_token';

// Wipe any stale base URL keys from browser localStorage immediately
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('events_api_base_url');
  } catch {
    // Ignore storage errors in sandboxed iframes
  }
}

export class ApiError extends Error {
  status: number;
  detail: string;
  fieldErrors?: Record<string, string>;

  constructor(status: number, detail: string, fieldErrors?: Record<string, string>) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
  }
}

export function getStoredApiBaseUrl(): string {
  return API_BASE_URL;
}

export function setStoredApiBaseUrl(url: string): void {
  // Always maintain API_BASE_URL
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY_TOKEN);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
  } else {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  }
}

// Global callback for 401 unauthenticated redirect
let onUnauthorizedCallback: (() => void) | null = null;

export function setOnUnauthorizedCallback(cb: () => void) {
  onUnauthorizedCallback = cb;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  isProtected = false
): Promise<T> {
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanPath}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Network connection failed';

    // Perform an immediate lightweight ping to GET / to verify backend reachability
    let diagnostic = '';
    try {
      const pingCtrl = new AbortController();
      const pingTimer = setTimeout(() => pingCtrl.abort(), 2500);
      const pingRes = await fetch(`${API_BASE_URL}/`, {
        method: 'GET',
        signal: pingCtrl.signal,
      });
      clearTimeout(pingTimer);
      if (pingRes.ok) {
        const pingJson = await pingRes.json().catch(() => null);
        const serverMsg = pingJson?.message || 'Server is running';
        diagnostic = `Backend at ${API_BASE_URL} is online (${serverMsg}), but "${cleanPath}" request failed. The endpoint returned an Internal Server Error (HTTP 500) from Vercel without CORS headers. Please check the backend database connection and server logs on Vercel.`;
      }
    } catch {
      diagnostic = `Unable to establish connection to FastAPI backend at ${API_BASE_URL}. (${rawMsg})`;
    }

    throw new ApiError(0, diagnostic || `Network error connecting to ${API_BASE_URL}${cleanPath}: ${rawMsg}`);
  }

  // Handle 401
  if (response.status === 401) {
    setStoredToken(null);
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
    throw new ApiError(401, 'Session expired or unauthorized. Please sign in again.');
  }

  // Handle 403
  if (response.status === 403) {
    throw new ApiError(403, "You don't have permission to perform this action.");
  }

  // Parse response
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  let data: any = null;
  if (isJson) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    const fieldErrors: Record<string, string> = {};

    if (data && typeof data === 'object') {
      if (typeof data.detail === 'string') {
        errorMessage = data.detail;
      } else if (Array.isArray(data.detail)) {
        // FastAPI validation errors: [{ loc: ['body', 'field'], msg: 'error' }]
        const messages = data.detail.map((item: any) => {
          const loc = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : 'field';
          const msg = item.msg || 'Invalid value';
          if (loc) {
            fieldErrors[String(loc)] = msg;
          }
          return `${loc}: ${msg}`;
        });
        errorMessage = messages.join('; ') || 'Validation error';
      } else if (data.message) {
        errorMessage = String(data.message);
      }
    }

    throw new ApiError(response.status, errorMessage, fieldErrors);
  }

  return data as T;
}

export const api = {
  // --- Auth endpoints ---
  register: async (payload: {
    name: string;
    email: string;
    password: string;
    admin_code?: string;
  }): Promise<AuthResponse> => {
    // Only send admin_code if provided non-empty
    const body: Record<string, any> = {
      name: payload.name.trim(),
      email: payload.email.trim(),
      password: payload.password,
    };
    if (payload.admin_code && payload.admin_code.trim()) {
      body.admin_code = payload.admin_code.trim();
    }
    const res = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (res.access_token) {
      setStoredToken(res.access_token);
    }
    return res;
  },

  login: async (payload: { email: string; password: string }): Promise<AuthResponse> => {
    const res = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email.trim(),
        password: payload.password,
      }),
    });
    if (res.access_token) {
      setStoredToken(res.access_token);
    }
    return res;
  },

  getMe: async (): Promise<User> => {
    return request<User>('/auth/me', { method: 'GET' }, true);
  },

  // --- Events (public / attendee) ---
  getEvents: async (): Promise<EventItem[]> => {
    return request<EventItem[]>('/events', { method: 'GET' });
  },

  getEventById: async (eventId: number | string): Promise<EventItem> => {
    return request<EventItem>(`/events/${eventId}`, { method: 'GET' });
  },

  // --- Registrations (attendee) ---
  registerForEvent: async (eventId: number | string): Promise<Registration> => {
    return request<Registration>(`/events/${eventId}/register`, {
      method: 'POST',
      body: JSON.stringify({}),
    }, true);
  },

  getMyRegistrations: async (): Promise<Registration[]> => {
    return request<Registration[]>('/me/registrations', { method: 'GET' }, true);
  },

  cancelRegistration: async (registrationId: number | string): Promise<void> => {
    return request<void>(`/registrations/${registrationId}`, {
      method: 'DELETE',
    }, true);
  },

  // --- Admin Events ---
  getAdminEvents: async (): Promise<EventItem[]> => {
    return request<EventItem[]>('/admin/events', { method: 'GET' }, true);
  },

  createAdminEvent: async (formData: EventFormData): Promise<EventItem> => {
    return request<EventItem>('/admin/events', {
      method: 'POST',
      body: JSON.stringify({
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: formData.date,
        time: formData.time,
        location: formData.location.trim(),
        capacity: Number(formData.capacity),
      }),
    }, true);
  },

  updateAdminEvent: async (
    eventId: number | string,
    formData: Partial<EventFormData>
  ): Promise<EventItem> => {
    const body: Record<string, any> = {};
    if (formData.title !== undefined) body.title = formData.title.trim();
    if (formData.description !== undefined) body.description = formData.description.trim();
    if (formData.date !== undefined) body.date = formData.date;
    if (formData.time !== undefined) body.time = formData.time;
    if (formData.location !== undefined) body.location = formData.location.trim();
    if (formData.capacity !== undefined) body.capacity = Number(formData.capacity);

    return request<EventItem>(`/admin/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }, true);
  },

  updateEventStatus: async (
    eventId: number | string,
    status: EventStatus
  ): Promise<EventItem> => {
    return request<EventItem>(`/admin/events/${eventId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, true);
  },

  getAdminEventAttendees: async (eventId: number | string): Promise<Attendee[]> => {
    return request<Attendee[]>(`/admin/events/${eventId}/attendees`, {
      method: 'GET',
    }, true);
  },

  getAdminDashboard: async (): Promise<DashboardStats> => {
    return request<DashboardStats>('/admin/dashboard', {
      method: 'GET',
    }, true);
  },

  // Quick health check helper to verify backend connectivity
  checkHealth: async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${API_BASE_URL}/`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.status < 500;
    } catch {
      return false;
    }
  },
};
