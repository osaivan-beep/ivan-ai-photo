const CACHE_NAME = 'ivan-ai-photo-pro-v1.0.284'; // 每次更新 App.tsx 版本時，這裡也要跟著改
const APP_SHELL_URLS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // 強制立即激活新版本
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log(`Opened cache ${CACHE_NAME}`);
      return cache.addAll(APP_SHELL_URLS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
});
