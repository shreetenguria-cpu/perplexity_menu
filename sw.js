const CACHE_NAME = 'shreeji-v3';
const SAFE_URLS = [
  '/',
  '/index.html',
  '/kitchen.html', 
  '/admin.html',
  '/manifest.json'
];

// Install - cache ONLY existing files (no network failures)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Add files ONE BY ONE to avoid addAll failures
        return Promise.all(
          SAFE_URLS.map(url => 
            cache.add(url).catch(err => {
              console.log('SW: Skip caching', url, err);
              return null; // Continue even if one fails
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => 
      Promise.all(
        cacheNames.map(cacheName => 
          cacheName !== CACHE_NAME && caches.delete(cacheName)
        )
      )
    )
  );
});

// Smart fetch - cache-first for pages, network-first for APIs
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // Skip non-GET requests and external APIs
  if (event.request.method !== 'GET' || url.includes('script.google.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
      .catch(() => {
        // Offline fallback
        return new Response('Offline - Menu will load when online', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});
