const CACHE_NAME = 'gasg-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Pass WebSocket and API requests through directly
  if (
    e.request.url.includes('/socket.io/') || 
    e.request.url.includes('/api/') ||
    e.request.url.startsWith('chrome-extension:')
  ) {
    return;
  }

  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});
