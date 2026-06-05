# 📋 Task Manager Application

A modern, full-stack task management application with real-time collaboration, built with Node.js, React, and PostgreSQL.

![Build Status](https://img.shields.io/github/workflow/status/yourusername/task-manager/Node.js%20CI)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Features

- 🔐 **User Authentication** - Secure login with bcrypt password hashing
- ⚡ **Real-time Updates** - Live task updates across all connected clients via WebSocket
- 🎨 **Rich Text Editing** - Full-featured rich text editor for task descriptions
- 🖱️ **Drag & Drop** - Intuitive task organization with drag-and-drop
- 📊 **Admin Dashboard** - Comprehensive audit logs and user management
- 🚀 **Performance** - Redis caching for optimized response times
- 📱 **iOS App** - Native iOS wrapper for mobile access
- 🌍 **Internationalization** - Multi-language support
- 🎯 **Tag System** - Organize tasks with custom tags
- 📧 **Email Notifications** - Task alerts and summaries

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:
- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **PostgreSQL** v16 or higher ([Download](https://www.postgresql.org/download/))
- **Redis** v6 or higher ([Download](https://redis.io/download))
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SmallPr
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   npm install

   # Install frontend dependencies
   cd client
   npm install
   cd ..
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```bash
   # Database Configuration
   DATABASE_URL=postgresql://username:password@localhost:5432/taskmanager

   # Session Configuration
   SESSION_SECRET=your-random-secret-key-change-this-in-production
   NODE_ENV=development

   # Redis Configuration
   REDIS_URL=redis://localhost:6379

   # Admin Account
   DEFAULT_ADMIN_PASSWORD=admin123

   # Optional: Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

4. **Set up the database**
   ```bash
   # Create database
   createdb taskmanager

   # Migrations run automatically on server start
   ```

5. **Start the application**

   **Option A: Development mode (recommended)**
   ```bash
   # Terminal 1: Start backend server with auto-reload
   npm run dev

   # Terminal 2: Start frontend dev server
   cd client
   npm run dev
   ```

   **Option B: Production mode**
   ```bash
   # Build frontend
   cd client
   npm run build
   cd ..

   # Start server (serves built frontend)
   npm start
   ```

6. **Access the application**
   - Frontend: http://localhost:5173 (dev) or https://small-pr.vercel.app/ (production)
   - Backend API: http://localhost:3000/api
   - Default admin login: Use the password from `DEFAULT_ADMIN_PASSWORD`

## 📖 Documentation

- **[Architecture Guide](./ARCHITECTURE.md)** - Detailed system architecture and design patterns
- **[API Documentation](./docs/API.md)** - REST API endpoints (coming soon)
- **[iOS App Guide](./ios/TaskManager/README.md)** - Building and deploying the iOS app

## 🏗️ Project Structure

```
SmallPr/
├── src/server/           # Backend application
│   ├── bootstrap/        # App initialization
│   ├── routes/           # API endpoints
│   ├── services/         # Business logic
│   ├── middleware/       # Express middleware
│   ├── db/              # Database & migrations
│   └── cache/           # Redis caching
│
├── client/              # Frontend application
│   └── src/
│       ├── api/         # API client
│       ├── components/  # Reusable components
│       ├── features/    # Feature modules
│       └── hooks/       # Custom React hooks
│
├── ios/                 # iOS native app
├── public/              # Static assets
└── .github/workflows/   # CI/CD pipelines
```

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express.js** - Server framework
- **PostgreSQL** - Primary database
- **Redis** - Caching layer
- **Socket.IO** - Real-time communication
- **Pino** - Structured logging
- **Zod** - Schema validation
- **bcrypt** - Password hashing

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TanStack Query** - Data fetching & caching
- **React Router** - Client-side routing
- **@dnd-kit** - Drag and drop

### Mobile
- **Swift** + **SwiftUI** - iOS native wrapper

## 🧪 Testing

```bash
# Backend tests
npm test

# Frontend tests
cd client
npm test

# Watch mode
cd client
npm run test:watch
```

## 📦 Building for Production

### Backend
```bash
# The backend doesn't require a build step
# Just ensure NODE_ENV=production
export NODE_ENV=production
npm start
```

### Frontend
```bash
cd client
npm run build
# Built files will be in client/dist/
```

### Docker (Optional)
```bash
# Coming soon
docker-compose up
```

## 🚢 Deployment

### Deploy to Vercel (Recommended for quick start)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Deploy to your own server
1. Build the frontend: `cd client && npm run build`
2. Set up PostgreSQL and Redis
3. Configure environment variables
4. Start the server: `NODE_ENV=production npm start`
5. Use a process manager like PM2: `pm2 start server.js`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `REDIS_URL` | Redis connection string | Yes | - |
| `SESSION_SECRET` | Secret key for session encryption | Yes | - |
| `NODE_ENV` | Environment (development/production) | No | development |
| `PORT` | Server port | No | 3000 |
| `DEFAULT_ADMIN_PASSWORD` | Initial admin password | No | - |

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and patterns
- Write tests for new features
- Update documentation
- Ensure all tests pass before submitting PR

## 🐛 Troubleshooting

### Port 3000 already in use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Database connection errors
- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Verify database exists: `psql -l`

### Redis connection errors
- Ensure Redis is running: `redis-cli ping` (should return PONG)
- Check REDIS_URL configuration

### Frontend build errors
```bash
cd client
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📝 Scripts Reference

### Backend
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm test` - Run tests
- `npm run seed:audit-logs` - Seed audit log data

### Frontend
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with ❤️ using modern web technologies
- Icons and assets from various open-source projects

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Happy Task Managing! 🎉**
