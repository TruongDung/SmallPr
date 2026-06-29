import { request } from './http';
import type { User } from './types';

export interface UpdateProfilePayload {
  name?: string | null;
  email?: string | null;
  timezone?: string | null;
  language?: string | null;
}

// /me returns { user: null } with a 200 when logged out, so it never throws.
export const getMe = () => request<{ user: User | null }>('/api/me').then((r) => r.user);

export const login = (username: string, password: string) =>
  request<{ user: User }>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }).then((r) => r.user);

export const logout = () => request<{ success: boolean }>('/api/logout', { method: 'POST' });

export const updateMe = (payload: UpdateProfilePayload) =>
  request<{ user: User }>('/api/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  }).then((r) => r.user);
