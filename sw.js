const CACHE_NAME = 'shreeji-v2';
const urlsToCache = [
  '/index.html', '/kitchen.html', '/admin.html', 
  '/manifest.json', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700'
];

// Install and cache everything
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Smart caching strategy
self.addEventListener('fetch', event => {
  if (event.request.url.includes('script.google.com')) {
    // API requests - attempt network first, fallback to cache, queue if failed
    event.respondWith(networkFirstWithQueue(event.request));
  } else {
    // Static assets - cache first
    event.respondWith(caches.match(event.request).then(cached => 
      cached || fetch(event.request).then(networkRes => {
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkRes.clone()));
        return networkRes;
      }).catch(() => caches.match(event.request))
    ));
  }
});

// Network-first with sync queue for API calls
async function networkFirstWithQueue(request) {
  try {
    const networkResponse = await fetch(request.clone());
    // Update cache with fresh data
    if (request.method === 'GET') {
      caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse.clone()));
    }
    return networkResponse;
  } catch (error) {
    // Network failed - check cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    
    // No cache - queue for later if it's a POST
    if (request.method === 'POST') {
      const clone = request.clone();
      const data = await clone.json();
      queueForSync(data);
    }
    return new Response('Offline - Order queued for sync', {status: 200});
  }
}

// Queue sync operations
function queueForSync(data) {
  const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
  queue.unshift({data, timestamp: Date.now(), retries: 0});
  localStorage.setItem('syncQueue', JSON.stringify(queue.slice(0, 50))); // Limit queue
}

// Background sync when online
self.addEventListener('sync', event => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(syncQueue());
  }
});

async function syncQueue() {
  const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
  for (let i = 0; i < queue.length; i++) {
    try {
      const item = queue[i];
      const response = await fetch('https://script.google.com/macros/s/AKfycbz2x-z27L-qt_pQyZ8mDy-Nw-SmbM-U4FLrNtE9FRkWgoN2vHn0eHjOTc6E_5UgV_fU/exec', {
        method: 'POST',
        body: JSON.stringify(item.data)
      });
      
      if (response.ok) {
        queue.splice(i, 1); // Remove successful sync
        i--;
        localStorage.setItem('syncQueue', JSON.stringify(queue));
      } else {
        item.retries++;
        if (item.retries > 5) {
          queue.splice(i, 1); // Remove failed after 5 tries
          i--;
        }
      }
    } catch (e) {
      console.error('Sync failed:', e);
    }
  }
}
