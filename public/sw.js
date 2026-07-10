const CACHE_NAME = 'orcamento-ja-v2';

console.log('CACHE_NAME', CACHE_NAME);

const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.webmanifest',
  '/assets/logo.svg'
];

// Instala
self.addEventListener('install', event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL);
    })
  );
});

// Ativa
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      ),
      self.clients.claim()
    ])
  );
});

// Fetch
self.addEventListener('fetch', event => {

  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // HTML -> Network First
  if (event.request.mode === 'navigate') {

    event.respondWith(

      fetch(event.request)
        .then(response => {

          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put('/index.html', copy));

          return response;

        })
        .catch(() => caches.match('/index.html'))

    );

    return;
  }

  // CSS / JS -> Stale While Revalidate
  event.respondWith(

    caches.match(event.request).then(cacheResponse => {

      const networkFetch = fetch(event.request)
        .then(networkResponse => {

          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, networkResponse.clone()));

          return networkResponse;

        })
        .catch(() => cacheResponse);

      return cacheResponse || networkFetch;

    })

  );

});