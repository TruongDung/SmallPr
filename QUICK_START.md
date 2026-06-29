# 🚀 Quick Start Guide

Get up and running with the Task Manager application in under 10 minutes!

## ⚡ Fast Track Setup

### 1. Prerequisites Check

```bash
# Check Node.js version (need v18+)
node --version

# Check npm
npm --version

# Check if PostgreSQL is running
psql --version

# Check if Redis is running (should return PONG)
redis-cli ping
```

Don't have PostgreSQL or Redis? See [Installation Help](#installation-help) below.

### 2. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd SmallPr

# Install ALL dependencies (backend + frontend)
npm install && cd client && npm install && cd ..
```

### 3. Quick Configuration

Create `.env` file in the root directory:

```bash
# Copy this template:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskmanager
SESSION_SECRET=my-secret-key-change-in-production
NODE_ENV=development
REDIS_URL=redis://localhost:6379
DEFAULT_ADMIN_PASSWORD=admin123
```

### 4. Create Database

```bash
# Using psql
createdb taskmanager

# Or manually
psql -U postgres
CREATE DATABASE taskmanager;
\q
```

### 5. Start Everything

Open **two terminals**:

**Terminal 1 - Backend:**

```bash
npm run dev
```

Wait for: `✅ Server running on http://localhost:3000`

**Terminal 2 - Frontend:**

```bash
cd client
npm run dev
```

Wait for: `Local: http://localhost:5173`

### 6. Open and Test

1. Open browser: http://localhost:5173
2. Login with default admin password from `.env`
3. Start creating tasks! 🎉

---

## 📦 Installation Help

### Install PostgreSQL

**Windows:**

```bash
# Using Chocolatey
choco install postgresql

# Or download installer from:
# https://www.postgresql.org/download/windows/
```

**macOS:**

```bash
# Using Homebrew
brew install postgresql@16
brew services start postgresql@16
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Install Redis

**Windows:**

```bash
# Using Chocolatey
choco install redis-64

# Or use WSL and follow Linux instructions
```

**macOS:**

```bash
# Using Homebrew
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
```

### Docker Alternative (Easiest!)

If you have Docker installed:

```bash
# Start PostgreSQL
docker run -d \
  --name taskmanager-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=taskmanager \
  -p 5432:5432 \
  postgres:16

# Start Redis
docker run -d \
  --name taskmanager-redis \
  -p 6379:6379 \
  redis:6
```

---

## 🐛 Troubleshooting

### "Port 3000 already in use"

**Windows:**

```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Mac/Linux:**

```bash
lsof -ti:3000 | xargs kill -9
```

### "Connection refused" - PostgreSQL

```bash
# Check if running
pg_isready

# Start PostgreSQL
# macOS: brew services start postgresql@16
# Linux: sudo systemctl start postgresql
# Windows: Check Services app
```

### "Connection refused" - Redis

```bash
# Check if running
redis-cli ping

# Start Redis
# macOS: brew services start redis
# Linux: sudo systemctl start redis
# Windows: Check Services app or restart Redis service
```

### "Database does not exist"

```bash
# Create it
createdb taskmanager

# Or
psql -U postgres -c "CREATE DATABASE taskmanager;"
```

### Frontend won't start

```bash
cd client
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend won't start

```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## 🎯 What's Next?

Now that you're up and running:

1. **Read the Architecture** - [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand how it all works
2. **Start Developing** - [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Add your first feature
3. **Explore the Code** - Check out `src/server/` and `client/src/`
4. **Build Something Cool** - Make it your own!

---

## 📱 Bonus: Run the iOS App

If you have a Mac and want to try the iOS app:

```bash
cd ios/TaskManager
open TaskManager.xcodeproj
```

Then press ▶️ in Xcode!

---

## 💡 Tips

- Use `npm run dev` (not `npm start`) for development - it auto-reloads on changes
- Frontend: http://localhost:5173 (Vite dev server)
- Backend API: http://localhost:3000/api
- Check logs for any errors - they're usually helpful!
- Redis and PostgreSQL must be running before starting the app

---

## 🆘 Still Having Issues?

1. Check that PostgreSQL is running: `pg_isready`
2. Check that Redis is running: `redis-cli ping`
3. Verify your `.env` file exists and has correct values
4. Look at terminal output for specific error messages
5. Try the Docker setup above if local installation is problematic

---

**Ready to build? Let's go! 🚀**
