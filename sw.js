const CACHE_NAME = 'ares-casher-pro-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/main.css',
    './js/app.js',
    './js/auth.js',
    './js/db.js',
    './js/i18n.js',
    './js/invoices.js',
    './js/modal.js',
    './js/pos.js',
    './js/products.js',
    './js/purchases.js',
    './js/receipt.js',
    './js/reports.js',
    './js/settings.js',
    './js/shifts.js',
    './js/toast.js',
    './js/utils.js',
    'https://cdn-icons-png.flaticon.com/512/3144/3144456.png'
];

// Install Event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activate Event
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch Event
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});
