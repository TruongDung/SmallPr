const CACHE_NAME = 'task-manager-ios-v106';
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/favicon.svg',
  '/icon-180.png',
  '/icon-512.png',
  '/manifest.webmanifest',
  '/fonts/arial.ttf',
];

// Extensions that should always prefer the network so code/markup updates are
// picked up immediately (no hard refresh required). Cache is only a fallback
// for offline use.
const NETWORK_FIRST = /\.(?:js|css|html)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Network-first: try the network, cache the fresh copy, fall back to cache when
// offline. Used for navigation and for JS/CSS/HTML so deploys take effect right
// away.
const networkFirst = (request, fallbackPath) => fetch(request)
  .then((response) => {
    if (request.method === 'GET' && response && response.ok) {
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(fallbackPath || request, responseClone);
      });
    }
    return response;
  })
  .catch(async () => {
    const cached = await caches.match(fallbackPath || request);
    if (cached) return cached;
    // Only navigations may fall back to the app shell. Never serve index.html
    // in place of a missing JS/CSS asset — executing HTML as a script throws a
    // SyntaxError and leaves a blank, "could not load" page.
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    return Response.error();
  });

// Cache-first: good for static, rarely-changing assets (images, fonts).
const cacheFirst = (request) => caches.match(request).then((cached) => cached || fetch(request)
  .then((response) => {
    if (request.method === 'GET' && response && response.ok) {
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
    }
    return response;
  }));

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Never intercept cross-origin, API, or realtime/socket traffic.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/index.html'));
    return;
  }

  if (request.method === 'GET' && NETWORK_FIRST.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
