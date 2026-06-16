const CACHE_NAME = 'gasg-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/logo.png',
  '/logo.jpeg',
  '/favicon.svg',
  '/icons.svg',
  '/manifest-citizen.json',
  '/manifest-staff.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/staff-192.png',
  '/icons/staff-512.png'
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
