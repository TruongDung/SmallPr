/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The React app is served from the /app subpath of the same Express origin.
// Build output goes into ../public/app so the existing express.static(public)
// serves it with no additional static-middleware config.
const API_TARGET = process.env.API_TARGET || 'http://localhost:3000';

export default defineConfig({
  base: '/app/',
  plugins: [react()],
  build: {
    outDir: '../public/app',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      // changeOrigin:false keeps Host as localhost so the session cookie
      // (SameSite=Lax, not Secure in dev) round-trips correctly.
      '/api': {
        target: API_TARGET,
        changeOrigin: false,
      },
      '/socket.io': {
        target: API_TARGET,
        changeOrigin: false,
        ws: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
