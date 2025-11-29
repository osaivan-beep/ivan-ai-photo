const CACHE_NAME = 'ivan-ai-photo-cache-v1';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/metadata.json',
  '/components/CanvasEditor.tsx',
  '/components/Toolbar.tsx',
  '/components/QuickPrompts.tsx',
  '/components/Icons.tsx',
  '/services/geminiService.ts',
  '/lib/translations.ts',
  '/components/ThumbnailManager.tsx',
  '/components/LayoutEditor.tsx',
  '/components/PhotoEditor.tsx',
  '/components/LightBrushPanel.tsx',
  'https://cdn.tailwindcss.com', // This is a full URL and is safe to cache.
];


self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(APP_SHELL_URLS);
    })
  );
});


self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache-first for app shell resources
      return response || fetch(event.request);
    })
  );
});


self.addEventListener('activate', (event) => {
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