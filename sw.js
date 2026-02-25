var CACHE_NAME = 'ab-v1';
var STATIC_ASSETS = [
    '/css/styles.min.css',
    '/js/main.min.js',
    '/imagenes/logo-andres-botta.webp',
    '/imagenes/logo-andres-botta.png',
    '/manifest.json'
];

self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(names) {
            return Promise.all(
                names.filter(function(n) { return n !== CACHE_NAME; })
                     .map(function(n) { return caches.delete(n); })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', function(e) {
    var url = new URL(e.request.url);

    // Only handle same-origin GET requests
    if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

    // HTML — network-first (always get fresh content)
    if (e.request.headers.get('accept') && e.request.headers.get('accept').indexOf('text/html') !== -1) {
        e.respondWith(
            fetch(e.request).catch(function() {
                return caches.match(e.request);
            })
        );
        return;
    }

    // Static assets — cache-first
    e.respondWith(
        caches.match(e.request).then(function(cached) {
            return cached || fetch(e.request).then(function(response) {
                if (response.ok) {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(e.request, clone);
                    });
                }
                return response;
            });
        })
    );
});
