import { request } from './http';
import type { Sprint, SprintPayload } from './types';

export const listSprints = () => request<{ sprints: Sprint[] }>('/api/sprints').then((r) => r.sprints);

export const createSprint = (payload: SprintPayload) =>
  request<{ sprint: Sprint }>('/api/sprints', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((r) => r.sprint);

export const updateSprint = (id: number, payload: SprintPayload) =>
  request<{ sprint: Sprint }>(`/api/sprints/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }).then((r) => r.sprint);

export const deleteSprint = (id: number) => request<{ success: boolean }>(`/api/sprints/${id}`, { method: 'DELETE' });
