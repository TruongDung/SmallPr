import { request } from './http';
import type { UserSettings } from './types';

export const getSettings = () => request<{ settings: UserSettings }>('/api/settings').then((r) => r.settings);

export const updateSettings = (payload: UserSettings) =>
  request<{ settings: UserSettings }>('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  }).then((r) => r.settings);
