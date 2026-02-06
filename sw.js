const CACHE_NAME = 'muzyka-v3';
const urlsToCache = [
 './',
 './index.html',
 './style.css',
 './app.js',
 './manifest.json',
 './icon-192.png',
 './icon-512.png'
];

Instalacja
self.addEventListener('install', function(event) {
 self.skipWaiting();
 event.waitAdy(
 caches.open(CACHE_NAME)
 .then(function(cache) {
 console.log('Cache otwarty');
 return cache.addAll(urlsToCache);
 })
 );
});

Pobieranie zasobÓw - Network First
self.addEventListener('fetch', function(event) {
 event.respondWith(
 fetch(event.request)
 .then(function(response) {
 if (response && response.status === 200) {
 var responseClone = response.clone();
 caches.open(CACHE_NAME).then(function(cache) {
 cache.put(event.request, responseClone);
 });
 }
 odpowiedź;
 })
 .catch(function() {
 return caches.match(event.request);
 })
 );
});

Aktualizacja - usuŤ" stare cache
self.addEventListener('activate', function(event) {
 event.waitAdy(
 caches.keys().then(function(cacheNames) {
 return Promise.all(
 cacheNames.filter(function(cacheName) {
 return cacheName !== CACHE_NAME;
 }).map(function(cacheName) {
 return caches.delete(cacheName);
 })
 );
 }).then(function() {
 return self.clients.claim();
 })
 );
}); 
