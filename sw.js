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
  const { request } = event;

  // Ignore non-GET
  if (request.method !== 'GET') return;

  // 🚫 Never cache Google Apps Script (menu API)
  if (request.url.includes('script.google.com')) {
    return;
  }

  // HTML pages → cache first
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      caches.match(request).then(cached =>
        cached || fetch(request).then(res => {
          caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
          return res;
        })
      )
    );
    return;
  }

  // JS / CSS / images → cache first, network fallback
  event.respondWith(
    caches.match(request).then(cached =>
      cached || fetch(request).then(res => {
        caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
        return res;
      })
    )
  );
});
