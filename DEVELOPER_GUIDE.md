# 👨‍💻 Developer Guide

A comprehensive guide for developers working on the Task Manager application.

## 📚 Table of Contents

- [Code Organization](#code-organization)
- [Backend Development](#backend-development)
- [Frontend Development](#frontend-development)
- [Database Schema](#database-schema)
- [API Conventions](#api-conventions)
- [Common Patterns](#common-patterns)
- [Testing Guidelines](#testing-guidelines)
- [Debugging](#debugging)

## 📂 Code Organization

### Backend Structure

```
src/server/
├── bootstrap/          # Application initialization
│   ├── health.js       # Health check endpoints
│   ├── middleware.js   # Express middleware setup
│   ├── routes.js       # Route registration
│   └── sockets.js      # WebSocket configuration
│
├── cache/             # Caching layer
│   └── redis.js       # Redis client & operations
│
├── config/            # Configuration
│   ├── env.js         # Environment variables
│   └── session.js     # Session configuration
│
├── db/                # Database
│   ├── client.js      # PostgreSQL connection pool
│   ├── initialize.js  # DB initialization
│   ├── migrationRunner.js
│   └── migrations/    # SQL migration files
│
├── middleware/        # Express middleware
│   ├── auth.js        # Authentication checks
│   └── validateRequest.js  # Input validation
│
├── routes/            # API route handlers
│   ├── tasks.routes.js
│   ├── auth.routes.js
│   └── ...
│
├── services/          # Business logic
│   ├── tasks.service.js
│   ├── auth/
│   ├── email/
│   └── ...
│
├── schemas/           # Validation schemas
│   ├── task.schema.js
│   └── ...
│
└── utils/             # Helper functions
    └── ...
```

### Frontend Structure

```
client/src/
├── api/                # API client layer
│   ├── http.ts         # Axios configuration
│   ├── tasksApi.ts     # Task API calls
│   ├── authApi.ts      # Auth API calls
│   └── types.ts        # TypeScript types
│
├── components/         # Reusable UI components
│   ├── Modal.tsx
│   ├── Toast.tsx
│   └── RichTextEditor.tsx
│
├── features/          # Feature-specific code
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── LoginGate.tsx
│   └── tasks/
│       ├── TaskCard.tsx
│       ├── TaskColumn.tsx
│       └── taskHelpers.ts
│
├── hooks/             # Custom React hooks
│   ├── useAuth.ts
│   ├── useTasks.ts
│   ├── useRealtime.ts
│   └── useTags.ts
│
└── store/             # Global state
    ├── theme.tsx
    ├── i18n.tsx
    └── translations.ts
```

## 🔨 Backend Development

### Adding a New API Endpoint

**Step 1: Define the route** (`src/server/routes/example.routes.js`)

```javascript
/**
 * Example resource routes
 * Handles CRUD operations for examples
 */
function registerExampleRoutes(app, { authRequired, runAsync }) {
  // Get all examples
  app.get('/api/examples', authRequired, async (req, res) => {
    try {
      const userId = req.session.userId;
      const examples = await runAsync('SELECT * FROM examples WHERE user_id = $1', [userId]);
      res.json(examples);
    } catch (error) {
      req.log.error({ error }, 'Failed to fetch examples');
      res.status(500).json({ error: 'Failed to fetch examples' });
    }
  });

  // Create new example
  app.post('/api/examples', authRequired, async (req, res) => {
    try {
      const { title, description } = req.body;
      const userId = req.session.userId;

      // Validation
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const result = await runAsync(
        'INSERT INTO examples (title, description, user_id) VALUES ($1, $2, $3) RETURNING *',
        [title, description, userId],
      );

      res.status(201).json(result);
    } catch (error) {
      req.log.error({ error }, 'Failed to create example');
      res.status(500).json({ error: 'Failed to create example' });
    }
  });
}

module.exports = { registerExampleRoutes };
```

**Step 2: Register the route** (`src/server/bootstrap/routes.js`)

```javascript
const { registerExampleRoutes } = require('../routes/example.routes');

function registerRoutes(app, dependencies) {
  // ... existing routes
  registerExampleRoutes(app, dependencies);
}
```

**Step 3: Add validation schema (optional)** (`src/server/schemas/example.schema.js`)

```javascript
const { z } = require('zod');

const createExampleSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

module.exports = { createExampleSchema };
```

**Step 4: Add validation middleware**

```javascript
const { validateRequest } = require('../middleware/validateRequest');
const { createExampleSchema } = require('../schemas/example.schema');

app.post('/api/examples', authRequired, validateRequest(createExampleSchema), async (req, res) => {
  // Handler code
});
```

### Creating a Service

Services encapsulate business logic and database operations.

**Pattern**: Factory function that accepts dependencies

```javascript
/**
 * Example service
 * Handles business logic for examples
 *
 * @param {Object} deps - Dependencies
 * @param {Function} deps.runAsync - Database query function
 * @param {Function} deps.getAsync - Database get function
 * @returns {Object} Service methods
 */
function createExampleService({ runAsync, getAsync }) {
  /**
   * Create a new example with business logic
   */
  async function createExample(userId, data) {
    const { title, description } = data;

    // Business logic here
    const slug = title.toLowerCase().replace(/\s+/g, '-');

    return await runAsync(
      `INSERT INTO examples (title, description, slug, user_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [title, description, slug, userId],
    );
  }

  /**
   * Get example by ID with authorization check
   */
  async function getExampleById(exampleId, userId) {
    const example = await getAsync('SELECT * FROM examples WHERE id = $1 AND user_id = $2', [exampleId, userId]);

    if (!example) {
      throw new Error('Example not found or access denied');
    }

    return example;
  }

  /**
   * Update example with change tracking
   */
  async function updateExample(exampleId, userId, updates) {
    const existing = await getExampleById(exampleId, userId);

    const { title, description } = updates;

    return await runAsync(
      `UPDATE examples 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [title, description, exampleId, userId],
    );
  }

  return {
    createExample,
    getExampleById,
    updateExample,
  };
}

module.exports = { createExampleService };
```

### Database Queries

**Best Practices:**

- Always use parameterized queries ($1, $2, etc.)
- Handle errors appropriately
- Use transactions for multiple related operations

```javascript
// ✅ GOOD: Parameterized query
const user = await getAsync('SELECT * FROM users WHERE email = $1', [email]);

// ❌ BAD: String concatenation (SQL injection risk!)
const user = await getAsync(`SELECT * FROM users WHERE email = '${email}'`);

// Transaction example
async function transferTask(taskId, fromUserId, toUserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check task ownership
    const task = await client.query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [taskId, fromUserId]);

    if (task.rows.length === 0) {
      throw new Error('Task not found');
    }

    // Transfer task
    await client.query('UPDATE tasks SET user_id = $1 WHERE id = $2', [toUserId, taskId]);

    // Log transfer
    await client.query('INSERT INTO audit_logs (action, task_id, from_user, to_user) VALUES ($1, $2, $3, $4)', [
      'transfer',
      taskId,
      fromUserId,
      toUserId,
    ]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Caching with Redis

```javascript
const redisCache = require('./cache/redis');

// Get from cache with fallback to database
async function getTasksWithCache(userId) {
  const cacheKey = `tasks:user:${userId}`;

  // Try cache first
  const cached = await redisCache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Cache miss - query database
  const tasks = await runAsync('SELECT * FROM tasks WHERE user_id = $1', [userId]);

  // Store in cache (TTL: 5 minutes)
  await redisCache.setex(cacheKey, 300, JSON.stringify(tasks));

  return tasks;
}

// Invalidate cache on update
async function updateTask(taskId, data) {
  const task = await runAsync('UPDATE tasks SET title = $1 WHERE id = $2 RETURNING *', [data.title, taskId]);

  // Invalidate cache
  await redisCache.del(`tasks:user:${task.user_id}`);

  return task;
}
```

## ⚛️ Frontend Development

### Adding a New Feature Component

**Step 1: Create the API client** (`client/src/api/examplesApi.ts`)

```typescript
import { apiClient } from './http';

export interface Example {
  id: number;
  title: string;
  description?: string;
  userId: number;
  createdAt: string;
}

export const examplesApi = {
  getAll: async (): Promise<Example[]> => {
    const response = await apiClient.get('/api/examples');
    return response.data;
  },

  create: async (data: { title: string; description?: string }): Promise<Example> => {
    const response = await apiClient.post('/api/examples', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Example>): Promise<Example> => {
    const response = await apiClient.put(`/api/examples/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/examples/${id}`);
  },
};
```

**Step 2: Create a custom hook** (`client/src/hooks/useExamples.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examplesApi, Example } from '../api/examplesApi';

export function useExamples() {
  const queryClient = useQueryClient();

  // Fetch all examples
  const {
    data: examples,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['examples'],
    queryFn: examplesApi.getAll,
  });

  // Create example mutation
  const createMutation = useMutation({
    mutationFn: examplesApi.create,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['examples'] });
    },
  });

  // Update example mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Example> }) => examplesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examples'] });
    },
  });

  // Delete example mutation
  const deleteMutation = useMutation({
    mutationFn: examplesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examples'] });
    },
  });

  return {
    examples: examples || [],
    isLoading,
    error,
    createExample: createMutation.mutate,
    updateExample: updateMutation.mutate,
    deleteExample: deleteMutation.mutate,
  };
}
```

**Step 3: Create the component** (`client/src/features/examples/ExampleList.tsx`)

```typescript
import React, { useState } from 'react';
import { useExamples } from '../../hooks/useExamples';

export function ExampleList() {
  const { examples, isLoading, createExample } = useExamples();
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      createExample({ title });
      setTitle('');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>Examples</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter title"
        />
        <button type="submit">Add Example</button>
      </form>

      <ul>
        {examples.map((example) => (
          <li key={example.id}>{example.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Real-time Updates with WebSocket

```typescript
// client/src/hooks/useRealtime.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socket } from '../api/socket';

export function useRealtimeExamples() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen for example updates
    socket.on('exampleCreated', (example) => {
      queryClient.invalidateQueries({ queryKey: ['examples'] });
    });

    socket.on('exampleUpdated', (example) => {
      queryClient.setQueryData(['examples'], (old: any) => old.map((e: any) => (e.id === example.id ? example : e)));
    });

    socket.on('exampleDeleted', (exampleId) => {
      queryClient.setQueryData(['examples'], (old: any) => old.filter((e: any) => e.id !== exampleId));
    });

    return () => {
      socket.off('exampleCreated');
      socket.off('exampleUpdated');
      socket.off('exampleDeleted');
    };
  }, [queryClient]);
}
```

## 🗄️ Database Schema

### Key Tables

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'todo',
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tags table
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

-- Task-Tag relationship
CREATE TABLE task_tags (
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);
```

### Adding a Migration

Create a new file: `src/server/db/migrations/006_add_examples_table.sql`

```sql
-- Migration: Add examples table
-- Created: 2024-01-15

CREATE TABLE IF NOT EXISTS examples (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_examples_user_id ON examples(user_id);
CREATE INDEX idx_examples_slug ON examples(slug);
```

## 🧪 Testing Guidelines

### Backend Tests (Jest)

```javascript
// src/server/services/example.service.test.js
const { createExampleService } = require('./example.service');

describe('ExampleService', () => {
  let mockRunAsync, mockGetAsync;
  let service;

  beforeEach(() => {
    mockRunAsync = jest.fn();
    mockGetAsync = jest.fn();
    service = createExampleService({
      runAsync: mockRunAsync,
      getAsync: mockGetAsync,
    });
  });

  describe('createExample', () => {
    it('should create example with generated slug', async () => {
      const userId = 1;
      const data = { title: 'Test Example', description: 'Test description' };

      mockRunAsync.mockResolvedValue({
        id: 1,
        ...data,
        slug: 'test-example',
        userId,
      });

      const result = await service.createExample(userId, data);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO examples'),
        expect.arrayContaining(['Test Example', 'Test description', 'test-example', userId]),
      );
      expect(result.slug).toBe('test-example');
    });
  });
});
```

### Frontend Tests (Vitest + React Testing Library)

```typescript
// client/src/features/examples/ExampleList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExampleList } from './ExampleList';
import { examplesApi } from '../../api/examplesApi';

jest.mock('../../api/examplesApi');

describe('ExampleList', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = ({ children }: any) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should render examples', async () => {
    (examplesApi.getAll as jest.Mock).mockResolvedValue([
      { id: 1, title: 'Example 1' },
      { id: 2, title: 'Example 2' },
    ]);

    render(<ExampleList />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Example 1')).toBeInTheDocument();
      expect(screen.getByText('Example 2')).toBeInTheDocument();
    });
  });

  it('should create new example', async () => {
    (examplesApi.getAll as jest.Mock).mockResolvedValue([]);
    (examplesApi.create as jest.Mock).mockResolvedValue({
      id: 1,
      title: 'New Example',
    });

    const user = userEvent.setup();
    render(<ExampleList />, { wrapper });

    const input = screen.getByPlaceholderText('Enter title');
    const button = screen.getByText('Add Example');

    await user.type(input, 'New Example');
    await user.click(button);

    expect(examplesApi.create).toHaveBeenCalledWith({ title: 'New Example' });
  });
});
```

## 🐛 Debugging

### Backend Debugging

**View formatted logs:**

```bash
npm start | npx pino-pretty
```

**Debug specific routes:**

```javascript
app.get('/api/examples', authRequired, async (req, res) => {
  req.log.debug({ userId: req.session.userId }, 'Fetching examples');
  // ... rest of handler
});
```

**VS Code launch configuration:**

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Server",
  "program": "${workspaceFolder}/server.js",
  "envFile": "${workspaceFolder}/.env"
}
```

### Frontend Debugging

**React DevTools:**

- Install browser extension
- Inspect component tree
- View props and state

**TanStack Query DevTools:**

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

**Network debugging:**

```typescript
// Add request/response interceptors
apiClient.interceptors.request.use((request) => {
  console.log('Request:', request);
  return request;
});

apiClient.interceptors.response.use((response) => {
  console.log('Response:', response);
  return response;
});
```

## 📋 Checklist for New Features

- [ ] Create database migration if needed
- [ ] Add route handler with proper error handling
- [ ] Create or update service with business logic
- [ ] Add input validation schema
- [ ] Add authentication/authorization checks
- [ ] Implement caching if appropriate
- [ ] Add WebSocket events for real-time updates
- [ ] Create TypeScript types
- [ ] Create API client function
- [ ] Create custom React hook
- [ ] Build UI components
- [ ] Write backend tests
- [ ] Write frontend tests
- [ ] Update API documentation
- [ ] Test manually in browser
- [ ] Check error scenarios

## 🎯 Best Practices

1. **Always validate user input** - Use Zod schemas
2. **Log important operations** - Use structured logging
3. **Handle errors gracefully** - Return appropriate HTTP status codes
4. **Use TypeScript** - Leverage type safety in frontend
5. **Keep components small** - Single responsibility principle
6. **Reuse code** - Create utilities and custom hooks
7. **Write tests** - Aim for good coverage
8. **Document complex logic** - Add comments for clarity
9. **Follow existing patterns** - Consistency is key
10. **Review before committing** - Self-review your changes

---

Happy coding! 🚀
