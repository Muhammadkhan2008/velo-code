const CACHE_NAME = 'velo-code-v6';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico?v=velo8',
  '/favicon-16.png?v=velo8',
  '/favicon-32.png?v=velo8',
  '/apple-touch-icon.png?v=velo8',
  '/icon-192.png?v=velo8',
  '/icon-512.png?v=velo8',
  '/1.jpg?v=velo8',
  'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});
