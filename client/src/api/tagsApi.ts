import { request } from './http';
import type { Tag } from './types';

export const listTags = () =>
  request<{ tags: Tag[] }>('/api/tags').then((r) => r.tags);

export const createTag = (name: string) =>
  request<{ tag: Tag }>('/api/tags', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }).then((r) => r.tag);

export const updateTag = (id: number, name: string) =>
  request<{ tag: Tag }>(`/api/tags/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  }).then((r) => r.tag);

export const deleteTag = (id: number) =>
  request<{ success: boolean }>(`/api/tags/${id}`, { method: 'DELETE' });
