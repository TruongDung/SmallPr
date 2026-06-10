# 📚 Documentation Index

Your complete guide to the Task Manager application documentation.

## 🎯 Start Here

New to the project? Follow this path:

1. **[docs/ONBOARDING.md](./docs/ONBOARDING.md)** - Day 1: the two frontends, request lifecycle, module patterns
2. **[QUICK_START.md](./QUICK_START.md)** - Get running in 10 minutes
3. **[README.md](./README.md)** - Project overview and features
4. **[CODE_MAP.md](./CODE_MAP.md)** - Navigate the codebase
5. **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Start building features
6. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Deep dive into system design

Also: **[CLAUDE.md](./CLAUDE.md)** — conventions and commands at a glance (written for AI assistants, equally useful for humans).

---

## 📖 Documentation Overview

### For Getting Started

| Document | Purpose | Time to Read |
|----------|---------|--------------|
| [README.md](./README.md) | High-level overview, features list, tech stack | 5 min |
| [QUICK_START.md](./QUICK_START.md) | Step-by-step setup instructions | 10 min |
| [CODE_MAP.md](./CODE_MAP.md) | Visual code organization guide | 10 min |

### For Development

| Document | Purpose | Time to Read |
|----------|---------|--------------|
| [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | Code patterns, examples, best practices | 30 min |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture and design decisions | 20 min |
| [iOS README](./ios/TaskManager/README.md) | iOS app build instructions | 5 min |

### For Operations

| Document | Purpose | Time to Read |
|----------|---------|--------------|
| [README.md](./README.md#deployment) | Deployment instructions | 5 min |
| [README.md](./README.md#troubleshooting) | Common issues and solutions | 10 min |

---

## 🗂️ Documentation by Role

### I'm a New Developer

**Start here:**
1. [docs/ONBOARDING.md](./docs/ONBOARDING.md) - The day-1 guide (two frontends, request lifecycle)
2. [QUICK_START.md](./QUICK_START.md) - Get it running locally
3. [CODE_MAP.md](./CODE_MAP.md) - Learn where everything lives
4. [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Write your first feature

**Key sections:**
- [Project Structure](./CODE_MAP.md#-detailed-file-structure)
- [Common Patterns](./DEVELOPER_GUIDE.md#common-patterns)
- [Adding New Features](./DEVELOPER_GUIDE.md#-backend-development)

### I'm a Senior Engineer

**Start here:**
1. [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand the design
2. [CODE_MAP.md](./CODE_MAP.md#-architecture-visualization) - See data flow
3. [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Review patterns

**Key sections:**
- [Architecture Patterns](./ARCHITECTURE.md#-architecture-patterns)
- [Performance Optimizations](./ARCHITECTURE.md#-performance-optimizations)
- [Security Considerations](./ARCHITECTURE.md#-security-considerations)

### I'm a DevOps Engineer

**Start here:**
1. [README.md](./README.md#-deployment) - Deployment options
2. [QUICK_START.md](./QUICK_START.md#-installation-help) - Infrastructure setup
3. [GitHub Actions](./.github/workflows/) - CI/CD pipelines

**Key sections:**
- [Environment Variables](./README.md#environment-variables)
- [Docker Setup](./QUICK_START.md#docker-alternative-easiest)
- [Health Checks](./ARCHITECTURE.md#health-checks)

### I'm a Product Manager

**Start here:**
1. [README.md](./README.md#-features) - Feature overview
2. [ARCHITECTURE.md](./ARCHITECTURE.md#overview) - Technical capabilities

**Key sections:**
- [Features](./README.md#-features)
- [Tech Stack](./README.md#-tech-stack)
- [iOS App](./ios/TaskManager/README.md)

### I'm Reviewing Code

**Start here:**
1. [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md#-best-practices) - Coding standards
2. [CODE_MAP.md](./CODE_MAP.md) - Code organization
3. [ARCHITECTURE.md](./ARCHITECTURE.md#architecture-patterns) - Expected patterns

**Key sections:**
- [Best Practices](./DEVELOPER_GUIDE.md#-best-practices)
- [Testing Guidelines](./DEVELOPER_GUIDE.md#-testing-guidelines)
- [Security](./ARCHITECTURE.md#-security-considerations)

---

## 🔍 Documentation by Topic

### Setup & Installation
- [Quick Start Guide](./QUICK_START.md)
- [Prerequisites](./README.md#prerequisites)
- [Environment Setup](./QUICK_START.md#3-quick-configuration)
- [Docker Setup](./QUICK_START.md#docker-alternative-easiest)
- [Troubleshooting](./QUICK_START.md#-troubleshooting)

### Architecture & Design
- [Architecture Overview](./ARCHITECTURE.md#overview)
- [Architecture Patterns](./ARCHITECTURE.md#-architecture-patterns)
- [Data Flow](./ARCHITECTURE.md#-data-flow)
- [Tech Stack](./ARCHITECTURE.md#-tech-stack)
- [Visual Architecture](./CODE_MAP.md#-architecture-visualization)

### Code Organization
- [Project Structure](./ARCHITECTURE.md#-project-structure)
- [Detailed File Structure](./CODE_MAP.md#-detailed-file-structure)
- [Backend Structure](./CODE_MAP.md#backend-srcserver)
- [Frontend Structure](./CODE_MAP.md#frontend-clientsrc)
- [Quick Navigation](./CODE_MAP.md#-quick-navigation)

### Development
- [Adding API Endpoints](./DEVELOPER_GUIDE.md#adding-a-new-api-endpoint)
- [Creating Services](./DEVELOPER_GUIDE.md#creating-a-service)
- [Database Queries](./DEVELOPER_GUIDE.md#database-queries)
- [Frontend Components](./DEVELOPER_GUIDE.md#adding-a-new-feature-component)
- [Testing](./DEVELOPER_GUIDE.md#-testing-guidelines)
- [Request Flow](./CODE_MAP.md#-request-flow-examples)

### Features & Capabilities
- [Authentication](./ARCHITECTURE.md#authentication-flow)
- [Real-time Updates](./ARCHITECTURE.md#real-time-task-updates)
- [Caching Strategy](./ARCHITECTURE.md#caching-strategy)
- [Email Notifications](./README.md#-features)
- [iOS App](./ios/TaskManager/README.md)

### Operations
- [Deployment](./README.md#-deployment)
- [Configuration](./README.md#-configuration)
- [Environment Variables](./README.md#environment-variables)
- [Health Checks](./ARCHITECTURE.md#health-checks)
- [Debugging](./DEVELOPER_GUIDE.md#-debugging)
- [Performance](./ARCHITECTURE.md#-performance-optimizations)
- [Security](./ARCHITECTURE.md#-security-considerations)

### Mobile Development
- [iOS App Overview](./ios/TaskManager/README.md)
- [iOS Build Instructions](./ios/TaskManager/README.md#build-on-mac)
- [GitHub Actions workflows](./.github/workflows/)

---

## 📝 Quick Reference

### File Locations

```
Documentation:
├── README.md                    # Project overview
├── CLAUDE.md                   # Conventions & commands at a glance
├── QUICK_START.md              # Setup guide
├── CODE_MAP.md                 # Code navigation
├── DEVELOPER_GUIDE.md          # Development guide
├── ARCHITECTURE.md             # Architecture docs
├── DOCUMENTATION_INDEX.md      # This file
├── docs/ONBOARDING.md          # Day-1 onboarding guide
├── docs/AI_EVALUATION_HARNESS.md  # Statement-import eval harness
└── docs/archive/               # Stale historical reports (do not trust)

Application Code:
├── app.js                      # App initialization
├── server.js                   # Server startup
├── src/server/                 # Backend code
├── client/src/                 # Frontend code
└── ios/                        # iOS app

Configuration:
├── .env                        # Environment variables
├── package.json                # Backend dependencies
├── client/package.json         # Frontend dependencies
└── .github/workflows/          # CI/CD
```

### Command Reference

```bash
# Development
npm run dev                     # Start backend with auto-reload
cd client && npm run dev        # Start frontend dev server

# Production
npm start                       # Start production server
cd client && npm run build      # Build frontend

# Testing
npm test                        # Run backend tests
cd client && npm test           # Run frontend tests

# Database
createdb taskmanager           # Create database
psql taskmanager               # Connect to database

# Utilities
redis-cli ping                 # Check Redis
pg_isready                     # Check PostgreSQL
npm run seed:audit-logs        # Seed data
```

### Port Reference

| Service | Port | URL |
|---------|------|-----|
| Frontend Dev | 5173 | http://localhost:5173 |
| Backend | 3000 | http://localhost:3000 |
| Backend API | 3000 | http://localhost:3000/api |
| PostgreSQL | 5432 | postgresql://localhost:5432 |
| Redis | 6379 | redis://localhost:6379 |

---

## 🎓 Learning Paths

### Path 1: Quick Start (1 hour)
1. Read [README.md](./README.md) (5 min)
2. Follow [QUICK_START.md](./QUICK_START.md) (30 min)
3. Browse [CODE_MAP.md](./CODE_MAP.md) (15 min)
4. Explore the running app (10 min)

### Path 2: Full Onboarding (1 day)
1. Complete Path 1 (1 hour)
2. Read [ARCHITECTURE.md](./ARCHITECTURE.md) (30 min)
3. Read [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) (1 hour)
4. Add a simple feature following the guide (2-3 hours)
5. Review existing code (2 hours)

### Path 3: Deep Dive (1 week)
1. Complete Path 2 (1 day)
2. Study database schema and migrations (2 hours)
3. Understand real-time architecture (2 hours)
4. Review all services and routes (4 hours)
5. Write tests for a new feature (4 hours)
6. Set up iOS build environment (2 hours)
7. Deploy to production (2 hours)

---

## 🔗 External Resources

### Technologies Used

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [React Documentation](https://react.dev/)
- [PostgreSQL Tutorial](https://www.postgresql.org/docs/current/tutorial.html)
- [Redis Commands](https://redis.io/commands/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Libraries & Frameworks

- [TanStack Query](https://tanstack.com/query/latest)
- [Zod Validation](https://zod.dev/)
- [Pino Logger](https://getpino.io/)
- [Vite Guide](https://vitejs.dev/guide/)
- [React Router](https://reactrouter.com/)

---

## 📊 Documentation Status

| Document | Status | Last Updated | Coverage |
|----------|--------|--------------|----------|
| README.md | ✅ Complete | 2024-01 | 100% |
| QUICK_START.md | ✅ Complete | 2024-01 | 100% |
| CODE_MAP.md | ✅ Complete | 2024-01 | 100% |
| DEVELOPER_GUIDE.md | ✅ Complete | 2024-01 | 100% |
| ARCHITECTURE.md | ✅ Complete | 2024-01 | 100% |
| API Documentation | 🔄 Planned | - | 0% |

---

## 🤝 Contributing to Documentation

Found a typo? Want to improve documentation? Here's how:

1. Edit the relevant `.md` file
2. Follow existing formatting
3. Keep it concise and clear
4. Add examples where helpful
5. Update this index if adding new docs
6. Submit a pull request

---

## 💡 Tips for Using Documentation

1. **Use Ctrl+F / Cmd+F** - Search within documents
2. **Follow links** - Documents reference each other
3. **Start simple** - Don't try to read everything at once
4. **Hands-on learning** - Code while reading the guides
5. **Keep docs open** - Reference while developing
6. **Bookmark commonly used** - Keep quick references handy

---

## ❓ FAQ

**Q: Where do I start if I'm completely new?**
A: [QUICK_START.md](./QUICK_START.md) → Get the app running first!

**Q: I want to add a feature, which doc?**
A: [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) → Step-by-step examples

**Q: Where is file X located?**
A: [CODE_MAP.md](./CODE_MAP.md) → Complete file structure

**Q: How does feature Y work?**
A: [ARCHITECTURE.md](./ARCHITECTURE.md) → System design and data flow

**Q: Something's broken, help!**
A: [README.md](./README.md#troubleshooting) or [QUICK_START.md](./QUICK_START.md#-troubleshooting)

**Q: How do I deploy this?**
A: [README.md](./README.md#-deployment) → Deployment instructions

**Q: Is there API documentation?**
A: Coming soon! For now, check route files in `src/server/routes/`

---

**Questions or suggestions? Open an issue or PR!**

Happy building! 🚀
