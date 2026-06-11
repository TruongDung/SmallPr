// Shared domain types mirroring the backend API contract.

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type SprintStatus = 'planned' | 'active' | 'completed';

export interface Sprint {
  id: number;
  name: string;
  goal?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: SprintStatus;
  task_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SprintPayload {
  name?: string;
  goal?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: SprintStatus;
}

export interface Task {
  id: number;
  title: string;
  tag?: string | null;
  description?: string | null;
  comment?: string | null;
  priority: TaskPriority;
  status?: TaskStatus | null;
  completed?: boolean;
  archived?: boolean;
  sprint_id?: number | null;
  reminder_at?: string | null;
  attachment_data?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  is_recurring?: boolean;
  recurrence_pattern?: string | null;
  recurrence_interval?: number | null;
  recurrence_days?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Payload sent to POST /api/tasks and PUT /api/tasks/:id. All fields optional
// for PUT — only changed fields should be sent (server uses hasOwnProperty).
export interface TaskPayload {
  title?: string;
  tag?: string;
  description?: string;
  comment?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  completed?: boolean;
  archived?: boolean;
  sprint_id?: number | null;
  reminder_at?: string | null;
  attachment?: AttachmentPayload | null;
  language?: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  recurrence_interval?: number;
  recurrence_days?: string;
}

export interface AttachmentPayload {
  data: string;
  name: string;
  type: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface User {
  id: number;
  username: string;
  name?: string;
  email?: string;
  timezone?: string;
  language?: string;
  impersonator?: unknown;
}

// Shape returned by the http helper: either the parsed JSON or an error wrapper.
export interface ApiError {
  error: string;
}
