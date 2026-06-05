# Task Manager - Architecture Documentation

## 📋 Table of Contents
- [Overview](#overview)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Architecture Patterns](#architecture-patterns)
- [Data Flow](#data-flow)
- [Getting Started](#getting-started)

## 🎯 Overview

This is a full-stack task management application with real-time updates, user authentication, and multi-platform support (web + iOS).

### Key Features
- ✅ User authentication with session management
- ✅ Real-time task updates via WebSockets
- ✅ Rich text editing for task descriptions
- ✅ Drag & drop task organization
- ✅ Admin dashboard with audit logs
- ✅ Redis caching for performance
- ✅ PostgreSQL database
- ✅ Native iOS wrapper app

## 📁 Project Structure

```
SmallPr/
├── src/server/              # Backend (Node.js/Express)
│   ├── bootstrap/           # App initialization & setup
│   ├── cache/               # Redis caching layer
│   ├── config/              # Configuration (session, env)
│   ├── constants/           # Business constants
│   ├── db/                  # Database client & migrations
│   ├── middleware/          # Express middleware (auth, validation)
│   ├── routes/              # API route handlers
│   ├── schemas/             # Validation schemas (Zod)
│   ├── services/            # Business logic layer
│   └── utils/               # Helper functions
│
├── client/                  # Frontend (React + TypeScript)
│   └── src/
│       ├── api/             # API client & type definitions
│       ├── components/      # Reusable UI components
│       ├── features/        # Feature-specific components
│       │   ├── auth/        # Login & authentication
│       │   └── tasks/       # Task management
│       ├── hooks/           # Custom React hooks
│       └── store/           # Global state (theme, i18n)
│
├── ios/                     # iOS native app wrapper
│   └── TaskManager/         # Xcode project
│
├── public/                  # Static assets
├── scripts/                 # Utility scripts
└── .github/workflows/       # CI/CD pipelines
```

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Cache**: Redis
- **Real-time**: Socket.IO
- **Authentication**: express-session + bcrypt
- **Validation**: Zod
- **Logging**: Pino

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Drag & Drop**: @dnd-kit
- **Real-time**: Socket.IO client

### Mobile
- **Platform**: iOS (Swift + SwiftUI)
- **Type**: WebView wrapper

## 🏗 Architecture Patterns

### Backend Architecture

#### Layered Architecture
```
Request → Middleware → Routes → Services → Database
                ↓
            Response
```

#### Key Layers

1. **Bootstrap Layer** (`src/server/bootstrap/`)
   - Initializes the application
   - Sets up middleware pipeline
   - Configures Socket.IO
   - Registers routes
   - *Purpose*: Separation of concerns for app initialization

2. **Routes Layer** (`src/server/routes/`)
   - HTTP endpoint definitions
   - Request/response handling
   - Input validation
   - *Pattern*: One file per resource (tasks, auth, admin, etc.)

3. **Services Layer** (`src/server/services/`)
   - Business logic implementation
   - Database operations
   - External integrations (email, etc.)
   - *Pattern*: Factory functions returning service objects

4. **Middleware Layer** (`src/server/middleware/`)
   - Authentication checks
   - Request validation
   - Error handling
   - *Pattern*: Reusable Express middleware functions

5. **Database Layer** (`src/server/db/`)
   - Connection pooling
   - Query execution
   - Migrations
   - *Pattern*: Centralized database client

### Frontend Architecture

#### Component-Based Architecture
```
App
├── LoginGate (auth guard)
├── Features
│   ├── Auth (LoginForm)
│   └── Tasks (TaskBoard)
│       ├── TaskColumn
│       └── TaskCard
└── Shared Components (Modal, Toast)
```

#### Key Patterns

1. **Custom Hooks** (`src/hooks/`)
   - `useAuth`: Authentication state & operations
   - `useTasks`: Task CRUD operations
   - `useRealtime`: WebSocket connection management
   - `useTags`: Tag management
   - *Purpose*: Encapsulate logic, promote reusability

2. **API Layer** (`src/api/`)
   - HTTP client configuration
   - Type-safe API calls
   - Error handling
   - *Pattern*: Centralized API client with TypeScript types

3. **Feature Folders** (`src/features/`)
   - Feature-specific components
   - Feature-specific utilities
   - *Pattern*: Colocation of related code

## 🔄 Data Flow

### Authentication Flow
```
1. User submits credentials → POST /api/auth/login
2. Backend validates → bcrypt.compare(password, hash)
3. Session created → express-session stores in Redis
4. Cookie sent to client → httpOnly, secure in production
5. Subsequent requests → Session cookie validates user
```

### Real-time Task Updates
```
1. User updates task → PUT /api/tasks/:id
2. Database updated → PostgreSQL
3. Cache invalidated → Redis
4. Socket event emitted → io.emit('taskUpdate', task)
5. All connected clients receive update → UI refreshes
```

### Caching Strategy
```
1. Request → Check Redis cache
2. Cache hit? → Return cached data
3. Cache miss? → Query database
4. Store in cache → TTL-based expiration
5. Invalidate on mutations → DELETE, PUT, POST operations
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 16+
- Redis 6+
- (Optional) Xcode for iOS builds

### Environment Setup

Create `.env` file:
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/taskmanager

# Session
SESSION_SECRET=your-secret-key-here
NODE_ENV=development

# Redis
REDIS_URL=redis://localhost:6379

# Admin
DEFAULT_ADMIN_PASSWORD=admin123
```

### Installation

```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### Running the Application

```bash
# Terminal 1: Start PostgreSQL and Redis
# (Use Docker or local installation)

# Terminal 2: Start backend server
npm run dev

# Terminal 3: Start frontend dev server
cd client
npm run dev
```

### Database Migrations

The application automatically runs migrations on startup. Migration files are in `src/server/db/migrations/`.

### Testing

```bash
# Backend tests
npm test

# Frontend tests
cd client
npm test
```

## 🔐 Security Considerations

1. **Password Security**: bcrypt hashing with salt rounds
2. **Session Security**: HttpOnly cookies, secure flag in production
3. **SQL Injection**: Parameterized queries via pg library
4. **XSS Protection**: React's built-in escaping
5. **CSRF**: Session-based authentication with SameSite cookies
6. **Input Validation**: Zod schemas on all inputs

## 📊 Performance Optimizations

1. **Redis Caching**: Frequently accessed data cached
2. **Connection Pooling**: PostgreSQL connection pool
3. **Lazy Loading**: Code splitting in frontend
4. **Real-time Updates**: WebSocket instead of polling
5. **Database Indexing**: Indexes on frequently queried columns

## 🐛 Debugging

### Backend Logs
```bash
# View logs in JSON format (Pino)
npm start | npx pino-pretty
```

### Frontend
- React DevTools browser extension
- TanStack Query DevTools (built-in)
- Browser console for WebSocket messages

## 📱 iOS App

The iOS app is a native Swift wrapper that loads the web app in a WKWebView.

### Configuration
- URL configured in `ios/TaskManager/TaskManager/AppConfig.swift`
- For local testing: Use Mac's local IP (same Wi-Fi)
- For production: Use HTTPS deployment URL

### Building
- **Mac**: Open in Xcode and build
- **CI/CD**: GitHub Actions workflow (`.github/workflows/ios-build.yml`)

## 🤝 Contributing

When adding new features:
1. Add route in `src/server/routes/`
2. Implement service in `src/server/services/`
3. Add validation schema in `src/server/schemas/`
4. Create frontend API client in `client/src/api/`
5. Build UI components in `client/src/features/`
6. Update this documentation

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Socket.IO Documentation](https://socket.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/docs/)
