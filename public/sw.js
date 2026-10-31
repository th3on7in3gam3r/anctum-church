const CACHE = 'sanctum-live-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/', '/manifest.webmanifest']))
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/').then((cached) => cached || caches.match('/index.html'))
      )
    );
  }
});
