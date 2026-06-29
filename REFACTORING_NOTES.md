# Server Architecture Refactoring

## Overview

The monolithic `app.js` has been refactored into smaller, focused modules following the Single Responsibility Principle. This improves maintainability, testability, and code organization.

## New Structure

```
src/server/
├── config/
│   └── session.js          # Session middleware configuration
├── bootstrap/
│   ├── health.js           # Health check endpoints and payload building
│   ├── sockets.js          # Socket.IO initialization
│   ├── middleware.js       # Express middleware setup
│   └── routes.js           # Route registration
├── app.js                  # Main app composition (simplified)
└── [other existing modules...]
```

## Module Responsibilities

### `src/server/config/session.js`

- **Responsibility**: Session middleware configuration
- **Exports**: `createSessionMiddleware(isProduction)`
- **Purpose**: Centralizes session configuration for consistency

### `src/server/bootstrap/health.js`

- **Responsibility**: Health check endpoints and status payload generation
- **Exports**:
  - `buildHealthPayload(dbReady, cacheReady, options)`
  - `registerHealthRoutes(app, dbReady, cacheReady)`
- **Purpose**: Separates health check logic from app initialization

### `src/server/bootstrap/sockets.js`

- **Responsibility**: HTTP server creation and Socket.IO initialization
- **Exports**:
  - `createHttpServer(app)`
  - `initializeSocketIO(httpServer, sessionMiddleware)`
- **Purpose**: Encapsulates real-time communication setup

### `src/server/bootstrap/middleware.js`

- **Responsibility**: Express middleware and request pipeline setup
- **Exports**: Multiple setup functions
  - `setupExpressMiddleware(app)`
  - `setupLogging(app)`
  - `setupProxyTrust(app)`
  - `setupCacheInvalidation(app)`
  - `setupDatabaseReadyCheck(app, dbReady, logger)`
  - `setupStaticFiles(app)`
  - `setupConfigEndpoint(app)`
  - `setupFallbackRoute(app)`
- **Purpose**: Modular middleware configuration for easy testing and reordering

### `src/server/bootstrap/routes.js`

- **Responsibility**: Route registration and dependency injection
- **Exports**: `registerRoutes(app, dependencies)`
- **Purpose**: Centralizes route setup, making it easy to add/remove routes

### `src/server/app.js`

- **Before**: 300+ lines handling initialization, middleware, sockets, health checks, routes
- **After**: ~80 lines orchestrating bootstrap modules
- **Purpose**: Clean app composition and module coordination

## Benefits

✅ **Improved Readability**: Each module has a clear, single purpose  
✅ **Better Testability**: Independent modules are easier to unit test  
✅ **Easier Maintenance**: Changes to one concern are isolated to one module  
✅ **Reusability**: Bootstrap modules can be reused or reconfigured  
✅ **Scalability**: Adding new middleware/routes requires minimal changes  
✅ **Separation of Concerns**: Configuration, initialization, and routing are separate

## Migration Notes

- No breaking changes to the API
- `server.js` remains the entry point unchanged
- All existing functionality is preserved
- Dependencies are passed through function parameters for easier testing

## Future Improvements

- Add unit tests for each bootstrap module
- Create a bootstrap orchestrator class for more complex initialization
- Consider extracting dependency creation into a factory module
- Add middleware pipeline builder for more complex request flows
