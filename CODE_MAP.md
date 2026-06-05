# 🗺️ Code Map - Where to Find Everything

A quick reference guide to navigate the codebase.

## 📍 Quick Navigation

| I want to... | Look here |
|--------------|-----------|
| Add a new API endpoint | `src/server/routes/` |
| Add business logic | `src/server/services/` |
| Add validation | `src/server/schemas/` |
| Add middleware | `src/server/middleware/` |
| Add database migration | `src/server/db/migrations/` |
| Add frontend component | `client/src/components/` or `client/src/features/` |
| Add API call | `client/src/api/` |
| Add custom hook | `client/src/hooks/` |
| Configure the app | `.env` file |
| Check app initialization | `app.js` |
| Check server startup | `server.js` |

---

## 🏗️ Architecture Visualization

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            React Application (Port 5173)              │   │
│  │                                                        │   │
│  │  Components → Hooks → API Client → HTTP/WebSocket    │   │
│  └────────────────────────┬───────────────────────────────┘ │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    HTTP / WebSocket
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                            ▼                                  │
│                  SERVER (Port 3000)                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Express.js App                        │   │
│  │                                                        │   │
│  │  Routes → Middleware → Services → Database            │   │
│  │     │                      │                           │   │
│  │     └──────────────┐       └──> Redis Cache           │   │
│  │                    │                                   │   │
│  │                    └──> Socket.IO (Real-time)         │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
                             │
                   ┌─────────┴─────────┐
                   ▼                   ▼
            ┌──────────┐        ┌──────────┐
            │PostgreSQL│        │  Redis   │
            │ Database │        │  Cache   │
            └──────────┘        └──────────┘
