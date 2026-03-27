if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister();
            console.log('Service Worker Unregistered');
        }
    });

    // Re-register after a small delay to ensure cleanup
    setTimeout(() => {
        window.addEventListener('load', () => {
            // Append timestamp to bust cache
            navigator.serviceWorker.register('./sw.js?t=' + new Date().getTime())
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }, 1000);
}
