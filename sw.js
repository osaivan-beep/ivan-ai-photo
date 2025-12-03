
const CACHE_NAME = 'ivan-ai-photo-cache-v40007'; // Increment version to force update
const APP_SHELL_URLS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  // Removed .tsx/.ts files because they do not exist in the production build.
  // The browser will cache the actual compiled .js files automatically via HTTP cache.
];


self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activation immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache v40007');
      return cache.addAll(APP_SHELL_URLS);
    })
  );
});


self.addEventListener('fetch', (event) => {
  // Only cache http/https requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache-first for app shell resources defined above
      if (response) return response;

      // Network-first for everything else
      return fetch(event.request).then(networkResponse => {
          return networkResponse;
      }).catch(() => {
          // Optional: Return a fallback offline page here if needed
      });
    })
  );
});


self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim()); // Take control immediately
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
});