```

---

## 📂 Detailed File Structure

### Backend (`src/server/`)

```
src/server/
│
├── 🚀 bootstrap/                  # Application initialization
│   ├── health.js                  # Health check endpoints (/health, /health/ready)
│   ├── middleware.js              # Express middleware setup (CORS, body-parser, etc.)
│   ├── routes.js                  # Central route registration
│   └── sockets.js                 # Socket.IO configuration and real-time setup
│
├── 💾 cache/                      # Caching layer
│   └── redis.js                   # Redis client, connection, and cache operations
│
├── ⚙️ config/                     # Configuration
│   ├── env.js                     # Environment variable validation
│   └── session.js                 # Express-session configuration (Redis store)
│
├── 📊 constants/                  # Business constants
│   ├── creditCards.js             # Credit card related constants
│   ├── tasks.js                   # Task status, priority constants
│   └── transactions.js            # Transaction type constants
│
├── 🗄️ db/                         # Database
│   ├── client.js                  # PostgreSQL connection pool & query wrappers
│   ├── initialize.js              # Database initialization & migration runner
│   ├── migrationRunner.js         # Migration execution logic
│   └── migrations/                # SQL migration files (numbered)
│       ├── 001_initial.sql
│       ├── 002_add_tags.sql
│       └── ...
│
├── 🛡️ middleware/                 # Express middleware
│   ├── auth.js                    # Authentication (authRequired, adminRequired)
│   └── validateRequest.js         # Zod schema validation middleware
│
├── 🌐 routes/                     # API route handlers
│   ├── admin.routes.js            # Admin endpoints (/api/admin/*)
│   ├── auth.routes.js             # Auth endpoints (/api/auth/login, /logout)
│   ├── creditCards.routes.js      # Credit card endpoints
│   ├── dailyQuote.routes.js       # Daily quote feature
│   ├── dashboard.routes.js        # Dashboard data
│   ├── notes.routes.js            # Notes CRUD
│   ├── tasks.routes.js            # Task CRUD (/api/tasks/*)
│   ├── transactions.routes.js     # Transaction management
│   └── weather.routes.js          # Weather integration
│
├── 📋 schemas/                    # Validation schemas
│   ├── task.schema.js             # Task validation (Zod)
│   └── transaction.schema.js      # Transaction validation (Zod)
│
├── 🔧 services/                   # Business logic
│   ├── auth/                      # Authentication services
│   │   └── auth.service.js        # User authentication, password verification
│   ├── email/                     # Email services
│   │   └── email.service.js       # Email sending (nodemailer)
│   ├── auditLog.service.js        # Audit logging
│   ├── creditCards.service.js     # Credit card business logic
│   ├── dailyQuote.service.js      # Daily quote fetching
│   ├── dashboard.service.js       # Dashboard data aggregation
│   ├── recurrence.service.js      # Recurring task logic
│   ├── statementImport.service.js # Bank statement import
│   ├── tasks.service.js           # Task business logic
│   └── transactions.service.js    # Transaction business logic
│
├── 🛠️ utils/                      # Utility functions
│   ├── creditCards.js             # Credit card utilities
│   ├── tasks.js                   # Task helper functions
│   ├── timeout.js                 # Timeout utilities
│   └── users.js                   # User helper functions
│
├── 📝 logger.js                   # Pino logger configuration
└── 📡 realtime.js                 # Real-time event handlers
```

### Frontend (`client/src/`)

```
client/src/
│
├── 🌐 api/                        # API client layer
│   ├── http.ts                    # Axios configuration & interceptors
│   ├── authApi.ts                 # Auth API calls (login, logout)
│   ├── tasksApi.ts                # Task API calls (CRUD operations)
│   ├── tagsApi.ts                 # Tag API calls
│   └── types.ts                   # TypeScript type definitions (Task, User, etc.)
│
├── 🧩 components/                 # Reusable UI components
│   ├── Modal.tsx                  # Modal dialog component
│   ├── Toast.tsx                  # Toast notification component
│   └── RichTextEditor.tsx         # Rich text editor for task descriptions
│
├── ✨ features/                   # Feature-specific components
│   ├── auth/
│   │   ├── LoginForm.tsx          # Login form component
│   │   └── LoginGate.tsx          # Auth guard wrapper
│   └── tasks/
│       ├── TaskCard.tsx           # Individual task card (draggable)
│       ├── TaskColumn.tsx         # Task column (todo, in-progress, done)
│       ├── taskHelpers.ts         # Task utility functions
│       ├── richText.ts            # Rich text processing utilities
│       └── attachments.ts         # File attachment handling
│
├── 🪝 hooks/                      # Custom React hooks
│   ├── useAuth.ts                 # Auth state & operations (login, logout)
│   ├── useTasks.ts                # Task CRUD operations (useQuery, useMutation)
│   ├── useRealtime.ts             # WebSocket connection management
│   └── useTags.ts                 # Tag management
│
└── 🏪 store/                      # Global state
    ├── theme.tsx                  # Theme context (dark/light mode)
    ├── i18n.tsx                   # Internationalization context
    └── translations.ts            # Translation strings
```

### iOS App (`ios/`)

```
ios/TaskManager/TaskManager/
├── TaskManagerApp.swift          # Main app entry point
├── ContentView.swift              # Main view
├── WebView.swift                  # WKWebView wrapper
├── AppConfig.swift                # Configuration (server URL)
└── Assets.xcassets/               # App icons and assets
```

### Root Files

```
.
├── 📄 app.js                      # Express app initialization
├── 📄 server.js                   # Server startup (listens on port)
├── 📄 package.json                # Backend dependencies & scripts
├── 📄 .env                        # Environment variables (DO NOT COMMIT!)
├── 📄 .gitignore                  # Git ignore rules
│
├── 📚 README.md                   # Project overview & setup
├── 📚 ARCHITECTURE.md             # Detailed architecture documentation
├── 📚 DEVELOPER_GUIDE.md          # Development guidelines & examples
├── 📚 QUICK_START.md              # Fast setup guide
├── 📚 CODE_MAP.md                 # This file!
│
└── 🔧 .github/workflows/          # CI/CD pipelines
    ├── node.js.yml                # Node.js CI (tests, build)
    └── ios-build.yml              # iOS build workflow
