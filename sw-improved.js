const CACHE_NAME = 'muzyka-v5';
const RUNTIME_CACHE = 'muzyka-runtime-v5';

// Pliki do cache podczas instalacji
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png'
];

// Instalacja Service Workera
self.addEventListener('install', function(event) {
  console.log('[SW] Installing...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(function(error) {
        console.error('[SW] Cache error:', error);
      })
  );
});

// Aktywacja
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Strategia fetch: Network First, fallback to Cache
self.addEventListener('fetch', function(event) {
  // Pomijamy chrome-extension i inne protokoły
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Jeśli odpowiedź jest OK, cache'uj ją
        if (response && response.status === 200) {
          const responseClone = response.clone();
          
          caches.open(RUNTIME_CACHE).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        
        return response;
      })
      .catch(function(error) {
        // Jeśli fetch nie działa, spróbuj z cache
        console.log('[SW] Fetch failed, trying cache:', error);
        
        return caches.match(event.request).then(function(response) {
          if (response) {
            return response;
          }
          
          // Jeśli to HTML i nie ma w cache, zwróć offline page
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// Background Sync (opcjonalnie)
self.addEventListener('sync', function(event) {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-albums') {
    event.waitUntil(syncAlbums());
  }
});

function syncAlbums() {
  // Tutaj można dodać logikę synchronizacji z Firebase
  return Promise.resolve();
}

// Push notifications (opcjonalnie)
self.addEventListener('push', function(event) {
  console.log('[SW] Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'Nowa aktualizacja!',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification('Kolekcja Muzyki', options)
  );
});

// Notification click
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked');
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('./')
  );
});
