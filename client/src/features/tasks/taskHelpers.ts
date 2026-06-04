// Pure task helpers ported from public/js/tasks.js. Functions that need
// translation take a `t` argument rather than closing over a module-level one.
import type { Task, TaskPriority, TaskStatus } from '../../api/types';
import type { TranslateFn } from '../../store/i18n';
import { getRichTextPlainText } from './richText';

export const priorityRank = (priority: TaskPriority | string = 'medium'): number =>
  (({ high: 0, medium: 1, low: 2 } as Record<string, number>)[priority] ?? 3);

export const sortTasksByPriority = (taskList: Task[] = []): Task[] =>
  [...taskList].sort((first, second) => priorityRank(first.priority) - priorityRank(second.priority));

export const taskStatus = (task: Task): TaskStatus =>
  (task.status as TaskStatus) || (task.completed ? 'done' : 'todo');

export const priorityLabel = (t: TranslateFn, priority: string = 'medium') =>
  t(priority || 'medium');

export const statusLabel = (t: TranslateFn, status: string = 'todo') => t(status || 'todo');

export const taskMatchesSearch = (task: Task, query: string): boolean => {
  if (!query) return true;
  const normalizedQuery = query.toLowerCase();
  return [
    task.title,
    getRichTextPlainText(task.description || ''),
    getRichTextPlainText(task.comment || ''),
  ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
};

export const formatLocalDateTime = (dateString?: string | null): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

// datetime-local input expects "YYYY-MM-DDTHH:mm".
export const formatDateTimeLocalValue = (dateString?: string | null): string => {
  if (!dateString) return '';
  return dateString.slice(0, 16);
};

export const isPdfAttachment = (task: Task): boolean => {
  const type = String(task?.attachment_type || '').toLowerCase();
  const name = String(task?.attachment_name || '').toLowerCase();
  return type === 'application/pdf' || name.endsWith('.pdf');
};

export const isImageAttachment = (task: Task): boolean => {
  const type = String(task?.attachment_type || '').toLowerCase();
  const name = String(task?.attachment_name || '').toLowerCase();
  return type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name);
};
