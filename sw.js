const CACHE_NAME = 'muzyka-v5';
const BASE_PATH = '/kolekcjoner-muzyki/';
const urlsToCache = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'style.css',
  BASE_PATH + 'app.js',
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'icon-192.png',
  BASE_PATH + 'icon-512.png'
];

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', function(event) {
  // Tylko GET
  if (event.request.method !== 'GET') return;
  
  // Tylko http/https (ignoruj chrome-extension, etc.)
  if (!event.request.url.startsWith('http')) return;
  
  // Pomijamy zewnętrzne API
  var url = event.request.url;
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebase') ||
      url.includes('api.deezer.com') ||
      url.includes('itunes.apple.com') ||
      url.includes('musicbrainz.org') ||
      url.includes('coverartarchive.org') ||
      url.includes('lrclib.net') ||
      url.includes('lyrics.ovh') ||
      url.includes('unpkg.com') ||
      url.includes('gstatic.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response && response.status === 200 && response.type === 'basic') {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseClone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(c) { return c !== CACHE_NAME; })
        .map(function(c) { return caches.delete(c); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});