```

---

## 🔄 Request Flow Examples

### Example 1: Creating a Task

```
1. User fills form in TaskCard.tsx
2. Form submit calls useTasks hook
3. useTasks.createTask() calls tasksApi.create()
4. HTTP POST → /api/tasks
5. Express routes to tasks.routes.js
6. Middleware validates request (validateRequest)
7. Middleware checks auth (authRequired)
8. Handler calls tasks.service.js
9. Service validates business rules
10. Service calls database (runAsync)
11. PostgreSQL inserts task
12. Redis cache invalidated
13. Socket.IO emits 'taskCreated' event
14. All connected clients receive update
15. React Query refetches data
16. UI updates automatically
```

### Example 2: User Login

```
1. User submits LoginForm.tsx
2. useAuth.login() calls authApi.login()
3. HTTP POST → /api/auth/login
4. auth.routes.js receives request
5. auth.service.js validates credentials
6. bcrypt compares password hash
7. Session created in Redis
8. Cookie sent to browser
9. User data returned
10. Frontend stores user state
11. LoginGate allows access
```

### Example 3: Real-time Task Update

```
1. User A updates task
2. PUT /api/tasks/:id
3. Database updated
4. io.emit('taskUpdated', task)
5. Socket.IO broadcasts to all clients
6. User B's browser receives event
7. useRealtime hook catches event
8. React Query cache updated
9. User B sees change instantly
```

---

## 🎯 Common Tasks

### Adding a New API Endpoint

1. **Create route handler** in `src/server/routes/yourFeature.routes.js`
2. **Register route** in `src/server/bootstrap/routes.js`
3. **Add validation schema** in `src/server/schemas/yourFeature.schema.js` (optional)
4. **Create service** in `src/server/services/yourFeature.service.js` (if needed)
5. **Add TypeScript types** in `client/src/api/types.ts`
6. **Create API client** in `client/src/api/yourFeatureApi.ts`
7. **Create hook** in `client/src/hooks/useYourFeature.ts`
8. **Build UI** in `client/src/features/yourFeature/`

### Adding a Database Table

1. **Create migration** in `src/server/db/migrations/XXX_add_table.sql`
2. **Restart server** (migrations run automatically)
3. **Update services** to use new table
4. **Add TypeScript types** for new data

### Adding Real-time Feature

1. **Emit event** in route handler: `io.emit('eventName', data)`
2. **Listen in frontend** in `useRealtime.ts`: `socket.on('eventName', handler)`
3. **Update React Query cache** in handler

---

## 🔍 Finding Specific Code

### Authentication Code
- Backend: `src/server/services/auth/`, `src/server/middleware/auth.js`
- Frontend: `client/src/features/auth/`, `client/src/hooks/useAuth.ts`

### Task Management
- Backend: `src/server/routes/tasks.routes.js`, `src/server/services/tasks.service.js`
- Frontend: `client/src/features/tasks/`, `client/src/hooks/useTasks.ts`

### Database Queries
- Connection: `src/server/db/client.js`
- Migrations: `src/server/db/migrations/`
- Initialization: `src/server/db/initialize.js`

### Real-time Features
- Backend: `src/server/bootstrap/sockets.js`, `src/server/realtime.js`
- Frontend: `client/src/hooks/useRealtime.ts`

### Validation
- Schemas: `src/server/schemas/`
- Middleware: `src/server/middleware/validateRequest.js`

### Email
- Service: `src/server/services/email/email.service.js`
- Configuration: Check `.env` for SMTP settings

---

## 💡 Tips for Navigation

1. **Use your editor's "Go to Definition"** - Most IDEs can jump to imports
2. **Search by feature name** - Consistent naming makes this easy
3. **Follow the imports** - Start from `app.js` or a component and trace imports
4. **Check `package.json`** - See what libraries are used
5. **Read the logs** - Pino logs show which routes are hit

---

## 📚 Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design and patterns
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Code examples and best practices
- [README.md](./README.md) - Project overview and setup
- [QUICK_START.md](./QUICK_START.md) - Fast setup guide

---

**Happy exploring! 🗺️**
