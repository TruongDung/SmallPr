import { request } from './http';
import type { Task, TaskPayload } from './types';

export const listTasks = (archived = false) =>
  request<{ tasks: Task[] }>(`/api/tasks${archived ? '?archived=true' : ''}`).then((r) => r.tasks);

export const createTask = (payload: TaskPayload) =>
  request<{ task: Task; emailSent?: boolean }>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// PUT is partial: send only the fields that changed (server uses hasOwnProperty).
export const updateTask = (id: number, payload: TaskPayload) =>
  request<{ task: Task }>(`/api/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }).then((r) => r.task);

export const deleteTask = (id: number) => request<{ success: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' });

export const sendTaskEmail = (id: number, language?: string) =>
  request<{ success?: boolean }>(`/api/tasks/${id}/send-email`, {
    method: 'POST',
    body: JSON.stringify({ language }),
  });

export const sendSummaryEmail = (language?: string) =>
  request<{ success?: boolean }>('/api/tasks/send-email', {
    method: 'POST',
    body: JSON.stringify({ language }),
  });
