const CACHE_NAME = 'cashiery-v4.2';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/main.css',
    './js/app.js',
    './js/auth.js',
    './js/db.js',
    './js/firebase-config.js',
    './js/i18n.js',
    './js/invoices.js',
    './js/pos.js',
    './js/products.js',
    './js/purchases.js',
    './js/receipt.js',
    './js/reports.js',
    './js/settings.js',
    './js/shifts.js',
    './js/utils.js',
    './js/customers.js',
    'https://cdn-icons-png.flaticon.com/512/3144/3144456.png'
];

// Install Event — cache assets and activate immediately
self.addEventListener('install', event => {
    self.skipWaiting(); // Activate new SW immediately
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache:', CACHE_NAME);
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activate Event — clear old caches and claim clients
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of all pages immediately
    );
});

// Fetch Event — Network-First strategy (always try network, fall back to cache)
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Clone and update cache with fresh version
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                // Network failed — fall back to cache (offline support)
                return caches.match(event.request);
            })
    );
});
