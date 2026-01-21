const CACHE_NAME = 'shreeji-v4';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(() => null)
        )
      )
    ).then(() => self.skipWaiting())
  );
});

// Activate
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(k => k !== CACHE_NAME && caches.delete(k))
      )
    )
  );
});

// Fetch
self.addEventListener('fetch', event => {
  const request = event.request;

  // Only handle GET
  if (request.method !== 'GET') return;

  // Never touch Google Apps Script APIs
  if (request.url.includes('script.google.com')) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request)
        .then(response => {
          // Cache successful responses only
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          // ✅ SAFE FALLBACKS
          if (request.headers.get("accept")?.includes("text/html")) {
            return caches.match("./index.html");
          }

          // For images / css / js → fail silently
          return new Response("", { status: 204 });
        });
    })
  );
});
