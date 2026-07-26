const CACHE_NAME = 'repause-cache-v4.1';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

// Files that should always be fetched fresh first (the app itself changes often).
// Static assets (icons, manifest) are fine to serve cache-first since they rarely change.
function isAppShell(request){
  return request.mode === 'navigate' || request.url.endsWith('/index.html');
}

// Install: pre-cache the core app shell
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for the app shell (so updates show up immediately),
// cache-first for static assets (icons, manifest), offline fallback either way.
self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  if (isAppShell(event.request)) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put('./index.html', clone);
          });
        }
        return response;
      }).catch(function() {
        return caches.match('./index.html');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;

      return fetch(event.request).then(function(response) {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        return undefined;
      });
    })
  );
});
