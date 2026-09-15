export type UserRole = 'admin' | 'attendee' | string;

export interface User {
  id: number | string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type EventStatus = 'draft' | 'published' | 'completed' | 'cancelled';

export interface EventItem {
  id: number | string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location: string;
  capacity: number;
  status: EventStatus;
  registered_count: number;
  available_spots: number;
  created_at?: string;
}

export interface Registration {
  id?: number | string;
  registration_id?: number | string;
  user_id?: number | string;
  event_id?: number | string;
  status: 'active' | 'cancelled' | string;
  registered_at?: string;
  created_at?: string;
  event: EventItem;
}

export interface Attendee {
  registration_id: number | string;
  user_id: number | string;
  name: string;
  email: string;
  status: 'active' | 'cancelled' | string;
  registered_at: string;
}

export interface DashboardStats {
  total_events: number;
  published_events: number;
  draft_events?: number;
  completed_events?: number;
  cancelled_events?: number;
  total_registrations: number;
  active_registrations?: number;
  total_capacity?: number;
  total_available?: number;
}

export function normalizeStatus(status?: string): 'draft' | 'published' | 'completed' | 'cancelled' {
  if (!status) return 'draft';
  const s = String(status).toLowerCase();
  if (s === 'published') return 'published';
  if (s === 'completed') return 'completed';
  if (s === 'cancelled') return 'cancelled';
  return 'draft';
}

export interface EventFormData {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  capacity: number | string;
}

export type ActiveTab = 'events' | 'registrations' | 'dashboard' | 'admin-events' | 'auth';
