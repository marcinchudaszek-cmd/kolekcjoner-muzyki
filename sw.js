const CACHE_NAME = 'muzyka-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json'
];

// Instalacja
self.addEventListener('install', function(event) {
  // Wymuszenie natychmiastowej aktywacji
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Cache otwarty');
        return cache.addAll(urlsToCache);
      })
  );
});

// Pobieranie zasobów - najpierw sieć, potem cache
self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Zapisz nową wersję do cache
        if (response.status === 200) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(function() {
        // Jeśli sieć niedostępna, użyj cache
        return caches.match(event.request);
      })
  );
});

// Aktualizacja cache - usuń stare wersje
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName !== CACHE_NAME;
        }).map(function(cacheName) {
          console.log('Usuwam stary cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      // Przejmij kontrolę nad wszystkimi klientami
      return self.clients.claim();
    })
  );
});
